-- tele.chat — лайки историй V116
-- Выполни файл целиком в Supabase → SQL Editor → New query → Run.

begin;

create table if not exists public.story_likes (
  story_id bigint not null references public.stories(id) on delete cascade,
  liker_nick text not null references public.users(nick) on update cascade on delete cascade,
  liked_at bigint not null default ((extract(epoch from clock_timestamp()) * 1000)::bigint),
  primary key (story_id, liker_nick)
);

create index if not exists story_likes_story_idx on public.story_likes(story_id, liked_at desc);
create index if not exists story_likes_user_idx on public.story_likes(liker_nick, liked_at desc);

alter table public.story_likes enable row level security;

drop policy if exists "telechat story likes read" on public.story_likes;
drop policy if exists "telechat story likes create" on public.story_likes;
drop policy if exists "telechat story likes delete" on public.story_likes;
create policy "telechat story likes read" on public.story_likes for select to anon, authenticated using (true);
create policy "telechat story likes create" on public.story_likes for insert to anon, authenticated with check (true);
create policy "telechat story likes delete" on public.story_likes for delete to anon, authenticated using (true);

grant select, insert, delete on public.story_likes to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='story_likes'
  ) then
    alter publication supabase_realtime add table public.story_likes;
  end if;
end $$;

commit;
notify pgrst, 'reload schema';
