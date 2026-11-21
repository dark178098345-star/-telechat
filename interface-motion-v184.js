/* Finite, event-driven UI motion. Never observes message history or runs an idle loop. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)'), active = new Map(), surfaces = new Map();
  const classState = name => node => node.classList.contains(name);
  const visible = node => !node.hidden;
  const child = selector => node => node.querySelector(selector) || node;
  // Watch actual open states, not generic DOM changes or button mutations.
  const rules = [
    ['dialog', node => node.open, 'dialog', null, 'open'],
    ['.side-panel', classState('open'), 'drawer'],
    ['.modal-overlay,.message-modal-overlay-v36,#user-profile-modal,.moderation-overlay', classState('show'), 'dialog', child('.user-profile-card,.modal,.modal-box,.message-modal-card-v36,.moderation-card')],
    ['.follow-list-overlay', classState('open'), 'dialog', child('.follow-list-card')],
    ['#emoji-picker', classState('open'), 'sheet'],
    ['#ctx-menu,.contact-menu,.chat-actions-v52,.chat-pin-icons-v59', classState('show'), 'menu'],
    ['#profile-quick-v91,#attachment-menu-v141,#mention-picker-v106', visible, 'menu', null, 'hidden'],
    ['#search-results', node => node.style.display === 'block', 'menu', null, 'style'],
    ['#pending-media,#reply-bar,#pinned-bar,#chat-search-bar,#message-selection-toolbar-v36', classState('show'), 'strip'],
    ['#music-hub-v117', visible, 'screen', child('.mh-workspace'), 'hidden'],
    ['#music-hub-v117', node => !node.hidden && node.classList.contains('mh-show-now'), 'drawer', child('.mh-listening'), 'class hidden'],
    ['#mh-sheet,#mc-picker-v187,#shared-media-preview-v152', visible, 'sheet', child('.mh-sheet'), 'hidden'],
    ['[data-wallet-pane],[data-gift-collection],[data-gift-send]', visible, 'section', null, 'hidden'],
    ['#voice-call-overlay', classState('show'), 'screen', child('.voice-call-surface')],
    ['.voice-call-sheet,#call-chat-panel-v152', classState('show'), 'sheet'],
    ['#voice-call-mini', classState('show'), 'menu'],
    ['#media-viewer', classState('show'), 'screen']
  ];
  const selector = [...new Set(rules.map(rule => rule[0]))].join(',');
  const buttonSelector = 'button,[role="button"],[role="tab"],[role="menuitem"],summary,input:is([type="button"],[type="submit"],[type="reset"]),.contact[data-chat-key],.search-result-item';
  const profiles = {
    surface:[.73,0,7,.992,180],dialog:[.75,0,12,.987,220],sheet:[.77,0,12,1,205],drawer:[.8,14,0,1,215],
    menu:[.74,0,5,.985,165],strip:[.81,0,4,1,145],section:[.81,0,6,1,185],screen:[.89,0,0,1,190],photo:[.64,0,0,1,200]
  };
  const stats = { started: 0, skipped: 0, peak: 0, surfaceChanges: 0 };
  let mode = 'auto', owner = '', nativeHidden = false, pressed = null, pointer = null, control, clickAnimation = null;
  const self = () => { try { return String(me?.nick || 'guest'); } catch (_) { return 'guest'; } };
  const key = () => 'exstrachat.interface-motion.v184.' + self();
  function policy() {
    if (reduce.matches || mode === 'off') return 'off';
    const constrained = (Number(navigator.deviceMemory) || 8) <= 2 || (Number(navigator.hardwareConcurrency) || 8) <= 2 || navigator.connection?.saveData;
    return mode === 'auto' && constrained ? 'lite' : 'full';
  }
  function enabled() { return policy() !== 'off' && !document.hidden && !nativeHidden; }
  function release() { pressed?.classList.remove('is-pressing-v184'); pressed = pointer = null; }
  function stop() { for (const animation of active.values()) animation.cancel(); active.clear(); clickAnimation?.cancel(); clickAnimation = null; release(); }
  function sync() {
    const next = self(); if (owner !== next) { owner = next; try { mode = localStorage.getItem(key()) || 'auto'; } catch (_) { mode = 'auto'; } }
    if (!['auto', 'full', 'off'].includes(mode)) mode = 'auto';
    document.body.dataset.uiMotionV184 = policy(); if (control) control.value = mode;
    stop();
    window.dispatchEvent(new Event('exstra-motion-policy-v184'));
  }
  function set(value) {
    if (!['auto', 'full', 'off'].includes(value)) return;
    try { localStorage.setItem(key(), value); } catch (_) { window.showToast?.('Не удалось сохранить настройку'); if (control) control.value = mode; return; }
    mode = value; sync();
  }
  function play(node, frames, duration = 180) {
    if (!node?.isConnected || typeof node.animate !== 'function' || !enabled()) { stats.skipped++; return null; }
    const current = active.get(node); if (current) { current.cancel(); active.delete(node); }
    const lite = policy() === 'lite', limit = lite ? 1 : coarse.matches ? 3 : 4;
    if (active.size >= limit) { stats.skipped++; return null; }
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) { stats.skipped++; return null; }
    const animation = node.animate(lite ? [{ opacity: .9 }, { opacity: 1 }] : typeof frames === 'function' ? frames(rect) : frames, {
      duration: lite ? 105 : duration, easing: 'cubic-bezier(.22,.8,.23,1)', fill: 'none'
    });
    active.set(node, animation); stats.started++; stats.peak = Math.max(stats.peak, active.size);
    const finish = () => { if (active.get(node) === animation) active.delete(node); };
    animation.finished.then(finish, finish);
    return animation;
  }
  function reveal(node, kind = 'surface') {
    const [opacity,x,y,scale,duration] = Object.hasOwn(profiles,kind)?profiles[kind]:profiles.surface;
    return play(node, rect => {
      if ((!x&&!y)||kind!=='drawer'&&(rect.height>=innerHeight*.86||rect.width>=innerWidth*.96)) return [{ opacity }, { opacity: 1 }];
      // Keep small surfaces inside the viewport throughout their entrance.
      const tall = innerWidth < 700 && rect.height > innerHeight * .54;
      const clamp=(delta,start,end)=>Math.max(Math.min(0,-start),Math.min(Math.max(0,end),delta));
      const dx=clamp(tall?0:x*(node.classList.contains('left')?-1:1),rect.left,innerWidth-rect.right);
      const dy=clamp(tall?Math.min(y||7,7):y,rect.top,innerHeight-rect.bottom);
      // Keep existing centering/positioning transforms on anchored menus and modal cards.
      const base = getComputedStyle(node).transform, suffix = base === 'none' ? '' : ' '+base;
      return [{ opacity, transform:'translate('+dx+'px,'+dy+'px)'+suffix+' scale('+(tall ? 1 : scale)+')' }, { opacity:1,transform:base }];
    }, duration);
  }
  function reorder(rail, before) {
    if (!enabled() || !rail?.isConnected || !(before instanceof Map)) return;
    const clip = rail.getBoundingClientRect();
    for (const node of rail.children) {
      const old = before.get(node); if (!old) continue;
      active.get(node)?.cancel(); active.delete(node);
      const now = node.getBoundingClientRect(), dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 1 || now.right <= clip.left || now.left >= clip.right) continue;
      play(node, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(0,0)' }], 210);
    }
  }
  function cancelWithin(root) {
    if(!root)return;
    for (const [item, animation] of active) if (item === root || root.contains(item)) { animation.cancel(); active.delete(item); }
  }
  function register(node, animateNew) {
    if (surfaces.has(node) || surfaces.size >= 120) return;
    const matched=rules.filter(rule=>node.matches(rule[0]));
    const before=matched.map(rule=>!animateNew&&rule[1](node));
    const update=()=>matched.forEach((rule,i)=>{
      const now=rule[1](node);
      if(now===before[i])return;before[i]=now;stats.surfaceChanges++;
      const item=rule[3]?.(node)||node;
      if(now){
        // Opening a whole dialog and its initial tab are one visual entrance.
        if(!item.closest('[inert]')&&![...active.keys()].some(parent=>parent!==item&&parent.contains(item)))reveal(item,rule[2]);
      }
      else cancelWithin(item);
    });
    const observer=new MutationObserver(update);
    observer.observe(node,{attributes:true,attributeFilter:[...new Set(matched.flatMap(rule=>(rule[4]||'class').split(' ')))]});
    surfaces.set(node,observer);if(animateNew)update();
  }
  function discover(root,animateNew=false) { if (root.matches?.(selector)) register(root,animateNew); root.querySelectorAll?.(selector).forEach(node=>register(node,animateNew)); }
  discover(document);
  // App portals/dialogs are direct body children. Message subtree mutations are irrelevant.
  const mounts=new MutationObserver(records => {
    let removed=false;
    for (const record of records) {
      for (const node of record.removedNodes) if (node.nodeType===1&&!node.isConnected) { removed=true;cancelWithin(node); }
      for (const node of record.addedNodes) if(node.nodeType===1&&node.parentNode===record.target){
        discover(node,true);
        const call=node.id==='voice-call-overlay'&&node.querySelector('.voice-call-surface');
        if(call)mounts.observe(call,{childList:true});
      }
    }
    if(removed)for(const [surface,observer] of surfaces)if(!surface.isConnected){observer.disconnect();surfaces.delete(surface);}
  });
  mounts.observe(document.body,{childList:true});
  const call=document.querySelector('#voice-call-overlay .voice-call-surface');
  if(call)mounts.observe(call,{childList:true});
  // Single delegated press owner: no per-button listeners, tagging or subtree scanner.
  function actionable(node){return node?.isConnected&&!node.matches(':disabled')&&!node.closest('[aria-disabled="true"],[inert]');}
  function press(node) { release(); if (!enabled() || !actionable(node)) return; pressed = node; node.classList.add('is-pressing-v184'); }
  document.addEventListener('pointerdown', event => {
    if(event.button!==0||event.isPrimary===false)return;
    press(event.target.closest?.(buttonSelector));if(pressed)pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  },{capture:true,passive:true});
  document.addEventListener('pointermove', event => { if (pointer&&pointer.id===event.pointerId && Math.abs(event.clientX - pointer.x) + Math.abs(event.clientY - pointer.y) > 12) release(); }, { capture:true,passive:true });
  document.addEventListener('keydown', event => { if (!event.repeat && ['Enter',' '].includes(event.key) && event.target.matches?.(buttonSelector)) press(event.target); },true);
  document.addEventListener('keyup', event=>{if(!pointer&&['Enter',' '].includes(event.key))release();},true);
  for (const name of ['pointerup','pointercancel','lostpointercapture']) window.addEventListener(name,event=>{if(pointer?.id===event.pointerId)release();},{capture:true,passive:true});
  window.addEventListener('blur',release);
  // A quick tap can end before a press frame paints. Give it a single soft afterglow.
  document.addEventListener('click',event=>{
    if(!event.isTrusted||!enabled())return;
    const node=event.target.closest?.(buttonSelector);
    if(!actionable(node)||typeof node.animate!=='function')return;
    clickAnimation?.cancel();
    const opacity=Number(getComputedStyle(node).opacity)||1;
    const job=clickAnimation=node.animate([{opacity:opacity*.86},{opacity}],{duration:145,easing:'ease-out',fill:'none'});
    const done=()=>{if(clickAnimation===job)clickAnimation=null;};job.finished.then(done,done);
  },true);
  document.addEventListener('toggle',event=>{
    const details=event.target;if(!details.matches?.('details'))return;
    const content=details.querySelector(':scope > :not(summary)');
    if(details.open)reveal(content,'strip');else cancelWithin(details);
  },true);
  document.addEventListener('exstra-settings-view-v184', event => { reveal(event.detail?.target, 'section'); if (event.detail?.content) reveal(event.detail.content, 'section'); });
  let phoneView=document.body.dataset.phonePage;
  const phone = new MutationObserver(() => {
    const page = document.body.dataset.phonePage;
    if(page===phoneView)return;phoneView=page;
    if (page === 'you' || page === 'more') reveal(document.querySelector('#phone-' + page + '-v159 .phone-page-scroll-v159'), 'section');
    else if(page==='chats'&&document.body.classList.contains('telechat-phone-v159'))reveal(document.getElementById('contacts-list'),'screen');
  }); phone.observe(document.body, { attributes: true, attributeFilter: ['data-phone-page'] });
  const settings = document.getElementById('settings-panel');
  if (settings) {
    const section = document.createElement('section'); section.className = 'panel-section'; section.id = 'interface-motion-settings-v184';
    section.innerHTML = '<div class="panel-section-title">Интерфейс и плавность</div><label class="motion-field-v184">Анимации интерфейса<select aria-label="Анимации интерфейса"><option value="auto">Автоматически</option><option value="full">Плавные</option><option value="off">Без эффектов</option></select></label><p>Отклик кнопок и плавное открытие окон, меню и разделов. Автоматический режим упрощает эффекты на слабых устройствах и при экономии трафика. Системное уменьшение движения учитывается всегда. Анимации глазок и смайликов настраиваются отдельно.</p>';
    settings.append(section); control = section.querySelector('select'); control.onchange = () => set(control.value);
  }
  document.body.classList.add('exstra-motion-v184');
  reduce.addEventListener?.('change', sync); navigator.connection?.addEventListener?.('change', sync);
  window.addEventListener('telechat-account-ready-v175', () => { owner = ''; stop(); sync(); });
  window.addEventListener('storage', event => { if (event.key === key()) { owner = ''; sync(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('telechat-native-visibility', event => { nativeHidden = !!event.detail?.background; if (nativeHidden) stop(); });
  window.exstraMotionV184 = Object.freeze({ reveal, reorder, enabled, stop, set, getState: () => ({ mode, policy: policy(), active: active.size, feedback:!!clickAnimation, surfaces: surfaces.size, ...stats }) });
  sync();
})();
