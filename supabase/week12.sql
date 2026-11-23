-- Week 12 (PM feedback): favorites table + funnier joke prompts.

-- 1) Favorites: star a caption to save it.
create table if not exists public.caption_favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  caption_id bigint not null references public.captions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);
alter table public.caption_favorites enable row level security;
drop policy if exists "read own favorites" on public.caption_favorites;
create policy "read own favorites" on public.caption_favorites
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "add own favorites" on public.caption_favorites;
create policy "add own favorites" on public.caption_favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "remove own favorites" on public.caption_favorites;
create policy "remove own favorites" on public.caption_favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) Funnier prompts: brainstorm specifics -> 10 drafts in varied joke formats -> an editor keeps the best.
insert into public.humor_flavor_steps (humor_flavor_id, step_order, description, llm_model_id, temperature, prompt_template)
select f.id, s.step_order, s.description, m.id, s.temperature, s.prompt_template
from (values
  ('campus-observational', 1, 'Brainstorm hyper-specific details', 'gemini-flash-lite-latest', 0.9, E'You are a comedy writer brainstorming for Columbia University students.\nTopic: "{{topic}}"\nCampus details you can use:\n{{terms}}\n\nList 8 hyper-specific, true-to-life details about this topic that only a Columbia student would know or feel: exact places, times, sounds, characters, small humiliations, weird rituals. Concrete nouns, not feelings. One per line, no numbering.'),
  ('campus-observational', 2, 'Write 10 drafts in varied joke formats', 'gemini-3.8-flash', 1.1, E'You write jokes for a Columbia student meme page that people actually screenshot and send to friends.\nTopic: "{{topic}}"\nDetails to draw from:\n{{previous_output}}\n\nWrite 10 different jokes about the topic. Mix these formats:\n- an absurd but precise exaggeration ("Butler at 3am has the energy of a hostage situation where the hostages brought snacks")\n- an unexpected comparison to something outside college\n- a deadpan, overly formal statement of something ridiculous\n- a fake rule, review, warning sign or dating-app bio\n- a tiny story with a twist in the last three words\n\nRules: each under 25 words; the funniest word goes LAST; be specific (name the place, the time, the object); never explain the joke; no puns on "Columbia"; no hashtags or emojis; nothing mean about real people or groups; no drug or alcohol jokes.\nAvoid these tired phrases: "personal beef", "the MTA''s way of", "humbled", "core memory", "living rent free", "main character", "it''s giving", "no thoughts", "vibe", "nothing humbles", "nothing cures".\nOne joke per line, no numbering.'),
  ('campus-observational', 3, 'Editor picks and tightens the best', 'gemini-3.8-flash', 0.4, E'You are a ruthless comedy editor. Here are draft jokes about "{{topic}}" for Columbia students:\n{{previous_output}}\n\nPick the {{count}} funniest, most surprising and most specific jokes. Cut anything generic, predictable, that could be about any college, that mentions drugs or alcohol, or that starts with "Nothing". Tighten each one: remove filler words, make sure the funniest word lands last. Do not add emojis or hashtags.\nReturn only a JSON array of {{count}} strings.'),
  ('midwest-in-nyc', 1, 'Write 10 fish-out-of-water drafts', 'gemini-3.8-flash', 1.1, E'You write jokes from the point of view of a Columbia junior who grew up in the Midwest and is still new to New York City.\nTopic: "{{topic}}"\nCampus details you can use:\n{{terms}}\n\nWrite 10 different jokes. Contrast specific Midwest things (Casey''s, ranch on everything, saying "ope", Target runs, driving everywhere, being nice to strangers) with specific New York or Columbia reality.\nRules: each under 25 words; the funniest word goes LAST; be specific; never explain the joke; no hashtags or emojis; nothing mean about real people or groups; no drug or alcohol jokes.\nOne joke per line, no numbering.'),
  ('midwest-in-nyc', 2, 'Editor picks and tightens the best', 'gemini-3.8-flash', 0.4, E'You are a ruthless comedy editor. Here are draft jokes about "{{topic}}" for Columbia students:\n{{previous_output}}\n\nPick the {{count}} funniest, most surprising and most specific jokes. Cut anything generic, predictable, that could be about any college, that mentions drugs or alcohol, or that starts with "Nothing". Tighten each one: remove filler words, make sure the funniest word lands last. Do not add emojis or hashtags.\nReturn only a JSON array of {{count}} strings.')
) as s(flavor_slug, step_order, description, model, temperature, prompt_template)
join public.humor_flavors f on f.slug = s.flavor_slug
left join public.llm_models m on m.api_model_id = s.model
on conflict (humor_flavor_id, step_order) do update
  set description = excluded.description, llm_model_id = excluded.llm_model_id,
      temperature = excluded.temperature, prompt_template = excluded.prompt_template;

-- 3) Better examples for the model to learn the tone from.
insert into public.caption_examples (humor_flavor_id, topic, caption)
select null, e.topic, e.caption
from (values
  ('John Jay dining hall', 'John Jay orange juice is structurally indistinguishable from industrial paint thinner.'),
  ('John Jay dining hall', 'Surviving the John Jay omelet station requires more emotional resilience than a divorce hearing.'),
  ('The 1 train skipping 116th', 'Paying seventy grand a year to sprint back from 125th because the MTA decided 116th Street is purely theoretical.')
) as e(topic, caption)
where not exists (select 1 from public.caption_examples x where x.caption = e.caption);

select 'done' as status;
