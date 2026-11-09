/* Small raster badges. Explicit identity hooks; no history-wide mutation observer. */
(()=>{'use strict';
 const cache=new Map(),targets=new Map(),queue=new Set();let timer=0,running=false,owner='',generation=0,retryAfter=0,expiryTimer=0;
 const account=()=>{try{return me?.nick||'';}catch(_){return '';}},safe=image=>typeof image==='string'&&image.length<=32768&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image)?image:'';
 function sync(){if(owner!==account()){owner=account();generation++;cache.clear();queue.clear();retryAfter=0;for(const set of targets.values())for(const node of set)node.querySelector(':scope > .nickname-badge-v197')?.remove();targets.clear();clearTimeout(expiryTimer);}}
 function active(v){return !!v?.premium&&(v.forever||!v.until||new Date(v.until).getTime()>Date.now());}
 function paint(target,nick){sync();nick=String(nick||'').trim().toLowerCase();if(!target||!nick||!owner)return;
  const previous=target.dataset.nicknameOwnerV197;if(previous&&previous!==nick)targets.get(previous)?.delete(target);target.dataset.nicknameOwnerV197=nick;
  let set=targets.get(nick);if(!set){set=new Set();targets.set(nick,set);}set.add(target);if(set.size>128)for(const n of set)if(!n.isConnected)set.delete(n);while(set.size>512)set.delete(set.values().next().value);while(targets.size>200)targets.delete(targets.keys().next().value);const item=cache.get(nick),image=active(item)?safe(item.image):'',old=target.querySelector(':scope > .nickname-badge-v197');
  if(!image){old?.remove();}else if(old?.badgeImageV197!==image){old?.remove();const badge=document.createElement('span');badge.className='nickname-badge-v197';badge.badgeImageV197=image;badge.title='Личный значок · Premium';badge.setAttribute('aria-label','Личный значок Premium');const img=new Image(20,20);img.alt='';img.decoding='async';img.src=image;badge.append(img);target.append(badge);}
  if((!item||Date.now()-item.at>60000)&&Date.now()>=retryAfter){queue.add(nick);if(!timer)timer=setTimeout(flush,60);}
 }
 function redraw(nick){for(const node of targets.get(nick)||[]){if(!node.isConnected){targets.get(nick).delete(node);continue;}paint(node,nick);}}
 function expiry(){clearTimeout(expiryTimer);const times=[...cache.values()].filter(v=>v.premium&&!v.forever&&v.until).map(v=>new Date(v.until).getTime()).filter(t=>t>Date.now());if(times.length)expiryTimer=setTimeout(()=>{for(const nick of cache.keys())redraw(nick);expiry();},Math.min(2147483000,Math.max(10,Math.min(...times)-Date.now()+20)));}
 async function flush(){timer=0;sync();if(running||!owner||!queue.size||navigator.onLine===false)return;const nicks=[...queue].slice(0,40);nicks.forEach(n=>queue.delete(n));const g=generation;running=true;let timeout;
  try{let q=sb.from('exstra_badges_public_v197').select('nick,premium,image,premium_until,premium_forever').in('nick',nicks);const c=new AbortController();if(q.abortSignal)q=q.abortSignal(c.signal);const result=await Promise.race([q,new Promise((_,reject)=>timeout=setTimeout(()=>{c.abort();reject(Error('timeout'));},8000))]);if(g!==generation)return;if(result.error)throw result.error;const rows=new Map((result.data||[]).map(v=>[v.nick,v]));for(const nick of nicks){const v=rows.get(nick);cache.set(nick,{premium:!!v?.premium,image:safe(v?.image),until:v?.premium_until,forever:!!v?.premium_forever,at:Date.now()});redraw(nick);}while(cache.size>200)cache.delete(cache.keys().next().value);expiry();}
  catch(_){if(g===generation)retryAfter=Date.now()+60000;}finally{clearTimeout(timeout);running=false;if(queue.size&&Date.now()>=retryAfter&&!timer)timer=setTimeout(flush,60);}
 }
 function initial(){sync();window.enhanceVerifiedBadges?.(document.getElementById('contacts-list'));const nick=account();for(const selector of ['#profile-editor-nick-v88','.phone-self-nick-v159','#profile-quick-v91 .pq-nick']){const node=document.querySelector(selector);if(node)paint(node,nick);}}
 window.addEventListener('exstra-wallet-updated-v197',event=>{sync();const {nick,state}=event.detail||{};if(nick!==owner||!state)return;cache.set(nick,{premium:state.premium,forever:state.forever,until:state.until,image:safe(state.badge),at:Date.now()});redraw(nick);expiry();});
 window.addEventListener('telechat-account-ready-v175',initial);document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();for(const [nick,set]of targets){if([...set].some(n=>n.isConnected&&n.getClientRects().length))redraw(nick);}}});
 window.exstraIdentityV197=Object.freeze({paint,refresh:nick=>{cache.delete(nick);redraw(nick);},sync});initial();
})();
