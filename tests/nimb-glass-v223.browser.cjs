'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fixture=`<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#171725;color:#eee;font:15px sans-serif}
#preview{position:absolute;top:18px;left:188px;width:244px}
#pixel-eyes-stage-v155{position:absolute;top:198px;left:30px;width:560px;height:64px;display:grid;place-items:center}
#pixel-eyes-stage-v155 .pe-character-v155{position:relative;width:93px;height:64px;padding:0;border:0;background:none;display:grid;place-items:center}
#messages{position:absolute;top:262px;left:30px;width:560px;height:235px;overflow:hidden;
background:repeating-linear-gradient(90deg,#181924 0 2px,#eeedf5 2px 4px)}
#target{position:absolute;left:65px;top:116px}
.msg-bubble{background:#24253b;color:#fff;border:0;border-radius:12px;padding:12px 16px;cursor:pointer}
</style><div id="preview"></div><div id="pixel-eyes-stage-v155"><button class="pe-character-v155" aria-label="Нимб"></button></div>
<div id="messages"><div class="msg them" id="target"><button class="msg-bubble">Пусть видны и объём, и фон</button></div></div>`;
const paintFrames=async(page)=>page.evaluate(()=>{
 const canvas=window.glassPreview.querySelector('canvas');
 return Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
});
const rgbChanged=(before,after)=>{
 let count=0;
 for(let i=0;i<before.length;i+=4){
  if(before[i+3]>=43&&after[i+3]>=43&&Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>=20)count++;
 }
 return count;
};
async function screenshotPixels(page,clip){
 const png=await page.screenshot({clip});
 return page.evaluate(async base64=>{
  const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
  const sample=document.createElement('canvas');sample.width=img.width;sample.height=img.height;
  const ctx=sample.getContext('2d');ctx.drawImage(img,0,0);
  return Array.from(ctx.getImageData(0,0,sample.width,sample.height).data);
 },png.toString('base64'));
}
function meanDifference(before,after,predicate,width){
 let sum=0,count=0;
 for(let i=0;i<before.length;i+=4){
  const index=i/4,x=index%width,y=Math.floor(index/width);
  if(!predicate(x,y))continue;
  sum+=(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]))/3;count++;
 }
 return sum/count;
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:620,height:530},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/*',route=>route.abort());
  await page.setContent(fixture);
  await page.addStyleTag({content:read('chat-pet-v221.css')+'\n*{animation:none!important;transition:none!important}'});
  for(const script of ['nimb-3d-v223.js','chat-pet-v221.js','nimb-flight-v222.js'])await page.addScriptTag({content:read(script)});
  await page.evaluate(()=>{
   document.body.dataset.uiMotionV184='full';
   const target=document.getElementById('preview');
   window.glassPreview=exstraNimbV221.make();target.append(glassPreview);
   exstraNimbV221.track(glassPreview,target);exstraNimbV221.paint(glassPreview,'idle',false,true);
   const dock=exstraNimbV221.make();document.querySelector('#pixel-eyes-stage-v155 .pe-character-v155').append(dock);exstraNimbV221.paint(dock,'idle',false,true);
  });
  await page.locator('#preview [data-volume-v223] .nimb-3d-canvas-v223').waitFor({state:'visible',timeout:3000});
  assert.equal(await page.locator('#preview .nimb-shell-fallback-v223:visible').count(),0,'A successful WebGL frame hides the SVG shell fallback');
  const initial=await paintFrames(page),colors=new Set(),opacities=new Set();let clear=0,filled=0;
  for(let i=0;i<initial.length;i+=4){
   if(initial[i+3]===0){clear++;continue;}
   filled++;opacities.add(initial[i+3]);
   if(initial[i+3]>36)colors.add(initial.slice(i,i+3).map(value=>value>>3).join(':'));
  }
  assert(clear>1500&&filled>3800,'Volume canvas has a genuinely transparent surround and a visible body');
  assert(opacities.size>=35&&colors.size>=75,'Multi-level alpha and highlight colors render across the depth of the volume');
  await page.locator('#preview').hover({position:{x:212,y:54}});
  await page.waitForFunction(()=>parseFloat(glassPreview.style.getPropertyValue('--nimb-x'))>=3);
  assert(rgbChanged(initial,await paintFrames(page))>450,'Turning with the pointer re-shades the volume, not just the face');
  await page.mouse.move(605,22);
  const settled=await paintFrames(page);
  await page.evaluate(()=>{
   window.glassClock={request:window.requestAnimationFrame,cancel:window.cancelAnimationFrame};
   let next;window.requestAnimationFrame=fn=>{next=fn;return 1;};window.cancelAnimationFrame=()=>{next=undefined;};
   const start=performance.now();exstraNimbV221.deform(glassPreview,'pet');next(start+85);
  });
  assert(rgbChanged(settled,await paintFrames(page))>220,'Pressing the bubble changes the volume pixels');
  await page.evaluate(()=>{
   exstraNimbV221.stop(glassPreview);window.requestAnimationFrame=glassClock.request;window.cancelAnimationFrame=glassClock.cancel;
   const stage=document.getElementById('pixel-eyes-stage-v155');
   const row=document.getElementById('target');
   window.glassFlight=exstraNimbFlightV222.create(stage,document.getElementById('messages'),()=>true);
   glassFlight.request(row,'love',true);
  });
  const flight=page.locator('.nimb-air-v222'),glider=flight.locator('.nimb-glider-v222'),frost=flight.locator('.nimb-frost-v223');
  await flight.waitFor({state:'visible',timeout:3000});
  await glider.evaluate(el=>{
   for(const moving of el.getAnimations()){moving.pause();moving.currentTime=moving.effect.getTiming().duration*.50;}
   exstraNimbV221.stop(el.querySelector('svg'));
  });
  assert(await glider.locator('svg[data-volume-v223] canvas').isVisible(),'The flying sprite also uses the actual 3D canvas');
  assert(!(await page.locator('#pixel-eyes-stage-v155 .nimb-v221').isVisible()),'The dock hides Nimb during the flight');
  const frostStyle=await frost.evaluate(el=>{const s=getComputedStyle(el);return {filter:s.backdropFilter,clip:s.clipPath,pointer:s.pointerEvents};});
  assert.match(frostStyle.filter,/blur\(/);assert.match(frostStyle.clip,/ellipse\(/);assert.equal(frostStyle.pointer,'none');
  assert.equal(await flight.evaluate(el=>getComputedStyle(el).pointerEvents),'none','The overlay does not consume chat clicks');
  const frostBounds=await frost.boundingBox();
  const clickThrough=await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#messages'),{
   x:frostBounds.x+frostBounds.width/2,y:frostBounds.y+frostBounds.height/2
  });
  assert(clickThrough,'Hit testing goes to the chat below the projected bubble');
  if(process.env.EXSTRA_PET_CAPTURE==='1')await page.screenshot({path:path.join(root,'outputs','nimb-v223-3d-frost.png')});

  // Keep the page composition unchanged, but hide the painted sprite to isolate BACKDROP pixels.
  await flight.evaluate(el=>{
   for(const visual of el.querySelectorAll('svg,.nimb-seed-v222,.nimb-wake-v222'))visual.style.visibility='hidden';
  });
  const local={x:Math.floor(frostBounds.x),y:Math.floor(frostBounds.y),width:Math.floor(frostBounds.width),height:Math.floor(frostBounds.height)};
  const withFrost=await screenshotPixels(page,local);
  await frost.evaluate(el=>el.style.backdropFilter='none');
  const withoutFrost=await screenshotPixels(page,local);
  const {width,height}=local;
  const upperInterior=(x,y)=>x>=width*.50&&x<=width*.68&&y>=height*.36&&y<=height*.46;
  const outside=(x,y)=>x<width*.12||x>width*.89||y<height*.13||y>height*.86;
  const interiorDiff=meanDifference(withFrost,withoutFrost,upperInterior,width);
  const exteriorDiff=meanDifference(withFrost,withoutFrost,outside,width);
  assert(interiorDiff>15,'Actual pixels behind the bubble are frosted: '+interiorDiff);
  assert(exteriorDiff<2.5&&exteriorDiff<interiorDiff*.12,'No visible frost outside the shell (subpixel rasterization tolerance): '+exteriorDiff);
  await page.evaluate(()=>glassFlight.cancel());
  assert(!(await flight.isVisible()));
  assert(await page.locator('#pixel-eyes-stage-v155 .nimb-v221').isVisible(),'Cancel restores the docked sprite');
  assert.deepEqual(errors,[]);
  console.log('Nimb V223: WebGL volume, alpha, live rotation and pressure, localized frost, click-through and cleanup');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
