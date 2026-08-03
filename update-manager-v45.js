/* TELECHAT UPDATE MANAGER V45 */
(() => {
  'use strict';

  const MANIFEST_URL_V45 = './telechat-release.json';
  const desktopBridgeV45 = window.telechatDesktop;
  const isDesktopV45 = Boolean(desktopBridgeV45?.isDesktop);
  const hadControllerV45 = Boolean(navigator.serviceWorker?.controller);
  let releaseV45 = null;
  let modeV45 = '';
  let reloadingV45 = false;

  function ensureUpdateCardV45() {
    let card = document.getElementById('telechat-update-v45');
    if (card) return card;
    card = document.createElement('aside');
    card.id = 'telechat-update-v45';
    card.className = 'telechat-update-v45';
    card.setAttribute('role','status');
    card.setAttribute('aria-live','polite');
    card.setAttribute('aria-hidden','true');
    card.innerHTML = `
      <div class="telechat-update-icon-v45" aria-hidden="true">🌙</div>
      <div class="telechat-update-copy-v45">
        <div class="telechat-update-heading-v45">
          <div class="telechat-update-title-v45" id="telechat-update-title-v45">Вышло обновление tele.chat</div>
          <span class="telechat-update-tag-v45" id="telechat-update-tag-v45">NEW</span>
        </div>
        <div class="telechat-update-description-v45" id="telechat-update-description-v45">Доступна новая версия приложения</div>
      </div>
      <div class="telechat-update-actions-v45">
        <button class="telechat-update-action-v45" id="telechat-update-action-v45" type="button">Обновить</button>
        <button class="telechat-update-close-v45" id="telechat-update-close-v45" type="button" aria-label="Напомнить позже">×</button>
      </div>`;
    document.body.appendChild(card);
    card.querySelector('#telechat-update-action-v45').addEventListener('click',applyUpdateV45);
    card.querySelector('#telechat-update-close-v45').addEventListener('click',dismissUpdateV45);
    return card;
  }

  function versionPartsV45(value) {
    return String(value || '0').split(/[.-]/).slice(0,3).map(part => Number.parseInt(part,10) || 0);
  }

  function isNewerVersionV45(next,current) {
    const a=versionPartsV45(next),b=versionPartsV45(current);
    for(let index=0;index<3;index++){
      if(a[index]>b[index])return true;
      if(a[index]<b[index])return false;
    }
    return false;
  }

  async function loadReleaseV45() {
    if (releaseV45) return releaseV45;
    try {
      const response = await fetch(MANIFEST_URL_V45,{cache:'no-store'});
      if (!response.ok) throw new Error('release manifest');
      const data = await response.json();
      if (!data?.version) throw new Error('release version');
      releaseV45 = data;
      return data;
    } catch (error) { return null; }
  }

  function showCardV45(mode,release) {
    const dismissKey='telechat-update-dismissed-v45-'+mode+'-'+(release?.version||release?.build||'next');
    if (sessionStorage.getItem(dismissKey)==='1') return;
    modeV45=mode;releaseV45=release||releaseV45;
    const card=ensureUpdateCardV45();
    card.dataset.dismissKey=dismissKey;
    card.querySelector('#telechat-update-title-v45').textContent=mode==='desktop'
      ? `Вышло обновление tele.chat ${release.version}`
      : 'Обновление tele.chat готово';
    card.querySelector('#telechat-update-description-v45').textContent=mode==='desktop'
      ? (release.description||'Доступна новая версия приложения для Windows')
      : 'Перезапусти tele.chat, чтобы применить свежую версию интерфейса.';
    card.querySelector('#telechat-update-tag-v45').textContent=mode==='desktop'?'WINDOWS':'NEW';
    card.querySelector('#telechat-update-action-v45').textContent=mode==='desktop'?'Загрузить':'Перезапустить';
    card.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>card.classList.add('is-visible'));
  }

  function dismissUpdateV45() {
    const card=ensureUpdateCardV45();
    if(card.dataset.dismissKey)sessionStorage.setItem(card.dataset.dismissKey,'1');
    card.classList.remove('is-visible');
    card.setAttribute('aria-hidden','true');
  }

  async function applyUpdateV45() {
    const button=document.getElementById('telechat-update-action-v45');
    if(modeV45==='desktop'){
      const url=releaseV45?.windowsUrl;
      if(!url)return;
      if(button)button.textContent='Открываем загрузку…';
      if(typeof desktopBridgeV45?.openExternal==='function')desktopBridgeV45.openExternal(url);
      else window.open(url,'_blank','noopener,noreferrer');
      setTimeout(()=>{if(button)button.textContent='Загрузить';},1800);
      return;
    }
    reloadingV45=true;
    if(button){button.disabled=true;button.textContent='Перезапускаем…';}
    try{
      const registration=await navigator.serviceWorker?.getRegistration?.();
      registration?.waiting?.postMessage({type:'SKIP_WAITING'});
    }catch(error){}
    setTimeout(()=>location.reload(),120);
  }

  async function checkDesktopReleaseV45() {
    if(!isDesktopV45)return;
    const release=await loadReleaseV45();
    if(!release?.windowsUrl)return;
    let current='1.1.0';
    try{
      if(typeof desktopBridgeV45.getVersion==='function')current=await desktopBridgeV45.getVersion()||current;
    }catch(error){}
    if(isNewerVersionV45(release.version,current))showCardV45('desktop',release);
  }

  async function showWebUpdateV45() {
    if(isDesktopV45||reloadingV45)return;
    const release=await loadReleaseV45()||{version:'web',build:'next'};
    showCardV45('web',release);
  }

  function watchRegistrationV45(registration) {
    if(!registration)return;
    if(registration.waiting&&navigator.serviceWorker.controller)showWebUpdateV45();
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)showWebUpdateV45();
      });
    });
    const check=()=>{if(!document.hidden)registration.update().catch(()=>{});};
    addEventListener('focus',check,{passive:true});
    document.addEventListener('visibilitychange',check,{passive:true});
    setInterval(check,3*60*1000);
  }

  function initWebUpdatesV45() {
    if(isDesktopV45||!('serviceWorker' in navigator))return;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(hadControllerV45&&!reloadingV45)showWebUpdateV45();
    });
    navigator.serviceWorker.ready.then(watchRegistrationV45).catch(()=>{});
  }

  ensureUpdateCardV45();
  if(isDesktopV45)checkDesktopReleaseV45();
  else initWebUpdatesV45();

  window.telechatUpdatesV45={
    check:()=>isDesktopV45?checkDesktopReleaseV45():navigator.serviceWorker?.getRegistration?.().then(reg=>reg?.update()),
    showDemo:mode=>loadReleaseV45().then(release=>showCardV45(mode==='desktop'?'desktop':'web',release||{version:'1.2.0',build:45}))
  };
})();
