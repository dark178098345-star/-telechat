/* Visible bubbles collect snow. Brushing it never changes the underlying gesture. */
(()=>{
 'use strict';
 const screen=document.getElementById('chat-screen'),messages=document.getElementById('messages');
 const winter=window.exstraWinterV225;if(!screen||!messages||!winter)return;
 const caps=new Map(),watched=new Set(),bursts=new Set(),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const capSelector='.winter-ridge-v225,.winter-icon-snow-v225,.winter-bubble-cap-v226';
 const settleMs=26000;
 let enabled=false,falling=false,queued=false,snowLayer,press=null,lastPointer=0,shake;
 let deposits=new WeakMap(),snowElapsed=0,snowStarted=0;
 const snowTime=now=>snowElapsed+(falling?now-snowStarted:0);
 function level(rec,now=performance.now()){
  return rec.started===null?rec.amount:Math.min(1,rec.amount+(now-rec.started)/settleMs);
 }
 function setLevel(rec,amount){
  if(rec.animation){rec.animation.cancel();rec.animation=null;}
  rec.amount=amount;rec.started=null;
  rec.node.style.scale='1 '+amount;
 }
 function fill(rec){
  if(!falling||rec.started!==null||rec.amount>=1||!rec.node.animate)return;
  rec.started=performance.now();
  const animation=rec.node.animate([{scale:'1 '+rec.amount},{scale:'1 1'}],{duration:settleMs*(1-rec.amount),fill:'forwards',easing:'linear'});
  rec.animation=animation;
  animation.finished.then(()=>{if(rec.animation===animation)setLevel(rec,1);},()=>{});
 }
 function forget(host,remove){
  const rec=caps.get(host);if(!rec)return;
  if(remove&&enabled&&host.isConnected){
   const now=performance.now();
   deposits.set(host,{amount:level(rec,now),at:snowTime(now)});
  }
  if(rec.animation)rec.animation.cancel();
  if(remove)rec.node.remove();else rec.node.style.removeProperty('scale');
  caps.delete(host);
 }
 function add(host,node,bubble){
  if(caps.has(host)||!node)return;
  const deposit=bubble?deposits.get(host):null;
  const amount=deposit?Math.min(1,deposit.amount+(snowTime(performance.now())-deposit.at)/settleMs):(bubble&&falling ? .32 : 1);
  const rec={host,node,bubble,amount,started:null,animation:null};
  caps.set(host,rec);setLevel(rec,rec.amount);fill(rec);
 }
 function mountBubble(bubble){
  if(caps.has(bubble)||!enabled||!messages.contains(bubble))return;
  const node=document.createElement('span');node.className='winter-bubble-cap-v226';node.setAttribute('aria-hidden','true');
  bubble.append(node);add(bubble,node,true);
 }
 const view=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)mountBubble(entry.target);else forget(entry.target,true);
 },{root:messages,threshold:0}):null;
 function updateMessages(){
  if(!enabled)return;
  const next=new Set();
  for(const row of messages.children){
   if(!row.classList.contains('msg'))continue;
   const bubble=row.querySelector('.msg-bubble');if(bubble)next.add(bubble);
  }
  for(const bubble of watched)if(!next.has(bubble)){view?.unobserve(bubble);watched.delete(bubble);forget(bubble,true);}
  for(const bubble of next)if(!watched.has(bubble)){watched.add(bubble);if(view)view.observe(bubble);}
  if(!view){
   const visible=messages.getBoundingClientRect();
   for(const bubble of next){const rect=bubble.getBoundingClientRect();if(rect.bottom>visible.top&&rect.top<visible.bottom)mountBubble(bubble);else forget(bubble,true);}
  }
 }
 function sync(){
  const next=winter.getState(),was=enabled;
  const nextFalling=next.snowActive&&!reduced.matches;
  if(falling!==nextFalling){
   const now=performance.now();
   if(falling)snowElapsed+=now-snowStarted;else snowStarted=now;
   falling=nextFalling;
  }
  enabled=next.active;
  if(!enabled){
   if(!was)return;
   deposits=new WeakMap();snowElapsed=0;
   for(const bubble of watched)view?.unobserve(bubble);
   watched.clear();for(const [host,rec] of caps)forget(host,rec.bubble);
   for(const burst of bursts)burst.remove();bursts.clear();press=null;
   return;
  }
  for(const node of screen.querySelectorAll('.winter-ridge-v225,.winter-icon-snow-v225'))if(node.parentElement)add(node.parentElement,node,false);
  for(const [host,rec] of caps){
   if(!host.isConnected){forget(host,false);continue;}
   if(falling)fill(rec);else if(rec.started!==null)setLevel(rec,level(rec));
  }
  updateMessages();
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
 function targetOf(event){
  const host=event.target?.closest?.('.msg-bubble,#input-area,#sidebar,.chat-main,.section-rail-v109 button');
  const rec=caps.get(host);return rec&&rec.node.matches(capSelector)&&!rec.node.hidden?rec:null;
 }
 function nearCap(rec,event){
  const rect=rec.node.getBoundingClientRect();
  return event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top-3&&event.clientY<=rect.bottom+6;
 }
 function spill(x,y,touch){
  if(reduced.matches||document.body.dataset.uiMotionV184==='off'||document.body.dataset.uiMotionV184==='lite'||bursts.size>=3)return;
  if(!snowLayer){
   snowLayer=document.createElement('div');snowLayer.className='winter-spills-v226';snowLayer.setAttribute('aria-hidden','true');snowLayer.inert=true;
   document.body.append(snowLayer);
  }
  const burst=document.createElement('div');burst.className='winter-spill-v226';burst.style.left=x+'px';burst.style.top=y+'px';
  for(let i=0;i<8;i++){
   const flake=document.createElement('i');flake.style.setProperty('--spill-x',Math.round((i-3.5)*(touch?8:6)+(Math.random()-.5)*12)+'px');
   flake.style.setProperty('--spill-y',(27+Math.random()*38)+'px');
   flake.style.setProperty('--spill-size',(2+Math.random()*3)+'px');
   flake.style.setProperty('--spill-delay',(i*13)+'ms');burst.append(flake);
  }
  bursts.add(burst);snowLayer.append(burst);
  setTimeout(()=>{bursts.delete(burst);burst.remove();},790);
 }
 function clear(rec,event,touch){
  if(level(rec)<.18)return;
  const rect=rec.node.getBoundingClientRect(),x=Math.max(rect.left+2,Math.min(rect.right-2,event.clientX));
  setLevel(rec,0);fill(rec);spill(x,rect.top+2,touch);
  if(touch&&(rec.bubble||rec.host.matches('.section-rail-v109 button'))&&!reduced.matches&&!['off','lite'].includes(document.body.dataset.uiMotionV184)){
   shake?.cancel();shake=rec.host.animate?.([{translate:'0 0'},{translate:'-2px 0'},{translate:'2px 0'},{translate:'-1px 0'},{translate:'0 0'}],{duration:225,easing:'ease-out'});
  }
 }
 screen.addEventListener('pointermove',event=>{
  if(!enabled||event.pointerType==='touch'||event.buttons||performance.now()-lastPointer<42)return;
  lastPointer=performance.now();const rec=targetOf(event);
  if(!rec||level(rec)<.18)return;
  if(nearCap(rec,event))clear(rec,event,false);
 },{passive:true});
 screen.addEventListener('pointerdown',event=>{
  if(!enabled||event.pointerType!=='touch'||!event.isPrimary)return;
  const rec=targetOf(event);
  press=rec&&(rec.bubble||rec.node.classList.contains('winter-icon-snow-v225')||nearCap(rec,event))?
   {rec,id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()}:null;
 },{passive:true});
 window.addEventListener('pointerup',event=>{
  const p=press;press=null;
  if(!enabled||!p||p.id!==event.pointerId||caps.get(p.rec.host)!==p.rec||
   performance.now()-p.t>580||Math.hypot(event.clientX-p.x,event.clientY-p.y)>11)return;
  clear(p.rec,event,true);
 },{passive:true});
 window.addEventListener('pointercancel',()=>{press=null;},{passive:true});
 const changesBubble=node=>node.nodeType===1&&(node.matches('.msg,.msg-bubble')||node.querySelector('.msg-bubble'));
 new MutationObserver(records=>{
  if(enabled&&records.some(record=>Array.from(record.addedNodes).some(changesBubble)||Array.from(record.removedNodes).some(changesBubble)))schedule();
 }).observe(messages,{childList:true,subtree:true});
 if(!view)messages.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('exstra-winter-change-v226',schedule);
 reduced.addEventListener?.('change',schedule);
 sync();
})();
