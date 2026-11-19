'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os'),
  { EventEmitter } = require('node:events');
const { PagePermissions } = require('../desktop-app/browser/page-permissions');
const { SiteDownloads, filename, sourceURL } = require('../desktop-app/browser/downloads');
const { SiteHistory, cleanURL } = require('../desktop-app/browser/history');
const { showPageMenu } = require('../desktop-app/browser/context-menu');
(async () => {
  let now = 1000,
    active = true;
  const wc = {
    mainFrame: { url: 'https://example.test/page' },
    focusedFrame: { url: 'https://embed.test/' },
    isDestroyed: () => false,
  };
  const permissions = new PagePermissions(
    (value) => active && value === wc,
    () => now,
  );
  const allow = (type, url = 'https://example.test/', details = { isMainFrame: true }) =>
    permissions.allow(wc, type, url, details);
  assert(!allow('clipboard-sanitized-write'));
  permissions.input(wc, { type: 'mouseMove' });
  assert(!allow('clipboard-sanitized-write'));
  permissions.input(wc, { type: 'mouseUp' });
  assert(allow('clipboard-sanitized-write'));
  for (const denied of [
    'clipboard-read',
    'deprecated-sync-clipboard-read',
    'media',
    'notifications',
    'geolocation',
    'fileSystem',
    'display-capture',
  ])
    assert(!allow(denied));
  assert(!allow('clipboard-sanitized-write', 'https://evil.test/'));
  assert(allow('clipboard-sanitized-write', 'https://embed.test/', { isMainFrame: false }));
  assert(!allow('clipboard-sanitized-write', 'https://other.test/', { isMainFrame: false }));
  now += 5001;
  assert(!allow('clipboard-sanitized-write'));
  permissions.input(wc, { type: 'keyDown' });
  active = false;
  assert(!allow('clipboard-sanitized-write'));
  active = true;
  permissions.clear(wc);
  assert(!allow('clipboard-sanitized-write'));
  assert.equal(filename('../../CON.txt'), '_CON.txt');
  assert(!filename('x\u202eexe.txt').includes('\u202e'));
  assert.equal(filename('a/b:c?.zip'), 'b_c_.zip');
  for (const bad of [
    'file:///C:/x',
    'javascript:evil',
    'ftp://host/a',
    'https://u:p@example.test/a',
    'blob:file:///C:/x',
  ])
    assert(!sourceURL(bad));
  assert(sourceURL('blob:https://example.test/id'));
  assert(sourceURL('data:application/octet-stream;base64,AA=='));
  let currentOwner = 'a',
    changes = 0;
  const reveals = [],
    notices = [];
  const downloads = new SiteDownloads(
    {
      app: { getPath: () => path.join(os.tmpdir(), 'not-written') },
      shell: { showItemInFolder: (value) => reveals.push(value) },
    },
    (value, owner) => value === wc && owner === currentOwner,
    () => changes++,
    (text) => notices.push(text),
  );
  class Item extends EventEmitter {
    getInitiatorOrigin() {
      return 'https://example.test';
    }
    getURL() {
      return 'https://cdn.test/file';
    }
    getURLChain() {
      return [this.getURL()];
    }
    getFilename() {
      return '../setup.exe';
    }
    setSaveDialogOptions(options) {
      this.options = options;
    }
    getReceivedBytes() {
      return 10;
    }
    getTotalBytes() {
      return 20;
    }
    getSavePath() {
      return this.saved || '';
    }
    isPaused() {
      return false;
    }
    cancel() {
      this.emit('done', {}, 'cancelled');
    }
  }
  let prevented = false;
  const event = {
    preventDefault() {
      prevented = true;
    },
  };
  const item = new Item();
  downloads.accept(event, item, wc, 'a');
  assert(!prevented);
  assert.equal(item.options.buttonLabel, 'Сохранить');
  assert.equal(path.basename(item.options.defaultPath), 'setup.exe');
  assert(!('path' in downloads.list('a')[0]));
  assert.equal(downloads.list('b').length, 0);
  assert(changes);
  assert.equal(
    downloads.action('b', { action: 'download-reveal', id: downloads.list('a')[0].id }).ok,
    false,
  );
  prevented = false;
  downloads.accept(event, new Item(), wc, 'a');
  assert(prevented, 'Only one unconfirmed save dialog');
  item.saved = path.join(os.tmpdir(), 'chosen-by-user.exe');
  item.emit('done', {}, 'completed');
  const row = downloads.list('a')[0];
  assert.equal(row.name, 'chosen-by-user.exe');
  assert.equal(reveals.length, 0, 'Never open or execute a completed file');
  assert(downloads.action('a', { action: 'download-reveal', id: row.id }).ok);
  assert.equal(reveals[0], item.saved);
  const wrong = new Item();
  wrong.getInitiatorOrigin = () => 'https://iframe.test';
  prevented = false;
  downloads.accept(event, wrong, wc, 'a');
  assert(prevented);
  const old = new Item();
  currentOwner = 'b';
  prevented = false;
  downloads.accept(event, old, wc, 'a');
  assert(prevented);
  currentOwner = 'a';
  const pending = new Item();
  downloads.accept(event, pending, wc, 'a');
  downloads.cancel('a');
  assert.equal(downloads.list('a').at(-1).state, 'cancelled');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exstra-history-test-'));
  try {
    const file = path.join(dir, 'history.json'),
      history = new SiteHistory(file);
    await history.load();
    history.visit('https://example.test/one#section', 'One');
    history.visit('https://example.test/one', 'Renamed');
    assert.equal(history.list().length, 1);
    assert.equal(cleanURL('https://example.test/?access_token=private'), '');
    history.visit('https://example.test/?password=private', 'NO');
    assert.equal(history.list().length, 1);
    for (let i = 0; i < 520; i++) history.visit('https://example.test/' + i, 'Page ' + i);
    assert.equal(history.list().length, 500);
    await history.flush();
    const restored = new SiteHistory(file);
    await restored.load();
    assert.equal(restored.list()[0].title, 'Page 519');
    assert.equal(restored.list().length, 500);
    assert((await restored.clear()).ok);
    const empty = new SiteHistory(file);
    await empty.load();
    assert.equal(empty.list().length, 0);
    await fs.writeFile(file, 'corrupt');
    const corrupt = new SiteHistory(file);
    await corrupt.load();
    assert(corrupt.error);
    corrupt.visit('https://example.test/', 'Ignored');
    assert.equal(await fs.readFile(file, 'utf8'), 'corrupt');
  } finally {
    const real = await fs.realpath(dir);
    assert(real.startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-history-test-'));
    await fs.rm(real, { recursive: true, force: true });
  }
  let template,
    copied = '',
    epoch = 1,
    reloads = 0;
  wc.navigationHistory = { canGoBack: () => false, canGoForward: () => false };
  wc.copy = () => {};
  wc.paste = () => {};
  const tab = { url: 'https://example.test/page', view: { webContents: wc } },
    workspace = {
      profileActive: { id: 'a' },
      get profileEpoch() {
        return epoch;
      },
      activePage: () => true,
      host: {},
      tabs: [tab],
      navigate: () => reloads++,
      add: () => {},
    };
  showPageMenu(
    {
      Menu: {
        buildFromTemplate: (items) => {
          template = items;
          return { popup() {} };
        },
      },
      clipboard: { writeText: (value) => (copied = value) },
      shell: {},
    },
    workspace,
    tab,
    wc,
    { linkURL: 'https://example.test/link' },
  );
  template.find((row) => row.label === 'Скопировать ссылку').click();
  assert.equal(copied, 'https://example.test/link');
  template.find((row) => row.label === 'Обновить страницу').click();
  assert.equal(reloads, 1);
  epoch++;
  template.find((row) => row.label === 'Обновить страницу').click();
  assert.equal(reloads, 1, 'Old context menu cannot act on another profile');
  console.log(
    'PASS Sites utilities: gesture-scoped write-only clipboard, selected frame/origin checks, mandatory Save As/no autorun, ownership/limits/cancel/reveal, bounded private history/persistence/clear and stale-safe context menu.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
