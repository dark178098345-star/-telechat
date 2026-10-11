const { contextBridge, ipcRenderer } = require('electron');

const CLOSE_DIALOG_ID = 'telechat-desktop-close-dialog';

function installCloseDialog() {
  if (!document.body || document.getElementById(CLOSE_DIALOG_ID)) return;

  const style = document.createElement('style');
  style.textContent = `
    #${CLOSE_DIALOG_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      place-items: center;
      padding: 24px;
      background: rgba(4, 5, 14, .66);
      backdrop-filter: blur(14px) saturate(125%);
      -webkit-backdrop-filter: blur(14px) saturate(125%);
      font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #f5f3ff;
    }
    #${CLOSE_DIALOG_ID}[data-open="true"] { display: grid; }
    #${CLOSE_DIALOG_ID} .telechat-close-card {
      box-sizing: border-box;
      width: min(440px, 100%);
      padding: 24px;
      border: 1px solid rgba(139, 116, 255, .34);
      border-radius: 24px;
      background: linear-gradient(145deg, rgba(31, 29, 55, .96), rgba(13, 15, 30, .97));
      box-shadow: 0 24px 80px rgba(0, 0, 0, .48), inset 0 1px rgba(255, 255, 255, .06);
      animation: telechat-close-in .2s cubic-bezier(.2, .8, .2, 1);
    }
    #${CLOSE_DIALOG_ID} .telechat-close-icon {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      margin-bottom: 16px;
      border-radius: 17px;
      background: linear-gradient(145deg, #8168ff, #5d48e8);
      box-shadow: 0 10px 30px rgba(105, 79, 240, .35);
      font-size: 25px;
    }
    #${CLOSE_DIALOG_ID} h2 { margin: 0 0 8px; font-size: 21px; line-height: 1.25; }
    #${CLOSE_DIALOG_ID} p { margin: 0 0 22px; color: #aaa6c2; font-size: 14px; line-height: 1.55; }
    #${CLOSE_DIALOG_ID} .telechat-close-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    #${CLOSE_DIALOG_ID} button {
      min-height: 48px;
      padding: 0 14px;
      border: 1px solid rgba(255, 255, 255, .1);
      border-radius: 14px;
      color: #f8f7ff;
      font: 700 13px/1.2 inherit;
      cursor: pointer;
      transition: transform .16s ease, filter .16s ease, border-color .16s ease;
    }
    #${CLOSE_DIALOG_ID} button:hover { transform: translateY(-1px); filter: brightness(1.08); }
    #${CLOSE_DIALOG_ID} button:active { transform: scale(.98); }
    #${CLOSE_DIALOG_ID} .telechat-close-quit { background: rgba(239, 68, 92, .13); border-color: rgba(239, 68, 92, .3); }
    #${CLOSE_DIALOG_ID} .telechat-close-background { background: linear-gradient(135deg, #7c63f5, #6752e7); }
    #${CLOSE_DIALOG_ID} .telechat-close-cancel {
      display: block;
      min-height: auto;
      margin: 14px auto 0;
      padding: 5px 12px;
      border: 0;
      background: transparent;
      color: #88839f;
      font-weight: 600;
    }
    @keyframes telechat-close-in {
      from { opacity: 0; transform: translateY(10px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 520px) {
      #${CLOSE_DIALOG_ID} .telechat-close-actions { grid-template-columns: 1fr; }
      #${CLOSE_DIALOG_ID} .telechat-close-background { order: -1; }
    }
  `;

  const dialog = document.createElement('div');
  dialog.id = CLOSE_DIALOG_ID;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'telechat-close-title');
  dialog.innerHTML = `
    <div class="telechat-close-card">
      <div class="telechat-close-icon" aria-hidden="true">✦</div>
      <h2 id="telechat-close-title">Закрыть ExstraChat?</h2>
      <p>В фоновом режиме приложение останется в трее, а уведомления о новых сообщениях продолжат приходить.</p>
      <div class="telechat-close-actions">
        <button class="telechat-close-quit" type="button">Закрыть полностью</button>
        <button class="telechat-close-background" type="button">Закрыть в фоне</button>
      </div>
      <button class="telechat-close-cancel" type="button">Отмена</button>
    </div>
  `;

  const hide = () => {
    dialog.dataset.open = 'false';
    dialog.setAttribute('aria-hidden', 'true');
  };
  const choose = choice => {
    hide();
    ipcRenderer.send('telechat:close-choice', choice);
  };

  dialog.querySelector('.telechat-close-quit').addEventListener('click', () => choose('quit'));
  dialog.querySelector('.telechat-close-background').addEventListener('click', () => choose('background'));
  dialog.querySelector('.telechat-close-cancel').addEventListener('click', hide);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.dataset.open === 'true') hide();
  });

  document.head.appendChild(style);
  document.body.appendChild(dialog);
}

ipcRenderer.on('telechat:request-close-choice', () => {
  installCloseDialog();
  const dialog = document.getElementById(CLOSE_DIALOG_ID);
  if (!dialog) return;
  dialog.dataset.open = 'true';
  dialog.setAttribute('aria-hidden', 'false');
  dialog.querySelector('.telechat-close-background')?.focus();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installCloseDialog, { once: true });
} else {
  installCloseDialog();
}

contextBridge.exposeInMainWorld('telechatDesktop', {
  isDesktop: true,
  notify(payload) {
    ipcRenderer.send('telechat:notify', payload);
  },
  showWindow() {
    ipcRenderer.send('telechat:show-window');
  },
  getVersion() {
    return ipcRenderer.invoke('telechat:get-version');
  },
  restartApp() {
    return ipcRenderer.invoke('telechat:restart');
  },
  openExternal(url) {
    ipcRenderer.send('telechat:open-external', String(url || ''));
  },
  installUpdate(payload) {
    return ipcRenderer.invoke('telechat:install-update', payload || {});
  },
  onUpdateStatus(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('telechat:update-status', listener);
    return () => ipcRenderer.removeListener('telechat:update-status', listener);
  },
  onNotificationActivated(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('telechat:notification-activated', listener);
    return () => ipcRenderer.removeListener('telechat:notification-activated', listener);
  }
});
