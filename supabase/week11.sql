-- Week 11: favorite captions (PM feedback: "add a star option to save favorite captions").
create table if not exists public.caption_favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  caption_id bigint not null references public.captions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);

alter table public.caption_favorites enable row level security;

-- Favorites are private: you only see and change your own.
drop policy if exists "read own favorites" on public.caption_favorites;
create policy "read own favorites" on public.caption_favorites
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "add own favorites" on public.caption_favorites;
create policy "add own favorites" on public.caption_favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "remove own favorites" on public.caption_favorites;
create policy "remove own favorites" on public.caption_favorites
  for delete to authenticated using ((select auth.uid()) = user_id);
