/* TELECHAT LOGIN HARD FAILSAFE V53 */
(() => {
  'use strict';
  const loginBeforeV53 = doLogin;
  let attemptV53 = 0;

  function restoreLoginV53(message) {
    const button = document.getElementById('login-btn');
    const error = document.getElementById('auth-err');
    if (button) {
      button.disabled = false;
      button.textContent = 'Войти';
      delete button.dataset.busyV50;
    }
    if (message && error) error.textContent = message;
  }

  doLogin = async function (...args) {
    const currentAttempt = ++attemptV53;
    let timer = 0;
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => resolve({ timedOut: true }), 13500);
    });
    try {
      const result = await Promise.race([
        Promise.resolve(loginBeforeV53(...args)).then(value => ({ value })),
        deadline
      ]);
      if (result?.timedOut) {
        if (currentAttempt === attemptV53) {
          restoreLoginV53('Вход занял слишком много времени. Проверь интернет и попробуй ещё раз.');
        }
        return false;
      }
      return result?.value ?? false;
    } catch (error) {
      if (currentAttempt === attemptV53) {
        restoreLoginV53('Не удалось выполнить вход. Попробуй ещё раз.');
      }
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
})();
