import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';

export default async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <nav className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-bold">🦁 Lion Laughs</Link>
        <Link href="/jokes" className="text-zinc-600 hover:text-black">Jokes</Link>
        {user && <Link href="/generate" className="text-zinc-600 hover:text-black">Generate</Link>}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <Link href="/profile" className="text-zinc-600 hover:text-black">Profile</Link>
              <form action={signOutAction}>
                <button className="text-zinc-600 hover:text-black">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-black px-4 py-1.5 text-white">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
