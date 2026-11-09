-- ExstraChat virtual currency. No real-money payments or auth migration.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table if not exists public.exstra_wallets_v197(
 nick text primary key references public.users(nick) on update cascade on delete cascade,
 balance bigint not null default 50 check(balance between 0 and 9000000000000000),
 premium_until timestamptz, premium_forever boolean not null default false
);
create table if not exists public.exstra_wallet_ledger_v197(
 id bigint generated always as identity primary key, actor text not null, target text not null,
 amount bigint not null check(amount>0), kind text not null check(kind in('transfer','gift','premium','creator_grant','creator_take')),
 note text not null default '', gift_id text, created_at timestamptz not null default now()
);
create index if not exists exstra_wallet_actor_v197 on public.exstra_wallet_ledger_v197(actor,id desc);
create index if not exists exstra_wallet_target_v197 on public.exstra_wallet_ledger_v197(target,id desc);
create table if not exists public.exstra_wallet_requests_v197(
 actor text not null, request_id uuid not null, fingerprint text not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(actor,request_id)
);
create table if not exists public.exstra_nickname_badges_v197(
 nick text primary key references public.users(nick) on update cascade on delete cascade,
 image text not null default '' check(octet_length(image)<=32768), updated_at timestamptz not null default now()
);
alter table public.exstra_wallets_v197 enable row level security;
alter table public.exstra_wallet_ledger_v197 enable row level security;
alter table public.exstra_wallet_requests_v197 enable row level security;
alter table public.exstra_nickname_badges_v197 enable row level security;
revoke all on public.exstra_wallets_v197,public.exstra_wallet_ledger_v197,public.exstra_wallet_requests_v197,public.exstra_nickname_badges_v197 from anon,authenticated;
-- Preserve balances once. Re-running this upgrade never resets an existing wallet.
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='moons') then
  execute 'insert into public.exstra_wallets_v197(nick,balance) select nick,greatest(0,least(coalesce(moons,50),9000000000000000)) from public.users on conflict do nothing';
 else insert into public.exstra_wallets_v197(nick) select nick from public.users on conflict do nothing;
 end if;
end $$;
-- Retire old nickname-only spending entry points. No balances or gifts are deleted.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('telechat_transfer_moons','telechat_send_gift','telechat_creator_moons','telechat_moon_history','telechat_buy_animated_profile') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
create or replace view public.exstra_badges_public_v197 as
 select w.nick,(w.nick='creator' or w.premium_forever or coalesce(w.premium_until>now(),false)) as premium,
 case when w.nick='creator' or w.premium_forever or coalesce(w.premium_until>now(),false) then coalesce(b.image,'') else '' end as image,
 b.updated_at,w.premium_until,w.premium_forever from public.exstra_wallets_v197 w left join public.exstra_nickname_badges_v197 b using(nick);
grant select on public.exstra_badges_public_v197 to anon,authenticated;

create or replace function public.exstra_wallet_v197(p_nick text,p_pass text,p_action text,p_data jsonb default '{}',p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
<<wallet_actor>>
declare actor text; target text; amount bigint; w public.exstra_wallets_v197; item record; image_bytes bytea; image text;
 previous public.exstra_wallet_requests_v197; fingerprint text; answer jsonb; price bigint; until_at timestamptz; gift_record bigint;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново';end if;
 if p_action is null or p_action not in('state','catalog','transfer','premium','badge','gift','grant') then raise exception 'Неизвестное действие';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>34000 then raise exception 'Некорректные данные';end if;
 if p_action='catalog' then
  return jsonb_build_object('gifts',coalesce((select jsonb_agg(to_jsonb(g) order by g.sort_order) from public.moon_gifts g),'[]'::jsonb));
 end if;
 target:=case when p_action in('transfer','gift','grant') then lower(trim(p_data->>'target')) else actor end;
 if target is null or not exists(select 1 from public.users where nick=target) then raise exception 'Пользователь не найден';end if;
 insert into public.exstra_wallets_v197(nick) select nick from public.users where nick in(actor,target) order by nick on conflict do nothing;
 -- Stable lock order avoids opposite-direction transfer deadlocks.
 perform 1 from public.exstra_wallets_v197 where nick in(actor,target) order by nick for update;
 select * into w from public.exstra_wallets_v197 where nick=actor;
 if p_action='state' then
  return jsonb_build_object('balance',case when actor='creator' then null else w.balance end,'unlimited',actor='creator',
   'premium',actor='creator' or w.premium_forever or coalesce(w.premium_until>now(),false),'forever',actor='creator' or w.premium_forever,'until',w.premium_until,
   'badge',coalesce((select b.image from public.exstra_nickname_badges_v197 b where b.nick=actor),''),
   'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc) from (
    select l.id::text,l.actor,l.target,l.amount,l.kind,l.note,l.gift_id,l.created_at from public.exstra_wallet_ledger_v197 l where l.actor=wallet_actor.actor or l.target=wallet_actor.actor
    union all select 'legacy-'||t.id,t.from_nick,t.to_nick,t.amount,t.kind,t.note,t.gift_id,to_timestamp(t.created_at/1000.0) from public.moon_transactions t where t.from_nick=wallet_actor.actor or t.to_nick=wallet_actor.actor
    order by created_at desc limit 50) h),'[]'::jsonb));
 end if;
 if p_request is null then raise exception 'Нет идентификатора операции';end if;
 fingerprint:=md5(jsonb_build_array(p_action,p_data)::text);
 select * into previous from public.exstra_wallet_requests_v197 r where r.actor=wallet_actor.actor and request_id=p_request;
 if found then
  if previous.fingerprint<>fingerprint then raise exception 'Идентификатор уже использован';end if;
  return previous.result;
 end if;
 if p_action in('transfer','grant') then
  if coalesce(p_data->>'amount','') !~ '^-?[0-9]{1,10}$' then raise exception 'Введи целое количество Лун';end if;
  amount:=(p_data->>'amount')::bigint;
  if amount=0 or abs(amount)>1000000000 or (p_action='transfer' and amount<1) then raise exception 'Сумма от 1 до 1 000 000 000';end if;
  if actor=target then raise exception 'Выбери другого получателя';end if;
  if p_action='grant' and (actor<>'creator' or target='creator') then raise exception 'Нет доступа к управлению балансом';end if;
  if p_action='transfer' then
   if actor<>'creator' then update public.exstra_wallets_v197 set balance=balance-amount where nick=actor and balance>=amount;if not found then raise exception 'Недостаточно Лун';end if;end if;
   update public.exstra_wallets_v197 set balance=balance+amount where nick=target;
  else update public.exstra_wallets_v197 set balance=balance+amount where nick=target and balance+amount>=0;if not found then raise exception 'Баланс не может стать отрицательным';end if;
  end if;
  insert into public.exstra_wallet_ledger_v197(actor,target,amount,kind,note) values(actor,target,abs(amount),case when p_action='transfer' then 'transfer' when amount>0 then 'creator_grant' else 'creator_take' end,left(coalesce(p_data->>'note',''),120));
 elsif p_action='premium' then
  if p_data->>'plan' not in('30d','forever') or p_data->>'plan' is null then raise exception 'Выбери срок Premium';end if;
  if not w.premium_forever and actor<>'creator' then
   price:=case when p_data->>'plan'='30d' then 2500 else 40000 end;
   if w.balance<price then raise exception 'Недостаточно Лун';end if;
   update public.exstra_wallets_v197 set balance=balance-price,premium_forever=p_data->>'plan'='forever',
    premium_until=case when p_data->>'plan'='30d' then greatest(now(),coalesce(w.premium_until,now()))+interval '30 days' else premium_until end where nick=actor;
   insert into public.exstra_wallet_ledger_v197(actor,target,amount,kind,note) values(actor,actor,price,'premium',case when p_data->>'plan'='30d' then 'Premium · 30 дней' else 'Premium · навсегда' end);
  end if;
 elsif p_action='badge' then
  image:=coalesce(p_data->>'image','');
  if image<>'' then
   if actor<>'creator' and not w.premium_forever and not coalesce(w.premium_until>now(),false) then raise exception 'Для своего значка нужен Premium';end if;
   if length(image)>32768 or image !~ '^data:image/png;base64,[A-Za-z0-9+/]+=*$' then raise exception 'Выбери изображение через редактор значка';end if;
   begin image_bytes:=decode(substring(image from 23),'base64');exception when others then raise exception 'Некорректная картинка';end;
   if length(image_bytes)<33 or encode(substring(image_bytes from 1 for 8),'hex')<>'89504e470d0a1a0a' or encode(substring(image_bytes from 13 for 4),'hex')<>'49484452' then raise exception 'Некорректный PNG';end if;
   if get_byte(image_bytes,16)<>0 or get_byte(image_bytes,17)<>0 or get_byte(image_bytes,18)<>0 or get_byte(image_bytes,19) not between 1 and 96
    or get_byte(image_bytes,20)<>0 or get_byte(image_bytes,21)<>0 or get_byte(image_bytes,22)<>0 or get_byte(image_bytes,23) not between 1 and 96 then raise exception 'Значок должен быть до 96×96';end if;
  end if;
  insert into public.exstra_nickname_badges_v197(nick,image) values(actor,image) on conflict(nick) do update set image=excluded.image,updated_at=now();
 elsif p_action='gift' then
  select * into item from public.moon_gifts where id=p_data->>'gift';
  if not found then raise exception 'Подарок не найден';end if;
  if item.limited and coalesce(item.available_until,0)<=(extract(epoch from now())*1000)::bigint then raise exception 'Коллекция уже закрыта';end if;
  if item.limited and actor<>'creator' and exists(select 1 from public.user_gifts where sender_nick=actor and limited and created_at>(extract(epoch from now()-interval '21 days')*1000)::bigint) then raise exception 'Лимитированный подарок — один раз в 21 день';end if;
  if actor<>'creator' then update public.exstra_wallets_v197 set balance=balance-item.price where nick=actor and balance>=item.price;if not found then raise exception 'Недостаточно Лун';end if;end if;
  insert into public.user_gifts(owner_nick,sender_nick,gift_id,gift_name,gift_icon,price,rarity,theme,limited,message,created_at)
   values(target,actor,item.id,item.name,item.icon,item.price,item.rarity,item.theme,item.limited,left(coalesce(p_data->>'note',''),120),(extract(epoch from now())*1000)::bigint) returning id into gift_record;
  insert into public.exstra_wallet_ledger_v197(actor,target,amount,kind,note,gift_id) values(actor,target,item.price,'gift',left(coalesce(p_data->>'note',''),120),item.id);
 end if;
 answer:=jsonb_build_object('ok',true,'gift_record',gift_record);
 insert into public.exstra_wallet_requests_v197(actor,request_id,fingerprint,result) values(actor,p_request,fingerprint,answer);
 return answer;
end $$;
revoke all on function public.exstra_wallet_v197(text,text,text,jsonb,uuid) from public;
grant execute on function public.exstra_wallet_v197(text,text,text,jsonb,uuid) to anon,authenticated;
commit;
notify pgrst,'reload schema';
