// Actual production entry point and all add-ons; isolated account/backend fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(fixtureClient);
  await context.addInitScript(()=>{
   localStorage.setItem('exstrachat.release-notes.v1.alice',JSON.stringify({seen:999,auto:false}));window.sentGifts=[];
   const create=supabase.createClient;supabase.createClient=(...args)=>{
    const client=create(...args),rpc=client.rpc.bind(client),from=client.from.bind(client);
    client.rpc=(name,args)=>{if(name!=='exstra_wallet_v197')return rpc(name,args);let data={ok:true};if(args.p_action==='state')data={balance:1000,unlimited:false,premium:false,forever:false,until:null,badge:'',history:[]};else if(args.p_action==='catalog')data={gifts:[{id:'nova_heart',name:'Сердце новы',theme:'rose',rarity:'common',limited:false,price:50}]};else sentGifts.push(structuredClone(args));return Promise.resolve({data,error:null});};
    client.from=table=>{if(table!=='user_gifts')return from(table);const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then(resolve,reject){return Promise.resolve({data:[{id:21,owner_nick:'alice',sender_nick:'bob',gift_id:'nova_heart',gift_name:'Сердце новы',theme:'rose',rarity:'common',limited:false,price:50,message:'Тёплый привет',created_at:Date.UTC(2026,10,12)}],error:null}).then(resolve,reject);}};return q;};return client;
   };
  });
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:'/* fixture SDK */'});
   if(u.hostname.endsWith('.supabase.co'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});if(u.hostname!=='app.test')return route.abort();
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
   const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream';return route.fulfill({contentType,body:fs.readFileSync(file)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://app.test/?v=207');
  await page.locator('#l-login').fill('alice');await page.locator('#l-pass').fill('fixture-only');await page.evaluate(()=>doLogin());await page.waitForFunction(()=>document.getElementById('chat-screen').classList.contains('active'));
  await page.evaluate(()=>exstraWalletUIV197.open({tab:'gifts',target:'bob'}));await page.locator('[data-wallet-gift=nova_heart]').click();
  const card=page.locator('#gift-card-v207');assert.equal(await card.locator('h2').textContent(),'Сердце новы');assert((await card.textContent()).includes('Bob'));assert.equal(await page.evaluate(()=>sentGifts.length),0);
  await card.locator('[data-gift-card-action]').click();await page.locator('[data-confirm-yes]').click();await page.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  assert.equal(await page.evaluate(()=>sentGifts.length),1);assert.deepEqual(await page.evaluate(()=>sentGifts[0].p_data),{gift:'nova_heart',target:'bob',note:''});
  await page.evaluate(()=>exstraWalletUIV197.open({tab:'gifts',target:'alice',collection:true}));await page.locator('[data-owned-gift="21"]').click();await page.waitForTimeout(240);
  assert.equal(await card.locator('blockquote').textContent(),'Тёплый привет');assert(await card.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height<=innerHeight&&n.scrollWidth<=n.clientWidth;}));
  assert.deepEqual(errors,[],'Production stack has no gift-card errors at '+width);await context.close();
 }
 console.log('PASS v207 full production stack: login, catalog preview, exact confirmed gift payload, collection detail, shared motion and phone/desktop geometry at 390/1440. No live purchase.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
