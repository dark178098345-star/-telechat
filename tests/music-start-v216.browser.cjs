'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'),
  read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=',
  'base64',
);
function wav() {
  const b = Buffer.alloc(44 + 80000);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
async function fixture(browser, width) {
  const p = await browser.newPage({ viewport: { width, height: 860 } }),
    errors = [],
    requests = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('request', (r) => requests.push(r.url()));
  await p.route('https://music-start.test/**', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<div id="auth-screen"></div><div id="chat-screen" class="active"></div><button id="under" style="position:fixed;top:30px;left:50%;width:50px;height:35px">Under</button><nav id="settings-home-v160"></nav><textarea id="msg-input"></textarea><button id="record-btn"></button><div id="voice-recording"></div><div class="sidebar-top"></div><div class="sidebar-footer"></div><div class="chat-main"></div>',
    }),
  );
  await p.route('https://art.test/**', (r) => r.fulfill({ contentType: 'image/png', body: png }));
  await p.route('https://audio.test/**', (r) =>
    r.fulfill({ contentType: 'audio/wav', body: wav() }),
  );
  await p.goto('https://music-start.test/');
  await p.evaluate(() => {
    window.me = { nick: 'alice' };
    window.clicks = 0;
    document.getElementById('under').onclick = () => clicks++;
    window.emitMusic = (patch = {}) => {
      const d = {
        track: {
          id: 'one',
          owner: me.nick,
          title: 'nyan pop',
          kind: 'file',
          fileName: 'nyan.mp3',
          cover_url: 'https://art.test/cover.png',
        },
        paused: false,
        loading: false,
        time: 2,
        duration: 120,
        ...patch,
      };
      dispatchEvent(new CustomEvent('telechat-music-progress-v117', { detail: d }));
    };
  });
  await p.clock.install();
  await p.addStyleTag({ content: read('music-start-v216.css') });
  await p.addScriptTag({ content: read('music-start-v216.js') });
  return { p, errors, requests };
}
(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--mute-audio'],
  });
  try {
    for (const width of [320, 390, 1440]) {
      const { p, errors, requests } = await fixture(browser, width);
      assert.equal(await p.locator('#music-start-v216').count(), 0, 'No idle DOM/image work');
      await p.evaluate(() => emitMusic({ loading: true }));
      assert.equal(await p.locator('#music-start-v216').count(), 0, 'Wait for actual playback');
      await p.evaluate(() => emitMusic());
      await p.waitForSelector('#music-start-v216.is-visible');
      assert.equal(await p.locator('#music-start-v216 strong').textContent(), 'nyan pop');
      assert.equal(await p.locator('.music-start-copy-v216>span').textContent(), 'nyan.mp3');
      assert.equal(await p.locator('#music-start-v216 time').textContent(), '0:02');
      await p.locator('#under').click();
      assert.equal(await p.evaluate(() => clicks), 1, 'Card is click-through');
      await p.waitForFunction(() => document.querySelector('#music-start-v216 img').complete);
      await p.clock.runFor(350);
      await p.screenshot({ path: path.join(root, 'outputs/music-start-v216-' + width + '.png') });
      const b = await p.locator('#music-start-v216').boundingBox();
      assert(b.x >= 0 && b.x + b.width <= width && b.height <= 90);
      assert(await p.locator('body').evaluate((n) => n.scrollWidth <= innerWidth));
      await p.evaluate(() => {
        window.artNode = document.querySelector('#music-start-v216 img');
        window.cardNode = document.getElementById('music-start-v216');
        for (let i = 0; i < 8; i++) emitMusic({ time: 3 + i / 10 });
      });
      assert(
        await p.evaluate(
          () =>
            artNode === document.querySelector('#music-start-v216 img') &&
            cardNode === document.getElementById('music-start-v216'),
        ),
      );
      assert.equal(requests.filter((u) => new URL(u).hostname === 'art.test').length, 1);
      await p.clock.fastForward(4600);
      await p.clock.runFor(300);
      assert(
        await p.locator('#music-start-v216').evaluate((n) => n.hidden),
        'Progress does not prolong the popup',
      );
      await p.evaluate(() => emitMusic({ time: 10 }));
      assert(
        await p.locator('#music-start-v216').evaluate((n) => n.hidden),
        'No periodic reappearance',
      );
      await p.evaluate(() => {
        emitMusic({ paused: true });
        emitMusic({ time: 10 });
      });
      await p.clock.runFor(40);
      assert(await p.locator('#music-start-v216').evaluate((n) => !n.hidden));
      await p.evaluate(() =>
        emitMusic({
          track: {
            id: 'two',
            owner: 'alice',
            title: '<img src=x onerror=alert(1)>',
            artist: 'Artist',
            url: 'https://audio.test/2.wav',
            cover_url: 'javascript:alert(1)',
          },
        }),
      );
      await p.clock.runFor(40);
      assert.equal(await p.locator('#music-start-v216 strong img').count(), 0);
      assert.equal(
        await p.locator('#music-start-v216 strong').textContent(),
        '<img src=x onerror=alert(1)>',
      );
      assert.equal(await p.locator('#music-start-v216 img').getAttribute('src'), null);
      await p.evaluate(() => {
        me = { nick: 'bob' };
        dispatchEvent(new Event('telechat-account-ready-v175'));
        emitMusic({ track: { id: 'old', owner: 'alice', title: 'Old private title' } });
      });
      assert(await p.locator('#music-start-v216').evaluate((n) => n.hidden));
      assert.equal(await p.locator('#music-start-v216 strong').textContent(), '');
      await p.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        emitMusic({
          track: {
            id: 'hidden',
            owner: 'bob',
            title: 'Hidden',
            cover_url: 'https://art.test/hidden.png',
          },
        });
      });
      assert(!requests.some((u) => u.includes('hidden.png')));
      assert(await p.locator('#music-start-v216').evaluate((n) => n.hidden));
      await p.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        dispatchEvent(new Event('visibilitychange'));
        emitMusic({ track: { id: 'hidden', owner: 'bob', title: 'Hidden' } });
      });
      assert(
        await p.locator('#music-start-v216').evaluate((n) => n.hidden),
        'No delayed notification on returning',
      );
      assert.deepEqual(errors, []);
      await p.close();
    }
    const real = await fixture(browser, 390);
    await real.p.addScriptTag({ content: read('music-library-v96.js') });
    await real.p.evaluate(
      async (bytes) => {
        const result = await telechatMusicV96.importFilesReport([
          new File([new Uint8Array(bytes)], 'nyan.mp3', { type: 'audio/wav' }),
        ]);
        window.added = result.added[0];
      },
      [...wav()],
    );
    assert.equal(await real.p.evaluate(() => added.fileName), 'nyan.mp3');
    await real.p.evaluate(() => telechatMusicV96.playTrack(added));
    await real.p.waitForFunction(
      () =>
        !telechatMusicV96.getState().paused &&
        !telechatMusicV96.getState().loading &&
        telechatMusicV96.getState().time > 0,
    );
    assert(await real.p.locator('#music-start-v216').evaluate((n) => !n.hidden));
    assert.equal(await real.p.locator('.music-start-copy-v216>span').textContent(), 'nyan.mp3');
    await real.p.evaluate(() => telechatMusicV96.pause());
    await real.p.waitForTimeout(300);
    assert(await real.p.locator('#music-start-v216').evaluate((n) => n.hidden));
    assert.deepEqual(real.errors, []);
    await real.p.close();
    const restart = await fixture(browser, 390);
    await restart.p.evaluate(() => {
      window.restartCalls = 0;
      window.installs = 0;
      window.pendingMedia = null;
      window.telechatDeliveryV72 = { diagnostics: async () => ({ queued: 0, durable: true }) };
      window.telechatDesktop = {
        isDesktop: true,
        restartApp: async () => {
          restartCalls++;
          return { ok: true };
        },
        installUpdate: () => installs++,
      };
    });
    await restart.p.addScriptTag({ content: read('app-restart-v216.js') });
    await restart.p.locator('#msg-input').fill('Draft');
    await restart.p.locator('#app-restart-open-v216').click();
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.locator('#app-restart-confirm-v216').click();
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.locator('#app-restart-cancel-v216').click();
    await restart.p.locator('#msg-input').fill('');
    await restart.p.evaluate(() => (telechatDeliveryV72.diagnostics = async () => ({ queued: 1 })));
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() =>
      document.getElementById('app-restart-status-v216').textContent.includes('неотправленные'),
    );
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.keyboard.press('Escape');
    await restart.p.evaluate(() => {
      window.resolveQueue = null;
      telechatDeliveryV72.diagnostics = () => new Promise((r) => (resolveQueue = r));
    });
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() => !!resolveQueue);
    await restart.p.keyboard.press('Escape');
    await restart.p.evaluate(() => resolveQueue({ queued: 0 }));
    assert.equal(
      await restart.p.evaluate(() => restartCalls),
      0,
      'Cancelled queue check cannot restart later',
    );
    await restart.p.evaluate(() => (telechatDeliveryV72.diagnostics = async () => ({ queued: 0 })));
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() => restartCalls === 1);
    assert.equal(await restart.p.evaluate(() => installs), 0, 'No installer API used');
    assert.deepEqual(restart.errors, []);
    await restart.p.close();
    console.log(
      'PASS music start card: no idle work, actual local audio/import filename, one popup per start/resume, real progress, stable art, click-through, timer/races/account/visibility cleanup, unsafe text/art guards, 320/390/1440. Restart is explicit, no installer, draft/outbox/cancel guards.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
