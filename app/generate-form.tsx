'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { generateAction, type GenerateState } from './actions';

const IDEAS = [
  'Butler at 3am during midterms',
  'The 1 train skipping 116th',
  'John Jay dining hall',
  'First NYC winter as a Midwesterner',
];

// Shown in turn while the prompt chain runs, so the wait feels like progress.
const STAGES = ['Brainstorming what’s relatable…', 'Writing captions…', 'Picking the funniest ones…'];

export default function GenerateForm() {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(generateAction, {});
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4000);
    return () => {
      clearInterval(timer);
      setStage(0);
    };
  }, [pending]);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <div className="flex gap-2">
          <input
            name="topic"
            required
            maxLength={120}
            aria-label="Your Columbia moment"
            placeholder="e.g. Butler at 3am during midterms"
            className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Generate
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="submit"
              name="idea"
              value={idea}
              formNoValidate
              disabled={pending}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
            >
              {idea}
            </button>
          ))}
        </div>
        {pending && (
          <p className="flex items-center gap-2 text-sm text-blue-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            {STAGES[stage]}
          </p>
        )}
      </form>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{state.error}</p>
      )}

      {state.captions && !pending && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="mb-2 font-semibold">Your new captions:</p>
          <ul className="list-disc space-y-1 pl-5">
            {state.captions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Link href="/jokes?sort=new" className="mt-3 inline-block font-medium text-blue-700 hover:underline">
            Vote on them in Jokes →
          </Link>
        </div>
      )}
    </div>
  );
}
