import { createClient } from '@/lib/supabase/server';

interface Joke {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

// Rendered on the server so the list is in the page as soon as it loads.
export default async function JokesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('jokes').select('*').order('id');
  const jokes = (data ?? []) as Joke[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Jokes</h1>
      <p className="mb-6 text-zinc-500">Classic jokes, straight from the database.</p>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Couldn’t load jokes right now. Please refresh in a moment.
        </p>
      ) : jokes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">No jokes yet.</p>
      ) : (
        <ul className="grid gap-3">
          {jokes.map((joke) => (
            <li key={joke.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
              <p className="font-semibold">{joke.title}</p>
              <p className="mt-1 text-zinc-600">{joke.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
