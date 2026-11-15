'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [320, 390, 1440]) {
      const c = await browser.newContext({ viewport: { width, height: 900 } }),
        requests = [],
        errors = [];
      await c.route('**/*', (r) => {
        const u = new URL(r.request().url());
        requests.push({ url: u.href, method: r.request().method() });
        if (u.hostname !== 'spell.test') return r.abort();
        if (u.pathname === '/')
          return r.fulfill({
            contentType: 'text/html',
            body: '<style>body{margin:0;padding:20px;background:#181920;color:white;font:16px system-ui}.composer-shell{position:relative}textarea{box-sizing:border-box;width:100%;padding:12px 14px;min-height:48px;max-height:100px;font:16px/1.4 system-ui;background:#262630;color:#eee;border:1px solid #554a69;resize:none;border-radius:16px}#settings-panel{margin-top:20px}input[type=checkbox]{width:24px;height:24px}</style><div class="composer-shell"><textarea id="msg-input" rows="3"></textarea></div><div id="settings-panel"></div>',
          });
        const file = path.join(root, u.pathname);
        if (!file.startsWith(root) || !fs.existsSync(file)) return r.abort();
        return r.fulfill({
          contentType: file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream',
          body: fs.readFileSync(file),
        });
      });
      const p = await c.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto('https://spell.test/');
      await p.evaluate(() => {
        window.me = { nick: 'alice' };
        window.active = 'alice_bob';
        window.conversationKey = () => active;
      });
      await p.addStyleTag({ path: path.join(root, 'spellcheck-v213.css') });
      await p.addScriptTag({ path: path.join(root, 'spellcheck-v213.js') });
      assert.equal(
        requests.filter((x) => x.url.includes('ru.trie')).length,
        0,
        'No startup dictionary download',
      );
      await p.locator('textarea').fill('Превет, мир!');
      await p.waitForSelector('.spell-letter-v213');
      assert.equal(await p.locator('.spell-word-v213').textContent(), 'Превет');
      assert.equal(await p.locator('.spell-letter-v213').textContent(), 'е');
      assert.equal(
        await p.locator('textarea').inputValue(),
        'Превет, мир!',
        'Spelling never edits the draft',
      );
      const geometry = await p.evaluate(() => {
        const a = document.querySelector('textarea').getBoundingClientRect(),
          b = document.querySelector('.spell-mirror-v213').getBoundingClientRect();
        return (
          Math.abs(a.x - b.x) +
          Math.abs(a.y - b.y) +
          Math.abs(a.width - b.width) +
          Math.abs(a.height - b.height)
        );
      });
      assert(geometry < 1, 'Overlay matches textarea at ' + width);
      await p.locator('textarea').fill('Привет! Сообщениями, музыкой и реакциями.');
      await p.waitForFunction(() => exstraSpellV213.state().marks === 0);
      await p.waitForTimeout(600);
      assert.equal(
        await p.locator('.spell-word-v213').count(),
        0,
        'Inflected Russian words remain correct',
      );
      await p.locator('textarea').fill('https://пример.рф/превет @превет [ex182:boxing] 😊');
      await p.waitForTimeout(600);
      assert.equal(
        await p.locator('.spell-word-v213').count(),
        0,
        'URLs, mentions and custom emoji tokens are ignored',
      );
      await p.locator('textarea').fill('<img src=x onerror=alert(1)> превет!');
      await p.waitForSelector('.spell-letter-v213');
      assert.equal(
        await p.locator('.spell-mirror-v213 img').count(),
        0,
        'Draft markup is text only',
      );
      await p.locator('textarea').fill('Привет мир! '.repeat(35) + 'превет!');
      await p.waitForSelector('.spell-letter-v213');
      await p.locator('textarea').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
        n.dispatchEvent(new Event('scroll'));
      });
      await p.waitForTimeout(50);
      assert.equal(
        await p.evaluate(() => document.querySelector('textarea').scrollTop),
        await p.locator('.spell-mirror-v213').evaluate((n) => n.scrollTop),
        'Multiline scroll is synchronized',
      );
      await p.locator('[aria-label="Подсвечивать ошибки в сообщениях"]').uncheck();
      assert.equal(await p.locator('.spell-word-v213').count(), 0);
      assert.equal(await p.evaluate(() => exstraSpellV213.state().worker), false);
      await p.evaluate(() => {
        me = { nick: 'bob' };
        dispatchEvent(new Event('telechat-account-ready-v175'));
      });
      assert.equal(
        await p.evaluate(() => exstraSpellV213.state().enabled),
        true,
        'Preference is account-scoped',
      );
      await p.evaluate(() => {
        me = { nick: 'alice' };
        dispatchEvent(new Event('telechat-account-ready-v175'));
      });
      assert.equal(await p.evaluate(() => exstraSpellV213.state().enabled), false);
      assert(
        requests.every((x) => x.method === 'GET' && new URL(x.url).hostname === 'spell.test'),
        'No draft words leave the local origin',
      );
      assert.deepEqual(errors, []);
      await p.screenshot({ path: path.join(root, 'outputs/spellcheck-v213-' + width + '.png') });
      await c.close();
    }
    const c = await browser.newContext();
    await c.route('https://worker.test/**', (r) => {
      const u = new URL(r.request().url());
      if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: '' });
      return r.fulfill({
        contentType: u.pathname.endsWith('.js')
          ? 'application/javascript'
          : 'application/octet-stream',
        body: fs.readFileSync(path.join(root, u.pathname)),
      });
    });
    const p = await c.newPage();
    await p.goto('https://worker.test/');
    const result = await p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const w = new Worker('/spell-worker-v213.js');
          w.onerror = reject;
          w.onmessage = (e) => {
            w.terminate();
            resolve(e.data);
          };
          w.postMessage({
            type: 'check',
            id: 1,
            words: [
              'привет',
              'превет',
              'пожалуйста',
              'пожалуста',
              'сообщениями',
              'клавиатруа',
              'пороль',
            ],
          });
        }),
    );
    assert.equal(result.bytes, 2118484);
    const words = new Map(result.result.map((x) => [x.word, x]));
    assert(words.get('привет').correct && words.get('сообщениями').correct);
    assert.deepEqual(words.get('превет').red, [2]);
    assert.equal(words.get('пороль').suggestions[0], 'пароль');
    assert(!words.get('пожалуста').correct);
    await c.close();
    console.log(
      'PASS spelling: compressed 2.1 MB graph, inflections, precise replacement highlight, no draft edits/external requests, lazy worker, URLs/tokens, multiline scroll, settings and 320/390/1440 layouts.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
