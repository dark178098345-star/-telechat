/* TELECHAT SMOOTH UI V76 — account exit and lightweight UI finishing touches. */
(()=>{
  'use strict';

  let leaving=false;
  const byId=id=>document.getElementById(id);
  const currentUser=()=>{try{return typeof me!=='undefined'&&me?me:null}catch(error){return null}};

  function renderAccountSessionV76(){
    const user=currentUser(),avatar=byId('account-session-avatar-v76');
    if(!user)return;
    const name=byId('account-session-name-v76'),nick=byId('account-session-nick-v76');
    if(name)name.textContent=user.name||user.nick||'Текущий аккаунт';
    if(nick)nick.textContent=user.nick?'@'+user.nick:'Активный сеанс';
    if(avatar){
      try{avatar.innerHTML=typeof avatarMarkup==='function'?avatarMarkup(user):(user.av||'👤')}
      catch(error){avatar.textContent='👤'}
    }
  }

  function ensureLogoutDialogV76(){
    if(byId('logout-dialog-v76'))return;
    const overlay=document.createElement('div');
    overlay.id='logout-dialog-v76';
    overlay.className='modal-overlay logout-dialog-v76';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','logout-title-v76');
    overlay.innerHTML=`
      <section class="logout-dialog-card-v76">
        <div class="logout-dialog-icon-v76" aria-hidden="true">↪</div>
        <h2 id="logout-title-v76">Выйти из аккаунта?</h2>
        <p>Текущий сеанс завершится. Карточка аккаунта останется на экране входа, чтобы можно было быстро вернуться.</p>
        <div class="logout-dialog-actions-v76">
          <button class="logout-cancel-v76" type="button" data-logout-cancel-v76>Остаться</button>
          <button class="logout-confirm-v76" id="logout-confirm-v76" type="button">Выйти</button>
        </div>
      </section>`;
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeLogoutDialogV76()});
    overlay.querySelector('[data-logout-cancel-v76]').addEventListener('click',closeLogoutDialogV76);
    overlay.querySelector('#logout-confirm-v76').addEventListener('click',confirmLogoutV76);
    document.body.appendChild(overlay);
  }

  function openLogoutDialogV76(){
    if(leaving)return;
    renderAccountSessionV76();ensureLogoutDialogV76();
    const overlay=byId('logout-dialog-v76');
    overlay.classList.add('show');document.body.classList.add('logout-open-v76');
    requestAnimationFrame(()=>byId('logout-confirm-v76')?.focus());
  }

  function closeLogoutDialogV76(){
    if(leaving)return;
    byId('logout-dialog-v76')?.classList.remove('show');
    document.body.classList.remove('logout-open-v76');
  }

  function waitAtMostV76(promise,timeout=900){
    return Promise.race([Promise.resolve(promise).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,timeout))]);
  }

  async function confirmLogoutV76(){
    if(leaving)return;leaving=true;
    const button=byId('logout-confirm-v76'),user=currentUser();
    if(button){button.disabled=true;button.textContent='Выходим…'}
    try{
      const tasks=[];
      if(typeof window.endCallV32==='function')tasks.push(waitAtMostV76(window.endCallV32(),700));
      if(user?.nick&&typeof sb!=='undefined'){
        tasks.push(waitAtMostV76(sb.from('users').update({last_seen:Date.now()-91000}).eq('nick',user.nick),700));
        tasks.push(waitAtMostV76(sb.from('typing').delete().eq('nick',user.nick),700));
      }
      await Promise.allSettled(tasks);
      try{if(typeof sb!=='undefined'&&typeof sb.removeAllChannels==='function')await waitAtMostV76(sb.removeAllChannels(),400)}catch(error){}
    }catch(error){}
    location.reload();
  }

  const navigateBeforeV76=window.telechatNavigate;
  if(typeof navigateBeforeV76==='function'){
    window.telechatNavigate=function(target,...args){
      if(target==='settings')renderAccountSessionV76();
      return navigateBeforeV76.apply(this,[target,...args]);
    };
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&byId('logout-dialog-v76')?.classList.contains('show')){
      event.preventDefault();closeLogoutDialogV76();
    }
  });

  window.openLogoutDialogV76=openLogoutDialogV76;
  window.closeLogoutDialogV76=closeLogoutDialogV76;
  window.confirmLogoutV76=confirmLogoutV76;
  window.telechatSmoothV76={renderAccount:renderAccountSessionV76,openLogout:openLogoutDialogV76};
})();
