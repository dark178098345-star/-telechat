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
  const sidebarUserFreshV18=new Map();
  async function batchUsersV15(nicks,force=false){
    const unique=[...new Set((nicks||[]).map(nick=>String(nick||'').toLowerCase()).filter(Boolean))];
    const missing=unique.filter(nick=>!userCache[nick]||(force&&Date.now()-(sidebarUserFreshV18.get(nick)||0)>60000));
    for(let start=0;start<missing.length;start+=100){
      const part=missing.slice(start,start+100);
      let result=await sb.from('users').select(USER_FIELDS_V15).in('nick',part);
      if(result.error)result=await sb.from('users').select('nick,name,av,status,last_seen').in('nick',part);
      if(result.error)throw result.error;
      (result.data||[]).forEach(user=>{userCache[user.nick]={...(userCache[user.nick]||{}),...user};sidebarUserFreshV18.set(user.nick,Date.now());});
    }
    return unique.map(nick=>userCache[nick]).filter(Boolean);
  }
  window.batchUsersV15=batchUsersV15;

  const renderContactsFallbackV17=renderContacts;
  let contactsInFlightV17=null,contactsQueuedV17=false;
  let sidebarMessagesCacheV17=[],sidebarCacheReadyV17=false,sidebarCacheUpdatedAtV17=0,sidebarLocalPaintCreditsV25=0;
  const sidebarPendingPatchesV51=new Map();
  const SIDEBAR_SNAPSHOT_TTL_V18=7*24*60*60*1000;
  const SIDEBAR_NETWORK_TTL_V18=15000;
  const loadMyRoomsNetworkV18=loadMyRooms;
  const roomMembershipChangeNetworkV18=handleRoomMembershipChangeV4;
  let sidebarSnapshotHydratedForV18='',sidebarRefreshTimerV18=null,sidebarSnapshotTimerV18=null;
  let roomsInFlightV18=null,roomsFreshAtV18=0;

  function privatePeerFromKeyV18(key){
    if(!me||typeof key!=='string'||key.startsWith('room_'))return '';
    const ownAtStart=me.nick+'_',ownAtEnd='_'+me.nick;
    if(key.startsWith(ownAtStart))return key.slice(ownAtStart.length);
    if(key.endsWith(ownAtEnd))return key.slice(0,-ownAtEnd.length);
    return '';
  }

  function compactSidebarMessageV18(message){
    let preview='';
    try{preview=messagePreviewText(message?.text||'');}catch(error){preview=String(message?.text||'');}
    return{id:message?.id,chat_key:String(message?.chat_key||''),from_nick:String(message?.from_nick||''),ts:Number(message?.ts)||0,text:String(preview||'').slice(0,180)};
  }

  function sidebarSnapshotKeyV18(){return me?.nick?'telechat.sidebar.v18.'+me.nick:'';}

  function saveSidebarSnapshotV18(){
    const key=sidebarSnapshotKeyV18();if(!key||!sidebarCacheReadyV17)return;
    try{
      const nicks=[...new Set(sidebarMessagesCacheV17.map(message=>privatePeerFromKeyV18(message.chat_key)).filter(Boolean))];
      const users={};
      nicks.forEach(nick=>{
        const user=userCache[nick];if(!user)return;
        let status='';try{status=unpackProfileData(user.status).status||'';}catch(error){status=String(user.status||'').slice(0,100);}
        users[nick]={nick:user.nick||nick,name:user.name||nick,av:Number(user.av)||0,status:String(status).slice(0,100),last_seen:Number(user.last_seen)||0,avatar_video:user.avatar_video||'',animated_profile:!!user.animated_profile};
      });
      const payload={version:18,at:Date.now(),rooms:(roomRows||[]).slice(0,100),messages:sidebarMessagesCacheV17.slice(0,180).map(compactSidebarMessageV18),users};
      localStorage.setItem(key,JSON.stringify(payload));
    }catch(error){}
  }

  function queueSidebarSnapshotV18(){
    clearTimeout(sidebarSnapshotTimerV18);sidebarSnapshotTimerV18=setTimeout(saveSidebarSnapshotV18,220);
  }

  function hydrateSidebarSnapshotV18(){
    if(!me||sidebarSnapshotHydratedForV18===me.nick)return sidebarCacheReadyV17;
    sidebarSnapshotHydratedForV18=me.nick;
    try{
      const raw=localStorage.getItem(sidebarSnapshotKeyV18());if(!raw)return false;
      const snapshot=JSON.parse(raw),age=Date.now()-Number(snapshot.at||0);
      if(snapshot.version!==18||age<0||age>SIDEBAR_SNAPSHOT_TTL_V18)return false;
      roomRows=Array.isArray(snapshot.rooms)?snapshot.rooms:[];roomsAvailable=true;
      Object.entries(snapshot.users||{}).forEach(([nick,user])=>{userCache[nick]={...(userCache[nick]||{}),...user};});
      sidebarMessagesCacheV17=(Array.isArray(snapshot.messages)?snapshot.messages:[]).map(compactSidebarMessageV18).filter(message=>message.chat_key);
      sidebarCacheReadyV17=true;sidebarCacheUpdatedAtV17=Number(snapshot.at)||0;return true;
    }catch(error){return false;}
  }

  loadMyRooms=async function(force=false){
    if(!force&&roomsFreshAtV18&&Date.now()-roomsFreshAtV18<SIDEBAR_NETWORK_TTL_V18)return roomRows;
    if(roomsInFlightV18)return roomsInFlightV18;
    roomsInFlightV18=Promise.resolve(loadMyRoomsNetworkV18()).then(rows=>{roomsFreshAtV18=Date.now();return rows;}).finally(()=>{roomsInFlightV18=null;});
    return roomsInFlightV18;
  };

  handleRoomMembershipChangeV4=async function(...args){
    roomsFreshAtV18=0;sidebarCacheUpdatedAtV17=0;
    return roomMembershipChangeNetworkV18(...args);
  };

  async function fetchSidebarMessagesV18(){
    const metaResult=await sb.from('messages').select('id,chat_key,from_nick,ts').eq('deleted',false).order('ts',{ascending:false}).limit(800);
    if(metaResult.error)throw metaResult.error;
    const latest=[],seen=new Set();
    for(const message of metaResult.data||[]){
      const key=String(message.chat_key||''),relevant=key.startsWith('room_')||!!privatePeerFromKeyV18(key);
      if(!relevant||seen.has(key)||message.id==null)continue;
      seen.add(key);latest.push(message);if(latest.length>=180)break;
    }
    const textById=new Map();
    for(let start=0;start<latest.length;start+=80){
      const ids=latest.slice(start,start+80).map(message=>message.id);
      const textResult=await sb.from('messages').select('id,text').in('id',ids);
      if(textResult.error)throw textResult.error;
      (textResult.data||[]).forEach(message=>textById.set(String(message.id),message.text));
    }
    return latest.map(message=>compactSidebarMessageV18({...message,text:textById.get(String(message.id))||''}));
  }

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
        element.dataset.chatKey='room_'+room.id;
        element.dataset.chatKind='room';
        element.dataset.roomId=String(room.id);
        element.dataset.originalName=room.name||'Пространство';
        element.onclick=()=>openRoom(room);fragment.appendChild(element);rendered++;
      }
    }
    if(sidebarFilter==='all'){
      if(chats.length){const title=document.createElement('div');title.className='list-section-title';title.textContent='Личные чаты';fragment.appendChild(title);}
      for(const chat of chats){
        const user=userCache[chat.nick];if(!user)continue;
        const online=isOnline(user.last_seen),element=document.createElement('div');element.className='contact'+(currentChat===chat.nick&&!currentRoom?' active':'');
        element.innerHTML='<div class="av'+(online?' av-online':'')+'">'+avatarMarkup(user)+'</div><div class="contact-info"><div class="contact-name">'+escHtml(user.name)+'</div><div class="contact-last">'+escHtml(messagePreviewText(chat.last).substring(0,38))+'</div></div><div class="contact-time">'+formatMsgTime(chat.ts)+'</div>';
        element.dataset.chatKey=chatKey(me.nick,chat.nick);
        element.dataset.chatKind='private';
        element.dataset.nick=chat.nick;
        element.dataset.originalName=user.name||chat.nick;
        element.onclick=()=>openChat(chat.nick);fragment.appendChild(element);rendered++;
      }
    }
    if(!rendered){
      const empty=document.createElement('div'),setup=!roomsAvailable?'<br><span style="color:#fbbf24">Сначала выполни файл supabase-groups.sql</span>':'';
      empty.style.cssText='padding:22px 14px;font-size:13px;color:var(--text3);line-height:1.55';
      empty.innerHTML=(sidebarFilter==='all'?'Найди друга или создай первое пространство':'Здесь пока пусто')+setup;fragment.appendChild(empty);
    }
    list.classList.add('tab-swap-v17');list.replaceChildren(fragment);requestAnimationFrame(()=>list.classList.remove('tab-swap-v17'));
    if(typeof window.telechatApplySidebarCustomV52==='function')window.telechatApplySidebarCustomV52();
    if(typeof enhanceVerifiedBadges==='function')enhanceVerifiedBadges();
    return true;
  }

  function applySidebarMessageV25(message){
    if(!sidebarCacheReadyV17||!message?.chat_key)return false;
    const compact=compactSidebarMessageV18(message);
    sidebarMessagesCacheV17=[compact,...sidebarMessagesCacheV17.filter(item=>{
      if(compact.id&&item.id)return String(item.id)!==String(compact.id);
      return !(item.chat_key===compact.chat_key&&item.from_nick===compact.from_nick&&Number(item.ts)===Number(compact.ts));
    })].sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).slice(0,180);
    sidebarCacheUpdatedAtV17=Date.now();sidebarLocalPaintCreditsV25++;
    sidebarPendingPatchesV51.set(compact.chat_key,compact);
    queueSidebarSnapshotV18();return true;
  }
  window.telechatApplySidebarMessageV25=applySidebarMessageV25;

  function sidebarPrivateNicksV18(messages){
    return[...new Set((messages||[]).map(message=>privatePeerFromKeyV18(message.chat_key)).filter(Boolean))];
  }

  async function renderContactsNowV17(){
    try{
      const list=document.getElementById('contacts-list');if(!list||!me)return;
      const [,messages]=await Promise.all([loadMyRooms(),fetchSidebarMessagesV18()]);
      sidebarMessagesCacheV17=messages;sidebarCacheReadyV17=true;sidebarCacheUpdatedAtV17=Date.now();
      await batchUsersV15(sidebarPrivateNicksV18(messages),true);
      await paintSidebarV17(sidebarMessagesCacheV17);saveSidebarSnapshotV18();
    }catch(error){return renderContactsFallbackV17();}
  }

  function requestSidebarRefreshV18(){
    if(contactsInFlightV17){contactsQueuedV17=true;return contactsInFlightV17;}
    contactsInFlightV17=renderContactsNowV17().finally(()=>{
      contactsInFlightV17=null;
      if(contactsQueuedV17){contactsQueuedV17=false;setTimeout(requestSidebarRefreshV18,0);}
    });
    return contactsInFlightV17;
  }

  renderContacts=async function(){
    hydrateSidebarSnapshotV18();
    if(sidebarCacheReadyV17){
      if(sidebarLocalPaintCreditsV25>0&&sidebarPendingPatchesV51.size){
        const list=document.getElementById('contacts-list');let missing=false;
        for(const [key,message] of sidebarPendingPatchesV51){
          const row=[...(list?.querySelectorAll('.contact[data-chat-key]')||[])].find(element=>element.dataset.chatKey===key);
          if(!row){missing=true;continue;}
          const preview=row.querySelector('.contact-last'),time=row.querySelector('.contact-time');
          if(preview)preview.textContent=messagePreviewText(message.text).substring(0,38);
          if(time)time.textContent=formatMsgTime(message.ts);
          sidebarPendingPatchesV51.delete(key);
        }
        sidebarLocalPaintCreditsV25=0;
        if(!missing)return true;
      }
      sidebarLocalPaintCreditsV25=0;
      const painted=await paintSidebarV17(sidebarMessagesCacheV17);
      if(Date.now()-sidebarCacheUpdatedAtV17>SIDEBAR_NETWORK_TTL_V18&&!sidebarRefreshTimerV18){
        sidebarRefreshTimerV18=setTimeout(()=>{sidebarRefreshTimerV18=null;requestSidebarRefreshV18();},60);
      }
      return painted;
    }
    return requestSidebarRefreshV18();
  };

  async function renderSidebarCachedV17(){hydrateSidebarSnapshotV18();if(!sidebarCacheReadyV17)return false;return paintSidebarV17(sidebarMessagesCacheV17);}
  let tabRefreshTimerV17=null;
  setSidebarFilter=async function(filter,btn){
    sidebarFilter=['all','group','channel'].includes(filter)?filter:'all';
    document.querySelectorAll('.sidebar-tab').forEach(element=>element.classList.toggle('active',element.dataset.filter===sidebarFilter));
    const usedCache=await renderSidebarCachedV17();
    if(!usedCache)return requestSidebarRefreshV18();
    if(Date.now()-sidebarCacheUpdatedAtV17>SIDEBAR_NETWORK_TTL_V18){clearTimeout(tabRefreshTimerV17);tabRefreshTimerV17=setTimeout(requestSidebarRefreshV18,120);}
  };
  window.renderSidebarCachedV17=renderSidebarCachedV17;
  window.telechatSidebarCacheInfoV17=()=>({ready:sidebarCacheReadyV17,age:sidebarCacheReadyV17?Date.now()-sidebarCacheUpdatedAtV17:null,messages:sidebarMessagesCacheV17.length,snapshot:sidebarSnapshotHydratedForV18===me?.nick});
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
