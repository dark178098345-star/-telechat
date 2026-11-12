const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let key='me_friend',tick,serial=0,fetches=0,at=1000000;
class Clock extends Date{static now(){return at;}}
const timers=new Map(),requests=[],channels=[];
const sandbox={AbortController,me:{nick:'me'},currentRoom:null,msgSub:null,pollSub:null,
  conversationKey:()=>key,subscribeRealtime(){},goBack(){key='';},
  document:{hidden:false,addEventListener(){}},addEventListener(){},
  renderMessages:async()=>{},renderContacts:async()=>{},appendMessage:async()=>{},
  getUser:async()=>({}),messagePreviewText:String,markAsRead:async()=>{},
  telechatChatSpeedV51:{refreshActive:async()=>{fetches++;}},
  sb:{from(){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return new Promise(resolve=>requests.push(resolve));}};},
    channel(name){const c={name,on(){return this;},subscribe(){return this;}};channels.push(c);return c;},removeChannel(){}},
  setInterval(fn){tick=()=>{at+=35000;return fn();};},setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},Date:Clock,Math,Promise,console
};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../message-core-v104.js'),'utf8'),sandbox);
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
// Flush only the UI debounce, not unrelated request/handshake deadlines.
const flush=async()=>{for(const [id,job] of [...timers])if(job.ms===120){timers.delete(id);await job.fn();}};
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
