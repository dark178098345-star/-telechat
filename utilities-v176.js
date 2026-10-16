/* Connection diagnostics and sleep controls reuse existing transport/player APIs. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),panel=$('settings-panel'),sleep=()=>window.exstraSleepTimerV176;
 const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}};
 const clockIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M18 5l2 2"/></svg>';
 let section,dialog,opener,uiClock=0,refreshTimer=0,revision=0,busy=false,lastAction=0;
 const time=value=>value?new Date(value).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Ещё нет';
 function timerLabel(live=false){const s=sleep()?.getState();if(!s)return 'Выключен';if(s.mode==='track')return 'После текущего трека';if(!live)return 'До '+time(s.deadline);const seconds=Math.ceil(s.remainingMs/1000);return 'Осталось '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 function paintTimer(){
  const active=!!sleep()?.getState(),label=timerLabel();
  document.querySelectorAll('[data-sleep-label-v176]').forEach(n=>{const text=n.closest('#sleep-timer-v176')?timerLabel(true):label;if(n.textContent!==text)n.textContent=text;});
  document.querySelectorAll('[data-sleep-open-v176]').forEach(n=>{n.classList.toggle('sleep-active-v176',active);n.setAttribute('aria-label','Таймер сна. '+label);});
  if(dialog?.open){$('sleep-stop-v176').disabled=!active;$('sleep-after-v176').disabled=!window.telechatMusicV96?.getState()?.track;}
 }
 function updateClock(){clearInterval(uiClock);uiClock=0;paintTimer();if(dialog?.open&&!document.hidden)uiClock=setInterval(paintTimer,1000);}
 function openTimer(trigger){
  if(!account()){window.showToast?.('Сначала войди в аккаунт');return;}
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='sleep-timer-v176';dialog.setAttribute('aria-labelledby','sleep-title-v176');
   dialog.innerHTML='<header><span>'+clockIcon+'</span><h2 id="sleep-title-v176">Таймер сна</h2><button type="button" data-close aria-label="Закрыть">×</button></header><p class="utility-note-v176">Музыка плавно затихнет за последние 8 секунд. Таймер работает на этом устройстве, даже если закрыть окно музыки.</p><div class="sleep-current-v176" role="status" aria-live="polite"><span>Сейчас</span><strong data-sleep-label-v176></strong></div><div class="sleep-presets-v176">'+[15,30,45,60,90].map(n=>'<button type="button" data-minutes="'+n+'">'+n+' мин</button>').join('')+'</div><form id="sleep-form-v176"><label for="sleep-minutes-v176">Своё время, от 1 до 180 минут</label><div><input id="sleep-minutes-v176" type="number" inputmode="numeric" min="1" max="180" step="1" value="30" required><button type="submit">Включить</button></div></form><button type="button" class="sleep-after-v176" id="sleep-after-v176">После текущего трека</button><p class="utility-note-v176">Смена трека отменит режим «После текущего». Отсчёт по времени идёт и на паузе. Если ты ведущий комнаты, пауза остановит музыку у слушателей; если слушатель — ты выйдешь из комнаты.</p><button type="button" id="sleep-stop-v176">Выключить таймер</button>';
   document.body.append(dialog);
   dialog.querySelector('[data-close]').onclick=()=>dialog.close();
   dialog.querySelectorAll('[data-minutes]').forEach(b=>b.onclick=()=>{sleep()?.setMinutes(Number(b.dataset.minutes));paintTimer();});
   $('sleep-form-v176').onsubmit=event=>{event.preventDefault();sleep()?.setMinutes(Number($('sleep-minutes-v176').value));paintTimer();};
   $('sleep-after-v176').onclick=()=>{sleep()?.setAfterTrack();paintTimer();};$('sleep-stop-v176').onclick=()=>sleep()?.cancel();
   dialog.addEventListener('close',()=>{clearInterval(uiClock);uiClock=0;if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});});
   dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  }
  opener=trigger||document.activeElement;if(!dialog.open)dialog.showModal();updateClock();
 }
 function musicButton(){const b=document.createElement('button');b.type='button';b.className='sleep-open-v176';b.dataset.sleepOpenV176='';b.innerHTML=clockIcon+'<span><strong>Таймер сна</strong><small data-sleep-label-v176>Выключен</small></span><span aria-hidden="true">›</span>';b.onclick=()=>openTimer(b);return b;}
 function attachMusic(root){if(!root||root.querySelector('[data-sleep-open-v176]'))return;root.querySelector('.mh-queue-heading')?.before(musicButton());paintTimer();}
 function shown(){return section&&!section.hidden&&panel?.classList.contains('open')&&!document.hidden;}
 function field(name,text){const node=$('connection-'+name+'-v176');if(node&&node.textContent!==String(text))node.textContent=String(text);}
 async function refresh(){
  if(!shown())return;const token=++revision,nick=account(),transport=window.telechatTransportV172?.diagnostics(),presence=window.telechatPresenceV120?.diagnostics(),messages=window.telechatMessageCoreV104?.diagnostics();
  let queue;try{queue=await window.telechatDeliveryV72?.diagnostics();}catch(_){}
  if(token!==revision||nick!==account()||!shown())return;
  const offline=navigator.onLine===false;
  field('network',offline?'Нет подключения':'Подключение обнаружено');
  field('server',offline?'Недоступен без сети':!transport?.lastSuccessAt&&!transport?.lastFailureAt?'Пока не проверен':(transport.lastResult??(transport.lastFailureAt>transport.lastSuccessAt?-1:1))<0?'Последний запрос с ошибкой':'Ответ получен');
  field('latency',transport?.lastSuccessAt?transport.latencyMs+' мс':'—');field('last',time(transport?.lastSuccessAt));
  field('presence',offline?'Нет сети':!presence?'Нет данных':presence.connected?'Подключён':presence.hasSession?'Подключение…':'Нет активной сессии');
  field('messages',offline?'Нет сети':!messages?.active?'Открой чат для проверки':messages.connected?'Подключён':'Восстанавливается');
  field('queue',queue?String(queue.queued):'Нет данных');
  field('queue-note',queue?.durable===false?'Хранилище недоступно: не закрывай приложение до отправки.':queue?.permanent?'Есть сообщения с ограничением отправки: '+queue.permanent+'. Проверь их в чате.':queue?.failed?'С ошибкой: '+queue.failed+'. Доступные для повтора отправятся после восстановления связи.':queue?.sending?'Сейчас отправляется: '+queue.sending:queue?.queued?'Сообщения ожидают отправки. Переподключение запустит доступные повторы.':queue?'Неотправленных сообщений нет.':'Очередь пока недоступна.');
  field('counts',transport?'Запросы основного движка за этот запуск: '+transport.requests+' · тайм-аутов: '+transport.timeouts:'Данные появятся после первого запроса.');
 }
 function scheduleRefresh(){if(refreshTimer||!shown())return;refreshTimer=setTimeout(()=>{refreshTimer=0;refresh();},100);}
 async function action(reconnect){
  if(busy||Date.now()-lastAction<3000)return;
  if(navigator.onLine===false){window.showToast?.('Нет подключения к сети. Проверь Wi-Fi или мобильный интернет.');refresh();return;}
  busy=true;lastAction=Date.now();section.querySelectorAll('button').forEach(b=>b.disabled=true);field('action',reconnect?'Восстанавливаем соединение…':'Проверяем ответ сервера…');
  try{
   if(reconnect){window.telechatPresenceV120?.reconnect();window.telechatMessageCoreV104?.reconnect();Promise.resolve(window.telechatDeliveryV72?.drain(true)).catch(()=>{});}
   const result=await window.telechatTransportV172?.probe();field('action',result?.ok?'Сервер ответил.':result?.offline?'Нет подключения к сети.':'Не удалось получить ответ. Проверь сеть и повтори позже.');
  }catch(_){field('action','Не удалось восстановить связь. Очередь сообщений сохранена, если хранилище доступно.');}
  finally{busy=false;section.querySelectorAll('button').forEach(b=>b.disabled=false);refresh();}
 }
 if(panel){
  section=document.createElement('section');section.className='panel-section';section.id='connection-diagnostics-v176';
  const rows=[['network','Сеть устройства'],['server','Сервер'],['latency','Время ответа'],['last','Последний ответ'],['presence','Канал статусов'],['messages','Канал сообщений'],['queue','В очереди на отправку']];
  section.innerHTML='<div class="panel-section-title">Соединение</div><p class="utility-note-v176">Данные берутся из текущих запросов. Отдельная проверка выполняется только по кнопке. Наличие Wi-Fi само по себе не гарантирует доступ к серверу.</p><dl class="connection-values-v176">'+rows.map(([id,label])=>'<div><dt>'+label+'</dt><dd id="connection-'+id+'-v176">—</dd></div>').join('')+'</dl><p id="connection-queue-note-v176" class="utility-note-v176"></p><div class="connection-actions-v176"><button type="button" id="connection-probe-v176">Проверить связь</button><button type="button" id="connection-reconnect-v176">Переподключить</button></div><p id="connection-action-v176" class="utility-note-v176" role="status"></p><p id="connection-counts-v176" class="utility-note-v176"></p><p class="utility-note-v176">Время ответа — длительность последнего успешного запроса, не постоянный замер пинга. Переподключение также повторит доступные сообщения из очереди. Пароли и тексты сообщений здесь не отображаются.</p>';
  panel.append(section);$('connection-probe-v176').onclick=()=>action(false);$('connection-reconnect-v176').onclick=()=>action(true);
  const music=document.createElement('section');music.id='sleep-settings-v176';music.className='panel-section';music.innerHTML='<div class="panel-section-title">Музыка</div><p class="utility-note-v176">Засыпай под музыку. Остановка по времени или после текущего трека, с мягким затуханием.</p>';music.append(musicButton());panel.append(music);
  new MutationObserver(scheduleRefresh).observe(panel,{attributes:true,attributeFilter:['class','data-settings-view']});
 }
 for(const event of ['exstra-connection-change-v176','exstra-delivery-change-v176','online','offline','telechat-account-ready-v175'])window.addEventListener(event,scheduleRefresh);
 window.addEventListener('exstra-sleep-change-v176',paintTimer);
 document.addEventListener('visibilitychange',()=>{updateClock();scheduleRefresh();});
 window.exstraUtilitiesV176=Object.freeze({attachMusic,openTimer,refresh});attachMusic($('music-hub-v117'));paintTimer();
})();
