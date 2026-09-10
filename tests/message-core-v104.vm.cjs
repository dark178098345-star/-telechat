const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'..','message-core-v104.js'),'utf8');
let key='me_other',appendCount=0,renderCount=0;
const channels=[];
function makeChannel(name){
  const channel={name,handlers:[],on(event,filter,handler){channel.handlers.push({event,filter,handler});return channel;},subscribe(status){channel.statusHandler=status;status?.('SUBSCRIBED');return channel;}};
  channels.push(channel);return channel;
}
const sandbox={
  window:{addEventListener(){},playPing(){},sendPushNotification(){}},
  document:{hidden:false,addEventListener(){}},
  me:{nick:'me'},currentRoom:null,currentChat:'other',msgSub:null,pollSub:null,
  conversationKey:()=>key,subscribeRealtime:()=>{},
  sb:{channel:makeChannel,removeChannel(){}},
  renderMessages:async()=>{renderCount++;},renderContacts:()=>{},appendMessage:async()=>{appendCount++;},
  getUser:async()=>({name:'Друг'}),messagePreviewText:value=>String(value||''),markAsRead:()=>Promise.resolve(),
  setTimeout,clearTimeout,Date,Math,Promise,console
};
vm.runInNewContext(source,sandbox,{filename:'message-core-v104.js'});
sandbox.subscribeRealtime();
const messages=channels[0];
const insert=messages.handlers.find(item=>item.filter?.event==='INSERT')?.handler;
const update=messages.handlers.find(item=>item.filter?.event==='UPDATE')?.handler;
const row={id:41,chat_key:key,from_nick:'other',text:'Привет',ts:Date.now(),deleted:false};
insert({new:row});insert({new:{...row}});
setTimeout(()=>{
  assert.equal(appendCount,1,'duplicate Realtime INSERT must append once');
  update({new:row});
  setTimeout(()=>{
    assert(renderCount>=1,'message updates should schedule a resync');
    assert.equal(typeof sandbox.window.telechatMessageCoreV104.resync,'function');
    sandbox.window.telechatMessageCoreV104.reconnect();
    assert(channels.length>=4,'reconnect should replace message and poll channels');
    console.log('message-core-v104 vm ok');
  },180);
},30);
