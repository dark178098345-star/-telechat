-- Install without opening the collection. See docs/gifts-week-v233.md to activate.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create schema if not exists exstra_gift_release_v233;
revoke all on schema exstra_gift_release_v233 from public, anon, authenticated, service_role;

create table if not exists exstra_gift_release_v233.editions (
  id text primary key,
  opens_at bigint not null,
  closes_at bigint not null,
  check (closes_at - opens_at = 604800000)
);
revoke all on table exstra_gift_release_v233.editions from public, anon, authenticated, service_role;

-- Existing purchases keep their historical snapshots; no wallet balances change.
insert into public.moon_gifts(id,name,icon,price,rarity,theme,limited,available_until,sort_order) values
('party_sparkler','Бенгальская искра','✦',750,'limited','amber',true,0,90),
('glass_butterfly','Стеклянная бабочка','✦',1250,'limited','rose',true,0,91),
('polar_lantern','Полярный фонарь','✦',1900,'limited','cyan',true,0,92),
('velvet_planet','Бархатная планета','✦',2800,'limited','violet',true,0,93),
('wish_bottle','Бутылочка желаний','✦',50,'common','blue',false,null,0),
('aurora_jelly','Медуза сияния','✦',100,'rare','green',false,null,0)
on conflict (id) do nothing;

-- The existing wallet RPC handles balance, cooldown and expiry. Activation is an
-- owner task, never callable from the application and never repeated on retry.
create or replace function public.exstra_open_gift_week_v233()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_ids text[] := array[
    'party_sparkler','glass_butterfly','polar_lantern','velvet_planet',
    'aurora_core','red_eclipse','celestial_mask','chrono_moon','phoenix_orbit','quantum_crown',
    'singularity_eye','frozen_supernova','black_comet','royal_satellite','dream_portal','first_moon'
  ];
  v_edition exstra_gift_release_v233.editions%rowtype;
  v_now bigint;
  v_changed integer;
begin
  perform pg_advisory_xact_lock(hashtext('exstra:gift-release:week-v233'));
  select * into v_edition from exstra_gift_release_v233.editions where id = 'week-v233';
  if found then
    return jsonb_build_object('opened',false,'opens_at',v_edition.opens_at,'closes_at',v_edition.closes_at);
  end if;
  v_now := floor(extract(epoch from clock_timestamp())*1000)::bigint;
  update public.moon_gifts set available_until = v_now + 604800000
  where id = any(v_ids) and limited;
  get diagnostics v_changed = row_count;
  if v_changed <> cardinality(v_ids) then
    raise exception 'Не все подарки коллекции найдены. Ничего не открыто.';
  end if;
  insert into exstra_gift_release_v233.editions values ('week-v233',v_now,v_now+604800000);
  return jsonb_build_object('opened',true,'opens_at',v_now,'closes_at',v_now+604800000,'gifts',v_changed);
end $$;
revoke all on function public.exstra_open_gift_week_v233() from public, anon, authenticated, service_role;
commit;
