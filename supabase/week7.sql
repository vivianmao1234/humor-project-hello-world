-- Week 7: prompt chains, LLM observability, and signup controls.
-- Run after schema.sql (rating app) and admin.sql (admin app). Safe to run more than once.
--
-- Naming follows Crackd's reference design:
--   humor_flavors        = prompt chains (a named caption style)
--   humor_flavor_steps   = prompt chain steps (ordered LLM calls: prompt, model, temperature)
--   humor_flavor_mix     = prompt chain mix (how many captions each flavor produces per request)
--   caption_requests     = generation requests (one per "Generate" click)
--   llm_prompt_chains    = one run of a flavor for a request
--   llm_model_responses  = every LLM call: prompt, model, timing, raw output

-- ─── LLM providers & models ──────────────────────────────────────────────────

create table if not exists public.llm_providers (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  base_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_models (
  id bigint generated always as identity primary key,
  llm_provider_id bigint not null references public.llm_providers (id) on delete restrict,
  name text not null,
  api_model_id text not null unique,   -- the id sent to the provider's API
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Prompt chains (humor flavors), steps, and mix ──────────────────────────

create table if not exists public.humor_flavors (
  id bigint generated always as identity primary key,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.humor_flavor_steps (
  id bigint generated always as identity primary key,
  humor_flavor_id bigint not null references public.humor_flavors (id) on delete cascade,
  step_order int not null,
  description text,
  llm_model_id bigint references public.llm_models (id) on delete set null,
  temperature numeric(3, 2) not null default 1.0 check (temperature between 0 and 2),
  -- Placeholders: {{topic}} {{count}} {{terms}} {{examples}} {{previous_output}}
  prompt_template text not null,
  created_at timestamptz not null default now(),
  unique (humor_flavor_id, step_order)
);

create table if not exists public.humor_flavor_mix (
  id bigint generated always as identity primary key,
  humor_flavor_id bigint not null unique references public.humor_flavors (id) on delete cascade,
  caption_count int not null default 0 check (caption_count between 0 and 10),
  updated_at timestamptz not null default now()
);

-- ─── Prompt context: terms and examples ─────────────────────────────────────

create table if not exists public.terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  definition text not null,
  priority int not null default 0,   -- higher = more likely to be included in prompts
  created_at timestamptz not null default now()
);

create table if not exists public.caption_examples (
  id bigint generated always as identity primary key,
  humor_flavor_id bigint references public.humor_flavors (id) on delete cascade,  -- null = all flavors
  topic text not null,
  caption text not null,
  created_at timestamptz not null default now()
);

-- ─── Generation audit trail ──────────────────────────────────────────────────

create table if not exists public.caption_requests (
  id bigint generated always as identity primary key,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.llm_prompt_chains (
  id bigint generated always as identity primary key,
  caption_request_id bigint not null references public.caption_requests (id) on delete cascade,
  humor_flavor_id bigint references public.humor_flavors (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_model_responses (
  id bigint generated always as identity primary key,
  caption_request_id bigint not null references public.caption_requests (id) on delete cascade,
  llm_prompt_chain_id bigint references public.llm_prompt_chains (id) on delete cascade,
  humor_flavor_step_id bigint references public.humor_flavor_steps (id) on delete set null,
  llm_model_id bigint references public.llm_models (id) on delete set null,
  model_name text not null,          -- kept even if the model row is later deleted
  prompt text not null,
  response text,
  status_code int,
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists llm_model_responses_request_idx on public.llm_model_responses (caption_request_id);

alter table public.captions add column if not exists caption_request_id bigint references public.caption_requests (id) on delete set null;
alter table public.captions add column if not exists humor_flavor_id bigint references public.humor_flavors (id) on delete set null;
alter table public.captions add column if not exists llm_prompt_chain_id bigint references public.llm_prompt_chains (id) on delete set null;

-- ─── Signup controls ─────────────────────────────────────────────────────────

create table if not exists public.allowed_signup_domains (
  id bigint generated always as identity primary key,
  domain text not null unique check (domain = lower(domain)),
  created_at timestamptz not null default now()
);

create table if not exists public.whitelisted_email_addresses (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

-- Checked by the rating app right after Google sign-in. security definer so the lists
-- themselves stay private (only admins can read them).
create or replace function public.is_signup_allowed(check_email text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.whitelisted_email_addresses where email = lower(check_email))
      or exists (select 1 from public.allowed_signup_domains where domain = lower(split_part(check_email, '@', 2)));
$$;

revoke execute on function public.is_signup_allowed(text) from public, anon;
grant execute on function public.is_signup_allowed(text) to authenticated;

-- ─── Row Level Security ──────────────────────────────────────────────────────

do $$
declare t text;
begin
  -- Pipeline config: any signed-in user can read it (generation runs as them); only admins edit it.
  foreach t in array array['llm_providers', 'llm_models', 'humor_flavors', 'humor_flavor_steps',
                           'humor_flavor_mix', 'terms', 'caption_examples'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "signed-in users read %1$s" on public.%1$I', t);
    execute format('create policy "signed-in users read %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t);
  end loop;

  -- Signup lists: admins only.
  foreach t in array array['allowed_signup_domains', 'whitelisted_email_addresses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t);
  end loop;
end $$;

-- Audit trail: users create and see their own; admins see everything. Nobody edits history.
alter table public.caption_requests enable row level security;
alter table public.llm_prompt_chains enable row level security;
alter table public.llm_model_responses enable row level security;

drop policy if exists "read own or admin" on public.caption_requests;
create policy "read own or admin" on public.caption_requests
  for select to authenticated using (profile_id = (select auth.uid()) or public.is_superadmin());
drop policy if exists "create own" on public.caption_requests;
create policy "create own" on public.caption_requests
  for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "finish own" on public.caption_requests;
create policy "finish own" on public.caption_requests
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "read own or admin" on public.llm_prompt_chains;
create policy "read own or admin" on public.llm_prompt_chains
  for select to authenticated using (
    public.is_superadmin() or exists (
      select 1 from public.caption_requests r where r.id = caption_request_id and r.profile_id = (select auth.uid())));
drop policy if exists "create own" on public.llm_prompt_chains;
create policy "create own" on public.llm_prompt_chains
  for insert to authenticated with check (
    exists (select 1 from public.caption_requests r where r.id = caption_request_id and r.profile_id = (select auth.uid())));

drop policy if exists "read own or admin" on public.llm_model_responses;
create policy "read own or admin" on public.llm_model_responses
  for select to authenticated using (
    public.is_superadmin() or exists (
      select 1 from public.caption_requests r where r.id = caption_request_id and r.profile_id = (select auth.uid())));
drop policy if exists "create own" on public.llm_model_responses;
create policy "create own" on public.llm_model_responses
  for insert to authenticated with check (
    exists (select 1 from public.caption_requests r where r.id = caption_request_id and r.profile_id = (select auth.uid())));

-- ─── Seed data (only inserted if missing) ───────────────────────────────────

insert into public.llm_providers (name, slug, base_url)
values ('Google Gemini', 'google-gemini', 'https://generativelanguage.googleapis.com/v1beta')
on conflict (slug) do nothing;

insert into public.llm_models (llm_provider_id, name, api_model_id)
select p.id, m.name, m.api_model_id
from public.llm_providers p,
  (values ('Gemini 3.8 Flash', 'gemini-3.8-flash'),
          ('Gemini Flash (latest)', 'gemini-flash-latest'),
          ('Gemini Flash Lite (latest)', 'gemini-flash-lite-latest'),
          ('Gemini 3.1 Flash Lite', 'gemini-3.1-flash-lite')) as m(name, api_model_id)
where p.slug = 'google-gemini'
on conflict (api_model_id) do nothing;

insert into public.humor_flavors (slug, description) values
  ('campus-observational', 'Observational humor about specific Columbia places and routines. Two steps: brainstorm angles, then write captions.'),
  ('midwest-in-nyc', 'Fish-out-of-water jokes from a Midwesterner new to New York. One step.')
on conflict (slug) do nothing;

insert into public.humor_flavor_steps (humor_flavor_id, step_order, description, llm_model_id, temperature, prompt_template)
select f.id, s.step_order, s.description, m.id, s.temperature, s.prompt_template
from (values
  ('campus-observational', 1, 'Brainstorm specific, relatable angles', 'gemini-flash-lite-latest', 0.9,
   E'You help write humor for Columbia University students.\nTopic: "{{topic}}"\nUseful campus lore:\n{{terms}}\n\nList 5 specific, relatable observations about this topic that a Columbia junior would recognize. One per line, no numbering.'),
  ('campus-observational', 2, 'Turn the best angles into captions', 'gemini-3.8-flash', 1.0,
   E'You write short, funny captions for Columbia University students: chronically online juniors who live in the dorms and explore NYC on weekends.\nTopic: "{{topic}}"\nAngles to draw from:\n{{previous_output}}\n\nCaptions people liked before:\n{{examples}}\n\nWrite {{count}} different captions, each under 25 words. No hashtags, no emojis, nothing mean-spirited.\nReturn only a JSON array of {{count}} strings.'),
  ('midwest-in-nyc', 1, 'Write fish-out-of-water captions', 'gemini-3.8-flash', 1.1,
   E'You write short, funny captions from the point of view of a Columbia junior who grew up in the Midwest and is still new to New York City.\nTopic: "{{topic}}"\nUseful campus lore:\n{{terms}}\n\nCaptions people liked before:\n{{examples}}\n\nWrite {{count}} different captions, each under 25 words. No hashtags, no emojis, nothing mean-spirited.\nReturn only a JSON array of {{count}} strings.')
) as s(flavor_slug, step_order, description, model, temperature, prompt_template)
join public.humor_flavors f on f.slug = s.flavor_slug
left join public.llm_models m on m.api_model_id = s.model
on conflict (humor_flavor_id, step_order) do nothing;

insert into public.humor_flavor_mix (humor_flavor_id, caption_count)
select id, case slug when 'campus-observational' then 2 else 1 end
from public.humor_flavors
where slug in ('campus-observational', 'midwest-in-nyc')
on conflict (humor_flavor_id) do nothing;

insert into public.terms (term, definition, priority) values
  ('Butler', 'Butler Library, the main study library; open 24 hours during finals, famous for all-nighters.', 10),
  ('Low Steps', 'The big steps in front of Low Library where students sit, eat, and people-watch.', 9),
  ('John Jay', 'John Jay Dining Hall, the main all-you-can-eat dining hall.', 8),
  ('Ferris Booth', 'Ferris Booth Commons in Lerner Hall; its elevators are notoriously slow.', 6),
  ('the 1 train', 'The subway line that stops at 116th St–Columbia University; the main way off campus.', 9),
  ('Core Curriculum', 'Required classes every Columbia College student takes, like Lit Hum and CC.', 7),
  ('Lerner', 'Lerner Hall, the student center with ramps everyone uses as a shortcut.', 5),
  ('Morningside Heights', 'The neighborhood around Columbia.', 4)
on conflict (term) do nothing;

insert into public.caption_examples (humor_flavor_id, topic, caption)
select f.id, e.topic, e.caption
from (values
  (null, 'Butler at 3am during midterms', 'Butler at 3am is just a group chat where everyone is on mute and silently judging each other''s snacks.'),
  ('midwest-in-nyc', 'First NYC winter as a Midwesterner', 'Told everyone on the 1 train this isn''t real cold, then slipped on the Low Steps and lost all credibility.'),
  ('campus-observational', 'Waiting for the Ferris Booth elevator', 'The Ferris Booth elevator has taught me more about patience than the entire Core Curriculum.')
) as e(flavor_slug, topic, caption)
left join public.humor_flavors f on f.slug = e.flavor_slug
where not exists (select 1 from public.caption_examples x where x.caption = e.caption);

insert into public.allowed_signup_domains (domain) values ('columbia.edu'), ('barnard.edu')
on conflict (domain) do nothing;

insert into public.whitelisted_email_addresses (email, note)
values ('vivianmao914@gmail.com', 'Owner''s personal account')
on conflict (email) do nothing;
