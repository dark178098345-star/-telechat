-- Only the existing disposable localhost test database. Never production.
\ir ../supabase-pair-bubble-v168.sql
create table if not exists public.messages(id bigint generated always as identity primary key,chat_key text,from_nick text,text text,ts bigint,deleted boolean default false);
create index if not exists messages_test_chat_ts on public.messages(chat_key,ts);
\ir ../supabase-streak-v170.sql
begin;
do $$ declare now_day date:=(statement_timestamp() at time zone 'Asia/Bishkek')::date; result jsonb; t bigint; raw text; begin
 result:=public.exstra_pair_bubble_v168('alice','dummy-alice',jsonb_build_object('kind','couple','peer','bob','text','Together','size','small','color','rose','left','heart','right','heart','since','2024-02-29'));
 if public.exstra_profile_data_v168(result->>'status')->'pair_bubble_v168'->>'since'<>'2024-02-29' then raise exception 'Date not saved';end if;
 raw:=result->>'status';update public.users set status='Edited ordinary bio' where nick='alice';if public.exstra_profile_data_v168((select status from public.users where nick='alice'))->'pair_bubble_v168'->>'since'<>'2024-02-29' then raise exception 'Date lost on ordinary edit';end if;
 begin perform public.exstra_pair_bubble_v168('alice','dummy-alice',jsonb_build_object('kind','couple','peer','bob','text','x','size','small','color','rose','left','heart','right','heart','since',(now_day+1)::text));raise exception 'Future date accepted';exception when others then if sqlerrm='Future date accepted' then raise;end if;end;
 begin perform public.exstra_pair_bubble_v168('alice','dummy-alice','{"kind":"couple","peer":"bob","text":"x","size":"small","color":"rose","left":"heart","right":"heart","since":"2025-02-29"}');raise exception 'Bad date accepted';exception when others then if sqlerrm='Bad date accepted' then raise;end if;end;
 delete from public.messages;
 result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>0 or (result->>'today_mask')::int<>0 then raise exception 'Empty history';end if;
 for i in 1..3 loop t:=(extract(epoch from ((now_day-i+time '12:00') at time zone 'Asia/Bishkek'))*1000)::bigint;insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','alice','dummy',t),('alice_bob','bob','dummy',t+1);end loop;
 result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>3 then raise exception 'Yesterday streak';end if;
 t:=(extract(epoch from statement_timestamp())*1000)::bigint;insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','alice','dummy',t);result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>3 or (result->>'today_mask')::int<>1 then raise exception 'One-sided today';end if;
 insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','bob','dummy',t);result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>4 or (result->>'today_mask')::int<>3 then raise exception 'Complete today';end if;
 result:=public.exstra_chat_streak_v170('bob','dummy-bob','alice');if (result->>'days')::int<>4 or (result->>'today_mask')::int<>3 then raise exception 'Not symmetric';end if;
 insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','alice','dummy',t);result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>4 then raise exception 'Duplicate increments';end if;
 update public.messages set deleted=true where from_nick='bob' and ts=t;result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>3 then raise exception 'Deleted counted';end if;
 delete from public.messages where ts<(extract(epoch from ((now_day-1)::timestamp at time zone 'Asia/Bishkek'))*1000)::bigint and ts>=(extract(epoch from ((now_day-2)::timestamp at time zone 'Asia/Bishkek'))*1000)::bigint;result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>1 then raise exception 'Gap not reset';end if;
 begin perform public.exstra_chat_streak_v170('alice','wrong','bob');raise exception 'Credential accepted';exception when others then if sqlerrm='Credential accepted' then raise;end if;end;
 begin perform public.exstra_chat_streak_v170('alice','dummy-alice','alice');raise exception 'Self accepted';exception when others then if sqlerrm='Self accepted' then raise;end if;end;
 if not has_function_privilege('anon','public.exstra_chat_streak_v170(text,text,text)','execute') then raise exception 'App access missing';end if;
 delete from public.messages;
 for i in 0..365 loop t:=(extract(epoch from ((now_day-i+time '00:01') at time zone 'Asia/Bishkek'))*1000)::bigint;insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','alice','dummy',t),('alice_bob','bob','dummy',t);end loop;
 result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>365 or not(result->>'capped')::boolean then raise exception 'Bounded cap wrong';end if;
 delete from public.messages;
 t:=(extract(epoch from ((now_day+time '00:00') at time zone 'Asia/Bishkek'))*1000)::bigint;insert into public.messages(chat_key,from_nick,text,ts) values('alice_bob','alice','dummy',t-1),('alice_bob','bob','dummy',t+1);result:=public.exstra_chat_streak_v170('alice','dummy-alice','bob');if (result->>'days')::int<>0 or (result->>'today_mask')::int<>2 then raise exception 'Midnight boundary wrong';end if;
 raise notice 'PASS date preservation/validation; symmetric streak, today, gaps, deleted/duplicate messages and credential guards';
end $$;
rollback;
