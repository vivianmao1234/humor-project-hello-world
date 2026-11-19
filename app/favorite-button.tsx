'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { favoriteAction } from './actions';

export default function FavoriteButton({ captionId, saved, loggedIn }: { captionId: number; saved: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(saved);

  function toggle() {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    startTransition(async () => {
      setOptimistic(!optimistic);
      await favoriteAction(captionId, !optimistic);
    });
  }

  return (
    <button
      onClick={toggle}
      aria-label={optimistic ? 'Remove from favorites' : 'Save to favorites'}
      title={loggedIn ? (optimistic ? 'Remove from favorites' : 'Save to favorites') : 'Sign in to save favorites'}
      className={`self-start rounded px-1 text-2xl leading-none hover:bg-zinc-100 ${optimistic ? 'text-amber-400' : 'text-zinc-300'}`}
    >
      {optimistic ? '★' : '☆'}
    </button>
  );
}
