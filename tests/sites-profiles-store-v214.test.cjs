'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { ProfileStore, MAX_PROFILES } = require('../desktop-app/browser/profiles');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exstra-profiles-store-'));
  try {
    const file = path.join(dir, 'sites-profiles-v1.json'),
      legacyFile = path.join(dir, 'sites-shortcuts.json');
    await fs.writeFile(legacyFile, 'legacy shortcuts remain unchanged');
    let now = 1000000;
    const store = new ProfileStore(file, { now: () => now });
    await Promise.all([store.load(), store.load()]);
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0].id, 'legacy');
    assert.equal(store.list()[0].protected, false);
    assert.equal(store.paths('legacy', dir).partition, 'persist:exstra-sites-v202');
    assert.equal(store.paths('legacy', dir).shortcuts, legacyFile);
    assert.equal(await fs.readFile(legacyFile, 'utf8'), 'legacy shortcuts remain unchanged');
    assert((await store.verify('legacy', '')).ok);
    assert.throws(() => store.paths('../default', dir));
    for (const input of [
      { nick: '', password: 'abcdefgh' },
      { nick: 'No', password: 'short' },
      { nick: 'x'.repeat(33), password: 'abcdefgh' },
      { nick: 'Bad\u202ename', password: 'abcdefgh' },
    ])
      assert.equal((await store.create(input)).ok, false);
    const created = await store.create({ nick: 'Кирилл', password: 'fixture-pass-A' });
    assert(created.ok);
    const id = created.profile.id,
      originalPartition = store.paths(id, dir).partition;
    assert.notEqual(originalPartition, 'persist:exstra-sites-v202');
    assert(!originalPartition.includes('Кирилл'));
    assert.equal((await store.create({ nick: 'кирилл', password: 'fixture-pass-B' })).ok, false);
    let raw = await fs.readFile(file, 'utf8');
    assert(!raw.includes('fixture-pass-A'));
    const privateRecord = JSON.parse(raw).items.find((x) => x.id === id);
    assert(privateRecord.auth.salt && privateRecord.auth.digest);
    assert(!JSON.stringify(store.list()).includes(privateRecord.auth.digest));
    assert.equal((await store.verify(id, 'wrong')).ok, false);
    assert((await store.verify(id, 'fixture-pass-A')).ok);
    assert(
      (
        await store.update(id, {
          nick: 'Другой ник',
          color: 'teal',
          settings: { home: 'https://private.test/token?secret=fixture', lockOnHide: true },
        })
      ).ok,
    );
    assert.equal(store.paths(id, dir).partition, originalPartition);
    assert(
      !JSON.stringify(store.list()).includes('private.test'),
      'Locked chooser cards do not reveal home URL',
    );
    const publicCopy = store.get(id);
    publicCopy.settings.home = 'mutated';
    assert(store.get(id).settings.home.includes('private.test'));
    for (const bad of [
      { avatar: 'data:image/svg+xml;base64,AAAA' },
      { color: 'unknown' },
      { settings: { home: 'javascript:alert(1)' } },
    ])
      assert.equal((await store.update(id, bad)).ok, false);
    assert.equal((await store.changePassword(id, 'wrong', 'fixture-pass-B')).ok, false);
    assert((await store.changePassword(id, 'fixture-pass-A', 'fixture-pass-B')).ok);
    assert.equal((await store.verify(id, 'fixture-pass-A')).ok, false);
    assert((await store.verify(id, 'fixture-pass-B')).ok);
    const reloaded = new ProfileStore(file);
    await reloaded.load();
    assert((await reloaded.verify(id, 'fixture-pass-B')).ok);
    assert.deepEqual(reloaded.get(id), store.get(id));
    for (let i = 0; i < 5; i++) assert.equal((await store.verify(id, 'bad-pass')).ok, false);
    const blocked = await store.verify(id, 'fixture-pass-B');
    assert.equal(blocked.ok, false);
    assert(blocked.retryAfter > 0);
    now += 31000;
    assert((await store.verify(id, 'fixture-pass-B')).ok);
    const before = await fs.readFile(file, 'utf8'),
      brokenWriter = new ProfileStore(file, {
        fs: {
          ...fs,
          rename: async () => {
            throw Error('fixture full disk');
          },
        },
      });
    await brokenWriter.load();
    const beforeMemory = brokenWriter.list();
    assert.equal((await brokenWriter.update(id, { nick: 'Must not persist' })).ok, false);
    assert.deepEqual(brokenWriter.list(), beforeMemory);
    assert.equal(await fs.readFile(file, 'utf8'), before);
    assert.equal((await fs.readdir(dir)).filter((x) => x.endsWith('.tmp')).length, 0);
    const corrupt = path.join(dir, 'corrupt.json');
    await fs.writeFile(corrupt, '{"version":99,"items":[]}');
    const broken = new ProfileStore(corrupt);
    await broken.load();
    assert(broken.fatal && broken.error);
    assert.equal(
      (await broken.create({ nick: 'Do not overwrite', password: 'abcdefgh' })).ok,
      false,
    );
    assert.equal(await fs.readFile(corrupt, 'utf8'), '{"version":99,"items":[]}');
    const readonly = new ProfileStore(path.join(dir, 'readonly-new.json'), {
      fs: {
        ...fs,
        open: async () => {
          throw Error('fixture EACCES');
        },
      },
    });
    await readonly.load();
    assert(readonly.error && !readonly.fatal);
    assert(
      (await readonly.verify('legacy', '')).ok,
      'Manifest write failure preserves old profile access',
    );
    assert.equal((await readonly.create({ nick: 'No write', password: 'abcdefgh' })).ok, false);
    const oldAuth = store.items.find((x) => x.id === id).auth.digest,
      oldVerify = store.verifyNow.bind(store);
    let active = 0,
      peak = 0;
    store.verifyNow = async (...args) => {
      active++;
      peak = Math.max(peak, active);
      try {
        return await oldVerify(...args);
      } finally {
        active--;
      }
    };
    await Promise.all(Array.from({ length: 10 }, () => store.verify(id, 'bad-pass')));
    assert.equal(peak, 1, 'Store serializes KDF independently of UI cancellation');
    assert.equal(store.items.find((x) => x.id === id).auth.digest, oldAuth);
    assert.equal(store.cryptoPending, 0);
    now += 60000;
    await Promise.all(
      Array.from({ length: 16 }, (_, i) =>
        store.create({ nick: 'Profile ' + i, password: 'fixture-extra-pass' }),
      ),
    );
    assert.equal(store.list().length, MAX_PROFILES);
    assert.equal(new Set(store.list().map((x) => x.id)).size, MAX_PROFILES);
    console.log(
      'PASS Sites profiles store: legacy preservation, salted passwords/no secret state, stable UUID paths, rate/KDF limits, private home metadata, password change, atomic failure/corrupt-file protection and profile cap.',
    );
  } finally {
    const real = await fs.realpath(dir);
    assert(real.startsWith(path.resolve(os.tmpdir()) + path.sep + 'exstra-profiles-store-'));
    await fs.rm(real, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
