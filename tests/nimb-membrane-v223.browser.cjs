'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:430,height:260}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setContent('<body style="background:#161622;display:grid;place-items:center;height:220px"><div id="nimb-card" style="width:246px"></div></body>');
  await page.addStyleTag({content:read('chat-pet-v221.css')});
  await page.addScriptTag({content:read('chat-pet-v221.js')});
  await page.evaluate(()=>{
   document.getAnimations().forEach(a=>a.cancel());document.body.style.margin='0';document.body.dataset.uiMotionV184='full';
   window.testPet=exstraNimbV221.make();document.getElementById('nimb-card').append(testPet);
   window.testFrames=new Map();let sequence=0;
   window.requestAnimationFrame=fn=>{testFrames.set(++sequence,fn);return sequence;};
   window.cancelAnimationFrame=id=>testFrames.delete(id);
   window.tickNimb=age=>{const batch=[...testFrames.values()];testFrames.clear();for(const frame of batch)frame(testStart+age);};
  });
  const model=()=>page.evaluate(()=>{
   const p=testPet.querySelector('.nimb-membrane-v223'),points=p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),[shell,edge]=testPet.querySelectorAll('.nimb-body>use');
   const attrs=el=>el.getAttribute('href'),box=edge.getBBox();
   return {points,uses:[attrs(shell),attrs(edge),attrs(testPet.querySelector('clipPath use'))],id:p.id,
    box:{x:box.x,y:box.y,width:box.width,height:box.height}};
  });
  const idle=await model();assert(idle.box.width>95,'The referenced shape actually renders');
  assert(idle.uses.every(href=>href==='#'+idle.id),'Clip and both glass surfaces share one live outline');
  if(process.env.EXSTRA_PET_CAPTURE==='1')await page.locator('#nimb-card').screenshot({path:path.join(root,'outputs','nimb-v223-rest.png')});
  await page.evaluate(()=>{window.testStart=performance.now();exstraNimbV221.deform(testPet,'pet');tickNimb(82);});
  const pressed=await model();assert.notDeepEqual(pressed.box,idle.box,'Rendered shell changes shape, not just position or scale');
  const edgeMotion=(model,predicate)=>{
   const deltas=[];
   for(let i=1;i<model.points.length;i+=2)if(predicate(idle.points[i]))deltas.push(Math.abs(model.points[i]-idle.points[i]));
   return deltas.reduce((total,delta)=>total+delta,0)/deltas.length;
  };
  assert(edgeMotion(pressed,y=>y<34)>6,'The near side makes a visible dent');
  assert(edgeMotion(pressed,y=>y>70)<1.5,'The far side does not move at the same time');
  if(process.env.EXSTRA_PET_CAPTURE==='1')await page.locator('#nimb-card').screenshot({path:path.join(root,'outputs','nimb-v223-dent.png')});
  await page.evaluate(()=>tickNimb(210));
  const wave=await model();assert(edgeMotion(wave,y=>y>70)>2,'The wave reaches the far side later');
  await page.evaluate(()=>tickNimb(820));assert.deepEqual(await model(),idle,'Damping ends on the original contour');
  assert.equal(await page.evaluate(()=>testFrames.size),0);
  await page.evaluate(()=>{window.testStart=performance.now();exstraNimbV221.deform(testPet,'flight',{duration:1550,side:-1});tickNimb(730);});
  assert.notDeepEqual((await model()).points,idle.points,'The shell also deforms on the pickup during a flight');
  await page.evaluate(()=>exstraNimbV221.stop(testPet));
  assert.equal(await page.evaluate(()=>testFrames.size),0,'Stopping drains the animation immediately');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>exstraNimbV221.deform(testPet,'pet'));
  assert.equal(await page.evaluate(()=>testFrames.size),0,'Reduced motion opts out of deformation');
  assert.deepEqual(errors,[]);
  console.log('Nimb V223: real contour dent, delayed ripple, clipping, landing/stop and reduced motion');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
