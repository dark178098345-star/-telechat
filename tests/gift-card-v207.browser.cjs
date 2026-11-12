const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [320,390,1440]){
  const {p,errors}=await fixture(browser,width,900,width<600);
  await p.evaluate(()=>{
   me.pass='fixture';userCache.creator=me;window.profileCalls=[];window.openUserProfile=async n=>profileCalls.push(n);
   window.cardFixture={writes:[],fail:false,balance:50000};
   const catalog=[{id:'nova_heart',name:'Сердце новы',price:50,theme:'rose',rarity:'common',limited:false},{id:'solar_dragon',name:'Солнечный дракон',price:4000,theme:'orange',rarity:'mythic',limited:false}];
   const received=[{id:87,owner_nick:'creator',sender_nick:'friend0',gift_id:'nova_heart',gift_name:'Сердце новы',theme:'rose',price:50,rarity:'common',limited:false,message:'Спасибо, что ты рядом. Это для тебя.',created_at:Date.UTC(2026,10,12)}];
   const from=sb.from.bind(sb);sb.from=table=>{if(table!=='user_gifts')return from(table);const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then(resolve,reject){return Promise.resolve({data:received,error:null}).then(resolve,reject);}};return q;};
   sb.rpc=async(name,args)=>{
    if(name!=='exstra_wallet_v197')return {data:{},error:null};
    if(args.p_action==='state')return {data:{balance:cardFixture.balance,unlimited:false,premium:false,forever:false,until:null,badge:'',history:[]},error:null};
    if(args.p_action==='catalog')return {data:{gifts:catalog},error:null};
    cardFixture.writes.push(structuredClone(args));return cardFixture.fail?{error:{message:'Тестовая ошибка соединения'}}:{data:{ok:true},error:null};
   };
  });
  for(const file of ['wallet-model-v197.js','gift-art-v198.js','wallet-recipients-v198.js','gift-card-v207.js','wallet-ui-v197.js'])await p.addScriptTag({content:read(file)});
  await p.evaluate(()=>exstraWalletUIV197.open({tab:'gifts',target:'friend0'}));
  const tile=p.locator('[data-wallet-gift=nova_heart]'),card=p.locator('#gift-card-v207');await tile.click();
  assert.equal(await card.locator('h2').textContent(),'Сердце новы');assert((await card.textContent()).includes('Максим'));
  assert.equal(await p.evaluate(()=>cardFixture.writes.length),0,'Preview never purchases or sends a gift');
  assert(await card.locator('[data-gift-card-art]').evaluate(n=>n.getBoundingClientRect().width>=170));
  assert(await card.evaluate(n=>n.scrollWidth<=n.clientWidth),'No horizontal overflow at '+width);
  assert.equal(await card.locator('svg [id^=exg207-card-]').count(),4,'Detail artwork has its own gradient namespace');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  assert(await p.locator('#exstra-wallet-v197').evaluate(n=>n.open));assert(await tile.evaluate(n=>n===document.activeElement),'Escape returns focus to the original gift');
  await p.locator('[data-gift-note]').fill('Спасибо, что рядом.');await tile.click();assert.equal(await card.locator('blockquote').textContent(),'Спасибо, что рядом.');
  await card.locator('[data-gift-card-action]').click();await p.locator('[data-confirm-no]').last().click();
  assert(await card.evaluate(n=>n.open));assert.equal(await p.evaluate(()=>cardFixture.writes.length),0,'Cancelling confirmation does not send');
  await card.locator('[data-gift-card-action]').click();await p.locator('[data-confirm-yes]').click();await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  assert.deepEqual(await p.evaluate(()=>cardFixture.writes[0].p_data),{gift:'nova_heart',target:'friend0',note:'Спасибо, что рядом.'});
  await p.evaluate(()=>cardFixture.fail=true);await tile.click();await card.locator('[data-gift-card-action]').click();await p.locator('[data-confirm-yes]').click();
  await p.waitForFunction(()=>document.querySelector('[data-gift-card-status]').textContent.includes('Тестовая ошибка'));
  assert(await card.evaluate(n=>n.open),'Failed send leaves the detail card open');await p.evaluate(()=>cardFixture.fail=false);
  await card.locator('[data-gift-card-action]').click();await p.locator('[data-confirm-yes]').click();await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  const retryIds=await p.evaluate(()=>cardFixture.writes.slice(1).map(v=>v.p_request));assert.equal(retryIds[0],retryIds[1],'Gift retry retains the wallet idempotency key');
  await p.evaluate(()=>exstraWalletUIV197.open({tab:'gifts',target:'creator',collection:true}));await p.locator('[data-owned-gift="87"]').click();
  assert.equal(await card.locator('[data-gift-card-subtitle]').textContent(),'Подарок №87');assert((await card.textContent()).includes('12 ноября 2026'));
  assert.equal(await card.locator('[data-gift-person=friend0]').textContent(),'ММаксим');assert((await card.textContent()).includes('50 Лун'));
  await card.screenshot({path:path.join(root,'outputs/gift-card-v207-dark-'+width+'.png')});
  await p.evaluate(()=>document.body.classList.add('theme-light'));await p.waitForTimeout(200);
  await card.screenshot({path:path.join(root,'outputs/gift-card-v207-light-'+width+'.png')});
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await card.evaluate(n=>getComputedStyle(n).animationName),'none');
  await card.locator('[data-gift-person=friend0]').click();await p.waitForFunction(()=>profileCalls.length===1);assert.deepEqual(await p.evaluate(()=>profileCalls),['friend0']);
  assert(!(await p.locator('#exstra-wallet-v197').evaluate(n=>n.open)));
  await p.evaluate(()=>exstraWalletUIV197.open({tab:'gifts'}));await p.locator('[data-gift-target]').fill('');await tile.click();
  assert.equal(await card.locator('[data-gift-card-action]').textContent(),'Выбрать получателя');await card.locator('[data-gift-card-action]').click();await p.waitForTimeout(50);
  assert(await p.locator('[data-gift-target]').evaluate(n=>n===document.activeElement),'Recipient action returns to the editable field');
  await p.evaluate(()=>exstraGiftCardV207.open({id:99,gift_id:'unknown',gift_name:'<img src=x>',message:'<img src=x onerror="window.giftXss=1">',sender_nick:'friend0',created_at:'invalid'},{owned:true,ownerNick:'creator',host:document.getElementById('exstra-wallet-v197')}));
  assert.equal(await card.locator('h2 img,blockquote img,script').count(),0);assert.equal(await p.evaluate(()=>window.giftXss),undefined);assert.equal(await card.locator('[data-gift-art-v198=fallback]').count(),1);
  await p.setViewportSize({width,height:580});await p.waitForTimeout(120);const short=await card.evaluate(n=>({height:n.getBoundingClientRect().height,max:getComputedStyle(n).maxHeight,viewport:innerHeight}));assert(short.height<=short.viewport-18,JSON.stringify(short));assert(await card.evaluate(n=>n.scrollWidth<=n.clientWidth));await card.locator('[data-gift-card-action]').click();
  await p.evaluate(()=>{window.userResolvers={};getUser=name=>new Promise(resolve=>userResolvers[name]=resolve);exstraGiftCardV207.open({id:1,gift_id:'nova_heart',gift_name:'Старая карточка',sender_nick:'remote_old'},{owned:true,ownerNick:'creator',host:document.getElementById('exstra-wallet-v197')});});
  await p.waitForFunction(()=>userResolvers.remote_old);
  await p.evaluate(()=>{exstraGiftCardV207.open({id:2,gift_id:'solar_dragon',gift_name:'Новая карточка',sender_nick:'friend1'},{owned:true,ownerNick:'creator',host:document.getElementById('exstra-wallet-v197')});userResolvers.remote_old({nick:'remote_old',name:'Устаревший ответ'});});await p.waitForTimeout(70);
  assert.equal(await card.locator('h2').textContent(),'Новая карточка');assert(!(await card.textContent()).includes('Устаревший ответ'));
  await p.evaluate(()=>{exstraGiftCardV207.close();exstraGiftCardV207.open({id:3,gift_id:'nova_heart',gift_name:'Открыта заново'},{owned:true,ownerNick:'creator',host:document.getElementById('exstra-wallet-v197')});});await p.waitForTimeout(60);assert.equal(await card.locator('h2').textContent(),'Открыта заново');await card.locator('[data-gift-card-action]').click();await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  await p.evaluate(()=>{window.getAvatarPhoto=user=>user?.nick==='friend0'?'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4RcAAAAASUVORK5CYII=':'';exstraGiftCardV207.open({id:4,gift_id:'nova_heart',gift_name:'Подарок с аватаркой',sender_nick:'friend0'},{owned:true,ownerNick:'creator',host:document.getElementById('exstra-wallet-v197')});});assert.equal(await card.locator('[data-gift-person=friend0] img').count(),1);assert.equal(await card.locator('video').count(),0,'Card uses a static photo, never a video avatar');
  if(width===1440){
   await card.locator('[data-gift-card-action]').click();
   await p.evaluate(()=>{const original=sb.from.bind(sb);let serial=0;sb.from=table=>{if(table!=='user_gifts')return original(table);const id=++serial;const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then(resolve,reject){return (id===1?new Promise(r=>window.releaseOldCollection=r):Promise.resolve({data:[{id:88,owner_nick:'creator',sender_nick:'friend1',gift_id:'solar_dragon',gift_name:'Свежий подарок'}]})).then(resolve,reject);}};return q;};});
   await p.locator('[data-gift-mode=collection]').click();await p.waitForFunction(()=>window.releaseOldCollection);
   await p.locator('[data-gift-mode=collection]').click();await p.waitForSelector('[data-owned-gift="88"]');
   await p.evaluate(()=>releaseOldCollection({data:[{id:77,gift_id:'nova_heart',gift_name:'Старый снимок'}]}));await p.waitForTimeout(70);
   assert.equal(await p.locator('[data-owned-gift="88"]').count(),1);assert.equal(await p.locator('[data-owned-gift="77"]').count(),0,'Late collection read cannot replace a newer collection in the same wallet');
   await p.locator('[data-owned-gift="88"]').click();
  }
  await p.evaluate(()=>{me={nick:'other',pass:'fixture'};dispatchEvent(new Event('telechat-account-ready-v175'));});await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open);
  assert(!(await p.locator('#exstra-wallet-v197').evaluate(n=>n.open)));assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS v207 gift cards: catalog/owned details, safe artwork, real metadata, avatars, explicit confirmation, failed-send retry nonce, focus/Escape/profile, recipient choice, XSS fallback, stale-user/account guards, reduced motion, 320/390/1440 dark/light and short screens.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
