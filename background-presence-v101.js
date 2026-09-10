/* TELECHAT BACKGROUND PRESENCE V101 — shows a moon while a device is in the background. */
(() => {
  'use strict';
  const PHONE='__telechat_device_phone_v72__',PC='__telechat_device_pc_v72__';
  const PHONE_BG='__telechat_background_phone_v101__',PC_BG='__telechat_background_pc_v101__';
  const ACTIVE_KEYS=[PHONE,PC],BACKGROUND_KEYS=[PHONE_BG,PC_BG],FRESH_MS=110000,BACKGROUND_MS=15*60*1000,CACHE_MS=30000;
  const cache=new Map();let painting=0,marking=false;
  const phone=()=>Boolean(navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(matchMedia?.('(pointer:coarse)')?.matches&&innerWidth<820));
  const activeKey=()=>phone()?PHONE:PC,backgroundKey=()=>phone()?PHONE_BG:PC_BG;
  const fresh=(ts,limit)=>Number(ts)>0&&Date.now()-Number(ts)<limit;
  async function writeState(background){
    if(marking||(typeof me==='undefined')||!me?.nick||(typeof sb==='undefined'))return;
    marking=true;
    try{
      await sb.from('typing').upsert({chat_key:activeKey(),nick:me.nick,ts:background?0:Date.now()},{onConflict:'chat_key,nick'});
      await sb.from('typing').upsert({chat_key:backgroundKey(),nick:me.nick,ts:background?Date.now():0},{onConflict:'chat_key,nick'});
      cache.delete(String(me.nick).toLowerCase());
    }catch(error){}
    finally{marking=false;}
  }
  async function state(nick){
    const key=String(nick||'').toLowerCase(),old=cache.get(key);
    if(old&&Date.now()-old.checked<CACHE_MS)return old.value;
    let value='';
    try{
      const result=await sb.from('typing').select('chat_key,ts').eq('nick',nick).in('chat_key',[...ACTIVE_KEYS,...BACKGROUND_KEYS]);
      const rows=result.data||[];
      const active=rows.some(row=>ACTIVE_KEYS.includes(row.chat_key)&&fresh(row.ts,FRESH_MS));
      const background=rows.some(row=>BACKGROUND_KEYS.includes(row.chat_key)&&fresh(row.ts,BACKGROUND_MS));
      value=active?'online':background?'background':'';
    }catch(error){}
    cache.set(key,{value,checked:Date.now()});return value;
  }
  function moon(){const node=document.createElement('span');node.className='presence-moon-v101';node.textContent='☾';node.title='Приложение в фоне';node.setAttribute('aria-label','Приложение в фоне');return node;}
  function applyAvatar(avatar,value){if(!avatar)return;avatar.classList.toggle('av-background-v101',value==='background');if(value==='background')avatar.classList.remove('av-online');}
  async function paintChat(){
    if(!currentChat)return;
    const element=document.getElementById('chat-status-text');if(!element||element.classList.contains('typing'))return;
    const nick=String(currentChat),token=++painting,value=await state(nick);
    if(token!==painting||String(currentChat)!==nick||element.classList.contains('typing'))return;
    element.querySelector('.presence-moon-v101')?.remove();element.classList.remove('background-v101');applyAvatar(document.getElementById('chat-av'),value);
    if(value==='background'){element.textContent='в фоне';element.classList.add('background-v101');element.append(moon());}
  }
  async function paintContacts(){
    const rows=[...document.querySelectorAll('.contact[data-contact-nick]')];
    await Promise.all(rows.map(async row=>{
      const value=await state(row.dataset.contactNick),avatar=row.querySelector('.av'),name=row.querySelector('.contact-name');
      applyAvatar(avatar,value);name?.querySelector('.presence-moon-v101')?.remove();
      if(value==='background'&&name){const badge=moon();badge.title='Приложение в фоне';name.append(badge);}
    }));
  }
  async function paintProfile(nick){
    const seen=document.getElementById('view-profile-seen');if(!seen||!nick)return;
    const value=await state(nick);seen.classList.remove('background-v101');seen.querySelector('.presence-moon-v101')?.remove();
    if(value==='background'){seen.textContent='в фоне';seen.classList.add('background-v101');seen.prepend(moon());}
  }
  const oldStatus=window.updateStatusBar;
  if(typeof oldStatus==='function')window.updateStatusBar=async function(){const result=await oldStatus.apply(this,arguments);await paintChat();return result;};
  const oldContacts=window.renderContacts;
  if(typeof oldContacts==='function')window.renderContacts=async function(){const result=await oldContacts.apply(this,arguments);await paintContacts();return result;};
  const oldProfile=window.openUserProfile;
  if(typeof oldProfile==='function')window.openUserProfile=async function(nick){const result=await oldProfile.apply(this,arguments);await paintProfile(nick);return result;};
  function refresh(){cache.clear();paintChat();paintContacts();if(typeof viewedProfileNickV5!=='undefined'&&viewedProfileNickV5)paintProfile(viewedProfileNickV5);}
  function becomeBackground(){writeState(true);}
  function becomeActive(){writeState(false);refresh();}
  document.addEventListener('visibilitychange',()=>document.visibilityState==='hidden'?becomeBackground():becomeActive());
  window.addEventListener('pagehide',becomeBackground,{passive:true});
  window.addEventListener('pageshow',becomeActive,{passive:true});
  setInterval(()=>{if(document.visibilityState==='visible'){writeState(false);refresh();}},45000);
  window.telechatBackgroundPresenceV101={refresh,markBackground:becomeBackground,markActive:becomeActive,state};
  if(typeof me!=='undefined'&&me&&document.visibilityState==='visible')writeState(false);
})();
