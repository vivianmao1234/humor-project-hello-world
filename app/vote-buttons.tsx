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
        className={`rounded-full px-2 py-1 hover:bg-mist ${optimistic.myVote === 1 ? 'text-navy' : 'text-ink/30'}`}
      >
        ▲
      </button>
      <span className="font-semibold tabular-nums text-ink">{optimistic.score}</span>
      <button
        onClick={() => vote(-1)}
        aria-label="Downvote"
        title={loggedIn ? 'Downvote' : 'Sign in to vote'}
        className={`rounded-full px-2 py-1 hover:bg-mist ${optimistic.myVote === -1 ? 'text-red-700' : 'text-ink/30'}`}
      >
        ▼
      </button>
    </div>
  );
}
