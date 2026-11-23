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
      className="flex w-full items-center justify-center gap-3 rounded-full bg-ink px-6 py-3.5 font-medium text-paper hover:bg-navy"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-navy">G</span>
      Continue with Google
    </button>
  );
}
