'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const layer='.profile-gift-orbit-v233',satellite='.profile-gift-satellite-v233',glint='.profile-gift-glint-v233';

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [390,1440]){
   const {p,errors}=await fixture(browser,width,700,width<600);
   await p.addStyleTag({content:read('profile-gift-orbit-v233.css')});
   await p.evaluate(()=>{
    window.giftQueries=[];
    const gifts=[
     {gift_id:'first_moon',limited:true,theme:'amber'},
     {gift_id:'first_moon',limited:true,theme:'amber'},
     {gift_id:'aurora_core',limited:true,theme:'violet'},
     {gift_id:'nova_heart',limited:false,theme:'rose'},
     {gift_id:'dream_portal',limited:true,theme:'cyan'},
     {gift_id:'royal_satellite',limited:true,theme:'indigo'},
     {gift_id:'black_comet',owner_nick:'someone_else',limited:true,theme:'black'}
    ];
    const mockFrom=sb.from.bind(sb);
    sb.from=(table)=>{
     if(table!=='user_gifts')return mockFrom(table);
     const item={filters:{},sort:[]};
     const q={select(fields){item.fields=fields;return q;},eq(k,v){item.filters[k]=v;return q;},
      order(...v){item.sort.push(v);return q;},limit(n){item.limit=n;return q;},abortSignal(signal){item.signal=signal;return q;},
      then(resolve,reject){
       giftQueries.push(item);
       const target=item.filters.owner_nick;
       const data=target==='rare'?gifts.map(g=>({owner_nick:target,...g})):
        target==='slow'?[{owner_nick:target,gift_id:'black_comet',limited:true,theme:'black'}]:[];
       return new Promise(done=>setTimeout(()=>done({data,error:null}),target==='slow'?260:10)).then(resolve,reject);
      }};
     return q;
    };
    window.showRareFixture=(nick,{busy=false}={})=>{
     const modal=document.querySelector('#user-profile-modal'),card=modal.querySelector('.user-profile-card');
     card.setAttribute('aria-busy',String(busy));card.querySelector('.user-profile-body').inert=busy;
     modal.querySelector('.user-profile-name').textContent=nick==='rare'?'Звёздное небо':nick;
     modal.querySelector('.user-profile-nick').textContent='@'+nick;
     modal.querySelector('#view-profile-avatar').innerHTML=avatarMarkup({av:0});
     if(nick==='rare')modal.querySelector('#view-profile-bio').textContent=Array(20).fill('Небольшие вещи, которые греют.').join(' ');
     exstraProfileGiftOrbitV233.profile({nick});
     modal.classList.add('show');
     card.scrollTop=0;
    };
   });
   for(const f of ['mesh-art-v229.js','gift-art-v198.js','profile-gift-orbit-v233.js'])await p.addScriptTag({content:read(f)});
   assert.equal(await p.evaluate(()=>giftQueries.length),0,'Nothing fetched while closed');
   await p.evaluate(()=>showRareFixture('rare',{busy:true}));
   assert.equal(await p.locator(layer).count(),0);assert.equal(await p.evaluate(()=>giftQueries.length),0,'Skeleton never fetches ornaments');
   await p.evaluate(()=>showRareFixture('rare'));
   await p.locator(layer+'[data-running=true]').waitFor({state:'attached'});
   assert.deepEqual(await p.locator(satellite).evaluateAll(nodes=>nodes.map(el=>el.dataset.giftOrbitItem)),['first_moon','aurora_core','dream_portal']);
   assert.equal(await p.locator(glint).count(),3);
   await p.waitForFunction(()=>[...document.querySelectorAll('.profile-gift-satellite-v233 img')].every(img=>img.naturalWidth>0));
   const q=await p.evaluate(()=>giftQueries.map(g=>({filters:g.filters,limit:g.limit,fields:g.fields})));
   assert.deepEqual(q,[{filters:{owner_nick:'rare',limited:true},limit:12,fields:'gift_id,theme,owner_nick,limited'}]);
   const layout=async()=>p.locator(layer).evaluate(n=>{
    const a=document.getElementById('view-profile-avatar').getBoundingClientRect(),o=n.getBoundingClientRect();
    const centerX=a.left+a.width/2,centerY=a.top+a.height/2;
    return {deltaX:Math.abs(o.left-centerX),deltaY:Math.abs(o.top-centerY),
     covers:document.elementFromPoint(centerX,centerY)?.closest('#view-profile-avatar')!==null,
     intercepts:getComputedStyle(n).pointerEvents};
   });
   const checkLayout=async()=>{const l=await layout();assert(l.deltaX<1&&l.deltaY<1);assert(l.covers);assert.equal(l.intercepts,'none');};
   await checkLayout();
   assert.equal(await p.locator(satellite).first().evaluate(n=>getComputedStyle(n).animationName),'exstra-rare-flight-v233');
   assert.equal(await p.locator(glint).first().evaluate(n=>getComputedStyle(n).animationName),'exstra-rare-glint-v233');
   if(process.env.EXSTRA_ORBIT_CAPTURE==='1')await p.locator('.user-profile-card').screenshot({path:path.join(root,'outputs','profile-gift-orbit-v233-'+width+'.png')});
   await p.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await p.locator(satellite).first().evaluate(n=>getComputedStyle(n).animationName),'none');
   assert.equal(await p.locator(glint).first().evaluate(n=>getComputedStyle(n).animationName),'none');
   await p.evaluate(()=>{document.body.dataset.profileLayoutV196='panel';});
   await p.waitForTimeout(120);await checkLayout();
   if(process.env.EXSTRA_ORBIT_CAPTURE==='1'&&width===1440)await p.locator('.user-profile-card').screenshot({path:path.join(root,'outputs','profile-gift-orbit-v233-panel.png')});
   await p.emulateMedia({reducedMotion:'no-preference'});
   await p.evaluate(()=>{document.body.dataset.uiMotionV184='off';});
   assert.equal(await p.locator(satellite).first().evaluate(n=>getComputedStyle(n).animationName),'none');
   await p.evaluate(()=>{delete document.body.dataset.uiMotionV184;dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}}));});
   await p.locator(layer+'[data-running=false]').waitFor({state:'attached'});
   assert.equal(await p.locator(satellite).first().evaluate(n=>getComputedStyle(n).animationName),'none');
   await p.evaluate(()=>dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));
   await p.locator(layer+'[data-running=true]').waitFor({state:'attached'});
   await p.evaluate(()=>{delete document.body.dataset.profileLayoutV196;const card=document.querySelector('.user-profile-card');const spacer=document.createElement('div');spacer.style.cssText='height:850px;grid-column:1/-1';card.querySelector('.user-profile-body').append(spacer);card.scrollTop=card.scrollHeight;});
   await p.locator(layer+'[data-running=false]').waitFor({state:'attached',timeout:2000}).catch(async error=>{
    throw Error(JSON.stringify(await p.evaluate(()=>{const card=document.querySelector('.user-profile-card');return {scrollTop:card.scrollTop,scrollHeight:card.scrollHeight,clientHeight:card.clientHeight,overflow:getComputedStyle(card).overflow,avatar:document.getElementById('view-profile-avatar').getBoundingClientRect().toJSON()};})),{cause:error});
   });
   await p.evaluate(()=>{document.querySelector('.user-profile-card').scrollTop=0;});
   await p.locator(layer+'[data-running=true]').waitFor({state:'attached'});
   await p.evaluate(()=>showRareFixture('slow'));
   await p.waitForFunction(()=>giftQueries.some(q=>q.filters.owner_nick==='slow'));
   await p.evaluate(()=>showRareFixture('empty'));
   await p.waitForTimeout(320);
   assert.equal(await p.locator(layer).count(),0,'A stale rare response cannot paint a different profile');
   assert(await p.evaluate(()=>giftQueries.find(q=>q.filters.owner_nick==='slow').signal.aborted));
   await p.evaluate(()=>showRareFixture('rare'));
   await p.locator(layer+'[data-running=true]').waitFor({state:'attached'});
   assert.equal(await p.evaluate(()=>giftQueries.filter(q=>q.filters.owner_nick==='rare').length),1,'Reopen reuses bounded cache');
   await p.evaluate(()=>document.querySelector('#user-profile-modal').classList.remove('show'));
   await p.locator(layer).waitFor({state:'detached'});
   await p.evaluate(()=>dispatchEvent(new CustomEvent('telechat-account-ready-v175')));
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS rare gift orbit: exact read-only scope, visible profile, distinct capped 3D art, both layouts, reduced motion, bound to avatar and account/race protection');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
