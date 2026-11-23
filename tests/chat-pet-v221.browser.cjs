'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {fixtureClient,musicWav}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
for(const file of ['chat-pet-v221.js','chat-pet-v221.css','pixel-eyes-v155.js','whats-new-v181.js']){
 for(const shell of ['index.html','sw.js'])assert(read(shell).includes('./'+file+'?v=221'),file+' in '+shell);
}
function mockVoice(){
 const stats=window.petAudio={contexts:0,starts:0,stops:0,pauses:0,pitches:[]};
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({connect(){},disconnect(){}});
 window.AudioContext=class{
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};stats.contexts++;}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';stats.pauses++;return Promise.resolve();}
  createGain(){return {...node(),gain:param()};}
  createBiquadFilter(){return {...node(),frequency:param(),Q:param()};}
  createOscillator(){
   let timer=0;
   return {...node(),frequency:{...param(),setValueAtTime(v){stats.pitches.push(v);}},start(){stats.starts++;},stop(t){
    clearTimeout(timer);if(t===undefined)stats.stops++;
    timer=setTimeout(()=>this.onended?.(),Math.max(0,(t||0)*1000));
   }};
  }
 };
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,390,1440]){
   const mobile=width<600,context=await browser.newContext({viewport:{width,height:mobile?760:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',reducedMotion:width===320?'reduce':'no-preference'});
   await context.addInitScript(fixtureClient);
   await context.addInitScript(mockVoice);
   await context.addInitScript(()=>{
    localStorage.setItem('exstrachat.interface-motion.v184.alice','full');
    localStorage.setItem('telechat.pixel-eyes.v155.alice',JSON.stringify({style:'cat',aura:true,speech:true}));
   });
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:''});
    if(url.hostname.endsWith('.supabase.co'))return route.fulfill({contentType:'application/json',body:'[]'});
    if(url.hostname!=='app.test')return route.abort();
    if(url.pathname==='/fixture.wav')return route.fulfill({contentType:'audio/wav',body:musicWav()});
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
    return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
   });
   const p=await context.newPage(),errors=[];
   p.on('pageerror',err=>errors.push(err.message));
   await p.goto('https://app.test/');
   await p.waitForFunction(()=>!document.getElementById('startup-loader'));
   await p.locator('#l-login').fill('alice');await p.locator('#l-pass').fill('fixture-only');await p.evaluate(()=>doLogin());
   await p.locator('#whats-new-v181[open] button[data-close]').last().click();
   await p.evaluate(()=>openChat('bob'));
   const stage=p.locator('#pixel-eyes-stage-v155'),dialog=p.locator('#pixel-eyes-dialog-v155'),pet=stage.locator('.nimb-v221'),preview=dialog.locator('.nimb-v221');
   const state=()=>p.evaluate(()=>telechatPixelEyesV155.getState()),audio=()=>p.evaluate(()=>petAudio);
   const action=(text,kind='send')=>p.evaluate(([text,action])=>window.dispatchEvent(new CustomEvent('telechat-chat-action-v155',{detail:{text,action,owner:me.nick,key:conversationKey()}})),[text,kind]);
   const music=playing=>p.evaluate(playing=>window.dispatchEvent(new CustomEvent('telechat-music-state-v97',{detail:{playing}})),playing);
   await stage.waitFor({state:'visible'});assert.equal((await state()).character,'eyes');
   assert.equal((await state()).style,'cat','Existing style is preserved');assert.equal(await pet.count(),0,'No pet is rendered by default');
   const sizes=()=>p.evaluate(()=>['pixel-eyes-stage-v155','messages'].map(id=>{const node=document.getElementById(id);return [node.offsetTop,node.offsetWidth,node.offsetHeight];}));
   const originalSizes=await sizes();
   await stage.locator('.pe-character-v155').click();await dialog.locator('[data-pe-character=pet]').click();
   assert(await preview.isVisible());assert(await dialog.locator('#pe-pet-sound-v221').isChecked());
   assert.equal(await preview.locator('.nimb-current circle').count(),8,'Light and beads are inside the clipped liquid layer');
   assert.equal(await preview.locator('.nimb-refraction').evaluate(el=>getComputedStyle(el).animationName),'none','Shell highlights are separate from the liquid movement');
   assert.equal((await state()).running,false,'Pet does not run the canvas animation loop');
   assert.equal((await audio()).contexts,0,'Selecting the pet does not start audio');
   assert(!(await dialog.locator('.pe-catalog-v155').isVisible()));
   await dialog.locator('#pe-demo-sound-v221').click();assert.equal((await audio()).starts,1);
   assert.equal(await preview.getAttribute('data-feeling'),'wow');
   if(width===1440&&(process.env.EXSTRA_PET_CAPTURE==='1')){
    await dialog.evaluate(el=>el.scrollTop=0);await p.waitForTimeout(330);await dialog.screenshot({path:path.join(root,'outputs','nimb-v221-glass-settings.png')});
    await dialog.locator('.pe-preview-v155').screenshot({path:path.join(root,'outputs','nimb-v221-glass-preview.png')});
   }
   await dialog.locator('#pe-pet-sound-v221').uncheck();assert(await dialog.locator('#pe-demo-sound-v221').isDisabled());
   await dialog.locator('[data-pe-demo=love]').click();assert.equal(await preview.getAttribute('data-feeling'),'love');
   assert.equal((await audio()).starts,1,'Muted previews remain silent');
   await dialog.locator('.pe-close-v155').click();await pet.waitFor({state:'visible'});
   assert.deepEqual(await sizes(),originalSizes,'Changing the character does not shift the stage or message list');
   await p.evaluate(()=>telechatPixelEyesV155.react('idle',1,true));await p.locator('#msg-input').fill('Что думаешь про DeepSeek?');
   assert.equal(await pet.getAttribute('data-feeling'),'angry','Recognizes the reference-style expression without sending the draft');
   assert.equal((await audio()).starts,1,'Drafts are silent');
   await p.locator('#msg-input').fill('');await p.locator('#msg-input').blur();
   await p.evaluate(()=>{
    const row=document.createElement('div');row.className='msg them';
    row._messageSourceV136={id:'pet-fixture-incoming',text:'❤️',from_nick:'bob',ts:Date.now(),chat_key:conversationKey()};
    document.getElementById('messages').append(row);
   });
   assert.equal(await pet.getAttribute('data-feeling'),'love','The pet responds to new incoming messages');
   await action('Люблю тебя ❤️');assert.equal(await pet.getAttribute('data-feeling'),'love');
   await action('Настроения нет');assert.equal(await pet.getAttribute('data-feeling'),'sad');
   await action('😂');assert.equal(await pet.getAttribute('data-feeling'),'laugh');
   await p.evaluate(()=>telechatPixelEyesV155.react('idle',1,true));await music(true);
   await p.waitForFunction(()=>document.querySelector('#pixel-eyes-stage-v155 .nimb-v221')?.dataset.feeling==='dance');
   assert.equal(await pet.locator('.nimb-body').evaluate(el=>getComputedStyle(el).animationName),width===320?'none':'nimb-dance-v221');
   assert.equal(await pet.locator('.nimb-current').evaluate(el=>getComputedStyle(el).animationName),width===320?'none':'nimb-slosh-v221','Liquid moves independently and respects reduced motion');
   await stage.locator('.pe-character-v155').click();await dialog.locator('#pe-pet-sound-v221').check();await dialog.locator('#pe-demo-sound-v221').click();
   assert.equal((await audio()).starts,1,'Preview cannot interrupt music');
   await dialog.locator('.pe-close-v155').click();await action('😀');assert.equal((await audio()).starts,1);
   await music(false);await p.waitForTimeout(670);
   if(width===1440){
    await p.evaluate(()=>{
     const voice=document.createElement('div');voice.className='voice-message';voice.innerHTML='<audio src="/fixture.wav"></audio>';document.querySelector('#messages').append(voice);
     return voice.querySelector('audio').play();
    });
    await action('🧡');assert.equal((await audio()).starts,1,'Voice messages take priority');
    await p.locator('.voice-message audio[src="/fixture.wav"]').evaluate(el=>el.remove());
    await p.evaluate(()=>document.getElementById('voice-call-mini').classList.add('show'));
    await action('🥰');assert.equal((await audio()).starts,1,'Calls take priority');
    await p.evaluate(()=>document.getElementById('voice-call-mini').classList.remove('show'));
   }
   await action('🤣');assert.equal((await audio()).starts,2,'An outgoing reaction has short vocal audio');
   assert.notEqual((await audio()).pitches[0],(await audio()).pitches[1],'The sound depends on mood');
   await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));
   assert(!(await stage.isVisible()));assert((await audio()).stops>=1);
   await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));
   await stage.locator('.pe-character-v155').click();await dialog.locator('[data-pe-character=eyes]').click();
   assert.equal((await state()).style,'cat');assert((await state()).running);assert(!(await preview.isVisible()));
   await dialog.locator('[data-pe-character=pet]').click();await dialog.locator('.pe-close-v155').click();
   await p.evaluate(()=>{me={nick:'other'};telechatPixelEyesV155.refresh();});assert.equal((await state()).character,'eyes');
   await p.evaluate(()=>{me={nick:'alice'};telechatPixelEyesV155.refresh();});assert.equal((await state()).character,'pet');
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('Nimb companion V221: ok (320px, 390px, desktop)');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
