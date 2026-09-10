/* TELECHAT MESSAGE CORE V104 — race-safe Realtime and incremental recovery. */
(()=>{
  'use strict';
  const SEEN_TTL=120000,MAX_SEEN=5000,MAX_RETRY=30000;
  const seenEvents=new Map();
  let reconnectTimer=0,reconnectAttempt=0,refreshTimer=0,generation=0;
  const unhealthy=new Set();

  const activeKey=()=>{try{return typeof conversationKey==='function'?String(conversationKey()||''):'';}catch(_){return '';}};
  const sameKey=key=>key&&activeKey()===key;
  const eventKey=message=>{
    if(!message)return '';
    if(message.id!==undefined&&message.id!==null&&message.id!=='')return 'id:'+String(message.id);
    return ['fallback',message.chat_key||'',message.from_nick||'',message.ts||'',message.text||'',message.reply_text||''].join('|');
  };
  function seen(message){
    const key=eventKey(message);if(!key)return false;
    const at=Date.now(),previous=seenEvents.get(key);
    if(previous&&at-previous<SEEN_TTL)return true;
    seenEvents.set(key,at);
    if(seenEvents.size>MAX_SEEN){
      const oldest=[...seenEvents.entries()].sort((a,b)=>a[1]-b[1]).slice(0,Math.max(1,seenEvents.size-MAX_SEEN));
      oldest.forEach(item=>seenEvents.delete(item[0]));
    }
    return false;
  }
  function clearTimers(){clearTimeout(reconnectTimer);clearTimeout(refreshTimer);reconnectTimer=0;refreshTimer=0;}
  function scheduleRefresh(key){
    if(!sameKey(key))return;
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(async()=>{
      refreshTimer=0;if(document.hidden||!sameKey(key))return;
      try{
        const refresh=window.telechatChatSpeedV51?.refreshActive;
        if(refresh)await refresh();else await renderMessages();
      }catch(_){/* next Realtime event or online event retries */}
    },120);
  }
  function scheduleReconnect(key){
    if(!sameKey(key)||reconnectTimer)return;
    const delay=Math.min(MAX_RETRY,600*2**Math.min(reconnectAttempt++,6))+Math.round(Math.random()*240);
    reconnectTimer=setTimeout(()=>{reconnectTimer=0;if(sameKey(key)&&!document.hidden)subscribeCore();},delay);
  }
  function channelStatus(status,key,token,kind){
    if(token!==generation||!sameKey(key))return;
    if(status==='SUBSCRIBED'){unhealthy.delete(kind);if(!unhealthy.size)reconnectAttempt=0;scheduleRefresh(key);return;}
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){unhealthy.add(kind);scheduleReconnect(key);}
  }
  function subscribeCore(){
    const key=activeKey();if(!key||!me?.nick||typeof sb==='undefined')return;
    generation++;const token=generation;clearTimeout(reconnectTimer);clearTimeout(refreshTimer);reconnectTimer=0;refreshTimer=0;
    unhealthy.clear();unhealthy.add('messages');unhealthy.add('polls');
    try{if(msgSub)sb.removeChannel(msgSub);}catch(_){ }
    try{if(pollSub)sb.removeChannel(pollSub);}catch(_){ }
    const channel=sb.channel('telechat-messages-v104-'+key+'-'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'chat_key=eq.'+key},async payload=>{
        const message=payload?.new;if(token!==generation||!sameKey(key)||!message||message.deleted)return;
        if(!currentRoom&&window.telechatIsBlockedV74?.(message.from_nick))return;
        if(message.from_nick===me.nick){scheduleRefresh(key);return;}
        if(seen(message))return;
        try{await appendMessage({...message,chat_key:key});}catch(_){seenEvents.delete(eventKey(message));scheduleRefresh(key);return;}
        if(token!==generation||!sameKey(key))return;
        const silenced=!currentRoom&&window.telechatShouldSilenceV74?.(message.from_nick);
        Promise.resolve(renderContacts()).catch(()=>{});if(!silenced)window.playPing?.();
        try{const user=await getUser(message.from_nick);if(token===generation&&sameKey(key)&&!silenced)window.sendPushNotification?.(currentRoom?currentRoom.name:(user?.name||'Новое сообщение'),messagePreviewText(message.text).substring(0,80));}catch(_){ }
        Promise.resolve(markAsRead()).catch(()=>{});
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'chat_key=eq.'+key},payload=>{
        if(token!==generation||!sameKey(key))return;
        if(window.telechatChatSpeedV51?.applyRealtimeUpdate?.(payload.new||{})!==false)scheduleRefresh(key);
      })
      .subscribe(status=>channelStatus(status,key,token,'messages'));
    msgSub=channel;
    pollSub=sb.channel('telechat-polls-v104-'+key+'-'+Date.now())
      .on('postgres_changes',{event:'*',schema:'public',table:'polls',filter:'chat_key=eq.'+key},()=>{if(token===generation)scheduleRefresh(key);})
      .subscribe(status=>channelStatus(status,key,token,'polls'));
  }
  if(typeof subscribeRealtime==='function')subscribeRealtime=subscribeCore;

  if(typeof goBack==='function'){
    const goBackBefore=goBack;
    goBack=function(...args){generation++;clearTimers();unhealthy.clear();return goBackBefore.apply(this,args);};
  }
  function recover(){
    if(document.hidden)return;
    const key=activeKey();if(!key)return;
    if(!msgSub||unhealthy.size)subscribeCore();else scheduleRefresh(key);
  }
  window.addEventListener('online',()=>{reconnectAttempt=0;recover();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover();},{passive:true});
  window.telechatMessageCoreV104={resync:recover,reconnect:subscribeCore,seen:eventKey};
})();
