/* TELECHAT DESKTOP INTERACTION GUARD V48 */
(() => {
  'use strict';

  let lastRescueV48 = 0;

  function navButtonAtV48(x, y) {
    const nav = document.querySelector('.telechat-bottom-nav');
    if (!nav || document.getElementById('sidebar')?.classList.contains('hidden')) return null;
    const rect = nav.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    return [...nav.querySelectorAll('.telechat-nav-btn[data-nav]')].find(button => {
      const box = button.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }) || null;
  }

  function clearStaleOverlayV48() {
    if (document.querySelector('.side-panel.open')) return;
    const overlay = document.getElementById('overlay');
    overlay?.classList.remove('show');
    overlay?.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('pointerup', event => {
    if (document.querySelector('.side-panel.open')) return;
    const button = navButtonAtV48(event.clientX, event.clientY);
    if (!button || button.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lastRescueV48 = performance.now();
    clearStaleOverlayV48();
    window.telechatNavigate?.(button.dataset.nav);
  }, true);

  document.addEventListener('click', event => {
    if (performance.now() - lastRescueV48 > 450) return;
    if (!navButtonAtV48(event.clientX, event.clientY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  addEventListener('focus', clearStaleOverlayV48, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) clearStaleOverlayV48();
  }, { passive: true });

  setTimeout(() => document.getElementById('startup-loader')?.remove(), 4200);
  clearStaleOverlayV48();
})();
