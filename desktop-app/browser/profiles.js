'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { normalizeURL } = require('./policy');
const derive = promisify(scrypt);
const MAX_PROFILES = 12,
  MAX_FILE = 3 * 1024 * 1024,
  MAX_AVATAR = 180 * 1024;
const COLORS = Object.freeze(['violet', 'blue', 'teal', 'rose', 'amber', 'slate']);
const validId = (id) =>
  id === 'legacy' ||
  (typeof id === 'string' &&
    /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(id));
function nickname(value) {
  const nick = typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  if (
    !nick ||
    Array.from(nick).length > 32 ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(nick)
  )
    throw Error('Ник — от 1 до 32 символов, без служебных знаков.');
  return nick;
}
function password(value) {
  if (typeof value !== 'string' || Array.from(value).length < 8 || value.length > 128)
    throw Error('Пароль — от 8 до 128 символов.');
  return value;
}
function avatar(value) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > MAX_AVATAR)
    throw Error('Аватарка слишком большая. Выбери другое фото.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw Error('Для аватарки подойдёт PNG, JPG или WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid =
    match[1] === 'png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : match[1] === 'jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid) throw Error('Не удалось прочитать аватарку.');
  return value;
}
function settings(value = {}) {
  const home = value.home ? normalizeURL(value.home) : '';
  if (value.home && !home) throw Error('Стартовая страница — обычная ссылка http:// или https://.');
  return { home, lockOnHide: value.lockOnHide === true };
}
function credential(value, legacy) {
  if (!value && legacy) return null;
  if (
    value?.v !== 1 ||
    typeof value.salt !== 'string' ||
    typeof value.digest !== 'string' ||
    !/^[A-Za-z0-9+/]{22}==$/.test(value.salt) ||
    !/^[A-Za-z0-9+/]{43}=$/.test(value.digest)
  )
    throw Error('BAD_CREDENTIAL');
  return { v: 1, salt: value.salt, digest: value.digest };
}
function clean(value) {
  if (!validId(value?.id)) throw Error('BAD_PROFILE');
  const legacy = value.id === 'legacy';
  return {
    id: value.id,
    nick: nickname(value.nick),
    avatar: avatar(value.avatar),
    color: COLORS.includes(value.color) ? value.color : 'violet',
    auth: credential(value.auth, legacy),
    settings: settings(value.settings),
    createdAt: Math.max(0, Number(value.createdAt) || 0),
    lastUsed: Math.max(0, Number(value.lastUsed) || 0),
  };
}
function publicProfile(value) {
  return {
    id: value.id,
    nick: value.nick,
    avatar: value.avatar,
    color: value.color,
    protected: !!value.auth,
    legacy: value.id === 'legacy',
    settings: { ...value.settings },
    lastUsed: value.lastUsed,
  };
}
async function makeCredential(value) {
  password(value);
  const salt = randomBytes(16);
  const digest = await derive(value, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { v: 1, salt: salt.toString('base64'), digest: digest.toString('base64') };
}
class ProfileStore {
  constructor(file = null, options = {}) {
    this.file = file;
    this.fs = options.fs || fs;
    this.now = options.now || Date.now;
    this.items = [];
    this.loaded = false;
    this.error = '';
    this.fatal = false;
    this.flight = null;
    this.queue = Promise.resolve();
    this.cryptoQueue = Promise.resolve();
    this.cryptoPending = 0;
    this.failures = new Map();
  }
  load() {
    if (this.loaded) return Promise.resolve();
    if (this.flight) return this.flight;
    this.flight = (async () => {
      try {
        if (!this.file) {
          this.items = [this.legacy()];
          return;
        }
        const stat = await this.fs.stat(this.file);
        if (stat.size > MAX_FILE) throw Error('TOO_BIG');
        const data = JSON.parse((await this.fs.readFile(this.file, 'utf8')).replace(/^\uFEFF/, ''));
        if (
          data?.version !== 1 ||
          !Array.isArray(data.items) ||
          !data.items.length ||
          data.items.length > MAX_PROFILES
        )
          throw Error('BAD_FORMAT');
        const items = data.items.map(clean),
          ids = new Set(items.map((item) => item.id)),
          names = new Set(items.map((item) => item.nick.toLocaleLowerCase('ru')));
        if (ids.size !== items.length || names.size !== items.length || !ids.has('legacy'))
          throw Error('BAD_IDS');
        this.items = items;
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.items = [this.legacy()];
          try {
            await this.commit(this.items);
          } catch (_) {
            this.error =
              'Не удалось сохранить список профилей. Основной профиль доступен; новые пока не создаются.';
          }
        } else {
          this.items = [];
          this.fatal = true;
          this.error =
            'Не удалось прочитать профили. Файл не изменён. Перезапусти приложение или восстанови его резервную копию.';
        }
      } finally {
        this.loaded = true;
        this.flight = null;
      }
    })();
    return this.flight;
  }
  legacy() {
    return {
      id: 'legacy',
      nick: 'Основной',
      avatar: '',
      color: 'violet',
      auth: null,
      settings: { home: '', lockOnHide: false },
      createdAt: this.now(),
      lastUsed: 0,
    };
  }
  list() {
    return this.items.map((item) => {
      const { settings, ...card } = publicProfile(item);
      return card;
    });
  }
  get(id) {
    const item = this.items.find((value) => value.id === id);
    return item ? publicProfile(item) : null;
  }
  paths(id, userData) {
    if (!validId(id)) throw Error('Некорректный профиль.');
    return id === 'legacy'
      ? {
          partition: 'persist:exstra-sites-v202',
          shortcuts: path.join(userData, 'sites-shortcuts.json'),
          favicons: path.join(userData, 'sites-favicons-v1.json'),
        }
      : {
          partition: 'persist:exstra-sites-profile-' + id,
          shortcuts: path.join(userData, 'sites-profiles-v1', id, 'shortcuts.json'),
          favicons: path.join(userData, 'sites-profiles-v1', id, 'favicons.json'),
        };
  }
  async commit(items) {
    if (this.file) {
      const temp = this.file + '.' + randomUUID() + '.tmp';
      let handle;
      try {
        await this.fs.mkdir(path.dirname(this.file), { recursive: true });
        handle = await this.fs.open(temp, 'wx', 0o600);
        await handle.writeFile(JSON.stringify({ version: 1, items }));
        await handle.sync();
        await handle.close();
        handle = null;
        await this.fs.rename(temp, this.file);
      } catch (_) {
        await handle?.close().catch(() => {});
        await this.fs.unlink(temp).catch(() => {});
        throw Error('Не удалось сохранить профиль. Проверь свободное место и повтори.');
      }
    }
    this.items = items;
  }
  mutate(callback) {
    const task = this.queue.then(async () => {
      await this.load();
      if (this.error) return { ok: false, error: this.error };
      try {
        const next = this.items.map((item) => ({
          ...item,
          settings: { ...item.settings },
          auth: item.auth ? { ...item.auth } : null,
        }));
        const result = await callback(next);
        await this.commit(next);
        return { ok: true, ...result };
      } catch (error) {
        return { ok: false, error: error.message || 'Не удалось изменить профиль.' };
      }
    });
    this.queue = task.catch(() => {});
    return task;
  }
  cryptoWork(callback) {
    if (this.cryptoPending >= 4)
      return Promise.reject(Error('Проверка пароля занята. Повтори через несколько секунд.'));
    this.cryptoPending++;
    const task = this.cryptoQueue.then(callback).finally(() => {
      this.cryptoPending--;
    });
    this.cryptoQueue = task.catch(() => {});
    return task;
  }
  create(input) {
    return this.mutate(async (next) => {
      if (next.length >= MAX_PROFILES)
        throw Error('На этом компьютере можно создать до 12 профилей сайтов.');
      const nick = nickname(input?.nick);
      if (next.some((item) => item.nick.toLocaleLowerCase('ru') === nick.toLocaleLowerCase('ru')))
        throw Error('Профиль с таким ником уже есть.');
      const auth = await this.cryptoWork(() => makeCredential(input?.password)),
        item = {
          id: randomUUID(),
          nick,
          avatar: '',
          color: 'violet',
          auth,
          settings: { home: '', lockOnHide: false },
          createdAt: this.now(),
          lastUsed: this.now(),
        };
      next.push(item);
      return { profile: publicProfile(item) };
    });
  }
  async verify(id, value) {
    try {
      return await this.cryptoWork(() => this.verifyNow(id, value));
    } catch (_) {
      return { ok: false, error: 'Проверка пароля занята. Повтори через несколько секунд.' };
    }
  }
  async verifyNow(id, value) {
    await this.load();
    if (this.fatal) return { ok: false, error: this.error };
    const item = this.items.find((item) => item.id === id);
    if (!item) return { ok: false, error: 'Профиль не найден.' };
    if (!item.auth) return { ok: true, profile: publicProfile(item) };
    const failure = this.failures.get(id);
    if (failure?.until > this.now())
      return {
        ok: false,
        error: 'Слишком много попыток. Подожди немного.',
        retryAfter: Math.ceil((failure.until - this.now()) / 1000),
      };
    if (typeof value !== 'string' || value.length > 128)
      return { ok: false, error: 'Неверный пароль.' };
    const expected = item.auth,
      actual = await derive(value, Buffer.from(expected.salt, 'base64'), 32, {
        N: 32768,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
      });
    if (this.items.find((value) => value.id === id)?.auth?.digest !== expected.digest)
      return { ok: false, error: 'Пароль изменился. Повтори вход.' };
    if (!timingSafeEqual(actual, Buffer.from(expected.digest, 'base64'))) {
      const count = (failure?.count || 0) + 1;
      this.failures.set(id, {
        count,
        until: count >= 5 ? this.now() + Math.min(30000, 5000 * (count - 4)) : 0,
      });
      return { ok: false, error: 'Неверный пароль.' };
    }
    this.failures.delete(id);
    return { ok: true, profile: publicProfile(item) };
  }
  update(id, input) {
    return this.mutate((next) => {
      const item = next.find((item) => item.id === id);
      if (!item) throw Error('Профиль не найден.');
      const nick = nickname(input?.nick ?? item.nick);
      if (
        next.some(
          (other) =>
            other.id !== id && other.nick.toLocaleLowerCase('ru') === nick.toLocaleLowerCase('ru'),
        )
      )
        throw Error('Профиль с таким ником уже есть.');
      item.nick = nick;
      item.avatar = avatar(input?.avatar ?? item.avatar);
      if (input?.color !== undefined) {
        if (!COLORS.includes(input.color)) throw Error('Выбери цвет из списка.');
        item.color = input.color;
      }
      item.settings = settings({ ...item.settings, ...input?.settings });
      return { profile: publicProfile(item) };
    });
  }
  async changePassword(id, currentPassword, nextPassword) {
    await this.load();
    const expected = this.items.find((item) => item.id === id)?.auth?.digest;
    const verified = await this.verify(id, currentPassword);
    if (!verified.ok) return verified;
    return this.mutate(async (next) => {
      const item = next.find((item) => item.id === id);
      if (!item) throw Error('Профиль не найден.');
      if (item.auth?.digest !== expected) throw Error('Пароль изменился. Повтори действие.');
      item.auth = await this.cryptoWork(() => makeCredential(nextPassword));
      return { profile: publicProfile(item) };
    });
  }
}
module.exports = { ProfileStore, MAX_PROFILES, MAX_AVATAR, PROFILE_COLORS: COLORS, validId };
