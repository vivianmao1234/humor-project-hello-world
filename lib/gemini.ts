// Server-only: reads GEMINI_API_KEY, which must never reach the browser.

// Tried in order. Google retires model names for new keys and the free tier is often
// overloaded (503), so a busy or unavailable model falls through to the next one.
// The lite models are less in demand, so they often answer when the full ones don't.
const CAPTION_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
const RETRYABLE = new Set([404, 429, 500, 503]);

export function buildCaptionPrompt(topic: string) {
  return [
    'You write short, funny captions for Columbia University students.',
    'Audience: a Columbia College junior who is chronically online, grew up in the Midwest,',
    'lives in the dorms, and explores New York City on weekends.',
    'Use specific campus and NYC details (Butler, Low Steps, John Jay, the 1 train, bodegas, etc.) when they fit.',
    'Keep each caption under 25 words. No hashtags, no emojis, nothing mean-spirited.',
    `Write 3 different captions about: "${topic}".`,
    'Return only a JSON array of 3 strings.',
  ].join('\n');
}

async function callModel(model: string, prompt: string, apiKey: string) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Low thinking keeps responses around 2s instead of 6s+ (and avoids timeouts under load).
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 1,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
}

// Returns the captions and the model that actually produced them (saved with each caption).
export async function generateCaptions(prompt: string): Promise<{ captions: string[]; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  let lastError = '';
  for (const model of CAPTION_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

      let res: Response;
      try {
        res = await callModel(model, prompt, apiKey);
      } catch (e) {
        // A hung model won't do better on retry; move on to the next one.
        lastError = `${model} → ${(e as Error).name === 'TimeoutError' ? 'timed out' : (e as Error).message}`;
        break;
      }
      if (!res.ok) {
        lastError = `${model} → ${res.status} ${(await res.text()).slice(0, 200)}`;
        if (RETRYABLE.has(res.status)) continue;
        throw new Error(`Gemini request failed: ${lastError}`);
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Gemini returned an unexpected format');

      const captions = parsed
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim())
        .slice(0, 3);
      return { captions, model };
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}
