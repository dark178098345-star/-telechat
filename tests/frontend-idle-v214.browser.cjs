'use strict';
// Synthetic counters/fixture accounts only. No production service or app process.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const read = file => baseline
  ? cp.execFileSync('git', ['show', 'b9b30a1:' + file], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, file), 'utf8');

async function desktopFixture(browser) {
  const p = await browser.newPage();
  await p.setContent('<button id="push-btn"></button><div id="auth-screen"></div><div id="chat-screen" class="active"></div>');
  await p.clock.install();
  await p.evaluate(() => {
    window.me = { nick: 'alice' };
    window.notices = [];
    window.channels = [];
    window.membershipReads = [];
    window.memberGates = [];
    window.userGates = [];
    window.holdMembers = false;
    window.holdUsers = false;
    window.memberships = { alice: ['a'], bob: ['b'] };
    window.sendPushNotification = () => {};
    window.requestPush = async () => {};
    window.showToast = () => {};
    window.messagePreviewText = String;
    window.openRoom = async () => {};
    window.openChat = async () => {};
    window.getUser = async () => holdUsers
      ? new Promise(resolve => userGates.push(() => resolve({ name: 'Fixture sender' })))
      : { name: 'Fixture sender' };
    window.telechatDesktop = { isDesktop: true, notify: value => notices.push(value), onNotificationActivated() {} };
    window.sb = {
      from(table) {
        const filters = {};
        let ids = [];
        const q = {
          select() { return q; },
          eq(key, value) { filters[key] = value; return q; },
          in(_key, values) { ids = values; return q; },
          abortSignal() { return q; },
          then(resolve, reject) {
            let value;
            if (table === 'room_members') {
              membershipReads.push(filters.user_nick);
              value = { data: (memberships[filters.user_nick] || []).map(room_id => ({ room_id })), error: null };
            } else value = { data: ids.map(id => ({ id, name: 'Room ' + id })), error: null };
            const reply = table === 'room_members' && holdMembers
              ? new Promise(done => memberGates.push(() => done(structuredClone(value))))
              : Promise.resolve(value);
            return reply.then(resolve, reject);
          }
        };
        return q;
      },
      channel(name) {
        const c = { name, removed: false, handlers: [], on(_type, filter, fn) { c.handlers.push({ filter, fn }); return c; }, subscribe() { channels.push(c); return c; } };
        return c;
      },
      removeChannel: async channel => { channel.removed = true; }
    };
  });
  await p.addScriptTag({ content: read('desktop-notifications-v37.js') });
  await p.clock.fastForward(1000);
  await p.waitForFunction(() => channels.length >= 2);
  return p;
}

async function mobileFixture(browser) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="contacts-list"></div><div id="messages"></div><div id="icons"></div><div id="media"></div>');
  await p.addScriptTag({ content: read('mobile-optimization-v100.js') });
  await p.waitForTimeout(80);
  await p.evaluate(() => {
    window.mediaSearches = 0;
    window.containsCalls = 0;
    const query = Element.prototype.querySelector;
    const queries = Element.prototype.querySelectorAll;
    const contains = Node.prototype.contains;
    Element.prototype.querySelector = function(selector) { if (selector === 'img,video') mediaSearches++; return query.call(this, selector); };
    Element.prototype.querySelectorAll = function(selector) { if (selector === 'img,video') mediaSearches++; return queries.call(this, selector); };
    Node.prototype.contains = function(node) { containsCalls++; return contains.call(this, node); };
  });
  return p;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = {};
  try {
    let p = await desktopFixture(browser);
    await p.evaluate(() => { window.uiWrites = 0; new MutationObserver(records => uiWrites += records.length).observe(document.getElementById('push-btn'), { childList: true, subtree: true, characterData: true, attributes: true }); });
    await p.clock.fastForward(9000);
    results.desktopIdleWrites = await p.evaluate(() => uiWrites);
    await p.close();

    p = await desktopFixture(browser);
    await p.evaluate(() => { holdMembers = true; window.beforeReads = membershipReads.length; const c = channels.findLast(channel => !channel.removed && channel.name.startsWith('desktop-memberships')); for (let i = 0; i < 8; i++) c.handlers[0].fn(); });
    await p.waitForFunction(() => memberGates.length > 0);
    results.parallelMembershipReads = await p.evaluate(() => membershipReads.length - beforeReads);
    await p.evaluate(() => { holdMembers = false; for (const release of memberGates.splice(0)) release(); });
    await p.waitForTimeout(30);
    results.membershipReadsAfterBurst = await p.evaluate(() => membershipReads.length - beforeReads);
    await p.close();

    p = await desktopFixture(browser);
    await p.evaluate(() => { holdUsers = true; const channel = channels.findLast(channel => !channel.removed && channel.name.startsWith('desktop-messages')); channel.handlers[0].fn({ new: { id: 10, chat_key: 'alice_peer', from_nick: 'peer', text: 'Old session fixture' } }); });
    await p.waitForFunction(() => userGates.length === 1);
    await p.evaluate(() => { me = { nick: 'bob' }; dispatchEvent(new Event('telechat-account-ready-v175')); });
    await p.clock.fastForward(1000);
    await p.evaluate(() => { me = { nick: 'alice' }; dispatchEvent(new Event('telechat-account-ready-v175')); });
    await p.clock.fastForward(1000);
    await p.evaluate(() => userGates.shift()());
    await p.waitForTimeout(20);
    results.oldSessionNotifications = await p.evaluate(() => notices.length);
    await p.close();

    p = await mobileFixture(browser);
    await p.evaluate(() => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.getElementById('icons').append(svg); for (let i = 0; i < 100; i++) { const g = document.createElementNS(svg.namespaceURI, 'g'); svg.append(g); g.append(document.createElementNS(svg.namespaceURI, 'path')); } });
    await p.waitForTimeout(60);
    results.svgMediaSearches = await p.evaluate(() => mediaSearches);
    await p.evaluate(() => { mediaSearches = containsCalls = 0; const host = document.getElementById('media'); for (let i = 0; i < 20; i++) { const row = document.createElement('div'); host.append(row); const img = document.createElement('img'); img.className = 'avatar-photo'; row.append(img); } });
    await p.waitForTimeout(60);
    results.mediaTreeSearches = await p.evaluate(() => mediaSearches);
    results.mediaRootContainsCalls = await p.evaluate(() => containsCalls);
    assert(await p.locator('#media img').evaluateAll(nodes => nodes.every(node => node.loading === 'eager' && node.decoding === 'async')), 'Existing avatar preparation is preserved');
    await p.evaluate(() => { document.getElementById('contacts-list').innerHTML = '<img class="avatar-photo">'; document.getElementById('messages').innerHTML = '<img class="auto-photo-image-v179"><video></video>'; });
    await p.waitForTimeout(60);
    assert.equal(await p.locator('#contacts-list img').getAttribute('loading'), 'lazy');
    assert.equal(await p.locator('#messages img').getAttribute('loading'), 'eager');
    assert.equal(await p.locator('#messages video').evaluate(node => node.preload), 'none');
    await p.close();

    console.log(JSON.stringify(results));
    if (baseline) {
      assert(results.desktopIdleWrites > 0 && results.parallelMembershipReads > 1 && results.oldSessionNotifications > 0 && results.svgMediaSearches > 100);
      console.log('BASELINE idle and repeated-media work reproduced.');
    } else {
      assert.equal(results.desktopIdleWrites, 0);
      assert.equal(results.parallelMembershipReads, 1);
      assert.equal(results.membershipReadsAfterBurst, 2, 'Coalescing retains one follow-up for changes received during the first read');
      assert.equal(results.oldSessionNotifications, 0);
      assert.equal(results.svgMediaSearches, 0);
      assert.equal(results.mediaTreeSearches, 20);
      assert.equal(results.mediaRootContainsCalls, 0);
      console.log('PASS frontend idle work: event-driven native notifications, coalesced memberships, session-safe notification continuation, SVG-free media observer and linear root batching.');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
