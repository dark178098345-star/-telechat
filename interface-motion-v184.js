/* Finite, event-driven UI motion. Never observes message history or runs an idle loop. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)'), active = new Map(), surfaces = new Map();
  const selector = 'dialog,.side-panel,.modal-overlay,.message-modal-overlay-v36,#user-profile-modal,#profile-quick-v91,#emoji-picker,#attachment-menu-v141,#ctx-menu,.contact-menu,#pending-media';
  const stats = { started: 0, skipped: 0, peak: 0, surfaceChanges: 0 };
  let mode = 'auto', owner = '', nativeHidden = false, pressed = null, pointer = null, control;
  const self = () => { try { return String(me?.nick || 'guest'); } catch (_) { return 'guest'; } };
  const key = () => 'exstrachat.interface-motion.v184.' + self();
  function policy() {
    if (reduce.matches || mode === 'off') return 'off';
    const constrained = (Number(navigator.deviceMemory) || 8) <= 2 || (Number(navigator.hardwareConcurrency) || 8) <= 2 || navigator.connection?.saveData;
    return mode === 'auto' && constrained ? 'lite' : 'full';
  }
  function enabled() { return policy() !== 'off' && !document.hidden && !nativeHidden; }
  function release() { pressed?.classList.remove('is-pressing-v184'); pressed = pointer = null; }
  function stop() { for (const animation of active.values()) animation.cancel(); active.clear(); release(); }
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
  function play(node, frames, duration = 180, kind = 'surface') {
    if (!node?.isConnected || typeof node.animate !== 'function' || !enabled()) { stats.skipped++; return null; }
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) { stats.skipped++; return null; }
    const current = active.get(node); if (current) { current.cancel(); active.delete(node); }
    const limit = policy() === 'lite' ? 1 : coarse.matches ? 3 : 4;
    if (active.size >= limit) { stats.skipped++; return null; }
    const animation = node.animate(policy() === 'lite' ? [{ opacity: .72 }, { opacity: 1 }] : frames, {
      duration: policy() === 'lite' ? 110 : duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none'
    });
    active.set(node, animation); stats.started++; stats.peak = Math.max(stats.peak, active.size);
    const finish = () => { if (active.get(node) === animation) active.delete(node); };
    animation.finished.then(finish, finish);
    return animation;
  }
  function reveal(node, kind = 'surface') {
    const still = kind === 'photo' || node?.matches('.side-panel,.user-profile-card,.modal-overlay,.message-modal-overlay-v36') || (node?.matches('dialog') && innerWidth < 600);
    return play(node, still ? [{ opacity: .55 }, { opacity: 1 }] : [
      { opacity: .5, transform: 'translateY(7px) scale(.99)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], kind === 'photo' ? 200 : 180, kind);
  }
  function reorder(rail, before) {
    if (!enabled() || !rail?.isConnected || !(before instanceof Map)) return;
    const clip = rail.getBoundingClientRect();
    for (const node of rail.children) {
      const old = before.get(node); if (!old) continue;
      active.get(node)?.cancel(); active.delete(node);
      const now = node.getBoundingClientRect(), dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 1 || now.right <= clip.left || now.left >= clip.right) continue;
      play(node, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(0,0)' }], 210, 'reorder');
    }
  }
  function opened(node) {
    if (node.matches('dialog')) return node.open;
    if (node.id === 'attachment-menu-v141') return !node.hidden;
    return node.classList.contains(node.matches('.side-panel,#emoji-picker') ? 'open' : 'show');
  }
  function target(node) { return node.matches('.modal-overlay,.message-modal-overlay-v36') ? node.querySelector('.user-profile-card,.modal,.modal-box,.message-modal-v36') || node : node; }
  function register(node) {
    if (surfaces.has(node) || surfaces.size >= 80) return;
    let was = opened(node);
    const observer = new MutationObserver(() => {
      const now = opened(node); if (now === was) return; was = now; stats.surfaceChanges++;
      const item = target(node);
      if (now) reveal(item); else for (const [node, animation] of active) if (node === item || item.contains(node)) { animation.cancel(); active.delete(node); }
    });
    observer.observe(node, { attributes: true, attributeFilter: ['class', 'hidden', 'open'] }); surfaces.set(node, observer);
  }
  function discover(root) { if (root.matches?.(selector)) register(root); root.querySelectorAll?.(selector).forEach(register); }
  discover(document);
  // App portals/dialogs are direct body children. Message subtree mutations are irrelevant.
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) if (node.nodeType === 1) {
        for (const [surface, observer] of surfaces) if (surface === node || node.contains(surface)) { observer.disconnect(); surfaces.delete(surface); }
        for (const [item, animation] of active) if (item === node || node.contains(item)) { animation.cancel(); active.delete(item); }
      }
      for (const node of record.addedNodes) if (node.nodeType === 1) discover(node);
    }
  }).observe(document.body, { childList: true });
  // Single delegated press owner: no per-button listeners, tagging or subtree scanner.
  function press(node) { release(); if (!enabled() || !node || node.disabled || node.getAttribute('aria-disabled') === 'true') return; pressed = node; node.classList.add('is-pressing-v184'); }
  document.addEventListener('pointerdown', event => { if (event.button !== 0) return; press(event.target.closest?.('button,[role="button"]')); if (pressed) pointer = { x: event.clientX, y: event.clientY }; }, { passive: true });
  document.addEventListener('pointermove', event => { if (pointer && Math.abs(event.clientX - pointer.x) + Math.abs(event.clientY - pointer.y) > 12) release(); }, { passive: true });
  document.addEventListener('keydown', event => { if (!event.repeat && ['Enter', ' '].includes(event.key) && event.target.matches?.('button,[role="button"]')) press(event.target); });
  document.addEventListener('keyup', release); for (const name of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(name, release, { passive: true });
  document.addEventListener('exstra-settings-view-v184', event => { reveal(event.detail?.target, 'section'); if (event.detail?.content) reveal(event.detail.content, 'section'); });
  const phone = new MutationObserver(() => {
    const page = document.body.dataset.phonePage;
    if (page === 'you' || page === 'more') reveal(document.querySelector('#phone-' + page + '-v159 .phone-page-scroll-v159'), 'section');
  }); phone.observe(document.body, { attributes: true, attributeFilter: ['data-phone-page'] });
  const settings = document.getElementById('settings-panel');
  if (settings) {
    const section = document.createElement('section'); section.className = 'panel-section'; section.id = 'interface-motion-settings-v184';
    section.innerHTML = '<div class="panel-section-title">Интерфейс и плавность</div><label class="motion-field-v184">Анимации интерфейса<select aria-label="Анимации интерфейса"><option value="auto">Автоматически</option><option value="full">Плавные</option><option value="off">Без эффектов</option></select></label><p>Короткие переходы меню, разделов и фото. Автоматический режим упрощает эффекты на слабых устройствах и при экономии трафика. Системное уменьшение движения учитывается всегда. Анимации глазок и смайликов настраиваются отдельно.</p>';
    settings.append(section); control = section.querySelector('select'); control.onchange = () => set(control.value);
  }
  document.body.classList.add('exstra-motion-v184');
  reduce.addEventListener?.('change', sync); navigator.connection?.addEventListener?.('change', sync);
  window.addEventListener('telechat-account-ready-v175', () => { owner = ''; stop(); sync(); });
  window.addEventListener('storage', event => { if (event.key === key()) { owner = ''; sync(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('telechat-native-visibility', event => { nativeHidden = !!event.detail?.background; if (nativeHidden) stop(); });
  window.exstraMotionV184 = Object.freeze({ reveal, reorder, enabled, stop, set, getState: () => ({ mode, policy: policy(), active: active.size, surfaces: surfaces.size, ...stats }) });
  sync();
})();
