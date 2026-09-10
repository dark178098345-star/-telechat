/* TELECHAT DEVICE PRESENCE V72 — subtle PC/phone status without a new table. */
(()=>{
  'use strict';
  const PHONE_KEY='__telechat_device_phone_v72__',PC_KEY='__telechat_device_pc_v72__';
  const FRESH_MS=110000,CACHE_MS=45000;
  const cache=new Map();let publishAt=0,publishing=false,paintToken=0;
  const isPhone=()=>Boolean(navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(matchMedia?.('(pointer:coarse)')?.matches&&innerWidth<820));
  const ownKey=()=>isPhone()?PHONE_KEY:PC_KEY;

  async function publish(force=false){
    if(document.hidden||!me?.nick||publishing||(!force&&Date.now()-publishAt<42000))return;
    publishing=true;publishAt=Date.now();
    try{await sb.from('typing').upsert({chat_key:ownKey(),nick:me.nick,ts:Date.now()},{onConflict:'chat_key,nick'});}catch(error){}
    finally{publishing=false;}
  }
  async function fetchDevice(nick){
    const key=String(nick||'').toLowerCase(),cached=cache.get(key);
    if(cached&&Date.now()-cached.checkedAt<CACHE_MS)return cached.device;
    let device='';
    try{
      const result=await sb.from('typing').select('chat_key,ts').eq('nick',nick).in('chat_key',[PHONE_KEY,PC_KEY]).order('ts',{ascending:false}).limit(2);
      const latest=(result.data||[]).sort((a,b)=>Number(b.ts||0)-Number(a.ts||0))[0];
      if(latest&&Date.now()-Number(latest.ts||0)<FRESH_MS)device=latest.chat_key===PHONE_KEY?'phone':'pc';
    }catch(error){}
    cache.set(key,{device,checkedAt:Date.now()});return device;
  }
  function iconMarkup(device){
    return device==='phone'
      ?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"></rect><path d="M10 18.2h4"></path></svg>'
      :'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3.5" width="18" height="12.5" rx="2.2"></rect><path d="M8 20h8M12 16v4"></path></svg>';
  }
  async function paint(){
    const token=++paintToken,element=document.getElementById('chat-status-text');
    element?.querySelector('.device-presence-v72')?.remove();
    if(!element||currentRoom||!currentChat||element.classList.contains('typing')||!element.classList.contains('online'))return;
    const nick=String(currentChat),device=await fetchDevice(nick);
    if(token!==paintToken||currentRoom||String(currentChat)!==nick||!device)return;
    const badge=document.createElement('span');badge.className='device-presence-v72 '+device;
    badge.title=device==='phone'?'С телефона':'С компьютера';badge.setAttribute('aria-label',badge.title);badge.innerHTML=iconMarkup(device);
    element.append(badge);
  }

  const previousOnline=updateOnline;
  updateOnline=async function(){const result=await previousOnline();publish();return result;};
  const previousStatus=updateStatusBar;
  updateStatusBar=async function(){const result=await previousStatus();paint();return result;};
  const previousOpenChat=openChat;
  openChat=async function(nick){paintToken++;const result=await previousOpenChat(nick);paint();return result;};
  const previousOpenRoom=openRoom;
  openRoom=async function(room){paintToken++;const result=await previousOpenRoom(room);return result;};
  const previousBack=goBack;
  goBack=function(){paintToken++;return previousBack();};
  const previousLogin=doLogin;
  doLogin=async function(){const result=await previousLogin();if(me){publish(true);setTimeout(paint,300);}return result;};
  setInterval(()=>{if(!document.hidden)publish();},45000);
  window.addEventListener('focus',()=>{publish();paint();});
  window.telechatDevicePresenceV72={publish,refresh:()=>{cache.clear();return paint();},device:()=>isPhone()?'phone':'pc'};
  if(me)publish(true);
})();
