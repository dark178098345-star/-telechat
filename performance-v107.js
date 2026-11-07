/* Calm-mode preference only. Presence, sidebar and badges own their scheduling. */
(() => {
  'use strict';

  const CALM_KEY = 'telechat_calm_mode_v95';
  const phoneQuery = matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))');
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
    try {
      const saved = localStorage.getItem(CALM_KEY);
      return saved === 'true' || (saved === null && phoneQuery.matches);
    } catch (_) { return phoneQuery.matches; }
  };

  function syncCalmClass() {
    document.body?.classList.toggle('telechat-calm-v107', isCalm());
  }
  syncCalmClass();
  addEventListener('storage', event => { if (event.key === CALM_KEY || event.key === null) syncCalmClass(); }, { passive: true });
  phoneQuery.addEventListener?.('change', syncCalmClass);
  document.addEventListener('change', event => {
    if (event.target?.id === 'calm-mode-v95') requestAnimationFrame(syncCalmClass);
  }, { passive: true });

  window.telechatPerformanceV107 = {
    version: 107,
    calm: isCalm,
    sync: syncCalmClass
  };
})();
