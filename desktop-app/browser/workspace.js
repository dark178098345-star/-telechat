'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { MAX_TABS, normalizeURL, safePage, safeFrame } = require('./policy');
const { ShortcutStore, MAX_SHORTCUTS } = require('./shortcuts');
const { FaviconCache } = require('./favicons');

class SitesWorkspace {
  constructor(electron, getMainWindow = () => null) {
    this.e = electron; this.getMainWindow = getMainWindow;
    this.window = null; this.host = null; this.chrome = null; this.mode = 'hidden';
    this.tabs = []; this.active = 0; this.nextId = 0; this.notice = ''; this.mark = '';
    this.editorOpen = false; this.alwaysOnTop = false;
    this.shortcuts = new ShortcutStore(electron.app ? path.join(electron.app.getPath('userData'), 'sites-shortcuts.json') : null);
    this.favicons = new FaviconCache({file:electron.app ? path.join(electron.app.getPath('userData'),'sites-favicons-v1.json') : null,net:electron.net,onChange:()=>this.publish()});
    this.resizeHost = () => this.layout();
    this.chromeURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
    const trusted = event => {
      const wc = this.chrome?.webContents;
      return !!wc && !wc.isDestroyed() && event.sender === wc && event.senderFrame === wc.mainFrame && event.senderFrame.url === this.chromeURL;
    };
    electron.ipcMain.handle('exstra-sites:state', async event => { if (!trusted(event)) return null; await Promise.all([this.shortcuts.load(),this.favicons.load()]); return trusted(event) ? this.state() : null; });
    electron.ipcMain.handle('exstra-sites:command', (event, payload) => trusted(event) ? this.command(payload) : { ok: false });
  }
  get session() {
    if (this._session) return this._session;
    const s = this.e.session.fromPartition('persist:exstra-sites-v202');
    s.setPermissionCheckHandler(() => false);
    s.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    s.setDevicePermissionHandler(() => false);
    s.setDisplayMediaRequestHandler((_request, callback) => callback({}));
    s.on('will-download', event => { event.preventDefault(); this.tell('Загрузки здесь отключены. Используй кнопку «Открыть снаружи».'); });
    // Never inherit chat cookies, permissions, preloads or filesystem access.
    this._session = s;
    return s;
  }
  open(input = '', mode = 'embedded') {
    const url = input ? normalizeURL(input) : '';
    if (input && !url) return { ok: false, error: 'Нужна обычная ссылка http:// или https://' };
    if (!this.chrome || this.chrome.webContents.isDestroyed()) this.createChrome();
    if (mode === 'window') this.detach(); else if (!this.embed()) return { ok: false, error: 'Главное окно недоступно' };
    if (!this.tabs.length || url) this.add(url);
    const host = this.host;
    this.chromeReady.then(() => { if (this.host === host && this.mode !== 'hidden') this.focusCurrent(); });
    return { ok: true };
  }
  createChrome() {
    this.tabs = []; this.active = 0; this.notice = ''; this.mark = '';
    this.chrome = new this.e.WebContentsView({ webPreferences: {
      preload: path.join(__dirname, 'preload.js'), partition: 'exstra-sites-chrome-v202',
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false, devTools: false
    } });
    const wc = this.chrome.webContents;
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    for (const name of ['will-navigate', 'will-redirect']) wc.on(name, event => event.preventDefault());
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.on('before-input-event', (event, input) => this.shortcut(event, input));
    this.chromeReady = Promise.all([wc.loadFile(path.join(__dirname, 'index.html')), this.shortcuts.load(),this.favicons.load()]).then(() => {this.publish();this.favicons.ensure(this.shortcuts.list());}).catch(() => {});
  }
  removeFromHost() {
    if (this.host) {
      for (const name of ['resize','show','hide','minimize','restore']) this.host.removeListener(name, this.resizeHost);
      for (const view of [this.chrome, ...this.tabs.map(tab => tab.view)].filter(Boolean)) {
        view.setVisible(false);
        if (!this.host.isDestroyed()) this.host.contentView.removeChildView(view);
      }
    }
    this.host = null;
  }
  rehost(host, mode) {
    if (this.host !== host) {
      this.removeFromHost(); this.host = host;
      host.contentView.addChildView(this.chrome);
      for (const tab of this.tabs) if (tab.view) host.contentView.addChildView(tab.view);
      for (const name of ['resize','show','hide','minimize','restore']) host.on(name, this.resizeHost);
    }
    this.mode = mode; this.mark = ''; this.publish(); this.layout();
  }
  embed() {
    const main = this.getMainWindow(); if (!main || main.isDestroyed()) return false;
    const former = this.window; this.window = null;
    this.alwaysOnTop = false;
    this.rehost(main, 'embedded');
    if (former && !former.isDestroyed()) former.close();
    if (main.isMinimized()) main.restore();
    main.show(); main.focus();
    this.focusCurrent();
    return true;
  }
  detach() {
    if (this.window && !this.window.isDestroyed()) { this.window.show(); this.window.focus(); return; }
    const win = new this.e.BrowserWindow({
      width: this.alwaysOnTop ? 540 : 1220, height: this.alwaysOnTop ? 720 : 820, minWidth: 420, minHeight: 420, show: false,
      title: 'ExstraChat · Окно сайтов', backgroundColor: '#101116', autoHideMenuBar: true,
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      titleBarStyle: 'hidden', titleBarOverlay: { color: '#15161c', symbolColor: '#c3c5d0', height: 44 },
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false, devTools: false }
    });
    this.window = win;
    win.setAlwaysOnTop(this.alwaysOnTop);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    for (const name of ['will-navigate', 'will-redirect']) win.webContents.on(name, event => event.preventDefault());
    win.on('closed', () => { if (this.window === win) { this.window = null; this.dispose(); } });
    win.on('always-on-top-changed', (_event, value) => { if (this.window === win) { this.alwaysOnTop = !!value; this.publish(); } });
    this.rehost(win, 'window');
    this.chromeReady.then(() => { if (this.window === win && !win.isDestroyed()) { win.show(); win.focus(); this.focusCurrent(); } });
  }
  focusAddress() {
    if (this.editorOpen || !this.host || !this.chrome || this.chrome.webContents.isDestroyed()) return;
    this.chrome.webContents.focus(); this.chrome.webContents.send('exstra-sites:focus-address');
  }
  focusCurrent() {
    if (this.editorOpen) { this.chrome?.webContents.focus(); return; }
    const tab = this.current();
    if (this.host && tab?.url && !tab.error && tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.focus();
    else this.focusAddress();
  }
  hide() {
    if (this.mode === 'window') { this.getMainWindow()?.webContents.focus(); return; }
    const previous = this.host;
    this.removeFromHost(); this.mode = 'hidden'; this.publish();
    if (previous && !previous.isDestroyed()) previous.webContents.focus();
  }
  dispose() {
    this.favicons.pause();
    this.removeFromHost();
    for (const tab of this.tabs) this.destroyView(tab);
    if (this.chrome && !this.chrome.webContents.isDestroyed()) this.chrome.webContents.close({ waitForBeforeUnload: false });
    this.chrome = null; this.tabs = []; this.active = 0; this.mark = ''; this.mode = 'hidden'; this.editorOpen = false; this.alwaysOnTop = false;
  }
  current() { return this.tabs.find(tab => tab.id === this.active); }
  state() {
    return { active: this.active, max: MAX_TABS, notice: this.notice, mode: this.mode, alwaysOnTop: this.mode === 'window' && this.alwaysOnTop,
      shortcuts: this.shortcuts.list().map(item=>({...item,favicon:item.icon==='auto'?this.favicons.get(item.url):''})), shortcutsReady: this.shortcuts.loaded, shortcutsError: this.shortcuts.error, shortcutsMax: MAX_SHORTCUTS,
      tabs: this.tabs.map(tab => ({ id: tab.id, url: tab.url, title: tab.title, loading: tab.loading,
        error: tab.error, sleeping: !tab.view && !!tab.url, popup: tab.popup ? new URL(tab.popup).hostname : '',
        canBack: !!tab.view?.webContents.navigationHistory.canGoBack(), canForward: !!tab.view?.webContents.navigationHistory.canGoForward(),
        audible: !!tab.view?.webContents.isCurrentlyAudible(), muted: !!tab.view?.webContents.isAudioMuted(), background: !!tab.background })) };
  }
  publish() {
    if (!this.chrome || this.chrome.webContents.isDestroyed()) return;
    const state = this.state(), mark = JSON.stringify(state);
    if (this.mark === mark) return;
    this.mark = mark;
    this.chrome.webContents.send('exstra-sites:changed', state);
    const title = this.current()?.title;
    this.window?.setTitle((title ? title.slice(0, 80) + ' — ' : '') + 'ExstraChat · Окно сайтов');
    this.layout();
  }
  tell(message) { this.notice = message; this.publish(); }
  add(url = '') {
    if (this.tabs.length >= MAX_TABS) { this.tell('Можно открыть до восьми вкладок. Закрой одну из лишних.'); return; }
    const tab = { id: ++this.nextId, url, title: url ? new URL(url).hostname : 'Новая вкладка', loading: false, error: '', popup: '', view: null, background: false };
    this.tabs.push(tab); this.active = tab.id; this.notice = '';
    if (url) this.navigate(tab, url);
    this.publish();
    if (!url) { const id = tab.id; this.chromeReady.then(() => { if (this.active === id && this.mode !== 'hidden') this.focusAddress(); }); }
  }
  select(id) {
    const tab = this.tabs.find(item => item.id === id); if (!tab) return;
    this.active = id; this.notice = '';
    if (tab.url && !tab.view) this.navigate(tab, tab.url);
    this.layout(); this.publish();
    this.focusCurrent();
  }
  attach(tab) {
    const view = new this.e.WebContentsView({ webPreferences: {
      session: this.session, nodeIntegration: false, nodeIntegrationInSubFrames: false, contextIsolation: true,
      sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      navigateOnDragDrop: false, safeDialogs: true, devTools: false, backgroundThrottling: !tab.background, plugins: false
    } });
    tab.view = view; view.setBackgroundColor('#ffffff'); view.setBorderRadius(14);
    this.host?.contentView.addChildView(view);
    const wc = view.webContents;
    const changed = () => { if (tab.view === view && !wc.isDestroyed()) this.publish(); };
    wc.setWindowOpenHandler(({ url }) => {
      if (safePage(url)) { tab.popup = normalizeURL(url); this.tell('Сайт предлагает открыть ещё одну страницу. Подтверди кнопкой рядом с адресом.'); }
      return { action: 'deny' };
    });
    wc.on('will-navigate', (event, url) => { if (!safePage(event.url || url)) { event.preventDefault(); this.tell('Этот тип ссылки здесь не открывается.'); } });
    wc.on('will-redirect', (event, url) => { if (!safePage(event.url || url)) { event.preventDefault(); this.tell('Переход на небезопасный тип ссылки заблокирован.'); } });
    wc.on('will-frame-navigate', event => { if (!safeFrame(event.url)) event.preventDefault(); });
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.on('login', (event, _details, _auth, callback) => { event.preventDefault(); callback(); this.tell('Для этого способа входа открой сайт в обычном браузере.'); });
    wc.on('did-start-loading', () => { tab.loading = true; changed(); });
    wc.on('did-stop-loading', () => { tab.loading = false; changed(); });
    wc.on('did-navigate', (_event, url) => { if (safePage(url)) tab.url = url; tab.error = ''; changed(); });
    wc.on('did-navigate-in-page', (_event, url, main) => { if (main && safePage(url)) tab.url = url; changed(); });
    wc.on('page-title-updated', (_event, title) => { tab.title = String(title || new URL(tab.url).hostname).slice(0, 120); changed(); });
    wc.on('page-favicon-updated', (_event, urls) => this.favicons.observe(tab.url,urls));
    wc.on('media-started-playing', changed); wc.on('media-paused', changed);
    wc.on('did-fail-load', (_event, code, _description, _url, main) => {
      if (!main || code === -3) return;
      tab.loading = false; tab.error = [-200, -201, -202, -203].includes(code) ? 'Не удалось проверить безопасность соединения.' : 'Не удалось открыть страницу. Проверь адрес и подключение.'; changed();
    });
    wc.on('render-process-gone', () => { tab.loading = false; tab.error = 'Страница остановилась. Нажми «Повторить», чтобы открыть её заново.'; changed(); });
    wc.on('before-input-event', (event, input) => this.shortcut(event, input));
    return view;
  }
  navigate(tab, input) {
    const url = normalizeURL(input);
    if (!url) { this.tell('Вставь ссылку на сайт. Поддерживаются http:// и https://.'); return; }
    tab.url = url; tab.error = ''; tab.loading = true; tab.popup = ''; this.notice = '';
    const view = tab.view || this.attach(tab);
    view.webContents.loadURL(url).catch(() => {});
    this.publish();
  }
  setBackground(tab, enabled) {
    // Keep only the explicitly chosen page awake. Never inject scripts into websites.
    for (const item of this.tabs) {
      const next = item === tab && enabled;
      if (!!item.background === next) continue;
      item.background = next;
      if (item.view && !item.view.webContents.isDestroyed()) item.view.webContents.setBackgroundThrottling(!next);
    }
    this.publish();
  }
  layout() {
    if (!this.host || this.host.isDestroyed()) return;
    const [width, height] = this.host.getContentSize();
    const shown = (this.host.isVisible?.() ?? true) && !this.host.isMinimized();
    this.chrome.setVisible(shown); this.chrome.setBounds({ x: 0, y: 0, width, height });
    for (const tab of this.tabs) if (tab.view && !tab.view.webContents.isDestroyed()) {
      const visible = shown && !this.editorOpen && tab.id === this.active && !tab.error && !!tab.url;
      tab.view.setVisible(visible);
      if (visible) tab.view.setBounds({ x: 10, y: 108, width: Math.max(1, width - 20), height: Math.max(1, height - 146) });
    }
  }
  destroyView(tab) {
    const view = tab.view; tab.view = null; tab.loading = false;
    if (!view) return;
    if (this.host && !this.host.isDestroyed()) this.host.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close({ waitForBeforeUnload: false });
  }
  closeTab(id) {
    const index = this.tabs.findIndex(tab => tab.id === id); if (index < 0) return;
    this.destroyView(this.tabs[index]); this.tabs.splice(index, 1);
    if (!this.tabs.length) this.add();
    else if (this.active === id) this.select(this.tabs[Math.min(index, this.tabs.length - 1)].id);
    this.publish();
  }
  shortcut(event, input) {
    if (input.type !== 'keyDown' || this.editorOpen) return;
    const key = String(input.key).toLowerCase(), ctrl = input.control || input.meta;
    let command;
    if (ctrl && key === 'l') command = 'focus';
    if (ctrl && key === 't') command = 'new';
    if (ctrl && key === 'w') command = 'close';
    if (ctrl && key === 'tab') command = input.shift ? 'previous-tab' : 'next-tab';
    if (key === 'f5' || ctrl && key === 'r') command = 'reload';
    if (input.alt && key === 'arrowleft') command = 'back';
    if (input.alt && key === 'arrowright') command = 'forward';
    if (!command) return;
    event.preventDefault(); this.command({ action: command });
  }
  async command(payload) {
    if (!this.chrome || !this.tabs.length) return { ok: false };
    const action = payload?.action, tab = this.current();
    if (action === 'background' && tab?.url && tab.view && !tab.view.webContents.isDestroyed()) this.setBackground(tab, !tab.background);
    else if (action === 'pin') {
      if (this.mode === 'window' && this.window && !this.window.isDestroyed()) { this.alwaysOnTop = !this.alwaysOnTop; this.window.setAlwaysOnTop(this.alwaysOnTop); }
      else { this.alwaysOnTop = true; this.detach(); }
      this.publish();
    }
    else if (action === 'shortcut-editor') { this.editorOpen = payload.open === true; this.layout(); if (!this.editorOpen) this.focusCurrent(); }
    else if (action === 'shortcut-open') {
      await this.shortcuts.load();
      const saved = this.shortcuts.list().find(item => item.id === payload.id);
      if (!saved) return { ok: false, error: 'Ярлык не найден.' };
      if (payload.newTab === true) this.add(saved.url); else this.navigate(tab, saved.url);
    }
    else if (['shortcut-save','shortcut-remove','shortcut-move'].includes(action)) {
      const result = await this.shortcuts.mutate(action.slice(9), payload); this.publish(); if(result.ok)this.favicons.ensure(this.shortcuts.list()); return result;
    }
    else if (action === 'new') this.add();
    else if (action === 'select' && Number.isInteger(payload.id)) this.select(payload.id);
    else if (action === 'close') this.closeTab(Number.isInteger(payload.id) ? payload.id : this.active);
    else if (action === 'navigate' && tab) this.navigate(tab, payload.url);
    else if (action === 'reload' && tab?.url) this.navigate(tab, tab.url);
    else if (action === 'stop') { tab?.view?.webContents.stop(); if (tab) tab.loading = false; this.publish(); }
    else if (action === 'back' && tab?.view?.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack();
    else if (action === 'forward' && tab?.view?.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward();
    else if (action === 'focus') this.focusAddress();
    else if (action === 'dock') { if (this.mode === 'window') this.embed(); else this.detach(); }
    else if (action === 'home') this.hide();
    else if (action === 'external' && safePage(tab?.url)) this.e.shell.openExternal(tab.url);
    else if (action === 'popup' && tab?.popup) { const url = tab.popup; tab.popup = ''; this.notice = ''; this.add(url); }
    else if (action === 'dismiss') { this.notice = ''; if (tab) tab.popup = ''; this.publish(); }
    else if (action === 'mute' && tab?.view) { const wc = tab.view.webContents; wc.setAudioMuted(!wc.isAudioMuted()); this.publish(); }
    else if (action === 'next-tab' || action === 'previous-tab') { const index = this.tabs.findIndex(t => t.id === this.active), step = action === 'next-tab' ? 1 : -1; this.select(this.tabs[(index + step + this.tabs.length) % this.tabs.length].id); }
    else return { ok: false };
    return { ok: true };
  }
  close() { if (this.window && !this.window.isDestroyed()) this.window.close(); else this.dispose(); }
}
module.exports = { SitesWorkspace };
