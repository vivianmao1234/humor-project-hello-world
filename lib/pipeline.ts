// Runs one caption request through the prompt chains configured in the database:
//   caption_requests → humor_flavor_mix → humor_flavor_steps → llm_prompt_chains
//   → llm_model_responses (every LLM call) → captions
// Everything is written as the signed-in user, so RLS applies.

import type { SupabaseClient } from '@supabase/supabase-js';
import { callGemini, type LlmCall } from './gemini';

type Model = { id: number; api_model_id: string; is_active: boolean };
type Step = {
  id: number;
  step_order: number;
  temperature: number;
  prompt_template: string;
  llm_models: Model | null;
};
type MixRow = { caption_count: number; humor_flavors: { id: number; slug: string } | null };

export type GeneratedCaption = { id: number; content: string; flavor: string };

// Tried after the database's models when Gemini is overloaded; they often have spare capacity.
const BACKUP_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3-flash-preview'];
// Stop starting new LLM calls after this long, so the request finishes before Vercel's limit.
const REQUEST_BUDGET_MS = 90_000;
// How many models to ask at the same time for each step.
const RACE_WIDTH = 3;

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function parseCaptions(text: string, count: number): string[] {
  // Models sometimes wrap JSON in ```json fences; strip them before parsing.
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Final step did not return a JSON array');
  return parsed
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim())
    .slice(0, count);
}

export async function runCaptionRequest(
  supabase: SupabaseClient,
  userId: string,
  topic: string
): Promise<{ requestId: number; captions: GeneratedCaption[] }> {
  const { data: request, error: requestError } = await supabase
    .from('caption_requests')
    .insert({ profile_id: userId, topic })
    .select('id')
    .single();
  if (requestError || !request) throw new Error(`Couldn’t create caption request: ${requestError?.message}`);
  const requestId: number = request.id;

  try {
    const [{ data: mix }, { data: terms }, { data: models }] = await Promise.all([
      supabase.from('humor_flavor_mix').select('caption_count, humor_flavors(id, slug)').gt('caption_count', 0),
      supabase.from('terms').select('term, definition').order('priority', { ascending: false }).limit(8),
      supabase.from('llm_models').select('id, api_model_id, is_active').eq('is_active', true).order('id'),
    ]);

    const flavors = ((mix ?? []) as unknown as MixRow[]).filter((m) => m.humor_flavors);
    if (flavors.length === 0) throw new Error('No prompt chains are in the mix. Set a caption count in the admin app.');

    const termsText = (terms ?? []).map((t) => `- ${t.term}: ${t.definition}`).join('\n') || '(none)';
    const activeModels = (models ?? []) as Model[];

    // Models that said "busy" are skipped for the rest of this request, across all flavors.
    const ctx: RunContext = { busy: new Set(), deadline: Date.now() + REQUEST_BUDGET_MS };

    // Flavors run in parallel; steps within a flavor run in order.
    const results = await Promise.all(
      flavors.map((m) =>
        runFlavor(supabase, requestId, userId, topic, m.humor_flavors!, m.caption_count, termsText, activeModels, ctx)
      )
    );
    const captions = results.flat();
    if (captions.length === 0) throw new Error('Every prompt chain failed. See LLM responses in the admin app.');

    await supabase
      .from('caption_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', requestId);
    return { requestId, captions };
  } catch (e) {
    await supabase
      .from('caption_requests')
      .update({ status: 'failed', error: (e as Error).message, completed_at: new Date().toISOString() })
      .eq('id', requestId);
    throw e;
  }
}

type RunContext = { busy: Set<string>; deadline: number };

async function runFlavor(
  supabase: SupabaseClient,
  requestId: number,
  userId: string,
  topic: string,
  flavor: { id: number; slug: string },
  count: number,
  termsText: string,
  activeModels: Model[],
  ctx: RunContext
): Promise<GeneratedCaption[]> {
  const [{ data: chain }, { data: steps }, { data: examples }] = await Promise.all([
    supabase
      .from('llm_prompt_chains')
      .insert({ caption_request_id: requestId, humor_flavor_id: flavor.id })
      .select('id')
      .single(),
    supabase
      .from('humor_flavor_steps')
      .select('id, step_order, temperature, prompt_template, llm_models(id, api_model_id, is_active)')
      .eq('humor_flavor_id', flavor.id)
      .order('step_order'),
    supabase
      .from('caption_examples')
      .select('topic, caption')
      .or(`humor_flavor_id.eq.${flavor.id},humor_flavor_id.is.null`)
      .limit(5),
  ]);
  const chainId: number | undefined = chain?.id;
  const orderedSteps = (steps ?? []) as unknown as Step[];
  if (orderedSteps.length === 0) return [];

  const examplesText = (examples ?? []).map((e) => `- (${e.topic}) ${e.caption}`).join('\n') || '(none)';
  let previousOutput = '';
  let finalPrompt = '';
  let finalModel = '';
  // Audit-log writes run in the background and are awaited before returning.
  const logs: PromiseLike<unknown>[] = [];

  for (const [i, step] of orderedSteps.entries()) {
    const isLast = i === orderedSteps.length - 1;
    const prompt = fill(step.prompt_template, {
      topic,
      count: String(count),
      terms: termsText,
      examples: examplesText,
      previous_output: previousOutput,
    });

    // The step's own model first, then other active models, then backups.
    const preferred = step.llm_models?.is_active ? [step.llm_models] : [];
    const fromDb = [...preferred, ...activeModels.filter((m) => m.id !== step.llm_models?.id)];
    const candidates: { id: number | null; api_model_id: string }[] = [
      ...fromDb,
      ...BACKUP_MODELS.filter((name) => !fromDb.some((m) => m.api_model_id === name)).map((name) => ({ id: null, api_model_id: name })),
    ].filter((m) => !ctx.busy.has(m.api_model_id));

    // Ask a few models at once and keep whichever answers first; cancel the rest.
    let output: string | null = null;
    for (let i = 0; i < candidates.length && output === null && Date.now() < ctx.deadline; i += RACE_WIDTH) {
      const wave = candidates.slice(i, i + RACE_WIDTH).filter((m) => !ctx.busy.has(m.api_model_id));
      if (wave.length === 0) continue;
      const winner = await raceModels(wave, prompt, { temperature: Number(step.temperature), json: isLast }, (model, call) => {
        if (call.status === 503 || call.status === 429 || call.status === 404) ctx.busy.add(model.api_model_id);
        logs.push(
          supabase.from('llm_model_responses').insert({
            caption_request_id: requestId,
            llm_prompt_chain_id: chainId,
            humor_flavor_step_id: step.id,
            llm_model_id: model.id,
            model_name: model.api_model_id,
            prompt,
            response: call.text,
            status_code: call.status,
            error: call.error,
            duration_ms: call.durationMs,
          })
        );
      });
      if (winner) {
        output = winner.text;
        finalModel = winner.model;
      }
    }
    if (output === null) {
      await Promise.all(logs);
      return []; // this flavor failed; others may still succeed
    }
    previousOutput = output;
    finalPrompt = prompt;
  }

  await Promise.all(logs);

  let contents: string[];
  try {
    contents = parseCaptions(previousOutput, count);
  } catch {
    return [];
  }
  if (contents.length === 0) return [];

  const { data: saved, error } = await supabase.from('captions').insert(
    contents.map((content) => ({
      created_by: userId,
      topic,
      content,
      prompt: finalPrompt,
      model: finalModel,
      caption_request_id: requestId,
      humor_flavor_id: flavor.id,
      llm_prompt_chain_id: chainId,
    }))
  ).select('id, content');
  if (error) throw new Error(`Couldn’t save captions: ${error.message}`);
  return (saved ?? []).map((c) => ({ id: c.id, content: c.content, flavor: flavor.slug }));
}

type Candidate = { id: number | null; api_model_id: string };

// Calls every model in parallel. Resolves with the first successful answer (and cancels the
// others), or null once all have failed. onDone sees every call that wasn't cancelled.
function raceModels(
  models: Candidate[],
  prompt: string,
  opts: { temperature: number; json: boolean },
  onDone: (model: Candidate, call: LlmCall) => void
): Promise<{ text: string; model: string } | null> {
  const controller = new AbortController();
  let pending = models.length;
  return new Promise((resolve) => {
    for (const model of models) {
      callGemini(model.api_model_id, prompt, { ...opts, signal: controller.signal }).then((call) => {
        if (!(controller.signal.aborted && !call.ok)) onDone(model, call);
        if (call.ok && call.text && !controller.signal.aborted) {
          controller.abort();
          resolve({ text: call.text, model: model.api_model_id });
        } else if (--pending === 0) {
          resolve(null);
        }
      });
    }
  });
}
