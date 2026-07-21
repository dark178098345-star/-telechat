/* TELECHAT MODERATION V19 — lightweight creator/admin controls */
(()=>{
  const MOD_FIELDS='nick,role,verified,muted_until,muted_forever,banned_until,banned_forever,moderation_reason,session_version';
  let targetV19=null,watchTimerV19=null,sessionVersionV19=0,decoratingV19=false;

  const lower=value=>String(value||'').trim().toLowerCase();
  const nowV19=()=>Date.now();
  function roleOfV19(userOrNick){
    const user=typeof userOrNick==='string'?userCache[lower(userOrNick)]:userOrNick;
    const nick=lower(typeof userOrNick==='string'?userOrNick:userOrNick?.nick);
    if(nick==='creator')return 'creator';
    return ['admin','creator'].includes(user?.role)?user.role:'user';
  }
  function activeUntilV19(forever,until){return !!forever||Number(until||0)>nowV19();}
  function mutedV19(user=me){return !!user&&activeUntilV19(user.muted_forever,user.muted_until);}
  function bannedV19(user){return !!user&&activeUntilV19(user.banned_forever,user.banned_until);}
  function mergeModerationV19(user){
    if(!user?.nick)return null;
    userCache[user.nick]={...(userCache[user.nick]||{}),...user};
    if(me&&me.nick===user.nick)Object.assign(me,userCache[user.nick]);
    return userCache[user.nick];
  }
  function dateLabelV19(until){
    if(!until)return 'навсегда';
    return 'до '+new Date(Number(until)).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function banMessageV19(user){
    const time=user.banned_forever?'навсегда':dateLabelV19(user.banned_until);
    return 'Аккаунт заблокирован '+time+(user.moderation_reason?' · '+user.moderation_reason:'');
  }

  const badgeBeforeV19=verifiedBadgeHtml;
  verifiedBadgeHtml=function(nick,large=false){
    nick=lower(nick);const user=userCache[nick]||(me&&me.nick===nick?me:null),role=roleOfV19(user||nick);
    if(role==='creator')return badgeBeforeV19(nick,large);
    if(role==='admin')return '<span class="verified-badge admin-badge'+(large?' large':'')+'" title="Администратор" aria-label="Администратор">A</span>';
    if(user?.verified)return '<span class="verified-badge verified-user-badge'+(large?' large':'')+'" title="Подтверждённый профиль" aria-label="Подтверждённый профиль">✓</span>';
    return '';
  };

  async function loadModerationUserV19(nick){
    nick=lower(nick);if(!nick)return null;
    const result=await sb.from('users').select(MOD_FIELDS).eq('nick',nick).maybeSingle();
    if(result.error||!result.data)return userCache[nick]||null;
    return mergeModerationV19(result.data);
  }
  async function loadModerationDirectoryV19(){
    const result=await sb.from('users').select('nick,role,verified').limit(1000);
    if(result.error)return false;
    (result.data||[]).forEach(mergeModerationV19);refreshBadgesV19();return true;
  }

  function badgeAutoHtmlV19(nick){
    return verifiedBadgeHtml(nick).replace('verified-badge','verified-badge moderation-auto-badge');
  }
  function addAutoBadgeV19(target,nick){
    if(!target||target.querySelector('.verified-badge'))return;
    const html=badgeAutoHtmlV19(nick);if(html)target.insertAdjacentHTML('beforeend',html);
  }
  function decorateBadgesV19(){
    if(decoratingV19)return;decoratingV19=true;
    queueMicrotask(()=>{
      document.querySelectorAll('.profile-nick-marker[data-profile-nick]').forEach(marker=>{
        const nick=lower(marker.dataset.profileNick),avatar=marker.closest('.av');if(!avatar)return;
        const container=avatar.closest('.contact,.search-result-item,.member-item,.chat-identity,.follow-list-user');if(!container)return;
        let target=container.querySelector('.contact-name,.member-name,.chat-name,.follow-list-user-name');
        if(!target){const copy=avatar.nextElementSibling;target=copy&&copy.firstElementChild;}
        addAutoBadgeV19(target,nick);
      });
      const users=Object.values(userCache||{});
      document.querySelectorAll('.msg-sender-name').forEach(element=>{
        const base=String(element.childNodes[0]?.textContent||'').trim();
        const user=users.find(item=>String(item?.name||item?.nick||'').trim()===base);if(user)addAutoBadgeV19(element,user.nick);
      });
      decoratingV19=false;
    });
  }

  function refreshBadgesV19(){document.querySelectorAll('.moderation-auto-badge').forEach(item=>item.remove());decorateBadgesV19();}

  function ensureUiV19(){
    const seen=document.getElementById('view-profile-seen'),actions=document.querySelector('.user-profile-actions');
    if(seen&&!document.getElementById('view-profile-role')){
      const role=document.createElement('div');role.id='view-profile-role';role.className='user-profile-role';seen.insertAdjacentElement('beforebegin',role);
    }
    if(actions&&!document.getElementById('moderation-profile-btn')){
      const button=document.createElement('button');button.id='moderation-profile-btn';button.type='button';button.className='modal-btn moderation-profile-btn';button.textContent='🛡️ Модерация';button.onclick=openModerationV19;actions.insertBefore(button,document.getElementById('view-profile-message-btn'));
    }
    if(!document.getElementById('moderation-lock')){
      const lock=document.createElement('div');lock.id='moderation-lock';lock.className='moderation-lock';lock.innerHTML='🔇 <span>У тебя мут — отправка сообщений временно недоступна</span>';
      document.getElementById('active-chat')?.appendChild(lock);
    }
    if(!document.getElementById('moderation-modal')){
      const modal=document.createElement('div');modal.id='moderation-modal';modal.className='moderation-overlay';modal.innerHTML=`
        <section class="moderation-card" role="dialog" aria-modal="true" aria-labelledby="moderation-title">
          <header class="moderation-head"><div class="moderation-head-icon">🛡️</div><div class="moderation-head-copy"><div class="moderation-title" id="moderation-title">Модерация</div><div class="moderation-target" id="moderation-target"></div></div><button class="moderation-close" type="button" aria-label="Закрыть">×</button></header>
          <div class="moderation-body">
            <div class="moderation-state" id="moderation-state"></div>
            <label class="moderation-label" for="moderation-minutes">Время в минутах</label>
            <div class="moderation-time-row"><input class="moderation-input" id="moderation-minutes" type="number" min="1" value="30" inputmode="numeric"><label class="moderation-forever" id="moderation-forever-wrap"><input id="moderation-forever" type="checkbox"> Навсегда</label></div>
            <div class="moderation-quick"><button type="button" data-minutes="5">5 мин</button><button type="button" data-minutes="15">15 мин</button><button type="button" data-minutes="30">30 мин</button></div>
            <label class="moderation-label" for="moderation-reason">Причина (необязательно)</label>
            <input class="moderation-input" id="moderation-reason" maxlength="180" placeholder="Например: спам">
            <div class="moderation-actions"><button class="moderation-action" data-action="mute">🔇 Выдать мут</button><button class="moderation-action danger" data-action="ban">⛔ Забанить</button><button class="moderation-action good" data-action="unmute">Снять мут</button><button class="moderation-action good" data-action="unban">Снять бан</button><button class="moderation-action danger" id="moderation-kick" data-action="kick">🚪 Кикнуть с аккаунта</button></div>
            <div class="moderation-admin-zone" id="moderation-admin-zone"><button class="moderation-action" id="moderation-admin-action" data-action="make_admin">A · Сделать админом</button><button class="moderation-action" id="moderation-verify-action" data-action="verify">✓ Верифицировать</button></div>
            <div class="moderation-note" id="moderation-note">Лёгкая защита: основные ограничения проверяются приложением и базой сообщений.</div>
          </div>
        </section>`;
      modal.onclick=event=>{if(event.target===modal)closeModerationV19();};modal.querySelector('.moderation-close').onclick=closeModerationV19;
      modal.querySelectorAll('[data-minutes]').forEach(button=>button.onclick=()=>{document.getElementById('moderation-minutes').value=button.dataset.minutes;document.getElementById('moderation-forever').checked=false;});
      modal.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>runModerationV19(button.dataset.action));document.body.appendChild(modal);
    }
  }

  function canModerateV19(target){
    if(!me||!target||lower(target.nick)===lower(me.nick)||lower(target.nick)==='creator')return false;
    const actorRole=roleOfV19(me),targetRole=roleOfV19(target);
    return actorRole==='creator'||(actorRole==='admin'&&targetRole==='user');
  }
  function renderProfileRoleV19(user){
    ensureUiV19();const role=document.getElementById('view-profile-role'),profileButton=document.getElementById('moderation-profile-btn'),userRole=roleOfV19(user);
    role.className='user-profile-role';role.textContent='';
    if(userRole==='creator'){role.classList.add('show','creator');role.textContent='✓ Создатель';}
    else if(userRole==='admin'){role.classList.add('show','admin');role.textContent='A · Администратор';}
    else if(user?.verified){role.classList.add('show');role.textContent='✓ Подтверждённый профиль';}
    const nickElement=document.getElementById('view-profile-nick');if(nickElement&&user?.nick)nickElement.innerHTML='@'+escHtml(user.nick)+verifiedBadgeHtml(user.nick,true);
    profileButton.style.display=canModerateV19(user)?'':'none';decorateBadgesV19();
  }
  function moderationChipsV19(user){
    const chips=[];const role=roleOfV19(user);
    chips.push('<span class="moderation-chip">'+(role==='admin'?'Администратор':'Пользователь')+'</span>');
    if(user?.verified)chips.push('<span class="moderation-chip">Верифицирован</span>');
    if(mutedV19(user))chips.push('<span class="moderation-chip alert">Мут '+(user.muted_forever?'навсегда':dateLabelV19(user.muted_until))+'</span>');
    if(bannedV19(user))chips.push('<span class="moderation-chip alert">Бан '+(user.banned_forever?'навсегда':dateLabelV19(user.banned_until))+'</span>');
    return chips.join('');
  }
  function renderModerationModalV19(){
    if(!targetV19)return;const actorRole=roleOfV19(me),targetRole=roleOfV19(targetV19),isCreator=actorRole==='creator';
    document.getElementById('moderation-target').textContent=(targetV19.name||targetV19.nick)+' · @'+targetV19.nick;
    document.getElementById('moderation-state').innerHTML=moderationChipsV19(targetV19);
    const minutes=document.getElementById('moderation-minutes');minutes.max=isCreator?'5256000':'30';if(!isCreator&&Number(minutes.value)>30)minutes.value=30;
    document.getElementById('moderation-forever-wrap').style.display=isCreator?'flex':'none';if(!isCreator)document.getElementById('moderation-forever').checked=false;
    document.getElementById('moderation-kick').style.display=isCreator?'':'none';document.getElementById('moderation-admin-zone').style.display=isCreator?'grid':'none';
    const roleButton=document.getElementById('moderation-admin-action');roleButton.dataset.action=targetRole==='admin'?'remove_admin':'make_admin';roleButton.textContent=targetRole==='admin'?'A · Убрать админа':'A · Сделать админом';
    const verifyButton=document.getElementById('moderation-verify-action');verifyButton.dataset.action=targetV19.verified?'unverify':'verify';verifyButton.textContent=targetV19.verified?'Убрать галочку':'✓ Верифицировать';
    document.getElementById('moderation-note').textContent=isCreator?'У creator нет лимита времени. «Навсегда» доступно для мута и бана.':'Администратор может дать мут или бан максимум на 30 минут.';
  }
  async function openModerationV19(){
    ensureUiV19();const nick=lower(viewedProfileNickV5);if(!nick)return;targetV19=await loadModerationUserV19(nick);if(!canModerateV19(targetV19)){showToast('Недостаточно прав');return;}renderModerationModalV19();document.getElementById('moderation-modal').classList.add('show');
  }
  function closeModerationV19(){document.getElementById('moderation-modal')?.classList.remove('show');}
  async function runModerationV19(action){
    if(!targetV19||!canModerateV19(targetV19))return;
    const actorRole=roleOfV19(me),timed=action==='mute'||action==='ban';let minutes=null;
    if(timed){
      const forever=actorRole==='creator'&&document.getElementById('moderation-forever').checked;
      if(!forever){minutes=Math.floor(Number(document.getElementById('moderation-minutes').value));const max=actorRole==='creator'?5256000:30;if(!Number.isFinite(minutes)||minutes<1||minutes>max){showToast(actorRole==='admin'?'Выбери от 1 до 30 минут':'Укажи корректное время');return;}}
    }
    const reason=document.getElementById('moderation-reason').value.trim();document.querySelectorAll('#moderation-modal button').forEach(button=>button.disabled=true);
    try{
      const result=await sb.rpc('telechat_moderate',{p_actor_nick:me.nick,p_target_nick:targetV19.nick,p_action:action,p_minutes:minutes,p_reason:reason});
      if(result.error)throw result.error;if(result.data)targetV19=mergeModerationV19({...targetV19,...result.data});else targetV19=await loadModerationUserV19(targetV19.nick);
      renderModerationModalV19();renderProfileRoleV19(targetV19);if(typeof renderContacts==='function')renderContacts();refreshBadgesV19();showToast('Действие выполнено ✅');
    }catch(error){const message=String(error?.message||'');showToast(message.includes('telechat_moderate')?'Сначала выполни SQL модерации':(message||'Не удалось выполнить действие'));}
    finally{document.querySelectorAll('#moderation-modal button').forEach(button=>button.disabled=false);}
  }

  function applyComposerModerationV19(){
    ensureUiV19();const lock=document.getElementById('moderation-lock');if(!lock)return;const blocked=mutedV19();
    if(blocked){document.getElementById('input-area').style.display='none';document.getElementById('channel-readonly').classList.remove('show');lock.classList.add('show');}
    else lock.classList.remove('show');
  }
  const updateComposerBeforeV19=updateComposerAccess;
  updateComposerAccess=function(){updateComposerBeforeV19();applyComposerModerationV19();};
  function blockPostingV19(){if(!mutedV19())return false;showToast('У тебя мут — писать пока нельзя');return true;}
  const sendBeforeV19=sendMsg;sendMsg=async function(...args){if(blockPostingV19())return;return sendBeforeV19(...args);};
  const typingBeforeV19=sendTyping;sendTyping=async function(...args){if(mutedV19())return;return typingBeforeV19(...args);};
  const pollOpenBeforeV19=openPollModal;openPollModal=function(...args){if(blockPostingV19())return;return pollOpenBeforeV19(...args);};
  const pollCreateBeforeV19=createPoll;createPoll=async function(...args){if(blockPostingV19())return;return pollCreateBeforeV19(...args);};
  const voiceBeforeV19=toggleVoiceRecording;toggleVoiceRecording=async function(...args){if(blockPostingV19())return;return voiceBeforeV19(...args);};
  const photoBeforeV19=handleChatPhoto;handleChatPhoto=function(input,...args){if(blockPostingV19()){if(input)input.value='';return;}return photoBeforeV19(input,...args);};

  function forceLogoutV19(message){sessionStorage.setItem('telechat-moderation-message',message||'Сеанс завершён администратором');location.reload();}
  function startWatcherV19(){
    clearInterval(watchTimerV19);sessionVersionV19=Number(me?.session_version||0);if(!me)return;
    watchTimerV19=setInterval(async()=>{
      if(!me||document.hidden)return;const result=await sb.from('users').select(MOD_FIELDS).eq('nick',me.nick).maybeSingle();if(result.error||!result.data)return;
      const fresh=result.data,currentVersion=Number(fresh.session_version||0);
      if(bannedV19(fresh)){forceLogoutV19(banMessageV19(fresh));return;}
      if(currentVersion!==sessionVersionV19){forceLogoutV19('Твой сеанс завершён создателем');return;}
      mergeModerationV19(fresh);applyComposerModerationV19();refreshBadgesV19();
    },8000);
  }

  doLogin=async function(){
    const nick=lower(document.getElementById('l-login').value),pass=document.getElementById('l-pass').value,err=document.getElementById('auth-err');
    if(!nick||!pass){err.textContent='Введи логин и пароль!';return;}
    const button=document.getElementById('login-btn');button.disabled=true;button.innerHTML='<span class="spinner"></span>Вход...';
    const result=await sb.from('users').select('*').eq('nick',nick).eq('pass',pass).maybeSingle();
    if(result.error||!result.data){err.textContent='Неверный логин или пароль';button.disabled=false;button.textContent='Войти';return;}
    if(bannedV19(result.data)){err.textContent=banMessageV19(result.data);button.disabled=false;button.textContent='Войти';return;}
    me=result.data;userCache[me.nick]=me;sessionVersionV19=Number(me.session_version||0);await updateOnline();setInterval(updateOnline,25000);
    document.getElementById('auth-screen').classList.remove('active');document.getElementById('chat-screen').classList.add('active');
    await renderContacts();buildProfPanel();buildEmojiPicker();button.disabled=false;button.textContent='Войти';
    await loadModerationDirectoryV19();startWatcherV19();applyComposerModerationV19();
  };

  const openProfileBeforeV19=openUserProfile;
  openUserProfile=async function(nick,...args){const value=await openProfileBeforeV19(nick,...args);const user=await loadModerationUserV19(nick);if(lower(viewedProfileNickV5)===lower(nick))renderProfileRoleV19(user||userCache[lower(nick)]);return value;};
  const closeProfileBeforeV19=closeUserProfile;closeUserProfile=function(){closeModerationV19();targetV19=null;return closeProfileBeforeV19();};

  let observerFrameV21=0;const observerV19=new MutationObserver(()=>{if(observerFrameV21)return;observerFrameV21=requestAnimationFrame(()=>{observerFrameV21=0;decorateBadgesV19();});});observerV19.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModerationV19();});
  const forced=sessionStorage.getItem('telechat-moderation-message');if(forced){sessionStorage.removeItem('telechat-moderation-message');setTimeout(()=>{const err=document.getElementById('auth-err');if(err)err.textContent=forced;},50);}
  window.openModerationV19=openModerationV19;window.closeModerationV19=closeModerationV19;window.loadModerationDirectoryV19=loadModerationDirectoryV19;ensureUiV19();
})();
