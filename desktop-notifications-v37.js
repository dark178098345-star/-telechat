/* TELECHAT DESKTOP BACKGROUND NOTIFICATIONS V37 */
(() => {
  'use strict';

  const desktop = window.telechatDesktop;
  if (!desktop?.isDesktop) return;

  let activeNickV37 = '';
  let messageChannelV37 = null;
  let membershipChannelV37 = null;
  let membershipTimerV37 = 0;
  let sessionGenerationV214 = 0;
  let membershipFlightV214 = null;
  let membershipAgainV214 = false;
  const membershipReadsV214 = new Set();
  let roomIdsV37 = new Set();
  let roomNamesV37 = new Map();
  const seenMessageIdsV37 = new Set();

  function currentNickV37() {
    try { return String(me?.nick || '').trim().toLowerCase(); } catch (error) { return ''; }
  }

  function currentSessionV214(nick, generation) {
    return nick === activeNickV37 && nick === currentNickV37() && generation === sessionGenerationV214;
  }

  async function membershipReadV214(query) {
    const controller = new AbortController();
    membershipReadsV214.add(controller);
    if (query.abortSignal) query = query.abortSignal(controller.signal);
    let timer;
    try {
      return await Promise.race([query, new Promise((_, reject) => {
        timer = setTimeout(() => { reject(Error('Membership request timed out')); controller.abort(); }, 8000);
        controller.signal.addEventListener('abort', () => reject(Error('Membership request cancelled')), { once: true });
      })]);
    } finally {
      clearTimeout(timer);
      membershipReadsV214.delete(controller);
    }
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

  function refreshMembershipsV37() {
    const nick = currentNickV37(), generation = sessionGenerationV214;
    if (!nick || !currentSessionV214(nick, generation)) return Promise.resolve();
    if (membershipFlightV214) { membershipAgainV214 = true; return membershipFlightV214.promise; }
    const job = { generation, promise: null };
    job.promise = (async () => {
      try {
        const membershipResult = await membershipReadV214(sb.from('room_members').select('room_id').eq('user_nick', nick));
        if (membershipResult.error || !currentSessionV214(nick, generation)) return;
        const ids = Array.from(new Set((membershipResult.data || []).map(row => String(row.room_id))));
        const names = new Map(ids.filter(id => roomNamesV37.has(id)).map(id => [id, roomNamesV37.get(id)]));
        if (ids.length) {
          const roomResult = await membershipReadV214(sb.from('rooms').select('id,name').in('id', ids));
          if (!currentSessionV214(nick, generation)) return;
          if (!roomResult.error) (roomResult.data || []).forEach(room => names.set(String(room.id), String(room.name || 'Пространство')));
        }
        if (!currentSessionV214(nick, generation)) return;
        roomIdsV37 = new Set(ids);
        roomNamesV37 = names;
      } catch (_) { /* Keep the last confirmed memberships while offline. */ }
    })().finally(() => {
      if (membershipFlightV214 !== job) return;
      membershipFlightV214 = null;
      if (membershipAgainV214 && currentSessionV214(nick, generation)) {
        membershipAgainV214 = false;
        refreshMembershipsV37();
      }
    });
    membershipFlightV214 = job;
    return job.promise;
  }

  async function notifyIncomingV37(message) {
    const nick = currentNickV37();
    const generation = sessionGenerationV214;
    if (!nick || nick !== activeNickV37 || !message || message.deleted || message.from_nick === nick || !rememberMessageV37(message.id) || window.telechatComfortV167?.isQuiet()) return;
    const key = String(message.chat_key || '');
    const roomId = roomIdFromKeyV37(key);
    const peer = directPeerV37(key, nick);
    if (!peer && (!roomId || !roomIdsV37.has(roomId))) return;
    if (peer && window.telechatIsBlockedV74?.(peer)) return;
    if (peer && window.telechatShouldSilenceV74?.(peer)) return;

    try { window.telechatPlaySoundV53?.('incoming', {chatKey:key}); } catch (error) {}

    let senderName = String(message.from_nick || 'Новое сообщение');
    try {
      const sender = await getUser(message.from_nick);
      if (sender?.name) senderName = sender.name;
    } catch (error) {}

    const roomName = roomId ? roomNamesV37.get(roomId) : '';
    if (!currentSessionV214(nick, generation) || window.telechatComfortV167?.isQuiet()) return;
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
    sessionGenerationV214++;
    for (const controller of membershipReadsV214) controller.abort();
    membershipFlightV214 = null;
    membershipAgainV214 = false;
    for (const channel of [messageChannelV37, membershipChannelV37]) if (channel) Promise.resolve().then(() => sb.removeChannel(channel)).catch(() => {});
    messageChannelV37 = null;
    membershipChannelV37 = null;
    clearInterval(membershipTimerV37);
    membershipTimerV37 = 0;
    roomIdsV37 = new Set();
    roomNamesV37 = new Map();
    seenMessageIdsV37.clear();
  }

  function startSubscriptionsV37(nick) {
    stopSubscriptionsV37();
    activeNickV37 = nick;
    const generation = sessionGenerationV214;
    refreshMembershipsV37();

    messageChannelV37 = sb.channel(`desktop-messages-v37-${nick}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => { if (currentSessionV214(nick, generation)) notifyIncomingV37(payload.new); })
      .subscribe();

    membershipChannelV37 = sb.channel(`desktop-memberships-v37-${nick}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `user_nick=eq.${nick}` }, () => { if (currentSessionV214(nick, generation)) refreshMembershipsV37(); })
      .subscribe();

    membershipTimerV37 = setInterval(refreshMembershipsV37, 60000);
  }

  function updateDesktopPushUiV37() {
    const button = document.getElementById('push-btn');
    if (!button || button.dataset.desktopPushReadyV214 === 'true') return;
    button.dataset.desktopPushReadyV214 = 'true';
    button.textContent = '✅ Работают в фоне';
    button.style.color = 'var(--green)';
    button.title = 'После закрытия окна ExstraChat остаётся в системном трее';
  }

  try {
    sendPushNotification = function() {};
    requestPush = async function() {
      updateDesktopPushUiV37();
      showToast('Уведомления Windows уже работают в фоне 🔔');
    };
  } catch (error) {}

  desktop.onNotificationActivated?.(async payload => {
    const nick = currentNickV37(), generation = sessionGenerationV214;
    if (!payload || !nick) return;
    try {
      if (payload.roomId) {
        const result = await sb.from('rooms').select('*').eq('id', payload.roomId).maybeSingle();
        if (result.data && currentSessionV214(nick, generation)) await openRoom(result.data);
      } else if (payload.senderNick) {
        await openChat(payload.senderNick);
      }
    } catch (error) {}
  });

  function syncAccountV214(force = false) {
    updateDesktopPushUiV37();
    const nick = currentNickV37();
    if (!force && nick === activeNickV37) return;
    if (!nick) {
      activeNickV37 = '';
      stopSubscriptionsV37();
      return;
    }
    startSubscriptionsV37(nick);
  }

  window.addEventListener('telechat-account-ready-v175', () => syncAccountV214(true));
  window.addEventListener('pageshow', () => syncAccountV214());
  window.addEventListener('pagehide', () => { activeNickV37 = ''; stopSubscriptionsV37(); });
  const accountObserverV214 = new MutationObserver(() => syncAccountV214());
  for (const id of ['auth-screen', 'chat-screen']) {
    const screen = document.getElementById(id);
    if (screen) accountObserverV214.observe(screen, { attributes: true, attributeFilter: ['class'] });
  }
  syncAccountV214();
})();
