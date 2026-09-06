'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'saved-accounts-v75.js'), 'utf8');
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
            setTimeout(() => { request.result = records.get(id);request.onsuccess?.(); }, 0);
            return request;
          },
          put(value, id) {
            records.set(id, value);setTimeout(() => transaction.oncomplete?.(), 0);
          },
          delete(id) {
            records.delete(id);setTimeout(() => transaction.oncomplete?.(), 0);
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
  return { contains: name => names.has(name),add: name => names.add(name),remove: name => names.delete(name),toggle: (name, on) => on ? names.add(name) : names.delete(name) };
}

function makeContext() {
  const elements = {
    'l-login': { value: '' },
    'l-pass': { value: '' },
    'auth-screen': { classList: classList(true) },
    'chat-screen': { classList: classList(false) }
  };
  const window = {
    crypto: webcrypto,
    indexedDB,
    me: null,
    doLogin: async () => {
      const nick = elements['l-login'].value.trim().toLowerCase();
      window.me = { nick, name: 'Creator Test', av: 4, status: '', moons: 4321 };
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
    Intl,
    Array,
    Date,
    JSON,
    Object,
    Promise,
    Error,
    String,
    Number,
    Math,
    Boolean,
    setTimeout,
    clearTimeout,
    confirm: () => true
  });
  return { context, window, elements };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const first = makeContext();
  vm.runInContext(source, first.context);
  await wait(30);
  first.elements['l-login'].value = 'Creator_Test';
  first.elements['l-pass'].value = 'secret-for-v75';
  await first.window.doLogin();

  const encrypted = records.get('saved-accounts-v75');
  assert.ok(encrypted?.data?.length > 0, 'encrypted account list must be stored');
  assert.ok(records.get('remember-key-v70'), 'non-extractable device key must be stored');
  assert.doesNotMatch(JSON.stringify(encrypted), /secret-for-v75|creator_test/i);

  const accounts = await first.window.telechatAccountsV75.list();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].nick, 'creator_test');
  assert.equal(accounts[0].profile.name, 'Creator Test');
  assert.equal(accounts[0].profile.moons, 4321);

  const second = makeContext();
  vm.runInContext(source, second.context);
  await wait(50);
  const restored = await second.window.telechatAccountsV75.list();
  assert.equal(restored[0].nick, 'creator_test');
  await second.window.telechatAccountsV75.use('creator_test');
  assert.equal(second.elements['l-login'].value, 'creator_test');
  assert.equal(second.elements['l-pass'].value, 'secret-for-v75');
  assert.equal(second.window.me.nick, 'creator_test');

  records.delete('saved-accounts-v75');
  const legacy = makeContext();
  vm.runInContext(source, legacy.context);
  await wait(50);
  assert.equal((await legacy.window.telechatAccountsV75.list())[0].nick, 'creator_test', 'legacy saved login must migrate');

  await legacy.window.telechatAccountsV75.clear();
  assert.equal(records.has('saved-accounts-v75'), false);
  assert.equal(records.has('remember-login-v70'), false);
  console.log('saved accounts V75 crypto: ok');
})().catch(error => { console.error(error);process.exitCode = 1; });
