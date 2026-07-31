/* TELECHAT CHAT BOOT V41 — hide first-load avatar pop-in */
(() => {
  'use strict';

  let completedNickV41 = '';
  let activeTokenV41 = 0;
  let fallbackTimerV41 = 0;

  const waitV41 = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        <div class="chat-boot-brand-v41">tele<span>.</span>chat</div>
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
    fallbackTimerV41 = setTimeout(() => hideLoaderV41(token), 4800);
  }

  function hideLoaderV41(token) {
    if (token !== activeTokenV41) return;
    clearTimeout(fallbackTimerV41);
    const loader = document.getElementById('chat-boot-v41');
    if (!loader) return;
    loader.classList.remove('is-visible');
    loader.setAttribute('aria-hidden', 'true');
  }

  function waitForElementV41(element) {
    if (element.tagName === 'IMG') {
      if (element.complete) return Promise.resolve();
      return new Promise(resolve => {
        element.addEventListener('load', resolve, { once: true });
        element.addEventListener('error', resolve, { once: true });
      });
    }
    if (element.tagName === 'VIDEO') {
      if (element.readyState >= 1) return Promise.resolve();
      return new Promise(resolve => {
        element.addEventListener('loadedmetadata', resolve, { once: true });
        element.addEventListener('error', resolve, { once: true });
      });
    }
    return Promise.resolve();
  }

  async function waitForVisibleAvatarsV41() {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const list = document.getElementById('contacts-list');
    if (!list) return;
    const media = [...list.querySelectorAll('img.avatar-photo,video.avatar-video,video.profile-video')].slice(0, 32);
    if (!media.length) return;
    await Promise.race([
      Promise.allSettled(media.map(waitForElementV41)),
      waitV41(1700)
    ]);
  }

  const renderContactsBeforeV41 = renderContacts;
  renderContacts = async function(...args) {
    const nick = String(me?.nick || '').toLowerCase();
    const firstLoad = Boolean(nick && completedNickV41 !== nick);
    if (!firstLoad) return renderContactsBeforeV41(...args);

    completedNickV41 = nick;
    const token = ++activeTokenV41;
    const started = performance.now();
    showLoaderV41(token);

    try {
      const value = await renderContactsBeforeV41(...args);
      setProgressV41(76, 'Загружаем аватарки…');
      await waitForVisibleAvatarsV41();
      const minimum = Math.max(0, 720 - (performance.now() - started));
      if (minimum) await waitV41(minimum);
      setProgressV41(100, 'Всё готово ✦');
      await waitV41(230);
      return value;
    } finally {
      hideLoaderV41(token);
    }
  };

  ensureLoaderV41();
})();
