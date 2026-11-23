import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import GenerateForm from './generate-form';

// The generator runs prompt chains here (several LLM calls, plus fallbacks when Gemini is busy).
export const maxDuration = 120;

const STYLES = [
  {
    name: 'Campus observational',
    text: 'Hyper-specific takes on Butler, John Jay, the 1 train and the Core. The AI drafts ten jokes, then keeps only the funniest.',
    sample: 'Eating three consecutive meals at John Jay qualifies you for diplomatic immunity.',
  },
  {
    name: 'Midwest in NYC',
    text: 'A Columbia junior from the Midwest, still saying “ope” on a crowded subway and looking for ranch in Morningside.',
    sample: 'Told everyone on the 1 train this isn’t real cold, then slipped on the Low Steps and lost all credibility.',
  },
];

const STEPS = [
  { n: '01', title: 'Pick a moment', text: 'Something every Columbia student gets.' },
  { n: '02', title: 'Get captions', text: 'The AI writes a few takes in seconds.' },
  { n: '03', title: 'Vote & save', text: 'The best rise in Jokes. Star your favorites.' },
];

// Landing page: what the app is, and the caption generator front and center.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Most-captioned topics become shortcuts into Jokes.
  const { data: rows } = await supabase.from('captions').select('topic').order('created_at', { ascending: false }).limit(300);
  const counts = new Map<string, number>();
  for (const { topic } of rows ?? []) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  const topics = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main id="top" className="flex-1">
      <section className="relative overflow-hidden">
        {/* Soft Columbia-blue glow behind the hero */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/70">AI humor for Morningside Heights</p>
            <h1 className="mt-4 font-display text-6xl font-bold tracking-tight leading-[0.95] text-ink md:text-7xl">
              Columbia,<br />
              <span className="text-navy">but funnier.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/65">
              Name a campus moment. Get AI captions you’ll actually laugh at. Vote for the best and keep your favorites.
            </p>

            <div className="mt-8">
              {user ? (
                <GenerateForm />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/login" className="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:bg-navy">
                    Sign in to start
                  </Link>
                  <Link href="/jokes" className="rounded-full px-6 py-3 font-medium text-ink ring-1 ring-ink/15 hover:bg-white">
                    Browse jokes →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Illustration of a caption card */}
          <div className="relative mx-auto hidden h-80 w-full max-w-sm md:block" aria-hidden>
            <div className="absolute inset-x-6 top-0 rotate-[5deg] rounded-3xl bg-navy p-6 pb-16 text-paper shadow-xl">
              <p className="line-clamp-2 text-lg font-medium leading-snug">“Three meals at John Jay qualifies you for diplomatic immunity.”</p>
            </div>
            <div className="absolute inset-x-0 top-32 -rotate-[3deg] rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-line">
              <p className="text-xl font-medium leading-snug text-ink">
                “John Jay orange juice is structurally indistinguishable from industrial paint thinner.”
              </p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="rounded-full bg-mist px-3 py-1 text-navy">John Jay</span>
                <span className="flex items-center gap-3 text-ink/50">
                  <span className="font-semibold text-navy">▲ 24</span>
                  <span className="text-xl text-gold">★</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white/60">
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <h2 className="font-display text-4xl font-bold tracking-tight text-ink">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                <p className="font-display text-4xl font-bold tracking-tight text-sky">{s.n}</p>
                <p className="mt-3 text-lg font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-ink/60">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16">
        <h2 className="font-display text-4xl font-bold tracking-tight text-ink">Two kinds of funny</h2>
        <p className="mt-2 max-w-xl text-ink/60">Every caption runs through a multi-step AI prompt chain. Each chain has its own voice.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {STYLES.map((st, i) => (
            <article key={st.name} className={`rounded-3xl p-7 ${i === 0 ? 'bg-navy text-paper' : 'bg-mist text-ink'}`}>
              <h3 className="font-display text-2xl font-bold tracking-tight">{st.name}</h3>
              <p className={`mt-2 ${i === 0 ? 'text-paper/75' : 'text-ink/65'}`}>{st.text}</p>
              <p className={`mt-6 rounded-2xl p-4 text-lg font-medium leading-snug ${i === 0 ? 'bg-white/10' : 'bg-white'}`}>
                “{st.sample}”
              </p>
            </article>
          ))}
        </div>
      </section>

      {topics.length > 0 && (
        <section className="border-t border-line bg-white/60">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="font-display text-4xl font-bold tracking-tight text-ink">Popular moments</h2>
            <p className="mt-2 text-ink/60">Jump into the jokes about the things everyone’s talking about.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {topics.map(([topic, n]) => (
                <Link
                  key={topic}
                  href={`/jokes?topic=${encodeURIComponent(topic)}`}
                  className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 ring-1 ring-line hover:ring-navy"
                >
                  <span className="font-medium text-ink">{topic}</span>
                  <span className="ml-3 shrink-0 text-sm text-ink/45 group-hover:text-navy">{n} →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-5xl px-5 py-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-12 text-center text-paper md:py-16">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-sky/25 blur-3xl" />
          <h2 className="relative font-display text-4xl font-bold tracking-tight md:text-5xl">Got a Columbia moment?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-paper/70">Turn it into a joke in seconds, then see if the rest of campus agrees.</p>
          <Link
            href={user ? '#top' : '/login'}
            className="relative mt-8 inline-block rounded-full bg-paper px-7 py-3 font-medium text-ink hover:bg-white"
          >
            {user ? 'Make captions ↑' : 'Sign in to start'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-ink/45">
        Lion Laughs · Made at Columbia for The Humor Project
      </footer>
    </main>
  );
}
