-- tele.chat v5: описание профиля и надёжный статус «печатает…»
-- Выполни файл целиком в Supabase → SQL Editor → New query → Run

begin;

alter table public.users add column if not exists bio text;

update public.users
set bio=''
where bio is null;

alter table public.users alter column bio set default '';
alter table public.users alter column bio set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='users_bio_length_check'
      and conrelid='public.users'::regclass
  ) then
    alter table public.users
      add constraint users_bio_length_check
      check (char_length(bio) <= 220);
  end if;

  if to_regclass('public.typing') is not null then
    execute 'alter table public.typing replica identity full';
    if not exists (
      select 1
      from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename='typing'
    ) then
      alter publication supabase_realtime add table public.typing;
    end if;
  end if;
end $$;

grant select,insert,update on public.users to anon;

commit;

notify pgrst, 'reload schema';