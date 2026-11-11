'use strict';
const MAX_TABS = 8;
function normalizeURL(input) {
  if (typeof input !== 'string') return '';
  let text = input.trim();
  if (!text || text.length > 4096 || /[\u0000-\u001f\u007f]/.test(text)) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) || /^(?:localhost|[a-z0-9.-]+|\[[0-9a-f:]+\]):\d+(?:[/?#]|$)/i.test(text)) text = 'https://' + text;
  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}
function safePage(input) { return typeof input === 'string' && !!normalizeURL(input) && /^https?:\/\//i.test(input); }
function safeFrame(input) { return input === 'about:blank' || input === 'about:srcdoc' || /^blob:https?:\/\//i.test(input || '') || safePage(input); }
function trustedFrame(event, window, urlCheck) {
  return !!window && !window.isDestroyed() && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame && urlCheck(event.senderFrame.url);
}
module.exports = { MAX_TABS, normalizeURL, safePage, safeFrame, trustedFrame };
