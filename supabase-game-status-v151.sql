-- Manual public activity; only its owner can change it. No process tracking.
begin;
create table if not exists public.game_status_private_v151 (
 nick text primary key references public.users(nick) on update cascade on delete cascade,
 kind text, title text, updated_at timestamptz not null default now(),
 constraint game_status_valid_v151 check ((kind is null and title is null) or
   (kind is not null and title is not null and kind in ('game','app') and char_length(title) between 1 and 80))
);
alter table public.game_status_private_v151 enable row level security;
revoke all on public.game_status_private_v151 from public,anon,authenticated;
create or replace view public.game_status_v151 as
 select nick,kind,title,updated_at from public.game_status_private_v151;
revoke all on public.game_status_v151 from public,anon,authenticated;
grant select on public.game_status_v151 to anon,authenticated;
create or replace function public.telechat_game_status_v151(p_nick text,p_pass text,p_kind text,p_title text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor text; clean text; result public.game_status_private_v151%rowtype;
begin
 select nick into actor from public.users where nick=lower(trim(p_nick)) and pass=p_pass;
 if actor is null then raise exception 'Войди в аккаунт заново'; end if;
 clean:=nullif(trim(regexp_replace(coalesce(p_title,''),'[[:cntrl:]]','','g')),'');
 if clean is not null and (p_kind is null or p_kind not in ('game','app') or char_length(clean)>80) then
  raise exception 'Выбери игру или приложение: название до 80 символов';
 end if;
 insert into public.game_status_private_v151(nick,kind,title,updated_at)
 values(actor,case when clean is null then null else p_kind end,clean,clock_timestamp())
 on conflict(nick) do update set kind=excluded.kind,title=excluded.title,updated_at=excluded.updated_at
 returning * into result;
 return to_jsonb(result);
end $$;
revoke all on function public.telechat_game_status_v151(text,text,text,text) from public;
grant execute on function public.telechat_game_status_v151(text,text,text,text) to anon,authenticated;
commit;
