/* TELECHAT UPDATE MANAGER V54 */
(() => {
  'use strict';

  const MANIFEST_URL = './telechat-release.json';
  const WEB_BUILD_KEY = 'telechat-applied-web-build-v54';
  const DESKTOP_VERSION_KEY = 'telechat-last-desktop-version-v54';
  const bridge = window.telechatDesktop;
  const isDesktop = Boolean(bridge?.isDesktop);
  const canInstall = typeof bridge?.installUpdate === 'function';
  const canRestart = typeof bridge?.restartApp === 'function';
  const hadController = Boolean(navigator.serviceWorker?.controller);
  let release = null;
  let mode = '';
  let applying = false;
  let manualInstallerFallback = false;

  function ensureCard() {
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
    card.querySelector('#telechat-update-action-v45').addEventListener('click', applyUpdate);
    card.querySelector('#telechat-update-close-v45').addEventListener('click', dismiss);
    return card;
  }

  function parts(value) {
    return String(value || '0').split(/[.-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
  }

  function newer(next, current) {
    const a = parts(next), b = parts(current);
    for (let index = 0; index < 3; index++) {
      if (a[index] !== b[index]) return a[index] > b[index];
    }
    return false;
  }

  async function loadRelease(force = false) {
    if (release && !force) return release;
    try {
      const url = force ? `${MANIFEST_URL}?t=${Date.now()}` : MANIFEST_URL;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('manifest');
      const value = await response.json();
      if (!value?.version) throw new Error('version');
      release = value;
      return value;
    } catch (error) {
      return null;
    }
  }

  function show(nextMode, nextRelease) {
    const marker = nextMode === 'desktop'
      ? nextRelease?.version || 'next'
      : nextRelease?.build || nextRelease?.version || 'next';
    const dismissKey = `telechat-update-dismissed-v54-${nextMode}-${marker}`;
    if (sessionStorage.getItem(dismissKey) === '1') return;
    mode = nextMode;
    release = nextRelease || release;
    const card = ensureCard();
    card.dataset.dismissKey = dismissKey;
    const isInstaller = mode === 'desktop';
    const isFallback = isInstaller && manualInstallerFallback;
    card.querySelector('#telechat-update-title-v45').textContent = isInstaller
      ? `Вышло обновление tele.chat ${release.version}`
      : 'Обновление tele.chat готово';
    card.querySelector('#telechat-update-description-v45').textContent = isFallback
      ? 'Не удалось скачать установщик внутри приложения. Откроем безопасную страницу загрузки в браузере.'
      : isInstaller
        ? 'Нажми «Обновить»: новая версия установится, а приложение само перезапустится.'
        : 'Перезапусти tele.chat — свежая версия интерфейса применится сразу, без установки.';
    card.querySelector('#telechat-update-tag-v45').textContent = isInstaller ? 'WINDOWS' : 'NEW';
    card.querySelector('#telechat-update-action-v45').textContent = isFallback
      ? 'Открыть установщик'
      : isInstaller
        ? 'Обновить'
        : 'Перезапустить';
    card.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => card.classList.add('is-visible'));
  }

  function dismiss() {
    if (applying) return;
    const card = ensureCard();
    if (card.dataset.dismissKey) sessionStorage.setItem(card.dataset.dismissKey, '1');
    card.classList.remove('is-visible');
    card.setAttribute('aria-hidden', 'true');
  }

  function setProgress(status) {
    if (!status || mode !== 'desktop') return;
    const button = document.getElementById('telechat-update-action-v45');
    const description = document.getElementById('telechat-update-description-v45');
    if (!button || !description) return;
    if (status.state === 'starting') {
      button.textContent = 'Подготовка…';
      description.textContent = 'Проверяем обновление.';
    } else if (status.state === 'downloading') {
      button.textContent = status.progress ? `Загрузка ${status.progress}%` : 'Загрузка…';
      description.textContent = 'После загрузки tele.chat перезапустится автоматически.';
    } else if (status.state === 'ready') {
      button.textContent = 'Перезапускаем…';
      description.textContent = 'Обновление готово.';
    } else if (status.state === 'error') {
      applying = false;
      manualInstallerFallback = true;
      button.disabled = false;
      show('desktop', release);
    }
  }

  async function restartInterface() {
    applying = true;
    const button = document.getElementById('telechat-update-action-v45');
    if (button) {
      button.disabled = true;
      button.textContent = 'Перезапускаем…';
    }
    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      const keys = await caches?.keys?.() || [];
      await Promise.all(keys.filter(key => key.startsWith('telechat-shell-')).map(key => caches.delete(key)));
    } catch (error) {}
    localStorage.setItem(WEB_BUILD_KEY, String(release?.build || ''));
    if (isDesktop && canRestart) {
      const result = await bridge.restartApp().catch(() => ({ ok: false }));
      if (result?.ok) return;
    }
    const url = new URL(location.href);
    url.searchParams.set('refresh', String(Date.now()));
    location.replace(url.toString());
  }

  async function applyUpdate() {
    const url = release?.windowsUrl;
    if (mode !== 'desktop') return restartInterface();
    if (!url || applying) return;
    if (manualInstallerFallback || !canInstall) {
      if (typeof bridge?.openExternal === 'function') bridge.openExternal(url);
      else window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    applying = true;
    const button = document.getElementById('telechat-update-action-v45');
    if (button) {
      button.disabled = true;
      button.textContent = 'Подготовка…';
    }
    try {
      const result = await bridge.installUpdate({ url, version: release.version, sha256: release.sha256 || '' });
      if (!result?.ok) throw new Error(result?.error || 'Не удалось скачать обновление');
    } catch (error) {
      applying = false;
      manualInstallerFallback = true;
      show('desktop', release);
    }
  }

  async function checkDesktop() {
    if (!isDesktop) return;
    const nextRelease = await loadRelease(true);
    if (!nextRelease?.windowsUrl) return;
    let current = '1.0.0';
    try {
      current = await bridge.getVersion?.() || current;
    } catch (error) {}
    if (newer(nextRelease.version, current)) {
      manualInstallerFallback = false;
      show('desktop', nextRelease);
      return;
    }
    const remoteBuild = Number(nextRelease.build || 0);
    const seenVersion = localStorage.getItem(DESKTOP_VERSION_KEY);
    if (seenVersion !== current) {
      localStorage.setItem(DESKTOP_VERSION_KEY, current);
      if (remoteBuild) localStorage.setItem(WEB_BUILD_KEY, String(remoteBuild));
      return;
    }
    const appliedBuild = Number(localStorage.getItem(WEB_BUILD_KEY) || 0);
    if (remoteBuild && remoteBuild > appliedBuild) show('web', nextRelease);
  }

  async function checkWebBuild() {
    if (isDesktop || applying) return;
    const nextRelease = await loadRelease(true);
    const remoteBuild = Number(nextRelease?.build || 0);
    if (!remoteBuild) return;
    const appliedBuild = Number(localStorage.getItem(WEB_BUILD_KEY) || 0);
    if (!appliedBuild) {
      localStorage.setItem(WEB_BUILD_KEY, String(remoteBuild));
      return;
    }
    if (remoteBuild > appliedBuild) show('web', nextRelease);
  }

  function watchRegistration(registration) {
    if (!registration) return;
    const check = () => { if (!document.hidden) checkWebBuild(); };
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) check();
      });
    });
    addEventListener('focus', check, { passive: true });
    document.addEventListener('visibilitychange', check, { passive: true });
    setInterval(check, 90000);
    check();
  }

  ensureCard();
  bridge?.onUpdateStatus?.(setProgress);
  if (isDesktop) {
    checkDesktop();
    addEventListener('focus', () => checkDesktop(), { passive: true });
    setInterval(checkDesktop, 90000);
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !applying) checkWebBuild();
    });
    navigator.serviceWorker.ready.then(watchRegistration).catch(() => checkWebBuild());
  } else {
    checkWebBuild();
  }

  window.telechatUpdatesV54 = { check: () => isDesktop ? checkDesktop() : checkWebBuild() };
})();
