/* Decoration over the existing textarea: no editor replacement or message edits. */
(() => {
  'use strict';
  const input = document.getElementById('msg-input');
  if (!input || !window.Worker) return;
  const owner = () => {
      try {
        return String(me?.nick || 'guest');
      } catch (_) {
        return 'guest';
      }
    },
    chat = () => {
      try {
        return String(conversationKey() || '');
      } catch (_) {
        return '';
      }
    };
  const key = () => 'exstrachat.spell.v213.' + owner();
  let enabled = true,
    worker = null,
    timer = 0,
    idle = 0,
    request = 0,
    job = null,
    composing = false,
    frame = 0,
    lastStatus = '',
    section,
    toggle;
  const mirror = document.createElement('div');
  mirror.className = 'spell-mirror-v213';
  mirror.setAttribute('aria-hidden', 'true');
  mirror.hidden = true;
  input.spellcheck = false;
  input.parentElement.classList.add('spell-host-v213');
  input.after(mirror);
  function prefs() {
    try {
      enabled = localStorage.getItem(key()) !== 'off';
    } catch (_) {
      enabled = true;
    }
    if (toggle) toggle.checked = enabled;
  }
  function clear() {
    request++;
    job = null;
    clearTimeout(timer);
    timer = 0;
    mirror.hidden = true;
    mirror.replaceChildren();
  }
  function dispose() {
    clearTimeout(idle);
    idle = 0;
    worker?.terminate();
    worker = null;
  }
  function geometry() {
    frame = 0;
    if (mirror.hidden) return;
    const s = getComputedStyle(input);
    for (const name of [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'textAlign',
      'textIndent',
      'wordSpacing',
      'tabSize',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRadius',
    ])
      mirror.style[name] = s[name];
    const scrollbar = Math.max(
      0,
      input.offsetWidth -
        input.clientWidth -
        parseFloat(s.borderLeftWidth) -
        parseFloat(s.borderRightWidth),
    );
    mirror.style.paddingRight = parseFloat(s.paddingRight) + scrollbar + 'px';
    mirror.style.left = input.offsetLeft + 'px';
    mirror.style.top = input.offsetTop + 'px';
    mirror.style.width = input.offsetWidth + 'px';
    mirror.style.height = input.offsetHeight + 'px';
    mirror.scrollTop = input.scrollTop;
    mirror.scrollLeft = input.scrollLeft;
  }
  function layout() {
    if (!frame) frame = requestAnimationFrame(geometry);
  }
  function tokens(text) {
    const skip = [
        ...text.matchAll(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+|@[^\s]+|\[ex182:[a-z0-9-]+\]/g),
      ].map((m) => [m.index, m.index + m[0].length]),
      all = [],
      caret = input.selectionStart ?? text.length;
    let base = Math.max(0, Math.min(text.length - 5000, caret - 3000));
    while (base > 0 && /[а-яё]/i.test(text[base - 1]) && /[а-яё]/i.test(text[base] || '')) base++;
    const end = Math.min(text.length, base + 5000);
    for (const m of text.slice(base, end).matchAll(/[а-яё]+/gi)) {
      const start = base + m.index,
        finish = start + m[0].length;
      if (
        m[0].length < 2 ||
        m[0].length > 32 ||
        skip.some(([a, b]) => start >= a && start < b) ||
        (finish === end && end < text.length && /[а-яё]/i.test(text[end]))
      )
        continue;
      if (
        document.activeElement === input &&
        caret > start &&
        caret <= finish &&
        caret === text.length &&
        !/[\s.,!?;:]$/.test(text)
      )
        continue;
      all.push({ word: m[0], start, end: finish });
    }
    if (all.length <= 80) return all;
    const near = all.findIndex((token) => token.end >= caret),
      start = Math.max(0, Math.min(all.length - 80, (near < 0 ? all.length : near) - 50));
    return all.slice(start, start + 80);
  }
  function paint(current, results) {
    if (
      job !== current ||
      current.id !== request ||
      current.owner !== owner() ||
      current.chat !== chat() ||
      current.text !== input.value ||
      !enabled ||
      composing
    )
      return;
    const byWord = new Map(results.map((item) => [item.word, item])),
      errors = current.tokens.filter((token) => byWord.get(token.word)?.correct === false);
    mirror.replaceChildren();
    if (!errors.length) {
      mirror.hidden = true;
      return;
    }
    let at = 0;
    for (const token of errors) {
      mirror.append(document.createTextNode(current.text.slice(at, token.start)));
      const span = document.createElement('span');
      span.className = 'spell-word-v213';
      const red = new Set(byWord.get(token.word).red || []);
      for (let i = 0; i < token.word.length; i++) {
        if (red.has(i)) {
          const letter = document.createElement('span');
          letter.className = 'spell-letter-v213';
          letter.textContent = token.word[i];
          span.append(letter);
        } else span.append(document.createTextNode(token.word[i]));
      }
      mirror.append(span);
      at = token.end;
    }
    mirror.append(document.createTextNode(current.text.slice(at) + '\n'));
    mirror.hidden = false;
    geometry();
  }
  function ensureWorker() {
    if (worker) return;
    const current = new Worker(new URL('./spell-worker-v213.js?v=213', document.baseURI));
    worker = current;
    current.onmessage = (event) => {
      if (worker !== current || !job || event.data?.id !== job.id) return;
      if (job.owner !== owner() || job.chat !== chat() || job.text !== input.value) {
        job = null;
        return;
      }
      if (event.data.error) {
        mirror.hidden = true;
        lastStatus = event.data.error;
        job = null;
        if (section) section.querySelector('[data-spell-status]').textContent = lastStatus;
        return;
      }
      lastStatus = 'Русский словарь · проверка на устройстве';
      if (section) section.querySelector('[data-spell-status]').textContent = lastStatus;
      paint(job, event.data.result || []);
      job = null;
    };
    current.onerror = (event) => {
      event.preventDefault();
      if (worker !== current) return;
      mirror.hidden = true;
      dispose();
      lastStatus = 'Проверка временно недоступна. Отправка сообщений работает.';
      if (section) section.querySelector('[data-spell-status]').textContent = lastStatus;
    };
  }
  function check() {
    timer = 0;
    if (!enabled || composing || document.hidden || !input.value.trim() || !chat()) {
      mirror.hidden = true;
      return;
    }
    const text = input.value,
      items = tokens(text);
    if (!items.length) {
      mirror.hidden = true;
      return;
    }
    try {
      ensureWorker();
    } catch (_) {
      mirror.hidden = true;
      lastStatus = 'Устройство не поддерживает локальную проверку. Отправка работает.';
      if (section) section.querySelector('[data-spell-status]').textContent = lastStatus;
      return;
    }
    job = { id: ++request, owner: owner(), chat: chat(), text, tokens: items };
    worker.postMessage({
      type: 'check',
      id: job.id,
      words: [...new Set(items.map((item) => item.word))],
    });
    clearTimeout(idle);
    idle = setTimeout(dispose, 120000);
  }
  function schedule() {
    clear();
    if (enabled && !composing && input.value.trim()) timer = setTimeout(check, 400);
  }
  input.addEventListener('input', schedule);
  input.addEventListener('change', schedule);
  input.addEventListener('focus', schedule);
  input.addEventListener('scroll', layout, { passive: true });
  input.addEventListener('compositionstart', () => {
    composing = true;
    clear();
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    schedule();
  });
  input.addEventListener('blur', () => {
    mirror.hidden = true;
  });
  if (window.ResizeObserver) new ResizeObserver(layout).observe(input);
  window.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('resize', layout);
  window.addEventListener('telechat-account-ready-v175', () => {
    clear();
    dispose();
    prefs();
  });
  window.addEventListener('telechat-chat-action-v155', (event) => {
    if (event.detail?.action === 'send') clear();
  });
  window.addEventListener('telechat-message-sent-v164', clear);
  window.addEventListener('pagehide', () => {
    clear();
    dispose();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clear();
      dispose();
    } else if (document.activeElement === input) schedule();
  });
  const panel = document.getElementById('settings-panel');
  if (panel) {
    section = document.createElement('section');
    section.className = 'panel-section comfort-section-v167 spell-settings-v213';
    section.dataset.settingsGroup = 'chats';
    section.innerHTML =
      '<div class="panel-section-title">Проверка текста</div><div class="setting-row"><div class="setting-copy"><div class="setting-label">Подсвечивать ошибки</div><div class="setting-note">Слово подчёркнуто, ошибочная буква — красная. Ничего не исправляется и не отправляется автоматически.</div></div><label class="setting-switch"><input class="telechat-switch-v36" type="checkbox" aria-label="Подсвечивать ошибки в сообщениях"></label></div><p class="setting-note" data-spell-status>Русский словарь загружается при наборе. Текст остаётся на устройстве. При неоднозначной ошибке — только подчёркивание.</p>';
    toggle = section.querySelector('input');
    toggle.onchange = () => {
      enabled = toggle.checked;
      try {
        localStorage.setItem(key(), enabled ? 'on' : 'off');
      } catch (_) {}
      clear();
      if (!enabled) dispose();
      else schedule();
    };
    panel.append(section);
  }
  prefs();
  window.exstraSpellV213 = Object.freeze({
    refresh: schedule,
    state: () => ({
      enabled,
      worker: !!worker,
      pending: !!job,
      marks: mirror.querySelectorAll('.spell-word-v213').length,
      status: lastStatus,
    }),
  });
})();
