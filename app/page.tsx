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

export default async function Home({ searchParams }: PageProps<'/'>) {
  const { sort } = await searchParams;
  const sortBy = sort === 'new' ? 'new' : 'top';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('captions')
    .select('id, topic, content, created_at, caption_votes(vote, user_id)')
    .order('created_at', { ascending: false })
    .limit(100);

  const captions = ((data ?? []) as Row[]).map((c) => ({
    ...c,
    score: c.caption_votes.reduce((sum, v) => sum + v.vote, 0),
    myVote: (c.caption_votes.find((v) => v.user_id === user?.id)?.vote ?? 0) as -1 | 0 | 1,
  }));

  if (sortBy === 'top') captions.sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lion Laughs</h1>
          <p className="text-zinc-500">AI captions about Columbia life. Vote on what’s actually funny.</p>
        </div>
        <Link
          href={user ? '/generate' : '/login'}
          className="rounded-full bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Generate captions
        </Link>
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {(['top', 'new'] as const).map((s) => (
          <Link
            key={s}
            href={s === 'top' ? '/' : '/?sort=new'}
            className={`rounded-full px-3 py-1 ${
              sortBy === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {s === 'top' ? 'Top' : 'New'}
          </Link>
        ))}
      </div>

      {captions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-zinc-500">
          No captions yet. Be the first to generate some.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {captions.map((c) => (
            <li key={c.id} className="flex gap-4 rounded-lg border p-4">
              <VoteButtons
                captionId={c.id}
                score={c.score}
                myVote={c.myVote}
                loggedIn={!!user}
              />
              <div className="flex-1">
                <p className="text-lg">{c.content}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  about “{c.topic}” · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
