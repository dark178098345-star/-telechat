const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const context=await browser.newContext();
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>tag.includes('appearance-mode-v95.js')?tag:'');
  html=html.replace('</body>','<div class="setting-row"><div class="setting-note"></div><input id="glass-toggle-v36" type="checkbox" checked></div></body>');
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='telechat.test')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   const file=path.join(root,path.basename(u.pathname));
   if(!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file)});
  });
  const page=await context.newPage();await page.goto('http://telechat.test/');
  const media=()=>page.locator('#calm-style-v95').getAttribute('media');
  const choose=enabled=>page.locator('#calm-mode-v95').evaluate((el,value)=>{el.checked=value;el.dispatchEvent(new Event('change',{bubbles:true}));},enabled);
  assert.equal(await media(),'not all');
  assert.equal(await page.locator('#calm-mode-v95').isChecked(),false);
  const original=await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).background);
  await choose(true);assert.equal(await media(),'all');
  assert.notEqual(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).background),original);
  assert(await page.locator('#glass-toggle-v36').isDisabled());
  await page.reload();assert.equal(await media(),'all');assert(await page.locator('#calm-mode-v95').isChecked());
  await choose(false);assert.equal(await media(),'not all');
  assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).background),original);
  assert(await page.locator('#glass-toggle-v36').isChecked());assert(!(await page.locator('#glass-toggle-v36').isDisabled()));
  await page.reload();assert.equal(await media(),'not all');
  await page.evaluate(()=>localStorage.setItem('telechat_calm_mode_v95','invalid'));await page.reload();assert.equal(await media(),'not all');
  const blocked=await context.newPage();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('unavailable')}}));
  await blocked.goto('http://telechat.test/');assert.equal(await blocked.locator('#calm-style-v95').getAttribute('media'),'not all');
  await blocked.locator('#calm-mode-v95').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change'));});
  assert.equal(await blocked.locator('#calm-style-v95').getAttribute('media'),'all');
  console.log('PASS: classic default, live styles, persisted modes, exact restoration, glass preference retained, unavailable storage fallback.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
