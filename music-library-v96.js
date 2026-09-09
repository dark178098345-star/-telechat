/* Personal, device-local music. No audio is uploaded to the chat backend. */
(() => {
  'use strict';
  const TRACK_LIMIT = 50 * 1024 * 1024, LIBRARY_LIMIT = 250 * 1024 * 1024, COUNT_LIMIT = 100;
  const audio = new Audio();
  audio.preload = 'metadata';
  const icons = {
    music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
    play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
    previous:'<path d="M5 5v14m14-14L8 12l11 7Z"/>',next:'<path d="M19 5v14M5 5l11 7L5 19Z"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/>',link:'<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.music}</svg>`;
  const byId = id => document.getElementById(id);
  const owner = () => { try { return typeof me !== 'undefined' && me?.nick ? String(me.nick) : ''; } catch (_) { return ''; } };
  const durationText = value => Number.isFinite(value) ? Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2,'0') : '—';
  let dbPromise, dialog, tracks = [], activeOwner = '', current = null, objectUrl = '', playToken = 0, busy = false;
  let opener = null;

  function database() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject) => {
      const request = indexedDB.open('telechat_music_v96',1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('tracks',{keyPath:'id'}).createIndex('owner','owner');
        db.createObjectStore('files');
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); dbPromise = null; };
        resolve(request.result);
      };
      request.onerror = () => { dbPromise = null; reject(request.error); };
      request.onblocked = () => { dbPromise = null; reject(new Error('Закрой другие вкладки tele.chat и попробуй снова.')); };
    });
    return dbPromise;
  }
  async function read(store, key, index) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(store,'readonly'), source = tx.objectStore(store);
      const request = index ? source.index(index).getAll(key) : source.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function write(track, blob, remove = false) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(['tracks','files'],'readwrite');
      if (remove) { tx.objectStore('tracks').delete(track.id); tx.objectStore('files').delete(track.id); }
      else { tx.objectStore('tracks').put(track); if (blob) tx.objectStore('files').put(blob,track.id); }
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Не удалось сохранить трек.'));
    });
  }
  function errorText(error) {
    if (error?.name === 'QuotaExceededError') return 'На устройстве не хватает места. Удали несколько треков и попробуй снова.';
    if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') return 'Браузер запретил локальное хранилище. Разреши хранение данных сайта.';
    return error?.message || 'Не удалось открыть музыкальную библиотеку.';
  }
  function status(text, error = false) {
    const node = byId('music-status-v96');
    if (node) { node.textContent = text; node.classList.toggle('is-error',error); }
  }
  function notify(text) {
    status(text,true);
    if (!dialog?.open) window.showToast?.(text);
  }
  function stop() {
    ++playToken; audio.pause(); audio.removeAttribute('src'); audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = ''; current = null; updatePlayers();
    if ('mediaSession' in navigator) {navigator.mediaSession.metadata = null;navigator.mediaSession.playbackState = 'none';}
  }
  async function loadLibrary() {
    const nick = owner();
    if (!nick) throw new Error('Войди в аккаунт, чтобы открыть музыку.');
    if (activeOwner !== nick) { stop(); tracks = []; activeOwner = nick; }
    const rows = await read('tracks',nick,'owner');
    if (owner() !== nick) return;
    tracks = rows.sort((a,b) => b.added - a.added);
    renderList();
  }
  function normalizeLink(value) {
    let url;
    try { url = new URL(value.trim()); } catch (_) { throw new Error('Вставь полную HTTPS-ссылку на аудиофайл.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Нужна HTTPS-ссылка без логина и пароля.');
    if (/(^|\.)(youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|music\.yandex\.(ru|com))$/i.test(url.hostname)) {
      throw new Error('Это страница музыкального сервиса. Нужна прямая ссылка на аудиофайл.');
    }
    return url.href;
  }
  function inspectAudio(src) {
    return new Promise((resolve,reject) => {
      const probe = new Audio(); probe.preload = 'metadata';
      const timer = setTimeout(() => finish(new Error('Аудио не отвечает. Проверь ссылку или выбери файл.')),15000);
      function finish(error) {
        clearTimeout(timer); probe.onloadedmetadata = probe.onerror = null;
        const seconds = probe.duration;
        probe.removeAttribute('src');probe.load();
        if (error) reject(error);
        else if (!Number.isFinite(seconds) || seconds <= 0) reject(new Error('Нужен обычный аудиотрек с конечной длительностью.'));
        else resolve(seconds);
      }
      probe.onloadedmetadata = () => finish();
      probe.onerror = () => finish(new Error('Не удалось прочитать аудио. Подойдёт MP3, M4A, WAV, OGG или другой формат, который воспроизводит браузер.'));
      probe.src = src;
    });
  }
  function setBusy(value) {
    busy = value;
    dialog.querySelectorAll('[data-music-add],#music-url-v96,#music-title-v96').forEach(el => el.disabled = value);
  }
  async function addFile(file, nick) {
    if (!file || !file.size) throw new Error('Выбери непустой аудиофайл.');
    if (file.size > TRACK_LIMIT) throw new Error('Один трек — до 50 МБ.');
    if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(file.name)) throw new Error('Выбери аудиофайл.');
    if (tracks.length >= COUNT_LIMIT) throw new Error('В библиотеке уже 100 треков. Удали ненужные, чтобы добавить новые.');
    if (tracks.reduce((sum,t) => sum + t.size,0) + file.size > LIBRARY_LIMIT) throw new Error('Библиотека вмещает до 250 МБ файлов. Удали ненужные треки.');
    const src = URL.createObjectURL(file);
    let seconds;
    try { seconds = await inspectAudio(src); } finally { URL.revokeObjectURL(src); }
    if (owner() !== nick) throw new Error('Аккаунт изменился. Открой библиотеку заново.');
    const track = {id:crypto.randomUUID(),owner:nick,title:file.name.replace(/\.[^.]+$/,'').slice(0,160),kind:'file',size:file.size,duration:seconds,added:Date.now()};
    await write(track,file);tracks.unshift(track);renderList();
  }
  async function addFiles(files) {
    if (busy || !files.length) return;
    setBusy(true);let count = 0;
    try {
      await loadLibrary();const nick = owner();
      for (const file of files) {status('Сохраняем: ' + file.name);await addFile(file,nick);count++;}
      status(`Сохранено треков: ${count}. Можно слушать без интернета.`);
    } catch (error) {status((count ? `Сохранено: ${count}. ` : '') + errorText(error),true);}
    finally {setBusy(false);byId('music-files-v96').value = '';}
  }
  async function addLink(event) {
    event.preventDefault();if (busy) return;
    setBusy(true);
    try {
      await loadLibrary();const nick = owner(), url = normalizeLink(byId('music-url-v96').value);
      if (tracks.some(t => t.url === url)) throw new Error('Эта ссылка уже есть в библиотеке.');
      if (tracks.length >= COUNT_LIMIT) throw new Error('В библиотеке уже 100 треков.');
      status('Проверяем аудио по ссылке…');
      const seconds = await inspectAudio(url);
      if (owner() !== nick) throw new Error('Аккаунт изменился. Открой библиотеку заново.');
      let filename = new URL(url).pathname.split('/').pop() || 'Трек по ссылке';
      try {filename = decodeURIComponent(filename);} catch (_) {}
      const title = byId('music-title-v96').value.trim() || filename.replace(/\.[^.]+$/,'');
      const track = {id:crypto.randomUUID(),owner:nick,title:title.slice(0,160),kind:'link',url,size:0,duration:seconds,added:Date.now()};
      await write(track);tracks.unshift(track);renderList();event.target.reset();
      status('Ссылка сохранена. Для прослушивания нужен интернет.');
    } catch (error) {status(errorText(error),true);} finally {setBusy(false);}
  }
  async function play(track) {
    if (!track || owner() !== track.owner) return;
    if (document.querySelector('#voice-call-overlay.show,#voice-call-mini.show')) {notify('Музыка на паузе во время звонка.');return;}
    if (current?.id === track.id) {
      if (!audio.paused) {audio.pause();return;}
      try {await audio.play();} catch (_) {notify('Нажми ▶ ещё раз. Если трек недоступен, добавь его заново.');}
      return;
    }
    stop();const token = playToken;
    try {
      let src = track.url;
      if (track.kind === 'file') {
        const blob = await read('files',track.id);
        if (token !== playToken || owner() !== track.owner) return;
        if (!blob) throw new Error('Файл больше не хранится на устройстве. Добавь его заново.');
        src = objectUrl = URL.createObjectURL(blob);
      }
      if (token !== playToken || owner() !== track.owner) return;
      current = track;audio.src = src;updatePlayers();
      if ('mediaSession' in navigator && 'MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({title:track.title,artist:'Моя музыка · tele.chat'});
      await audio.play();
    } catch (error) {
      if (token !== playToken) return;
      notify(error.name === 'NotAllowedError' ? 'Трек готов. Нажми ▶ для воспроизведения.' : errorText(error));
    }
  }
  function step(direction) {
    if (!current || tracks.length < 2) return;
    const index = tracks.findIndex(t => t.id === current.id);
    play(tracks[(index + direction + tracks.length) % tracks.length]);
  }
  function updatePlayers() {
    document.querySelectorAll('.music-player-v96').forEach(player => {
      player.hidden = !current;
      if (!current) return;
      const title = player.querySelector('.music-player-title');
      if (title.textContent !== current.title) title.textContent = current.title;
      const button = player.querySelector('[data-music="toggle"]');
      const state = audio.paused ? 'play' : 'pause';
      if (button.dataset.state !== state) {
        button.innerHTML = svg(state);button.dataset.state = state;
        button.setAttribute('aria-label',audio.paused ? 'Воспроизвести' : 'Пауза');
      }
      const seek = player.querySelector('.music-seek');
      seek.max = Number.isFinite(audio.duration) ? audio.duration : current.duration;
      if (document.activeElement !== seek) seek.value = audio.currentTime || 0;
      player.querySelector('.music-time').textContent = durationText(audio.currentTime || 0) + ' / ' + durationText(current.duration);
      player.querySelector('[data-music="previous"]').disabled = tracks.length < 2;
      player.querySelector('[data-music="next"]').disabled = tracks.length < 2;
    });
    dialog?.querySelectorAll('.music-track-v96').forEach(row => {
      const selected = row.dataset.id === current?.id;
      row.classList.toggle('is-current',selected);
      const button = row.querySelector('.music-track-play'), state = selected && !audio.paused ? 'pause' : 'play';
      if (button.dataset.state !== state) {
        button.innerHTML = svg(state);button.dataset.state = state;
        button.setAttribute('aria-label',(state === 'pause' ? 'Пауза: ' : 'Слушать: ') + row.querySelector('strong').textContent);
      }
    });
  }
  function renderList() {
    const list = byId('music-list-v96');if (!list) return;
    const query = byId('music-search-v96').value.trim().toLocaleLowerCase();
    const shown = tracks.filter(t => t.title.toLocaleLowerCase().includes(query));
    list.replaceChildren();
    byId('music-count-v96').textContent = `${tracks.length} / 100 треков · ${(tracks.reduce((sum,t) => sum+t.size,0)/1024/1024).toFixed(1)} / 250 МБ`;
    if (!shown.length) {
      const empty = document.createElement('p');empty.className = 'music-empty-v96';
      empty.textContent = query ? 'Такого трека пока нет.' : 'Твоя музыка будет здесь. Добавь первый трек — и включай его в любом чате.';list.append(empty);
    }
    for (const track of shown) {
      const row = document.createElement('div');row.className = 'music-track-v96';row.dataset.id = track.id;
      row.innerHTML = `<button type="button" class="music-track-play">${svg('play')}</button><div class="music-track-copy"><strong></strong><small></small></div><span class="music-track-duration"></span><button type="button" class="music-track-remove" aria-label="Удалить трек">${svg('trash')}</button>`;
      row.querySelector('strong').textContent = track.title;
      row.querySelector('small').textContent = track.kind === 'file' ? 'На устройстве · без интернета' : 'По ссылке · нужен интернет';
      row.querySelector('.music-track-duration').textContent = durationText(track.duration);
      row.querySelector('.music-track-play').addEventListener('click',() => play(track));
      row.querySelector('.music-track-remove').addEventListener('click',async event => {
        if (busy || owner() !== track.owner || !confirm(`Удалить «${track.title}» из своей библиотеки?`)) return;
        const button = event.currentTarget;button.disabled = true;
        try {
          await write(track,null,true);
          if (current?.id === track.id) stop();
          tracks = tracks.filter(t => t.id !== track.id);renderList();status('Трек удалён из библиотеки.');
        } catch (error) {status(errorText(error),true);button.disabled = false;}
      });
      list.append(row);
    }
    updatePlayers();
  }
  function makePlayer(extra) {
    const node = document.createElement('section');node.className = 'music-player-v96 ' + extra;node.hidden = true;node.setAttribute('aria-label','Музыкальный плеер');
    node.innerHTML = `<div class="music-player-top"><button type="button" class="music-player-open" data-music="library" aria-label="Открыть музыку">${svg('music')}</button><div class="music-player-copy"><strong class="music-player-title"></strong><span class="music-time"></span></div><button type="button" data-music="previous" aria-label="Предыдущий трек">${svg('previous')}</button><button type="button" data-music="toggle" aria-label="Воспроизвести">${svg('play')}</button><button type="button" data-music="next" aria-label="Следующий трек">${svg('next')}</button><button type="button" data-music="stop" aria-label="Закрыть плеер">${svg('close')}</button></div><input class="music-seek" type="range" min="0" max="1" value="0" step="0.1" aria-label="Позиция в треке">`;
    node.addEventListener('click',event => {
      const button = event.target.closest('[data-music]');if (!button) return;
      const action = button.dataset.music;
      if (action === 'library') open(button);
      if (action === 'toggle' && current) play(current);
      if (action === 'stop') stop();
      if (action === 'previous') step(-1);
      if (action === 'next') step(1);
    });
    node.querySelector('.music-seek').addEventListener('input',event => {if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value);});
    return node;
  }
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');dialog.id = 'music-dialog-v96';dialog.setAttribute('aria-labelledby','music-heading-v96');
    dialog.innerHTML = `<div class="music-head-v96"><div class="music-heading-icon">${svg('music')}</div><div><h2 id="music-heading-v96">Моя музыка</h2><p>Твой ритм, рядом с разговорами</p></div><button type="button" class="music-close-v96" aria-label="Закрыть музыку">${svg('close')}</button></div><div class="music-body-v96"><div class="music-add-v96"><button type="button" class="music-upload-v96" data-music-add>${svg('upload')}<span>Загрузить треки<small>До 50 МБ на один файл</small></span></button><input type="file" id="music-files-v96" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac" multiple hidden><details class="music-link-details-v96"><summary>Добавить по ссылке</summary><form id="music-link-form-v96"><label>Прямая HTTPS-ссылка на аудио<input type="url" id="music-url-v96" placeholder="https://example.com/track.mp3" required maxlength="4096"></label><label>Название · необязательно<input id="music-title-v96" placeholder="Как назвать трек" maxlength="160"></label><button type="submit" data-music-add>Сохранить ссылку</button></form></details></div><p class="music-storage-note-v96">Библиотека этого аккаунта хранится только на этом устройстве. Файлы доступны без интернета, ссылки — онлайн. Очистка данных сайта удалит библиотеку.</p><div id="music-status-v96" role="status" aria-live="polite"></div><div class="music-library-head-v96"><h3>Мои треки</h3><span id="music-count-v96"></span></div><input type="search" id="music-search-v96" placeholder="Найти в моей музыке" aria-label="Найти трек"><div id="music-list-v96"></div></div>`;
    document.body.append(dialog);dialog.append(makePlayer('music-dialog-player'));
    dialog.querySelector('.music-close-v96').addEventListener('click',() => dialog.close());
    dialog.addEventListener('close',() => {if (opener?.isConnected) opener.focus({preventScroll:true});});
    dialog.querySelector('.music-upload-v96').addEventListener('click',() => byId('music-files-v96').click());
    byId('music-files-v96').addEventListener('change',event => addFiles([...event.target.files]));
    byId('music-link-form-v96').addEventListener('submit',addLink);
    byId('music-search-v96').addEventListener('input',renderList);
  }
  async function open(trigger) {
    if (!owner()) {window.showToast?.('Сначала войди в аккаунт');return;}
    ensureDialog();opener = trigger || document.activeElement;
    if (!dialog.open) dialog.showModal();
    status('Открываем библиотеку…');
    try {await loadLibrary();status('');} catch (error) {status(errorText(error),true);}
  }
  const top = document.querySelector('.sidebar-top');if (!top) return;
  const trigger = document.createElement('button');trigger.type = 'button';trigger.className = 'music-entry-v96';
  trigger.innerHTML = `${svg('music')}<span>Моя музыка</span><b aria-hidden="true">›</b>`;
  trigger.setAttribute('aria-haspopup','dialog');trigger.addEventListener('click',() => open(trigger));top.append(trigger);
  document.querySelector('.sidebar-footer')?.before(makePlayer('music-sidebar-player'));
  document.querySelector('.chat-main')?.prepend(makePlayer('music-chat-player'));
  for (const name of ['play','pause','timeupdate','loadedmetadata','durationchange']) audio.addEventListener(name,updatePlayers);
  if ('mediaSession' in navigator) {
    for (const [action,handler] of Object.entries({play:()=>current&&audio.paused&&play(current),pause:()=>audio.pause(),previoustrack:()=>step(-1),nexttrack:()=>step(1),seekto:event=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(event.seekTime,audio.duration));}})) {
      try {navigator.mediaSession.setActionHandler(action,handler);} catch (_) {}
    }
    audio.addEventListener('play',()=>navigator.mediaSession.playbackState='playing');
    audio.addEventListener('pause',()=>navigator.mediaSession.playbackState=current?'paused':'none');
  }
  audio.addEventListener('ended',() => {
    const index = tracks.findIndex(t => t.id === current?.id);
    if (index >= 0 && index < tracks.length-1) play(tracks[index+1]);
    else updatePlayers();
  });
  audio.addEventListener('error',() => {if(current) notify('Трек сейчас недоступен. Проверь интернет или добавь файл заново.');});
  // A voice message or a call should never compete with music.
  document.addEventListener('play',event => {if (event.target !== audio && event.target instanceof HTMLMediaElement && !event.target.muted && event.target.volume > 0) audio.pause();},true);
  new MutationObserver(() => {if(document.body.classList.contains('voice-call-full-v32')) audio.pause();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pagehide',stop);
})();
