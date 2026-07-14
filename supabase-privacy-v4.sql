-- tele.chat v4: общий поиск и приватные пространства
-- Выполни файл целиком в Supabase → SQL Editor → New query → Run

begin;

alter table public.rooms add column if not exists visibility text;

update public.rooms
set visibility='private'
where visibility is null or visibility not in ('public','private');

alter table public.rooms alter column visibility set default 'private';
alter table public.rooms alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='rooms_visibility_check'
      and conrelid='public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_visibility_check
      check (visibility in ('public','private'));
  end if;
end $$;

create index if not exists rooms_visibility_name_idx
  on public.rooms(visibility,name);

commit;

notify pgrst, 'reload schema';