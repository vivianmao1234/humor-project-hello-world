import LoginButton from './login-button';

const ERRORS: Record<string, string> = {
  not_allowed: 'Sign-ups are limited to Columbia and Barnard email addresses. Try your school Google account.',
  auth: 'Sign-in didn’t finish. Please try again.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error } = await searchParams;
  const message = typeof error === 'string' ? ERRORS[error] : undefined;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="text-5xl">🦁</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome to Lion Laughs</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in with your Columbia or Barnard Google account.</p>

        <figure className="my-6 rounded-2xl bg-blue-50 p-4 text-left">
          <blockquote className="text-sm leading-snug text-zinc-800">
            “Me watching the 1 train blow past 116th like it has personal beef with my 8:40 AM in Hamilton.”
          </blockquote>
          <figcaption className="mt-2 text-xs text-blue-700">▲ Voted up by Columbia students</figcaption>
        </figure>

        {message && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>
        )}
        <LoginButton />
      </div>
    </div>
  );
}
