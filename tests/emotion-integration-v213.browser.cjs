'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright'),
  { fixtureClient } = require('./runtime-v180.browser.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const c = await browser.newContext({
        viewport: { width, height: 900 },
        isMobile: width < 600,
        hasTouch: width < 600,
        serviceWorkers: 'block',
      });
      await c.addInitScript(fixtureClient);
      await c.route('**/*', (r) => {
        const u = new URL(r.request().url());
        if (u.hostname === 'cdn.jsdelivr.net')
          return r.fulfill({ contentType: 'application/javascript', body: '' });
        if (u.hostname.endsWith('.supabase.co'))
          return r.fulfill({ contentType: 'application/json', body: '[]' });
        if (u.hostname !== 'app.test') return r.abort();
        const file = path.resolve(root, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return r.abort();
        return r.fulfill({
          contentType:
            {
              '.html': 'text/html',
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.webp': 'image/webp',
              '.png': 'image/png',
              '.svg': 'image/svg+xml',
            }[path.extname(file)] || 'application/octet-stream',
          body: fs.readFileSync(file),
        });
      });
      const p = await c.newPage(),
        errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto('https://app.test/?v=213');
      await p.locator('#l-login').fill('alice');
      await p.locator('#l-pass').fill('fixture-only');
      await p.evaluate(() => doLogin());
      await p.waitForSelector('#whats-new-v181[open]');
      await p.locator('#whats-new-v181 [data-close]').last().click();
      await p.evaluate(() => openChat('bob'));
      await p.waitForFunction(() => document.querySelectorAll('#messages .msg').length >= 20);
      await p.evaluate(() => {
        window.reactionFixture = { rows: [], writes: 0 };
        const from = sb.from;
        sb.from = function (table) {
          if (table !== 'message_reactions') return from.call(this, table);
          const q = {
            select() {
              return q;
            },
            in(_, ids) {
              return Promise.resolve({
                data: reactionFixture.rows.filter((row) =>
                  ids.map(String).includes(String(row.message_id)),
                ),
              });
            },
            upsert(value) {
              q.value = value;
              return q;
            },
            delete() {
              q.remove = true;
              return q;
            },
            eq(k, v) {
              q[k] = v;
              return q;
            },
            abortSignal() {
              return q;
            },
            then(resolve, reject) {
              reactionFixture.writes++;
              const actor = q.value?.user_nick || q.user_nick,
                id = q.value?.message_id || q.message_id;
              reactionFixture.rows = reactionFixture.rows.filter(
                (row) => !(row.user_nick === actor && String(row.message_id) === String(id)),
              );
              if (q.value) reactionFixture.rows.push(q.value);
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return q;
        };
        const el = [...document.querySelectorAll('#messages .msg[data-id]')].at(-1);
        window.targetReactionId = el.dataset.id;
        showCtxMenu(
          { clientX: innerWidth - 80, clientY: innerHeight - 250 },
          el._messageSourceV136 || { id: Number(el.dataset.id), from_nick: 'bob', text: 'Fixture' },
        );
      });
      await p.locator('[data-reaction-v36="😂"]').click();
      await p.waitForFunction(() => reactionFixture.rows.length === 1);
      await p.waitForSelector('.message-reaction-v36');
      await p.waitForTimeout(250);
      assert.equal(await p.locator('.message-reaction-v36').getAttribute('aria-pressed'), 'true');
      assert.equal(await p.locator('.reaction-count-v126').textContent(), '1');
      await p.locator('.message-reaction-v36').click();
      await p.waitForFunction(() => reactionFixture.rows.length === 0);
      await p.waitForSelector('.message-reaction-v36', { state: 'detached' });
      assert.equal(
        await p.evaluate(() => reactionFixture.writes),
        2,
        'One confirmed add and one confirmed remove in full stack',
      );
      await p.locator('#msg-input').fill('Превет, бро! Как твои дела? 😊');
      await p.waitForSelector('.spell-letter-v213');
      assert.equal(await p.locator('.spell-letter-v213').textContent(), 'е');
      assert.equal(await p.locator('#msg-input').inputValue(), 'Превет, бро! Как твои дела? 😊');
      await p.screenshot({
        path: path.join(root, 'outputs/emotion-spell-runtime-v213-' + width + '.png'),
      });
      await p.evaluate(() => document.body.classList.add('theme-light'));
      await p.screenshot({
        path: path.join(root, 'outputs/emotion-spell-runtime-v213-light-' + width + '.png'),
      });
      assert.deepEqual(errors, []);
      await c.close();
    }
    console.log(
      'PASS v213 complete app: real message context add/remove, one write per intent, stable persisted pill and Russian-letter overlay without altering emoji/draft at 390/1440. Fixture server only.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
