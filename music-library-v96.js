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
  let opener = null, restoreFocusOnClose = false, positionFrame = 0, lastPlaybackState = '';
  const soundcloud = window.telechatSoundCloudV98;
  let cloudPlayer = null, cloudAbort = null, pendingAutoPlay = false;
  const isCloud = track => !!soundcloud?.isLink(track?.url);
  const player = () => isCloud(current) ? (cloudPlayer || {paused:true,currentTime:0,duration:current?.duration||0}) : audio;
  const inCall = () => !!document.querySelector('#voice-call-overlay.show,#voice-call-mini.show') || document.body.classList.contains('voice-call-full-v32');
  function pauseMusic() {pendingAutoPlay=false;audio.pause();cloudPlayer?.pause();}
  function seekTo(seconds) {if(isCloud(current))cloudPlayer?.seek(seconds);else if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(seconds,audio.duration));}
  function ended() {const index=tracks.findIndex(t=>t.id===current?.id);if(index>=0&&index<tracks.length-1)play(tracks[index+1]);else updatePlayers();}
  function cloudSource(url) {
    const a=document.createElement('a');a.className='music-soundcloud-source-v98';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Открыть трек на SoundCloud');a.innerHTML=soundcloud.brand;return a;
  }

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
    pendingAutoPlay=false;cloudAbort?.abort();cloudAbort=null;cloudPlayer?.destroy();cloudPlayer=null;
    byId('music-soundcloud-widget-v98')?.replaceChildren();dialog?.classList.remove('has-soundcloud-v98');
    ++playToken; audio.pause(); audio.removeAttribute('src'); audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = ''; current = null; updatePlayers();
    if ('mediaSession' in navigator) {navigator.mediaSession.metadata = null;navigator.mediaSession.playbackState = 'none';}
  }
  async function loadLibrary() {
    const nick = owner();
    if (!nick) throw new Error('Войди в аккаунт, чтобы открыть музыку.');
    if (activeOwner !== nick) { stop(); tracks = []; activeOwner = nick; renderList(); }
    const rows = await read('tracks',nick,'owner');
    if (owner() !== nick) return;
    const sorted = rows.sort((a,b) => b.added - a.added);
    const changed = JSON.stringify(sorted) !== JSON.stringify(tracks);
    tracks = sorted;
    if (changed || !byId('music-list-v96')?.childElementCount) renderList();
  }
  function normalizeLink(value) {
    let url;
    try { url = new URL(value.trim()); } catch (_) { throw new Error('Вставь полную HTTPS-ссылку на аудиофайл.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Нужна HTTPS-ссылка без логина и пароля.');
    if (soundcloud?.isLink(url.href)) return soundcloud.normalize(url.href);
    if (url.hostname === 'on.soundcloud.com') throw new Error('Открой короткую ссылку и скопируй полный адрес трека с soundcloud.com.');
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
      let seconds, cloudTitle='';
      if(soundcloud?.isLink(url)) {
        const host=byId('music-soundcloud-probe-v98');
        status('Открываем официальный плеер SoundCloud…');position();
        const probe=await soundcloud.create(url,host,{canPlay:()=>false});
        seconds=probe.duration;cloudTitle=probe.title;probe.destroy();position();
      } else seconds = await inspectAudio(url);
      if (owner() !== nick) throw new Error('Аккаунт изменился. Открой библиотеку заново.');
      let filename = new URL(url).pathname.split('/').pop() || 'Трек по ссылке';
      try {filename = decodeURIComponent(filename);} catch (_) {}
      const title = byId('music-title-v96').value.trim() || cloudTitle || filename.replace(/\.[^.]+$/,'');
      const track = {id:crypto.randomUUID(),owner:nick,title:title.slice(0,160),kind:'link',url,size:0,duration:seconds,added:Date.now()};
      await write(track);tracks.unshift(track);renderList();event.target.reset();
      status('Ссылка сохранена. Для прослушивания нужен интернет.');
    } catch (error) {status(errorText(error),true);} finally {setBusy(false);}
  }
  async function play(track) {
    if (!track || owner() !== track.owner) return;
    if (inCall()) {notify('Музыка на паузе во время звонка.');return;}
    if(isCloud(track)) {
      if(current?.id===track.id&&cloudPlayer){if(!cloudPlayer.paused)pauseMusic();else await cloudPlayer.play();return;}
      stop();const token=playToken;current=track;pendingAutoPlay=true;cloudAbort=new AbortController();
      ensureDialog();dialog.classList.add('has-soundcloud-v98');updatePlayers();position();
      try {
        cloudPlayer=await soundcloud.create(track.url,byId('music-soundcloud-widget-v98'),{
          signal:cloudAbort.signal,canPlay:()=>token===playToken&&owner()===track.owner&&!inCall(),
          onState:()=>{if(token!==playToken)return;audio.pause();updatePlayers();},onEnd:ended,onError:error=>notify(errorText(error))
        });
        if(token!==playToken||owner()!==track.owner){cloudPlayer?.destroy();cloudPlayer=null;return;}
        current.duration=cloudPlayer.duration;
        if('mediaSession' in navigator&&'MediaMetadata' in window)navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:'SoundCloud · tele.chat'});
        updatePlayers();position();
        if(pendingAutoPlay&&!inCall())await cloudPlayer.play();
      } catch(error){if(token===playToken&&error.name!=='AbortError'){stop();notify(errorText(error));}}
      return;
    }
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
    if(index<0){play(direction>0?tracks[0]:tracks[tracks.length-1]);return;}
    play(tracks[(index + direction + tracks.length) % tracks.length]);
  }
  function updatePlayers() {
    const media=player();
    if (dialog) {
      const title = dialog.querySelector('.music-now-title-v97'), hint = dialog.querySelector('.music-now-hint-v97');
      const text = current?.title || 'Включи любимый трек';
      if (title.textContent !== text) title.textContent = text;
      hint.textContent = current ? `${media.paused ? 'На паузе' : 'Сейчас играет'} · ${durationText(media.currentTime||0)} / ${durationText(current.duration)}` : 'Твоя музыка — всегда рядом';
      dialog.classList.toggle('music-is-playing-v97',!!current && !media.paused);
    }
    const playbackState = JSON.stringify([current?.url,current?.id,media.paused]);
    if (playbackState !== lastPlaybackState) {
      lastPlaybackState = playbackState;
      window.dispatchEvent(new CustomEvent('telechat-music-state-v97',{detail:{url:current?.url||'',playing:!!current&&!media.paused}}));
      if('mediaSession' in navigator)navigator.mediaSession.playbackState=current?(media.paused?'paused':'playing'):'none';
    }
    document.querySelectorAll('.music-player-v96').forEach(player => {
      player.hidden = !current;
      if (!current) return;
      const title = player.querySelector('.music-player-title');
      if (title.textContent !== current.title) title.textContent = current.title;
      const button = player.querySelector('[data-music="toggle"]');
      const state = media.paused ? 'play' : 'pause';
      if (button.dataset.state !== state) {
        button.innerHTML = svg(state);button.dataset.state = state;
        button.setAttribute('aria-label',media.paused ? 'Воспроизвести' : 'Пауза');
      }
      const seek = player.querySelector('.music-seek');
      seek.max = Number.isFinite(media.duration) ? media.duration : current.duration;
      if (document.activeElement !== seek) seek.value = media.currentTime || 0;
      seek.style.setProperty('--music-progress',Math.min(100,Math.max(0,(media.currentTime||0)/Number(seek.max)*100||0))+'%');
      player.querySelector('.music-time').textContent = durationText(media.currentTime || 0) + ' / ' + durationText(current.duration);
      player.querySelector('[data-music="previous"]').disabled = tracks.length < 2;
      player.querySelector('[data-music="next"]').disabled = tracks.length < 2;
    });
    dialog?.querySelectorAll('.music-track-v96').forEach(row => {
      const selected = row.dataset.id === current?.id;
      row.classList.toggle('is-current',selected);
      const button = row.querySelector('.music-track-play'), state = selected && !media.paused ? 'pause' : 'play';
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
      row.innerHTML = `<button type="button" class="music-track-play">${svg('play')}</button><div class="music-track-copy"><strong></strong><small></small></div><span class="music-track-duration"></span><button type="button" class="music-track-more-v97" aria-label="Действия с треком" aria-expanded="false">⋯</button><div class="music-track-actions-v97" hidden><button type="button" class="music-track-profile-v97">В профиль</button><button type="button" class="music-track-remove" aria-label="Удалить трек">${svg('trash')}<span>Удалить</span></button></div>`;
      row.querySelector('strong').textContent = track.title;
      row.querySelector('small').textContent = track.kind === 'file' ? 'На устройстве · без интернета' : 'По ссылке · нужен интернет';
      if(isCloud(track)){row.querySelector('small').textContent='SoundCloud · онлайн';row.querySelector('.music-track-copy').append(cloudSource(track.url));}
      row.querySelector('.music-track-duration').textContent = durationText(track.duration);
      row.querySelector('.music-track-play').addEventListener('click',() => play(track));
      const menu = row.querySelector('.music-track-actions-v97'), more = row.querySelector('.music-track-more-v97');
      more.addEventListener('click',() => {
        const expanded = menu.hidden;
        list.querySelectorAll('.music-track-actions-v97').forEach(el=>el.hidden=true);
        list.querySelectorAll('.music-track-more-v97').forEach(el=>el.setAttribute('aria-expanded','false'));
        menu.hidden = !expanded;more.setAttribute('aria-expanded',String(expanded));position();
      });
      const profileButton = row.querySelector('.music-track-profile-v97');
      const profileMusic = window.telechatProfileMusicV97;
      const selected = profileMusic?.getOwn()?.url === track.url && track.kind === 'link';
      profileButton.textContent = selected ? 'Убрать из профиля' : 'В профиль';
      profileButton.addEventListener('click',async () => {
        if (track.kind !== 'link') {status('В профиль можно добавить трек по прямой ссылке. Файл хранится только на этом устройстве.',true);position();return;}
        if (!profileMusic || profileButton.disabled) return;
        profileButton.disabled = true;status('Сохраняем трек в профиле…');
        try {
          const removing = profileMusic.getOwn()?.url === track.url;
          await profileMusic.save(removing ? null : track);
          status(removing ? 'Трек убран из профиля.' : 'Трек добавлен в профиль — другие смогут его послушать.');renderList();
        } catch(error) {status(errorText(error),true);profileButton.disabled=false;}
        position();
      });
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
    position();
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
    node.querySelector('.music-seek').addEventListener('input',event => seekTo(Number(event.target.value)));
    return node;
  }
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');dialog.id = 'music-dialog-v96';dialog.setAttribute('aria-labelledby','music-heading-v96');
    dialog.innerHTML = `<div class="music-cover-v97"><div class="music-cover-wave-v97" aria-hidden="true"></div><h2 id="music-heading-v96">Моя музыка</h2><button type="button" class="music-close-v96" aria-label="Закрыть музыку">${svg('close')}</button></div><div class="music-body-v96"><div class="music-now-v97"><div class="music-record-v97" aria-hidden="true"><span>♪</span></div><span class="music-now-label-v97">ТВОЯ ВОЛНА</span><h3 class="music-now-title-v97">Включи любимый трек</h3><p class="music-now-hint-v97">Твоя музыка — всегда рядом</p></div><div class="music-library-head-v96"><h3>Мои треки</h3><span id="music-count-v96"></span></div><input type="search" id="music-search-v96" placeholder="Найти трек" aria-label="Найти трек"><div id="music-list-v96"></div><div class="music-add-v96"><button type="button" class="music-upload-v96" data-music-add>${svg('upload')}<span>Загрузить треки<small>До 50 МБ на файл</small></span><b aria-hidden="true">›</b></button><input type="file" id="music-files-v96" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac" multiple hidden><details class="music-link-details-v96"><summary>Добавить по ссылке</summary><form id="music-link-form-v96"><label>Прямая HTTPS-ссылка на аудио<input type="url" id="music-url-v96" placeholder="https://example.com/track.mp3" required maxlength="4096"></label><label>Название · необязательно<input id="music-title-v96" placeholder="Как назвать трек" maxlength="160"></label><button type="submit" data-music-add>Сохранить ссылку</button></form></details></div><div id="music-status-v96" role="status" aria-live="polite"></div><details class="music-storage-v97"><summary>Хранится на этом устройстве</summary><p class="music-storage-note-v96">Файлы доступны без интернета, ссылки — онлайн. До 100 треков и 250 МБ. Очистка данных сайта удалит библиотеку. В профиль можно добавить трек по прямой ссылке.</p></details></div>`;
    document.body.append(dialog);dialog.querySelector('.music-now-v97').append(makePlayer('music-dialog-player'));
    if(soundcloud){
      const support=document.createElement('a');support.className='music-soundcloud-support-v98';support.href='https://soundcloud.com';support.target='_blank';support.rel='noopener noreferrer';
      support.innerHTML=soundcloud.brand+'<span><strong>Поддерживается</strong>Добавляй ссылки на треки</span>';
      dialog.querySelector('.music-add-v96').prepend(support);
      const label=byId('music-url-v96').parentElement;label.firstChild.textContent='Ссылка SoundCloud или прямая ссылка на аудио';
      byId('music-url-v96').placeholder='https://soundcloud.com/artist/track';
      const host=document.createElement('div');host.id='music-soundcloud-widget-v98';host.className='music-soundcloud-widget-v98';dialog.querySelector('.music-now-v97').after(host);
      const probe=document.createElement('div');probe.id='music-soundcloud-probe-v98';probe.className='music-soundcloud-probe-v98';byId('music-link-form-v96').append(probe);
      dialog.querySelector('.music-storage-note-v96').textContent='Файлы доступны без интернета, ссылки и SoundCloud — онлайн. До 100 треков и 250 МБ файлов. Очистка данных сайта удалит библиотеку. Треки по ссылке можно добавить в профиль. SoundCloud может ограничивать доступ к отдельным трекам.';
    }
    dialog.querySelector('.music-close-v96').addEventListener('click',() => close(true));
    dialog.addEventListener('close',() => {
      if(dialog.open)return;
      trigger.setAttribute('aria-expanded','false');
      if (restoreFocusOnClose && opener?.isConnected) opener.focus({preventScroll:true});
      restoreFocusOnClose = false;
    });
    dialog.querySelectorAll('details').forEach(el=>el.addEventListener('toggle',position));
    dialog.querySelector('.music-upload-v96').addEventListener('click',() => byId('music-files-v96').click());
    byId('music-files-v96').addEventListener('change',event => addFiles([...event.target.files]));
    byId('music-link-form-v96').addEventListener('submit',addLink);
    byId('music-search-v96').addEventListener('input',renderList);
    updatePlayers();
  }
  function close(restore=false) {if(!dialog?.open)return;restoreFocusOnClose=restore;dialog.close();}
  function position() {
    if (!dialog?.open || positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;if(!dialog?.open)return;
      const viewport = window.visualViewport, x = viewport?.offsetLeft||0, y = viewport?.offsetTop||0;
      const width = viewport?.width||innerWidth, height = viewport?.height||innerHeight;
      const anchor = (opener?.isConnected ? opener : trigger).getBoundingClientRect();
      dialog.style.width = Math.min(350,width-24)+'px';
      dialog.classList.toggle('music-short-v97',height<600);
      dialog.style.maxHeight = Math.max(80,Math.min(660,height-24))+'px';
      const rect={width:dialog.offsetWidth,height:dialog.offsetHeight};
      dialog.style.left = Math.max(x+12,Math.min(anchor.left,x+width-rect.width-12))+'px';
      dialog.style.top = Math.max(y+12,Math.min(anchor.bottom+8,y+height-rect.height-12))+'px';
      dialog.style.transformOrigin = `${Math.max(12,Math.min(rect.width-12,anchor.left+anchor.width/2-parseFloat(dialog.style.left)))}px top`;
    });
  }
  async function open(trigger) {
    if (!owner()) {window.showToast?.('Сначала войди в аккаунт');return;}
    ensureDialog();opener = trigger || document.activeElement;
    if (!dialog.open) dialog.show();
    trigger?.setAttribute('aria-expanded','true');position();
    if(!tracks.length)status('Открываем библиотеку…');
    try {await loadLibrary();status('');} catch (error) {status(errorText(error),true);}
    position();
  }
  const top = document.querySelector('.sidebar-top');if (!top) return;
  const trigger = document.createElement('button');trigger.type = 'button';trigger.className = 'music-entry-v96';
  trigger.innerHTML = `${svg('music')}<span>Моя музыка</span><b aria-hidden="true">›</b>`;
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','music-dialog-v96');trigger.setAttribute('aria-expanded','false');
  trigger.addEventListener('click',() => dialog?.open ? close() : open(trigger));top.append(trigger);
  document.addEventListener('pointerdown',event=>{if(dialog?.open&&!dialog.contains(event.target)&&!trigger.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(dialog?.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('focusin',event=>{if(dialog?.open&&!dialog.contains(event.target)&&!trigger.contains(event.target))close();});
  window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  window.addEventListener('telechat-profile-music-updated-v97',()=>{if(dialog)renderList();});
  window.telechatMusicV96 = {
    async playLink(track,nick) {
      if(!owner())return;
      const url = normalizeLink(track.url);
      if(current?.kind==='link'&&current.url===url&&current.owner===owner())return play(current);
      await loadLibrary();
      return play({id:'profile:'+nick+':'+url,owner:owner(),kind:'link',url,title:track.title||'Музыка профиля',duration:track.duration||0});
    }
  };
  document.querySelector('.sidebar-footer')?.before(makePlayer('music-sidebar-player'));
  document.querySelector('.chat-main')?.prepend(makePlayer('music-chat-player'));
  for (const name of ['play','pause','timeupdate','loadedmetadata','durationchange']) audio.addEventListener(name,updatePlayers);
  audio.addEventListener('loadedmetadata',()=>{if(current&&!isCloud(current)&&Number.isFinite(audio.duration)){current.duration=audio.duration;updatePlayers();}});
  if ('mediaSession' in navigator) {
    for (const [action,handler] of Object.entries({play:()=>current&&player().paused&&play(current),pause:pauseMusic,previoustrack:()=>step(-1),nexttrack:()=>step(1),seekto:event=>seekTo(event.seekTime)})) {
      try {navigator.mediaSession.setActionHandler(action,handler);} catch (_) {}
    }
  }
  audio.addEventListener('ended',ended);
  audio.addEventListener('error',() => {if(current&&!isCloud(current)) notify('Трек сейчас недоступен. Проверь интернет или добавь файл заново.');});
  // A voice message or a call should never compete with music.
  document.addEventListener('play',event => {if (event.target !== audio && event.target instanceof HTMLMediaElement && !event.target.muted && event.target.volume > 0) pauseMusic();},true);
  new MutationObserver(() => {if(inCall()) pauseMusic();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pagehide',stop);
})();
