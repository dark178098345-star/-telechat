/* A small account card; the existing editor and session exit keep their behavior. */
(()=>{
  'use strict';
  const navigate=window.telechatNavigate;
  if(typeof navigate!=='function')return;
  const trigger=document.querySelector('[data-nav="profile"]');
  if(!trigger)return;
  let card=null,opened=false;
  const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const pen=icon('<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>');
  const eye=icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>');
  const swap=icon('<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>');
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-controls','profile-quick-v91');
  trigger.setAttribute('aria-expanded','false');

  function close(restoreFocus=false){
    if(!opened)return;
    opened=false;card.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    // Release media when hidden, including decoders used by animated avatars.
    card.querySelectorAll('video').forEach(video=>{
      video.pause();video.removeAttribute('src');video.load();video.remove();
    });
    if(restoreFocus)trigger.focus({preventScroll:true});
  }

  function position(){
    if(!opened)return;
    const anchor=trigger.getBoundingClientRect();
    const viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
    const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    card.style.maxHeight=Math.max(100,height-24)+'px';
    card.style.width=Math.min(328,width-24)+'px';
    const rect=card.getBoundingClientRect();
    card.style.left=Math.max(left+12,Math.min(anchor.left,left+width-rect.width-12))+'px';
    card.style.top=Math.max(top+12,Math.min(anchor.top-rect.height-12,top+height-rect.height-12))+'px';
  }

  function ensure(){
    if(card)return;
    card=document.createElement('section');
    card.id='profile-quick-v91';card.hidden=true;
    card.setAttribute('role','dialog');card.setAttribute('aria-label','Твой профиль');
    card.innerHTML=`<div class="pq-cover" aria-hidden="true"></div>
      <button type="button" class="pq-close" aria-label="Закрыть карточку">×</button>
      <div class="pq-body">
        <div class="pq-top"><div class="pq-avatar-wrap"><div class="pq-avatar" aria-hidden="true"></div><i class="pq-dot" aria-hidden="true"></i></div><span class="pq-online"><i aria-hidden="true"></i>В сети</span></div>
        <h2 class="pq-name"></h2><div class="pq-nick"></div>
        <button type="button" class="pq-status"></button>
        <div class="pq-actions">
          <button type="button" data-pq="edit">${pen}<span>Редактировать профиль</span><b aria-hidden="true">›</b></button>
          <button type="button" data-pq="view">${eye}<span>Посмотреть профиль</span><b aria-hidden="true">›</b></button>
        </div>
        <button type="button" class="pq-switch" data-pq="switch">${swap}<span>Сменить аккаунт<small>Открыть список аккаунтов</small></span><b aria-hidden="true">›</b></button>
      </div>`;
    document.body.append(card);
    card.querySelector('.pq-close').addEventListener('click',()=>close(true));
    const edit=()=>{close();navigate.call(window,'profile');};
    card.querySelector('.pq-status').addEventListener('click',edit);
    card.querySelector('[data-pq="edit"]').addEventListener('click',edit);
    card.querySelector('[data-pq="view"]').addEventListener('click',()=>{close();window.previewMyProfile?.();});
    card.querySelector('[data-pq="switch"]').addEventListener('click',()=>{close();window.openLogoutDialogV76?.('switch');});
  }

  function open(){
    const user=typeof me!=='undefined'?me:null;
    if(!user)return;
    ensure();
    card.querySelector('.pq-name').textContent=user.name||user.nick||'Мой профиль';
    card.querySelector('.pq-nick').textContent=user.nick?'@'+user.nick:'';
    let status='';
    try{status=window.unpackProfileData?.(user.status)?.status||'';}catch(error){}
    const statusButton=card.querySelector('.pq-status');
    statusButton.textContent=status||'＋ Добавить статус';
    statusButton.classList.toggle('pq-status-empty',!status);
    window.telechatProfileMusicV97?.renderAfter(statusButton,user);
    const avatar=card.querySelector('.pq-avatar');
    if(typeof window.setAvatarElement==='function')window.setAvatarElement(avatar,user);
    else avatar.textContent='👤';
    window.applyProfileBanner?.(card.querySelector('.pq-cover'),user.banner);
    opened=true;card.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    position();
    card.querySelector('[data-pq="edit"]').focus({preventScroll:true});
  }

  window.telechatNavigate=function(target,...args){
    if(target==='profile'){if(opened)close(true);else open();return;}
    close();return navigate.apply(this,[target,...args]);
  };
  document.addEventListener('pointerdown',event=>{
    if(opened&&!card.contains(event.target)&&!trigger.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
    if(opened&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}
  },true);
  document.addEventListener('focusin',event=>{
    if(opened&&!card.contains(event.target)&&!trigger.contains(event.target))close();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
})();
