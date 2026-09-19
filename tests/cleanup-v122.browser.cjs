const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),failures=[];
const cacheName=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE_NAME='([^']+)'/)[1];
const server=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route==='/cleanup-fixture'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Cache verification</title>');}
  const file=path.resolve(root,'.'+decodeURIComponent(route==='/'?'/index.html':route));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){failures.push(route);res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext(),page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/cleanup-fixture`);
    await page.evaluate(async()=>{
      const old=await caches.open('telechat-shell-v121-message-recovery');await old.put('./obsolete-fixture',new Response('old'));
      await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    });
    assert.deepEqual(await page.evaluate(()=>caches.keys()),[cacheName],'new cache must replace the previous app shell');
    const urls=await page.evaluate(async name=>{const c=await caches.open(name);return (await c.keys()).map(r=>r.url);},cacheName);
    assert.equal(new Set(urls.map(url=>new URL(url).pathname)).size,urls.length,'one cached copy per file');
    await context.setOffline(true);
    const errors=await page.evaluate(async urls=>{
      const errors=[];for(const url of urls){try{const response=await fetch(url);if(!response.ok||(await response.arrayBuffer()).byteLength===0)errors.push(url);}catch(_){errors.push(url);}}return errors;
    },urls);
    assert.deepEqual(errors,[],'every precached file must be available offline');
    assert.deepEqual(failures,[],'install must not request removed files');
    console.log(`PASS cleanup browser: worker upgrade, old cache removal, ${urls.length} offline assets, no duplicate versions or missing files.`);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
