import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import GenerateForm from './generate-form';

// The generator runs prompt chains here (several LLM calls, plus fallbacks when Gemini is busy).
export const maxDuration = 120;

const STEPS = [
  { n: '01', title: 'Pick a moment', text: 'Something every Columbia student gets.' },
  { n: '02', title: 'Get captions', text: 'The AI writes a few takes in seconds.' },
  { n: '03', title: 'Vote & save', text: 'The best rise in Jokes. Star your favorites.' },
];

// Landing page: what the app is, and the caption generator front and center.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        {/* Soft Columbia-blue glow behind the hero */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/70">AI humor for Morningside Heights</p>
            <h1 className="mt-4 font-display text-6xl leading-[0.95] text-ink md:text-7xl">
              Columbia,<br />
              <span className="italic text-navy">but funnier.</span>
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
            <div className="absolute inset-x-6 top-6 rotate-[5deg] rounded-3xl bg-navy p-6 text-paper shadow-xl">
              <p className="font-display text-2xl italic leading-snug">“Butler at 3am is just a sleepover where everyone is crying quietly.”</p>
            </div>
            <div className="absolute inset-x-0 top-24 -rotate-[3deg] rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-line">
              <p className="font-display text-2xl leading-snug text-ink">
                “The 1 train skipping 116th is the MTA’s way of saying class is optional.”
              </p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="rounded-full bg-mist px-3 py-1 text-navy">The 1 train</span>
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
        <ol className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-12 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <p className="font-display text-4xl italic text-sky">{s.n}</p>
              <p className="mt-2 font-semibold text-ink">{s.title}</p>
              <p className="text-sm text-ink/60">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
