/* TELECHAT DESKTOP BACKGROUND NOTIFICATIONS V37 */
(() => {
  'use strict';

  const desktop = window.telechatDesktop;
  if (!desktop?.isDesktop) return;

  let activeNickV37 = '';
  let messageChannelV37 = null;
  let membershipChannelV37 = null;
  let membershipTimerV37 = 0;
  let roomIdsV37 = new Set();
  let roomNamesV37 = new Map();
  const seenMessageIdsV37 = new Set();

  function currentNickV37() {
    try { return String(me?.nick || '').trim().toLowerCase(); } catch (error) { return ''; }
  }

  function directPeerV37(key, nick) {
    const value = String(key || '');
    if (!value || value.startsWith('room_') || !nick) return '';
    const start = nick + '_';
    const end = '_' + nick;
    if (value.startsWith(start)) return value.slice(start.length);
    if (value.endsWith(end)) return value.slice(0, -end.length);
    return '';
  }

  function roomIdFromKeyV37(key) {
    const value = String(key || '');
    return value.startsWith('room_') ? value.slice(5) : '';
  }

  function messageBodyV37(text) {
    try {
      return String(messagePreviewText(text) || 'Новое сообщение').replace(/\s+/g, ' ').trim().slice(0, 150);
    } catch (error) {
      return 'Новое сообщение';
    }
  }

  function rememberMessageV37(id) {
    if (!id) return true;
    const key = String(id);
    if (seenMessageIdsV37.has(key)) return false;
    seenMessageIdsV37.add(key);
    if (seenMessageIdsV37.size > 500) {
      const first = seenMessageIdsV37.values().next().value;
      seenMessageIdsV37.delete(first);
    }
    return true;
  }

  async function refreshMembershipsV37() {
    const nick = currentNickV37();
    if (!nick || nick !== activeNickV37) return;
    const membershipResult = await sb.from('room_members').select('room_id').eq('user_nick', nick);
    if (membershipResult.error) return;
    const ids = Array.from(new Set((membershipResult.data || []).map(row => String(row.room_id))));
    roomIdsV37 = new Set(ids);
    roomNamesV37 = new Map();
    if (!ids.length) return;
    const roomResult = await sb.from('rooms').select('id,name').in('id', ids);
    (roomResult.data || []).forEach(room => roomNamesV37.set(String(room.id), String(room.name || 'Пространство')));
  }

  async function notifyIncomingV37(message) {
    const nick = currentNickV37();
    if (!nick || nick !== activeNickV37 || !message || message.deleted || message.from_nick === nick || !rememberMessageV37(message.id)) return;
    const key = String(message.chat_key || '');
    const roomId = roomIdFromKeyV37(key);
    const peer = directPeerV37(key, nick);
    if (!peer && (!roomId || !roomIdsV37.has(roomId))) return;

    let senderName = String(message.from_nick || 'Новое сообщение');
    try {
      const sender = await getUser(message.from_nick);
      if (sender?.name) senderName = sender.name;
    } catch (error) {}

    const roomName = roomId ? roomNamesV37.get(roomId) : '';
    desktop.notify({
      id: String(message.id || `${message.from_nick}:${message.ts || Date.now()}`),
      title: roomName ? `${roomName} · ${senderName}` : senderName,
      body: messageBodyV37(message.text),
      senderNick: String(message.from_nick || ''),
      roomId,
      chatKey: key
    });
  }

  function stopSubscriptionsV37() {
    if (messageChannelV37) sb.removeChannel(messageChannelV37);
    if (membershipChannelV37) sb.removeChannel(membershipChannelV37);
    messageChannelV37 = null;
    membershipChannelV37 = null;
    clearInterval(membershipTimerV37);
    membershipTimerV37 = 0;
    roomIdsV37 = new Set();
    roomNamesV37 = new Map();
    seenMessageIdsV37.clear();
  }

  async function startSubscriptionsV37(nick) {
    stopSubscriptionsV37();
    activeNickV37 = nick;
    await refreshMembershipsV37();
    if (currentNickV37() !== nick) return;

    messageChannelV37 = sb.channel(`desktop-messages-v37-${nick}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => notifyIncomingV37(payload.new))
      .subscribe();

    membershipChannelV37 = sb.channel(`desktop-memberships-v37-${nick}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `user_nick=eq.${nick}` }, refreshMembershipsV37)
      .subscribe();

    membershipTimerV37 = setInterval(refreshMembershipsV37, 60000);
  }

  function updateDesktopPushUiV37() {
    const button = document.getElementById('push-btn');
    if (!button) return;
    button.textContent = '✅ Работают в фоне';
    button.style.color = 'var(--green)';
    button.title = 'После закрытия окна tele.chat остаётся в системном трее';
  }

  try {
    sendPushNotification = function() {};
    requestPush = async function() {
      updateDesktopPushUiV37();
      showToast('Уведомления Windows уже работают в фоне 🔔');
    };
  } catch (error) {}

  desktop.onNotificationActivated?.(async payload => {
    if (!payload || !currentNickV37()) return;
    try {
      if (payload.roomId) {
        const result = await sb.from('rooms').select('*').eq('id', payload.roomId).maybeSingle();
        if (result.data) await openRoom(result.data);
      } else if (payload.senderNick) {
        await openChat(payload.senderNick);
      }
    } catch (error) {}
  });

  setInterval(() => {
    updateDesktopPushUiV37();
    const nick = currentNickV37();
    if (nick === activeNickV37) return;
    if (!nick) {
      activeNickV37 = '';
      stopSubscriptionsV37();
      return;
    }
    startSubscriptionsV37(nick);
  }, 900);

  updateDesktopPushUiV37();
})();
