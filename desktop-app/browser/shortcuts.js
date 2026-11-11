'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { normalizeURL } = require('./policy');
const MAX = 24, MAX_BYTES = 128 * 1024;
const ICONS = Object.freeze(['auto','globe','music','video','chat','code','book','game']);
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
function entry(input, id) {
  const url = normalizeURL(input?.url);
  const name = typeof input?.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : '';
  if (!url) throw Error('Вставь обычную ссылку http:// или https://.');
  if (url.length > 4096) throw Error('Ссылка слишком длинная. Используй адрес покороче.');
  if (!name || name.length > 48 || /[\u0000-\u001f\u007f]/.test(name)) throw Error('Название — от 1 до 48 символов.');
  const icon = input.icon ?? 'auto';
  if (!ICONS.includes(icon)) throw Error('Выбери значок из списка.');
  return { id, name, url, icon };
}
class ShortcutStore {
  constructor(file = null) { this.file = file; this.items = []; this.loaded = false; this.error = ''; this.flight = null; this.queue = Promise.resolve(); }
  load() {
    if (this.loaded) return Promise.resolve();
    if (this.flight) return this.flight;
    this.flight = (async () => {
      try {
        if (!this.file) return;
        const stat = await fs.stat(this.file);
        if (stat.size > MAX_BYTES) throw Error('FILE_TOO_BIG');
        const data = JSON.parse((await fs.readFile(this.file, 'utf8')).replace(/^\uFEFF/, ''));
        if (data?.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX) throw Error('BAD_FORMAT');
        const ids = new Set();
        this.items = data.items.map(value => { if (!validId(value?.id) || ids.has(value.id)) throw Error('BAD_ID'); const clean = entry(value, value.id); ids.add(clean.id); return clean; });
      } catch (error) {
        if (error.code !== 'ENOENT') this.error = 'Не удалось прочитать ярлыки. Файл не изменён; попробуй перезапустить приложение.';
      } finally { this.loaded = true; this.flight = null; }
    })();
    return this.flight;
  }
  list() { return this.items.map(item => ({ ...item })); }
  mutate(action, payload) {
    const job = this.queue.then(async () => {
      await this.load();
      if (this.error) return { ok: false, error: this.error };
      const next = this.list();
      try {
        if (action === 'save') {
          const input = payload?.entry, updating = input?.id !== undefined;
          const index = updating && validId(input.id) ? next.findIndex(item => item.id === input.id) : -1;
          if (updating && index < 0) throw Error('Этот ярлык уже изменился. Открой его заново.');
          if (!updating && next.length >= MAX) throw Error('Можно сохранить до 24 ярлыков.');
          const clean = entry(input, updating ? next[index].id : randomUUID());
          if (updating) next[index] = clean; else next.push(clean);
        } else {
          const index = validId(payload?.id) ? next.findIndex(item => item.id === payload.id) : -1;
          if (index < 0) throw Error('Ярлык не найден.');
          if (action === 'remove') next.splice(index, 1);
          else if (action === 'move' && [-1,1].includes(payload?.step)) {
            const to = index + payload.step;
            if (to >= 0 && to < next.length) [next[index], next[to]] = [next[to], next[index]];
          } else throw Error('Неизвестное действие.');
        }
        if (this.file) {
          const temp = this.file + '.' + randomUUID() + '.tmp';
          try {
            await fs.mkdir(path.dirname(this.file), { recursive: true });
            await fs.writeFile(temp, JSON.stringify({ version: 1, items: next }), { encoding: 'utf8', flag: 'wx' });
            await fs.rename(temp, this.file);
          } catch { try { await fs.unlink(temp); } catch {} throw Error('Не удалось сохранить ярлыки. Проверь доступное место и повтори.'); }
        }
        this.items = next;
        return { ok: true };
      } catch (error) { return { ok: false, error: error.message || 'Не удалось изменить ярлык.' }; }
    });
    this.queue = job.catch(() => {});
    return job;
  }
}
module.exports = { ShortcutStore, MAX_SHORTCUTS: MAX, SHORTCUT_ICONS: ICONS };
