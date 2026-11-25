/* One gift detail dialog: short-lived compositor motion; no polling, render loop or media decoder. */
(()=>{
 'use strict';
 let dialog,current=null;
 const themes=new Set(['violet','blue','cyan','rose','amber','red','green','black','orange','indigo']);
 const rarities={common:'Обычный',rare:'Редкий',epic:'Эпический',legendary:'Легендарный',mythic:'Мифический',limited:'Лимитированный'};
 const owner=()=>window.exstraWalletV197?.owner()||'';
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const nick=value=>/^[a-z0-9_]{1,64}$/.test(String(value||''))?String(value):'';
 const price=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value).toLocaleString('ru-RU')+' Лун':'Не указана';
 function date(value){const d=new Date(typeof value==='string'&&/^\d+$/.test(value)?Number(value):value);return value&&Number.isFinite(d.getTime())?d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'Не указана';}
 function cached(value){try{return userCache[value]||(me?.nick===value?me:null);}catch(_){return null;}}
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const canMove=()=>!reduce.matches&&!['off','lite'].includes(document.body.dataset.uiMotionV184);
 const motions={
  spark:['spark_seed crystal_dust frozen_supernova party_sparkler',10100,24,2.25],flutter:['glass_butterfly solar_dragon phoenix_orbit',11300,23,1.7],
  lantern:['polar_lantern night_lantern aurora_core',11400,8,3.35],rings:['tiny_orbit velvet_planet gravity_cube royal_satellite first_moon orbit_crown quantum_crown',12300,13,4.5],
  wish:['wish_bottle dream_capsule dream_portal',11900,13,2.9],jelly:['aurora_jelly space_whale',11000,12,2.2],
  comet:['comet_drop black_comet meteor_skate',10200,32,2.1],heart:['nova_heart',9900,10,2.45],bloom:['universe_seed cosmic_flower',11100,10,2.8],
  notes:['void_guitar astro_radio',10500,19,1.8],moon:['pixel_moon eternal_eclipse red_eclipse chrono_moon',11700,9,3.75],
  eyes:['celestial_mask singularity_eye lunar_cat nebula_fox',10600,11,2.25],time:['time_relic star_compass stellar_key',12000,15,2.85],
  castle:['moon_castle galaxy_cup',11200,9,3.0]
 };
 const flight={
  spark:['translate(0,2%) rotate(-8deg)','translate(2%,-2%) scale(1.055) rotate(5deg)','translate(-1%,-1%) scale(.99) rotate(-2deg)'],
  flutter:['translate(-4%,0) rotate(-10deg)','translate(3%,-6%) rotate(12deg)','translate(6%,-1%) rotate(4deg)'],
  lantern:['translateY(1%) rotate(-5deg)','translateY(-4%) rotate(4deg)','translateY(-2%) rotate(-3deg)'],
  rings:['rotate(-8deg) translateY(1%)','rotate(8deg) translateY(-3%)','rotate(-4deg) translateY(-1%)'],
  wish:['rotate(8deg)','rotate(-13deg) translateY(-3%)','rotate(5deg) translateY(-2%)'],
  jelly:['translateY(2%) scale(1.035,.95)','translateY(-6%) scale(.95,1.065)','translate(1%,-3%) scale(1.045,.965)'],
  comet:['translate(-6%,4%) rotate(-12deg) scale(.96)','translate(6%,-6%) rotate(8deg) scale(1.04)','translate(-3%,1%) rotate(0) scale(.99)'],
  heart:['scale(1.06)','scale(.99)','scale(1.07)'],
  bloom:['scale(.96) rotate(-4deg)','scale(1.05) translateY(-3%) rotate(5deg)','scale(1.01) rotate(-2deg)'],
  notes:['rotate(-8deg)','rotate(7deg) translateY(-3%)','rotate(-3deg) scale(1.045)'],
  moon:['translateY(2%) rotate(3deg)','translateY(-4%) rotate(-6deg)','translateY(-1%) rotate(4deg)'],
  eyes:['rotate(-6deg) scaleY(.97)','rotate(5deg) translateY(-3%)','rotate(2deg) scaleY(.91)'],
  time:['rotate(-10deg)','rotate(10deg) translateY(-3%)','rotate(-5deg)'],
  castle:['translateY(2%) scale(.98)','translateY(-3%) scale(1.05)','translateY(-1%) scale(1.01)']
 };
 function motion(id){
  const key=String(id||''),seed=Array.from(key).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,1047);
  for(const [kind,[ids,ms,range,pause]] of Object.entries(motions)){
   if(ids.split(' ').includes(key))return {kind,ms:ms+(seed%7)*110,range,pause,seed};
  }
  return {kind:'castle',ms:10700,range:9,pause:3,seed};
 }
 function clearMotion(view){
  if(!view?.motion)return;
  const run=view.motion;view.motion=null;for(const a of run.animations)a.cancel();
  if(current===view){dialog.querySelector('[data-gift-card-fx]').replaceChildren();dialog.querySelector('.ex-gift-stage-v207').classList.remove('gift-playing-v233');}
 }
 function play(view){
  clearMotion(view);if(!dialog?.open||!canMove()||document.hidden)return;
  const stage=dialog.querySelector('.ex-gift-stage-v207'),art=stage.querySelector('[data-gift-card-art]'),fx=stage.querySelector('[data-gift-card-fx]');
  if(typeof art.animate!=='function')return;
  const {kind,ms,range,pause,seed}=motion(view.artId),run={animations:[]};view.motion=run;
  stage.dataset.giftScene=kind;stage.classList.add('gift-playing-v233');
  const ease='cubic-bezier(.42,0,.58,1)',pose=flight[kind];
  const phases=kind==='flutter'||kind==='heart'||kind==='notes'?[0,.13,.26,.39,.52,.66,.79,.90,1]:[0,.18,.38,.57,.77,1];
  const model=art.animate(phases.map((offset,i)=>({transform:i===0||i===phases.length-1?'none':pose[(i-1+seed%3)%3],offset,easing:ease})),{duration:ms});
  run.animations.push(model);
  for(const shape of art.querySelectorAll('[data-gift-part-v233]')){
   const part=shape.dataset.giftPartV233,wing=part.startsWith('wing'),opposite=part==='wingRight'||part==='tentaclesOdd';
   const points=wing?[1,.76,1,.88,1,.78,1,.91,1]:[0,-5,3.6,-3.2,4.8,-3.1,0];
   run.animations.push(shape.animate(points.map((v,i)=>({
    transform:wing?'scaleX('+(opposite?1-(1-v)*.77:v)+')':'skewX('+(opposite?-v:v)+'deg)',
    offset:i/(points.length-1),easing:ease
   })),{duration:ms}));
  }
  const glow=stage.querySelector('.ex-gift-orbit-v207');
  run.animations.push(glow.animate([{opacity:.46,transform:'scale(.9)'},{opacity:.92,transform:'scale(1.08)'},{opacity:.54,transform:'scale(.97)'},{opacity:.82,transform:'scale(1.025)'},{opacity:.46,transform:'scale(.9)'}],{duration:ms,easing:ease}));
  const radial=['spark','rings','heart','eyes','time','castle'].includes(kind),count=kind==='spark'?8:6;
  for(let i=0;i<count;i++){
   const a=2*Math.PI*(i+(seed%9)/10)/count,dx=Math.round(Math.cos(a)*100),dy=Math.round(Math.sin(a)*100);
   const star=document.createElement('i');star.style.setProperty('--gift-particle-angle',Math.round(a*180/Math.PI)+'deg');
   const origin=kind==='spark'?[60,34]:kind==='wish'?[52,39]:kind==='jelly'?[49,65]:[50,50];
   star.style.left=origin[0]+dx*(radial?.10:.22)+'%';star.style.top=origin[1]+dy*(radial?.08:.12)+'%';
   fx.append(star);
   const x=radial?dx*range/26:dx*range/46+(kind==='comet'?-40:0),y=radial?dy*range/31:kind==='bloom'?dy*.26-20:-(27+i*6);
   const delay=340+i*(1000*pause/count)+(seed%5)*80,span=ms-delay-250-(i%3)*280;
   const frames=[{opacity:0,transform:'translate(0,0) scale(.42)'},{opacity:.92,transform:'translate('+x*.43+'px,'+y*.46+'px) scale(1.1)',offset:.26},
    {opacity:.26,transform:'translate('+x*.61+'px,'+y*.64+'px) scale(.76)',offset:.52},
    {opacity:.88,transform:'translate('+x*.81+'px,'+y*.83+'px) scale(1)',offset:.72},
    {opacity:0,transform:'translate('+x+'px,'+y+'px) scale(.4)'}];
   run.animations.push(star.animate(frames,{delay,duration:span,easing:'ease-in-out'}));
  }
  model.finished.then(()=>{if(view.motion===run)clearMotion(view);},()=>{});
 }
 function updateMotion(){
  const view=current;if(!view?.motion)return;
  if(!canMove()){clearMotion(view);return;}
  for(const a of view.motion.animations){if(document.hidden)a.pause();else if(a.playState==='paused')a.play();}
 }
 function close(restore=true){if(current){current.restore=restore;clearMotion(current);}if(dialog?.open)dialog.close();}
 function build(){
  dialog=document.createElement('dialog');dialog.id='gift-card-v207';dialog.className='ex-wallet-dialog-v197 ex-gift-card-v207';
  dialog.setAttribute('aria-labelledby','gift-card-title-v207');
  dialog.innerHTML=`<div class="ex-gift-hero-v207">
   <div class="ex-gift-top-v207"><span>EXSTRACHAT GIFTS</span><button type="button" data-gift-card-close aria-label="Закрыть карточку подарка">${icon('close')}</button></div>
   <div class="ex-gift-stage-v207"><span class="ex-gift-orbit-v207" aria-hidden="true"></span><div data-gift-card-art aria-hidden="true"></div><div data-gift-card-fx aria-hidden="true"></div>
    <button type="button" data-gift-card-replay aria-label="Повторить анимацию подарка" title="Повторить анимацию" hidden>${icon('play')}</button>
    <button type="button" data-gift-card-turn aria-label="Повернуть подарок на 45 градусов" title="Повернуть подарок" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5v5h-5m5 0a8 8 0 1 0 0 5"/></svg></button></div>
   <div class="ex-gift-caption-v207"><span data-gift-card-series></span><h2 id="gift-card-title-v207"></h2><p data-gift-card-subtitle></p></div>
  </div><div class="ex-gift-body-v207"><dl data-gift-card-details></dl><blockquote data-gift-card-note hidden></blockquote>
   <p class="ex-gift-card-status-v207" role="status" data-gift-card-status></p>
   <button type="button" class="ex-gift-card-action-v207" data-gift-card-action></button><p class="ex-gift-footnote-v207" data-gift-card-footnote></p>
  </div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-gift-card-close]').onclick=()=>close();
  let outside=false;dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog;});
  dialog.addEventListener('click',e=>{if(outside&&e.target===dialog)close();outside=false;});
  dialog.querySelector('[data-gift-card-action]').onclick=act;
  dialog.querySelector('[data-gift-card-replay]').onclick=()=>{if(current?.account===owner())play(current);};
  dialog.querySelector('[data-gift-card-turn]').onclick=()=>{
   const art=window.exstraGiftArtV198,view=current;if(!art?.view||!view||view.account!==owner())return;
   clearMotion(view);const stage=dialog.querySelector('[data-gift-card-art]');
   view.turn=(view.turn+1)%8;stage.innerHTML=art.view(view.artId,view.turn,true);
   if(canMove())stage.firstElementChild?.animate?.([{opacity:.69},{opacity:1}],{duration:145,easing:'ease-out'});
  };
  dialog.addEventListener('close',()=>{if(dialog.open)return;const view=current;clearMotion(view);current=null;view?.host?.removeEventListener('close',view.onHostClose);if(view?.restore&&view.account===owner()&&view.trigger?.isConnected&&view.host?.open)view.trigger.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',updateMotion);
  reduce.addEventListener('change',()=>{dialog.querySelector('[data-gift-card-replay]').hidden=!canMove();updateMotion();});
  window.addEventListener('exstra-motion-policy-v184',()=>{dialog.querySelector('[data-gift-card-replay]').hidden=!canMove();updateMotion();});
 }
 function row(label,value){const block=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;if(value?.nodeType)detail.append(value);else detail.textContent=String(value);block.append(term,detail);dialog.querySelector('[data-gift-card-details]').append(block);return detail;}
 function avatar(user){const shared=window.exstraWalletRecipientsV198?.avatar;if(shared)return shared(user);const node=document.createElement('span');node.className='ex-recipient-avatar-v198';node.textContent=String(user?.name||user?.nick||'?').slice(0,1).toLocaleUpperCase('ru-RU');return node;}
 function person(value,view){
  const name=nick(value);if(!name)return document.createTextNode('Не указан');
  const button=document.createElement('button');button.type='button';button.className='ex-gift-person-v207';button.dataset.giftPerson=name;button.title='Открыть профиль @'+name;
  const paint=user=>{const label=document.createElement('span');label.textContent=user?.name||'@'+name;button.replaceChildren(avatar(user||{nick:name}),label);};paint(cached(name));
  button.disabled=typeof window.openUserProfile!=='function';button.onclick=()=>{if(current!==view||view.account!==owner())return;close(false);view.host?.close();Promise.resolve(window.openUserProfile?.(name)).catch(()=>window.showToast?.('Не удалось открыть профиль'));};
  if(!cached(name)){
   let timer;Promise.race([Promise.resolve().then(()=>window.telechatUserCacheV123?.get(name)||window.getUser?.(name)),new Promise(resolve=>timer=setTimeout(()=>resolve(null),5000))])
    .then(user=>{if(current===view&&view.account===owner()&&dialog.open&&user?.nick===name)paint(user);}).catch(()=>{}).finally(()=>clearTimeout(timer));
  }
  return button;
 }
 async function act(){
  const view=current;if(!view||view.account!==owner()||view.working)return;
  if(view.owned){close();return;}
  if(view.limited&&!(view.until>Date.now())){view.ended=true;const b=dialog.querySelector('[data-gift-card-action]');b.disabled=true;b.textContent='Коллекция закрыта';return;}
  if(!view.recipient){close(false);view.onChoose?.();return;}
  const button=dialog.querySelector('[data-gift-card-action]'),status=dialog.querySelector('[data-gift-card-status]');
  view.working=true;button.disabled=true;status.textContent='';
  try{const result=await view.onSend?.(value=>{if(current===view&&view.account===owner())status.textContent=value;});if(current!==view||view.account!==owner())return;if(result?.ok)close();else if(!result?.cancelled)status.textContent=result?.error||'Подарок не отправлен. Попробуй ещё раз.';}
  catch(error){if(current===view&&view.account===owner())status.textContent=error?.message||'Не удалось отправить подарок';}
  finally{view.working=false;if(current===view)button.disabled=view.ended;}
 }
 function open(gift,options={}){
  if(!gift||!owner())return;if(!dialog)build();
  clearMotion(current);current?.host?.removeEventListener('close',current.onHostClose);
  const view={...options,account:owner(),owned:options.owned===true,recipient:nick(options.recipient),restore:true,working:false};
  view.limited=!!gift.limited;view.until=Number(gift.available_until);view.ended=!view.owned&&view.limited&&!(view.until>Date.now());view.onHostClose=()=>{if(current===view)close(false);};current=view;view.host?.addEventListener('close',view.onHostClose);
  dialog.dataset.theme=themes.has(gift.theme)?gift.theme:'violet';dialog.dataset.owned=String(view.owned);
  const get=selector=>dialog.querySelector(selector),id=gift.gift_id||gift.id;
  const artwork=window.exstraGiftArtV198;
  view.artId=id;view.turn=0;
  get('[data-gift-card-art]').innerHTML=artwork?.view?.(id,0,true)||artwork?.html?.(id)||icon('gift');
  get('[data-gift-card-turn]').hidden=!artwork?.view;
  get('[data-gift-card-replay]').hidden=!artwork?.view||!canMove();
  get('.ex-gift-stage-v207').dataset.giftScene=motion(id).kind;
  get('h2').textContent=gift.gift_name||gift.name||'Подарок';
  get('[data-gift-card-series]').textContent=gift.limited?'Лимитированная серия':'Коллекция ExstraChat';
  get('[data-gift-card-subtitle]').textContent=view.owned&&gift.id!==undefined?'Подарок №'+gift.id:'Маленький знак большого внимания';
  get('[data-gift-card-details]').replaceChildren();
  if(view.owned){row('От кого',person(gift.sender_nick,view));row('Владелец',person(gift.owner_nick||options.ownerNick,view));row('Получен',date(gift.created_at));if(gift.price!==undefined)row('Стоимость при получении',price(gift.price));}
  else{row('Получатель',view.recipient?person(view.recipient,view):'Пока не выбран');row('Стоимость',price(gift.price));}
  row('Редкость',rarities[gift.rarity]||(gift.limited?'Лимитированный':'Коллекционный'));
  const note=String(view.owned?gift.message||'':options.note||'').slice(0,120);get('[data-gift-card-note]').textContent=note;get('[data-gift-card-note]').hidden=!note;
  const button=get('[data-gift-card-action]');button.disabled=view.ended;button.textContent=view.owned?'Готово':view.ended?'Коллекция закрыта':view.recipient?'Подарить за '+price(gift.price):'Выбрать получателя';
  get('[data-gift-card-status]').textContent='';get('[data-gift-card-footnote]').textContent=view.owned?'Сохранён в коллекции владельца':'Списание Лун — только после подтверждения';
  dialog.scrollTop=0;if(!dialog.open)dialog.showModal();if(artwork?.view)play(view);
 }
 window.addEventListener('telechat-account-ready-v175',()=>{if(current&&current.account!==owner())close(false);});
 window.exstraGiftCardV207=Object.freeze({open,close});
})();
