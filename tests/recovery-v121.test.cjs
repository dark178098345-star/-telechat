const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let key='me_friend',tick,serial=0,fetches=0;
const timers=new Map(),requests=[],channels=[];
const sandbox={AbortController,me:{nick:'me'},currentRoom:null,msgSub:null,pollSub:null,
  conversationKey:()=>key,subscribeRealtime(){},goBack(){key='';},
  document:{hidden:false,addEventListener(){}},addEventListener(){},
  renderMessages:async()=>{},renderContacts:async()=>{},appendMessage:async()=>{},
  getUser:async()=>({}),messagePreviewText:String,markAsRead:async()=>{},
  telechatChatSpeedV51:{refreshActive:async()=>{fetches++;}},
  sb:{from(){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return new Promise(resolve=>requests.push(resolve));}};},
    channel(name){const c={name,on(){return this;},subscribe(){return this;}};channels.push(c);return c;},removeChannel(){}},
  setInterval(fn){tick=fn;},setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},Date,Math,Promise,console
};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../message-core-v104.js'),'utf8'),sandbox);
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const flush=async()=>{const jobs=[...timers.values()];timers.clear();for(const job of jobs)await job();};
(async()=>{
  sandbox.subscribeRealtime();tick();tick();assert.equal(requests.length,1,'slow probes must not overlap');
  requests.shift()({data:[{id:1,ts:100}]});await settle();await flush();
  assert.equal(fetches,1,'first probe must recover messages missed before its baseline');
  tick();requests.shift()({data:[{id:1,ts:100}]});await settle();await flush();assert.equal(fetches,1,'unchanged state must not repaint');
  tick();requests.shift()({data:[]});await settle();await flush();assert.equal(fetches,2,'empty remote history must clear stale local messages');
  tick();requests.shift()({error:{message:'offline'},data:null});await settle();await flush();assert.equal(fetches,2,'failed reads must not be interpreted as deletion');
  tick();sandbox.subscribeRealtime();requests.shift()({data:[{id:99,ts:200}]});await settle();await flush();assert.equal(fetches,2,'old subscription probes must not mutate the new session');
  sandbox.subscribeRealtime();assert.equal(new Set(channels.map(c=>c.name)).size,channels.length,'rapid reconnects must use distinct topics');
  console.log('V121 recovery: first missed arrival, empty history, single-flight, failed reads, stale sessions and unique topics passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
