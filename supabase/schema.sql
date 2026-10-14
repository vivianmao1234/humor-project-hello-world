-- Run this whole file in Supabase → SQL Editor. It is safe to run more than once.

-- ─── Week 3: profiles + trigger ──────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed in before the trigger existed.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Avatar photos live in Storage, not in the database.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ─── Week 4: AI captions + votes ─────────────────────────────────────────────

create table if not exists public.captions (
  id bigint generated always as identity primary key,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic text not null,
  prompt text not null,   -- the exact prompt sent to the model
  model text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.caption_votes (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index if not exists caption_votes_caption_id_idx on public.caption_votes (caption_id);

-- ─── Row Level Security: strictest rules that still let the app work ────────

alter table public.jokes enable row level security;
alter table public.profiles enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;

-- jokes: read-only for everyone
drop policy if exists "jokes are public" on public.jokes;
create policy "jokes are public" on public.jokes
  for select using (true);

-- profiles: you can only see and edit your own
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- captions: anyone can read; only logged-in users can create, as themselves
drop policy if exists "captions are public" on public.captions;
create policy "captions are public" on public.captions
  for select using (true);

drop policy if exists "create own captions" on public.captions;
create policy "create own captions" on public.captions
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

-- votes: anyone can read (for scores); logged-in users manage only their own vote
drop policy if exists "votes are public" on public.caption_votes;
create policy "votes are public" on public.caption_votes
  for select using (true);

drop policy if exists "cast own vote" on public.caption_votes;
create policy "cast own vote" on public.caption_votes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "change own vote" on public.caption_votes;
create policy "change own vote" on public.caption_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "remove own vote" on public.caption_votes;
create policy "remove own vote" on public.caption_votes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- avatars bucket: anyone can view; users can only write inside their own folder (<user id>/...)
drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "update own avatar" on storage.objects;
create policy "update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
