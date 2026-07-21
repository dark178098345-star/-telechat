/* TELECHAT CHAT RELIABILITY V24 — confirmed delivery, useful errors, safe retry */
(()=>{
  let messageSendingV24=false;
  const waitV24=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const errorMessageV24=error=>String(error?.message||error||'').trim();

  function friendlySendErrorV24(error){
    const message=errorMessageV24(error);
    if(/Аккаунт заблокирован/i.test(message))return 'Твой аккаунт заблокирован — отправка недоступна';
    if(/мут/i.test(message))return 'У тебя мут — отправка сообщений временно недоступна';
    if(/Пользователь не найден/i.test(message))return 'Профиль отправителя не найден в базе';
    if(/has no field|record.+new/i.test(message))return 'Нужно выполнить исправление сообщений V24 в Supabase';
    if(/permission|row.level|policy|denied/i.test(message))return 'База отклонила сообщение — проверь SQL V24';
    return message?'Не удалось отправить: '+message.slice(0,110):'Не удалось отправить сообщение';
  }

  function shouldRetryV24(error){
    const message=errorMessageV24(error);
    return !/Аккаунт заблокирован|мут|Пользователь не найден|has no field|record.+new|permission|row.level|policy|denied/i.test(message);
  }

  async function messageExistsV24(row){
    const result=await sb.from('messages').select('id').eq('chat_key',row.chat_key).eq('from_nick',row.from_nick).eq('ts',row.ts).limit(1);
    return !result.error&&result.data?.length>0;
  }

  async function persistMessageV24(row){
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const result=await sb.from('messages').insert(row);
      if(!result.error)return {ok:true};
      lastError=result.error;
      if(await messageExistsV24(row))return {ok:true};
      if(attempt===0&&shouldRetryV24(lastError))await waitV24(320);else break;
    }
    return {ok:false,error:lastError};
  }

  sendMsg=async function(){
    if(messageSendingV24)return;
    const input=document.getElementById('msg-input'),caption=input.value.trim(),key=conversationKey();
    if(!key||(!caption&&!pendingMedia))return;
    if(!canWriteCurrent()){showToast('Писать в канал может только владелец');return;}
    const media=pendingMedia,reply=replyTo,text=media?packMedia(media.kind,media.data,caption,media.duration):caption;
    const row={chat_key:key,from_nick:me.nick,text,ts:Date.now(),reply_text:reply?reply.text:null,read_by:[],deleted:false};
    const button=document.querySelector('.send-btn'),oldButtonHtml=button?.innerHTML||'';
    messageSendingV24=true;
    if(button){button.disabled=true;button.classList.add('is-sending');button.innerHTML='<span class="send-spinner-v24"></span>';}
    try{
      try{await sb.from('typing').delete().eq('chat_key',key).eq('nick',me.nick);}catch(error){}
      const saved=await persistMessageV24(row);
      if(!saved.ok){showToast(friendlySendErrorV24(saved.error));return;}
      input.value='';input.style.height='';cancelReply();cancelPendingMedia();
      await appendMessage(row);renderContacts();playSendSound();
    }catch(error){showToast(friendlySendErrorV24(error));}
    finally{
      messageSendingV24=false;
      if(button){button.disabled=false;button.classList.remove('is-sending');button.innerHTML=oldButtonHtml;}
    }
  };

  window.telechatPersistMessageV24=persistMessageV24;
})();
