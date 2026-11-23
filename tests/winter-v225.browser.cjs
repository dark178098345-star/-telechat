/* Production winter UI integration with only local fixture accounts/assets. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {fixtureClient}=require('./runtime-v180.browser.cjs');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
  '.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
for(const host of ['index.html','sw.js']){
  const src=fs.readFileSync(path.join(root,host),'utf8');
  for(const [file,version] of [
    ['winter-decor-v225.css',225],['winter-snow-v225.css',225],['winter-effects-v225.js',226],
    ['winter-surfaces-v226.css',228],['winter-surfaces-v226.js',228]
  ]){
    assert(src.includes('./'+file+'?v='+version),host+' references winter asset '+file);
  }
}

async function fixture(browser,width){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(fixtureClient);
  await context.addInitScript(()=>{
    localStorage.setItem('exstrachat.interface-motion.v184.alice','full');
    // Assert the normal motion policy independent of the host's virtual CPU count.
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:8});
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:8});
  });
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:''});
    if(url.hostname.endsWith('.supabase.co'))return route.fulfill({status:route.request().method()==='GET'?200:204,
      contentType:'application/json',body:route.request().method()==='GET'?'[]':''});
    if(url.hostname!=='app.test')return route.abort();
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
    return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://app.test/?winter-fixture=225');
  await page.waitForFunction(()=>window.exstraWinterV225&&!document.getElementById('startup-loader'));
  assert.equal(await page.evaluate(()=>exstraWinterV225.getState().active),false,'no decorations cover the login screen');
  await page.locator('#l-login').fill('alice');await page.locator('#l-pass').fill('fixture-only');
  await page.evaluate(()=>doLogin());
  await page.locator('#whats-new-v181[open] button[data-close]').last().click();
  await page.waitForFunction(()=>exstraWinterV225.getState().owner==='alice'&&exstraWinterV225.getState().active);
  const garland=await page.evaluate(()=>{
    const sidebar=document.getElementById('sidebar'),search=sidebar.querySelector('.search-wrap input'),garland=sidebar.querySelector('.search-wrap > .winter-garland-v225');
    return {search:search?.getBoundingClientRect().toJSON(),ribbon:garland?.getBoundingClientRect().toJSON(),
      inChatHeader:!!document.querySelector('.chat-header .winter-garland-v225')};
  });
  const {search,ribbon,inChatHeader}=garland;
  assert(search&&ribbon&&!inChatHeader&&ribbon.width>0&&ribbon.top>=search.bottom-6&&
    ribbon.top<search.bottom+36&&ribbon.bottom>search.bottom&&ribbon.right>=search.left,
  'the garland appears immediately below search, not in the chat header: '+JSON.stringify(garland));
  if(width>=600){
    assert.equal(await page.locator('.section-rail-v109 .rail-brand-v109 .winter-hat-v225').count(),1,'Santa hat sits on the app icon in the desktop rail');
    await page.waitForFunction(()=>exstraWinterV225.getState().snowActive);
    assert(await page.evaluate(()=>!currentChat),'snowfall already runs on the desktop before selecting a chat');
    await runningSnow(page,true);
    if(process.env.EXSTRA_WINTER_CAPTURE==='1')await page.screenshot({path:path.join(root,'outputs','winter-v225-welcome.png')});
  }
  await page.evaluate(()=>openChat('bob'));
  await page.waitForFunction(()=>document.querySelectorAll('#messages .msg').length>=20);
  await page.waitForFunction(()=>exstraWinterV225.getState().owner==='alice'&&exstraWinterV225.getState().snowActive);
  if(width<600)await page.waitForFunction(()=>{
    const rect=document.querySelector('.chat-main').getBoundingClientRect();
    return rect.right<=innerWidth+1&&rect.left>=-1&&rect.width>innerWidth/2;
  });
  return {context,page,errors};
}

const staticParts=['.winter-ridge-v225','.winter-garland-v225','.winter-hat-v225'];
const flakeSelector='#winter-snowfall-v225 .winter-flake-v225';
const state=page=>page.evaluate(()=>exstraWinterV225.getState());
const winter=page=>page.locator('body').getAttribute('data-winter-v225');
const snowfall=page=>page.locator('#winter-snowfall-v225');
const visibleDecoration=(page,mobile=false)=>page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>[selector,
  [...document.querySelectorAll(selector)].map(node=>{
    const box=node.getBoundingClientRect(),css=getComputedStyle(node);
    return {visible:node.getClientRects().length>0&&css.visibility!=='hidden'&&css.display!=='none'&&
      box.right>=0&&box.left<=innerWidth&&box.bottom>=0&&box.top<=innerHeight,display:css.display,box:box.toJSON()};
  })])),mobile?[staticParts[0],'.nimb-winter-hat-v225']:staticParts);
const decorationIsVisible=async(page,mobile=false)=>Object.values(await visibleDecoration(page,mobile)).every(nodes=>nodes.some(node=>node.visible));

async function openAppearance(page){
  await page.evaluate(()=>openPanel('settings-panel'));
  const panel=page.locator('#settings-panel');
  if(await panel.getAttribute('data-settings-view')!=='effects'){
    await page.locator('#settings-panel.open button[data-settings-section="appearance"]').click();
    await page.locator('[data-settings-section="effects"]').click();
  }
  assert.equal(await panel.getAttribute('data-settings-view'),'effects');
  const section=page.locator('#settings-panel .panel-section:not([hidden])').filter({hasText:'Интерфейс · Зима'});
  assert.equal(await section.count(),1);
  return {
    master:section.locator('#winter-enabled-v225'),
    snow:section.locator('#winter-snow-v225'),
    masterLabel:section.getByText('Зимнее оформление',{exact:true}),
    snowLabel:section.getByText('Снегопад',{exact:true})
  };
}

// CSS animation objects are a stronger signal than static flake markup.
async function runningSnow(page,expected){
  await page.waitForFunction(({selector,expected})=>{
    const first=document.querySelector(selector);
    const running=!!first&&first.getAnimations().some(a=>a.playState==='running');
    return expected===running;
  },{selector:flakeSelector,expected});
}
const layout=page=>page.evaluate(()=>Object.fromEntries(['messages','input-area','pixel-eyes-stage-v155'].map(id=>{
  const rect=document.getElementById(id).getBoundingClientRect();
  return [id,[rect.x,rect.y,rect.width,rect.height]];
})));
function sameLayout(actual,expected){
  for(const id of Object.keys(expected)){
    assert(actual[id].every((value,index)=>Math.abs(value-expected[id][index])<1),id+' reserves no extra space for decorations');
  }
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [390,1440]){
      const {context,page,errors}=await fixture(browser,width);
      assert.equal(await winter(page),'on');
      assert.equal((await state(page)).enabled,true,'winter is enabled by default');
      assert.equal((await state(page)).snow,true,'snowfall is enabled by default');
      const flakes=await page.locator(flakeSelector).count();
      assert(flakes>0&&flakes<=(width===390?20:36),'snowfall has a bounded particle budget');
      assert.equal(await snowfall(page).getAttribute('aria-hidden'),'true');
      assert.equal(await snowfall(page).evaluate(node=>getComputedStyle(node).pointerEvents),'none');
      await runningSnow(page,true);
      assert(await decorationIsVisible(page,width===390),'ridge, garland and season hats are displayed in a normal chat: '+JSON.stringify(await visibleDecoration(page,width===390)));
      for(const selector of staticParts)assert.equal(await page.locator(selector).first().getAttribute('aria-hidden'),'true',selector);
      await page.evaluate(()=>{for(let i=0;i<5;i++)exstraWinterV225.refresh();});
      const ridges=page.locator('.winter-ridge-v225');
      assert.equal(await ridges.count(),3,'Refreshing weather never duplicates the three panel edges');
      assert(await ridges.evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node,'::before').backgroundImage!=='none').length===2&&
        nodes.every(node=>getComputedStyle(node).backgroundImage==='none')),'Icicles replace snow on the two top edges');
      const before=await layout(page);
      const input=page.locator('#msg-input');
      await input.click();
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'msg-input','snow and chat decorations do not intercept composer clicks');
      await input.blur();

      const cap=page.locator('#messages .winter-bubble-cap-v226').last();
      await cap.waitFor({state:'visible'});
      const bubble=cap.locator('..'),r=await bubble.boundingBox(),b=await cap.boundingBox();
      assert(b.x>r.x+5&&b.x+b.width<r.x+r.width-5&&b.y+b.height<=r.y+3,'Bubble powder fits between the two rounded corners');
      if(width===390){
        await page.touchscreen.tap(r.x+r.width*.5,r.y+r.height*.5);
        await page.waitForFunction(()=>document.querySelector('.winter-spill-v226'));
        assert(await bubble.evaluate(node=>node.getAnimations().some(a=>
          a.effect.getKeyframes().some(frame=>frame.translate?.startsWith('-2px')))),'A tap shakes the bubble');
      }else{
        const shelf=page.locator('#input-area [data-snow-shelf=shelf]'),edge=await shelf.boundingBox();
        const cover=shelf.locator('.winter-powder-v228'),heaps=shelf.locator('.winter-heaps-v228');
        const base=await cover.getAttribute('d'),x=edge.x+edge.width*.18,y=edge.y+edge.height-5;
        assert.equal(await heaps.getAttribute('d'),'','No heaps are drawn before the user gathers the snow');
        await page.mouse.move(x,y);
        assert.equal(await cover.getAttribute('d'),base,'Hover does not move powder');
        await page.mouse.move(x+140,y,{steps:12});
        await page.waitForFunction(()=>document.querySelector('#input-area .winter-heaps-v228').getAttribute('d').length>0);
        assert.notEqual(await cover.getAttribute('d'),base,'Powder moves into the heap from the path of the pointer');
        const heap=await heaps.getAttribute('d');
        await page.mouse.move(x+140,y-36);
        assert.equal(await heaps.getAttribute('d'),heap,'The heap stays after lifting the cursor');
        assert.equal(await page.locator('.winter-spill-v226').count(),0,'No automatic spill in the middle');
        if(process.env.EXSTRA_WINTER_CAPTURE==='1')await page.screenshot({path:path.join(root,'outputs','winter-v228-heap.png')});
        await page.mouse.move(x+127,y);
        await page.mouse.move(edge.x+edge.width-2,y,{steps:55});
        const chunk=page.locator('.winter-spill-v226 .winter-spill-chunk-v227').first();
        await chunk.waitFor({state:'attached'});
        assert((await chunk.evaluate(node=>parseFloat(node.style.getPropertyValue('--spill-x'))))>0,
          'Snow chunks fly off the side in the sweep direction');
        await page.waitForFunction(()=>!document.querySelector('#input-area .winter-heaps-v228').getAttribute('d'));
      }
      await page.waitForFunction(()=>!document.querySelector('.winter-spill-v226'));

      if(width===1440){
        const y=r.y-1;
        await page.mouse.move(b.x+5,y);
        await page.mouse.move(b.x+b.width*.66,y,{steps:9});
        const messageId=await bubble.evaluate(node=>node.closest('.msg').dataset.id);
        const previousCap=page.locator(`#messages .msg[data-id=${JSON.stringify(messageId)}] .winter-heaps-v228`);
        await page.waitForFunction(id=>document.querySelector(`#messages .msg[data-id=${JSON.stringify(id)}] .winter-heaps-v228`)?.getAttribute('d'),messageId);
        const dimensions=node=>{const {x,y,width,height}=node.getBBox();return [x,y,width,height];};
        const heap=await previousCap.evaluate(dimensions);
        const originalTop=await page.locator('#messages').evaluate(node=>{
          const top=node.scrollTop;node.scrollTo({top:Math.max(0,top-node.clientHeight*2),behavior:'instant'});return top;
        });
        await previousCap.waitFor({state:'detached'});
        await page.locator('#messages').evaluate((node,top)=>node.scrollTo({top,behavior:'instant'}),originalTop);
        await previousCap.waitFor({state:'attached'});
        const restored=await previousCap.evaluate(dimensions);
        assert(restored.every((v,i)=>Math.abs(v-heap[i])<3),'Scrolling away preserves the position and size of the heap');
      }

      if(process.env.EXSTRA_WINTER_CAPTURE==='1'){
        await page.screenshot({path:path.join(root,'outputs','winter-v225-'+width+'.png')});
      }
      if(width===390){
        await page.evaluate(()=>openPanel('settings-panel'));
        assert.equal(await page.locator('#settings-home-v160>button:visible').count(),5);
        if(process.env.EXSTRA_WINTER_CAPTURE==='1')await page.locator('#settings-panel').screenshot({path:path.join(root,'outputs','settings-v226-phone.png')});
        await page.locator('[data-settings-section="appearance"]').click();
        await page.locator('[data-settings-section="effects"]').click();
        await page.evaluate(()=>telechatPhoneV159.back());
        assert.equal(await page.locator('#settings-panel').getAttribute('data-settings-view'),'appearance');
        await page.evaluate(()=>telechatPhoneV159.back());
        assert.equal(await page.locator('#settings-panel').getAttribute('data-settings-view'),'home');
        assert.deepEqual(errors,[]);
        await context.close();continue;
      }

      // The native shell can pause heavy particles independently of winter decoration.
      const background=on=>page.evaluate(background=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background}})),on);
      await background(true);await runningSnow(page,false);
      assert.equal((await state(page)).active,true);
      assert.equal((await state(page)).snowActive,false);
      assert(await decorationIsVisible(page));
      await background(false);await runningSnow(page,true);
      await page.emulateMedia({reducedMotion:'reduce'});await runningSnow(page,false);
      assert.equal(await winter(page),'on');
      assert(await decorationIsVisible(page),'reduced motion does not remove the static winter art');
      assert.equal(await page.locator('.winter-spill-v226').count(),0);
      await page.emulateMedia({reducedMotion:'no-preference'});await runningSnow(page,true);

      await page.evaluate(()=>openPanel('settings-panel'));
      assert.equal(await page.locator('#settings-home-v160>button:visible').count(),5,'Main settings has only five categories');
      if(process.env.EXSTRA_WINTER_CAPTURE==='1')await page.locator('#settings-panel').screenshot({path:path.join(root,'outputs','settings-v226-home.png')});
      await page.locator('[data-settings-section=app]').click();
      await page.locator('[data-settings-section=updates]').click();
      assert(await page.locator('#app-restart-open-v216').isVisible());
      assert(await page.locator('#news-open-v181').isVisible());
      await page.keyboard.press('Escape');assert.equal(await page.locator('#settings-panel').getAttribute('data-settings-view'),'app');
      await page.locator('#settings-back-v160').click();
      assert(await page.locator('#settings-home-v160').isVisible());
      let controls=await openAppearance(page);
      assert(await controls.master.isChecked());assert(await controls.snow.isChecked());
      await controls.snowLabel.click();await runningSnow(page,false);
      assert.equal((await state(page)).snow,false);
      assert.equal(await winter(page),'on','snow setting does not disable the winter theme');
      await page.evaluate(()=>closeAllPanels());
      assert(await decorationIsVisible(page),'the garland, chat ridge, and hat survive snowfall being disabled');
      sameLayout(await layout(page),before);

      controls=await openAppearance(page);
      await controls.masterLabel.click();
      assert.equal((await state(page)).active,false);
      assert.notEqual(await winter(page),'on');
      await page.evaluate(()=>closeAllPanels());
      assert.equal(await decorationIsVisible(page),false);
      sameLayout(await layout(page),before);

      // Change only the in-memory fixture identity; local storage remains the real one for this tab.
      await page.evaluate(()=>{window.winterOriginalUser=me;me={...me,nick:'winter-fixture-other'};exstraWinterV225.refresh();});
      assert.equal((await state(page)).owner,'winter-fixture-other');
      assert.equal(await winter(page),'on','a different account keeps its own defaults');
      assert.equal((await state(page)).snow,true);
      await page.evaluate(()=>{me=winterOriginalUser;delete window.winterOriginalUser;exstraWinterV225.refresh();});
      assert.equal((await state(page)).owner,'alice');
      assert.equal((await state(page)).enabled,false,'master switch persisted for Alice');
      assert.equal((await state(page)).snow,false,'snow switch persisted independently for Alice');

      controls=await openAppearance(page);
      await controls.masterLabel.click();
      assert(await controls.master.isChecked());
      assert.equal(await controls.snow.isChecked(),false,'turning winter back on does not override the snow preference');
      assert.equal(await winter(page),'on');
      await controls.snowLabel.click();await runningSnow(page,true);
      await page.evaluate(()=>closeAllPanels());
      sameLayout(await layout(page),before);
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('Winter V225: defaults desktop/mobile, account toggles, paused snowfall, static art and click-through layout');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
