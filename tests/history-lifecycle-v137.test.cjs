const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../chat-speed-v51.js'),'utf8');
let key='active',deferred=null;
const timers=new Map();let serial=0;
const box={addEventListener(){},classList:{add(){},remove(){}},dataset:{},replaceChildren(){}};
const sandbox={console,me:{nick:'me'},currentChat:'friend',currentRoom:null,userCache:{},
 appendMessage:async()=>{},renderMessages:async()=>{},avatarMarkup:()=>'',conversationKey:()=>key,
 document:{getElementById:()=>box},setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
 sb:{from(table){return {select(){return this},eq(){return this},order(){return this},limit(){return this},lt(){return this},then(resolve,reject){return (deferred||Promise.resolve({data:Array.from({length:20},(_,i)=>({id:i+1,ts:100-i*2-(table==='polls'?1:0)}))})).then(resolve,reject);}};}}
};sandbox.window=sandbox;
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, 'window.test={fetchPageV51,getStateV51,historyCacheV51};})();'),sandbox);
(async()=>{
 const page=await sandbox.test.fetchPageV51('active');
 assert.equal(page.items.length,30);assert.equal(page.hasMore,true,'40 mixed rows must leave older history available');
 const active=sandbox.test.getStateV51('active');active.touchedAt=0;
 const old=sandbox.test.getStateV51('old');old.touchedAt=1;
 let released=0;old.refreshWaiters.push(()=>released++);old.persistTimer=sandbox.setTimeout(()=>{});old.refreshTimer=sandbox.setTimeout(()=>{});
 for(let i=0;i<7;i++)sandbox.test.getStateV51('other'+i);
 assert.equal(old.disposed,true);assert.equal(released,1);assert.equal(timers.size,0);assert(sandbox.test.historyCacheV51.has('active'),'active conversation must not be evicted');
 active.cursor=100;active.hasMore=true;let finish;deferred=new Promise(resolve=>finish=resolve);
 const pending=sandbox.telechatChatSpeedV51.loadOlder();
 sandbox.telechatChatSpeedV51.clearConversation('active');
 const replacement=sandbox.test.getStateV51('active');finish({data:[{id:99,ts:50}]});await pending;
 assert.equal(active.items.length,0,'discard old history response after clear');assert.equal(replacement.items.length,0,'replacement cache stays empty');
 console.log('PASS history lifecycle: mixed-page continuation, cache timer cleanup, waiter release, active cache retention, stale response after clear');
})().catch(error=>{console.error(error);process.exitCode=1;});
