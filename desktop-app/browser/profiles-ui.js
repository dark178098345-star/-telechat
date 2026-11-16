/* Trusted local profile chrome. No credentials, file paths or remote page access. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const colors = {
    violet: 'Лаванда',
    blue: 'Синий',
    teal: 'Бирюзовый',
    rose: 'Розовый',
    amber: 'Янтарный',
    slate: 'Графит',
  };
  const paths = {
    back: 'm14 5-7 7 7 7M7 12h14',
    close: 'm6 6 12 12M6 18 18 6',
    plus: 'M12 5v14M5 12h14',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 4v3',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
    settings:
      'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M9 3l-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-1 1-3 3-1 2-3-2-2 1-3-3-2-3 1-2-2Z',
    window: 'M4 4h16v16H4ZM4 9h16m-8 4h5v5',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
  };
  const icon = (key) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[key] || paths.user}"/></svg>`;
  let state = null,
    send = null,
    mounted = false,
    cardMark = '',
    activeMark = '',
    modal = null;
  let busy = false,
    opening = false,
    epoch = 0,
    opener = null,
    pendingSettings = '';
  let avatarDraft = '',
    colorDraft = 'violet',
    avatarVersion = 0,
    avatarPending = false;

  function profiles() {
    return state?.profiles;
  }
  function chooser() {
    return !!profiles() && profiles().screen !== 'browser';
  }
  function isOpen() {
    return chooser() || !!modal || opening;
  }
  function syncInert() {
    $('chrome').inert = chooser() || !!modal || opening;
    $('stage').inert = chooser() || !!modal || opening;
    if ($('sites-profiles-screen')) $('sites-profiles-screen').inert = !!modal;
  }
  function active() {
    return profiles()?.active || null;
  }
  function current(stamp, profileId = '') {
    return stamp === epoch && (!profileId || active()?.id === profileId);
  }
  function validAvatar(value) {
    return (
      typeof value === 'string' &&
      value.length <= 180000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    );
  }
  function avatar(node, profile) {
    const photo = validAvatar(profile?.avatar) ? profile.avatar : '';
    const initial = Array.from(profile?.nick || '')[0]?.toLocaleUpperCase('ru') || '';
    const color = colors[profile?.color] ? profile.color : 'violet';
    if (node.dataset.color !== color) node.dataset.color = color;
    const mark = photo ? 'photo:' + photo : 'letter:' + initial;
    if (node._profileAvatarMark === mark) return;
    node._profileAvatarMark = mark;
    node.replaceChildren();
    if (photo) {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = photo;
      img.onerror = () => {
        if (img.parentNode === node) {
          node._profileAvatarMark = '';
          avatar(node, { ...profile, avatar: '' });
        }
      };
      node.append(img);
    } else {
      if (initial) node.textContent = initial;
      else node.innerHTML = icon('user');
    }
  }
  function status(message = '', tone = 'error') {
    const node = $('sites-profile-error');
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
    node.dataset.tone = tone;
  }
  function setBusy(value) {
    busy = value;
    const form = $('sites-profile-dialog');
    if (!form) return;
    form.setAttribute('aria-busy', String(value));
    for (const control of form.querySelectorAll('button,input')) control.disabled = value;
    if (!value) {
      for (const submit of form.querySelectorAll('[data-primary-submit]'))
        submit.disabled = form.dataset.uncertain === 'true' || avatarPending;
      if (modal?.type === 'settings' && profiles()?.error)
        for (const control of form.querySelectorAll(
          'form input,form button:not([data-close-profile])',
        ))
          control.disabled = true;
    }
  }
  function clearSecrets() {
    for (const input of $('sites-profile-dialog')?.querySelectorAll(
      'input[type=password],input[data-secret]',
    ) || [])
      input.value = '';
  }
  function closeModal(notify = true, restoreFocus = true) {
    epoch++;
    avatarVersion++;
    avatarPending = false;
    busy = false;
    opening = false;
    const old = modal;
    modal = null;
    pendingSettings = '';
    clearSecrets();
    if ($('sites-profile-dialog-backdrop')) $('sites-profile-dialog-backdrop').hidden = true;
    if ($('sites-profile-dialog')) $('sites-profile-dialog').replaceChildren();
    document.body.dataset.profileDialog = 'false';
    $('chrome').inert = chooser();
    $('stage').inert = chooser();
    if ($('sites-profiles-screen')) $('sites-profiles-screen').inert = false;
    if (notify && old?.nativeMasked)
      Promise.resolve(send('profile-dialog', { open: false, profileId: old.profileId })).catch(
        () => {},
      );
    if (restoreFocus && opener?.isConnected && !opener.closest('[hidden]'))
      opener.focus({ preventScroll: true });
  }
  async function dialog(type, title, content, profileId = '') {
    if (modal || opening || document.body.dataset.editing === 'true') return false;
    opening = true;
    const stamp = ++epoch;
    const nativeMasked = !chooser();
    try {
      if (nativeMasked) {
        const result = await send('profile-dialog', { open: true, profileId });
        if (
          !result?.ok ||
          stamp !== epoch ||
          !active() ||
          (profileId && active().id !== profileId)
        ) {
          opening = false;
          syncInert();
          return false;
        }
      }
      if (stamp !== epoch) return false;
      opener = document.activeElement;
      modal = { type, profileId, nativeMasked };
      opening = false;
      busy = false;
      const box = $('sites-profile-dialog');
      box.dataset.uncertain = 'false';
      box.innerHTML = `<header class="sites-profile-dialog-head"><div><p class="sites-profile-eyebrow">EXSTRACHAT · САЙТЫ</p><h2 id="sites-profile-dialog-title"></h2></div><button type="button" class="sites-profile-icon" data-close-profile aria-label="Закрыть">${icon('close')}</button></header>${content}<p id="sites-profile-error" role="alert" hidden></p>`;
      $('sites-profile-dialog-title').textContent = title;
      box.scrollTop = 0;
      $('sites-profile-dialog-backdrop').hidden = false;
      document.body.dataset.profileDialog = 'true';
      $('chrome').inert = true;
      $('stage').inert = true;
      $('sites-profiles-screen').inert = true;
      for (const button of box.querySelectorAll('[data-close-profile]'))
        button.onclick = () => {
          if (!busy) closeModal();
        };
      requestAnimationFrame(() => {
        if (stamp === epoch)
          box.querySelector('input:not([hidden]),button')?.focus({ preventScroll: true });
      });
      return true;
    } catch (_) {
      if (stamp === epoch) {
        opening = false;
        syncInert();
        if (!profileId || active()?.id === profileId)
          $('sites-profiles-notice').textContent =
            'Нет ответа от приложения. Попробуй открыть профиль ещё раз.';
      }
      return false;
    }
  }
  function passwordField(id, label, autocomplete = 'off') {
    return `<label for="${id}">${label}</label><div class="sites-profile-password"><input id="${id}" data-secret type="password" maxlength="128" autocomplete="${autocomplete}" required><button type="button" class="sites-profile-icon" data-toggle-secret="${id}" aria-label="Показать пароль" aria-pressed="false">${icon('eye')}</button></div>`;
  }
  function installSecretToggles() {
    for (const button of $('sites-profile-dialog').querySelectorAll('[data-toggle-secret]'))
      button.onclick = () => {
        const field = $(button.dataset.toggleSecret),
          shown = field.type === 'password';
        field.type = shown ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(shown));
        button.setAttribute('aria-label', shown ? 'Скрыть пароль' : 'Показать пароль');
      };
  }
  async function mutate(action, data, onSuccess) {
    if (busy || !modal || $('sites-profile-dialog').dataset.uncertain === 'true') return;
    if (['profile-update', 'profile-password'].includes(action) && profiles()?.error) {
      status(profiles().error);
      return;
    }
    const stamp = epoch,
      profileId = modal.type === 'settings' ? modal.profileId : '';
    if (['profile-update', 'profile-password', 'profile-show'].includes(action))
      data = { ...data, profileId: modal.profileId };
    setBusy(true);
    status();
    try {
      const result = await send(action, data);
      if (!current(stamp, profileId)) return;
      if (!result?.ok) {
        status(result?.error || 'Не удалось сохранить. Попробуй ещё раз.');
        return;
      }
      await onSuccess?.(result);
    } catch (_) {
      if (!current(stamp, profileId)) return;
      $('sites-profile-dialog').dataset.uncertain = 'true';
      status(
        'Не удалось получить подтверждение. Закрой окно и проверь список профилей или настройки перед повтором.',
      );
    } finally {
      // Raw secrets belong only to this completed form, not to state or storage.
      if (current(stamp, profileId)) {
        clearSecrets();
        setBusy(false);
      }
    }
  }
  async function openCreate() {
    if (!profiles()?.ready || profiles()?.error) return;
    const html = `<p class="sites-profile-lead">Новое пространство для твоих сайтов. Ярлыки и входы будут отдельными.</p><form id="sites-profile-create" class="sites-profile-form"><label for="sites-profile-nick">Ник профиля</label><input id="sites-profile-nick" maxlength="32" autocomplete="off" placeholder="Например, Кирилл" required>${passwordField('sites-profile-new-password', 'Пароль профиля', 'new-password')}<p class="sites-profile-hint">От 8 до 128 символов. Сохрани пароль: восстановления через почту здесь нет. Это пароль локального профиля, не сайтов.</p><div class="sites-profile-actions"><button type="button" class="soft-button" data-close-profile>Отмена</button><button class="primary-button" data-primary-submit type="submit">Создать профиль</button></div></form>`;
    if (!(await dialog('create', 'Добавить профиль', html))) return;
    installSecretToggles();
    $('sites-profile-create').onsubmit = (event) => {
      event.preventDefault();
      const password = $('sites-profile-new-password').value;
      if (password.length < 8) {
        status('Пароль — не меньше 8 символов.');
        return;
      }
      mutate('profile-create', { nick: $('sites-profile-nick').value, password }, () =>
        closeModal(false, false),
      );
    };
  }
  async function finishEnter(id, settingsRequested) {
    closeModal(false, false);
    if (settingsRequested) {
      pendingSettings = id;
      if (active()?.id === id) {
        pendingSettings = '';
        await openSettings();
      }
    }
  }
  async function enter(profile, settingsRequested = false) {
    if (!profile || opening || modal) return;
    if (!profile.protected) {
      // Even the legacy card enters through the trusted main-process gate.
      opening = true;
      const stamp = ++epoch;
      try {
        const result = await send('profile-enter', { id: profile.id, password: '' });
        if (stamp !== epoch) return;
        if (!result?.ok) {
          $('sites-profiles-notice').textContent = result?.error || 'Не удалось открыть профиль.';
          return;
        }
        opening = false;
        if (settingsRequested) {
          pendingSettings = profile.id;
          if (active()?.id === profile.id) {
            pendingSettings = '';
            await openSettings();
          }
        }
      } catch (_) {
        if (stamp === epoch)
          $('sites-profiles-notice').textContent =
            'Нет подтверждения входа. Попробуй открыть профиль ещё раз.';
      } finally {
        if (stamp === epoch) {
          opening = false;
          $('chrome').inert = chooser() || !!modal;
          $('stage').inert = chooser() || !!modal;
          if (
            !settingsRequested &&
            active()?.id === profile.id &&
            !state.tabs?.find((tab) => tab.id === state.active)?.url
          )
            $('address').focus();
        }
      }
      return;
    }
    const html = `<div class="sites-profile-unlock-person"><span id="sites-profile-unlock-avatar" class="sites-profile-avatar"></span><strong id="sites-profile-unlock-nick"></strong></div><form id="sites-profile-enter" class="sites-profile-form">${passwordField('sites-profile-password', 'Пароль профиля', 'current-password')}<p class="sites-profile-hint">Профиль хранится на этом компьютере. Пароль не отправляется на сайты.</p><div class="sites-profile-actions"><button type="button" class="soft-button" data-close-profile>Отмена</button><button class="primary-button" data-primary-submit type="submit">Войти в профиль</button></div></form>`;
    if (!(await dialog('enter', 'Твоё пространство', html, profile.id))) return;
    avatar($('sites-profile-unlock-avatar'), profile);
    $('sites-profile-unlock-nick').textContent = profile.nick;
    installSecretToggles();
    $('sites-profile-enter').onsubmit = (event) => {
      event.preventDefault();
      if (settingsRequested) pendingSettings = profile.id;
      mutate('profile-enter', { id: profile.id, password: $('sites-profile-password').value }, () =>
        finishEnter(profile.id, settingsRequested),
      );
    };
    $('sites-profile-password').focus();
  }
  async function confirmSwitch(profileId = active()?.id) {
    if (!profileId || active()?.id !== profileId) return;
    if (!state.tabs?.some((tab) => !!tab.url)) {
      try {
        const result = await send('profile-show', { profileId });
        if (!result?.ok) throw Error(result?.error || 'Не удалось сменить профиль.');
      } catch (error) {
        if (active()?.id !== profileId) return;
        await Promise.resolve(send('profile-dialog', { open: false, profileId })).catch(() => {});
        if (active()?.id === profileId)
          $('status').textContent = error.message || 'Не удалось сменить профиль.';
      }
      return;
    }
    const html = `<div class="sites-profile-confirm-symbol">${icon('lock')}</div><p class="sites-profile-lead">Страницы и фоновое воспроизведение этого профиля будут закрыты. Незавершённые формы сайтов могут потеряться.</p><p class="sites-profile-hint">Входы на сайты, ярлыки и настройки останутся. Открытые адреса можно восстановить при возвращении в профиль в этой сессии приложения.</p><div class="sites-profile-actions"><button type="button" class="soft-button" data-close-profile>Остаться</button><button type="button" class="primary-button" data-primary-submit id="sites-profile-confirm-switch">К профилям</button></div>`;
    if (!(await dialog('switch', 'Сменить профиль?', html, active().id))) return;
    $('sites-profile-confirm-switch').onclick = () =>
      mutate('profile-show', {}, () => closeModal(false, false));
  }
  function settingsAvatar() {
    avatar($('sites-profile-settings-avatar'), {
      ...active(),
      avatar: avatarDraft,
      color: colorDraft,
      nick: $('sites-profile-settings-nick').value,
    });
    for (const button of $('sites-profile-colors').children)
      button.setAttribute('aria-pressed', String(button.dataset.color === colorDraft));
  }
  async function chooseAvatar(file) {
    const stamp = epoch,
      version = ++avatarVersion;
    avatarPending = true;
    setBusy(false);
    status();
    let bitmap;
    try {
      if (!file || !/^image\/(?:png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024)
        throw Error('Выбери JPG, PNG или WebP до 8 МБ.');
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 36000000)
        throw Error('Фото слишком большое. Выбери изображение до 36 мегапикселей.');
      if (!current(stamp, modal?.profileId) || version !== avatarVersion) return;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 192;
      const side = Math.min(bitmap.width, bitmap.height);
      canvas
        .getContext('2d')
        .drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          192,
          192,
        );
      const value = canvas.toDataURL('image/webp', 0.86);
      if (!validAvatar(value)) throw Error('Не удалось подготовить фото. Выбери другое.');
      avatarDraft = value;
      settingsAvatar();
    } catch (error) {
      if (stamp === epoch && version === avatarVersion)
        status(error.message || 'Не удалось обработать фото.');
    } finally {
      bitmap?.close();
      if (stamp === epoch && version === avatarVersion) {
        avatarPending = false;
        setBusy(false);
      }
    }
  }
  async function openSettings() {
    const profile = active();
    if (!profile || modal || opening) return;
    const html = `<form id="sites-profile-settings" class="sites-profile-form"><div class="sites-profile-avatar-editor"><span class="sites-profile-avatar" id="sites-profile-settings-avatar"></span><div><button type="button" class="soft-button" id="sites-profile-photo">Выбрать фото</button><button type="button" class="sites-profile-text-button" id="sites-profile-photo-remove">Убрать фото</button><small>Фото останется на этом компьютере</small></div><input type="file" id="sites-profile-photo-input" accept="image/png,image/jpeg,image/webp" hidden></div><label for="sites-profile-settings-nick">Ник профиля</label><input id="sites-profile-settings-nick" maxlength="32" autocomplete="off" required><fieldset class="sites-profile-color-field"><legend>Акцент профиля</legend><div id="sites-profile-colors"></div></fieldset><label for="sites-profile-home">Стартовая страница <span class="sites-profile-optional">необязательно</span></label><input id="sites-profile-home" type="text" inputmode="url" maxlength="4096" spellcheck="false" autocomplete="off" placeholder="Пусто — быстрый доступ"><label class="sites-profile-switch"><input type="checkbox" id="sites-profile-lock-on-hide"><span><strong>Блокировать при возврате в чаты</strong><small>Страницы и фоновый звук будут закрываться</small></span></label><div class="sites-profile-actions"><button type="button" class="soft-button" data-close-profile>Закрыть</button><button class="primary-button" data-primary-submit type="submit">Сохранить</button></div></form><section class="sites-profile-security"><h3>Пароль и доступ</h3><p class="sites-profile-hint">Пароль защищает вход внутри ExstraChat. Это не шифрование файлов Windows. Восстановления забытого пароля здесь нет.</p><form id="sites-profile-password-form" class="sites-profile-form"><div id="sites-profile-old-password-row">${passwordField('sites-profile-old-password', 'Текущий пароль', 'current-password')}</div>${passwordField('sites-profile-change-password', 'Новый пароль', 'new-password')}<button type="submit" class="soft-button" data-primary-submit>Обновить пароль</button></form><button type="button" class="sites-profile-lock-button" id="sites-profile-switch">${icon('lock')}<span>Сменить или заблокировать профиль</span></button></section>`;
    if (!(await dialog('settings', 'Настройки профиля', html, profile.id))) return;
    avatarDraft = profile.avatar || '';
    colorDraft = colors[profile.color] ? profile.color : 'violet';
    avatarPending = false;
    $('sites-profile-settings-nick').value = profile.nick;
    $('sites-profile-home').value = profile.settings?.home || '';
    $('sites-profile-lock-on-hide').checked = profile.settings?.lockOnHide === true;
    $('sites-profile-old-password-row').hidden = !profile.protected;
    $('sites-profile-old-password').required = !!profile.protected;
    for (const [color, label] of Object.entries(colors)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.color = color;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.onclick = () => {
        colorDraft = color;
        settingsAvatar();
      };
      $('sites-profile-colors').append(button);
    }
    settingsAvatar();
    installSecretToggles();
    $('sites-profile-settings-nick').addEventListener('input', settingsAvatar);
    $('sites-profile-photo').onclick = () => $('sites-profile-photo-input').click();
    $('sites-profile-photo-input').onchange = (event) => {
      const file = event.target.files[0];
      event.target.value = '';
      if (file) chooseAvatar(file);
    };
    $('sites-profile-photo-remove').onclick = () => {
      avatarVersion++;
      avatarPending = false;
      avatarDraft = '';
      settingsAvatar();
      setBusy(false);
    };
    $('sites-profile-settings').onsubmit = (event) => {
      event.preventDefault();
      if (avatarPending) return;
      mutate(
        'profile-update',
        {
          nick: $('sites-profile-settings-nick').value,
          avatar: avatarDraft,
          color: colorDraft,
          settings: {
            home: $('sites-profile-home').value,
            lockOnHide: $('sites-profile-lock-on-hide').checked,
          },
        },
        () => {
          status('Настройки сохранены.', 'success');
        },
      );
    };
    $('sites-profile-password-form').onsubmit = (event) => {
      event.preventDefault();
      const password = $('sites-profile-change-password').value;
      if (password.length < 8) {
        status('Новый пароль — не меньше 8 символов.');
        return;
      }
      mutate(
        'profile-password',
        { currentPassword: $('sites-profile-old-password').value, newPassword: password },
        () => {
          status('Пароль обновлён. Используй его при следующем входе.', 'success');
          $('sites-profile-old-password-row').hidden = false;
          $('sites-profile-old-password').required = true;
        },
      );
    };
    $('sites-profile-switch').onclick = () => {
      closeModal(false, false);
      confirmSwitch(profile.id);
    };
    setBusy(false);
    if (profiles()?.error) status(profiles().error);
  }
  function mount() {
    if (mounted) return;
    mounted = true;
    const screen = document.createElement('section');
    screen.id = 'sites-profiles-screen';
    screen.hidden = true;
    screen.innerHTML = `<header class="sites-profiles-header"><button type="button" class="sites-profiles-brand" id="sites-profiles-home">${icon('back')}<span>ExstraChat<span>Сайты</span></span></button><span class="sites-profiles-drag"></span><button type="button" class="sites-profile-text-button" id="sites-profiles-dock">${icon('window')}<span>Отдельное окно</span></button></header><main class="sites-profiles-content"><div class="sites-profiles-heading"><span class="sites-profile-eyebrow">ТВОЯ СТОРОНА ИНТЕРНЕТА</span><h1>Кто сейчас заходит?</h1><p>Разные профили — разные входы на сайты, ярлыки и настройки. <br>Выбери своё пространство или создай новое.</p></div><div id="sites-profiles-grid" aria-label="Профили сайтов"></div><p id="sites-profiles-notice" role="status" aria-live="polite"></p><div class="sites-profiles-privacy">${icon('shield')}<p>Профили хранятся на этом компьютере.<br>Сайты не получают доступ к чатам ExstraChat.</p></div></main>`;
    const backdrop = document.createElement('div');
    backdrop.id = 'sites-profile-dialog-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML =
      '<section id="sites-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="sites-profile-dialog-title" tabindex="-1"></section>';
    document.body.append(screen, backdrop);
    const button = document.createElement('button');
    button.id = 'sites-profile-button';
    button.type = 'button';
    button.className = 'sites-profile-toolbar';
    button.hidden = true;
    button.setAttribute('aria-label', 'Настройки профиля сайтов');
    button.innerHTML = '<span class="sites-profile-avatar"></span>';
    button.onclick = openSettings;
    $('new').after(button);
    $('sites-profiles-home').onclick = () => send('home');
    $('sites-profiles-dock').onclick = () => send('dock');
    backdrop.onclick = (event) => {
      if (event.target === backdrop && !busy) closeModal();
    };
    document.addEventListener(
      'keydown',
      (event) => {
        if (!modal) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!busy) closeModal();
        }
        if (event.key !== 'Tab') return;
        const box = $('sites-profile-dialog'),
          controls = [...box.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(
            (node) => node.getClientRects().length && !node.closest('[hidden]'),
          );
        if (!controls.length) {
          event.preventDefault();
          box.focus();
          return;
        }
        const first = controls[0],
          last = controls.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || !box.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !box.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      },
      true,
    );
  }
  function renderCards(data) {
    const mark = JSON.stringify([data.items, data.ready, data.error, data.fatal, data.max]);
    if (mark === cardMark) return;
    cardMark = mark;
    const grid = $('sites-profiles-grid'),
      old = new Map(
        [...grid.querySelectorAll('[data-profile-id]')].map((node) => [
          node.dataset.profileId,
          node,
        ]),
      );
    let index = 0;
    for (const profile of data.items || []) {
      let card = old.get(profile.id);
      old.delete(profile.id);
      if (!card) {
        card = document.createElement('article');
        card.className = 'sites-profile-card';
        card.dataset.profileId = profile.id;
        card.innerHTML = `<button type="button" class="sites-profile-card-open"><span class="sites-profile-avatar"></span><strong></strong><span class="sites-profile-card-detail"></span></button><button type="button" class="sites-profile-card-settings" aria-label="Войти и настроить профиль">${icon('settings')}</button>`;
        const saved = () => profiles()?.items?.find((item) => item.id === profile.id);
        card.querySelector('.sites-profile-card-open').onclick = () => enter(saved());
        card.querySelector('.sites-profile-card-settings').onclick = () => enter(saved(), true);
      }
      const open = card.querySelector('.sites-profile-card-open');
      open.disabled = !data.ready || data.fatal === true;
      open.setAttribute('aria-label', 'Открыть профиль ' + profile.nick);
      card.querySelector('strong').textContent = profile.nick;
      const detail = card.querySelector('.sites-profile-card-detail');
      detail.replaceChildren();
      if (profile.protected) detail.innerHTML = icon('lock');
      detail.append(
        document.createTextNode(
          profile.protected
            ? 'Защищён паролем'
            : profile.legacy
              ? 'Прежнее пространство'
              : 'Без пароля',
        ),
      );
      const settings = card.querySelector('.sites-profile-card-settings');
      settings.disabled = open.disabled;
      settings.setAttribute('aria-label', 'Войти и настроить профиль ' + profile.nick);
      avatar(card.querySelector('.sites-profile-avatar'), profile);
      card.dataset.color = colors[profile.color] ? profile.color : 'violet';
      if (grid.children[index] !== card) grid.insertBefore(card, grid.children[index] || null);
      index++;
    }
    old.forEach((node) => node.remove());
    let add = $('sites-profile-add');
    if (!add) {
      add = document.createElement('button');
      add.id = 'sites-profile-add';
      add.type = 'button';
      add.className = 'sites-profile-add';
      add.innerHTML = `<span>${icon('plus')}</span><strong>Добавить профиль</strong><small>Ник и пароль — и ты внутри</small>`;
      add.onclick = openCreate;
    }
    add.disabled = !data.ready || !!data.error || (data.items?.length || 0) >= (data.max || 12);
    add.title =
      add.disabled && data.ready && !data.error
        ? 'На этом компьютере можно создать до ' + (data.max || 12) + ' профилей'
        : 'Новое пространство сайтов';
    grid.append(add);
  }
  function render(next, command) {
    send = command;
    delete document.body.dataset.profilesBoot;
    $('sites-profiles-boot')?.remove();
    const previous = state?.profiles;
    state = next;
    if (!next?.profiles) {
      if (mounted) {
        closeModal(false, false);
        $('sites-profiles-screen').hidden = true;
        $('sites-profile-button').hidden = true;
        delete document.body.dataset.profileScreen;
      }
      return false;
    }
    mount();
    const data = next.profiles,
      nowChooser = data.screen !== 'browser';
    if (
      modal &&
      (modal.type === 'settings' || modal.type === 'switch') &&
      modal.profileId !== data.active?.id
    )
      closeModal(false, false);
    if (modal && ['create', 'enter'].includes(modal.type) && !nowChooser) {
      const after = pendingSettings;
      closeModal(false, false);
      pendingSettings = after;
    }
    document.body.dataset.profileScreen = nowChooser ? 'chooser' : 'browser';
    document.body.dataset.profileColor = colors[data.active?.color] ? data.active.color : 'violet';
    $('sites-profiles-screen').hidden = !nowChooser;
    $('sites-profile-button').hidden = nowChooser;
    $('chrome').inert = nowChooser || !!modal || opening;
    $('stage').inert = nowChooser || !!modal || opening;
    if (modal?.type === 'settings' && !busy && data.error) {
      setBusy(false);
      status(data.error);
    }
    if (nowChooser) {
      renderCards(data);
      $('sites-profiles-notice').textContent = !data.ready
        ? 'Открываем профили…'
        : data.error || next.notice || '';
      $('sites-profiles-grid').setAttribute('aria-busy', String(!data.ready));
      $('sites-profiles-dock').querySelector('span').textContent =
        next.mode === 'window' ? 'В раздел' : 'Отдельное окно';
      if (previous?.screen !== 'chooser')
        requestAnimationFrame(() => {
          if (chooser() && !modal)
            $('sites-profiles-grid')
              .querySelector('button:not(:disabled)')
              ?.focus({ preventScroll: true });
        });
    } else if (data.active) {
      const mark = JSON.stringify(data.active);
      if (activeMark !== mark) {
        activeMark = mark;
        avatar($('sites-profile-button').firstElementChild, data.active);
        $('sites-profile-button').title = data.active.nick + ' · настройки профиля сайтов';
      }
      if (pendingSettings === data.active.id && !modal && !opening) {
        pendingSettings = '';
        queueMicrotask(openSettings);
      }
    }
    return nowChooser || !!modal;
  }
  window.exstraSitesProfilesV214 = Object.freeze({ render, isOpen, openSettings });
})();
