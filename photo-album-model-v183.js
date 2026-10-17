/* Album messages contain private file descriptors only, never URLs or capabilities. */
(() => {
  'use strict';
  const maxCount = 10, maxBytes = 40 * 1048576;
  function parse(raw) {
    try {
      if (typeof raw !== 'string' || raw.length > 12000) return null;
      const value = JSON.parse(raw);
      if (value?.v !== 1 || !Array.isArray(value.items) || value.items.length < 2 || value.items.length > maxCount) return null;
      const ids = new Set(); let total = 0;
      const items = value.items.map(item => {
        if (!item || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id) || ids.has(item.id) ||
            typeof item.name !== 'string' || !item.name.length || item.name.length > 180 ||
            !Number.isSafeInteger(item.size) || item.size < 1 || item.size > 20 * 1048576 ||
            !/^image\/(jpeg|png|webp)$/.test(item.mime) || item.view !== 'image') throw Error('Invalid photo');
        ids.add(item.id); total += item.size;
        return { id: item.id, name: item.name, size: item.size, mime: item.mime, view: 'image' };
      });
      return total <= maxBytes ? items : null;
    } catch (_) { return null; }
  }
  window.exstraPhotoAlbumV183 = Object.freeze({ parse, maxCount, maxBytes });
})();
