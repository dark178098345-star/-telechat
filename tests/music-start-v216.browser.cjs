'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=','base64');
function wav(){
 const size=8000*2*8,b=Buffer.alloc(44+size);
 b.write('RIFF');b.writeUInt32LE(36+size,4);b.write('WAVEfmt ',8);
 b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);
 b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size,40);return b;
}
async function fixture(browser,width){
 const p=await browser.newPage({viewport:{width,height:860},hasTouch:width<600,isMobile:width<600}),errors=[],requests=[];
 p.on('pageerror',error=>errors.push(error.message));p.on('request',req=>requests.push(req.url()));
 await p.route('https://music-start.test/**',r=>r.fulfill({contentType:'text/html',body:
  '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#13161d;color:#ddd}#chat-screen{display:flex;width:100vw;height:97vh;gap:10px}#sidebar{display:flex;flex-direction:column;width:310px;background:#1c1e25}.chat-main{flex:1}#active-chat{display:flex;flex-direction:column;height:100%}.chat-header{padding:24px}#messages,.fixture-chats{flex:1;min-height:0}.sidebar-footer{min-height:28px}body.telechat-phone-v159 #sidebar{width:100%}body.telechat-phone-v159 #sidebar.hidden,body.telechat-phone-v159 #sidebar:not(.hidden)+.chat-main{display:none}</style>'+
  '<div id="auth-screen"></div><div id="chat-screen" class="active"><div id="sidebar"><div class="sidebar-top"></div><div class="fixture-chats"></div><nav class="sidebar-footer"></nav></div>'+
  '<div class="chat-main"><div id="active-chat"><header class="chat-header">Чат</header><div id="messages"></div><div id="input-area"><textarea id="msg-input"></textarea></div></div></div></div>'+
  '<nav id="settings-home-v160"></nav><button id="record-btn"></button><div id="voice-recording"></div>'}));
 await p.route('https://art.test/**',r=>r.fulfill({contentType:'image/png',body:png}));
 await p.route('https://audio.test/**',r=>r.fulfill({contentType:'audio/wav',body:wav()}));
 await p.goto('https://music-start.test/');
 await p.evaluate(phone=>{
  window.me={nick:'alice'};window.calls=[];
  document.body.classList.toggle('telechat-phone-v159',phone);document.body.dataset.phonePage='chats';
  window.emit=(patch={})=>dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{
   track:{id:'one',owner:me.nick,title:'Горы в ночи — длинное название трека',artist:'spacewalk',cover_url:'https://art.test/cover.png'},
   paused:false,loading:false,time:2,duration:120,canStep:true,...patch
  }}));
  window.telechatMusicV96={toggle:()=>calls.push('toggle'),stop:()=>{calls.push('stop');emit({track:null,paused:true});},
   step:d=>calls.push(d),seek:t=>calls.push(t),retry:()=>calls.push('retry')};
  window.telechatMusicHubV117={open:()=>{calls.push('open');document.body.classList.add('music-hub-open-v117');}};
 },width<600);
 await p.addStyleTag({content:read('music-start-v216.css')});
 await p.addScriptTag({content:read('music-start-v216.js')});
 return {p,errors,requests};
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});
 try{
  for(const width of [320,390,1440]){
   const {p,errors,requests}=await fixture(browser,width),card=p.locator('#music-dock-v230');
   const b=action=>card.locator('[data-dock-music='+action+']');
   assert.equal(await card.count(),0);
   await p.evaluate(()=>emit({loading:true}));
   assert.equal(await card.count(),0,'Preparation does not create the card');
   await p.evaluate(()=>emit());await card.waitFor({state:'visible'});
   assert.equal(await card.locator('[data-dock-elapsed]').textContent(),'0:02');
   assert.equal(await card.locator('[data-dock-remaining]').textContent(),'−1:58');
   assert.equal(await card.locator('small').textContent(),'spacewalk');
   await p.waitForFunction(()=>document.querySelector('#music-dock-v230 img').naturalWidth===1);
   assert.equal(await card.evaluate(n=>n.parentElement.id),'sidebar');
   const box=await card.boundingBox();
   assert(box.x>=0&&box.x+box.width<=width+1&&box.height>=115&&box.height<=185);
   await card.screenshot({path:path.join(root,'outputs/music-dock-v230-'+width+'.png'),animations:'disabled'});
   await p.evaluate(()=>{window.sameCard=document.getElementById('music-dock-v230');emit({time:15});});
   assert.equal(await card.locator('[data-dock-elapsed]').textContent(),'0:15');
   assert.equal(requests.filter(url=>url==='https://art.test/cover.png').length,1);
   await b('compact').click();assert(await card.locator('.md-timeline-v230').isHidden());
   assert(await b('toggle').isVisible());await b('toggle').click();await b('compact').click();
   await b('previous').click();await b('next').click();
   await card.locator('input[type=range]').evaluate(n=>{n.value=24;n.dispatchEvent(new Event('input',{bubbles:true}));});
   assert.equal(await card.locator('[data-dock-elapsed]').textContent(),'0:24');
   assert.deepEqual(await p.evaluate(()=>calls),['toggle',-1,1],'Scrubbing does not repeatedly seek');
   await card.locator('input[type=range]').dispatchEvent('change');
   assert.deepEqual(await p.evaluate(()=>calls),['toggle',-1,1,24]);
   await p.evaluate(()=>emit({paused:true,canStep:false}));assert(await card.isVisible(),'Paused player remains reachable');
   assert.equal(await b('toggle').getAttribute('data-state'),'play');assert(await b('next').isDisabled());
   await b('library').click();await card.waitFor({state:'hidden'});
   await p.evaluate(()=>document.body.classList.remove('music-hub-open-v117'));await card.waitFor({state:'visible'});
   if(width<600){
    await p.evaluate(()=>document.getElementById('sidebar').classList.add('hidden'));
    await p.waitForFunction(()=>sameCard.parentElement.id==='active-chat');
    assert(await card.isVisible());assert(await card.evaluate(n=>n.nextElementSibling?.id==='messages'));
    await p.evaluate(()=>document.body.classList.add('telechat-mobile-keyboard-v100'));
    await card.waitFor({state:'hidden'});
    await p.evaluate(()=>document.body.classList.remove('telechat-mobile-keyboard-v100'));
    await card.waitFor({state:'visible'});assert(await p.evaluate(()=>sameCard===document.getElementById('music-dock-v230')));
   }
   await p.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await card.locator('.md-wave-v230 i').first().evaluate(n=>getComputedStyle(n).animationName),'none');
   await p.evaluate(()=>emit({track:{id:'bad-cover',owner:me.nick,title:'<img onerror="window.bad=1">',cover_url:'javascript:alert(1)'},duration:0}));
   assert.match(await card.locator('strong').textContent(),/<img onerror/);
   assert.equal(await card.locator('strong img').count(),0);assert.equal(await card.locator('img').getAttribute('src'),null);
   assert(await card.locator('input').isDisabled());
   await p.evaluate(()=>emit({paused:true,error:{message:'test'}}));await b('toggle').click();
   assert.equal(await p.evaluate(()=>calls.at(-1)),'retry');
   await b('stop').click();await card.waitFor({state:'hidden'});
   await p.evaluate(()=>{emit();me={nick:'bob'};dispatchEvent(new Event('telechat-account-ready-v175'));emit({track:{id:'old',owner:'alice',title:'Прежний аккаунт'}});});
   assert(await card.isHidden());assert.equal(await card.locator('strong').textContent(),'');
   assert.equal(await p.locator('.music-sidebar-player,.music-chat-player,#music-start-v216').count(),0);
   assert.deepEqual(errors,[]);await p.close();
  }
  const real=await fixture(browser,390);
  await real.p.addScriptTag({content:read('music-library-v96.js')});
  await real.p.evaluate(async bytes=>{
   const a=await telechatMusicV96.importFilesReport([new File([new Uint8Array(bytes)],'Свой трек.wav',{type:'audio/wav'})]);
   await telechatMusicV96.playTrack(a.added[0]);
  },[...wav()]);
  await real.p.waitForFunction(()=>telechatMusicV96.getState().time>0&&!telechatMusicV96.getState().paused);
  const live=real.p.locator('#music-dock-v230');
  assert.equal(await live.locator('small').textContent(),'Свой трек.wav');
  await live.locator('[data-dock-music=toggle]').click();
  assert(await real.p.evaluate(()=>telechatMusicV96.getState().paused));
  assert(await live.isVisible());await live.locator('[data-dock-music=stop]').click();
  assert.equal(await real.p.evaluate(()=>telechatMusicV96.getState().track),null);
  assert.deepEqual(real.errors,[]);await real.p.close();
    const restart = await fixture(browser, 1440);
    await restart.p.evaluate(() => {
      window.restartCalls = 0;
      window.installs = 0;
      window.pendingMedia = null;
      window.telechatDeliveryV72 = { diagnostics: async () => ({ queued: 0, durable: true }) };
      window.telechatDesktop = {
        isDesktop: true,
        restartApp: async () => {
          restartCalls++;
          return { ok: true };
        },
        installUpdate: () => installs++,
      };
    });
    await restart.p.addScriptTag({ content: read('app-restart-v216.js') });
    await restart.p.locator('#msg-input').fill('Draft');
    await restart.p.locator('#app-restart-open-v216').click();
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.locator('#app-restart-confirm-v216').click();
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.locator('#app-restart-cancel-v216').click();
    await restart.p.locator('#app-restart-v216').waitFor({state:'hidden'});
    await restart.p.locator('#msg-input').fill('');
    await restart.p.evaluate(() => (telechatDeliveryV72.diagnostics = async () => ({ queued: 1 })));
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() =>
      document.getElementById('app-restart-status-v216').textContent.includes('неотправленные'),
    );
    assert.equal(await restart.p.evaluate(() => restartCalls), 0);
    await restart.p.keyboard.press('Escape');
    await restart.p.evaluate(() => {
      window.resolveQueue = null;
      telechatDeliveryV72.diagnostics = () => new Promise((r) => (resolveQueue = r));
    });
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() => !!resolveQueue);
    await restart.p.keyboard.press('Escape');
    await restart.p.evaluate(() => resolveQueue({ queued: 0 }));
    assert.equal(
      await restart.p.evaluate(() => restartCalls),
      0,
      'Cancelled queue check cannot restart later',
    );
    await restart.p.evaluate(() => (telechatDeliveryV72.diagnostics = async () => ({ queued: 0 })));
    await restart.p.locator('#app-restart-open-v216').click();
    await restart.p.locator('#app-restart-confirm-v216').click();
    await restart.p.waitForFunction(() => restartCalls === 1);
    assert.equal(await restart.p.evaluate(() => installs), 0, 'No installer API used');
    assert.deepEqual(restart.errors, []);
    await restart.p.close();
    console.log(
      'PASS V230 music dock and V216 restart: real audio, safe controls, no duplicate player, 320/390/1440, keyboard fit, and explicit restart without an installer.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
