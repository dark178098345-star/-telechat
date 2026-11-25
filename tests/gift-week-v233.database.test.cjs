'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.EXSTRA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite(),read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const rows=async(sql,args)=>(await db.query(sql,args)).rows;
const val=async(sql,args)=>(await rows(sql,args))[0].value;
const activate=()=>val('select public.exstra_open_gift_week_v233() as value');
const send=(nick,pass,id)=>val("select public.exstra_wallet_v197($1,$2,'gift',jsonb_build_object('target','b','gift',$3::text),gen_random_uuid()) as value",[nick,pass,id]);

(async()=>{
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create publication supabase_realtime;
  create table public.users(nick text primary key,pass text not null);
  insert into public.users values ('a','a-test'),('b','b-test'),('creator','creator-test');
 `);
 await db.exec(read('supabase-moons-v20.sql'));
 await db.exec(read('supabase-wallet-v197.sql'));
 await db.exec("update public.moon_gifts set available_until=1 where limited;update public.exstra_wallets_v197 set balance=4200 where nick='a';");
 await db.exec("insert into public.moon_gifts values ('unrelated_release','Other','✦',1,'limited','blue',true,4242,300)");
 await send('a','a-test','spark_seed');
 const before=await val("select balance as value from public.exstra_wallets_v197 where nick='a'");
 const historyBefore=await rows('select * from public.user_gifts');
 const install=read('supabase-gifts-week-v233.sql');
 await db.exec(install);
 assert.equal(await val('select count(*)::int as value from public.moon_gifts'),44);
 assert.equal(await val('select count(*)::int as value from exstra_gift_release_v233.editions'),0);
 assert.equal(await val("select available_until as value from public.moon_gifts where id='party_sparkler'"),0);
 assert.equal(await val("select available_until as value from public.moon_gifts where id='black_comet'"),1);
 await assert.rejects(send('a','a-test','party_sparkler'),/уже закрыта/);
 for(const role of ['anon','authenticated','service_role']){
  await db.exec('set role '+role);
  await assert.rejects(activate(),/permission denied/);
  await db.exec('reset role');
 }
 assert.equal(await val("select balance as value from public.exstra_wallets_v197 where nick='a'"),before);
 assert.deepEqual(await rows('select * from public.user_gifts'),historyBefore);

 await db.exec("update public.moon_gifts set limited=false where id='black_comet'");
 await assert.rejects(activate(),/Ничего не открыто/);
 assert.equal(await val("select available_until as value from public.moon_gifts where id='party_sparkler'"),0);
 await db.exec("update public.moon_gifts set limited=true where id='black_comet'");
 const release=await activate();
 assert.equal(release.opened,true);
 assert.equal(release.closes_at-release.opens_at,604800000);
 assert.equal(release.gifts,16);
 assert.equal(await val('select count(*)::int as value from public.moon_gifts where available_until=$1',[release.closes_at]),16);
 assert.equal(await val("select available_until as value from public.moon_gifts where id='unrelated_release'"),4242);
 assert.equal(await val("select available_until as value from public.moon_gifts where id='wish_bottle'"),null);
 assert.equal((await send('a','a-test','party_sparkler')).ok,true);
 assert.equal((await send('a','a-test','wish_bottle')).ok,true);
 await assert.rejects(send('a','a-test','glass_butterfly'),/21 день/);
 assert.equal((await send('creator','creator-test','glass_butterfly')).ok,true);
 await db.exec("update public.moon_gifts set available_until=1 where id='party_sparkler'");
 await assert.rejects(send('creator','creator-test','party_sparkler'),/уже закрыта/);
 await db.exec(install);
 assert.deepEqual(await activate(),{opened:false,opens_at:release.opens_at,closes_at:release.closes_at});
 assert.equal(await val("select available_until as value from public.moon_gifts where id='party_sparkler'"),1);
 console.log('PASS gift week: six additions, owner-only activation, atomic 16-gift week, no automatic start or extension, retained history, enforced expiry and cooldown.');
})().finally(()=>db.close()).catch(error=>{console.error(error);process.exitCode=1;});
