const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:390,height:760}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><div id="messages"><div class="msg them" data-id="1"><div class="msg-bubble">Вот это обновление!</div><div class="msg-meta">16:24</div></div></div><div class="ctx-menu" id="ctx-menu"></div>'}));
  await p.goto('http://telechat.test');
  const index=read('index.html');
  for(const match of index.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))await p.addStyleTag({content:match[1]});
  for(const match of index.matchAll(/<link[^>]+href="\.\/([^"?]+\.css)(?:\?[^" ]*)?"/g))await p.addStyleTag({content:read(match[1])});
  await p.addStyleTag({content:'body{height:100vh;overflow:auto}#messages{height:auto;padding:24px 18px}.msg{max-width:100%}'});
  await p.evaluate(()=>{
   Object.assign(window,{
    me:{nick:'me'},active:'a',conversationKey:()=>active,ctxMsg:null,pinnedMsgId:null,
    showCtxMenu(){},ctxPin(){},loadPinned(){},unpinMsg(){},ctxDelete(){},appendMessage:async()=>{},renderMessages:async()=>{},
    row:{id:1,from_nick:'friend',text:'Вот это обновление!'},serverRows:[{message_id:1,user_nick:'friend',emoji:'❤️'}],writes:[],toasts:[],showToast:m=>toasts.push(m),failRead:false,
    sb:{from:()=>({select(){return this},in(field,ids){return failRead?Promise.reject(Error('offline')):Promise.resolve({data:serverRows.filter(r=>ids.includes(r.message_id)).map(r=>({...r}))});},delete(){this.remove=true;this.filters={};return this},eq(k,v){this.filters[k]=v;return this},upsert(row){this.row=row;return this},then(resolve,reject){const op=this;writes.push({finish(error,throwError=false){if(!error){const id=op.remove?op.filters.message_id:op.row.message_id;serverRows=serverRows.filter(r=>!(r.message_id===id&&r.user_nick==='me'));if(!op.remove)serverRows.push(op.row);}if(throwError)reject(Error(error));else resolve({error:error?{message:error}:null});}});}}),channel:()=>({on(){return this},subscribe(){return this}})}
   });
  });
  for(const f of ['reaction-art-v126.js','message-context-v36.js','ui-symbols-v125.js','ui-icons-v125.js'])await p.addScriptTag({content:read(f)});
  await p.evaluate(()=>telechatSyncVisibleMessagesV105([row]));
  await p.waitForSelector('.message-reaction-v36');
  const heart=p.locator('.message-reaction-v36[data-emoji-v36="❤️"]');
  await p.evaluate(()=>{window.originalMessage=document.querySelector('.msg');window.originalHeart=document.querySelector('.message-reaction-v36');window.originalIcon=originalHeart.querySelector('svg');});
  await heart.click();
  await p.waitForFunction(()=>writes.length===1);
  assert.equal(await heart.locator('.reaction-count-v126').textContent(),'2','optimistic count before database response');
  assert.equal(await heart.getAttribute('aria-pressed'),'true');
  assert(await heart.isDisabled());
  assert(await heart.locator('svg').evaluate(el=>el.getAnimations().length>0),'short animation on selection');
  await p.evaluate(()=>{originalHeart.click();showCtxMenu({clientX:370,clientY:150},row);});
  assert.equal(await p.locator('[data-reaction-v36]:disabled').count(),6,'one pending reaction per message');
  await p.evaluate(()=>telechatRefreshReactionsV36());
  assert.equal(await heart.locator('.reaction-count-v126').textContent(),'2','stale server snapshot preserves pending intent');
  assert.equal(await p.evaluate(()=>writes.length),1);
  await p.evaluate(()=>writes[0].finish());
  await p.waitForFunction(()=>!document.querySelector('.message-reaction-v36').disabled);
  await p.evaluate(()=>telechatRefreshReactionsV36());
  assert(await p.evaluate(()=>originalMessage===document.querySelector('.msg')&&originalHeart===document.querySelector('.message-reaction-v36')&&originalIcon===originalHeart.querySelector('svg')),'refresh preserves message, pill and icon nodes');
  await p.waitForTimeout(400);
  assert.equal(await heart.locator('svg').evaluate(el=>el.getAnimations().length),0,'no idle animation');
  assert.equal(await p.locator('[data-reaction-v36][aria-pressed=true]').getAttribute('data-reaction-v36'),'❤️');

  await p.evaluate(()=>showCtxMenu({clientX:370,clientY:180},row));
  await p.locator('[data-reaction-v36="🔥"]').click();
  await p.waitForFunction(()=>writes.length===2);
  assert.equal(await p.locator('.message-reaction-v36.mine').getAttribute('data-emoji-v36'),'🔥');
  await p.evaluate(()=>writes[1].finish('offline',true));
  await p.waitForFunction(()=>toasts.length===1);
  assert.equal(await p.locator('.message-reaction-v36.mine').getAttribute('data-emoji-v36'),'❤️','failed switch restores previous reaction');
  assert.equal(await p.locator('.message-reaction-v36:disabled').count(),0);
  await p.evaluate(()=>{failRead=true;});await p.evaluate(()=>telechatRefreshReactionsV36());
  assert.equal(await heart.locator('.reaction-count-v126').textContent(),'2','read failure keeps last good snapshot');
  await p.evaluate(()=>{failRead=false;});

  await heart.click();await p.waitForFunction(()=>writes.length===3);
  assert.equal(await heart.getAttribute('aria-pressed'),'false','second tap removes own reaction');
  assert.equal(await heart.locator('.reaction-count-v126').textContent(),'1');
  await p.evaluate(()=>writes[2].finish());await p.waitForFunction(()=>!document.querySelector('.message-reaction-v36').disabled);

  await p.emulateMedia({reducedMotion:'reduce'});
  await p.waitForTimeout(60);
  await heart.click();await p.waitForFunction(()=>writes.length===4);
  assert.deepEqual(await heart.locator('svg').evaluate(el=>el.getAnimations().map(a=>({type:a.constructor.name,name:a.animationName,property:a.transitionProperty,frames:a.effect.getKeyframes()}))),[],'respects reduced motion');
  await p.evaluate(()=>writes[3].finish());await p.waitForFunction(()=>!document.querySelector('.message-reaction-v36').disabled);
  await p.emulateMedia({reducedMotion:'no-preference'});

  await p.evaluate(async()=>{serverRows.push({message_id:1,user_nick:'intruder',emoji:'<img src=x onerror="window.injected=true">'});await telechatRefreshReactionsV36();});
  assert.equal(await p.locator('.msg-reactions-v36 img').count(),0,'untrusted reaction values never become markup');
  assert.equal(await p.evaluate(()=>window.injected),undefined);
  await p.evaluate(async()=>{serverRows=serverRows.filter(r=>r.user_nick!=='intruder');for(const [i,emoji] of ['🥰','😘','👍','🔥','😍'].entries())serverRows.push({message_id:1,user_nick:'user'+i,emoji});await telechatRefreshReactionsV36();telechatSystemIconsV125.refresh();});
  assert.equal(await p.locator('.message-reaction-v36 svg').count(),6);
  assert.equal(await p.locator('[data-reaction-v36] svg').count(),6,'shared icon decorator preserves custom reaction art');
  for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:760});await p.waitForTimeout(60);await p.evaluate(()=>showCtxMenu({clientX:innerWidth-3,clientY:150},row));await p.waitForTimeout(200);
   const bounds=await p.locator('#ctx-menu').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width,'picker fits width '+width);
   assert.equal(await p.locator('[data-reaction-v36]').count(),6);
   if(width===390){fs.mkdirSync(path.join(root,'outputs'),{recursive:true});await p.screenshot({path:path.join(root,'outputs','reactions-v126-mobile.png')});}
  }
  await p.evaluate(()=>{showCtxMenu({clientX:200,clientY:200},row);});await p.locator('[data-reaction-v36="🔥"]').click();await p.waitForFunction(()=>writes.length===5);
  await p.evaluate(()=>{active='b';document.querySelector('#messages').innerHTML='<div class="msg" data-id="2"><div class="msg-bubble">Другой чат</div></div>';sb.from=()=>({select(){return this},in(){return new Promise(resolve=>window.finishNewChatRead=resolve)}});telechatSyncVisibleMessagesV105([{id:2,from_nick:'other',text:'Другой чат'}]);});
  await p.waitForFunction(()=>typeof finishNewChatRead==='function');
  await p.evaluate(()=>writes[4].finish());await p.waitForTimeout(20);
  assert.equal(await p.locator('.message-reaction-v36').count(),0,'late write never decorates another chat');
  await p.evaluate(()=>finishNewChatRead({data:[{message_id:2,user_nick:'other',emoji:'👍'}]}));
  await p.waitForSelector('.message-reaction-v36');assert.equal(await p.locator('.message-reaction-v36').getAttribute('data-emoji-v36'),'👍','old write must not invalidate an in-flight refresh in the new chat');
  assert.deepEqual(errors,[]);
  console.log('PASS reactions: optimistic updates, duplicate guard, stale snapshots, rollback/offline, removal, stable DOM, bounded animation, reduced motion, safe SVG, 320/390/1280 layouts, chat switch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
