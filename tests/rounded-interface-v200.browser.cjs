const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,390,768,1440]){
   const {p,errors}=await fixture(browser,width,900,width<600);
   // Capture the user's existing message/avatar geometry before the refinement.
   await p.evaluate(async()=>{await openChat('friend0');window.roundedSheet=[...document.styleSheets].find(s=>[...s.cssRules].some(r=>r.cssText.includes('--ex-radius-small')));roundedSheet.disabled=true;});
   await p.locator('#msg-input').fill('Проверка');
   await p.waitForTimeout(230);
   const geometry=()=>p.evaluate(()=>{
    const css=s=>getComputedStyle(document.querySelector(s));
    const b=document.querySelector('.send-btn').getBoundingClientRect();
    return {avatar:css('#contacts-list .contact .av').borderRadius,bubble:css('#messages .msg-bubble').borderRadius,send:[b.width,b.height]};
   });
   const before=await geometry();await p.evaluate(()=>roundedSheet.disabled=false);
   const after=await geometry();assert.deepEqual(after,before,'Avatar/message preferences and touch-target size are preserved at '+width);
   const radii=await p.evaluate(()=>Object.fromEntries(['#sidebar','.chat-main','.composer-shell','.send-btn','#contacts-list .contact'].map(s=>[s,getComputedStyle(document.querySelector(s)).borderRadius])));
   assert.equal(radii['.composer-shell'],'20px');assert(['15px','17px'].includes(radii['.send-btn']));assert.equal(radii['#contacts-list .contact'],'15px');assert.equal(radii['#sidebar'],width>720?'24px':'0px');
   for(const theme of ['','theme-light','theme-green']){
    await p.evaluate(theme=>{document.body.classList.remove('theme-light','theme-green');if(theme)document.body.classList.add(theme);},theme);
    assert(await p.locator('.composer-shell').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),'Composer fits '+width+' '+theme);
    assert(await p.locator('#chat-screen').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'No scene overflow');
    const input=await p.locator('#msg-input').evaluate(n=>getComputedStyle(n).backgroundColor);assert.equal(input,'rgba(0, 0, 0, 0)','No square input background above rounded shell');
   }
   await p.evaluate(()=>document.body.classList.remove('theme-light','theme-green'));
   await p.addScriptTag({content:read('interface-style-v200.js')});
   assert.equal(await p.evaluate(()=>exstraInterfaceV200.getState().mode),'clean','Original background remains the default');
   await p.evaluate(()=>exstraInterfaceV200.set('drawings'));
   assert((await p.locator('#messages').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('interface-doodles-v200.svg'));
   await p.evaluate(()=>{const n=document.getElementById('messages');n.classList.add('has-wallpaper-v119');n.style.setProperty('--wallpaper-photo-v119','url("https://photos.test/personal.webp")');});
   assert((await p.locator('#messages').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('photos.test/personal.webp'),'Personal photo wins over drawings');
   assert(!(await p.locator('#messages').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('interface-doodles'));
   await p.evaluate(()=>{document.getElementById('messages').classList.remove('has-wallpaper-v119');exstraInterfaceV200.set('clean');});
   assert(!(await p.locator('#messages').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('interface-doodles'));
   await p.evaluate(()=>{me={nick:'other'};dispatchEvent(new Event('telechat-account-ready-v175'));});
   assert.equal(await p.evaluate(()=>exstraInterfaceV200.getState().mode),'clean','New accounts also default to original background');
   await p.evaluate(()=>{me={nick:'creator'};dispatchEvent(new Event('telechat-account-ready-v175'));});
   assert.equal(await p.evaluate(()=>exstraInterfaceV200.getState().mode),'clean','Saved choice belongs to account');
   // Radius controls belong to the user, not the shared shell stylesheet.
   await p.addScriptTag({content:read('settings-navigation-v160.js')});await p.addScriptTag({content:read('chat-comfort-v167.js')});
   await p.evaluate(()=>openPanel('settings-panel'));await p.locator('[data-settings-section=appearance]').click();assert(await p.locator('[data-interface-choice-v200=drawings]').isVisible());await p.locator('[data-interface-choice-v200=drawings]').click();assert.equal(await p.evaluate(()=>exstraInterfaceV200.getState().mode),'drawings');
   await p.evaluate(()=>telechatSettingsV160.openSection('chats'));await p.locator('#chat-radius-v167').fill('8');await p.locator('#chat-radius-v167').dispatchEvent('input');
   assert.equal(await p.locator('.comfort-me-v167').first().evaluate(n=>getComputedStyle(n).borderRadius),'8px');
   await p.evaluate(async()=>{closeAllPanels();await openChat('friend0');});await p.waitForTimeout(230);assert(await p.locator('.composer-shell').isVisible());
   await p.screenshot({path:path.join(root,'outputs/rounded-interface-v200-'+width+'.png')});assert.deepEqual(errors,[]);await p.close();
  }
  const css=read('rounded-interface-v200.css');assert(!/animation:|transition:|filter:|overflow:|transform:/.test(css),'Static geometry/backgrounds only; no motion work or new clipping');
  assert(!/setInterval|setTimeout|MutationObserver|requestAnimationFrame|fetch\(/.test(read('interface-style-v200.js')),'No idle loops, DOM observers or network requests');
  const html=read('index.html');assert(html.includes('./rounded-interface-v200.css?v=200'));assert(read('sw.js').includes('./rounded-interface-v200.css?v=200'));
  console.log('PASS v200: moderate shared radii at 320/390/768/1440, dark/light/green, unchanged avatars/message preferences/touch targets, no overflow or new animation/clip work');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
