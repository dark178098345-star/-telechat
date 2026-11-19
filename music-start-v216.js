/* A transient, event-driven now-playing card. No audio, polling or server requests. */
(() => {
  'use strict';
  const VISIBLE_MS = 4200;
  let card, announcement, image, art, title, subtitle, elapsed, fill;
  let scope = '',
    lastKey = '',
    wasPlaying = false,
    visible = false,
    generation = 0;
  let dismissTimer = 0,
    exitTimer = 0,
    frame = 0,
    artURL = '',
    metadataMark = '';
  const nick = () => {
    try {
      return typeof me !== 'undefined' ? String(me?.nick || '') : '';
    } catch {
      return '';
    }
  };
  const seconds = (value) => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);
  const time = (value) => {
    const n = Math.floor(seconds(value));
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  };
  function cover(value) {
    if (typeof value !== 'string' || !value) return '';
    if (/^data:image\/(?:png|jpeg|webp|avif|gif);base64,[a-z0-9+/=]+$/i.test(value))
      return value.length <= 300000 ? value : '';
    try {
      const u = new URL(value, location.href);
      return value.length <= 4096 &&
        !u.username &&
        !u.password &&
        (['http:', 'https:'].includes(u.protocol) ||
          (u.protocol === 'blob:' && u.origin === location.origin))
        ? u.href
        : '';
    } catch {
      return '';
    }
  }
  function secondary(track) {
    if (track.kind === 'file' && track.fileName) return String(track.fileName).slice(0, 200);
    if (track.artist || track.author_nick)
      return String(track.artist || track.author_nick).slice(0, 200);
    if (track.kind === 'file') return 'На этом устройстве';
    try {
      const url = new URL(track.url);
      const name = decodeURIComponent(url.pathname.split('/').pop() || '');
      if (/\.(?:mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(name)) return name.slice(0, 200);
      if (/(^|\.)soundcloud\.com$/i.test(url.hostname)) return 'SoundCloud';
    } catch {}
    return 'ExstraChat · Музыка';
  }
  function mount() {
    if (card) return;
    card = document.createElement('aside');
    card.id = 'music-start-v216';
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML =
      '<span class="music-start-art-v216"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="5"/><path d="M24 13v-3m11 14h3M13 24h-3m14 11v3"/></svg><img alt="" decoding="async" referrerpolicy="no-referrer" hidden></span><span class="music-start-copy-v216"><strong></strong><span></span></span><time></time><span class="music-start-line-v216"><i></i></span>';
    announcement = document.createElement('p');
    announcement.className = 'music-start-announcement-v216';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    document.body.append(card, announcement);
    art = card.querySelector('.music-start-art-v216');
    image = card.querySelector('img');
    title = card.querySelector('strong');
    subtitle = card.querySelector('.music-start-copy-v216>span');
    elapsed = card.querySelector('time');
    fill = card.querySelector('i');
  }
  function clearContents() {
    if (!card) return;
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    image.hidden = true;
    art.classList.remove('has-art');
    artURL = '';
    metadataMark = '';
    title.textContent = '';
    subtitle.textContent = '';
    elapsed.textContent = '';
    announcement.textContent = '';
    fill.style.transform = 'scaleX(0)';
  }
  function hide(immediate = false) {
    const alreadyHidden = !visible && (!card || card.hidden);
    ++generation;
    visible = false;
    clearTimeout(dismissTimer);
    clearTimeout(exitTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    dismissTimer = exitTimer = 0;
    if (!card || alreadyHidden) return;
    card.classList.remove('is-visible');
    if (immediate) {
      card.hidden = true;
      clearContents();
    } else {
      const stamp = generation;
      exitTimer = setTimeout(() => {
        exitTimer = 0;
        if (stamp === generation) {
          card.hidden = true;
          clearContents();
        }
      }, 260);
    }
  }
  function metadata(track) {
    const primary = String(track.title || 'Без названия').slice(0, 180),
      detail = secondary(track),
      src = cover(track.cover_url || track.artwork || '');
    const mark = JSON.stringify([primary, detail, src]);
    if (metadataMark === mark) return;
    metadataMark = mark;
    title.textContent = primary;
    subtitle.textContent = detail;
    if (src === artURL) return;
    artURL = src;
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    image.hidden = true;
    art.classList.remove('has-art');
    if (!src) return;
    image.onload = () => {
      if (visible && artURL === src) {
        image.hidden = false;
        art.classList.add('has-art');
      }
    };
    image.onerror = () => {
      if (artURL === src) {
        image.hidden = true;
        art.classList.remove('has-art');
      }
    };
    image.src = src;
  }
  function progress(info) {
    const text = time(info.time);
    if (elapsed.textContent !== text) elapsed.textContent = text;
    const duration = seconds(info.duration || info.track?.duration),
      ratio = duration > 0 ? Math.min(1, seconds(info.time) / duration) : 0;
    const value = 'scaleX(' + Math.round(ratio * 10000) / 10000 + ')';
    if (fill.style.transform !== value) fill.style.transform = value;
    card.classList.toggle('is-indeterminate', !duration);
  }
  function show(info) {
    mount();
    clearTimeout(dismissTimer);
    clearTimeout(exitTimer);
    cancelAnimationFrame(frame);
    const stamp = ++generation;
    visible = true;
    card.hidden = false;
    metadata(info.track);
    progress(info);
    announcement.textContent = 'Сейчас играет: ' + title.textContent + '. ' + subtitle.textContent;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (stamp === generation && visible) card.classList.add('is-visible');
    });
    dismissTimer = setTimeout(() => {
      if (stamp === generation) hide();
    }, VISIBLE_MS);
  }
  function reset() {
    scope = nick();
    lastKey = '';
    wasPlaying = false;
    hide(true);
  }
  function update(info) {
    const owner = nick();
    if (owner !== scope) reset();
    const track = info?.track;
    if (!owner || !track || track.owner !== owner || info.error) {
      lastKey = '';
      wasPlaying = false;
      hide(true);
      return;
    }
    const key = JSON.stringify([owner, track.id || '', track.url || '']);
    const playing = !info.paused && !info.loading;
    const start = playing && (!wasPlaying || key !== lastKey);
    lastKey = key;
    wasPlaying = playing;
    if (document.hidden) {
      hide(true);
      return;
    }
    if (!playing) {
      if (visible) hide();
      return;
    }
    if (start) show(info);
    else if (visible) {
      metadata(track);
      progress(info);
    }
  }
  window.addEventListener('telechat-music-progress-v117', (event) => update(event.detail));
  window.addEventListener('telechat-account-ready-v175', reset);
  window.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide(true);
  });
  const accountObserver = new MutationObserver(() => {
    if (scope !== nick() || !nick()) reset();
  });
  for (const id of ['auth-screen', 'chat-screen']) {
    const node = document.getElementById(id);
    if (node) accountObserver.observe(node, { attributes: true, attributeFilter: ['class'] });
  }
  scope = nick();
})();
