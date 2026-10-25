import LoginButton from './login-button';

const ERRORS: Record<string, string> = {
  not_allowed: 'Sign-ups are limited to Columbia and Barnard email addresses. Try your school Google account.',
  auth: 'Sign-in didn’t finish. Please try again.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error } = await searchParams;
  const message = typeof error === 'string' ? ERRORS[error] : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Use your Columbia or Barnard Google account.</p>
      </div>
      {message && (
        <p className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          {message}
        </p>
      )}
      <LoginButton />
    </div>
  );
}
