'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { runCaptionRequest } from '@/lib/pipeline';

export type GenerateState = { error?: string; captions?: string[] };

export async function generateAction(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // A clicked idea chip wins over whatever is typed in the box.
  const topic = String(formData.get('idea') || formData.get('topic') || '').trim();
  if (!topic) return { error: 'Give it something to riff on.' };
  if (topic.length > 120) return { error: 'Keep the topic under 120 characters.' };

  // Runs the prompt chains configured in the admin app and saves the captions.
  let captions: string[];
  try {
    const result = await runCaptionRequest(supabase, user.id, topic);
    captions = result.captions.map((c) => c.content);
  } catch (e) {
    console.error(e);
    return { error: 'The AI didn’t come through. Try again in a moment.' };
  }

  revalidatePath('/');
  return { captions };
}

// Clicking the vote you already cast removes it; clicking the other one switches it.
export async function voteAction(captionId: number, vote: 1 | -1) {
  if (vote !== 1 && vote !== -1) throw new Error('Invalid vote');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: existing } = await supabase
    .from('caption_votes')
    .select('id, vote')
    .eq('caption_id', captionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.vote === vote) {
    await supabase.from('caption_votes').delete().eq('id', existing.id);
  } else if (existing) {
    await supabase.from('caption_votes').update({ vote }).eq('id', existing.id);
  } else {
    await supabase.from('caption_votes').insert({ caption_id: captionId, user_id: user.id, vote });
  }

  revalidatePath('/');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
