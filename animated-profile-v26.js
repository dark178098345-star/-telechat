/* TELECHAT ANIMATED PROFILE V26 — permanent video avatar + banner access */
(()=>{
  const PRICE=4000;
  const PRIVILEGED=new Set(['creator','tele']);
  let refreshPromise=null;
  let refreshedAt=0;
  let schemaReady=true;

  const lower=value=>String(value||'').trim().toLowerCase();
  const number=new Intl.NumberFormat('ru-RU');
  function compact(value){
    const amount=Math.max(0,Number(value||0));
    for(const [limit,label] of [[1e12,'T'],[1e9,'B'],[1e6,'M']]){
      if(amount>=limit){
        return (amount/limit).toFixed(amount>=limit*100?0:amount>=limit*10?1:2).replace(/\.0+$|(?<=\.[0-9])0$/,'')+label;
      }
    }
    return number.format(amount);
  }
  function isPrivileged(user){return PRIVILEGED.has(lower(user?.nick));}
  function hasAccess(user){return isPrivileged(user)||user?.animated_profile===true;}
  function balance(user){return lower(user?.nick)==='creator'?'∞':compact(user?.moons);}

  function ensureUi(){
    const panel=document.getElementById('profile-panel');
    const preview=panel?.querySelector('.profile-preview-btn');
    if(panel&&preview&&!document.getElementById('animated-profile-card')){
      const card=document.createElement('section');
      card.id='animated-profile-card';
      card.className='animated-profile-card';
      card.innerHTML='<div class="animated-profile-orbit" aria-hidden="true"><span>▶</span></div><div class="animated-profile-copy"><div class="animated-profile-title">Анимированный профиль</div><div class="animated-profile-note" id="animated-profile-note">Видеоаватар и видеобаннер навсегда</div></div><div class="animated-profile-wallet"><strong id="profile-moon-balance">— 🌙</strong><span>Баланс</span></div><button class="animated-profile-buy" id="animated-profile-buy" type="button">Открыть за 4 000 🌙</button>';
      preview.insertAdjacentElement('afterend',card);
      card.querySelector('#animated-profile-buy').addEventListener('click',openPurchase);
    }
    if(!document.getElementById('animated-profile-modal')){
      const modal=document.createElement('div');
      modal.id='animated-profile-modal';
      modal.className='animated-profile-overlay';
      modal.innerHTML='<div class="animated-profile-modal" role="dialog" aria-modal="true" aria-labelledby="animated-profile-modal-title"><button class="animated-profile-close" id="animated-profile-close" type="button" aria-label="Закрыть">×</button><div class="animated-profile-modal-icon"><span>▶</span></div><div class="animated-profile-modal-kicker">ОФОРМЛЕНИЕ ПРОФИЛЯ</div><h3 id="animated-profile-modal-title">Оживи свой профиль</h3><p>Один доступ открывает обе функции навсегда.</p><div class="animated-profile-benefits"><div><span>◉</span><b>Видеоаватар</b><small>До 10 секунд · повторяется автоматически</small></div><div><span>▰</span><b>Видеобаннер</b><small>Живая обложка карточки профиля</small></div></div><div class="animated-profile-price"><span>Навсегда</span><strong>4 000 🌙</strong></div><button class="animated-profile-confirm" id="animated-profile-confirm" type="button">Открыть доступ</button><button class="animated-profile-cancel" id="animated-profile-cancel" type="button">Не сейчас</button></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',event=>{if(event.target===modal)closePurchase();});
      modal.querySelector('#animated-profile-close').addEventListener('click',closePurchase);
      modal.querySelector('#animated-profile-cancel').addEventListener('click',closePurchase);
      modal.querySelector('#animated-profile-confirm').addEventListener('click',buyAccess);
    }
  }

  function render(user=me){
    if(!user)return;
    ensureUi();
    const card=document.getElementById('animated-profile-card');
    const note=document.getElementById('animated-profile-note');
    const button=document.getElementById('animated-profile-buy');
    const moon=document.getElementById('profile-moon-balance');
    const allowed=hasAccess(user);
    moon.textContent=balance(user)+' 🌙';
    card.classList.toggle('unlocked',allowed);
    card.classList.toggle('schema-missing',!schemaReady);
    if(allowed){
      note.textContent=isPrivileged(user)?'Особый доступ tele.chat':'Доступ открыт навсегда';
      button.textContent='✓ Доступ открыт';
      button.disabled=true;
    }else if(!schemaReady){
      note.textContent='Нужно один раз запустить SQL V26';
      button.textContent='Доступ пока не подключён';
      button.disabled=true;
    }else{
      note.textContent='Видеоаватар и видеобаннер навсегда';
      button.textContent='Открыть за 4 000 🌙';
      button.disabled=Number(user.moons||0)<PRICE;
      if(button.disabled)button.title='Не хватает '+number.format(PRICE-Number(user.moons||0))+' Лун';
      else button.removeAttribute('title');
    }
    document.getElementById('avatar-video-btn').hidden=!allowed;
    document.getElementById('banner-video-btn').hidden=!allowed;
  }

  async function refresh(force=false){
    if(!me)return null;
    if(!force&&Date.now()-refreshedAt<30000){render(me);return me;}
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      const result=await sb.from('users').select('nick,moons,animated_profile').eq('nick',me.nick).maybeSingle();
      if(result.error){
        schemaReady=!/animated_profile/i.test(String(result.error.message||''));
        render(me);
        return me;
      }
      schemaReady=true;
      if(result.data){
        Object.assign(me,result.data);
        userCache[me.nick]={...(userCache[me.nick]||{}),...result.data};
      }
      refreshedAt=Date.now();
      render(me);
      return me;
    })().finally(()=>{refreshPromise=null;});
    return refreshPromise;
  }

  function openPurchase(){
    if(!me)return;
    if(hasAccess(me)){showToast('Анимированный профиль уже открыт');return;}
    if(!schemaReady){showToast('Сначала выполни SQL V26');return;}
    if(Number(me.moons||0)<PRICE){showToast('Не хватает '+number.format(PRICE-Number(me.moons||0))+' Лун');return;}
    ensureUi();
    document.getElementById('animated-profile-modal').classList.add('show');
  }
  function closePurchase(){document.getElementById('animated-profile-modal')?.classList.remove('show');}

  async function buyAccess(){
    if(!me||hasAccess(me))return;
    const button=document.getElementById('animated-profile-confirm');
    button.disabled=true;
    const original=button.textContent;
    button.innerHTML='<span class="spinner"></span>Открываем…';
    try{
      const result=await sb.rpc('telechat_buy_animated_profile',{p_actor_nick:me.nick});
      if(result.error)throw result.error;
      me.animated_profile=true;
      if(result.data&&Number.isFinite(Number(result.data.balance)))me.moons=Number(result.data.balance);
      userCache[me.nick]={...(userCache[me.nick]||{}),...me};
      refreshedAt=Date.now();
      closePurchase();
      render(me);
      if(typeof renderProfileAvatar==='function')renderProfileAvatar();
      if(typeof renderProfileBannerEditor==='function')renderProfileBannerEditor();
      showToast('Анимированный профиль открыт навсегда ✨');
    }catch(error){
      const message=String(error?.message||'');
      if(/Недостаточно/i.test(message))showToast('Недостаточно Лун');
      else if(/telechat_buy_animated_profile|schema cache|function/i.test(message))showToast('Сначала выполни SQL V26');
      else showToast(message||'Не удалось открыть доступ');
    }finally{
      button.disabled=false;
      button.textContent=original;
    }
  }

  const buildBefore=buildProfPanel;
  buildProfPanel=function(...args){
    const value=buildBefore(...args);
    ensureUi();
    render(me);
    refresh().catch(()=>{});
    return value;
  };

  window.openAnimatedProfilePurchaseV26=openPurchase;
  window.refreshAnimatedProfileV26=refresh;
})();
