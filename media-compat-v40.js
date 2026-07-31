/* TELECHAT MEDIA COMPAT V40 — tolerant, safe rendering for recorded audio */
(() => {
  'use strict';

  const unpackBeforeV40 = unpackMedia;

  function safeDataUrlV40(data, kind) {
    const value = String(data || '');
    const header = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)((?:;\s*[a-z0-9._+-]+=[a-z0-9._+ -]+)*);base64,/i.exec(value);
    if (!header) return false;

    const mime = header[1].toLowerCase();
    const allowed = kind === 'image'
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)
      : mime.startsWith('audio/') || mime === 'video/webm' || mime === 'application/octet-stream';
    if (!allowed) return false;

    const payload = value.slice(header[0].length);
    return Boolean(payload && payload.length <= 1200000 && /^[a-z0-9+/=\r\n]+$/i.test(payload));
  }

  unpackMedia = function(text) {
    const existing = unpackBeforeV40(text);
    if (existing) return existing;
    if (typeof text !== 'string') return null;

    const value = text.trim();
    const raw = value.startsWith(MEDIA_PREFIX)
      ? value.slice(MEDIA_PREFIX.length)
      : (value.startsWith('{') ? value : '');
    if (!raw) return null;

    try {
      const media = JSON.parse(raw);
      if (!media || typeof media !== 'object') return null;
      if (media.kind === 'image' && safeDataUrlV40(media.data, 'image')) return media;
      if (media.kind === 'voice' && safeDataUrlV40(media.data, 'voice')) return media;
    } catch (error) {}
    return null;
  };
})();
