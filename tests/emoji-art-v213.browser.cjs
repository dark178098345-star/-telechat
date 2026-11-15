'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const p = await browser.newPage({ viewport: { width: 1240, height: 920 } });
    await p.setContent(
      '<style>body{margin:0;padding:32px;background:#181920;color:#f3edf8;font:14px system-ui}h1{font-size:26px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}.card{display:grid;place-items:center;gap:8px;padding:18px 6px;border:1px solid #ffffff08;border-radius:24px;background:#ffffff03;text-align:center}.card svg{width:110px;height:110px}.card span{font-size:11px;color:#b9b4c5}#focus{grid-template-columns:repeat(6,1fr);margin-bottom:24px}#focus svg{width:140px;height:140px}.light{background:#f2f1f7;color:#30263b}.light .card{background:#fff;border-color:#e7e0ef}.light .card span{color:#776983}</style><h1>ExstraChat · Обновлённые эмоции</h1><div class="grid" id="focus"></div><div class="grid" id="all"></div>',
    );
    for (const f of ['emoji-catalog-v182.js', 'emoji-art-v182.js'])
      await p.addScriptTag({ path: path.join(root, f) });
    const stats = await p.evaluate(() => {
      const art = telechatEmojiArtV127,
        focus = [
          'smile',
          'heart-eyes',
          'laugh',
          'sad',
          'cry',
          'cool',
          'thumb',
          'heart',
          '🔥',
          'surprise',
          'tongue',
          'heart-hands',
          'peace',
          'fist',
          'please',
          'hug',
          'dog',
          'flowers',
        ];
      const card = (item) =>
        '<div class="card">' + item.html + '<span>' + item.label + '</span></div>';
      document.getElementById('focus').innerHTML = focus.map((id) => card(art.get(id))).join('');
      document.getElementById('all').innerHTML = art.all.map(card).join('');
      return {
        count: art.all.length,
        revision: [...document.querySelectorAll('svg')].every(
          (s) => s.dataset.artRevision === '213',
        ),
        ids: new Set([...document.querySelectorAll('[id]')].map((n) => n.id)).size,
        total: document.querySelectorAll('[id]').length,
        remote: document.querySelectorAll('filter,image').length,
        fire: art.get('🔥').html.includes('data-emoji-part="flame"'),
      };
    });
    assert.equal(stats.count, 111);
    assert(stats.revision && stats.fire);
    assert.equal(stats.ids, stats.total);
    assert.equal(stats.remote, 0);
    await p
      .locator('#focus')
      .screenshot({ path: path.join(root, 'outputs/emoji-art-v213-focus.png') });
    await p.screenshot({
      path: path.join(root, 'outputs/emoji-art-v213-dark.png'),
      fullPage: true,
    });
    await p.evaluate(() => document.body.classList.add('light'));
    await p.screenshot({
      path: path.join(root, 'outputs/emoji-art-v213-light.png'),
      fullPage: true,
    });
    console.log(
      'PASS v213 art: 111 compatible expressions, original fire artwork, unique definitions, vector-only, dark/light rendered galleries.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
