/* Explicit photo viewing is a manual download; navigation never sends messages. */
(() => {
  'use strict';
  let dialog, image, note, title, save, previous, next, counter, items = [], index = 0, epoch = 0, owner = '', opener, url = '', startX = null;
  const self = () => { try { return me?.nick || ''; } catch (_) { return ''; } };
  function revoke() { if (url) URL.revokeObjectURL(url); url = ''; image?.removeAttribute('src'); }
  function close() { epoch++; items = []; revoke(); dialog?.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); }
  async function show(at) {
    if (!dialog?.open || !items.length || self() !== owner) return;
    index = Math.max(0, Math.min(items.length - 1, at)); const token = ++epoch, item = items[index];
    revoke(); image.hidden = true; note.hidden = false; note.textContent = 'Загружаем фотографию…'; save.disabled = true;
    title.textContent = 'Альбом'; counter.textContent = (index + 1) + ' / ' + items.length;
    previous.disabled = index === 0; next.disabled = index === items.length - 1;
    try {
      const value = await window.telechatAttachmentsV141.loadFile(item);
      if (token !== epoch || self() !== owner || !dialog.open) return;
      if (!/^image\/(jpeg|png|webp)$/.test(value.mime)) throw Error('Вложение не является фотографией');
      url = URL.createObjectURL(new Blob([value.blob], { type: value.mime }));
      image.onload = () => { if (token === epoch) { image.hidden = false; note.hidden = true; save.disabled = false; } };
      image.onerror = () => { if (token === epoch) note.textContent = 'Фото не открылось. Перейди к соседнему и попробуй ещё раз.'; };
      image.src = url;
    } catch (error) { if (token === epoch) note.textContent = error.message || 'Не удалось загрузить фото. Попробуй ещё раз.'; }
  }
  function ensure() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'album-viewer-v183'; dialog.id = 'album-viewer-v183'; dialog.setAttribute('aria-label', 'Просмотр альбома');
    dialog.innerHTML = '<header><strong>Альбом</strong><button type="button" data-close aria-label="Закрыть альбом">×</button></header><div class="album-viewer-stage-v183"><img alt="Фотография из альбома" hidden decoding="async"><p role="status"></p></div><footer><span></span><div><button type="button" data-prev aria-label="Предыдущее фото">‹</button><button type="button" data-save>Сохранить</button><button type="button" data-next aria-label="Следующее фото">›</button></div></footer>';
    document.body.append(dialog); image = dialog.querySelector('img'); note = dialog.querySelector('p'); title = dialog.querySelector('strong'); counter = dialog.querySelector('footer>span');
    save = dialog.querySelector('[data-save]'); previous = dialog.querySelector('[data-prev]'); next = dialog.querySelector('[data-next]');
    dialog.querySelector('[data-close]').onclick = close; previous.onclick = () => show(index - 1); next.onclick = () => show(index + 1);
    save.onclick = () => { if (self() === owner && items[index]) window.telechatAttachmentsV141?.downloadFile(items[index]); };
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(index + (event.key === 'ArrowLeft' ? -1 : 1)); } });
    const stage = dialog.querySelector('.album-viewer-stage-v183');
    stage.addEventListener('touchstart', event => { startX = event.touches.length === 1 ? event.touches[0].clientX : null; }, { passive: true });
    stage.addEventListener('touchend', event => { if (startX !== null && event.changedTouches.length === 1) { const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) > 60) show(index + (delta < 0 ? 1 : -1)); } startX = null; }, { passive: true });
  }
  function open(value, at = 0) {
    const parsed = window.exstraPhotoAlbumV183?.parse(JSON.stringify({ v: 1, items: value }));
    if (!parsed || !self()) return;
    ensure(); opener = document.activeElement; owner = self(); items = parsed; if (!dialog.open) dialog.showModal(); show(at);
  }
  window.addEventListener('telechat-account-ready-v175', close);
  window.addEventListener('pagehide', close);
  window.exstraAlbumViewerV183 = Object.freeze({ open, close });
})();
