/* TELECHAT SOUND STUDIO V53 — selectable lightweight synthesized sounds */
(() => {
  'use strict';

  const STORAGE_KEY = 'telechat.sound-studio.v53';
  const DEFAULTS = { call: 'orbit', send: 'soft', incoming: 'cosmos' };
  const PRESETS = {
    call: [
      { id: 'orbit', name: 'Орбита', notes: [
        { f: 392, to: 440, at: 0, d: .24, g: .038, type: 'sine' },
        { f: 494, to: 554, at: .16, d: .28, g: .033, type: 'sine' },
        { f: 659, to: 740, at: .34, d: .3, g: .027, type: 'sine' }
      ] },
      { id: 'comet', name: 'Комета', notes: [
        { f: 740, to: 520, at: 0, d: .22, g: .036, type: 'triangle' },
        { f: 880, to: 660, at: .25, d: .25, g: .03, type: 'sine' }
      ] },
      { id: 'classic', name: 'Классика', notes: [
        { f: 440, at: 0, d: .2, g: .043, type: 'sine' },
        { f: 520, at: .25, d: .22, g: .043, type: 'sine' }
      ] },
      { id: 'none', name: 'Без звука', notes: [] }
    ],
    send: [
      { id: 'soft', name: 'Мягкий', notes: [
        { f: 620, to: 700, at: 0, d: .1, g: .038, type: 'sine' },
        { f: 920, to: 1040, at: .065, d: .16, g: .047, type: 'sine' }
      ] },
      { id: 'drop', name: 'Капля', notes: [
        { f: 1080, to: 680, at: 0, d: .2, g: .044, type: 'sine' }
      ] },
      { id: 'spark', name: 'Искра', notes: [
        { f: 760, at: 0, d: .075, g: .035, type: 'triangle' },
        { f: 1120, at: .055, d: .12, g: .039, type: 'sine' },
        { f: 1420, at: .12, d: .1, g: .023, type: 'sine' }
      ] },
      { id: 'none', name: 'Без звука', notes: [] }
    ],
    incoming: [
      { id: 'cosmos', name: 'Космос', notes: [
        { f: 660, to: 720, at: 0, d: .16, g: .05, type: 'sine' },
        { f: 940, to: 1040, at: .115, d: .24, g: .045, type: 'sine' }
      ] },
      { id: 'bubble', name: 'Капля', notes: [
        { f: 560, to: 820, at: 0, d: .15, g: .046, type: 'sine' },
        { f: 980, to: 760, at: .11, d: .2, g: .032, type: 'sine' }
      ] },
      { id: 'pulse', name: 'Пульс', notes: [
        { f: 430, at: 0, d: .1, g: .042, type: 'triangle' },
        { f: 640, at: .14, d: .17, g: .042, type: 'triangle' }
      ] },
      { id: 'none', name: 'Без звука', notes: [] }
    ]
  };

  let settings = readSettings();
  let audioContext = null;
  let lastPlay = { call: 0, send: 0, incoming: 0 };

  function readSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        call: validPreset('call', saved.call) ? saved.call : DEFAULTS.call,
        send: validPreset('send', saved.send) ? saved.send : DEFAULTS.send,
        incoming: validPreset('incoming', saved.incoming) ? saved.incoming : DEFAULTS.incoming
      };
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function validPreset(category, id) {
    return !!PRESETS[category]?.some(item => item.id === id);
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (error) {}
  }

  function soundsEnabled() {
    const toggle = document.getElementById('sound-toggle');
    return !toggle || toggle.checked;
  }

  function contextV53() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function scheduleNote(context, note) {
    const start = context.currentTime + .018 + Number(note.at || 0);
    const duration = Math.max(.045, Number(note.d || .15));
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = note.type || 'sine';
    oscillator.frequency.setValueAtTime(Number(note.f || 440), start);
    if (note.to) oscillator.frequency.exponentialRampToValueAtTime(Number(note.to), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, Number(note.g || .035)), start + Math.min(.022, duration / 3));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .025);
    oscillator.addEventListener('ended', () => {
      try { oscillator.disconnect(); gain.disconnect(); } catch (error) {}
    }, { once: true });
  }

  function play(category, options = {}) {
    if (!PRESETS[category]) return false;
    if (!options.preview && !soundsEnabled()) return false;
    const now = performance.now();
    const throttle = category === 'incoming' ? 240 : category === 'send' ? 90 : 160;
    if (!options.preview && now - lastPlay[category] < throttle) return false;
    lastPlay[category] = now;
    const preset = PRESETS[category].find(item => item.id === settings[category]) || PRESETS[category][0];
    if (!preset.notes.length) return false;
    try {
      const context = contextV53();
      if (!context) return false;
      preset.notes.forEach(note => scheduleNote(context, note));
      return true;
    } catch (error) {
      return false;
    }
  }

  function optionMarkup(category) {
    return PRESETS[category].map(preset =>
      `<option value="${preset.id}"${settings[category] === preset.id ? ' selected' : ''}>${preset.name}</option>`
    ).join('');
  }

  function soundRow(category, icon, title, note) {
    return `<div class="sound-choice-v53">
      <span class="sound-choice-icon-v53" aria-hidden="true">${icon}</span>
      <label class="sound-choice-copy-v53" for="sound-select-${category}-v53">
        <strong>${title}</strong><small>${note}</small>
      </label>
      <select class="sound-select-v53" id="sound-select-${category}-v53" data-sound-category-v53="${category}" aria-label="${title}">${optionMarkup(category)}</select>
      <button class="sound-preview-v53" type="button" data-sound-preview-v53="${category}" aria-label="Прослушать ${title.toLowerCase()}" title="Прослушать">▶</button>
    </div>`;
  }

  function refreshMutedState() {
    const studio = document.getElementById('sound-studio-v53');
    const enabled = soundsEnabled();
    if (studio) studio.classList.toggle('muted-v53', !enabled);
    const masterNote = document.getElementById('sound-master-note-v53');
    if (masterNote) masterNote.textContent = enabled ? 'Настрой каждый сигнал отдельно' : 'Все сигналы выключены';
  }

  function mountSettings() {
    const toggle = document.getElementById('sound-toggle');
    const masterRow = toggle?.closest('.setting-row');
    if (!toggle || !masterRow || document.getElementById('sound-studio-v53')) return;
    masterRow.classList.add('sound-master-row-v53');
    const label = masterRow.querySelector('.setting-label');
    const note = masterRow.querySelector('.setting-note');
    if (label) label.textContent = 'Все звуки';
    if (note) { note.id = 'sound-master-note-v53'; note.textContent = 'Настрой каждый сигнал отдельно'; }
    const studio = document.createElement('div');
    studio.id = 'sound-studio-v53';
    studio.className = 'sound-studio-v53';
    studio.innerHTML =
      soundRow('call', '☎', 'Звонок', 'Входящий вызов') +
      soundRow('send', '➤', 'Отправка', 'Твоё сообщение') +
      soundRow('incoming', '✦', 'Входящие', 'Новое сообщение');
    masterRow.insertAdjacentElement('afterend', studio);

    studio.addEventListener('change', event => {
      const select = event.target.closest('[data-sound-category-v53]');
      if (!select) return;
      const category = select.dataset.soundCategoryV53;
      if (!validPreset(category, select.value)) return;
      settings[category] = select.value;
      saveSettings();
      play(category, { preview: true });
    });
    studio.addEventListener('click', event => {
      const button = event.target.closest('[data-sound-preview-v53]');
      if (!button) return;
      button.classList.remove('playing-v53');
      void button.offsetWidth;
      button.classList.add('playing-v53');
      play(button.dataset.soundPreviewV53, { preview: true });
      setTimeout(() => button.classList.remove('playing-v53'), 420);
    });
    toggle.addEventListener('change', refreshMutedState);
    refreshMutedState();
  }

  window.telechatPlaySoundV53 = play;
  window.telechatSoundSettingsV53 = () => ({ ...settings });
  try {
    playPing = () => play('incoming');
    playSendSound = () => play('send');
  } catch (error) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSettings, { once: true });
  else mountSettings();
})();
