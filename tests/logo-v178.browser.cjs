const fs=require('fs'),path=require('path'),assert=require('assert/strict'),sharp=require('sharp'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
async function assets(p){
 await p.route('**/branding/logo-v178-*.webp*',r=>r.fulfill({contentType:'image/webp',body:fs.readFileSync(path.join(root,new URL(r.request().url()).pathname))}));
 // The shared fixture intentionally returns HTML for image requests. Retry these
 // after installing the real asset route, without changing production markup.
 await p.locator('.brand-icon-v178').evaluateAll(nodes=>nodes.forEach(n=>{n.srcset='';n.src=n.getAttribute('src')+'?qa=178';}));
}
async function decoded(p,selector){await p.waitForFunction(s=>[...document.querySelectorAll(s)].filter(n=>n.getClientRects().length).every(n=>n.complete&&n.naturalWidth>0),selector);}
(async()=>{
 const pngSizes={'favicon-16.png':16,'favicon-32.png':32,'favicon-48.png':48,'apple-touch-icon.png':180,'icon-192.png':192,'icon-512.png':512,'icon-maskable-512.png':512,'desktop-app/assets/icon.png':512,'android-app/app/src/main/res/drawable/telechat_icon.png':512};
 for(const [file,size] of Object.entries(pngSizes)){const meta=await sharp(path.join(root,file)).metadata();assert.equal(meta.width,size,file);assert.equal(meta.height,size,file);}
 for(const size of [128,256])assert(fs.statSync(path.join(root,`branding/logo-v178-${size}.webp`)).size<5000,'Small runtime asset, not the full-resolution original');
 for(const file of ['favicon.ico','desktop-app/assets/icon.ico']){const b=fs.readFileSync(path.join(root,file));assert.equal(b.readUInt16LE(2),1);assert.equal(b.readUInt16LE(4),7);for(let i=0;i<7;i++){const e=6+i*16,length=b.readUInt32LE(e+8),offset=b.readUInt32LE(e+12);const m=await sharp(b.subarray(offset,offset+length)).metadata();assert.equal(m.width,b[e]||256);}}
 const manifest=JSON.parse(read('manifest.webmanifest'));assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert(manifest.icons.every(i=>i.src.endsWith('?v=178')));assert(read('sw.js').includes("telechat-shell-v178-planet-logo"));assert(!read('index.html').includes('startup-bubble'));
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  for(const width of [320,390,1440]){
   const {p,errors}=await fixture(browser,width,844,width<600);await assets(p);await p.addScriptTag({content:read('navigation-readers-v109.js')});await decoded(p,'.brand-icon-v178');
   const selector=width<600?'#phone-home-head-v159 .brand-icon-v178':'.rail-brand-v109 .brand-icon-v178';assert(await p.locator(selector).isVisible(),'Actual app header uses new artwork');
   assert(await p.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return r.width>=24&&r.height>=24&&r.top>=0&&r.right<=innerWidth;}));
   for(const theme of ['','theme-light','theme-green']){await p.evaluate(theme=>{document.body.classList.remove('theme-light','theme-green');if(theme)document.body.classList.add(theme);},theme);assert(await p.locator('#sidebar').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.screenshot({path:path.join(root,`outputs/logo-v178-${width}-${theme||'dark'}.png`)});}
   // Auth is tested at the real fixture widths, not in a resized desktop mock.
   await p.evaluate(()=>{document.getElementById('chat-screen').classList.remove('active');document.getElementById('auth-screen').classList.add('active');});await decoded(p,'.auth-brand-icon-v178');assert(await p.locator('.auth-brand-icon-v178').isVisible());assert.equal(await p.locator('.auth-logo').textContent(),'ExstraChat');assert(await p.locator('.auth-box').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await p.locator('#auth-screen').evaluate(n=>n.scrollWidth<=innerWidth));
   await p.screenshot({path:path.join(root,`outputs/logo-v178-auth-${width}.png`)});assert.deepEqual(errors,[]);await p.close();
  }
  // Startup is static and lightweight: no new polling or animation script.
  const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});let html=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,f)=>f.endsWith('.css')?'<style>'+read(f)+'</style>':'');
  await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:html}));await assets(p);await p.goto('https://phone.test/');await decoded(p,'.startup-mark img');assert(await p.locator('.startup-mark img').isVisible());await p.screenshot({path:path.join(root,'outputs/logo-v178-startup.png')});await p.close();
  console.log('PASS v178: artwork decodes, small WebP variants, PNG/ICO sizes, versioned PWA icons/cache, phone+desktop+auth+startup layouts and light/green themes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
