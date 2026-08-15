/* TELECHAT FLUID UI V42 — motion orchestration without extra network work */
(() => {
  'use strict';

  const reducedMotionV42 = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastListSignatureV42 = '';
  const animatedOpenPanelsV42 = new WeakSet();

  function nextFrameV42(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function syncTabsV42() {
    const tabs = document.querySelector('.sidebar-tabs');
    if (!tabs) return;
    const buttons = [...tabs.querySelectorAll('.sidebar-tab')];
    const active = Math.max(0, buttons.findIndex(button => button.classList.contains('active')));
    tabs.style.setProperty('--tab-index-v42', String(active));
  }

  function listSignatureV42(list) {
    return [...list.querySelectorAll('.contact .contact-name')]
      .map(node => node.textContent.trim().toLowerCase())
      .join('|');
  }

  function animateContactListV42(force = false) {
    if (reducedMotionV42) return;
    const list = document.getElementById('contacts-list');
    if (!list) return;
    const signature = listSignatureV42(list);
    if (!force && signature === lastListSignatureV42) return;
    lastListSignatureV42 = signature;
    [...list.querySelectorAll('.contact')].slice(0, 14).forEach((item, index) => {
      item.style.setProperty('--motion-order-v42', String(index));
    });
    list.classList.remove('v42-list-enter');
    void list.offsetWidth;
    list.classList.add('v42-list-enter');
    setTimeout(() => list.classList.remove('v42-list-enter'), 620);
    prepareMediaV42(list);
  }

  function animatePanelV42(panel) {
    if (reducedMotionV42 || !panel?.classList.contains('open')) return;
    const cards = panel.querySelectorAll('.panel-section,.profile-editor-card,.profile-choice-card,.profile-fields-card');
    cards.forEach((card, index) => card.style.setProperty('--motion-order-v42', String(index)));
    panel.classList.remove('v42-panel-enter');
    void panel.offsetWidth;
    panel.classList.add('v42-panel-enter');
    setTimeout(() => panel.classList.remove('v42-panel-enter'), 720);
  }

  function prepareMediaNodeV42(media) {
    if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return;
    const ready = media instanceof HTMLImageElement ? media.complete : media.readyState >= 2;
    if (ready || media.dataset.fluidReadyV42 === '1') return;
    media.dataset.fluidReadyV42 = '1';
    media.classList.add('v42-media-loading');
    const done = () => {
      media.classList.remove('v42-media-loading');
      media.removeEventListener('load', done);
      media.removeEventListener('error', done);
      media.removeEventListener('loadeddata', done);
    };
    media.addEventListener('load', done, { once: true });
    media.addEventListener('error', done, { once: true });
    media.addEventListener('loadeddata', done, { once: true });
  }

  function prepareMediaV42(root = document) {
    root.querySelectorAll?.('img.avatar-photo,video.avatar-video,video.profile-video').forEach(prepareMediaNodeV42);
  }

  function wrapChatOpenV42(name) {
    const previous = window[name];
    if (typeof previous !== 'function' || previous.__fluidV42) return;
    const wrapped = async function(...args) {
      const result = await previous.apply(this, args);
      prepareMediaV42(document.getElementById('active-chat') || document);
      return result;
    };
    wrapped.__fluidV42 = true;
    window[name] = wrapped;
  }

  function wrapSidebarPaintV42() {
    const previousRender = window.renderContacts;
    if (typeof previousRender === 'function' && !previousRender.__fluidV42) {
      const wrappedRender = async function(...args) {
        const result = await previousRender.apply(this, args);
        animateContactListV42(false);
        return result;
      };
      wrappedRender.__fluidV42 = true;
      window.renderContacts = wrappedRender;
    }

    const previousFilter = window.setSidebarFilter;
    if (typeof previousFilter === 'function' && !previousFilter.__fluidV42) {
      const wrappedFilter = async function(...args) {
        syncTabsV42();
        const result = await previousFilter.apply(this, args);
        syncTabsV42();
        animateContactListV42(true);
        return result;
      };
      wrappedFilter.__fluidV42 = true;
      window.setSidebarFilter = wrappedFilter;
    }
  }

  document.addEventListener('pointerdown', event => {
    const control = event.target.closest('button,[role="button"]');
    if (!control) return;
    control.classList.add('is-pressing-v42');
    const release = () => control.classList.remove('is-pressing-v42');
    addEventListener('pointerup', release, { once: true });
    addEventListener('pointercancel', release, { once: true });
  }, { passive: true });

  const observerV42 = new MutationObserver(records => {
    let syncTabs = false;
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches?.('.sidebar-tab')) syncTabs = true;
        if (record.target.matches?.('.side-panel')) {
          if (record.target.classList.contains('open')) {
            if (!animatedOpenPanelsV42.has(record.target)) {
              animatedOpenPanelsV42.add(record.target);
              animatePanelV42(record.target);
            }
          } else {
            animatedOpenPanelsV42.delete(record.target);
          }
        }
      }
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('img.avatar-photo,video.avatar-video,video.profile-video')) prepareMediaNodeV42(node);
        prepareMediaV42(node);
      });
    }
    if (syncTabs) syncTabsV42();
  });

  observerV42.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  wrapSidebarPaintV42();
  wrapChatOpenV42('openChat');
  wrapChatOpenV42('openRoom');
  syncTabsV42();
  prepareMediaV42();
  nextFrameV42(() => {
    document.body.classList.add('telechat-motion-v42');
    animateContactListV42(false);
  });
})();
