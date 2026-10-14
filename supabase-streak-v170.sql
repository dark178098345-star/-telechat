-- Read-only chat streak. No tables, message/profile changes or background jobs.
-- Uses existing legacy login; does not remedy legacy message/auth permissions.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
create index if not exists exstra_messages_chat_ts_v170 on public.messages(chat_key,ts);
create or replace function public.exstra_chat_streak_v170(p_nick text,p_pass text,p_peer text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor text; peer text:=lower(trim(p_peer)); key text; today date:=(statement_timestamp() at time zone 'Asia/Bishkek')::date; days date[]; mask integer; cursor_day date; total integer:=0;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново';end if;
 if peer is null or peer=actor or not exists(select 1 from public.users where nick=peer) then raise exception 'Пользователь не найден';end if;
 key:=case when actor collate "C"<peer collate "C" then actor||'_'||peer else peer||'_'||actor end;
 -- Bounded to one year's history and returns counters only, never message text.
 with daily as (
  select (to_timestamp(m.ts::double precision/1000.0) at time zone 'Asia/Bishkek')::date as day,
         bit_or(case when m.from_nick=actor then 1 else 2 end) as flags
  from public.messages m where m.chat_key=key and m.from_nick in (actor,peer)
   and not coalesce(m.deleted,false)
   and m.ts>=(extract(epoch from ((today-365)::timestamp at time zone 'Asia/Bishkek'))*1000)::bigint
   and m.ts<=(extract(epoch from statement_timestamp())*1000)::bigint+300000
  group by 1
 ) select coalesce(array_agg(day) filter(where flags=3),'{}'::date[]),coalesce(max(flags) filter(where day=today),0) into days,mask from daily;
 cursor_day:=case when today=any(days) then today else today-1 end;
 while cursor_day=any(days) and total<365 loop total:=total+1;cursor_day:=cursor_day-1;end loop;
 return jsonb_build_object('owner',actor,'peer',peer,'days',total,'capped',total=365 and cursor_day=any(days),'today',today,'today_mask',mask,'zone','Asia/Bishkek');
end $$;
revoke all on function public.exstra_chat_streak_v170(text,text,text) from public;
grant execute on function public.exstra_chat_streak_v170(text,text,text) to anon,authenticated;
commit;
notify pgrst,'reload schema';
