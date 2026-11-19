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
      className="w-full rounded-full bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
    >
      Continue with Google
    </button>
  );
}
