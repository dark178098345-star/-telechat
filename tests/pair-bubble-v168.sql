-- Disposable localhost fixtures only. Never run this setup on production.
create role anon;create role authenticated;
create table public.users(nick text primary key,pass text,status text);
insert into public.users values('alice','dummy-alice','__telechat_profile_v1__:{"status":"Busy","photo":"old-photo","music":{"url":"https://test.example/song.mp3"}}'),('bob','dummy-bob','Bob bio');
\ir ../supabase-pair-bubble-v168.sql
do $$ declare result jsonb; old_bob text; v jsonb; begin
 select status into old_bob from public.users where nick='bob';
 result:=public.exstra_pair_bubble_v168('alice','dummy-alice','{"kind":"couple","peer":"bob","text":"Together","size":"normal","color":"rose","left":"heart","right":"rings"}');
 v:=public.exstra_profile_data_v168(result->>'status');
 if v->>'status'<>'Busy' or v->>'photo'<>'old-photo' or v->'music' is null then raise exception 'Lost profile metadata'; end if;
 if (select status from public.users where nick='bob')<>old_bob then raise exception 'Other profile changed'; end if;
 begin perform public.exstra_pair_bubble_v168('alice','wrong','null');raise exception 'Wrong password accepted';exception when others then if sqlerrm='Wrong password accepted' then raise;end if;end;
 begin perform public.exstra_pair_bubble_v168('alice','dummy-alice','{"kind":"couple","peer":"alice","text":"x","size":"normal","color":"rose","left":"heart","right":"heart"}');raise exception 'Self accepted';exception when others then if sqlerrm='Self accepted' then raise;end if;end;
 begin perform public.exstra_pair_bubble_v168('alice','dummy-alice','{"kind":"friends","peer":"bob","text":"x","size":"normal","color":"rose","left":"heart","right":"heart"}');raise exception 'Cross type style accepted';exception when others then if sqlerrm='Cross type style accepted' then raise;end if;end;
 update public.users set status='Changed ordinary status' where nick='alice';
 v:=public.exstra_profile_data_v168((select status from public.users where nick='alice'));
 if v->>'status'<>'Changed ordinary status' or v->'pair_bubble_v168'->>'peer'<>'bob' then raise exception 'Ordinary edit erased bubble';end if;
 update public.users set status='__telechat_profile_v1__:{"status":"Music edit","pair_bubble_v168":{"peer":"fake"},"music":{"title":"Fresh"},"photo":"fresh-photo"}' where nick='alice';
 v:=public.exstra_profile_data_v168((select status from public.users where nick='alice'));
 if v->'pair_bubble_v168'->>'peer'<>'bob' or v->'music'->>'title'<>'Fresh' or v->>'photo'<>'fresh-photo' then raise exception 'Merge guard failed';end if;
 result:=public.exstra_pair_bubble_v168('alice','dummy-alice',null);v:=public.exstra_profile_data_v168(result->>'status');
 if v->'pair_bubble_v168'<>'null'::jsonb or v->'music'->>'title'<>'Fresh' then raise exception 'Remove erased other metadata';end if;
 if has_function_privilege('anon','public.exstra_profile_data_v168(text)','execute') or has_function_privilege('anon','public.exstra_preserve_pair_v168()','execute') then raise exception 'Helper exposed';end if;
 if not has_function_privilege('anon','public.exstra_pair_bubble_v168(text,text,jsonb)','execute') then raise exception 'RPC unavailable';end if;
 raise notice 'PASS pair: metadata preservation, other profile untouched, credential/self/style guards, update merge and removal';
end $$;
