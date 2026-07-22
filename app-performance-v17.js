/* TELECHAT APP PERFORMANCE V17 — INSTANT SIDEBAR TABS */
(()=>{
  const css=document.createElement('style');css.textContent=`
  html,body,body *{-webkit-user-select:none;user-select:none}
  input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text}
  .chat-photo{background:rgba(124,110,247,.06)}
  .contacts-list.tab-swap-v17{contain:layout paint}
  body.telechat-app-paused *,body.telechat-app-paused *::before,body.telechat-app-paused *::after{animation-play-state:paused!important}
  @media (prefers-reduced-motion:reduce){.emoji-bg::before,.emoji-bg::after,.emoji-particle{animation:none!important}}`;
  document.head.appendChild(css);

  const USER_FIELDS_V15='nick,name,av,status,last_seen,avatar_video,animated_profile';
  async function batchUsersV15(nicks){
    const unique=[...new Set((nicks||[]).map(nick=>String(nick||'').toLowerCase()).filter(Boolean))];
    const missing=unique.filter(nick=>!userCache[nick]);
    for(let start=0;start<missing.length;start+=100){
      const part=missing.slice(start,start+100);
      let result=await sb.from('users').select(USER_FIELDS_V15).in('nick',part);
      if(result.error)result=await sb.from('users').select('nick,name,av,status,last_seen').in('nick',part);
      if(result.error)throw result.error;
      (result.data||[]).forEach(user=>{userCache[user.nick]={...(userCache[user.nick]||{}),...user};});
    }
    return unique.map(nick=>userCache[nick]).filter(Boolean);
  }
  window.batchUsersV15=batchUsersV15;

  const renderContactsFallbackV17=renderContacts;
  let contactsInFlightV17=null,contactsQueuedV17=false;
  let sidebarMessagesCacheV17=[],sidebarCacheReadyV17=false,sidebarCacheUpdatedAtV17=0,sidebarLocalPaintCreditsV25=0;

  function collectPrivateChatsV17(allMsgs){
    const seen=new Set(),chats=[];
    if(sidebarFilter!=='all')return chats;
    for(const message of allMsgs){
      if(!message.chat_key||message.chat_key.startsWith('room_')||!message.chat_key.includes(me.nick))continue;
      const ownAtStart=me.nick+'_',ownAtEnd='_'+me.nick;
      const other=message.chat_key.startsWith(ownAtStart)?message.chat_key.slice(ownAtStart.length):message.chat_key.endsWith(ownAtEnd)?message.chat_key.slice(0,-ownAtEnd.length):'';
      if(other&&!seen.has(other)){seen.add(other);chats.push({nick:other,last:message.text,ts:message.ts});}
    }
    return chats;
  }

  async function paintSidebarV17(allMsgs){
    const list=document.getElementById('contacts-list');
    if(!list||!me)return false;
    const roomLast={};
    for(const message of allMsgs){if(message.chat_key&&message.chat_key.startsWith('room_')&&!roomLast[message.chat_key])roomLast[message.chat_key]=message;}
    const visibleRooms=roomRows.filter(room=>sidebarFilter==='all'||room.type===sidebarFilter);
    const chats=collectPrivateChatsV17(allMsgs);
    if(chats.length)await batchUsersV15(chats.map(chat=>chat.nick));

    const fragment=document.createDocumentFragment();let rendered=0;
    if(visibleRooms.length){
      const title=document.createElement('div');title.className='list-section-title';title.textContent=sidebarFilter==='channel'?'Каналы':sidebarFilter==='group'?'Группы':'Пространства';fragment.appendChild(title);
      for(const room of visibleRooms){
        const last=roomLast['room_'+room.id],element=document.createElement('div');
        element.className='contact'+(currentRoom&&String(currentRoom.id)===String(room.id)?' active':'');
        element.innerHTML='<div class="room-avatar">'+escHtml(room.icon||'🌌')+'</div><div class="contact-info"><div class="contact-name">'+escHtml(room.name)+'<span class="room-type-badge">'+(room.type==='channel'?'канал':'группа')+'</span>'+roomVisibilityBadge(room)+(room.owner_nick===me.nick?'<span class="room-owner-star">★</span>':'')+'</div><div class="contact-last">'+(last?escHtml(messagePreviewText(last.text).substring(0,38)):escHtml(room.description||'Пока без сообщений'))+'</div></div><div class="contact-time">'+(last?formatMsgTime(last.ts):'')+'</div>';
        element.onclick=()=>openRoom(room);fragment.appendChild(element);rendered++;
      }
    }
    if(sidebarFilter==='all'){
      if(chats.length){const title=document.createElement('div');title.className='list-section-title';title.textContent='Личные чаты';fragment.appendChild(title);}
      for(const chat of chats){
        const user=userCache[chat.nick];if(!user)continue;
        const online=isOnline(user.last_seen),element=document.createElement('div');element.className='contact'+(currentChat===chat.nick&&!currentRoom?' active':'');
        element.innerHTML='<div class="av'+(online?' av-online':'')+'">'+avatarMarkup(user)+'</div><div class="contact-info"><div class="contact-name">'+escHtml(user.name)+'</div><div class="contact-last">'+escHtml(messagePreviewText(chat.last).substring(0,38))+'</div></div><div class="contact-time">'+formatMsgTime(chat.ts)+'</div>';
        element.onclick=()=>openChat(chat.nick);fragment.appendChild(element);rendered++;
      }
    }
    if(!rendered){
      const empty=document.createElement('div'),setup=!roomsAvailable?'<br><span style="color:#fbbf24">Сначала выполни файл supabase-groups.sql</span>':'';
      empty.style.cssText='padding:22px 14px;font-size:13px;color:var(--text3);line-height:1.55';
      empty.innerHTML=(sidebarFilter==='all'?'Найди друга или создай первое пространство':'Здесь пока пусто')+setup;fragment.appendChild(empty);
    }
    list.classList.add('tab-swap-v17');list.replaceChildren(fragment);requestAnimationFrame(()=>list.classList.remove('tab-swap-v17'));
    if(typeof enhanceVerifiedBadges==='function')enhanceVerifiedBadges();
    return true;
  }

  function applySidebarMessageV25(message){
    if(!sidebarCacheReadyV17||!message?.chat_key)return false;
    sidebarMessagesCacheV17=[message,...sidebarMessagesCacheV17.filter(item=>{
      if(message.id&&item.id)return String(item.id)!==String(message.id);
      return !(item.chat_key===message.chat_key&&item.from_nick===message.from_nick&&Number(item.ts)===Number(message.ts));
    })].sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).slice(0,500);
    sidebarCacheUpdatedAtV17=Date.now();sidebarLocalPaintCreditsV25++;return true;
  }
  window.telechatApplySidebarMessageV25=applySidebarMessageV25;
  async function renderContactsNowV17(){
    try{
      const list=document.getElementById('contacts-list');if(!list||!me)return;
      const messagesPromise=sb.from('messages').select('chat_key,text,ts').eq('deleted',false).order('ts',{ascending:false}).limit(500);
      const [,messageResult]=await Promise.all([loadMyRooms(),messagesPromise]);
      if(messageResult.error)throw messageResult.error;
      sidebarMessagesCacheV17=messageResult.data||[];sidebarCacheReadyV17=true;sidebarCacheUpdatedAtV17=Date.now();
      await paintSidebarV17(sidebarMessagesCacheV17);
    }catch(error){return renderContactsFallbackV17();}
  }

  renderContacts=async function(){
    if(sidebarLocalPaintCreditsV25>0&&sidebarCacheReadyV17){sidebarLocalPaintCreditsV25--;return paintSidebarV17(sidebarMessagesCacheV17);}
    if(contactsInFlightV17){contactsQueuedV17=true;return contactsInFlightV17;}
    contactsInFlightV17=renderContactsNowV17().finally(()=>{contactsInFlightV17=null;if(contactsQueuedV17){contactsQueuedV17=false;requestAnimationFrame(()=>renderContacts());}});
    return contactsInFlightV17;
  };

  async function renderSidebarCachedV17(){if(!sidebarCacheReadyV17)return false;return paintSidebarV17(sidebarMessagesCacheV17);}
  let tabRefreshTimerV17=null;
  setSidebarFilter=async function(filter,btn){
    sidebarFilter=['all','group','channel'].includes(filter)?filter:'all';
    document.querySelectorAll('.sidebar-tab').forEach(element=>element.classList.toggle('active',element.dataset.filter===sidebarFilter));
    const usedCache=await renderSidebarCachedV17();
    if(!usedCache)return renderContacts();
    if(Date.now()-sidebarCacheUpdatedAtV17>30000){clearTimeout(tabRefreshTimerV17);tabRefreshTimerV17=setTimeout(()=>renderContacts(),220);}
  };
  window.renderSidebarCachedV17=renderSidebarCachedV17;
  window.telechatSidebarCacheInfoV17=()=>({ready:sidebarCacheReadyV17,age:sidebarCacheReadyV17?Date.now()-sidebarCacheUpdatedAtV17:null,messages:sidebarMessagesCacheV17.length});
  const renderMessagesFallbackV15=renderMessages;
  let messageRequestV15=0;
  renderMessages=async function(){
    const key=conversationKey();if(!key)return;
    const request=++messageRequestV15;
    try{
      const [messageResult,pollResult]=await Promise.all([
        sb.from('messages').select('*').eq('chat_key',key).order('ts',{ascending:true}),
        sb.from('polls').select('*').eq('chat_key',key).order('ts',{ascending:true})
      ]);
      if(messageResult.error||pollResult.error)throw messageResult.error||pollResult.error;
      await batchUsersV15((messageResult.data||[]).map(message=>message.from_nick));
      if(request!==messageRequestV15||key!==conversationKey())return;
      const box=document.getElementById('messages');box.innerHTML='';lastRenderedDate='';
      const all=[...(messageResult.data||[]).map(message=>({...message,_type:'msg'})),...(pollResult.data||[]).map(poll=>({...poll,_type:'poll'}))].sort((a,b)=>a.ts-b.ts);
      if(!all.length){box.innerHTML='<div style="text-align:center;padding:30px;font-size:13px;color:var(--text3)">Начни первым! 👋</div>';return;}
      for(const item of all){
        if(request!==messageRequestV15||key!==conversationKey())return;
        if(item._type==='poll')renderPoll(item,box);else await appendMessage(item,false);
      }
      if(request===messageRequestV15)scrollToBottom();
    }catch(error){
      if(request===messageRequestV15)return renderMessagesFallbackV15();
    }
  };

  const appendMessageBeforeV25=appendMessage;
  appendMessage=async function(message,doScroll=true){
    const value=await appendMessageBeforeV25(message,doScroll);
    if(doScroll&&message?.chat_key)applySidebarMessageV25(message);
    return value;
  };
  const renderMessageContentBeforeV15=renderMessageContent;
  renderMessageContent=function(text){
    return renderMessageContentBeforeV15(text).replace('<img class="chat-photo"','<img class="chat-photo" loading="lazy" decoding="async"');
  };

  const updateOnlineBeforeV15=updateOnline;
  updateOnline=async function(...args){if(document.hidden||!me)return;return updateOnlineBeforeV15(...args);};
  const updateStatusBarBeforeV15=updateStatusBar;
  updateStatusBar=async function(...args){if(document.hidden)return;return updateStatusBarBeforeV15(...args);};

  function syncVisibilityV15(){
    document.body.classList.toggle('telechat-app-paused',document.hidden);
    document.querySelectorAll('video').forEach(video=>{
      if(document.hidden){if(!video.paused){video.dataset.resumeV15='1';video.pause();}}
      else if(video.dataset.resumeV15==='1'){delete video.dataset.resumeV15;video.play().catch(()=>{});}
    });
    if(!document.hidden&&me){updateOnline();updateStatusBar();}
  }
  document.addEventListener('visibilitychange',syncVisibilityV15,{passive:true});
  syncVisibilityV15();
})();
