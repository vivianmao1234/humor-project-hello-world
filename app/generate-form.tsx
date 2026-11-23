'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { generateAction, type GenerateState } from './actions';
import FavoriteButton from './favorite-button';

const IDEAS = [
  'Butler at 3am during midterms',
  'The 1 train skipping 116th',
  'John Jay dining hall',
  'First NYC winter',
];

// Shown in turn while the prompt chain runs, so the wait feels like progress.
const STAGES = ['Brainstorming what’s relatable…', 'Writing captions…', 'Picking the funniest ones…'];

export default function GenerateForm() {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(generateAction, {});
  const [stage, setStage] = useState(0);
  // Which result the popup was closed for, so a new result opens it again.
  const [closedFor, setClosedFor] = useState<GenerateState | null>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4000);
    return () => {
      clearInterval(timer);
      setStage(0);
    };
  }, [pending]);

  const showPopup = !!state.captions?.length && !pending && closedFor !== state;
  const close = () => setClosedFor(state);

  return (
    <>
      <form action={formAction} className="rounded-3xl bg-white p-2 shadow-lg ring-1 ring-line">
        <div className="flex gap-2">
          <input
            name="topic"
            required
            maxLength={120}
            aria-label="Your Columbia moment"
            placeholder="Butler at 3am during midterms…"
            className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-3 outline-none placeholder:text-ink/35"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:bg-navy disabled:opacity-50"
          >
            {pending ? 'Writing…' : 'Generate'}
          </button>
        </div>
      </form>

      {pending ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-navy">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky border-t-navy" />
          {STAGES[stage]}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              className="rounded-full bg-white/70 px-3 py-1.5 text-sm text-ink/70 ring-1 ring-line hover:bg-white hover:text-ink"
              onClick={() => {
                const data = new FormData();
                data.set('idea', idea);
                startTransition(() => formAction(data));
              }}
            >
              {idea}
            </button>
          ))}
        </div>
      )}

      {state.error && !pending && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{state.error}</p>
      )}

      {showPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fresh-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={close}
        >
          <div
            className="animate-pop-in w-full max-w-lg rounded-3xl bg-paper p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 id="fresh-title" className="font-display text-4xl text-ink">
                Fresh <span className="italic text-navy">captions</span>
              </h2>
              <button onClick={close} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-ink/40 hover:text-ink">
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-ink/55">They’re live in Jokes for everyone to vote on. Star the ones you love.</p>

            <ul className="mt-5 flex flex-col gap-3">
              {state.captions!.map((c) => (
                <li key={c.id} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                  <p className="flex-1 leading-snug">{c.content}</p>
                  <FavoriteButton captionId={c.id} saved={false} loggedIn />
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/jokes?sort=new" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy">
                Vote in Jokes →
              </Link>
              <button onClick={close} className="rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/15 hover:bg-white">
                Make more
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
