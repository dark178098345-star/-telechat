/* A brush transfers snow from a shallow layer into heaps that stay where you leave them. */
(()=>{
 'use strict';
 const screen=document.getElementById('chat-screen'),messages=document.getElementById('messages');
 const winter=window.exstraWinterV225;if(!screen||!messages||!winter)return;
 const tracks=new Map(),watched=new Set(),bursts=new Set(),refills=new Set(),dirty=new Set();
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'),ns='http://www.w3.org/2000/svg';
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v)),settleMs=26000;
 const canMove=()=>!reduce.matches&&!['off','lite'].includes(document.body.dataset.uiMotionV184);
 let enabled=false,falling=false,queued=false,owner='',memo=new WeakMap(),snowElapsed=0,snowStarted=0;
 let overlay,gesture,press,shake,iceMounted=false,frame=0,refillTimer=0;
 const snowTime=now=>snowElapsed+(falling?now-snowStarted:0);
 const svg=name=>document.createElementNS(ns,name);
 const n=x=>Math.round(x*10)/10;

 function mount(host,node,kind){
  if(tracks.has(host))return;
  const tile=svg('svg'),cover=svg('path'),heaps=svg('path');
  tile.setAttribute('viewBox','0 0 1000 24');tile.setAttribute('preserveAspectRatio','none');
  cover.classList.add('winter-powder-v228');heaps.classList.add('winter-heaps-v228');
  tile.append(cover,heaps);node.append(tile);node.dataset.snowShelf=kind;
  const saved=kind==='bubble'?memo.get(host):null,size=kind==='bubble'?28:kind==='icon'?12:72;
  const rec={host,node,kind,tile,cover,heaps,width:(node.clientWidth||1),cells:saved?.cells||new Float32Array(size).fill(1),piles:saved?.piles||[],at:saved?.at??snowTime(performance.now())};
  tracks.set(host,rec);refill(rec,snowTime(performance.now()));draw(rec);scheduleRefill();
 }
 function forget(rec){
  tracks.delete(rec.host);refills.delete(rec);dirty.delete(rec);
  if(gesture?.rec===rec)gesture=null;
  if(press?.rec===rec)press=null;
  if(rec.kind==='bubble'){
   if(enabled&&rec.host.isConnected)memo.set(rec.host,{cells:rec.cells,piles:rec.piles,at:rec.at});
   rec.node.remove();
  }else if(rec.kind==='sidebar')rec.node.remove();
  else{rec.tile.remove();delete rec.node.dataset.snowShelf;}
 }
 function makeTrack(host,cls,kind){
  if(tracks.has(host))return;
  const node=document.createElement('span');node.className=cls;node.setAttribute('aria-hidden','true');
  host.append(node);mount(host,node,kind);
 }
 function mountBubble(host){
  if(!enabled||!watched.has(host))return;
  makeTrack(host,'winter-bubble-cap-v226','bubble');
 }
 const view=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(entry.isIntersecting)mountBubble(entry.target);
   else{const rec=tracks.get(entry.target);if(rec)forget(rec);}
  }
 },{root:messages}):null;
 function updateMessages(){
  const next=new Set();
  for(const row of messages.children){
   if(!row.classList.contains('msg'))continue;
   const bubble=row.querySelector('.msg-bubble');
   if(bubble&&!bubble.querySelector(':scope > .tele-emoji-run-v127'))next.add(bubble);
  }
  for(const bubble of watched)if(!next.has(bubble)){
   view?.unobserve(bubble);watched.delete(bubble);const rec=tracks.get(bubble);if(rec)forget(rec);
  }
  for(const bubble of next)if(!watched.has(bubble)){watched.add(bubble);view?.observe(bubble);}
  if(!view){
   const visible=messages.getBoundingClientRect();
   for(const bubble of next){
    const r=bubble.getBoundingClientRect(),rec=tracks.get(bubble);
    if(r.bottom>visible.top&&r.top<visible.bottom)mountBubble(bubble);else if(rec)forget(rec);
   }
  }
 }
 function refill(rec,now){
  const gain=Math.max(0,(now-rec.at)/settleMs);rec.at=now;
  let incomplete=false;
  for(let i=0;i<rec.cells.length;i++){
   if(rec.cells[i]<1){rec.cells[i]=Math.min(1,rec.cells[i]+gain);if(rec.cells[i]<.9999)incomplete=true;else rec.cells[i]=1;}
  }
  if(incomplete)refills.add(rec);else refills.delete(rec);
 }
 function scheduleRefill(){
  if(!falling||!refills.size||refillTimer)return;
  refillTimer=setTimeout(()=>{
   refillTimer=0;
   const now=snowTime(performance.now());
   for(const rec of refills){refill(rec,now);paint(rec);}
   scheduleRefill();
  },420);
 }
 const heapWidth=mass=>clamp(9+Math.sqrt(mass)*5.2,10,94);
 function draw(rec){
  const {cells,piles,width}=rec,count=cells.length;
  const profile=i=>i>=count?24:24-cells[i]*Math.min(1,(i+.3)/1.9,(count-i-.7)/1.9)*
   (3.9+Math.sin(i*1.58)*.62+Math.cos(i*.47)*.48);
  let d='M0 24V'+n(profile(0));
  for(let i=0;i<count;i++){
   const x0=i/count*1000,x1=(i+1)/count*1000,y=profile(i);
   d+='Q'+n((x0+x1)/2)+' '+n(y)+' '+n(x1)+' '+n(i===count-1?24:(y+profile(i+1))/2);
  }
  rec.cover.setAttribute('d',d+'V24Z');
  rec.heaps.setAttribute('d',piles.map(p=>{
   const x=p.x*1000,w=Math.min(490,heapWidth(p.mass)/Math.max(18,width)*1000)/2;
   const l=clamp(x-w,0,1000),r=clamp(x+w,0,1000);
   const h=clamp(2.7+Math.sqrt(p.mass)*1.65,3,21),peak=23-h;
   return 'M'+n(l)+' 23C'+n(l+w*.37)+' 22 '+n(x-w*.49)+' '+n(peak+1.1)+' '+n(x-w*.12)+' '+n(peak)+
    'S'+n(x+w*.35)+' '+n(peak+1.6)+' '+n(x+w*.55)+' '+n(peak+h*.44)+
    'Q'+n(x+w*.83)+' '+n(peak+h*.82)+' '+n(r)+' 23L'+n(r)+' 24H'+n(l)+'Z';
  }).join(' '));
 }
 function paint(rec){
  dirty.add(rec);
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;for(const track of dirty)draw(track);dirty.clear();});
 }
 function setupIce(){
  const art=window.exstraMeshV229;if(!art||iceMounted)return;
  iceMounted=true;
  const m=art.mesh();
  m.lathe([-.53,0,0],[[-.94,.012],[-.36,.105],[.03,.18],[.19,.28],[.27,.42]],'#b8e4f7',8,[0,0,-.10],.62);
  m.lathe([.45,.12,.06],[[-.67,.009],[-.23,.111],[.10,.22],[.23,.32]],'#a6cdeb',7,[0,0,.14],.70);
  const drawing='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 35"><g stroke-width=".22">'+
   art.draw(m.faces,{yaw:.14,pitch:0,roll:0,scale:25,x:31,y:8})+'</g></svg>';
  screen.style.setProperty('--winter-icicles-mesh-v229','url("data:image/svg+xml,'+encodeURIComponent(drawing)+'")');
 }
 function sync(){
  const next=winter.getState(),newFalling=next.snowActive&&canMove();
  if(falling!==newFalling){
   const now=performance.now();
   if(falling)snowElapsed+=now-snowStarted;
   else snowStarted=now;
   falling=newFalling;
  }
  if(!falling&&refillTimer){clearTimeout(refillTimer);refillTimer=0;}
  if(!next.active||owner!==next.owner){
   enabled=false;
   for(const bubble of watched)view?.unobserve(bubble);
   watched.clear();for(const rec of tracks.values())forget(rec);
   memo=new WeakMap();snowElapsed=0;snowStarted=performance.now();owner=next.owner;
  }
  enabled=next.active;
  if(!enabled||!canMove()){
   for(const burst of bursts)burst.remove();bursts.clear();
   gesture=null;press=null;shake?.cancel();shake=null;
  }
  if(!enabled)return;
  setupIce();
  const sidebar=document.getElementById('sidebar');
  if(sidebar)makeTrack(sidebar,'winter-sidebar-shelf-v228','sidebar');
  for(const node of screen.querySelectorAll('#input-area>.winter-ridge-v225,.winter-icon-snow-v225'))
   if(node.parentElement)mount(node.parentElement,node,node.classList.contains('winter-icon-snow-v225')?'icon':'shelf');
  for(const rec of tracks.values())if(!rec.host.isConnected||rec.node.parentElement!==rec.host)forget(rec);
  updateMessages();scheduleRefill();
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
 function box(rec){const r=rec.node.getBoundingClientRect();rec.width=r.width||rec.width;return r;}
 function contact(event,fullBubble=false){
  const {clientX:x,clientY:y}=event,t=event.target;
  let host=t?.closest?.('.msg-bubble,#input-area,#sidebar,.section-rail-v109 button');
  if(!host&&t?.closest?.('#messages'))
   host=document.elementFromPoint(x,y+9)?.closest('.msg-bubble,#input-area');
  // The shelf extends a few pixels into the message area above the composer.
  if(!host&&t?.closest?.('.chat-main'))host=document.getElementById('input-area');
  let rec=tracks.get(host);
  if(!rec&&host?.closest('#sidebar'))rec=tracks.get(host.closest('#sidebar'));
  if(!rec||rec.node.hidden)return null;
  const r=box(rec),near=x>=r.left-3&&x<=r.right+3&&y>=r.bottom-19&&y<=r.bottom+6;
  return r.width>0&&(near||fullBubble&&(rec.kind==='bubble'||rec.kind==='icon'))?{rec,r}:null;
 }
 function take(rec,from,to){
  const {cells,width}=rec;
  const lo=clamp(Math.min(from,to),0,1)*cells.length,hi=clamp(Math.max(from,to),0,1)*cells.length;
  let mass=0;
  for(let i=Math.floor(lo);i<Math.ceil(hi);i++){
   const part=Math.min(cells[i],Math.min(i+1,hi)-Math.max(i,lo));
   cells[i]-=part;mass+=part*width/cells.length;
  }
  if(mass){refills.add(rec);scheduleRefill();}
  return mass;
 }
 function spill(x,y,direction,mass){
  if(bursts.size>=3)return;
  if(!overlay){
   overlay=document.createElement('div');overlay.className='winter-spills-v226';overlay.setAttribute('aria-hidden','true');overlay.inert=true;
   document.body.append(overlay);
  }
  const burst=document.createElement('div');burst.className='winter-spill-v226';burst.style.left=x+'px';burst.style.top=y+'px';
  const size=heapWidth(mass);
  for(let i=0;i<10;i++){
   const grain=document.createElement('i'),chunk=i<2;
   if(chunk)grain.className='winter-spill-chunk-v227';
   const speed=direction*(25+Math.random()*31)+(Math.random()-.5)*(chunk?12:28);
   grain.style.setProperty('--spill-start',((i-4.5)*size/12)+'px');
   grain.style.setProperty('--spill-x',n(speed)+'px');
   grain.style.setProperty('--spill-lift',n(-2-Math.random()*11)+'px');
   grain.style.setProperty('--spill-y',n(40+Math.random()*48)+'px');
   grain.style.setProperty('--spill-spin',n(speed*2.6)+'deg');
   grain.style.setProperty('--spill-size',n(chunk?clamp(size*(i===0 ? .34 : .22),7,36):1.6+Math.random()*3)+'px');
   grain.style.setProperty('--spill-duration',Math.round(570+Math.random()*230)+'ms');
   grain.style.setProperty('--spill-delay',i*7+'ms');burst.append(grain);
  }
  bursts.add(burst);overlay.append(burst);setTimeout(()=>{bursts.delete(burst);burst.remove();},880);
 }
 function sweep(g,x,y,now){
  const dx=x-g.x;
  if(now-g.last>900||Math.abs(y-g.y)>13||Math.abs(y-g.startY)>15||Math.abs(dx)>115)return false;
  const rec=g.rec,r=box(rec);
  if(!r.width||y<r.bottom-23||y>r.bottom+10||x<r.left-24||x>r.right+24)return false;
  if(Math.abs(dx)<2)return true;
  const from=(g.x-r.left)/r.width,to=(x-r.left)/r.width,dir=Math.sign(dx);
  const lo=Math.min(from,to),hi=Math.max(from,to);
  refill(rec,snowTime(now));
  let mass=take(rec,from,to),pile=g.pile;
  if(g.direction&&dir!==g.direction)pile=null;
  for(const other of [...rec.piles]){
   const radius=heapWidth(other.mass)*.31/r.width;
   if(other!==pile&&other.x>=lo-radius&&other.x<=hi+radius){
    mass+=other.mass;rec.piles.splice(rec.piles.indexOf(other),1);
   }
  }
  if(mass>0||pile){
   if(!pile){
    if(rec.piles.length>=6)pile=rec.piles.reduce((a,b)=>Math.abs(a.x-to)<Math.abs(b.x-to)?a:b);
    else{pile={mass:0,x:to};rec.piles.push(pile);}
   }
   pile.mass+=mass;
   const edge=(dir>0?to>=.985:to<=.015),half=Math.min(.31,heapWidth(pile.mass)*.46/r.width);
   if(edge&&pile.mass>1.8){
    spill(dir>0?r.right:r.left,r.bottom-3,dir,pile.mass);
    rec.piles.splice(rec.piles.indexOf(pile),1);pile=null;
   }else pile.x=clamp(to+dir*half*.42,half,1-half);
   paint(rec);
  }
  g.x=x;g.y=y;g.last=now;g.direction=dir;g.pile=pile;g.moved=true;
  return true;
 }
 const start=(rec,event)=>({rec,x:event.clientX,y:event.clientY,startY:event.clientY,last:performance.now(),pile:null});
 screen.addEventListener('pointermove',event=>{
  if(!enabled||!canMove())return;
  const {clientX:x,clientY:y,pointerType}=event;
  if(pointerType==='touch'){
   if(press?.id!==event.pointerId||!gesture)return;
   if(Math.abs(x-press.x)<5&&!gesture.moved)return;
   if(!sweep(gesture,x,y,performance.now()))gesture=null;
   return;
  }
  if(event.buttons){gesture=null;return;}
  if(gesture&&sweep(gesture,x,y,performance.now()))return;
  const hit=contact(event);gesture=hit?start(hit.rec,event):null;
 },{passive:true});
 screen.addEventListener('pointerleave',()=>{gesture=null;},{passive:true});
 screen.addEventListener('pointerdown',event=>{
  gesture=null;
  if(!enabled||!canMove()||event.pointerType!=='touch'||!event.isPrimary)return;
  const hit=contact(event,true);
  if(!hit)return;
  const {rec,r}=hit;
  press={rec,id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()};
  if(event.clientY>=r.bottom-19&&event.clientY<=r.bottom+6)gesture=start(rec,event);
 },{passive:true});
 window.addEventListener('pointerup',event=>{
  if(!press||press.id!==event.pointerId)return;
  const p=press;press=null;
  const moved=gesture?.moved;gesture=null;
  if(moved||!enabled||!canMove()||performance.now()-p.t>580||Math.hypot(event.clientX-p.x,event.clientY-p.y)>10)return;
  const rec=p.rec,r=box(rec);
  if(!r.width)return;
  refill(rec,snowTime(performance.now()));
  const x=clamp((p.x-r.left)/r.width,0,1),half=rec.kind==='bubble'||rec.kind==='icon'?1:Math.min(.22,28/r.width);
  let mass=take(rec,x-half,x+half);
  for(const pile of [...rec.piles])if(Math.abs(pile.x-x)<=half){mass+=pile.mass;rec.piles.splice(rec.piles.indexOf(pile),1);}
  if(mass>1.8)spill(r.left+x*r.width,r.bottom-3,x<.5?-1:1,mass);
  paint(rec);
  if(rec.kind==='bubble'||rec.kind==='icon'){
   shake?.cancel();
   shake=rec.host.animate?.([{translate:'0 0'},{translate:'-2px 0'},{translate:'2px 0'},{translate:'0 0'}],{duration:225,easing:'ease-out'});
  }
 },{passive:true});
 window.addEventListener('pointercancel',()=>{press=null;gesture=null;},{passive:true});
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
