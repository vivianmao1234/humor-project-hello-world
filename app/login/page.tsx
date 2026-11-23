import Link from 'next/link';
import LoginButton from './login-button';

const ERRORS: Record<string, string> = {
  not_allowed: 'Sign-ups are limited to Columbia and Barnard email addresses. Try your school Google account.',
  auth: 'Sign-in didn’t finish. Please try again.',
};

// Same palette as the rest of the app: navy panel with a caption, sign-in on paper.
export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error } = await searchParams;
  const message = typeof error === 'string' ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-line md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-paper md:flex">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky/30 blur-3xl" />
          <p className="relative font-display text-3xl leading-none">
            Lion <span className="italic text-sky">Laughs</span>
          </p>
          <figure className="relative">
            <blockquote className="font-display text-3xl italic leading-snug">
              “Me watching the 1 train blow past 116th like it has personal beef with my 8:40 AM.”
            </blockquote>
            <figcaption className="mt-4 text-sm text-sky">▲ Top-voted this week</figcaption>
          </figure>
        </div>

        <div className="flex flex-col justify-center p-10">
          <h1 className="font-display text-5xl leading-none text-ink">
            Welcome <span className="italic text-navy">back.</span>
          </h1>
          <p className="mt-3 text-ink/60">Sign in with your Columbia or Barnard Google account to make captions, vote and save favorites.</p>

          {message && (
            <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{message}</p>
          )}
          <div className="mt-8">
            <LoginButton />
          </div>
          <Link href="/jokes" className="mt-4 text-center text-sm text-ink/50 hover:text-ink">
            Or just browse the jokes →
          </Link>
        </div>
      </div>
    </main>
  );
}
