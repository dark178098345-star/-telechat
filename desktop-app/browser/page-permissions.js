'use strict';
const { safePage } = require('./policy');
const INPUTS = new Set([
  'mouseDown',
  'mouseUp',
  'keyDown',
  'rawKeyDown',
  'touchStart',
  'touchEnd',
  'gestureTap',
  'pointerDown',
  'pointerUp',
]);
function origin(value) {
  try {
    return safePage(value) ? new URL(value).origin : '';
  } catch {
    return '';
  }
}
class PagePermissions {
  constructor(active, now = Date.now) {
    this.active = active;
    this.now = now;
    this.inputs = new WeakMap();
  }
  input(wc, input) {
    if (wc && INPUTS.has(input?.type) && this.active(wc)) this.inputs.set(wc, this.now());
  }
  clear(wc) {
    if (wc) this.inputs.delete(wc);
  }
  allow(wc, permission, requestingURL, details = {}) {
    if (permission !== 'clipboard-sanitized-write' || !wc || wc.isDestroyed() || !this.active(wc))
      return false;
    const input = this.inputs.get(wc);
    if (input === undefined || this.now() - input < 0 || this.now() - input > 5000) return false;
    // Permit writes only by the clicked/focused web frame. Never permit clipboard reads.
    const frame =
      details.isMainFrame === true
        ? wc.mainFrame
        : details.isMainFrame === false
          ? wc.focusedFrame
          : null;
    const from = origin(requestingURL || details.requestingUrl);
    return !!from && from === origin(frame?.url) && !!origin(wc.mainFrame?.url);
  }
}
module.exports = { PagePermissions, origin };
