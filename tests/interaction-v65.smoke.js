'use strict';

const assert = require('node:assert/strict');

class ClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}
class Style {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, value); }
  getPropertyValue(name) { return this.values.get(name) || ''; }
}
class Element {
  constructor() { this.classList = new ClassList();this.style = new Style();this.textContent = '';this.innerHTML = '';this.value = ''; }
  getBoundingClientRect() { return { left: 90, top: 700, width: 90, height: 54 }; }
}

const settings = new Element();
const profile = new Element();
const overlay = new Element();
const status = new Element();
const input = new Element();
const navSettings = new Element();
const navProfile = new Element();
const body = new Element();
const sent = [];
const channels = [];

global.window = global;
global.innerWidth = 1200;
global.innerHeight = 800;
global.matchMedia = () => ({ matches: false });
global.me = { nick: 'creator' };
global.currentChat = 'tele';
global.currentRoom = null;
global.userCache = { tele: { name: 'Tele' } };
global.conversationKey = () => 'creator_tele';
global.escHtml = value => String(value);
global.updateStatusBar = async () => {};
global.typingSub = null;
global.mediaRecorderV3 = null;
global.toggleVoiceRecording = async () => {};
global.document = {
  body,
  getElementById(id) { return ({ 'settings-panel': settings, 'profile-panel': profile, overlay, 'chat-status-text': status, 'msg-input': input })[id] || null; },
  querySelector(selector) {
    if (selector.includes('data-nav="settings"')) return navSettings;
    if (selector.includes('data-nav="profile"')) return navProfile;
    if (selector === '#settings-panel.open,#profile-panel.open') return settings.classList.contains('open') ? settings : profile.classList.contains('open') ? profile : null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.side-panel.v65-closing') return [settings, profile].filter(element => element.classList.contains('v65-closing'));
    return [];
  }
};

function queryBuilder() {
  const builder = {
    select() { return builder; },eq() { return builder; },neq() { return builder; },gt() { return builder; },delete() { return builder; },upsert() { return Promise.resolve({ error: null }); },
    order() { return Promise.resolve({ data: [], error: null }); },
    then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); }
  };
  return builder;
}
global.sb = {
  from: () => queryBuilder(),
  removeChannel: () => {},
  channel(name) {
    const channel = {
      name,handlers: [],
      on(type, filter, handler) { channel.handlers.push({ type, filter, handler });return channel; },
      subscribe(callback) { callback?.('SUBSCRIBED');return channel; },
      send(event) { sent.push(event);return Promise.resolve('ok'); }
    };
    channels.push(channel);return channel;
  }
};
global.openPanel = id => {
  settings.classList.remove('open');profile.classList.remove('open');
  (id === 'settings-panel' ? settings : profile).classList.add('open');overlay.classList.add('show');
};
global.closeAllPanels = () => { settings.classList.remove('open');profile.classList.remove('open');overlay.classList.remove('show'); };

require('../interaction-v65.js');

(async () => {
  subscribeTyping();
  assert.equal(channels[0].name, 'composer-activity-v65-creator_tele');
  input.value = 'Привет';sendTyping();
  assert.equal(sent.at(-1).payload.mode, 'typing');
  openPanel('settings-panel');
  assert.equal(settings.classList.contains('open'), true);
  assert.equal(settings.classList.contains('v65-full-panel'), true);
  assert.equal(body.classList.contains('telechat-full-panel-open-v65'), true);
  assert.equal(settings.style.getPropertyValue('--panel-origin-x-v65'), '135px');
  closeAllPanels();
  assert.equal(settings.classList.contains('v65-closing'), true);
  await new Promise(resolve => setTimeout(resolve, 330));
  assert.equal(settings.classList.contains('open'), false);
  assert.equal(body.classList.contains('telechat-full-panel-open-v65'), false);
  console.log('interaction-v65 smoke: ok');
})().catch(error => { console.error(error);process.exitCode = 1; });
