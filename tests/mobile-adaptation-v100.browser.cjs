const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();
    await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="chat-screen"><div class="sidebar"><div class="sidebar-top"></div><div class="contacts-list"></div></div><div class="chat-main"><div id="active-chat"><div class="messages"></div><div class="input-area"></div></div></div></div><div class="side-panel left v65-full-panel" id="profile-panel"><div class="panel-head"></div><section class="profile-editor-card"></section><div class="profile-action-dock"></div></div>`);
    await page.addStyleTag({path:path.join(root,'mobile-adaptation-v100.css')});
    await page.addScriptTag({path:path.join(root,'mobile-optimization-v100.js')});
    await page.waitForFunction(()=>document.body.classList.contains('telechat-mobile-v100'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).width),await page.evaluate(()=>document.documentElement.clientWidth+'px'));
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.chat-main')).opacity)<.1);
    await page.locator('.sidebar').evaluate(el=>el.classList.add('hidden'));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.chat-main')).opacity==='1');
    assert.equal(await page.locator('.chat-main').evaluate(el=>getComputedStyle(el).pointerEvents),'auto');
    await page.locator('#profile-panel').evaluate(el=>el.classList.add('open'));
    assert.equal(await page.locator('#profile-panel').evaluate(el=>el.getBoundingClientRect().width),390);
    await page.evaluate(()=>{const image=document.createElement('img');image.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';document.body.append(image);});
    await page.waitForFunction(()=>document.querySelector('img')?.loading==='lazy');
    await context.close();
    const desktop=await browser.newPage({viewport:{width:1280,height:900}});
    await desktop.setContent(`<div id="chat-screen"><div class="sidebar"><div class="sidebar-top"></div></div><div class="chat-main"><div id="active-chat"></div></div></div>`);
    await desktop.addStyleTag({path:path.join(root,'mobile-adaptation-v100.css')});
    await desktop.addScriptTag({path:path.join(root,'mobile-optimization-v100.js')});
    assert.equal(await desktop.evaluate(()=>document.body.classList.contains('telechat-mobile-v100')),false);
    assert.equal(await desktop.locator('.chat-main').evaluate(el=>getComputedStyle(el).opacity),'1');
    console.log('mobile-adaptation-v100 browser ok');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
