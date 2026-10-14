'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voteAction } from './actions';

interface VoteButtonsProps {
  captionId: number;
  score: number;
  myVote: -1 | 0 | 1;
  loggedIn: boolean;
}

export default function VoteButtons({ captionId, score, myVote, loggedIn }: VoteButtonsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic({ score, myVote });

  function vote(value: 1 | -1) {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    const next = optimistic.myVote === value ? 0 : value;
    startTransition(async () => {
      setOptimistic({ score: optimistic.score - optimistic.myVote + next, myVote: next });
      await voteAction(captionId, value);
    });
  }

  return (
    <div className="flex flex-col items-center text-sm">
      <button
        onClick={() => vote(1)}
        aria-label="Upvote"
        title={loggedIn ? 'Upvote' : 'Sign in to vote'}
        className={`rounded px-2 py-1 hover:bg-zinc-100 ${optimistic.myVote === 1 ? 'text-orange-600' : 'text-zinc-400'}`}
      >
        ▲
      </button>
      <span className="font-semibold tabular-nums">{optimistic.score}</span>
      <button
        onClick={() => vote(-1)}
        aria-label="Downvote"
        title={loggedIn ? 'Downvote' : 'Sign in to vote'}
        className={`rounded px-2 py-1 hover:bg-zinc-100 ${optimistic.myVote === -1 ? 'text-blue-600' : 'text-zinc-400'}`}
      >
        ▼
      </button>
    </div>
  );
}
