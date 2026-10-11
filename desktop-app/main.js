const { app, BrowserWindow, Menu, session, shell, Tray, Notification, ipcMain, nativeImage, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { spawn } = require('node:child_process');

const TELECHAT_URL = 'https://dark178098345-star.github.io/-telechat/';
const TELECHAT_ORIGIN = new URL(TELECHAT_URL).origin;
const ALLOWED_PERMISSIONS = new Set(['media', 'notifications', 'fullscreen']);

// Retain the existing account, local music and device preferences after rebranding.
const legacyUserData = path.join(app.getPath('appData'), 'telechat-desktop');
fs.mkdirSync(legacyUserData, { recursive: true });
app.setPath('userData', legacyUserData);

let mainWindow = null;
let tray = null;
let isQuitting = false;
const recentNotifications = new Map();
let updateInProgress = false;

function isTelechatUrl(rawUrl) {
  try {
    return new URL(rawUrl).origin === TELECHAT_ORIGIN;
  } catch {
    return false;
  }
}

function showMainWindow(payload = null) {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (payload) mainWindow.webContents.send('telechat:notification-activated', payload);
}

function createTray() {
  if (tray) return;
  const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip('ExstraChat — работает в фоне');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть ExstraChat', click: () => showMainWindow() },
    { label: 'Скрыть окно', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Выйти', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
}

function sanitizeNotificationPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  return {
    id: clean(payload.id).slice(0, 160),
    title: clean(payload.title).slice(0, 80) || 'ExstraChat',
    body: clean(payload.body).slice(0, 180) || 'Новое сообщение',
    senderNick: clean(payload.senderNick).slice(0, 64),
    roomId: clean(payload.roomId).slice(0, 96),
    chatKey: clean(payload.chatKey).slice(0, 180)
  };
}

function showNativeNotification(payload) {
  const data = sanitizeNotificationPayload(payload);
  if (!data || !Notification.isSupported()) return;

  const now = Date.now();
  for (const [id, createdAt] of recentNotifications) {
    if (now - createdAt > 10 * 60 * 1000) recentNotifications.delete(id);
  }
  if (data.id && recentNotifications.has(data.id)) return;
  if (data.id) recentNotifications.set(data.id, now);
  if (mainWindow?.isVisible() && mainWindow?.isFocused()) return;

  const notification = new Notification({
    title: data.title,
    body: data.body,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    silent: false,
    timeoutType: 'default'
  });
  notification.on('click', () => showMainWindow(data));
  notification.show();
}

function isAllowedUpdateUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'https:'
      && url.hostname === 'github.com'
      && url.pathname.startsWith('/dark178098345-star/-telechat/releases/download/');
  } catch {
    return false;
  }
}

function sendUpdateStatus(sender, payload) {
  if (!sender || sender.isDestroyed()) return;
  sender.send('telechat:update-status', payload);
}

async function downloadUpdateInstaller(url, expectedSha256, version, sender) {
  const safeVersion = String(version || 'next').replace(/[^0-9A-Za-z._-]/g, '').slice(0, 32) || 'next';
  const destination = path.join(app.getPath('temp'), 'ExstraChat-update-' + safeVersion + '.exe');
  const response = await net.fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok || !response.body) throw new Error('Не удалось скачать обновление');

  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader();
  const output = fs.createWriteStream(destination, { flags: 'w' });
  const hash = crypto.createHash('sha256');
  let received = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      received += chunk.length;
      hash.update(chunk);
      if (!output.write(chunk)) await once(output, 'drain');
      const progress = total ? Math.min(99, Math.round(received / total * 100)) : 0;
      sendUpdateStatus(sender, { state: 'downloading', progress, received, total });
    }
    output.end();
    await once(output, 'finish');
  } catch (error) {
    output.destroy();
    try { fs.unlinkSync(destination); } catch {}
    throw error;
  }

  const actualSha256 = hash.digest('hex').toLowerCase();
  const expected = String(expectedSha256 || '').trim().toLowerCase();
  if (expected && actualSha256 !== expected) {
    try { fs.unlinkSync(destination); } catch {}
    throw new Error('Проверка обновления не пройдена');
  }
  return destination;
}

function launchUpdateHelper(installerPath) {
  const helperPath = path.join(__dirname, 'update-helper.js');
  const helper = spawn(process.execPath, [helperPath, installerPath, process.execPath, String(process.pid)], {
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  });
  helper.unref();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#090a13',
    title: 'ExstraChat',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const desktopUrl = new URL(TELECHAT_URL);
  desktopUrl.searchParams.set('desktop', app.getVersion());
  desktopUrl.searchParams.set('launch', String(Date.now()));
  const desktopSession = mainWindow.webContents.session;
  Promise.all([
    desktopSession.clearCache(),
    desktopSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
  ]).catch(() => {}).finally(() => mainWindow?.loadURL(desktopUrl.toString()));
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTelechatUrl(url)) mainWindow?.loadURL(url);
    else if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toLowerCase();
    if (input.type === 'keyDown' && (key === 'f5' || (input.control && key === 'r'))) {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTelechatUrl(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (isTelechatUrl(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') setTimeout(() => mainWindow?.reload(), 700);
  });

  mainWindow.on('close', event => {
    if (isQuitting) return;
    event.preventDefault();
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('telechat:request-close-choice');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('telechat:notify', (event, payload) => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!isTelechatUrl(sourceUrl)) return;
  showNativeNotification(payload);
});

ipcMain.on('telechat:show-window', event => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (isTelechatUrl(sourceUrl)) showMainWindow();
});

ipcMain.handle('telechat:get-version', event => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  return isTelechatUrl(sourceUrl) ? app.getVersion() : '';
});

ipcMain.on('telechat:close-choice', (event, choice) => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!isTelechatUrl(sourceUrl)) return;

  if (choice === 'background') {
    mainWindow?.hide();
    return;
  }

  if (choice === 'quit') {
    isQuitting = true;
    app.quit();
  }
});

ipcMain.handle('telechat:restart', event => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!isTelechatUrl(sourceUrl)) return { ok: false };
  setTimeout(() => {
    isQuitting = true;
    app.relaunch();
    app.exit(0);
  }, 140);
  return { ok: true };
});

ipcMain.on('telechat:open-external', (event, rawUrl) => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!isTelechatUrl(sourceUrl)) return;
  try {
    const target = new URL(String(rawUrl || ''));
    if (target.protocol === 'https:') shell.openExternal(target.toString());
  } catch {}
});

ipcMain.handle('telechat:install-update', async (event, payload) => {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  const url = String(payload?.url || '');
  if (!isTelechatUrl(sourceUrl) || !isAllowedUpdateUrl(url)) return { ok: false, error: 'Недопустимый адрес обновления' };
  if (!app.isPackaged) return { ok: false, error: 'Обновление доступно только в установленном приложении' };
  if (updateInProgress) return { ok: false, error: 'Обновление уже загружается' };

  updateInProgress = true;
  const sender = event.sender;
  try {
    sendUpdateStatus(sender, { state: 'starting', progress: 0 });
    const installerPath = await downloadUpdateInstaller(url, payload?.sha256, payload?.version, sender);
    sendUpdateStatus(sender, { state: 'ready', progress: 100 });
    launchUpdateHelper(installerPath);
    isQuitting = true;
    setTimeout(() => app.quit(), 350);
    return { ok: true };
  } catch (error) {
    updateInProgress = false;
    const message = String(error?.message || 'Не удалось установить обновление');
    sendUpdateStatus(sender, { state: 'error', error: message });
    return { ok: false, error: message };
  }
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('chat.tele.desktop');
    Menu.setApplicationMenu(null);
    createTray();

    session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
      return requestingOrigin.startsWith(TELECHAT_ORIGIN) && ALLOWED_PERMISSIONS.has(permission);
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const requestingUrl = details.requestingUrl || webContents.getURL();
      callback(isTelechatUrl(requestingUrl) && ALLOWED_PERMISSIONS.has(permission));
    });

    createWindow();

    app.on('activate', () => {
      showMainWindow();
    });
  });
}

app.on('window-all-closed', () => {
  // The tray process intentionally remains alive for background notifications.
});

app.on('before-quit', () => {
  isQuitting = true;
});
