/* TELECHAT MESSAGE CONTEXT + GLASS SETTINGS V36 */
(() => {
  'use strict';

  const SUPER_ADMIN_V36 = 'creator';
  const REACTIONS_V36 = ['❤️', '🥰', '😘', '👍', '🔥', '😍'];
  const STORAGE_V36 = {
    glass: 'telechat_glass_v36',
    context: 'telechat_context_menu_v36'
  };

  let glassEnabledV36 = readBoolV36(STORAGE_V36.glass, true);
  let contextEnabledV36 = readBoolV36(STORAGE_V36.context, true);
  let editMessageV36 = null;
  let forwardMessagesV36 = [];
  let forwardTargetsV36 = [];
  let reactionRowsV36 = new Map();
  let reactionSubscriptionV36 = null;
  let reactionRefreshTimerV36 = 0;
  let selectionModeV36 = false;
  const selectedMessagesV36 = new Map();
  const visibleMessagesV36 = new Map();

  function readBoolV36(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === 'true';
    } catch (error) {
      return fallback;
    }
  }

  function storeBoolV36(key, value) {
    try { localStorage.setItem(key, String(!!value)); } catch (error) {}
  }

  function storeJsonV36(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function readJsonV36(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (error) { return null; }
  }

  function applyInterfaceSettingsV36() {
    document.body.classList.toggle('telechat-glass-v36', glassEnabledV36);
    document.body.classList.toggle('telechat-context-disabled-v36', !contextEnabledV36);
    const glassToggle = document.getElementById('glass-toggle-v36');
    const contextToggle = document.getElementById('context-toggle-v36');
    if (glassToggle) glassToggle.checked = glassEnabledV36;
    if (contextToggle) contextToggle.checked = contextEnabledV36;
    if (!contextEnabledV36) closeContextMenuV36();
  }

  function installInterfaceSettingsV36() {
    if (document.getElementById('interface-settings-v36')) return;
    const installSection = document.getElementById('install-app-section');
    if (!installSection) return;
    const section = document.createElement('div');
    section.className = 'panel-section';
    section.id = 'interface-settings-v36';
    section.innerHTML = `
      <div class="panel-section-title">Интерфейс</div>
      <div class="setting-row">
        <div class="setting-copy"><div class="setting-label">Стеклянный интерфейс</div><div class="setting-note">Полупрозрачные панели в стиле iOS</div></div>
        <label class="setting-switch" title="Стеклянный интерфейс"><input class="telechat-switch-v36" type="checkbox" id="glass-toggle-v36" aria-label="Стеклянный интерфейс"></label>
      </div>
      <div class="setting-row">
        <div class="setting-copy"><div class="setting-label">Меню сообщений</div><div class="setting-note">Правая кнопка мыши или удержание</div></div>
        <label class="setting-switch" title="Меню сообщений"><input class="telechat-switch-v36" type="checkbox" id="context-toggle-v36" aria-label="Меню сообщений"></label>
      </div>`;
    installSection.before(section);
    section.querySelector('#glass-toggle-v36').addEventListener('change', event => {
      glassEnabledV36 = event.target.checked;
      storeBoolV36(STORAGE_V36.glass, glassEnabledV36);
      applyInterfaceSettingsV36();
    });
    section.querySelector('#context-toggle-v36').addEventListener('change', event => {
      contextEnabledV36 = event.target.checked;
      storeBoolV36(STORAGE_V36.context, contextEnabledV36);
      applyInterfaceSettingsV36();
    });
    applyInterfaceSettingsV36();
  }

  function buildContextMenuV36() {
    const menu = document.getElementById('ctx-menu');
    if (!menu || menu.dataset.v36Ready) return;
    menu.dataset.v36Ready = 'true';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Действия с сообщением');
    menu.innerHTML = `
      <div class="ctx-reactions-v36" id="ctx-reactions-v36" aria-label="Быстрые реакции">
        ${REACTIONS_V36.map(emoji => `<button type="button" class="ctx-reaction-v36" data-reaction-v36="${emoji}" aria-label="Реакция ${emoji}">${emoji}</button>`).join('')}
      </div>
      <button type="button" class="ctx-item ctx-button-v36" data-action-v36="reply"><span class="ctx-icon-v36">↩</span><span>Ответить</span></button>
      <button type="button" class="ctx-item ctx-button-v36" id="ctx-edit-v36" data-action-v36="edit"><span class="ctx-icon-v36">✎</span><span>Изменить</span></button>
      <button type="button" class="ctx-item ctx-button-v36" id="ctx-pin-v36" data-action-v36="pin"><span class="ctx-icon-v36">⌖</span><span id="ctx-pin-label-v36">Закрепить</span></button>
      <button type="button" class="ctx-item ctx-button-v36" data-action-v36="copy"><span class="ctx-icon-v36">▣</span><span>Копировать</span></button>
      <button type="button" class="ctx-item ctx-button-v36" id="ctx-forward-v36" data-action-v36="forward"><span class="ctx-icon-v36">➜</span><span>Переслать</span></button>
      <button type="button" class="ctx-item ctx-button-v36" data-action-v36="select"><span class="ctx-icon-v36">◉</span><span>Выбрать</span></button>
      <div class="ctx-sep"></div>
      <button type="button" class="ctx-item ctx-button-v36 danger" id="ctx-delete-btn" data-action-v36="delete"><span class="ctx-icon-v36">⌫</span><span>Удалить</span></button>`;

    menu.addEventListener('click', event => {
      event.stopPropagation();
      const reaction = event.target.closest('[data-reaction-v36]');
      if (reaction) {
        const message = ctxMsg;
        closeContextMenuV36();
        if (message?.id) toggleMessageReactionV36(message.id, reaction.dataset.reactionV36);
        return;
      }
      const action = event.target.closest('[data-action-v36]')?.dataset.actionV36;
      if (!action) return;
      const message = ctxMsg;
      if (action === 'reply') { closeContextMenuV36(); if (message) ctxReply(); }
      if (action === 'edit') openEditMessageV36(message);
      if (action === 'pin') pinMessageV36(message);
      if (action === 'copy') copyMessagesV36(message ? [message] : []);
      if (action === 'forward') openForwardModalV36(message ? [message] : []);
      if (action === 'select') enterSelectionModeV36(message);
      if (action === 'delete') deleteContextMessageV36(message);
    });
  }

  function closeContextMenuV36() {
    const menu = document.getElementById('ctx-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.style.visibility = '';
    }
  }

  function isSpecialMessageV36(text) {
    const value = String(text || '');
    return (typeof unpackMedia === 'function' && !!unpackMedia(value)) ||
      value.startsWith('[tc_gift_v1]') ||
      value.startsWith('__telechat_call_v1__:');
  }

  function messageKeyV36(message) {
    if (!message) return '';
    if (message.id !== undefined && message.id !== null && message.id !== '') return 'id:' + String(message.id);
    return `local:${message.from_nick || ''}:${message.ts || ''}`;
  }

  function messageElementV36(message) {
    const box = document.getElementById('messages');
    if (!box || !message) return null;
    const key = messageKeyV36(message);
    const byKey = Array.from(box.querySelectorAll('.msg')).find(element => element.dataset.contextKeyV36 === key);
    if (byKey) return byKey;
    if (message.id !== undefined && message.id !== null) {
      const byId = Array.from(box.querySelectorAll('.msg')).find(element => String(element.dataset.id) === String(message.id));
      if (byId) return byId;
    }
    return box.lastElementChild?.classList?.contains('msg') ? box.lastElementChild : null;
  }

  showCtxMenu = function(event, message) {
    if (!contextEnabledV36 || !message) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    ctxMsg = message;
    const menu = document.getElementById('ctx-menu');
    if (!menu) return;
    const own = message.from_nick === me?.nick;
    const canDelete = !!message.id && !message.deleted && (own || me?.nick === SUPER_ADMIN_V36);
    const canEdit = !!message.id && own && !message.deleted && !isSpecialMessageV36(message.text);
    const canPin = !!message.id && !message.deleted;
    document.getElementById('ctx-reactions-v36').style.display = message.id && !message.deleted ? 'grid' : 'none';
    document.getElementById('ctx-edit-v36').style.display = canEdit ? 'flex' : 'none';
    document.getElementById('ctx-pin-v36').style.display = canPin ? 'flex' : 'none';
    document.getElementById('ctx-forward-v36').style.display = message.deleted ? 'none' : 'flex';
    document.getElementById('ctx-delete-btn').style.display = canDelete ? 'flex' : 'none';
    document.getElementById('ctx-pin-label-v36').textContent = message.pinned || String(pinnedMsgId) === String(message.id) ? 'Открепить' : 'Закрепить';

    const x = Number(event?.clientX ?? event?.pageX ?? window.innerWidth / 2);
    const y = Number(event?.clientY ?? event?.pageY ?? window.innerHeight / 2);
    menu.style.left = '8px';
    menu.style.top = '8px';
    menu.style.visibility = 'hidden';
    menu.classList.add('show');
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const gap = 8;
      const left = Math.max(gap, Math.min(x, window.innerWidth - rect.width - gap));
      const top = Math.max(gap, Math.min(y, window.innerHeight - rect.height - gap));
      menu.style.setProperty('--ctx-origin-x', x > window.innerWidth / 2 ? '90%' : '10%');
      menu.style.setProperty('--ctx-origin-y', y > window.innerHeight / 2 ? '90%' : '10%');
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.style.visibility = 'visible';
    });
  };

  function installMessageModalsV36() {
    if (document.getElementById('message-edit-overlay-v36')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="message-modal-overlay-v36" id="message-edit-overlay-v36" role="dialog" aria-modal="true" aria-labelledby="message-edit-title-v36">
        <form class="message-modal-card-v36" id="message-edit-form-v36">
          <div class="message-modal-head-v36"><div><div class="message-modal-title-v36" id="message-edit-title-v36">Изменить сообщение</div><div class="message-modal-sub-v36">Исправь текст и сохрани изменения</div></div><button class="message-modal-close-v36" type="button" data-close-edit-v36 aria-label="Закрыть">×</button></div>
          <div class="message-modal-body-v36"><textarea class="message-edit-input-v36" id="message-edit-input-v36" maxlength="4000"></textarea><div class="message-modal-actions-v36"><button class="message-modal-btn-v36" type="button" data-close-edit-v36>Отмена</button><button class="message-modal-btn-v36 primary" id="message-edit-save-v36" type="submit">Сохранить</button></div></div>
        </form>
      </div>
      <div class="message-modal-overlay-v36" id="message-forward-overlay-v36" role="dialog" aria-modal="true" aria-labelledby="message-forward-title-v36">
        <div class="message-modal-card-v36">
          <div class="message-modal-head-v36"><div><div class="message-modal-title-v36" id="message-forward-title-v36">Переслать сообщение</div><div class="message-modal-sub-v36" id="message-forward-sub-v36">Выбери чат или пространство</div></div><button class="message-modal-close-v36" type="button" data-close-forward-v36 aria-label="Закрыть">×</button></div>
          <div class="message-modal-body-v36"><input class="forward-search-v36" id="forward-search-v36" placeholder="Найти чат..." autocomplete="off"><div class="forward-targets-v36" id="forward-targets-v36"><div class="forward-empty-v36">Загружаем чаты…</div></div></div>
        </div>
      </div>`);

    document.querySelectorAll('[data-close-edit-v36]').forEach(button => button.addEventListener('click', closeEditMessageV36));
    document.querySelectorAll('[data-close-forward-v36]').forEach(button => button.addEventListener('click', closeForwardModalV36));
    document.getElementById('message-edit-overlay-v36').addEventListener('click', event => { if (event.target === event.currentTarget) closeEditMessageV36(); });
    document.getElementById('message-forward-overlay-v36').addEventListener('click', event => { if (event.target === event.currentTarget) closeForwardModalV36(); });
    document.getElementById('message-edit-form-v36').addEventListener('submit', saveEditMessageV36);
    document.getElementById('forward-search-v36').addEventListener('input', renderForwardTargetsV36);
    document.getElementById('forward-targets-v36').addEventListener('click', event => {
      const button = event.target.closest('[data-forward-index-v36]');
      if (button) sendForwardV36(Number(button.dataset.forwardIndexV36), button);
    });
  }

  function openEditMessageV36(message) {
    closeContextMenuV36();
    if (!message?.id || message.from_nick !== me?.nick || message.deleted || isSpecialMessageV36(message.text)) return;
    editMessageV36 = message;
    const input = document.getElementById('message-edit-input-v36');
    input.value = String(message.text || '');
    document.getElementById('message-edit-overlay-v36').classList.add('show');
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 80);
  }

  function closeEditMessageV36() {
    document.getElementById('message-edit-overlay-v36')?.classList.remove('show');
    editMessageV36 = null;
  }

  async function saveEditMessageV36(event) {
    event.preventDefault();
    if (!editMessageV36) return;
    const input = document.getElementById('message-edit-input-v36');
    const text = input.value.trim();
    if (!text) { showToast('Сообщение не может быть пустым'); return; }
    if (text === editMessageV36.text) { closeEditMessageV36(); return; }
    const button = document.getElementById('message-edit-save-v36');
    button.disabled = true;
    button.textContent = 'Сохраняем…';
    const result = await sb.from('messages').update({ text, edited_at: Date.now() }).eq('id', editMessageV36.id).eq('from_nick', me.nick).select('id').maybeSingle();
    button.disabled = false;
    button.textContent = 'Сохранить';
    if (result.error || !result.data) { showToast('Не удалось изменить сообщение'); return; }
    closeEditMessageV36();
    showToast('Сообщение изменено ✎');
    await renderMessages();
    renderContacts();
  }

  function clipboardTextV36(message) {
    if (!message) return '';
    const media = typeof unpackMedia === 'function' ? unpackMedia(message.text) : null;
    if (media?.kind === 'image') return media.caption || 'Фотография';
    if (media?.kind === 'voice') return media.caption || 'Голосовое сообщение';
    return typeof messagePreviewText === 'function' ? messagePreviewText(message.text) : String(message.text || '');
  }

  async function writeClipboardV36(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    }
  }

  async function copyMessagesV36(messages) {
    closeContextMenuV36();
    const clean = messages.filter(Boolean);
    const text = clean.length > 1 ? clean.map(message => `@${message.from_nick}: ${clipboardTextV36(message)}`).join('\n') : clipboardTextV36(clean[0]);
    if (await writeClipboardV36(text)) showToast(clean.length > 1 ? 'Сообщения скопированы' : 'Текст скопирован');
    else showToast('Не удалось скопировать');
  }

  function pinStorageKeyV36(chatKeyValue) {
    return `telechat_pin_v36_${me?.nick || 'guest'}_${chatKeyValue || ''}`;
  }

  function showPinnedBarV36(message) {
    const bar = document.getElementById('pinned-bar');
    if (!bar) return;
    if (!message) {
      pinnedMsgId = null;
      pinnedMsgText = '';
      bar.classList.remove('show');
      return;
    }
    pinnedMsgId = message.id;
    pinnedMsgText = clipboardTextV36(message);
    document.getElementById('pinned-bar-text').textContent = pinnedMsgText.substring(0, 70);
    bar.classList.add('show');
  }

  async function pinMessageV36(message) {
    closeContextMenuV36();
    if (!message?.id || message.deleted) return;
    const key = message.chat_key || conversationKey();
    const isPinned = !!message.pinned || String(pinnedMsgId) === String(message.id);
    const result = await sb.from('messages').update({ pinned: !isPinned }).eq('id', message.id).select('id,pinned').maybeSingle();
    if (isPinned) {
      try { localStorage.removeItem(pinStorageKeyV36(key)); } catch (error) {}
      showPinnedBarV36(null);
      showToast(result.error || !result.data ? 'Откреплено на этом устройстве' : 'Сообщение откреплено');
    } else {
      const localPin = { id: message.id, text: clipboardTextV36(message), from_nick: message.from_nick };
      storeJsonV36(pinStorageKeyV36(key), localPin);
      showPinnedBarV36({ ...message, text: localPin.text });
      showToast(result.error || !result.data ? 'Закреплено на этом устройстве' : 'Сообщение закреплено 📌');
    }
  }

  ctxPin = async function() { if (ctxMsg) await pinMessageV36(ctxMsg); };

  loadPinned = async function() {
    const key = conversationKey();
    if (!key) { showPinnedBarV36(null); return; }
    const result = await sb.from('messages').select('id,text,from_nick,chat_key,pinned,ts').eq('chat_key', key).eq('pinned', true).eq('deleted', false).order('ts', { ascending: false }).limit(1).maybeSingle();
    if (!result.error && result.data) {
      showPinnedBarV36(result.data);
      storeJsonV36(pinStorageKeyV36(key), { id: result.data.id, text: clipboardTextV36(result.data), from_nick: result.data.from_nick });
      return;
    }
    const localPin = readJsonV36(pinStorageKeyV36(key));
    showPinnedBarV36(localPin);
  };

  unpinMsg = async function(event) {
    event?.stopPropagation?.();
    const key = conversationKey();
    const id = pinnedMsgId;
    if (id) await sb.from('messages').update({ pinned: false }).eq('id', id);
    try { localStorage.removeItem(pinStorageKeyV36(key)); } catch (error) {}
    showPinnedBarV36(null);
    showToast('Сообщение откреплено');
  };

  async function deleteContextMessageV36(message) {
    closeContextMenuV36();
    if (!message?.id || message.deleted || (message.from_nick !== me?.nick && me?.nick !== SUPER_ADMIN_V36)) return;
    const prompt = me?.nick === SUPER_ADMIN_V36 && message.from_nick !== me.nick ? 'Удалить это сообщение как creator?' : 'Удалить сообщение у всех?';
    if (!confirm(prompt)) return;
    const result = await sb.from('messages').update({ deleted: true, text: 'Сообщение удалено', edited_at: Date.now(), pinned: false }).eq('id', message.id).select('id').maybeSingle();
    if (result.error || !result.data) { showToast('Не удалось удалить сообщение'); return; }
    showToast('Сообщение удалено');
    if (String(pinnedMsgId) === String(message.id)) showPinnedBarV36(null);
    await renderMessages();
    renderContacts();
  }

  ctxDelete = async function() { if (ctxMsg) await deleteContextMessageV36(ctxMsg); };

  async function loadForwardTargetsV36() {
    const targetBox = document.getElementById('forward-targets-v36');
    targetBox.innerHTML = '<div class="forward-empty-v36">Загружаем чаты…</div>';
    try {
      const [, recentResult] = await Promise.all([
        typeof loadMyRooms === 'function' ? loadMyRooms() : Promise.resolve([]),
        sb.from('messages').select('chat_key,ts').order('ts', { ascending: false }).limit(300)
      ]);
      const peerSet = new Set();
      const ownStart = `${me.nick}_`;
      const ownEnd = `_${me.nick}`;
      for (const row of recentResult.data || []) {
        const key = String(row.chat_key || '');
        if (!key || key.startsWith('room_')) continue;
        let peer = '';
        if (key.startsWith(ownStart)) peer = key.slice(ownStart.length);
        else if (key.endsWith(ownEnd)) peer = key.slice(0, -ownEnd.length);
        if (peer && peer !== me.nick) peerSet.add(peer);
      }
      const peers = Array.from(peerSet).slice(0, 80);
      const userResult = peers.length ? await sb.from('users').select('*').in('nick', peers) : { data: [] };
      const users = (userResult.data || []).map(user => ({ type: 'user', key: chatKey(me.nick, user.nick), user, name: user.name || user.nick, meta: '@' + user.nick }));
      const rooms = (roomRows || []).filter(room => room.type !== 'channel' || room.owner_nick === me.nick).map(room => ({ type: 'room', key: 'room_' + room.id, room, name: room.name, meta: room.type === 'channel' ? 'Канал' : 'Группа' }));
      forwardTargetsV36 = [...rooms, ...users];
      renderForwardTargetsV36();
    } catch (error) {
      targetBox.innerHTML = '<div class="forward-empty-v36">Не удалось загрузить чаты</div>';
    }
  }

  function renderForwardTargetsV36() {
    const box = document.getElementById('forward-targets-v36');
    if (!box) return;
    const query = document.getElementById('forward-search-v36').value.trim().toLowerCase();
    const visible = forwardTargetsV36.map((target, index) => ({ target, index })).filter(item => !query || `${item.target.name} ${item.target.meta}`.toLowerCase().includes(query));
    if (!visible.length) { box.innerHTML = '<div class="forward-empty-v36">Подходящих чатов пока нет</div>'; return; }
    box.innerHTML = visible.map(({ target, index }) => {
      const avatar = target.type === 'user' ? avatarMarkup(target.user) : escHtml(target.room.icon || '🌌');
      return `<button type="button" class="forward-target-v36" data-forward-index-v36="${index}"><span class="forward-avatar-v36 ${target.type === 'user' ? 'user' : ''}">${avatar}</span><span class="forward-copy-v36"><span class="forward-name-v36">${escHtml(target.name)}</span><span class="forward-meta-v36">${escHtml(target.meta)}</span></span><span aria-hidden="true">›</span></button>`;
    }).join('');
  }

  function openForwardModalV36(messages) {
    closeContextMenuV36();
    forwardMessagesV36 = messages.filter(message => message && !message.deleted);
    if (!forwardMessagesV36.length) return;
    document.getElementById('message-forward-sub-v36').textContent = forwardMessagesV36.length > 1 ? `Выбрано сообщений: ${forwardMessagesV36.length}` : 'Выбери чат или пространство';
    document.getElementById('forward-search-v36').value = '';
    document.getElementById('message-forward-overlay-v36').classList.add('show');
    loadForwardTargetsV36();
    setTimeout(() => document.getElementById('forward-search-v36').focus(), 80);
  }

  function closeForwardModalV36() {
    document.getElementById('message-forward-overlay-v36')?.classList.remove('show');
    forwardMessagesV36 = [];
  }

  async function sendForwardV36(index, button) {
    const target = forwardTargetsV36[index];
    if (!target || !forwardMessagesV36.length) return;
    button.disabled = true;
    const oldText = button.innerHTML;
    button.innerHTML = '<span class="forward-copy-v36"><span class="forward-name-v36">Отправляем…</span></span>';
    const now = Date.now();
    const rows = forwardMessagesV36.map((message, rowIndex) => ({
      chat_key: target.key,
      from_nick: me.nick,
      text: message.text,
      ts: now + rowIndex,
      reply_text: `Переслано от @${message.from_nick}`,
      read_by: [],
      deleted: false
    }));
    const result = await sb.from('messages').insert(rows);
    button.disabled = false;
    button.innerHTML = oldText;
    if (result.error) { showToast('Не удалось переслать сообщение'); return; }
    const count = rows.length;
    closeForwardModalV36();
    exitSelectionModeV36();
    showToast(count > 1 ? `Переслано сообщений: ${count}` : 'Сообщение переслано ➜');
    if (target.key === conversationKey()) await renderMessages();
    renderContacts();
  }

  function installSelectionToolbarV36() {
    if (document.getElementById('message-selection-toolbar-v36')) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'message-selection-toolbar-v36';
    toolbar.id = 'message-selection-toolbar-v36';
    toolbar.innerHTML = `
      <button class="selection-action-v36" type="button" data-selection-v36="close" title="Отменить">×</button>
      <div class="selection-count-v36" id="selection-count-v36">Выбрано: 0</div>
      <button class="selection-action-v36" type="button" data-selection-v36="copy" title="Копировать">▣</button>
      <button class="selection-action-v36" type="button" data-selection-v36="forward" title="Переслать">➜</button>
      <button class="selection-action-v36 danger" type="button" data-selection-v36="delete" title="Удалить">⌫</button>`;
    document.body.appendChild(toolbar);
    toolbar.addEventListener('click', event => {
      const action = event.target.closest('[data-selection-v36]')?.dataset.selectionV36;
      const messages = Array.from(selectedMessagesV36.values());
      if (action === 'close') exitSelectionModeV36();
      if (action === 'copy') copyMessagesV36(messages);
      if (action === 'forward') openForwardModalV36(messages);
      if (action === 'delete') deleteSelectedMessagesV36(messages);
    });

    document.getElementById('messages')?.addEventListener('click', event => {
      if (!selectionModeV36) return;
      const element = event.target.closest('.msg');
      if (!element) return;
      event.preventDefault();
      event.stopPropagation();
      const key = element.dataset.contextKeyV36;
      const message = visibleMessagesV36.get(key);
      if (!message) return;
      if (selectedMessagesV36.has(key)) selectedMessagesV36.delete(key);
      else selectedMessagesV36.set(key, message);
      if (!selectedMessagesV36.size) exitSelectionModeV36();
      else updateSelectionV36();
    }, true);
  }

  function enterSelectionModeV36(message) {
    closeContextMenuV36();
    if (!message) return;
    selectionModeV36 = true;
    selectedMessagesV36.set(messageKeyV36(message), message);
    document.body.classList.add('message-selection-mode-v36');
    updateSelectionV36();
  }

  function updateSelectionV36() {
    document.querySelectorAll('#messages .msg').forEach(element => element.classList.toggle('context-selected-v36', selectedMessagesV36.has(element.dataset.contextKeyV36)));
    const toolbar = document.getElementById('message-selection-toolbar-v36');
    toolbar?.classList.toggle('show', selectionModeV36 && selectedMessagesV36.size > 0);
    const count = document.getElementById('selection-count-v36');
    if (count) count.textContent = `Выбрано: ${selectedMessagesV36.size}`;
  }

  function exitSelectionModeV36() {
    selectionModeV36 = false;
    selectedMessagesV36.clear();
    document.body.classList.remove('message-selection-mode-v36');
    document.getElementById('message-selection-toolbar-v36')?.classList.remove('show');
    document.querySelectorAll('#messages .msg.context-selected-v36').forEach(element => element.classList.remove('context-selected-v36'));
  }

  async function deleteSelectedMessagesV36(messages) {
    const allowed = messages.filter(message => message.id && !message.deleted && (message.from_nick === me?.nick || me?.nick === SUPER_ADMIN_V36));
    if (!allowed.length) { showToast('Среди выбранных нет сообщений, которые можно удалить'); return; }
    if (!confirm(`Удалить сообщений: ${allowed.length}?`)) return;
    const result = await sb.from('messages').update({ deleted: true, text: 'Сообщение удалено', edited_at: Date.now(), pinned: false }).in('id', allowed.map(message => message.id));
    if (result.error) { showToast('Не удалось удалить выбранные сообщения'); return; }
    const skipped = messages.length - allowed.length;
    exitSelectionModeV36();
    showToast(skipped ? `Удалено: ${allowed.length}, пропущено: ${skipped}` : `Удалено сообщений: ${allowed.length}`);
    await renderMessages();
    renderContacts();
  }

  function renderMessageReactionsV36(message, element) {
    if (!element || !message?.id || message.deleted) return;
    const rows = reactionRowsV36.get(String(message.id)) || [];
    let container = element.querySelector('.msg-reactions-v36');
    if (!rows.length) { container?.remove(); return; }
    const groups = new Map();
    rows.forEach(row => {
      if (!groups.has(row.emoji)) groups.set(row.emoji, []);
      groups.get(row.emoji).push(row.user_nick);
    });
    if (!container) {
      container = document.createElement('div');
      container.className = 'msg-reactions-v36';
      const meta = element.querySelector('.msg-meta');
      element.insertBefore(container, meta || null);
    }
    container.innerHTML = '';
    groups.forEach((nicks, emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'message-reaction-v36' + (nicks.includes(me?.nick) ? ' mine' : '');
      button.title = nicks.map(nick => '@' + nick).join(', ');
      button.innerHTML = `<span>${emoji}</span><span>${nicks.length}</span>`;
      button.addEventListener('click', event => {
        event.stopPropagation();
        toggleMessageReactionV36(message.id, emoji);
      });
      container.appendChild(button);
    });
  }

  function decorateMessageV36(message, element) {
    if (!message || !element) return;
    const key = messageKeyV36(message);
    element.dataset.contextKeyV36 = key;
    visibleMessagesV36.set(key, message);
    const meta = element.querySelector('.msg-meta');
    if (message.edited_at && meta && !meta.querySelector('.message-edited-v36')) {
      const edited = document.createElement('span');
      edited.className = 'message-edited-v36';
      edited.textContent = 'изменено';
      const check = meta.querySelector('.msg-check');
      meta.insertBefore(edited, check || null);
    }
    renderMessageReactionsV36(message, element);
  }

  async function refreshVisibleReactionsV36() {
    const messages = Array.from(visibleMessagesV36.values()).filter(message => message.id && !message.deleted);
    const ids = Array.from(new Set(messages.map(message => message.id)));
    reactionRowsV36 = new Map();
    if (ids.length) {
      const result = await sb.from('message_reactions').select('*').in('message_id', ids);
      if (!result.error) {
        (result.data || []).forEach(row => {
          const key = String(row.message_id);
          if (!reactionRowsV36.has(key)) reactionRowsV36.set(key, []);
          reactionRowsV36.get(key).push(row);
        });
      }
    }
    visibleMessagesV36.forEach((message, key) => {
      const element = Array.from(document.querySelectorAll('#messages .msg')).find(item => item.dataset.contextKeyV36 === key);
      if (element) renderMessageReactionsV36(message, element);
    });
  }

  function scheduleReactionRefreshV36() {
    clearTimeout(reactionRefreshTimerV36);
    reactionRefreshTimerV36 = setTimeout(refreshVisibleReactionsV36, 110);
  }

  function ensureReactionSubscriptionV36() {
    if (reactionSubscriptionV36 || !me?.nick) return;
    reactionSubscriptionV36 = sb.channel('message-reactions-v36-' + me.nick + '-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, scheduleReactionRefreshV36)
      .subscribe();
  }

  async function toggleMessageReactionV36(messageId, emoji) {
    if (!messageId || !REACTIONS_V36.includes(emoji)) return;
    const rows = reactionRowsV36.get(String(messageId)) || [];
    const mine = rows.find(row => row.user_nick === me?.nick);
    const result = mine?.emoji === emoji
      ? await sb.from('message_reactions').delete().eq('message_id', messageId).eq('user_nick', me.nick)
      : await sb.from('message_reactions').upsert({ message_id: messageId, user_nick: me.nick, emoji, created_at: Date.now() }, { onConflict: 'message_id,user_nick' });
    if (result.error) { showToast('Не удалось поставить реакцию'); return; }
    await refreshVisibleReactionsV36();
  }

  const appendMessageBeforeV36 = appendMessage;
  appendMessage = async function(message, doScroll = true) {
    const result = await appendMessageBeforeV36(message, doScroll);
    const element = messageElementV36(message);
    if (element) decorateMessageV36(message, element);
    return result;
  };

  const renderMessagesBeforeV36 = renderMessages;
  renderMessages = async function(...args) {
    visibleMessagesV36.clear();
    exitSelectionModeV36();
    const result = await renderMessagesBeforeV36(...args);
    await refreshVisibleReactionsV36();
    ensureReactionSubscriptionV36();
    return result;
  };

  function closeTransientUiV36(event) {
    if (!event.target.closest('#ctx-menu')) closeContextMenuV36();
  }

  installInterfaceSettingsV36();
  buildContextMenuV36();
  installMessageModalsV36();
  installSelectionToolbarV36();
  applyInterfaceSettingsV36();
  document.addEventListener('click', closeTransientUiV36);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeContextMenuV36();
    closeEditMessageV36();
    closeForwardModalV36();
    exitSelectionModeV36();
  });
  document.getElementById('messages')?.addEventListener('scroll', closeContextMenuV36, { passive: true });
  window.addEventListener('resize', closeContextMenuV36, { passive: true });
})();
