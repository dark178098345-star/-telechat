/* TELECHAT UPDATE MANAGER V46 */
(() => {
  'use strict';

  const MANIFEST_URL_V46 = './telechat-release.json';
  const WEB_BUILD_KEY_V51 = 'telechat-applied-web-build-v51';
  const DESKTOP_VERSION_KEY_V52 = 'telechat-last-desktop-version-v52';
  const desktopBridgeV46 = window.telechatDesktop;
  const isDesktopV46 = Boolean(desktopBridgeV46?.isDesktop);
  const canInstallV46 = typeof desktopBridgeV46?.installUpdate === 'function';
  const hadControllerV46 = Boolean(navigator.serviceWorker?.controller);
  let releaseV46 = null;
  let modeV46 = '';
  let reloadingV46 = false;
  let installingV46 = false;
  let manualInstallerFallbackV51 = false;

  function ensureCardV46() {
    let card = document.getElementById('telechat-update-v45');
    if (card) return card;
    card = document.createElement('aside');
    card.id = 'telechat-update-v45';
    card.className = 'telechat-update-v45';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <div class="telechat-update-icon-v45" aria-hidden="true">🌙</div>
      <div class="telechat-update-copy-v45">
        <div class="telechat-update-heading-v45">
          <div class="telechat-update-title-v45" id="telechat-update-title-v45">Вышло обновление tele.chat</div>
          <span class="telechat-update-tag-v45" id="telechat-update-tag-v45">NEW</span>
        </div>
        <div class="telechat-update-description-v45" id="telechat-update-description-v45">Доступна новая версия</div>
      </div>
      <div class="telechat-update-actions-v45">
        <button class="telechat-update-action-v45" id="telechat-update-action-v45" type="button">Обновить</button>
        <button class="telechat-update-close-v45" id="telechat-update-close-v45" type="button" aria-label="Напомнить позже">×</button>
      </div>`;
    document.body.appendChild(card);
    card.querySelector('#telechat-update-action-v45').addEventListener('click', applyUpdateV46);
    card.querySelector('#telechat-update-close-v45').addEventListener('click', dismissV46);
    return card;
  }

  function versionPartsV46(value) {
    return String(value || '0').split(/[.-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
  }

  function isNewerV46(next, current) {
    const a = versionPartsV46(next), b = versionPartsV46(current);
    for (let index = 0; index < 3; index++) {
      if (a[index] > b[index]) return true;
      if (a[index] < b[index]) return false;
    }
    return false;
  }

  async function loadReleaseV46(force = false) {
    if (releaseV46 && !force) return releaseV46;
    try {
      const separator = MANIFEST_URL_V46.includes('?') ? '&' : '?';
      const response = await fetch(MANIFEST_URL_V46 + separator + 't=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('release manifest');
      const data = await response.json();
      if (!data?.version) throw new Error('release version');
      releaseV46 = data;
      return data;
    } catch (error) {
      return null;
    }
  }

  function showV46(mode, release) {
    const releaseMarker = mode === 'desktop' ? release?.version : (release?.build || release?.version);
    const dismissKey = `telechat-update-dismissed-v51-${mode}-${releaseMarker || 'next'}`;
    if (sessionStorage.getItem(dismissKey) === '1') return;
    modeV46 = mode;
    releaseV46 = release || releaseV46;
    const card = ensureCardV46();
    card.dataset.dismissKey = dismissKey;
    card.querySelector('#telechat-update-title-v45').textContent = mode === 'desktop'
      ? `Вышло обновление tele.chat ${release.version}`
      : 'Обновление tele.chat готово';
    card.querySelector('#telechat-update-description-v45').textContent = mode === 'desktop'
      ? (canInstallV46
        ? 'Нажми «Обновить»: приложение само обновится и перезапустится.'
        : 'Установи эту версию один раз — следующие обновления будут автоматическими.')
      : 'Перезапусти tele.chat, чтобы применить свежую версию интерфейса.';
    card.querySelector('#telechat-update-tag-v45').textContent = mode === 'desktop' ? 'WINDOWS' : 'NEW';
    card.querySelector('#telechat-update-action-v45').textContent = mode === 'desktop'
      ? (canInstallV46 ? 'Обновить' : 'Скачать обновление')
      : 'Перезапустить';
    card.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => card.classList.add('is-visible'));
  }

  function dismissV46() {
    if (installingV46) return;
    const card = ensureCardV46();
    if (card.dataset.dismissKey) sessionStorage.setItem(card.dataset.dismissKey, '1');
    card.classList.remove('is-visible');
    card.setAttribute('aria-hidden', 'true');
  }

  function updateStatusV46(status) {
    if (!status || modeV46 !== 'desktop') return;
    const button = document.getElementById('telechat-update-action-v45');
    const description = document.getElementById('telechat-update-description-v45');
    if (!button || !description) return;
    if (status.state === 'starting') {
      button.textContent = 'Подготовка…';
      description.textContent = 'Готовим безопасное обновление.';
    } else if (status.state === 'downloading') {
      button.textContent = status.progress ? `Загрузка ${status.progress}%` : 'Загрузка…';
      description.textContent = 'Можно подождать здесь — tele.chat перезапустится сам.';
    } else if (status.state === 'ready') {
      button.textContent = 'Перезапускаем…';
      description.textContent = 'Обновление загружено. Перезапускаем tele.chat.';
    } else if (status.state === 'error') {
      installingV46 = false;
      button.disabled = false;
      button.textContent = 'Повторить';
      description.textContent = status.error || 'Не удалось обновить приложение.';
    }
  }

  async function applyUpdateV46() {
    const button = document.getElementById('telechat-update-action-v45');
    if (modeV46 === 'desktop') {
      const url = releaseV46?.windowsUrl;
      if (!url || installingV46) return;
      if (manualInstallerFallbackV51) {
        if (typeof desktopBridgeV46?.openExternal === 'function') desktopBridgeV46.openExternal(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!canInstallV46) {
        if (typeof desktopBridgeV46?.openExternal === 'function') desktopBridgeV46.openExternal(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      installingV46 = true;
      if (button) {
        button.disabled = true;
        button.textContent = 'Подготовка…';
      }
      try {
        const result = await desktopBridgeV46.installUpdate({
          url,
          version: releaseV46.version,
          sha256: releaseV46.sha256 || ''
        });
        if (!result?.ok) throw new Error(result?.error || 'Не удалось установить обновление');
      } catch (error) {
        manualInstallerFallbackV51 = true;
        installingV46 = false;
        updateStatusV46({ state: 'error', error: String(error?.message || error) });
        const description = document.getElementById('telechat-update-description-v45');
        if (description) description.textContent = 'Автозагрузка не сработала — открыли официальный установщик в браузере.';
        if (button) { button.disabled = false; button.textContent = 'Открыть ещё раз'; }
        if (typeof desktopBridgeV46?.openExternal === 'function') desktopBridgeV46.openExternal(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    reloadingV46 = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Перезапускаем…';
    }
    const webBuild = Number(releaseV46?.build) || 0;
    if (webBuild) localStorage.setItem(WEB_BUILD_KEY_V51, String(webBuild));
    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map(key => caches.delete(key)));
      }
    } catch (error) {}
    if (isDesktopV46 && typeof desktopBridgeV46?.restartApp === 'function') {
      try {
        const result = await desktopBridgeV46.restartApp();
        if (result?.ok) return;
      } catch (error) {}
    }
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('webbuild', String(webBuild || Date.now()));
    nextUrl.searchParams.set('updated', String(Date.now()));
    setTimeout(() => location.replace(nextUrl.toString()), 180);
  }

  async function checkDesktopV46() {
    if (!isDesktopV46) return;
    const release = await loadReleaseV46(true);
    if (!release) return;
    let current = '1.1.0';
    try {
      if (typeof desktopBridgeV46.getVersion === 'function') current = await desktopBridgeV46.getVersion() || current;
    } catch (error) {}
    if (release.windowsUrl && isNewerV46(release.version, current)) {
      showV46('desktop', release);
      return;
    }
    const remoteBuild = Number(release.build) || 0;
    const lastDesktopVersion = localStorage.getItem(DESKTOP_VERSION_KEY_V52);
    if (lastDesktopVersion !== current) {
      localStorage.setItem(DESKTOP_VERSION_KEY_V52, current);
      if (remoteBuild) localStorage.setItem(WEB_BUILD_KEY_V51, String(remoteBuild));
      return;
    }
    const appliedBuild = Number(localStorage.getItem(WEB_BUILD_KEY_V51)) || 49;
    if (remoteBuild > appliedBuild) showV46('web', release);
  }

  async function showWebV46() {
    if (isDesktopV46 || reloadingV46) return;
    const release = await loadReleaseV46() || { version: 'web', build: 'next' };
    showV46('web', release);
  }

  function watchRegistrationV46(registration) {
    if (!registration) return;
    if (registration.waiting && navigator.serviceWorker.controller) showWebV46();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showWebV46();
      });
    });
    const check = () => { if (!document.hidden) registration.update().catch(() => {}); };
    addEventListener('focus', check, { passive: true });
    document.addEventListener('visibilitychange', check, { passive: true });
    setInterval(check, 3 * 60 * 1000);
  }

  function initWebV46() {
    if (isDesktopV46 || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadControllerV46 && !reloadingV46) showWebV46();
    });
    navigator.serviceWorker.ready.then(watchRegistrationV46).catch(() => {});
  }

  ensureCardV46();
  desktopBridgeV46?.onUpdateStatus?.(updateStatusV46);
  if (isDesktopV46) {
    checkDesktopV46();
    addEventListener('focus', () => checkDesktopV46(), { passive: true });
    setInterval(() => { if (!document.hidden) checkDesktopV46(); }, 90 * 1000);
  } else initWebV46();

  window.telechatUpdatesV46 = {
    check: () => isDesktopV46
      ? checkDesktopV46()
      : navigator.serviceWorker?.getRegistration?.().then(registration => registration?.update()),
    showDemo: mode => loadReleaseV46().then(release => showV46(mode === 'desktop' ? 'desktop' : 'web', release || { version: '1.2.1', build: 46 }))
  };
})();
