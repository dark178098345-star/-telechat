'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(fixtureClient);
  await context.route('**/*',r=>{
   const url=new URL(r.request().url());
   if(url.hostname==='cdn.jsdelivr.net')return r.fulfill({contentType:'application/javascript',body:''});
   if(url.hostname.endsWith('.supabase.co'))return r.fulfill({contentType:'application/json',body:'[]'});
   if(url.hostname!=='app.test')return r.abort();
   const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return r.abort();
   return r.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('https://app.test/');
  await p.waitForFunction(()=>!document.getElementById('startup-loader'));
  await p.locator('#l-login').fill('alice');await p.locator('#l-pass').fill('fixture-only');await p.evaluate(()=>doLogin());
  await p.locator('#whats-new-v181[open] button[data-close]').last().click();
  await p.evaluate(()=>{
   exstraMotionV184.set('full');window.motionTrace=[];window.fixtureClicks=0;
   // Keep the separately tested welcome from covering the Music controls.
   window.telechatMusicIntroV118={...telechatMusicIntroV118,enter:()=>false};
   const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,timing){
    const key=this.matches('.user-profile-card')?'user-profile-card':this.dataset.walletPane?'wallet-'+this.dataset.walletPane:this.id||this.classList[0]||this.tagName;
    motionTrace.push({key,frames,duration:timing.duration});return animate.apply(this,arguments);
   };
   const row=document.createElement('div');row.style.cssText='position:fixed;z-index:40000;top:4px;right:4px;display:flex;gap:8px';
   row.innerHTML='<button id="test-fast-v220" type="button">Go</button><button id="test-disabled-v220" type="button" aria-disabled="true">No</button>';
   row.querySelector('#test-fast-v220').onclick=()=>fixtureClicks++;document.body.append(row);window.pressFixture=row;
  });
  const matched=key=>p.waitForFunction(key=>motionTrace.some(a=>a.key===key),key,{timeout:5000}).catch(async error=>{
   console.error('Missing entrance:',key,'width:',width,'observed:',await p.evaluate(()=>motionTrace.map(a=>a.key)));
   throw error;
  });
  const idle=()=>p.waitForFunction(()=>exstraMotionV184.getState().active===0&&!exstraMotionV184.getState().feedback);
  const clear=async()=>{await idle();await p.evaluate(()=>{motionTrace.length=0;});};
  const fast=p.locator('#test-fast-v220');
  if(width<600)await fast.tap();else{
   const r=await fast.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
   assert(await fast.evaluate(n=>n.classList.contains('is-pressing-v184')));await p.mouse.up();
  }
  await matched('test-fast-v220');assert.equal(await p.evaluate(()=>fixtureClicks),1);
  await fast.focus();await fast.press('Space');assert.equal(await p.evaluate(()=>fixtureClicks),2);assert.equal(await p.locator('.is-pressing-v184').count(),0);
  await clear();
  await p.locator('#test-disabled-v220').evaluate(n=>{n.dispatchEvent(new PointerEvent('pointerdown',{button:0,isPrimary:true,pointerId:9,bubbles:true}));});
  assert.equal(await p.locator('.is-pressing-v184').count(),0);await p.evaluate(()=>pressFixture.remove());
  if(width<600){
   await p.locator('[data-phone-tab=more]').click();await matched('phone-page-scroll-v159');
   await clear();await p.locator('[data-phone-tab=chats]').click();await matched('contacts-list');
  }else{
   await p.evaluate(()=>telechatNavigate('profile'));await matched('profile-quick-v91');await p.keyboard.press('Escape');
  }
  await clear();await p.evaluate(()=>openPanel('settings-panel'));await matched('settings-panel');
  await clear();await p.evaluate(()=>telechatSettingsV160.openSection('appearance'));
  assert(await p.evaluate(()=>motionTrace.length>0),'Settings content animates');
  await p.evaluate(()=>closeAllPanels());await clear();
  await p.evaluate(()=>openChat('bob'));
  if(width<600){
   const main=p.locator('.chat-main');
   assert(await main.evaluate(n=>getComputedStyle(n).transitionDuration.split(',').some(x=>parseFloat(x)>0)),'Phone keeps its existing single navigation transition');
   await p.waitForFunction(()=>Math.abs(document.querySelector('.chat-main').getBoundingClientRect().left)<1);
  }else{
   await matched('active-chat');
   const chat=await p.evaluate(()=>motionTrace.find(x=>x.key==='active-chat'));assert(chat.frames.every(k=>!k.transform),'Chat has no moving layout transform');
  }
  await clear();await p.locator('#attach-button-v141').click();await matched('attachment-menu-v141');
  assert(await p.locator('#attachment-menu-v141 button').first().evaluate(n=>document.activeElement===n));
  await p.keyboard.press('Escape');assert(await p.locator('#attachment-menu-v141').isHidden());
  assert(await p.locator('#attach-button-v141').evaluate(n=>document.activeElement===n));
  await clear();await p.evaluate(()=>toggleEmojiPicker());await matched('emoji-picker');await p.evaluate(()=>exstraEmojiPickerV182.close());
  await clear();await p.evaluate(()=>openUserProfile('bob'));await matched('user-profile-card');await p.evaluate(()=>closeUserProfile());
  await clear();await p.evaluate(()=>telechatSharedMediaV152.open('bob'));await matched('shared-media-v152');await p.evaluate(()=>telechatSharedMediaV152.close());
  await clear();await p.evaluate(()=>telechatMusicHubV117.open());await matched('mh-workspace');
  await clear();await p.locator('.mh-nav [data-view=likes]').click();await matched('mh-content');
  await clear();await p.locator(width<600?'.phone-now-open-v159':'.mh-now-toggle').click();await matched('mh-listening-v171');await p.keyboard.press('Escape');
  await clear();await p.locator('.mh-publish-top').click();await matched('mh-sheet');
  assert(await p.locator('.mh-sheet').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));
  await idle();const started=await p.evaluate(()=>exstraMotionV184.getState().started);
  await p.locator('[name=title]').fill('Fixture draft');await p.evaluate(()=>document.getElementById('mh-sheet').classList.add('unrelated-test'));
  assert.equal(await p.evaluate(()=>exstraMotionV184.getState().started),started,'Draft and data updates do not replay a sheet');
  await p.keyboard.press('Escape');await p.evaluate(()=>telechatMusicHubV117.close());
  await clear();await p.evaluate(()=>exstraWalletUIV197.open());await matched('exstra-wallet-v197');
  assert(!(await p.evaluate(()=>motionTrace.some(x=>x.key==='wallet-overview'))),'New dialog and its initial tab share one entrance');
  await clear();await p.locator('[data-wallet-tab=history]').click();await matched('wallet-history');
  await p.locator('[data-wallet-close]').click();
  await p.evaluate(()=>exstraMotionV184.set('off'));await clear();
  await p.locator('#attach-button-v141').click();assert(await p.locator('#attachment-menu-v141').isVisible());assert.equal(await p.evaluate(()=>motionTrace.length),0);
  await p.keyboard.press('Escape');await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>exstraMotionV184.set('full'));await clear();
  await p.locator('#attach-button-v141').click();assert(await p.locator('#attachment-menu-v141').isVisible());assert.equal(await p.evaluate(()=>motionTrace.length),0);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS motion v220: real tap/mouse/keyboard, disabled controls, quick profile/phone tabs/settings/chat/attachments/emoji/profile/gallery/music/queue/sheet/wallet tabs, no replay, immediate Escape/focus and reduced/off.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
