'use strict';
// All audio, metadata, accounts and failures are local fixtures. No live services.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const publicQa=process.argv.includes('--public'),assets=new Map();
async function asset(file){
 if(!publicQa)return fs.readFileSync(file);
 const relative=path.relative(root,file).replaceAll('\\','/');
 if(!assets.has(relative))assets.set(relative,(async()=>{const response=await fetch('https://dark178098345-star.github.io/-telechat/'+relative+'?v=217&link-qa='+Date.now(),{signal:AbortSignal.timeout(20000),cache:'no-store'});assert.equal(response.status,200,relative);const body=Buffer.from(await response.arrayBuffer());assert.deepEqual(body,execFileSync('git',['show','HEAD:'+relative],{cwd:root}),'Published bytes: '+relative);return body;})());
 return assets.get(relative);
}
function wav(){const b=Buffer.alloc(44+16000*12);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
async function fixture(browser){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),requests=[],errors=[],gates=[];let missing=false;
 await context.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.hostname==='audio.test'){
   requests.push({path:u.pathname,method:r.request().method()});
   if((u.pathname==='/late.wav'||u.pathname==='/never.wav')&&r.request().method()!=='HEAD')await new Promise(ok=>gates.push(ok));
   const status=u.pathname==='/missing.wav'||missing&&u.pathname==='/good.wav'?404:u.pathname==='/denied.wav'?403:200;
   const html=status!==200||u.pathname==='/page.mp3';
   return r.fulfill({status,headers:u.pathname==='/no-cors.wav'?{}:{'Access-Control-Allow-Origin':'*'},contentType:html?'text/html':'audio/wav',body:r.request().method()==='HEAD'?'':html?'<!doctype html><title>Not audio</title>':wav()}).catch(()=>{});
  }
  if(u.hostname!=='check.test')return r.abort();
  if(u.pathname==='/')return r.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial}</style><button class="music-entry-v96">Music</button><div class="sidebar-top"></div><div class="sidebar-footer"></div><div class="chat-main"></div>'});
  const file=path.join(root,u.pathname);if(!fs.existsSync(file))return r.abort();return r.fulfill({contentType:file.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8',body:await asset(file)});
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('https://check.test/');
 await p.evaluate(()=>{
  window.me={nick:'alice',name:'Alice',pass:'fixture'};window.showToast=()=>{};window.avatarMarkup=()=>'<span>A</span>';window.SUPABASE_URL='https://storage.test';window.SUPABASE_KEY='fixture';window.calls=[];window.clouds=[];window.probes=[];
  const Original=Audio;window.Audio=class extends Original{constructor(...args){super(...args);probes.push(this);}};
  window.telechatSoundCloudV98={isLink:url=>String(url).startsWith('https://soundcloud.com/'),normalize:x=>x,async create(url,host,options){const cloud={duration:60,destroyed:false,destroy(){this.destroyed=true;}};clouds.push({cloud,options});return cloud;}};
  window.sb={rpc:async(_name,args)=>{calls.push(args);if(args.p_action==='library')return {data:{saved:[],liked:[],playlists:[]}};if(args.p_action==='upload_ticket')return {data:{id:crypto.randomUUID(),token:'fixture'}};if(args.p_action==='publish')return {data:{...args.p_data,author_nick:args.p_nick}};return {data:{}};},from(table){const q={select:()=>q,in:()=>q,eq:()=>q,order:()=>q,range:()=>q,limit:()=>q,abortSignal:()=>q,then:(yes,no)=>Promise.resolve({data:table==='users'?[me]:[]}).then(yes,no)};return q;}};
  window.supabase={createClient:()=>({storage:{from:()=>({})}})};
 });
 await p.addStyleTag({url:'https://check.test/music-hub-v117.css'});await p.addStyleTag({url:'https://check.test/music-refresh-v199.css'});
 for(const file of ['music-library-v96.js','music-hub-v117.js'])await p.addScriptTag({url:'https://check.test/'+file});
 await p.evaluate(()=>telechatMusicHubV117.open());
 async function composer(){await p.locator('.mh-publish-top').click();await p.locator('[data-source=link]').click();await p.locator('[name=title]').fill('Fixture track');await p.locator('[name=rights]').check();}
 async function account(nick){await p.evaluate(async nick=>{me={nick,name:nick,pass:'fixture'};dispatchEvent(new Event('telechat-account-ready-v175'));await telechatMusicHubV117.open();},nick);}
 return {p,context,requests,errors,gates,composer,account,setMissing:value=>missing=value};
}
const panel='.mh-link-check-v217',input='#mh-publish-form [name=url]';
async function result(p,state){await p.waitForSelector(`${panel}[data-state=${state}]`);}
(async()=>{if(publicQa)for(const file of ['index.html','sw.js','whats-new-v181.js'])await asset(path.join(root,file));const browser=await chromium.launch({channel:'msedge',headless:true});try{
 let f=await fixture(browser),{p}=f;await f.composer();assert.equal(f.requests.length,0,'No background library crawl or empty-link request');
 await p.locator(input).fill('http://audio.test/good.wav');await result(p,'error');await p.locator('#mh-publish-form [type=submit]').click();assert.match(await p.locator('#mh-publish-status').textContent(),/HTTPS/);assert.equal(f.requests.length,0);assert.equal(await p.evaluate(()=>calls.filter(c=>c.p_action==='upload_ticket').length),0);
 await p.locator(input).fill('https://audio.test/missing.wav');await p.locator(input).fill('https://audio.test/page.mp3');await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');assert(!f.requests.some(r=>r.path==='/missing.wav'||r.path==='/page.mp3'),'Typing is debounced');assert(!f.requests.some(r=>r.method==='HEAD'),'Valid media does not depend on a CORS/HEAD request');
 assert.match(await p.locator(panel).textContent(),/работает сейчас/);assert.match(await p.locator('.mh-link-risk-v217').textContent(),/удалить файл/);assert.equal(await p.evaluate(()=>probes.every(a=>a.paused)),true,'Validation never plays audible audio');assert.equal(await p.evaluate(()=>probes.slice(1).every(a=>!a.getAttribute('src'))),true,'Decoded media is released');
 for(const width of [320,390,1440]){await p.setViewportSize({width,height:1000});assert(await p.locator('.mh-sheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.screenshot({path:path.join(root,`outputs/music-link-v217-${width}.png`)});}
 await p.evaluate(()=>document.body.classList.add('theme-light'));await p.screenshot({path:path.join(root,'outputs/music-link-v217-light.png')});await p.evaluate(()=>document.body.classList.remove('theme-light'));
 await p.locator(input).fill('https://audio.test/no-cors.wav');await result(p,'success');assert(!f.requests.some(r=>r.path==='/no-cors.wav'&&r.method==='HEAD'),'Non-CORS audio is accepted through the actual media element');
 await p.locator(input).fill('https://audio.test/good.wav?Expires=2000000000&Signature=fixture');await result(p,'warning');assert.match(await p.locator(panel).textContent(),/временной/);
 await p.locator(input).fill('https://audio.test/missing.wav');await result(p,'error');assert.match(await p.locator(panel).textContent(),/удалён или не найден/);await p.locator('#mh-publish-form [type=submit]').click();assert.equal(await p.evaluate(()=>calls.filter(c=>c.p_action==='publish'||c.p_action==='upload_ticket').length),0,'A broken link never reaches publication or staging');
 await p.locator(input).fill('https://audio.test/page.mp3');await result(p,'error');assert.match(await p.locator(panel).textContent(),/страница сайта/);
 await p.locator(input).fill('https://audio.test/denied.wav');await result(p,'error');assert.match(await p.locator(panel).textContent(),/закрыл доступ/);
 await p.locator(input).fill('https://soundcloud.com/fixture/test?secret_token=private');await result(p,'error');assert.equal(await p.evaluate(()=>clouds.length),0,'Private SoundCloud URLs never start a widget');
 await p.locator(input).fill('https://soundcloud.com/fixture/test');await result(p,'success');assert.equal(await p.evaluate(()=>clouds[0].options.canPlay()),false);assert.equal(await p.evaluate(()=>clouds[0].cloud.destroyed),true);assert(!f.requests.some(r=>r.path.includes('soundcloud')));
 await p.locator(input).fill('https://audio.test/late.wav');await p.waitForFunction(()=>probes.some(a=>a.src.endsWith('/late.wav')));await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');for(const release of f.gates.splice(0))release();assert.equal(await p.locator(`${panel} strong`).textContent(),'Ссылка работает сейчас','Late old probe cannot overwrite the current link');
 await p.locator('[data-source=file]').click();assert(await p.locator(panel).isHidden());assert.equal(await p.evaluate(()=>probes.slice(1).every(a=>!a.getAttribute('src'))),true);
 await p.locator('[data-source=link]').click();await result(p,'success');f.setMissing(true);await p.locator(`${panel} button`).click();await result(p,'error');assert.match(await p.locator(panel).textContent(),/не найден/,'Explicit retry really rechecks');f.setMissing(false);
 await p.locator(input).fill('https://audio.test/late.wav');await p.waitForFunction(()=>probes.some(a=>a.src.endsWith('/late.wav')));await p.locator('[data-action=sheet-close]').click();await f.composer();await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');for(const release of f.gates.splice(0))release();assert.equal(await p.locator(input).inputValue(),'https://audio.test/good.wav');
 await p.locator(input).fill('https://audio.test/late.wav');await p.waitForFunction(()=>probes.some(a=>a.src.endsWith('/late.wav')));await f.account('bob');await f.account('alice');await f.composer();for(const release of f.gates.splice(0))release();assert.match(await p.locator(panel).textContent(),/Вставь ссылку/);assert.equal(await p.locator(input).inputValue(),'');assert.deepEqual(f.errors,[]);await f.context.close();
 // A fresh successful result can be reused briefly; stale results cannot publish.
 f=await fixture(browser);p=f.p;await f.composer();await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');const before=f.requests.length;await p.locator('#mh-publish-form [type=submit]').click();await p.waitForSelector('#mh-sheet',{state:'hidden'});assert.equal(f.requests.length,before,'One fresh check is shared with submit');assert.equal(await p.evaluate(()=>calls.filter(c=>c.p_action==='publish').length),1);await f.context.close();
 f=await fixture(browser);p=f.p;await p.clock.install();await f.composer();await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');await p.clock.fastForward(31000);f.setMissing(true);await p.locator('#mh-publish-form [type=submit]').click();await result(p,'error');assert.equal(await p.evaluate(()=>calls.filter(c=>c.p_action==='publish'||c.p_action==='upload_ticket').length),0,'Success expires after 30 seconds');assert.deepEqual(f.errors,[]);await f.context.close();
 f=await fixture(browser);p=f.p;await p.clock.install();await f.composer();await p.locator(input).fill('https://audio.test/never.wav');await p.clock.runFor(600);await p.waitForFunction(()=>probes.some(a=>a.src.endsWith('/never.wav')));await p.clock.fastForward(16000);await result(p,'error');assert(await p.locator(`${panel} button`).isEnabled(),'A hung probe cannot leave the panel busy forever');for(const release of f.gates.splice(0))release();await f.context.close();
 f=await fixture(browser);p=f.p;await p.evaluate(()=>{const b=document.createElement('button');b.id='play-fixture';b.textContent='Play fixture';b.onclick=()=>telechatMusicV96.playTrack({id:'playing',kind:'link',url:'https://audio.test/playing.wav',title:'Playing'});document.querySelector('.mh-top').append(b);});await p.locator('#play-fixture').click();await p.waitForFunction(()=>!telechatMusicV96.getState().paused);await f.composer();await p.locator(input).fill('https://audio.test/good.wav');await result(p,'success');assert.equal(await p.evaluate(()=>telechatMusicV96.getState().track.id),'playing');assert.equal(await p.evaluate(()=>telechatMusicV96.getState().paused),false,'Checking a link leaves the real player alone');
 // Metadata alone must not make the new decode mode report success.
 assert.equal(await p.evaluate(async()=>{const Original=Audio;let fake,settled=false;window.Audio=class{constructor(){fake=this;this.duration=12;this.readyState=1;}set src(value){this.value=value;}removeAttribute(){this.value='';}load(){}};try{const task=telechatMusicV96.inspectAudio('https://audio.test/metadata-only.wav',undefined,true).then(()=>settled=true);fake.onloadedmetadata();await Promise.resolve();if(settled)return false;fake.readyState=2;fake.onloadeddata();await task;return settled&&!fake.value&&!fake.onloadeddata;}finally{window.Audio=Original;} }),true);assert.deepEqual(f.errors,[]);await f.context.close();
 console.log('PASS music link checks: real silent decode, debounce, no HEAD for valid non-CORS media, HTTP explanations, temporary-link warning, retry, publication gate, expiry, cancellation and A/B/A isolation; 320/390/1440 and light-mode screenshots. Fixtures only.');
 if(publicQa)console.log('PASS published v217 bytes and the same browser scenarios using public scripts/styles; only synthetic media/accounts, no production backend calls.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
