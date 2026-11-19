import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import GenerateForm from './generate-form';

// The generator runs prompt chains here (several LLM calls, plus fallbacks when Gemini is busy).
export const maxDuration = 120;

const STEPS = [
  { icon: '✍️', title: 'Pick a moment', text: 'Name something every Columbia student gets.' },
  { icon: '🗳️', title: 'Vote', text: 'The funniest captions rise to the top.' },
  { icon: '⭐', title: 'Save favorites', text: 'Star the ones you want to keep.' },
];

type Row = { id: number; topic: string; content: string; caption_votes: { vote: number }[] };

// A simple landing page: what the app is, the generator right under it, and a peek at the top captions.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('captions')
    .select('id, topic, content, caption_votes(vote)')
    .order('created_at', { ascending: false })
    .limit(200);
  const top = ((data ?? []) as Row[])
    .map((c) => ({ ...c, score: c.caption_votes.reduce((sum, v) => sum + v.vote, 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white shadow-sm">
        <p className="text-5xl">🦁</p>
        <h1 className="mt-2 text-4xl font-bold">Lion Laughs</h1>
        <p className="mx-auto mt-2 max-w-md text-blue-100">AI jokes about Columbia life. You decide what’s funny.</p>
      </section>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-zinc-200">
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-1 font-semibold">{i + 1}. {s.title}</p>
            <p className="text-sm text-zinc-500">{s.text}</p>
          </li>
        ))}
      </ol>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Make some captions</h2>
        {user ? (
          <GenerateForm />
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
            <p className="text-zinc-600">Sign in with your Columbia or Barnard Google account to make captions and vote.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/login" className="rounded-full bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700">
                Sign in
              </Link>
              <Link href="/jokes" className="rounded-full px-5 py-2 font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
                Just browse
              </Link>
            </div>
          </div>
        )}
      </section>

      {top.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Top right now</h2>
            <Link href="/jokes" className="text-sm font-medium text-blue-700 hover:underline">See all jokes →</Link>
          </div>
          <ul className="flex flex-col gap-3">
            {top.map((c, i) => (
              <li key={c.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                <p className="leading-snug"><span className="mr-1">{['🥇', '🥈', '🥉'][i]}</span>{c.content}</p>
                <p className="mt-1 text-xs text-zinc-500">{c.topic}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
