'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <button
        onClick={signInWithGoogle}
        className="rounded-full bg-black px-6 py-3 text-white hover:bg-zinc-800"
      >
        Continue with Google
      </button>
    </div>
  );
}
