'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'),
  dir = path.join(root, 'desktop-app/browser');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height] of [
      [420, 420],
      [540, 720],
      [1220, 820],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        window.commands = [];
        window.fixture = {
          active: 1,
          max: 8,
          mode: 'embedded',
          alwaysOnTop: false,
          notice: '',
          shortcutsReady: true,
          shortcuts: [],
          tabs: [{ id: 1, title: 'Site', url: 'https://example.test/', loading: false }],
          profiles: {
            ready: true,
            error: '',
            fatal: false,
            screen: 'browser',
            max: 12,
            active: { id: 'legacy', nick: 'Основной', settings: {} },
            items: [],
          },
          downloads: [
            {
              id: 'file1',
              name: '<img src=x>.exe',
              site: 'example.test',
              state: 'progressing',
              received: 1024,
              total: 4096,
            },
          ],
          history: [],
          historyError: '',
          downloadPanel: false,
          historyPanel: false,
          toolsMenu: false,
        };
        window.visits = [
          { id: 'new', url: 'https://example.test/new', title: 'Новая страница', at: 10000 },
          { id: 'old', url: 'https://example.test/old', title: 'Старая страница', at: 1000 },
        ];
        window.exstraSites = {
          state: async () => structuredClone(fixture),
          onState: (fn) => (window.paintSites = fn),
          onFocus: () => {},
          command: async (payload) => {
            commands.push(structuredClone(payload));
            if (['sites-tools', 'history-panel', 'downloads-panel'].includes(payload.action)) {
              fixture.toolsMenu = payload.action === 'sites-tools' && payload.open;
              fixture.historyPanel = payload.action === 'history-panel' && payload.open;
              fixture.downloadPanel = payload.action === 'downloads-panel' && payload.open;
              fixture.history = fixture.historyPanel ? structuredClone(visits) : [];
            }
            if (payload.action === 'background')
              fixture.tabs[0].background = !fixture.tabs[0].background;
            if (payload.action === 'pin') {
              fixture.mode = 'window';
              fixture.alwaysOnTop = !fixture.alwaysOnTop;
            }
            if (payload.action === 'history-clear') {
              visits = [];
              fixture.history = [];
            }
            if (payload.action === 'history-open') {
              fixture.historyPanel = false;
              fixture.history = [];
            }
            paintSites(structuredClone(fixture));
            return { ok: true };
          },
        };
      });
      await page.route('https://sites.test/**', (route) => {
        const name = new URL(route.request().url()).pathname;
        const file = path.join(dir, name === '/' ? 'index.html' : name.slice(1));
        return route.fulfill({
          contentType: {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
          }[path.extname(file)],
          body: fs.readFileSync(file),
        });
      });
      await page.goto('https://sites.test/');
      await page.waitForSelector('#sites-more');
      assert(await page.locator('#sites-more').isVisible());
      assert(!(await page.locator('#background').isVisible()));
      assert(await page.locator('.toolbar').evaluate((n) => n.scrollWidth <= n.clientWidth));
      await page.locator('#sites-more').click();
      assert(await page.locator('#sites-tools').isVisible());
      const bounds = await page.locator('#sites-tools').boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width);
      await page.locator('#background').click();
      assert.equal(await page.evaluate(() => fixture.tabs[0].background), true);
      assert(!(await page.locator('#sites-tools').isVisible()));
      await page.locator('#sites-more').click();
      await page.locator('#pin').click();
      assert.equal(await page.evaluate(() => fixture.alwaysOnTop), true);
      await page.locator('#sites-more').click();
      await page.locator('#sites-downloads-link').click();
      assert(await page.locator('#sites-records').isVisible());
      assert.equal(await page.locator('.sites-record-row img').count(), 0);
      assert.equal(await page.locator('.sites-record-row strong').textContent(), '<img src=x>.exe');
      const selected = await page.locator('.sites-record-row').elementHandle();
      await page.evaluate(() => {
        fixture.downloads[0].received = 2048;
        paintSites(structuredClone(fixture));
      });
      assert(
        await page.locator('.sites-record-row').evaluate((node, old) => node === old, selected),
      );
      await page.locator('.sites-record-row button').click();
      assert.equal(await page.evaluate(() => commands.at(-1).action), 'download-cancel');
      assert.equal(await page.evaluate(() => commands.at(-1).profileId), 'legacy');
      await page.locator('#sites-records-close').click();
      assert(!(await page.locator('#sites-utilities').isVisible()));
      assert.equal(await page.locator('#stage').evaluate((n) => n.inert), false);
      assert.equal(await page.locator('#address').evaluate((n) => n.inert), false);
      await page.locator('#sites-more').click();
      await page.locator('#sites-history-link').click();
      assert.equal(
        await page.locator('.sites-record-row strong').first().textContent(),
        'Новая страница',
      );
      await page.screenshot({ path: path.join(root, `outputs/sites-history-v215-${width}.png`) });
      await page.locator('#sites-history-clear').click();
      assert.equal(
        await page.evaluate(() => commands.filter((c) => c.action === 'history-clear').length),
        0,
      );
      await page.locator('#sites-history-clear').click();
      assert.equal(await page.locator('.sites-record-row').count(), 0);
      await page.keyboard.press('Escape');
      assert(!(await page.locator('#sites-utilities').isVisible()));
      await page.locator('#sites-more').click();
      await page.screenshot({ path: path.join(root, `outputs/sites-tools-v215-${width}.png`) });
      await page.evaluate(() => {
        fixture.profiles.screen = 'chooser';
        fixture.profiles.active = null;
        fixture.profiles.items = [];
        fixture.tabs = [];
        fixture.toolsMenu = false;
        fixture.historyPanel = false;
        fixture.downloadPanel = false;
        fixture.history = [];
        fixture.downloads = [];
        paintSites(structuredClone(fixture));
      });
      assert.equal(await page.locator('.sites-record-row').count(), 0);
      assert(!(await page.locator('#sites-more').isVisible()));
      assert(!(await page.locator('#sites-utilities').isVisible()));
      assert(await page.locator('body').evaluate((n) => n.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      'PASS Sites utilities UI: compact ellipsis menu, background/pin controls, download state/keyed rows, safe titles, profile-owned commands, newest-first history/confirmed clear, Escape/focus restoration and 420/540/1220 layouts.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
