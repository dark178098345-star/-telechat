'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { safePage } = require('./policy');
const MAX = 500,
  AGE = 90 * 86400000;
function cleanURL(value) {
  if (!safePage(value)) return '';
  const url = new URL(value);
  if (
    [...url.searchParams.keys()].some((key) =>
      /^(?:pass|password|p_pass|token|access_token|refresh_token|auth|authorization|code|secret|signature|sig|jwt|session|api_key|apikey|x-amz-signature|x-amz-credential)$/i.test(
        key,
      ),
    )
  )
    return '';
  url.hash = '';
  return url.href;
}
class SiteHistory {
  constructor(file = null, changed = () => {}) {
    this.file = file;
    this.changed = changed;
    this.items = [];
    this.loaded = false;
    this.error = '';
    this.queue = Promise.resolve();
    this.timer = null;
  }
  async load() {
    if (this.loaded) return;
    try {
      if (this.file) {
        if ((await fs.stat(this.file)).size > 3 * 1024 * 1024) throw Error('SIZE');
        const saved = JSON.parse(await fs.readFile(this.file, 'utf8'));
        if (saved.version !== 1 || !Array.isArray(saved.items) || saved.items.length > MAX)
          throw Error('FORMAT');
        this.items = saved.items
          .filter(
            (row) =>
              typeof row.id === 'string' &&
              row.id.length <= 64 &&
              cleanURL(row.url) &&
              Number.isFinite(row.at) &&
              row.at > Date.now() - AGE,
          )
          .map((row) => ({
            id: row.id,
            url: cleanURL(row.url),
            title: String(row.title || '').slice(0, 120),
            at: row.at,
          }));
      }
    } catch (error) {
      if (error.code !== 'ENOENT')
        this.error = 'Не удалось прочитать историю. Старый файл не изменён.';
    }
    this.loaded = true;
  }
  list() {
    return this.items.map((row) => ({ ...row }));
  }
  visit(value, title) {
    const url = cleanURL(value);
    if (!this.loaded || this.error || !url) return;
    const name = String(title || new URL(url).hostname)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .slice(0, 120);
    if (this.items[0]?.url === url) {
      this.items[0].title = name;
      this.items[0].at = Date.now();
    } else this.items.unshift({ id: randomUUID(), url, title: name, at: Date.now() });
    this.items = this.items.filter((row) => row.at > Date.now() - AGE).slice(0, MAX);
    this.changed();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.persist();
    }, 300);
  }
  persist() {
    const data = JSON.stringify({ version: 1, items: this.items });
    const task = this.queue.then(async () => {
      if (!this.file || this.error) return;
      const temp = this.file + '.' + randomUUID() + '.tmp';
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(temp, data, { flag: 'wx', mode: 0o600 });
        await fs.rename(temp, this.file);
      } catch {
        await fs.unlink(temp).catch(() => {});
        this.error = 'Не удалось сохранить историю. Проверь свободное место.';
        this.changed();
      }
    });
    this.queue = task.catch(() => {});
    return task;
  }
  async clear() {
    if (this.error) return { ok: false, error: this.error };
    clearTimeout(this.timer);
    this.timer = null;
    this.items = [];
    this.changed();
    await this.persist();
    return this.error ? { ok: false, error: this.error } : { ok: true };
  }
  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      return this.persist();
    }
    return this.queue;
  }
}
module.exports = { SiteHistory, cleanURL };
