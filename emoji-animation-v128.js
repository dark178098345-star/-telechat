/* Meaningful, finite SVG motion. Only active icons are observed; idle cost is zero. */
(()=>{
 'use strict';
 const active=new Map(),MAX_ACTIVE=8,reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let nativeHidden=false,motionEpoch=0;
 const arrivals=new Map();let arrivalTimer=0;
 try{nativeHidden=window.TelechatAndroid?.isInBackground?.()===true;}catch(_){}
 const observer=window.IntersectionObserver?new IntersectionObserver(entries=>{
  for(const entry of entries)if(!entry.isIntersecting)stop(entry.target);
 },{threshold:0}):null;
 function visible(svg){
  if(!svg?.isConnected||document.hidden||nativeHidden||reduce.matches)return false;
  if(svg.checkVisibility&&!svg.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;
  if(svg.closest('.emoji-picker:not(.open)'))return false;
  const r=svg.getBoundingClientRect();if(!r.width||!r.height||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return false;
  const box=svg.closest('#messages,.emoji-grid-v80');
  if(box){const b=box.getBoundingClientRect();if(r.bottom<=b.top||r.top>=b.bottom||r.right<=b.left||r.left>=b.right)return false;}
  return true;
 }
 function stop(svg){const state=active.get(svg);if(!state)return;active.delete(svg);observer?.unobserve(svg);for(const animation of state.animations)animation.cancel();}
 function stopAll(){motionEpoch++;clearTimeout(arrivalTimer);arrivalTimer=0;arrivals.clear();for(const svg of [...active.keys()])stop(svg);}
 function animate(element){
  const svg=element?.matches?.('[data-emoji-motion]')?element:element?.querySelector?.('[data-emoji-motion]');
  if(!svg)return false;
  stop(svg);
  if(!visible(svg)||!svg.animate)return false;
  if(active.size>=MAX_ACTIVE)stop(active.keys().next().value);
  const state={animations:[]};active.set(svg,state);
  const play=(part,frames,duration=1000,options={})=>{
   svg.querySelectorAll(`[data-emoji-part="${part}"]`).forEach((target,index)=>{
    target.style.transformBox='fill-box';target.style.transformOrigin=options.origin||'50% 50%';
    state.animations.push(target.animate(frames,{duration,easing:'ease-in-out',iterations:1,fill:'none',delay:(options.stagger||0)*index,...options}));
   });
  };
  const transforms=(...values)=>values.map(transform=>({transform}));
  const pulse=transforms('scale(1)','scale(1.15)','scale(1)','scale(1.1)','scale(1)','scale(1)');
  switch(svg.dataset.emojiMotion){
   case 'heart':play('body',pulse,1150);break;
   case 'fire':
    play('flame',transforms('scale(1) skewX(0deg)','scale(.94,1.06) skewX(-4deg)','scale(1.04,.94) skewX(3deg)','scale(.97,1.04) skewX(-2deg)','scale(1)'),1300,{origin:'50% 100%'});
    play('core',transforms('scale(1)','scale(.8,1.13)','scale(1.08,.85)','scale(.9,1.1)','scale(1)'),1300,{origin:'50% 100%'});break;
   case 'rain':
    play('cloud',transforms('translateX(0)','translateX(1.5px)','translateX(-1px)','translateX(0)'),1500);
    play('drop',[{transform:'translate(1px,-3px)',opacity:0},{transform:'translate(0,0)',opacity:1,offset:.3},{transform:'translate(-2px,5px)',opacity:0}],420,{iterations:3,stagger:100});break;
   case 'moon':play('star',[{transform:'scale(1) rotate(0deg)',opacity:1},{transform:'scale(.65) rotate(-15deg)',opacity:.4},{transform:'scale(1.3) rotate(20deg)',opacity:1},{transform:'scale(1) rotate(0deg)',opacity:1}],1400);break;
   case 'sleep':
    play('sleep',[{transform:'translateY(0)',opacity:1},{transform:'translateY(-5px)',opacity:0,offset:.65},{transform:'translateY(0)',opacity:1}],1600);
    play('mouth',transforms('scale(1)','scale(1.3,.8)','scale(1)'),1600);break;
   case 'laugh':play('body',transforms('rotate(0deg)','rotate(-7deg) translateY(-2px)','rotate(7deg)','rotate(-5deg) translateY(-2px)','rotate(0deg)'),1100);play('tears',transforms('translateY(0)','translateY(2px)','translateY(0)'),550,{iterations:2});break;
   case 'joy':play('body',transforms('translateY(0)','translateY(-3px) scale(1.04)','translateY(0)','translateY(-1px)','translateY(0)'),900);play('eyes',transforms('scaleY(1)','scaleY(.15)','scaleY(1)'),350,{delay:200});break;
   case 'love':play('hearts',pulse,1150);break;
   case 'tender':play('body',transforms('rotate(0deg)','rotate(-5deg)','rotate(4deg)','rotate(0deg)'),1200);play('hearts',transforms('scale(1)','scale(1.2)','scale(1)'),1000,{stagger:120});break;
   case 'kiss':play('hearts',[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(3px,-4px) scale(1.25)',opacity:1,offset:.4},{transform:'translate(5px,-7px) scale(.7)',opacity:0,offset:.8},{transform:'translate(0,0) scale(1)',opacity:1}],1200);break;
   case 'cool':play('glasses',transforms('translateY(0)','translateY(2px) rotate(-3deg)','translateY(0)'),1000);play('shine',[{opacity:1},{opacity:.2},{opacity:1}],1000);break;
   case 'plea':play('shine',transforms('scale(1)','scale(1.4)','scale(.8)','scale(1)'),1100,{stagger:100});break;
   case 'cry':play('tears',[{transform:'translateY(0) scaleY(1)',opacity:1},{transform:'translateY(2px) scaleY(.8)',opacity:.65},{transform:'translateY(0) scaleY(1)',opacity:1}],550,{iterations:2});play('mouth',transforms('scale(1)','scale(.8,1.15)','scale(1)'),1100);break;
   case 'anger':play('body',transforms('translateX(0)','translateX(-2px)','translateX(2px)','translateX(-1.5px)','translateX(1px)','translateX(0)'),700);play('vein',pulse,900);break;
   case 'surprise':play('mouth',transforms('scale(1)','scale(1.35)','scale(1.35)','scale(1)'),1100);play('eyes',transforms('scale(1)','scale(1.15)','scale(1)'),1100);break;
   case 'think':play('hand',transforms('translateY(0) rotate(0deg)','translateY(-2px) rotate(-9deg)','translateY(0) rotate(0deg)','translateY(-1px) rotate(-5deg)','translateY(0) rotate(0deg)'),1400);break;
   case 'thumb':play('body',transforms('rotate(0deg)','rotate(-12deg) translateY(-2px)','rotate(0deg)','rotate(-7deg)','rotate(0deg)'),1000,{origin:'50% 85%'});break;
  }
  if(!state.animations.length){stop(svg);return false;}
  observer?.observe(svg);
  let left=state.animations.length;
  for(const animation of state.animations)animation.onfinish=()=>{if(--left===0&&active.get(svg)===state)stop(svg);};
  return true;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();},{passive:true});
 window.addEventListener('pagehide',stopAll,{passive:true});
 window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;if(nativeHidden)stopAll();});
 const changed=()=>{if(reduce.matches)stopAll();};if(reduce.addEventListener)reduce.addEventListener('change',changed);else reduce.addListener?.(changed);
 function messageKey(message){return `msg:${message.id??`${message.from_nick||''}:${message.ts||0}`}`;}
 function findRow(box,message){if(!message)return null;return [...(box?.querySelectorAll('.msg')||[])].find(row=>message.id&&row.dataset.id===String(message.id)||row.dataset.messageKeyV105===messageKey(message));}
 function flushArrivals(){
  arrivalTimer=0;
  for(const [token,job] of arrivals){
   if(Date.now()>job.until||job.epoch!==motionEpoch||job.key!==window.conversationKey?.()||document.hidden||nativeHidden||reduce.matches){arrivals.delete(token);continue;}
   const row=findRow(document.getElementById('messages'),job.message)||(job.row?.isConnected?job.row:null);
   if(row&&!job.played.has(row)){
    const emoji=[...row.querySelectorAll('.tele-emoji-v127')].slice(0,4);
    // Wait for layout, entry opacity and the frame-aligned chat scroll to settle.
    if(emoji.length&&emoji.some(item=>visible(item.querySelector('[data-emoji-motion]')))){
     job.played.add(row);for(const item of emoji)animate(item);
    }
   }
  }
  if(arrivals.size)arrivalTimer=setTimeout(flushArrivals,100);
 }
 function acknowledge(message){for(const job of arrivals.values())if(job.key===message.chat_key&&job.message.from_nick===message.from_nick&&Number(job.message.ts)===Number(message.ts))job.message={...job.message,...message};}
 // History rendering passes false. A short queue follows new messages through
 // entry/scroll and optimistic-to-saved row replacement, then destroys itself.
 if(typeof window.appendMessage==='function'){
  const before=window.appendMessage;
  window.appendMessage=async function(message,doScroll=true){
   if(!doScroll)return before.apply(this,arguments);
   const box=document.getElementById('messages'),previous=new Set(box?.querySelectorAll('.msg')||[]),key=window.conversationKey?.(),epoch=motionEpoch;
   const result=await before.apply(this,arguments),row=findRow(box,message)||(result?.matches?.('.msg')?result:box?.lastElementChild);
   if(doScroll&&message&&!document.hidden&&!nativeHidden&&!reduce.matches&&epoch===motionEpoch&&row&&!previous.has(row)&&row.classList.contains('msg')&&key===window.conversationKey?.()&&row.querySelector('.tele-emoji-v127')){
    if(arrivals.size>=MAX_ACTIVE)arrivals.delete(arrivals.keys().next().value);
    arrivals.set(key+'|'+messageKey(message),{message:{...message},row,key,epoch,until:Date.now()+1800,played:new WeakSet()});
    if(!arrivalTimer)arrivalTimer=setTimeout(flushArrivals,100);
   }
   return result;
  };
 }
 window.telechatEmojiMotionV128={animate,stopAll,acknowledge,info:()=>({active:active.size,max:MAX_ACTIVE,pending:arrivals.size})};
})();
