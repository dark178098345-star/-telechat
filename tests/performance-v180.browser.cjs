const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const read = file => baseline ? execFileSync('git', ['show', '4c320f8549af369909067af51b9841db0bdae79e:' + file], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, file), 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const p = await browser.newPage();
    const errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<body><input id="l-login" value="alice"><input id="l-pass" value="fixture"><button id="login-btn"></button><div id="auth-err"></div><div id="auth-screen"></div><div id="chat-screen"></div><div id="active-chat"><div id="input-area"></div><div id="channel-readonly"></div></div><div id="contacts-list"></div><div id="messages"></div><span id="music-progress">0</span></body>' }));
    await p.goto('https://performance.test');
    await p.evaluate(() => {
      window.me = null; window.userCache = {}; window.currentChat = 'bob';
      window.viewedProfileNickV5 = ''; window.toasts = []; window.modQueries = 0;
      window.intervals = new Map(); let sequence = 0;
      window.setInterval = (fn, ms) => { const id = ++sequence; intervals.set(id, { fn, ms }); return id; };
      window.clearInterval = id => intervals.delete(id);
      window.isCreatorVerified = nick => nick === 'creator';
      window.verifiedBadgeHtml = nick => nick === 'creator' ? '<span class="verified-badge creator-badge" title="Создатель">✓</span>' : '';
      for (const name of ['updateComposerAccess', 'sendMsg', 'sendTyping', 'openPollModal', 'createPoll', 'toggleVoiceRecording', 'handleChatPhoto', 'buildProfPanel', 'buildEmojiPicker', 'closeUserProfile']) window[name] = () => {};
      for (const name of ['renderContacts', 'openChat', 'openUserProfile', 'updateOnline']) window[name] = async () => {};
      window.showToast = value => toasts.push(value); window.escHtml = String;
      for (let i = 0; i < 500; i++) userCache['person' + i] = { nick: 'person' + i, name: 'Person ' + i, role: i % 10 === 0 ? 'admin' : 'user' };
      userCache.creator = { nick: 'creator', name: 'Creator' };
      userCache.alice = { nick: 'alice', name: 'Alice', role: 'admin', session_version: 0 };
      window.dbUser = { ...userCache.alice };
      window.sb = { from() {
        let single = false, fields = '';
        const q = { select(v) { fields = v; return q; }, eq() { return q; }, limit() { return q; }, maybeSingle() { single = true; return q; },
          async then(resolve) {
            if (single && fields !== '*') modQueries++;
            const value = single ? { ...dbUser } : Object.values(userCache).map(u => ({ nick: u.nick, role: u.role, verified: u.verified }));
            if (window.slowQuery) await new Promise(r => setTimeout(r, 40));
            return resolve({ data: value, error: null });
          }
        }; return q;
      } };
      const contacts = document.getElementById('contacts-list');
      for (let i = 0; i < 80; i++) {
        const row = document.createElement('div'); row.className = 'contact';
        row.innerHTML = '<div class="av"><span class="profile-nick-marker" data-profile-nick="person' + i + '"></span><video class="avatar-video"></video></div><div class="contact-name">Person ' + i + '</div>';
        contacts.append(row);
      }
      window.appendMessage = i => {
        const row = document.createElement('div'); row.className = 'msg';
        row.innerHTML = '<div class="msg-sender-name">' + (i === 1000 ? 'Alice' : 'Person ' + (i % 500)) + '</div><div class="msg-text">Message ' + i + '</div>';
        document.getElementById('messages').append(row); return row;
      };
      for (let i = 0; i < 1000; i++) appendMessage(i);
      window.telechatAttachmentsV141 = { descriptor: () => null, abortAutomaticReads() {} };
      window.renderMessageContent = String;
      window.metrics = { globalBadgeScans: 0, badgeCandidates: 0, historyMediaScans: 0, videoConnectionChecks: 0, selectorMs: 0 };
      const documentQuery = Document.prototype.querySelectorAll;
      Document.prototype.querySelectorAll = function(selector) {
        const t = performance.now(); const result = documentQuery.call(this, selector);
        if (selector.includes('profile-nick-marker') || selector.includes('msg-sender-name')) { metrics.globalBadgeScans++; metrics.badgeCandidates += result.length; }
        metrics.selectorMs += performance.now() - t; return result;
      };
      const elementQuery = Element.prototype.querySelectorAll;
      Element.prototype.querySelectorAll = function(selector) {
        const t = performance.now(); const result = elementQuery.call(this, selector);
        if (this.id === 'messages' && selector.includes('auto-photo-v179')) metrics.historyMediaScans++;
        if (selector.includes('profile-nick-marker') || selector.includes('msg-sender-name')) metrics.badgeCandidates += result.length;
        metrics.selectorMs += performance.now() - t; return result;
      };
      const connected = Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected');
      Object.defineProperty(HTMLVideoElement.prototype, 'isConnected', { get() { metrics.videoConnectionChecks++; return connected.get.call(this); } });
      window.resetMetrics = () => { for (const key in metrics) metrics[key] = 0; };
    });
    const html = read('index.html');
    await p.addScriptTag({ content: html.slice(html.indexOf('function addBadgeToElement('), html.indexOf('const renderContactsBeforeVerified=')) });
    for (const file of ['moderation-v19.js', 'viewport-performance-v124.js', 'media-policy-v179.js', 'media-auto-v179.js']) await p.addScriptTag({ content: read(file) });
    await p.evaluate(() => doLogin());
    await p.waitForTimeout(100);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Performance.enable');
    const cpu = async () => (await cdp.send('Performance.getMetrics')).metrics.find(item => item.name === 'TaskDuration').value * 1000;
    await p.evaluate(() => resetMetrics());
    const progressStart = await cpu();
    await p.evaluate(async () => {
      for (let i = 0; i < 60; i++) {
        document.getElementById('music-progress').textContent = String(i);
        await new Promise(r => requestAnimationFrame(r));
      }
      await new Promise(r => setTimeout(r, 60));
    });
    const progress = await p.evaluate(() => ({ ...metrics }));
    progress.browserTaskMs = Math.round((await cpu() - progressStart) * 10) / 10;
    await p.evaluate(() => resetMetrics());
    const appendStart = await cpu();
    await p.evaluate(async () => {
      for (let i = 1000; i < 1020; i++) {
        appendMessage(i);
        await new Promise(r => requestAnimationFrame(r));
      }
      await new Promise(r => setTimeout(r, 60));
    });
    const append = await p.evaluate(() => ({ ...metrics }));
    append.browserTaskMs = Math.round((await cpu() - appendStart) * 10) / 10;
    assert.equal(await p.locator('.msg-sender-name').nth(1000).locator('.admin-badge').count(), 1, 'New message still receives its role badge');
    await p.evaluate(() => { window.savedBadge = document.querySelector('.msg-sender-name .moderation-auto-badge'); });
    await p.evaluate(async () => {
      const poll = [...intervals.values()].find(item => item.ms === 8000).fn;
      for (let i = 0; i < 3; i++) { await poll(); await new Promise(r => setTimeout(r, 40)); }
    });
    const stable = await p.evaluate(() => savedBadge === document.querySelector('.msg-sender-name .moderation-auto-badge'));
    console.log(JSON.stringify({ mode: baseline ? 'baseline v179' : 'optimized v180', fixture: '1000 messages, 500 cached users, 80 video avatars', progress, append, unchangedBadgePreserved: stable }));
    if (!baseline) {
      assert.equal(progress.globalBadgeScans, 0, 'A timer label must not scan all user/message badges');
      assert.equal(progress.videoConnectionChecks, 0, 'A timer label must not walk tracked videos');
      assert.equal(append.globalBadgeScans, 0, 'Appending a message only decorates its subtree');
      assert.equal(append.badgeCandidates, 20, 'Only the 20 new sender names are visited, not the 1000 existing ones');
      assert.equal(append.historyMediaScans, 0, 'Appending text must not rescan all media in history');
      assert(stable, 'Unchanged moderation poll preserves the badge node');
      const reads = await p.evaluate(async () => {
        slowQuery = true; const start = modQueries;
        const poll = [...intervals.values()].find(item => item.ms === 8000).fn;
        await Promise.all([poll(), poll(), poll()]); slowQuery = false; return modQueries - start;
      });
      assert.equal(reads, 1, 'Slow moderation requests are single-flight');
      await p.evaluate(async () => { await doLogin(); await doLogin(); });
      assert.equal(await p.evaluate(() => [...intervals.values()].filter(x => x.ms === 25000).length), 1, 'Relogin cannot stack legacy heartbeat timers');
      await p.evaluate(async () => {
        dbUser.role = 'user'; dbUser.verified = true;
        await [...intervals.values()].find(item => item.ms === 8000).fn();
      });
      await p.waitForTimeout(60);
      assert.equal(await p.locator('.msg-sender-name').nth(1000).locator('.verified-user-badge').count(), 1, 'Role change updates existing badge');
      await p.evaluate(async () => {
        dbUser.verified = false; await [...intervals.values()].find(item => item.ms === 8000).fn();
      });
      await p.waitForTimeout(60);
      assert.equal(await p.locator('.msg-sender-name').nth(1000).locator('.verified-badge').count(), 0, 'Removed role/verification removes its badge');
      await p.evaluate(() => { userCache.person3.role = 'admin'; const name = document.querySelector('.msg-sender-name'); name.textContent = 'Person 3'; });
      await p.waitForTimeout(60);
      assert.equal(await p.locator('.msg-sender-name').first().locator('.admin-badge').count(), 1, 'Editing a sender name rechecks only that element');
      await p.evaluate(() => { const row = appendMessage(1040); row.dataset.senderNick = 'person1'; row.querySelector('.msg-sender-name').textContent = 'Person 3'; });
      await p.waitForTimeout(60);
      assert.equal(await p.locator('.msg-sender-name').last().locator('.verified-badge').count(), 0, 'Explicit sender identity wins over a duplicate display name');
      await p.evaluate(() => { window.subscribedVideo = document.querySelector('video'); document.querySelector('#contacts-list .contact').remove(); });
      await p.waitForTimeout(30);
      assert.equal(await p.evaluate(() => telechatViewportV124.info().tracked), 79, 'Detached avatar observer/listener is released');
      await p.evaluate(() => { const contact = document.createElement('div'); contact.className = 'contact'; document.getElementById('contacts-list').append(contact); contact.append(subscribedVideo); });
      await p.waitForTimeout(30);
      assert.equal(await p.evaluate(() => telechatViewportV124.info().tracked), 80, 'Reattached video is tracked again');
      await p.evaluate(() => { document.querySelector('#contacts-list .contact').remove(); });
      await p.waitForTimeout(30);
      assert.equal(await p.evaluate(() => telechatViewportV124.info().tracked), 79, 'Detached avatar observer/listener is released');
      await p.evaluate(async () => {
        dbUser.banned_forever = true; slowQuery = true;
        const pending = [...intervals.values()].find(item => item.ms === 8000).fn();
        await new Promise(r => setTimeout(r, 5)); me = { nick: 'other-account' };
        await pending; slowQuery = false;
      });
      assert.equal(await p.evaluate(() => me.nick), 'other-account');
      assert.equal(await p.evaluate(() => sessionStorage.getItem('telechat-moderation-message')), null, 'An old account response cannot log out the new account');
      assert.deepEqual(errors, []);
      console.log('PASS v180: incremental DOM work, stable badges, role changes, single-flight moderation, owned timers and avatar cleanup');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
