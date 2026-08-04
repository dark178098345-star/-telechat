/* TELECHAT CHAT BOOT FAILSAFE V49 */
(() => {
  'use strict';

  let releaseTimerV49 = 0;
  let readyTimerV49 = 0;

  function loaderV49() {
    return document.getElementById('chat-boot-v41');
  }

  function releaseV49() {
    clearTimeout(releaseTimerV49);
    clearTimeout(readyTimerV49);
    const loader = loaderV49();
    if (!loader) return;
    loader.classList.remove('is-visible');
    loader.classList.add('force-hidden-v49');
    loader.setAttribute('aria-hidden', 'true');
  }

  function armV49() {
    clearTimeout(releaseTimerV49);
    const loader = loaderV49();
    if (!loader?.classList.contains('is-visible')) return;
    loader.classList.remove('force-hidden-v49');
    releaseTimerV49 = setTimeout(releaseV49, 4200);
  }

  function releaseWhenReadyV49() {
    clearTimeout(readyTimerV49);
    if (!loaderV49()?.classList.contains('is-visible')) return;
    const list = document.getElementById('contacts-list');
    if (list?.querySelector('.contact')) readyTimerV49 = setTimeout(releaseV49, 260);
  }

  const loader = loaderV49();
  if (loader) {
    new MutationObserver(() => {
      armV49();
      releaseWhenReadyV49();
    }).observe(loader, { attributes: true, attributeFilter: ['class'] });
  }

  const contacts = document.getElementById('contacts-list');
  if (contacts) {
    new MutationObserver(releaseWhenReadyV49).observe(contacts, { childList: true, subtree: true });
  }

  addEventListener('load', releaseWhenReadyV49, { once: true });
  setTimeout(releaseV49, 5200);
  armV49();
  releaseWhenReadyV49();

  window.telechatReleaseBootV49 = releaseV49;
})();
