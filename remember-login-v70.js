/* TELECHAT REMEMBER LOGIN V70
   Keeps an encrypted copy of login fields in this browser profile only. */
(() => {
  'use strict';

  const DB_NAME = 'telechat-device-v70';
  const STORE_NAME = 'private';
  const KEY_ID = 'remember-key-v70';
  const LOGIN_ID = 'remember-login-v70';
  let databasePromise = null;

  const byId = id => document.getElementById(id);
  const normalizeNick = value => String(value || '').trim().toLowerCase();

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('NO_INDEXED_DB'));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('DB_OPEN_FAILED'));
      request.onblocked = () => reject(new Error('DB_BLOCKED'));
    });
    return databasePromise;
  }

  async function readRecord(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('DB_READ_FAILED'));
    });
  }

  async function writeRecord(id, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('DB_WRITE_FAILED'));
      transaction.onabort = () => reject(transaction.error || new Error('DB_WRITE_ABORTED'));
    });
  }

  async function deleteRecord(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('DB_DELETE_FAILED'));
      transaction.onabort = () => reject(transaction.error || new Error('DB_DELETE_ABORTED'));
    });
  }

  async function encryptionKey() {
    if (!window.crypto?.subtle) throw new Error('NO_WEB_CRYPTO');
    const savedKey = await readRecord(KEY_ID);
    if (savedKey?.type === 'secret' && savedKey.algorithm?.name === 'AES-GCM') return savedKey;
    const newKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await writeRecord(KEY_ID, newKey);
    return newKey;
  }

  async function saveCredentials(nick, password) {
    const safeNick = normalizeNick(nick);
    if (!safeNick || !password) throw new Error('EMPTY_CREDENTIALS');
    const key = await encryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify({ nick: safeNick, password }));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    await writeRecord(LOGIN_ID, {
      version: 1,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
      savedAt: Date.now()
    });
  }

  async function loadCredentials() {
    const record = await readRecord(LOGIN_ID);
    if (!record?.iv?.length || !record?.data?.length) return null;
    const key = await encryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
      key,
      new Uint8Array(record.data)
    );
    const value = JSON.parse(new TextDecoder().decode(decrypted));
    if (!normalizeNick(value?.nick) || typeof value?.password !== 'string') return null;
    return { nick: normalizeNick(value.nick), password: value.password };
  }

  async function clearCredentials() {
    try { await deleteRecord(LOGIN_ID); } catch (error) {
      if (error?.message !== 'NO_INDEXED_DB') throw error;
    }
  }

  function setSavedUi(saved) {
    const remember = byId('remember-login-v70');
    const forget = byId('forget-login-v70');
    if (remember) remember.checked = Boolean(saved);
    if (forget) forget.hidden = !saved;
  }

  function notify(message) {
    try { window.showToast?.(message); } catch (error) {}
  }

  async function restoreForm() {
    try {
      const saved = await loadCredentials();
      if (!saved) return setSavedUi(false);
      const nickInput = byId('l-login');
      const passwordInput = byId('l-pass');
      if (nickInput) nickInput.value = saved.nick;
      if (passwordInput) passwordInput.value = saved.password;
      setSavedUi(true);
    } catch (error) {
      setSavedUi(false);
      try { await clearCredentials(); } catch (clearError) {}
    }
  }

  function loginSucceeded(nick, result) {
    if (result === true) return true;
    const authHidden = !byId('auth-screen')?.classList.contains('active');
    const chatVisible = byId('chat-screen')?.classList.contains('active');
    return Boolean(authHidden && chatVisible && normalizeNick(window.me?.nick) === nick);
  }

  function wrapLogin() {
    const previousLogin = window.doLogin;
    if (typeof previousLogin !== 'function' || previousLogin.rememberWrappedV70) return;
    const wrapped = async function (...args) {
      const nick = normalizeNick(byId('l-login')?.value);
      const password = byId('l-pass')?.value || '';
      const result = await previousLogin.apply(this, args);
      if (!loginSucceeded(nick, result)) return result;
      if (byId('remember-login-v70')?.checked) {
        try {
          await saveCredentials(nick, password);
          setSavedUi(true);
        } catch (error) {
          setSavedUi(false);
          notify('Не удалось запомнить вход на этом устройстве');
        }
      } else {
        await clearCredentials().catch(() => {});
        setSavedUi(false);
      }
      return result;
    };
    wrapped.rememberWrappedV70 = true;
    window.doLogin = wrapped;
  }

  function bindControls() {
    const remember = byId('remember-login-v70');
    const forget = byId('forget-login-v70');
    remember?.addEventListener('change', () => {
      if (remember.checked) return;
      clearCredentials().then(() => setSavedUi(false)).catch(() => {});
    });
    forget?.addEventListener('click', async () => {
      await clearCredentials().catch(() => {});
      setSavedUi(false);
      notify('Сохранённый вход удалён');
    });
  }

  bindControls();
  wrapLogin();
  restoreForm();

  window.telechatRememberV70 = Object.freeze({
    clear: async () => { await clearCredentials(); setSavedUi(false); },
    hasSavedLogin: async () => Boolean(await readRecord(LOGIN_ID).catch(() => null))
  });
})();
