/* Apply the saved appearance before the first paint. Phones default to calm mode. */
(() => {
  'use strict';
  const key = 'telechat_calm_mode_v95';
  const stylesheet = document.getElementById('calm-style-v95');
  const phoneQuery = matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))');
  let calm = false;
  let hasPreference = false;

  function readPreference() {
    try {
      const saved = localStorage.getItem(key);
      hasPreference = saved !== null;
      calm = saved === 'true' || (!hasPreference && phoneQuery.matches);
    } catch (_) {
      hasPreference = false;
      calm = phoneQuery.matches;
    }
  }
  readPreference();

  function apply() {
    if (stylesheet) stylesheet.media = calm ? 'all' : 'not all';
    const toggle = document.getElementById('calm-mode-v95');
    if (toggle) toggle.checked = calm;
    const glass = document.getElementById('glass-toggle-v36');
    if (glass) {
      // Retain the existing glass preference when switching back.
      glass.disabled = calm;
      const note = glass.closest('.setting-row')?.querySelector('.setting-note');
      if (note) note.textContent = calm
        ? 'Чтобы включить стекло, выключи спокойный режим выше'
        : 'Полупрозрачные панели в стиле iOS';
    }
  }
  apply();
  function ready() {
    apply();
    document.getElementById('calm-mode-v95')?.addEventListener('change', event => {
      calm = event.target.checked;
      hasPreference = true;
      try { localStorage.setItem(key, String(calm)); } catch (_) {}
      apply();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  phoneQuery.addEventListener?.('change', () => {
    if (hasPreference) return;
    calm = phoneQuery.matches;
    apply();
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      readPreference();
      apply();
    }
  });
})();
