/* TELECHAT CHAT RELIABILITY V72 — optimistic delivery, durable outbox and safe retry. */
(()=>{
  'use strict';
  const DB='telechat-outbox-v72',STORE='items';
  let databasePromise=null,lastTimestamp=0,draining=false,optimisticQueue=Promise.resolve(),retryTimer=0,retryDue=0,storageWarned=false;
  const deliveries=new Map(),ackWaiters=new Map(),confirmedRows=new WeakMap();
  const liveRows=new Map(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const errorText=error=>String(error?.message||error||'').trim();

  function friendlyError(error){
    const message=errorText(error);
    if(/Аккаунт заблокирован/i.test(message))return 'Твой аккаунт заблокирован — отправка недоступна';
    if(/мут/i.test(message))return 'У тебя мут — отправка сообщений временно недоступна';
    if(/Пользователь не найден/i.test(message))return 'Профиль отправителя не найден в базе';
    if(/permission|row.level|policy|denied/i.test(message))return 'База отклонила сообщение — проверь доступ';
    return message?'Не удалось отправить: '+message.slice(0,110):'Нет подтверждения сервера — повторим отправку';
  }
  const canRetry=error=>!/Аккаунт заблокирован|мут|Пользователь не найден|permission|row.level|policy|denied|Войди в аккаунт|Некорректн|Нет доступа|Чат не найден|Повторный идентификатор/i.test(errorText(error));

  async function messageExists(row,strict=false){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{let query=sb.from('messages').select('*').eq('chat_key',row.chat_key).eq('from_nick',row.from_nick).eq('ts',row.ts).limit(1);if(query.abortSignal)query=query.abortSignal(controller.signal);const result=await query.maybeSingle();
    if(strict&&result.error)throw result.error;
    return !result.error&&result.data?result.data:null;
    }finally{clearTimeout(timeout);}
  }
  async function persistMessage(row){
    // Adopt acknowledgements from the old protocol before assigning a new server nonce.
    if(row.legacy_retry_v172){try{const existing=await messageExists(row,true);if(existing)return {ok:true,row:existing};}catch(error){return {ok:false,error};}}
    const modern=await window.telechatTransportV172?.send(row);if(modern)return modern;
    row.legacy_retry_v172=true;
    const legacy={...row};delete legacy.client_id_v172;delete legacy.client_hash_v172;delete legacy.legacy_retry_v172;
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const result=await sb.from('messages').insert(legacy).select('*').single();
      if(!result.error)return {ok:true,row:result.data||row};
      lastError=result.error;
      const existing=await messageExists(row);
      if(existing)return {ok:true,row:existing};
      if(attempt===0&&canRetry(lastError))await wait(360);else break;
    }
    return {ok:false,error:lastError};
  }

  function nextTimestamp(){const now=Date.now(),latest=Number(window.telechatChatSpeedV51?.latestTimestamp?.(conversationKey()))||0;lastTimestamp=Math.max(now,lastTimestamp+1,latest+1);return lastTimestamp;}
  function openDatabase(){
    if(!('indexedDB' in window))return Promise.resolve(null);
    if(databasePromise)return databasePromise;
    databasePromise=new Promise(resolve=>{
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'clientId'});};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
    });
    return databasePromise;
  }
  async function outboxWrite(item){
    try{const database=await openDatabase();if(!database)return false;
    return await new Promise(resolve=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...item,element:undefined});tx.oncomplete=()=>{window.dispatchEvent(new Event('exstra-delivery-change-v176'));resolve(true);};tx.onerror=tx.onabort=()=>resolve(false);});}catch(_){return false;}
  }
  async function outboxDelete(clientId){
    const database=await openDatabase();if(!database)return;
    await new Promise(resolve=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(clientId);tx.oncomplete=()=>{window.dispatchEvent(new Event('exstra-delivery-change-v176'));resolve();};tx.onerror=resolve;tx.onabort=resolve;});
  }
  async function outboxRead(){
    const database=await openDatabase();if(!database)return [];
    return new Promise(resolve=>{const request=database.transaction(STORE,'readonly').objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);});
  }

  function deliveryMarkup(state){
    if(state==='failed')return '<button class="v72-delivery v72-failed" type="button"><span>!</span> Повторить</button>';
    if(state==='sent')return '<span class="v72-delivery v72-sent msg-check">✓ Отправлено</span>';
    return '<span class="v72-delivery v72-sending"><i></i> Отправляется</span>';
  }
  function setDeliveryState(item,state){
    item.state=state;window.dispatchEvent(new Event('exstra-delivery-change-v176'));const element=item.element;if(!element?.isConnected)return;
    const holder=document.createElement('span');holder.innerHTML=deliveryMarkup(state);const next=holder.firstElementChild;
    const old=element.querySelector('.v72-delivery');if(old)old.replaceWith(next);else element.querySelector('.msg-meta')?.append(next);
    if(state==='failed')next.onclick=()=>retryMessage(item.clientId);
  }
  async function renderOptimistic(item,animate=false){
    if(!isMine(item))return;
    const box=document.getElementById('messages');box?.querySelector('.v51-empty-chat')?.remove();
    const result=await appendMessage({...item.row});
    if(!isMine(item)){if(result?.classList?.contains('msg')&&!result.dataset.id)result.remove();return;}
    if(item.row.chat_key!==conversationKey())return;
    const key='msg:'+item.row.from_nick+':'+item.row.ts;
    const element=result?.classList?.contains('msg')?result:[...(box?.querySelectorAll('.msg')||[])].find(row=>row.dataset.messageKeyV105===key);if(!element)return;
    item.element=element;element.dataset.clientId=item.clientId;element.classList.add('v72-pending-message');element.querySelector('.msg-check')?.remove();
    element.querySelector('.msg-meta')?.insertAdjacentHTML('beforeend',deliveryMarkup('sending'));liveRows.set(item.clientId,item);
    if(animate)window.dispatchEvent(new CustomEvent('telechat-message-sent-v164',{detail:{element,owner:item.row.from_nick,key:item.row.chat_key}}));
  }
  function deliver(item,options){if(deliveries.has(item.clientId))return deliveries.get(item.clientId);const job=Promise.resolve().then(()=>deliverOnce(item,options)).finally(()=>deliveries.delete(item.clientId));deliveries.set(item.clientId,job);return job;}
  async function deliverOnce(item,{silent=false}={}){
    if(!isMine(item))return false;
    if(item.expiresAt&&Date.now()>item.expiresAt){await outboxDelete(item.clientId);setDeliveryState(item,'failed');return false;}
    if(!item.row.client_id_v172){item.row.legacy_retry_v172=true;item.row.client_id_v172=item.clientId;}
    setDeliveryState(item,'sending');const durable=await outboxWrite(item);
    if(!durable&&!storageWarned){storageWarned=true;showToast('Не удалось сохранить очередь на устройстве. Не закрывай приложение до отправки.');}
    if(!isMine(item))return false;
    let saved;try{const confirmed=confirmedRows.get(item);saved=confirmed?{ok:true,row:confirmed}:await Promise.race([persistMessage(item.row),new Promise(resolve=>ackWaiters.set(item.clientId,resolve))]);}catch(error){saved={ok:false,error};}finally{ackWaiters.delete(item.clientId);confirmedRows.delete(item);}
    if(!saved.ok){item.state='failed';item.attempts=(item.attempts||0)+1;item.permanent=!canRetry(saved.error);item.retryAt=Date.now()+Math.min(120000,700*2**Math.min(item.attempts-1,8))*(.85+Math.random()*.3);await outboxWrite(item);if(isMine(item)){setDeliveryState(item,'failed');if(!silent)showToast(friendlyError(saved.error));if(!item.permanent)scheduleRetry(item.retryAt);}return false;}
    await outboxDelete(item.clientId);if(!isMine(item)){liveRows.delete(item.clientId);return true;}setDeliveryState(item,'sent');item.element?.classList.remove('v72-pending-message');
    window.telechatChatSpeedV51?.acceptSent?.(saved.row||item.row);
    window.telechatApplySidebarMessageV25?.(saved.row||item.row);
    Promise.resolve(renderContacts()).catch(()=>{});
    if(!silent)playSendSound();
    setTimeout(()=>{const status=item.element?.querySelector('.v72-delivery'),read=status?.classList.contains('read')||(saved.row?.read_by||[]).some(n=>n!==item.row.from_nick);if(status){status.textContent=read?'✓✓':'✓';status.className='msg-check'+(read?' read':'');}liveRows.delete(item.clientId);},1800);
    return true;
  }
  async function retryMessage(clientId){
    let item=liveRows.get(clientId);if(!item)item=(await outboxRead()).find(row=>row.clientId===clientId);if(!item)return;
    if(!isMine(item))return;item.permanent=false;item.retryAt=0;
    if(!item.element&&item.row.chat_key===conversationKey())await renderOptimistic(item);await deliver(item);
  }
  const isMine=item=>String(item?.row?.from_nick||'').toLowerCase()===String(me?.nick||'').toLowerCase();
  function scheduleRetry(at=Date.now()+200){if(document.hidden||navigator.onLine===false||retryTimer&&at>=retryDue)return;clearTimeout(retryTimer);retryDue=at;retryTimer=setTimeout(()=>{retryTimer=0;retryDue=0;drainOutbox();},Math.max(100,at-Date.now()));}
  async function drainOutbox(force=false){
    if(draining||!me||navigator.onLine===false)return;draining=true;
    try{for(const item of (await outboxRead()).filter(isMine).sort((a,b)=>a.row.ts-b.row.ts)){if(!isMine(item))break;if(item.permanent)continue;if(!force&&item.retryAt>Date.now()){scheduleRetry(item.retryAt);continue;}const live=liveRows.get(item.clientId);if(live?.element?.isConnected)item.element=live.element;if(!item.element&&item.row.chat_key===conversationKey())await renderOptimistic(item);await deliver(item,{silent:true});}}
    finally{draining=false;}
  }

  sendMsg=async function(){
    const input=document.getElementById('msg-input'),caption=input.value.trim(),key=conversationKey();
    if(!key||(!caption&&!pendingMedia))return;if(!canWriteCurrent()){showToast('Писать в канал может только владелец');return;}
    const media=pendingMedia,reply=replyTo,text=media?packMedia(media.kind,media.data,caption,media.duration):caption;
    const clientId=crypto.randomUUID?.()||('m-'+Date.now()+'-'+Math.random().toString(16).slice(2));
    const item={clientId,state:'sending',createdAt:Date.now(),row:{chat_key:key,from_nick:me.nick,text,ts:nextTimestamp(),reply_text:reply?reply.text:null,read_by:[],deleted:false,client_id_v172:clientId}};
    input.value='';input.style.height='';cancelReply();cancelPendingMedia();
    window.dispatchEvent(new CustomEvent('telechat-chat-action-v155',{detail:{action:'send',owner:me.nick,key,text}}));
    try{sb.from('typing').delete().eq('chat_key',key).eq('nick',me.nick).then(()=>{});}catch(error){}
    optimisticQueue=optimisticQueue.then(()=>renderOptimistic(item,true)).catch(()=>{});
    await optimisticQueue;renderContacts();deliver(item).catch(error=>{setDeliveryState(item,'failed');outboxWrite({...item,state:'failed'});showToast(friendlyError(error));});
  };
  const previousLogin=doLogin;
  doLogin=async function(){const result=await previousLogin();if(me)setTimeout(drainOutbox,250);return result;};
  window.addEventListener('online',()=>{clearTimeout(retryTimer);retryTimer=0;setTimeout(()=>drainOutbox(true),200);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(retryTimer);retryTimer=0;}else scheduleRetry();});
  window.addEventListener('telechat-native-visibility',event=>{if(event.detail?.background){clearTimeout(retryTimer);retryTimer=0;}else scheduleRetry();});
  window.telechatPersistMessageV24=persistMessage;
  // Explicit-target messages do not change the open chat or consume its draft.
  async function sendDirect(nick,text,{expiresAt}={}){
    const owner=me?.nick;if(!owner||nick===owner||!/^[a-zA-Z0-9_]{1,64}$/.test(nick)||typeof text!=='string'||!text.trim()||text.length>8000)throw Error('Не удалось отправить приглашение.');
    const item={clientId:crypto.randomUUID(),state:'sending',createdAt:Date.now(),expiresAt,row:{chat_key:chatKey(owner,nick),from_nick:owner,text,ts:nextTimestamp(),reply_text:null,read_by:[],deleted:false}};
    item.row.client_id_v172=item.clientId;
    optimisticQueue=optimisticQueue.then(async()=>{if(me?.nick===owner&&conversationKey()===item.row.chat_key)await renderOptimistic(item,true);}).catch(()=>{});
    await optimisticQueue;if(me?.nick!==owner)throw Error('Аккаунт изменился. Повтори отправку.');
    try{return await deliver(item,{silent:true});}catch(error){setDeliveryState(item,'failed');await outboxWrite({...item,state:'failed'});return false;}
  }
  function acknowledge(message){if(!message?.id||message.from_nick!==me?.nick)return false;const item=[...liveRows.values()].find(item=>item.row.chat_key===message.chat_key&&item.row.from_nick===message.from_nick&&(message.client_id_v172?item.clientId===message.client_id_v172:Number(item.row.ts)===Number(message.ts)&&item.row.text===message.text));if(!item)return false;if(item.state==='sent')return true;const saved={...item.row,...message,text:typeof message.text==='string'?message.text:item.row.text};const waiter=ackWaiters.get(item.clientId);if(waiter)waiter({ok:true,row:saved});else{confirmedRows.set(item,saved);const pending=deliveries.get(item.clientId);if(pending)pending.finally(()=>{if(confirmedRows.has(item)&&isMine(item))deliver(item,{silent:true}).catch(()=>{});}).catch(()=>{});else deliver(item,{silent:true}).catch(()=>{});}return true;}
  async function diagnostics(){
    const owner=me?.nick;if(!owner)return {queued:0,failed:0,permanent:0,sending:0,durable:true};
    const database=await openDatabase(),items=new Map();
    // Stream only counters/IDs: do not retain a second copy of queued media bodies.
    if(database)await new Promise(resolve=>{const tx=database.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openCursor();request.onerror=tx.onabort=()=>resolve();request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve();return;}const item=cursor.value;if(item.row?.from_nick===owner&&(!item.expiresAt||item.expiresAt>Date.now()))items.set(item.clientId,{clientId:item.clientId,state:item.state,permanent:!!item.permanent});cursor.continue();};});
    for(const [id,item] of liveRows)if(item.row?.from_nick===owner&&item.state!=='sent'&&(!item.expiresAt||item.expiresAt>Date.now()))items.set(id,item);
    if(me?.nick!==owner)return null;
    const values=[...items.values()];return {queued:values.length,failed:values.filter(item=>item.state==='failed').length,permanent:values.filter(item=>item.permanent).length,sending:values.filter(item=>deliveries.has(item.clientId)).length,durable:!!database};
  }
  window.telechatDeliveryV72={retry:retryMessage,drain:drainOutbox,sendDirect,acknowledge,diagnostics};
})();
