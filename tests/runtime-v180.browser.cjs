// Entire production HTML/script stack, isolated from real accounts and services.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

function fixtureClient() {
  const users = [
    { nick: 'alice', name: 'Alice', pass: 'fixture-only', av: 0, status: '', bio: 'Fixture profile', banner: 'preset:cosmos', role: 'user', session_version: 0, last_seen: Date.now() - 120000 },
    { nick: 'bob', name: 'Bob', av: 1, status: '', bio: 'Fixture peer', banner: 'preset:cosmos', role: 'admin', last_seen: Date.now() - 120000 }
  ];
  const messages = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, chat_key: 'alice_bob', from_nick: i % 2 ? 'alice' : 'bob', text: 'Fixture message ' + i, ts: Date.now() - 200000 + i * 1000, deleted: false, read_by: [] }));
  const match = (row, filters) => filters.every(([op, field, value]) => op === 'eq' ? row[field] === value : op === 'neq' ? row[field] !== value : op === 'in' ? value.includes(row[field]) : op === 'lt' ? row[field] < value : op === 'gte' ? row[field] >= value : true);
  const reply = value => { let q; q = new Proxy({ then(resolve, reject) { return Promise.resolve({ data: value, error: null }).then(resolve, reject); } }, { get(target, key) { return key in target ? target[key] : () => q; } }); return q; };
  const client = {
    from(table) {
      const filters = []; let single = false, count = 1000, order, descending = false;
      let q; q = new Proxy({ then(resolve, reject) {
        let rows = (table === 'users' ? users : table === 'messages' ? messages : []).filter(row => match(row, filters));
        if (order) rows = rows.slice().sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0) * (descending ? -1 : 1));
        rows = rows.slice(0, count);
        return Promise.resolve({ data: structuredClone(single ? rows[0] || null : rows), error: null, count: rows.length }).then(resolve, reject);
      } }, { get(target, key) {
        if (key in target) return target[key];
        return (...args) => {
          if (['eq', 'neq', 'in', 'lt', 'gte'].includes(key)) filters.push([key, ...args]);
          if (key === 'maybeSingle' || key === 'single') single = true;
          if (key === 'limit') count = args[0];
          if (key === 'order') { order = args[0]; descending = args[1]?.ascending === false; }
          return q;
        };
      } }); return q;
    },
    rpc(name, args) {
      if (name === 'telechat_files_v141' && args.p_action === 'reserve') return reply({id:'00000000-0000-4000-8000-'+String(window.fixtureFileId=(window.fixtureFileId||0)+1).padStart(12,'0'),token:'fixture-file-capability',...args.p_data});
      if (name === 'exstra_send_messages_v172') {
        const rows = args.p_rows.map(row => { const saved = { deleted: false, ...row, id: messages.length + 1, read_by: [] }; messages.push(saved); return saved; });
        return reply({ rows, server_time: Date.now() });
      }
      if (name === 'exstra_presence_snapshot_v172') return reply({ modern: [], legacy: [], users: users.map(u => ({ nick: u.nick, last_seen: u.last_seen })), server_time: Date.now() });
      if (name === 'exstra_presence_heartbeat_v172') return reply({ ts: args.p_at * 10 + 1, server_time: Date.now() });
      if (name === 'telechat_music_v117') return reply({ saved: [], liked: [], playlists: [] });
      if (name === 'telechat_activity_v124') return reply({ nick: 'alice', xp: 0, active_seconds: 0, music_seconds: 0 });
      return reply({});
    },
    channel() {
      const channel = { on() { return channel; }, subscribe(callback) { if (callback) setTimeout(() => callback('SUBSCRIBED'), 0); return channel; }, track: async () => 'ok', untrack: async () => 'ok', presenceState: () => ({}), send: async () => 'ok' };
      return channel;
    },
    removeChannel: async () => {},
    storage: { from: () => ({ getPublicUrl: p => ({ data: { publicUrl: 'https://app.test/' + p } }),upload:async()=>{window.fixtureUploads=(window.fixtureUploads||0)+1;return {};},remove:async()=>({}) }) }
  };
  window.supabase = { createClient: () => client };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600, serviceWorkers: 'block' });
      await context.addInitScript(fixtureClient);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'cdn.jsdelivr.net') return route.fulfill({ contentType: 'application/javascript', body: '/* Fixture Supabase client is injected before page scripts. */' });
        if (url.hostname.endsWith('.supabase.co')) return route.fulfill({ status: route.request().method() === 'GET' ? 200 : 204, headers: { Date: new Date().toUTCString() }, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '' });
        if (url.hostname !== 'app.test') return route.abort();
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        const type = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
      });
      const p = await context.newPage(); const errors = [];
      p.on('pageerror', error => errors.push(error.message));
      await p.goto('https://app.test/?v=180');
      await p.locator('#l-login').fill('alice'); await p.locator('#l-pass').fill('fixture-only');
      await p.evaluate(() => doLogin());
      await p.waitForFunction(() => document.getElementById('chat-screen').classList.contains('active'));
      await p.waitForSelector('#whats-new-v181[open]');
      await p.locator('#whats-new-v181 button[data-close]').last().click();
      await p.evaluate(() => openChat('bob'));
      await p.waitForFunction(() => document.querySelectorAll('#messages .msg').length >= 20);
      await p.locator('#msg-input').fill('Runtime v180 send');
      await p.evaluate(() => sendMsg());
      await p.waitForFunction(() => [...document.querySelectorAll('#messages .msg-bubble')].some(node => node.textContent === 'Runtime v180 send'));
      await p.waitForTimeout(150);
      assert.equal(await p.locator('#messages .msg-bubble').filter({ hasText: 'Runtime v180 send' }).count(), 1, 'No duplicate optimistic message in full stack');
      await p.evaluate(()=>exstraEmojiComposerV182.insert(exstraEmojiCatalogV182.get('boxing')));
      assert.equal(await p.locator('#msg-input').inputValue(),'🥊','Custom IDs never appear in the input');
      await p.locator('.send-btn').click();
      await p.waitForSelector('#messages [data-emoji-id=boxing]');
      assert(!(await p.locator('#messages').textContent()).includes('[ex182:boxing]'),'Actual send renders the selected custom expression, not its internal token');
      await p.evaluate(()=>exstraEmojiComposerV182.insert(exstraEmojiCatalogV182.get('bubble-tea')));
      await p.locator('#chat-photo-input').setInputFiles({name:'camera.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=','base64')});
      await p.waitForFunction(()=>pendingMedia?._photoBlobV182 instanceof Blob&&!exstraPhotoComposeV182.isPreparing());
      await p.locator('.send-btn').click();
      await p.waitForFunction(()=>document.querySelectorAll('#messages .auto-photo-v179').length===1);
      assert.equal(await p.evaluate(()=>window.fixtureUploads),1,'Actual sender chain uploads the photo exactly once');
      await p.waitForSelector('#messages .media-caption [data-emoji-id=bubble-tea]');
      assert(!(await p.locator('#messages').textContent()).includes('[ex182:bubble-tea]'),'Photo caption renders its custom emotion without exposing internal tokens');
      await p.waitForFunction(()=>!pendingMedia);
      const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=','base64');
      await p.locator('#chat-photo-input').setInputFiles([1,2,3].map(n=>({name:'album-'+n+'.png',mimeType:'image/png',buffer:tiny})));
      await p.waitForFunction(()=>pendingMedia?._albumV183?.length===3&&!exstraPhotoComposeV182.isPreparing());
      assert.equal(await p.locator('.album-pending-item-v183').count(),3);
      await p.screenshot({path:path.join(root,'outputs/album-compose-real-v183-'+width+'.png')});
      if(width<600){
        const headerHeight=await p.locator('.chat-header').evaluate(n=>n.getBoundingClientRect().height);
        await p.locator('#msg-input').focus();
        await p.evaluate(()=>{window.fixtureNativeViewport=visualViewport;const v=new EventTarget();v.height=420;v.offsetTop=0;Object.defineProperty(window,'visualViewport',{value:v,configurable:true});window.dispatchEvent(new Event('resize'));});
        await p.waitForTimeout(150);
        assert.equal(await p.locator('.chat-header').evaluate(n=>n.getBoundingClientRect().height),headerHeight,'Album caption keyboard does not squash header');
        assert(await p.locator('#pending-media').evaluate(n=>n.getBoundingClientRect().height>100),'Album controls are not clipped by the old 50px keyboard preview rule');
        assert(await p.locator('#input-area').evaluate(n=>n.getBoundingClientRect().bottom<=421),'Album composer remains above keyboard');
        await p.screenshot({path:path.join(root,'outputs/album-keyboard-v183.png')});
        await p.evaluate(()=>{document.getElementById('msg-input').blur();Object.defineProperty(window,'visualViewport',{value:fixtureNativeViewport,configurable:true});window.dispatchEvent(new Event('resize'));});
        await p.waitForTimeout(100);
      }
      await p.getByRole('button',{name:'Переместить фото 2 влево',exact:true}).click();
      await p.locator('#msg-input').fill('Общая подпись');
      await p.locator('.send-btn').click();
      await p.waitForSelector('#messages .photo-album-v183[data-count="3"]');
      assert.equal(await p.evaluate(()=>window.fixtureUploads),4,'One upload per photo including the preceding single photo');
      assert.equal(await p.locator('#messages .photo-album-v183').count(),1,'One album row, not three separate messages');
      assert.equal(await p.locator('#messages .photo-album-v183').evaluate(n=>n.parentElement.querySelector('.media-caption').textContent),'Общая подпись');
      await p.locator('#messages .photo-album-v183').scrollIntoViewIfNeeded();
      await p.waitForFunction(()=>document.querySelectorAll('.photo-album-v183 img:not([hidden])').length===3,{},{timeout:5000}).catch(async error=>{console.log(JSON.stringify(await p.evaluate(()=>({hidden:document.hidden,photos:[...document.querySelectorAll('.auto-photo-v179')].map(c=>({ready:c.dataset.mediaReadyV179,busy:c.getAttribute('aria-busy'),text:c.textContent,html:c.querySelector('img').outerHTML,complete:c.querySelector('img').complete,rect:c.getBoundingClientRect().toJSON(),cached:!!telechatAttachmentsV141.cachedFile(JSON.parse(c.dataset.attachmentV179).id)}))}))));await p.screenshot({path:path.join(root,'outputs/album-debug-v183.png')});throw error;});
      await p.locator('#messages .photo-album-v183 img').first().click();
      await p.waitForSelector('#album-viewer-v183 img:not([hidden])');
      assert(await p.locator('#album-viewer-v183').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&Math.abs(r.left-(innerWidth-r.width)/2)<2;}),'Viewer is centered on desktop and fits phone');
      assert.equal(await p.locator('#album-viewer-v183 footer>span').textContent(),'1 / 3');
      await p.getByRole('button',{name:'Следующее фото',exact:true}).click();
      assert.equal(await p.locator('#album-viewer-v183 footer>span').textContent(),'2 / 3');
      await p.screenshot({path:path.join(root,'outputs/album-viewer-v183-'+width+'.png')});
      await p.getByRole('button',{name:'Закрыть альбом',exact:true}).click();
      await p.screenshot({path:path.join(root,'outputs/album-chat-v183-'+width+'.png')});
      await p.evaluate(()=>telechatSharedMediaV152.open('bob'));
      await p.waitForFunction(()=>document.querySelectorAll('#shared-media-list-v152 .auto-photo-v179').length===4,{},{timeout:5000}).catch(async e=>{console.log('GALLERY',await p.locator('#shared-media-v152').textContent(),errors);throw e;});
      await p.evaluate(()=>telechatSharedMediaV152.close());
      await p.evaluate(() => openUserProfile('bob'));
      await p.waitForTimeout(200);
      assert.equal(await p.locator('#view-profile-name').textContent(), 'Bob');
      await p.evaluate(() => closeUserProfile());
      await p.waitForTimeout(150);
      await p.evaluate(() => {
        window.idleBadgeCandidates = 0; const query = Element.prototype.querySelectorAll;
        Element.prototype.querySelectorAll = function(selector) { const result = query.call(this, selector); if (this === document.body && selector.includes('profile-nick-marker')) idleBadgeCandidates += result.length; return result; };
      });
      await p.waitForTimeout(700);
      assert.equal(await p.evaluate(() => idleBadgeCandidates), 0, 'Full app has no whole-body role rescan while idle');
      assert(await p.locator('#input-area').evaluate(n => { const r = n.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; }), 'Composer still fits viewport ' + width);
      assert.deepEqual(errors, [], 'All production scripts work together at ' + width);
      await context.close();
    }
    console.log('PASS full production stack: isolated login, chat/history, optimistic send, profile, idle DOM work and composer at 390/1440px');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
