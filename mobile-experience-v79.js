(()=>{
  'use strict';
  const phoneQuery=window.matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))');
  const nativeAndroid=/telechat-android/i.test(navigator.userAgent);
  const lowPower=nativeAndroid||(Number(navigator.deviceMemory)||8)<=4||(Number(navigator.hardwareConcurrency)||8)<=4;
  let frame=0;

  function isPhone(){return phoneQuery.matches;}

  function updateViewport(){
    if(!isPhone()){
      document.body.classList.remove('telechat-mobile-keyboard-v79');
      document.documentElement.style.removeProperty('--v79-mobile-h');
      return;
    }
    const viewport=window.visualViewport;
    const height=Math.max(320,Math.round(viewport?viewport.height:window.innerHeight));
    document.documentElement.style.setProperty('--v79-mobile-h',height+'px');
    const keyboardOpen=!!viewport&&viewport.height<window.innerHeight*.78;
    document.body.classList.toggle('telechat-mobile-keyboard-v79',keyboardOpen);
  }

  function trimDecorations(){
    if(!isPhone())return;
    document.querySelectorAll('.emoji-particle,.shooting-star,.meteor').forEach(node=>node.remove());
    const stars=[...document.querySelectorAll('.cosmic-star')];
    stars.slice(lowPower?12:20).forEach(node=>node.remove());
    document.querySelectorAll('video').forEach(video=>{
      video.playsInline=true;
      if(!video.autoplay)video.preload='metadata';
    });
  }

  function updateMode(){
    const mobile=isPhone();
    document.body.classList.toggle('telechat-mobile-v79',mobile);
    document.body.classList.toggle('telechat-mobile-native-v79',mobile&&nativeAndroid);
    document.body.classList.toggle('telechat-mobile-lowpower-v79',mobile&&lowPower);
    updateViewport();
    if(mobile)requestAnimationFrame(trimDecorations);
  }

  function scheduleUpdate(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;updateViewport();trimDecorations();});
  }

  updateMode();
  phoneQuery.addEventListener?.('change',updateMode);
  window.addEventListener('resize',scheduleUpdate,{passive:true});
  window.addEventListener('orientationchange',scheduleUpdate,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleUpdate,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleUpdate,{passive:true});

  const background=document.getElementById('emojiBg');
  if(background){
    new MutationObserver(scheduleUpdate).observe(background,{childList:true,subtree:true});
  }
})();
