/* TELECHAT SIDEBAR SAFE V59
   Never download photo, voice or video payloads just to draw the sidebar.
   Media lives in message text, so reading it on boot could freeze the whole UI. */
(() => {
  'use strict';

  let sidebarRunV59 = 0;
  let sidebarBusyV59 = null;

  const waitV59 = (task, ms = 8500) => Promise.race([
    Promise.resolve(task),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SIDEBAR_TIMEOUT_V59')), ms))
  ]);

  function peerV59(key, ownNick) {
    const value = String(key || '');
    const start = `${ownNick}_`, end = `_${ownNick}`;
    if (value.startsWith(start)) return value.slice(start.length);
    if (value.endsWith(end)) return value.slice(0, -end.length);
    return '';
  }

  function avatarV59(user) {
    const avatar = document.createElement('div');
    avatar.className = `av${isOnline(user?.last_seen) ? ' av-online' : ''}`;
    avatar.textContent = AVATARS[Number(user?.av)] || AVATARS[0];
    return avatar;
  }

  function copyV59(tag, className, value) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  }

  function roomContactV59(room) {
    const item = document.createElement('div');
    item.className = `contact${currentRoom && String(currentRoom.id) === String(room.id) ? ' active' : ''}`;
    const icon = copyV59('div', 'room-avatar', room.icon || '🌌');
    const info = document.createElement('div');
    info.className = 'contact-info';
    const title = copyV59('div', 'contact-name', room.name || 'Без названия');
    const badge = copyV59('span', 'room-type-badge', room.type === 'channel' ? 'канал' : 'группа');
    title.appendChild(badge);
    info.append(title, copyV59('div', 'contact-last', room.description || 'Пока без сообщений'));
    item.append(icon, info, copyV59('div', 'contact-time', ''));
    item.onclick = () => openRoom(room);
    return item;
  }

  function chatContactV59(chat, user) {
    const item = document.createElement('div');
    item.className = `contact${currentChat === chat.nick && !currentRoom ? ' active' : ''}`;
    const info = document.createElement('div');
    info.className = 'contact-info';
    info.append(
      copyV59('div', 'contact-name', user?.name || chat.nick),
      copyV59('div', 'contact-last', 'Сообщение')
    );
    item.append(avatarV59(user), info, copyV59('div', 'contact-time', formatMsgTime(chat.ts)));
    item.onclick = () => openChat(chat.nick);
    return item;
  }

  function paintV59(messages, users) {
    const list = document.getElementById('contacts-list');
    if (!list || !me) return false;
    const usersByNick = new Map((users || []).map(user => [String(user.nick).toLowerCase(), user]));
    const fragment = document.createDocumentFragment();
    let rendered = 0;
    const rooms = (roomRows || []).filter(room => sidebarFilter === 'all' || room.type === sidebarFilter);

    if (rooms.length) {
      fragment.appendChild(copyV59('div', 'list-section-title', sidebarFilter === 'channel' ? 'Каналы' : sidebarFilter === 'group' ? 'Группы' : 'Пространства'));
      rooms.forEach(room => { fragment.appendChild(roomContactV59(room)); rendered++; });
    }

    if (sidebarFilter === 'all') {
      const chats = [];
      const seen = new Set();
      for (const message of messages || []) {
        const other = peerV59(message.chat_key, me.nick);
        if (!other || seen.has(other)) continue;
        seen.add(other);
        chats.push({ nick: other, ts: Number(message.ts) || 0 });
      }
      if (chats.length) fragment.appendChild(copyV59('div', 'list-section-title', 'Личные чаты'));
      chats.forEach(chat => {
        fragment.appendChild(chatContactV59(chat, usersByNick.get(chat.nick)));
        rendered++;
      });
    }

    if (!rendered) fragment.appendChild(copyV59('div', 'sidebar-empty-v59', 'Диалогов пока нет'));
    list.replaceChildren(fragment);
    window.telechatReleaseBootV49?.();
    return true;
  }

  async function runV59() {
    if (!me?.nick) return false;
    const run = ++sidebarRunV59;
    const ownNick = String(me.nick).toLowerCase();
    const roomsTask = Promise.resolve(loadMyRooms?.()).catch(() => []);
    const messagesTask = sb.from('messages')
      .select('chat_key,ts')
      .eq('deleted', false)
      .order('ts', { ascending: false })
      .limit(240);
    const [rooms, messageResult] = await Promise.all([waitV59(roomsTask), waitV59(messagesTask)]);
    if (run !== sidebarRunV59) return false;
    if (Array.isArray(rooms)) roomRows = rooms;
    const messages = messageResult?.data || [];
    const peers = [...new Set(messages.map(message => peerV59(message.chat_key, ownNick)).filter(Boolean))];
    let users = [];
    if (peers.length) {
      const result = await waitV59(sb.from('users').select('nick,name,av,last_seen').in('nick', peers.slice(0, 100)));
      users = result?.data || [];
      users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
    }
    if (run !== sidebarRunV59) return false;
    return paintV59(messages, users);
  }

  window.telechatRenderSafeSidebarV59 = function () {
    if (sidebarBusyV59) return sidebarBusyV59;
    sidebarBusyV59 = runV59().catch(() => {
      const list = document.getElementById('contacts-list');
      if (list) list.replaceChildren(copyV59('div', 'sidebar-empty-v59', 'Чаты загружаются…'));
      return false;
    }).finally(() => { sidebarBusyV59 = null; });
    return sidebarBusyV59;
  };

  renderContacts = window.telechatRenderSafeSidebarV59;
})();
