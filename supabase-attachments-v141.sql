begin;
create table if not exists public.chat_files_v141(
 id uuid primary key default gen_random_uuid(), owner_nick text not null references public.users(nick) on update cascade on delete cascade,
 chat_key text not null, name text not null check(length(name) between 1 and 180),
 size bigint not null check(size between 1 and 20971520), mime text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.chat_file_tokens_v141(
 hash text primary key,file_id uuid not null references public.chat_files_v141(id) on delete cascade,
 writable boolean not null default false,expires_at timestamptz not null default now()+interval '15 minutes'
);
alter table public.chat_files_v141 enable row level security;
alter table public.chat_file_tokens_v141 enable row level security;
revoke all on public.chat_files_v141,public.chat_file_tokens_v141 from anon,authenticated;
create or replace function public.telechat_file_member_v141(p_key text,p_actor text,p_write boolean)
returns boolean language sql stable security definer set search_path=public as $$
 select case when p_key like 'room_%' then exists(
 select 1 from public.rooms r join public.room_members m on m.room_id=r.id
 where 'room_'||r.id::text=p_key and m.user_nick=p_actor and (not p_write or r.type<>'channel' or r.owner_nick=p_actor))
 else exists(select 1 from public.users u where u.nick<>p_actor and
 p_key=least(p_actor,u.nick)||'_'||greatest(p_actor,u.nick)) end;
$$;
revoke all on function public.telechat_file_member_v141(text,text,boolean) from public;
create or replace function public.telechat_files_v141(p_nick text,p_pass text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor text; item public.chat_files_v141; token text;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново';end if;
 if p_action='reserve' then
  if not public.telechat_file_member_v141(p_data->>'chat_key',actor,true) then raise exception 'Нет доступа к отправке';end if;
  perform pg_advisory_xact_lock(hashtext('attachments:'||actor));
  if (select coalesce(sum(size),0) from public.chat_files_v141 where owner_nick=actor)+coalesce((p_data->>'size')::bigint,0)>262144000 then raise exception 'Лимит вложений аккаунта: 250 МБ';end if;
  insert into public.chat_files_v141(owner_nick,chat_key,name,size,mime)
  values(actor,p_data->>'chat_key',left(p_data->>'name',180),(p_data->>'size')::bigint,left(coalesce(p_data->>'mime','application/octet-stream'),120)) returning * into item;
 elsif p_action in ('read','cancel') then
  select * into item from public.chat_files_v141 where id=(p_data->>'id')::uuid;
  if item.id is null then raise exception 'Файл не найден';end if;
  if p_action='cancel' then
   if item.owner_nick<>actor then raise exception 'Нет доступа';end if;
   if exists(select 1 from storage.objects where bucket_id='chat-files' and name=item.id::text||'/file') then raise exception 'Сначала удалите загрузку';end if;
   delete from public.chat_files_v141 where id=item.id;return '{}'::jsonb;
  end if;
  if item.owner_nick<>actor and not public.telechat_file_member_v141(item.chat_key,actor,false) then raise exception 'Нет доступа к файлу';end if;
 else raise exception 'Неизвестное действие';end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 delete from public.chat_file_tokens_v141 where expires_at<now();
 insert into public.chat_file_tokens_v141(hash,file_id,writable) values(md5(token),item.id,p_action='reserve');
 return jsonb_build_object('id',item.id,'name',item.name,'size',item.size,'mime',item.mime,'token',token);
end;$$;
revoke all on function public.telechat_files_v141(text,text,text,jsonb) from public;
grant execute on function public.telechat_files_v141(text,text,text,jsonb) to anon,authenticated;
create or replace function public.telechat_file_storage_v141(object_name text,writing boolean)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.chat_file_tokens_v141 t where t.hash=md5(coalesce(current_setting('request.headers',true)::jsonb->>'x-telechat-file-token',''))
 and object_name=t.file_id::text||'/file' and t.expires_at>now() and (not writing or t.writable));
$$;
revoke all on function public.telechat_file_storage_v141(text,boolean) from public;
grant execute on function public.telechat_file_storage_v141(text,boolean) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('chat-files','chat-files',false,20971520) on conflict(id) do nothing;
create policy "file read v141" on storage.objects for select to anon,authenticated using(bucket_id='chat-files' and public.telechat_file_storage_v141(name,false));
create policy "file upload v141" on storage.objects for insert to anon,authenticated with check(bucket_id='chat-files' and public.telechat_file_storage_v141(name,true));
create policy "file cancel v141" on storage.objects for delete to anon,authenticated using(bucket_id='chat-files' and public.telechat_file_storage_v141(name,true));
create policy "file guard read v141" on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'chat-files' or public.telechat_file_storage_v141(name,false));
create policy "file guard upload v141" on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'chat-files' or public.telechat_file_storage_v141(name,true));
create policy "file guard cancel v141" on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'chat-files' or public.telechat_file_storage_v141(name,true));
create policy "file guard update v141" on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'chat-files') with check(bucket_id<>'chat-files');
commit;
notify pgrst,'reload schema';
