const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');
const { TextEncoder, TextDecoder } = require('util');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'remember-login-v70.js'), 'utf8');
const records = new Map();
let databaseCreated = false;

const database = {
  objectStoreNames: { contains: name => databaseCreated && name === 'private' },
  createObjectStore(name) { databaseCreated = name === 'private'; },
  transaction() {
    const transaction = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore() {
        return {
          get(id) {
            const request = {};
            setTimeout(() => {
              request.result = records.get(id);
              request.onsuccess?.();
            }, 0);
            return request;
          },
          put(value, id) {
            records.set(id, value);
            setTimeout(() => transaction.oncomplete?.(), 0);
          },
          delete(id) {
            records.delete(id);
            setTimeout(() => transaction.oncomplete?.(), 0);
          }
        };
      }
    };
    return transaction;
  }
};

const indexedDB = {
  open() {
    const request = {};
    setTimeout(() => {
      request.result = database;
      if (!databaseCreated) request.onupgradeneeded?.();
      request.onsuccess?.();
    }, 0);
    return request;
  }
};

function classList(active) {
  const names = new Set(active ? ['active'] : []);
  return {
    contains: name => names.has(name),
    add: name => names.add(name),
    remove: name => names.delete(name)
  };
}

function makeContext() {
  const listeners = new Map();
  const elements = {
    'l-login': { value: '' },
    'l-pass': { value: '' },
    'auth-screen': { classList: classList(true) },
    'chat-screen': { classList: classList(false) },
    'remember-login-v70': {
      checked: false,
      addEventListener(name, handler) { listeners.set(`remember:${name}`, handler); }
    },
    'forget-login-v70': {
      hidden: true,
      addEventListener(name, handler) { listeners.set(`forget:${name}`, handler); }
    }
  };
  const window = {
    crypto: webcrypto,
    indexedDB,
    me: null,
    doLogin: async () => {
      const nick = elements['l-login'].value.trim().toLowerCase();
      window.me = { nick };
      elements['auth-screen'].classList.remove('active');
      elements['chat-screen'].classList.add('active');
    }
  };
  const context = vm.createContext({
    window,
    document: { getElementById: id => elements[id] || null },
    indexedDB,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Array,
    Date,
    JSON,
    Object,
    Promise,
    Error,
    String,
    Boolean,
    setTimeout,
    clearTimeout
  });
  return { context, window, elements };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const first = makeContext();
  vm.runInContext(source, first.context);
  await wait(15);

  first.elements['l-login'].value = 'Creator_Test';
  first.elements['l-pass'].value = 'secret-for-test';
  first.elements['remember-login-v70'].checked = true;
  await first.window.doLogin();

  const encrypted = records.get('remember-login-v70');
  assert.ok(encrypted?.data?.length > 0, 'encrypted login must be stored');
  assert.ok(records.get('remember-key-v70'), 'non-extractable device key must be stored');
  assert.doesNotMatch(JSON.stringify(encrypted), /secret-for-test|creator_test/i);

  const second = makeContext();
  vm.runInContext(source, second.context);
  await wait(200);
  assert.equal(second.elements['l-login'].value, 'creator_test');
  assert.equal(second.elements['l-pass'].value, 'secret-for-test');
  assert.equal(second.elements['remember-login-v70'].checked, true);
  assert.equal(second.elements['forget-login-v70'].hidden, false);

  await second.window.telechatRememberV70.clear();
  assert.equal(records.has('remember-login-v70'), false);
  assert.equal(second.elements['remember-login-v70'].checked, false);

  console.log('remember-login-v70 crypto: ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
