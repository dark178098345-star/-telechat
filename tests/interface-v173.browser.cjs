const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,720,1024,1440,1920]){
  const {p,errors}=await fixture(b,width,900,width<=720);
  await p.evaluate(()=>{window.setSidebarFilter=(filter,button)=>{document.querySelectorAll('.sidebar-tab').forEach(n=>n.classList.toggle('active',n===button));};});
  for(const f of ['navigation-readers-v109.js','settings-navigation-v160.js','chat-comfort-v167.js'])await p.addScriptTag({content:read(f)});
  await p.waitForTimeout(80);assert(await p.locator('#sidebar').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Sidebar fits '+width);
  await p.screenshot({path:path.join(root,`outputs/interface-v173-list-${width}.png`)});
  await p.evaluate(async()=>{await openChat('friend0');setAvatarElement(document.getElementById('chat-av'),userCache.friend0);});
  await p.evaluate(()=>{document.querySelector('.contact').classList.add('active');const box=document.getElementById('messages');box.innerHTML='';const rows=[['them','Привет! Как тебе новая версия?','12:30'],['me','Стало спокойнее. Всё выглядит как одно приложение.','12:31'],['them','И на телефоне удобно — кнопки под рукой.','12:31'],['me','Вечером включим музыку вместе?','12:32'],['them','Да, напиши, когда освободишься.','12:32']];for(const [type,text,time] of rows){const n=document.createElement('div');n.className='msg '+type;n.innerHTML='<div class="msg-bubble"></div><div class="msg-meta"><span class="msg-time">'+time+'</span></div>';n.querySelector('.msg-bubble').textContent=text;box.append(n);}});
  await p.waitForFunction(()=>Math.abs(document.querySelector('.chat-main').getBoundingClientRect().right-innerWidth)<2);
  await p.waitForFunction(()=>{const r=document.getElementById('input-area').getBoundingClientRect();return r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&r.left>=-1});
  const bounds=await p.locator('#input-area').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,classes:document.body.className,chat:document.querySelector('.chat-main').getBoundingClientRect().toJSON()}});assert(bounds.bottom<=bounds.h+1&&bounds.right<=bounds.w+1&&bounds.left>=-1,'Composer fits '+width+' '+JSON.stringify(bounds));
  assert(await p.locator('.chat-header').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Header fits '+width);
  assert(await p.locator('#messages').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Messages fit '+width);
  assert.equal(await p.locator('.chat-main').evaluate(n=>getComputedStyle(n).backdropFilter),'none');
  await p.screenshot({path:path.join(root,`outputs/interface-v173-chat-${width}.png`)});
  assert(await p.locator('#messages').evaluate(n=>{n.classList.add('has-wallpaper-v119');n.style.setProperty('--wallpaper-photo-v119','url("https://wallpaper.test/personal.jpg")');const kept=getComputedStyle(n).backgroundImage.includes('personal.jpg');n.classList.remove('has-wallpaper-v119');n.style.removeProperty('--wallpaper-photo-v119');return kept;}),'Personal wallpaper is not replaced by the default background');
  await p.evaluate(()=>openPanel('settings-panel'));assert(await p.locator('#settings-home-v160').isVisible());assert(await p.locator('#settings-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
  await p.screenshot({path:path.join(root,`outputs/interface-v173-settings-${width}.png`)});
  await p.locator('[data-settings-section=chats]').click();await p.locator('[data-chat-color=teal]').click();await p.evaluate(()=>closeAllPanels());assert.equal(await p.locator('.msg.me>.msg-bubble').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(36, 116, 108)','Custom message colour is retained');
  for(const theme of ['light','green']){await p.evaluate(t=>{document.body.classList.remove('theme-light','theme-green');document.body.classList.add('theme-'+t);},theme);await p.waitForTimeout(250);assert(await p.locator('#messages').evaluate(n=>n.scrollWidth<=n.clientWidth+1));if([390,1440].includes(width))await p.screenshot({path:path.join(root,`outputs/interface-v173-${theme}-${width}.png`)});}
  assert.deepEqual(errors,[],'No page errors '+width);await p.close();
 }
 console.log('PASS v173 interface: 320–1920px list/chat/settings, no overflow, solid surfaces, custom message colour/wallpaper, light/green themes, no new JS runtime');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
