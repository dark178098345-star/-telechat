'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { MAX_TABS, normalizeURL, safePage, safeFrame } = require('./policy');
const { ShortcutStore, MAX_SHORTCUTS } = require('./shortcuts');
const { FaviconCache } = require('./favicons');
const { ProfileStore, MAX_PROFILES } = require('./profiles');
const { PagePermissions } = require('./page-permissions');
const { SiteDownloads } = require('./downloads');
const { SiteHistory } = require('./history');
const { showPageMenu } = require('./context-menu');

class SitesWorkspace {
  constructor(electron, getMainWindow = () => null) {
    this.e = electron; this.getMainWindow = getMainWindow;
    this.window = null; this.host = null; this.chrome = null; this.mode = 'hidden';
    this.tabs = []; this.active = 0; this.nextId = 0; this.notice = ''; this.mark = '';
    this.editorOpen = false; this.alwaysOnTop = false; this.profileDialog = false;
    this.userData = electron.app ? electron.app.getPath('userData') : null;
    this.profiles = new ProfileStore(this.userData ? path.join(this.userData, 'sites-profiles-v1.json') : null);
    this.profileActive = null; this.profileEpoch = 0; this.profileJob = null; this.profileBusy = false; this.pendingURL = '';
    this.profileSnapshots = new Map(); this.profileSessions = new Map();
    this.downloadPanel = false; this.toolsMenu = false; this.historyPanel = false; this.history = new SiteHistory(); this.histories = new Map();
    this.pagePermissions = new PagePermissions(wc => this.activePage(wc, this.profileActive?.id, true));
    this.downloads = new SiteDownloads(electron, (wc, owner) => this.activePage(wc, owner), () => this.publish(), message => this.tell(message));
    this.shortcuts = new ShortcutStore(); this.favicons = new FaviconCache();
    this.resizeHost = () => this.layout();
    this.chromeURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
    const trusted = event => {
      const wc = this.chrome?.webContents;
      return !!wc && !wc.isDestroyed() && event.sender === wc && event.senderFrame === wc.mainFrame && event.senderFrame.url === this.chromeURL;
    };
    electron.ipcMain.handle('exstra-sites:state', async event => { if (!trusted(event)) return null; await this.profiles.load(); return trusted(event) ? this.state() : null; });
    electron.ipcMain.handle('exstra-sites:command', (event, payload) => trusted(event) ? this.command(payload) : { ok: false });
  }
  get session() {
    const id = this.profileActive?.id;
    if (!id) throw Error('Сначала войди в профиль сайтов.');
    if (this.profileSessions.has(id)) return this.profileSessions.get(id);
    const s = this.e.session.fromPartition(this.profiles.paths(id, this.userData || '').partition);
    s.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => this.pagePermissions.allow(wc, permission, requestingOrigin, details));
    s.setPermissionRequestHandler((wc, permission, callback, details) => callback(this.pagePermissions.allow(wc, permission, details?.requestingUrl, details)));
    s.setDevicePermissionHandler(() => false);
    s.setDisplayMediaRequestHandler((_request, callback) => callback({}));
    s.on('will-download', (event, item, wc) => this.downloads.accept(event, item, wc, id));
    // Never inherit chat cookies, permissions, preloads or filesystem access.
    this.profileSessions.set(id, s);
    return s;
  }
  open(input = '', mode = 'embedded') {
    const url = input ? normalizeURL(input) : '';
    if (input && !url) return { ok: false, error: 'Нужна обычная ссылка http:// или https://' };
    if (!this.chrome?.webContents || this.chrome.webContents.isDestroyed()) {
      if (this.chrome) { this.lockProfile(false); this.removeFromHost(); }
      this.createChrome();
    }
    if (mode === 'window') this.detach(); else if (!this.embed()) return { ok: false, error: 'Главное окно недоступно' };
    if (this.profileActive) { if (!this.tabs.length || url) this.add(url); }
    else if (url) this.pendingURL = url;
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
    this.chromeReady = Promise.all([wc.loadFile(path.join(__dirname, 'index.html')), this.profiles.load()]).then(() => {this.publish();}).catch(() => {});
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
    this.mode = mode; this.mark = ''; this.publish();
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
    if (this.window && !this.window.isDestroyed()) { if (this.host !== this.window) this.rehost(this.window, 'window'); this.window.show(); this.window.focus(); return; }
    const win = new this.e.BrowserWindow({
      width: this.alwaysOnTop ? 540 : 1220, height: this.alwaysOnTop ? 720 : 820, minWidth: 420, minHeight: 420, show: false,
      title: 'ExstraChat · Окно сайтов', backgroundColor: '#101116', autoHideMenuBar: true, alwaysOnTop: this.alwaysOnTop,
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
    if (!this.profileActive || this.profileDialog || this.editorOpen || this.downloadPanel || this.toolsMenu || this.historyPanel || !this.host || !this.chrome?.webContents || this.chrome.webContents.isDestroyed()) return;
    this.chrome.webContents.focus(); this.chrome.webContents.send('exstra-sites:focus-address');
  }
  focusCurrent() {
    if (!this.profileActive || this.profileDialog || this.editorOpen || this.downloadPanel || this.toolsMenu || this.historyPanel) { const wc = this.chrome?.webContents; if (wc && !wc.isDestroyed()) wc.focus(); return; }
    const tab = this.current();
    if (this.host && tab?.url && !tab.error && tab.view?.webContents && !tab.view.webContents.isDestroyed()) tab.view.webContents.focus();
    else this.focusAddress();
  }
  hide() {
    this.downloadPanel = false; this.toolsMenu = false; this.historyPanel = false;
    if (this.profileActive?.settings.lockOnHide) this.lockProfile();
    else if (this.profileBusy && !this.profileActive) { this.profileEpoch++; this.profileJob = null; this.profileBusy = false; this.pendingURL = ''; }
    if (this.mode === 'window') { this.getMainWindow()?.webContents.focus(); return; }
    const previous = this.host;
    this.removeFromHost(); this.mode = 'hidden'; this.publish();
    if (previous && !previous.isDestroyed()) previous.webContents.focus();
  }
  dispose() {
    this.downloads.cancel(); this.history.flush(); this.downloadPanel = false; this.toolsMenu = false; this.historyPanel = false;
    this.profileEpoch++; this.profileJob = null; this.profileBusy = false; this.profileActive = null; this.profileDialog = false; this.pendingURL = '';
    this.profileSnapshots.clear();
    this.favicons.pause();
    this.removeFromHost();
    for (const tab of this.tabs) this.destroyView(tab);
    if (this.chrome?.webContents && !this.chrome.webContents.isDestroyed()) this.chrome.webContents.close({ waitForBeforeUnload: false });
    this.chrome = null; this.tabs = []; this.active = 0; this.mark = ''; this.mode = 'hidden'; this.editorOpen = false; this.alwaysOnTop = false;
    this.shortcuts = new ShortcutStore(); this.favicons = new FaviconCache();
  }
  current() { return this.tabs.find(tab => tab.id === this.active); }
  activePage(wc, owner, focused = false) {
    const tab = this.current(), host = this.host;
    return !!owner && this.profileActive?.id === owner && this.mode !== 'hidden' && !this.profileBusy && !this.profileDialog && !this.editorOpen && !this.downloadPanel && !this.toolsMenu && !this.historyPanel
      && !!host && !host.isDestroyed() && (host.isVisible?.() ?? false) && !host.isMinimized() && (!focused || (host.isFocused?.() ?? false))
      && !!wc && !wc.isDestroyed() && tab?.view?.webContents === wc && !!safePage(wc.mainFrame?.url);
  }
  state() {
    return { active: this.active, max: MAX_TABS, notice: this.notice, mode: this.mode, alwaysOnTop: this.mode === 'window' && this.alwaysOnTop,
      downloads: this.downloads.list(this.profileActive?.id), downloadPanel: this.downloadPanel,
      toolsMenu:this.toolsMenu, historyPanel:this.historyPanel, history:this.profileActive && this.historyPanel ? this.history.list() : [], historyError:this.profileActive ? this.history.error : '',
      profiles: { ready: this.profiles.loaded, error: this.profiles.error, fatal: this.profiles.fatal, screen: this.profileActive ? 'browser' : 'chooser', busy: this.profileBusy, max: MAX_PROFILES, active: this.profileActive ? { ...this.profileActive, settings: { ...this.profileActive.settings } } : null, items: this.profileActive ? [] : this.profiles.list() },
      shortcuts: this.profileActive ? this.shortcuts.list().map(item=>({...item,favicon:item.icon==='auto'?this.favicons.get(item.url):''})) : [], shortcutsReady: !!this.profileActive && this.shortcuts.loaded, shortcutsError: this.profileActive ? this.shortcuts.error : '', shortcutsMax: MAX_SHORTCUTS,
      tabs: this.tabs.map(tab => ({ id: tab.id, url: tab.url, title: tab.title, loading: tab.loading,
        error: tab.error, sleeping: !tab.view && !!tab.url, popup: tab.popup ? new URL(tab.popup).hostname : '',
        canBack: !!tab.view?.webContents?.navigationHistory.canGoBack(), canForward: !!tab.view?.webContents?.navigationHistory.canGoForward(),
        audible: !!tab.view?.webContents?.isCurrentlyAudible(), muted: !!tab.view?.webContents?.isAudioMuted(), background: !!tab.background })) };
  }
  publish() {
    if (!this.chrome?.webContents || this.chrome.webContents.isDestroyed()) return;
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
    if (!this.profileActive) return;
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
    this.publish();
    this.focusCurrent();
  }
  attach(tab) {
    const profile = this.profileActive?.id, epoch = this.profileEpoch, icons = this.favicons, history = this.history;
    const view = new this.e.WebContentsView({ webPreferences: {
      session: this.session, nodeIntegration: false, nodeIntegrationInSubFrames: false, contextIsolation: true,
      sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      navigateOnDragDrop: false, safeDialogs: true, devTools: false, backgroundThrottling: !tab.background, plugins: false
    } });
    tab.view = view; view.setBackgroundColor('#ffffff'); view.setBorderRadius(14);
    this.host?.contentView.addChildView(view);
    const wc = view.webContents;
    const input = (_event, data) => this.pagePermissions.input(wc, data);
    wc.on('input-event', input); wc.on('before-mouse-event', input); wc.on('before-input-event', input);
    wc.on('blur', () => this.pagePermissions.clear(wc));
    wc.on('did-start-navigation', (_event, url, _inPlace, main) => { if (main) this.pagePermissions.clear(wc); });
    wc.on('context-menu', (event, params) => { event.preventDefault?.(); showPageMenu(this.e, this, tab, wc, params); });
    const valid = () => tab.view === view && !wc.isDestroyed() && this.profileActive?.id === profile && this.profileEpoch === epoch;
    const changed = () => { if (valid()) this.publish(); };
    wc.setAudioMuted(!!tab.muted);
    wc.setWindowOpenHandler(({ url }) => {
      if (valid() && safePage(url)) { tab.popup = normalizeURL(url); this.tell('Сайт предлагает открыть ещё одну страницу. Подтверди кнопкой рядом с адресом.'); }
      return { action: 'deny' };
    });
    wc.on('will-navigate', (event, url) => { if (!valid() || !safePage(event.url || url)) { event.preventDefault(); if (valid()) this.tell('Этот тип ссылки здесь не открывается.'); } });
    wc.on('will-redirect', (event, url) => { if (!valid() || !safePage(event.url || url)) { event.preventDefault(); if (valid()) this.tell('Переход на небезопасный тип ссылки заблокирован.'); } });
    wc.on('will-frame-navigate', event => { if (!safeFrame(event.url)) event.preventDefault(); });
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.on('login', (event, _details, _auth, callback) => { event.preventDefault(); callback(); if (valid()) this.tell('Для этого способа входа открой сайт в обычном браузере.'); });
    wc.on('did-start-loading', () => { tab.loading = true; changed(); });
    wc.on('did-stop-loading', () => { tab.loading = false; if (valid() && !tab.error) history.visit(tab.url, tab.title); changed(); });
    wc.on('did-navigate', (_event, url) => { if (safePage(url)) tab.url = url; tab.error = ''; if (valid()) history.visit(tab.url, tab.title); changed(); });
    wc.on('did-navigate-in-page', (_event, url, main) => { if (main && safePage(url)) { tab.url = url; if (valid()) history.visit(tab.url, tab.title); } changed(); });
    wc.on('page-title-updated', (_event, title) => { tab.title = String(title || new URL(tab.url).hostname).slice(0, 120); if (valid() && !tab.loading) history.visit(tab.url, tab.title); changed(); });
    wc.on('page-favicon-updated', (_event, urls) => { if (valid()) icons.observe(tab.url,urls); });
    wc.on('media-started-playing', changed); wc.on('media-paused', changed);
    wc.on('did-fail-load', (_event, code, _description, _url, main) => {
      if (!main || code === -3) return;
      tab.loading = false; tab.error = [-200, -201, -202, -203].includes(code) ? 'Не удалось проверить безопасность соединения.' : 'Не удалось открыть страницу. Проверь адрес и подключение.'; changed();
    });
    wc.on('render-process-gone', () => { tab.loading = false; tab.error = 'Страница остановилась. Нажми «Повторить», чтобы открыть её заново.'; changed(); });
    wc.on('before-input-event', (event, input) => { if (valid()) this.shortcut(event, input); });
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
      if (item.view?.webContents && !item.view.webContents.isDestroyed()) item.view.webContents.setBackgroundThrottling(!next);
    }
    this.publish();
  }
  layout() {
    if (!this.host || this.host.isDestroyed() || !this.chrome?.webContents) return;
    const [width, height] = this.host.getContentSize();
    const shown = (this.host.isVisible?.() ?? true) && !this.host.isMinimized();
    this.chrome.setVisible(shown); this.chrome.setBounds({ x: 0, y: 0, width, height });
    for (const tab of this.tabs) if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      const visible = shown && !!this.profileActive && !this.profileDialog && !this.editorOpen && !this.downloadPanel && !this.toolsMenu && !this.historyPanel && tab.id === this.active && !tab.error && !!tab.url;
      tab.view.setVisible(visible);
      if (visible) tab.view.setBounds({ x: 10, y: 108, width: Math.max(1, width - 20), height: Math.max(1, height - 146) });
    }
  }
  destroyView(tab) {
    const view = tab.view; tab.view = null; tab.loading = false;
    if (!view) return;
    this.pagePermissions.clear(view.webContents);
    if (this.host && !this.host.isDestroyed()) this.host.contentView.removeChildView(view);
    if (view.webContents && !view.webContents.isDestroyed()) view.webContents.close({ waitForBeforeUnload: false });
  }
  closeTab(id) {
    const index = this.tabs.findIndex(tab => tab.id === id); if (index < 0) return;
    this.destroyView(this.tabs[index]); this.tabs.splice(index, 1);
    if (!this.tabs.length) this.add();
    else if (this.active === id) this.select(this.tabs[Math.min(index, this.tabs.length - 1)].id);
    this.publish();
  }
  shortcut(event, input) {
    if (input.type !== 'keyDown' || this.editorOpen || this.profileDialog || !this.profileActive) return;
    const key = String(input.key).toLowerCase(), ctrl = input.control || input.meta;
    let command;
    if (ctrl && key === 'l') command = 'focus';
    if (ctrl && key === 't') command = 'new';
    if (ctrl && key === 'j') { event.preventDefault(); this.command({ action:'downloads-panel', open:!this.downloadPanel, profileId:this.profileActive.id }); return; }
    if (ctrl && key === 'h') { event.preventDefault(); this.command({ action:'history-panel', open:!this.historyPanel, profileId:this.profileActive.id }); return; }
    if (ctrl && key === 'w') command = 'close';
    if (ctrl && key === 'tab') command = input.shift ? 'previous-tab' : 'next-tab';
    if (key === 'f5' || ctrl && key === 'r') command = 'reload';
    if (input.alt && key === 'arrowleft') command = 'back';
    if (input.alt && key === 'arrowright') command = 'forward';
    if (!command) return;
    event.preventDefault(); this.command({ action: command });
  }
  async command(payload) {
    if (!this.chrome?.webContents || this.chrome.webContents.isDestroyed()) return { ok: false };
    const action = payload?.action, tab = this.current();
    if (typeof action !== 'string') return { ok: false };
    if (action.startsWith('profile-')) return this.profileCommand(payload);
    if (action === 'home') { this.hide(); return { ok: true }; }
    if (action === 'dock') { if (this.mode === 'window') this.embed(); else this.detach(); return { ok: true }; }
    if (['sites-tools','history-panel','downloads-panel'].includes(action)) {
      if (!this.profileActive || payload.profileId !== this.profileActive.id || this.profileBusy || this.profileDialog || this.editorOpen) return { ok:false, error:'Профиль изменился или открыто другое окно.' };
      this.toolsMenu = action === 'sites-tools' && payload.open === true;
      this.historyPanel = action === 'history-panel' && payload.open === true;
      this.downloadPanel = action === 'downloads-panel' && payload.open === true;
      this.publish(); this.focusCurrent(); return { ok:true };
    }
    if (action === 'history-clear' || action === 'history-open') {
      if (!this.profileActive || payload.profileId !== this.profileActive.id) return { ok:false, error:'Профиль изменился.' };
      if (action === 'history-clear') return this.history.clear();
      const row = this.history.list().find(item => item.id === payload.id);
      if (!row) return { ok:false, error:'Страница не найдена.' };
      this.historyPanel = false; this.toolsMenu = false; this.add(row.url); return { ok:true };
    }
    if (action.startsWith('download-')) {
      if (!this.profileActive || payload.profileId !== this.profileActive.id) return { ok:false, error:'Профиль изменился.' };
      return this.downloads.action(this.profileActive.id, payload);
    }
    if (!this.profileActive || !this.tabs.length || this.profileBusy) return { ok: false, error: 'Сначала войди в профиль сайтов.' };
    if (action.startsWith('shortcut-') && payload.profileId !== this.profileActive.id) return { ok: false, error: 'Профиль изменился. Открой редактор заново.' };
    const profile = this.profileActive.id, epoch = this.profileEpoch, shortcuts = this.shortcuts, icons = this.favicons;
    const current = () => this.profileActive?.id === profile && this.profileEpoch === epoch && this.shortcuts === shortcuts;
    if (action === 'background' && tab?.url && tab.view?.webContents && !tab.view.webContents.isDestroyed()) this.setBackground(tab, !tab.background);
    else if (action === 'pin') {
      if (this.mode === 'window' && this.window && !this.window.isDestroyed()) { this.alwaysOnTop = !this.alwaysOnTop; this.window.setAlwaysOnTop(this.alwaysOnTop); }
      else { this.alwaysOnTop = true; this.detach(); }
      this.publish();
    }
    else if (action === 'shortcut-editor') { this.toolsMenu = false; this.historyPanel = false; this.downloadPanel = false; this.editorOpen = payload.open === true; this.publish(); this.layout(); if (!this.editorOpen) this.focusCurrent(); }
    else if (action === 'shortcut-open') {
      await shortcuts.load();
      if (!current()) return { ok: false, error: 'Профиль изменился.' };
      const saved = shortcuts.list().find(item => item.id === payload.id);
      if (!saved) return { ok: false, error: 'Ярлык не найден.' };
      if (payload.newTab === true) this.add(saved.url); else this.navigate(tab, saved.url);
    }
    else if (['shortcut-save','shortcut-remove','shortcut-move'].includes(action)) {
      const result = await shortcuts.mutate(action.slice(9), payload); if (!current()) return { ok: false, error: 'Профиль изменился.' }; this.publish(); if(result.ok)icons.ensure(shortcuts.list()); return result;
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
    else if (action === 'external' && safePage(tab?.url)) this.e.shell.openExternal(tab.url);
    else if (action === 'popup' && tab?.popup) { const url = tab.popup; tab.popup = ''; this.notice = ''; this.add(url); }
    else if (action === 'dismiss') { this.notice = ''; if (tab) tab.popup = ''; this.publish(); }
    else if (action === 'mute' && tab?.view) { const wc = tab.view.webContents; tab.muted = !wc.isAudioMuted(); wc.setAudioMuted(tab.muted); this.publish(); }
    else if (action === 'next-tab' || action === 'previous-tab') { const index = this.tabs.findIndex(t => t.id === this.active), step = action === 'next-tab' ? 1 : -1; this.select(this.tabs[(index + step + this.tabs.length) % this.tabs.length].id); }
    else return { ok: false };
    return { ok: true };
  }
  lockProfile(remember = true) {
    this.downloads.cancel(this.profileActive?.id); this.history.flush(); this.downloadPanel = false; this.toolsMenu = false; this.historyPanel = false;
    if (this.profileActive && remember) this.profileSnapshots.set(this.profileActive.id, { active: this.tabs.findIndex(tab => tab.id === this.active), tabs: this.tabs.map(tab => ({ url: safePage(tab.url) ? tab.url : '', title: tab.title, muted: tab.view?.webContents?.isAudioMuted() ?? !!tab.muted })) });
    this.profileEpoch++; this.profileJob = null; this.profileBusy = false; this.profileDialog = false; this.editorOpen = false;
    this.favicons.pause(); for (const tab of this.tabs) this.destroyView(tab);
    this.tabs = []; this.active = 0; this.profileActive = null; this.notice = ''; this.pendingURL = '';
    this.shortcuts = new ShortcutStore(); this.favicons = new FaviconCache(); this.publish(); this.focusCurrent();
  }
  async activateProfile(profile, job) {
    const paths = this.profiles.paths(profile.id, this.userData || ''), shortcuts = new ShortcutStore(this.userData ? paths.shortcuts : null);
    let history = this.histories.get(profile.id); if (!history) history = new SiteHistory(this.userData ? paths.history : null, () => { if (this.history === history && this.profileActive?.id === profile.id && this.historyPanel) this.publish(); });
    let icons; icons = new FaviconCache({ file: this.userData ? paths.favicons : null, net: this.e.net, onChange: () => { if (this.favicons === icons && this.profileActive?.id === profile.id) this.publish(); } });
    await Promise.all([shortcuts.load(), icons.load(), history.load()]);
    if (this.profileJob !== job || this.profileEpoch !== job.epoch || this.chrome !== job.chrome || !this.chrome?.webContents || this.chrome.webContents.isDestroyed() || this.mode === 'hidden') { icons.pause(); return false; }
    this.profileEpoch++; this.profileActive = this.profiles.get(profile.id); this.profileDialog = false; this.editorOpen = false;
    this.shortcuts = shortcuts; this.favicons = icons; this.history = history; this.histories.set(profile.id, history); this.tabs = []; this.active = 0; this.notice = shortcuts.error || '';
    const snapshot = this.profileSnapshots.get(profile.id), pending = this.pendingURL; this.pendingURL = '';
    this.profileSnapshots.delete(profile.id);
    if (snapshot?.tabs.length) {
      this.tabs = snapshot.tabs.slice(0, MAX_TABS).map(saved => ({ ...saved, id: ++this.nextId, loading: false, error: '', popup: '', view: null, background: false }));
      this.active = this.tabs[Math.max(0, Math.min(this.tabs.length - 1, snapshot.active))].id;
    } else this.add(pending || profile.settings.home || '');
    if (pending && snapshot?.tabs.length) { if (this.tabs.length < MAX_TABS) this.add(pending); else this.navigate(this.current(), pending); }
    else if (this.current()?.url && !this.current().view) this.navigate(this.current(), this.current().url);
    icons.ensure(shortcuts.list()); this.publish(); this.focusCurrent(); return true;
  }
  async profileCommand(payload) {
    const action = payload.action;
    if (action === 'profile-dialog') { if (!this.profileActive || payload.profileId !== this.profileActive.id) return { ok: false, error: 'Профиль изменился.' }; this.downloadPanel = false; this.toolsMenu = false; this.historyPanel = false; this.profileDialog = payload.open === true; this.publish(); this.layout(); if (!this.profileDialog) this.focusCurrent(); return { ok: true }; }
    if (this.profileBusy) return { ok: false, error: 'Дождись завершения предыдущего действия.' };
    if (action === 'profile-show') { if (payload.profileId && payload.profileId !== this.profileActive?.id) return { ok: false, error: 'Профиль изменился.' }; this.lockProfile(); return { ok: true }; }
    if (!['profile-create', 'profile-enter', 'profile-update', 'profile-password'].includes(action)) return { ok: false };
    if (['profile-create', 'profile-enter'].includes(action) && this.profileActive) return { ok: false, error: 'Сначала открой список профилей.' };
    if (['profile-update', 'profile-password'].includes(action) && !this.profileActive) return { ok: false, error: 'Сначала войди в профиль.' };
    if (['profile-update', 'profile-password'].includes(action) && payload.profileId !== this.profileActive.id) return { ok: false, error: 'Профиль изменился. Открой настройки заново.' };
    const job = { epoch: this.profileEpoch, chrome: this.chrome, profile: this.profileActive?.id }; this.profileJob = job; this.profileBusy = true; this.publish();
    try {
      let result;
      if (action === 'profile-create') result = await this.profiles.create(payload);
      else if (action === 'profile-enter') result = await this.profiles.verify(payload.id, payload.password);
      else if (action === 'profile-update') result = await this.profiles.update(job.profile, payload);
      else result = await this.profiles.changePassword(job.profile, payload.currentPassword, payload.newPassword);
      if (this.profileJob !== job || this.profileEpoch !== job.epoch || this.chrome !== job.chrome) return { ok: false, error: 'Окно или профиль изменились. Проверь список профилей.' };
      if (!result.ok) return result;
      if (action === 'profile-create' || action === 'profile-enter') { if (!await this.activateProfile(result.profile, job)) return { ok: false, error: 'Окно закрыто. Профиль сохранён в списке.' }; }
      else { this.profileActive = result.profile; this.publish(); }
      return { ok: true, profile: result.profile };
    } catch (_) { return { ok: false, error: 'Не удалось выполнить действие с профилем. Попробуй ещё раз.' }; }
    finally { if (this.profileJob === job) { this.profileJob = null; this.profileBusy = false; this.publish(); } }
  }
  close() { if (this.window && !this.window.isDestroyed()) this.window.close(); else this.dispose(); }
}
module.exports = { SitesWorkspace };
