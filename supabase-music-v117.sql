-- tele.chat Music: public releases, private libraries and playlists.
begin;
create table if not exists public.music_tracks_v117 (
  id uuid primary key default gen_random_uuid(),
  author_nick text not null references public.users(nick) on update cascade on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  artist text not null default '' check (char_length(artist)<=100),
  description text not null default '' check (char_length(description)<=1000),
  genre text not null default '' check (char_length(genre)<=40),
  url text not null check (char_length(url)<=4096 and url like 'https://%'),
  cover_url text not null default '' check (char_length(cover_url)<=2048),
  source text not null check (source in ('upload','link','soundcloud')),
  duration double precision not null default 0 check (duration>=0 and duration<=21600),
  size bigint not null default 0 check (size between 0 and 52428800),
  created_at timestamptz not null default now()
);
create table if not exists public.music_likes_v117 (
  track_id uuid not null references public.music_tracks_v117(id) on delete cascade,
  nick text not null references public.users(nick) on update cascade on delete cascade,
  primary key(track_id,nick)
);
create table if not exists public.music_saves_v117 (
  track_id uuid not null references public.music_tracks_v117(id) on delete cascade,
  nick text not null references public.users(nick) on update cascade on delete cascade,
  created_at timestamptz not null default now(), primary key(track_id,nick)
);
create table if not exists public.music_playlists_v117 (
  id uuid primary key default gen_random_uuid(),
  owner_nick text not null references public.users(nick) on update cascade on delete cascade,
  title text not null check(char_length(title) between 1 and 80),
  created_at timestamptz not null default now()
);
create table if not exists public.music_playlist_items_v117 (
  playlist_id uuid not null references public.music_playlists_v117(id) on delete cascade,
  track_id uuid not null references public.music_tracks_v117(id) on delete cascade,
  added_at timestamptz not null default now(), primary key(playlist_id,track_id)
);
create table if not exists public.music_upload_tickets_v117 (
  token_hash text primary key, folder uuid not null,
  nick text not null references public.users(nick) on update cascade on delete cascade,
  reserved_size bigint not null default 0 check(reserved_size between 0 and 52428800),
  expires_at timestamptz not null default now()+interval '30 minutes'
);
create index if not exists music_tracks_date_v117 on public.music_tracks_v117(created_at desc,id);
create index if not exists music_tracks_author_v117 on public.music_tracks_v117(author_nick,created_at desc);
create index if not exists music_saves_owner_v117 on public.music_saves_v117(nick);
create index if not exists music_playlist_owner_v117 on public.music_playlists_v117(owner_nick);
alter table public.music_tracks_v117 enable row level security;
alter table public.music_likes_v117 enable row level security;
alter table public.music_saves_v117 enable row level security;
alter table public.music_playlists_v117 enable row level security;
alter table public.music_playlist_items_v117 enable row level security;
alter table public.music_upload_tickets_v117 enable row level security;

-- Re-running the migration preserves existing policies and data.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='music_tracks_v117' and policyname='music public tracks') then
  create policy "music public tracks" on public.music_tracks_v117 for select to anon,authenticated using(true);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='music_likes_v117' and policyname='music public likes') then
  create policy "music public likes" on public.music_likes_v117 for select to anon,authenticated using(true);
 end if;
end $$;
grant select on public.music_tracks_v117,public.music_likes_v117 to anon,authenticated;
revoke insert,update,delete on public.music_tracks_v117,public.music_likes_v117 from anon,authenticated;
revoke all on public.music_saves_v117,public.music_playlists_v117,public.music_playlist_items_v117,public.music_upload_tickets_v117 from anon,authenticated;

create or replace view public.music_catalog_v117 with (security_invoker=true) as
 select t.*, (select count(*)::integer from public.music_likes_v117 l where l.track_id=t.id) as likes_count
 from public.music_tracks_v117 t;
grant select on public.music_catalog_v117 to anon,authenticated;

-- Existing tele.chat accounts use users.pass. Validate it on every private
-- operation; never grant anonymous direct writes to the music tables.
create or replace function public.telechat_music_v117(p_nick text,p_pass text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 actor text; tid uuid; pid uuid; token text; saved jsonb; liked jsonb; lists jsonb;
 total bigint; used bigint; actual_size bigint:=0; row public.music_tracks_v117%rowtype;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново'; end if;
 if p_action='library' then
  select coalesce(jsonb_agg(t.track_id),'[]') into saved from public.music_saves_v117 t where nick=actor;
  select coalesce(jsonb_agg(t.track_id),'[]') into liked from public.music_likes_v117 t where nick=actor;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'created_at',p.created_at,'track_ids',
    (select coalesce(jsonb_agg(i.track_id order by i.added_at),'[]') from public.music_playlist_items_v117 i where i.playlist_id=p.id)) order by p.created_at desc),'[]')
    into lists from public.music_playlists_v117 p where p.owner_nick=actor;
  return jsonb_build_object('saved',saved,'liked',liked,'playlists',lists);
 end if;
 if p_action='upload_ticket' then
  perform pg_advisory_xact_lock(hashtext('music:'||actor));
  if p_data->>'id' is not null then
   tid:=(p_data->>'id')::uuid;
   if not exists(select 1 from public.music_tracks_v117 where id=tid and author_nick=actor) then raise exception 'Трек не найден'; end if;
  else
   tid:=gen_random_uuid();
   if (select count(*) from public.music_upload_tickets_v117 where nick=actor and expires_at>now())>=5 then raise exception 'Заверши текущие загрузки или попробуй через 30 минут'; end if;
   select coalesce(sum(size),0) into used from public.music_tracks_v117 where author_nick=actor;
   select coalesce(sum(reserved_size),0) into total from public.music_upload_tickets_v117 where nick=actor and expires_at>now();
   if used+total+coalesce((p_data->>'size')::bigint,0)>262144000 then raise exception 'Лимит публикаций: 250 МБ файлов'; end if;
  end if;
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  delete from public.music_upload_tickets_v117 where expires_at<now();
  insert into public.music_upload_tickets_v117(token_hash,folder,nick,reserved_size) values(md5(token),tid,actor,coalesce((p_data->>'size')::bigint,0));
  return jsonb_build_object('id',tid,'token',token);
 end if;
 if p_action='publish' then
  perform pg_advisory_xact_lock(hashtext('music:'||actor));
  select count(*),coalesce(sum(size),0) into total,used from public.music_tracks_v117 where author_nick=actor;
  if total>=100 then raise exception 'Максимум 100 опубликованных треков'; end if;
  tid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
  if p_data->>'source'='upload' then
   if not exists(select 1 from public.music_upload_tickets_v117 where folder=tid and nick=actor and expires_at>now())
     or not starts_with(p_data->>'url','https://xvnazoervzccixtfhuaa.supabase.co/storage/v1/object/public/music-media/'||tid::text||'/')
     then raise exception 'Сначала загрузи аудиофайл'; end if;
   select (metadata->>'size')::bigint into actual_size from storage.objects where bucket_id='music-media' and name=split_part(p_data->>'url','/object/public/music-media/',2);
   if actual_size is null or actual_size<=0 then raise exception 'Аудиофайл не найден в хранилище'; end if;
   if used+actual_size>262144000 then raise exception 'Лимит публикаций: 250 МБ файлов'; end if;
  end if;
  if coalesce(p_data->>'cover_url','')<>'' and not starts_with(p_data->>'cover_url','https://xvnazoervzccixtfhuaa.supabase.co/storage/v1/object/public/music-media/'||tid::text||'/') then raise exception 'Неверная обложка'; end if;
  insert into public.music_tracks_v117(id,author_nick,title,artist,description,genre,url,cover_url,source,duration,size)
   values(tid,actor,trim(p_data->>'title'),trim(coalesce(p_data->>'artist','')),coalesce(p_data->>'description',''),coalesce(p_data->>'genre',''),p_data->>'url',coalesce(p_data->>'cover_url',''),p_data->>'source',coalesce((p_data->>'duration')::double precision,0),actual_size) returning * into row;
  insert into public.music_saves_v117(track_id,nick) values(tid,actor);
  delete from public.music_upload_tickets_v117 where folder=tid and nick=actor;
  return to_jsonb(row);
 end if;
 if p_action='create_playlist' then
  if (select count(*) from public.music_playlists_v117 where owner_nick=actor)>=50 then raise exception 'Максимум 50 плейлистов'; end if;
  insert into public.music_playlists_v117(owner_nick,title) values(actor,trim(p_data->>'title')) returning id into pid;
  return jsonb_build_object('id',pid);
 end if;
 if p_action in ('playlist_add','playlist_remove','delete_playlist') then
  pid:=(p_data->>'playlist_id')::uuid;
  if not exists(select 1 from public.music_playlists_v117 where id=pid and owner_nick=actor) then raise exception 'Плейлист не найден'; end if;
  if p_action='delete_playlist' then delete from public.music_playlists_v117 where id=pid;return '{}'::jsonb;end if;
  tid:=(p_data->>'track_id')::uuid;
  if p_action='playlist_add' then
   if (select count(*) from public.music_playlist_items_v117 where playlist_id=pid)>=200 then raise exception 'Максимум 200 треков в плейлисте'; end if;
   insert into public.music_playlist_items_v117(playlist_id,track_id) values(pid,tid) on conflict do nothing;
  else delete from public.music_playlist_items_v117 where playlist_id=pid and track_id=tid; end if;
  return '{}'::jsonb;
 end if;
 tid:=(p_data->>'track_id')::uuid;
 if p_action='delete_track' then
  delete from public.music_tracks_v117 where id=tid and author_nick=actor returning * into row;
  if not found then raise exception 'Можно удалить только свой трек'; end if;
  return to_jsonb(row);
 elsif p_action='like' then
  if coalesce((p_data->>'enabled')::boolean,false) then insert into public.music_likes_v117(track_id,nick) values(tid,actor) on conflict do nothing;
  else delete from public.music_likes_v117 where track_id=tid and nick=actor;end if;
 elsif p_action='save' then
  if coalesce((p_data->>'enabled')::boolean,false) then insert into public.music_saves_v117(track_id,nick) values(tid,actor) on conflict do nothing;
  else delete from public.music_saves_v117 where track_id=tid and nick=actor;end if;
 else raise exception 'Неизвестное действие'; end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.telechat_music_v117(text,text,text,jsonb) from public;
grant execute on function public.telechat_music_v117(text,text,text,jsonb) to anon,authenticated;

-- Short-lived upload tokens are sent in headers, never in public media URLs.
create or replace function public.telechat_music_storage_v117(object_name text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.music_upload_tickets_v117 t
   where t.token_hash=md5(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-telechat-music-token',''))
   and split_part(object_name,'/',1)=t.folder::text and t.expires_at>now()
   and object_name ~ '^[0-9a-f-]{36}/(audio\.(mp3|m4a|ogg|wav|flac|webm|aac|audio)|cover\.webp)$');
$$;
revoke all on function public.telechat_music_storage_v117(text) from public;
grant execute on function public.telechat_music_storage_v117(text) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('music-media','music-media',true,52428800,array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/wave','audio/ogg','application/ogg','audio/opus','audio/flac','audio/x-flac','audio/webm','image/webp','image/jpeg','image/png'])
on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='music read media v117') then
  create policy "music read media v117" on storage.objects for select to anon,authenticated using(bucket_id='music-media');
  create policy "music upload media v117" on storage.objects for insert to anon,authenticated with check(bucket_id='music-media' and public.telechat_music_storage_v117(name));
  create policy "music remove media v117" on storage.objects for delete to anon,authenticated using(bucket_id='music-media' and public.telechat_music_storage_v117(name));
 end if;
end $$;
-- A legacy permissive policy exists in this project. Restrictive guards
-- protect only the new music bucket without changing other media features.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='music guard insert v117') then
  create policy "music guard insert v117" on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'music-media' or public.telechat_music_storage_v117(name));
  create policy "music guard delete v117" on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'music-media' or public.telechat_music_storage_v117(name));
  create policy "music guard update v117" on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'music-media') with check(bucket_id<>'music-media');
 end if;
end $$;
commit;
notify pgrst,'reload schema';
