import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';

export default async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('first_name, avatar_url').eq('id', user.id).maybeSingle()
    : { data: null };
  const initial = (profile?.first_name || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-bold">🦁 Lion Laughs</Link>
        <Link href="/jokes" className="text-zinc-600 hover:text-black">Jokes</Link>
        {user && <Link href="/generate" className="text-zinc-600 hover:text-black">Generate</Link>}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/profile" title="Your profile" className="flex items-center gap-2 text-zinc-600 hover:text-black">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {initial}
                  </span>
                )}
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <form action={signOutAction}>
                <button className="text-zinc-500 hover:text-black">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-white hover:bg-zinc-700">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
