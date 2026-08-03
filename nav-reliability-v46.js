/* TELECHAT NAVIGATION RELIABILITY V46 */
(() => {
  'use strict';

  const PANEL_BY_TARGET_V46 = {
    settings: 'settings-panel',
    profile: 'profile-panel'
  };

  function setActiveV46(target) {
    document.querySelectorAll('.telechat-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.nav === target);
    });
  }

  function closePanelsV46() {
    document.querySelectorAll('.side-panel').forEach(panel => panel.classList.remove('open'));
    document.getElementById('overlay')?.classList.remove('show');
  }

  function openPanelV46(id) {
    const panel = document.getElementById(id);
    if (!panel) return false;
    document.querySelectorAll('.side-panel').forEach(item => item.classList.toggle('open', item === panel));
    document.getElementById('overlay')?.classList.add('show');
    panel.scrollTop = 0;
    return true;
  }

  function currentUserV46() {
    try { return typeof me !== 'undefined' ? me : null; } catch (error) { return null; }
  }

  function refreshProfileV46() {
    const user = currentUserV46();
    if (!user) return false;
    try {
      if (typeof window.buildProfPanel === 'function') window.buildProfPanel();
    } catch (error) {
      console.warn('[tele.chat] profile panel refresh failed', error);
    }
    try {
      const avatar = document.getElementById('footer-profile-avatar');
      if (avatar && typeof window.avatarMarkup === 'function') avatar.innerHTML = window.avatarMarkup(user);
    } catch (error) {}
    return true;
  }

  function navigateV46(target) {
    const next = String(target || 'chats');
    if (next === 'chats') {
      closePanelsV46();
      setActiveV46('chats');
      return true;
    }
    if (next === 'profile' && !refreshProfileV46()) {
      if (typeof window.showToast === 'function') window.showToast('Профиль ещё загружается…');
      return false;
    }
    const panelId = PANEL_BY_TARGET_V46[next];
    if (!panelId || !openPanelV46(panelId)) return false;
    setActiveV46(next);
    return true;
  }

  window.telechatNavigate = navigateV46;

  document.querySelector('.telechat-bottom-nav')?.addEventListener('click', event => {
    const button = event.target.closest('.telechat-nav-btn[data-nav]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    navigateV46(button.dataset.nav);
  });

  document.getElementById('overlay')?.addEventListener('click', () => setActiveV46('chats'));
})();
