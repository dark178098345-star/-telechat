/* Rare gift ornaments are public, read-only and fetched only for a visible profile. */
(()=>{
 'use strict';
 const modal=document.getElementById('user-profile-modal'),card=modal?.querySelector('.user-profile-card'),avatar=document.getElementById('view-profile-avatar');
 if(!card||!avatar)return;
 const art=window.exstraGiftArtV198;if(!art?.html)return;
 const known=new Set(art.ids?.()||[]),themes=new Set(['violet','blue','cyan','rose','amber','red','green','black','orange','indigo']);
 const cache=new Map(),limit=3,ttl=45000;
 const cleanNick=nick=>typeof nick==='string'?nick.trim().toLowerCase().slice(0,128):'';
 const account=()=>{try{return cleanNick(me?.nick);}catch(_){return '';}};
 let owner=account(),target='',scene=null,shownRows=null,request=null,failed='',opened=false,nativeHidden=false,intersects=true,queued=false,frame=0;
 const isOpen=()=>modal.classList.contains('show');
 const visible=()=>isOpen()&&!document.hidden&&!nativeHidden&&intersects&&card.getAttribute('aria-busy')!=='true'&&!card.querySelector('.user-profile-body')?.inert;
 function abort(){if(request){request.controller.abort();request=null;}}
 function stopGeometry(){if(frame)cancelAnimationFrame(frame);frame=0;}
 function clearScene(){
  stopGeometry();if(scene){scene.replaceChildren();art.watch?.(scene);scene.remove();scene=null;}shownRows=null;
 }
 function place(){
  frame=0;if(!scene?.isConnected||!visible())return;
  const a=avatar.getBoundingClientRect(),c=card.getBoundingClientRect();
  if(!a.width||!a.height)return;
  scene.style.left=(a.left+a.width/2-c.left+card.scrollLeft-card.clientLeft)+'px';
  scene.style.top=(a.top+a.height/2-c.top+card.scrollTop-card.clientTop)+'px';
  scene.style.setProperty('--gift-orbit-size',Math.min(a.width,a.height)+'px');
 }
 function queuePlace(){if(!frame&&scene&&visible())frame=requestAnimationFrame(place);}
 function draw(rows){
  if(shownRows===rows&&scene?.isConnected){queuePlace();return;}
  clearScene();shownRows=rows;if(!rows.length)return;
  scene=document.createElement('div');scene.className='profile-gift-orbit-v233';scene.setAttribute('aria-hidden','true');
  scene.dataset.giftCount=String(rows.length);scene.dataset.giftTheme=rows[0].theme;
  const glow=document.createElement('span');glow.className='profile-gift-glow-v233';scene.append(glow);
  rows.forEach((gift,index)=>{
   const orb=document.createElement('span');orb.className='profile-gift-satellite-v233';
   orb.dataset.giftTheme=gift.theme;orb.dataset.giftOrbitItem=gift.id;orb.style.setProperty('--gift-orbit-index',index);
   orb.innerHTML=art.html(gift.id);scene.append(orb);
  });
  for(let i=0;i<3;i++){const glint=document.createElement('i');glint.className='profile-gift-glint-v233';glint.style.setProperty('--gift-glint-index',i);scene.append(glint);}
  card.append(scene);place();art.watch?.(scene);
 }
 function cacheRows(nick,rows){
  cache.delete(nick);cache.set(nick,{rows,at:Date.now()});
  if(cache.size>32)cache.delete(cache.keys().next().value);
 }
 function requestRows(nick){
  const ctx={nick,owner,controller:new AbortController()};request=ctx;
  const timer=setTimeout(()=>ctx.controller.abort(),6000);
  const aborted=new Promise((_,reject)=>ctx.controller.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));
  Promise.race([Promise.resolve().then(()=>{
   if(ctx.controller.signal.aborted)return null;
   // Do not load names, messages, prices or other users' gift data for decoration.
   let q=sb.from('user_gifts').select('gift_id,theme,owner_nick,limited').eq('owner_nick',nick).eq('limited',true)
    .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(12);
   if(q.abortSignal)q=q.abortSignal(ctx.controller.signal);return q;
  }),aborted]).then(result=>{
   if(request!==ctx||owner!==ctx.owner||owner!==account()||target!==nick||!isOpen())return;
   if(result?.error||!Array.isArray(result?.data))throw Error('unavailable');
   const rows=[],seen=new Set();
   for(const gift of result.data){
    const id=gift?.gift_id;if(!known.has(id)||gift.owner_nick!==nick||gift.limited!==true||seen.has(id))continue;
    seen.add(id);rows.push({id,theme:themes.has(gift.theme)?gift.theme:'violet'});if(rows.length===limit)break;
   }
   cacheRows(nick,rows);
   if(visible()){draw(rows);if(scene)scene.dataset.running='true';}
  }).catch(()=>{if(request===ctx)failed=nick;}).finally(()=>{clearTimeout(timer);if(request===ctx)request=null;});
 }
 function reconcile(){
  queued=false;
  const nowOpen=isOpen(),viewer=account();
  if(viewer!==owner){owner=viewer;abort();clearScene();cache.clear();failed='';}
  if(nowOpen!==opened){
   opened=nowOpen;intersects=true;
   if(nowOpen){observation?.observe(avatar);sizing?.observe(avatar);sizing?.observe(card);}
   else{observation?.disconnect();sizing?.disconnect();abort();clearScene();target='';failed='';}
  }
  if(!visible()||!target||!owner){
   if(scene)scene.dataset.running='false';
   if(request){abort();failed='';}
   return;
  }
  const existing=cache.get(target);
  if(existing){
   draw(existing.rows);if(scene)scene.dataset.running='true';
   if(Date.now()-existing.at<ttl)return;
  }
  if(!request&&failed!==target)requestRows(target);
 }
 function schedule(){if(!queued){queued=true;queueMicrotask(reconcile);}}
 const observation=typeof IntersectionObserver==='function'?new IntersectionObserver(([entry])=>{
  if(isOpen()&&entry?.target===avatar){intersects=entry.isIntersecting;schedule();}
 },{root:card,threshold:.04}):null;
 const sizing=typeof ResizeObserver==='function'?new ResizeObserver(queuePlace):null;
 const changes=new MutationObserver(schedule);changes.observe(modal,{attributes:true,attributeFilter:['class']});changes.observe(card,{attributes:true,attributeFilter:['aria-busy']});
 // Layout can change while open without resizing the fixed-size avatar.
 new MutationObserver(queuePlace).observe(document.body,{attributes:true,attributeFilter:['data-profile-layout-v196','class']});
 window.addEventListener('resize',queuePlace,{passive:true});
 document.addEventListener('visibilitychange',schedule);
 window.addEventListener('telechat-native-visibility',e=>{nativeHidden=e.detail?.background===true;schedule();});
 window.addEventListener('telechat-account-ready-v175',()=>{target='';cache.clear();failed='';abort();clearScene();schedule();});
 function profile(user){
  const nick=cleanNick(user?.nick);
  if(nick!==target){target=nick;failed='';intersects=true;abort();clearScene();}
  schedule();
 }
 function invalidate(nick){
  nick=cleanNick(nick);if(!nick)return;cache.delete(nick);
  if(nick===target){abort();failed='';schedule();}
 }
 window.exstraProfileGiftOrbitV233=Object.freeze({profile,invalidate});
})();
