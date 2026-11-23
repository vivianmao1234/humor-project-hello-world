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

  const link = 'whitespace-nowrap text-ink/60 hover:text-ink';

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-5 py-3 text-sm">
        <Link href="/" className="whitespace-nowrap font-display text-2xl font-bold tracking-tight leading-none text-ink">
          Lion <span className="text-navy">Laughs</span>
        </Link>
        <Link href="/jokes" className={link}>Jokes</Link>
        {user && <Link href="/jokes?sort=favorites" className={link}>Favorites</Link>}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <Link href="/profile" title="Your profile" className={`flex items-center gap-2 ${link}`}>
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                    {initial}
                  </span>
                )}
              </Link>
              <form action={signOutAction}>
                <button className={link}>Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="whitespace-nowrap rounded-full bg-ink px-4 py-2 font-medium text-paper hover:bg-navy">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
