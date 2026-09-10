const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let key='me_friend',timerId=0,appends=0,pings=0,fetches=0,renders=0,blocked=false,muted=false;
const timers=new Map(),channels=[],listeners={};
const sandbox={
  me:{nick:'me'},currentRoom:null,msgSub:null,pollSub:null,
  conversationKey:()=>key,subscribeRealtime(){},goBack(){key='';},
  renderMessages:async()=>{renders++;},renderContacts:async()=>{},appendMessage:async()=>{appends++;},
  getUser:async()=>({name:'Friend'}),messagePreviewText:text=>text,markAsRead:async()=>{},
  playPing:()=>{pings++;},sendPushNotification(){},telechatIsBlockedV74:()=>blocked,telechatShouldSilenceV74:()=>muted,
  telechatChatSpeedV51:{refreshActive:async()=>{fetches++;},applyRealtimeUpdate:message=>!message.receiptOnly},
  document:{hidden:false,addEventListener:(name,callback)=>{listeners[name]=callback;}},
  addEventListener:(name,callback)=>{listeners[name]=callback;},
  sb:{channel(name){const c={name,handlers:[],on(event,filter,handler){this.handlers.push({filter,handler});return this;},subscribe(callback){this.status=callback;callback('SUBSCRIBED');return this;}};channels.push(c);return c;},removeChannel(channel){channel.status('CLOSED');}},
  setTimeout(callback,delay){const id=++timerId;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),Date,Math,Promise,console
};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../message-core-v104.js'),'utf8'),sandbox);
const flush=async()=>{const jobs=[...timers.values()];timers.clear();for(const job of jobs)await job.callback();};
const handler=(channel,event)=>channel.handlers.find(item=>item.filter.event===event).handler;
(async()=>{
  await sandbox.renderMessages();assert.equal(renders,1);assert.equal(fetches,0,'opening must not add a forced duplicate history request');
  sandbox.subscribeRealtime();await flush();assert.equal(fetches,1,'both subscriptions coalesce into one refresh');
  const first=channels[0];sandbox.subscribeRealtime();await flush();
  assert.equal(timers.size,0,'closing replaced channels must not schedule reconnects');
  const current=channels[2],update=handler(current,'UPDATE'),insert=handler(current,'INSERT');
  update({new:{receiptOnly:true}});assert.equal(timers.size,0,'read receipts must patch checks without loading history');
  handler(first,'UPDATE')({new:{}});first.status('CHANNEL_ERROR');assert.equal(timers.size,0,'late events from old channels must be ignored');
  update({new:{}});update({new:{}});await flush();assert.equal(fetches,3,'burst of edits must fetch once');
  blocked=true;await insert({new:{id:1,from_nick:'friend',text:'blocked'}});assert.equal(appends,0);
  blocked=false;muted=true;await insert({new:{id:2,from_nick:'friend',text:'silent'}});assert.equal(appends,1);assert.equal(pings,0);
  await insert({new:{id:2,from_nick:'friend',text:'silent'}});assert.equal(appends,1,'duplicate delivery must not append twice');
  assert.equal(channels[3].handlers[0].filter.event,'*','new polls and deletions must sync as well as votes');
  sandbox.document.hidden=true;current.status('CHANNEL_ERROR');await flush();const before=channels.length;
  sandbox.document.hidden=false;listeners.visibilitychange();assert.equal(channels.length,before+2,'returning from background must reconnect unhealthy channels');
  console.log('V105 realtime: coalescing, read receipts, old channels, privacy, duplicates, polls and background recovery passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
