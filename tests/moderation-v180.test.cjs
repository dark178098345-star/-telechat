const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'moderation-v19.js'), 'utf8');

async function fixture() {
  class Element {
    constructor() {
      this.value = 'fixture'; this.style = {}; this.dataset = {}; this.isConnected = true;
      const classes = new Set();
      this.classList = { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, enabled) { enabled ? classes.add(c) : classes.delete(c); } };
    }
    querySelectorAll() { return []; } matches() { return false; }
  }
  const elements = new Map(); const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const storage = new Map(), intervals = new Map(), timeouts = new Map(); let sequence = 0;
  const s = { console, Element, AbortController, Date, Promise, Map, Set, queueMicrotask,
    me: null, userCache: {}, fresh: { nick: 'fixture', name: 'Fixture', role: 'user', session_version: 0 }, calls: 0, reloads: 0, sent: 0,
    document: { body: new Element(), hidden: false, getElementById: get, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
    location: { reload() { s.reloads++; } },
    sessionStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) || null, removeItem: k => storage.delete(k) },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, MutationObserver: class { observe() {} disconnect() {} },
    setTimeout(fn, ms) { const id = ++sequence; timeouts.set(id, { fn, ms }); return id; }, clearTimeout: id => timeouts.delete(id),
    setInterval(fn, ms) { const id = ++sequence; intervals.set(id, { fn, ms }); return id; }, clearInterval: id => intervals.delete(id),
    verifiedBadgeHtml: () => '', enhanceVerifiedBadges() {}, escHtml: String, showToast() {},
    updateComposerAccess() { get('input-area').style.display = ''; }, sendMsg: () => s.sent++,
    sendTyping() {}, openPollModal() {}, createPoll() {}, toggleVoiceRecording() {}, handleChatPhoto() {},
    updateOnline: async () => {}, renderContacts: async () => {}, buildProfPanel() {}, buildEmojiPicker() {}, openUserProfile: async () => {}, closeUserProfile() {},
    sb: { from() { let single = false; const q = { select: () => q, eq: () => q, limit: () => q, maybeSingle() { single = true; return q; }, abortSignal: () => q,
      then(resolve, reject) { s.calls++; return (s.failure ? Promise.reject(Error('fixture network failure')) : Promise.resolve({ data: single ? { ...s.fresh } : [], error: null })).then(resolve, reject); }
    }; return q; } }
  };
  s.window = s; vm.runInNewContext(source, s); await s.doLogin();
  return { s, get, storage, poll: () => [...intervals.values()].find(item => item.ms === 8000).fn(), intervals, timeouts };
}

(async () => {
  {
    const { s, poll, storage, timeouts } = await fixture();
    s.fresh.banned_forever = true; await poll();
    assert.equal(s.reloads, 1, 'A confirmed ban still ends the session');
    assert.match(storage.get('telechat-moderation-message'), /заблокирован/);
    assert.equal(timeouts.size, 0, 'Poll deadline is released');
  }
  {
    const { s, poll, storage } = await fixture();
    s.fresh.session_version++; await poll();
    assert.equal(s.reloads, 1, 'A remote session revocation still logs out');
    assert.match(storage.get('telechat-moderation-message'), /сеанс завершён/);
  }
  {
    const { s, poll, get, intervals } = await fixture();
    s.fresh.muted_forever = true; await poll(); await s.sendMsg();
    assert.equal(s.sent, 0, 'Muted accounts still cannot send');
    assert.equal(get('input-area').style.display, 'none');
    s.failure = true; await poll(); await s.sendMsg();
    assert.equal(s.sent, 0, 'A failed check cannot clear confirmed restrictions');
    s.failure = false; s.document.hidden = true; const calls = s.calls; await poll();
    assert.equal(s.calls, calls, 'Hidden app does not poll moderation');
    s.document.hidden = false; s.fresh.muted_forever = false; await poll();
    s.updateComposerAccess(); await s.sendMsg(); assert.equal(s.sent, 1, 'Restrictions can refresh after network recovery');
    assert.equal(get('input-area').style.display, '');
    s.telechatPresenceV120 = {}; await s.doLogin();
    assert.equal([...intervals.values()].filter(item => item.ms === 25000).length, 0, 'Shared presence owns heartbeat; no duplicate legacy timer');
  }
  console.log('PASS moderation v180: bans, session revocation, mute enforcement through network errors, hidden state, deadline cleanup and shared heartbeat ownership');
})().catch(error => { console.error(error); process.exitCode = 1; });
