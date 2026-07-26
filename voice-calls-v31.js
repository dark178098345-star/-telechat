/* TELECHAT VOICE CALLS V31 - WebRTC, minimized calls and chat history */
(()=>{
  'use strict';
  const CALL_PREFIX='__telechat_call_v1__:';
  const ACTIVE_STATUSES=new Set(['ringing','accepted']);
  const FINAL_STATUSES=new Set(['ended','rejected','missed','cancelled','busy','failed']);
  const RTC_CONFIG={iceServers:[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'}
  ]};
  let callState=null,incomingCall=null,callRealtime=null,initializedFor='',lastPersonalPeer='';
  let ringTimer=null,ringContext=null,ringStep=0,callTimer=null,noAnswerTimer=null;
  let meterContext=null,meterFrame=0,meterSources=[];

  const byId=id=>document.getElementById(id);
  const nowV31=()=>Date.now();
  const safeNickV31=value=>{
    const nick=String(value||'').trim();
    return /^[a-z0-9_]{3,20}$/i.test(nick)?nick:'';
  };
  const callErrorV31=error=>String(error?.message||error||'').trim();
  const formatCallTimeV31=seconds=>{
    const value=Math.max(0,Math.floor(Number(seconds)||0));
    return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');
  };
  const callDurationV31=state=>state?.startedAt?Math.max(0,Math.floor((nowV31()-state.startedAt)/1000)):0;

  function ensureCallUiV31(){
    if(!byId('voice-call-btn')){
      const actions=document.querySelector('.chat-header-actions');
      if(actions){
        const button=document.createElement('button');
        button.className='hdr-btn';button.id='voice-call-btn';button.type='button';button.hidden=true;
        button.title='Голосовой звонок';button.setAttribute('aria-label','Начать голосовой звонок');button.textContent='☎';
        button.onclick=()=>callState?restoreCallV31():startCallV31();
        actions.insertBefore(button,actions.firstChild);
      }
    }
    if(!byId('voice-call-overlay')){
      document.body.insertAdjacentHTML('beforeend',`
        <div class="voice-call-overlay" id="voice-call-overlay" data-mode="calling" role="dialog" aria-modal="true" aria-label="Голосовой звонок">
          <section class="voice-call-surface">
            <button class="voice-call-minimize" id="call-minimize-btn" type="button" onclick="minimizeCallV31()" aria-label="Свернуть звонок">⌄</button>
            <div class="voice-call-brand">tele<span>.chat</span></div>
            <div class="voice-call-status" id="voice-call-status">Соединяем…</div>
            <div class="voice-call-parties">
              <div class="voice-call-person" id="call-person-local">
                <div class="voice-call-avatar" id="call-avatar-local"></div>
                <div class="voice-call-person-name" id="call-name-local"></div>
                <div class="voice-call-person-hint">ты</div>
              </div>
              <div class="voice-call-connector" aria-label="Соединение">
                <i class="voice-call-connector-dot"></i><i class="voice-call-connector-dot"></i><i class="voice-call-connector-dot"></i>
              </div>
              <div class="voice-call-person" id="call-person-remote">
                <div class="voice-call-avatar" id="call-avatar-remote"></div>
                <div class="voice-call-person-name" id="call-name-remote"></div>
                <div class="voice-call-person-hint">собеседник</div>
              </div>
            </div>
            <div class="voice-call-timer" id="voice-call-timer">0:00</div>
            <div class="voice-call-controls">
              <div class="voice-call-control-wrap">
                <button class="voice-call-control" id="call-mic-btn" type="button" onclick="toggleCallMicV31()" aria-label="Выключить микрофон">🎙</button>
                <span class="voice-call-control-label" id="call-mic-label">Микрофон</span>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control" id="call-speaker-btn" type="button" onclick="toggleCallVolumeV31()" aria-label="Громкость собеседника">🔊</button>
                <span class="voice-call-control-label">Громкость</span>
                <div class="voice-call-volume" id="call-volume-panel">
                  <div class="voice-call-volume-head"><span>Собеседник</span><span id="call-volume-value">100%</span></div>
                  <input id="call-volume" type="range" min="0" max="100" value="100" aria-label="Громкость собеседника">
                </div>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control end" type="button" onclick="endCallV31()" aria-label="Завершить звонок">☎</button>
                <span class="voice-call-control-label">Завершить</span>
              </div>
            </div>
            <div class="voice-call-incoming-actions">
              <div class="voice-call-control-wrap">
                <button class="voice-call-control end" type="button" onclick="rejectCallV31()" aria-label="Отклонить звонок">☎</button>
                <span class="voice-call-control-label">Отклонить</span>
              </div>
              <div class="voice-call-control-wrap">
                <button class="voice-call-control accept" type="button" onclick="acceptCallV31()" aria-label="Принять звонок">☎</button>
                <span class="voice-call-control-label">Принять</span>
              </div>
            </div>
            <audio class="voice-call-remote-audio" id="voice-call-audio" autoplay playsinline></audio>
          </section>
        </div>
        <aside class="voice-call-mini" id="voice-call-mini" aria-label="Активный звонок">
          <div class="voice-call-mini-avatar" id="voice-call-mini-avatar"></div>
          <div class="voice-call-mini-copy" onclick="restoreCallV31()">
            <div class="voice-call-mini-name" id="voice-call-mini-name">Активный звонок</div>
            <div class="voice-call-mini-time" id="voice-call-mini-time">0:00</div>
          </div>
          <button class="voice-call-mini-return" type="button" onclick="restoreCallV31()" aria-label="Вернуться в звонок">↗</button>
          <button class="voice-call-mini-end" type="button" onclick="endCallV31()" aria-label="Завершить звонок">☎</button>
        </aside>`);
      const volume=byId('call-volume');
      volume.addEventListener('input',()=>{
        const value=Math.max(0,Math.min(100,Number(volume.value)||0));
        byId('call-volume-value').textContent=value+'%';
        const audio=byId('voice-call-audio');if(audio)audio.volume=value/100;
      });
    }
    updateCallButtonV31();
  }

  function setAvatarV31(element,user){
    if(!element)return;
    try{element.innerHTML=avatarMarkup(user||{av:0,status:''});}
    catch(error){element.textContent='👤';}
  }

  async function paintCallPeopleV31(peerNick){
    const peer=await getUser(peerNick)||{nick:peerNick,name:peerNick,av:0,status:''};
    setAvatarV31(byId('call-avatar-local'),me);
    setAvatarV31(byId('call-avatar-remote'),peer);
    setAvatarV31(byId('voice-call-mini-avatar'),peer);
    byId('call-name-local').textContent=me?.name||me?.nick||'Ты';
    byId('call-name-remote').textContent=peer.name||peer.nick;
    byId('voice-call-mini-name').textContent='Звонок с '+(peer.name||'@'+peer.nick);
    return peer;
  }

  async function showCallUiV31(mode,peerNick,statusText){
    ensureCallUiV31();await paintCallPeopleV31(peerNick);
    const overlay=byId('voice-call-overlay');overlay.dataset.mode=mode;overlay.classList.add('show');document.body.classList.add('voice-call-full-v31');
    byId('voice-call-mini').classList.remove('show');
    byId('voice-call-status').textContent=statusText||(mode==='incoming'?'Входящий голосовой звонок':mode==='calling'?'Вызываем…':'Соединено');
    byId('voice-call-timer').textContent=mode==='active'?formatCallTimeV31(callDurationV31(callState)):'0:00';
    byId('call-minimize-btn').style.display=mode==='incoming'||mode==='calling'?'none':'';
    byId('call-person-local').classList.remove('speaking');byId('call-person-remote').classList.remove('speaking');
  }

  function hideCallUiV31(){
    byId('voice-call-overlay')?.classList.remove('show');byId('voice-call-mini')?.classList.remove('show');document.body.classList.remove('voice-call-full-v31');
    byId('call-volume-panel')?.classList.remove('show');
  }

  function updateCallButtonV31(){
    const button=byId('voice-call-btn');if(!button)return;
    const peer=safeNickV31(currentChat||lastPersonalPeer);
    button.hidden=!(peer&&me&&peer.toLowerCase()!==String(me.nick||'').toLowerCase()&&(!currentRoom||!!currentChat));
    button.classList.toggle('active',!!callState);
    button.title=callState?'Вернуться в звонок':'Голосовой звонок';
  }

  function callUnavailableV31(){
    if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia){showToast('Голосовые звонки не поддерживаются этим браузером');return true;}
    if(!window.isSecureContext){showToast('Для звонков открой tele.chat по защищённой ссылке HTTPS');return true;}
    return false;
  }

  async function requestMicrophoneV31(){
    try{return await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}
    catch(error){showToast('Разреши tele.chat доступ к микрофону');throw error;}
  }

  function createPeerV31(state){
    const pc=new RTCPeerConnection(RTC_CONFIG);state.pc=pc;state.localCandidates=[];state.remoteCandidates=[];state.persisted=state.persisted||false;
    pc.onicecandidate=event=>{
      if(!event.candidate)return;
      const candidate=event.candidate.toJSON?event.candidate.toJSON():event.candidate;
      if(!state.persisted)state.localCandidates.push(candidate);else sendCandidateV31(state,candidate);
    };
    pc.ontrack=event=>{
      const stream=event.streams?.[0];
      if(stream)state.remoteStream=stream;
      else{
        state.remoteStream=state.remoteStream||new MediaStream();
        try{state.remoteStream.addTrack(event.track);}catch(error){}
      }
      const audio=byId('voice-call-audio');audio.srcObject=state.remoteStream;audio.play().catch(()=>{});
      startSpeakingMeterV31(state.remoteStream,'call-person-remote');
    };
    pc.onconnectionstatechange=()=>{
      const status=pc.connectionState;
      if(status==='connected'){
        byId('voice-call-status').textContent='Соединено';
        if(!state.startedAt){state.startedAt=nowV31();startCallTimerV31();}
      }
      if(status==='failed')finishCallV31('failed',true);
      if(status==='disconnected'){
        clearTimeout(state.disconnectTimer);
        state.disconnectTimer=setTimeout(()=>{if(state===callState&&pc.connectionState==='disconnected')finishCallV31('failed',true);},6000);
      }
    };
    return pc;
  }

  async function sendCandidateV31(state,candidate){
    if(!state?.id||!candidate)return;
    await sb.from('telechat_call_candidates').insert({call_id:state.id,owner_nick:me.nick,candidate,created_at:nowV31()});
  }

  async function flushLocalCandidatesV31(state){
    const list=state.localCandidates.splice(0);
    for(const candidate of list)await sendCandidateV31(state,candidate);
  }

  async function addRemoteCandidateV31(candidate){
    if(!callState?.pc||!candidate)return;
    if(!callState.pc.remoteDescription){callState.remoteCandidates.push(candidate);return;}
    try{await callState.pc.addIceCandidate(candidate);}catch(error){}
  }

  async function flushRemoteCandidatesV31(){
    if(!callState?.pc?.remoteDescription)return;
    const queued=callState.remoteCandidates.splice(0);
    for(const candidate of queued)await addRemoteCandidateV31(candidate);
    const {data}=await sb.from('telechat_call_candidates').select('*').eq('call_id',callState.id).neq('owner_nick',me.nick).order('created_at',{ascending:true});
    for(const row of data||[])await addRemoteCandidateV31(row.candidate);
  }

  async function startCallV31(peerOverride){
    ensureCallUiV31();
    if(callState){restoreCallV31();return;}
    if(incomingCall){showCallUiV31('incoming',incomingCall.caller_nick,'Входящий голосовой звонок');return;}
    const peer=safeNickV31(peerOverride||currentChat||lastPersonalPeer);
    if(currentRoom&&!currentChat&&!peerOverride){showToast('Открой личный чат, чтобы позвонить');return;}
    if(!peer){showToast('Не удалось определить собеседника — открой чат ещё раз');return;}
    if(peer.toLowerCase()===String(me?.nick||'').toLowerCase()){showToast('Нельзя позвонить самому себе');return;}
    if(callUnavailableV31())return;
    let stream;
    try{stream=await requestMicrophoneV31();}catch(error){return;}
    const id=crypto.randomUUID();
    const state={id,role:'caller',peerNick:peer,status:'ringing',localStream:stream,startedAt:0,summarySaved:false,closing:false,persisted:false,remoteCandidates:[]};
    callState=state;updateCallButtonV31();await showCallUiV31('calling',peer,'Вызываем…');
    try{
      const pc=createPeerV31(state);stream.getTracks().forEach(track=>pc.addTrack(track,stream));startSpeakingMeterV31(stream,'call-person-local');
      const offer=await pc.createOffer({offerToReceiveAudio:true});await pc.setLocalDescription(offer);
      const row={id,caller_nick:me.nick,callee_nick:peer,status:'ringing',offer:pc.localDescription,answer:null,created_at:nowV31(),updated_at:nowV31(),accepted_at:null,ended_at:null};
      const result=await sb.from('telechat_calls').insert(row);
      if(result.error)throw result.error;
      state.row=row;state.persisted=true;await flushLocalCandidatesV31(state);
      noAnswerTimer=setTimeout(async()=>{
        if(callState===state&&state.status==='ringing'){
          await sb.from('telechat_calls').update({status:'missed',ended_at:nowV31(),updated_at:nowV31()}).eq('id',state.id);
          await finishCallV31('missed',false);
        }
      },35000);
    }catch(error){
      const message=callErrorV31(error);
      await cleanupCallV31();
      showToast(/telechat_calls|relation|schema cache|permission|policy/i.test(message)?'Сначала выполни SQL для звонков V31 в Supabase':'Не удалось начать звонок: '+message.slice(0,80));
    }
  }

  async function acceptCallV31(){
    if(!incomingCall||callState)return;
    if(callUnavailableV31())return;
    stopRingtoneV31();
    let stream;
    try{stream=await requestMicrophoneV31();}catch(error){return;}
    const row=incomingCall;incomingCall=null;
    const state={id:row.id,row,role:'callee',peerNick:row.caller_nick,status:'accepted',localStream:stream,startedAt:nowV31(),summarySaved:true,closing:false,persisted:true,remoteCandidates:[]};
    callState=state;updateCallButtonV31();await showCallUiV31('active',state.peerNick,'Соединяем…');
    try{
      const pc=createPeerV31(state);state.persisted=true;stream.getTracks().forEach(track=>pc.addTrack(track,stream));startSpeakingMeterV31(stream,'call-person-local');
      await pc.setRemoteDescription(row.offer);await flushRemoteCandidatesV31();
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      await sb.from('telechat_calls').update({status:'accepted',answer:pc.localDescription,accepted_at:state.startedAt,updated_at:nowV31()}).eq('id',state.id);
      await flushLocalCandidatesV31(state);startCallTimerV31();
    }catch(error){await finishCallV31('failed',false);showToast('Не удалось подключить звонок');}
  }

  async function rejectCallV31(){
    if(!incomingCall)return;
    const row=incomingCall;incomingCall=null;stopRingtoneV31();hideCallUiV31();
    await sb.from('telechat_calls').update({status:'rejected',ended_at:nowV31(),updated_at:nowV31()}).eq('id',row.id);
  }

  async function endCallV31(){
    if(incomingCall){await rejectCallV31();return;}
    if(!callState)return;
    if(callState.preview){await cleanupCallV31();return;}
    const status=callState.status==='ringing'?'cancelled':'ended';
    callState.closing=true;
    await sb.from('telechat_calls').update({status,ended_at:nowV31(),updated_at:nowV31()}).eq('id',callState.id);
    await finishCallV31(status,false);
  }

  async function finishCallV31(status,remote){
    const state=callState;if(!state)return;
    if(state.finishing)return;state.finishing=true;
    const duration=callDurationV31(state);
    if(state.role==='caller'&&!state.preview&&!state.summarySaved){state.summarySaved=true;await saveCallSummaryV31(state,status,duration);}
    const toast=status==='rejected'?'Звонок отклонён':status==='missed'?'Нет ответа':status==='busy'?'Собеседник занят':status==='failed'?'Соединение прервано':'';
    await cleanupCallV31();if(toast)showToast(toast);
    if(currentChat===state.peerNick&&!currentRoom)await renderMessages();renderContacts();
  }

  async function cleanupCallV31(){
    clearInterval(callTimer);callTimer=null;clearTimeout(noAnswerTimer);noAnswerTimer=null;stopRingtoneV31();stopSpeakingMetersV31();
    const state=callState;callState=null;
    if(state){clearTimeout(state.disconnectTimer);try{state.pc?.close();}catch(error){}try{state.localStream?.getTracks().forEach(track=>track.stop());}catch(error){}}
    const audio=byId('voice-call-audio');if(audio){audio.pause();audio.srcObject=null;audio.volume=1;}
    byId('call-volume').value='100';byId('call-volume-value').textContent='100%';byId('call-mic-btn').classList.remove('muted');byId('call-mic-label').textContent='Микрофон';
    hideCallUiV31();updateCallButtonV31();
  }

  function minimizeCallV31(){
    if(!callState||callState.status==='ringing')return;
    byId('voice-call-overlay').classList.remove('show');byId('voice-call-mini').classList.add('show');document.body.classList.remove('voice-call-full-v31');
  }
  function restoreCallV31(){
    if(!callState)return;
    byId('voice-call-mini').classList.remove('show');byId('voice-call-overlay').classList.add('show');document.body.classList.add('voice-call-full-v31');
  }
  function toggleCallMicV31(){
    if(!callState?.localStream)return;
    const tracks=callState.localStream.getAudioTracks?callState.localStream.getAudioTracks():callState.localStream.getTracks();
    const next=!tracks.some(track=>track.enabled===false);tracks.forEach(track=>track.enabled=!next);
    byId('call-mic-btn').classList.toggle('muted',next);byId('call-mic-label').textContent=next?'Выключен':'Микрофон';
  }
  function toggleCallVolumeV31(){byId('call-volume-panel').classList.toggle('show')}

  function startCallTimerV31(){
    clearInterval(callTimer);
    const tick=()=>{
      const text=formatCallTimeV31(callDurationV31(callState));
      if(byId('voice-call-timer'))byId('voice-call-timer').textContent=text;
      if(byId('voice-call-mini-time'))byId('voice-call-mini-time').textContent=text+' · нажми, чтобы вернуться';
    };
    tick();callTimer=setInterval(tick,1000);
  }

  function stopSpeakingMetersV31(){
    if(meterFrame)cancelAnimationFrame(meterFrame);meterFrame=0;meterSources=[];
    byId('call-person-local')?.classList.remove('speaking');byId('call-person-remote')?.classList.remove('speaking');
    if(meterContext){meterContext.close().catch(()=>{});meterContext=null;}
  }

  function startSpeakingMeterV31(stream,targetId){
    if(!stream||typeof MediaStream==='undefined'||!(stream instanceof MediaStream))return;
    try{
      meterContext=meterContext||new (window.AudioContext||window.webkitAudioContext)();
      const analyser=meterContext.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.72;
      const source=meterContext.createMediaStreamSource(stream);source.connect(analyser);
      meterSources.push({analyser,data:new Uint8Array(analyser.fftSize),targetId});
      if(!meterFrame)measureSpeakingV31();
    }catch(error){}
  }

  function measureSpeakingV31(){
    for(const meter of meterSources){
      meter.analyser.getByteTimeDomainData(meter.data);let sum=0;
      for(const sample of meter.data){const value=(sample-128)/128;sum+=value*value;}
      const speaking=Math.sqrt(sum/meter.data.length)>.045;
      byId(meter.targetId)?.classList.toggle('speaking',speaking);
    }
    meterFrame=requestAnimationFrame(measureSpeakingV31);
  }

  function playRingToneV31(){
    try{
      ringContext=ringContext||new (window.AudioContext||window.webkitAudioContext)();
      if(ringContext.state==='suspended')ringContext.resume().catch(()=>{});
      const oscillator=ringContext.createOscillator(),gain=ringContext.createGain();
      oscillator.type='sine';oscillator.frequency.value=ringStep++%2?520:440;gain.gain.value=.0001;
      oscillator.connect(gain);gain.connect(ringContext.destination);oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.055,ringContext.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ringContext.currentTime+.28);oscillator.stop(ringContext.currentTime+.3);
    }catch(error){}
  }
  function startRingtoneV31(){stopRingtoneV31();playRingToneV31();ringTimer=setInterval(playRingToneV31,850)}
  function stopRingtoneV31(){clearInterval(ringTimer);ringTimer=null}

  async function showIncomingCallV31(row){
    if(!me||row.callee_nick!==me.nick||row.status!=='ringing')return;
    if(callState||incomingCall){await sb.from('telechat_calls').update({status:'busy',ended_at:nowV31(),updated_at:nowV31()}).eq('id',row.id);return;}
    if(nowV31()-Number(row.created_at||0)>45000)return;
    incomingCall=row;await showCallUiV31('incoming',row.caller_nick,'Входящий голосовой звонок');startRingtoneV31();
    const caller=await getUser(row.caller_nick);try{sendPushNotification('Входящий звонок',caller?.name||'@'+row.caller_nick);}catch(error){}
  }

  async function handleCallChangeV31(payload){
    const row=payload.new||payload.old;if(!row||!me||!(row.caller_nick===me.nick||row.callee_nick===me.nick))return;
    if(row.callee_nick===me.nick&&row.status==='ringing'&&!callState){await showIncomingCallV31(row);return;}
    if(incomingCall?.id===row.id&&row.status!=='ringing'){incomingCall=null;stopRingtoneV31();hideCallUiV31();}
    if(!callState||callState.id!==row.id)return;
    callState.row=row;callState.status=row.status;
    if(callState.role==='caller'&&row.status==='accepted'&&row.answer&&!callState.remoteReady){
      callState.remoteReady=true;clearTimeout(noAnswerTimer);noAnswerTimer=null;
      try{
        await callState.pc.setRemoteDescription(row.answer);await flushRemoteCandidatesV31();
        callState.startedAt=Number(row.accepted_at)||nowV31();await showCallUiV31('active',callState.peerNick,'Соединяем…');startCallTimerV31();
      }catch(error){await finishCallV31('failed',true);}
      return;
    }
    if(FINAL_STATUSES.has(row.status)&&!callState.closing)await finishCallV31(row.status,true);
  }

  async function handleCandidateChangeV31(payload){
    const row=payload.new;if(!row||!callState||row.call_id!==callState.id||row.owner_nick===me.nick)return;
    await addRemoteCandidateV31(row.candidate);
  }

  async function initCallsV31(){
    if(!me)return;ensureCallUiV31();
    if(initializedFor===me.nick)return;initializedFor=me.nick;
    if(callRealtime)sb.removeChannel(callRealtime);
    callRealtime=sb.channel('voice-calls-v31-'+me.nick+'-'+nowV31())
      .on('postgres_changes',{event:'*',schema:'public',table:'telechat_calls'},handleCallChangeV31)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'telechat_call_candidates'},handleCandidateChangeV31)
      .subscribe();
    const pending=await sb.from('telechat_calls').select('*').eq('callee_nick',me.nick).eq('status','ringing').order('created_at',{ascending:false}).limit(1);
    if(!pending.error&&pending.data?.[0])showIncomingCallV31(pending.data[0]);
  }

  function unpackCallV31(text){
    if(typeof text!=='string'||!text.startsWith(CALL_PREFIX))return null;
    try{const data=JSON.parse(text.slice(CALL_PREFIX.length));return data&&data.v===1?data:null;}catch(error){return null;}
  }
  function packCallV31(data){return CALL_PREFIX+JSON.stringify({...data,v:1})}
  function callStatusTextV31(data){
    if(data.status==='ended')return data.duration?'Завершён · '+formatCallTimeV31(data.duration):'Завершён';
    if(data.status==='missed')return 'Без ответа';
    if(data.status==='rejected')return 'Отклонён';
    if(data.status==='cancelled')return 'Отменён';
    if(data.status==='busy')return 'Собеседник занят';
    return 'Соединение прервано';
  }
  function renderCallCardV31(data){
    const peer=safeNickV31(data.peer);if(!peer)return '<div class="call-history-card failed">Некорректный звонок</div>';
    const bad=data.status!=='ended',title=data.status==='missed'?'Пропущенный звонок':'Голосовой звонок';
    return `<div class="call-history-card ${bad?escHtml(data.status):''}"><div class="call-history-icon">☎</div><div><div class="call-history-title">${title}</div><div class="call-history-meta">${callStatusTextV31(data)}</div></div><button class="call-history-redial" type="button" data-call-peer="${peer}" onclick="startCallV31(this.dataset.callPeer)">Позвонить</button></div>`;
  }
  async function saveCallSummaryV31(state,status,duration){
    const peer=state.peerNick,text=packCallV31({caller:me.nick,callee:peer,peer,status,duration,callId:state.id});
    const row={chat_key:chatKey(me.nick,peer),from_nick:me.nick,text,ts:nowV31(),reply_text:null,read_by:[],deleted:false};
    const result=typeof telechatPersistMessageV24==='function'?await telechatPersistMessageV24(row):await sb.from('messages').insert(row);
    if(result?.error||result?.ok===false)showToast('Звонок завершён, но история не сохранилась');
  }

  async function previewCallV31(mode='active',peer='creator'){
    ensureCallUiV31();const nick=safeNickV31(peer)||me?.nick;if(!nick)return;
    callState={id:'preview-v31',role:'caller',peerNick:nick,status:mode==='calling'?'ringing':'accepted',startedAt:mode==='active'?nowV31()-42000:0,preview:true,summarySaved:true};
    await showCallUiV31(mode,nick,mode==='incoming'?'Входящий голосовой звонок':mode==='calling'?'Вызываем…':'Соединено');
    if(mode==='active')startCallTimerV31();updateCallButtonV31();
  }

  ensureCallUiV31();
  const previousPreview=messagePreviewText;
  messagePreviewText=function(text){const call=unpackCallV31(text);return call?'☎ '+(call.status==='missed'?'Пропущенный звонок':'Голосовой звонок'):previousPreview(text);};
  const previousRender=renderMessageContent;
  renderMessageContent=function(text){const call=unpackCallV31(text);return call?renderCallCardV31(call):previousRender(text);};
  const previousLogin=doLogin;
  doLogin=async function(){const result=await previousLogin();if(me)initCallsV31();return result;};
  const previousOpenChat=openChat;
  openChat=async function(nick){lastPersonalPeer=safeNickV31(nick);const result=await previousOpenChat(nick);updateCallButtonV31();return result;};
  const previousOpenRoom=openRoom;
  openRoom=async function(room){lastPersonalPeer='';const result=await previousOpenRoom(room);updateCallButtonV31();return result;};
  const previousBack=goBack;
  goBack=function(){const result=previousBack();updateCallButtonV31();return result;};
  document.addEventListener('click',event=>{if(!event.target.closest('#call-speaker-btn')&&!event.target.closest('#call-volume-panel'))byId('call-volume-panel')?.classList.remove('show');});

  window.startCallV31=startCallV31;
  window.acceptCallV31=acceptCallV31;
  window.rejectCallV31=rejectCallV31;
  window.endCallV31=endCallV31;
  window.minimizeCallV31=minimizeCallV31;
  window.restoreCallV31=restoreCallV31;
  window.toggleCallMicV31=toggleCallMicV31;
  window.toggleCallVolumeV31=toggleCallVolumeV31;
  window.telechatCallsV31={init:initCallsV31,preview:previewCallV31,closePreview:cleanupCallV31,pack:packCallV31,unpack:unpackCallV31,formatDuration:formatCallTimeV31};
})();
