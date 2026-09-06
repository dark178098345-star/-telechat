/* TELECHAT CHAT RELIABILITY V72 — optimistic delivery, durable outbox and safe retry. */
(()=>{
  'use strict';
  const DB='telechat-outbox-v72',STORE='items';
  let databasePromise=null,lastTimestamp=0,draining=false,optimisticQueue=Promise.resolve();
  const liveRows=new Map(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const errorText=error=>String(error?.message||error||'').trim();

  function friendlyError(error){
    const message=errorText(error);
    if(/Аккаунт заблокирован/i.test(message))return 'Твой аккаунт заблокирован — отправка недоступна';
    if(/мут/i.test(message))return 'У тебя мут — отправка сообщений временно недоступна';
    if(/Пользователь не найден/i.test(message))return 'Профиль отправителя не найден в базе';
    if(/permission|row.level|policy|denied/i.test(message))return 'База отклонила сообщение — проверь доступ';
    return message?'Не удалось отправить: '+message.slice(0,110):'Нет сети — сообщение сохранено';
  }
  const canRetry=error=>!/Аккаунт заблокирован|мут|Пользователь не найден|permission|row.level|policy|denied/i.test(errorText(error));

  async function messageExists(row){
    const result=await sb.from('messages').select('*').eq('chat_key',row.chat_key).eq('from_nick',row.from_nick).eq('ts',row.ts).limit(1).maybeSingle();
    return !result.error&&result.data?result.data:null;
  }
  async function persistMessage(row){
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const result=await sb.from('messages').insert(row).select('*').single();
      if(!result.error)return {ok:true,row:result.data||row};
      lastError=result.error;
      const existing=await messageExists(row);
      if(existing)return {ok:true,row:existing};
      if(attempt===0&&canRetry(lastError))await wait(360);else break;
    }
    return {ok:false,error:lastError};
  }

  function nextTimestamp(){const now=Date.now();lastTimestamp=Math.max(now,lastTimestamp+1);return lastTimestamp;}
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
    const database=await openDatabase();if(!database)return;
    await new Promise(resolve=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...item,element:undefined});tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;});
  }
  async function outboxDelete(clientId){
    const database=await openDatabase();if(!database)return;
    await new Promise(resolve=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(clientId);tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;});
  }
  async function outboxRead(){
    const database=await openDatabase();if(!database)return [];
    return new Promise(resolve=>{const request=database.transaction(STORE,'readonly').objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);});
  }

  function deliveryMarkup(state){
    if(state==='failed')return '<button class="v72-delivery v72-failed" type="button"><span>!</span> Повторить</button>';
    if(state==='sent')return '<span class="v72-delivery v72-sent">✓✓ Отправлено</span>';
    return '<span class="v72-delivery v72-sending"><i></i> Отправляется</span>';
  }
  function setDeliveryState(item,state){
    item.state=state;const element=item.element;if(!element?.isConnected)return;
    const holder=document.createElement('span');holder.innerHTML=deliveryMarkup(state);const next=holder.firstElementChild;
    const old=element.querySelector('.v72-delivery');if(old)old.replaceWith(next);else element.querySelector('.msg-meta')?.append(next);
    if(state==='failed')next.onclick=()=>retryMessage(item.clientId);
  }
  async function renderOptimistic(item){
    const box=document.getElementById('messages');box?.querySelector('.v51-empty-chat')?.remove();
    const before=box?.querySelectorAll('.msg').length||0;await appendMessage({...item.row,id:''});
    const rows=box?.querySelectorAll('.msg')||[],element=rows.length>before?rows[rows.length-1]:null;if(!element)return;
    item.element=element;element.dataset.clientId=item.clientId;element.classList.add('v72-pending-message');element.querySelector('.msg-check')?.remove();
    element.querySelector('.msg-meta')?.insertAdjacentHTML('beforeend',deliveryMarkup('sending'));liveRows.set(item.clientId,item);
  }
  async function deliver(item,{silent=false}={}){
    setDeliveryState(item,'sending');await outboxWrite(item);
    const saved=await persistMessage(item.row);
    if(!saved.ok){setDeliveryState(item,'failed');await outboxWrite({...item,state:'failed'});if(!silent)showToast(friendlyError(saved.error));return false;}
    await outboxDelete(item.clientId);setDeliveryState(item,'sent');item.element?.classList.remove('v72-pending-message');
    window.telechatChatSpeedV51?.acceptSent?.(saved.row||item.row);renderContacts();if(!silent)playSendSound();
    setTimeout(()=>{const status=item.element?.querySelector('.v72-delivery');if(status){status.textContent='✓✓';status.className='msg-check';}liveRows.delete(item.clientId);},1800);
    return true;
  }
  async function retryMessage(clientId){
    let item=liveRows.get(clientId);if(!item)item=(await outboxRead()).find(row=>row.clientId===clientId);if(!item)return;
    if(!item.element&&item.row.chat_key===conversationKey())await renderOptimistic(item);await deliver(item);
  }
  const isMine=item=>String(item?.row?.from_nick||'').toLowerCase()===String(me?.nick||'').toLowerCase();
  async function drainOutbox(){
    if(draining||!me||navigator.onLine===false)return;draining=true;
    try{for(const item of (await outboxRead()).filter(isMine).sort((a,b)=>a.row.ts-b.row.ts)){if(!item.element&&item.row.chat_key===conversationKey())await renderOptimistic(item);await deliver(item,{silent:true});}}
    finally{draining=false;}
  }

  sendMsg=async function(){
    const input=document.getElementById('msg-input'),caption=input.value.trim(),key=conversationKey();
    if(!key||(!caption&&!pendingMedia))return;if(!canWriteCurrent()){showToast('Писать в канал может только владелец');return;}
    const media=pendingMedia,reply=replyTo,text=media?packMedia(media.kind,media.data,caption,media.duration):caption;
    const clientId=crypto.randomUUID?.()||('m-'+Date.now()+'-'+Math.random().toString(16).slice(2));
    const item={clientId,state:'sending',createdAt:Date.now(),row:{chat_key:key,from_nick:me.nick,text,ts:nextTimestamp(),reply_text:reply?reply.text:null,read_by:[],deleted:false}};
    input.value='';input.style.height='';cancelReply();cancelPendingMedia();
    try{sb.from('typing').delete().eq('chat_key',key).eq('nick',me.nick).then(()=>{});}catch(error){}
    optimisticQueue=optimisticQueue.then(()=>renderOptimistic(item)).catch(()=>{});
    await optimisticQueue;renderContacts();deliver(item).catch(error=>{setDeliveryState(item,'failed');outboxWrite({...item,state:'failed'});showToast(friendlyError(error));});
  };
  const previousLogin=doLogin;
  doLogin=async function(){const result=await previousLogin();if(me)setTimeout(drainOutbox,250);return result;};
  window.addEventListener('online',()=>setTimeout(drainOutbox,200));
  window.telechatPersistMessageV24=persistMessage;
  window.telechatDeliveryV72={retry:retryMessage,drain:drainOutbox};
})();
