const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const live=process.env.LIVE_SC==='1';
function wav(){const b=Buffer.alloc(44+320000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(320000,40);return b;}
const link='https://soundcloud.com/user-816060183-440738046/tysyachi-etazhei';
const mock=`(() => {
 const events=Object.fromEntries(['READY','ERROR','PLAY','PAUSE','PLAY_PROGRESS','SEEK','FINISH'].map(k=>[k,k]));
 window.widgets=[];
 function Widget(frame){
  const callbacks={};const source=new URL(frame.src).searchParams.get('url');
  const widget={frame,source,paused:true,plays:0,bind(name,fn){callbacks[name]=fn},unbind(name){delete callbacks[name]},
   emit(name,data){callbacks[name]?.(data)},
   getCurrentSound(fn){setTimeout(()=>fn({title:'Тысячи этажей',duration:180000}),5)},
   play(){this.paused=false;this.plays++;this.emit('PLAY')},pause(){this.paused=true;this.emit('PAUSE')},seekTo(ms){this.emit('SEEK',{currentPosition:ms})}};
  widgets.push(widget);
  setTimeout(()=>widget.emit(source.includes('unavailable')?'ERROR':'READY'),source.includes('slow')?700:20);
  return widget;
 }
 Widget.Events=events;window.SC={Widget};
})();`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
   window.me={nick:'tester',status:'Привет'};window.showToast=text=>window.lastToast=text;window.savedProfileStatus='Привет';
   window.sb={from:()=>{let change=null;const q={select(){return q},eq(){return q},update(data){change=data;return q},async maybeSingle(){if(change)savedProfileStatus=change.status;return {data:{nick:me.nick,status:savedProfileStatus},error:null};}};return q;}};
  });
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>/music-library-v96.js|profile-music-v97.js|appearance-mode-v95.js|soundcloud-v98.js/.test(tag)?tag:'');
  let remoteRequests=0;
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='telechat.test'){
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    const file=path.join(root,decodeURIComponent(url.pathname));
    if(!fs.existsSync(file))return route.abort();
    return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'application/javascript',body:fs.readFileSync(file)});
   }
   if(url.hostname.endsWith('soundcloud.com'))remoteRequests++;
   if(live)return route.continue();
   if(url.hostname==='audio.test')return route.fulfill({contentType:'audio/wav',body:wav()});
   if(url.pathname==='/player/api.js')return route.fulfill({contentType:'application/javascript',body:mock});
   if(url.hostname==='w.soundcloud.com')return route.fulfill({contentType:'text/html',body:'<body style="background:#121212;color:white;font:14px sans-serif">SoundCloud widget test fixture</body>'});
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://telechat.test/');
  await page.evaluate(()=>{document.querySelector('#startup-loader')?.remove();document.querySelector('#auth-screen').classList.remove('active');document.querySelector('#chat-screen').classList.add('active');document.body.classList.add('telechat-glass-v36');});
  await page.locator('.music-entry-v96').click();await page.waitForFunction(()=>document.querySelector('#music-status-v96').textContent==='');
  assert.equal(remoteRequests,0,'Opening library must not contact SoundCloud');
  assert.equal(await page.locator('.music-soundcloud-support-v98 img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
  await page.locator('.music-link-details-v96 summary').click();
  async function add(url){await page.locator('#music-url-v96').fill(url);await page.locator('#music-link-form-v96 button').click();await page.waitForFunction(()=>!document.querySelector('#music-link-form-v96 button').disabled,{},{timeout:40000});}
  await add(link+'?si=tracking&utm_source=clipboard');
  assert.equal(await page.locator('.music-track-v96').count(),1,await page.locator('#music-status-v96').textContent());
  assert.equal(await page.locator('.music-track-copy .music-soundcloud-source-v98').getAttribute('href'),link);
  assert.equal(await page.locator('#music-soundcloud-probe-v98 iframe').count(),0);
  if(live){
   console.log('LIVE PASS: SoundCloud accepted supplied track:',await page.locator('.music-track-copy strong').textContent());
   await page.locator('.music-link-details-v96 summary').click();await page.locator('.music-track-play').click();
   await page.waitForFunction(()=>document.querySelector('.music-track-play').dataset.state==='pause',{},{timeout:35000});
   await page.waitForTimeout(600);
   await page.screenshot({path:path.join(root,'outputs/soundcloud-v98-live.png')});
   console.log('LIVE PASS: official widget emitted PLAY for supplied track.');return;
  }
  assert.equal(await page.evaluate(()=>widgets.reduce((sum,w)=>sum+w.plays,0)),0,'Adding must not autoplay');
  await add(link+'?utm_source=other');assert.match(await page.locator('#music-status-v96').textContent(),/уже есть/);
  await add('https://soundcloud.com/artist/unavailable');assert.match(await page.locator('#music-status-v96').textContent(),/SoundCloud не разрешил/);
  assert.equal(await page.locator('.music-track-v96').count(),1);
  await add('https://soundcloud.com/artist/sets/album');assert.match(await page.locator('#music-status-v96').textContent(),/отдельный трек/);
  await page.locator('.music-link-details-v96 summary').click();
  await page.locator('.music-track-play').click();await page.waitForFunction(()=>widgets.at(-1).plays===1);
  await page.waitForFunction(()=>document.querySelector('.music-track-play').dataset.state==='pause');
  await page.locator('.music-track-more-v97').click();await page.locator('.music-track-profile-v97').click();
  await page.waitForFunction(()=>telechatProfileMusicV97.getOwn()?.url?.includes('soundcloud.com'));
  await page.evaluate(()=>{
   const anchor=document.createElement('p');anchor.id='profile-test-anchor';document.body.append(anchor);
   telechatProfileMusicV97.renderAfter(anchor,me);
  });
  assert.equal(await page.locator('.profile-music-v97 img[alt=SoundCloud]').count(),1);
  await page.locator('.music-close-v96').click();assert.equal(await page.evaluate(()=>widgets.at(-1).paused),false);
  await page.locator('.music-sidebar-player [data-music=toggle]').click();await page.waitForFunction(()=>widgets.at(-1).paused);
  await page.locator('.music-sidebar-player [data-music=toggle]').click();await page.waitForFunction(()=>!widgets.at(-1).paused);
  await page.evaluate(()=>document.body.classList.add('voice-call-full-v32'));await page.waitForFunction(()=>widgets.at(-1).paused);
  await page.evaluate(()=>widgets.at(-1).play());assert.equal(await page.evaluate(()=>widgets.at(-1).paused),true,'Widget play blocked during call');
  await page.evaluate(()=>document.body.classList.remove('voice-call-full-v32'));
  await page.evaluate(()=>telechatMusicV96.playLink({url:'https://audio.test/song.wav',title:'Local audio'},'tester'));
  await page.waitForFunction(()=>document.querySelector('.music-sidebar-player [data-music=toggle]').dataset.state==='pause');
  assert.equal(await page.locator('#music-soundcloud-widget-v98 iframe').count(),0,'Switching to audio must remove SoundCloud');
  await page.evaluate(url=>telechatMusicV96.playLink({url,title:'Back to SoundCloud'},'tester'),link);
  await page.waitForFunction(()=>document.querySelector('.music-sidebar-player [data-music=toggle]').dataset.state==='pause');
  await page.evaluate(()=>{const voice=document.createElement('audio');document.body.append(voice);voice.dispatchEvent(new Event('play'));});
  assert.equal(await page.evaluate(()=>widgets.at(-1).paused),true,'Voice messages pause SoundCloud');
  await page.locator('.music-sidebar-player [data-music=toggle]').click();
  await page.locator('.music-sidebar-player .music-seek').evaluate(el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('.music-sidebar-player .music-time').textContent.startsWith('0:30'));
  await page.locator('.music-entry-v96').click();
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(root,'outputs/soundcloud-v98-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  const rect=await page.locator('#music-dialog-v96').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390&&rect.y+rect.height<=844);
  await page.screenshot({path:path.join(root,'outputs/soundcloud-v98-mobile.png')});
  await page.evaluate(()=>{document.querySelector('.music-sidebar-player [data-music=stop]').click();});
  assert.equal(await page.locator('#music-soundcloud-widget-v98 iframe').count(),0);
  await page.evaluate(()=>{telechatMusicV96.playLink({url:'https://soundcloud.com/artist/slow',title:'Slow'},'tester');});
  await page.waitForTimeout(60);await page.evaluate(()=>document.body.classList.add('voice-call-full-v32'));
  await page.waitForTimeout(850);assert.equal(await page.evaluate(()=>widgets.at(-1).plays),0,'Call while loading must prevent delayed autoplay');
  await page.evaluate(()=>document.body.classList.remove('voice-call-full-v32'));
  assert.deepEqual(errors,[]);
  console.log('PASS: branding, lazy SDK, canonical links, metadata, duplicates, errors, profile, playback, seek, call interruption, responsive layout, delayed autoplay guard.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
