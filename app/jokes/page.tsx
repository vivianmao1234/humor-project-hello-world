import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import VoteButtons from '../vote-buttons';
import FavoriteButton from '../favorite-button';

type Row = {
  id: number;
  topic: string;
  content: string;
  created_at: string;
  caption_votes: { vote: number; user_id: string }[];
};

const MEDALS = ['🥇', '🥈', '🥉'];

// The feed: browse, vote on and star captions.
export default async function JokesPage({ searchParams }: PageProps<'/jokes'>) {
  const { sort, topic } = await searchParams;
  const view = sort === 'new' ? 'new' : sort === 'favorites' ? 'favorites' : 'top';
  const topicFilter = typeof topic === 'string' ? topic : '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data, error }, favResult] = await Promise.all([
    supabase
      .from('captions')
      .select('id, topic, content, created_at, caption_votes(vote, user_id)')
      .order('created_at', { ascending: false })
      .limit(200),
    user
      ? supabase.from('caption_favorites').select('caption_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { caption_id: number }[], error: null }),
  ]);
  // If the favorites table isn't there yet, the rest of the feed still works.
  const favoritesOn = !favResult.error;
  const favorites = new Set((favResult.data ?? []).map((f) => f.caption_id));

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

  let captions = topicFilter ? all.filter((c) => c.topic === topicFilter) : all;
  if (view === 'favorites') captions = captions.filter((c) => favorites.has(c.id));
  if (view !== 'new') captions.sort((a, b) => b.score - a.score || b.votes - a.votes);

  const href = (v: string, t: string) => {
    const params = new URLSearchParams();
    if (v !== 'top') params.set('sort', v);
    if (t) params.set('topic', t);
    const qs = params.toString();
    return qs ? `/jokes?${qs}` : '/jokes';
  };

  const tabs = [
    { key: 'top', label: '🔥 Top' },
    { key: 'new', label: '✨ New' },
    ...(user && favoritesOn ? [{ key: 'favorites', label: '⭐ Favorites' }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <h1 className="font-display text-6xl font-bold tracking-tight leading-none text-ink">The <span className="text-navy">Jokes</span></h1>
      <p className="mb-8 mt-3 text-ink/60">
        {user ? 'Vote on what’s funny and star the ones you love.' : (
          <><Link href="/login" className="font-medium text-navy underline">Sign in</Link> to vote and save favorites.</>
        )}
      </p>

      <div className="mb-3 flex gap-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={href(t.key, topicFilter)}
            className={`rounded-full px-4 py-1.5 font-medium ${
              view === t.key ? 'bg-ink text-paper' : 'bg-white text-ink/70 ring-1 ring-line hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {topics.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {topics.map((t) => (
            <Link
              key={t}
              href={href(view, topicFilter === t ? '' : t)}
              className={`max-w-56 truncate rounded-full px-3 py-1 ${
                topicFilter === t ? 'bg-navy text-paper' : 'bg-mist/70 text-navy hover:bg-mist'
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
          Couldn’t load captions right now. Please refresh in a moment.
        </p>
      ) : captions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <p className="text-4xl">{view === 'favorites' ? '⭐' : '🦁'}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">{view === 'favorites' ? 'No favorites yet' : 'No captions yet'}</p>
          <p className="text-sm text-ink/55">
            {view === 'favorites' ? 'Tap the ☆ on any caption to save it here.' : 'Make the first ones on the home page.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {captions.map((c, i) => (
            <li key={c.id} className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-line transition hover:shadow-md">
              <VoteButtons captionId={c.id} score={c.score} myVote={c.myVote} loggedIn={!!user} />
              <div className="flex-1">
                <p className="text-lg font-medium leading-relaxed text-ink">
                  {view === 'top' && c.score > 0 && i < 3 && <span className="mr-1">{MEDALS[i]}</span>}
                  {c.content}
                </p>
                <p className="mt-3 text-xs text-ink/50">
                  <Link href={href(view, c.topic)} className="rounded-full bg-mist px-2.5 py-1 text-navy hover:bg-sky/40">
                    {c.topic}
                  </Link>
                  <span className="mx-1.5">·</span>
                  {c.votes} vote{c.votes === 1 ? '' : 's'}
                </p>
              </div>
              {favoritesOn && <FavoriteButton captionId={c.id} saved={favorites.has(c.id)} loggedIn={!!user} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
