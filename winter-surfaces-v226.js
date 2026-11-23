/* Snow banks sit above surfaces without intercepting input or changing layout. */
(()=>{
 'use strict';
 const screen=document.getElementById('chat-screen'),messages=document.getElementById('messages');
 const winter=window.exstraWinterV225;if(!screen||!messages||!winter)return;
 const caps=new Map(),watched=new Set(),bursts=new Set(),reduce=matchMedia('(prefers-reduced-motion:reduce)');
 const settleMs=26000;
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const canMove=()=>!reduce.matches&&!['off','lite'].includes(document.body.dataset.uiMotionV184);
 let enabled=false,falling=false,queued=false,layer,tap,brush,shake;
 let deposits=new WeakMap(),snowElapsed=0,snowStarted=0,owner='';
 const snowTime=now=>snowElapsed+(falling?now-snowStarted:0);

 function amount(pile,now=performance.now()){
  return pile.started===null?pile.amount:Math.min(1,pile.amount+(now-pile.started)/settleMs);
 }
 function setAmount(pile,value){
  pile.growth?.cancel();pile.growth=null;
  pile.amount=value;pile.started=null;pile.art.style.scale='1 '+value;
 }
 function grow(pile){
  if(!falling||pile.started!==null||pile.amount>=1||!pile.art.animate)return;
  pile.started=performance.now();
  const growth=pile.art.animate([{scale:'1 '+pile.amount},{scale:'1 1'}],{
   duration:settleMs*(1-pile.amount),fill:'forwards',easing:'linear'
  });
  pile.growth=growth;
  growth.finished.then(()=>{if(pile.growth===growth)setAmount(pile,1);},()=>{});
 }
 function shift(pile,x,angle=0){
  pile.offset=x;
  pile.node.style.translate=x+'px 0';
  pile.node.style.rotate=angle+'deg';
 }
 function releaseBrush(){
  if(brush)brush.pile.node.style.rotate='0deg';
  brush=null;
 }
 function forget(host){
  const rec=caps.get(host);if(!rec)return;
  if(enabled&&rec.bubble&&host.isConnected){
   const now=performance.now(),at=snowTime(now);
   deposits.set(host,rec.piles.map(pile=>({amount:amount(pile,now),offset:pile.offset,at})));
  }
  if(tap?.rec===rec)tap=null;
  if(brush?.rec===rec)releaseBrush();
  for(const pile of rec.piles){pile.growth?.cancel();pile.node.remove();}
  if(rec.bubble)rec.node.remove();else delete rec.node.dataset.bankKind;
  caps.delete(host);
 }
 function add(host,node,kind){
  if(caps.has(host)||!node)return;
  const bubble=kind==='bubble',memory=bubble?deposits.get(host):null,now=performance.now();
  const rec={host,node,bubble,kind,piles:[]};
  // Keep the class of the original trim intact: the winter host uses it for deduplication.
  node.dataset.bankKind=kind;
  for(let i=0;i<(kind==='ridge'?3:1);i++){
   const mound=document.createElement('span'),art=document.createElement('span');
   mound.className='winter-bank-v227';art.className='winter-bank-art-v227';
   mound.append(art);node.append(mound);
   const pile={node:mound,art,started:null,offset:0},prev=memory?.[i];
   rec.piles.push(pile);
   setAmount(pile,prev?Math.min(1,prev.amount+(snowTime(now)-prev.at)/settleMs):(bubble&&falling ? .64 : 1));
   shift(pile,prev?.offset||0);grow(pile);
  }
  caps.set(host,rec);
 }
 function mountBubble(bubble){
  if(caps.has(bubble)||!enabled||!messages.contains(bubble))return;
  const node=document.createElement('span');node.className='winter-bubble-cap-v226';node.setAttribute('aria-hidden','true');
  bubble.append(node);add(bubble,node,'bubble');
 }
 const view=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)mountBubble(entry.target);else forget(entry.target);
 },{root:messages,threshold:0}):null;
 function updateMessages(){
  const next=new Set();
  for(const row of messages.children){
   if(!row.classList.contains('msg'))continue;
   const bubble=row.querySelector('.msg-bubble');if(bubble&&!bubble.querySelector(':scope > .tele-emoji-run-v127'))next.add(bubble);
  }
  for(const bubble of watched)if(!next.has(bubble)){view?.unobserve(bubble);watched.delete(bubble);forget(bubble);}
  for(const bubble of next)if(!watched.has(bubble)){watched.add(bubble);view?.observe(bubble);}
  if(!view){
   const visible=messages.getBoundingClientRect();
   for(const bubble of next){const rect=bubble.getBoundingClientRect();if(rect.bottom>visible.top&&rect.top<visible.bottom)mountBubble(bubble);else forget(bubble);}
  }
 }
 function sync(){
  const next=winter.getState(),nextFalling=next.snowActive&&canMove();
  if(falling!==nextFalling){
   const now=performance.now();
   if(falling)snowElapsed+=now-snowStarted;else snowStarted=now;
   falling=nextFalling;
  }
  if(owner!==next.owner||!next.active){
   enabled=false;
   for(const bubble of watched)view?.unobserve(bubble);
   watched.clear();for(const host of caps.keys())forget(host);
   deposits=new WeakMap();snowElapsed=0;owner=next.owner;
  }
  enabled=next.active;
  if(!enabled||!canMove()){
   for(const burst of bursts)burst.remove();bursts.clear();
   releaseBrush();tap=null;shake?.cancel();shake=null;
  }
  if(!enabled)return;
  for(const node of screen.querySelectorAll('.winter-ridge-v225,.winter-icon-snow-v225'))if(node.parentElement)
   add(node.parentElement,node,node.classList.contains('winter-icon-snow-v225')?'icon':'ridge');
  for(const [host,rec] of caps){
   if(!host.isConnected||rec.node.parentElement!==host){forget(host);continue;}
   for(const pile of rec.piles)if(falling)grow(pile);else if(pile.started!==null)setAmount(pile,amount(pile));
  }
  updateMessages();
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
 function target(event){
  const host=event.target?.closest?.('.msg-bubble,#input-area,#sidebar,.chat-main,.section-rail-v109 button');
  let rec=caps.get(host);
  if(event.pointerType!=='touch'&&!rec?.bubble&&event.target?.closest?.('#messages')){
   const below=document.elementFromPoint(event.clientX,event.clientY+8)?.closest('.msg-bubble');
   rec=caps.get(below)||rec;
  }
  return rec&&!rec.node.hidden?rec:null;
 }
 function hit(rec,x,y,whole=false){
  if(!rec)return null;
  let nearest=null,best=Infinity;
  for(const pile of rec.piles){
   if(amount(pile)<.14)continue;
   const r=pile.node.getBoundingClientRect();
   if(!r.width||!r.height||(!whole&&(x<r.left-5||x>r.right+5||y<r.top-5||y>r.bottom+6)))continue;
   const d=Math.abs(x-(r.left+r.right)/2);
   if(d<best){nearest={pile,r};best=d;}
  }
  return nearest;
 }
 function spill(x,y,direction,energy,height,width){
  if(bursts.size>=3)return;
  if(!layer){
   layer=document.createElement('div');layer.className='winter-spills-v226';layer.setAttribute('aria-hidden','true');layer.inert=true;
   document.body.append(layer);
  }
  const burst=document.createElement('div');burst.className='winter-spill-v226';
  burst.style.left=x+'px';burst.style.top=y+'px';
  for(let i=0;i<10;i++){
   const grain=document.createElement('i'),chunk=i<2;
   if(chunk)grain.className='winter-spill-chunk-v227';
   const spread=(Math.random()-.5)*(chunk?16:36),speed=direction*(.46+Math.random()*.77)*energy;
   const size=chunk?clamp(width*(i===0 ? .33 : .2),7,38)*(.7+height*.3):1.4;
   grain.style.setProperty('--spill-start',((i-4.5)*(chunk?2:4)-direction*(chunk?width*.09:0))+'px');
   grain.style.setProperty('--spill-x',(speed+spread).toFixed(1)+'px');
   grain.style.setProperty('--spill-lift',(-2-Math.random()*(chunk?6:13)).toFixed(1)+'px');
   grain.style.setProperty('--spill-y',(37+Math.random()*40+(chunk?11:0)).toFixed(1)+'px');
   grain.style.setProperty('--spill-spin',Math.round((speed+spread)*(chunk?2:3.5))+'deg');
   grain.style.setProperty('--spill-size',(size+Math.random()*(chunk?4:3.5)).toFixed(1)+'px');
   grain.style.setProperty('--spill-duration',Math.round(570+Math.random()*240)+'ms');
   grain.style.setProperty('--spill-delay',i*8+'ms');
   burst.append(grain);
  }
  bursts.add(burst);layer.append(burst);
  setTimeout(()=>{bursts.delete(burst);burst.remove();},900);
 }
 function drop(pile,r,direction,energy){
  const mass=amount(pile);if(mass<.14)return;
  const x=(r.left+r.right)/2+direction*r.width*.19;
  spill(x,r.bottom-2,direction,energy,mass,r.width);
  setAmount(pile,0);shift(pile,0);grow(pile);
 }
 screen.addEventListener('pointermove',event=>{
  if(!enabled||!canMove()||event.pointerType==='touch'||event.buttons){releaseBrush();return;}
  const x=event.clientX,y=event.clientY,t=performance.now(),rec=target(event);
  const g=brush;
  if(g&&g.rec===rec&&t-g.last<600){
   const dx=x-g.x,dy=y-g.y;
   if(Math.abs(dx)>1&&Math.abs(dy)<14&&Math.abs(y-g.startY)<11&&Math.abs(dx)<82){
    g.x=x;g.y=y;g.total=x-g.startX;g.steps++;
    const speed=Math.abs(dx)/Math.max(8,t-g.last);g.last=t;
    const direction=Math.sign(g.total)||Math.sign(dx);
    const effort=Math.abs(g.total),offset=clamp(g.offset+g.total*.62,-g.limit,g.limit);
    // Small strokes compress/push a bank in place. A long stroke or several fast samples spill it.
    shift(g.pile,offset,clamp(g.total*.12,-4,4));
    if(g.steps>=2&&(effort>=g.threshold+10||effort>=g.threshold&&speed>.24)){
     drop(g.pile,g.pile.node.getBoundingClientRect(),direction,clamp(18+speed*22+effort*.5,25,75));releaseBrush();
    }
    return;
   }
   if(Math.abs(dx)<=1&&Math.abs(y-g.startY)<11)return;
  }
  const contact=hit(rec,x,y);
  releaseBrush();
  brush=contact?{rec,pile:contact.pile,startX:x,startY:y,x,y,last:t,offset:contact.pile.offset,total:0,steps:0,
   limit:rec.kind==='ridge'?22:rec.kind==='icon'?6:clamp((rec.node.clientWidth-contact.r.width)*.36,2,10),
   threshold:clamp(contact.r.width*.41,17,34)}:null;
 },{passive:true});
 screen.addEventListener('pointerleave',releaseBrush,{passive:true});
 screen.addEventListener('pointerdown',event=>{
  releaseBrush();
  if(!enabled||!canMove()||event.pointerType!=='touch'||!event.isPrimary)return;
  const rec=target(event),contact=hit(rec,event.clientX,event.clientY,rec?.kind!=='ridge');
  tap=contact?{rec,pile:contact.pile,id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()}:null;
 },{passive:true});
 window.addEventListener('pointerup',event=>{
  const p=tap;tap=null;
  if(!enabled||!canMove()||!p||p.id!==event.pointerId||caps.get(p.rec.host)!==p.rec||
   performance.now()-p.t>580||Math.hypot(event.clientX-p.x,event.clientY-p.y)>11)return;
  const r=p.pile.node.getBoundingClientRect();
  if(!r.width)return;
  drop(p.pile,r,p.x<(r.left+r.right)/2?-1:1,26);
  if(p.rec.kind!=='ridge'){
   shake?.cancel();
   shake=p.rec.host.animate?.([{translate:'0 0'},{translate:'-2px 0'},{translate:'2px 0'},{translate:'-1px 0'},{translate:'0 0'}],{duration:235,easing:'ease-out'});
  }
 },{passive:true});
 window.addEventListener('pointercancel',()=>{tap=null;releaseBrush();},{passive:true});
 const changesBubble=node=>node.nodeType===1&&(node.matches('.msg,.msg-bubble,.tele-emoji-run-v127')||node.querySelector('.msg-bubble'));
 new MutationObserver(records=>{
  if(enabled&&records.some(record=>Array.from(record.addedNodes).some(changesBubble)||Array.from(record.removedNodes).some(changesBubble)))schedule();
 }).observe(messages,{childList:true,subtree:true});
 if(!view)messages.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('exstra-winter-change-v226',schedule);
 window.addEventListener('exstra-motion-policy-v184',schedule);
 reduce.addEventListener?.('change',schedule);
 sync();
})();
