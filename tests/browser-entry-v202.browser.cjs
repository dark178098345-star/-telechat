const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const supported of [true,false]){
  const {p,errors}=await fixture(b,1440,900,false);
  await p.evaluate(supported=>{window.browserCalls=[];window.telechatDesktop=supported?{isDesktop:true,browserVersion:2,openBrowser:async(...args)=>{browserCalls.push(args);return{ok:true};}}:{isDesktop:true};},supported);
  await p.addScriptTag({content:read('navigation-readers-v109.js')});await p.addScriptTag({content:read('settings-navigation-v160.js')});await p.addScriptTag({content:read('browser-entry-v202.js')});await p.waitForTimeout(80);
  assert.equal(await p.locator('.section-rail-v109>#browser-entry-v202').count(),1,'Sites stays beside primary sections');assert.equal(await p.locator('#rail-extras-v194 #browser-entry-v202').count(),0);assert.deepEqual(await p.evaluate(()=>browserCalls),[],'No workspace is opened on startup');
  await p.locator('#browser-entry-v202').click();if(supported)assert.deepEqual(await p.evaluate(()=>browserCalls),[['','embedded']]);else{assert.deepEqual(await p.evaluate(()=>browserCalls),[]);assert((await p.evaluate(()=>calls.at(-1))).includes('1.4.0'));}
  await p.evaluate(()=>openPanel('settings-panel'));assert(await p.locator('#browser-settings-v202').isVisible());await p.locator('#browser-settings-v202').click();assert.deepEqual(errors,[]);await p.close();
 }
 const {p,errors}=await fixture(b,390,900,true);await p.addScriptTag({content:read('browser-entry-v202.js')});assert.equal(await p.locator('#browser-entry-v202,#browser-settings-v202').count(),0,'No fake browser button on phone/web');assert.deepEqual(errors,[]);await p.close();
 console.log('PASS v202 entry: primary Windows section, no auto-open, embedded mode default, settings fallback, clear old-client update notice, absent on web/phone');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
