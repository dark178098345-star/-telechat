-- Account-wide activity. Only level/XP are public; detailed time and sessions are private.
begin;
create table if not exists public.activity_stats_v124 (
 nick text primary key references public.users(nick) on update cascade on delete cascade,
 active_seconds bigint not null default 0, music_seconds bigint not null default 0,
 xp bigint not null default 0, day date not null default (now() at time zone 'UTC')::date,
 active_today integer not null default 0, music_today integer not null default 0,
 active_credit_at timestamptz not null default now(), music_credit_at timestamptz not null default now(),
 sessions jsonb not null default '{}'::jsonb
);
alter table public.activity_stats_v124 enable row level security;
revoke all on public.activity_stats_v124 from public,anon,authenticated;
create or replace view public.activity_levels_v124 as
 select nick,xp,(floor(sqrt(xp/100.0))+1)::integer as level from public.activity_stats_v124;
grant select on public.activity_levels_v124 to anon,authenticated;

create or replace function public.telechat_activity_v124(p_nick text,p_pass text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 actor text; s public.activity_stats_v124%rowtype; stamp timestamptz:=clock_timestamp();
 today date:=(stamp at time zone 'UTC')::date; sid text; seq bigint; prior jsonb;
 elapsed integer:=0; a integer:=0; m integer:=0; old_xp integer:=0; kept jsonb;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново'; end if;
 if p_action not in ('snapshot','pulse') then raise exception 'Неизвестное действие'; end if;
 insert into public.activity_stats_v124(nick) values(actor) on conflict(nick) do nothing;
 select * into s from public.activity_stats_v124 where nick=actor for update;
 if s.day<>today then s.day:=today; s.active_today:=0; s.music_today:=0; end if;
 if p_action='pulse' then
  sid:=((p_data->>'session')::uuid)::text; seq:=(p_data->>'seq')::bigint;
  if sid is null or seq is null or seq<1 or seq>1000000000 then raise exception 'Неверная сессия'; end if;
  prior:=s.sessions->sid;
  if prior is null or seq>(prior->>'seq')::bigint then
   if prior is not null then
    elapsed:=greatest(0,least(90,floor(extract(epoch from stamp-(prior->>'at')::timestamptz))::integer));
    a:=greatest(0,least(coalesce((p_data->>'active')::integer,0),elapsed,
      floor(extract(epoch from stamp-s.active_credit_at))::integer));
    m:=greatest(0,least(coalesce((p_data->>'music')::integer,0),elapsed,
      floor(extract(epoch from stamp-s.music_credit_at))::integer));
   end if;
   -- UTC daily XP cap: 2h activity + 3h listening. Totals continue growing.
   old_xp:=least(s.active_today,7200)/60+2*(least(s.music_today,10800)/60);
   s.active_seconds:=s.active_seconds+a; s.music_seconds:=s.music_seconds+m;
   s.active_today:=least(86400,s.active_today+a); s.music_today:=least(86400,s.music_today+m);
   s.xp:=s.xp+least(s.active_today,7200)/60+2*(least(s.music_today,10800)/60)-old_xp;
   if a>0 then s.active_credit_at:=stamp; end if;
   if m>0 then s.music_credit_at:=stamp; end if;
   -- Keep a bounded, recent session map, without touching any chat or file data.
   select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into kept from (
    select key,value from jsonb_each(s.sessions) where key<>sid and (value->>'at')::timestamptz>stamp-interval '2 hours'
    order by (value->>'at')::timestamptz desc limit 31
   ) recent;
   s.sessions:=kept||jsonb_build_object(sid,jsonb_build_object('seq',seq,'at',stamp));
  end if;
 end if;
 update public.activity_stats_v124 set active_seconds=s.active_seconds,music_seconds=s.music_seconds,xp=s.xp,
  day=s.day,active_today=s.active_today,music_today=s.music_today,active_credit_at=s.active_credit_at,
  music_credit_at=s.music_credit_at,sessions=s.sessions where nick=actor;
 return jsonb_build_object('nick',actor,'active_seconds',s.active_seconds,'music_seconds',s.music_seconds,'xp',s.xp,
  'level',(floor(sqrt(s.xp/100.0))+1)::integer,'today_xp',least(s.active_today,7200)/60+2*(least(s.music_today,10800)/60));
end $$;
revoke all on function public.telechat_activity_v124(text,text,text,jsonb) from public;
grant execute on function public.telechat_activity_v124(text,text,text,jsonb) to anon,authenticated;
commit;
