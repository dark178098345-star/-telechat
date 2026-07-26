-- tele.chat — подарки себе и активная лимитированная коллекция v29
-- Запусти файл целиком один раз в Supabase SQL Editor.

begin;

-- Если старая лимитированная коллекция уже закрылась, открываем её ещё на 42 дня.
update public.moon_gifts
set available_until=(extract(epoch from clock_timestamp())*1000)::bigint+3628800000
where limited=true
  and coalesce(available_until,0)<=(extract(epoch from clock_timestamp())*1000)::bigint;

create or replace function public.telechat_send_gift(
  p_actor_nick text, p_target_nick text, p_gift_id text, p_message text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_actor text:=lower(trim(coalesce(p_actor_nick,'')));
  v_target text:=lower(trim(coalesce(p_target_nick,'')));
  v_gift public.moon_gifts%rowtype;
  v_balance bigint;
  v_target_exists boolean;
  v_now bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
  v_last_limited bigint;
  v_record_id bigint;
  v_self_gift boolean;
begin
  if v_actor='' or v_target='' then raise exception 'Не указан отправитель или получатель'; end if;
  v_self_gift:=v_actor=v_target;

  select * into v_gift from public.moon_gifts where id=p_gift_id;
  if v_gift.id is null then raise exception 'Подарок не найден'; end if;
  if v_gift.limited and coalesce(v_gift.available_until,0)<=v_now then
    raise exception 'Лимитированная коллекция уже закрыта';
  end if;

  select moons into v_balance from public.users where lower(nick)=v_actor for update;
  select exists(select 1 from public.users where lower(nick)=v_target) into v_target_exists;
  if v_balance is null then raise exception 'Отправитель не найден'; end if;
  if not v_target_exists then raise exception 'Получатель не найден'; end if;

  -- Подарок себе разрешён. Пауза 21 день остаётся общей для обычных аккаунтов,
  -- а creator может отправлять лимитированные подарки без паузы.
  if v_gift.limited and v_actor<>'creator' then
    select max(created_at) into v_last_limited
    from public.user_gifts
    where lower(sender_nick)=v_actor and limited=true;
    if coalesce(v_last_limited,0)>v_now-1814400000 then
      raise exception 'Лимитированный подарок доступен один раз в 21 день';
    end if;
  end if;

  perform set_config('telechat.moon_write','allowed',true);
  if v_actor<>'creator' then
    update public.users
    set moons=moons-v_gift.price
    where lower(nick)=v_actor and moons>=v_gift.price
    returning moons into v_balance;
    if not found then raise exception 'Недостаточно Лун'; end if;
  end if;

  insert into public.user_gifts(
    owner_nick,sender_nick,gift_id,gift_name,gift_icon,price,rarity,theme,limited,message,created_at
  ) values(
    v_target,v_actor,v_gift.id,v_gift.name,v_gift.icon,v_gift.price,v_gift.rarity,
    v_gift.theme,v_gift.limited,left(coalesce(p_message,''),120),v_now
  ) returning id into v_record_id;

  insert into public.moon_transactions(from_nick,to_nick,amount,kind,gift_id,note,created_at)
  values(v_actor,v_target,v_gift.price,'gift',v_gift.id,left(coalesce(p_message,''),120),v_now);

  return jsonb_build_object(
    'ok',true,
    'balance',case when v_actor='creator' then 1000000000 else v_balance end,
    'gift_record_id',v_record_id,
    'gift_id',v_gift.id,
    'limited',v_gift.limited,
    'self_gift',v_self_gift,
    'next_limited_at',case when v_gift.limited and v_actor<>'creator' then v_now+1814400000 else null end
  );
end;
$$;

revoke all on function public.telechat_send_gift(text,text,text,text) from public;
grant execute on function public.telechat_send_gift(text,text,text,text) to anon, authenticated;

commit;
notify pgrst,'reload schema';
