/* TELECHAT MESSAGE CORE V104 — race-safe Realtime and incremental recovery. */
(()=>{
  'use strict';
  const SEEN_TTL=120000,MAX_SEEN=5000,MAX_RETRY=30000;
  const seenEvents=new Map(),latestByKey=new Map();
  let probeJob=null;
  let reconnectTimer=0,reconnectAttempt=0,refreshTimer=0,generation=0,lastProbeAt=0,connectTimer=0,connecting=false;
  const unhealthy=new Set();
  const offline=()=>typeof navigator!=='undefined'&&navigator.onLine===false;

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
  function clearTimers(){clearTimeout(reconnectTimer);clearTimeout(refreshTimer);clearTimeout(connectTimer);reconnectTimer=refreshTimer=connectTimer=0;connecting=false;}
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
    if(!sameKey(key)||reconnectTimer||typeof navigator!=='undefined'&&navigator.onLine===false)return;
    const delay=Math.min(MAX_RETRY,600*2**Math.min(reconnectAttempt++,6))+Math.round(Math.random()*240);
    reconnectTimer=setTimeout(()=>{reconnectTimer=0;if(sameKey(key)&&!document.hidden&&!(typeof navigator!=='undefined'&&navigator.onLine===false))subscribeCore();},delay);
  }
  async function probeLatest(key){
    if(document.hidden||!sameKey(key)||typeof sb==='undefined'||probeJob)return;
    const token=generation;
    probeJob=(async()=>{const controller=new AbortController();let timeout;const expiry=new Promise((_,reject)=>{timeout=setTimeout(()=>{reject(Error('Probe timeout'));controller.abort();},8000);});try{
      let query=sb.from('messages').select('id,ts').eq('chat_key',key).order('ts',{ascending:false}).limit(1);
      if(query.abortSignal)query=query.abortSignal(controller.signal);
      const result=await Promise.race([Promise.resolve(query),expiry]);
      if(result.error||token!==generation||!sameKey(key))return;
      const newest=result.data?.[0];
      const id=newest?String(newest.id??''):'';
      const previous=latestByKey.get(key);latestByKey.set(key,id);
      if(previous!==id)scheduleRefresh(key);
    }catch(_){ }finally{clearTimeout(timeout);}})();
    try{await probeJob;}finally{probeJob=null;}
  }
  function channelStatus(status,key,token,kind){
    if(token!==generation||!sameKey(key))return;
    if(status==='SUBSCRIBED'){unhealthy.delete(kind);if(!unhealthy.size){reconnectAttempt=0;connecting=false;clearTimeout(connectTimer);clearTimeout(reconnectTimer);connectTimer=reconnectTimer=0;}scheduleRefresh(key);}
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){unhealthy.add(kind);connecting=false;clearTimeout(connectTimer);connectTimer=0;scheduleReconnect(key);}
    window.dispatchEvent?.(new Event('exstra-connection-change-v176'));
  }
  function subscribeCore(){
    const key=activeKey();if(!key||!me?.nick||typeof sb==='undefined'||offline())return;
    generation++;const token=generation;clearTimers();connecting=true;
    unhealthy.clear();unhealthy.add('messages');unhealthy.add('polls');
    try{if(msgSub)Promise.resolve(sb.removeChannel(msgSub)).catch(()=>{});}catch(_){ }
    try{if(pollSub)Promise.resolve(sb.removeChannel(pollSub)).catch(()=>{});}catch(_){ }
    const channel=sb.channel('telechat-messages-v104-'+key+'-'+token+'-'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'chat_key=eq.'+key},async payload=>{
        const message=payload?.new;if(token!==generation||!sameKey(key)||!message||message.deleted)return;
        if(message.id!==undefined&&message.id!==null)latestByKey.set(key,String(message.id));
        if(!currentRoom&&window.telechatIsBlockedV74?.(message.from_nick))return;
        if(message.from_nick===me.nick){if(window.telechatDeliveryV72?.acknowledge(message))return;if(!seen(message)){try{await appendMessage({...message,chat_key:key});window.telechatApplySidebarMessageV25?.(message);Promise.resolve(renderContacts()).catch(()=>{});}catch(_){scheduleRefresh(key);}}return;}
        if(seen(message))return;
        try{await appendMessage({...message,chat_key:key});}catch(_){seenEvents.delete(eventKey(message));scheduleRefresh(key);return;}
        if(token!==generation||!sameKey(key))return;
        const silenced=!currentRoom&&window.telechatShouldSilenceV74?.(message.from_nick);
        Promise.resolve(renderContacts()).catch(()=>{});if(!silenced)window.playPing?.({chatKey:key});
        try{const user=await getUser(message.from_nick);if(token===generation&&sameKey(key)&&!silenced)window.sendPushNotification?.(currentRoom?currentRoom.name:(user?.name||'Новое сообщение'),messagePreviewText(message.text).substring(0,80));}catch(_){ }
        Promise.resolve(markAsRead()).catch(()=>{});
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'chat_key=eq.'+key},payload=>{
        if(token!==generation||!sameKey(key))return;
        if(window.telechatChatSpeedV51?.applyRealtimeUpdate?.(payload.new||{})!==false)scheduleRefresh(key);
      })
      .subscribe(status=>channelStatus(status,key,token,'messages'));
    msgSub=channel;
    pollSub=sb.channel('telechat-polls-v104-'+key+'-'+token+'-'+Date.now())
      .on('postgres_changes',{event:'*',schema:'public',table:'polls',filter:'chat_key=eq.'+key},()=>{if(token===generation)scheduleRefresh(key);})
      .subscribe(status=>channelStatus(status,key,token,'polls'));
    if(connecting)connectTimer=setTimeout(()=>{connectTimer=0;if(token!==generation||!sameKey(key)||!unhealthy.size)return;connecting=false;scheduleReconnect(key);window.dispatchEvent?.(new Event('exstra-connection-change-v176'));},12000);
  }
  if(typeof subscribeRealtime==='function')subscribeRealtime=subscribeCore;

  if(typeof goBack==='function'){
    const goBackBefore=goBack;
    goBack=function(...args){generation++;clearTimers();unhealthy.clear();return goBackBefore.apply(this,args);};
  }
  function recover(){
    if(document.hidden||offline())return;
    const key=activeKey();if(!key)return;
    if(!msgSub||unhealthy.size){if(!connecting)subscribeCore();}else scheduleRefresh(key);
  }
  window.addEventListener('online',()=>{reconnectAttempt=0;recover();});
  window.addEventListener('offline',()=>{clearTimers();unhealthy.add('network');window.dispatchEvent?.(new Event('exstra-connection-change-v176'));});
  window.addEventListener('telechat-native-visibility',event=>{if(event.detail?.background===false)recover();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover();},{passive:true});
  setInterval(()=>{const key=activeKey(),at=Date.now();if(!key||document.hidden||typeof navigator!=='undefined'&&navigator.onLine===false)return;const gap=unhealthy.size?7000:30000;if(at-lastProbeAt<gap)return;lastProbeAt=at;probeLatest(key);},7000);
  window.telechatMessageCoreV104={resync:recover,reconnect:subscribeCore,seen:eventKey,diagnostics:()=>({active:!!activeKey(),connected:!offline()&&!!activeKey()&&!!msgSub&&!unhealthy.size,reconnecting:connecting||!!reconnectTimer})};
  // Account restoration may finish before this parser-loaded module arrives.
  if(document.getElementById?.('chat-screen')?.classList.contains('active'))recover();
})();
