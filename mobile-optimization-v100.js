/* One phone viewport owner. Legacy CSS classes remain for layout compatibility. */
(()=>{
 'use strict';
 const query=matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))'),root=document.documentElement,body=document.body;
 const native=/telechat-android/i.test(navigator.userAgent),lowPower=native||(Number(navigator.deviceMemory)||8)<=4||(Number(navigator.hardwareConcurrency)||8)<=4;
 let viewportFrame=0,mediaFrame=0;const pending=new Set();
 function set(name,value){if(body.style.getPropertyValue(name)!==value)body.style.setProperty(name,value);}
 function viewport(){
  const phone=query.matches;for(const cls of ['telechat-mobile-v79','telechat-mobile-v100'])body.classList.toggle(cls,phone);
  for(const cls of ['telechat-mobile-lowpower-v79','telechat-mobile-optimized-v100'])body.classList.toggle(cls,phone&&lowPower);
  body.classList.toggle('telechat-mobile-native-v79',phone&&native);
  const visual=window.visualViewport,keyboard=phone&&!!visual&&visual.height<innerHeight*.78;
  for(const cls of ['telechat-mobile-keyboard-v79','telechat-mobile-keyboard-v100'])body.classList.toggle(cls,keyboard);
  if(!phone){for(const prop of ['--v100-height','--v79-mobile-h']){body.style.removeProperty(prop);root.style.removeProperty(prop);}root.style.removeProperty('overflow');root.style.removeProperty('width');return;}
  const height=Math.max(240,Math.round(visual?.height||innerHeight))+'px';set('--v100-height',height);set('--v79-mobile-h',height);root.style.overflow='hidden';root.style.width='100%';
 }
 function prepare(scope){if(!query.matches||!scope.isConnected)return;const nodes=scope.matches?.('img,video')?[scope]:[];scope.querySelectorAll?.('img,video').forEach(n=>nodes.push(n));for(const node of nodes){if(node.tagName==='IMG'){const loading=node.matches('.avatar-photo')||node.closest('.av,.room-avatar')?'eager':'lazy';if(node.loading!==loading)node.loading=loading;if(node.decoding!=='async')node.decoding='async';}else{node.playsInline=true;if(!node.autoplay&&node.preload!=='metadata')node.preload='metadata';}}}
 function queueMedia(scope){pending.add(scope);if(mediaFrame)return;mediaFrame=requestAnimationFrame(()=>{mediaFrame=0;const roots=[...pending];pending.clear();for(const node of roots)if(!roots.some(parent=>parent!==node&&parent.contains(node)))prepare(node);});}
 function update(){if(!viewportFrame)viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;viewport();});}
 function mode(){update();if(query.matches){queueMedia(body);document.querySelectorAll('.emoji-particle,.shooting-star,.meteor').forEach(n=>n.remove());[...document.querySelectorAll('.cosmic-star')].slice(lowPower?12:20).forEach(n=>n.remove());}}
 viewport();mode();query.addEventListener?.('change',mode);window.addEventListener('resize',update,{passive:true});window.addEventListener('orientationchange',update,{passive:true});window.visualViewport?.addEventListener('resize',update,{passive:true});window.visualViewport?.addEventListener('scroll',update,{passive:true});
 new MutationObserver(records=>{if(!query.matches)return;for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&(node.matches('img,video')||node.querySelector('img,video')))queueMedia(node);}).observe(body,{childList:true,subtree:true});
})();
