const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,680,1024,1440,1920]){
  const {p,errors}=await fixture(browser,width,Math.min(1080,width<600?844:1000),width<600);
  await p.route('https://covers.test/**',r=>{const i=Number(new URL(r.request().url()).pathname.slice(1))||0;const colors=[['#c592c4','#6e284d'],['#669aa7','#1e343e'],['#be865f','#4c2924'],['#7885b0','#2a2845']][i%4];r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="500" height="500" fill="url(#g)"/><circle cx="${150+i*17}" cy="210" r="140" fill="none" stroke="#ffffff35" stroke-width="1"/><path d="M-50 410 Q 220 -120 560 160 M-50 430 Q 220 -100 560 180" fill="none" stroke="#ffffff50" stroke-width="2"/><text x="35" y="425" fill="white" font-family="sans-serif" font-size="44" font-weight="600">SOUND / ${String(i+1).padStart(2,'0')}</text></svg>`});});
  await p.evaluate(()=>{
   me.name='Кирилл';me.pass='fixture';window.playback={track:null,paused:true,time:0,duration:0,repeat:false,shuffle:false};window.playQueue=[];window.playCalls=0;window.catalogQueries=0;
   const notify=()=>window.dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{...playback}}));
   Object.assign(telechatMusicV96,{getState:()=>({...playback}),playTrack:async(t,queue)=>{playCalls++;playQueue=queue;playback={...playback,track:t,paused:false,duration:t.duration};notify();},toggle:async()=>{playback.paused=!playback.paused;notify();},seek:time=>{playback.time=time;notify();},setVolume:()=>{},step:()=>{},setRepeat:()=>{},setShuffle:()=>{}});
   fixtureTracks=Array.from({length:18},(_,i)=>({...fixtureTracks[i%5],id:'visual-'+i,title:['Ночной город','Твоя волна','После дождя','Тёплый вечер','Возвращайся'][i%5],cover_url:'https://covers.test/'+i}));
   const from=sb.from;sb.from=function(table){if(table==='music_catalog_v117')catalogQueries++;return from.call(this,table);};
  });
  await p.evaluate(()=>telechatMusicHubV117.open());await p.waitForSelector('.mh-shelf-v171 .mh-release');
  assert.equal(await p.locator('.mh-wave-v171').count(),1);assert.equal(await p.locator('.mh-vinyl').count(),0);
  assert(await p.locator('#music-hub-v117').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'No viewport overflow '+width);
  assert(await p.locator('.mh-top').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Header fits '+width);
  assert(!(await p.locator('.mh-listening').isVisible()),'Queue does not occupy main page');
  assert.notEqual(await p.evaluate(()=>document.activeElement.id),'mh-search','Opening does not force keyboard/search focus');
  const queries=await p.evaluate(()=>catalogQueries);await p.locator('[data-action=play-wave]').click();assert.equal(await p.evaluate(()=>playCalls),1);assert.equal(await p.evaluate(()=>new Set(playQueue.map(t=>t.id)).size),18);assert.equal(await p.locator('[data-action=play-wave]').getAttribute('data-mode'),'pause');
  await p.locator('[data-action=play-wave]').click();assert(await p.evaluate(()=>playback.paused));assert.equal(await p.evaluate(()=>playCalls),1,'Pause reuses player and queue');await p.locator('[data-action=play-wave]').click();assert(!(await p.evaluate(()=>playback.paused)));
  assert.equal(await p.evaluate(()=>catalogQueries),queries,'No extra recommendation requests');
  if(!(await p.evaluate(()=>telechatPhoneV159.getState().phone))){await p.locator('.mh-now-toggle').click();assert(await p.locator('.mh-listening').isVisible());assert.equal(await p.locator('.mh-now-toggle').getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');assert(!(await p.locator('.mh-listening').isVisible()));assert.equal(await p.locator('.mh-now-toggle').getAttribute('aria-expanded'),'false');}
  else{await p.locator('.phone-now-open-v159').click();assert(await p.locator('.mh-listening').isVisible());await p.locator('.phone-now-close-v159').click();assert(!(await p.locator('.mh-listening').isVisible()));}
  if(width>=1024){const shelf=p.locator('[data-shelf-v171=wave]');await p.locator('[data-action=shelf-next][data-shelf=wave]').click();await p.waitForFunction(()=>document.querySelector('[data-shelf-v171=wave]').scrollLeft>50);assert(await shelf.evaluate(n=>n.scrollWidth>n.clientWidth));await shelf.evaluate(n=>n.scrollTo({left:0,behavior:'instant'}));}
  await p.screenshot({path:path.join(root,`outputs/music-layout-v171-${width}.png`)});
  await p.evaluate(()=>document.body.classList.add('theme-light'));assert.equal(await p.locator('#music-hub-v117').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');assert(await p.locator('.mh-top').evaluate(n=>n.scrollWidth<=n.clientWidth+1));if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/music-layout-v171-light-${width}.png`)});
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS v171: cover-first desktop/phone 320–1920, queue/focus, wave/pause/deduplication, no extra catalog requests, shelves and white theme');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
