/* TELECHAT PROFILE PERFORMANCE V11 */
(()=>{
  const css=document.createElement('style');css.textContent=`
  .profile-load{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(155deg,rgba(25,22,46,.985),rgba(7,10,22,.99));opacity:0;visibility:hidden;pointer-events:none;transition:.2s}
  .profile-load.show{opacity:1;visibility:visible;pointer-events:auto}.profile-load-box{text-align:center}.profile-load-orbit{width:72px;height:72px;position:relative;margin:0 auto 14px;border:1px solid rgba(167,139,250,.25);border-radius:50%;animation:profile-spin 2.7s linear infinite}.profile-load-orbit:before{content:'✦';position:absolute;inset:15px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 35% 30%,#b29cff,#6655dd 58%,#2c2459);color:#fff;font-size:22px;animation:profile-pulse 1.5s ease-in-out infinite}.profile-load-orbit:after{content:'';position:absolute;width:10px;height:10px;left:3px;top:9px;border-radius:50%;background:#8b7cff;box-shadow:0 0 18px #8b7cff}.profile-load-logo{color:#bcaeff;font-size:20px;font-weight:1000}.profile-load-text{margin-top:6px;color:var(--text2);font-size:12px;font-weight:800}.profile-load-sub{margin-top:4px;color:var(--text3);font-size:9px}.profile-load-retry{display:none;margin:13px auto 0;padding:9px 15px;border:1px solid rgba(167,139,250,.25);border-radius:10px;background:rgba(124,110,247,.14);color:#fff;font:800 11px Nunito;cursor:pointer}.profile-load.error .profile-load-retry{display:inline-flex}.profile-load.error .profile-load-orbit{animation:none}.profile-load.error .profile-load-orbit:before{content:'!';background:linear-gradient(135deg,#ef4444,#9f1239);animation:none}.profile-refresh{position:absolute;z-index:7;left:50%;top:12px;transform:translate(-50%,-18px);padding:5px 9px;border-radius:999px;background:rgba(9,10,20,.72);color:#c4b5fd;font-size:9px;font-weight:900;opacity:0;transition:.2s;pointer-events:none}.profile-refresh.show{transform:translate(-50%,0);opacity:1}@keyframes profile-spin{to{transform:rotate(360deg)}}@keyframes profile-pulse{50%{transform:scale(1.06)}}`;
  document.head.appendChild(css);

  const card=document.querySelector('.user-profile-card');
  if(card&&!document.getElementById('profile-load')){
    const refresh=document.createElement('div');refresh.id='profile-refresh';refresh.className='profile-refresh';refresh.textContent='◌ обновляем профиль';card.appendChild(refresh);
    const load=document.createElement('div');load.id='profile-load';load.className='profile-load';load.innerHTML='<div class="profile-load-box"><div class="profile-load-orbit"></div><div class="profile-load-logo">tele.chat</div><div class="profile-load-text" id="profile-load-text">Загружаем профиль…</div><div class="profile-load-sub">аватарка · баннер · информация</div><button class="profile-load-retry" id="profile-load-retry">Повторить</button></div>';card.appendChild(load);
  }

  const lightFields='nick,name,av,status,last_seen,avatar_video',profileFields='nick,name,av,status,bio,banner,last_seen,avatar_video';
  const cache=new Map(),inflight=new Map(),lightInflight=new Map(),times=new Map();let token=0,lastNick='';
  function merge(user){if(!user||!user.nick)return null;userCache[user.nick]=Object.assign({},userCache[user.nick]||{},user);times.set(user.nick,Date.now());return userCache[user.nick];}
  async function light(nick){
    if(lightInflight.has(nick))return lightInflight.get(nick);
    const task=(async()=>{let r=await sb.from('users').select(lightFields).eq('nick',nick).maybeSingle();if(r.error&&String(r.error.message).includes('avatar_video'))r=await sb.from('users').select('nick,name,av,status,last_seen').eq('nick',nick).maybeSingle();return r.data?merge(r.data):null;})().finally(()=>lightInflight.delete(nick));
    lightInflight.set(nick,task);return task;
  }
  getUser=async function(nick){nick=String(nick||'').toLowerCase();if(!nick)return null;const saved=userCache[nick];if(saved){if(Date.now()-(times.get(nick)||0)>45000)light(nick).catch(()=>{});return saved;}return light(nick);};
  async function full(nick,force){
    const saved=cache.get(nick);if(!force&&saved&&Date.now()-saved.time<90000)return saved.user;if(inflight.has(nick))return inflight.get(nick);
    const task=(async()=>{let r=await sb.from('users').select(profileFields).eq('nick',nick).maybeSingle();if(r.error&&String(r.error.message).includes('avatar_video'))r=await sb.from('users').select('nick,name,av,status,bio,banner,last_seen').eq('nick',nick).maybeSingle();if(r.error)throw r.error;if(!r.data)throw Error('Профиль не найден');const user=merge(r.data);cache.set(nick,{user,time:Date.now()});return user;})().finally(()=>inflight.delete(nick));
    inflight.set(nick,task);return task;
  }
  function mode(type,text){const load=document.getElementById('profile-load'),refresh=document.getElementById('profile-refresh');if(!load)return;load.classList.remove('show','error');refresh.classList.remove('show');if(type==='load')load.classList.add('show');if(type==='refresh')refresh.classList.add('show');if(type==='error'){load.classList.add('show','error');document.getElementById('profile-load-text').textContent=text||'Не удалось загрузить профиль';}}
  function paint(user,complete){
    viewedProfileNickV5=user.nick;setAvatarElement(document.getElementById('view-profile-avatar'),user);document.getElementById('view-profile-name').textContent=user.name||user.nick;document.getElementById('view-profile-nick').innerHTML='@'+escHtml(user.nick)+(typeof verifiedBadgeHtml==='function'?verifiedBadgeHtml(user.nick,true):'');
    const online=isOnline(user.last_seen),seen=document.getElementById('view-profile-seen');seen.textContent=online?'● сейчас в сети':formatLastSeen(user.last_seen);seen.style.color=online?'var(--green)':'var(--text3)';const data=unpackProfileData(user.status);document.getElementById('view-profile-status').textContent=data.status.trim()||'Статус не указан';document.getElementById('view-profile-bio').textContent=complete?((user.bio||'').trim()||'Пользователь пока ничего о себе не рассказал.'):'Загружаем информацию…';
    const button=document.getElementById('view-profile-message-btn');button.style.display=user.nick===me.nick?'none':'block';button.onclick=()=>{closeUserProfile();openChat(user.nick);};applyProfileBanner(document.getElementById('view-profile-cover'),complete?user.banner:'preset:cosmos');if(typeof enhanceVerifiedBadges==='function')enhanceVerifiedBadges();
  }
  openUserProfile=async function(nick,force=false){
    nick=String(nick||'').toLowerCase();if(!nick)return;lastNick=nick;const request=++token,modal=document.getElementById('user-profile-modal'),saved=cache.get(nick),preview=saved?.user||userCache[nick];modal.classList.add('show');if(preview){paint(preview,!!saved);mode('refresh');}else{mode('load');document.getElementById('view-profile-name').textContent='';document.getElementById('view-profile-nick').textContent='@'+nick;applyProfileBanner(document.getElementById('view-profile-cover'),'preset:cosmos');}
    const started=performance.now();try{const user=await full(nick,force);if(request!==token)return;const wait=preview?0:Math.max(0,260-(performance.now()-started));if(wait)await new Promise(r=>setTimeout(r,wait));if(request!==token)return;paint(user,true);mode('idle');}catch(e){if(request!==token)return;if(preview){paint(preview,!!saved);mode('idle');showToast('Показана сохранённая версия профиля');}else mode('error',String(e.message||'Ошибка загрузки'));}
  };
  closeUserProfile=function(){token++;document.getElementById('user-profile-modal').classList.remove('show');viewedProfileNickV5='';mode('idle');};
  document.getElementById('profile-load-retry').onclick=()=>openUserProfile(lastNick,true);
})();
