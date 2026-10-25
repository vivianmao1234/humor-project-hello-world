'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginButton() {
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
    <button
      onClick={signInWithGoogle}
      className="rounded-full bg-black px-6 py-3 text-white hover:bg-zinc-800"
    >
      Continue with Google
    </button>
  );
}
