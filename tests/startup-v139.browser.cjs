const path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [390,1280]){
 const p=await b.newPage({viewport:{width,height:800}});await p.route('**/*',r=>r.fulfill({body:'<div id="emojiBg"></div><input id="calm-mode-v95">',contentType:'text/html'}));await p.goto('http://test.local');
 await p.evaluate(()=>{localStorage.setItem('telechat_calm_mode_v95','true');window.jobs=new Map();window.seq=0;window.setTimeout=fn=>{jobs.set(++seq,fn);return seq;};window.clearTimeout=id=>jobs.delete(id);});
 await p.addScriptTag({path:path.join(root,'cosmic-background-v27.js')});assert.equal(await p.locator('.cosmic-star-v27').count(),0);assert.equal(await p.evaluate(()=>jobs.size),0,'calm startup schedules no sky timers');
 await p.evaluate(()=>{localStorage.setItem('telechat_calm_mode_v95','false');document.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));});
 if(width===390){assert.equal(await p.evaluate(()=>jobs.size),0,'phone keeps decorations disabled');}else{assert.equal(await p.locator('.cosmic-star-v27').count(),44);assert.equal(await p.evaluate(()=>jobs.size),1);await p.evaluate(()=>dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));assert.equal(await p.evaluate(()=>jobs.size),0,'background stops timer');}
 await p.close();
 }
 const p=await b.newPage();await p.setContent('<div class="msg">'+ '<span>Текст</span>'.repeat(5000)+'</div><button>🎤</button>');
 await p.evaluate(()=>{window.visits=0;const original=document.createTreeWalker.bind(document);document.createTreeWalker=(root,what,filter)=>original(root,what,filter?{acceptNode(n){visits++;return filter.acceptNode(n);}}:filter);});
 for(const f of ['ui-symbols-v125.js','ui-icons-v125.js'])await p.addScriptTag({path:path.join(root,f)});
 assert.equal(await p.locator('button svg').count(),1);assert((await p.evaluate(()=>visits))<100,'icon traversal skips 5000 message descendants');
 await p.setContent('<div id="chat-screen"><div id="contacts-list" style="height:100px;overflow:hidden"><div style="height:500px"></div><video class="avatar-video" style="width:40px;height:40px"></video></div></div>');
 await p.evaluate(()=>{window.me={nick:'test'};window.renderContacts=async()=>{};window.delays=[];const timeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>{delays.push(ms);return timeout(fn,ms,...args);};});
 await p.addScriptTag({path:path.join(root,'chat-boot-v41.js')});await p.evaluate(()=>renderContacts());
 assert.deepEqual(await p.evaluate(()=>delays),[2600],'offscreen avatar must not delay startup, no forced intro sleeps');
 assert.equal(await p.locator('#chat-boot-v41.is-visible').count(),0);
 console.log('PASS startup CPU: no cosmic timers/stars on calm startup and phones, desktop effects restored, background suspension, pruned icon traversal, no offscreen media wait or artificial intro delay');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
