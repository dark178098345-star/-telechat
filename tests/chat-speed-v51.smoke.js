'use strict';

const assert = require('node:assert/strict');

class ClassList {
  constructor(owner) { this.owner = owner;this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name));this.owner.className = [...this.values].join(' '); }
  remove(...names) { names.forEach(name => this.values.delete(name));this.owner.className = [...this.values].join(' '); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) { const enabled = force === undefined ? !this.values.has(name) : !!force;enabled ? this.add(name) : this.remove(name);return enabled; }
}

class Element {
  constructor(tag = 'div') { this.tagName = tag;this.children = [];this.dataset = {};this.className = '';this.classList = new ClassList(this);this.scrollHeight = 500;this.scrollTop = 500;this.clientHeight = 400; }
  appendChild(child) { this.children.push(child);return child; }
  replaceChildren(...children) { this.children = children; }
  addEventListener() {}
  querySelector(selector) {
    if (selector === '.msg-check') return this.check || null;
    if (selector === '.v51-empty-chat') return this.children.find(child => child.classList?.contains('v51-empty-chat')) || null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === '.msg[data-id]') return this.children.filter(child => child.classList?.contains('msg') && child.dataset.id !== undefined);
    return [];
  }
  remove() { const index = messages.children.indexOf(this);if (index >= 0) messages.children.splice(index, 1); }
  set innerHTML(value) { this.children = [];this._html = value; }
  get innerHTML() { return this._html || ''; }
}

const messages = new Element();
global.document = { getElementById: id => id === 'messages' ? messages : null };
global.window = global;
global.me = { nick: 'creator' };
global.currentChat = 'tele';
global.currentRoom = null;
global.lastRenderedDate = '';
global.userCache = {};
global.conversationKey = () => 'creator_tele';
global.renderMessages = async () => {};
global.updateStatusBar = async () => {};
global.markAsRead = async () => {};
global.avatarMarkup = () => '';
global.renderPoll = () => {};
global.scrollToBottom = () => {};
global.batchUsersV15 = async () => {};
global.isOnline = () => false;
global.formatLastSeen = () => '';
global.normalizedRoomVisibility = () => 'public';
global.sb = { from: () => ({ select() { return this; },eq() { return this; },neq() { return this; },order() { return this; },limit() { return Promise.resolve({ data: [], error: null }); },update() { return this; } }) };
global.appendMessage = async message => {
  const element = new Element();
  element.dataset.id = String(message.id || '');
  element.classList.add('msg', message.from_nick === me.nick ? 'me' : 'them');
  element.check = new Element('span');
  element.check.classList.add('msg-check');
  messages.appendChild(element);
};

require('../chat-speed-v51.js');

(async () => {
  await appendMessage({ id: 2, chat_key: 'creator_tele', from_nick: 'creator', text: 'second', ts: 200, read_by: [] });
  await appendMessage({ id: 1, chat_key: 'creator_tele', from_nick: 'creator', text: 'first', ts: 100, read_by: [] });
  await appendMessage({ id: 2, chat_key: 'creator_tele', from_nick: 'creator', text: 'second', ts: 200, read_by: [] });
  const ids = messages.children.filter(element => element.classList.contains('msg')).map(element => element.dataset.id);
  assert.deepEqual(ids, ['1', '2'], 'late and duplicate messages must keep one chronological DOM row');
  assert.equal(telechatChatSpeedV51.applyRealtimeUpdate({ id: 2, chat_key: 'creator_tele', read_by: ['tele'] }), false);
  assert.equal(messages.children.find(element => element.dataset.id === '2').check.classList.contains('read'), true);
  console.log('chat-speed-v51 smoke: ok');
})().catch(error => { console.error(error);process.exitCode = 1; });
