// Entire production HTML/script stack, isolated from real accounts and services.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

function fixtureClient() {
  const users = [
    { nick: 'alice', name: 'Alice', pass: 'fixture-only', av: 0, status: '', bio: 'Fixture profile', banner: 'preset:cosmos', role: 'user', session_version: 0, last_seen: Date.now() - 120000 },
    { nick: 'bob', name: 'Bob', av: 1, status: '', bio: 'Fixture peer', banner: 'preset:cosmos', role: 'admin', last_seen: Date.now() - 120000 }
  ];
  const messages = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, chat_key: 'alice_bob', from_nick: i % 2 ? 'alice' : 'bob', text: 'Fixture message ' + i, ts: Date.now() - 200000 + i * 1000, deleted: false, read_by: [] }));
  const match = (row, filters) => filters.every(([op, field, value]) => op === 'eq' ? row[field] === value : op === 'neq' ? row[field] !== value : op === 'in' ? value.includes(row[field]) : op === 'lt' ? row[field] < value : op === 'gte' ? row[field] >= value : true);
  const reply = value => { let q; q = new Proxy({ then(resolve, reject) { return Promise.resolve({ data: value, error: null }).then(resolve, reject); } }, { get(target, key) { return key in target ? target[key] : () => q; } }); return q; };
  const client = {
    from(table) {
      const filters = []; let single = false, count = 1000, order, descending = false;
      let q; q = new Proxy({ then(resolve, reject) {
        let rows = (table === 'users' ? users : table === 'messages' ? messages : []).filter(row => match(row, filters));
        if (order) rows = rows.slice().sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0) * (descending ? -1 : 1));
        rows = rows.slice(0, count);
        return Promise.resolve({ data: structuredClone(single ? rows[0] || null : rows), error: null, count: rows.length }).then(resolve, reject);
      } }, { get(target, key) {
        if (key in target) return target[key];
        return (...args) => {
          if (['eq', 'neq', 'in', 'lt', 'gte'].includes(key)) filters.push([key, ...args]);
          if (key === 'maybeSingle' || key === 'single') single = true;
          if (key === 'limit') count = args[0];
          if (key === 'order') { order = args[0]; descending = args[1]?.ascending === false; }
          return q;
        };
      } }); return q;
    },
    rpc(name, args) {
      if (name === 'exstra_send_messages_v172') {
        const rows = args.p_rows.map(row => { const saved = { ...row, id: messages.length + 1, read_by: [] }; messages.push(saved); return saved; });
        return reply({ rows, server_time: Date.now() });
      }
      if (name === 'exstra_presence_snapshot_v172') return reply({ modern: [], legacy: [], users: users.map(u => ({ nick: u.nick, last_seen: u.last_seen })), server_time: Date.now() });
      if (name === 'exstra_presence_heartbeat_v172') return reply({ ts: args.p_at * 10 + 1, server_time: Date.now() });
      if (name === 'telechat_music_v117') return reply({ saved: [], liked: [], playlists: [] });
      if (name === 'telechat_activity_v124') return reply({ nick: 'alice', xp: 0, active_seconds: 0, music_seconds: 0 });
      if (name === 'exstra_chat_streak_v170') return reply({ owner: 'alice', peer: 'bob', today: new Date().toISOString().slice(0, 10), days: 0, today_mask: 0 });
      return reply({});
    },
    channel() {
      const channel = { on() { return channel; }, subscribe(callback) { if (callback) setTimeout(() => callback('SUBSCRIBED'), 0); return channel; }, track: async () => 'ok', untrack: async () => 'ok', presenceState: () => ({}), send: async () => 'ok' };
      return channel;
    },
    removeChannel: async () => {},
    storage: { from: () => ({ getPublicUrl: p => ({ data: { publicUrl: 'https://app.test/' + p } }) }) }
  };
  window.supabase = { createClient: () => client };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600, serviceWorkers: 'block' });
      await context.addInitScript(fixtureClient);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'cdn.jsdelivr.net') return route.fulfill({ contentType: 'application/javascript', body: '/* Fixture Supabase client is injected before page scripts. */' });
        if (url.hostname.endsWith('.supabase.co')) return route.fulfill({ status: route.request().method() === 'GET' ? 200 : 204, headers: { Date: new Date().toUTCString() }, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '' });
        if (url.hostname !== 'app.test') return route.abort();
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        const type = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
      });
      const p = await context.newPage(); const errors = [];
      p.on('pageerror', error => errors.push(error.message));
      await p.goto('https://app.test/?v=180');
      await p.locator('#l-login').fill('alice'); await p.locator('#l-pass').fill('fixture-only');
      await p.evaluate(() => doLogin());
      await p.waitForFunction(() => document.getElementById('chat-screen').classList.contains('active'));
      await p.evaluate(() => openChat('bob'));
      await p.waitForFunction(() => document.querySelectorAll('#messages .msg').length >= 20);
      await p.locator('#msg-input').fill('Runtime v180 send');
      await p.evaluate(() => sendMsg());
      await p.waitForFunction(() => [...document.querySelectorAll('#messages .msg-bubble')].some(node => node.textContent === 'Runtime v180 send'));
      await p.waitForTimeout(150);
      assert.equal(await p.locator('#messages .msg-bubble').filter({ hasText: 'Runtime v180 send' }).count(), 1, 'No duplicate optimistic message in full stack');
      await p.evaluate(() => openUserProfile('bob'));
      await p.waitForTimeout(200);
      assert.equal(await p.locator('#view-profile-name').textContent(), 'Bob');
      await p.evaluate(() => closeUserProfile());
      await p.waitForTimeout(150);
      await p.evaluate(() => {
        window.idleBadgeCandidates = 0; const query = Element.prototype.querySelectorAll;
        Element.prototype.querySelectorAll = function(selector) { const result = query.call(this, selector); if (this === document.body && selector.includes('profile-nick-marker')) idleBadgeCandidates += result.length; return result; };
      });
      await p.waitForTimeout(700);
      assert.equal(await p.evaluate(() => idleBadgeCandidates), 0, 'Full app has no whole-body role rescan while idle');
      assert(await p.locator('#input-area').evaluate(n => { const r = n.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; }), 'Composer still fits viewport ' + width);
      assert.deepEqual(errors, [], 'All production scripts work together at ' + width);
      await context.close();
    }
    console.log('PASS full production stack: isolated login, chat/history, optimistic send, profile, idle DOM work and composer at 390/1440px');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
