/* TELECHAT PROFILE PERFORMANCE V11 */
(()=>{
  const calm=document.createElement('style');calm.textContent=`
  .profile-load{position:absolute;inset:0;z-index:9;display:flex;opacity:0;visibility:hidden}.profile-load.show{opacity:1;visibility:visible}.profile-load-retry{display:none;margin-top:16px;padding:10px 16px;border:1px solid;border-radius:10px;cursor:pointer}.profile-load.error .profile-load-retry{display:inline-flex}
  #user-profile-modal .user-profile-card{min-height:min(520px,calc(var(--v100-height,100dvh) - 40px))}
  #user-profile-modal .user-profile-close{z-index:12!important}
  #profile-load{background:var(--pc-bg,var(--bg2));align-items:flex-start;justify-content:flex-start;padding:0;pointer-events:none!important;transition:opacity 140ms ease,visibility 140ms ease}
  #profile-load .profile-load-box{width:100%;text-align:left;padding:0 24px 24px}
  #profile-load.show{pointer-events:auto!important}
  .profile-skeleton-cover-v191{height:130px;margin:0 -24px 0;background:var(--bg3)}
  .profile-skeleton-avatar-v191{width:76px;height:76px;border:4px solid var(--pc-bg,var(--bg2));border-radius:22px;background:var(--border);margin-top:-30px;position:relative}
  .profile-skeleton-line-v191{height:12px;margin:18px 0;border-radius:6px;background:var(--bg3);width:68%}.profile-skeleton-line-v191.short{width:36%;height:9px}.profile-skeleton-line-v191.wide{width:100%;height:64px;margin-top:28px;border-radius:14px}
  #profile-load-text{font:500 12px/1.5 system-ui;color:var(--text3);margin-top:24px}#profile-load-retry{pointer-events:auto;color:var(--text);border-color:var(--border);background:var(--bg3);font:500 13px system-ui}
  #profile-load-orbit,.profile-load-orbit{display:none!important;animation:none!important}
  #profile-refresh{display:none!important}#view-profile-avatar{width:84px;height:84px}#view-profile-name{min-height:28px}#view-profile-nick{min-height:18px}
  @media(prefers-reduced-motion:reduce){#profile-load{transition:none}}
  body[data-ui-motion-v184=off] #profile-load{transition:none}
  `;document.head.append(calm);

  const card=document.querySelector('.user-profile-card');
  if(card&&!document.getElementById('profile-load')){
    const refresh=document.createElement('div');refresh.id='profile-refresh';refresh.className='profile-refresh';refresh.textContent='◌ обновляем профиль';card.appendChild(refresh);
    const load=document.createElement('div');load.id='profile-load';load.className='profile-load';load.innerHTML='<div class="profile-load-box"><div class="profile-skeleton-cover-v191" aria-hidden="true"></div><div class="profile-skeleton-avatar-v191" aria-hidden="true"></div><div class="profile-skeleton-line-v191" aria-hidden="true"></div><div class="profile-skeleton-line-v191 short" aria-hidden="true"></div><div class="profile-skeleton-line-v191 wide" aria-hidden="true"></div><div class="profile-load-text" id="profile-load-text" role="status">Загружаем профиль…</div><button class="profile-load-retry" id="profile-load-retry">Повторить</button></div>';card.appendChild(load);
  }

  const lightFields='nick,name,av,status,last_seen,avatar_video,animated_profile',profileFields='nick,name,av,status,bio,banner,last_seen,avatar_video,animated_profile';
  const cache=new Map(),inflight=new Map(),lightInflight=new Map(),times=new Map();let token=0,lastNick='';
  const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}};let owner=account();
  function syncOwner(){if(owner===account())return;owner=account();token++;cache.clear();inflight.clear();lightInflight.clear();times.clear();}
  async function prepareImages(user){const sources=[];try{const photo=unpackProfileData(user.status).photo;if(photo)sources.push(photo);if(/^data:image\/(png|jpeg|webp);base64,/i.test(user.banner||''))sources.push(user.banner);}catch(_){}if(!sources.length)return;let timer;await Promise.race([Promise.allSettled(sources.slice(0,2).map(src=>{const img=new Image();img.src=src;return img.decode?img.decode():Promise.resolve();})),new Promise(r=>timer=setTimeout(r,120))]);clearTimeout(timer);}
  function merge(user){if(window.telechatUserCacheV123)return window.telechatUserCacheV123.merge(user);if(!user||!user.nick)return null;userCache[user.nick]=Object.assign({},userCache[user.nick]||{},user);times.set(user.nick,Date.now());return userCache[user.nick];}
  async function light(nick){
    if(lightInflight.has(nick))return lightInflight.get(nick);
    const task=(async()=>{let r=await sb.from('users').select(lightFields).eq('nick',nick).maybeSingle();if(r.error&&/avatar_video|animated_profile/.test(String(r.error.message)))r=await sb.from('users').select('nick,name,av,status,last_seen').eq('nick',nick).maybeSingle();return r.data?merge(r.data):null;})().finally(()=>lightInflight.delete(nick));
    lightInflight.set(nick,task);return task;
  }
  getUser=async function(nick){if(window.telechatUserCacheV123)return window.telechatUserCacheV123.get(nick);nick=String(nick||'').toLowerCase();if(!nick)return null;const saved=userCache[nick];if(saved){if(Date.now()-(times.get(nick)||0)>45000)light(nick).catch(()=>{});return saved;}return light(nick);};
  async function full(nick,force){
    syncOwner();const actor=owner;
    const saved=cache.get(nick);if(!force&&saved&&Date.now()-saved.time<90000){cache.delete(nick);cache.set(nick,saved);return saved.user;}if(inflight.has(nick))return inflight.get(nick);
    let timer;const controller=new AbortController();const query=fields=>{let q=sb.from('users').select(fields).eq('nick',nick);if(q.abortSignal)q=q.abortSignal(controller.signal);return q.maybeSingle();};
    const deadline=new Promise((_,reject)=>timer=setTimeout(()=>{reject(Error('Не удалось дождаться профиля. Попробуй ещё раз.'));controller.abort();},8000));
    const task=Promise.race([(async()=>{let r=await query(profileFields);if(r.error&&/avatar_video|animated_profile/.test(String(r.error.message)))r=await query('nick,name,av,status,bio,banner,last_seen');if(r.error)throw r.error;if(!r.data)throw Error('Профиль не найден');return r.data;})(),deadline]).then(async data=>{if(actor!==account())throw Error('Аккаунт изменился');await prepareImages(data);if(actor!==account())throw Error('Аккаунт изменился');const user=merge(data);cache.delete(nick);cache.set(nick,{user,time:Date.now(),bytes:JSON.stringify(data).length*2});while(cache.size>24||[...cache.values()].reduce((n,v)=>n+(v.bytes||0),0)>8*1024*1024)cache.delete(cache.keys().next().value);return user;}).finally(()=>{clearTimeout(timer);if(inflight.get(nick)===task)inflight.delete(nick);});
    inflight.set(nick,task);return task;
  }
  function mode(type,text){const load=document.getElementById('profile-load'),refresh=document.getElementById('profile-refresh');if(!load)return;card?.setAttribute('aria-busy',String(type==='load'));const body=card?.querySelector('.user-profile-body');if(body)body.inert=type==='load'||type==='error';load.classList.remove('show','error');refresh.classList.remove('show');if(type==='load'){document.getElementById('profile-load-text').textContent='Загружаем профиль…';load.classList.add('show');}if(type==='refresh')refresh.classList.add('show');if(type==='error'){load.classList.add('show','error');document.getElementById('profile-load-text').textContent=text||'Не удалось загрузить профиль';}}
  const mediaPaints=new WeakMap();
  const suspendedMedia=new Set();
  function syncMedia(){
    const visible=!document.hidden&&document.getElementById('user-profile-modal')?.classList.contains('show');
    card?.querySelectorAll('video').forEach(video=>{
      if(!visible){if(!video.paused||video.autoplay)suspendedMedia.add(video);video.pause();}
      else if(suspendedMedia.delete(video))video.play()?.catch(()=>{});
    });
    for(const video of suspendedMedia)if(!video.isConnected)suspendedMedia.delete(video);
  }
  document.addEventListener('visibilitychange',syncMedia);
  function paintMedia(element,key,render){
    const previous=mediaPaints.get(element);
    if(previous&&previous.key===key&&previous.child===element.firstChild)return;
    render();mediaPaints.set(element,{key,child:element.firstChild});
  }
  function paint(user,complete){
    viewedProfileNickV5=user.nick;
    const avatar=document.getElementById('view-profile-avatar');
    const data=unpackProfileData(user.status);
    paintMedia(avatar,JSON.stringify([user.nick,user.av,data.photo||'',user.avatar_video]),()=>setAvatarElement(avatar,user));
    const name=document.getElementById('view-profile-name');if(name.textContent!==(user.name||user.nick))name.textContent=user.name||user.nick;
    const handle=document.getElementById('view-profile-nick'),identity=JSON.stringify([user.nick,user.role,user.verified]);
    if(handle.dataset.identityV167!==identity){handle.dataset.identityV167=identity;handle.innerHTML='@'+escHtml(user.nick)+(typeof verifiedBadgeHtml==='function'?verifiedBadgeHtml(user.nick,true):'');}
    if(!window.telechatPresenceV120){const online=isOnline(user.last_seen),seen=document.getElementById('view-profile-seen'),label=online?'● сейчас в сети':formatLastSeen(user.last_seen);if(seen.textContent!==label)seen.textContent=label;seen.style.color=online?'var(--green)':'var(--text3)';}
    const status=document.getElementById('view-profile-status'),statusText=String(data.status||'').trim();if(status.textContent!==statusText)status.textContent=statusText;status.hidden=!statusText;
    const bio=document.getElementById('view-profile-bio'),bioText=complete?String(user.bio||'').trim():'';if(bio.textContent!==bioText)bio.textContent=bioText;bio.closest('.user-profile-section').hidden=!bioText;
    window.telechatProfileMusicV97?.renderAfter(document.getElementById('view-profile-status'),user);
    const button=document.getElementById('view-profile-message-btn');button.style.display=user.nick===me.nick?'none':'block';button.onclick=()=>{closeUserProfile();openChat(user.nick);};
    const edit=document.getElementById('view-profile-edit-btn');if(edit){edit.hidden=user.nick!==me.nick;edit.onclick=()=>{closeUserProfile();window.buildProfPanel?.();window.openPanel?.('profile-panel');};}
    const cover=document.getElementById('view-profile-cover'),banner=user.banner||'preset:cosmos';
    paintMedia(cover,JSON.stringify([user.nick,banner,user.animated_profile]),()=>applyProfileBanner(cover,banner));
    const appearance=window.telechatProfileAppearanceV84;
    if(appearance)appearance.applyBackground(appearance.decode(banner).background);
    if(typeof enhanceVerifiedBadges==='function')enhanceVerifiedBadges(document.getElementById('user-profile-modal'));
    window.telechatPresenceV120?.paintProfile(user.nick,user.last_seen);
    window.exstraPairV168?.renderProfile(user);
  }
  openUserProfile=async function(nick,force=false){
    syncOwner();const actor=owner;nick=String(nick||'').toLowerCase();if(!nick)return;lastNick=nick;
    if(!force&&me&&String(me.nick).toLowerCase()===nick&&Object.hasOwn(me,'banner'))cache.set(nick,{user:me,time:Date.now()});
    const request=++token,modal=document.getElementById('user-profile-modal'),saved=cache.get(nick),preview=saved?.user||userCache[nick];
    const complete=!!saved||!!preview&&Object.hasOwn(preview,'bio');
    if(preview){paint(preview,complete);mode('idle');}else{paint({nick,name:nick,status:'',bio:'',banner:'preset:cosmos'},false);mode('load');}
    modal.classList.add('show');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','view-profile-name');
    syncMedia();
    try{const user=await full(nick,force);if(request!==token||actor!==account())return;paint(user,true);syncMedia();mode('idle');}catch(e){if(request!==token||actor!==account())return;if(preview){mode('idle');showToast('Показана сохранённая версия профиля');}else mode('error',String(e.message||'Ошибка загрузки'));}
  };
  closeUserProfile=function(){token++;document.getElementById('user-profile-modal').classList.remove('show');viewedProfileNickV5='';mode('idle');syncMedia();};
  document.getElementById('profile-load-retry').onclick=()=>openUserProfile(lastNick,true);
  window.addEventListener('telechat-user-updated-v123',event=>{const nick=String(event.detail?.nick||'').toLowerCase();if(nick)cache.delete(nick);});
  let prepareTimer=0,preparing=false,lastPrepare=0,candidate='',nativeHidden=false;
  function canPrepare(){return !!account()&&document.getElementById('chat-screen')?.classList.contains('active')&&!document.hidden&&!nativeHidden&&navigator.onLine!==false&&!navigator.connection?.saveData&&!/^(slow-)?[23]g$/.test(navigator.connection?.effectiveType||'');}
  function prepare(nick){nick=String(nick||'').toLowerCase();syncOwner();if(!/^[a-z0-9_]{1,64}$/.test(nick)||!canPrepare()||preparing||Date.now()-lastPrepare<10000)return Promise.resolve();const saved=cache.get(nick);if(saved&&Date.now()-saved.time<90000)return Promise.resolve();lastPrepare=Date.now();preparing=true;return full(nick,false).catch(()=>{}).finally(()=>{preparing=false;});}
  function queuePrepare(nick){if(candidate===nick&&prepareTimer)return;candidate=nick;clearTimeout(prepareTimer);prepareTimer=setTimeout(()=>{prepareTimer=0;if(canPrepare())prepare(candidate);},500);}
  document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const row=event.target.closest?.('.contact[data-contact-nick]');if(row)queuePrepare(row.dataset.contactNick);},{passive:true});
  document.addEventListener('focusin',event=>{const row=event.target.closest?.('.contact[data-contact-nick]');if(row)queuePrepare(row.dataset.contactNick);});
  // Full banners/photos must not compete with opening every conversation.
  // Intentional hover/focus still prepares a likely profile on a good network.
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(prepareTimer);prepareTimer=0;}});
  window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;if(nativeHidden){clearTimeout(prepareTimer);prepareTimer=0;}});
  window.addEventListener('telechat-account-ready-v175',()=>{if(owner!==account()){syncOwner();closeUserProfile();}clearTimeout(prepareTimer);prepareTimer=0;});
  window.telechatProfileLoadingV191=Object.freeze({prepare,info:()=>({cached:cache.size,inflight:inflight.size,preparing,queued:!!prepareTimer})});
})();
