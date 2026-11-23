-- Faster captions: each chain becomes one well-structured call (draft many, keep the best).

delete from public.humor_flavor_steps
where step_order > 1
  and humor_flavor_id in (select id from public.humor_flavors where slug in ('campus-observational', 'midwest-in-nyc'));

update public.humor_flavor_steps s
set description = 'Draft 10 jokes, keep the funniest',
    temperature = 1.0,
    llm_model_id = (select id from public.llm_models where api_model_id = 'gemini-flash-lite-latest'),
    prompt_template = v.prompt
from (values
  ('campus-observational', E'You write jokes for a Columbia student meme page that people actually screenshot and send to friends.\nTopic: "{{topic}}"\n\nSilently think of hyper-specific details only a Columbia student would know about this topic (exact places like Butler, John Jay, Ferris Booth, Low Steps, the 1 train, Lit Hum; times, sounds, small humiliations). Then silently draft 10 jokes mixing these formats: an absurd but precise exaggeration; an unexpected comparison to something outside college; a deadpan, overly formal statement of something ridiculous; a fake rule, review, warning sign or dating-app bio; a tiny story with a twist at the end.\nThen act as a ruthless editor and keep only the {{count}} funniest, most surprising and most specific. Cut anything that could be about any college.\n\nRules: each under 25 words; the funniest word goes LAST; never explain the joke; no hashtags or emojis; nothing mean about real people or groups; no drug or alcohol jokes; never start with "Nothing".\nAvoid these tired phrases: "personal beef", "the MTA''s way of", "humbled", "core memory", "living rent free", "main character", "it''s giving", "vibe".\nReturn only a JSON array of {{count}} strings.'),
  ('midwest-in-nyc', E'You write jokes from the point of view of a Columbia junior who grew up in the Midwest and is still new to New York City.\nTopic: "{{topic}}"\n\nSilently draft 10 jokes contrasting specific Midwest things (Casey''s, ranch on everything, saying "ope", Target runs, driving everywhere, being nice to strangers) with specific New York or Columbia reality (the 1 train, Butler, John Jay, bodegas, rent). Then act as a ruthless editor and keep only the {{count}} funniest and most specific.\n\nRules: each under 25 words; the funniest word goes LAST; never explain the joke; no hashtags or emojis; nothing mean about real people or groups; no drug or alcohol jokes; never start with "Nothing".\nReturn only a JSON array of {{count}} strings.')
) as v(slug, prompt)
join public.humor_flavors f on f.slug = v.slug
where s.humor_flavor_id = f.id and s.step_order = 1;

select f.slug, count(*) as steps
from public.humor_flavor_steps s join public.humor_flavors f on f.id = s.humor_flavor_id
group by f.slug;
