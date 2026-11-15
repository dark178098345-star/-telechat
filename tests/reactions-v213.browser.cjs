'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
async function fixture(b) {
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.route('https://reaction.test/**', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<style>body{background:#171820;color:#eee;font:14px system-ui}#messages{padding:20px}.msg-bubble{background:#2b2835;padding:16px;border-radius:18px}.ctx-menu{position:fixed;left:20px;top:170px;background:#24222e;padding:10px;border-radius:22px;display:none}.ctx-menu.show{display:block}.ctx-reactions-v36{display:grid}.ctx-item{display:block;color:white;background:none;border:0;padding:10px}.msg-meta{padding:5px}</style><div id="messages"><div class="msg" data-id="1"><div class="msg-bubble">Привет! Нажми или удерживай реакцию.</div><div class="msg-meta">12:00</div></div></div><div class="ctx-menu" id="ctx-menu"></div>',
    }),
  );
  await p.goto('https://reaction.test/');
  await p.addStyleTag({ path: path.join(root, 'reactions-v126.css') });
  await p.evaluate(() => {
    window.me = { nick: 'alice' };
    window.active = 'room';
    window.conversationKey = () => active;
    window.ctxMsg = null;
    window.pinnedMsgId = null;
    for (const name of [
      'showCtxMenu',
      'ctxPin',
      'loadPinned',
      'unpinMsg',
      'ctxDelete',
      'appendMessage',
      'renderMessages',
    ])
      window[name] = async () => {};
    window.row = { id: 1, from_nick: 'bob', text: 'Hello' };
    window.rows = [{ message_id: 1, user_nick: 'bob', emoji: '😄', created_at: 1 }];
    window.writes = [];
    window.toasts = [];
    window.showToast = (t) => toasts.push(t);
    window.channels = [];
    window.sb = {
      from() {
        const q = {
          select() {
            return q;
          },
          in() {
            return Promise.resolve({ data: structuredClone(rows), error: null });
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
          then(ok, no) {
            return new Promise((resolve, reject) =>
              writes.push({
                value: q.value,
                finish(error) {
                  if (error) reject(Error(error));
                  else {
                    rows = rows.filter((r) => r.user_nick !== (q.value?.user_nick || q.user_nick));
                    if (q.value) rows.push(q.value);
                    resolve({ error: null });
                  }
                },
              }),
            ).then(ok, no);
          },
        };
        return q;
      },
      channel() {
        const c = {
          on() {
            return c;
          },
          subscribe() {
            return c;
          },
        };
        channels.push(c);
        return c;
      },
      removeChannel: async () => {},
    };
  });
  for (const f of [
    'emoji-catalog-v182.js',
    'emoji-art-v182.js',
    'reaction-art-v126.js',
    'message-context-v36.js',
    'emoji-animation-v128.js',
  ])
    await p.addScriptTag({ path: path.join(root, f) });
  await p.evaluate(() => telechatSyncVisibleMessagesV105([row]));
  await p.waitForSelector('.message-reaction-v36');
  return p;
}
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    let p = await fixture(b);
    await p.evaluate(() => {
      window.legacyHold = 0;
      const row = document.querySelector('.msg');
      row.addEventListener('touchstart', () => legacyHold++);
      row.addEventListener('contextmenu', () => legacyHold++);
    });
    await p
      .locator('.message-reaction-v36')
      .dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 40, clientY: 130 }] });
    await p.locator('.message-reaction-v36').dispatchEvent('contextmenu');
    assert.equal(
      await p.evaluate(() => legacyHold),
      0,
      'Holding a reaction does not also open the old message menu',
    );
    await p.locator('.message-reaction-v36').click();
    await p.waitForFunction(() => writes.length === 1);
    assert.equal(
      await p.evaluate(() => writes[0].value.emoji),
      '😄',
      'Historic reaction outside quick six is usable',
    );
    await p.evaluate(() => writes[0].finish());
    await p.waitForFunction(() => !document.querySelector('.message-reaction-v36').disabled);
    await p.close();
    p = await fixture(b);
    await p.evaluate(() => showCtxMenu({ clientX: 200, clientY: 190 }, row));
    const target = p.locator('[data-reaction-v36="❤️"]'),
      r = await target.boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.down();
    await p.waitForSelector('.reaction-preview-v213');
    assert.equal(await p.evaluate(() => writes.length), 0);
    assert(
      await p
        .locator('.reaction-preview-v213 svg')
        .evaluate((n) => n.getAnimations({ subtree: true }).length > 0),
      'Hold has semantic animation',
    );
    const preview = await p.locator('.reaction-preview-v213').boundingBox();
    assert(preview.x >= 0 && preview.x + preview.width <= 390);
    await p.screenshot({ path: path.join(root, 'outputs/reaction-hold-v213.png') });
    await p.mouse.up();
    await p.waitForTimeout(30);
    assert.equal(
      await p.evaluate(() => writes.length),
      0,
      'Release of hold does not accidentally react',
    );
    assert.equal(await p.locator('.reaction-preview-v213').count(), 0);
    await target.click();
    await p.waitForFunction(() => writes.length === 1);
    await p.close();
    p = await fixture(b);
    await p.locator('.message-reaction-v36').click();
    await p.waitForFunction(() => writes.length === 1);
    await p.evaluate(() => {
      dispatchEvent(new Event('telechat-account-ready-v175'));
      rows = [{ message_id: 1, user_nick: 'bob', emoji: '😄' }];
      telechatSyncVisibleMessagesV105([row]);
    });
    await p.waitForSelector('.message-reaction-v36');
    await p.locator('.message-reaction-v36').click();
    await p.waitForFunction(() => writes.length === 2);
    await p.evaluate(() => writes[0].finish('Old session failure'));
    await p.waitForTimeout(30);
    assert(
      await p.locator('.message-reaction-v36').isDisabled(),
      'Old finally cannot unlock new-session mutation',
    );
    assert.equal(await p.evaluate(() => toasts.length), 0);
    await p.evaluate(() => writes[1].finish());
    await p.waitForFunction(() => !document.querySelector('.message-reaction-v36').disabled);
    await p.close();
    p = await fixture(b);
    await p.evaluate(async () => {
      rows = [
        { message_id: 1, user_nick: 'bob', emoji: '❤', created_at: 1 },
        { message_id: 1, user_nick: 'bob', emoji: '❤️', created_at: 2 },
        { message_id: 1, user_nick: 'carol', emoji: '❤️', created_at: 3 },
      ];
      await telechatRefreshReactionsV36();
    });
    assert.equal(await p.locator('.message-reaction-v36').count(), 1);
    assert.equal(
      await p.locator('.reaction-count-v126').textContent(),
      '2',
      'Unicode heart variants and duplicate rows do not double-count',
    );
    await p.clock.install();
    await p.locator('.message-reaction-v36').click();
    await p.waitForFunction(() => writes.length === 1);
    await p.clock.fastForward(30100);
    assert(
      await p.locator('.message-reaction-v36').isEnabled(),
      'Stalled transport cannot permanently lock reactions',
    );
    assert.match(await p.evaluate(() => toasts[0]), /не подтвердил/);
    await p.close();
    console.log(
      'PASS v213 reactions: old emoji can be selected, hold preview/finite animation/no write, same-session races, normalized duplicate counts and bounded stalled writes.',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
