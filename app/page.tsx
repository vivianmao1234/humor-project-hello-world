import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import VoteButtons from './vote-buttons';

type Row = {
  id: number;
  topic: string;
  content: string;
  created_at: string;
  caption_votes: { vote: number; user_id: string }[];
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function Home({ searchParams }: PageProps<'/'>) {
  const { sort, topic } = await searchParams;
  const sortBy = sort === 'new' ? 'new' : 'top';
  const topicFilter = typeof topic === 'string' ? topic : '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('captions')
    .select('id, topic, content, created_at, caption_votes(vote, user_id)')
    .order('created_at', { ascending: false })
    .limit(200);

  const all = ((data ?? []) as Row[]).map((c) => ({
    ...c,
    score: c.caption_votes.reduce((sum, v) => sum + v.vote, 0),
    votes: c.caption_votes.length,
    myVote: (c.caption_votes.find((v) => v.user_id === user?.id)?.vote ?? 0) as -1 | 0 | 1,
  }));

  // Most-captioned topics become quick filters.
  const topicCounts = new Map<string, number>();
  for (const c of all) topicCounts.set(c.topic, (topicCounts.get(c.topic) ?? 0) + 1);
  const topics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

  const captions = topicFilter ? all.filter((c) => c.topic === topicFilter) : all;
  if (sortBy === 'top') captions.sort((a, b) => b.score - a.score || b.votes - a.votes);

  const href = (s: string, t: string) => {
    const params = new URLSearchParams();
    if (s === 'new') params.set('sort', 'new');
    if (t) params.set('topic', t);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <section className="mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <h1 className="text-3xl font-bold">Lion Laughs</h1>
        <p className="mt-1 text-blue-100">
          AI-written captions about Columbia life. Vote on what’s actually funny, and the best rise to the top.
        </p>
        <Link
          href={user ? '/generate' : '/login'}
          className="mt-4 inline-block rounded-full bg-white px-5 py-2 font-medium text-blue-700 hover:bg-blue-50"
        >
          + Generate captions
        </Link>
      </section>

      {!user && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You’re browsing as a guest.{' '}
          <Link href="/login" className="font-medium underline">Sign in</Link> to vote and generate your own captions.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {(['top', 'new'] as const).map((s) => (
          <Link
            key={s}
            href={href(s, topicFilter)}
            className={`rounded-full px-3 py-1 font-medium ${
              sortBy === s ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {s === 'top' ? '🔥 Top' : '✨ New'}
          </Link>
        ))}
        {topics.length > 1 && <span className="mx-1 h-5 w-px bg-zinc-300" />}
        {topics.length > 1 && topics.map((t) => (
          <Link
            key={t}
            href={href(sortBy, topicFilter === t ? '' : t)}
            className={`max-w-48 truncate rounded-full px-3 py-1 ${
              topicFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Couldn’t load captions right now. Please refresh in a moment.
        </p>
      ) : captions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-4xl">🦁</p>
          <p className="mt-2 font-medium">No captions yet</p>
          <p className="text-sm text-zinc-500">Be the first. Pick a Columbia moment and let the AI riff on it.</p>
          <Link
            href={user ? '/generate' : '/login'}
            className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate captions
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {captions.map((c, i) => (
            <li key={c.id} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
              <VoteButtons captionId={c.id} score={c.score} myVote={c.myVote} loggedIn={!!user} />
              <div className="flex-1">
                <p className="text-lg leading-snug">
                  {sortBy === 'top' && c.score > 0 && i < 3 && <span className="mr-1">{MEDALS[i]}</span>}
                  {c.content}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  <Link href={href(sortBy, c.topic)} className="rounded bg-zinc-100 px-1.5 py-0.5 hover:bg-zinc-200">
                    {c.topic}
                  </Link>
                  <span className="mx-1.5">·</span>
                  {c.votes} vote{c.votes === 1 ? '' : 's'}
                  <span className="mx-1.5">·</span>
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
