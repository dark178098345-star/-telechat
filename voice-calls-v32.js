// TELECHAT GROUP VOICE CALLS V32 - up to 6 participants
(()=>{
  'use strict';

  const CALL_PREFIX='__telechat_call_v1__:';
  const MAX_PARTICIPANTS=6;
  const MEMBER_ACTIVE=new Set(['invited','joined']);
  const MEMBER_FINAL=new Set(['rejected','left','missed']);
  const PeerConnectionV55=window.RTCPeerConnection||window.webkitRTCPeerConnection;
  const RTC_CONFIG={
    iceServers:[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'},
      {urls:'stun:stun2.l.google.com:19302'},
      {urls:'stun:stun3.l.google.com:19302'},
      {
        urls:[
          'turn:turn.evan-brass.net:3478',
          'turn:turn.evan-brass.net:3478?transport=tcp',
          'turns:turn.evan-brass.net:443?transport=tcp'
        ],
        username:'user',
        credential:'password'
      },
      ...(Array.isArray(window.TELECHAT_ICE_SERVERS)?window.TELECHAT_ICE_SERVERS:[])
    ],
    iceCandidatePoolSize:4,
    bundlePolicy:'max-bundle'
  };

  let callState=null,incomingInvite=null,lastPersonalPeer='';
  let inboxRealtime=null,activeRealtime=null,initializedFor='',inboxPollTimer=null,inboxPollBusy=false;
  let ringTimer=null,ringContext=null,ringStep=0,callTimer=null,callPollTimer=null,noAnswerTimer=null;
  let meterContext=null,meterFrame=0,meterSources=[];
  let renderToken=0;

  const byId=id=>document.getElementById(id);
  const nowV32=()=>Date.now();
  const safeNickV32=value=>{
    const nick=String(value||'').trim();
    return /^[a-z0-9_]{3,20}$/i.test(nick)?nick:'';
  };
  const sameNickV32=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
  const shouldCreateOfferV49=remoteNick=>{
    const local=String(me?.nick||'').trim().toLowerCase();
    const remote=String(remoteNick||'').trim().toLowerCase();
    return !!local&&!!remote&&local!==remote&&local<remote;
  };
  const callErrorV32=error=>String(error?.message||error||'').trim();
  const formatCallTimeV32=seconds=>{
    const value=Math.max(0,Math.floor(Number(seconds)||0));
    return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');
  };
  const callDurationV32=state=>state?.startedAt?Math.max(0,Math.floor((nowV32()-state.startedAt)/1000)):0;
  const memberDomIdV32=nick=>'call-member-'+String(nick||'user').replace(/[^a-z0-9_-]/gi,'-');
  const displayStateV32=()=>callState||incomingInvite?.view||null;

  function ensureCallUiV32(){
    let button=byId('voice-call-btn');
    if(!button){
      const actions=document.querySelector('.chat-header-actions');
      if(actions){
        button=document.createElement('button');
        button.className='hdr-btn';button.id='voice-call-btn';button.type='button';button.hidden=true;
        button.title='Голосовой звонок';button.setAttribute('aria-label','Начать голосовой звонок');button.textContent='☎';
        button.onclick=()=>callState?restoreCallV32():startCallV32();
        actions.insertBefore(button,actions.firstChild);
      }
    }
    if(!byId('voice-call-overlay')){
      document.body.insertAdjacentHTML('beforeend',`
        <div class="voice-call-overlay" id="voice-call-overlay" data-mode="calling" role="dialog" aria-modal="true" aria-label="Голосовой звонок">
          <section class="voice-call-surface">
            <header class="voice-call-topbar">
              <button class="voice-call-minimize" id="call-minimize-btn" type="button" onclick="minimizeCallV32()" aria-label="Свернуть звонок">⌄</button>
              <div>
                <div class="voice-call-brand">tele<span>.chat</span></div>
                <div class="voice-call-status" id="voice-call-status">Соединяем…</div>
              </div>
              <div class="voice-call-top-actions">
                <button class="voice-call-add-top" id="call-add-top-btn" type="button" onclick="openInvitePanelV32()" aria-label="&#1044;&#1086;&#1073;&#1072;&#1074;&#1080;&#1090;&#1100; &#1091;&#1095;&#1072;&#1089;&#1090;&#1085;&#1080;&#1082;&#1072;"><span aria-hidden="true">&#128100;&#65291;</span><b>&#1044;&#1086;&#1073;&#1072;&#1074;&#1080;&#1090;&#1100;</b></button>
                <div class="voice-call-count" id="voice-call-count">1 / ${MAX_PARTICIPANTS}</div>
              </div>
            </header>
            <div class="voice-call-stage">
              <div class="voice-call-parties" id="voice-call-parties"></div>
              <div class="voice-call-timer" id="voice-call-timer">0:00</div>
            </div>
            <div class="voice-call-controls">
              <div class="voice-call-control-wrap">
                <button class="voice-call-control" id="call-mic-btn" type="button" onclick="toggleCallMicV32()" aria-label="Выключить микрофон">🎙</button>
                <span class="voice-call-control-label" id="call-mic-label">Микрофон</span>
              </div>
              <div class="voice-call-control-wrap voice-call-add-legacy">
                <button class="voice-call-control add" id="call-add-btn" type="button" onclick="openInvitePanelV32()" aria-label="Добавить участника">👤<b>+</b></button>
                <span class="voice-call-control-label">Добавить</span>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control" id="call-mixer-btn" type="button" onclick="openCallMixerV32()" aria-label="Громкость участников">🔊</button>
                <span class="voice-call-control-label">Громкость</span>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control end" type="button" onclick="endCallV32()" aria-label="Выйти из звонка">☎</button>
                <span class="voice-call-control-label">Выйти</span>
              </div>
            </div>
            <div class="voice-call-incoming-actions">
              <div class="voice-call-control-wrap">
                <button class="voice-call-control end" type="button" onclick="rejectCallV32()" aria-label="Отклонить звонок">☎</button>
                <span class="voice-call-control-label">Отклонить</span>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control accept" type="button" onclick="acceptCallV32()" aria-label="Принять звонок">☎</button>
                <span class="voice-call-control-label">Принять</span>
              </div>
            </div>
            <div class="voice-call-sheet-backdrop" id="call-sheet-backdrop" onclick="closeCallSheetsV32()"></div>
            <section class="voice-call-sheet" id="call-invite-sheet" aria-label="Добавить участника">
              <div class="voice-call-sheet-handle"></div>
              <header class="voice-call-sheet-head">
                <div><strong>Добавить в звонок</strong><span id="call-invite-caption">Личные чаты</span></div>
                <button type="button" onclick="closeCallSheetsV32()" aria-label="Закрыть">×</button>
              </header>
              <label class="voice-call-contact-search">🔎<input id="call-contact-search" type="search" placeholder="Найти по нику…" autocomplete="off"></label>
              <div class="voice-call-contact-list" id="call-contact-list"></div>
            </section>
            <section class="voice-call-sheet compact" id="call-mixer-sheet" aria-label="Громкость участников">
              <div class="voice-call-sheet-handle"></div>
              <header class="voice-call-sheet-head">
                <div><strong>Громкость</strong><span>Настрой каждого отдельно</span></div>
                <button type="button" onclick="closeCallSheetsV32()" aria-label="Закрыть">×</button>
              </header>
              <div class="voice-call-mixer-list" id="call-mixer-list"></div>
            </section>
            <div class="voice-call-audio-rack" id="voice-call-audio-rack"></div>
          </section>
        </div>
        <aside class="voice-call-mini" id="voice-call-mini" aria-label="Активный звонок">
          <div class="voice-call-mini-avatars" id="voice-call-mini-avatars"></div>
          <div class="voice-call-mini-copy" onclick="restoreCallV32()">
            <div class="voice-call-mini-name" id="voice-call-mini-name">Активный звонок</div>
            <div class="voice-call-mini-time" id="voice-call-mini-time">0:00</div>
          </div>
          <button class="voice-call-mini-return" type="button" onclick="restoreCallV32()" aria-label="Вернуться в звонок">↗</button>
          <button class="voice-call-mini-end" type="button" onclick="endCallV32()" aria-label="Выйти из звонка">☎</button>
        </aside>`);
      byId('call-contact-search').addEventListener('input',event=>renderInviteContactsV32(event.target.value));
    }
    updateCallButtonV32();
  }

  function callUnavailableV32(){
    if(!PeerConnectionV55||!navigator.mediaDevices?.getUserMedia){
      showToast('Голосовые звонки не поддерживаются этим браузером');return true;
    }
    if(!window.isSecureContext){
      showToast('Для звонков открой tele.chat по защищённой ссылке HTTPS');return true;
    }
    return false;
  }

  async function requestMicrophoneV32(){
    unlockCallAudioV55();
    try{
      return await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false
      });
    }catch(firstError){
      const firstName=String(firstError?.name||'');
      if(!/NotAllowedError|SecurityError|NotFoundError/i.test(firstName)){
        try{return await navigator.mediaDevices.getUserMedia({audio:true,video:false});}
        catch(error){throwMicrophoneErrorV55(error);}
      }
      throwMicrophoneErrorV55(firstError);
    }
  }

  function throwMicrophoneErrorV55(error){
    const name=String(error?.name||'');
    if(/NotAllowedError|SecurityError/i.test(name))showToast('Разреши микрофон в настройках сайта или приложения');
    else if(/NotFoundError/i.test(name))showToast('Телефон не нашёл доступный микрофон');
    else if(/NotReadableError|AbortError/i.test(name))showToast('Микрофон занят другим приложением — закрой его и повтори');
    else showToast('Не удалось включить микрофон — попробуй открыть tele.chat в Chrome или Safari');
    throw error;
  }

  function unlockCallAudioV55(){
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(AudioContextClass){
        ringContext=ringContext||new AudioContextClass();
        if(ringContext.state==='suspended')ringContext.resume().catch(()=>{});
        const oscillator=ringContext.createOscillator(),gain=ringContext.createGain();
        gain.gain.value=.0001;oscillator.connect(gain);gain.connect(ringContext.destination);
        oscillator.start();oscillator.stop(ringContext.currentTime+.025);
      }
      document.querySelectorAll('#voice-call-audio-rack audio').forEach(audio=>audio.play().catch(()=>{}));
    }catch(error){}
  }

  function armCallAudioResumeV55(){
    const overlay=byId('voice-call-overlay');
    if(!overlay||overlay.dataset.audioResumeV55==='1')return;
    overlay.dataset.audioResumeV55='1';
    const resume=()=>{
      unlockCallAudioV55();
      delete overlay.dataset.audioResumeV55;
    };
    overlay.addEventListener('pointerdown',resume,{once:true,capture:true});
    overlay.addEventListener('touchend',resume,{once:true,capture:true,passive:true});
  }

  function updateCallButtonV32(){
    const button=byId('voice-call-btn');if(!button)return;
    const peer=safeNickV32(currentChat||lastPersonalPeer);
    button.hidden=!(peer&&me&&!sameNickV32(peer,me.nick)&&(!currentRoom||!!currentChat));
    button.classList.toggle('active',!!callState);
    button.title=callState?'Вернуться в звонок':'Голосовой звонок';
  }

  function setAvatarV32(element,user){
    if(!element)return;
    try{element.innerHTML=avatarMarkup(user||{av:0,status:''});}
    catch(error){element.textContent='👤';}
  }


  async function hydrateMembersV32(state,rows){
    if(!state)return;
    state.members=state.members||new Map();
    const next=new Map();
    for(const row of rows||[]){
      const nick=safeNickV32(row.nick);if(!nick)continue;
      const previous=state.members.get(nick)||{};
      let user=previous.user;
      if(!user){
        try{user=await getUser(nick);}catch(error){}
      }
      next.set(nick,{...previous,...row,nick,user:user||{nick,name:nick,av:0,status:''}});
    }
    state.members=next;
    state.maxParticipantCount=Math.max(state.maxParticipantCount||1,[...next.values()].filter(item=>item.status==='joined').length);
  }

  async function refreshMembersV32(state=displayStateV32()){
    if(!state?.id||state.preview)return renderCallPeopleV32(state);
    const {data,error}=await sb.from('telechat_group_call_members').select('*').eq('call_id',state.id).order('invited_at',{ascending:true});
    if(error)return;
    await hydrateMembersV32(state,data||[]);
    await renderCallPeopleV32(state);
  }

  async function renderCallPeopleV32(state=displayStateV32()){
    if(!state)return;
    const token=++renderToken;
    const all=[...(state.members?.values()||[])].filter(item=>MEMBER_ACTIVE.has(item.status));
    if(!all.some(item=>sameNickV32(item.nick,me?.nick))&&me){
      all.unshift({nick:me.nick,status:state===callState?'joined':'invited',user:me});
    }
    all.sort((a,b)=>{
      if(sameNickV32(a.nick,me?.nick))return -1;
      if(sameNickV32(b.nick,me?.nick))return 1;
      if(a.status!==b.status)return a.status==='joined'?-1:1;
      return Number(a.invited_at||0)-Number(b.invited_at||0);
    });
    for(const item of all){
      if(!item.user){
        try{item.user=await getUser(item.nick);}catch(error){}
        item.user=item.user||{nick:item.nick,name:item.nick,av:0,status:''};
      }
    }
    if(token!==renderToken)return;
    const box=byId('voice-call-parties');if(!box)return;
    const visible=all.slice(0,MAX_PARTICIPANTS);
    box.dataset.count=String(visible.length);
    box.classList.toggle('two-person',visible.length===2);
    box.classList.toggle('group-call',visible.length>2);
    const overlay=byId('voice-call-overlay');
    if(overlay){overlay.dataset.people=String(visible.length);overlay.dataset.group=visible.length>2?'true':'false';}
    box.innerHTML='';
    visible.forEach((item,index)=>{
      const person=document.createElement('article');
      const isLocal=sameNickV32(item.nick,me?.nick);
      person.className='voice-call-person'+(isLocal?' local':'')+(item.status==='invited'?' pending':'');
      person.id=memberDomIdV32(item.nick);
      person.dataset.nick=item.nick;
      const avatar=document.createElement('div');avatar.className='voice-call-avatar';
      setAvatarV32(avatar,item.user);
      const name=document.createElement('div');name.className='voice-call-person-name';name.textContent=item.user?.name||item.nick;
      const hint=document.createElement('div');hint.className='voice-call-person-hint';
      hint.textContent=isLocal?'ты':item.status==='invited'?'ожидаем ответа':'в звонке';
      person.append(avatar,name,hint);
      box.appendChild(person);
      if(visible.length===2&&index===0){
        const connector=document.createElement('div');connector.className='voice-call-connector';
        connector.setAttribute('aria-label','Соединение');
        connector.innerHTML='<i class="voice-call-connector-dot"></i><i class="voice-call-connector-dot"></i><i class="voice-call-connector-dot"></i>';
        box.appendChild(connector);
      }
    });
    const joined=visible.filter(item=>item.status==='joined').length;
    byId('voice-call-count').textContent=Math.max(1,joined)+'\u0020\u0432\u0020\u0437\u0432\u043e\u043d\u043a\u0435';
    const remoteJoined=visible.filter(item=>item.status==='joined'&&!sameNickV32(item.nick,me?.nick));
    byId('call-mixer-btn').disabled=!remoteJoined.length;
    renderMiniCallV32(visible);
    renderCallMixerV32();
  }

  function renderMiniCallV32(items){
    const joined=items.filter(item=>item.status==='joined');
    const remotes=joined.filter(item=>!sameNickV32(item.nick,me?.nick));
    const avatarBox=byId('voice-call-mini-avatars');if(!avatarBox)return;
    avatarBox.innerHTML='';
    (remotes.length?remotes:items.filter(item=>!sameNickV32(item.nick,me?.nick))).slice(0,3).forEach(item=>{
      const el=document.createElement('div');el.className='voice-call-mini-avatar';setAvatarV32(el,item.user);avatarBox.appendChild(el);
    });
    const total=Math.max(1,joined.length);
    byId('voice-call-mini-name').textContent=total>2?'Групповой звонок · '+total:(remotes[0]?'Звонок с '+(remotes[0].user?.name||'@'+remotes[0].nick):'Активный звонок');
  }

  function renderCallMixerV32(){
    const box=byId('call-mixer-list');if(!box)return;
    const state=callState;
    const rows=state?[...(state.members?.values()||[])].filter(item=>item.status==='joined'&&!sameNickV32(item.nick,me?.nick)):[];
    if(!rows.length){
      box.innerHTML='<div class="voice-call-sheet-empty">Участники появятся после подключения</div>';return;
    }
    box.innerHTML='';
    rows.forEach(item=>{
      const value=Math.round((state.volumes?.get(item.nick)??1)*100);
      const row=document.createElement('div');row.className='voice-call-mixer-row';
      const avatar=document.createElement('div');avatar.className='voice-call-contact-avatar';setAvatarV32(avatar,item.user);
      const copy=document.createElement('div');copy.className='voice-call-mixer-copy';
      const title=document.createElement('div');title.innerHTML='<strong>'+escHtml(item.user?.name||item.nick)+'</strong><span id="call-volume-value-'+item.nick+'">'+value+'%</span>';
      const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=String(value);
      range.setAttribute('aria-label','Громкость '+(item.user?.name||item.nick));
      range.addEventListener('input',()=>setMemberVolumeV32(item.nick,Number(range.value)));
      copy.append(title,range);row.append(avatar,copy);box.appendChild(row);
    });
  }

  function setMemberVolumeV32(nick,value){
    if(!callState)return;
    const normalized=Math.max(0,Math.min(100,Number(value)||0));
    callState.volumes=callState.volumes||new Map();
    callState.volumes.set(nick,normalized/100);
    const peer=callState.peers?.get(nick);
    if(peer?.audio)peer.audio.volume=normalized/100;
    const label=byId('call-volume-value-'+nick);if(label)label.textContent=normalized+'%';
  }

  async function loadCallContactsV32(){
    const [{data:users},{data:messages}]=await Promise.all([
      sb.from('users').select('*').order('last_seen',{ascending:false}),
      sb.from('messages').select('chat_key,from_nick,ts').eq('deleted',false).order('ts',{ascending:false}).limit(800)
    ]);
    const messageKeys=new Set((messages||[]).filter(row=>row.chat_key&&!row.chat_key.startsWith('room_')).map(row=>row.chat_key));
    const contacts=[];
    for(const user of users||[]){
      if(!user?.nick||sameNickV32(user.nick,me?.nick))continue;
      const hasChat=messageKeys.has(chatKey(me.nick,user.nick))||sameNickV32(user.nick,currentChat)||sameNickV32(user.nick,lastPersonalPeer);
      if(hasChat)contacts.push(user);
    }
    return contacts;
  }

  async function openInvitePanelV32(){
    if(!callState||callState.preview)return;
    const active=[...(callState.members?.values()||[])].filter(item=>MEMBER_ACTIVE.has(item.status)).length;
    if(active>=MAX_PARTICIPANTS){showToast('В звонке уже максимум 6 человек');return;}
    closeCallSheetsV32();
    byId('call-sheet-backdrop').classList.add('show');byId('call-invite-sheet').classList.add('show');
    byId('call-contact-search').value='';
    byId('call-contact-list').innerHTML='<div class="voice-call-sheet-loading"><i></i><span>Загружаем контакты…</span></div>';
    byId('call-invite-caption').textContent=active+' из '+MAX_PARTICIPANTS+' мест занято';
    try{
      callState.contactCache=await loadCallContactsV32();
      renderInviteContactsV32('');
    }catch(error){
      byId('call-contact-list').innerHTML='<div class="voice-call-sheet-empty">Не удалось загрузить личные чаты</div>';
    }
  }

  function renderInviteContactsV32(query=''){
    const box=byId('call-contact-list');if(!box||!callState)return;
    const needle=String(query||'').trim().toLowerCase();
    const contacts=(callState.contactCache||[]).filter(user=>!needle||String(user.nick||'').toLowerCase().includes(needle)||String(user.name||'').toLowerCase().includes(needle));
    if(!contacts.length){
      box.innerHTML='<div class="voice-call-sheet-empty">'+(needle?'Никого не нашли':'Сначала начни личный чат с человеком')+'</div>';return;
    }
    box.innerHTML='';
    contacts.forEach(user=>{
      const member=callState.members?.get(user.nick)||[...(callState.members?.values()||[])].find(item=>sameNickV32(item.nick,user.nick));
      const active=member&&MEMBER_ACTIVE.has(member.status);
      const row=document.createElement('div');row.className='voice-call-contact';
      const avatar=document.createElement('div');avatar.className='voice-call-contact-avatar';setAvatarV32(avatar,user);
      const copy=document.createElement('div');copy.className='voice-call-contact-copy';
      const online=typeof isOnline==='function'&&isOnline(user.last_seen);
      copy.innerHTML='<strong>'+escHtml(user.name||user.nick)+'</strong><span>@'+escHtml(user.nick)+(online?' · в сети':'')+'</span>';
      const button=document.createElement('button');button.type='button';button.disabled=!!active;
      button.textContent=active?(member.status==='joined'?'В звонке':'Приглашён'):'Добавить';
      button.onclick=()=>inviteMemberV32(user.nick,button);
      row.append(avatar,copy,button);box.appendChild(row);
    });
  }

  async function inviteMemberV32(nick,button){
    if(!callState||!safeNickV32(nick))return;
    const active=[...(callState.members?.values()||[])].filter(item=>MEMBER_ACTIVE.has(item.status)).length;
    if(active>=MAX_PARTICIPANTS){showToast('В звонке уже максимум 6 человек');return;}
    button.disabled=true;button.textContent='Зовём…';
    const row={call_id:callState.id,nick,invited_by:me.nick,status:'invited',invited_at:nowV32(),joined_at:null,left_at:null};
    const {error}=await sb.from('telechat_group_call_members').upsert(row,{onConflict:'call_id,nick'});
    if(error){
      button.disabled=false;button.textContent='Добавить';
      showToast(/telechat_group_call_members|relation|schema cache/i.test(callErrorV32(error))?'Сначала выполни SQL групповых звонков V32':'Не удалось отправить приглашение');
      return;
    }
    callState.members.set(nick,{...row,user:(callState.contactCache||[]).find(user=>sameNickV32(user.nick,nick))});
    button.textContent='Приглашён';await renderCallPeopleV32(callState);
    byId('call-invite-caption').textContent=Math.min(MAX_PARTICIPANTS,active+1)+' из '+MAX_PARTICIPANTS+' мест занято';
    setTimeout(()=>expireInviteV32(callState?.id,nick),35000);
  }

  async function expireInviteV32(callId,nick){
    if(!callId)return;
    const {data}=await sb.from('telechat_group_call_members').select('status').eq('call_id',callId).eq('nick',nick).maybeSingle();
    if(data?.status==='invited')await sb.from('telechat_group_call_members').update({status:'missed',left_at:nowV32()}).eq('call_id',callId).eq('nick',nick);
  }

  function openCallMixerV32(){
    if(!callState)return;
    closeCallSheetsV32();renderCallMixerV32();
    byId('call-sheet-backdrop').classList.add('show');byId('call-mixer-sheet').classList.add('show');
  }

  function closeCallSheetsV32(){
    byId('call-sheet-backdrop')?.classList.remove('show');
    byId('call-invite-sheet')?.classList.remove('show');
    byId('call-mixer-sheet')?.classList.remove('show');
  }

  async function showCallUiV32(mode,statusText,state=displayStateV32()){
    ensureCallUiV32();
    const overlay=byId('voice-call-overlay');overlay.dataset.mode=mode;overlay.classList.add('show');
    document.body.classList.add('voice-call-full-v32');byId('voice-call-mini').classList.remove('show');
    byId('voice-call-status').textContent=statusText||(mode==='incoming'?'Входящий групповой звонок':mode==='calling'?'Вызываем…':'Соединено');
    byId('voice-call-timer').textContent=mode==='active'?formatCallTimeV32(callDurationV32(state)):'0:00';
    byId('call-minimize-btn').style.display=mode==='incoming'||mode==='calling'?'none':'';
    closeCallSheetsV32();await renderCallPeopleV32(state);
  }

  function hideCallUiV32(){
    byId('voice-call-overlay')?.classList.remove('show');byId('voice-call-mini')?.classList.remove('show');
    document.body.classList.remove('voice-call-full-v32');closeCallSheetsV32();
  }

  function minimizeCallV32(){
    if(!callState||callState.status==='calling')return;
    byId('voice-call-overlay').classList.remove('show');byId('voice-call-mini').classList.add('show');
    document.body.classList.remove('voice-call-full-v32');closeCallSheetsV32();
  }

  function restoreCallV32(){
    if(!callState)return;
    byId('voice-call-mini').classList.remove('show');byId('voice-call-overlay').classList.add('show');
    document.body.classList.add('voice-call-full-v32');
  }


  async function subscribeActiveCallV32(state){
    if(activeRealtime)sb.removeChannel(activeRealtime);
    activeRealtime=sb.channel('group-call-v32-'+state.id+'-'+me.nick+'-'+nowV32())
      .on('postgres_changes',{event:'*',schema:'public',table:'telechat_group_call_members',filter:'call_id=eq.'+state.id},handleActiveMemberV32)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'telechat_group_call_signals',filter:'call_id=eq.'+state.id},handleSignalChangeV32)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'telechat_group_calls',filter:'id=eq.'+state.id},handleGroupCallChangeV32)
      .subscribe();
    clearInterval(callPollTimer);
    let pollStep=0;
    callPollTimer=setInterval(async()=>{
      if(callState!==state)return;
      await pollSignalsV32(state);
      if(++pollStep%2===0){
        await refreshMembersV32(state);
        const remoteJoined=[...(state.members?.values()||[])].some(item=>item.status==='joined'&&!sameNickV32(item.nick,me.nick));
        if(remoteJoined){
          stopRingtoneV32();clearTimeout(noAnswerTimer);noAnswerTimer=null;
          if(state.status==='calling'){
            state.status='active';await showCallUiV32('active','Соединяем участников…',state);
          }
          await connectToJoinedMembersV32(state);
        }
      }
    },2500);
  }

  async function sendSignalV32(state,toNick,kind,payload){
    if(!state?.id||!toNick||!kind)return;
    const {error}=await sb.from('telechat_group_call_signals').insert({
      call_id:state.id,from_nick:me.nick,to_nick:toNick,kind,payload,created_at:nowV32()
    });
    if(error)throw error;
  }

  function setCallNetworkStatusV42(text){
    const status=byId('voice-call-status');
    if(status)status.textContent=text;
  }

  function armPeerConnectionTimeoutV42(state,peer,delay=14000){
    if(!state||!peer||peer.connected||state.closing)return;
    clearTimeout(peer.connectTimer);
    peer.connectTimer=setTimeout(()=>recoverPeerConnectionV42(state,peer),delay);
  }

  async function recoverPeerConnectionV42(state,peer){
    if(callState!==state||!peer||peer.connected||state.closing)return;
    const pc=peer.pc;
    if(!pc||pc.connectionState==='closed')return;
    if(peer.retryCount<1){
      peer.retryCount++;
      setCallNetworkStatusV42('Переподключаем…');
      try{
        if(pc.signalingState==='have-local-offer')await pc.setLocalDescription({type:'rollback'});
        if(pc.signalingState==='stable'&&shouldCreateOfferV49(peer.nick)){
          const offer=await pc.createOffer({offerToReceiveAudio:true,iceRestart:true});
          await pc.setLocalDescription(offer);
          await sendSignalV32(state,peer.nick,'offer',pc.localDescription);
          armPeerConnectionTimeoutV42(state,peer,15000);
          return;
        }
      }catch(error){console.warn('tele.chat call reconnect',error);}
      armPeerConnectionTimeoutV42(state,peer,7000);
      return;
    }
    await failPeerConnectionV42(state,peer);
  }

  async function failPeerConnectionV42(state,peer){
    if(callState!==state||!peer||state.closing)return;
    clearTimeout(peer.connectTimer);
    const connectedOthers=[...(state.peers?.values()||[])].filter(item=>item!==peer&&item.connected);
    const remoteMembers=[...(state.members?.values()||[])].filter(item=>item.status==='joined'&&!sameNickV32(item.nick,me.nick));
    removePeerV32(state,peer.nick);
    if(remoteMembers.length>1||connectedOthers.length){
      setCallNetworkStatusV42('Не удалось подключить @'+peer.nick);
      showToast('Участник @'+peer.nick+' не подключился');
      return;
    }
    state.closing=true;
    setCallNetworkStatusV42('Прямое соединение недоступно');
    showToast('Не удалось соединить сети — для такого звонка нужен TURN');
    try{
      await Promise.allSettled([
        sb.from('telechat_group_call_members').update({status:'left',left_at:nowV32()}).eq('call_id',state.id).eq('nick',me.nick),
        sb.from('telechat_group_calls').update({status:'ended',ended_at:nowV32()}).eq('id',state.id)
      ]);
    }catch(error){}
    await finishCallV32('failed',false);
  }

  function createPeerV32(state,nick){
    const existing=state.peers.get(nick);if(existing)return existing;
    const pc=new PeerConnectionV55(RTC_CONFIG);
    const peer={nick,pc,pendingCandidates:[],remoteStream:null,audio:null,connected:false,disconnectTimer:null,connectTimer:null,retryCount:0,meterStarted:false};
    state.peers.set(nick,peer);
    for(const track of state.localStream?.getTracks?.()||[])pc.addTrack(track,state.localStream);
    pc.onicecandidate=event=>{
      if(!event.candidate)return;
      const candidate=event.candidate.toJSON?event.candidate.toJSON():event.candidate;
      sendSignalV32(state,nick,'candidate',candidate).catch(()=>{});
    };
    pc.ontrack=event=>{
      const stream=event.streams?.[0];
      if(stream)peer.remoteStream=stream;
      else{
        peer.remoteStream=peer.remoteStream||new MediaStream();
        try{peer.remoteStream.addTrack(event.track);}catch(error){}
      }
      attachPeerAudioV32(state,peer);
      if(!peer.meterStarted){
        peer.meterStarted=true;startSpeakingMeterV32(peer.remoteStream,memberDomIdV32(nick),nick);
      }
    };
    let lastPeerStateV55='';
    const handlePeerStateV55=()=>{
      const connection=String(pc.connectionState||'');
      const ice=String(pc.iceConnectionState||'');
      const status=(!connection||connection==='new'||connection==='connecting')&&ice?ice:connection;
      if(status===lastPeerStateV55)return;lastPeerStateV55=status;
      if(status==='connected'||status==='completed'){
        peer.connected=true;clearTimeout(peer.disconnectTimer);clearTimeout(peer.connectTimer);
        byId(memberDomIdV32(nick))?.classList.add('connected');
        ensureCallStartedV32(state);
        byId('voice-call-status').textContent=state.members.size>2?'Групповой звонок':'Соединено';
      }
      if(status==='failed'||status==='disconnected'){
        clearTimeout(peer.disconnectTimer);clearTimeout(peer.connectTimer);
        peer.disconnectTimer=setTimeout(()=>recoverPeerConnectionV42(state,peer),5500);
      }
      if(status==='closed')peer.connected=false;
    };
    pc.onconnectionstatechange=handlePeerStateV55;
    pc.oniceconnectionstatechange=handlePeerStateV55;
    return peer;
  }

  function attachPeerAudioV32(state,peer){
    let audio=byId('call-audio-'+peer.nick);
    if(!audio){
      audio=document.createElement('audio');audio.id='call-audio-'+peer.nick;
      audio.autoplay=true;audio.playsInline=true;audio.setAttribute('playsinline','');audio.muted=false;byId('voice-call-audio-rack').appendChild(audio);
    }
    audio.srcObject=peer.remoteStream;
    audio.volume=state.volumes?.get(peer.nick)??1;
    audio.play().catch(()=>armCallAudioResumeV55());
    peer.audio=audio;
  }

  function removePeerV32(state,nick){
    const peer=state?.peers?.get(nick);if(!peer)return;
    clearTimeout(peer.disconnectTimer);clearTimeout(peer.connectTimer);
    try{peer.pc.close();}catch(error){}
    if(peer.audio){peer.audio.pause();peer.audio.srcObject=null;peer.audio.remove();}
    removeSpeakingMeterV32(nick);state.peers.delete(nick);
    byId(memberDomIdV32(nick))?.classList.remove('connected','speaking');
  }

  async function createOfferV32(state,nick){
    if(!state||sameNickV32(nick,me.nick))return;
    const peer=createPeerV32(state,nick);
    if(peer.connected||peer.offerSent)return;
    if(peer.pc.signalingState!=='stable')return;
    const offer=await peer.pc.createOffer({offerToReceiveAudio:true});
    await peer.pc.setLocalDescription(offer);
    await sendSignalV32(state,nick,'offer',peer.pc.localDescription);
    peer.offerSent=true;
    armPeerConnectionTimeoutV42(state,peer);
  }

  async function flushPeerCandidatesV32(peer){
    if(!peer?.pc?.remoteDescription)return;
    const queued=peer.pendingCandidates.splice(0);
    for(const candidate of queued){
      try{await peer.pc.addIceCandidate(candidate);}catch(error){}
    }
  }

  async function handleSignalRowV32(row){
    const state=callState;
    if(!state||row.call_id!==state.id||!sameNickV32(row.to_nick,me.nick)||sameNickV32(row.from_nick,me.nick))return;
    state.processedSignals=state.processedSignals||new Set();
    if(state.processedSignals.has(row.id))return;
    state.processedSignals.add(row.id);state.lastSignalId=Math.max(state.lastSignalId||0,Number(row.id)||0);
    const from=safeNickV32(row.from_nick);if(!from)return;
    const peer=createPeerV32(state,from);
    try{
      if(row.kind==='offer'){
        if(peer.pc.signalingState==='have-local-offer'){
          try{await peer.pc.setLocalDescription({type:'rollback'});}catch(error){}
        }
        await peer.pc.setRemoteDescription(row.payload);
        await flushPeerCandidatesV32(peer);
        const answer=await peer.pc.createAnswer();await peer.pc.setLocalDescription(answer);
        await sendSignalV32(state,from,'answer',peer.pc.localDescription);
        armPeerConnectionTimeoutV42(state,peer);
      }else if(row.kind==='answer'){
        if(!peer.pc.currentRemoteDescription)await peer.pc.setRemoteDescription(row.payload);
        await flushPeerCandidatesV32(peer);
        armPeerConnectionTimeoutV42(state,peer);
      }else if(row.kind==='candidate'){
        if(peer.pc.remoteDescription){
          try{await peer.pc.addIceCandidate(row.payload);}catch(error){}
        }else peer.pendingCandidates.push(row.payload);
      }
    }catch(error){
      console.warn('tele.chat call signal',row.kind,error);
    }
  }

  async function handleSignalChangeV32(payload){
    if(payload?.new)await handleSignalRowV32(payload.new);
  }

  async function pollSignalsV32(state=callState){
    if(!state?.id)return;
    let query=sb.from('telechat_group_call_signals').select('*').eq('call_id',state.id).eq('to_nick',me.nick).order('id',{ascending:true}).limit(100);
    if(state.lastSignalId)query=query.gt('id',state.lastSignalId);
    const {data}=await query;
    for(const row of data||[])await handleSignalRowV32(row);
  }

  async function connectToJoinedMembersV32(state){
    const rows=[...(state.members?.values()||[])].filter(item=>item.status==='joined'&&!sameNickV32(item.nick,me.nick));
    for(const item of rows){
      if(!shouldCreateOfferV49(item.nick))continue;
      try{await createOfferV32(state,item.nick);}catch(error){}
    }
  }

  async function ensureCallStartedV32(state){
    if(!state)return;
    if(state.status==='calling'){
      state.status='active';
      const overlay=byId('voice-call-overlay');if(overlay)overlay.dataset.mode='active';
      if(byId('call-minimize-btn'))byId('call-minimize-btn').style.display='';
    }
    if(state.startedAt)return;
    state.startedAt=nowV32();startCallTimerV32();
    await sb.from('telechat_group_calls').update({started_at:state.startedAt}).eq('id',state.id).is('started_at',null);
  }

  function startCallTimerV32(){
    clearInterval(callTimer);
    const tick=()=>{
      if(!callState)return;
      const text=formatCallTimeV32(callDurationV32(callState));
      if(byId('voice-call-timer'))byId('voice-call-timer').textContent=text;
      if(byId('voice-call-mini-time'))byId('voice-call-mini-time').textContent=text+' · нажми, чтобы вернуться';
    };
    tick();callTimer=setInterval(tick,1000);
  }

  function startSpeakingMeterV32(stream,targetId,key){
    if(!stream||typeof MediaStream==='undefined'||!(stream instanceof MediaStream))return;
    removeSpeakingMeterV32(key);
    try{
      meterContext=meterContext||new (window.AudioContext||window.webkitAudioContext)();
      const analyser=meterContext.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.72;
      const source=meterContext.createMediaStreamSource(stream);source.connect(analyser);
      meterSources.push({key,source,analyser,data:new Uint8Array(analyser.fftSize),targetId});
      if(!meterFrame)measureSpeakingV32();
    }catch(error){}
  }

  function removeSpeakingMeterV32(key){
    const removed=meterSources.filter(item=>item.key===key);
    removed.forEach(item=>{try{item.source.disconnect();}catch(error){}});
    meterSources=meterSources.filter(item=>item.key!==key);
  }

  function measureSpeakingV32(){
    for(const meter of meterSources){
      meter.analyser.getByteTimeDomainData(meter.data);let sum=0;
      for(const sample of meter.data){const value=(sample-128)/128;sum+=value*value;}
      byId(meter.targetId)?.classList.toggle('speaking',Math.sqrt(sum/meter.data.length)>.045);
    }
    meterFrame=requestAnimationFrame(measureSpeakingV32);
  }

  function stopSpeakingMetersV32(){
    if(meterFrame)cancelAnimationFrame(meterFrame);meterFrame=0;
    meterSources.forEach(item=>{try{item.source.disconnect();}catch(error){}});
    meterSources=[];
    document.querySelectorAll('.voice-call-person.speaking').forEach(item=>item.classList.remove('speaking'));
    if(meterContext){meterContext.close().catch(()=>{});meterContext=null;}
  }

  function playRingToneV32(){
    if(typeof window.telechatPlaySoundV53==='function'){
      window.telechatPlaySoundV53('call');
      return;
    }
    try{
      ringContext=ringContext||new (window.AudioContext||window.webkitAudioContext)();
      if(ringContext.state==='suspended')ringContext.resume().catch(()=>{});
      const oscillator=ringContext.createOscillator(),gain=ringContext.createGain();
      oscillator.type='sine';oscillator.frequency.value=ringStep++%2?520:440;gain.gain.value=.0001;
      oscillator.connect(gain);gain.connect(ringContext.destination);oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.055,ringContext.currentTime+.02);
      gain.gain.exponentialRampToValueAtTime(.0001,ringContext.currentTime+.28);
      oscillator.stop(ringContext.currentTime+.3);
    }catch(error){}
  }

  function startRingtoneV32(){stopRingtoneV32();playRingToneV32();ringTimer=setInterval(playRingToneV32,1050);}
  function stopRingtoneV32(){clearInterval(ringTimer);ringTimer=null;}


  async function startCallV32(peerOverride){
    ensureCallUiV32();
    unlockCallAudioV55();
    if(callState){restoreCallV32();return;}
    if(incomingInvite){await showCallUiV32('incoming',incomingInvite.statusText,incomingInvite.view);return;}
    const peer=safeNickV32(peerOverride||currentChat||lastPersonalPeer);
    if(currentRoom&&!currentChat&&!peerOverride){showToast('Открой личный чат, чтобы позвонить');return;}
    if(!peer){showToast('Не удалось определить собеседника — открой чат ещё раз');return;}
    if(sameNickV32(peer,me?.nick)){showToast('Нельзя позвонить самому себе');return;}
    if(callUnavailableV32())return;
    let stream;
    try{stream=await requestMicrophoneV32();}catch(error){return;}
    const id=crypto.randomUUID(),created=nowV32();
    const state={
      id,role:'host',hostNick:me.nick,originPeer:peer,status:'calling',localStream:stream,
      startedAt:0,createdAt:created,closing:false,summarySaved:false,preview:false,
      peers:new Map(),members:new Map(),volumes:new Map(),processedSignals:new Set(),
      lastSignalId:0,maxParticipantCount:1
    };
    state.members.set(me.nick,{call_id:id,nick:me.nick,invited_by:me.nick,status:'joined',invited_at:created,joined_at:created,user:me});
    let peerUser;try{peerUser=await getUser(peer);}catch(error){}
    state.members.set(peer,{call_id:id,nick:peer,invited_by:me.nick,status:'invited',invited_at:created,user:peerUser||{nick:peer,name:peer,av:0,status:''}});
    callState=state;updateCallButtonV32();await showCallUiV32('calling','Вызываем…',state);startRingtoneV32();
    try{
      const callRow={id,host_nick:me.nick,origin_peer_nick:peer,status:'active',created_at:created,started_at:null,ended_at:null};
      const callResult=await sb.from('telechat_group_calls').insert(callRow);
      if(callResult.error)throw callResult.error;
      const membersResult=await sb.from('telechat_group_call_members').insert([
        {call_id:id,nick:me.nick,invited_by:me.nick,status:'joined',invited_at:created,joined_at:created,left_at:null},
        {call_id:id,nick:peer,invited_by:me.nick,status:'invited',invited_at:created,joined_at:null,left_at:null}
      ]);
      if(membersResult.error)throw membersResult.error;
      state.callRow=callRow;await subscribeActiveCallV32(state);
      startSpeakingMeterV32(stream,memberDomIdV32(me.nick),me.nick);
      noAnswerTimer=setTimeout(async()=>{
        if(callState!==state||state.status!=='calling')return;
        const latest=await sb.from('telechat_group_call_members').select('*').eq('call_id',state.id).order('invited_at',{ascending:true});
        if(callState!==state||state.status!=='calling')return;
        if(!latest.error)await hydrateMembersV32(state,latest.data||[]);
        const joined=[...(state.members?.values()||[])].filter(item=>item.status==='joined');
        if(joined.length<=1){
          await sb.from('telechat_group_call_members').update({status:'missed',left_at:nowV32()}).eq('call_id',state.id).eq('status','invited');
          await sb.from('telechat_group_calls').update({status:'ended',ended_at:nowV32()}).eq('id',state.id);
          await finishCallV32('missed',false);
        }else{
          state.status='active';stopRingtoneV32();
          await showCallUiV32('active','Соединяем участников…',state);
          await connectToJoinedMembersV32(state);await pollSignalsV32(state);
        }
      },45000);
    }catch(error){
      const message=callErrorV32(error);await cleanupCallV32();
      showToast(/telechat_group_calls|telechat_group_call_members|relation|schema cache|permission|policy/i.test(message)?'Сначала выполни SQL групповых звонков V32 в Supabase':'Не удалось начать звонок: '+message.slice(0,80));
    }
  }

  async function showIncomingCallV32(memberRow){
    if(!me||!sameNickV32(memberRow.nick,me.nick)||memberRow.status!=='invited')return;
    if(callState){
      if(callState.id!==memberRow.call_id)await sb.from('telechat_group_call_members').update({status:'rejected',left_at:nowV32()}).eq('call_id',memberRow.call_id).eq('nick',me.nick);
      return;
    }
    if(incomingInvite?.member?.call_id===memberRow.call_id)return;
    if(incomingInvite){
      await sb.from('telechat_group_call_members').update({status:'rejected',left_at:nowV32()}).eq('call_id',memberRow.call_id).eq('nick',me.nick);return;
    }
    if(nowV32()-Number(memberRow.invited_at||0)>60000){
      await sb.from('telechat_group_call_members').update({status:'missed',left_at:nowV32()}).eq('call_id',memberRow.call_id).eq('nick',me.nick);return;
    }
    const [{data:call},{data:members}]=await Promise.all([
      sb.from('telechat_group_calls').select('*').eq('id',memberRow.call_id).maybeSingle(),
      sb.from('telechat_group_call_members').select('*').eq('call_id',memberRow.call_id).order('invited_at',{ascending:true})
    ]);
    if(!call||call.status!=='active')return;
    const view={id:call.id,callRow:call,members:new Map(),peers:new Map(),volumes:new Map(),startedAt:Number(call.started_at)||0,preview:true};
    await hydrateMembersV32(view,members||[]);
    const host=[...view.members.values()].find(item=>sameNickV32(item.nick,call.host_nick));
    const joinedCount=[...view.members.values()].filter(item=>item.status==='joined').length;
    const hostName=host?.user?.name||'@'+call.host_nick;
    const statusText=joinedCount>1?hostName+' и ещё '+(joinedCount-1)+' участник'+(joinedCount-1===1?'':'а')+' звонят':hostName+' звонит';
    incomingInvite={member:memberRow,call,view,statusText};
    await showCallUiV32('incoming',statusText,view);startRingtoneV32();
    try{sendPushNotification('Входящий групповой звонок',statusText);}catch(error){}
  }

  async function acceptCallV32(){
    if(!incomingInvite||callState)return;
    unlockCallAudioV55();
    if(callUnavailableV32())return;
    stopRingtoneV32();
    let stream;
    try{stream=await requestMicrophoneV32();}catch(error){return;}
    const invite=incomingInvite;incomingInvite=null;
    const state={
      id:invite.call.id,callRow:invite.call,role:sameNickV32(invite.call.host_nick,me.nick)?'host':'member',
      hostNick:invite.call.host_nick,originPeer:invite.call.origin_peer_nick,status:'active',
      localStream:stream,startedAt:Number(invite.call.started_at)||nowV32(),createdAt:Number(invite.call.created_at)||nowV32(),
      closing:false,summarySaved:false,preview:false,peers:new Map(),members:new Map(),volumes:new Map(),
      processedSignals:new Set(),lastSignalId:0,maxParticipantCount:1
    };
    callState=state;await hydrateMembersV32(state,[...(invite.view.members.values())]);
    await subscribeActiveCallV32(state);
    const updatedAt=nowV32();
    const {error}=await sb.from('telechat_group_call_members').update({status:'joined',joined_at:updatedAt,left_at:null}).eq('call_id',state.id).eq('nick',me.nick);
    if(error){
      await cleanupCallV32();showToast('Не удалось подключиться к звонку');return;
    }
    const mine=state.members.get(me.nick)||state.members.get([...state.members.keys()].find(nick=>sameNickV32(nick,me.nick)));
    if(mine){mine.status='joined';mine.joined_at=updatedAt;mine.user=me;}
    await refreshMembersV32(state);
    await showCallUiV32('active','Соединяем участников…',state);
    startSpeakingMeterV32(stream,memberDomIdV32(me.nick),me.nick);
    startCallTimerV32();
    await connectToJoinedMembersV32(state);await pollSignalsV32(state);
  }

  async function rejectCallV32(){
    if(!incomingInvite)return;
    const invite=incomingInvite;incomingInvite=null;stopRingtoneV32();hideCallUiV32();
    await sb.from('telechat_group_call_members').update({status:'rejected',left_at:nowV32()}).eq('call_id',invite.member.call_id).eq('nick',me.nick);
  }

  async function handleInboxMemberV32(payload){
    const row=payload.new||payload.old;
    if(!row||!me||!sameNickV32(row.nick,me.nick))return;
    if(row.status==='invited'){await showIncomingCallV32(row);return;}
    if(incomingInvite?.member?.call_id===row.call_id&&row.status!=='invited'){
      incomingInvite=null;stopRingtoneV32();hideCallUiV32();
    }
  }

  async function handleActiveMemberV32(payload){
    const row=payload.new||payload.old,state=callState;
    if(!row||!state||row.call_id!==state.id)return;
    if(sameNickV32(row.nick,me.nick)&&MEMBER_FINAL.has(row.status)&&!state.closing){
      await finishCallV32('ended',true);return;
    }
    if(state.role==='host'&&state.status==='calling'&&MEMBER_FINAL.has(row.status)&&sameNickV32(row.nick,state.originPeer)){
      const waiting=[...state.members.values()].filter(item=>!sameNickV32(item.nick,me.nick)&&MEMBER_ACTIVE.has(item.status)&&!sameNickV32(item.nick,row.nick));
      if(!waiting.length){
        await sb.from('telechat_group_calls').update({status:'ended',ended_at:nowV32()}).eq('id',state.id);
        await finishCallV32(row.status==='rejected'?'rejected':'missed',true);return;
      }
    }
    if(MEMBER_FINAL.has(row.status)&&!sameNickV32(row.nick,me.nick))removePeerV32(state,row.nick);
    await refreshMembersV32(state);
    if(row.status==='joined'&&!sameNickV32(row.nick,me.nick)){
      stopRingtoneV32();
      clearTimeout(noAnswerTimer);noAnswerTimer=null;
      if(state.status==='calling'){
        state.status='active';await showCallUiV32('active','Соединяем участников…',state);
      }
    }
    if(row.status==='joined'&&!sameNickV32(row.nick,me.nick)&&shouldCreateOfferV49(row.nick)){
      try{await createOfferV32(state,row.nick);}catch(error){}
    }
  }

  async function handleGroupCallChangeV32(payload){
    const row=payload.new||payload.old;
    if(!row||!callState||row.id!==callState.id)return;
    callState.callRow=row;
    if(row.status!=='active'&&!callState.closing)await finishCallV32('ended',true);
  }

  async function endCallV32(){
    if(incomingInvite){await rejectCallV32();return;}
    if(!callState)return;
    if(callState.preview){await cleanupCallV32();return;}
    const state=callState;if(state.closing)return;state.closing=true;
    await sb.from('telechat_group_call_members').update({status:'left',left_at:nowV32()}).eq('call_id',state.id).eq('nick',me.nick);
    const {data:remaining}=await sb.from('telechat_group_call_members').select('nick').eq('call_id',state.id).eq('status','joined');
    if((remaining||[]).length<=1){
      await sb.from('telechat_group_calls').update({status:'ended',ended_at:nowV32()}).eq('id',state.id);
    }
    await finishCallV32('ended',false);
  }

  async function finishCallV32(status,remote){
    const state=callState;if(!state||state.finishing)return;
    state.finishing=true;
    const duration=callDurationV32(state);
    if(state.role==='host'&&!state.preview&&!state.summarySaved){
      state.summarySaved=true;await saveCallSummaryV32(state,status,duration);
    }
    await cleanupCallV32();
    const toast=status==='rejected'?'Звонок отклонён':status==='missed'?'Нет ответа':status==='failed'?'Соединение прервано':'';
    if(toast)showToast(toast);
    if(currentChat&&sameNickV32(currentChat,state.originPeer)&&!currentRoom)await renderMessages();
    renderContacts();
  }

  async function cleanupCallV32(){
    clearInterval(callTimer);callTimer=null;clearInterval(callPollTimer);callPollTimer=null;
    clearTimeout(noAnswerTimer);noAnswerTimer=null;stopRingtoneV32();stopSpeakingMetersV32();
    if(activeRealtime){sb.removeChannel(activeRealtime);activeRealtime=null;}
    const state=callState;callState=null;
    if(state){
      for(const nick of [...(state.peers?.keys()||[])])removePeerV32(state,nick);
      try{state.localStream?.getTracks().forEach(track=>track.stop());}catch(error){}
    }
    byId('voice-call-audio-rack')?.replaceChildren();
    incomingInvite=null;byId('call-mic-btn')?.classList.remove('muted');
    if(byId('call-mic-label'))byId('call-mic-label').textContent='Микрофон';
    hideCallUiV32();updateCallButtonV32();
  }

  function toggleCallMicV32(){
    if(!callState?.localStream)return;
    const tracks=callState.localStream.getAudioTracks?.()||callState.localStream.getTracks();
    const muted=tracks.some(track=>track.enabled===false);
    tracks.forEach(track=>track.enabled=muted);
    byId('call-mic-btn').classList.toggle('muted',!muted);
    byId('call-mic-label').textContent=!muted?'Выключен':'Микрофон';
  }


  async function checkPendingInviteV56(){
    if(!me||callState||incomingInvite||inboxPollBusy)return;
    inboxPollBusy=true;
    try{
      const pending=await sb.from('telechat_group_call_members').select('*').eq('nick',me.nick).eq('status','invited').order('invited_at',{ascending:false}).limit(1);
      if(!pending.error&&pending.data?.[0])await showIncomingCallV32(pending.data[0]);
    }catch(error){}finally{inboxPollBusy=false;}
  }

  async function initCallsV32(){
    if(!me)return;ensureCallUiV32();
    if(initializedFor===me.nick)return;initializedFor=me.nick;
    if(inboxRealtime)sb.removeChannel(inboxRealtime);
    clearInterval(inboxPollTimer);inboxPollTimer=null;
    inboxRealtime=sb.channel('group-call-inbox-v32-'+me.nick+'-'+nowV32())
      .on('postgres_changes',{event:'*',schema:'public',table:'telechat_group_call_members',filter:'nick=eq.'+me.nick},handleInboxMemberV32)
      .subscribe();
    await checkPendingInviteV56();
    inboxPollTimer=setInterval(checkPendingInviteV56,2200);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkPendingInviteV56();});
  }

  function unpackCallV32(text){
    if(typeof text!=='string'||!text.startsWith(CALL_PREFIX))return null;
    try{
      const data=JSON.parse(text.slice(CALL_PREFIX.length));
      return data&&data.v===1?data:null;
    }catch(error){return null;}
  }

  function packCallV32(data){return CALL_PREFIX+JSON.stringify({...data,v:1});}

  function callStatusTextV32(data){
    if(data.status==='ended')return data.duration?'Завершён · '+formatCallTimeV32(data.duration):'Завершён';
    if(data.status==='missed')return 'Без ответа';
    if(data.status==='rejected')return 'Отклонён';
    if(data.status==='cancelled')return 'Отменён';
    if(data.status==='busy')return 'Собеседник занят';
    return 'Соединение прервано';
  }

  function renderCallCardV32(data){
    const peer=safeNickV32(data.peer);if(!peer)return '<div class="call-history-card failed">Некорректный звонок</div>';
    const bad=data.status!=='ended';
    const group=!!data.group||Number(data.participantCount||0)>2;
    const title=data.status==='missed'?'Пропущенный звонок':group?'Групповой звонок':'Голосовой звонок';
    const count=group?' · '+Math.max(2,Number(data.participantCount)||2)+' участника':'';
    return `<div class="call-history-card ${bad?escHtml(data.status):''}">
      <div class="call-history-icon">${group?'👥':'☎'}</div>
      <div><div class="call-history-title">${title}</div><div class="call-history-meta">${callStatusTextV32(data)}${count}</div></div>
      <button class="call-history-redial" type="button" data-call-peer="${escHtml(peer)}" onclick="startCallV32(this.dataset.callPeer)">Позвонить</button>
    </div>`;
  }

  async function saveCallSummaryV32(state,status,duration){
    const peer=safeNickV32(state.originPeer);if(!peer)return;
    const participantCount=Math.max(2,state.maxParticipantCount||2);
    const text=packCallV32({
      caller:me.nick,callee:peer,peer,status,duration,callId:state.id,
      group:participantCount>2,participantCount
    });
    const row={chat_key:chatKey(me.nick,peer),from_nick:me.nick,text,ts:nowV32(),reply_text:null,read_by:[],deleted:false};
    const result=typeof telechatPersistMessageV24==='function'?await telechatPersistMessageV24(row):await sb.from('messages').insert(row);
    if(result?.error||result?.ok===false)showToast('Звонок завершён, но история не сохранилась');
  }

  async function previewCallV32(mode='active',peer='creator',group=false){
    ensureCallUiV32();
    const nick=safeNickV32(peer)||me?.nick;if(!nick)return;
    const state={
      id:'preview-v32',role:'host',hostNick:me.nick,originPeer:nick,status:mode==='calling'?'calling':'active',
      startedAt:mode==='active'?nowV32()-42000:0,preview:true,summarySaved:true,
      peers:new Map(),members:new Map(),volumes:new Map(),processedSignals:new Set()
    };
    state.members.set(me.nick,{nick:me.nick,status:'joined',user:me});
    const user=await getUser(nick)||{nick,name:nick,av:0,status:''};
    state.members.set(nick,{nick,status:mode==='calling'?'invited':'joined',user});
    if(group){
      const extra={nick:'tele',name:'Tele',av:3,status:''};
      state.members.set(extra.nick,{nick:extra.nick,status:'joined',user:extra});
    }
    callState=state;
    await showCallUiV32(mode,mode==='incoming'?'Входящий групповой звонок':mode==='calling'?'Вызываем…':group?'Групповой звонок':'Соединено',state);
    if(mode==='active')startCallTimerV32();updateCallButtonV32();
  }

  ensureCallUiV32();
  const previousPreview=messagePreviewText;
  messagePreviewText=function(text){
    const call=unpackCallV32(text);
    return call?(call.group?'👥 Групповой звонок':'☎ Голосовой звонок'):previousPreview(text);
  };
  const previousRender=renderMessageContent;
  renderMessageContent=function(text){
    const call=unpackCallV32(text);
    return call?renderCallCardV32(call):previousRender(text);
  };
  const previousLogin=doLogin;
  doLogin=async function(){
    const result=await previousLogin();if(me)initCallsV32();return result;
  };
  const previousOpenChat=openChat;
  openChat=async function(nick){
    lastPersonalPeer=safeNickV32(nick);
    const result=await previousOpenChat(nick);updateCallButtonV32();return result;
  };
  const previousOpenRoom=openRoom;
  openRoom=async function(room){
    lastPersonalPeer='';
    const result=await previousOpenRoom(room);updateCallButtonV32();return result;
  };
  const previousBack=goBack;
  goBack=function(){const result=previousBack();updateCallButtonV32();return result;};

  window.startCallV32=startCallV32;
  window.acceptCallV32=acceptCallV32;
  window.rejectCallV32=rejectCallV32;
  window.endCallV32=endCallV32;
  window.minimizeCallV32=minimizeCallV32;
  window.restoreCallV32=restoreCallV32;
  window.toggleCallMicV32=toggleCallMicV32;
  window.openInvitePanelV32=openInvitePanelV32;
  window.openCallMixerV32=openCallMixerV32;
  window.closeCallSheetsV32=closeCallSheetsV32;
  window.setMemberVolumeV32=setMemberVolumeV32;

  // Compatibility for old call cards and test helpers.
  window.startCallV31=startCallV32;
  window.acceptCallV31=acceptCallV32;
  window.rejectCallV31=rejectCallV32;
  window.endCallV31=endCallV32;
  window.minimizeCallV31=minimizeCallV32;
  window.restoreCallV31=restoreCallV32;
  window.telechatCallsV32={
    init:initCallsV32,preview:previewCallV32,closePreview:cleanupCallV32,
    pack:packCallV32,unpack:unpackCallV32,formatDuration:formatCallTimeV32
  };
  window.telechatCallsV31=window.telechatCallsV32;
  if(me)initCallsV32();
})();
