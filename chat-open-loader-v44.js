/* TELECHAT CHAT OPEN LOADER V44 */
(() => {
  'use strict';

  let openTokenV44 = 0;
  let slowTimerV44 = 0;
  let verySlowTimerV44 = 0;
  const waitV44 = ms => new Promise(resolve => setTimeout(resolve, ms));

  function ensureChatLoaderV44() {
    let loader = document.getElementById('chat-open-loader-v44');
    if (loader) return loader;
    const activeChat = document.getElementById('active-chat');
    if (!activeChat) return null;
    loader = document.createElement('div');
    loader.id = 'chat-open-loader-v44';
    loader.className = 'chat-open-loader-v44';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.setAttribute('aria-hidden', 'true');
    loader.innerHTML = `
      <div class="chat-open-card-v44">
        <div class="chat-open-avatar-wrap-v44" aria-hidden="true">
          <span class="chat-open-avatar-ring-v44"></span>
          <div class="chat-open-avatar-v44" id="chat-open-avatar-v44">💬</div>
        </div>
        <div class="chat-open-title-v44" id="chat-open-title-v44">Открываем чат</div>
        <div class="chat-open-status-v44" id="chat-open-status-v44">Загружаем сообщения…</div>
        <div class="chat-open-progress-v44" aria-hidden="true"><span></span></div>
        <div class="chat-open-bubbles-v44" aria-hidden="true">
          <i class="chat-open-bubble-v44"></i><i class="chat-open-bubble-v44"></i><i class="chat-open-bubble-v44"></i>
        </div>
      </div>`;
    activeChat.appendChild(loader);
    return loader;
  }

  function cachedUserV44(nick) {
    try {
      return typeof userCache === 'object' && userCache ? userCache[nick] : null;
    } catch (error) { return null; }
  }

  function fillLoaderIdentityV44(kind, value) {
    const avatar = document.getElementById('chat-open-avatar-v44');
    const title = document.getElementById('chat-open-title-v44');
    if (!avatar || !title) return;
    avatar.classList.toggle('is-room', kind === 'room');
    avatar.replaceChildren();
    if (kind === 'room') {
      const room = value || {};
      avatar.textContent = room.icon || '🌌';
      title.textContent = room.name || 'Пространство';
      return;
    }
    const nick = String(value || '').toLowerCase();
    const user = cachedUserV44(nick);
    title.textContent = user?.name || (nick ? '@' + nick : 'Личный чат');
    if (user && typeof setAvatarElement === 'function') setAvatarElement(avatar, user);
    else avatar.textContent = '💬';
  }

  function setStatusV44(text) {
    const status = document.getElementById('chat-open-status-v44');
    if (status) status.textContent = text;
  }

  function showLoaderV44(token, kind, value) {
    const activeChat = document.getElementById('active-chat');
    const empty = document.getElementById('empty-state');
    const loader = ensureChatLoaderV44();
    if (!activeChat || !loader) return;
    activeChat.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    fillLoaderIdentityV44(kind, value);
    setStatusV44('Загружаем сообщения…');
    loader.classList.remove('is-leaving');
    loader.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => loader.classList.add('is-visible'));

    clearTimeout(slowTimerV44);
    clearTimeout(verySlowTimerV44);
    slowTimerV44 = setTimeout(() => {
      if (token === openTokenV44) setStatusV44('Связь медленнее обычного…');
    }, 2800);
    verySlowTimerV44 = setTimeout(() => {
      if (token === openTokenV44) setStatusV44('Ещё немного — загружаем историю');
    }, 7000);

    if (window.innerWidth <= 640) document.getElementById('sidebar')?.classList.add('hidden');
  }

  async function hideLoaderV44(token) {
    if (token !== openTokenV44) return;
    clearTimeout(slowTimerV44);
    clearTimeout(verySlowTimerV44);
    const loader = document.getElementById('chat-open-loader-v44');
    if (!loader) return;
    loader.classList.add('is-leaving');
    loader.classList.remove('is-visible');
    await waitV44(190);
    if (token !== openTokenV44) return;
    loader.classList.remove('is-leaving');
    loader.setAttribute('aria-hidden', 'true');
  }

  function wrapOpenV44(name, kind) {
    const previous = window[name];
    if (typeof previous !== 'function' || previous.__chatLoaderV44) return;
    const wrapped = async function(value, ...rest) {
      const token = ++openTokenV44;
      const started = performance.now();
      showLoaderV44(token, kind, value);
      try {
        const result = await previous.call(this, value, ...rest);
        const minimum = Math.max(0, 460 - (performance.now() - started));
        if (minimum) await waitV44(minimum);
        if (token === openTokenV44) {
          setStatusV44('Чат готов ✦');
          await waitV44(110);
        }
        return result;
      } catch (error) {
        if (token === openTokenV44) {
          setStatusV44('Не удалось загрузить чат');
          if (typeof showToast === 'function') showToast('Не удалось загрузить чат');
          await waitV44(520);
        }
        throw error;
      } finally {
        await hideLoaderV44(token);
      }
    };
    wrapped.__chatLoaderV44 = true;
    window[name] = wrapped;
  }

  const previousBackV44 = window.goBack;
  if (typeof previousBackV44 === 'function') {
    window.goBack = function(...args) {
      openTokenV44++;
      clearTimeout(slowTimerV44);
      clearTimeout(verySlowTimerV44);
      const loader = document.getElementById('chat-open-loader-v44');
      loader?.classList.remove('is-visible','is-leaving');
      loader?.setAttribute('aria-hidden','true');
      return previousBackV44.apply(this,args);
    };
  }

  ensureChatLoaderV44();
  wrapOpenV44('openChat','chat');
  wrapOpenV44('openRoom','room');
})();
