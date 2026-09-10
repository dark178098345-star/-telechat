/* Phone-only performance guardrails. The desktop path is never changed. */
(() => {
  'use strict';
  const query=window.matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))');
  const root=document.documentElement, body=document.body;
  const lowPower=/telechat-android/i.test(navigator.userAgent)||(Number(navigator.deviceMemory)||8)<=4||(Number(navigator.hardwareConcurrency)||8)<=4;
  let frame=0;
  function mobile(){return query.matches;}
  function viewport(){
    if(!mobile()){body.classList.remove('telechat-mobile-v100','telechat-mobile-optimized-v100');root.style.removeProperty('--v100-height');root.style.removeProperty('overflow');root.style.removeProperty('width');return;}
    const visual=window.visualViewport;
    const height=Math.max(320,Math.round(visual?.height||window.innerHeight));
    root.style.setProperty('--v100-height',height+'px');
    root.style.overflow='hidden';root.style.width='100%';
    body.classList.add('telechat-mobile-v100');
    body.classList.toggle('telechat-mobile-optimized-v100',lowPower);
    body.classList.toggle('telechat-mobile-keyboard-v100',!!visual&&visual.height<window.innerHeight*.78);
  }
  function prepareMedia(scope=document){
    if(!mobile())return;
    const images=[];const videos=[];
    if(scope.matches?.('img'))images.push(scope);if(scope.matches?.('video'))videos.push(scope);
    scope.querySelectorAll?.('img').forEach(image=>images.push(image));scope.querySelectorAll?.('video').forEach(video=>videos.push(video));
    images.forEach(image=>{if(image.loading!=='lazy')image.loading='lazy';if(image.decoding!=='async')image.decoding='async';});
    videos.forEach(video=>{video.playsInline=true;if(!video.autoplay)video.preload='metadata';});
  }
  function update(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;viewport();prepareMedia();});}
  viewport();prepareMedia();
  query.addEventListener?.('change',update);
  window.addEventListener('resize',update,{passive:true});
  window.addEventListener('orientationchange',update,{passive:true});
  window.visualViewport?.addEventListener('resize',update,{passive:true});
  window.visualViewport?.addEventListener('scroll',update,{passive:true});
  new MutationObserver(records=>{
    if(!mobile())return;
    const added=[];
    records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1&&(node.matches?.('img,video')||node.querySelector?.('img,video')))added.push(node);}));
    if(added.length){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;added.forEach(prepareMedia);});}
  }).observe(document.body,{childList:true,subtree:true});
})();
