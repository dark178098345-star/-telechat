\set ON_ERROR_STOP on
do $$ begin if inet_server_port()<>54569 or current_database()<>'wallet_v197' then raise exception 'Disposable wallet_v197 localhost only';end if;end $$;
create table if not exists public.users(nick text primary key,pass text,moons bigint not null default 50);
insert into public.users values('alice','fixture-a',50000),('bob','fixture-b',50),('creator','fixture-c',1000000000) on conflict do nothing;
do $$ begin if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime;end if;end $$;
\ir ../supabase-moons-v20.sql
\ir ../supabase-wallet-v197.sql
\ir ../supabase-wallet-v197.sql
begin;
do $$ declare r jsonb; stamp timestamptz; png text:='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=';begin
 if (select balance from public.exstra_wallets_v197 where nick='alice')<>50000 then raise exception 'Migration reset balance';end if;
 begin perform public.exstra_wallet_v197('creator','wrong','transfer','{"target":"alice","amount":100}',gen_random_uuid());raise exception 'Spoof accepted';exception when others then if sqlerrm='Spoof accepted' then raise;end if;end;
 begin perform public.exstra_wallet_v197('bob','fixture-b','badge',jsonb_build_object('image',png),gen_random_uuid());raise exception 'Free badge accepted';exception when others then if sqlerrm='Free badge accepted' then raise;end if;end;
 perform public.exstra_wallet_v197('alice','fixture-a','premium','{"plan":"30d"}','00000000-0000-4000-8000-000000000001');
 if (select balance from public.exstra_wallets_v197 where nick='alice')<>47500 then raise exception 'Price not 2500';end if;
 select premium_until into stamp from public.exstra_wallets_v197 where nick='alice';if stamp<>now()+interval '30 days' then raise exception 'Wrong duration';end if;
 perform public.exstra_wallet_v197('alice','fixture-a','premium','{"plan":"30d"}','00000000-0000-4000-8000-000000000001');
 if (select balance from public.exstra_wallets_v197 where nick='alice')<>47500 then raise exception 'Retry double charged';end if;
 begin perform public.exstra_wallet_v197('alice','fixture-a','premium','{"plan":"forever"}','00000000-0000-4000-8000-000000000001');raise exception 'Nonce reuse accepted';exception when others then if sqlerrm='Nonce reuse accepted' then raise;end if;end;
 perform public.exstra_wallet_v197('alice','fixture-a','badge',jsonb_build_object('image',png),gen_random_uuid());
 if (select image from public.exstra_badges_public_v197 where nick='alice')<>png then raise exception 'Public badge missing';end if;
 update public.exstra_wallets_v197 set premium_until=now()-interval '1 second' where nick='alice';
 if (select image from public.exstra_badges_public_v197 where nick='alice')<>'' then raise exception 'Expired badge exposed';end if;
 if (select image from public.exstra_nickname_badges_v197 where nick='alice')<>png then raise exception 'Expired badge deleted';end if;
 perform public.exstra_wallet_v197('alice','fixture-a','premium','{"plan":"forever"}',gen_random_uuid());
 if (select balance from public.exstra_wallets_v197 where nick='alice')<>7500 or not(select premium_forever from public.exstra_wallets_v197 where nick='alice') then raise exception 'Forever price not 40000';end if;
 perform public.exstra_wallet_v197('alice','fixture-a','premium','{"plan":"forever"}',gen_random_uuid());
 if (select balance from public.exstra_wallets_v197 where nick='alice')<>7500 then raise exception 'Forever recharged';end if;
 perform public.exstra_wallet_v197('alice','fixture-a','transfer','{"target":"bob","amount":500}',gen_random_uuid());
 if (select balance from public.exstra_wallets_v197 where nick='bob')<>550 or (select balance from public.exstra_wallets_v197 where nick='alice')<>7000 then raise exception 'Transfer not atomic';end if;
 begin perform public.exstra_wallet_v197('bob','fixture-b','transfer','{"target":"alice","amount":9999}',gen_random_uuid());raise exception 'Overdraft accepted';exception when others then if sqlerrm='Overdraft accepted' then raise;end if;end;
 begin perform public.exstra_wallet_v197('bob','fixture-b','grant','{"target":"alice","amount":500}',gen_random_uuid());raise exception 'Admin spoof accepted';exception when others then if sqlerrm='Admin spoof accepted' then raise;end if;end;
 perform public.exstra_wallet_v197('creator','fixture-c','transfer','{"target":"bob","amount":1000000000}',gen_random_uuid());
 if (select balance from public.exstra_wallets_v197 where nick='creator')<>1000000000 then raise exception 'Creator charged';end if;
 r:=public.exstra_wallet_v197('creator','fixture-c','state');if not(r->>'unlimited')::boolean or r->>'balance' is not null then raise exception 'Creator not unlimited';end if;
 perform public.exstra_wallet_v197('creator','fixture-c','grant','{"target":"bob","amount":-100}',gen_random_uuid());
 begin perform public.exstra_wallet_v197('alice','fixture-a','badge','{"image":"data:image/svg+xml,<svg/>"}',gen_random_uuid());raise exception 'SVG accepted';exception when others then if sqlerrm='SVG accepted' then raise;end if;end;
 perform public.exstra_wallet_v197('alice','fixture-a','gift','{"target":"bob","gift":"spark_seed"}','00000000-0000-4000-8000-000000000003');
 perform public.exstra_wallet_v197('alice','fixture-a','gift','{"target":"bob","gift":"spark_seed"}','00000000-0000-4000-8000-000000000003');
 if (select count(*) from public.user_gifts where owner_nick='bob')<>1 then raise exception 'Duplicate gift';end if;
 if has_function_privilege('anon','public.telechat_transfer_moons(text,text,bigint,text)','execute') then raise exception 'Legacy spending remains public';end if;
 if has_table_privilege('anon','public.exstra_wallets_v197','update') or has_table_privilege('anon','public.exstra_wallets_v197','select') then raise exception 'Wallet exposed';end if;
 if not has_table_privilege('anon','public.exstra_badges_public_v197','select') then raise exception 'Public badge permission missing';end if;
 raise notice 'PASS wallet SQL: preserved balances, authenticated spending, atomic transfer, retry-safe purchase/gift, 2500/30d and 40000/forever, expiry, retained badge, creator unlimited, no overdraft or direct table writes';
end $$;
rollback;
