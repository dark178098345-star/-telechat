const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(fixtureClient);await context.addInitScript(()=>localStorage.setItem('exstrachat.release-notes.v1.alice',JSON.stringify({seen:999,auto:false})));
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:'/* fixture SDK */'});
   if(u.hostname.endsWith('.supabase.co'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});if(u.hostname!=='app.test')return route.abort();
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
   const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream';return route.fulfill({contentType,body:fs.readFileSync(file)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://app.test/?v=208');
  await page.locator('#l-login').fill('alice');await page.locator('#l-pass').fill('fixture-only');await page.evaluate(()=>doLogin());await page.waitForFunction(()=>document.getElementById('chat-screen').classList.contains('active'));
  await page.evaluate(()=>openChat('bob'));await page.waitForFunction(()=>document.querySelectorAll('#messages .msg').length>=20);
  await page.evaluate(()=>userCache.bob.status=packProfileData('','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII='));
  const input=page.locator('#msg-input'),picker=page.locator('#mention-picker-v106'),before=await page.locator('#messages .msg').count();
  await input.fill('Привет, @b');await page.waitForSelector('#mention-option-v106-bob img');await input.press('Enter');
  assert.equal(await input.inputValue(),'Привет, @bob ');assert.equal(await page.locator('#messages .msg').count(),before,'The real send handler is not called when choosing a suggestion');
  await input.press('Enter');await page.waitForSelector('#messages .message-mention-v106');
  assert.equal(await page.locator('#messages .message-mention-v106').last().textContent(),'@bob');
  await page.evaluate(()=>{exstraEmojiComposerV182.insert(exstraEmojiCatalogV182.get('boxing'));const input=document.getElementById('msg-input');input.value+=' @b';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();});
  await page.waitForSelector('#mention-picker-v106:not([hidden])');await input.press('Enter');await input.press('Enter');
  await page.waitForFunction(()=>[...document.querySelectorAll('#messages .msg')].some(row=>row.querySelector('[data-emoji-id=boxing]')&&row.querySelector('.message-mention-v106')));
  assert(await picker.evaluate(n=>n.hidden));await page.locator('#messages .message-mention-v106').last().click();await page.waitForSelector('#user-profile-modal.show');
  assert.deepEqual(errors,[],'No production-stack mention errors at '+width);await context.close();
 }
 console.log('PASS v208 production stack: real composer order, photo suggestions, Enter completion without send, actual plain/custom-emoji delivery, clickable mention profile and 390/1440px. Isolated backend only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
