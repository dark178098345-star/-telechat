'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const file of ['empty-scenes-v218.js','empty-scenes-v218.css','shared-media-v152.js','music-hub-v117.js','quick-jump-v154.js','emoji-picker-v182.js','my-center-v187.js','wallet-ui-v197.js','whats-new-v181.js']){
 assert(read('index.html').includes('./'+file+'?v=219'),file);
 assert(read('sw.js').includes('./'+file+'?v=219'),file+' offline');
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(fixtureClient);
  await context.addInitScript(()=>localStorage.setItem('exstrachat.interface-motion.v184.alice','full'));
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:''});
   if(url.hostname.endsWith('.supabase.co'))return route.fulfill({contentType:'application/json',body:'[]'});
   if(url.hostname!=='app.test')return route.abort();
   const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
   return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://app.test/');
  await p.waitForFunction(()=>!document.getElementById('startup-loader'));
  await p.locator('#l-login').fill('alice');await p.locator('#l-pass').fill('fixture-only');await p.evaluate(()=>doLogin());
  await p.locator('#whats-new-v181[open] button[data-close]').last().click();await p.waitForSelector('#whats-new-v181',{state:'hidden'});
  assert.equal(await p.locator('#empty-state svg[data-scene=chats]').count(),1,'Welcome art exists even when the mobile list covers it');
  // Finish the initial scheduled unread refresh before simulating a read.
  await p.waitForFunction(()=>telechatExperienceV62.unread().alice_bob?.count>0);
  await p.evaluate(()=>telechatExperienceV62.refreshUnread());
  await p.evaluate(()=>setSidebarFilter('unread'));
  assert(await p.locator('#contacts-list .contact:visible').count()>0);
  assert.equal(await p.locator('#unread-empty-v174').count(),0,'Unread chats prevent the empty illustration');
  const unread='#unread-empty-v174';
  const first=await p.evaluate(()=>{
   window.sceneStarts=0;document.getElementById('contacts-list').addEventListener('animationstart',e=>{if(e.animationName==='es-open-v218')sceneStarts++;});
   telechatExperienceV62.clearUnread('alice_bob');
   window.originalUnread=document.getElementById('unread-empty-v174');
   const art=originalUnread.querySelector('svg');
   return {kind:art.dataset.scene,animation:getComputedStyle(art.querySelector('.es-lid')).animationName,iteration:getComputedStyle(art.querySelector('.es-lid')).animationIterationCount};
  });
  assert.deepEqual(first,{kind:'unread',animation:'es-open-v218',iteration:'1'});
  await p.waitForFunction(()=>sceneStarts>=1,undefined,{timeout:2400}).catch(async error=>{
   console.log(await p.evaluate(()=>{const node=document.getElementById('unread-empty-v174'),lid=node?.querySelector('.es-lid');return {start:sceneStarts,isSame:node===originalUnread,rect:node?.getBoundingClientRect().toJSON(),policy:document.body.dataset.uiMotionV184,animation:lid&&getComputedStyle(lid).animationName,visibility:document.visibilityState,read:telechatExperienceV62.unread()};}));throw error;
  });
  if(width===390){
   const readScene=ms=>p.evaluate(ms=>{
    const art=originalUnread.querySelector('svg');
    if(!window.sceneTimeline){window.sceneTimeline=art.getAnimations({subtree:true});for(const a of sceneTimeline)a.pause();}
    for(const a of sceneTimeline)a.currentTime=ms;
    const css=node=>getComputedStyle(art.querySelector(node));
    const threads=[...art.querySelectorAll('.es-web .es-thread')].map(n=>parseFloat(getComputedStyle(n).strokeDashoffset));
    return {folder:css('.es-lid').transform,spider:css('.es-spider').transform,seen:+css('.es-spider').opacity,threads,hang:parseFloat(css('.es-hang').strokeDashoffset),end:Math.max(...sceneTimeline.map(a=>a.effect.getComputedTiming().endTime))};
   },ms);
   const closed=await readScene(0),running=await readScene(630),weaving=await readScene(1460),falling=await readScene(2260),done=await readScene(2800);
   assert.equal(closed.seen,0);assert.notEqual(closed.folder,'none');
   assert.equal(running.seen,1);assert.notEqual(running.spider,closed.spider);assert(running.threads.every(d=>d>.99));
   assert(weaving.threads[0]<.01&&weaving.threads.at(-1)>.99,'Threads are woven in sequence');
   assert(falling.threads.every(d=>d<.01)&&falling.hang>0&&falling.hang<1,'After weaving, the spider descends on its line');
   assert.equal(done.spider,'none');assert.equal(done.hang,0);assert.equal(done.end,2690);
   await readScene(1460);await p.screenshot({path:path.join(root,'outputs','empty-scenes-v219-weaving-390.png')});
   await p.evaluate(()=>{for(const a of sceneTimeline)a.finish();});
  }
  await p.waitForFunction(()=>document.querySelector('#unread-empty-v174 svg').getAnimations({subtree:true}).length===0);
  await p.evaluate(async()=>{await renderContacts();await renderSidebarCachedV17();telechatExperienceV62.decorate();});
  assert.deepEqual(await p.evaluate(()=>({same:document.getElementById('unread-empty-v174')===originalUnread,starts:sceneStarts,read:telechatExperienceV62.unread()})),{same:true,starts:1,read:{}},'Refresh cannot replace or replay the scene');
  assert.equal(await p.locator(unread+' svg').getAttribute('aria-hidden'),'true');
  assert.match(await p.locator(unread).innerText(),/Здесь ничего нет/);
  assert(await p.locator(unread).evaluate(n=>n.scrollWidth<=n.clientWidth));
  await p.screenshot({path:path.join(root,'outputs','empty-scenes-v218-unread-'+width+'.png')});
  await p.locator(unread+' button').click();await p.waitForFunction(()=>sidebarFilter==='all');assert.equal(await p.locator(unread).count(),0);
  for(const [view,kind] of [['group','group'],['channel','channel']]){
   await p.evaluate(view=>setSidebarFilter(view),view);
   const art=p.locator('#contacts-list svg[data-scene='+kind+']');await art.waitFor();
   await p.evaluate(()=>{window.sameScene=document.querySelector('#contacts-list .exstra-scene-v218');});
   await p.evaluate(()=>renderSidebarCachedV17());assert(await art.evaluate(n=>n===sameScene));
  }
  await p.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await p.locator('#contacts-list .es-enter').evaluate(n=>getComputedStyle(n).animationName),'none');
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>exstraMotionV184.set('off'));
  assert.equal(await p.locator('#contacts-list .es-enter').evaluate(n=>getComputedStyle(n).animationName),'none');
  await p.evaluate(()=>{exstraMotionV184.set('full');document.body.classList.add('theme-light');});
  await p.screenshot({path:path.join(root,'outputs','empty-scenes-v218-light-'+width+'.png')});
  await p.evaluate(()=>{document.body.classList.remove('theme-light');});
  if(width===1440){
   await p.evaluate(()=>telechatQuickJumpV154.open());
   const jump=p.locator('#quick-jump-v154 input');await jump.fill('xyz--missing');await p.locator('.qj-empty-v154 [data-scene=jump]').waitFor();
   await p.evaluate(()=>{window.jumpArt=document.querySelector('.qj-empty-v154 svg');});
   await jump.fill('xyz--still-missing');assert(await p.locator('.qj-empty-v154 svg').evaluate(n=>n===jumpArt),'Another empty search does not rebuild the compass');
   await p.locator('.qj-close-v154').click();
   await p.evaluate(()=>exstraCenterV187.open());
   await p.locator('[data-mc=pick-chat]').click();assert(await p.locator('#mc-picker-list-v187 [data-scene=contacts]').isVisible());
   await p.locator('[data-mc=close]').click();
   await p.evaluate(()=>exstraWalletUIV197.open({tab:'history'}));
   assert(await p.locator('[data-wallet-history] [data-scene=ledger]').isVisible());
   await p.locator('[data-wallet-tab=gifts]').click();await p.locator('[data-gift-mode=collection]').click();
   await p.locator('[data-owned-gifts] [data-scene=gifts]').waitFor();
   await p.locator('#exstra-wallet-v197').evaluate(n=>n.close());
   await p.evaluate(async()=>{
    const before=sb.from;
    sb.from=()=>{const q=new Proxy({then:(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no)},{get:(o,k)=>o[k]||(()=>q)});return q;};
    try{document.getElementById('search-inp').value='nobody_here';await doSearch();}finally{sb.from=before;}
   });
   assert(await p.locator('#search-results [data-scene=search]').isVisible());
   await p.evaluate(()=>closeGlobalSearch());
   await p.evaluate(()=>{userCache.empty_peer={nick:'empty_peer',name:'Empty peer',status:'',av:0};return openChat('empty_peer');});
   assert(await p.locator('#messages .v51-empty-chat svg[data-scene=chats]').isVisible());
   await p.evaluate(()=>{
    const before=sb.from, result=error=>({data:[],error});
    let release;const gate=new Promise(resolve=>release=resolve);
    window.mediaFinish=()=>{sb.from=before;release(result(null));};
    sb.from=(table)=>{const q=before.call(sb,table);if(table!=='messages')return q;let proxy;proxy=new Proxy(q,{get(o,k){if(k==='then')return (yes,no)=>gate.then(yes,no);return typeof o[k]==='function'?(...args)=>{const next=o[k](...args);return next===q?proxy:next;}:o[k];}});return proxy;};
    telechatSharedMediaV152.open('empty_peer');
   });
   assert.match(await p.locator('#shared-media-empty-v152').innerText(),/Загружаем/);
   assert.equal(await p.locator('#shared-media-empty-v152 svg').count(),0);
   await p.evaluate(()=>mediaFinish());
   for(const [tab,kind] of [['image','media'],['file','files'],['link','links'],['video','video'],['audio','music']]){
    await p.locator('[data-sm-tab='+tab+']').click();assert(await p.locator('#shared-media-empty-v152 [data-scene='+kind+']').isVisible());
   }
   await p.locator('[data-sm-close]').click();await p.evaluate(()=>telechatMusicHubV117.open());
   await p.locator('.mh-nav [data-view=likes]').click();assert(await p.locator('.mh-empty [data-scene=music]').isVisible());
   await p.screenshot({path:path.join(root,'outputs','empty-scenes-v218-music.png')});
   await p.locator('.mh-nav [data-view=playlists]').click();assert(await p.locator('.mh-playlist-new [data-scene=playlist]').isVisible());
   await p.evaluate(()=>telechatMusicHubV117.close());
  }
  else await p.evaluate(()=>openChat('bob'));
  await p.evaluate(()=>toggleEmojiPicker());
  await p.locator('#emoji-picker [data-category=recent]').click();assert(await p.locator('#emoji-picker [data-scene=emoji]').isVisible());
  await p.locator('#emoji-picker input').fill('xyz--missing-emoji');assert(await p.locator('#emoji-picker [data-scene=emoji-search]').isVisible());
  await p.evaluate(()=>{window.emojiArt=document.querySelector('#emoji-picker [data-scene=emoji-search]');});
  await p.locator('#emoji-picker input').fill('xyz--still-missing-emoji');assert(await p.locator('#emoji-picker [data-scene=emoji-search]').evaluate(n=>n===emojiArt));
  await p.locator('#emoji-picker .emoji-close-v80').click();
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS v219 full fixture: 2690ms spider timeline (run, weave, hang), no replay on list refresh, added quick jump/contacts/wallet/emoji/playlist/video scenes, loading suppression, reduced motion/off, dark/light, 320/390/1440.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
