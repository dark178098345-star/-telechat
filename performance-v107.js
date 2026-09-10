/* TELECHAT PERFORMANCE V107 — single-flight background work, same UI */
(() => {
  'use strict';

  const CALM_KEY = 'telechat_calm_mode_v95';
  const style = document.createElement('style');
  style.textContent = `
    /* Calm mode keeps the exact same surfaces and layout, but stops decorative
       background motion so the device does not continuously repaint the page. */
    body.telechat-calm-v107 .emoji-bg::before,
    body.telechat-calm-v107 .emoji-bg::after,
    body.telechat-calm-v107 .cosmic-star-v27,
    body.telechat-calm-v107 .cosmic-moon-v29,
    body.telechat-calm-v107 .cosmic-shooting-star-v27,
    body.telechat-calm-v107 .emoji-particle,
    body.telechat-calm-v107 .meteor,
    body.telechat-calm-v107 .moon-showcase-star { animation-play-state: paused !important; }
  `;
  document.head.appendChild(style);

  const isCalm = () => {
    try { return localStorage.getItem(CALM_KEY) === 'true'; } catch (_) { return false; }
  };

  function syncCalmClass() {
    document.body?.classList.toggle('telechat-calm-v107', isCalm());
  }
  syncCalmClass();
  addEventListener('storage', event => { if (event.key === CALM_KEY || event.key === null) syncCalmClass(); }, { passive: true });
  document.addEventListener('change', event => {
    if (event.target?.id === 'calm-mode-v95') requestAnimationFrame(syncCalmClass);
  }, { passive: true });

  function wrapSingleFlight(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__performanceV107) return;
    let inFlight = null;
    const wrapped = function (...args) {
      if (inFlight) return inFlight;
      const value = original.apply(this, args);
      if (!value || typeof value.then !== 'function') return value;
      inFlight = Promise.resolve(value).finally(() => { inFlight = null; });
      return inFlight;
    };
    wrapped.__performanceV107 = true;
    wrapped.__performanceV107Original = original;
    window[name] = wrapped;
  }

  function wrapRateLimited(name, normalGap, calmGap) {
    const original = window[name];
    if (typeof original !== 'function' || original.__performanceV107) return;
    let inFlight = null;
    let lastRun = 0;
    const wrapped = function (...args) {
      if (inFlight) return inFlight;
      const gap = isCalm() ? calmGap : normalGap;
      if (Date.now() - lastRun < gap) return Promise.resolve();
      lastRun = Date.now();
      const value = original.apply(this, args);
      if (!value || typeof value.then !== 'function') return value;
      inFlight = Promise.resolve(value).finally(() => { inFlight = null; });
      return inFlight;
    };
    wrapped.__performanceV107 = true;
    wrapped.__performanceV107Original = original;
    window[name] = wrapped;
  }

  // Calls from timers, realtime events and panel opening now share one request.
  wrapRateLimited('updateOnline', 15000, 30000);
  wrapRateLimited('updateStatusBar', 5000, 15000);
  wrapSingleFlight('renderContacts');

  // Badge decoration is visual-only work; several observers can request it in
  // the same turn. Keep one paint per frame without changing the result.
  const badges = window.enhanceVerifiedBadges;
  if (typeof badges === 'function' && !badges.__performanceV107) {
    let frame = 0;
    const wrappedBadges = function (...args) {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; badges.apply(this, args); });
    };
    wrappedBadges.__performanceV107 = true;
    window.enhanceVerifiedBadges = wrappedBadges;
  }

  window.telechatPerformanceV107 = {
    version: 107,
    calm: isCalm,
    sync: syncCalmClass
  };
})();
