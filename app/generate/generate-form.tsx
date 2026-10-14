'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { generateAction, type GenerateState } from '../actions';

const IDEAS = [
  'Butler at 3am during midterms',
  'The 1 train skipping 116th',
  'John Jay dining hall',
  'First NYC winter as a Midwesterner',
  'Waiting for the Ferris Booth elevator',
];

export default function GenerateForm() {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(generateAction, {});

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="topic"
          required
          maxLength={120}
          placeholder="e.g. Butler at 3am during midterms"
          className="rounded-lg border px-4 py-3"
        />
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
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Writing jokes…' : 'Generate'}
        </button>
      </form>

      {state.error && <p className="text-red-600">{state.error}</p>}

      {state.captions && (
        <div className="rounded-lg border bg-blue-50 p-4">
          <p className="mb-2 font-semibold">Posted to the feed:</p>
          <ul className="list-disc space-y-1 pl-5">
            {state.captions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Link href="/?sort=new" className="mt-3 inline-block text-blue-700 underline">
            See them in the feed →
          </Link>
        </div>
      )}
    </div>
  );
}
