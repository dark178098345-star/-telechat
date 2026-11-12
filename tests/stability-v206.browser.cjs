// Production scripts with isolated accounts/network; never opens the user's profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
async function setup(browser,{blocked=false,width=1440}={}){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 await context.addInitScript(fixtureClient);
 await context.addInitScript(({blocked})=>{
  localStorage.setItem('exstrachat.release-notes.v1.alice',JSON.stringify({seen:999,auto:false}));
  window.fixtureChannels=[];window.fixtureSends=0;
  const create=supabase.createClient;supabase.createClient=(...args)=>{
   const client=create(...args),channel=client.channel.bind(client),rpc=client.rpc.bind(client);
   client.channel=(name,...rest)=>{fixtureChannels.push(name);return channel(name,...rest);};
   client.rpc=(name,...rest)=>{if(name==='exstra_send_messages_v172'){fixtureSends++;if(window.fixtureSendFailure)return Promise.resolve({error:{message:'temporary network failure'}});}return rpc(name,...rest);};return client;
  };
  if(blocked){const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>name==='telechat-outbox-v72'?{}:open(name,...args);}
 },{blocked});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:'/* fixture SDK */'});
  if(u.hostname.endsWith('.supabase.co'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  if(u.hostname!=='app.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
  const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({contentType,body:fs.readFileSync(file)});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://app.test/?v=206');await page.locator('#l-login').fill('alice');await page.locator('#l-pass').fill('fixture-only');
 await page.evaluate(()=>doLogin());await page.waitForFunction(()=>document.getElementById('chat-screen').classList.contains('active'));
 await page.evaluate(()=>openChat('bob'));await page.waitForFunction(()=>document.querySelectorAll('#messages .msg').length>=20);
 await page.waitForTimeout(100);return {context,page,errors};
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const normal=await setup(browser),p=normal.page;
  const wakes=await p.evaluate(async()=>{
   const count=()=>fixtureChannels.filter(n=>/^telechat-(messages|polls)-v104-/.test(n)).length;
   const before=count();for(let i=0;i<3;i++){document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'));}
   await new Promise(r=>setTimeout(r,150));return {before,after:count()};
  });
  if(baseline)assert(wakes.after>wakes.before,'Baseline must reproduce duplicate foreground reconnections');
  else assert.equal(wakes.after,wakes.before,'Healthy foreground events reuse the current channels');
  assert.deepEqual(normal.errors,[]);await normal.context.close();
  for(const width of baseline?[390]:[390,1440]){
   const stalled=await setup(browser,{blocked:true,width}),q=stalled.page;
   await q.locator('#msg-input').fill('Bounded outbox fixture');await q.evaluate(()=>sendMsg());
   await q.waitForTimeout(2000);const sent=await q.evaluate(()=>fixtureSends);
   if(baseline)assert.equal(sent,0,'Baseline must reproduce a blocked database preventing the send');
   else{
    assert.equal(sent,1,'Unavailable local storage must not prevent a healthy server send');
    assert.equal(await q.locator('#messages .msg-bubble').filter({hasText:'Bounded outbox fixture'}).count(),1);
    assert.equal(await q.locator('#messages .v72-sent').count(),1,'The optimistic row receives its acknowledgement');
    await q.evaluate(()=>{window.fixtureSendFailure=true;document.getElementById('msg-input').value='Memory retry fixture';return sendMsg();});
    await q.waitForSelector('#messages .v72-failed');
    await q.evaluate(async()=>{window.fixtureSendFailure=false;await telechatDeliveryV72.drain(true);});
    await q.waitForFunction(()=>!document.querySelector('#messages .v72-failed'));
    assert.equal(await q.locator('#messages .msg-bubble').filter({hasText:'Memory retry fixture'}).count(),1,'In-memory retry preserves the original row');
    assert.equal((await q.evaluate(()=>telechatDeliveryV72.diagnostics())).queued,0,'Unsaved messages are removed from the queue after acknowledgement');
   }
   assert.deepEqual(stalled.errors,[]);await stalled.context.close();
  }
  console.log(baseline?'REPRODUCED: foreground rebuilds healthy channels; blocked outbox prevents network send.':'PASS v206 production stack: no duplicate foreground reconnections, bounded local-storage failure, one acknowledged message at 390/1440px.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
