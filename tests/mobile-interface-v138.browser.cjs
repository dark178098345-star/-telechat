const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,430,1280]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:width<900,hasTouch:width<900});
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.chat-header{display:flex}.chat-info{flex:1;min-width:0}.chat-header-actions{display:flex}#active-chat{display:flex;flex-direction:column}.messages{flex:1;overflow:auto}.voice-call-mini{display:none}.voice-call-mini.show{display:flex}#profile-panel{display:none}</style><div id="chat-screen"><div class="sidebar hidden"></div><div class="chat-main"><div id="active-chat"><div class="chat-header"><button class="back-btn">←</button><div class="chat-info"><div class="chat-name">Длинное имя собеседника</div></div><div class="chat-header-actions"><button class="hdr-btn">1</button><button class="hdr-btn">2</button><button class="hdr-btn">3</button></div></div><div class="messages"></div><div class="input-area"><textarea></textarea></div></div></div></div><aside id="voice-call-mini" class="voice-call-mini"><span class="voice-call-mini-copy">Звонок</span><button class="voice-call-mini-return">↗</button><button class="voice-call-mini-end">×</button></aside><section id="profile-panel"><div id="prof-av-prev">Фото</div><div id="profile-banner-preview">Баннер</div><input id="avatar-file-input" type="file"><input id="avatar-video-input" type="file"><input id="banner-file-input" type="file"><input id="banner-video-input" type="file"></section><div id="view-profile-avatar">Чужой профиль</div>`);
 for(const file of ['mobile-adaptation-v100.css','voice-calls-v32.css','mobile-interface-v138.css'])await page.addStyleTag({path:path.join(root,file)});
 await page.evaluate(()=>{window.me={nick:'me'};window.viewedProfileNickV5='other';});
 for(const file of ['mobile-optimization-v100.js','mobile-interface-v138.js'])await page.addScriptTag({path:path.join(root,file)});
 if(width<900){
 await page.waitForFunction(()=>document.body.classList.contains('telechat-mobile-v100'));
 await page.evaluate(()=>document.querySelector('#voice-call-mini').classList.add('show'));
 await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.querySelector('.back-btn').getBoundingClientRect().top>=document.querySelector('#voice-call-mini').getBoundingClientRect().bottom),'call strip cannot cover back button at '+width);
 assert(await page.evaluate(()=>document.querySelector('.chat-header').scrollWidth<=innerWidth),'header fits '+width);
 await page.evaluate(()=>document.body.style.setProperty('--v100-height','400px'));
 assert.equal(await page.locator('#active-chat').evaluate(e=>e.getBoundingClientRect().height),336,'keyboard height reserves call strip');
 await page.evaluate(()=>document.querySelector('#voice-call-mini').classList.remove('show'));
 assert.equal(await page.locator('#active-chat').evaluate(e=>e.getBoundingClientRect().height),400,'call end releases space');
 await page.evaluate(()=>document.querySelector('#profile-panel').style.display='block');
 await page.locator('#prof-av-prev').dispatchEvent('click');assert.equal(await page.locator('#mobile-media-v138').getAttribute('open'),'');
 const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('[data-media="file"]').click()]);assert.equal(await chooser.element().getAttribute('id'),'avatar-file-input');
 await page.locator('#profile-banner-preview').dispatchEvent('click');const [video]=await Promise.all([page.waitForEvent('filechooser'),page.locator('[data-media="video"]').click()]);assert.equal(await video.element().getAttribute('id'),'banner-video-input');
 await page.locator('#view-profile-avatar').dispatchEvent('click');assert.equal(await page.locator('dialog[open]').count(),0,'another user photo is not editable');
 }else{assert.equal(await page.locator('#prof-av-prev').getAttribute('role'),null);await page.locator('#prof-av-prev').dispatchEvent('click');assert.equal(await page.locator('dialog').count(),0,'desktop behavior untouched');}
 await page.close();
 }
 console.log('PASS mobile UI: 320/390/430 and desktop, call/back separation, keyboard, call cleanup, direct photo/video picker, other-user guard, desktop isolation');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
