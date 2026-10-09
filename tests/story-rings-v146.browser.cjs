const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:600}});
 await page.setContent('<style>*{box-sizing:border-box}body{margin:0;background:#121320;color:#ddd;font:13px Arial;--bg2:#171827;--bg3:#25263a;--text2:#c9c4db;--text3:#999;--accent:#a78bfa}#sidebar{width:300px}</style><aside id="sidebar"></aside>');
 await page.addStyleTag({path:path.join(root,'stories-v115.css')});
 await page.evaluate(()=>{
  window.me={nick:'me'};window.userCache={};window.showToast=()=>{};window.avatarMarkup=u=>u.nick.slice(0,1).toUpperCase();
  const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WQAAAABJRU5ErkJggg==';
  window.stories=[['o','me'],['a1','alice'],['a2','alice'],['a3','alice'],['b','bob']].map(([id,author_nick])=>({id,author_nick,created_at:Date.now(),expires_at:Date.now()+3600000,media_type:'image',media_url:img}));window.views=[{story_id:'a1',viewer_nick:'me'},{story_id:'b',viewer_nick:'me'}];
  window.storyQueries=0;window.userQueries=0;window.sb={from(table){if(table==='stories')storyQueries++;if(table==='users')userQueries++;let filters=[],write=null;const q={select(){return q},gt(){return q},order(){return q},limit(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},upsert(v){write=v;return q},then(resolve){if(write)views.push(write);let data=table==='stories'?stories:table==='story_views'?views:table==='users'?[{nick:'me',name:'Я'},{nick:'alice',name:'Алиса'},{nick:'bob',name:'Боб'}]:[];return Promise.resolve({data:data.filter(r=>filters.every(f=>f(r))),error:null}).then(resolve)}};return q;}};
 });
 await page.addScriptTag({path:path.join(root,'stories-v115.js')});await page.evaluate(()=>telechatStoriesV115.refresh());
 const chips=page.locator('.story-chip-v115');assert.equal(await chips.count(),3);
 await page.evaluate(()=>{window.savedChips=[...document.querySelectorAll('.story-chip-v115')];window.savedAvatars=savedChips.map(n=>n.querySelector('.story-chip-avatar-v115').firstChild);window.savedRings=savedChips.map(n=>n.querySelector('svg'));});
 await page.evaluate(()=>Promise.all(Array.from({length:12},()=>telechatStoriesV115.refresh())));
 assert.equal(await page.evaluate(()=>storyQueries),3,'12 concurrent refreshes use one active query and one follow-up');
 await page.evaluate(()=>{window.userQueries=0;window.cacheCalls=0;window.telechatUserCacheV123={many:async nicks=>{cacheCalls++;return nicks.map(nick=>({nick,name:nick}));}};});
 await page.evaluate(()=>telechatStoriesV115.refresh());assert.equal(await page.evaluate(()=>userQueries),0,'Use shared user cache, not full profile queries');
 assert(await page.evaluate(()=>savedChips.every((n,i)=>n===document.querySelectorAll('.story-chip-v115')[i]&&savedAvatars[i]===n.querySelector('.story-chip-avatar-v115').firstChild&&savedRings[i]===n.querySelector('svg'))),'Refresh keeps existing cards, avatars and rings');
 assert.equal(await chips.nth(0).locator('circle').count(),1);assert.equal(await page.locator('.story-chip-plus-v115').count(),0);
 assert.equal(await chips.nth(1).locator('circle').count(),3);assert.equal(await chips.nth(1).locator('.viewed-v146').count(),1);
 assert(!(await chips.nth(1).getAttribute('class')).includes('seen-v115'),'Seeing newest story must not gray out other unseen stories');
 assert((await chips.nth(2).getAttribute('class')).includes('seen-v115'));
 await chips.nth(1).click();await page.locator('#story-next-v115').click();
 assert.equal(await chips.nth(1).locator('.viewed-v146').count(),2);
 await page.locator('#story-next-v115').click();assert.equal(await chips.nth(1).locator('.viewed-v146').count(),3);
 await page.locator('#story-viewer-close-v115').click();
 assert.equal(await page.locator('#story-stage-v115 img,#story-stage-v115 video,#story-stage-v115 .story-backdrop-v116').count(),0,'Closed viewer releases media');
 await page.evaluate(()=>{stories=stories.filter(s=>s.author_nick!=='me');return telechatStoriesV115.refresh();});
 assert.equal(await chips.nth(0).locator('circle').count(),0);assert.equal(await chips.nth(0).locator('.story-chip-avatar-v115').textContent(),'＋');
 await chips.nth(0).click();assert(await page.locator('#story-compose-v115').evaluate(e=>e.classList.contains('open-v115')));await page.locator('#story-compose-close-v115').click();
 await page.evaluate(()=>{const source=stories[0];stories.push({...source,id:'new',author_nick:'me'});return telechatStoriesV115.refresh();});assert.equal(await chips.nth(0).locator('circle').count(),1);
 for(const width of [320,390,1200]){await page.setViewportSize({width,height:600});assert(await page.locator('#stories-list-v115').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));await page.screenshot({path:path.join(root,`outputs/story-rings-v146-${width}.png`)});}
 for(const [width,height] of [[320,420],[740,360],[1280,720]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>telechatStoriesV115.openViewer('alice'));
  const card=page.locator('#story-viewer-v115 .story-card-v115');
  await page.waitForTimeout(250);
  const bounds=await card.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,scroll:e.scrollWidth,client:e.clientWidth};});
  assert(bounds.left>=0&&bounds.right<=width+1&&bounds.top>=0&&bounds.bottom<=height+1&&bounds.scroll<=bounds.client+1,'Viewer fits '+width+'x'+height+' '+JSON.stringify(bounds));
  await page.locator('#story-like-v116').scrollIntoViewIfNeeded();assert(await page.locator('#story-like-v116').isVisible());
  await page.locator('#story-viewer-close-v115').click();
 }
 console.log('PASS story rings: counts, mixed/all viewed, live viewing updates, own story plus, compose, responsive bounds');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
