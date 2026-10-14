-- Personal status on the actor's profile only. No invites, shared membership,
-- auth migration, new tables, privilege changes to existing tables or data deletion.
begin;
create or replace function public.exstra_profile_data_v168(p_raw text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare d jsonb;
begin
 if left(coalesce(p_raw,''),length('__telechat_profile_v1__:'))='__telechat_profile_v1__:' then
  begin d:=substring(p_raw from length('__telechat_profile_v1__:')+1)::jsonb;
   if jsonb_typeof(d)='object' then return d; end if;
  exception when others then null; end;
 end if;
 return jsonb_build_object('status',coalesce(p_raw,''));
end $$;
revoke all on function public.exstra_profile_data_v168(text) from public,anon,authenticated;

create or replace function public.exstra_preserve_pair_v168()
returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb; b jsonb;
begin
 if new.status is not distinct from old.status or current_setting('exstrachat.pair_write_v168',true)='yes' then return new; end if;
 a:=public.exstra_profile_data_v168(old.status);b:=public.exstra_profile_data_v168(new.status);
 if not (a ? 'pair_bubble_v168') and not (b ? 'pair_bubble_v168') then return new; end if;
 b:=b-'pair_bubble_v168';
 if a ? 'pair_bubble_v168' then b:=b||jsonb_build_object('pair_bubble_v168',a->'pair_bubble_v168'); end if;
 new.status:='__telechat_profile_v1__:'||b::text;
 return new;
end $$;
revoke all on function public.exstra_preserve_pair_v168() from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from pg_trigger where tgname='exstra_preserve_pair_v168' and tgrelid='public.users'::regclass) then
  create trigger exstra_preserve_pair_v168 before update of status on public.users for each row execute function public.exstra_preserve_pair_v168();
 end if;
end $$;

create or replace function public.exstra_pair_bubble_v168(p_nick text,p_pass text,p_pair jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor text; raw text; d jsonb; kind text; peer text; label text; shade text; lhs text; rhs text; result text; allowed_icons text[]; allowed_colors text[]; since_text text; since_date date; pair_value jsonb;
begin
 -- Compatibility with the current legacy login. Does not claim Supabase Auth
 -- session security and does not establish consent by the mentioned person.
 select nick,status into actor,raw from public.users where nick=lower(trim(p_nick)) and pass=p_pass for update;
 if actor is null then raise exception 'Войди в аккаунт заново'; end if;
 d:=public.exstra_profile_data_v168(raw);
 if p_pair is null or p_pair='null'::jsonb then
  d:=d||jsonb_build_object('pair_bubble_v168',null);
 else
  if jsonb_typeof(p_pair)<>'object' then raise exception 'Неверный статус'; end if;
  kind:=p_pair->>'kind';peer:=lower(trim(p_pair->>'peer'));label:=trim(regexp_replace(coalesce(p_pair->>'text',''),'[[:cntrl:]]','','g'));
  if kind is null or kind not in ('couple','friends') or peer is null or peer=actor or char_length(label) not between 1 and 44 or peer !~ '^[a-z0-9_.-]{1,64}$' then raise exception 'Проверь текст и ник другого человека'; end if;
  if not exists(select 1 from public.users where nick=peer) then raise exception 'Пользователь не найден'; end if;
  if kind='couple' then allowed_icons:=array['heart','rings','spark','none'];allowed_colors:=array['rose','cherry','lilac'];
  else allowed_icons:=array['game','bolt','rocket','link','none'];allowed_colors:=array['blue','cyan','navy']; end if;
  shade:=p_pair->>'color';lhs:=p_pair->>'left';rhs:=p_pair->>'right';
  if shade is null or not(shade=any(allowed_colors)) or lhs is null or not(lhs=any(allowed_icons)) or rhs is null or not(rhs=any(allowed_icons)) or coalesce(p_pair->>'size','') not in ('small','normal') then raise exception 'Выбери оформление из списка'; end if;
  pair_value:=jsonb_build_object('v',1,'kind',kind,'peer',peer,'text',label,'color',shade,'left',lhs,'right',rhs,'size',p_pair->>'size');
  since_text:=nullif(p_pair->>'since','');
  if since_text is not null then
   if since_text !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Проверь дату знакомства';end if;
   begin since_date:=since_text::date;exception when others then raise exception 'Проверь дату знакомства';end;
   if since_date<'1900-01-01'::date or since_date>(statement_timestamp() at time zone 'Asia/Bishkek')::date then raise exception 'Выбери дату знакомства не позже сегодняшнего дня';end if;
   pair_value:=pair_value||jsonb_build_object('since',since_text);
  end if;
  d:=d||jsonb_build_object('pair_bubble_v168',pair_value);
 end if;
 perform set_config('exstrachat.pair_write_v168','yes',true);
 update public.users set status='__telechat_profile_v1__:'||d::text where nick=actor returning status into result;
 perform set_config('exstrachat.pair_write_v168','no',true);
 return jsonb_build_object('nick',actor,'status',result);
end $$;
revoke all on function public.exstra_pair_bubble_v168(text,text,jsonb) from public;
grant execute on function public.exstra_pair_bubble_v168(text,text,jsonb) to anon,authenticated;
commit;
notify pgrst,'reload schema';
