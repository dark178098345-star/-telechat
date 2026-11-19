'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  http = require('node:http'),
  assert = require('node:assert/strict');
if (!process.versions.electron) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exstra-utilities-native-')),
    env = { ...process.env, EXSTRA_UTILITIES_TEST: dir };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = require('node:child_process').spawn(
    path.resolve(__dirname, '../desktop-app/node_modules/electron/dist/electron.exe'),
    [__filename],
    { env, windowsHide: true, stdio: 'inherit' },
  );
  const timer = setTimeout(() => {
    console.error('Native utilities test timed out');
    child.kill();
  }, 50000);
  child.on('close', (code) => {
    clearTimeout(timer);
    const real = fs.realpathSync(dir);
    assert(real.startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-utilities-native-'));
    fs.rmSync(real, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
    process.exitCode = code === 0 ? 0 : 1;
  });
  return;
}
const e = require('electron'),
  { SitesWorkspace } = require('../desktop-app/browser/workspace');
const dir = process.env.EXSTRA_UTILITIES_TEST;
assert(
  dir &&
    path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-utilities-native-'),
);
e.app.setPath('userData', dir);
const payload = Buffer.from('MZ fixture only - never execute'),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, message) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    if (await fn()) return;
    await wait(60);
  }
  throw Error(message);
}
const server = http.createServer((req, res) => {
  if (req.url === '/file') {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="fixture-only.exe"',
    });
    return res.end(payload);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!doctype html><title>Utilities fixture</title><a id="file" href="/file" download>Download</a><button id="blob" onclick="const a=document.createElement(\'a\');a.href=window.URL.createObjectURL(new Blob([\'blob fixture\'],{type:\'text/plain\'}));a.download=\'fixture.txt\';a.click()">Blob</button><script>window.ready=true;</script>',
  );
});
let host, workspace;
(async () => {
  await e.app.whenReady();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  host = new e.BrowserWindow({
    show: false,
    paintWhenInitiallyHidden: false,
    width: 1000,
    height: 800,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  // Logical foreground facade, but the actual OS window remains hidden throughout.
  const facade = {
    webContents: host.webContents,
    contentView: host.contentView,
    getContentSize: () => host.getContentSize(),
    isDestroyed: () => host.isDestroyed(),
    isVisible: () => true,
    isFocused: () => true,
    isMinimized: () => false,
    show() {},
    focus() {},
    on: (...args) => host.on(...args),
    removeListener: (...args) => host.removeListener(...args),
  };
  const reveals = [];
  workspace = new SitesWorkspace(
    {
      ...e,
      shell: {
        showItemInFolder: (file) => reveals.push(file),
        openExternal() {
          throw Error('No external launch in test');
        },
      },
    },
    () => facade,
  );
  workspace.open(url);
  await workspace.chromeReady;
  assert((await workspace.command({ action: 'profile-enter', id: 'legacy', password: '' })).ok);
  const wc = workspace.current().view.webContents;
  await until(
    () => wc.executeJavaScript('window.ready===true').catch(() => false),
    'Fixture page ready',
  );
  const query = () =>
    wc.executeJavaScript('navigator.permissions.query({name:"clipboard-write"}).then(p=>p.state)');
  assert.equal(await query(), 'denied');
  wc.emit('before-mouse-event', {}, { type: 'mouseUp' });
  assert.equal(
    await query(),
    'granted',
    'Real Chromium clipboard permission follows selected-page click',
  );
  assert.equal(
    await wc.executeJavaScript(
      'navigator.permissions.query({name:"clipboard-read"}).then(p=>p.state)',
    ),
    'denied',
  );
  assert.equal(await wc.executeJavaScript('typeof require'), 'undefined');
  assert.equal(await wc.executeJavaScript('typeof window.exstraSites'), 'undefined');
  let count = 0,
    options = [];
  workspace.session.prependListener('will-download', (_event, item) => {
    item.setSavePath(path.join(dir, 'saved-' + ++count + (count === 1 ? '.exe' : '.txt')));
    item.once('done', () => options.push(item.getSaveDialogOptions()));
  });
  await wc.executeJavaScript('document.getElementById("file").click()', true);
  await until(
    () => workspace.downloads.list('legacy')[0]?.state === 'completed',
    'Real attachment download',
  );
  assert(fs.readFileSync(path.join(dir, 'saved-1.exe')).equals(payload));
  assert.equal(reveals.length, 0);
  await wc.executeJavaScript('document.getElementById("blob").click()', true);
  try {
    await until(
      () => workspace.downloads.list('legacy')[1]?.state === 'completed',
      'Real Blob download',
    );
  } catch (error) {
    console.log('Fixture diagnostic', {
      downloads: workspace.downloads.list('legacy'),
      notice: workspace.notice,
      url: wc.mainFrame.url,
      count,
    });
    throw error;
  }
  assert.equal(fs.readFileSync(path.join(dir, 'saved-2.txt'), 'utf8'), 'blob fixture');
  assert.equal(options[0].buttonLabel, 'Сохранить');
  assert((await workspace.command({ action: 'sites-tools', profileId: 'legacy', open: true })).ok);
  assert.equal(workspace.current().view.getVisible(), false);
  assert.equal(await query(), 'denied', 'Open menu does not leave a background clipboard grant');
  await workspace.command({ action: 'sites-tools', profileId: 'legacy', open: false });
  await workspace.command({ action: 'history-panel', profileId: 'legacy', open: true });
  assert(workspace.state().history.some((row) => row.url === url));
  assert(workspace.state().historyPanel);
  await workspace.command({ action: 'history-panel', profileId: 'legacy', open: false });
  assert.equal(workspace.state().history.length, 0, 'Private history omitted from idle state');
  await workspace.command({ action: 'profile-show', profileId: 'legacy' });
  assert.equal(workspace.state().downloads.length, 0);
  assert.equal(workspace.state().history.length, 0);
  assert(
    (
      await workspace.command({
        action: 'profile-create',
        nick: 'Separate',
        password: 'fixture-password',
      })
    ).ok,
  );
  await workspace.command({
    action: 'history-panel',
    profileId: workspace.profileActive.id,
    open: true,
  });
  assert.equal(workspace.state().history.length, 0);
  assert.equal(workspace.state().downloads.length, 0);
  assert(e.BrowserWindow.getAllWindows().every((w) => !w.isVisible()));
  await Promise.all([...workspace.histories.values()].map((history) => history.flush()));
  workspace.close();
  host.destroy();
  await new Promise((r) => server.close(r));
  console.log(
    'PASS real hidden Electron: Clipboard API permission changes after native click (no system clipboard touched), read denied, real HTTP/Blob files saved only in temp test directory, no execution, menu masking and profile-private history/downloads.',
  );
})().then(
  () => e.app.exit(0),
  (error) => {
    console.error(error);
    workspace?.close();
    host?.destroy();
    server.close();
    e.app.exit(1);
  },
);
