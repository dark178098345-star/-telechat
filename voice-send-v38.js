/* V125: one owned recording session, deterministic finalization and safe cancellation. */
(()=>{'use strict';
 const sendBefore=sendMsg,cancelBefore=cancelPendingMedia,renderBefore=renderMessageContent;
 const $=id=>document.getElementById(id),icon=name=>window.telechatIconsV125.html(name);
 let session=null,sendBusy=false,playing=null,nativeHidden=false;const wired=new WeakSet();
 const context=()=>({key:conversationKey(),owner:typeof me!=='undefined'?me?.nick:''});
 const same=s=>s.key===context().key&&s.owner===context().owner;
 function ui(state='idle'){
  const button=$('record-btn'),status=$('recording-status');if(!button)return;
  button.dataset.voiceState=state;button.classList.toggle('recording',state==='recording');button.disabled=state==='stopping';
  button.setAttribute('aria-pressed',String(state==='recording'));button.setAttribute('aria-label',state==='recording'?'Остановить запись':state==='requesting'?'Ожидание микрофона':'Записать голосовое');button.title=button.getAttribute('aria-label');
  button.innerHTML=icon(state==='recording'?'stop':'mic');status?.classList.toggle('show',state!=='idle');
  let cancel=$('voice-cancel-v125');if(!cancel){cancel=document.createElement('button');cancel.id='voice-cancel-v125';cancel.type='button';cancel.className='composer-tool';cancel.setAttribute('aria-label','Отменить запись');cancel.title='Отменить запись';cancel.innerHTML=icon('close');cancel.onclick=()=>abort();button.after(cancel);}cancel.hidden=state==='idle';
  if(state==='requesting')$('recording-time').textContent='Доступ к микрофону…';if(state==='stopping')$('recording-time').textContent='Готовим запись…';
 }
 function end(s,ready=false){if(s.done)return;s.done=true;clearTimeout(s.permissionTimer);clearTimeout(s.limit);clearTimeout(s.watchdog);clearInterval(s.timer);s.stream?.getTracks().forEach(t=>t.stop());
  if(s.recorder?.state!=='inactive')try{s.recorder?.stop();}catch(_){}
  if(session===s){session=null;mediaRecorderV3=null;voiceStreamV3=null;ui();}s.resolve(ready);
 }
 function abort(message){const s=session;if(s)end(s);if(message)showToast(message);}
 function fail(s,error){if(s.done)return;const messages={NotAllowedError:'Разреши доступ к микрофону в настройках приложения или сайта.',NotFoundError:'Микрофон не найден.',NotReadableError:'Микрофон занят другим приложением.',SecurityError:'Запись недоступна: проверь разрешение микрофона.'};showToast(messages[error?.name]||'Не удалось записать голосовое. Попробуй ещё раз.');end(s);}
 function stop(s=session){if(!s)return Promise.resolve(false);if(s.done)return s.promise;if(s.state==='requesting'){showToast('Сначала разреши доступ к микрофону.');return Promise.resolve(false);}if(s.state==='stopping')return s.promise;
  s.state='stopping';s.duration=Math.min(45,Math.max(0,(performance.now()-s.started)/1000));clearInterval(s.timer);clearTimeout(s.limit);ui('stopping');
  s.watchdog=setTimeout(()=>{if(!s.done){showToast('Подготовка записи прервалась. Запиши сообщение ещё раз.');end(s);}},10000);
  try{s.recorder.stop();}catch(error){fail(s,error);}return s.promise;
 }
 async function start(){
  if(session)return session.state==='recording'?stop():undefined;
  const own=context();if(!own.key||!own.owner){showToast('Сначала открой чат.');return;}if(!canWriteCurrent()){showToast('В этом чате нельзя отправлять сообщения.');return;}
  if(pendingMedia){showToast('Сначала отправь или убери вложение.');return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){showToast('Запись голоса недоступна на этом устройстве. Проверь обновление приложения.');return;}
  const s={...own,state:'requesting',chunks:[],size:0,done:false};s.promise=new Promise(resolve=>s.resolve=resolve);session=s;ui('requesting');
  s.permissionTimer=setTimeout(()=>{if(!s.done){showToast('Микрофон не ответил. Проверь разрешение и повтори запись.');end(s);}},30000);
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});s.stream=stream;
   if(s.done||!same(s)||document.hidden||nativeHidden){stream.getTracks().forEach(t=>t.stop());end(s);return;}clearTimeout(s.permissionTimer);
   const types=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/webm',''];let recorder;
   for(const mime of types){try{if(mime&&MediaRecorder.isTypeSupported&&!MediaRecorder.isTypeSupported(mime))continue;recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:48000});break;}catch(_){}}
   if(!recorder)throw Error('No supported recorder');s.recorder=recorder;mediaRecorderV3=recorder;voiceStreamV3=stream;
   recorder.ondataavailable=e=>{if(s.done||!e.data?.size)return;s.chunks.push(e.data);s.size+=e.data.size;if(s.size>650000){showToast('Запись слишком большая. Попробуй записать короче.');end(s);}};
   recorder.onerror=e=>fail(s,e.error);
   recorder.onstop=async()=>{if(s.done)return;if(s.state!=='stopping')s.duration=Math.min(45,(performance.now()-s.started)/1000);s.state='stopping';clearInterval(s.timer);clearTimeout(s.limit);if(!s.watchdog)s.watchdog=setTimeout(()=>fail(s,Error('Finalize timeout')),10000);ui('stopping');stream.getTracks().forEach(t=>t.stop());
    try{if(!same(s)){end(s);return;}const blob=new Blob(s.chunks,{type:recorder.mimeType||s.chunks[0]?.type||'audio/webm'});
     if(blob.size<1||s.duration<.25){showToast('Запись слишком короткая. Удерживать кнопку не нужно — нажми для начала и остановки.');end(s);return;}
     const data=await blobToDataUrl(blob);if(s.done)return;if(!same(s)||pendingMedia){end(s);return;}
     pendingMedia={kind:'voice',data,duration:s.duration};renderPendingMedia();end(s,true);
    }catch(error){fail(s,error);}
   };
   s.started=performance.now();recorder.start(250);s.state='recording';ui('recording');$('recording-time').textContent='0:00 / 0:45';
   s.timer=setInterval(()=>{if(!same(s)){abort();return;}$('recording-time').textContent=formatDuration((performance.now()-s.started)/1000)+' / 0:45';},250);
   s.limit=setTimeout(()=>stop(s),45000);stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(!s.done&&s.state==='recording')stop(s);},{once:true}));
  }catch(error){fail(s,error);}
 }
 toggleVoiceRecording=start;
 cancelPendingMedia=function(...args){abort();return cancelBefore.apply(this,args);};
 sendMsg=async function(...args){if(sendBusy)return;if(!session)return sendBefore.apply(this,args);const s=session;sendBusy=true;
  try{const ready=await stop(s);if(ready&&same(s)&&canWriteCurrent()&&pendingMedia?.kind==='voice')return await sendBefore.apply(this,args);}finally{sendBusy=false;}
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.state==='recording')stop();});
 window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;if(nativeHidden&&session?.state==='recording')stop();});
 window.addEventListener('pagehide',()=>abort());
 $('chat-photo-input')?.addEventListener('change',event=>{if(event.target.files?.length)abort();},true);
 renderMessageContent=function(text,...args){
  const media=unpackMedia(text);if(media?.kind!=='voice')return renderBefore.call(this,text,...args);
  const source=String(media.data||'').replace(/[\r\n]/g,'');
  if(source.length>1200200||!/^data:(?:audio\/[a-z0-9.+-]+|video\/webm|application\/octet-stream)(?:;\s*[a-z0-9._+-]+=[a-z0-9._+ -]+)*;base64,[a-z0-9+/=]+$/i.test(source))return '<span class="voice-unavailable-v125">Голосовое повреждено или недоступно</span>';
  const duration=Number.isFinite(Number(media.duration))?Math.max(0,Math.min(86400,Number(media.duration))):0;
  return '<div class="voice-message" data-duration="'+duration+'"><button type="button" class="voice-play" onclick="toggleVoicePlayback(this)" aria-label="Воспроизвести голосовое">'+icon('play')+'</button><div class="voice-line-v125"><input class="voice-seek-v125" type="range" min="0" max="100" value="0" step="0.1" aria-label="Позиция голосового сообщения"><span class="voice-duration">'+formatDuration(duration)+'</span></div><audio preload="none" src="'+source+'"></audio></div>';
 };
 function wire(audio){if(wired.has(audio))return;wired.add(audio);const wrap=audio.closest('.voice-message'),button=wrap?.querySelector('.voice-play'),seek=wrap?.querySelector('.voice-seek-v125'),time=wrap?.querySelector('.voice-duration');if(!button)return;
  const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Number(wrap.dataset.duration)||0;
  function paint(){const paused=audio.paused||audio.ended;button.innerHTML=icon(paused?'play':'pause');button.setAttribute('aria-label',paused?'Воспроизвести голосовое':'Приостановить голосовое');if(seek)seek.value=duration()?Math.min(100,audio.currentTime/duration()*100):0;if(time)time.textContent=formatDuration(audio.currentTime>0&&!audio.ended?audio.currentTime:duration());}
  audio.addEventListener('play',()=>{if(playing&&playing!==audio)playing.pause();playing=audio;paint();});audio.addEventListener('pause',()=>{if(playing===audio)playing=null;paint();});audio.addEventListener('ended',paint);
  audio.addEventListener('timeupdate',()=>{if(seek)seek.value=duration()?Math.min(100,audio.currentTime/duration()*100):0;if(time)time.textContent=formatDuration(audio.currentTime||duration());});audio.addEventListener('loadedmetadata',paint);audio.addEventListener('error',()=>{button.disabled=false;paint();showToast('Не удалось воспроизвести голосовое. Попробуй открыть чат заново.');});
  seek?.addEventListener('input',()=>{const total=duration();if(total)try{audio.currentTime=total*Number(seek.value)/100;}catch(_){}});
 }
 toggleVoicePlayback=async function(button){const audio=button.closest('.voice-message')?.querySelector('audio');if(!audio||button.disabled)return;wire(audio);if(!audio.paused){audio.pause();return;}button.disabled=true;try{if(playing&&playing!==audio)playing.pause();await audio.play();}catch(_){showToast('Не удалось включить голосовое. Попробуй ещё раз.');}finally{button.disabled=false;}};
 const messages=$('messages');if(messages)new MutationObserver(records=>{for(const r of records)for(const node of r.removedNodes){if(node.nodeType!==1)continue;const audios=node.matches?.('audio')?[node]:node.querySelectorAll('audio');for(const audio of audios)if(!audio.isConnected)audio.pause();}}).observe(messages,{childList:true,subtree:true});
 window.telechatVoiceV125={cancel:abort,getState:()=>session?.state||'idle'};ui();
})();
