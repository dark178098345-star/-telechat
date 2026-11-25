'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const titles={
 party_sparkler:'Бенгальская искра',glass_butterfly:'Стеклянная бабочка',polar_lantern:'Полярный фонарь',
 velvet_planet:'Бархатная планета',wish_bottle:'Бутылочка желаний',aurora_jelly:'Медуза сияния'
};
const themes=['amber','rose','cyan','violet','blue','green'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,1440]){
   const p=await browser.newPage({viewport:{width,height:780},reducedMotion:'no-preference'});
   const errors=[];p.on('pageerror',error=>errors.push(error.message));
   await p.setContent('<style>body{background:#11121d;color:#fff}'+read('wallet-v197.css')+read('gift-card-v207.css')+'</style>');
   await p.evaluate(()=>{window.sendCount=0;window.exstraWalletV197={owner:()=> 'creator'};});
   for(const f of ['ui-symbols-v125.js','mesh-art-v229.js','gift-art-v198.js','gift-card-v207.js'])await p.addScriptTag({content:read(f)});
   const card=p.locator('#gift-card-v207');
   let featuredIndex=0;const scenes=new Set(),durations=new Set();
   for(const [id,name] of Object.entries(titles)){
    await p.evaluate(data=>window.exstraGiftCardV207.open(data,{recipient:'friend',onSend:()=>{sendCount++;}}),{id,name,theme:themes[featuredIndex++],rarity:'limited',price:2500,limited:true,available_until:Date.now()+3600000});
    const info=await card.evaluate(n=>{
     const stage=n.querySelector('.ex-gift-stage-v207'),node=n.querySelector('[data-gift-card-art]'),animation=node.getAnimations()[0];
     return {scene:stage.dataset.giftScene,count:stage.querySelectorAll('[data-gift-card-fx] i').length,parts:node.querySelectorAll('[data-gift-part-v233]').length,duration:animation.effect.getTiming().duration,fit:n.scrollWidth<=n.clientWidth};
    });
    scenes.add(info.scene);durations.add(info.duration);
    assert(info.duration>=9900&&info.duration<13200);assert(info.count>=6&&info.count<=8);assert(info.fit);
    if(id==='glass_butterfly'||id==='aurora_jelly')assert.equal(info.parts,2);
    assert.equal(await card.locator('h2').textContent(),name);
    await card.locator('[data-gift-card-turn]').click();
    assert.equal(await card.locator('[data-gift-card-fx] i').count(),0,'Manual viewpoint stays put');
    await card.locator('[data-gift-card-replay]').click();
    assert((await card.locator('[data-gift-card-fx] i').count())>=6);
    await p.keyboard.press('Escape');
    await p.waitForFunction(()=>!document.getElementById('gift-card-v207').open&&document.querySelector('[data-gift-card-fx]').childElementCount===0);
   }
   assert.equal(scenes.size,6);assert.equal(durations.size,6);
   const g={id:'glass_butterfly',name:titles.glass_butterfly,theme:'rose',rarity:'limited',price:2500,limited:true,available_until:Date.now()+3600000};
   if(process.env.EXSTRA_GIFT_CARD_CAPTURE==='1'){
    await p.evaluate(g=>exstraGiftCardV207.open(g,{recipient:'friend'}),g);
    await p.waitForTimeout(1100);await card.screenshot({path:path.join(root,'outputs','gift-card-v233-butterfly-'+width+'.png')});
   }
   await p.emulateMedia({reducedMotion:'reduce'});
   await p.evaluate(g=>exstraGiftCardV207.open(g,{recipient:'friend',onSend:()=>{sendCount++;}}),g);
   assert.equal(await card.locator('[data-gift-card-fx] i').count(),0);
   assert(!(await card.locator('[data-gift-card-replay]').isVisible()));
   assert(await card.locator('[data-gift-card-turn]').isVisible());
   await p.evaluate(()=>{const actual=Date.now;Date.now=()=>actual()+7200000;});
   await card.locator('[data-gift-card-action]').click();
   assert.equal(await card.locator('[data-gift-card-action]').textContent(),'Коллекция закрыта');
   assert.equal(await p.evaluate(()=>sendCount),0,'no expired gift can be sent from a card left open');
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS festive gift card: six distinct finite scenes, moving wings and tentacles, replay, rotation, motion policy, expired action, phone and desktop.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
