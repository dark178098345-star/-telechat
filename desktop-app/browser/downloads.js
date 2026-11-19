'use strict';
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { safePage } = require('./policy');
const { origin } = require('./page-permissions');
const MAX_ACTIVE = 3,
  MAX_HISTORY = 20;
function filename(value) {
  let name = String(value || 'Файл')
    .split(/[\\/]/)
    .pop()
    .replace(/[<>:"|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
  if (!name || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name))
    name = '_' + (name || 'Файл');
  return name;
}
function sourceURL(value) {
  if (safePage(value)) return true;
  if (typeof value !== 'string') return false;
  if (value.startsWith('blob:')) return !!origin(value.slice(5));
  return /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+[;,]/i.test(value) && value.length <= 64 * 1024 * 1024;
}
class SiteDownloads {
  constructor(electron, active, changed, tell) {
    this.e = electron;
    this.active = active;
    this.changed = changed;
    this.tell = tell;
    this.jobs = [];
  }
  list(owner) {
    return owner
      ? this.jobs
          .filter((j) => j.owner === owner)
          .map((j) => ({
            id: j.id,
            name: j.name,
            site: j.site,
            state: j.state,
            received: j.received,
            total: j.total,
          }))
      : [];
  }
  accept(event, item, wc, owner) {
    const deny = (message) => {
      event.preventDefault();
      if (message && this.active(wc, owner)) this.tell(message);
    };
    if (!item || !this.active(wc, owner)) return deny();
    try {
      const pageOrigin = origin(wc.mainFrame?.url),
        initiator = item.getInitiatorOrigin();
      const chain = item.getURLChain();
      // Empty initiator is used for a main-process navigation to a file, not for opaque frames.
      const focusedInitiator =
        !!initiator &&
        initiator === origin(wc.focusedFrame?.url) &&
        item.hasUserGesture?.() === true;
      if (
        !pageOrigin ||
        (initiator && initiator !== pageOrigin && !focusedInitiator) ||
        !sourceURL(item.getURL()) ||
        !chain.every(sourceURL)
      )
        return deny('Этот источник загрузки не поддерживается. Открой сайт в обычном браузере.');
      if (
        this.jobs.some((j) => j.state === 'choosing') ||
        this.jobs.filter((j) => !!j.item).length >= MAX_ACTIVE
      )
        return deny('Сначала выбери место сохранения или дождись одной из текущих загрузок.');
      const recent = this.jobs.filter((j) => Date.now() - j.started < 10000);
      if (recent.length >= 5)
        return deny('Сайт запрашивает слишком много файлов. Подожди немного.');
      const name = filename(item.getFilename());
      item.setSaveDialogOptions({
        title: 'Сохранить файл · ExstraChat',
        buttonLabel: 'Сохранить',
        defaultPath: path.join(this.e.app.getPath('downloads'), name),
        properties: ['showOverwriteConfirmation'],
      });
      const job = {
        id: randomUUID(),
        owner,
        name,
        site: new URL(pageOrigin).hostname,
        state: 'choosing',
        received: 0,
        total: 0,
        item,
        path: '',
        started: Date.now(),
        timer: null,
        last: 0,
      };
      this.jobs.push(job);
      this.prune(owner);
      const update = () => {
        try {
          job.received = Math.max(0, item.getReceivedBytes());
          job.total = Math.max(0, item.getTotalBytes());
          if (item.getSavePath())
            job.state = job.interrupted
              ? 'interrupted'
              : item.isPaused()
                ? 'paused'
                : 'progressing';
        } catch {}
      };
      const publish = () => {
        job.timer = null;
        job.last = Date.now();
        update();
        this.changed();
      };
      job.updated = (_event, state) => {
        if (!job.item) return;
        job.interrupted = state === 'interrupted';
        if (!job.timer) job.timer = setTimeout(publish, Math.max(0, 200 - (Date.now() - job.last)));
      };
      item.on('updated', job.updated);
      item.once('done', (_event, state) => {
        clearTimeout(job.timer);
        job.timer = null;
        item.removeListener('updated', job.updated);
        update();
        job.state = ['completed', 'cancelled', 'interrupted'].includes(state)
          ? state
          : 'interrupted';
        if (state === 'completed') {
          try {
            const saved = item.getSavePath();
            if (path.isAbsolute(saved)) {
              job.path = saved;
              job.name = filename(path.basename(saved));
            }
          } catch {}
        }
        job.item = null;
        this.prune(owner);
        this.changed();
      });
      publish();
    } catch {
      deny('Не удалось начать загрузку. Попробуй ещё раз или открой сайт снаружи.');
    }
  }
  prune(owner) {
    const finished = this.jobs.filter((j) => j.owner === owner && !j.item);
    const remove = new Set(
      finished.slice(0, Math.max(0, finished.length - MAX_HISTORY)).map((j) => j.id),
    );
    this.jobs = this.jobs.filter((j) => !remove.has(j.id));
  }
  action(owner, payload) {
    const job = this.jobs.find((j) => j.id === payload.id && j.owner === owner);
    if (!job) return { ok: false, error: 'Загрузка не найдена в этом профиле.' };
    if (payload.action === 'download-cancel' && job.item) {
      job.item.cancel();
      return { ok: true };
    }
    if (payload.action === 'download-reveal' && job.state === 'completed' && job.path) {
      this.e.shell.showItemInFolder(job.path);
      return { ok: true };
    }
    return { ok: false, error: 'Это действие сейчас недоступно.' };
  }
  cancel(owner) {
    for (const job of this.jobs)
      if (job.item && (!owner || job.owner === owner)) {
        clearTimeout(job.timer);
        job.timer = null;
        try {
          job.item.cancel();
        } catch {}
      }
  }
}
module.exports = { SiteDownloads, filename, sourceURL };
