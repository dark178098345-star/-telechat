-- tele.chat — покупаемый анимированный профиль v26
-- Один запуск в Supabase SQL Editor. Цена: 4 000 Лун, доступ навсегда.

begin;

alter table public.users
  add column if not exists animated_profile boolean not null default false;

-- creator и tele сохраняют особый бесплатный доступ.
update public.users
set animated_profile=true
where lower(nick) in ('creator','tele');

-- Не разрешаем включать доступ обычным update из браузера.
create or replace function public.telechat_guard_animated_profile()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.animated_profile is distinct from old.animated_profile
     and coalesce(current_setting('telechat.profile_access_write',true),'') <> 'allowed' then
    raise exception 'Доступ к анимированному профилю изменяется только через покупку';
  end if;
  return new;
end;
$$;

drop trigger if exists telechat_guard_users_animated_profile on public.users;
create trigger telechat_guard_users_animated_profile
before update of animated_profile on public.users
for each row execute function public.telechat_guard_animated_profile();

-- Добавляем покупку в историю Лун.
alter table public.moon_transactions
  drop constraint if exists moon_transactions_kind_check;
alter table public.moon_transactions
  add constraint moon_transactions_kind_check
  check (kind in ('transfer','gift','creator_grant','creator_take','animated_profile'));

create or replace function public.telechat_buy_animated_profile(p_actor_nick text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor text:=lower(trim(coalesce(p_actor_nick,'')));
  v_balance bigint;
  v_unlocked boolean;
  v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  if v_actor='' then raise exception 'Пользователь не найден'; end if;

  select moons,animated_profile
  into v_balance,v_unlocked
  from public.users
  where lower(nick)=v_actor
  for update;

  if not found then raise exception 'Пользователь не найден'; end if;

  if v_actor in ('creator','tele') then
    if not v_unlocked then
      perform set_config('telechat.profile_access_write','allowed',true);
      update public.users set animated_profile=true where lower(nick)=v_actor;
    end if;
    return jsonb_build_object('ok',true,'already_owned',true,'animated_profile',true,'balance',v_balance);
  end if;

  if v_unlocked then
    return jsonb_build_object('ok',true,'already_owned',true,'animated_profile',true,'balance',v_balance);
  end if;

  perform set_config('telechat.moon_write','allowed',true);
  perform set_config('telechat.profile_access_write','allowed',true);

  update public.users
  set moons=moons-4000,animated_profile=true
  where lower(nick)=v_actor and moons>=4000
  returning moons into v_balance;

  if not found then raise exception 'Недостаточно Лун'; end if;

  insert into public.moon_transactions(from_nick,to_nick,amount,kind,note,created_at)
  values(v_actor,v_actor,4000,'animated_profile','Анимированный профиль навсегда',v_now);

  return jsonb_build_object('ok',true,'already_owned',false,'animated_profile',true,'balance',v_balance);
end;
$$;

revoke all on function public.telechat_buy_animated_profile(text) from public;
grant execute on function public.telechat_buy_animated_profile(text) to anon, authenticated;

-- Видео остаётся публичным для просмотра, а загрузка открывается владельцам доступа.
drop policy if exists "telechat profile media read" on storage.objects;
drop policy if exists "telechat profile media insert" on storage.objects;
drop policy if exists "telechat profile media update" on storage.objects;
drop policy if exists "telechat profile media delete" on storage.objects;

create policy "telechat profile media read"
on storage.objects for select
to anon, authenticated
using (bucket_id='profile-media');

create policy "telechat profile media insert"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id='profile-media'
  and exists (
    select 1 from public.users u
    where lower(u.nick)=lower((storage.foldername(name))[1])
      and (u.animated_profile or lower(u.nick) in ('creator','tele'))
  )
);

create policy "telechat profile media update"
on storage.objects for update
to anon, authenticated
using (
  bucket_id='profile-media'
  and exists (
    select 1 from public.users u
    where lower(u.nick)=lower((storage.foldername(name))[1])
      and (u.animated_profile or lower(u.nick) in ('creator','tele'))
  )
)
with check (
  bucket_id='profile-media'
  and exists (
    select 1 from public.users u
    where lower(u.nick)=lower((storage.foldername(name))[1])
      and (u.animated_profile or lower(u.nick) in ('creator','tele'))
  )
);

create policy "telechat profile media delete"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id='profile-media'
  and exists (
    select 1 from public.users u
    where lower(u.nick)=lower((storage.foldername(name))[1])
      and (u.animated_profile or lower(u.nick) in ('creator','tele'))
  )
);

grant select,update on public.users to anon, authenticated;

commit;
notify pgrst,'reload schema';
