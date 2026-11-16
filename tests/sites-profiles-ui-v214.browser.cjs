'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'desktop-app/browser');

async function fixture(browser, width, height = 860) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    const legacy = {
      id: 'legacy',
      nick: 'Основной',
      avatar: '',
      color: 'violet',
      protected: false,
      legacy: true,
      settings: { home: '', lockOnHide: false },
    };
    const work = {
      id: 'work',
      nick: 'Работа',
      avatar: '',
      color: 'blue',
      protected: true,
      legacy: false,
      settings: { home: '', lockOnHide: false },
    };
    window.fixture = {
      active: 0,
      max: 8,
      tabs: [],
      shortcuts: [],
      shortcutsReady: true,
      shortcutsMax: 24,
      mode: 'window',
      notice: '',
      profiles: {
        ready: true,
        error: '',
        screen: 'chooser',
        max: 12,
        active: null,
        items: [legacy, work],
      },
    };
    window.commands = [];
    window.passwords = { work: 'fixture-pass' };
    window.profileMask = false;
    window.exstraSites = {
      state: async () => structuredClone(fixture),
      onState: (fn) => (window.paintSites = fn),
      onFocus: (fn) => (window.focusSites = fn),
      command: async (payload) => {
        commands.push(structuredClone(payload));
        const action = payload.action;
        if (
          action.startsWith('shortcut-') &&
          payload.profileId !== fixture.profiles.active?.id
        )
          return { ok: false, error: 'Профиль изменился.' };
        if (
          ['profile-dialog', 'profile-update', 'profile-password'].includes(action) &&
          payload.profileId !== fixture.profiles.active?.id
        )
          return { ok: false, error: 'Профиль изменился.' };
        if (
          action === 'profile-show' &&
          payload.profileId &&
          payload.profileId !== fixture.profiles.active?.id
        )
          return { ok: false, error: 'Профиль изменился.' };
        if (window.rejectNext === action) {
          window.rejectNext = '';
          throw Error('Fixture IPC response lost');
        }
        if (action === 'profile-dialog') {
          profileMask = payload.open;
          return { ok: true };
        }
        if (
          action === 'profile-show' ||
          (action === 'home' && fixture.profiles.active?.settings.lockOnHide)
        ) {
          fixture.profiles.active = null;
          fixture.profiles.screen = 'chooser';
          fixture.tabs = [];
          fixture.shortcuts = [];
          fixture.active = 0;
          profileMask = false;
        }
        if (action === 'profile-enter' || action === 'profile-create') {
          let profile = fixture.profiles.items.find((item) => item.id === payload.id);
          if (action === 'profile-create') {
            if (fixture.profiles.items.some((item) => item.nick === payload.nick))
              return { ok: false, error: 'Такой профиль уже есть.' };
            profile = {
              id: 'created-' + fixture.profiles.items.length,
              nick: payload.nick,
              avatar: '',
              color: 'violet',
              protected: true,
              legacy: false,
              settings: { home: '', lockOnHide: false },
            };
            passwords[profile.id] = payload.password;
            fixture.profiles.items.push(profile);
          }
          if (!profile || (profile.protected && passwords[profile.id] !== payload.password))
            return { ok: false, error: 'Неверный пароль профиля.' };
          fixture.profiles.active = structuredClone(profile);
          fixture.profiles.screen = 'browser';
          fixture.tabs = [
            {
              id: fixture.profiles.items.length + 1,
              title: 'Новая вкладка',
              url: '',
              loading: false,
            },
          ];
          fixture.active = fixture.tabs[0].id;
          profileMask = false;
        }
        if (action === 'profile-update') {
          const profile = fixture.profiles.items.find(
            (item) => item.id === fixture.profiles.active.id,
          );
          Object.assign(profile, {
            nick: payload.nick,
            avatar: payload.avatar,
            color: payload.color,
            settings: payload.settings,
          });
          fixture.profiles.active = structuredClone(profile);
        }
        if (action === 'profile-password') {
          const profile = fixture.profiles.items.find(
            (item) => item.id === fixture.profiles.active.id,
          );
          if (profile.protected && passwords[profile.id] !== payload.currentPassword)
            return { ok: false, error: 'Неверный текущий пароль.' };
          passwords[profile.id] = payload.newPassword;
          profile.protected = true;
          fixture.profiles.active = structuredClone(profile);
        }
        if (action === 'shortcut-save') {
          const entry = { ...payload.entry, id: payload.entry.id || 'fixture-shortcut' },
            index = fixture.shortcuts.findIndex((item) => item.id === entry.id);
          if (index < 0) fixture.shortcuts.push(entry);
          else fixture.shortcuts[index] = entry;
        }
        // Deliberately publish before resolving IPC, like the native main process.
        if (
          (action.startsWith('profile-') && action !== 'profile-dialog') ||
          action === 'shortcut-save' ||
          (action === 'home' && fixture.profiles.screen === 'chooser')
        )
          paintSites(structuredClone(fixture));
        await Promise.resolve();
        return { ok: true };
      },
    };
  });
  await page.route('https://sites.test/**', (route) => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    const file = path.resolve(dir, name);
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file)) return route.abort();
    return route.fulfill({
      contentType: {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'application/javascript',
      }[path.extname(file)],
      body: fs.readFileSync(file),
    });
  });
  await page.goto('https://sites.test/');
  await page.waitForSelector('#sites-profile-add');
  return { page, errors, requests };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [420, 540, 1440]) {
      const { page: p, errors, requests } = await fixture(browser, width);
      assert(await p.locator('#sites-profiles-screen').isVisible());
      assert.equal(await p.locator('#chrome').evaluate((node) => node.inert), true);
      assert.equal(await p.locator('[data-profile-id]').count(), 2);
      await p.evaluate(() => {
        fixture.profiles.error = 'Список доступен только для чтения. Основной профиль сохранён.';
        fixture.profiles.fatal = false;
        paintSites(structuredClone(fixture));
      });
      assert(await p.locator('#sites-profile-add').isDisabled());
      assert(
        await p.locator('[data-profile-id="legacy"] .sites-profile-card-open').isEnabled(),
        'Readonly bootstrap warning does not block existing profile',
      );
      await p.locator('[data-profile-id="legacy"] .sites-profile-card-open').click();
      await p.waitForSelector('#sites-profile-button', { state: 'visible' });
      assert.equal(
        await p.locator('#chrome').evaluate((node) => node.inert),
        false,
        'Entering legacy profile releases browser controls',
      );
      assert.equal(await p.evaluate(() => document.activeElement.id), 'address');
      await p.locator('#sites-profile-button').click();
      await p.waitForSelector('#sites-profile-settings');
      assert(
        await p.locator('#sites-profile-settings [type=submit]').isDisabled(),
        'Readonly profile cannot offer writes',
      );
      await p.keyboard.press('Escape');
      await p.evaluate(() => {
        fixture.profiles.error = '';
        paintSites(structuredClone(fixture));
      });
      await p.locator('#sites-profile-button').click();
      await p.waitForSelector('#sites-profile-settings');
      assert.equal(
        await p.evaluate(() => profileMask),
        true,
        'Native page is masked before settings opens',
      );
      assert.equal(await p.locator('#sites-profile-settings-nick').inputValue(), 'Основной');
      await p.locator('#sites-profile-settings-nick').fill('Личный');
      await p.locator('#sites-profile-colors [data-color="teal"]').click();
      await p.locator('#sites-profile-home').fill('https://example.test/');
      await p.locator('#sites-profile-lock-on-hide').check();
      await p.locator('#sites-profile-settings [type=submit]').click();
      await p.waitForFunction(() => fixture.profiles.active.nick === 'Личный');
      assert.equal(await p.locator('#sites-profile-error').getAttribute('data-tone'), 'success');
      assert.equal(await p.evaluate(() => fixture.profiles.active.color), 'teal');
      const png = await p.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 20;
        c.height = 30;
        const x = c.getContext('2d');
        x.fillStyle = '#b48bc7';
        x.fillRect(0, 0, 20, 30);
        return c.toDataURL('image/png').split(',')[1];
      });
      await p.locator('#sites-profile-photo-input').setInputFiles({
        name: 'fixture-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(png, 'base64'),
      });
      await p.waitForSelector('#sites-profile-settings-avatar img');
      await p.evaluate(
        () => (window.savedAvatar = document.querySelector('#sites-profile-settings-avatar img')),
      );
      await p.locator('#sites-profile-settings-nick').fill('Личный профиль');
      assert(
        await p.evaluate(
          () => savedAvatar === document.querySelector('#sites-profile-settings-avatar img'),
        ),
        'Nickname edits retain the decoded profile photo',
      );
      await p.locator('#sites-profile-settings-nick').fill('Личный');
      await p.locator('#sites-profile-settings [type=submit]').click();
      await p.waitForFunction(() =>
        fixture.profiles.active.avatar.startsWith('data:image/webp;base64,'),
      );
      assert((await p.evaluate(() => fixture.profiles.active.avatar.length)) < 180000);
      assert(
        await p.locator('#sites-profile-dialog-title').evaluate((node) => {
          const a = node.getBoundingClientRect(),
            b = node.closest('[role=dialog]').getBoundingClientRect();
          return a.top >= b.top && a.bottom <= b.bottom;
        }),
        'Settings heading remains visible after focus-driven scroll',
      );
      await p.screenshot({
        path: path.join(root, 'outputs/sites-profile-settings-v214-' + width + '.png'),
      });
      await p.locator('#sites-profile-change-password').fill('legacy-fixture-pass');
      await p.locator('#sites-profile-password-form [type=submit]').click();
      await p.waitForFunction(() => fixture.profiles.active.protected);
      assert.equal(
        await p.locator('#sites-profile-change-password').inputValue(),
        '',
        'Password cleared after confirmed update',
      );
      assert.equal(await p.locator('#sites-profile-old-password').inputValue(), '');
      await p.evaluate(() => {
        fixture.tabs[0].url = 'https://page.test/';
        fixture.tabs[0].title = 'Форма сайта';
        paintSites(structuredClone(fixture));
      });
      await p.locator('#sites-profile-switch').click();
      await p.waitForSelector('#sites-profile-confirm-switch');
      assert.match(
        await p.locator('.sites-profile-lead').textContent(),
        /формы сайтов могут потеряться/,
      );
      await p.getByRole('button', { name: 'Остаться', exact: true }).click();
      assert.equal(await p.evaluate(() => profileMask), false);
      await p.locator('#sites-profile-button').click();
      await p.locator('#sites-profile-switch').click();
      await p.locator('#sites-profile-confirm-switch').click();
      await p.waitForSelector('#sites-profiles-screen', { state: 'visible' });
      await p.locator('#sites-profile-add').click();
      assert.equal(
        await p.locator('#sites-profile-create input').count(),
        2,
        'Creation asks only nickname and password',
      );
      await p.locator('#sites-profile-nick').fill('Игры');
      await p.locator('#sites-profile-new-password').fill('short');
      await p.locator('#sites-profile-create [type=submit]').click();
      assert.match(await p.locator('#sites-profile-error').textContent(), /8 символов/);
      await p.locator('#sites-profile-new-password').fill('fixture-games-pass');
      await p.locator('#sites-profile-create [type=submit]').click();
      await p.waitForSelector('#sites-profile-dialog-backdrop', { state: 'hidden' });
      assert.equal(await p.evaluate(() => fixture.profiles.active.nick), 'Игры');
      assert.equal(await p.locator('#sites-profile-dialog input[data-secret]').count(), 0);
      await p.locator('#sites-profile-button').click();
      await p.locator('#sites-profile-switch').click();
      await p.waitForSelector('#sites-profiles-screen', { state: 'visible' });
      await p.locator('[data-profile-id="work"] .sites-profile-card-open').click();
      await p.locator('#sites-profile-password').fill('wrong-password');
      await p.locator('#sites-profile-enter [type=submit]').click();
      await p.waitForFunction(() =>
        document.getElementById('sites-profile-error').textContent.includes('Неверный пароль'),
      );
      assert.equal(await p.locator('#sites-profile-password').inputValue(), '');
      await p.keyboard.press('Escape');
      await p.locator('[data-profile-id="work"] .sites-profile-card-settings').click();
      await p.locator('#sites-profile-password').fill('fixture-pass');
      await p.locator('#sites-profile-enter [type=submit]').click();
      await p.waitForSelector('#sites-profile-settings');
      assert.equal(
        await p.locator('#sites-profile-settings-nick').inputValue(),
        'Работа',
        'Settings intent survives state published before IPC resolution',
      );
      await p.locator('#sites-profile-password-form [type=submit]').focus();
      await p.keyboard.press('Tab');
      assert.equal(await p.evaluate(() => document.activeElement.id), 'sites-profile-switch');
      await p.keyboard.press('Tab');
      assert.equal(
        await p.evaluate(() => document.activeElement.hasAttribute('data-close-profile')),
        true,
      );
      await p.keyboard.press('Escape');
      assert.equal(await p.evaluate(() => profileMask), false);
      await p.locator('#sites-profile-button').click();
      await p.locator('#sites-profile-switch').click();
      await p.waitForSelector('#sites-profiles-screen', { state: 'visible' });
      await p.locator('#sites-profile-add').click();
      await p.locator('#sites-profile-nick').fill('Новый');
      await p.locator('#sites-profile-new-password').fill('fixture-unknown-pass');
      await p.evaluate(() => (window.rejectNext = 'profile-create'));
      await p.locator('#sites-profile-create [type=submit]').click();
      await p.waitForFunction(
        () => document.getElementById('sites-profile-dialog').dataset.uncertain === 'true',
      );
      assert(await p.locator('#sites-profile-create [type=submit]').isDisabled());
      assert.equal(await p.locator('#sites-profile-new-password').inputValue(), '');
      const count = await p.evaluate(
        () => commands.filter((item) => item.action === 'profile-create').length,
      );
      await p.locator('#sites-profile-create').dispatchEvent('submit');
      assert.equal(
        await p.evaluate(() => commands.filter((item) => item.action === 'profile-create').length),
        count,
        'Unknown create outcome cannot be retried implicitly',
      );
      await p.keyboard.press('Escape');
      await p.evaluate(() => {
        fixture.profiles.items.push({
          id: 'unsafe-label',
          nick: '<img src=x>',
          avatar: 'data:image/svg+xml;base64,PHN2Zz4=',
          color: 'rose',
          protected: true,
          settings: {},
        });
        paintSites(structuredClone(fixture));
        window.savedCard = document.querySelector('[data-profile-id="legacy"]');
        fixture.notice = 'Всё готово';
        paintSites(structuredClone(fixture));
      });
      assert.equal(
        await p.locator('[data-profile-id="unsafe-label"] img').count(),
        0,
        'Only bounded raster avatars render',
      );
      assert.equal(
        await p.locator('[data-profile-id="unsafe-label"] strong').textContent(),
        '<img src=x>',
      );
      assert(
        await p.evaluate(() => savedCard === document.querySelector('[data-profile-id="legacy"]')),
        'Unrelated state does not rebuild profile cards',
      );
      assert(await p.locator('body').evaluate((node) => node.scrollWidth <= innerWidth));
      assert(
        await p
          .locator('#sites-profiles-grid')
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      );
      await p.screenshot({
        path: path.join(root, 'outputs/sites-profiles-v214-' + width + '.png'),
      });
      assert.deepEqual(errors, []);
      assert(
        requests.every((url) => url.startsWith('https://sites.test/')),
        'Local chooser makes no remote requests',
      );
      await p.close();
    }
    const { page: compact, errors } = await fixture(browser, 540, 480);
    await compact.locator('#sites-profile-add').click();
    assert(
      await compact
        .locator('#sites-profile-dialog')
        .evaluate((node) => node.scrollHeight >= node.clientHeight),
    );
    const rect = await compact.locator('#sites-profile-dialog').boundingBox();
    assert(rect.x >= 0 && rect.x + rect.width <= 540);
    await compact.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await compact
        .locator('#sites-profile-dialog')
        .evaluate((node) => getComputedStyle(node).animationName),
      'none',
    );
    assert.deepEqual(errors, []);
    await compact.close();
    const { page: race, errors: raceErrors } = await fixture(browser, 1000);
    await race.locator('[data-profile-id="work"] .sites-profile-card-open').click();
    await race.locator('#sites-profile-password').fill('fixture-pass');
    await race.locator('#sites-profile-enter [type=submit]').click();
    await race.waitForSelector('#sites-profile-button', { state: 'visible' });
    await race.evaluate(() => {
      fixture.profiles.active.settings.lockOnHide = true;
      fixture.shortcuts = [
        {
          id: 'private-shortcut',
          name: 'Личный адрес',
          url: 'https://private.test/?secret=old-profile',
          icon: 'auto',
        },
      ];
      paintSites(structuredClone(fixture));
      window.heldResponses = [];
      window.holdNext = 'shortcut-editor';
      const original = exstraSites.command;
      exstraSites.command = async (payload) => {
        const result = await original(payload);
        if (window.holdNext === payload.action) {
          window.holdNext = '';
          return await new Promise((resolve) => heldResponses.push(() => resolve(result)));
        }
        return result;
      };
    });
    await race.locator('.shortcut-menu').click();
    await race.waitForFunction(() => heldResponses.length === 1);
    await race.locator('#home').click();
    await race.waitForSelector('#sites-profiles-screen', { state: 'visible' });
    await race.evaluate(() => heldResponses.shift()());
    await race.waitForFunction(() => document.body.dataset.editing === 'false');
    assert(await race.locator('#editor-backdrop').isHidden(), 'Late editor open cannot revive after lock');
    assert.equal(await race.locator('#shortcut-name').inputValue(), '');
    assert.equal(await race.locator('#shortcut-url').inputValue(), '');
    await race.locator('[data-profile-id="work"] .sites-profile-card-open').click();
    await race.waitForSelector('#sites-profile-enter');
    await race.locator('#sites-profile-password').fill('fixture-pass');
    await race.locator('#sites-profile-enter [type=submit]').click();
    await race.waitForSelector('#sites-profile-button', { state: 'visible' });
    await race.locator('.shortcut-add').click();
    await race.locator('#shortcut-name').fill('Личный черновик');
    await race.locator('#shortcut-url').fill('https://private.test/?secret=visible-draft');
    await race.evaluate(() => exstraSites.command({ action: 'profile-show', profileId: 'work' }));
    assert(await race.locator('#editor-backdrop').isHidden(), 'Lock removes a visible shortcut editor');
    assert.equal(await race.locator('#shortcut-name').inputValue(), '', 'Lock clears protected nickname draft');
    assert.equal(await race.locator('#shortcut-url').inputValue(), '', 'Lock clears protected URL draft');
    await race.locator('[data-profile-id="work"] .sites-profile-card-open').click();
    await race.locator('#sites-profile-password').fill('fixture-pass');
    await race.locator('#sites-profile-enter [type=submit]').click();
    await race.waitForSelector('#sites-profile-button', { state: 'visible' });
    await race.locator('.shortcut-add').click();
    await race.locator('#shortcut-name').fill('Старое сохранение');
    await race.locator('#shortcut-url').fill('https://private.test/?secret=pending-save');
    await race.evaluate(() => (window.holdNext = 'shortcut-save'));
    await race.locator('#editor-save').click();
    await race.waitForFunction(() => heldResponses.length === 1);
    await race.evaluate(() => exstraSites.command({ action: 'profile-show', profileId: 'work' }));
    await race.locator('[data-profile-id="legacy"] .sites-profile-card-open').click();
    await race.waitForSelector('#sites-profile-button', { state: 'visible' });
    await race.locator('.shortcut-add').click();
    await race.locator('#shortcut-name').fill('Новый черновик');
    await race.locator('#shortcut-url').fill('https://new-profile.test/');
    await race.evaluate(async () => {
      heldResponses.shift()();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert(await race.locator('#editor-backdrop').isVisible(), 'Old save cannot close a new profile editor');
    assert.equal(await race.locator('#shortcut-name').inputValue(), 'Новый черновик');
    assert.equal(await race.locator('#shortcut-url').inputValue(), 'https://new-profile.test/');
    assert(await race.locator('#editor-save').isEnabled());
    assert.equal(await race.locator('#editor-error').textContent(), '');
    assert(
      await race.evaluate(() =>
        commands
          .filter((item) => item.action === 'shortcut-save')
          .every((item) => item.profileId === 'work'),
      ),
      'Save requests retain the profile that owned their draft',
    );
    assert.deepEqual(raceErrors, []);
    await race.close();
    console.log(
      'PASS Sites profiles UI: chooser/legacy gate, create/unlock, password clearing, settings/avatar/accents, confirmed switch, unknown-result guard, early publication and shortcut owner races, draft cleanup, focus/keyboard, local CSP and 420/540/1440 layouts.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
