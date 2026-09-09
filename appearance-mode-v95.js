/* Apply the saved appearance before the first paint. Classic is the default. */
(() => {
  'use strict';
  const key = 'telechat_calm_mode_v95';
  const stylesheet = document.getElementById('calm-style-v95');
  let calm = false;
  try { calm = localStorage.getItem(key) === 'true'; } catch (_) {}

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
      try { localStorage.setItem(key, String(calm)); } catch (_) {}
      apply();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      calm = event.key === key && event.newValue === 'true';
      apply();
    }
  });
})();
