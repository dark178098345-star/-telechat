/* TELECHAT STARTUP PERFORMANCE V63
   Instant local snapshot first, small direct REST refresh second, avatar photos
   progressively last. Message text is never read by the sidebar. */
(() => {
  'use strict';

  const API = 'https://xvnazoervzccixtfhuaa.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_XuzevkpQFrhxRccCR4kc6w_M_vIXTgG';
  const REQUEST_TIMEOUT = 8000;
  const SNAPSHOT_TTL = 7 * 24 * 60 * 60 * 1000;
  const PHOTO_LIMIT = 900000;
  let currentData = null;
  let currentAt = 0;
  let running = null;
  let photosRunning = false;
  const photoDone = new Set();

  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const peer = (key, own) => {
    const value = String(key || ''), start = `${own}_`, end = `_${own}`;
    if (value.startsWith(start)) return value.slice(start.length);
    if (value.endsWith(end)) return value.slice(0, -end.length);
    return '';
  };
  const keyFor = () => me?.nick ? `telechat.sidebar.v63.${String(me.nick).toLowerCase()}` : '';

  async function request(resource, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(`${API}${resource}?${new URLSearchParams(params)}`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
        cache: 'no-store', signal: controller.signal
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`REST_${response.status}`);
      return Array.isArray(json) ? json : [];
    } finally {
      clearTimeout(timer);
    }
  }

  function avatar(user, footer = false) {
    const wrapper = node(footer ? 'span' : 'div', footer ? 'telechat-nav-avatar' : `av${isOnline(user?.last_seen) ? ' av-online' : ''}`);
    const nick = String(user?.nick || '').toLowerCase();
    if (nick) wrapper.dataset.avatarNick = nick;
    const photo = typeof getAvatarPhoto === 'function' ? getAvatarPhoto(user) : '';
    if (photo && photo.length <= PHOTO_LIMIT) {
      const image = document.createElement('img');
      image.className = 'avatar-photo'; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.src = photo;
      wrapper.appendChild(image);
    } else {
      wrapper.textContent = AVATARS[Number(user?.av)] || AVATARS[0];
    }
    return wrapper;
  }

  function updateAvatar(nick) {
    const user = userCache[String(nick).toLowerCase()];
    if (!user) return;
    document.querySelectorAll(`[data-avatar-nick="${CSS.escape(String(nick).toLowerCase())}"]`).forEach(old => old.replaceWith(avatar(user, old.id === 'footer-profile-avatar')));
  }
  function syncOwnAvatar() {
    const old = document.getElementById('footer-profile-avatar');
    if (!old || !me) return;
    const fresh = avatar(me, true); fresh.id = 'footer-profile-avatar';
    old.replaceWith(fresh);
  }

  function draw(payload) {
    const list = document.getElementById('contacts-list');
    if (!list || !me?.nick) return false;
    const filter = ['all', 'group', 'channel'].includes(sidebarFilter) ? sidebarFilter : 'all';
    const byNick = new Map((payload.users || []).map(user => [String(user.nick).toLowerCase(), user]));
    const fragment = document.createDocumentFragment();
    const rooms = (payload.rooms || []).filter(room => filter === 'all' || room.type === filter);
    let count = 0;

    if (rooms.length) {
      fragment.append(node('div', 'list-section-title', filter === 'channel' ? 'Каналы' : filter === 'group' ? 'Группы' : 'Пространства'));
      rooms.forEach(room => {
        const row = node('div', `contact${currentRoom && String(currentRoom.id) === String(room.id) ? ' active' : ''}`);
        const info = node('div', 'contact-info');
        const title = node('div', 'contact-name', room.name || 'Без названия');
        title.append(node('span', 'room-type-badge', room.type === 'channel' ? 'канал' : 'группа'));
        info.append(title, node('div', 'contact-last', room.description || 'Пока без сообщений'));
        row.append(node('div', 'room-avatar', room.icon || '🌌'), info, node('div', 'contact-time', ''));
        row.onclick = () => openRoom(room); fragment.appendChild(row); count++;
      });
    }

    if (filter === 'all') {
      const chats = [], seen = new Set();
      for (const message of payload.messages || []) {
        const nick = peer(message.chat_key, String(me.nick).toLowerCase());
        if (!nick || seen.has(nick)) continue;
        seen.add(nick); chats.push({ nick, ts: Number(message.ts) || 0 });
      }
      if (chats.length) fragment.append(node('div', 'list-section-title', 'Личные чаты'));
      chats.forEach(chat => {
        const user = byNick.get(chat.nick) || userCache[chat.nick] || { nick: chat.nick, name: chat.nick, av: 0 };
        const row = node('div', `contact${currentChat === chat.nick && !currentRoom ? ' active' : ''}`);
        const info = node('div', 'contact-info');
        info.append(node('div', 'contact-name', user.name || user.nick), node('div', 'contact-last', 'Сообщение'));
        row.append(avatar(user), info, node('div', 'contact-time', formatMsgTime(chat.ts)));
        row.onclick = () => openChat(chat.nick); fragment.appendChild(row); count++;
      });
    }
    if (!count) fragment.append(node('div', 'sidebar-empty-v63', 'Диалогов пока нет'));
    list.replaceChildren(fragment);
    syncOwnAvatar();
    window.telechatReleaseBootV49?.();
    return true;
  }

  function save(payload) {
    const key = keyFor(); if (!key) return;
    try {
      const users = (payload.users || []).map(user => ({ nick: user.nick, name: user.name, av: Number(user.av) || 0, last_seen: Number(user.last_seen) || 0 }));
      localStorage.setItem(key, JSON.stringify({ version: 63, at: Date.now(), rooms: payload.rooms || [], messages: payload.messages || [], users }));
    } catch (error) {}
  }
  function restore() {
    const key = keyFor(); if (!key) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (!saved || saved.version !== 63 || Date.now() - Number(saved.at || 0) > SNAPSHOT_TTL) return null;
      const payload = { rooms: Array.isArray(saved.rooms) ? saved.rooms : [], messages: Array.isArray(saved.messages) ? saved.messages : [], users: Array.isArray(saved.users) ? saved.users : [] };
      payload.users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
      roomRows = payload.rooms; roomsAvailable = true;
      return payload;
    } catch (error) { return null; }
  }

  async function fetchData() {
    const own = String(me?.nick || '').toLowerCase();
    const [members, messages] = await Promise.all([
      request('room_members', { select: 'room_id,role', user_nick: `eq.${own}` }),
      request('messages', { select: 'chat_key,ts', deleted: 'eq.false', or: `(chat_key.like.${own}_*,chat_key.like.*_${own})`, order: 'ts.desc', limit: '120' })
    ]);
    const ids = members.map(item => item.room_id).filter(Boolean);
    const roles = Object.fromEntries(members.map(item => [String(item.room_id), item.role || 'member']));
    const peers = [...new Set(messages.map(message => peer(message.chat_key, own)).filter(Boolean))].slice(0, 80);
    const [rooms, users] = await Promise.all([
      ids.length ? request('rooms', { select: 'id,name,type,icon,description,owner_nick,created_at', id: `in.(${ids.join(',')})`, order: 'created_at.desc' }) : Promise.resolve([]),
      peers.length ? request('users', { select: 'nick,name,av,last_seen', nick: `in.(${peers.join(',')})` }) : Promise.resolve([])
    ]);
    const mappedRooms = rooms.map(room => ({ ...room, my_role: roles[String(room.id)] || 'member' }));
    users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
    roomRows = mappedRooms; roomsAvailable = true;
    return { rooms: mappedRooms, messages, users };
  }

  async function enrichPhotos(nicks) {
    if (photosRunning) return;
    photosRunning = true;
    try {
      for (const nick of nicks.slice(0, 12)) {
        const normalized = String(nick || '').toLowerCase();
        if (!normalized || photoDone.has(normalized)) continue;
        photoDone.add(normalized);
        try {
          const rows = await request('users', { select: 'nick,status,av,name,last_seen', nick: `eq.${normalized}`, limit: '1' });
          if (!rows[0]) continue;
          userCache[normalized] = { ...(userCache[normalized] || {}), ...rows[0] };
          updateAvatar(normalized);
          if (normalized === String(me?.nick || '').toLowerCase()) { Object.assign(me, rows[0]); syncOwnAvatar(); }
        } catch (error) {}
      }
    } finally { photosRunning = false; }
  }

  async function sidebar(force = false) {
    if (!me?.nick) return false;
    if (!force && currentData && Date.now() - currentAt < 15000) return draw(currentData);
    if (running) return running;
    running = fetchData().then(payload => {
      currentData = payload; currentAt = Date.now(); save(payload); draw(payload);
      const own = String(me.nick).toLowerCase();
      const peers = [...new Set(payload.messages.map(message => peer(message.chat_key, own)).filter(Boolean))];
      setTimeout(() => enrichPhotos([own, ...peers]), 80);
      return true;
    }).catch(error => {
      console.warn('[tele.chat] sidebar startup', error);
      if (!currentData) document.getElementById('contacts-list')?.replaceChildren(node('div', 'sidebar-empty-v63', 'Чаты не загрузились. Нажми «Чаты», чтобы повторить.'));
      return false;
    }).finally(() => { running = null; window.telechatReleaseBootV49?.(); });
    return running;
  }

  function activate(target) { document.querySelectorAll('.telechat-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.nav === target)); }
  function navigate(target) {
    const next = String(target || 'chats');
    const panelId = next === 'settings' ? 'settings-panel' : next === 'profile' ? 'profile-panel' : '';
    document.querySelectorAll('.side-panel').forEach(panel => { const show = panel.id === panelId; panel.classList.toggle('open', show); panel.setAttribute('aria-hidden', String(!show)); if (show) panel.scrollTop = 0; });
    document.getElementById('overlay')?.classList.toggle('show', Boolean(panelId));
    activate(panelId ? next : 'chats');
    if (next === 'profile') requestAnimationFrame(() => { try { buildProfPanel?.(); } catch (error) {} });
    if (next === 'chats') sidebar(false);
    return true;
  }
  function navFromEvent(event) {
    const exact = event.target?.closest?.('.telechat-bottom-nav .telechat-nav-btn[data-nav]');
    if (exact) return exact;
    const nav = document.querySelector('.telechat-bottom-nav'), box = nav?.getBoundingClientRect();
    if (!box || !Number.isFinite(event.clientX) || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return null;
    return [...nav.querySelectorAll('.telechat-nav-btn[data-nav]')].find(button => { const rect = button.getBoundingClientRect(); return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; }) || null;
  }
  function intercept(event) { const button = navFromEvent(event); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); navigate(button.dataset.nav); }

  window.telechatStartV63 = () => { const saved = restore(); if (saved) { currentData = saved; draw(saved); setTimeout(() => sidebar(true), 20); } else sidebar(true); };
  window.renderContacts = () => sidebar(false);
  window.setSidebarFilter = async filter => { sidebarFilter = ['all', 'group', 'channel'].includes(filter) ? filter : 'all'; document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === sidebarFilter)); return sidebar(false); };
  window.telechatNavigate = navigate;
  window.addEventListener('pointerdown', intercept, true);
  window.addEventListener('click', intercept, true);
})();
