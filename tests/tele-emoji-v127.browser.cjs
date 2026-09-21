const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:{width:mobile?390:1200,height:850},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="messages"></div><textarea id="msg-input"></textarea><div class="emoji-picker" id="emoji-picker"></div>'}));await p.goto('http://telechat.test');
   const index=read('index.html');for(const m of index.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))await p.addStyleTag({content:m[1]});for(const m of index.matchAll(/<link[^>]+href="\.\/([^"?]+\.css)(?:\?[^" ]*)?"/g))await p.addStyleTag({content:read(m[1])});
   await p.addStyleTag({content:'body{height:100vh}#messages{height:260px;padding:24px;display:block}#msg-input{position:fixed;top:270px;left:24px;width:calc(100% - 48px);height:54px;background:#222032;color:white;border:1px solid #786297;border-radius:14px;padding:12px}'});
   await p.evaluate(mobile=>{if(mobile)document.body.classList.add('telechat-mobile-v100','telechat-mobile-v79');window.renderMessageContent=text=>{const el=document.createElement('span');el.textContent=text;return el.innerHTML;};window.inputEvents=0;document.querySelector('#msg-input').addEventListener('input',()=>inputEvents++);},mobile);
   for(const f of ['tele-emoji-art-v127.js','reaction-art-v126.js','ui-symbols-v125.js','emoji-motion-v80.js','ui-icons-v125.js','tele-emoji-v127.js'])await p.addScriptTag({content:read(f)});
   assert.equal(await p.locator('.emoji-item-v80[data-tele-emoji]').count(),17,'own set is the default on every device');
   assert.equal(await p.locator('.emoji-item-v80 svg').count(),17);assert.equal(await p.locator('.emoji-category-v80:not([data-category=telechat]) .ui-icon-v125').count(),11);
   assert.equal(await p.evaluate(()=>document.body.classList.contains('telechat-motion-v80')),!mobile,'desktop motion observer is not enabled on phones');
   await p.evaluate(()=>{toggleEmojiPicker({stopPropagation(){}});const input=document.querySelector('#msg-input');input.value='Привет друг';input.focus();input.setSelectionRange(7,11);});
   await p.getByRole('button',{name:'Вставить Радость',exact:true}).click();
   assert.equal(await p.locator('#msg-input').inputValue(),'Привет 😀','insert at selection without storing custom markup');assert.equal(await p.evaluate(()=>inputEvents),1);
   assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('telechat-emoji-recent-v80'))[0]),'😀');
   if(mobile)assert.equal(await p.locator('#emoji-picker').evaluate(el=>el.classList.contains('open')),false);
   await p.evaluate(()=>document.querySelector('#emoji-picker').classList.add('open'));
   await p.locator('.emoji-search-v80').fill('обнимаю');assert.equal(await p.locator('.emoji-item-v80').count(),1);assert.equal(await p.locator('.emoji-item-v80').getAttribute('data-tele-emoji'),'🥰');
   await p.getByRole('tab',{name:'Эмоции',exact:true}).click();assert((await p.locator('.emoji-item-v80').count())>100,'original emoji catalog preserved');
   await p.getByRole('tab',{name:'Недавние',exact:true}).click();assert.equal(await p.locator('.emoji-item-v80').count(),1);
   await p.getByRole('tab',{name:'Наши смайлики',exact:true}).click();
   await p.evaluate(()=>{for(let i=0;i<30;i++)buildEmojiPicker();});assert.equal(await p.locator('.emoji-item-v80[data-tele-emoji]').count(),17,'mounting is idempotent');
   const sample='Привет 😀! 👍🏽 ❤️‍🔥 🐸 <script>alert(1)</script>';
   await p.evaluate(text=>{document.querySelector('#messages').innerHTML='<div class="msg"><div class="msg-bubble">'+renderMessageContent(text)+'</div></div>';},sample);
   assert.equal(await p.locator('.msg-bubble').textContent(),sample,'semantic message text is retained exactly');assert.equal(await p.locator('.msg-bubble .tele-emoji-v127').count(),1,'modified/ZWJ and unsupported emoji remain whole');assert.equal(await p.locator('.msg-bubble script').count(),0,'user HTML stays escaped');
   await p.evaluate(()=>{document.querySelector('#messages').innerHTML='<div class="msg"><div class="msg-bubble">'+renderMessageContent('😀 ❤️ 🌙')+'</div></div>';});
   assert.equal(await p.locator('.tele-emoji-run-v127').count(),1);assert.equal(await p.locator('.msg .tele-emoji-v127').count(),3);
   await p.evaluate(()=>{const el=document.querySelector('.msg-bubble');el.innerHTML=telechatEmojiV127.decorate(el.innerHTML);});assert.equal(await p.locator('.tele-emoji-run-v127').count(),1,'rendering already decorated content is idempotent');
   assert.equal(await p.evaluate(()=>telechatEmojiV127.decorate('<a href="https://example.test/😀">😀</a><code>😀</code>')), '<a href="https://example.test/😀">😀</a><code>😀</code>','links and code are untouched');
   assert.equal(await p.evaluate(()=>telechatEmojiV127.decorate('<code>😀</code>')), '<code>😀</code>','code-only content is not enlarged');
   await p.locator('.msg .tele-emoji-v127').first().click();assert.equal(await p.locator('.msg .tele-emoji-v127 svg').first().evaluate(el=>el.getAnimations().filter(a=>a.constructor.name==='Animation').length),0,'message emoji no longer requires or starts motion on tap');
   await p.waitForTimeout(450);assert.equal(await p.locator('.msg .tele-emoji-v127 svg').first().evaluate(el=>el.getAnimations().filter(a=>a.constructor.name==='Animation').length),0,'no looping emoji animation');
   await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(30);await p.locator('.msg .tele-emoji-v127').first().click();assert.equal(await p.locator('.msg .tele-emoji-v127 svg').first().evaluate(el=>el.getAnimations().filter(a=>a.constructor.name==='Animation').length),0);await p.emulateMedia({reducedMotion:'no-preference'});
   assert(await p.evaluate(()=>telechatReactionArtV126.info('❤️').html.includes('tele-emoji-art-v127')),'reactions use the same art pack');
   await p.evaluate(()=>{telechatSystemIconsV125.refresh();document.querySelector('#emoji-picker').classList.add('open');});
   for(const width of mobile?[320,390]:[1200]){await p.setViewportSize({width,height:850});await p.waitForTimeout(120);const rect=await p.locator('#emoji-picker').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width,'picker inside viewport');const buttons=await p.locator('.emoji-item-v80').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));for(let i=1;i<buttons.length;i++){if(buttons[i].y===buttons[i-1].y)assert(buttons[i].x>=buttons[i-1].x+buttons[i-1].w-1,'buttons never overlap');}}
   fs.mkdirSync(path.join(root,'outputs'),{recursive:true});await p.screenshot({path:path.join(root,'outputs',`tele-emoji-v127-${mobile?'mobile':'desktop'}.png`)});
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS custom emoji: 17 original assets, desktop/mobile picker, cursor insertion, input events, search, recents, old catalog, safe Unicode rendering, ZWJ/skin tones, semantic text, idempotence, tap/reduced-motion, shared reaction art, layouts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
