const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body><video id="call-video"></video><video id="music-video"></video><video class="avatar-video"></video></body>'}));await page.goto('https://cleanup.test/');
 await page.evaluate(()=>{
  window.calls=[];window.originals={};
  for(const name of ['updateOnline','updateStatusBar','renderContacts','enhanceVerifiedBadges'])window[name]=originals[name]=(...args)=>calls.push({name,scope:args[0]?.id});
  window.mediaCalls=[];for(const video of document.querySelectorAll('video')){video.pause=()=>mediaCalls.push('pause:'+video.id);video.play=()=>{mediaCalls.push('play:'+video.id);return Promise.resolve();};}
  localStorage.removeItem('telechat_calm_mode_v95');
 });
 await page.addScriptTag({path:path.join(root,'performance-v107.js')});
 assert(await page.evaluate(()=>Object.entries(originals).every(([name,fn])=>window[name]===fn)),'Legacy calm module must not wrap the authoritative feature owners');
 await page.evaluate(()=>{const a=document.createElement('section'),b=document.createElement('section');a.id='a';b.id='b';document.body.append(a,b);enhanceVerifiedBadges(a);enhanceVerifiedBadges(b);renderContacts('first');renderContacts('later-patch');});
 assert.deepEqual(await page.evaluate(()=>calls.filter(c=>c.name==='enhanceVerifiedBadges').map(c=>c.scope)),['a','b'],'No generic first-call-only wrapper can discard a different surface');
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='renderContacts').length),2,'Local sidebar patches reach the sidebar owner');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('telechat-calm-v107')),false);
 await page.evaluate(()=>{localStorage.setItem('telechat_calm_mode_v95','true');const input=document.createElement('input');input.id='calm-mode-v95';document.body.append(input);input.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(40);
 assert(await page.evaluate(()=>document.body.classList.contains('telechat-calm-v107')),'Saved calm preference remains supported');
 const source=fs.readFileSync(path.join(root,'app-performance-v17.js'),'utf8');
 await page.addScriptTag({content:source.slice(source.indexOf('  function syncVisibilityV15()'),source.lastIndexOf('})();'))});
 await page.evaluate(()=>{calls.length=0;for(const hidden of [true,false,true,false]){Object.defineProperty(document,'hidden',{configurable:true,value:hidden});document.dispatchEvent(new Event('visibilitychange'));if(document.body.classList.contains('telechat-app-paused')!==hidden)throw Error('Pause class mismatch');}});
 assert.deepEqual(await page.evaluate(()=>mediaCalls),[],'Old generic visibility handler must not pause/resume call, music or avatar video');
 assert.deepEqual(await page.evaluate(()=>calls),[],'Old visibility handler must not duplicate presence wake requests');
 assert.deepEqual(errors,[]);console.log('PASS v188 cleanup: feature owner identity, local patch delivery, distinct badge scopes, calm preference, cosmetic visibility without media/presence interference');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
