/* TELECHAT LOGIN SIDEBAR V60
   Used only once after sign-in. It shows a light chat list without downloading
   message media, then leaves every normal chat/button function untouched. */
(() => {
  'use strict';

  let runningV60 = null;
  const withinV60 = (task, ms = 8500) => Promise.race([
    Promise.resolve(task),
    new Promise((_, reject) => setTimeout(() => reject(new Error('LOGIN_SIDEBAR_TIMEOUT')), ms))
  ]);
  const peerV60 = (key, own) => {
    const value = String(key || ''), start = `${own}_`, end = `_${own}`;
    return value.startsWith(start) ? value.slice(start.length) : value.endsWith(end) ? value.slice(0, -end.length) : '';
  };
  const textV60 = (tag, className, value) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  };

  function drawV60(messages, users) {
    const list = document.getElementById('contacts-list');
    if (!list || !me) return false;
    const userByNick = new Map((users || []).map(user => [String(user.nick).toLowerCase(), user]));
    const fragment = document.createDocumentFragment();
    let count = 0;
    const rooms = (roomRows || []).filter(room => sidebarFilter === 'all' || room.type === sidebarFilter);

    if (rooms.length) {
      fragment.appendChild(textV60('div', 'list-section-title', sidebarFilter === 'channel' ? 'Каналы' : sidebarFilter === 'group' ? 'Группы' : 'Пространства'));
      rooms.forEach(room => {
        const item = document.createElement('div');
        item.className = `contact${currentRoom && String(currentRoom.id) === String(room.id) ? ' active' : ''}`;
        const info = document.createElement('div'); info.className = 'contact-info';
        const title = textV60('div', 'contact-name', room.name || 'Без названия');
        title.appendChild(textV60('span', 'room-type-badge', room.type === 'channel' ? 'канал' : 'группа'));
        info.append(title, textV60('div', 'contact-last', room.description || 'Пока без сообщений'));
        item.append(textV60('div', 'room-avatar', room.icon || '🌌'), info, textV60('div', 'contact-time', ''));
        item.onclick = () => openRoom(room);
        fragment.appendChild(item); count++;
      });
    }

    if (sidebarFilter === 'all') {
      const chats = [], seen = new Set();
      for (const message of messages || []) {
        const nick = peerV60(message.chat_key, me.nick);
        if (!nick || seen.has(nick)) continue;
        seen.add(nick); chats.push({ nick, ts: Number(message.ts) || 0 });
      }
      if (chats.length) fragment.appendChild(textV60('div', 'list-section-title', 'Личные чаты'));
      chats.forEach(chat => {
        const user = userByNick.get(chat.nick) || { nick: chat.nick, name: chat.nick, av: 0 };
        const item = document.createElement('div');
        item.className = `contact${currentChat === chat.nick && !currentRoom ? ' active' : ''}`;
        const avatar = textV60('div', `av${isOnline(user.last_seen) ? ' av-online' : ''}`, AVATARS[Number(user.av)] || AVATARS[0]);
        const info = document.createElement('div'); info.className = 'contact-info';
        info.append(textV60('div', 'contact-name', user.name || user.nick), textV60('div', 'contact-last', 'Сообщение'));
        item.append(avatar, info, textV60('div', 'contact-time', formatMsgTime(chat.ts)));
        item.onclick = () => openChat(chat.nick);
        fragment.appendChild(item); count++;
      });
    }

    if (!count) fragment.appendChild(textV60('div', 'sidebar-empty-v60', 'Диалогов пока нет'));
    list.replaceChildren(fragment);
    window.telechatReleaseBootV49?.();
    return true;
  }

  async function loadV60() {
    if (!me?.nick) return false;
    const ownNick = String(me.nick).toLowerCase();
    const [rooms, messageResult] = await Promise.all([
      withinV60(Promise.resolve(loadMyRooms?.()).catch(() => [])),
      withinV60(sb.from('messages').select('chat_key,ts').eq('deleted', false).order('ts', { ascending: false }).limit(240))
    ]);
    if (Array.isArray(rooms)) roomRows = rooms;
    const messages = messageResult?.data || [];
    const peers = [...new Set(messages.map(message => peerV60(message.chat_key, ownNick)).filter(Boolean))];
    const userResult = peers.length
      ? await withinV60(sb.from('users').select('nick,name,av,last_seen').in('nick', peers.slice(0, 100)))
      : { data: [] };
    const users = userResult?.data || [];
    users.forEach(user => { userCache[user.nick] = { ...(userCache[user.nick] || {}), ...user }; });
    return drawV60(messages, users);
  }

  window.telechatRenderLoginSidebarV60 = function () {
    if (runningV60) return runningV60;
    runningV60 = loadV60().catch(() => false).finally(() => { runningV60 = null; });
    return runningV60;
  };
})();
