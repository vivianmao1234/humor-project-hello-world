import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GenerateForm from './generate-form';

// Prompt chains can make several LLM calls (plus fallbacks when Gemini is busy).
export const maxDuration = 120;

export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Generate captions</h1>
      <p className="mb-6 text-zinc-500">
        Name a Columbia or NYC moment. The AI writes captions in a few different styles and posts them to the feed for everyone to vote on.
      </p>
      <GenerateForm />
    </div>
  );
}
