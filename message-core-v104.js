/* TELECHAT MESSAGE CORE V104 — race-safe Realtime and incremental recovery. */
(()=>{
  'use strict';
  const SEEN_TTL=120000,MAX_SEEN=5000,MAX_RETRY=30000;
  const seenEvents=new Map();
  let reconnectTimer=0,reconnectAttempt=0,refreshTimer=0,generation=0,lastRenderKey='';

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
      try{await renderMessages();await window.telechatChatSpeedV51?.refreshActive?.();if(sameKey(key))renderContacts();window.telechatRefreshReactionsV36?.();}catch(_){/* next Realtime event or online event retries */}
    },120);
  }
  function scheduleReconnect(key){
    if(!sameKey(key)||reconnectTimer)return;
    const delay=Math.min(MAX_RETRY,600*2**Math.min(reconnectAttempt++,6))+Math.round(Math.random()*240);
    reconnectTimer=setTimeout(()=>{reconnectTimer=0;if(sameKey(key)&&!document.hidden)subscribeCore();},delay);
  }
  function channelStatus(status,key){
    if(status==='SUBSCRIBED'){reconnectAttempt=0;scheduleRefresh(key);return;}
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')scheduleReconnect(key);
  }
  function subscribeCore(){
    const key=activeKey();if(!key||!me?.nick||typeof sb==='undefined')return;
    generation++;const token=generation;clearTimeout(reconnectTimer);clearTimeout(refreshTimer);reconnectTimer=0;refreshTimer=0;
    try{if(msgSub)sb.removeChannel(msgSub);}catch(_){ }
    try{if(pollSub)sb.removeChannel(pollSub);}catch(_){ }
    const channel=sb.channel('telechat-messages-v104-'+key+'-'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'chat_key=eq.'+key},async payload=>{
        const message=payload?.new;if(token!==generation||!sameKey(key)||!message||message.deleted||message.from_nick===me.nick||seen(message))return;
        try{await appendMessage({...message,chat_key:key});}catch(_){return;}
        if(!sameKey(key))return;
        Promise.resolve(renderContacts()).catch(()=>{});window.playPing?.();
        try{const user=await getUser(message.from_nick);window.sendPushNotification?.(currentRoom?currentRoom.name:(user?.name||'Новое сообщение'),messagePreviewText(message.text).substring(0,80));}catch(_){ }
        Promise.resolve(markAsRead()).catch(()=>{});
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'chat_key=eq.'+key},()=>scheduleRefresh(key))
      .subscribe(status=>channelStatus(status,key));
    msgSub=channel;
    pollSub=sb.channel('telechat-polls-v104-'+key+'-'+Date.now())
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'polls',filter:'chat_key=eq.'+key},()=>scheduleRefresh(key))
      .subscribe(status=>channelStatus(status,key));
  }
  if(typeof subscribeRealtime==='function')subscribeRealtime=subscribeCore;

  if(typeof renderMessages==='function'){
    const renderBefore=renderMessages;
    renderMessages=async function(...args){
      const key=activeKey();
      if(key!==lastRenderKey){lastRenderKey=key;window.telechatResetVisibleReactionsV36?.();}
      const value=await renderBefore.apply(this,args);
      await window.telechatChatSpeedV51?.refreshActive?.();
      if(key&&sameKey(key))window.telechatRefreshReactionsV36?.();
      return value;
    };
  }
  if(typeof goBack==='function'){
    const goBackBefore=goBack;
    goBack=function(...args){generation++;clearTimers();lastRenderKey='';return goBackBefore.apply(this,args);};
  }
  function recover(){
    if(document.hidden)return;
    const key=activeKey();if(!key)return;
    if(!msgSub)subscribeCore();else scheduleRefresh(key);
  }
  window.addEventListener('online',()=>{reconnectAttempt=0;recover();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover();},{passive:true});
  window.telechatMessageCoreV104={resync:recover,reconnect:subscribeCore,seen:eventKey};
})();
