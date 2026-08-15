/* TELECHAT SAFE SIDEBAR V61
   Message text may contain photos, voice recordings and videos as base64.
   The sidebar must never fetch that payload: it only needs chat keys and time.
   This replacement is global, including background updates and tabs. */
(() => {
  'use strict';

  let inFlightV61 = null;
  let cacheV61 = null;
  let cacheAtV61 = 0;
  const CACHE_TTL_V61 = 12000;
  const TIMEOUT_V61 = 8000;

  const limitV61 = (task, ms = TIMEOUT_V61) => Promise.race([
    Promise.resolve(task),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SAFE_SIDEBAR_TIMEOUT')), ms))
  ]);
  const textV61 = (tag, className, value) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  };
  const peerV61 = (key, own) => {
    const value = String(key || '');
    const start = `${own}_`, end = `_${own}`;
    if (value.startsWith(start)) return value.slice(start.length);
    if (value.endsWith(end)) return value.slice(0, -end.length);
    return '';
  };

  function paintV61(payload) {
    const list = document.getElementById('contacts-list');
    if (!list || !me?.nick) return false;
    const users = new Map((payload?.users || []).map(user => [String(user.nick).toLowerCase(), user]));
    const fragment = document.createDocumentFragment();
    const activeFilter = String(sidebarFilter || 'all');
    const rooms = (payload?.rooms || []).filter(room => activeFilter === 'all' || room.type === activeFilter);
    let total = 0;

    if (rooms.length) {
      fragment.appendChild(textV61('div', 'list-section-title', activeFilter === 'channel' ? 'Каналы' : activeFilter === 'group' ? 'Группы' : 'Пространства'));
      rooms.forEach(room => {
        const row = document.createElement('div');
        row.className = `contact${currentRoom && String(currentRoom.id) === String(room.id) ? ' active' : ''}`;
        const info = document.createElement('div'); info.className = 'contact-info';
        const title = textV61('div', 'contact-name', room.name || 'Без названия');
        title.appendChild(textV61('span', 'room-type-badge', room.type === 'channel' ? 'канал' : 'группа'));
        info.append(title, textV61('div', 'contact-last', room.description || 'Пока без сообщений'));
        row.append(textV61('div', 'room-avatar', room.icon || '🌌'), info, textV61('div', 'contact-time', ''));
        row.onclick = () => openRoom(room);
        fragment.appendChild(row); total++;
      });
    }

    if (activeFilter === 'all') {
      const chats = [], seen = new Set();
      for (const message of payload?.messages || []) {
        const nick = peerV61(message.chat_key, String(me.nick).toLowerCase());
        if (!nick || seen.has(nick)) continue;
        seen.add(nick); chats.push({ nick, ts: Number(message.ts) || 0 });
      }
      if (chats.length) fragment.appendChild(textV61('div', 'list-section-title', 'Личные чаты'));
      chats.forEach(chat => {
        const user = users.get(chat.nick) || { nick: chat.nick, name: chat.nick, av: 0 };
        const row = document.createElement('div');
        row.className = `contact${currentChat === chat.nick && !currentRoom ? ' active' : ''}`;
        const avatar = textV61('div', `av${isOnline(user.last_seen) ? ' av-online' : ''}`, AVATARS[Number(user.av)] || AVATARS[0]);
        const info = document.createElement('div'); info.className = 'contact-info';
        info.append(textV61('div', 'contact-name', user.name || user.nick), textV61('div', 'contact-last', 'Сообщение'));
        row.append(avatar, info, textV61('div', 'contact-time', formatMsgTime(chat.ts)));
        row.onclick = () => openChat(chat.nick);
        fragment.appendChild(row); total++;
      });
    }

    if (!total) fragment.appendChild(textV61('div', 'sidebar-empty-v61', 'Диалогов пока нет'));
    list.replaceChildren(fragment);
    window.telechatReleaseBootV49?.();
    return true;
  }

  async function fetchV61() {
    const own = String(me?.nick || '').toLowerCase();
    if (!own) return false;
    const membershipTask = limitV61(sb.from('room_members').select('room_id,role').eq('user_nick', own));
    const messageTask = limitV61(sb.from('messages').select('chat_key,ts').eq('deleted', false).order('ts', { ascending: false }).limit(160));
    const [membership, messagesResult] = await Promise.all([membershipTask, messageTask]);
    const memberships = membership?.data || [];
    const ids = memberships.map(item => item.room_id).filter(Boolean);
    const roles = Object.fromEntries(memberships.map(item => [String(item.room_id), item.role || 'member']));
    const roomsResult = ids.length
      ? await limitV61(sb.from('rooms').select('id,name,type,icon,description,owner_nick,created_at').in('id', ids).order('created_at', { ascending: false }))
      : { data: [] };
    const rooms = (roomsResult?.data || []).map(room => ({ ...room, my_role: roles[String(room.id)] || 'member' }));
    const messages = messagesResult?.data || [];
    const peers = [...new Set(messages.map(message => peerV61(message.chat_key, own)).filter(Boolean))].slice(0, 80);
    const usersResult = peers.length
      ? await limitV61(sb.from('users').select('nick,name,av,last_seen').in('nick', peers))
      : { data: [] };
    const users = usersResult?.data || [];
    users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
    roomRows = rooms;
    roomsAvailable = !membership?.error;
    return { rooms, messages, users };
  }

  async function renderV61(force = false) {
    if (!me?.nick) return false;
    if (!force && cacheV61 && Date.now() - cacheAtV61 < CACHE_TTL_V61) return paintV61(cacheV61);
    if (inFlightV61) return inFlightV61;
    inFlightV61 = fetchV61().then(payload => {
      cacheV61 = payload; cacheAtV61 = Date.now();
      return paintV61(payload);
    }).catch(() => {
      if (cacheV61) return paintV61(cacheV61);
      const list = document.getElementById('contacts-list');
      if (list) list.replaceChildren(textV61('div', 'sidebar-empty-v61', 'Чаты пока не загрузились'));
      return false;
    }).finally(() => { inFlightV61 = null; });
    return inFlightV61;
  }

  window.telechatRenderSafeSidebarV61 = renderV61;
  window.renderContacts = () => renderV61(false);
  window.setSidebarFilter = async function(filter, button) {
    sidebarFilter = ['all', 'group', 'channel'].includes(filter) ? filter : 'all';
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === sidebarFilter));
    return renderV61(false);
  };
})();
