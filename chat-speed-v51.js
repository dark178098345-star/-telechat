/* TELECHAT CHAT SPEED V51 — 30-item pages, hot history cache and precise paints. */
(() => {
  'use strict';

  const PAGE_SIZE_V51 = 30;
  const MAX_CACHED_CHATS_V51 = 8;
  const PERSISTENT_DB_V72 = 'telechat-history-v72';
  const PERSISTENT_STORE_V72 = 'chats';
  const PERSISTENT_MAX_AGE_V72 = 21 * 24 * 60 * 60 * 1000;
  const PERSISTENT_MAX_BYTES_V72 = 3_000_000;
  const historyCacheV51 = new Map();
  const avatarMarkupCacheV51 = new WeakMap();
  let persistentDbV72 = null;
  let renderTokenV51 = 0;

  const appendMessageBeforeV51 = appendMessage;
  const renderMessagesFallbackV51 = renderMessages;
  const avatarMarkupBeforeV51 = avatarMarkup;
  const statusFreshAtV51 = new Map();
  const statusJobsV51 = new Map();

  function activeKeyV51() {
    try { return conversationKey() || ''; } catch (error) { return ''; }
  }

  function persistentKeyV72(key) {
    const nick = String(me?.nick || '').trim().toLowerCase();
    return nick && key ? `${nick}:${key}` : '';
  }

  function openPersistentDbV72() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (persistentDbV72) return persistentDbV72;
    persistentDbV72 = new Promise(resolve => {
      const request = indexedDB.open(PERSISTENT_DB_V72, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(PERSISTENT_STORE_V72)) {
          request.result.createObjectStore(PERSISTENT_STORE_V72, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return persistentDbV72;
  }

  async function readPersistentV72(key) {
    const id = persistentKeyV72(key);
    const database = id ? await openPersistentDbV72() : null;
    if (!database) return null;
    return new Promise(resolve => {
      const request = database.transaction(PERSISTENT_STORE_V72, 'readonly').objectStore(PERSISTENT_STORE_V72).get(id);
      request.onsuccess = () => {
        const record = request.result;
        if (!record || Date.now() - Number(record.updatedAt || 0) > PERSISTENT_MAX_AGE_V72) resolve(null);
        else resolve(record);
      };
      request.onerror = () => resolve(null);
    });
  }

  function compactPersistentItemsV72(items) {
    const result = [];
    let bytes = 0;
    for (let index = Math.max(0, (items || []).length - PAGE_SIZE_V51); index < (items || []).length; index++) {
      const item = items[index];
      if (!item) continue;
      let size = 0;
      try { size = JSON.stringify(item).length; } catch (error) { continue; }
      if (size > 900_000 || bytes + size > PERSISTENT_MAX_BYTES_V72) continue;
      bytes += size;result.push({ ...item });
    }
    return result;
  }

  async function writePersistentV72(state) {
    const id = persistentKeyV72(state?.key);
    const database = id ? await openPersistentDbV72() : null;
    if (!database || state?.disposed) return;
    const items = compactPersistentItemsV72(state.items);
    const record = {
      id,
      key: state.key,
      updatedAt: Date.now(),
      items,
      cursor: items.length ? Math.min(...items.map(item => Number(item.ts || 0))) : state.cursor,
      hasMore: Boolean(state.hasMore || state.items.length > items.length)
    };
    await new Promise(resolve => {
      const transaction = database.transaction(PERSISTENT_STORE_V72, 'readwrite');
      transaction.objectStore(PERSISTENT_STORE_V72).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
      transaction.onabort = resolve;
    });
  }

  async function deletePersistentV72(key) {
    const id = persistentKeyV72(key);
    const database = id ? await openPersistentDbV72() : null;
    if (!database) return;
    await new Promise(resolve => {
      const transaction = database.transaction(PERSISTENT_STORE_V72, 'readwrite');
      transaction.objectStore(PERSISTENT_STORE_V72).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
      transaction.onabort = resolve;
    });
  }

  function schedulePersistentV72(state, delay = 100) {
    if (!state || state.disposed) return;
    clearTimeout(state.persistTimer);
    state.persistTimer = setTimeout(() => {
      state.persistTimer = 0;
      writePersistentV72(state).catch(() => {});
    }, delay);
  }

  async function hydratePersistentV72(state) {
    if (!state || state.disposed || state.persistentChecked) return false;
    if (state.persistentLoading) return state.persistentLoading;
    state.persistentLoading = (async () => {
      const record = await readPersistentV72(state.key);
      state.persistentChecked = true;
      if (!record || state.disposed || state.key !== activeKeyV51()) return false;
      state.items = mergeItemsV51(record.items || [], state.items || []);
      state.cursor = Number.isFinite(Number(record.cursor)) ? Number(record.cursor) : (state.items.length ? Math.min(...state.items.map(item => Number(item.ts || 0))) : null);
      state.hasMore = Boolean(record.hasMore);
      state.touchedAt = Date.now();
      return true;
    })().catch(() => false).finally(() => { state.persistentLoading = null; });
    return state.persistentLoading;
  }

  function getStateV51(key) {
    let state = historyCacheV51.get(key);
    if (!state) {
      state = {
        key,
        items: [],
        cursor: null,
        hasMore: true,
        loading: null,
        painting: null,
        refreshTimer: 0,
        refreshWaiters: [],
        lastFetchedAt: 0,
        lastPaintAt: 0,
        persistentChecked: false,
        persistentLoading: null,
        persistTimer: 0,
        touchedAt: Date.now()
      };
      historyCacheV51.set(key, state);
    }
    state.touchedAt = Date.now();
    if (historyCacheV51.size > MAX_CACHED_CHATS_V51) {
      const oldest = [...historyCacheV51.values()]
        .filter(item => item.key !== key)
        .sort((a, b) => a.touchedAt - b.touchedAt)[0];
      if (oldest) historyCacheV51.delete(oldest.key);
    }
    return state;
  }

  function clearConversationV51(key = activeKeyV51()) {
    const normalizedKey = String(key || '');
    if (!normalizedKey) return false;
    const state = historyCacheV51.get(normalizedKey);
    if (state) {
      state.disposed = true;
      clearTimeout(state.refreshTimer);
      clearTimeout(state.persistTimer);
      state.refreshTimer = 0;
      state.refreshWaiters.splice(0).forEach(done => done(null));
    }
    historyCacheV51.delete(normalizedKey);
    deletePersistentV72(normalizedKey).catch(() => {});
    renderTokenV51++;
    if (normalizedKey === activeKeyV51()) {
      const box = document.getElementById('messages');
      if (box) {
        delete box.dataset.chatKeyV51;
        box.replaceChildren();
      }
    }
    return true;
  }

  function itemKeyV51(item) {
    const type = item._type === 'poll' ? 'poll' : 'msg';
    return `${type}:${item.id ?? `${item.from_nick || item.created_by || ''}:${item.ts || 0}`}`;
  }

  function compareItemsV51(a, b) {
    const time = Number(a?.ts || 0) - Number(b?.ts || 0);
    if (time) return time;
    const aKey = itemKeyV51(a || {});
    const bKey = itemKeyV51(b || {});
    return aKey.localeCompare(bKey, 'en', { numeric: true });
  }

  function mergeItemsV51(...groups) {
    const map = new Map();
    groups.flat().forEach(item => { if (item) map.set(itemKeyV51(item), item); });
    return [...map.values()].sort(compareItemsV51);
  }

  function shortContentMarkV51(value) {
    const text = String(value ?? '');
    return `${text.length}:${text.slice(0, 28)}:${text.slice(-28)}`;
  }

  function stateMarkV51(items) {
    return (items || []).map(item => {
      const poll = item._type === 'poll' ? JSON.stringify(item.votes || {}) : '';
      return `${itemKeyV51(item)}:${item.ts || 0}:${item.deleted ? 1 : 0}:${item.edited_at || 0}:${item.pinned ? 1 : 0}:${shortContentMarkV51(item.text || item.question || '')}:${poll}`;
    }).join('|');
  }

  function messageElementV51(message) {
    if (!message?.id) return null;
    return [...(document.getElementById('messages')?.querySelectorAll('.msg[data-id]') || [])]
      .find(element => String(element.dataset.id || '') === String(message.id)) || null;
  }

  function syncReadReceiptsV51(items) {
    if (!me?.nick) return;
    (items || []).forEach(item => {
      if (!item || item._type === 'poll' || item.from_nick !== me.nick) return;
      const check = messageElementV51(item)?.querySelector('.msg-check');
      if (!check) return;
      const readBy = Array.isArray(item.read_by) ? item.read_by : [];
      const isRead = currentRoom ? readBy.some(nick => nick !== me.nick) : !!currentChat && readBy.includes(currentChat);
      check.classList.toggle('read', isRead);
    });
  }

  function applyRealtimeUpdateV51(message) {
    const key = String(message?.chat_key || activeKeyV51());
    const state = key ? historyCacheV51.get(key) : null;
    if (!state || !message?.id) return true;
    const index = state.items.findIndex(item => item._type !== 'poll' && String(item.id || '') === String(message.id));
    if (index < 0) return true;
    const previous = state.items[index];
    const next = { ...previous, ...message, chat_key: key, _type: 'msg' };
    if (stateMarkV51([previous]) !== stateMarkV51([next])) return true;
    state.items = mergeItemsV51(state.items, next);
    if (key === activeKeyV51()) syncReadReceiptsV51(state.items);
    return false;
  }

  async function fetchPageV51(key, beforeTs) {
    let messagesQuery = sb.from('messages').select('*').eq('chat_key', key).order('ts', { ascending: false }).limit(PAGE_SIZE_V51);
    let pollsQuery = sb.from('polls').select('*').eq('chat_key', key).order('ts', { ascending: false }).limit(PAGE_SIZE_V51);
    if (Number.isFinite(beforeTs)) {
      messagesQuery = messagesQuery.lt('ts', beforeTs);
      pollsQuery = pollsQuery.lt('ts', beforeTs);
    }
    const [messagesResult, pollsResult] = await Promise.all([messagesQuery, pollsQuery]);
    if (messagesResult.error || pollsResult.error) throw messagesResult.error || pollsResult.error;
    const messages = (messagesResult.data || []).map(item => ({ ...item, _type: 'msg' }));
    const polls = (pollsResult.data || []).map(item => ({ ...item, _type: 'poll' }));
    const items = [...messages, ...polls]
      .sort((a, b) => compareItemsV51(b, a))
      .slice(0, PAGE_SIZE_V51)
      .sort(compareItemsV51);
    return {
      items,
      cursor: items.length ? Math.min(...items.map(item => Number(item.ts || 0))) : beforeTs,
      hasMore: messages.length === PAGE_SIZE_V51 || polls.length === PAGE_SIZE_V51
    };
  }

  async function warmUsersV51(items) {
    if (typeof window.batchUsersV15 !== 'function') return;
    const nicks = [...new Set((items || []).filter(item => item._type !== 'poll').map(item => item.from_nick).filter(Boolean))];
    if (nicks.length) await window.batchUsersV15(nicks);
  }

  async function paintStateV51(state, options = {}) {
    if (!state || state.disposed || state.key !== activeKeyV51()) return false;
    if (state.painting) return state.painting;
    state.painting = (async () => {
      const token = ++renderTokenV51;
      await warmUsersV51(state.items);
      if (state.disposed || token !== renderTokenV51 || state.key !== activeKeyV51()) return false;
      const box = document.getElementById('messages');
      if (!box) return false;
      box.classList.add('v51-painting');
      try {
        box.replaceChildren();
        box.dataset.chatKeyV51 = state.key;
        lastRenderedDate = '';
        if (!state.items.length) {
          box.innerHTML = '<div class="v51-empty-chat" style="text-align:center;padding:30px;font-size:13px;color:var(--text3)">Начни первым! 👋</div>';
        } else {
          for (const item of state.items) {
            if (token !== renderTokenV51 || state.key !== activeKeyV51()) return false;
            if (item._type === 'poll') renderPoll(item, box);
            else {
              const beforeCount = box.children.length;
              await appendMessageBeforeV51(item, false);
              [...box.children].slice(beforeCount).forEach(element => {
                if (element.classList?.contains('msg')) element.classList.add('v51-hydrated');
              });
            }
          }
        }
        state.lastPaintAt = Date.now();
        syncReadReceiptsV51(state.items);
        if (!options.keepScroll) scrollToBottom();
        return true;
      } finally {
        box.classList.remove('v51-painting');
      }
    })().finally(() => { state.painting = null; });
    return state.painting;
  }

  async function refreshLatestV51(state, repaint = true) {
    if (!state || state.disposed || state.loading) return state?.loading || null;
    state.loading = (async () => {
      const previousMark = stateMarkV51(state.items);
      const page = await fetchPageV51(state.key);
      if (state.disposed) return null;
      const oldestFresh = page.items.length ? page.cursor : Infinity;
      const older = page.items.length ? state.items.filter(item => Number(item.ts || 0) < oldestFresh) : [];
      state.items = mergeItemsV51(older, page.items);
      state.cursor = state.items.length ? Math.min(...state.items.map(item => Number(item.ts || 0))) : null;
      state.hasMore = page.hasMore;
      state.touchedAt = Date.now();
      state.lastFetchedAt = Date.now();
      schedulePersistentV72(state);
      if (repaint && state.key === activeKeyV51() && previousMark !== stateMarkV51(state.items)) {
        const box = document.getElementById('messages');
        const nearBottom = box ? box.scrollHeight - box.scrollTop - box.clientHeight < 90 : true;
        await paintStateV51(state, { keepScroll: !nearBottom });
      } else if (state.key === activeKeyV51()) syncReadReceiptsV51(state.items);
      return state;
    })().finally(() => { state.loading = null; });
    return state.loading;
  }

  function scheduleLatestV51(state, delay = 90) {
    if (!state || state.disposed) return Promise.resolve(null);
    return new Promise(resolve => {
      state.refreshWaiters.push(resolve);
      clearTimeout(state.refreshTimer);
      state.refreshTimer = setTimeout(() => {
        state.refreshTimer = 0;
        const waiters = state.refreshWaiters.splice(0);
        Promise.resolve(refreshLatestV51(state, true))
          .catch(() => null)
          .then(value => waiters.forEach(done => done(value)));
      }, delay);
    });
  }

  renderMessages = async function() {
    const key = activeKeyV51();
    if (!key) return;
    const state = getStateV51(key);
    if (state.items.length) {
      const box = document.getElementById('messages');
      const alreadyVisible = box?.dataset.chatKeyV51 === key;
      if (!alreadyVisible) await paintStateV51(state);
      scheduleLatestV51(state, alreadyVisible ? 90 : 40).catch(() => {});
      return;
    }
    const restored = await hydratePersistentV72(state);
    if (restored && state.key === activeKeyV51()) {
      await paintStateV51(state);
      scheduleLatestV51(state, 45).catch(() => {});
      return;
    }
    try {
      await refreshLatestV51(state, false);
      await paintStateV51(state);
    } catch (error) {
      historyCacheV51.delete(key);
      return renderMessagesFallbackV51();
    }
  };

  async function loadOlderV51() {
    const key = activeKeyV51();
    const state = historyCacheV51.get(key);
    const box = document.getElementById('messages');
    if (!key || !state || !box || !state.hasMore || state.loading || !Number.isFinite(state.cursor)) return;
    const oldHeight = box.scrollHeight;
    const oldTop = box.scrollTop;
    box.classList.add('v51-loading-older');
    state.loading = (async () => {
      const page = await fetchPageV51(key, state.cursor);
      if (key !== activeKeyV51()) return;
      state.items = mergeItemsV51(page.items, state.items);
      state.cursor = state.items.length ? Math.min(...state.items.map(item => Number(item.ts || 0))) : state.cursor;
      state.hasMore = page.hasMore;
      await paintStateV51(state, { keepScroll: true });
      schedulePersistentV72(state);
      await new Promise(resolve => requestAnimationFrame(resolve));
      box.scrollTop = oldTop + Math.max(0, box.scrollHeight - oldHeight);
    })().catch(() => {
      if (typeof showToast === 'function') showToast('Не удалось загрузить старые сообщения');
    }).finally(() => {
      state.loading = null;
      box.classList.remove('v51-loading-older');
    });
    return state.loading;
  }

  appendMessage = async function(message, doScroll = true) {
    if (!doScroll || !message) return appendMessageBeforeV51(message, doScroll);
    const key = String(message.chat_key || activeKeyV51());
    if (!key) return appendMessageBeforeV51(message, doScroll);

    const state = getStateV51(key);
    const normalized = { ...message, chat_key: key, _type: 'msg' };
    const normalizedKey = itemKeyV51(normalized);
    const existed = state.items.some(item => itemKeyV51(item) === normalizedKey) || !!messageElementV51(normalized);
    const previousLast = state.items[state.items.length - 1] || null;
    state.items = mergeItemsV51(state.items, normalized);
    state.cursor = state.items.length ? Math.min(...state.items.map(item => Number(item.ts || 0))) : state.cursor;
    schedulePersistentV72(state);
    if (existed) {
      syncReadReceiptsV51(state.items);
      return null;
    }

    if (key === activeKeyV51() && previousLast && compareItemsV51(normalized, previousLast) < 0) {
      await paintStateV51(state, { keepScroll: false });
      return null;
    }

    document.getElementById('messages')?.querySelector('.v51-empty-chat')?.remove();
    return appendMessageBeforeV51(message, doScroll);
  };

  avatarMarkup = function(user) {
    if (!user || typeof user !== 'object') return avatarMarkupBeforeV51(user);
    const cached = avatarMarkupCacheV51.get(user);
    if (cached && cached.av === user.av && cached.status === user.status && cached.video === user.avatar_video && cached.animated === user.animated_profile) return cached.markup;
    const markup = avatarMarkupBeforeV51(user);
    avatarMarkupCacheV51.set(user, { av: user.av, status: user.status, video: user.avatar_video, animated: user.animated_profile, markup });
    return markup;
  };

  function paintPrivateStatusV51(nick, lastSeen) {
    if (currentRoom || currentChat !== nick) return;
    const element = document.getElementById('chat-status-text');
    if (!element || element.classList.contains('typing')) return;
    const online = isOnline(lastSeen);
    const avatar = document.getElementById('chat-av');
    element.textContent = formatLastSeen(lastSeen);
    element.className = `chat-status-text ${online ? 'online' : 'offline'}`;
    avatar?.classList.toggle('av-online', online);
  }

  function paintRoomStatusV51(room, count) {
    if (!currentRoom || String(currentRoom.id) !== String(room.id)) return;
    const element = document.getElementById('chat-status-text');
    if (!element || element.classList.contains('typing')) return;
    const countPart = Number.isFinite(count) ? ` · ${count || 1} участников` : '';
    element.className = 'chat-status-text offline';
    element.textContent = `${room.type === 'channel' ? 'канал' : 'группа'}${countPart} · ${normalizedRoomVisibility(room) === 'public' ? 'общая' : 'приватная'}`;
  }

  updateStatusBar = function() {
    if (document.hidden) return Promise.resolve();
    const room = currentRoom ? { ...currentRoom } : null;
    const nick = room ? '' : String(currentChat || '').toLowerCase();
    const key = room ? `room_${room.id}` : nick;
    if (!key) return Promise.resolve();

    if (room) paintRoomStatusV51(room, room._memberCountV51);
    else if (userCache[nick]) paintPrivateStatusV51(nick, userCache[nick].last_seen);

    if (statusJobsV51.has(key) || Date.now() - (statusFreshAtV51.get(key) || 0) < 12000) return Promise.resolve();
    const job = (async () => {
      if (room) {
        const result = await sb.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id);
        if (!result.error) {
          const count = result.count || 1;
          if (currentRoom && String(currentRoom.id) === String(room.id)) currentRoom._memberCountV51 = count;
          paintRoomStatusV51(room, count);
        }
      } else {
        const result = await sb.from('users').select('last_seen').eq('nick', nick).maybeSingle();
        if (!result.error && result.data) {
          userCache[nick] = { ...(userCache[nick] || { nick }), last_seen: result.data.last_seen };
          paintPrivateStatusV51(nick, result.data.last_seen);
        }
      }
      statusFreshAtV51.set(key, Date.now());
    })().catch(() => {}).finally(() => statusJobsV51.delete(key));
    statusJobsV51.set(key, job);
    return Promise.resolve();
  };

  const markAsReadInFlightV51 = new Map();
  markAsRead = function() {
    const key = activeKeyV51();
    if (!key || markAsReadInFlightV51.has(key)) return Promise.resolve();
    const job = (async () => {
      const result = await sb.from('messages').select('id,read_by').eq('chat_key', key).neq('from_nick', me.nick).order('ts', { ascending: false }).limit(80);
      if (result.error) return;
      const pending = (result.data || []).filter(message => !(message.read_by || []).includes(me.nick));
      const groups = new Map();
      pending.forEach(message => {
        const readBy = [...new Set([...(message.read_by || []), me.nick])].sort();
        const groupKey = JSON.stringify(readBy);
        if (!groups.has(groupKey)) groups.set(groupKey, { readBy, ids: [] });
        groups.get(groupKey).ids.push(message.id);
      });
      for (const group of groups.values()) {
        for (let start = 0; start < group.ids.length; start += 50) {
          await sb.from('messages').update({ read_by: group.readBy }).in('id', group.ids.slice(start, start + 50));
        }
      }
    })().catch(() => {}).finally(() => markAsReadInFlightV51.delete(key));
    markAsReadInFlightV51.set(key, job);
    return Promise.resolve();
  };

  const messagesBoxV51 = document.getElementById('messages');
  if (messagesBoxV51) {
    let historyIntentAtV51 = 0;
    const allowHistoryV51 = () => { historyIntentAtV51 = Date.now(); };
    messagesBoxV51.addEventListener('wheel', event => { if (event.deltaY < 0) allowHistoryV51(); }, { passive: true });
    messagesBoxV51.addEventListener('touchstart', allowHistoryV51, { passive: true });
    messagesBoxV51.addEventListener('pointerdown', allowHistoryV51, { passive: true });
    messagesBoxV51.addEventListener('keydown', event => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) allowHistoryV51();
    });
    messagesBoxV51.addEventListener('scroll', () => {
      if (Date.now() - historyIntentAtV51 < 1400 && messagesBoxV51.scrollTop < 90) loadOlderV51();
    }, { passive: true });
  }

  window.telechatChatSpeedV51 = {
    loadOlder: loadOlderV51,
    clearConversation: clearConversationV51,
    syncReadReceipts: syncReadReceiptsV51,
    applyRealtimeUpdate: applyRealtimeUpdateV51,
    acceptSent: message => {
      const key = String(message?.chat_key || '');
      if (!key || !message) return false;
      const state = getStateV51(key);
      state.items = state.items.filter(item => !(
        item?._type !== 'poll' && !item?.id &&
        String(item?.from_nick || '').toLowerCase() === String(message.from_nick || '').toLowerCase() &&
        Number(item?.ts || 0) === Number(message.ts || 0)
      ));
      state.items = mergeItemsV51(state.items, { ...message, chat_key: key, _type: 'msg' });
      state.cursor = state.items.length ? Math.min(...state.items.map(item => Number(item.ts || 0))) : state.cursor;
      schedulePersistentV72(state, 20);
      return true;
    },
    refreshActive: () => {
      const key = activeKeyV51();
      return key ? scheduleLatestV51(getStateV51(key), 35) : Promise.resolve(null);
    },
    info: () => ({
      pageSize: PAGE_SIZE_V51,
      cachedChats: historyCacheV51.size,
      persistent: 'indexedDB' in window,
      chats: [...historyCacheV51.values()].map(state => ({ key: state.key, items: state.items.length, hasMore: state.hasMore }))
    })
  };
})();
