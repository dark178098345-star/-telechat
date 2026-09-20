const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<div id="messages"></div>');
  await p.addStyleTag({content:'body{background:#10101b;color:#eee;font:15px Arial;margin:20px}#messages{height:420px;overflow:auto;display:flex;flex-wrap:wrap;align-content:start;gap:12px}.msg{padding:10px;border-radius:20px;background:#242035}.tele-emoji-v127{cursor:pointer}'});
  for(const f of ['reactions-v126.css','tele-emoji-v127.css'])await p.addStyleTag({content:read(f)});
  await p.evaluate(()=>{
   window.key='a';window.conversationKey=()=>key;
   window.renderMessageContent=text=>{const el=document.createElement('span');el.textContent=text;return el.innerHTML;};
   window.appendMessage=async(m,scroll=true)=>{if(m.wait)await new Promise(resolve=>window.finishAppend=resolve);if(m.skip)return;const el=document.createElement('div');el.className='msg';el.dataset.id=m.id;el.innerHTML=renderMessageContent(m.text);document.querySelector('#messages').append(el);return el;};
  });
  for(const f of ['tele-emoji-art-v127.js','reaction-art-v126.js','tele-emoji-v127.js','emoji-animation-v128.js'])await p.addScriptTag({content:read(f)});
  await p.evaluate(async()=>{for(const [i,item] of telechatEmojiArtV127.all.entries())await appendMessage({id:i,text:item.emoji},false);});await p.waitForTimeout(70);
  assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'history must never autoplay');
  assert.equal(await p.locator('[data-emoji-motion]').count(),17);
  const modes=await p.locator('[data-emoji-motion]').evaluateAll(els=>els.map(el=>el.dataset.emojiMotion));assert.equal(new Set(modes).size,17);
  const signatures=[];
  for(const mode of modes){
   const result=await p.evaluate(mode=>{telechatEmojiMotionV128.stopAll();const svg=document.querySelector(`[data-emoji-motion="${mode}"]`);const ok=telechatEmojiMotionV128.animate(svg);const animations=svg.getAnimations({subtree:true}).filter(a=>a.constructor.name==='Animation');return {ok,parts:animations.map(a=>a.effect.target.dataset.emojiPart),frames:animations.map(a=>a.effect.getKeyframes()),bounded:animations.every(a=>{const t=a.effect.getTiming();return t.iterations<Infinity&&t.duration*t.iterations+t.delay<=1800;})};},mode);
   assert(result.ok&&result.parts.length,mode+' has a real animation');assert(result.bounded,mode+' is short and finite');signatures.push(JSON.stringify(result.frames));
   if(mode==='heart')assert.deepEqual(result.parts,['body']);
   if(mode==='rain')assert.equal(result.parts.filter(p=>p==='drop').length,3);
   if(mode==='fire')assert.deepEqual(result.parts,['flame','core']);
   if(mode==='sleep')assert(result.parts.includes('sleep'));
  }
  assert(new Set(signatures).size>=15,'semantic animations must not all be the same bounce');
  await p.waitForTimeout(1900);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'completed animations release all tracking');
  await p.evaluate(()=>{for(const svg of document.querySelectorAll('[data-emoji-motion]'))telechatEmojiMotionV128.animate(svg);});assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),8,'bounded simultaneous animation count');
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'Android background cancels active motion');
  assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.animate(document.querySelector('[data-emoji-motion=heart]'))),false);
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'returning to foreground never replays all history');
  await p.locator('.tele-emoji-v127[data-tele-emoji="❤️"]').click();assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),1,'message click dispatches semantic animation');
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>telechatEmojiMotionV128.info().active===0);await p.locator('.tele-emoji-v127[data-tele-emoji="❤️"]').click();assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0);await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(40);
  await p.evaluate(()=>{telechatEmojiMotionV128.animate(document.querySelector('[data-emoji-motion=heart]'));Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'hidden browser tab cancels immediately');await p.evaluate(()=>{delete document.hidden;});
  await p.evaluate(()=>{const svg=document.querySelector('[data-emoji-motion=rain]');telechatEmojiMotionV128.animate(svg);svg.closest('.msg').style.transform='translateY(1200px)';});await p.waitForFunction(()=>telechatEmojiMotionV128.info().active===0);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.animate(document.querySelector('[data-emoji-motion=rain]'))),false,'clipped and off-screen emoji do not start');await p.evaluate(()=>{document.querySelector('[data-emoji-motion=rain]').closest('.msg').style.transform='';});
  await p.evaluate(()=>{const svg=document.querySelector('[data-emoji-motion=joy]');telechatEmojiMotionV128.animate(svg);svg.closest('.msg').remove();});await p.waitForFunction(()=>telechatEmojiMotionV128.info().active===0);
  await p.evaluate(()=>{document.querySelector('#messages').replaceChildren();});
  await p.evaluate(async()=>{window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}}));await appendMessage({id:98,text:'🌧️'});window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}}));});await p.waitForTimeout(60);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'messages received in background never replay on resume');
  await p.evaluate(()=>appendMessage({id:99,text:'❤️'}));await p.waitForFunction(()=>telechatEmojiMotionV128.info().active===1);await p.evaluate(()=>telechatEmojiMotionV128.stopAll());
  await p.evaluate(()=>appendMessage({id:99,text:'❤️',skip:true}));await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'duplicate delivery cannot replay');
  await p.evaluate(()=>appendMessage({id:100,text:'😀 😀 😀 😀 😀 😀'}));await p.waitForFunction(()=>telechatEmojiMotionV128.info().active===4);await p.evaluate(()=>telechatEmojiMotionV128.stopAll());
  await p.evaluate(()=>{window.pending=appendMessage({id:101,text:'❤️',wait:true});key='b';finishAppend();});await p.evaluate(()=>pending);await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0,'late append after chat navigation does not animate');
  await p.evaluate(()=>{document.querySelector('#messages').replaceChildren();for(const emoji of ['❤️','🔥','🌧️','😴','😘','🌙']){const div=document.createElement('div');div.className='msg';div.innerHTML=renderMessageContent(emoji);document.querySelector('#messages').append(div);telechatEmojiMotionV128.animate(div);}});
  fs.mkdirSync(path.join(root,'outputs'),{recursive:true});await p.waitForTimeout(180);await p.screenshot({path:path.join(root,'outputs','emoji-motion-v128.png')});
  await p.waitForTimeout(1900);assert.equal(await p.evaluate(()=>telechatEmojiMotionV128.info().active),0);assert.deepEqual(errors,[]);
  console.log('PASS semantic emoji motion: 17 distinct modes, detail targets, finite duration, capped concurrency, history/new-message/duplicate handling, DOM removal, off-screen, native/browser background, reduced motion, chat switch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
