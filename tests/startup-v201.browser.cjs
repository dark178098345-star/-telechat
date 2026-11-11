const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
async function fixture(browser,width,hold,blockedLocal=false){
 const c=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
 await c.addInitScript(fixtureClient);
 let release;const gate=new Promise(r=>release=r);let held=false;
 await c.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(hold==='cdn'&&u.hostname==='cdn.jsdelivr.net'){held=true;await gate;}
  if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:''});
  if(u.hostname!=='app.test')return route.abort();
  const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.abort();
  if(hold!=='cdn'&&u.pathname.endsWith('/'+hold)){held=true;await gate;}
  let body=fs.readFileSync(f);
  if(blockedLocal&&u.pathname.endsWith('/interface-style-v200.js'))body=Buffer.from('window.telechatAccountsV75={...window.telechatAccountsV75,ready:new Promise(()=>{})};\n'+body);
  return route.fulfill({contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[path.extname(f)]||'application/octet-stream',body});
 });
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 return {c,p,errors,release,held:()=>held};
}
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [390,1440]){
  const {c,p,errors,release,held}=await fixture(b,width,'phone-shell-v159.js',width===1440);
  const nav=p.goto('https://app.test/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.exstraStartupV201);
  await p.waitForTimeout(4100);
  assert(held());assert.equal(await p.evaluate(()=>document.readyState),'loading');
  assert.equal(await p.evaluate(()=>exstraStartupV201.getState().ready),false,'Do not reveal a partial shell at the former 3.5s deadline');
  assert.equal(await p.locator('#startup-loader').evaluate(n=>getComputedStyle(n).opacity),'1');
  release();await nav;const parsed=Date.now();await p.waitForFunction(()=>exstraStartupV201.getState().ready);assert(Date.now()-parsed<1000,'No forced long intro after the app is ready');
  await p.waitForFunction(()=>!document.getElementById('startup-loader'));
  assert.equal(await p.evaluate(()=>document.body.classList.contains('telechat-phone-v159')),width<600);
  const auth=await p.locator('.auth-box').boundingBox();await p.waitForTimeout(180);const later=await p.locator('.auth-box').boundingBox();assert(Math.abs(auth.y-later.y)<1&&Math.abs(auth.height-later.height)<1,'Auth remains steady after reveal');
  await p.evaluate(async()=>{window.accountEvents201=0;window.addEventListener('telechat-account-ready-v175',()=>accountEvents201++);localStorage.setItem('exstrachat.interface.v200.alice','drawings');document.getElementById('l-login').value='alice';document.getElementById('l-pass').value='wrong';await doLogin();});
  assert.equal(await p.evaluate(()=>accountEvents201),0,'Invalid credentials do not prepare an account');assert(await p.locator('#auth-screen').isVisible());
  await p.evaluate(()=>{
   const from=sb.from.bind(sb);let release;const gate=new Promise(r=>release=r);window.releaseInitialData=release;
   sb.from=function(table){const q=from(table);if(!['messages','stories'].includes(table))return q;let proxy;proxy=new Proxy(q,{get(target,key){if(key==='then')return(resolve,reject)=>gate.then(()=>target.then(resolve,reject));const v=target[key];return typeof v==='function'?function(...args){const next=v.apply(target,args);return next===q?proxy:next;}:v;}});return proxy;};
   document.getElementById('l-login').value='alice';document.getElementById('l-pass').value='fixture-only';window.loginJob201=doLogin();
  });
  await p.waitForFunction(()=>document.getElementById('chat-screen').classList.contains('active'));
  assert.equal(await p.evaluate(()=>accountEvents201),1,'One successful account-ready event');assert.equal(await p.locator('body').getAttribute('data-interface-v200'),'drawings','Account appearance is restored before the chat shell is visible');
  await p.waitForTimeout(60);
  assert.equal(await p.locator('#chat-boot-v41').count(),0,'No second full-screen overlay');
  assert.equal(await p.locator('#contacts-list').getAttribute('aria-busy'),'true');
  assert.equal(await p.locator('#stories-list-v115 .story-chip-v115').count(),1,'Own story reserves the real row before network data');
  const firstTop=await p.locator('#contacts-list').evaluate(n=>n.getBoundingClientRect().top);
  if(width<600)assert(await p.locator('#phone-home-head-v159').isVisible());
  await p.evaluate(async()=>{releaseInitialData();await loginJob201;});
  await p.waitForFunction(()=>!document.getElementById('contacts-list').hasAttribute('aria-busy'));
  assert.equal(await p.locator('#contacts-list').evaluate(n=>n.getBoundingClientRect().top),firstTop,'Story data does not push the chat list down');
  assert.deepEqual(errors,[]);await c.close();
 }
 const {c,p,errors,release}=await fixture(b,390,'cdn');const nav=p.goto('https://app.test/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.exstraStartupV201);assert(await p.locator('#startup-loader').isVisible(),'A slow SDK no longer prevents the startup surface from appearing');release();await nav;await p.waitForFunction(()=>exstraStartupV201.getState().ready);assert.deepEqual(errors,[]);await c.close();
 console.log('PASS v201 startup: held parser beyond 3.5s, stable auth/phone layout, bounded local wait, visible loader during delayed SDK, one reveal, list-only loading and no story-driven sidebar shift at 390/1440');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
