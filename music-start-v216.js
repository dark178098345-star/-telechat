/* One in-chat music controller. All playback and audio decoding stay with the music core. */
(()=>{
 'use strict';
 const by=id=>document.getElementById(id),body=document.body,screen=by('chat-screen'),sidebar=by('sidebar'),messages=by('messages');
 const core=()=>window.telechatMusicV96;
 const nick=()=>{try{return String(me?.nick||'');}catch{return '';}};
 const shapes={
  disc:'<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 8a5.7 5.7 0 0 1 4-1.7m4.1 9.5a5.7 5.7 0 0 1-4.1 1.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  play:'<path d="M7 4.8a1.1 1.1 0 0 1 1.7-.9l12.2 7.2a1 1 0 0 1 0 1.8L8.7 20.1a1.1 1.1 0 0 1-1.7-.9z"/>',
  pause:'<rect x="5" y="3" width="5" height="18" rx="1.1"/><rect x="14" y="3" width="5" height="18" rx="1.1"/>',
  previous:'<path d="M21 5.8a1 1 0 0 0-1.5-.8l-7.1 4.8V5.8a1 1 0 0 0-1.54-.8L2.65 10.8a1.4 1.4 0 0 0 0 2.4l8.21 5.8a1 1 0 0 0 1.54-.8v-4l7.1 4.8a1 1 0 0 0 1.5-.8Z"/>',
  next:'<path d="M3 5.8a1 1 0 0 1 1.5-.8l7.1 4.8V5.8a1 1 0 0 1 1.54-.8l8.21 5.8a1.4 1.4 0 0 1 0 2.4L13.14 19a1 1 0 0 1-1.54-.8v-4l-7.1 4.8a1 1 0 0 1-1.5-.8Z"/>',
  stop:'<path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  chevron:'<path d="m6 10 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  retry:'<path d="M19 5v5h-5m5 0a7 7 0 1 0 .5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
 };
 const icon=name=>'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+shapes[name]+'</svg>';
 const button=(action,label,art)=>'<button type="button" data-dock-music="'+action+'" aria-label="'+label+'" title="'+label+'">'+art+'</button>';
 const seconds=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const time=value=>{const n=Math.floor(seconds(value));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
 let card,parts,latest,owner='',meta='',artURL='',trackKey='',collapsed=false,started=false,dragging=false;
 let layoutFrame=0,textFrame=0,seekMark=0;
 function cover(value){
  if(typeof value!=='string'||!value)return '';
  if(/^data:image\/(png|jpeg|webp|avif|gif);base64,[a-z0-9+/=]+$/i.test(value))return value.length<=300000?value:'';
  try{
   const u=new URL(value,location.href);
   if(value.length<=4096&&!u.username&&!u.password&&(['http:','https:'].includes(u.protocol)||(u.protocol==='blob:'&&u.origin===location.origin)))return u.href;
  }catch{}
  return '';
 }
 function artist(track){
  if(track.artist||track.author_nick)return String(track.artist||track.author_nick).slice(0,200);
  if(track.fileName)return String(track.fileName).slice(0,200);
  if(track.kind==='file')return 'На этом устройстве';
  try{
   const u=new URL(track.url),name=decodeURIComponent(u.pathname.split('/').pop()||'');
   if(/(^|\.)soundcloud\.com$/i.test(u.hostname))return 'SoundCloud';
   if(/\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(name))return name.slice(0,200);
  }catch{}
  return 'ExstraChat · Музыка';
 }
 function mount(){
  if(card)return true;
  if(!screen||!sidebar)return false;
  card=document.createElement('aside');card.id='music-dock-v230';card.hidden=true;card.setAttribute('aria-label','Плеер в чатах');
  card.innerHTML='<div class="md-head-v230">'+button('library','Открыть раздел музыки',
   '<span class="md-cover-v230">'+icon('disc')+'<img alt="" width="48" height="48" decoding="async" referrerpolicy="no-referrer" hidden></span>'+
   '<span class="md-meta-v230"><span class="md-title-v230"><strong></strong></span><small></small></span>')+
   button('compact','Свернуть плеер','<span class="md-wave-v230" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'+icon('chevron'))+
   '</div><div id="music-dock-controls-v230"><div class="md-timeline-v230"><time data-dock-elapsed>0:00</time><input class="music-seek" type="range" min="0" max="0" value="0" step=".1" aria-label="Позиция в треке" disabled><time data-dock-remaining aria-label="Осталось">−0:00</time></div>'+
   '<div class="md-controls-v230">'+button('previous','Предыдущий трек',icon('previous'))+
   button('toggle','Воспроизвести',icon('play'))+button('next','Следующий трек',icon('next'))+
   button('stop','Остановить музыку и закрыть плеер',icon('stop'))+'</div><p data-dock-error role="status" hidden></p></div>';
  const $=s=>card.querySelector(s);
  parts={image:$('img'),title:$('strong'),clip:$('.md-title-v230'),artist:$('small'),controls:$('#music-dock-controls-v230'),
   head:$('.md-head-v230'),compact:$('[data-dock-music=compact]'),toggle:$('[data-dock-music=toggle]'),previous:$('[data-dock-music=previous]'),
   next:$('[data-dock-music=next]'),seek:$('input'),elapsed:$('[data-dock-elapsed]'),remaining:$('[data-dock-remaining]'),
   error:$('[data-dock-error]'),library:$('[data-dock-music=library]')};
  parts.compact.setAttribute('aria-controls',parts.controls.id);
  card.addEventListener('click',event=>{
   const action=event.target.closest('[data-dock-music]')?.dataset.dockMusic;
   if(!action||card.hidden||!owner||nick()!==owner)return;
   const player=core();
   if(action==='library'){if(window.telechatMusicHubV117?.open)window.telechatMusicHubV117.open();else player?.openLocal?.(parts.library);}
   else if(action==='compact'){collapsed=!collapsed;present();}
   else if(action==='toggle'){
    if(latest?.error&&player?.retry)player.retry();
    else player?.toggle?.();
   }else if(action==='stop')player?.stop?.();
   else if(action==='previous'||action==='next')player?.step?.(action==='previous'?-1:1);
  });
  parts.seek.addEventListener('pointerdown',()=>{dragging=true;});
  parts.seek.addEventListener('input',()=>showTimes(Number(parts.seek.value),Number(parts.seek.max),false));
  parts.seek.addEventListener('change',()=>{
   dragging=false;
   if(nick()!==owner||!latest?.track||card.hidden)return;
   seekMark=performance.now()+350;core()?.seek?.(Number(parts.seek.value));
  });
  const finish=()=>{dragging=false;};
  window.addEventListener('pointerup',finish,{passive:true});window.addEventListener('pointercancel',finish,{passive:true});
  return true;
 }
 function showTimes(value,total,setValue=true){
  const t=total?Math.min(total,seconds(value)):seconds(value);
  setText(parts.elapsed,time(t));setText(parts.remaining,total?'−'+time(total-t):'–:–');
  if(setValue)parts.seek.value=t;
  const fill=total?(t/total*100).toFixed(2)+'%':'0%';
  if(parts.seek.style.getPropertyValue('--md-fill')!==fill)parts.seek.style.setProperty('--md-fill',fill);
 }
 function setText(node,value){if(node.textContent!==value)node.textContent=value;}
 function measureTitle(){
  if(textFrame)cancelAnimationFrame(textFrame);
  if(!card||card.hidden)return;
  card.classList.remove('md-long-title');
  textFrame=requestAnimationFrame(()=>{
   textFrame=0;if(card.hidden)return;
   const distance=parts.title.scrollWidth-parts.clip.clientWidth;
   if(distance>8){card.style.setProperty('--md-title-travel',distance+'px');card.classList.add('md-long-title');}
  });
 }
 function updateMeta(track){
  const title=String(track.title||'Без названия').slice(0,180),sub=artist(track);
  const url=cover(track.cover_url||track.artwork),mark=JSON.stringify([title,sub,url]);
  if(mark===meta)return;
  meta=mark;setText(parts.title,title);setText(parts.artist,sub);parts.library.title=title+' — '+sub;
  if(url!==artURL){
   artURL=url;const img=parts.image;
   img.onload=img.onerror=null;img.hidden=true;img.removeAttribute('src');
   if(url){img.onload=()=>{if(artURL===url)img.hidden=false;};img.onerror=()=>{if(artURL===url)img.hidden=true;};img.src=url;}
  }
  measureTitle();
 }
 function present(){
  if(!card||!started||!latest?.track)return;
  const phone=body.classList.contains('telechat-phone-v159'),inChat=phone&&sidebar.classList.contains('hidden')&&messages?.parentElement;
  const hidden=!screen.classList.contains('active')||body.classList.contains('music-hub-open-v117')||
   (phone&&((body.dataset.phonePage&&body.dataset.phonePage!=='chats')||body.classList.contains('telechat-mobile-keyboard-v100')));
  const old=card.parentElement;
  if(inChat){if(old!==messages.parentElement)messages.before(card);}
  else if(old!==sidebar){const footer=sidebar.querySelector('.sidebar-footer');if(footer)footer.before(card);else sidebar.append(card);}
  if(card.hidden!==hidden){card.hidden=hidden;if(hidden)dragging=false;else measureTitle();}
  const folded=collapsed,aria=folded?'Развернуть плеер':'Свернуть плеер';
  if(parts.controls.hidden!==folded){
   parts.controls.hidden=folded;card.classList.toggle('md-compact',folded);
   if(folded)parts.compact.before(parts.toggle);else parts.next.before(parts.toggle);
   if(!hidden)measureTitle();
  }
  if(parts.compact.getAttribute('aria-label')!==aria){parts.compact.setAttribute('aria-label',aria);parts.compact.title=aria;parts.compact.setAttribute('aria-expanded',String(!folded));}
 }
 function scheduleLayout(){
  if(!started||layoutFrame)return;
  layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(owner!==nick())reset();else present();});
 }
 function reset(){
  owner=nick();started=false;latest=null;trackKey=meta='';collapsed=false;dragging=false;seekMark=0;
  if(layoutFrame)cancelAnimationFrame(layoutFrame);if(textFrame)cancelAnimationFrame(textFrame);layoutFrame=textFrame=0;
  if(!card)return;
  card.hidden=true;card.removeAttribute('data-playing');artURL='';
  parts.image.hidden=true;parts.image.onload=parts.image.onerror=null;parts.image.removeAttribute('src');
  parts.title.textContent=parts.artist.textContent='';parts.error.textContent='';parts.library.title='Открыть раздел музыки';
 }
 function update(info){
  const who=nick();if(who!==owner)reset();
  const track=info?.track;
  if(track&&track.owner!==who)return;
  if(!who||!track){
   if(who&&started&&!track&&info?.loading&&latest?.track)info={...info,track:latest.track,paused:true};
   else{if(started)reset();return;}
  }
  const playing=!info.paused&&!info.loading&&!info.error;
  if(!started&&!playing)return;
  if(!mount())return;
  const previous=latest,key=String(info.track.id||info.track.url||'');
  if(key!==trackKey){seekMark=0;dragging=false;trackKey=key;}
  started=true;latest=info;
  // Layout (including reparenting on phones) is checked only on actual UI changes.
  if(!card.isConnected)present();
  updateMeta(info.track);
  if(previous&&previous.track?.id!==info.track.id)measureTitle();
  if(card.dataset.playing!==String(playing))card.dataset.playing=String(playing);
  const mode=info.error?'retry':playing||info.loading?'pause':'play';
  if(parts.toggle.dataset.state!==mode){
   parts.toggle.dataset.state=mode;parts.toggle.innerHTML=icon(mode);
   const label=mode==='retry'?'Повторить воспроизведение':mode==='pause'?'Пауза':'Воспроизвести';
   parts.toggle.setAttribute('aria-label',label);parts.toggle.title=label;
  }
  const limited=info.canStep===false;
  if(parts.previous.disabled!==limited)parts.previous.disabled=limited;
  if(parts.next.disabled!==limited)parts.next.disabled=limited;
  const duration=seconds(info.duration||info.track.duration);
  if(Number(parts.seek.max)!==duration)parts.seek.max=duration;
  const unavailable=!duration||!!info.loading||!!info.error;
  if(parts.seek.disabled!==unavailable)parts.seek.disabled=unavailable;
  if(!dragging&&performance.now()>=seekMark)showTimes(info.time,duration);
  if(parts.error.hidden===!!info.error)parts.error.hidden=!info.error;
  setText(parts.error,info.error?'Не удалось воспроизвести. Нажми повтор.':'');
  if(!previous)present();
 }
 window.addEventListener('telechat-music-progress-v117',event=>update(event.detail));
 window.addEventListener('telechat-account-ready-v175',reset);
 window.addEventListener('pagehide',reset);
 window.addEventListener('resize',()=>{if(started){scheduleLayout();measureTitle();}},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleLayout();});
 const observer=new MutationObserver(()=>{if(owner!==nick())reset();else scheduleLayout();});
 for(const node of [body,screen,sidebar])if(node)observer.observe(node,{attributes:true,attributeFilter:['class','data-phone-page']});
 owner=nick();
})();
