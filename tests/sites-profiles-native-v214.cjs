'use strict';
// Isolated hidden Electron. Never opens the user's app profile or installer.
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  http = require('node:http'),
  assert = require('node:assert/strict');
if (!process.versions.electron) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exstra-profiles-native-')),
    env = { ...process.env, EXSTRA_PROFILES_TEST_DIR: dir };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = require('node:child_process').spawn(
    path.resolve(__dirname, '../desktop-app/node_modules/electron/dist/electron.exe'),
    [__filename],
    { env, windowsHide: true, stdio: 'inherit' },
  );
  const timer = setTimeout(() => {
    console.error('Isolated profiles test timeout');
    child.kill();
  }, 50000);
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    const real = fs.realpathSync(dir);
    assert(real.startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-profiles-native-'));
    fs.rmSync(real, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
    process.exitCode = code === 0 ? 0 : 1;
  });
  return;
}
const electron = require('electron'),
  { app, BrowserWindow, session } = electron,
  { SitesWorkspace } = require('../desktop-app/browser/workspace');
const dir = process.env.EXSTRA_PROFILES_TEST_DIR;
assert(
  dir &&
    path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-profiles-native-'),
);
app.setPath('userData', dir);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, text) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    if (await fn()) return;
    await wait(60);
  }
  throw Error(text);
}
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!doctype html><meta charset="utf-8"><title>Profile fixture</title><p>Local profile isolation only.</p><input id="draft"><script>window.fixtureReady=true;</script>',
  );
});
let host, workspace;
(async () => {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const oldShortcuts = JSON.stringify({
    version: 1,
    items: [{ id: 'old-shortcut', name: 'Старый сайт', url, icon: 'globe' }],
  });
  fs.writeFileSync(path.join(dir, 'sites-shortcuts.json'), oldShortcuts);
  const legacySession = session.fromPartition('persist:exstra-sites-v202');
  await legacySession.cookies.set({ url, name: 'profile_marker', value: 'legacy-fixture' });
  host = new BrowserWindow({
    show: false,
    paintWhenInitiallyHidden: false,
    width: 1000,
    height: 800,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const facade = {
    webContents: host.webContents,
    contentView: host.contentView,
    getContentSize: () => host.getContentSize(),
    isDestroyed: () => host.isDestroyed(),
    isVisible: () => false,
    isMinimized: () => false,
    show() {},
    focus() {},
    on: (...args) => host.on(...args),
    removeListener: (...args) => host.removeListener(...args),
  };
  function HiddenWindow(options) {
    const win = new BrowserWindow({ ...options, show: false, paintWhenInitiallyHidden: false });
    win.show = () => {};
    win.focus = () => {};
    return win;
  }
  workspace = new SitesWorkspace(
    {
      app,
      BrowserWindow: HiddenWindow,
      WebContentsView: electron.WebContentsView,
      ipcMain: electron.ipcMain,
      session,
      shell: electron.shell,
    },
    () => facade,
  );
  workspace.open(url);
  await workspace.chromeReady;
  assert.equal(workspace.state().profiles.screen, 'chooser');
  assert.equal(workspace.tabs.length, 0);
  assert.equal(workspace.profileSessions.size, 0, 'No profile session/page preload before unlock');
  assert.deepEqual(workspace.state().shortcuts, []);
  assert((await workspace.command({ action: 'profile-enter', id: 'legacy', password: '' })).ok);
  assert.equal(workspace.session, legacySession);
  assert.equal(workspace.shortcuts.list()[0].id, 'old-shortcut');
  assert.equal(fs.readFileSync(path.join(dir, 'sites-shortcuts.json'), 'utf8'), oldShortcuts);
  let oldWC = workspace.current().view.webContents;
  await until(
    () => oldWC.executeJavaScript('window.fixtureReady===true').catch(() => false),
    'Legacy fixture page',
  );
  await oldWC.executeJavaScript('localStorage.setItem("profile_fixture","legacy")');
  assert.equal(
    await oldWC.executeJavaScript(
      'typeof require+":"+typeof window.exstraSites+":"+typeof window.telechatDesktop',
    ),
    'undefined:undefined:undefined',
  );
  const chromeState = await workspace.chrome.webContents.executeJavaScript(
    'window.exstraSites.state()',
  );
  assert.equal(chromeState.profiles.active.id, 'legacy');
  assert(!JSON.stringify(chromeState).includes('digest'));
  assert((await workspace.command({ action: 'profile-show', profileId: 'legacy' })).ok);
  await until(() => oldWC.isDestroyed(), 'Lock destroys previous website renderer');
  assert.deepEqual(workspace.state().tabs, []);
  assert.deepEqual(workspace.state().shortcuts, []);
  const createA = await workspace.command({
    action: 'profile-create',
    nick: 'Альфа',
    password: 'fixture-pass-alpha',
  });
  assert(createA.ok);
  const a = createA.profile.id;
  assert.equal((await workspace.session.cookies.get({ url })).length, 0);
  await workspace.session.cookies.set({ url, name: 'profile_marker', value: 'alpha-fixture' });
  await workspace.command({ action: 'navigate', url });
  let aWC = workspace.current().view.webContents;
  await until(
    () => aWC.executeJavaScript('window.fixtureReady===true').catch(() => false),
    'Alpha fixture page',
  );
  assert.equal(await aWC.executeJavaScript('localStorage.getItem("profile_fixture")'), null);
  await aWC.executeJavaScript('localStorage.setItem("profile_fixture","alpha")');
  const aSession = workspace.session;
  assert.notEqual(aSession, legacySession);
  await workspace.command({
    action: 'shortcut-save',
    profileId: a,
    entry: { name: 'Только Альфа', url, icon: 'code' },
  });
  await workspace.command({ action: 'profile-dialog', profileId: a, open: true });
  assert(workspace.profileDialog);
  await workspace.command({ action: 'profile-dialog', profileId: a, open: false });
  await workspace.command({ action: 'profile-show', profileId: a });
  await until(() => aWC.isDestroyed(), 'Alpha renderer closes on lock');
  const createB = await workspace.command({
    action: 'profile-create',
    nick: 'Бета',
    password: 'fixture-pass-beta',
  });
  assert(createB.ok);
  const b = createB.profile.id;
  assert.notEqual(workspace.session, aSession);
  assert.equal((await workspace.session.cookies.get({ url })).length, 0);
  assert.equal(workspace.shortcuts.list().length, 0);
  for (const action of ['shortcut-editor', 'shortcut-save', 'shortcut-remove', 'shortcut-move', 'shortcut-open']) {
    assert.equal((await workspace.command({ action, profileId: a, open: true, entry: { name: 'Не Бета', url, icon: 'code' } })).ok, false, 'Old shortcut owner must be rejected: ' + action);
  }
  assert.equal((await workspace.command({ action: 'shortcut-editor', open: true })).ok, false, 'Missing shortcut owner must be rejected');
  assert.equal(workspace.editorOpen, false);
  assert.equal(workspace.shortcuts.list().length, 0);
  assert.equal(
    (
      await workspace.command({
        action: 'profile-update',
        profileId: a,
        nick: 'Cross-account change',
      })
    ).ok,
    false,
  );
  assert.equal(workspace.profileActive.nick, 'Бета');
  await workspace.command({ action: 'profile-show', profileId: b });
  assert.equal(
    (await workspace.command({ action: 'profile-enter', id: a, password: 'wrong' })).ok,
    false,
  );
  assert.equal(workspace.tabs.length, 0);
  assert(
    (await workspace.command({ action: 'profile-enter', id: a, password: 'fixture-pass-alpha' }))
      .ok,
  );
  assert.equal(workspace.session, aSession);
  assert.equal((await aSession.cookies.get({ url }))[0].value, 'alpha-fixture');
  assert.equal(workspace.shortcuts.list()[0].name, 'Только Альфа');
  aWC = workspace.current().view.webContents;
  await until(
    () => aWC.executeJavaScript('window.fixtureReady===true').catch(() => false),
    'Restored Alpha',
  );
  assert.equal(await aWC.executeJavaScript('localStorage.getItem("profile_fixture")'), 'alpha');
  assert.equal(
    aSession.listenerCount('will-download'),
    1,
    'Repeated unlock must not accumulate session listeners',
  );
  assert.equal((await legacySession.cookies.get({ url }))[0].value, 'legacy-fixture');
  await workspace.command({
    action: 'profile-update',
    profileId: a,
    nick: 'Альфа новая',
    settings: { home: url + '?secret=local-fixture', lockOnHide: true },
  });
  assert.equal(workspace.session, aSession);
  assert(!JSON.stringify(workspace.state().profiles.items).includes('secret='));
  await workspace.command({ action: 'dock' });
  assert.equal(workspace.mode, 'window');
  await workspace.command({ action: 'home' });
  assert.equal(
    workspace.state().profiles.screen,
    'chooser',
    'Lock on return to chats also applies to detached window',
  );
  await until(() => aWC.isDestroyed(), 'Detached lock closes Alpha renderer');
  assert(
    (await workspace.command({ action: 'profile-enter', id: a, password: 'fixture-pass-alpha' }))
      .ok,
  );
  const protectedWC = workspace.current().view.webContents;
  workspace.close();
  await until(() => protectedWC.isDestroyed(), 'Closing frees protected renderer');
  workspace.open();
  await workspace.chromeReady;
  assert.equal(workspace.state().profiles.screen, 'chooser');
  assert.equal(workspace.profileSnapshots.size, 0, 'A full close does not revive stale snapshots');
  const previousChrome = workspace.chrome.webContents;
  previousChrome.close({ waitForBeforeUnload: false });
  await until(() => previousChrome.isDestroyed(), 'Closed chrome');
  workspace.open();
  await workspace.chromeReady;
  assert.notEqual(workspace.chrome.webContents, previousChrome);
  assert.equal(workspace.tabs.length, 0);
  const verify = workspace.profiles.verify.bind(workspace.profiles);
  let release;
  workspace.profiles.verify = async (...args) => {
    await new Promise((resolve) => (release = resolve));
    return verify(...args);
  };
  const delayed = workspace.command({
    action: 'profile-enter',
    id: a,
    password: 'fixture-pass-alpha',
  });
  await until(() => !!release, 'Delayed unlock gate');
  workspace.close();
  release();
  assert.equal((await delayed).ok, false);
  assert.equal(workspace.tabs.length, 0);
  assert.equal(workspace.profileActive, null);
  assert(
    BrowserWindow.getAllWindows().every((win) => !win.isVisible()),
    'No test windows may become visible',
  );
  console.log(
    'PASS real hidden Electron profiles: preserved legacy cookies/shortcuts, distinct cookies/localStorage, unlock/password gates, main-frame chrome only, no preload, stable session, lock-on-hide, old renderer teardown, stale unlock/chrome recovery and closed snapshot cleanup.',
  );
})().then(
  () => finish(0),
  (error) => {
    console.error(error);
    finish(1);
  },
);
async function finish(code) {
  try {
    workspace?.close();
    if (host && !host.isDestroyed()) host.destroy();
    await new Promise((resolve) => server.close(resolve));
  } catch (_) {}
  app.exit(code);
}
