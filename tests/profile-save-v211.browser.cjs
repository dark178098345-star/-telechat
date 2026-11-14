'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const ctx=await b.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});await ctx.addInitScript(fixtureClient);
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='cdn.jsdelivr.net')return r.fulfill({contentType:'application/javascript',body:''});if(u.hostname.endsWith('.supabase.co'))return r.fulfill({contentType:'application/json',body:'[]'});if(u.hostname!=='app.test')return r.abort();const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return r.abort();return r.fulfill({contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://app.test/');await p.evaluate(async()=>{document.getElementById('l-login').value='alice';document.getElementById('l-pass').value='fixture-only';await doLogin();});
 await p.evaluate(()=>{
  window.savedProfileUpdates=[];window.profileSavedEvents=0;addEventListener('telechat-user-updated-v123',e=>{if(e.detail?.nick==='alice'&&e.detail.profileSaved)profileSavedEvents++;});
  const from=sb.from.bind(sb);sb.from=function(table){const q=from(table);if(table!=='users')return q;let fields='*',proxy;proxy=new Proxy(q,{get(target,key){
   if(key==='update')return patch=>{savedProfileUpdates.push(patch);const chain={eq(){return chain;},select(){return chain;},maybeSingle:async()=>({data:{nick:'alice',status:patch.status},error:null})};return chain;};
   if(key==='select')return f=>{fields=f;target.select(f);return proxy;};
   if(key==='then')return(resolve,reject)=>target.then(result=>{const project=row=>!row||fields==='*'?row:Object.fromEntries(fields.split(',').filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]]));return resolve({...result,data:Array.isArray(result.data)?result.data.map(project):project(result.data)});},reject);
   const v=target[key];return typeof v==='function'?function(...args){const next=v.apply(target,args);return next===target?proxy:next;}:v;
  }});return proxy;};
  buildProfPanel();document.getElementById('prof-name-inp').value='A fresh display name';document.getElementById('prof-status-inp').value='Fresh status';document.getElementById('prof-bio-inp').value='Fresh biography';selectedProfileBanner='preset:aurora';
 });
 await p.evaluate(()=>saveProfile());assert.equal(await p.evaluate(()=>savedProfileUpdates.length),1,'Exactly one profile write, not the retired implementations');assert.equal(await p.evaluate(()=>profileSavedEvents),1,'Confirmed own save emits one cache invalidation event');
 assert.equal(await p.evaluate(()=>me.name),'A fresh display name');assert.equal(await p.evaluate(()=>me.bio),'Fresh biography');assert.equal(await p.evaluate(()=>me.banner),'preset:aurora');
 await p.waitForFunction(async()=>(await telechatAccountsV75.list()).find(a=>a.nick==='alice')?.profile.name==='A fresh display name');
 await p.evaluate(()=>openUserProfile('alice'));assert.equal(await p.locator('#view-profile-name').textContent(),'A fresh display name');assert.equal(await p.locator('#view-profile-bio').textContent(),'Fresh biography');assert.equal(await p.locator('#profile-refresh').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS full profile save: one write, one confirmed invalidation, new name/bio/banner in the viewer and encrypted saved-account card; no legacy overlay or page errors. Isolated dummy account only.');await ctx.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
