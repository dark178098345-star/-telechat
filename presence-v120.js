/* Shared presence for chat headers, avatars and profiles. No per-contact polling. */
(() => {
  'use strict';
  const model=window.telechatPresenceModelV120;if(!model||typeof sb==='undefined')return;
  const $=id=>document.getElementById(id),normalize=model.normalize;
  const phone=()=>Boolean(navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent)));
  const account=()=>{try{return normalize(me?.nick);}catch(_){return '';}};
  const chat=()=>{try{return currentRoom?'':normalize(currentChat);}catch(_){return '';}};
  const profile=()=>{try{return normalize(viewedProfileNickV5);}catch(_){return '';}};
  const blocked=nick=>!!window.telechatIsBlockedV74?.(nick);
  const rows=new Map(),seen=new Map(),checked=new Map(),live=new Map(),departed=new Map();
  let session=null,channel=null,connected=false,generation=0,fetchJob=null,paintTimer=0,refreshTimer=0,clockOffset=0,clockReady=false,shutdown=false,nativeHidden=false;
  try{nativeHidden=window.TelechatAndroid?.isInBackground?.()===true;}catch(_){}
  let pendingTrack=null,tracking=false,retryTimer=0,retryDelay=1000,lastLegacyWrite=0,reconnectTimer=0,reconnectDelay=1000,connectionFailed=false,closingChannel=null;
  const now=()=>Date.now()+clockOffset;
  function stateKind(){return shutdown||navigator.onLine===false?'offline':document.hidden||nativeHidden?'background':'online';}
  function cachedUser(nick){try{return Number(userCache[nick]?.last_seen)||0;}catch(_){return 0;}}
  function value(nick,lastSeen=0){nick=normalize(nick);if(blocked(nick))return {state:'offline',device:'',lastSeen:0};
    const peerLive=connected?[...live.values()].filter(x=>x.nick===nick):[];
    return model.reduce({rows:rows.get(nick)||[],live:peerLive,departed,lastSeen:Math.max(seen.get(nick)||0,lastSeen,cachedUser(nick)),now:now(),available:navigator.onLine!==false&&(peerLive.length>0||now()-(checked.get(nick)||0)<65000)});
  }
  function syncOwn(row){const items=(rows.get(row.nick)||[]).filter(x=>x.chat_key!==row.chat_key);items.push(row);rows.set(row.nick,items);checked.set(row.nick,now());schedulePaint();}
  async function request(method,path,body,keepalive=false){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000),start=Date.now();
    try{const response=await fetch(SUPABASE_URL+'/rest/v1/'+path,{method,headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:method==='POST'?'resolution=ignore-duplicates,return=minimal':'return=minimal'},body:body?JSON.stringify(body):undefined,keepalive,signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error('presence '+response.status);
      const date=Date.parse(response.headers.get('date')||'');if(!clockReady&&Number.isFinite(date)&&Date.now()-start<4000)clockOffset=date-(start+Date.now())/2;
      return response;
    }finally{clearTimeout(timer);}
  }
  function endpoint(s,stamp){return 'typing?chat_key=eq.'+encodeURIComponent(s.key)+'&nick=eq.'+encodeURIComponent(s.nick)+(stamp===undefined?'':'&ts=lt.'+stamp);}
  async function persist(s,snapshot,terminal=false){
    if(navigator.onLine===false)return;
    try{
      // Initialise offline. Even an interrupted first request cannot create a ghost online session.
      if(!s.ready){if(!s.initialising)s.initialising=request('POST','typing?on_conflict=chat_key,nick',{chat_key:s.key,nick:s.nick,ts:model.encode(s.createdAt,'offline')},terminal).then(()=>{s.ready=true;}).finally(()=>{s.initialising=null;});await s.initialising;}
      const stamp=model.encode(snapshot.at,snapshot.state);
      // Conditional PATCH makes delayed/reordered requests unable to undo a newer state.
      await request('PATCH',endpoint(s,stamp),{ts:stamp},terminal);
      if(session!==s)return;s.persistedAt=now();retryDelay=1000;
      if(snapshot.state==='online'&&now()-lastLegacyWrite>25000){lastLegacyWrite=now();sb.from('users').update({last_seen:snapshot.at}).eq('nick',s.nick).lt('last_seen',snapshot.at).then(result=>{if(result.error)lastLegacyWrite=0;}).catch(()=>{lastLegacyWrite=0;});}
    }catch(_){if(session!==s||shutdown||navigator.onLine===false)return;clearTimeout(retryTimer);retryTimer=setTimeout(()=>publish(true),retryDelay);retryDelay=Math.min(15000,retryDelay*2);}
  }
  async function trackLatest(){if(tracking||!connected||!channel)return;tracking=true;const ownChannel=channel;
    try{while(pendingTrack&&connected&&ownChannel===channel){const item=pendingTrack;pendingTrack=null;const result=await ownChannel.track(item);if(result!=='ok'&&ownChannel===channel){pendingTrack=pendingTrack||item;break;}}}catch(_){/* The next heartbeat or reconnect retries the latest state. */}finally{tracking=false;}
  }
  function publish(force=false){ensureAccount();const s=session;if(!s)return Promise.resolve();const kind=stateKind(),changed=s.state!==kind;if(!force&&!changed&&now()-s.sentAt<(kind==='background'?45000:25000))return Promise.resolve();
    s.at=Math.max(Math.floor(now()),s.at+1);s.state=kind;s.sentAt=now();const snapshot={key:s.key,nick:s.nick,device:s.device,state:kind,at:s.at};
    syncOwn({chat_key:s.key,nick:s.nick,ts:model.encode(s.at,kind)});pendingTrack=snapshot;trackLatest();
    return persist(s,snapshot,document.hidden||shutdown);
  }
  function syncLive(ownChannel){if(channel!==ownChannel||!connected)return;const next=new Map();
    for(const entries of Object.values(ownChannel.presenceState()))for(const item of entries||[]){if(typeof item.key!=='string'||!item.key.startsWith(model.PREFIX)||!normalize(item.nick)||!['online','background','offline'].includes(item.state))continue;const old=next.get(item.key);if(!old||Number(item.at)>old.at)next.set(item.key,{key:item.key,nick:normalize(item.nick),device:item.device==='phone'?'phone':'pc',state:item.state,at:Math.min(Number(item.at)||now(),now()+15000)});}
    for(const [key,old] of live){const nextItem=next.get(key);if(!nextItem){departed.set(key,{at:now(),state:old.state});if(old.state==='online')seen.set(old.nick,Math.max(seen.get(old.nick)||0,now()));}else if(old.state==='online'&&nextItem.state!=='online')seen.set(old.nick,Math.max(seen.get(old.nick)||0,nextItem.at));}
    live.clear();for(const [key,item] of next){live.set(key,item);departed.delete(key);}
    schedulePaint();
  }
  function connect(){if(!session||channel||shutdown||closingChannel)return;const version=generation;connectionFailed=false;
    const ownChannel=sb.channel('telechat-presence-v120',{config:{presence:{key:session.key}}});channel=ownChannel;
    ownChannel.on('presence',{event:'sync'},()=>syncLive(ownChannel)).subscribe(status=>{
      if(channel!==ownChannel||version!==generation)return;
      connected=status==='SUBSCRIBED';
      if(connected){connectionFailed=false;reconnectDelay=1000;clearTimeout(reconnectTimer);syncLive(ownChannel);publish(true);refresh(true);}
      else if(['CLOSED','CHANNEL_ERROR','TIMED_OUT'].includes(status)){connectionFailed=true;schedulePaint();clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>{if(channel!==ownChannel||shutdown||navigator.onLine===false)return;disconnect();connect();},reconnectDelay);reconnectDelay=Math.min(30000,reconnectDelay*2);}
    });
  }
  function disconnect(){clearTimeout(reconnectTimer);const previous=channel;channel=null;connected=false;pendingTrack=null;live.clear();if(previous){const closing=Promise.resolve(sb.removeChannel(previous)).catch(()=>{});closingChannel=closing;closing.finally(()=>{if(closingChannel!==closing)return;closingChannel=null;if(session&&!shutdown&&!channel&&navigator.onLine!==false)connect();});}}
  function ensureAccount(){if(!clockReady)return;const nick=account();if(session?.nick===nick||!session&&!nick)return;if(session){const old=session;old.at=Math.max(Math.floor(now()),old.at+1);persist(old,{state:'offline',at:old.at},true);}
    ++generation;disconnect();session=null;lastLegacyWrite=0;clearTimeout(retryTimer);rows.clear();seen.clear();checked.clear();departed.clear();
    if(!nick)return;shutdown=false;const device=phone()?'phone':'pc';session={nick,key:model.PREFIX+crypto.randomUUID()+':'+device,device,createdAt:Math.floor(now())-1,at:0,state:'',sentAt:0,ready:false};connect();
    // Only our old, expired presence rows. Never delete typing, privacy settings or another live device.
    sb.from('typing').delete().eq('nick',nick).like('chat_key',model.PREFIX+'%').lt('ts',model.encode(now()-86400000,'offline')).then(()=>{}).catch(()=>{});
  }
  function watched(){const result=new Set([chat(),profile()]);document.querySelectorAll('.contact[data-contact-nick]').forEach(row=>result.add(normalize(row.dataset.contactNick)));result.delete('');return [...result];}
  async function refresh(force=false,extra=''){
    ensureAccount();if(!session||document.hidden||navigator.onLine===false)return;if(fetchJob)return fetchJob.then(()=>refresh(false,extra));
    const nicks=[...new Set([...watched(),normalize(extra)])].filter(n=>n&&(force||now()-(checked.get(n)||0)>20000));if(!nicks.length){schedulePaint();return;}
    const version=generation;
    fetchJob=(async()=>{for(let i=0;i<nicks.length;i+=80){const group=nicks.slice(i,i+80);
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
      try{const [modern,legacy,users]=await Promise.all([
        sb.from('typing').select('chat_key,nick,ts').in('nick',group).like('chat_key',model.PREFIX+'%').gte('ts',model.encode(now()-86400000,'offline')).abortSignal(controller.signal),
        sb.from('typing').select('chat_key,nick,ts').in('nick',group).in('chat_key',model.LEGACY).gte('ts',now()-120000).abortSignal(controller.signal),
        sb.from('users').select('nick,last_seen').in('nick',group).abortSignal(controller.signal)
      ]);if(version!==generation)return;if(modern.error||legacy.error||users.error)continue;
        const all=[...(modern.data||[]),...(legacy.data||[])];for(const nick of group){const previous=rows.get(nick)||[];const incoming=all.filter(x=>normalize(x.nick)===nick);
          // A slow SELECT must not undo a newer local write or realtime observation.
          for(const item of previous){const next=incoming.find(x=>x.chat_key===item.chat_key);if(item.chat_key.startsWith(model.PREFIX)&&Number(item.ts)>=model.encode(now()-86400000,'offline')&&Number(item.ts)>Number(next?.ts||0)){if(next)next.ts=item.ts;else incoming.push(item);}}
          rows.set(nick,incoming);checked.set(nick,now());}
        for(const u of users.data||[])seen.set(normalize(u.nick),Math.max(seen.get(normalize(u.nick))||0,Number(u.last_seen)||0));
      }catch(_){/* Retain confirmed state; leases still expire locally. */}finally{clearTimeout(timeout);}
    }})().finally(()=>{fetchJob=null;schedulePaint();});return fetchJob;
  }
  function schedulePaint(){if(paintTimer||document.hidden)return;paintTimer=setTimeout(()=>{paintTimer=0;paint();},40);}
  function avatar(node,v){if(!node)return;node.classList.toggle('av-online',v.state==='online');node.classList.toggle('av-background-v101',v.state==='background');}
  function badge(node,v){let moon=node?.querySelector('.presence-moon-v101');if(v.state!=='background'){moon?.remove();return;}if(node&&!moon){moon=document.createElement('span');moon.className='presence-moon-v101';moon.textContent='☾';moon.title='Приложение в фоне';moon.setAttribute('aria-label',moon.title);node.append(moon);}}
  function status(node,v,isProfile=false,nick=''){
    if(!node)return;const text=blocked(nick)?'был давно':(isProfile&&v.state==='online'?'● сейчас в сети':model.label(v,now()));const signature=[nick,v.state,v.device,text].join('|');
    if(node.dataset.presenceV120===signature&&node.textContent===text+(v.state==='background'?'☾':'')&&node.classList.contains('background-v101')===(v.state==='background')&&node.classList.contains('online')===(v.state==='online')&&(!v.device||isProfile||v.state!=='online'||node.querySelector('.device-presence-v72')))return;
    node.dataset.presenceV120=signature;node.textContent=text;node.classList.toggle('online',v.state==='online');node.classList.toggle('offline',v.state!=='online');node.classList.toggle('background-v101',v.state==='background');
    if(isProfile)node.style.color=v.state==='online'?'var(--green)':v.state==='background'?'#e6c981':'var(--text3)';
    badge(node,v);
    if(v.state==='online'&&v.device&&!isProfile){const icon=document.createElement('span');icon.className='device-presence-v72 '+v.device;icon.title=v.device==='phone'?'С телефона':'С компьютера';icon.setAttribute('aria-label',icon.title);icon.innerHTML=v.device==='phone'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"></rect><path d="M10 18.2h4"></path></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3.5" width="18" height="12.5" rx="2.2"></rect><path d="M8 20h8M12 16v4"></path></svg>';node.append(icon);}
  }
  function paintHeader(nick=chat(),lastSeen=0){if(!nick||chat()!==normalize(nick))return;const node=$('chat-status-text');if(node?.classList.contains('typing')&&!blocked(nick))return;if(blocked(nick))node?.classList.remove('typing');node?.classList.toggle('v74-blocked-status',blocked(nick));const v=value(nick,lastSeen);status(node,v,false,nick);avatar($('chat-av'),v);}
  function paintProfile(nick=profile(),lastSeen=0){if(!nick||profile()!==normalize(nick))return;const v=value(nick,lastSeen);status($('view-profile-seen'),v,true,nick);avatar($('view-profile-avatar'),v);}
  function paint(){paintHeader();paintProfile();document.querySelectorAll('.contact[data-contact-nick]').forEach(row=>{const nick=normalize(row.dataset.contactNick),v=value(nick);avatar(row.querySelector('.av'),v);badge(row.querySelector('.contact-name'),v);});
    const quick=$('profile-quick-v91');if(quick&&!quick.hidden){const own=value(account()),label=navigator.onLine===false?'Нет соединения':own.state==='online'?'В сети':own.state==='background'?'В фоне':'Подключение…',node=quick.querySelector('.pq-online');if(node&&node.dataset.presenceLabel!==label){node.dataset.presenceLabel=label;node.textContent=label;const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');dot.style.background=own.state==='online'?'var(--green)':own.state==='background'?'#e6c981':'var(--text3)';node.prepend(dot);quick.querySelector('.pq-dot')?.style.setProperty('background',dot.style.background);}}
  }
  function wake(){shutdown=false;ensureAccount();if(connectionFailed)disconnect();if(session&&!channel)connect();publish(true);refresh(true);}
  function leave(){if(!session)return Promise.resolve();shutdown=true;clearTimeout(retryTimer);clearTimeout(reconnectTimer);const job=publish(true);disconnect();return job;}
  const oldStatus=window.updateStatusBar;
  window.updateStatusBar=function(){if(!chat()){avatar($('chat-av'),{state:'offline'});return oldStatus?.apply(this,arguments);}paintHeader();return refresh(false,chat()).then(()=>paintHeader());};
  window.updateOnline=()=>publish();
  const oldContacts=window.renderContacts;if(typeof oldContacts==='function')window.renderContacts=async function(...args){const result=await oldContacts.apply(this,args);paint();refresh();return result;};
  const oldProfile=window.openUserProfile;if(typeof oldProfile==='function')window.openUserProfile=async function(nick,...args){const result=await oldProfile.call(this,nick,...args);paintProfile(nick);await refresh(false,nick);paintProfile(nick);return result;};
  const oldLogin=window.doLogin;if(typeof oldLogin==='function')window.doLogin=async function(...args){const result=await oldLogin.apply(this,args);wake();return result;};
  document.addEventListener('visibilitychange',()=>{publish(true);if(!document.hidden)wake();});
  window.addEventListener('pagehide',event=>{if(event.persisted){nativeHidden=true;publish(true);}else leave();},{passive:true});
  window.addEventListener('pageshow',()=>{nativeHidden=false;wake();},{passive:true});
  window.addEventListener('online',wake,{passive:true});window.addEventListener('offline',()=>{publish(true);schedulePaint();},{passive:true});
  window.addEventListener('focus',()=>{if(!document.hidden){publish();refresh();}},{passive:true});
  window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;publish(true);if(!nativeHidden)wake();});
  document.addEventListener('freeze',()=>{nativeHidden=true;publish(true);});document.addEventListener('resume',()=>{nativeHidden=false;wake();});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-nav="profile"]'))schedulePaint();},{passive:true});
  setInterval(()=>{ensureAccount();if(!session||shutdown)return;publish();if(!document.hidden){refresh();paint();}for(const [key,item] of departed)if(now()-item.at>86400000)departed.delete(key);},10000);
  // Guard against an older cached profile renderer painting last_seen over an exact state.
  const observer=new MutationObserver(()=>{schedulePaint();clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh(),100);});
  for(const id of ['contacts-list','chat-status-text','view-profile-seen'])if($(id))observer.observe($(id),{childList:true,subtree:id==='contacts-list',characterData:id!=='contacts-list'});
  window.telechatPresenceV120=Object.freeze({publish,refresh,wake,leave,state:nick=>value(nick),paintHeader,paintProfile});
  window.telechatBackgroundPresenceV101={refresh,markBackground:()=>{nativeHidden=true;return publish(true);},markActive:()=>{nativeHidden=false;wake();},state:async nick=>{await refresh(false,nick);const v=value(nick);return v.state==='offline'?'':v.state;}};
  window.telechatDevicePresenceV72={publish,refresh,device:()=>phone()?'phone':'pc'};
  request('GET','typing?select=ts&limit=0').catch(()=>{}).finally(()=>{clockReady=true;wake();});
})();
