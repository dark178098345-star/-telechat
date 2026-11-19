'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  let state,
    send,
    owner,
    mark = '',
    pending = false,
    openMark = '';
  const ids = ['background', 'pin', 'mute', 'save-page', 'dock', 'external'];
  const labels = {
    background: 'Слушать в фоне',
    pin: 'Поверх других окон',
    mute: 'Выключить звук',
    'save-page': 'Добавить в ярлыки',
    external: 'Открыть в обычном браузере',
  };
  function command(action, data = {}) {
    const captured = owner;
    if (!captured) return Promise.resolve({ ok: false });
    return send(action, { ...data, profileId: captured });
  }
  function mount() {
    if ($('sites-more')) return;
    const more = document.createElement('button');
    more.id = 'sites-more';
    more.type = 'button';
    more.className = 'icon-button';
    more.title = 'Меню сайтов';
    more.setAttribute('aria-label', 'Меню сайтов');
    more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML =
      '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
    $('chrome').querySelector('.toolbar').append(more);
    const backdrop = document.createElement('div');
    backdrop.id = 'sites-utilities';
    backdrop.hidden = true;
    backdrop.innerHTML =
      '<section id="sites-tools" role="menu" aria-label="Действия с сайтом" hidden><p>Эта вкладка</p><div id="sites-tool-actions"></div><div class="sites-tool-divider"></div><button id="sites-downloads-link" type="button" role="menuitem">Загрузки <small>Ctrl+J</small></button><button id="sites-history-link" type="button" role="menuitem">История <small>Ctrl+H</small></button></section><section id="sites-records" role="dialog" aria-modal="true" aria-labelledby="sites-records-title" hidden><header><div><p>НА ЭТОМ УСТРОЙСТВЕ</p><h2 id="sites-records-title">Загрузки</h2></div><button id="sites-records-close" class="icon-button" aria-label="Закрыть" type="button">×</button></header><p id="sites-records-hint"></p><div id="sites-records-list"></div><p id="sites-records-error" role="status"></p><button id="sites-history-clear" class="soft-button" type="button" hidden>Очистить историю</button></section>';
    document.body.append(backdrop);
    for (const id of ids) {
      const button = $(id);
      button.setAttribute('role', 'menuitem');
      button.classList.add('sites-tool-item');
      if (id !== 'dock') {
        const span = document.createElement('span');
        span.dataset.toolLabel = id;
        span.textContent = labels[id];
        button.append(span);
      }
      // Close the native mask first; existing handlers still own the actual action.
      button.addEventListener(
        'click',
        () => {
          command('sites-tools', { open: false }).catch(() => {});
        },
        true,
      );
      $('sites-tool-actions').append(button);
    }
    more.onclick = () => command('sites-tools', { open: !state.toolsMenu }).catch(() => {});
    $('sites-downloads-link').onclick = () =>
      command('downloads-panel', { open: true }).catch(() => {});
    $('sites-history-link').onclick = () =>
      command('history-panel', { open: true }).catch(() => {});
    const close = () =>
      command(
        state.historyPanel
          ? 'history-panel'
          : state.downloadPanel
            ? 'downloads-panel'
            : 'sites-tools',
        { open: false },
      ).catch(() => {});
    $('sites-records-close').onclick = close;
    backdrop.onclick = (event) => {
      if (event.target === backdrop) close();
    };
    $('sites-history-clear').onclick = async () => {
      if (pending) return;
      if ($('sites-history-clear').dataset.confirm !== 'true') {
        $('sites-history-clear').dataset.confirm = 'true';
        $('sites-history-clear').textContent = 'Да, очистить историю этого профиля';
        return;
      }
      const captured = owner;
      pending = true;
      $('sites-history-clear').disabled = true;
      try {
        const result = await command('history-clear');
        if (owner === captured && !result?.ok)
          $('sites-records-error').textContent = result?.error || 'Не удалось очистить историю.';
      } catch {
        if (owner === captured)
          $('sites-records-error').textContent =
            'Нет подтверждения. Проверь историю перед повтором.';
      } finally {
        if (owner === captured) {
          pending = false;
          $('sites-history-clear').disabled = false;
        }
      }
    };
    document.addEventListener('keydown', (event) => {
      if (backdrop.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (state.toolsMenu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const buttons = [...$('sites-tools').querySelectorAll('button:not(:disabled)')],
          index = buttons.indexOf(document.activeElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...backdrop.querySelectorAll('button:not(:disabled)')].filter(
        (node) => !node.closest('[hidden]'),
      );
      if (!controls.length) return;
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }
  const bytes = (n) =>
    n >= 1048576
      ? (n / 1048576).toFixed(1) + ' МБ'
      : n >= 1024
        ? Math.round(n / 1024) + ' КБ'
        : Math.round(n) + ' Б';
  function records() {
    const history = !!state.historyPanel,
      items = history ? state.history || [] : state.downloads || [];
    const stamp = JSON.stringify([owner, history, items, state.historyError]);
    if (stamp === mark) return;
    mark = stamp;
    $('sites-records-title').textContent = history ? 'История' : 'Загрузки';
    $('sites-records-hint').textContent = history
      ? 'До 500 страниц за 90 дней. Только этот профиль. Ссылки с распространёнными секретными параметрами не записываются.'
      : 'Файлы сохраняются после выбора места. Программы не запускаются автоматически. При смене профиля незавершённые загрузки отменяются.';
    $('sites-records-error').textContent = history ? state.historyError || '' : '';
    $('sites-history-clear').hidden = !history || !items.length;
    const list = $('sites-records-list'),
      old = new Map([...list.children].map((node) => [node.dataset.id, node]));
    let index = 0;
    if (items.length && !list.children.length) list.textContent = '';
    for (const value of history ? items : [...items].reverse()) {
      let row = old.get(value.id);
      old.delete(value.id);
      if (!row) {
        row = document.createElement('article');
        row.className = 'sites-record-row';
        row.dataset.id = value.id;
        row.innerHTML =
          '<div><strong></strong><span></span><small></small></div><button class="soft-button" type="button"></button>';
      }
      const button = row.querySelector('button'),
        info = row.querySelector('div');
      info.querySelector('strong').textContent = history
        ? value.title || new URL(value.url).hostname
        : value.name;
      info.querySelector('span').textContent = history ? value.url : value.site;
      const names = {
        choosing: 'Выбери место сохранения',
        progressing: 'Скачивается',
        paused: 'Приостановлено',
        completed: 'Сохранено',
        cancelled: 'Отменено',
        interrupted: 'Загрузка прервана',
      };
      info.querySelector('small').textContent = history
        ? new Date(value.at).toLocaleString('ru-RU')
        : (names[value.state] || 'Загрузка') +
          ' · ' +
          bytes(value.received || 0) +
          (value.total ? ' / ' + bytes(value.total) : '');
      button.hidden =
        !history &&
        !['completed', 'choosing', 'progressing', 'paused', 'interrupted'].includes(value.state);
      button.textContent = history
        ? 'Открыть'
        : value.state === 'completed'
          ? 'Показать в папке'
          : 'Отменить';
      button.onclick = () =>
        command(
          history
            ? 'history-open'
            : value.state === 'completed'
              ? 'download-reveal'
              : 'download-cancel',
          { id: value.id },
        )
          .then((result) => {
            if (!result?.ok && row.isConnected)
              $('sites-records-error').textContent = result?.error || 'Действие недоступно.';
          })
          .catch(() => {});
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
      index++;
    }
    old.forEach((node) => node.remove());
    if (!items.length) {
      list.textContent = history ? 'Здесь появятся посещённые страницы.' : 'Пока нет загрузок.';
    }
  }
  function render(next, commandFn) {
    if (!next.profiles) return;
    send = commandFn;
    state = next;
    const nextOwner = next.profiles?.screen === 'browser' ? next.profiles.active?.id : null;
    mount();
    if (owner !== nextOwner) {
      owner = nextOwner;
      mark = '';
      pending = false;
      openMark = '';
      $('sites-records-list').replaceChildren();
    }
    const opened = !!owner && (next.toolsMenu || next.downloadPanel || next.historyPanel);
    $('sites-more').hidden = !owner;
    $('sites-more').setAttribute('aria-expanded', String(!!next.toolsMenu));
    $('sites-utilities').hidden = !opened;
    $('sites-tools').hidden = !next.toolsMenu;
    $('sites-records').hidden = !next.downloadPanel && !next.historyPanel;
    if (!opened) {
      mark = '';
      openMark = '';
      $('sites-records-list').replaceChildren();
      return;
    }
    $('stage').inert = true;
    for (const node of $('chrome').querySelectorAll('button,input'))
      if (node !== $('sites-more')) node.inert = true;
    if (!next.toolsMenu) records();
    const text = {
      background: next.tabs?.find((t) => t.id === next.active)?.background
        ? 'Выключить фоновое прослушивание'
        : 'Слушать в фоне',
      pin: next.alwaysOnTop ? 'Открепить окно' : 'Поверх других окон',
      mute: next.tabs?.find((t) => t.id === next.active)?.muted
        ? 'Включить звук'
        : 'Выключить звук',
    };
    for (const id of Object.keys(text)) {
      const node = document.querySelector('[data-tool-label="' + id + '"]');
      if (node) node.textContent = text[id];
    }
    const opening =
      owner + ':' + (next.toolsMenu ? 'tools' : next.historyPanel ? 'history' : 'downloads');
    if (openMark !== opening) {
      openMark = opening;
      $('sites-history-clear').dataset.confirm = 'false';
      $('sites-history-clear').textContent = 'Очистить историю';
      requestAnimationFrame(() => {
        if (openMark === opening)
          (next.toolsMenu
            ? $('sites-tools').querySelector('button:not(:disabled)')
            : $('sites-records-close')
          )?.focus();
      });
    }
  }
  window.exstraSitesUtilities = { render };
})();
