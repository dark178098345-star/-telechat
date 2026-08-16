/* TELECHAT CHAT ACTIONS V52 — aliases, contacts and pinned dialogs. */
(() => {
  'use strict';

  let activeTargetV52 = null;
  let longPressTimerV52 = 0;
  let menuOpenedAtV52 = 0;
  const PIN_EMOJIS_V59 = ['📌','⭐','💜','🔥','🌙','⚡','🎮','🎧','🌸','🚀','💎','👑'];

  function storageKeyV52() {
    const nick = String(me?.nick || 'guest').toLowerCase();
    return `telechat.chat-actions.v52.${nick}`;
  }

  function readStateV52() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKeyV52()) || '{}');
      return {
        aliases: parsed.aliases && typeof parsed.aliases === 'object' ? parsed.aliases : {},
        pins: Array.isArray(parsed.pins) ? parsed.pins : [],
        contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
        pinIcons: parsed.pinIcons && typeof parsed.pinIcons === 'object' ? parsed.pinIcons : {}
      };
    } catch (error) {
      return { aliases: {}, pins: [], contacts: [], pinIcons: {} };
    }
  }

  function writeStateV52(state) {
    try { localStorage.setItem(storageKeyV52(), JSON.stringify(state)); } catch (error) {}
  }

  function firstTextNodeV52(element) {
    return [...(element?.childNodes || [])].find(node => node.nodeType === Node.TEXT_NODE) || null;
  }

  function setRowNameV52(row, value) {
    const name = row?.querySelector('.contact-name');
    if (!name) return;
    let text = firstTextNodeV52(name);
    if (!text) { text = document.createTextNode('');name.prepend(text); }
    text.nodeValue = value;
  }

  function addMarkerV52(name, className, text, title, onClick) {
    if (!name || name.querySelector(`.${className}`)) return;
    const marker = document.createElement(onClick ? 'button' : 'span');
    if (onClick) marker.type = 'button';
    marker.className = className;
    marker.textContent = text;
    marker.title = title;
    marker.setAttribute('aria-label', title);
    if (onClick) marker.addEventListener('click', onClick);
    name.appendChild(marker);
    return marker;
  }

  function createSectionV52(text, className) {
    const title = document.createElement('div');
    title.className = `list-section-title v52-custom-section ${className}`;
    title.textContent = text;
    return title;
  }

  function moveGroupToTopV52(list, rows, titleText, className, afterNode = null) {
    if (!rows.length) return afterNode;
    const title = createSectionV52(titleText, className);
    if (afterNode) afterNode.after(title); else list.prepend(title);
    let anchor = title;
    rows.forEach(row => { anchor.after(row);anchor = row; });
    return anchor;
  }

  function hideEmptyNativeSectionsV52(list) {
    [...list.querySelectorAll('.list-section-title:not(.v52-custom-section)')].forEach(title => {
      let next = title.nextElementSibling, hasRows = false;
      while (next && !next.classList.contains('list-section-title')) {
        if (next.classList.contains('contact')) { hasRows = true;break; }
        next = next.nextElementSibling;
      }
      title.style.display = hasRows ? '' : 'none';
    });
  }

  function ensureMoreButtonV52(row) {
    if (row.querySelector('.chat-more-v52')) return;
    row.classList.add('has-chat-actions-v52');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-more-v52';
    button.innerHTML = '<i></i><i></i><i></i>';
    button.title = 'Действия с чатом';
    button.setAttribute('aria-label', 'Действия с чатом');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', event => {
      event.preventDefault();event.stopPropagation();
      openMenuV52(row, button.getBoundingClientRect());
    });
    row.appendChild(button);
  }

  function applySidebarCustomV52() {
    const list = document.getElementById('contacts-list');
    if (!list || !me) return;
    const state = readStateV52();
    const pins = new Set(state.pins), contacts = new Set(state.contacts);
    list.querySelectorAll('.v52-custom-section').forEach(element => element.remove());
    const rows = [...list.querySelectorAll('.contact[data-chat-key]')];
    rows.forEach(row => {
      const key = row.dataset.chatKey;
      const original = row.dataset.originalName || firstTextNodeV52(row.querySelector('.contact-name'))?.nodeValue?.trim() || key;
      row.dataset.originalName = original;
      setRowNameV52(row, state.aliases[key] || original);
      row.querySelectorAll('.chat-pin-mark-v52,.chat-contact-mark-v52').forEach(element => element.remove());
      const name = row.querySelector('.contact-name');
      if (pins.has(key)) {
        const pinIcon = PIN_EMOJIS_V59.includes(state.pinIcons[key]) ? state.pinIcons[key] : '📌';
        addMarkerV52(name, 'chat-pin-mark-v52', pinIcon, 'Изменить значок закрепа', event => {
          event.preventDefault();event.stopPropagation();
          openMenuV52(row, event.currentTarget.getBoundingClientRect());
          showPinIconPickerV59();
        });
      }
      if (row.dataset.chatKind === 'private' && contacts.has(row.dataset.nick)) addMarkerV52(name, 'chat-contact-mark-v52', '●', 'В контактах');
      ensureMoreButtonV52(row);
    });

    const pinnedRows = rows.filter(row => pins.has(row.dataset.chatKey));
    const contactRows = rows.filter(row => !pins.has(row.dataset.chatKey) && row.dataset.chatKind === 'private' && contacts.has(row.dataset.nick));
    let anchor = moveGroupToTopV52(list, pinnedRows, 'Закреплённые', 'v52-pinned-section');
    anchor = moveGroupToTopV52(list, contactRows, 'Контакты', 'v52-contacts-section', anchor);
    hideEmptyNativeSectionsV52(list);
  }

  function ensureMenuV52() {
    let menu = document.getElementById('chat-actions-v52');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'chat-actions-v52';
    menu.className = 'chat-actions-v52';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <div class="chat-actions-title-v52" id="chat-actions-title-v52">Действия с чатом</div>
      <div class="chat-actions-list-v52">
        <button class="chat-action-v52" type="button" data-action="rename"><span class="chat-action-icon-v52">✎</span><span>Переименовать</span></button>
        <button class="chat-action-v52" type="button" data-action="contact"><span class="chat-action-icon-v52">♙</span><span>Добавить в контакты</span></button>
        <button class="chat-action-v52" type="button" data-action="pin"><span class="chat-action-icon-v52">◆</span><span>Закрепить сверху</span></button>
        <button class="chat-action-v52" type="button" data-action="pin-icon"><span class="chat-action-icon-v52" data-pin-icon-preview>📌</span><span>Значок закрепа</span></button>
      </div>
      <div class="chat-pin-icons-v59" id="chat-pin-icons-v59">
        <div class="chat-pin-icons-title-v59"><button type="button" data-pin-icons-back aria-label="Назад">‹</button><span>Значок закрепа</span></div>
        <div class="chat-pin-icons-grid-v59">${PIN_EMOJIS_V59.map(emoji => `<button type="button" data-pin-emoji="${emoji}" aria-label="Выбрать ${emoji}">${emoji}</button>`).join('')}</div>
      </div>
      <form class="chat-rename-v52" id="chat-rename-v52">
        <input class="chat-rename-input-v52" id="chat-rename-input-v52" maxlength="32" autocomplete="off" placeholder="Как подписать чат?">
        <div class="chat-rename-buttons-v52"><button type="button" data-rename-reset>Убрать подпись</button><button class="save" type="submit">Сохранить</button></div>
      </form>`;
    document.body.appendChild(menu);
    menu.addEventListener('click', event => {
      const emojiButton = event.target.closest('[data-pin-emoji]');
      if (emojiButton) { event.stopPropagation();savePinIconV59(emojiButton.dataset.pinEmoji);return; }
      if (event.target.closest('[data-pin-icons-back]')) { event.stopPropagation();showMainActionsV59();return; }
      const button = event.target.closest('[data-action]');
      if (!button) return;
      event.stopPropagation();
      handleActionV52(button.dataset.action);
    });
    menu.querySelector('#chat-rename-v52').addEventListener('submit', event => { event.preventDefault();saveAliasV52(false); });
    menu.querySelector('[data-rename-reset]').addEventListener('click', () => saveAliasV52(true));
    return menu;
  }

  function descriptorV52(row) {
    return {
      key: row.dataset.chatKey,
      kind: row.dataset.chatKind || 'private',
      nick: row.dataset.nick || '',
      originalName: row.dataset.originalName || firstTextNodeV52(row.querySelector('.contact-name'))?.nodeValue?.trim() || 'Чат'
    };
  }

  function positionMenuV52(menu, rect) {
    if (innerWidth <= 640) return;
    const width = 252, estimatedHeight = 205;
    const left = Math.max(8, Math.min(innerWidth - width - 8, (rect?.right || innerWidth / 2) - width));
    const top = Math.max(8, Math.min(innerHeight - estimatedHeight - 8, rect?.bottom || innerHeight / 2));
    menu.style.left = `${left}px`;menu.style.top = `${top}px`;menu.style.right = 'auto';
  }

  function openMenuV52(row, rect) {
    if (!row?.dataset.chatKey) return;
    closeMenuV52();
    activeTargetV52 = descriptorV52(row);
    const state = readStateV52(), menu = ensureMenuV52();
    menu.querySelector('#chat-actions-title-v52').textContent = state.aliases[activeTargetV52.key] || activeTargetV52.originalName;
    const contact = menu.querySelector('[data-action="contact"]');
    contact.hidden = activeTargetV52.kind !== 'private';
    contact.classList.toggle('is-active', state.contacts.includes(activeTargetV52.nick));
    contact.lastElementChild.textContent = state.contacts.includes(activeTargetV52.nick) ? 'Удалить из контактов' : 'Добавить в контакты';
    const pin = menu.querySelector('[data-action="pin"]');
    const isPinned = state.pins.includes(activeTargetV52.key);
    pin.classList.toggle('is-active', isPinned);
    pin.lastElementChild.textContent = isPinned ? 'Открепить' : 'Закрепить сверху';
    const pinIcon = menu.querySelector('[data-action="pin-icon"]');
    pinIcon.hidden = !isPinned;
    pinIcon.querySelector('[data-pin-icon-preview]').textContent = PIN_EMOJIS_V59.includes(state.pinIcons[activeTargetV52.key]) ? state.pinIcons[activeTargetV52.key] : '📌';
    menu.querySelector('#chat-rename-v52').classList.remove('show');
    menu.querySelector('#chat-pin-icons-v59').classList.remove('show');
    menu.querySelector('.chat-actions-list-v52').style.display = '';
    positionMenuV52(menu, rect);
    menuOpenedAtV52 = Date.now();
    menu.classList.add('show');
    document.querySelector(`.contact[data-chat-key="${CSS.escape(activeTargetV52.key)}"] .chat-more-v52`)?.setAttribute('aria-expanded', 'true');
  }

  function closeMenuV52() {
    const menu = document.getElementById('chat-actions-v52');
    menu?.classList.remove('show');
    document.querySelectorAll('.chat-more-v52[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    activeTargetV52 = null;
  }

  function handleActionV52(action) {
    if (!activeTargetV52) return;
    const menu = ensureMenuV52(), state = readStateV52();
    if (action === 'rename') {
      menu.querySelector('.chat-actions-list-v52').style.display = 'none';
      const form = menu.querySelector('#chat-rename-v52'), input = menu.querySelector('#chat-rename-input-v52');
      form.classList.add('show');input.value = state.aliases[activeTargetV52.key] || '';input.focus();input.select();return;
    }
    if (action === 'pin-icon') { showPinIconPickerV59();return; }
    if (action === 'contact' && activeTargetV52.kind === 'private') {
      const values = new Set(state.contacts);
      if (values.has(activeTargetV52.nick)) values.delete(activeTargetV52.nick); else values.add(activeTargetV52.nick);
      state.contacts = [...values];writeStateV52(state);
      showToast(values.has(activeTargetV52.nick) ? 'Добавлено в контакты' : 'Удалено из контактов');
    }
    if (action === 'pin') {
      const values = new Set(state.pins);
      if (values.has(activeTargetV52.key)) {
        values.delete(activeTargetV52.key);delete state.pinIcons[activeTargetV52.key];
      } else values.add(activeTargetV52.key);
      state.pins = [...values];writeStateV52(state);
      showToast(values.has(activeTargetV52.key) ? 'Чат закреплён' : 'Чат откреплён');
    }
    closeMenuV52();
    Promise.resolve(renderContacts()).catch(() => applySidebarCustomV52());
  }

  function showMainActionsV59() {
    const menu = ensureMenuV52();
    menu.querySelector('#chat-pin-icons-v59').classList.remove('show');
    menu.querySelector('#chat-rename-v52').classList.remove('show');
    menu.querySelector('.chat-actions-list-v52').style.display = '';
  }

  function showPinIconPickerV59() {
    if (!activeTargetV52) return;
    const menu = ensureMenuV52(), state = readStateV52();
    const current = PIN_EMOJIS_V59.includes(state.pinIcons[activeTargetV52.key]) ? state.pinIcons[activeTargetV52.key] : '📌';
    menu.querySelector('.chat-actions-list-v52').style.display = 'none';
    menu.querySelector('#chat-rename-v52').classList.remove('show');
    menu.querySelector('#chat-pin-icons-v59').classList.add('show');
    menu.querySelectorAll('[data-pin-emoji]').forEach(button => button.classList.toggle('selected', button.dataset.pinEmoji === current));
  }

  function savePinIconV59(emoji) {
    if (!activeTargetV52 || !PIN_EMOJIS_V59.includes(emoji)) return;
    const state = readStateV52();
    if (!state.pins.includes(activeTargetV52.key)) return;
    state.pinIcons[activeTargetV52.key] = emoji;writeStateV52(state);
    showToast(`${emoji} Значок закрепа изменён`);
    closeMenuV52();applySidebarCustomV52();
  }

  function saveAliasV52(reset) {
    if (!activeTargetV52) return;
    const targetKey = activeTargetV52.key;
    const state = readStateV52();
    const input = document.getElementById('chat-rename-input-v52');
    const value = reset ? '' : String(input?.value || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    if (value) state.aliases[targetKey] = value; else delete state.aliases[targetKey];
    writeStateV52(state);showToast(value ? 'Название сохранено' : 'Вернули обычное имя');
    closeMenuV52();applySidebarCustomV52();
    if (activeKeyV52() === targetKey) applyHeaderAliasV52();
  }

  function activeKeyV52() {
    try { return conversationKey() || ''; } catch (error) { return ''; }
  }

  function applyHeaderAliasV52() {
    const key = activeKeyV52();
    if (!key) return;
    const alias = readStateV52().aliases[key];
    if (alias) document.getElementById('chat-name-hdr').textContent = alias;
  }

  const renderContactsBeforeV52 = renderContacts;
  renderContacts = async function(...args) {
    const value = await renderContactsBeforeV52(...args);
    applySidebarCustomV52();
    return value;
  };

  const openChatBeforeV52 = openChat;
  openChat = async function(...args) {
    const value = await openChatBeforeV52(...args);
    applyHeaderAliasV52();
    return value;
  };

  const openRoomBeforeV52 = openRoom;
  openRoom = async function(...args) {
    const value = await openRoomBeforeV52(...args);
    applyHeaderAliasV52();
    return value;
  };

  const listV52 = document.getElementById('contacts-list');
  listV52?.addEventListener('contextmenu', event => {
    const row = event.target.closest('.contact[data-chat-key]');
    if (!row) return;
    event.preventDefault();event.stopPropagation();
    openMenuV52(row, { right: event.clientX, bottom: event.clientY });
  });
  listV52?.addEventListener('touchstart', event => {
    const row = event.target.closest('.contact[data-chat-key]');
    if (!row || event.target.closest('.chat-more-v52')) return;
    clearTimeout(longPressTimerV52);
    const touch = event.touches[0];
    longPressTimerV52 = setTimeout(() => openMenuV52(row, { right: touch.clientX, bottom: touch.clientY }), 560);
  }, { passive: true });
  ['touchend','touchmove','touchcancel'].forEach(name => listV52?.addEventListener(name, () => clearTimeout(longPressTimerV52), { passive: true }));
  document.addEventListener('pointerdown', event => {
    const menu = document.getElementById('chat-actions-v52');
    if (menu?.classList.contains('show') && !menu.contains(event.target) && !event.target.closest('.chat-more-v52')) closeMenuV52();
  }, { passive: true });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenuV52(); });
  listV52?.addEventListener('scroll', () => {
    if (Date.now() - menuOpenedAtV52 > 280) closeMenuV52();
  }, { passive: true });

  window.telechatApplySidebarCustomV52 = applySidebarCustomV52;
  window.telechatChatActionsV52 = { open: openMenuV52, close: closeMenuV52, state: readStateV52 };
  ensureMenuV52();
})();
