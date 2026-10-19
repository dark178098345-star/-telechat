const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
const coreSource=()=>baseline?execFileSync('git',['show','902a830:music-library-v96.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'music-library-v96.js'),'utf8');
const wav=()=>{const b=Buffer.alloc(44+320000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 async function page(blockStorage=false){
  const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));let broken=false;
  await p.route('https://music.test/**',r=>r.fulfill({contentType:'text/html',body:'<div class="sidebar-top"></div><div class="sidebar-footer"></div><div class="chat-main"></div><button id="play">Play</button>'}));
  await p.route('https://audio.test/**',r=>r.fulfill({status:broken?404:200,contentType:broken?'text/html':'audio/wav',body:broken?'missing':wav()}));
  await p.goto('https://music.test');
  await p.evaluate(block=>{
   window.me={nick:'fixture'};window.notices=[];window.showToast=t=>notices.push(t);
   if(block)Object.defineProperty(window,'indexedDB',{value:{open(){throw new DOMException('Storage disabled','SecurityError')}}});
   const Original=Audio;window.Audio=class extends Original{constructor(...args){super(...args);if(!window.musicAudio)window.musicAudio=this;}};
   const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){return this.src.includes('/hang.wav')?new Promise(()=>{}):play.call(this);};
   window.choose=(id,url)=>{document.getElementById('play').onclick=()=>{window.task=telechatMusicV96.playTrack({id,url,kind:'link',title:id}).catch(e=>window.failure=e.message)}};
  },blockStorage);
  await p.addScriptTag({content:coreSource()});
  return {p,errors,setBroken:v=>broken=v};
 }
 const {p,errors}=await page(true);await p.evaluate(()=>choose('public','https://audio.test/good.wav'));await p.locator('#play').click();await p.waitForTimeout(250);
 const blocked=await p.evaluate(()=>({playing:!musicAudio.paused,current:telechatMusicV96.getState().track?.id||null,error:window.failure||null}));
 console.log('Public playback with disabled local storage:',blocked);
 if(!baseline){assert(blocked.playing,'Public playback must not depend on IndexedDB');assert.equal(blocked.current,'public');assert.equal(blocked.error,null);assert.deepEqual(errors,[]);}await p.close();
 const {p:q,errors:qe}=await page();await q.clock.install();await q.evaluate(()=>choose('hang','https://audio.test/hang.wav'));await q.locator('#play').click();await q.waitForFunction(()=>telechatMusicV96.getState().track?.id==='hang');
 await q.clock.fastForward(22000);
 const hung=await q.evaluate(()=>({loading:telechatMusicV96.getState().loading,error:telechatMusicV96.getState().error}));console.log('Playback after 22-second unresolved play():',hung);
 if(!baseline){assert.equal(hung.loading,false,'A media play promise cannot hold loading forever');assert.equal(hung.error?.name,'TimeoutError');}
 await q.clock.resume();await q.evaluate(()=>choose('next','https://audio.test/next.wav'));await q.locator('#play').click();await q.waitForFunction(()=>telechatMusicV96.getState().track?.id==='next'&&!musicAudio.paused);assert.deepEqual(qe,[]);await q.close();
 if(baseline)return;
 const {p:r,errors:re,setBroken}=await page();setBroken(true);await r.evaluate(()=>choose('retry','https://audio.test/retry.wav'));await r.locator('#play').click();await r.waitForFunction(()=>!!telechatMusicV96.getState().error);
 assert.equal(await r.evaluate(()=>telechatMusicV96.getState().loading),false);
 setBroken(false);await r.evaluate(()=>{document.getElementById('play').onclick=()=>window.task=telechatMusicV96.retry()});await r.locator('#play').click();await r.waitForFunction(()=>!musicAudio.paused&&musicAudio.currentTime>0);
 assert.equal(await r.evaluate(()=>telechatMusicV96.getState().error),null,'Retry reloads the failed URL and clears stale MediaError');
 await r.evaluate(()=>{window.oldTask=telechatMusicV96.playTrack({id:'hang2',url:'https://audio.test/hang.wav',kind:'link',title:'Hang'});});await r.waitForFunction(()=>telechatMusicV96.getState().loading);
 await r.evaluate(()=>telechatMusicV96.pause());await r.evaluate(()=>oldTask);assert.equal(await r.evaluate(()=>telechatMusicV96.getState().loading),false);assert.equal(await r.evaluate(()=>musicAudio.paused),true);assert.equal(await r.evaluate(()=>telechatMusicV96.getState().error),null,'Explicit pause is not an error');
 await r.evaluate(()=>{window.oldTask=telechatMusicV96.playTrack({id:'hang3',url:'https://audio.test/hang.wav',kind:'link',title:'Hang'});});await r.waitForFunction(()=>telechatMusicV96.getState().loading);
 await r.evaluate(()=>{window.newTask=telechatMusicV96.playTrack({id:'last',url:'https://audio.test/last.wav',kind:'link',title:'Last'});});await r.evaluate(()=>Promise.all([oldTask,newTask]));assert.equal(await r.evaluate(()=>telechatMusicV96.getState().track.id),'last');assert.equal(await r.evaluate(()=>telechatMusicV96.getState().error),null);
 await r.evaluate(()=>telechatMusicV96.stop());assert.equal(await r.evaluate(()=>musicAudio.paused),true);assert.deepEqual(re,[]);await r.close();
 // The actual music hub must expose the failure and a working retry action.
 const {p:s,errors:se,setBroken:breakHub}=await page();
 await s.evaluate(()=>{window.SUPABASE_URL='https://db.test';window.SUPABASE_KEY='fixture';window.avatarMarkup=()=>'<span>F</span>';window.sb={rpc:async()=>({data:{saved:[],liked:[],playlists:[]}}),from(table){const q={select:()=>q,in:()=>q,order:()=>q,range:()=>q,then:(resolve,reject)=>Promise.resolve({data:table==='users'?[]:[{id:'hub-track',url:'https://audio.test/hub.wav',title:'Hub track',artist:'Fixture',author_nick:'fixture',duration:20,source:'link'}]}).then(resolve,reject)};return q;}};});
 await s.addScriptTag({content:fs.readFileSync(path.join(root,'music-hub-v117.js'),'utf8')});await s.evaluate(()=>telechatMusicHubV117.open());
 breakHub(true);await s.locator('.mh-track-art').first().click();await s.waitForSelector('#mh-playback-error-v185 [data-action=retry]');assert.match(await s.locator('#mh-playback-error-v185').textContent(),/Ссылка на трек/);
 await s.evaluate(()=>document.getElementById('mh-notice').textContent='Unrelated library notice');assert.equal(await s.locator('#mh-playback-error-v185 [data-action=retry]').count(),1,'Other notices cannot erase playback recovery');
 await s.addStyleTag({content:fs.readFileSync(path.join(root,'music-hub-v117.css'),'utf8')});for(const width of [320,390,1440]){await s.setViewportSize({width,height:900});assert(await s.locator('#mh-playback-error-v185').evaluate(n=>n.scrollWidth<=n.clientWidth),'Recovery banner fits '+width);}
 breakHub(false);await s.locator('#mh-playback-error-v185 [data-action=retry]').click();await s.waitForFunction(()=>!musicAudio.paused&&musicAudio.currentTime>0);assert.equal(await s.locator('#mh-playback-error-v185 [data-action=retry]').count(),0);
 await s.evaluate(()=>telechatMusicHubV117.close());assert.equal(await s.evaluate(()=>musicAudio.paused),false,'Closing the hub does not stop playback');assert.deepEqual(se,[]);await s.close();
 console.log('PASS music v185: public playback without IDB, bounded start, failed URL retry, explicit cancellation and latest-track ownership');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
