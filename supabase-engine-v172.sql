-- Additive transport upgrade; no user data deletion, auth migration or RLS changes.
-- Legacy credentials remain in use. This is not a replacement for Supabase Auth.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
alter table public.messages add column if not exists client_id_v172 text;
alter table public.messages add column if not exists client_hash_v172 text;
create unique index if not exists exstra_message_nonce_v172 on public.messages(from_nick,client_id_v172) where client_id_v172 is not null;
create index if not exists exstra_typing_nick_ts_v172 on public.typing(nick,ts);

create or replace function public.exstra_send_messages_v172(p_nick text,p_pass text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor text; item jsonb; saved public.messages%rowtype; result jsonb:='[]'; nonce text; key text; body text; reply text; stamp bigint; fingerprint text;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Некорректный список сообщений';end if;
 if jsonb_array_length(p_rows) not between 1 and 50 or octet_length(p_rows::text)>16777216 then raise exception 'Отправляй до 50 сообщений за раз, не более 16 МБ';end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  nonce:=item->>'client_id_v172';key:=item->>'chat_key';body:=item->>'text';reply:=item->>'reply_text';
  if item->>'from_nick' is distinct from actor or nonce is null or length(nonce) not between 10 and 96 or nonce !~ '^[a-zA-Z0-9_-]+$' or key is null or length(key)>180 or body is null or octet_length(body)>8388608 or coalesce(length(reply),0)>16384 then raise exception 'Некорректное сообщение';end if;
  begin stamp:=(item->>'ts')::bigint;exception when others then raise exception 'Некорректное время сообщения';end;
  if stamp is null or stamp<1 or stamp>9007199254740991 then raise exception 'Некорректное время сообщения';end if;
  if left(key,5)='room_' then
   if not exists(select 1 from public.rooms r where 'room_'||r.id::text=key and (r.owner_nick=actor or (r.type<>'channel' and exists(select 1 from public.room_members m where m.room_id=r.id and m.user_nick=actor)))) then raise exception 'Нет доступа к отправке в это пространство';end if;
  elsif not exists(select 1 from public.users u where u.nick<>actor and key=case when actor collate "C"<u.nick collate "C" then actor||'_'||u.nick else u.nick||'_'||actor end) then raise exception 'Чат не найден';end if;
  fingerprint:=md5(jsonb_build_array(key,actor,body,stamp,reply)::text);
  select * into saved from public.messages where from_nick=actor and client_id_v172=nonce;
  if saved.id is null then
   insert into public.messages(chat_key,from_nick,text,ts,reply_text,deleted,client_id_v172,client_hash_v172)
    values(key,actor,body,stamp,reply,false,nonce,fingerprint)
    on conflict(from_nick,client_id_v172) where client_id_v172 is not null do nothing returning * into saved;
   if saved.id is null then select * into saved from public.messages where from_nick=actor and client_id_v172=nonce;end if;
  end if;
  if saved.id is null or saved.client_hash_v172 is distinct from fingerprint then raise exception 'Повторный идентификатор другого сообщения';end if;
  result:=result||jsonb_build_array(to_jsonb(saved));
 end loop;
 return jsonb_build_object('rows',result,'server_time',(extract(epoch from statement_timestamp())*1000)::bigint);
end $$;
revoke all on function public.exstra_send_messages_v172(text,text,jsonb) from public;
grant execute on function public.exstra_send_messages_v172(text,text,jsonb) to anon,authenticated;

create or replace function public.exstra_presence_snapshot_v172(p_nick text,p_pass text,p_nicks text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; cutoff bigint:=(extract(epoch from statement_timestamp())*1000)::bigint;
begin
 if not exists(select 1 from public.users where nick=lower(trim(p_nick)) and pass=p_pass) then raise exception 'Войди в аккаунт заново';end if;
 if coalesce(cardinality(p_nicks),0) not between 1 and 80 or exists(select 1 from unnest(p_nicks) n where n is null or length(n) not between 1 and 64) then raise exception 'Некорректный список пользователей';end if;
 select jsonb_build_object('modern',coalesce((select jsonb_agg(jsonb_build_object('chat_key',t.chat_key,'nick',t.nick,'ts',t.ts)) from public.typing t where t.nick=any(p_nicks) and left(t.chat_key,length('telechat-presence-v120:'))='telechat-presence-v120:' and t.ts>=(cutoff-86400000)*10),'[]'::jsonb),
 'legacy',coalesce((select jsonb_agg(jsonb_build_object('chat_key',t.chat_key,'nick',t.nick,'ts',t.ts)) from public.typing t where t.nick=any(p_nicks) and t.chat_key=any(array['__telechat_device_phone_v72__','__telechat_device_pc_v72__','__telechat_background_phone_v101__','__telechat_background_pc_v101__']) and t.ts>=cutoff-120000),'[]'::jsonb),
 'users',coalesce((select jsonb_agg(jsonb_build_object('nick',u.nick,'last_seen',u.last_seen)) from public.users u where u.nick=any(p_nicks)),'[]'::jsonb),'server_time',cutoff) into result;
 return result;
end $$;
revoke all on function public.exstra_presence_snapshot_v172(text,text,text[]) from public;
grant execute on function public.exstra_presence_snapshot_v172(text,text,text[]) to anon,authenticated;

create or replace function public.exstra_presence_heartbeat_v172(p_nick text,p_pass text,p_key text,p_state text,p_at bigint,p_listening boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor text; stamp bigint; music_stamp bigint; music_key text; stored bigint; server_at bigint:=(extract(epoch from statement_timestamp())*1000)::bigint;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново';end if;
 if p_key is null or p_key !~ '^telechat-presence-v120:[0-9a-f-]{36}:(pc|phone)$' or p_state is null or p_state not in ('online','background','offline') or p_at is null or p_at<1 or p_at>server_at+30000 then raise exception 'Некорректное состояние подключения';end if;
 stamp:=p_at*10+case p_state when 'online' then 1 when 'background' then 2 else 0 end;
 insert into public.typing as t(chat_key,nick,ts) values(p_key,actor,stamp)
 on conflict(chat_key,nick) do update set ts=excluded.ts where t.ts<excluded.ts;
 select ts into stored from public.typing where chat_key=p_key and nick=actor;
 music_key:='telechat-presence-v120:music:'||substring(p_key from length('telechat-presence-v120:')+1);
 music_stamp:=p_at*10+case when coalesce(p_listening,false) and p_state='online' then 3 when coalesce(p_listening,false) and p_state='background' then 4 else 0 end;
 if coalesce(p_listening,false) or exists(select 1 from public.typing where chat_key=music_key and nick=actor) then
  insert into public.typing as t(chat_key,nick,ts) values(music_key,actor,music_stamp)
  on conflict(chat_key,nick) do update set ts=excluded.ts where t.ts<excluded.ts;
 end if;
 if p_state='online' then update public.users set last_seen=p_at where nick=actor and coalesce(last_seen,0)<p_at-25000;end if;
 return jsonb_build_object('ts',stored,'server_time',server_at);
end $$;
revoke all on function public.exstra_presence_heartbeat_v172(text,text,text,text,bigint,boolean) from public;
grant execute on function public.exstra_presence_heartbeat_v172(text,text,text,text,bigint,boolean) to anon,authenticated;
commit;
notify pgrst,'reload schema';
