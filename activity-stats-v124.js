/* Account-level XP: batched, idempotent heartbeats; no credentials persisted here. */
(() => {
 'use strict';
 const model=window.telechatActivityModelV124,$=id=>document.getElementById(id),levels=new Map(),jobs=new Map();
 let owner='',generation=0,session='',seq=0,ready=false,active=0,music=0,pending=null,busy=false,lastSync=0;
 let lastTick=performance.now(),lastInteraction=performance.now(),previous=null,nativeHidden=false,stats=null,error='',dialog,focusBefore;
 const user=()=>{try{return typeof me!=='undefined'?me:null;}catch(_){return null;}};
 const nick=()=>String(user()?.nick||'').trim().toLowerCase();
 try{nativeHidden=window.TelechatAndroid?.isInBackground?.()===true;}catch(_){}
 function reset(){owner=nick();generation++;session=crypto.randomUUID();seq=0;ready=false;active=0;music=0;pending=null;busy=false;lastSync=0;stats=null;error='';previous=null;lastTick=performance.now();lastInteraction=lastTick;paint();}
 async function rpc(action,data){const u=user(),account=nick();if(!u||!account)throw Error('Войди в аккаунт');
  const pass=u.pass||($('l-login')?.value.trim().toLowerCase()===account?$('l-pass')?.value:'');
  const result=await sb.rpc('telechat_activity_v124',{p_nick:account,p_pass:pass||'',p_action:action,p_data:data});
  if(result.error)throw result.error;return result.data;
 }
 async function sync(force=false){
  if(nick()!==owner)reset();if(!owner||busy||(!force&&Date.now()-lastSync<30000))return;
  if(!force&&ready&&!pending&&active<1&&music<1)return;
  busy=true;lastSync=Date.now();const token=generation;
  if(!pending)pending={session,seq:++seq,active:ready?Math.floor(active):0,music:ready?Math.floor(music):0};
  const sent=pending;
  try{const value=await rpc('pulse',sent);if(token!==generation||nick()!==owner)return;
   active=Math.max(0,active-sent.active);music=Math.max(0,music-sent.music);pending=null;ready=true;stats=value;error='';
   levels.set(owner,{value,at:Date.now()});paint();refreshBadges();
  }catch(_){if(token===generation){error='Нет связи со статистикой. Повторим автоматически; сохранённый уровень не потеряется.';paint();}}
  finally{if(token===generation)busy=false;}
 }
 function sample(){
  if(nick()!==owner)reset();const now=performance.now(),elapsed=(now-lastTick)/1000;lastTick=now;
  let current=null;try{current=window.telechatMusicV96?.getState();}catch(_){}
  if(owner&&ready&&elapsed>0&&elapsed<=90){
   if(elapsed<=15&&!document.hidden&&!nativeHidden&&now-lastInteraction<90000)active=Math.min(90,active+elapsed);
   music=Math.min(90,music+model.listening(previous,current,elapsed));
  }
  previous=current;sync();
 }
 for(const name of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(name,event=>{if(event.isTrusted)lastInteraction=performance.now();},{passive:true,capture:true});
 document.addEventListener('visibilitychange',()=>{sample();previous=null;lastTick=performance.now();if(!document.hidden){lastInteraction=lastTick;sync(true);}});
 window.addEventListener('telechat-native-visibility',event=>{sample();nativeHidden=event.detail?.background===true;previous=null;if(!nativeHidden){lastInteraction=performance.now();sync(true);}});
 window.addEventListener('online',()=>sync(true));
 function time(seconds){const minutes=Math.floor((Number(seconds)||0)/60);return minutes<60?minutes+' мин':Math.floor(minutes/60)+' ч '+minutes%60+' мин';}
 const size=bytes=>bytes===null||bytes===undefined?'Недоступно':bytes>=1073741824?(bytes/1073741824).toFixed(1)+' ГБ':(bytes/1048576).toFixed(1)+' МБ';
 function paint(){if(!dialog?.open)return;const p=model.progress(stats?.xp);
  $('stats-level-v124').textContent=stats?'Уровень '+p.level:'Твой уровень';
  $('stats-xp-v124').textContent=stats?p.xp+' XP · до уровня '+(p.level+1)+' ещё '+(p.next-p.xp)+' XP':'Загружаем статистику аккаунта…';
  $('stats-progress-v124').value=stats?p.percent:0;
  $('stats-active-v124').textContent=stats?time(stats.active_seconds):'—';$('stats-music-v124').textContent=stats?time(stats.music_seconds):'—';
  $('stats-today-v124').textContent=stats?(stats.today_xp||0)+' / 480 XP':'—';$('stats-state-v124').textContent=error||'Уровень общий для телефона и ПК. Подробное время видно только тебе.';
  const storage=window.telechatStorageV124?.getState();$('stats-storage-v124').textContent=storage?.quota?size(storage.usage)+' из '+size(storage.quota):'Устройство не сообщает лимит';
 }
 function ensure(){if(dialog)return;dialog=document.createElement('dialog');dialog.id='activity-dialog-v124';dialog.setAttribute('aria-labelledby','stats-title-v124');
  dialog.innerHTML=`<header><div><small>ТВОЙ РИТМ В TELE.CHAT</small><h2 id="stats-title-v124">Статистика</h2></div><button type="button" class="stats-close-v124" aria-label="Закрыть статистику">×</button></header>
   <section class="stats-hero-v124"><span class="stats-orbit-v124" aria-hidden="true">✦</span><h3 id="stats-level-v124"></h3><p id="stats-xp-v124"></p><progress id="stats-progress-v124" max="100" value="0" aria-label="Прогресс до следующего уровня"></progress></section>
   <div class="stats-grid-v124"><section><span>Активность в приложении</span><strong id="stats-active-v124"></strong></section><section><span>Прослушано музыки</span><strong id="stats-music-v124"></strong></section><section><span>Опыт сегодня · UTC</span><strong id="stats-today-v124"></strong></section></div>
   <p id="stats-state-v124" role="status"></p><section class="stats-storage-box-v124"><h3>Память на этом устройстве</h3><strong id="stats-storage-v124"></strong><p>Данные tele.chat и кэш. Это доступная приложению квота, а не вся память телефона. При заполнении появится предупреждение.</p></section>
   <details><summary>Как растёт уровень?</summary><p>1 XP за минуту активного использования (до 2 часов в день) и 2 XP за минуту прослушивания (до 3 часов в день). Музыка в фоне тоже считается. Пауза, перемотка и бездействие не дают опыт. Суточный предел — 480 XP; общее время продолжает считаться.</p><p>Счёт начинается с этого обновления. Уровень виден в профиле. Статистика приблизительная: без подключения новые минуты могут не сохраниться.</p></details>
   <button type="button" class="stats-refresh-v124">Обновить</button>`;
  document.body.append(dialog);dialog.querySelector('.stats-close-v124').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>focusBefore?.focus?.({preventScroll:true}));dialog.querySelector('.stats-refresh-v124').onclick=()=>{sync(true);window.telechatStorageV124?.check(true);};
 }
 function open(){if(nick()!==owner)reset();ensure();focusBefore=document.activeElement;if(!dialog.open)dialog.showModal();paint();sync(true);window.telechatStorageV124?.check(true);}
 async function levelFor(account){const cached=levels.get(account);if(cached&&Date.now()-cached.at<60000)return cached.value;
  if(jobs.has(account))return jobs.get(account);
  const task=(async()=>{try{const {data,error}=await sb.from('activity_levels_v124').select('nick,xp,level').eq('nick',account).maybeSingle();if(error)throw error;const value=data||{nick:account,xp:0,level:1};levels.set(account,{value,at:Date.now()});return value;}catch(_){return cached?.value||null;}finally{jobs.delete(account);}})();jobs.set(account,task);return task;
 }
 const profileNick=anchor=>anchor.textContent.trim().match(/^@([a-z0-9_.-]+)/i)?.[1].toLowerCase()||'';
 async function badge(anchor){const account=profileNick(anchor);if(!account)return;
  let node=anchor.nextElementSibling;if(!node?.classList.contains('activity-badge-v124')){node=document.createElement('button');node.type='button';node.className='activity-badge-v124';node.hidden=true;anchor.after(node);}
  if(node.dataset.nick!==account){node.hidden=true;node.dataset.nick=account;}
  const value=await levelFor(account);if(!value||!anchor.isConnected||profileNick(anchor)!==account)return;
  const label='✦ Уровень '+model.progress(value.xp).level;if(node.textContent!==label)node.textContent=label;node.hidden=false;node.title=account===nick()?'Открыть мою статистику':'Уровень активности';node.disabled=account!==nick();node.onclick=account===nick()?open:null;
 }
 function refreshBadges(){document.querySelectorAll('#view-profile-nick,#profile-quick-v91 .pq-nick').forEach(anchor=>{if(anchor.getClientRects().length)badge(anchor);});}
 let scheduled=false;const watch=new MutationObserver(records=>{if(scheduled||!records.some(r=>!r.target.closest?.('.activity-badge-v124')) )return;scheduled=true;queueMicrotask(()=>{scheduled=false;refreshBadges();});});
 const profile=$('user-profile-modal');if(profile)watch.observe(profile,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
 new MutationObserver(()=>{const quick=$('profile-quick-v91');if(quick&&!quick.dataset.statsWatched){quick.dataset.statsWatched='1';watch.observe(quick,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});refreshBadges();}}).observe(document.body,{childList:true});
 const settings=$('settings-panel');if(settings){const button=document.createElement('button');button.type='button';button.id='stats-open-v124';button.innerHTML='<span aria-hidden="true">✦</span><span>Статистика<small>Твой уровень, музыка и память</small></span><span aria-hidden="true">›</span>';button.onclick=open;settings.append(button);}
 window.addEventListener('telechat-storage-v124',paint);window.telechatActivityV124={open,sync,refreshBadges};
 setInterval(sample,5000);setTimeout(sample,1500);
})();
