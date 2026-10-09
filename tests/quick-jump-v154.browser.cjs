const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
 let html=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');html=html.replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,file)=>file.endsWith('.css')?'<style>'+read(file)+'</style>':'');await page.setContent(html);
 await page.evaluate(()=>{
  document.getElementById('startup-loader').remove();document.getElementById('auth-screen').classList.remove('active');document.getElementById('chat-screen').classList.add('active');
  window.me={nick:'alice'};window.chosen=[];window.toast=[];window.showToast=text=>toast.push(text);window.network=0;window.fetch=()=>{network++;throw Error('Unexpected network');};
  const sidebar=document.getElementById('sidebar'),rail=document.createElement('nav');rail.className='section-rail-v109';sidebar.prepend(rail);
  const list=document.getElementById('contacts-list');for(const [nick,name] of [['bob','Максим'],['eve','<img src=x onerror=alert(1)>']]){const row=document.createElement('div');row.className='contact';row.dataset.contactNick=nick;const label=document.createElement('div');label.className='contact-name';label.textContent=name;row.append(label);row.onclick=()=>chosen.push(nick);list.append(row);}
  window.telechatMusicHubV117={open:()=>chosen.push('music')};window.previewMyProfile=()=>chosen.push('profile');window.telechatActivityV124={open:()=>chosen.push('stats')};window.telechatQrV131={open:()=>chosen.push('qr')};window.telechatNavigate=target=>chosen.push(target);
  document.getElementById('msg-input').value='Не теряй мой черновик';
 });
 await page.addScriptTag({content:read('ui-symbols-v125.js')});await page.addScriptTag({content:read('quick-jump-v154.js')});
 assert.equal(await page.locator('#quick-jump-v154').count(),0,'No eager dialog creation');
 await page.keyboard.press('Control+k');const dialog=page.locator('#quick-jump-v154'),input=dialog.locator('input');assert(await dialog.isVisible());assert.equal(await page.locator('.qj-item-v154').count(),7);
 await input.fill('vepsrf');assert.equal(await page.locator('.qj-item-v154 strong').textContent(),'Музыка','Keyboard layout correction');await input.press('Enter');assert.deepEqual(await page.evaluate(()=>chosen),['music']);
 await page.locator('.quick-jump-trigger-v154').click();await input.fill('макс');await input.press('Enter');assert.deepEqual(await page.evaluate(()=>chosen),['music','bob']);assert.equal(await page.locator('#msg-input').inputValue(),'Не теряй мой черновик');
 await page.locator('.quick-jump-trigger-v154').click();await input.fill('onerror');assert.equal(await page.locator('.qj-item-v154 img').count(),0,'Names remain text');await input.fill('нет такого чата');assert(await page.locator('.qj-empty-v154').isVisible());await input.press('Enter');assert(await dialog.isVisible());await input.press('Escape');assert(!(await dialog.isVisible()));
 for(const theme of ['', 'theme-light','theme-green'])for(const [width,height] of [[320,620],[390,800],[740,360],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(theme=>{document.body.classList.remove('theme-light','theme-green');if(theme)document.body.classList.add(theme);document.body.classList.toggle('telechat-mobile-v100',innerWidth<=720);},theme);
  await page.locator('.quick-jump-trigger-v154').click();await page.waitForTimeout(220);
  assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'Responsive bounds '+width+' '+theme);
  await input.fill('стат');await input.press('ArrowDown');await input.press('Enter');assert.equal(await page.evaluate(()=>chosen.at(-1)),'stats');
 }
 await page.setViewportSize({width:390,height:800});await page.locator('.quick-jump-trigger-v154').click();await page.waitForTimeout(250);await page.screenshot({path:path.join(root,'outputs/quick-jump-v154-phone.png')});await input.press('Escape');
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.body.classList.remove('theme-green'));await page.locator('.quick-jump-trigger-v154').click();await page.waitForTimeout(250);assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)<2;}),'Dialog is centered');await page.screenshot({path:path.join(root,'outputs/quick-jump-v154-desktop.png')});
 await page.evaluate(()=>{me={nick:'other'};document.getElementById('chat-screen').classList.remove('active');});assert(!(await dialog.isVisible()),'Account exit closes dialog');assert.equal(await page.evaluate(()=>network),0);assert.deepEqual(errors,[]);
 console.log('PASS v154: keyboard navigation, wrong layout, chat/section actions, preserved draft, safe names, empty result, account exit, lazy/no-network operation and dark/light/green 320–1440px');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
