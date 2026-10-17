/* Sequential camera/gallery preparation; one selection owns all its Blobs. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), urls = new Set(), staging = new Map();
  const limit = window.exstraPhotoAlbumV183 || { maxCount: 10, maxBytes: 40 * 1048576 };
  const chooser = $('chat-photo-input'), input = $('msg-input'), originalPlaceholder = input?.placeholder;
  let generation = 0, job = null, appendNext = false;
  if (chooser) chooser.multiple = true;
  const context = () => { try { return [String(me?.nick || ''), String(conversationKey() || '')]; } catch (_) { return ['', '']; } };
  const entries = media => media?._albumV183 || (media?._photoBlobV182 instanceof Blob ? [{ blob: media._photoBlobV182, url: media.data }] : []);
  function busy(value) {
    $('input-area')?.toggleAttribute('data-photo-preparing-v182', value);
    for (const button of document.querySelectorAll('#input-area .send-btn')) {
      if (value) { button.dataset.photoDisabledV182 = String(button.disabled); button.disabled = true; }
      else if (button.dataset.photoDisabledV182 !== undefined) { button.disabled = button.dataset.photoDisabledV182 === 'true'; delete button.dataset.photoDisabledV182; }
    }
  }
  function cancel() { generation++; job?.abort(); job = null; busy(false); }
  function release() {
    const kept = new Set(entries(pendingMedia).map(item => item.url));
    for (const staged of staging.values()) for (const item of staged) kept.add(item.url);
    for (const url of urls) if (!kept.has(url)) { URL.revokeObjectURL(url); urls.delete(url); }
  }
  function commit(items) {
    pendingMedia = items.length > 1 ? { kind: 'album', data: '', duration: 0, _albumV183: items } :
      items.length === 1 ? { kind: 'image', data: items[0].url, duration: 0, _photoBlobV182: items[0].blob } : null;
    window.renderPendingMedia?.();
  }
  async function prepare(file, signal) {
    if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type) && !(file.type === '' && /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name))) throw Error('Выбери фото JPG, PNG, WebP, GIF, AVIF или HEIC');
    if (file.size < 1 || file.size > 32 * 1048576) throw Error('Выбери непустое фото до 32 МБ. Оно будет сжато перед отправкой.');
    const source = URL.createObjectURL(file), image = new Image(); let timer, canvas;
    const timeout = new AbortController(), abort = () => timeout.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) timeout.abort();
    timer = setTimeout(abort, 20000);
    const guarded = promise => new Promise((resolve, reject) => {
      const stopped = () => reject(new DOMException('Отменено', 'AbortError'));
      if (timeout.signal.aborted) { stopped(); return; }
      timeout.signal.addEventListener('abort', stopped, { once: true });
      promise.then(resolve, reject).finally(() => timeout.signal.removeEventListener('abort', stopped));
    });
    try {
      await guarded(new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('Телефон не смог открыть фото. Попробуй JPG/PNG или отправь оригинал как файл.')); image.src = source; }));
      const width = image.naturalWidth, height = image.naturalHeight;
      if (!width || !height || width * height > 60000000) throw Error('Выбери снимок до 60 мегапикселей.');
      const scale = Math.min(1, 1600 / Math.max(width, height));
      canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw Error('Не удалось подготовить фото');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await guarded(new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('Не удалось сжать фото')), 'image/jpeg', .84)));
      if (blob.size > 20 * 1048576) throw Error('Фото не удалось сжать до 20 МБ');
      return blob;
    } catch (error) {
      if (timeout.signal.aborted && !signal.aborted) throw Error('Подготовка фото заняла слишком много времени. Выбери его ещё раз.');
      throw error;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); URL.revokeObjectURL(source); image.src = ''; if (canvas) canvas.width = canvas.height = 1; }
  }
  async function select(element) {
    const files = [...element.files || []], append = appendNext; appendNext = false; element.value = '';
    if (!files.length) return;
    cancel(); const [owner, key] = context();
    if (!owner || !key || !window.canWriteCurrent?.()) { window.showToast?.('Здесь нельзя отправить фотографию'); return; }
    if (window.telechatAttachmentsV141?.isUploading?.()) { window.showToast?.('Дождись отправки или убери отправляемое вложение'); return; }
    const base = pendingMedia, previous = append ? entries(base) : [];
    if (previous.length + files.length > limit.maxCount) { window.showToast?.('В одном альбоме — до 10 фото. Выбери меньше снимков.'); return; }
    window.telechatVoiceV125?.cancel();
    const token = generation, controller = new AbortController(), prepared = []; staging.set(controller, prepared); job = controller; busy(true);
    const current = () => !controller.signal.aborted && generation === token && context()[0] === owner && context()[1] === key && pendingMedia === base;
    try {
      let total = previous.reduce((sum, item) => sum + item.blob.size, 0);
      for (const [index, file] of files.entries()) {
        window.showToast?.(files.length === 1 ? 'Подготавливаем фотографию…' : 'Подготавливаем фото ' + (index + 1) + ' из ' + files.length + '…');
        const blob = await prepare(file, controller.signal); if (!current()) return;
        total += blob.size; if (total > limit.maxBytes) throw Error('Альбом после сжатия должен быть не больше 40 МБ. Убери часть фото.');
        const url = URL.createObjectURL(blob); urls.add(url); prepared.push({ blob, url });
      }
      if (!current()) return;
      job = null; busy(false); commit([...previous, ...prepared]);
      window.showToast?.(pendingMedia.kind === 'album' ? 'Альбом готов. Порядок фото можно изменить.' : 'Фотография готова к отправке');
    } catch (error) { if (error.name !== 'AbortError' && current()) window.showToast?.(error.message || 'Не удалось подготовить фото'); }
    finally { staging.delete(controller); if (job === controller) { job = null; busy(false); } release(); }
  }
  const render = window.renderPendingMedia;
  window.renderPendingMedia = function (...args) {
    if (job && pendingMedia !== null && !entries(pendingMedia).length) cancel();
    release(); const album = pendingMedia?._albumV183, box = $('pending-media');
    if (input) input.placeholder = album ? 'Общая подпись к альбому…' : originalPlaceholder;
    box?.classList.toggle('album-pending-v183', !!album);
    if (!album || !box) return render?.apply(this, args);
    box.classList.add('show'); box.replaceChildren();
    const header = document.createElement('div'); header.className = 'album-pending-head-v183';
    const label = document.createElement('strong'); label.className = 'pending-label'; label.textContent = pendingMedia._uploadStatusV183 || 'Альбом · ' + album.length + ' фото';
    const controls = document.createElement('div'), uploading = !!window.telechatAttachmentsV141?.isUploading?.();
    const button = (text, title, action, disabled = false) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', title); b.title = title; b.disabled = disabled || uploading || !!job; b.onclick = action; return b; };
    const add = button('+ Фото', 'Добавить фото в альбом', () => { appendNext = true; chooser.click(); }, album.length >= limit.maxCount);
    const remove = button('×', 'Убрать альбом', () => window.cancelPendingMedia()); remove.disabled = false;
    controls.append(add, remove); header.append(label, controls);
    const rail = document.createElement('div'); rail.className = 'album-pending-rail-v183';
    album.forEach((item, index) => {
      const tile = document.createElement('div'); tile.className = 'album-pending-item-v183';
      const img = document.createElement('img'); img.src = item.url; img.alt = 'Фото ' + (index + 1); img.draggable = false;
      const bar = document.createElement('div');
      const move = step => { const next = [...album]; [next[index], next[index + step]] = [next[index + step], next[index]]; commit(next); $('pending-media').querySelectorAll('.album-pending-item-v183')[index + step]?.querySelector('button')?.focus({ preventScroll: true }); };
      bar.append(button('‹', 'Переместить фото ' + (index + 1) + ' влево', () => move(-1), index === 0), button('×', 'Убрать фото ' + (index + 1), () => commit(album.filter((_, i) => i !== index))), button('›', 'Переместить фото ' + (index + 1) + ' вправо', () => move(1), index === album.length - 1));
      tile.append(img, bar); rail.append(tile);
    });
    box.append(header, rail);
  };
  const remove = window.cancelPendingMedia;
  window.cancelPendingMedia = function (...args) { cancel(); appendNext = false; const result = remove?.apply(this, args); release(); $('pending-media')?.classList.remove('album-pending-v183'); if (input) input.placeholder = originalPlaceholder; return result; };
  chooser?.addEventListener('cancel', () => { appendNext = false; });
  for (const name of ['openChat', 'openRoom', 'goBack']) { const before = window[name]; if (typeof before === 'function') window[name] = function (...args) { cancel(); appendNext = false; window.telechatAttachmentsV141?.cancelUpload(); return before.apply(this, args); }; }
  window.addEventListener('telechat-account-ready-v175', () => { cancel(); appendNext = false; release(); });
  window.addEventListener('pagehide', event => { cancel(); if (!event.persisted) { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); } });
  window.handleChatPhoto = select;
  window.exstraPhotoComposeV182 = Object.freeze({ select, cancel, isPreparing: () => !!job });
})();
