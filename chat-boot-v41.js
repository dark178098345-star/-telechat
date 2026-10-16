/* Chat readiness follows the list, not image/video downloads. */
(() => {
  'use strict';

  let completedNickV41 = '';
  let activeTokenV41 = 0;
  let fallbackTimerV41 = 0;


  function ensureLoaderV41() {
    let loader = document.getElementById('chat-boot-v41');
    if (loader) return loader;
    const chat = document.getElementById('chat-screen');
    if (!chat) return null;
    loader = document.createElement('div');
    loader.id = 'chat-boot-v41';
    loader.className = 'chat-boot-v41';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.setAttribute('aria-hidden', 'true');
    loader.innerHTML = `
      <div class="chat-boot-card-v41">
        <div class="chat-boot-brand-v41">Exstra<span>Chat</span></div>
        <div class="chat-boot-avatars-v41" aria-hidden="true">
          <span class="chat-boot-avatar-v41"></span>
          <span class="chat-boot-avatar-v41"></span>
          <span class="chat-boot-avatar-v41"></span>
        </div>
        <div class="chat-boot-title-v41">Собираем твой космос</div>
        <div class="chat-boot-status-v41">Подключаем чаты…</div>
        <div class="chat-boot-progress-v41"><span></span></div>
        <div class="chat-boot-hint-v41">сообщения · люди · пространства</div>
      </div>`;
    chat.appendChild(loader);
    return loader;
  }

  function setProgressV41(value, text) {
    const loader = ensureLoaderV41();
    if (!loader) return;
    const bar = loader.querySelector('.chat-boot-progress-v41 span');
    const status = loader.querySelector('.chat-boot-status-v41');
    if (bar) bar.style.width = `${Math.max(8, Math.min(100, value))}%`;
    if (status && text) status.textContent = text;
  }

  function showLoaderV41(token) {
    const loader = ensureLoaderV41();
    if (!loader) return;
    clearTimeout(fallbackTimerV41);
    loader.setAttribute('aria-hidden', 'false');
    loader.classList.add('is-visible');
    setProgressV41(18, 'Подключаем чаты…');
    requestAnimationFrame(() => setProgressV41(38, 'Собираем список диалогов…'));
    fallbackTimerV41 = setTimeout(() => hideLoaderV41(token), 2600);
  }

  function hideLoaderV41(token) {
    if (token !== activeTokenV41) return;
    clearTimeout(fallbackTimerV41);
    const loader = document.getElementById('chat-boot-v41');
    if (!loader) return;
    loader.classList.remove('is-visible');
    loader.setAttribute('aria-hidden', 'true');
  }

  const renderContactsBeforeV41 = renderContacts;
  renderContacts = async function(...args) {
    const nick = String(me?.nick || '').toLowerCase();
    const firstLoad = Boolean(nick && completedNickV41 !== nick);
    if (!firstLoad) return renderContactsBeforeV41(...args);

    completedNickV41 = nick;
    const token = ++activeTokenV41;
    showLoaderV41(token);

    try {
      const value = await renderContactsBeforeV41(...args);
      // The list is interactive now; slow avatars must not hold the whole screen.
      setProgressV41(100, 'Всё готово ✦');
      return value;
    } finally {
      hideLoaderV41(token);
    }
  };

  ensureLoaderV41();
})();
