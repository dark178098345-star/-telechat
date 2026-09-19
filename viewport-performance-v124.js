/* Suspend decorative avatar video outside the viewport; never touch music/calls. */
(() => {
  'use strict';
  if(!window.IntersectionObserver)return;
  const selector='video.avatar-video,.av video,.room-avatar video,#view-profile-avatar video';
  const tracked=new Map();let nativeHidden=false;
  try{nativeHidden=window.TelechatAndroid?.isInBackground?.()===true;}catch(_){}
  function visible(video,state){return state.inside&&!document.hidden&&!nativeHidden&&video.isConnected&&(!video.checkVisibility||video.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));}
  function sync(video,state){
    if(!visible(video,state)){if(!video.paused)video.pause();return;}
    if(state.resume&&video.paused)video.play().catch(()=>{});
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const state=tracked.get(entry.target);if(state){state.inside=entry.isIntersecting&&entry.intersectionRatio>0;sync(entry.target,state);}}},{threshold:0});
  function add(video){
    if(tracked.has(video)||video.controls)return;
    const state={inside:false,resume:video.autoplay||!video.paused};tracked.set(video,state);
    state.onPlay=()=>{if(!visible(video,state))video.pause();else state.resume=true;};
    video.addEventListener('play',state.onPlay);sync(video,state);observer.observe(video);
  }
  function scan(node){if(node.nodeType!==1&&node!==document)return;if(node.matches?.(selector))add(node);node.querySelectorAll?.(selector).forEach(add);}
  scan(document);
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)scan(node);
    for(const [video,state] of tracked)if(!video.isConnected){observer.unobserve(video);video.removeEventListener('play',state.onPlay);video.pause();tracked.delete(video);}
  }).observe(document.body,{childList:true,subtree:true});
  const syncAll=()=>{for(const [video,state] of tracked)sync(video,state);};
  document.addEventListener('visibilitychange',syncAll,{passive:true});
  window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;syncAll();});
  window.telechatViewportV124={refresh:syncAll,info:()=>({tracked:tracked.size,visible:[...tracked].filter(([video,state])=>visible(video,state)).length})};
})();
