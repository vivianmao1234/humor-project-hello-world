'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginButton() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-full bg-ink px-6 py-3.5 font-medium text-paper hover:bg-navy disabled:opacity-70"
    >
      {loading ? (
        <>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
          Taking you to Google…
        </>
      ) : (
        <>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-navy">G</span>
          Continue with Google
        </>
      )}
    </button>
  );
}
