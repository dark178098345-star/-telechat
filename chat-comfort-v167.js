/* Local chat appearance and timed focus. No database writes or polling. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),account=()=>typeof me!=='undefined'?String(me?.nick||''):'';
 const palettes={violet:['Фиолетовый','#7057ba'],blue:['Синий','#3569b7'],teal:['Бирюзовый','#24746c'],slate:['Графит','#536378'],rose:['Розовый','#a24c6e']};
 const defaults={color:'violet',radius:16,density:'normal',focusUntil:0};let owner='',prefs={...defaults},timer=0;
 const key=nick=>'exstrachat.comfort.v167.'+nick;
 function sanitize(value){const v=value||{};return {color:Object.hasOwn(palettes,v.color)?v.color:'violet',radius:Number.isFinite(Number(v.radius))?Math.max(8,Math.min(24,Math.round(Number(v.radius)/2)*2)):16,density:['compact','normal','spacious'].includes(v.density)?v.density:'normal',focusUntil:Number.isFinite(Number(v.focusUntil))?Math.max(0,Math.min(Number(v.focusUntil),Date.now()+3600000)):0};}
 function active(){return !!owner&&owner===account()&&prefs.focusUntil>Date.now();}
 function save(){if(!owner)return;try{localStorage.setItem(key(owner),JSON.stringify(prefs));}catch(_){}apply();}
 function apply(){
  clearTimeout(timer);timer=0;const focused=active();document.body.classList.toggle('focus-v167',focused);
  document.body.dataset.chatColorV167=prefs.color;document.body.dataset.chatDensityV167=prefs.density;
  document.body.style.setProperty('--chat-outgoing-v167',palettes[prefs.color][1]);document.body.style.setProperty('--chat-radius-v167',prefs.radius+'px');
  if(focused)timer=setTimeout(()=>{prefs.focusUntil=0;save();},Math.min(2147483647,Math.max(1,prefs.focusUntil-Date.now())));
  const badge=$('focus-status-v167');if(badge)badge.hidden=!focused;
  const note=$('focus-note-v167');if(note)note.textContent=focused?'Включён до '+new Date(prefs.focusUntil).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})+'. Музыка и звонки работают как обычно.':'Без звуков сообщений и системных уведомлений. Истории и глазки временно скрыты.';
  $('focus-stop-v167')?.toggleAttribute('hidden',!focused);
  document.querySelectorAll('[data-chat-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chatColor===prefs.color)));
  if($('chat-radius-v167')){$('chat-radius-v167').value=prefs.radius;$('chat-radius-value-v167').textContent=prefs.radius+' px';}
  if($('chat-density-v167'))$('chat-density-v167').value=prefs.density;
  window.telechatPixelEyesV155?.refresh();
 }
 function sync(){const nick=account();if(nick!==owner){owner=nick;try{prefs=sanitize(JSON.parse(localStorage.getItem(key(nick))||'null'));}catch(_){prefs={...defaults};}if(!nick)prefs={...defaults};}if(prefs.focusUntil&&prefs.focusUntil<=Date.now())prefs.focusUntil=0;apply();}
 function setFocus(minutes){sync();if(!owner)return;const value=Number(minutes);prefs.focusUntil=[25,60].includes(value)?Date.now()+value*60000:0;save();}
 function appearance(value){sync();if(!owner)return;const box=$('messages'),distance=box?box.scrollHeight-box.clientHeight-box.scrollTop:0,top=box?.scrollTop||0;const next=sanitize({...prefs,...value});prefs={...next,focusUntil:prefs.focusUntil};save();if(box)box.scrollTop=distance<100?Math.max(0,box.scrollHeight-box.clientHeight-distance):top;}
 const panel=$('settings-panel');if(panel){
  const chats=document.createElement('section');chats.className='panel-section comfort-section-v167';chats.dataset.settingsGroup='chats';
  chats.innerHTML='<div class="panel-section-title">Оформление сообщений</div><p class="comfort-note-v167">Выбери спокойный стиль. Настройки сохраняются для аккаунта на этом устройстве.</p><div class="comfort-preview-v167" aria-label="Предпросмотр сообщений"><div class="comfort-them-v167">Как тебе новый стиль?</div><div class="comfort-me-v167">Нравится. Просто и удобно.</div><div class="comfort-me-v167">Без лишнего.</div></div><fieldset class="comfort-colors-v167"><legend>Цвет твоих сообщений</legend></fieldset><label class="comfort-field-v167" for="chat-radius-v167"><span>Скругление <output id="chat-radius-value-v167"></output></span><input id="chat-radius-v167" type="range" min="8" max="24" step="2"></label><label class="comfort-field-v167" for="chat-density-v167"><span>Плотность сообщений</span><select id="chat-density-v167"><option value="compact">Компактно</option><option value="normal">Обычно</option><option value="spacious">Свободно</option></select></label><button type="button" class="comfort-secondary-v167" id="chat-reset-v167">Вернуть стандартный стиль</button>';
  const colors=chats.querySelector('fieldset');for(const [id,[label,color]] of Object.entries(palettes)){const b=document.createElement('button');b.type='button';b.dataset.chatColor=id;b.title=label;b.setAttribute('aria-label',label);b.style.setProperty('--swatch',color);b.onclick=()=>appearance({color:id});colors.append(b);}
  panel.append(chats);$('chat-radius-v167').oninput=e=>appearance({radius:Number(e.target.value)});$('chat-density-v167').onchange=e=>appearance({density:e.target.value});$('chat-reset-v167').onclick=()=>appearance(defaults);
  const focus=document.createElement('section');focus.className='panel-section comfort-section-v167';focus.dataset.settingsGroup='focus';focus.innerHTML='<div class="panel-section-title">Режим фокуса</div><p class="comfort-note-v167" id="focus-note-v167"></p><div class="focus-options-v167"><button type="button" data-focus-minutes="25">На 25 минут</button><button type="button" data-focus-minutes="60">На 1 час</button></div><button type="button" class="comfort-secondary-v167" id="focus-stop-v167" hidden>Завершить фокус</button><p class="comfort-note-v167">Сообщения продолжат приходить. Этот режим не меняет твой статус в сети и не отключает звонки.</p>';panel.append(focus);focus.querySelectorAll('[data-focus-minutes]').forEach(b=>b.onclick=()=>setFocus(Number(b.dataset.focusMinutes)));$('focus-stop-v167').onclick=()=>setFocus(0);
 }
 const badge=document.createElement('button');badge.type='button';badge.id='focus-status-v167';badge.className='hdr-btn';badge.hidden=true;badge.title='Фокус включён — нажми, чтобы завершить';badge.setAttribute('aria-label','Завершить режим фокуса');badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';$('active-chat')?.querySelector('.chat-header-actions')?.append(badge);badge.onclick=()=>setFocus(0);
 const login=window.doLogin;if(typeof login==='function')window.doLogin=async function(...args){const result=await login.apply(this,args);sync();return result;};
 window.addEventListener('storage',e=>{if(e.key===key(account())){owner='';sync();}});window.addEventListener('telechat-user-updated-v123',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 window.telechatComfortV167=Object.freeze({sync,setFocus,setAppearance:appearance,isFocused:active,isQuiet:active,getState:()=>({owner,...prefs,focused:active()})});sync();
})();
