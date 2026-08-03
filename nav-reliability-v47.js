/* TELECHAT NAVIGATION RELIABILITY V47 */
(() => {
  'use strict';

  const PANEL_BY_TARGET_V47 = {
    settings: 'settings-panel',
    profile: 'profile-panel'
  };
  let animationTimerV47 = 0;

  function currentUserV47() {
    try { return typeof me !== 'undefined' ? me : null; } catch (error) { return null; }
  }

  function setActiveV47(target) {
    document.querySelectorAll('.telechat-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.nav === target);
    });
  }

  function closePanelsV47() {
    clearTimeout(animationTimerV47);
    document.querySelectorAll('.side-panel').forEach(panel => {
      panel.classList.remove('open', 'telechat-panel-opening-v47', 'v42-panel-enter');
      panel.setAttribute('aria-hidden', 'true');
    });
    const overlay = document.getElementById('overlay');
    overlay?.classList.remove('show');
    overlay?.setAttribute('aria-hidden', 'true');
  }

  function animatePanelV47(panel) {
    const items = panel.querySelectorAll('.panel-section,.profile-preview-btn,.profile-editor-card,.animated-profile-card,.profile-choice-card,.profile-fields-card,.profile-action-dock');
    items.forEach((item, index) => item.style.setProperty('--panel-order-v47', String(index)));
    panel.classList.remove('telechat-panel-opening-v47');
    void panel.offsetWidth;
    panel.classList.add('telechat-panel-opening-v47');
    clearTimeout(animationTimerV47);
    animationTimerV47 = setTimeout(() => panel.classList.remove('telechat-panel-opening-v47'), 780);
  }

  function openPanelV47(id) {
    const panel = document.getElementById(id);
    if (!panel) return false;
    document.querySelectorAll('.side-panel').forEach(item => {
      const active = item === panel;
      item.classList.toggle('open', active);
      item.setAttribute('aria-hidden', String(!active));
    });
    const overlay = document.getElementById('overlay');
    overlay?.classList.add('show');
    overlay?.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    requestAnimationFrame(() => animatePanelV47(panel));
    return true;
  }

  function refreshProfileV47() {
    const user = currentUserV47();
    if (!user) return false;
    try {
      if (typeof buildProfPanel === 'function') buildProfPanel();
    } catch (error) {
      console.warn('[tele.chat] profile panel refresh failed', error);
    }
    try {
      const avatar = document.getElementById('footer-profile-avatar');
      if (avatar && typeof avatarMarkup === 'function') avatar.innerHTML = avatarMarkup(user);
    } catch (error) {}
    return true;
  }

  function tapV47(target) {
    const button = document.querySelector(`.telechat-nav-btn[data-nav="${target}"]`);
    if (!button) return;
    button.classList.remove('telechat-nav-tap-v47');
    void button.offsetWidth;
    button.classList.add('telechat-nav-tap-v47');
    setTimeout(() => button.classList.remove('telechat-nav-tap-v47'), 300);
  }

  function navigateV47(target) {
    const next = String(target || 'chats');
    tapV47(next);
    if (next === 'chats') {
      closePanelsV47();
      setActiveV47('chats');
      return true;
    }
    if (next === 'profile' && !refreshProfileV47()) {
      if (typeof showToast === 'function') showToast('Профиль ещё загружается…');
      return false;
    }
    const panelId = PANEL_BY_TARGET_V47[next];
    if (!panelId || !openPanelV47(panelId)) return false;
    setActiveV47(next);
    return true;
  }

  window.telechatNavigate = navigateV47;
  window.telechatClosePanelsV47 = closePanelsV47;

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.telechat-bottom-nav .telechat-nav-btn[data-nav]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigateV47(button.dataset.nav);
  }, true);

  document.getElementById('overlay')?.addEventListener('click', () => {
    closePanelsV47();
    setActiveV47('chats');
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.querySelector('.side-panel.open')) return;
    closePanelsV47();
    setActiveV47('chats');
  });

  closePanelsV47();
  setActiveV47('chats');
})();
