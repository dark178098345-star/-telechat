'use strict';
// Production files, but synthetic media/account state. All Supabase HTTP/WS is blocked.
const assert = require('node:assert/strict'), path = require('node:path'), { chromium } = require('playwright');
const {fixtureClient}=require('./runtime-v180.browser.cjs');
(async () => {
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    for (const width of [390,1440]) {
      const context = await browser.newContext({ viewport:{width,height:900}, isMobile:width<600, hasTouch:width<600, serviceWorkers:'block' });
      await context.addInitScript(fixtureClient);
      await context.addInitScript(()=>localStorage.setItem('exstrachat.release-notes.v1.alice',JSON.stringify({seen:230,auto:false})));
      await context.route('**/*', route => {
        const host=new URL(route.request().url()).hostname;
        if(host.endsWith('.supabase.co'))return route.abort();
        return host==='cdn.jsdelivr.net'?route.fulfill({contentType:'application/javascript',body:'/* offline QA SDK */'}):route.continue();
      });
      await context.routeWebSocket(/supabase\.co/, socket => socket.close());
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://dark178098345-star.github.io/-telechat/?v=230&music-qa='+Date.now(), { waitUntil:'domcontentloaded' });
      await page.waitForFunction(() => window.exstraWhatsNewV181?.version === 230 && !document.getElementById('startup-loader'));
      assert.equal(await page.locator('#app-restart-open-v216').count(),1);
      await page.locator('#l-login').fill('alice');
      await page.locator('#l-pass').fill('fixture-only');
      await page.evaluate(()=>doLogin());
      await page.waitForFunction(()=>document.getElementById('chat-screen').classList.contains('active')&&me?.nick==='alice');
      await page.evaluate(() => {
        dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{track:{id:'public-qa-only',owner:me.nick,title:'nyan pop',artist:'nyan.mp3',url:'https://example.invalid/qa.wav'},paused:false,loading:false,time:2,duration:60}}));
      });
      const card=page.locator('#music-dock-v230');
      await card.waitFor({state:'visible'});
      assert.equal(await card.locator('strong').textContent(),'nyan pop');
      assert.equal(await card.locator('[data-dock-elapsed]').textContent(),'0:02');
      assert.equal(await card.locator('[data-dock-remaining]').textContent(),'−0:58');
      assert.equal(await card.evaluate(node=>node.parentElement.id),'sidebar');
      const b=await card.boundingBox();assert(b.x>=0&&b.x+b.width<=width+1&&b.height<185);
      assert.equal(await page.locator('.music-sidebar-player,.music-chat-player,#music-start-v216').count(),0);
      await card.screenshot({path:path.resolve(__dirname,'../outputs/music-dock-v230-public-'+width+'.png'),animations:'disabled'});
      await card.locator('[data-dock-music=compact]').click();
      assert(await card.locator('#music-dock-controls-v230').isHidden());
      await page.evaluate(() => { me=null;dispatchEvent(new Event('telechat-account-ready-v175')); });
      assert(await card.evaluate(node=>node.hidden));
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS public V230: one playable dock, no old strip or toast, collapse, elapsed/remaining time, account cleanup and responsive layout; backend blocked.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
