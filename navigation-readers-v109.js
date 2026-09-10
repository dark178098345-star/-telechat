/* Compact navigation and incremental read receipts. */
(() => {
  'use strict';
  const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    all: svg('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2 1.5-5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M7 9h9M7 13h6"/>'),
    group: svg('<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/>'),
    channel: svg('<path d="m3 10 17-6v16L3 14zM7 16l1 5h4l-2-4"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>')
  };

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const rail = document.createElement('nav');
    rail.className = 'section-rail-v109';
    rail.setAttribute('aria-label', 'Разделы tele.chat');
    rail.innerHTML = '<span class="rail-brand-v109" aria-hidden="true">t<span>.</span></span>';
    for (const [filter, title] of [['all', 'Все чаты'], ['group', 'Группы'], ['channel', 'Каналы']]) {
      const button = document.createElement('button');
      button.type = 'button';button.dataset.railFilter = filter;
      button.innerHTML = icons[filter] + `<span>${title}</span>`;
      button.addEventListener('click', () => {
        window.telechatNavigate?.('chats');
        const original = sidebar.querySelector(`.sidebar-tab[data-filter="${filter}"]`);
        original?.click();
      });
      rail.append(button);
    }
    sidebar.prepend(rail);
    // Reuse the existing opener so positioning, closing and keyboard focus
    // continue to work with the same button on either layout.
    const music = sidebar.querySelector('.music-entry-v96');
    const desktop = matchMedia('(min-width:901px), (min-width:721px) and (pointer:fine)');
    const placeMusic = () => {
      const parent = desktop.matches ? rail : sidebar.querySelector('.sidebar-top');
      if (music && parent && music.parentNode !== parent) parent.append(music);
    };
    placeMusic();desktop.addEventListener?.('change', placeMusic);
    const sync = () => {
      const selected = sidebar.querySelector('.sidebar-tab.active')?.dataset.filter || 'all';
      rail.querySelectorAll('[data-rail-filter]').forEach(button => {
        const active = button.dataset.railFilter === selected;
        button.classList.toggle('active', active);button.setAttribute('aria-pressed', String(active));
      });
    };
    const observer = new MutationObserver(sync);
    sidebar.querySelectorAll('.sidebar-tab').forEach(tab => observer.observe(tab, { attributes:true, attributeFilter:['class'] }));
    sync();
  }

  // Only missing reader profiles are fetched, once per nick and shared by rows.
  const loading = new Map();
  const rowState = new WeakMap();
  const owner = () => typeof me !== 'undefined' ? me?.nick : '';
  const activeKey = () => typeof conversationKey === 'function' ? conversationKey() : '';
  const cached = nick => typeof userCache !== 'undefined' ? userCache[nick] : null;
  function readersOf(message) {
    let readers = message.read_by;
    if (typeof readers === 'string') { try { readers = JSON.parse(readers); } catch (_) { readers = []; } }
    if (!Array.isArray(readers)) return [];
    return [...new Set(readers.filter(nick => typeof nick === 'string' && nick && nick !== owner()))]
      .filter(nick => (typeof currentRoom !== 'undefined' && !!currentRoom) || (typeof currentChat !== 'undefined' && nick === currentChat));
  }
  function paint(row, state) {
    if (!row.isConnected || rowState.get(row) !== state || activeKey() !== state.key || owner() !== state.owner) return;
    const shown = state.readers.slice(0, 3);
    const profiles = shown.map(nick => cached(nick));
    const signature = shown.map((nick, i) => [nick, profiles[i]?.name, profiles[i]?.av, profiles[i]?.status]);
    let receipt = row.querySelector('.readers-v109');
    if (receipt?._totalV109 === state.readers.length && signature.every((fields, i) => fields.every((value, j) => receipt._signatureV109?.[i]?.[j] === value))) return;
    if (!receipt) { receipt = document.createElement('div');receipt.className = 'readers-v109';row.append(receipt); }
    const label = 'Прочитали: ' + state.readers.map(nick => cached(nick)?.name || nick).join(', ');
    receipt.setAttribute('aria-label', label);receipt.title = label;
    receipt.innerHTML = icons.eye;
    shown.forEach((nick, i) => {
      const user = profiles[i];
      const avatar = document.createElement('span');avatar.className = 'reader-avatar-v109';
      avatar.title = user?.name || nick;avatar.setAttribute('aria-hidden', 'true');
      const photo = user && typeof getAvatarPhoto === 'function' ? getAvatarPhoto(user) : '';
      if (photo) {
        const image = document.createElement('img');image.src = photo;image.alt = '';image.decoding = 'async';
        image.addEventListener('error', () => { avatar.textContent = nick[0].toUpperCase(); }, {once:true});
        avatar.append(image);
      } else avatar.textContent = user && typeof AVATARS !== 'undefined' ? (AVATARS[Number(user.av)] || nick[0].toUpperCase()) : nick[0].toUpperCase();
      receipt.append(avatar);
    });
    if (state.readers.length > 3) {
      const more = document.createElement('span');more.className = 'reader-more-v109';more.textContent = '+' + (state.readers.length - 3);receipt.append(more);
    }
    receipt._signatureV109 = signature;
    receipt._totalV109 = state.readers.length;
  }
  window.telechatReadReceiptV109 = (row, message) => {
    if (!row?.classList?.contains('msg') || !message) return;
    const readers = message.from_nick === owner() && !message.deleted ? readersOf(message) : [];
    if (!readers.length || (message.chat_key && message.chat_key !== activeKey())) {
      rowState.delete(row);row.querySelector('.readers-v109')?.remove();return;
    }
    const state = {readers, key:activeKey(), owner:owner()};
    rowState.set(row, state);paint(row, state);
    for (const nick of readers.slice(0, 3)) {
      if (cached(nick) || typeof getUser !== 'function') continue;
      if (!loading.has(nick)) loading.set(nick, Promise.resolve().then(() => getUser(nick)).catch(() => null));
      loading.get(nick).then(() => paint(row, state));
    }
  };
})();
