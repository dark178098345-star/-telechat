const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const base='https://telechat.test/app/sw.js',stores=new Map(),handlers={};let active=0,peak=0,requests=[];
const absolute=url=>new URL(url,base).href;
function cache(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {
 match:async url=>data.get(absolute(url)),put:async(url,response)=>data.set(absolute(url),response),
 add:async url=>{requests.push(url);active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));data.set(absolute(url),{ok:true});active--;}
};}
const sandbox={URL,Promise,Array,caches:{keys:async()=>[...stores.keys()],open:async name=>cache(name),delete:async name=>stores.delete(name)},self:{location:{href:base,origin:'https://telechat.test'},skipWaiting:async()=>{},clients:{claim:async()=>{}},addEventListener:(name,handler)=>handlers[name]=handler}};
vm.runInNewContext(source+';self.assets=APP_SHELL;self.cacheName=CACHE_NAME;',sandbox);
(async()=>{
 const old=cache('telechat-shell-old');cache('unrelated-app');
 const assets=sandbox.self.assets;
 for(const asset of assets)if(asset.includes('?v='))await old.put(asset,{ok:true});
 await old.put('./index.html',{ok:true,stale:true});
 let work;handlers.install({waitUntil:p=>work=p});await work;
 assert.equal(requests.length,assets.filter(a=>!a.includes('?v=')).length,'only mutable assets downloaded');assert(peak<=4,'bounded installation concurrency');
 const current=stores.get(sandbox.self.cacheName);assert.equal(current.size,assets.length);assert.equal(current.get(absolute('./index.html')).stale,undefined,'fresh HTML');
 handlers.activate({waitUntil:p=>work=p});await work;assert(stores.has('unrelated-app'));assert(!stores.has('telechat-shell-old'));
 console.log(`PASS startup cache: ${assets.length-requests.length} versioned resources reused, ${requests.length} mutable resources fetched, peak ${peak} requests, fresh HTML, unrelated caches preserved`);
})().catch(e=>{console.error(e);process.exitCode=1;});
