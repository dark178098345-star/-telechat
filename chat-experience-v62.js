/* TELECHAT CHAT EXPERIENCE V62 — motion, unread mentions, per-chat drafts and lazy media. */
(() => {
  'use strict';

  const VERSION_V62 = 62;
  const MAX_UNREAD_SCAN_V62 = 1200;
  const reducedMotionV62 = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unreadV62 = new Map();
  const seenRealtimeV62 = new Set();
  const animatedModalsV62 = new WeakSet();
  let draftsV62 = {};
  let activeNickV62 = '';
  let unreadChannelV62 = null;
  let unreadRefreshV62 = null;
  let sidebarPaintTimerV62 = 0;
  let draftSaveTimerV62 = 0;
  let startedV62 = false;

  const inputV62 = document.getElementById('msg-input');
  const contactsV62 = document.getElementById('contacts-list');
  const messagesV62 = document.getElementById('messages');

  function currentNickV62() {
    try { return String(me?.nick || '').toLowerCase(); } catch (error) { return ''; }
  }

  function activeKeyV62() {
    try { return conversationKey() || ''; } catch (error) { return ''; }
  }

  function storageKeyV62(kind) {
    return `telechat.${kind}.v62.${currentNickV62() || 'guest'}`;
  }

  function safeJsonReadV62(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch (error) { return fallback; }
  }

  function compactUnreadStateV62() {
    const value = {};
    unreadV62.forEach((entry, key) => {
      if (entry.count > 0) value[key] = { count: Math.min(999, entry.count), mentions: Math.min(99, entry.mentions || 0), at: entry.at || 0 };
    });
    return value;
  }

  function persistUnreadV62() {
    if (!currentNickV62()) return;
    try { localStorage.setItem(storageKeyV62('unread'), JSON.stringify({ version: VERSION_V62, items: compactUnreadStateV62() })); } catch (error) {}
  }

  function hydrateUnreadV62() {
    unreadV62.clear();
    const stored = safeJsonReadV62(storageKeyV62('unread'), {});
    if (stored.version !== VERSION_V62 || !stored.items) return;
    Object.entries(stored.items).forEach(([key, entry]) => {
      const count = Math.max(0, Number(entry?.count) || 0);
      if (count) unreadV62.set(key, { count, mentions: Math.max(0, Number(entry?.mentions) || 0), at: Number(entry?.at) || 0 });
    });
  }

  function hydrateDraftsV62() {
    const stored = safeJsonReadV62(storageKeyV62('drafts'), {});
    draftsV62 = stored.version === VERSION_V62 && stored.items && typeof stored.items === 'object' ? stored.items : {};
    const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
    Object.keys(draftsV62).forEach(key => {
      if (!draftsV62[key]?.text || Number(draftsV62[key]?.updated || 0) < cutoff) delete draftsV62[key];
    });
  }

  function persistDraftsV62() {
    if (!currentNickV62()) return;
    try { localStorage.setItem(storageKeyV62('drafts'), JSON.stringify({ version: VERSION_V62, items: draftsV62 })); } catch (error) {}
  }

  function previewTextV62(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length > 38 ? `${value.slice(0, 37)}…` : value;
  }

  function saveDraftV62(key = activeKeyV62()) {
    if (!key || !inputV62 || !currentNickV62()) return;
    const text = String(inputV62.value || '').trim();
    if (text) draftsV62[key] = { text: String(inputV62.value).slice(0, 4000), updated: Date.now() };
    else delete draftsV62[key];
    persistDraftsV62();
    decorateSidebarV62();
  }

  function loadDraftV62(key = activeKeyV62()) {
    if (!inputV62 || !key) return;
    inputV62.value = String(draftsV62[key]?.text || '');
    try { if (typeof autoResize === 'function') autoResize(inputV62); } catch (error) {}
    decorateSidebarV62();
  }

  function readByV62(message) {
    if (Array.isArray(message?.read_by)) return message.read_by;
    if (typeof message?.read_by === 'string') {
      try { const value = JSON.parse(message.read_by);return Array.isArray(value) ? value : []; } catch (error) { return []; }
    }
    return [];
  }

  function privatePeerV62(key) {
    const nick = currentNickV62();
    if (!nick || !key || key.startsWith('room_')) return '';
    const atStart = `${nick}_`, atEnd = `_${nick}`;
    if (key.startsWith(atStart)) return key.slice(atStart.length);
    if (key.endsWith(atEnd)) return key.slice(0, -atEnd.length);
    return '';
  }

  function relevantKeyV62(key) {
    if (!key) return false;
    if (key.startsWith('room_')) {
      const id = key.slice(5);
      try { return (roomRows || []).some(room => String(room.id) === id); } catch (error) { return false; }
    }
    return Boolean(privatePeerV62(key));
  }

  function messagePreviewV62(message) {
    try { return messagePreviewText(message?.text || ''); } catch (error) { return String(message?.text || ''); }
  }

  function hasMentionV62(message) {
    const nick = currentNickV62();
    if (!nick) return false;
    const escaped = nick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9_])@${escaped}(?=$|[^a-z0-9_])`, 'i').test(messagePreviewV62(message));
  }

  function isActuallyVisibleV62(key) {
    return key && key === activeKeyV62() && !document.hidden && document.visibilityState === 'visible';
  }

  function setUnreadV62(key, count, mentions = 0, at = Date.now()) {
    count = Math.max(0, Number(count) || 0);
    if (!count) unreadV62.delete(key);
    else unreadV62.set(key, { count: Math.min(999, count), mentions: Math.min(count, Math.max(0, Number(mentions) || 0)), at });
  }

  function clearUnreadV62(key = activeKeyV62()) {
    if (!key || !unreadV62.has(key)) return;
    unreadV62.delete(key);
    persistUnreadV62();
    decorateSidebarV62();
  }

  function incrementUnreadV62(message) {
    const key = String(message?.chat_key || '');
    if (!key || !relevantKeyV62(key) || message?.deleted || message?.from_nick === currentNickV62()) return;
    if (isActuallyVisibleV62(key)) { clearUnreadV62(key);return; }
    const previous = unreadV62.get(key) || { count: 0, mentions: 0, at: 0 };
    setUnreadV62(key, previous.count + 1, previous.mentions + (hasMentionV62(message) ? 1 : 0), Number(message?.ts) || Date.now());
    persistUnreadV62();
  }

  function decorateSidebarV62() {
    if (!contactsV62) return;
    contactsV62.querySelectorAll('.contact[data-chat-key]').forEach(row => {
      const key = row.dataset.chatKey || '';
      const entry = unreadV62.get(key);
      const time = row.querySelector('.contact-time');
      const preview = row.querySelector('.contact-last');

      if (time) {
        let clock = time.querySelector('.contact-clock-v62');
        if (!clock) {
          const raw = [...time.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.nodeValue || '').join('').trim();
          time.replaceChildren();clock = document.createElement('span');clock.className = 'contact-clock-v62';clock.textContent = raw;time.appendChild(clock);
        }
        let badge = time.querySelector('.chat-unread-v62');
        if (entry?.count) {
          if (!badge) { badge = document.createElement('span');badge.className = 'chat-unread-v62';time.appendChild(badge); }
          badge.classList.toggle('is-mention', Boolean(entry.mentions));
          badge.textContent = `${entry.mentions ? '@ ' : ''}${entry.count > 99 ? '99+' : entry.count}`;
          badge.title = entry.mentions ? `${entry.mentions} упоминаний` : `${entry.count} непрочитанных`;
          row.classList.add('has-unread-v62');
        } else {
          badge?.remove();row.classList.remove('has-unread-v62');
        }
      }

      if (preview) {
        const current = preview.textContent || '';
        const draft = key === activeKeyV62() ? '' : previewTextV62(draftsV62[key]?.text || '');
        const paintedDraft = preview.dataset.renderedDraftV62 || '';
        if (!preview.classList.contains('has-draft-v62') || (paintedDraft && current !== paintedDraft)) preview.dataset.remotePreviewV62 = current;
        if (draft) {
          preview.textContent = draft;
          preview.classList.add('has-draft-v62');
          preview.dataset.renderedDraftV62 = draft;
          preview.title = `Черновик: ${draft}`;
        } else {
          if (preview.classList.contains('has-draft-v62')) preview.textContent = preview.dataset.remotePreviewV62 || '';
          preview.classList.remove('has-draft-v62');
          delete preview.dataset.renderedDraftV62;
          preview.removeAttribute('title');
        }
      }
    });
  }

  function scheduleSidebarPaintV62() {
    clearTimeout(sidebarPaintTimerV62);
    sidebarPaintTimerV62 = setTimeout(() => {
      Promise.resolve(typeof renderContacts === 'function' ? renderContacts() : null).catch(() => decorateSidebarV62());
    }, 70);
  }

  async function refreshUnreadV62() {
    if (!currentNickV62()) return;
    if (unreadRefreshV62) return unreadRefreshV62;
    unreadRefreshV62 = (async () => {
      const nick = currentNickV62();
      const [result, mentionResult] = await Promise.all([
        sb.from('messages')
          .select('id,chat_key,from_nick,ts,read_by,deleted')
          .neq('from_nick', nick)
          .order('ts', { ascending: false })
          .limit(MAX_UNREAD_SCAN_V62),
        sb.from('messages')
          .select('id,chat_key,from_nick,ts,read_by,deleted')
          .neq('from_nick', nick)
          .ilike('text', `%@${nick}%`)
          .order('ts', { ascending: false })
          .limit(180)
      ]);
      if (result.error) return;
      const mentionIds = new Set((mentionResult.data || [])
        .filter(message => !message.deleted && !readByV62(message).includes(nick))
        .map(message => String(message.id)));
      const next = new Map();
      for (const message of result.data || []) {
        const key = String(message.chat_key || '');
        if (!relevantKeyV62(key) || message.deleted || readByV62(message).includes(nick) || isActuallyVisibleV62(key)) continue;
        const entry = next.get(key) || { count: 0, mentions: 0, at: 0 };
        entry.count++;
        if (mentionIds.has(String(message.id))) entry.mentions++;
        entry.at = Math.max(entry.at, Number(message.ts) || 0);
        next.set(key, entry);
      }
      unreadV62.clear();next.forEach((entry, key) => unreadV62.set(key, entry));
      persistUnreadV62();decorateSidebarV62();
    })().catch(() => {}).finally(() => { unreadRefreshV62 = null; });
    return unreadRefreshV62;
  }

  function subscribeUnreadV62() {
    if (!currentNickV62() || unreadChannelV62) return;
    unreadChannelV62 = sb.channel(`unread-v62-${currentNickV62()}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const message = payload.new || {};
        const fingerprint = String(message.id || `${message.chat_key}:${message.from_nick}:${message.ts}`);
        if (seenRealtimeV62.has(fingerprint)) return;
        seenRealtimeV62.add(fingerprint);
        if (seenRealtimeV62.size > 400) seenRealtimeV62.delete(seenRealtimeV62.values().next().value);
        incrementUnreadV62(message);
        try { window.telechatApplySidebarMessageV25?.(message); } catch (error) {}
        if (String(message.chat_key || '') !== activeKeyV62()) scheduleSidebarPaintV62();
      })
      .subscribe();
  }

  function restartForUserV62() {
    const nick = currentNickV62();
    if (!nick || nick === activeNickV62) return;
    if (unreadChannelV62) { try { sb.removeChannel(unreadChannelV62); } catch (error) {}unreadChannelV62 = null; }
    activeNickV62 = nick;
    hydrateUnreadV62();hydrateDraftsV62();decorateSidebarV62();subscribeUnreadV62();
    setTimeout(refreshUnreadV62, 120);
  }

  function animatePanelV62(panel) {
    if (!panel || reducedMotionV62) return;
    const cards = [...panel.querySelectorAll('.panel-section,.profile-editor-card,.profile-choice-card,.profile-fields-card,.profile-preview-btn')];
    cards.forEach((card, index) => card.style.setProperty('--motion-order-v62', String(index)));
    panel.classList.remove('v62-motion-enter');void panel.offsetWidth;panel.classList.add('v62-motion-enter');
    setTimeout(() => panel.classList.remove('v62-motion-enter'), 850);
  }

  function animateChatV62() {
    if (reducedMotionV62) return;
    const chat = document.getElementById('active-chat');
    if (!chat) return;
    chat.classList.remove('v62-content-enter');void chat.offsetWidth;chat.classList.add('v62-content-enter');
    setTimeout(() => chat.classList.remove('v62-content-enter'), 620);
  }

  function animateModalV62(modal) {
    if (!modal || reducedMotionV62 || !modal.classList.contains('show')) return;
    [...(modal.querySelector('.modal')?.children || [])].forEach((child, index) => child.style.setProperty('--motion-order-v62', String(index)));
    modal.classList.remove('v62-modal-enter');void modal.offsetWidth;modal.classList.add('v62-modal-enter');
    setTimeout(() => modal.classList.remove('v62-modal-enter'), 700);
  }

  const lazyImageObserverV62 = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const image = entry.target;
      lazyImageObserverV62.unobserve(image);
      const source = image.dataset.srcV62;
      if (!source) return;
      const ready = () => { image.classList.add('is-ready-v62');image.removeAttribute('data-src-v62'); };
      image.addEventListener('load', ready, { once: true });
      image.addEventListener('error', ready, { once: true });
      image.src = source;
      if (image.complete) ready();
    });
  }, { root: messagesV62 || null, rootMargin: '520px 0px', threshold: .01 }) : null;

  const animatedMediaObserverV62 = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && !document.hidden) video.play?.().catch(() => {});
      else video.pause?.();
    });
  }, { rootMargin: '180px 0px', threshold: .01 }) : null;

  function prepareMediaNodeV62(node) {
    if (!(node instanceof Element)) return;
    const images = node.matches('img') ? [node] : [...node.querySelectorAll('img')];
    images.forEach(image => {
      if (image.classList.contains('telechat-lazy-media-v62')) {
        if (image.dataset.srcV62 && lazyImageObserverV62) lazyImageObserverV62.observe(image);
        else if (image.dataset.srcV62) { image.src = image.dataset.srcV62;image.classList.add('is-ready-v62'); }
        return;
      }
      if (!image.classList.contains('avatar-photo') || image.dataset.preparedV62 === '1') return;
      image.dataset.preparedV62 = '1';image.loading = 'lazy';image.decoding = 'async';
      const ready = () => { image.classList.remove('v62-media-pending');image.classList.add('v62-media-ready'); };
      if (image.complete && image.naturalWidth) ready();
      else { image.classList.add('v62-media-pending');image.addEventListener('load', ready, { once: true });image.addEventListener('error', ready, { once: true }); }
    });

    const videos = node.matches('video.avatar-video,video.profile-video') ? [node] : [...node.querySelectorAll('video.avatar-video,video.profile-video')];
    videos.forEach(video => {
      if (video.dataset.preparedV62 === '1') return;
      video.dataset.preparedV62 = '1';video.preload = 'metadata';
      const ready = () => { video.classList.remove('v62-media-pending');video.classList.add('v62-media-ready'); };
      if (video.readyState >= 2) ready();
      else { video.classList.add('v62-media-pending');video.addEventListener('loadeddata', ready, { once: true });video.addEventListener('error', ready, { once: true }); }
      animatedMediaObserverV62?.observe(video);
    });
  }

  function installWrappersV62() {
    const renderContactsBeforeV62 = window.renderContacts;
    if (typeof renderContactsBeforeV62 === 'function') {
      window.renderContacts = async function(...args) {
        const value = await renderContactsBeforeV62.apply(this, args);
        restartForUserV62();decorateSidebarV62();prepareMediaNodeV62(contactsV62 || document.body);
        return value;
      };
    }

    const markAsReadBeforeV62 = window.markAsRead;
    if (typeof markAsReadBeforeV62 === 'function') {
      window.markAsRead = function(...args) {
        const key = activeKeyV62();clearUnreadV62(key);
        const value = markAsReadBeforeV62.apply(this, args);
        Promise.resolve(value).finally(() => clearUnreadV62(key));
        return value;
      };
    }

    ['openChat','openRoom'].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function') return;
      window[name] = async function(...args) {
        const oldKey = activeKeyV62();if (oldKey) saveDraftV62(oldKey);
        const value = await previous.apply(this, args);
        const key = activeKeyV62();clearUnreadV62(key);loadDraftV62(key);animateChatV62();prepareMediaNodeV62(document.getElementById('active-chat') || document.body);
        return value;
      };
    });

    const goBackBeforeV62 = window.goBack;
    if (typeof goBackBeforeV62 === 'function') {
      window.goBack = function(...args) {
        const key = activeKeyV62();if (key) saveDraftV62(key);
        const value = goBackBeforeV62.apply(this, args);decorateSidebarV62();
        return value;
      };
    }

    const sendBeforeV62 = window.sendMsg;
    if (typeof sendBeforeV62 === 'function') {
      window.sendMsg = async function(...args) {
        const key = activeKeyV62();
        const value = await sendBeforeV62.apply(this, args);
        if (key) saveDraftV62(key);
        return value;
      };
    }

    const openPanelBeforeV62 = window.openPanel;
    if (typeof openPanelBeforeV62 === 'function') {
      window.openPanel = function(id, ...args) { const value = openPanelBeforeV62.call(this, id, ...args);animatePanelV62(document.getElementById(id));return value; };
    }

    const renderContentBeforeV62 = window.renderMessageContent;
    if (typeof renderContentBeforeV62 === 'function') {
      window.renderMessageContent = function(...args) {
        const html = renderContentBeforeV62.apply(this, args);
        if (!html.includes('class="chat-photo"') || html.includes('data-src-v62=')) return html;
        return html.replace(/<img class="chat-photo"([^>]*?)src="([^"]+)"/i,
          '<img class="chat-photo telechat-lazy-media-v62"$1src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" data-src-v62="$2"');
      };
    }
  }

  function initV62() {
    if (startedV62) return;
    startedV62 = true;installWrappersV62();document.body.classList.add('telechat-experience-v62');
    inputV62?.addEventListener('input', () => {
      clearTimeout(draftSaveTimerV62);draftSaveTimerV62 = setTimeout(() => saveDraftV62(), 180);
    }, { passive: true });
    addEventListener('beforeunload', () => saveDraftV62());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { const key = activeKeyV62();if (key) clearUnreadV62(key); } }, { passive: true });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      new MutationObserver(() => {
        if (modal.classList.contains('show')) {
          if (!animatedModalsV62.has(modal)) { animatedModalsV62.add(modal);animateModalV62(modal); }
        } else animatedModalsV62.delete(modal);
      }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(prepareMediaNodeV62));
    }).observe(document.body, { childList: true, subtree: true });
    prepareMediaNodeV62(document.body);restartForUserV62();
  }

  window.telechatExperienceV62 = {
    version: VERSION_V62,
    unread: () => compactUnreadStateV62(),
    drafts: () => ({ ...draftsV62 }),
    refreshUnread: refreshUnreadV62,
    clearUnread: clearUnreadV62,
    decorate: decorateSidebarV62,
    ready: false,
    error: ''
  };
  try {
    initV62();
    window.telechatExperienceV62.ready = true;
  } catch (error) {
    window.telechatExperienceV62.error = String(error?.message || error || 'Неизвестная ошибка');
    console.warn('tele.chat experience v62 started in safe mode:', error);
  }
})();
