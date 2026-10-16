/* One local deadline, or one current-track end hook. No extra audio player. */
(()=>{
 'use strict';
 if(window.exstraSleepTimerV176)return;
 const prefix='exstra.sleep.v176.',fadeMs=8000,core=()=>window.telechatMusicV96;
 const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}};
 const id=track=>String(track?.id||track?.url||'');
 let owner='',state=null,timer=0,gain=1;
 function setGain(value){value=Math.max(0,Math.min(1,value));if(Math.abs(gain-value)<.001)return;gain=value;core()?.setSleepGain?.(value);}
 function changed(){window.dispatchEvent(new Event('exstra-sleep-change-v176'));}
 function persist(){try{if(state)sessionStorage.setItem(prefix+owner,JSON.stringify(state));else sessionStorage.removeItem(prefix+owner);}catch(_){}}
 function reset(notify=true){clearTimeout(timer);timer=0;state=null;persist();setGain(1);if(notify)changed();}
 function sync(){
  const next=account();if(next===owner)return;
  reset(false);owner=next;
  try{const value=JSON.parse(sessionStorage.getItem(prefix+owner)||'null');if(owner&&value?.mode==='time'&&Number.isFinite(value.deadline)&&value.deadline>Date.now()&&value.deadline<=Date.now()+10800000)state={mode:'time',deadline:value.deadline};}catch(_){}
  persist();schedule();changed();
 }
 function finish(){
  if(!state||account()!==owner){sync();return false;}
  clearTimeout(timer);timer=0;state=null;persist();setGain(0);
  core()?.pause();
  // A listener must leave, otherwise the next host packet would resume playback.
  const room=window.telechatTogetherV147?.state();if(room&&!room.host)Promise.resolve(window.telechatTogetherV147.leave()).catch(()=>{});
  setGain(1);changed();window.showToast?.('Таймер сна: музыка остановлена.');return true;
 }
 function schedule(){
  clearTimeout(timer);timer=0;
  if(!state||state.mode!=='time')return;
  if(account()!==owner){sync();return;}
  const remaining=state.deadline-Date.now();if(remaining<=0){finish();return;}
  setGain(Math.min(1,remaining/fadeMs));
  timer=setTimeout(schedule,remaining>fadeMs?remaining-fadeMs:Math.min(250,remaining));
 }
 function minutes(value){
  sync();value=Number(value);if(!owner||!Number.isInteger(value)||value<1||value>180)return false;
  reset(false);state={mode:'time',deadline:Date.now()+value*60000};persist();schedule();changed();return true;
 }
 function afterTrack(){
  sync();const playback=core()?.getState();if(!owner||!id(playback?.track))return false;
  reset(false);state={mode:'track',target:id(playback.track)};persist();onPlayback(playback);changed();return true;
 }
 function onPlayback(playback){
  if(account()!==owner)sync();if(!state)return;
  if(state.mode==='time'){if(Date.now()>=state.deadline)finish();return;}
  if(id(playback?.track)!==state.target){reset();return;}
  const remaining=Number(playback.duration)-Number(playback.time);
  setGain(Number.isFinite(remaining)&&Number(playback.duration)>0?Math.max(0,Math.min(1,remaining/(fadeMs/1000))):1);
 }
 function onTrackEnd(track){
  if(account()!==owner){sync();return false;}
  if(state&&(state.mode==='track'&&state.target===id(track)||state.mode==='time'&&Date.now()>=state.deadline))return finish();
  return false;
 }
 window.exstraSleepTimerV176=Object.freeze({setMinutes:minutes,setAfterTrack:afterTrack,cancel:()=>{sync();reset();},sync,
  onTrackEnd,check:()=>{sync();schedule();},getState:()=>state?{...state,remainingMs:state.mode==='time'?Math.max(0,state.deadline-Date.now()):null}:null});
 window.addEventListener('telechat-account-ready-v175',sync);
 window.addEventListener('telechat-user-updated-v123',sync);
 window.addEventListener('telechat-music-progress-v117',event=>onPlayback(event.detail));
 window.addEventListener('pageshow',()=>{sync();schedule();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();schedule();}});
 window.addEventListener('telechat-native-visibility',event=>{if(event.detail?.background===false){sync();schedule();}});
 sync();
})();
