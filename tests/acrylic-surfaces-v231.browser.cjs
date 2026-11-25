'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['index.html','sw.js'])assert(read(f).includes('./acrylic-surfaces-v231.css?v=231'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [390,1440]){
   const {p,errors}=await fixture(browser,width,900,width<600);
   await p.addScriptTag({content:read('settings-navigation-v160.js')});
   await p.evaluate(()=>{openPanel('settings-panel');document.body.classList.add('telechat-full-panel-open-v65');document.getElementById('overlay').classList.add('show');});
   const panel=p.locator('#settings-panel');
   const skin=await panel.evaluate(n=>{const css=getComputedStyle(n);return {density:css.getPropertyValue('--acrylic-density').trim(),color:css.backgroundColor,fill:css.backgroundImage,blur:css.backdropFilter};});
   assert.equal(skin.blur,'none');
   if(width===1440){assert.equal(skin.density,'90%');assert.match(skin.fill,/radial-gradient/);assert.match(skin.color,/\/ 0\.9|^rgba/);}
   else assert.equal(skin.density,'','Full-screen phone settings stay opaque');
   assert.equal(await p.locator('#overlay').evaluate(n=>getComputedStyle(n).backdropFilter),'none','No full-screen blur behind settings');
   await p.waitForTimeout(260);
   if(process.env.EXSTRA_ACRYLIC_CAPTURE==='1')await p.screenshot({path:path.join(root,'outputs/acrylic-v231-'+width+'.png')});
   await p.evaluate(()=>{closeAllPanels();document.body.classList.remove('telechat-full-panel-open-v65');document.getElementById('overlay').classList.remove('show');document.getElementById('contact-menu').classList.add('show');});
   const menu=p.locator('#contact-menu');
   assert.match(await menu.evaluate(n=>getComputedStyle(n).backgroundImage),/radial-gradient/);
   assert.equal(await menu.evaluate(n=>getComputedStyle(n).backdropFilter),'none');
   await p.emulateMedia({forcedColors:'active'});
   assert.equal(await menu.evaluate(n=>getComputedStyle(n).backgroundImage),'none','Forced colors use a solid surface');
   assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS V231 acrylic: limited translucent surfaces, opaque phone settings, no backdrop blur and high-contrast fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
