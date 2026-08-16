/* TELECHAT CHAT FLOW V64 — one realtime event, one visual update. */
(() => {
  'use strict';

  let readTimerV64 = 0;
  let scrollFrameV64 = 0;
  let scrollSettleV64 = 0;

  function activeKeyV64() {
    try { return conversationKey() || ''; } catch (error) { return ''; }
  }

  function scheduleReadV64(key) {
    clearTimeout(readTimerV64);
    readTimerV64 = setTimeout(() => {
      if (key === activeKeyV64() && typeof markAsRead === 'function') {
        Promise.resolve(markAsRead()).catch(() => {});
      }
    }, 90);
  }

  function refreshActiveV64() {
    const speed = window.telechatChatSpeedV51;
    if (typeof speed?.refreshActive === 'function') return speed.refreshActive();
    return typeof renderMessages === 'function' ? renderMessages() : Promise.resolve();
  }

  /* The old routine repainted the full history for every read receipt. Realtime
     now updates only the ticks and fetches history only for actual content edits. */
  window.subscribeRealtime = function() {
    if (msgSub) sb.removeChannel(msgSub);
    const key = activeKeyV64();
    if (!key) return;

    msgSub = sb.channel(`rt-v64-${key}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_key=eq.${key}` }, async payload => {
        const message = payload.new || {};
        if (key !== activeKeyV64() || message.from_nick === me.nick || message.deleted) return;
        await appendMessage(message);
        Promise.resolve(renderContacts()).catch(() => {});
        playPing();
        const user = await getUser(message.from_nick);
        sendPushNotification(
          currentRoom ? currentRoom.name : (user?.name || 'Новое сообщение'),
          messagePreviewText(message.text).substring(0, 80)
        );
        scheduleReadV64(key);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_key=eq.${key}` }, payload => {
        if (key !== activeKeyV64()) return;
        const needsContentRefresh = window.telechatChatSpeedV51?.applyRealtimeUpdate?.(payload.new || {}) ?? true;
        if (needsContentRefresh) Promise.resolve(refreshActiveV64()).catch(() => {});
      })
      .subscribe();

    if (pollSub) sb.removeChannel(pollSub);
    pollSub = sb.channel(`polls-v64-${key}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `chat_key=eq.${key}` }, () => {
        if (key === activeKeyV64()) Promise.resolve(refreshActiveV64()).catch(() => {});
      })
      .subscribe();
  };

  /* One frame-aligned scroll replaces the old pair of delayed jumps. A small
     settle pass is kept for photos/voice cards that finish layout asynchronously. */
  window.scrollToBottom = function() {
    const box = document.getElementById('messages');
    if (!box) return;
    cancelAnimationFrame(scrollFrameV64);
    clearTimeout(scrollSettleV64);
    scrollFrameV64 = requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
      scrollSettleV64 = setTimeout(() => {
        if (box.scrollHeight - box.scrollTop - box.clientHeight < 180) box.scrollTop = box.scrollHeight;
      }, 140);
    });
  };

  window.telechatChatFlowV64 = {
    refresh: refreshActiveV64,
    activeKey: activeKeyV64
  };
})();
