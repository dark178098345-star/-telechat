'use strict';
// Production files, but synthetic media/account state. All Supabase HTTP/WS is blocked.
const assert = require('node:assert/strict'), path = require('node:path'), { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    for (const width of [390,1440]) {
      const context = await browser.newContext({ viewport:{width,height:900}, serviceWorkers:'block' });
      await context.route('**/*', route => new URL(route.request().url()).hostname.endsWith('.supabase.co') ? route.abort() : route.continue());
      await context.routeWebSocket(/supabase\.co/, socket => socket.close());
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://dark178098345-star.github.io/-telechat/?v=216&music-qa='+Date.now(), { waitUntil:'domcontentloaded' });
      await page.waitForFunction(() => window.exstraWhatsNewV181?.version === 216);
      assert.equal(await page.locator('#app-restart-open-v216').count(),1);
      await page.evaluate(() => {
        me={nick:'__isolated_music_qa__'};
        dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{track:{id:'public-qa-only',owner:me.nick,title:'nyan pop',artist:'nyan.mp3',url:'https://example.invalid/qa.wav'},paused:false,loading:false,time:2,duration:60}}));
      });
      await page.waitForSelector('#music-start-v216.is-visible');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('music-start-v216')).opacity === '1');
      assert.equal(await page.locator('#music-start-v216 strong').textContent(),'nyan pop');
      assert.equal(await page.locator('#music-start-v216 time').textContent(),'0:02');
      assert.equal(await page.locator('#music-start-v216').evaluate(node=>getComputedStyle(node).pointerEvents),'none');
      const b=await page.locator('#music-start-v216').boundingBox();assert(b.x>=0&&b.x+b.width<=width&&b.height<100);
      await page.screenshot({path:path.resolve(__dirname,'../outputs/music-start-v216-public-'+width+'.png')});
      await page.evaluate(() => { me=null;dispatchEvent(new Event('telechat-account-ready-v175')); });
      assert(await page.locator('#music-start-v216').evaluate(node=>node.hidden));
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS public v216: actual new scripts/settings button, click-through now-playing card/realistic progress, account cleanup and 390/1440 layout; all backend HTTP/WS blocked, no real music, account, installer or restart touched.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
