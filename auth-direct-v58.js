/* TELECHAT AUTH DIRECT V58
   The login button deliberately bypasses every old wrapper and the Supabase
   client chain. A direct, short REST request prevents media loading or an old
   extension from ever leaving the interface on "Вход…". */
(() => {
  'use strict';

  const API_URL_V58 = 'https://xvnazoervzccixtfhuaa.supabase.co/rest/v1/users';
  const API_KEY_V58 = 'sb_publishable_XuzevkpQFrhxRccCR4kc6w_M_vIXTgG';
  const MAX_WAIT_V58 = 9000;
  let attemptV58 = 0;
  let onlineTimerV58 = 0;

  const nodeV58 = id => document.getElementById(id);
  const nickV58 = value => String(value || '').trim().toLowerCase();

  function restoreV58(message = '') {
    const button = nodeV58('login-btn');
    const error = nodeV58('auth-err');
    if (button) {
      button.disabled = false;
      button.textContent = 'Войти';
      delete button.dataset.telechatLoginBusy;
      delete button.dataset.busyV50;
      delete button.dataset.busyV57;
    }
    if (error) error.textContent = message;
  }

  function loadingV58() {
    const button = nodeV58('login-btn');
    const error = nodeV58('auth-err');
    if (button) {
      button.disabled = true;
      button.textContent = 'Вход…';
      button.dataset.telechatLoginBusy = '1';
    }
    if (error) error.textContent = '';
  }

  async function requestV58(nick, pass) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), MAX_WAIT_V58);
    const query = new URLSearchParams({
      select: 'nick',
      nick: `eq.${nick}`,
      pass: `eq.${pass}`,
      limit: '1'
    });
    try {
      const response = await fetch(`${API_URL_V58}?${query.toString()}`, {
        method: 'GET',
        headers: {
          apikey: API_KEY_V58,
          Authorization: `Bearer ${API_KEY_V58}`,
          Accept: 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const rows = await response.json();
      return Array.isArray(rows) ? rows[0] || null : null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function openAppV58(currentNick) {
    nodeV58('auth-screen')?.classList.remove('active');
    nodeV58('chat-screen')?.classList.add('active');

    // Let the first paint happen before optional application work begins.
    requestAnimationFrame(() => {
      try { buildProfPanel?.(); buildEmojiPicker?.(); } catch (error) {}
      Promise.resolve(renderContacts?.()).catch(() => {});
      Promise.resolve(updateOnline?.()).catch(() => {});
      clearInterval(onlineTimerV58);
      onlineTimerV58 = setInterval(() => Promise.resolve(updateOnline?.()).catch(() => {}), 25000);

      // Profile media is useful, but it is never allowed to delay opening chats.
      Promise.resolve(sb?.from('users').select('*').eq('nick', currentNick).maybeSingle())
        .then(result => {
          if (!result?.data || !me || nickV58(me.nick) !== currentNick) return;
          Object.assign(me, result.data);
          try { userCache[me.nick] = me; buildProfPanel?.(); } catch (error) {}
          Promise.resolve(window.loadModerationDirectoryV19?.()).catch(() => {});
        })
        .catch(() => {});
    });
  }

  async function directLoginV58() {
    const nick = nickV58(nodeV58('l-login')?.value);
    const pass = nodeV58('l-pass')?.value || '';
    const button = nodeV58('login-btn');
    const attempt = ++attemptV58;

    if (!nick || !pass) {
      restoreV58('Введи логин и пароль!');
      return false;
    }
    if (button?.dataset.telechatLoginBusy === '1') return false;
    loadingV58();

    try {
      const account = await requestV58(nick, pass);
      if (attempt !== attemptV58) return false;
      if (!account?.nick) {
        restoreV58('Неверный логин или пароль');
        return false;
      }
      me = { nick: account.nick, name: account.nick, avatar: '🐱' };
      try { userCache[me.nick] = me; } catch (error) {}
      openAppV58(nickV58(me.nick));
      restoreV58();
      return true;
    } catch (error) {
      if (attempt === attemptV58) {
        restoreV58(error?.name === 'AbortError'
          ? 'Сервер отвечает слишком долго. Попробуй ещё раз.'
          : 'Не удалось выполнить вход. Проверь интернет и попробуй ещё раз.');
      }
      return false;
    }
  }

  function interceptV58(event) {
    const target = event.target?.closest?.('#login-btn');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    directLoginV58();
  }

  function interceptEnterV58(event) {
    if (event.key !== 'Enter' || !event.target?.matches?.('#l-login, #l-pass')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    directLoginV58();
  }

  window.doLogin = directLoginV58;
  document.addEventListener('click', interceptV58, true);
  document.addEventListener('keydown', interceptEnterV58, true);
  window.setTimeout(() => restoreV58(), 0);
})();
