const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../chat-reliability-v24.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.doesNotMatch(html,/liveSyncTimer|realtimeRetryTimer|liveLastMessageId|liveConversationKey|syncLatestMessage|scheduleRealtimeRetry/,'Retired polling/retry owners must not return');
assert.equal((html.match(/function subscribeRealtime\(/g)||[]).length,1,'Only the HTML delegate remains');
const flush=()=>new Promise(setImmediate);
function fixture(storage){
 let id=0,at=1000000,uuid=0;const timers=new Map(),opens=[],sends=[],toasts=[],queries=[];
 class Clock extends Date{static now(){return at;}}
 const s={me:{nick:'alice'},navigator:{onLine:true},document:{hidden:false,getElementById:()=>null,addEventListener(){}},addEventListener(){},dispatchEvent(){},Event,CustomEvent:class extends Event{},AbortController,
  Date:Clock,crypto:{randomUUID:()=>`fixture-${++uuid}`},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  conversationKey:()=>'',chatKey:(a,b)=>[a,b].sort().join('_'),doLogin:async()=>{},sendMsg(){},renderContacts:async()=>{},showToast:t=>toasts.push(t),
  telechatTransportV172:{send:async row=>{sends.push({...row});return s.fail?{ok:false,error:Error('temporary network failure')}:{ok:true,row:{...row,id:7}};}},
  sb:{from(){let insert=false;const q={select:()=>q,eq:()=>q,limit:()=>q,abortSignal:()=>q,insert(){insert=true;queries.push('insert');return q;},maybeSingle(){queries.push('lookup');return s.lookup?s.lookup():Promise.resolve({data:null});},single(){return s.insert?s.insert():Promise.resolve({error:Error('temporary write failure')});}};return q;}}
 };
 if(storage)s.indexedDB={open(){const request={};opens.push(request);return request;}};
 s.window=s;vm.runInNewContext(source,s);
 return {s,opens,sends,toasts,queries,timers,advance(ms){at+=ms;},fire(ms){const t=[...timers].find(([,v])=>v.ms===ms);assert(t,`Missing timer ${ms}`);timers.delete(t[0]);t[1].fn();}};
}
(async()=>{
 const blocked=fixture(true),b=blocked.s;
 const send=b.telechatDeliveryV72.sendDirect('bob','fixture');await flush();assert.equal(blocked.sends.length,0);blocked.fire(1500);await flush();assert.equal(await send,true);assert.equal(blocked.sends.length,1);assert.equal(blocked.toasts.length,1);
 let closed=0;blocked.opens[0].result={close(){closed++;}};blocked.opens[0].onsuccess();assert.equal(closed,1,'Late database opens must close instead of leaking a connection');
 assert.equal((await b.telechatDeliveryV72.diagnostics()).durable,false);

 const memory=fixture(false),m=memory.s;m.fail=true;
 assert.equal(await m.telechatDeliveryV72.sendDirect('bob','retry fixture'),false);assert.equal((await m.telechatDeliveryV72.diagnostics()).queued,1,'Unsaved direct messages remain retryable in memory');
 m.me={nick:'carol'};await m.telechatDeliveryV72.drain(true);assert.equal(memory.sends.length,1,'Other accounts cannot drain the memory queue');
 m.me={nick:'alice'};m.fail=false;await m.telechatDeliveryV72.drain(true);assert.equal(memory.sends.length,2);assert.equal(memory.sends[0].client_id_v172,memory.sends[1].client_id_v172,'Memory retry preserves the nonce');assert.equal((await m.telechatDeliveryV72.diagnostics()).queued,0);

 const stalled=fixture(true);let aborted=0;const db={close(){},transaction(){return {objectStore:()=>({put(){},delete(){},openCursor:()=>({})}),abort(){aborted++;}};}};
 const transactionSend=stalled.s.telechatDeliveryV72.sendDirect('bob','transaction fixture');await flush();stalled.opens[0].result=db;stalled.opens[0].onsuccess();await flush();stalled.fire(1500);await flush();assert.equal(stalled.sends.length,1,'A stalled write cannot prevent the network request');stalled.fire(1500);await flush();assert.equal(await transactionSend,true);assert.equal(aborted,2,'Timed-out transactions are aborted');
 const stats=stalled.s.telechatDeliveryV72.diagnostics();await flush();stalled.fire(1500);await stats;db.onversionchange();
 const reopen=stalled.s.telechatDeliveryV72.sendDirect('bob','reopen fixture');await flush();assert.equal(stalled.opens.length,2,'A version change releases the old database and permits reopening');stalled.opens[1].onerror();await reopen;

 const legacy=fixture(false),l=legacy.s;l.telechatTransportV172.send=async()=>null;l.lookup=()=>new Promise(()=>{});
 const lookup=l.telechatPersistMessageV24({from_nick:'alice',chat_key:'alice_bob',text:'fixture',ts:1,legacy_retry_v172:true});await flush();legacy.fire(10000);assert.equal((await lookup).error.code,'TIMEOUT');assert.equal(legacy.queries.filter(x=>x==='insert').length,0,'Unknown old-protocol delivery must not be inserted blindly');
 l.insert=()=>new Promise(()=>{});const row={from_nick:'alice',chat_key:'alice_bob',text:'fixture',ts:2};const insert=l.telechatPersistMessageV24(row);await flush();legacy.fire(10000);assert.equal((await insert).error.code,'TIMEOUT');assert.equal(row.legacy_retry_v172,true);
 l.lookup=async()=>({data:{...row,id:91}});const adopted=await l.telechatPersistMessageV24(row);assert.equal(adopted.row.id,91);assert.equal(legacy.queries.filter(x=>x==='insert').length,1,'A late accepted legacy write is adopted without a duplicate insert');
 l.insert=async()=>({error:Error('temporary write failure')});l.lookup=async()=>({error:Error('temporary lookup failure')});const uncertain=await l.telechatPersistMessageV24({...row,legacy_retry_v172:false,ts:3});assert.equal(uncertain.ok,false);assert.equal(legacy.queries.filter(x=>x==='insert').length,2,'Failed verification stops the immediate second insert');
 assert.equal(legacy.timers.size,0,'All legacy request deadlines are released');
 const switched=fixture(false);let resolveProtocol;
 switched.s.telechatTransportV172.send=()=>new Promise(r=>resolveProtocol=r);
 const oldAccount=switched.s.telechatPersistMessageV24({from_nick:'alice',chat_key:'alice_bob',text:'fixture',ts:4});await flush();switched.s.me={nick:'carol'};resolveProtocol(null);
 assert.equal((await oldAccount).ok,false);assert.equal(switched.queries.length,0,'A late unsupported-RPC result cannot start an old-account fallback write');
 console.log('PASS v206 outbox: bounded open/write/delete/diagnostics, late-open disposal, version changes, memory retry, account isolation, stable nonces and uncertain legacy delivery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
