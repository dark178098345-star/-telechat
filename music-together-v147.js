/* Opt-in listening rooms. Invitations carry a public verification key, never the host signing key. */
(()=>{
 'use strict';
 const core=()=>window.telechatMusicV96, user=()=>{try{return me?.nick||'';}catch(_){return '';}};
 const $=id=>document.getElementById(id),enc=new TextEncoder();
 const headphones='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2M3 12h4v8H3zM17 12h4v8h-4z"/></svg>';
 let dialog,room=null,timer=0,busy=false,inviteShown=false;
 const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 function invitation(value){try{const u=new URL(value,location.href),v=new URLSearchParams(u.hash.slice(1)).get('listen');if(!v)return null;const [id,key]=v.split('.');if(!/^[a-f0-9]{32}$/.test(id)||!key||bytes(key).length!==65)return null;return {id,key};}catch(_){return null;}}
 function shareable(track){if(!track||track.kind==='file')return null;try{const u=new URL(track.url);if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||/^(127\.|192\.168\.|10\.|169\.254\.|\[)/.test(u.hostname))return null;return {url:u.href,title:String(track.title||'Совместное прослушивание').slice(0,160),duration:Math.max(0,Math.min(86400,Number(track.duration)||0))};}catch(_){return null;}}
 function note(text){ensure();$('together-status-v147').textContent=text;}
 function ensure(){if(dialog)return;dialog=document.createElement('dialog');dialog.id='together-v147';dialog.innerHTML=`<header>${headphones}<h2>Слушаем вместе</h2><button data-together="close" aria-label="Закрыть">×</button></header><p>Ведущий выбирает музыку, управляет паузой и перемоткой. Друг подключается по приглашению.</p><div id="together-status-v147" role="status" aria-live="polite"></div><div class="together-actions-v147"><button data-together="create">Создать комнату</button><button data-together="resume" hidden>Включить звук / синхронизировать</button><button data-together="leave" hidden>Выйти из комнаты</button></div><label>Ссылка-приглашение<input id="together-link-v147" placeholder="Вставь приглашение друга" autocomplete="off" spellcheck="false"></label><div class="together-actions-v147"><button data-together="copy">Скопировать ссылку</button><button data-together="join">Подключиться</button></div><small>Работают опубликованные треки, прямые аудиоссылки и SoundCloud. Локальный файл сначала нужно выложить. Синхронизация приблизительная и зависит от сети.</small>`;document.body.append(dialog);
  dialog.addEventListener('click',async e=>{const action=e.target.closest('[data-together]')?.dataset.together;if(!action||busy)return;try{if(action==='close'){dialog.close();return;}if(action==='leave'){await leave(true);note('Ты вышел из комнаты.');return;}if(action==='copy'){if(!room?.host)throw Error('Сначала создай комнату.');await navigator.clipboard.writeText(room.link);note('Ссылка скопирована. Отправь её другу. Любой с этой ссылкой сможет подключиться.');return;}if(action==='resume'){if(room?.latest)await apply(room,room.latest,true);return;}busy=true;if(action==='create')await create();if(action==='join')await join($('together-link-v147').value);}catch(error){note(error.message||'Не удалось подключиться.');}finally{busy=false;render();}});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 }
 function render(){if(!dialog)return;dialog.querySelector('[data-together="create"]').hidden=!!room;dialog.querySelector('[data-together="join"]').hidden=!!room;dialog.querySelector('[data-together="leave"]').hidden=!room;dialog.querySelector('[data-together="copy"]').hidden=!room?.host;dialog.querySelector('[data-together="resume"]').hidden=!room||room.host;$('together-link-v147').readOnly=!!room;document.querySelectorAll('[data-action="together"]').forEach(b=>b.classList.toggle('together-active-v147',!!room));}
 function open(){ensure();if(!dialog.open)dialog.showModal();if(room?.host)$('together-link-v147').value=room.link;render();}
 async function connect(r){if(typeof sb==='undefined')throw Error('Нет соединения с сервисом.');r.channel=sb.channel('telechat-listen-v147-'+r.id,{config:{broadcast:{self:false,ack:true}}});
  r.channel.on('broadcast',{event:'state'},({payload})=>receive(r,payload));
  r.channel.on('broadcast',{event:'hello'},()=>{if(room===r&&r.host&&Date.now()-(r.lastHello||0)>1000){r.lastHello=Date.now();note('Есть подключение · ты управляешь музыкой.');publish(r);}});
  await new Promise((resolve,reject)=>{let ready=false;const timeout=setTimeout(()=>reject(Error('Не удалось подключиться. Попробуй ещё раз.')),12000);r.channel.subscribe(status=>{if(room!==r)return;if(status==='SUBSCRIBED'){clearTimeout(timeout);r.connected=true;if(!ready){ready=true;resolve();}if(r.host)publish(r);else hello(r);}else if(['CLOSED','CHANNEL_ERROR','TIMED_OUT'].includes(status)){r.connected=false;note('Соединение прервано. Переподключись к комнате.');if(!ready){clearTimeout(timeout);reject(Error('Нет соединения с комнатой.'));}}});});
 }
 const hello=r=>r.channel?.send({type:'broadcast',event:'hello',payload:{request:true}}).catch(()=>{});
 function startTimer(r){clearInterval(timer);timer=setInterval(()=>{if(room!==r)return;if(user()!==r.owner){leave();return;}if(r.host)publish(r);else{hello(r);if(Date.now()-r.received>25000){core()?.pause();note('Ждём ведущего. Музыка приостановлена до восстановления связи.');}}},5000);}
 async function create(){if(room)throw Error('Сначала выйди из текущей комнаты.');if(!user())throw Error('Сначала войди в аккаунт.');if(!shareable(core()?.getState().track))throw Error('Включи опубликованный трек или музыку по ссылке. Файл с устройства сначала нужно выложить.');
  const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const key=b64(await crypto.subtle.exportKey('raw',keys.publicKey));
  const r={host:true,id:crypto.randomUUID().replace(/-/g,''),key,privateKey:keys.privateKey,owner:user(),seq:0,connected:false};const url=new URL(location.href);url.search='';url.hash='listen='+r.id+'.'+key;r.link=url.href;room=r;
  try{await connect(r);if(room!==r)return;startTimer(r);$('together-link-v147').value=r.link;note('Комната создана. Скопируй приглашение и отправь другу. Ты управляешь музыкой.');await publish(r);}catch(e){await leave();throw e;}
 }
 async function join(link){if(room)throw Error('Сначала выйди из текущей комнаты.');if(!user())throw Error('Сначала войди в аккаунт.');const data=invitation(link);if(!data)throw Error('Это не ссылка-приглашение в комнату.');const publicKey=await crypto.subtle.importKey('raw',bytes(data.key),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const r={...data,host:false,publicKey,owner:user(),seq:0,received:Date.now(),connected:false,applying:false,latest:null,needsGesture:false,preferences:core()?.getState()};room=r;core()?.pause();core()?.setRepeat?.(false);core()?.setShuffle?.(false);
  try{note('Подключаемся к ведущему…');await connect(r);if(room!==r)return;startTimer(r);hello(r);}catch(e){await leave();throw e;}
 }
 async function publish(r,ended=false){if(room!==r||!r.host||!r.connected||r.closing&&!ended)return;if(r.sending){r.again=true;return;}r.sending=true;
  try{const current=core()?.getState(),track=shareable(current?.track);const state={seq:++r.seq,at:Date.now(),ended,track,time:Math.max(0,Math.min(86400,Number(current?.time)||0)),paused:!track||current.paused===true};const raw=JSON.stringify(state);const signature=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},r.privateKey,enc.encode(raw)));if(room!==r)return;await r.channel.send({type:'broadcast',event:'state',payload:{raw,signature}});if(!track&&!ended)note('Этот трек доступен только на устройстве. Участники на паузе: включи опубликованный трек.');}
  catch(_){if(room===r)note('Не удалось отправить состояние музыки. Проверяем связь…');}finally{r.sending=false;r.onIdle?.();r.onIdle=null;if(r.again&&room===r&&!r.closing){r.again=false;publish(r);}}
 }
 async function receive(r,packet){if(room!==r||r.host||!packet||typeof packet.raw!=='string'||packet.raw.length>6000||typeof packet.signature!=='string'||packet.signature.length>100)return;if(user()!==r.owner){await leave();return;}
  try{if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},r.publicKey,bytes(packet.signature),enc.encode(packet.raw)))return;const s=JSON.parse(packet.raw);if(room!==r||!Number.isSafeInteger(s.seq)||s.seq<=r.seq||!Number.isFinite(s.at)||Math.abs(Date.now()-s.at)>120000||!Number.isFinite(s.time)||s.time<0||s.time>86400||typeof s.paused!=='boolean'||s.track&&!shareable(s.track))return;
   r.seq=s.seq;r.received=Date.now();r.latest=s;if(s.ended){await leave();note('Ведущий завершил комнату.');return;}await apply(r,s);
  }catch(_){/* Ignore malformed or unsigned peer messages. */}
 }
 async function apply(r,s,gesture=false){if(room!==r||r.host)return;if(r.applying){r.pending=s;return;}r.applying=true;
  try{const p=core();if(!p)return;if(user()!==r.owner){await leave();return;}if(document.querySelector('#voice-call-overlay.show,#voice-call-mini.show')||document.body.classList.contains('voice-call-full-v32')){p.pause();note('Прослушивание на паузе во время звонка.');return;}if(!s.track){p.pause();note('Ведущий выбирает доступный трек.');return;}if(r.needsGesture&&!gesture)return;
   const id='together:'+r.id+':'+s.track.url,current=p.getState();
   if(current.track?.id!==id)await p.playTrack({...s.track,id,kind:'link'},[],{autoplay:!s.paused});else if(!s.paused&&current.paused)await p.toggle();
   if(room!==r)return;if(s.paused)p.pause();const target=s.time+(s.paused?0:Math.max(0,Math.min(10,(Date.now()-s.at)/1000))),next=p.getState();if(Math.abs((next.time||0)-target)>2)p.seek(target);
   r.needsGesture=!s.paused&&p.getState().paused;note(r.needsGesture?'Нажми «Включить звук»: устройство заблокировало автозапуск.':s.paused?'Пауза у ведущего.':'Слушаете вместе · '+s.track.title);
  }catch(e){note('Не удалось включить трек. Нажми «Включить звук» или проверь ссылку.');r.needsGesture=true;}finally{r.applying=false;if(r.pending&&room===r){const latest=r.pending;r.pending=null;apply(r,latest);}}
 }
 async function leave(announce=false){const r=room;if(!r)return;if(announce&&r.host){r.closing=true;if(r.sending)await new Promise(resolve=>{r.onIdle=resolve;});await publish(r,true);}if(room!==r)return;room=null;clearInterval(timer);timer=0;if(!r.host){core()?.stop();core()?.setRepeat?.(!!r.preferences?.repeat);core()?.setShuffle?.(!!r.preferences?.shuffle);}if(r.channel)await sb.removeChannel(r.channel).catch(()=>{});render();}
 window.addEventListener('telechat-music-state-v97',()=>{if(room?.host)publish(room);});
 let lastProgress=null;
 window.addEventListener('telechat-music-progress-v117',e=>{if(!room?.host)return;const now=Date.now(),time=Number(e.detail?.time)||0;if(lastProgress&&Math.abs(time-lastProgress.time-(e.detail.paused?0:(now-lastProgress.at)/1000))>2)publish(room);lastProgress={at:now,time};});
 window.addEventListener('pagehide',()=>{leave(true);});
 function checkInvite(){const data=invitation(location.href);if(!data||!user()||inviteShown)return;inviteShown=true;open();$('together-link-v147').value=location.href;note('Тебя пригласили слушать музыку вместе. Нажми «Подключиться», чтобы включить музыку.');}
 const previous=window.doLogin;if(typeof previous==='function')window.doLogin=async function(...args){await leave();const result=await previous.apply(this,args);checkInvite();return result;};
 window.addEventListener('hashchange',()=>{inviteShown=false;checkInvite();});setTimeout(checkInvite,0);
 window.telechatTogetherV147=Object.freeze({open,create:async()=>{open();await create();render();},join:async link=>{open();await join(link);render();},leave,invitation,state:()=>room?{host:room.host,link:room.link,connected:room.connected}:null});
})();
