/* TELECHAT AUTH CORE V57
   Clean replacement for the old multi-wrapper login chain.
   The first request contains only the nick, so large profile media can never
   freeze the sign-in screen. */
(() => {
  'use strict';

  const LOGIN_TIMEOUT_V57 = 8000;
  let loginAttemptV57 = 0;
  let onlineTimerV57 = 0;

  const normalizedV57 = value => String(value || '').trim().toLowerCase();

  function authUiV57(loading, message = '') {
    const button = document.getElementById('login-btn');
    const error = document.getElementById('auth-err');
    if (button) {
      button.disabled = Boolean(loading);
      button.textContent = loading ? 'Вход…' : 'Войти';
      if (!loading) delete button.dataset.busyV57;
    }
    if (error) error.textContent = message;
  }

  async function timedV57(task, timeout = LOGIN_TIMEOUT_V57) {
    let timer = 0;
    try {
      return await Promise.race([
        Promise.resolve(task),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('TELECHAT_LOGIN_TIMEOUT_V57')), timeout);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function revealChatV57() {
    document.getElementById('auth-screen')?.classList.remove('active');
    document.getElementById('chat-screen')?.classList.add('active');
  }

  function startAppV57(nick) {
    try { buildProfPanel(); buildEmojiPicker(); } catch (error) {}
    Promise.resolve(updateOnline()).catch(() => {});
    clearInterval(onlineTimerV57);
    onlineTimerV57 = setInterval(() => Promise.resolve(updateOnline()).catch(() => {}), 25000);
    Promise.resolve(renderContacts()).catch(() => {});

    // All heavy profile data is optional and must never block the interface.
    Promise.resolve(sb.from('users').select('*').eq('nick', nick).maybeSingle())
      .then(result => {
        if (!result?.data || !me || normalizedV57(me.nick) !== normalizedV57(nick)) return;
        Object.assign(me, result.data);
        userCache[me.nick] = me;
        try { buildProfPanel(); } catch (error) {}
        Promise.resolve(window.loadModerationDirectoryV19?.()).catch(() => {});
      })
      .catch(() => {});
  }

  doLogin = async function () {
    const nick = normalizedV57(document.getElementById('l-login')?.value);
    const pass = document.getElementById('l-pass')?.value || '';
    const button = document.getElementById('login-btn');
    const attempt = ++loginAttemptV57;

    if (!nick || !pass) {
      authUiV57(false, 'Введи логин и пароль!');
      return false;
    }
    if (button?.dataset.busyV57 === '1') return false;
    if (button) button.dataset.busyV57 = '1';
    authUiV57(true);

    try {
      const result = await timedV57(
        sb.from('users').select('nick').eq('nick', nick).eq('pass', pass).limit(1).maybeSingle()
      );
      if (attempt !== loginAttemptV57) return false;
      if (result?.error) {
        authUiV57(false, 'Не удалось связаться с сервером. Попробуй ещё раз.');
        return false;
      }
      if (!result?.data?.nick) {
        authUiV57(false, 'Неверный логин или пароль');
        return false;
      }

      me = { nick: result.data.nick, name: result.data.nick, avatar: '🐱' };
      userCache[me.nick] = me;
      revealChatV57();
      authUiV57(false);
      startAppV57(me.nick);
      return true;
    } catch (error) {
      if (attempt === loginAttemptV57) {
        authUiV57(false, error?.message === 'TELECHAT_LOGIN_TIMEOUT_V57'
          ? 'Сервер отвечает слишком долго. Проверь интернет и попробуй ещё раз.'
          : 'Не удалось выполнить вход. Попробуй ещё раз.');
      }
      return false;
    }
  };
})();
