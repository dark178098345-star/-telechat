/* Real mouse and touch gestures against the standalone drag controller in Edge. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const dragSource=fs.readFileSync(path.join(__dirname,'..','nimb-drag-v224.js'),'utf8');

async function fixture(browser,touch=false){
  const context=await browser.newContext({viewport:{width:540,height:500},hasTouch:touch,reducedMotion:touch?'reduce':'no-preference'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent(`
    <style>
      body{margin:0} #stage,#messages{width:420px;margin:auto} #stage{height:85px;display:grid;place-items:center}
      #messages{height:340px;overflow:auto} #messages button{margin:280px 0 0 12px}
      #dock{width:124px;height:80px;display:grid;place-items:center;touch-action:none}
      .nimb-v221{display:block;width:100%;height:auto;pointer-events:none;}
      #dock .nimb-v221{width:86px}
      [data-nimb-drag-away] #dock .nimb-v221{visibility:hidden}
      .nimb-drag-layer-v224{position:fixed;inset:0;pointer-events:none;z-index:10}
      .nimb-drag-layer-v224[hidden]{display:none!important}
      .nimb-drag-grip-v224{position:absolute;inset:0 auto auto 0;pointer-events:auto;touch-action:none;padding:0;border:0;background:transparent}
    </style>
    <div id="stage"><button id="dock"></button></div>
    <div id="messages"><button id="message">Сообщение</button></div>
  `);
  await page.evaluate(()=>{
    window.results={settings:0,grabs:0,drops:0,messageClicks:0,moods:[],drifts:[],floats:[]};
    window.allowDrag=true;
    window.exstraNimbV221={
      make(){
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.classList.add('nimb-v221');svg.setAttribute('viewBox','0 0 152 105');
        svg.innerHTML='<ellipse cx="76" cy="53" rx="59" ry="44" fill="pink"/>';return svg;
      },
      paint(svg,mood){svg.dataset.feeling=mood;},bounce(){},stop(){},
      setFloat(svg,enabled){results.floats.push(enabled);},
      drift(svg,x,y){results.drifts.push([x,y]);},
      motionAllowed(){return !matchMedia('(prefers-reduced-motion: reduce)').matches;}
    };
    document.getElementById('dock').append(exstraNimbV221.make());
  });
  await page.addScriptTag({content:dragSource});
  await page.evaluate(()=>{
    const byId=id=>document.getElementById(id),dock=byId('dock');
    dock.onclick=()=>results.settings++;
    byId('message').onclick=()=>results.messageClicks++;
    window.drag=exstraNimbDragV224.create({stage:byId('stage'),messages:byId('messages'),dock,
      eligible:()=>allowDrag,onGrab:()=>results.grabs++,onDrop:()=>results.drops++,
      react(mood){results.moods.push(mood);drag.paint(mood,false,true);}
    });
  });
  return {context,page,errors};
}

async function mouseDrag(page,locator,toX,toY){
  const from=await locator.boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
  await page.mouse.down();
  await page.mouse.move(toX,toY,{steps:9});
  await page.mouse.up();
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const {page,context,errors}=await fixture(browser),dock=page.locator('#dock'),grip=page.locator('.nimb-drag-grip-v224');
    await dock.click();assert.equal(await page.evaluate(()=>results.settings),1,'a regular click opens settings');
    await mouseDrag(page,dock,414,178);
    assert.equal(await page.evaluate(()=>results.settings),1,'drag release is not a settings click');
    assert.equal(await page.evaluate(()=>drag.away()),true);
    assert.equal(await grip.evaluate(node=>parseFloat(node.style.width)),86,'uses the chosen native dock size');
    assert.equal(await page.evaluate(()=>results.grabs),1);
    assert.equal(await page.evaluate(()=>results.drops),1);
    assert.equal(await page.evaluate(()=>results.moods[0]),'surprised');
    assert.match(await grip.locator('svg').getAttribute('data-feeling'),/happy|laugh|dizzy/);
    await page.waitForTimeout(560);
    await page.getByRole('button',{name:'Сообщение'}).click();
    assert.equal(await page.evaluate(()=>results.messageClicks),1,'the overlay does not intercept chat clicks');
    await mouseDrag(page,grip,531,470);
    await page.waitForTimeout(560);
    const placed=await grip.boundingBox();
    assert(placed.x+placed.width<=480&&placed.y+placed.height<=425,'even fast swipes stay within the active chat');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>drag.away()),false);
    assert.equal(await page.locator('#stage').getAttribute('data-nimb-drag-away'),null);
    assert.equal(await page.evaluate(()=>results.floats.at(-1)),false);
    await page.evaluate(()=>document.querySelector('#dock svg').style.width='114px');
    await mouseDrag(page,dock,365,260);assert.equal(await grip.evaluate(node=>parseFloat(node.style.width)),114);
    await page.setViewportSize({width:490,height:470});
    await page.waitForFunction(()=>!drag.away());
    assert.deepEqual(errors,[]);
    await context.close();

    const mobile=await fixture(browser,true),touchPage=mobile.page,touchDock=touchPage.locator('#dock');
    const touchBox=await touchDock.boundingBox(),x=touchBox.x+touchBox.width/2,y=touchBox.y+touchBox.height/2;
    await touchPage.touchscreen.tap(x,y);
    assert.equal(await touchPage.evaluate(()=>results.settings),1);
    const cdp=await mobile.context.newCDPSession(touchPage);
    const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    await touch('touchStart',[{x,y,id:1}]);
    for(let i=1;i<=6;i++)await touch('touchMove',[{x:x+i*16,y:y+i*25,id:1}]);
    await touch('touchEnd',[]);
    await touchPage.waitForFunction(()=>drag.away());
    assert.equal(await touchPage.evaluate(()=>results.settings),1,'finger drag does not tap the settings button');
    assert.equal(await touchPage.evaluate(()=>results.drops),1);
    assert.deepEqual(await touchPage.evaluate(()=>results.drifts),[[0,0]],'reduce-motion keeps direct drag but no momentum');
    const touchGrip=touchPage.locator('.nimb-drag-grip-v224'),stopped=await touchGrip.boundingBox();
    await touchPage.waitForTimeout(500);assert.deepEqual(await touchGrip.boundingBox(),stopped);
    assert.deepEqual(mobile.errors,[]);
    await mobile.context.close();
    console.log('Nimb V224 mouse/touch dragging, emotions, overlay pass-through, sizing, bounds and reduced motion');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
