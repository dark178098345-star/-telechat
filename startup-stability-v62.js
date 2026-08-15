/* TELECHAT STARTUP STABILITY V62
   Uses direct small REST reads at startup. The Supabase UI client and the
   legacy renderer are intentionally bypassed here: message text can contain
   multi-megabyte media and must not be fetched for the sidebar. */
(() => {
  'use strict';

  const API_V62 = 'https://xvnazoervzccixtfhuaa.supabase.co/rest/v1/';
  const KEY_V62 = 'sb_publishable_XuzevkpQFrhxRccCR4kc6w_M_vIXTgG';
  const MAX_WAIT_V62 = 8500;
  let flightV62 = null;
  let dataV62 = null;
  let dataAtV62 = 0;

  const copyV62 = (tag, className, value) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  };
  const peerV62 = (key, ownNick) => {
    const keyText = String(key || '');
    const fromStart = `${ownNick}_`;
    const fromEnd = `_${ownNick}`;
    if (keyText.startsWith(fromStart)) return keyText.slice(fromStart.length);
    if (keyText.endsWith(fromEnd)) return keyText.slice(0, -fromEnd.length);
    return '';
  };

  async function readV62(resource, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAX_WAIT_V62);
    const url = `${API_V62}${resource}?${new URLSearchParams(params).toString()}`;
    try {
      const response = await fetch(url, {
        headers: { apikey: KEY_V62, Authorization: `Bearer ${KEY_V62}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`REST_${response.status}`);
      return Array.isArray(body) ? body : [];
    } finally {
      clearTimeout(timer);
    }
  }

  function paintV62(payload) {
    const list = document.getElementById('contacts-list');
    if (!list || !me?.nick) return false;
    const filter = ['all', 'group', 'channel'].includes(sidebarFilter) ? sidebarFilter : 'all';
    const users = new Map((payload.users || []).map(user => [String(user.nick).toLowerCase(), user]));
    const fragment = document.createDocumentFragment();
    const rooms = (payload.rooms || []).filter(room => filter === 'all' || room.type === filter);
    let shown = 0;

    if (rooms.length) {
      fragment.appendChild(copyV62('div', 'list-section-title', filter === 'channel' ? 'Каналы' : filter === 'group' ? 'Группы' : 'Пространства'));
      rooms.forEach(room => {
        const row = document.createElement('div');
        row.className = `contact${currentRoom && String(currentRoom.id) === String(room.id) ? ' active' : ''}`;
        const info = document.createElement('div'); info.className = 'contact-info';
        const title = copyV62('div', 'contact-name', room.name || 'Без названия');
        title.appendChild(copyV62('span', 'room-type-badge', room.type === 'channel' ? 'канал' : 'группа'));
        info.append(title, copyV62('div', 'contact-last', room.description || 'Пока без сообщений'));
        row.append(copyV62('div', 'room-avatar', room.icon || '🌌'), info, copyV62('div', 'contact-time', ''));
        row.onclick = () => openRoom(room);
        fragment.appendChild(row); shown++;
      });
    }

    if (filter === 'all') {
      const chats = [], seen = new Set();
      for (const message of payload.messages || []) {
        const peer = peerV62(message.chat_key, String(me.nick).toLowerCase());
        if (!peer || seen.has(peer)) continue;
        seen.add(peer);
        chats.push({ nick: peer, ts: Number(message.ts) || 0 });
      }
      if (chats.length) fragment.appendChild(copyV62('div', 'list-section-title', 'Личные чаты'));
      chats.forEach(chat => {
        const user = users.get(chat.nick) || { nick: chat.nick, name: chat.nick, av: 0, last_seen: 0 };
        const row = document.createElement('div');
        row.className = `contact${currentChat === chat.nick && !currentRoom ? ' active' : ''}`;
        const avatar = copyV62('div', `av${isOnline(user.last_seen) ? ' av-online' : ''}`, AVATARS[Number(user.av)] || AVATARS[0]);
        const info = document.createElement('div'); info.className = 'contact-info';
        info.append(copyV62('div', 'contact-name', user.name || user.nick), copyV62('div', 'contact-last', 'Сообщение'));
        row.append(avatar, info, copyV62('div', 'contact-time', formatMsgTime(chat.ts)));
        row.onclick = () => openChat(chat.nick);
        fragment.appendChild(row); shown++;
      });
    }

    if (!shown) fragment.appendChild(copyV62('div', 'sidebar-empty-v62', 'Диалогов пока нет'));
    list.replaceChildren(fragment);
    window.telechatReleaseBootV49?.();
    return true;
  }

  async function loadV62() {
    const ownNick = String(me?.nick || '').toLowerCase();
    if (!ownNick) return false;
    const [members, messages] = await Promise.all([
      readV62('room_members', { select: 'room_id,role', user_nick: `eq.${ownNick}` }),
      readV62('messages', {
        select: 'chat_key,ts', deleted: 'eq.false',
        or: `(chat_key.like.${ownNick}_*,chat_key.like.*_${ownNick})`, order: 'ts.desc', limit: '120'
      })
    ]);
    const ids = members.map(member => member.room_id).filter(Boolean);
    const roleByRoom = Object.fromEntries(members.map(member => [String(member.room_id), member.role || 'member']));
    const rooms = ids.length
      ? await readV62('rooms', { select: 'id,name,type,icon,description,owner_nick,created_at', id: `in.(${ids.join(',')})`, order: 'created_at.desc' })
      : [];
    const peers = [...new Set(messages.map(message => peerV62(message.chat_key, ownNick)).filter(Boolean))].slice(0, 80);
    const users = peers.length
      ? await readV62('users', { select: 'nick,name,av,last_seen', nick: `in.(${peers.join(',')})` })
      : [];
    users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
    roomRows = rooms.map(room => ({ ...room, my_role: roleByRoom[String(room.id)] || 'member' }));
    roomsAvailable = true;
    return { rooms: roomRows, messages, users };
  }

  async function sidebarV62(force = false) {
    if (!me?.nick) return false;
    if (!force && dataV62 && Date.now() - dataAtV62 < 15000) return paintV62(dataV62);
    if (flightV62) return flightV62;
    flightV62 = loadV62().then(payload => {
      dataV62 = payload; dataAtV62 = Date.now();
      return paintV62(payload);
    }).catch(error => {
      console.warn('[tele.chat] safe startup sidebar', error);
      const list = document.getElementById('contacts-list');
      if (list) list.replaceChildren(copyV62('div', 'sidebar-empty-v62', 'Не удалось загрузить чаты. Нажми «Чаты», чтобы повторить.'));
      return false;
    }).finally(() => {
      flightV62 = null;
      window.telechatReleaseBootV49?.();
    });
    return flightV62;
  }

  function setActiveV62(target) {
    document.querySelectorAll('.telechat-nav-btn').forEach(button => button.classList.toggle('active', button.dataset.nav === target));
  }
  function navigateV62(target) {
    const next = String(target || 'chats');
    const overlay = document.getElementById('overlay');
    const panelId = next === 'settings' ? 'settings-panel' : next === 'profile' ? 'profile-panel' : '';
    document.querySelectorAll('.side-panel').forEach(panel => {
      const open = Boolean(panelId && panel.id === panelId);
      panel.classList.toggle('open', open);
      panel.setAttribute('aria-hidden', String(!open));
      if (open) panel.scrollTop = 0;
    });
    overlay?.classList.toggle('show', Boolean(panelId));
    overlay?.setAttribute('aria-hidden', String(!panelId));
    setActiveV62(panelId ? next : 'chats');
    if (next === 'profile') {
      requestAnimationFrame(() => {
        try { buildProfPanel?.(); } catch (error) { console.warn('[tele.chat] profile panel', error); }
      });
    }
    if (next === 'chats') sidebarV62(false);
    return true;
  }
  function navButtonV62(event) {
    const direct = event.target?.closest?.('.telechat-bottom-nav .telechat-nav-btn[data-nav]');
    if (direct) return direct;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    const nav = document.querySelector('.telechat-bottom-nav');
    const box = nav?.getBoundingClientRect();
    if (!box || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return null;
    return [...nav.querySelectorAll('.telechat-nav-btn[data-nav]')].find(button => {
      const rect = button.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    }) || null;
  }
  function interceptNavV62(event) {
    const button = navButtonV62(event);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigateV62(button.dataset.nav);
  }

  window.telechatStartV62 = () => sidebarV62(true);
  window.renderContacts = () => sidebarV62(false);
  window.setSidebarFilter = async function(filter) {
    sidebarFilter = ['all', 'group', 'channel'].includes(filter) ? filter : 'all';
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === sidebarFilter));
    return sidebarV62(false);
  };
  window.telechatNavigate = navigateV62;
  window.addEventListener('pointerdown', interceptNavV62, true);
  window.addEventListener('click', interceptNavV62, true);
})();
