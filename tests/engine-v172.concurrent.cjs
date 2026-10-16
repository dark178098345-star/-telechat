// Fixed disposable localhost database only. Never accepts a production DSN.
const {execFile}=require('child_process'),{promisify}=require('util'),assert=require('assert/strict'),path=require('path');
const run=promisify(execFile),psql=path.resolve(__dirname,'../../../tools/postgresql-client/bin/psql.exe');
const query=sql=>run(psql,['-h','127.0.0.1','-p','54568','-U','pair_test','-d','engine_v172','-v','ON_ERROR_STOP=1','-At','-c',sql]);
(async()=>{const nonce='concurrent-'+Date.now(),row=JSON.stringify({chat_key:'alice_bob',from_nick:'alice',text:'disposable concurrency fixture',ts:Date.now(),client_id_v172:nonce});
 const sql=`select public.exstra_send_messages_v172('alice','dummy-alice',jsonb_build_array('${row}'::jsonb))->'rows'->0->>'id'`;
 try{const results=await Promise.all(Array.from({length:8},()=>query(sql)));assert.equal(new Set(results.map(r=>r.stdout.trim())).size,1,'Eight concurrent HTTP-equivalent requests must return one ID');assert.equal((await query(`select count(*) from public.messages where client_id_v172='${nonce}'`)).stdout.trim(),'1');console.log('PASS v172 PostgreSQL concurrency: 8 simultaneous requests → exactly 1 message and 1 ID');}
 finally{await query(`delete from public.messages where client_id_v172='${nonce}'`);}
})().catch(e=>{console.error(e);process.exitCode=1;});
