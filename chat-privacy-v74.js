/* TELECHAT CHAT PRIVACY V74 — block users and silence direct chats. */
(()=>{
  'use strict';
  const BLOCK_PREFIX='__telechat_block_v74__:';
  const MUTE_PREFIX='__telechat_mute_v74__:';
  let blocked=new Map(),muted=new Set(),privacyChannel=null,syncTimer=0;
  const normalize=value=>String(value||'').trim().toLowerCase();
  const localKey=()=>`telechat-privacy-v74:${normalize(me?.nick)}`;
  const marker=(prefix,nick)=>prefix+normalize(nick);

  function loadLocal(){
    blocked=new Map();muted=new Set();if(!me?.nick)return;
    try{
      const data=JSON.parse(localStorage.getItem(localKey())||'{}');
      Object.entries(data.blocked||{}).forEach(([nick,ts])=>{if(normalize(nick))blocked.set(normalize(nick),Number(ts)||0);});
      (data.muted||[]).forEach(nick=>{if(normalize(nick))muted.add(normalize(nick));});
    }catch(error){}
  }
  function saveLocal(){
    if(!me?.nick)return;
    try{localStorage.setItem(localKey(),JSON.stringify({blocked:Object.fromEntries(blocked),muted:[...muted]}));}catch(error){}
  }
  const isBlocked=nick=>blocked.has(normalize(nick));
  const isMuted=nick=>muted.has(normalize(nick));
  const shouldSilence=nick=>isBlocked(nick)||isMuted(nick);
  function shouldHideMessage(message){
    if(!message||String(message.chat_key||'').startsWith('room_'))return false;
    const from=normalize(message.from_nick),since=blocked.get(from);
    return from!==normalize(me?.nick)&&since!==undefined&&Number(message.ts||0)>=Number(since||0);
  }

  async function syncFromServer(){
    if(!me?.nick)return;
    try{
      const [blockResult,muteResult]=await Promise.all([
        sb.from('typing').select('chat_key,ts').eq('nick',me.nick).like('chat_key',BLOCK_PREFIX+'%'),
        sb.from('typing').select('chat_key,ts').eq('nick',me.nick).like('chat_key',MUTE_PREFIX+'%')
      ]);
      if(!blockResult.error){
        blocked=new Map((blockResult.data||[]).map(row=>[normalize(String(row.chat_key).slice(BLOCK_PREFIX.length)),Number(row.ts)||0]).filter(([nick])=>nick));
      }
      if(!muteResult.error){
        muted=new Set((muteResult.data||[]).map(row=>normalize(String(row.chat_key).slice(MUTE_PREFIX.length))).filter(Boolean));
      }
      saveLocal();applyEverywhere();
    }catch(error){}
  }

  function ensureProfileUi(){
    const actions=document.querySelector('#user-profile-modal .user-profile-actions');if(!actions||document.getElementById('user-profile-privacy-v74'))return;
    const row=document.createElement('div');row.id='user-profile-privacy-v74';row.className='user-profile-privacy-v74';
    row.innerHTML='<button type="button" id="profile-mute-v74"><span aria-hidden="true">🔔</span><b>Без звука</b></button><button type="button" id="profile-block-v74" class="danger"><span aria-hidden="true">⊘</span><b>Заблокировать</b></button>';
    actions.parentNode.insertBefore(row,actions);
    row.querySelector('#profile-mute-v74').onclick=()=>toggleMuted(viewedProfileNickV5);
    row.querySelector('#profile-block-v74').onclick=()=>toggleBlocked(viewedProfileNickV5);
  }

  function applyHeader(){
    const avatar=document.getElementById('chat-av'),status=document.getElementById('chat-status-text');
    const active=!!currentChat&&!currentRoom&&isBlocked(currentChat);
    avatar?.classList.toggle('v74-blocked-avatar',active);
    if(active&&status){status.className='chat-status-text offline v74-blocked-status';status.textContent='был давно';status.querySelector('.device-presence-v72')?.remove();avatar?.classList.remove('av-online');}
  }
  function applyProfile(){
    ensureProfileUi();const nick=normalize(viewedProfileNickV5),self=nick&&nick===normalize(me?.nick);
    const row=document.getElementById('user-profile-privacy-v74');if(row)row.hidden=!nick||self;
    if(!nick||self)return;
    const blockOn=isBlocked(nick),muteOn=isMuted(nick),avatar=document.getElementById('view-profile-avatar'),seen=document.getElementById('view-profile-seen');
    avatar?.classList.toggle('v74-blocked-avatar',blockOn);
    if(seen){
      if(blockOn){seen.textContent='был давно';seen.style.color='#ff7189';}
      else{
        const user=userCache[viewedProfileNickV5]||userCache[nick];
        if(user){const online=isOnline(user.last_seen);seen.textContent=online?'● сейчас в сети':formatLastSeen(user.last_seen);seen.style.color=online?'var(--green)':'var(--text3)';}
      }
    }
    const muteButton=document.getElementById('profile-mute-v74'),blockButton=document.getElementById('profile-block-v74'),messageButton=document.getElementById('view-profile-message-btn');
    muteButton?.classList.toggle('active',muteOn);if(muteButton)muteButton.querySelector('span').textContent=muteOn?'🔕':'🔔';if(muteButton)muteButton.querySelector('b').textContent=muteOn?'Звук выключен':'Без звука';
    blockButton?.classList.toggle('active',blockOn);if(blockButton)blockButton.querySelector('b').textContent=blockOn?'Разблокировать':'Заблокировать';
    if(messageButton){messageButton.disabled=blockOn;messageButton.textContent=blockOn?'Заблокирован':'Написать';}
  }
  function decorateContacts(){
    document.querySelectorAll('.contact[data-contact-nick]').forEach(contact=>{
      const nick=normalize(contact.dataset.contactNick),blockOn=isBlocked(nick),muteOn=isMuted(nick);
      contact.classList.toggle('v74-blocked-contact',blockOn);contact.classList.toggle('v74-muted-contact',muteOn&&!blockOn);
      const avatar=contact.querySelector('.av');avatar?.classList.toggle('v74-blocked-avatar',blockOn);if(blockOn)avatar?.classList.remove('av-online');
    });
  }
  function applyEverywhere(){applyHeader();applyProfile();decorateContacts();window.telechatChatSpeedV51?.repaintActive?.();}

  async function setPreference(kind,nick,enabled){
    const target=normalize(nick);if(!target||target===normalize(me?.nick))return false;
    const prefix=kind==='block'?BLOCK_PREFIX:MUTE_PREFIX,key=marker(prefix,target),ts=Date.now();
    const result=enabled
      ?await sb.from('typing').upsert({chat_key:key,nick:me.nick,ts})
      :await sb.from('typing').delete().eq('chat_key',key).eq('nick',me.nick);
    if(result.error){showToast('Не удалось сохранить настройку');return false;}
    if(kind==='block'){if(enabled)blocked.set(target,ts);else blocked.delete(target);}else{if(enabled)muted.add(target);else muted.delete(target);}
    saveLocal();applyEverywhere();renderContacts();return true;
  }
  async function toggleBlocked(nick){
    const target=normalize(nick),next=!isBlocked(target);
    if(next&&!confirm(`Заблокировать @${target}? Его новые сообщения, звонки и уведомления будут скрыты.`))return;
    if(await setPreference('block',target,next)){
      if(next)showToast('Пользователь заблокирован ⛔');
      else{
        showToast('Пользователь разблокирован');
        if(normalize(viewedProfileNickV5)===target)previousProfile(target).then(applyProfile).catch(()=>{});
        updateStatusBar();
      }
    }
  }
  async function toggleMuted(nick){
    const target=normalize(nick),next=!isMuted(target);
    if(await setPreference('mute',target,next))showToast(next?'Звук сообщений выключен 🔕':'Звук сообщений включён 🔔');
  }

  function startRealtime(){
    if(privacyChannel)sb.removeChannel(privacyChannel);if(!me?.nick)return;
    privacyChannel=sb.channel('privacy-v74-'+me.nick+'-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table:'typing',filter:'nick=eq.'+me.nick},payload=>{
      const key=String(payload.new?.chat_key||payload.old?.chat_key||'');if(!key.startsWith(BLOCK_PREFIX)&&!key.startsWith(MUTE_PREFIX))return;
      clearTimeout(syncTimer);syncTimer=setTimeout(syncFromServer,120);
    }).subscribe();
  }

  const previousProfile=openUserProfile;
  openUserProfile=async function(nick){const result=await previousProfile(nick);applyProfile();return result;};
  const previousOpenChat=openChat;
  openChat=async function(nick){const result=await previousOpenChat(nick);applyHeader();return result;};
  const previousStatus=updateStatusBar;
  updateStatusBar=async function(){const result=await previousStatus();applyHeader();return result;};
  if(typeof refreshTypingIndicatorV5==='function'){
    const previousTypingRefresh=refreshTypingIndicatorV5;
    refreshTypingIndicatorV5=async function(...args){if(currentChat&&isBlocked(currentChat)){applyHeader();return;}const result=await previousTypingRefresh(...args);applyHeader();return result;};
  }
  const previousSendTyping=sendTyping;
  sendTyping=async function(...args){if(currentChat&&isBlocked(currentChat))return;return previousSendTyping(...args);};
  const previousSend=sendMsg;
  sendMsg=async function(...args){if(currentChat&&!currentRoom&&isBlocked(currentChat)){showToast('Сначала разблокируй пользователя');return;}return previousSend(...args);};
  const previousContacts=renderContacts;
  renderContacts=async function(...args){const result=await previousContacts(...args);decorateContacts();return result;};
  const previousLogin=doLogin;
  doLogin=async function(...args){const result=await previousLogin(...args);if(me){loadLocal();applyEverywhere();startRealtime();syncFromServer();}return result;};

  window.telechatIsBlockedV74=isBlocked;
  window.telechatShouldSilenceV74=shouldSilence;
  window.telechatShouldHideMessageV74=shouldHideMessage;
  window.telechatPrivacyV74={isBlocked,isMuted,toggleBlocked,toggleMuted,sync:syncFromServer};
  ensureProfileUi();if(me){loadLocal();applyEverywhere();startRealtime();syncFromServer();}
})();
