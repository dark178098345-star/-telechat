const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
function wav(){
 const size=8000*2*20,b=Buffer.alloc(44+size);
 b.write('RIFF');b.writeUInt32LE(36+size,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size,40);return b;
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addInitScript(()=>{
  window.me={nick:'music-tester',status:'Привет'};window.showToast=text=>window.lastToast=text;window.savedProfileStatus='Привет';
  window.sb={from:()=>{let change=null;const q={select(){return q},update(data){change=data;return q},eq(){return q},async maybeSingle(){if(change)savedProfileStatus=change.status;return {data:{nick:me.nick,status:savedProfileStatus},error:null};}};return q;}};
  const Original=window.Audio;window.Audio=class extends Original{constructor(...args){super(...args);if(!window.testMusicAudio)window.testMusicAudio=this;}};
 });
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>tag.includes('music-library-v96.js')||tag.includes('profile-music-v97.js')||tag.includes('appearance-mode-v95.js')?tag:'');
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='audio.test')return route.fulfill({contentType:url.pathname==='/bad'?'text/html':'audio/wav',body:url.pathname==='/bad'?'<html>Not audio</html>':wav()});
  if(url.hostname!=='telechat.test')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
  const file=path.join(root,path.basename(url.pathname));
  if(!fs.existsSync(file))return route.abort();
  return route.fulfill({contentType:file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('dialog',d=>d.accept());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function showApp(){await page.evaluate(()=>{document.querySelector('#startup-loader')?.remove();document.querySelector('#auth-screen').classList.remove('active');document.querySelector('#chat-screen').classList.add('active');document.body.classList.add('telechat-glass-v36');});}
 async function open(){await page.locator('.music-entry-v96').click();await page.waitForFunction(()=>document.querySelector('#music-status-v96').textContent==='');}
 async function openLinkDetails(){if(!(await page.locator('.music-add-details-v98').evaluate(el=>el.open)))await page.locator('.music-add-details-v98>summary').click();if(!(await page.locator('.music-link-details-v96').evaluate(el=>el.open)))await page.locator('.music-link-details-v96>summary').click();}
 async function upload(name='Ночной город.wav'){await page.locator('#music-files-v96').setInputFiles({name,mimeType:'audio/wav',buffer:wav()});await page.waitForFunction(()=>!document.querySelector('.music-upload-v96').disabled);}
 await page.goto('https://telechat.test/');await showApp();await open();
 assert.equal(await page.locator('.music-track-v96').count(),0);
 await upload();assert.equal(await page.locator('.music-track-v96').count(),1);
 assert.match(await page.locator('#music-status-v96').textContent(),/Сохранено/);
 await page.locator('.music-track-play').click();await page.waitForFunction(()=>!testMusicAudio.paused&&testMusicAudio.currentTime>0);
 const src=await page.evaluate(()=>testMusicAudio.src);assert(src.startsWith('blob:'));
 const button=await page.locator('.music-track-play svg').elementHandle();await page.waitForTimeout(350);assert(await button.evaluate(el=>el.isConnected));
 await page.locator('.music-close-v96').click();assert(!(await page.evaluate(()=>testMusicAudio.paused)));
 await page.locator('.music-sidebar-player [data-music="toggle"]').click();assert(await page.evaluate(()=>testMusicAudio.paused));
 await page.reload();await showApp();await open();assert.equal(await page.locator('.music-track-v96').count(),1);
 await page.locator('.music-track-play').click();await page.waitForFunction(()=>!testMusicAudio.paused);
 await page.evaluate(()=>document.body.classList.add('voice-call-full-v32'));await page.waitForFunction(()=>testMusicAudio.paused);await page.evaluate(()=>document.body.classList.remove('voice-call-full-v32'));
 await openLinkDetails();
 await page.locator('#music-url-v96').fill('https://audio.test/song.wav');await page.locator('#music-title-v96').fill('Трек по ссылке');await page.locator('#music-link-form-v96 button').click();
  await page.waitForFunction(()=>document.querySelectorAll('.music-track-v96').length===2);
 await page.locator('.music-track-v96').filter({hasText:'Трек по ссылке'}).locator('.music-track-more-v97').click();
 await page.locator('.music-track-v96').filter({hasText:'Трек по ссылке'}).locator('.music-track-profile-v97').click();
 await page.waitForFunction(()=>window.telechatProfileMusicV97.getOwn()?.url==='https://audio.test/song.wav');
 assert.equal(await page.evaluate(()=>JSON.parse(savedProfileStatus.split('__telechat_profile_v1__:')[1]).status),'Привет');
 await page.locator('.music-track-v96').filter({hasText:'Трек по ссылке'}).locator('.music-track-play').click();await page.waitForFunction(()=>testMusicAudio.src==='https://audio.test/song.wav'&&!testMusicAudio.paused);
 await page.locator('#music-url-v96').fill('http://audio.test/song.wav');await page.locator('#music-link-form-v96 button').click();await page.waitForFunction(()=>!document.querySelector('#music-link-form-v96 button').disabled);assert.match(await page.locator('#music-status-v96').textContent(),/HTTPS/);
 await page.locator('#music-url-v96').fill('https://youtube.com/watch?v=test');await page.locator('#music-link-form-v96 button').click();await page.waitForFunction(()=>!document.querySelector('#music-link-form-v96 button').disabled);
 assert.match(await page.locator('#music-status-v96').textContent(),/страница музыкального сервиса/);
 await page.locator('#music-url-v96').fill('https://audio.test/bad');await page.locator('#music-link-form-v96 button').click();await page.waitForFunction(()=>!document.querySelector('#music-link-form-v96 button').disabled);
 assert.match(await page.locator('#music-status-v96').textContent(),/Не удалось прочитать/);assert.equal(await page.locator('.music-track-v96').count(),2);
 await page.locator('#music-url-v96').fill('https://audio.test/song.wav');await page.locator('#music-link-form-v96 button').click();await page.waitForFunction(()=>!document.querySelector('#music-link-form-v96 button').disabled);assert.match(await page.locator('#music-status-v96').textContent(),/уже есть/);
 await upload('<img src=x onerror=alert(1)>.wav');assert.equal(await page.locator('.music-track-v96 img').count(),0);
 await page.locator('#music-search-v96').fill('город');assert.equal(await page.locator('.music-track-v96').count(),1);await page.locator('#music-search-v96').fill('');
 await page.locator('.music-track-v96 strong').first().evaluate(el=>el.textContent='Тихий вечер');
 await page.waitForTimeout(230);
 assert.equal(await page.locator('#music-dialog-v96').evaluate(el=>el.matches(':modal')),false);
 assert((await page.locator('#music-dialog-v96').boundingBox()).width<=350);
 await page.screenshot({path:path.join(root,'outputs/music-v97-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(60);await page.screenshot({path:path.join(root,'outputs/music-v97-mobile.png')});
 assert(await page.locator('#music-dialog-v96').evaluate(el=>el.scrollWidth<=el.clientWidth));
 await page.locator('.music-track-play').first().click();await page.waitForFunction(()=>!testMusicAudio.paused);
 await page.locator('.music-close-v96').click();
 await page.evaluate(()=>{document.body.classList.add('telechat-mobile-v79');document.querySelector('.sidebar').classList.add('hidden');document.querySelector('.chat-main').classList.add('visible');document.querySelector('#empty-state').style.display='none';document.querySelector('#active-chat').style.display='flex';});
 const box=await page.locator('#input-area').boundingBox();assert(box&&box.y+box.height<=845,JSON.stringify(box));
 await page.evaluate(()=>{document.querySelector('.sidebar').classList.remove('hidden');document.querySelector('.chat-main').classList.remove('visible');});
 await open();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#music-dialog-v96').evaluate(el=>el.open),false);
 await open();
 await page.locator('.music-track-more-v97').first().click();
 await page.locator('.music-track-remove').first().click();await page.waitForFunction(()=>document.querySelectorAll('.music-track-v96').length===2);assert(await page.evaluate(()=>testMusicAudio.paused));
 await page.locator('.music-close-v96').click();await page.evaluate(()=>me.nick='other-account');await open();assert.equal(await page.locator('.music-track-v96').count(),0);
 // A failed transaction must not report success or display a saved track.
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});
 await upload('Не сохраняется.wav');assert.equal(await page.locator('.music-track-v96').count(),0);assert(await page.locator('#music-status-v96').evaluate(el=>el.classList.contains('is-error')));
 assert.deepEqual(errors,[]);
 console.log('PASS: upload, persistent audio playback, pause across calls, links and duplicates, invalid media, search, escaped names, deletion, account separation, transaction failure, mobile composer.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
