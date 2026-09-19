const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'user-cache-v123.js'),'utf8');
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxioAAAAASUVORK5CYII=';
async function fixture(context,owner='me'){
  const page=await context.newPage();await page.route('http://cache.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div id="contacts-list"></div>'}));await page.goto('http://cache.test/');
  await page.evaluate(({owner,photo})=>{
    window.me={nick:owner};window.userCache={};window.requests=[];window.fail=false;window.gates=[];window.revision='';
    window.sb={from:()=>({select(fields){this.fields=fields;return this;},in(field,nicks){this.nicks=nicks;return this;},abortSignal(signal){this.signal=signal;return this;},
      async then(resolve,reject){const keys=this.nicks;requests.push(keys);try{
        if(window.delayed)await new Promise((done,fail)=>{gates.push(done);this.signal.addEventListener('abort',()=>fail(Error('aborted')),{once:true});});
        if(window.fail)throw Error('network fixture');
        const data=keys.map(nick=>({nick,name:nick+revision,av:0,status:'__telechat_profile_v1__:'+JSON.stringify({status:'Hi',photo}),last_seen:10,avatar_video:'',animated_profile:false}));
        return resolve({data});
      }catch(error){return reject(error);}}})};
  },{owner,photo});
  await page.addScriptTag({content:source});return page;
}
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext(),page=await fixture(context),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.evaluate(async()=>{
      await Promise.all([telechatUserCacheV123.many(['alice','bob'],true),telechatUserCacheV123.get('alice'),telechatUserCacheV123.many(['bob'],true)]);
      await telechatUserCacheV123.get('alice');await telechatUserCacheV123.many(['alice','bob'],true);
      userCache.alice.password='must-not-persist';userCache.alice.bio='not-a-light-field';telechatUserCacheV123.merge(userCache.alice);
      await telechatUserCacheV123.flush();
    });
    const calls=await page.evaluate(()=>requests.flat());assert.equal(calls.filter(x=>x==='alice').length,1);assert.equal(calls.filter(x=>x==='bob').length,1);
    assert.equal(await page.evaluate(()=>requests.length),1,'overlapping get/batch callers must share one network batch');
    const stored=await page.evaluate(async()=>{const req=indexedDB.open('telechat-user-photos-v123');return new Promise(resolve=>{req.onsuccess=()=>{const q=req.result.transaction('profiles').objectStore('profiles').getAll();q.onsuccess=()=>resolve(q.result);};});});
    assert(stored.find(row=>row.value.nick==='alice').value.status.includes(photo));
    assert(!JSON.stringify(stored).includes('must-not-persist'));assert(!JSON.stringify(stored).includes('not-a-light-field'));
    const restored=await fixture(context);await context.setOffline(true);
    const result=await restored.evaluate(async()=>{const start=performance.now();const user=await telechatUserCacheV123.get('alice');return {status:user.status,requests:requests.length,ms:Math.round(performance.now()-start)};});
    assert(result.status.includes(photo));assert.equal(result.requests,0,'warm restart must restore avatar offline without server requests');
    await restored.evaluate(()=>{userCache.bob={nick:'bob',status:'plain snapshot'};});
    assert((await restored.evaluate(async()=>{await telechatUserCacheV123.many(['bob']);return userCache.bob.status;})).includes(photo),'photo cache must replace stripped sidebar snapshot');
    const other=await fixture(context,'other');
    assert.equal(await other.evaluate(()=>telechatUserCacheV123.get('alice')),null,'photo cache must be isolated per signed-in account');
    await context.setOffline(false);
    await restored.evaluate(async()=>{const now=Date.now;Date.now=()=>now()+61000;revision=' updated';delayed=true;window.stale=await telechatUserCacheV123.get('alice');await telechatUserCacheV123.get('alice');});
    await restored.waitForFunction(()=>gates.length===1);
    assert.equal(await restored.evaluate(()=>stale.name),'alice','stale photo must be shown immediately while refreshing');
    assert.equal(await restored.evaluate(()=>requests.length),1,'stale avatar requests must be coalesced');
    await restored.evaluate(()=>gates.shift()());await restored.waitForFunction(()=>userCache.alice.name==='alice updated');
    await page.evaluate(()=>{delayed=true;window.editTask=telechatUserCacheV123.get('edited');});await page.waitForFunction(()=>gates.length===1);
    await page.evaluate(()=>{telechatUserCacheV123.merge({nick:'edited',name:'Newer profile',status:'new'});gates.shift()();});
    assert.equal(await page.evaluate(async()=>(await editTask).name),'Newer profile','late light response must not overwrite a newer profile update');
    await page.evaluate(()=>{delayed=true;window.oldTask=telechatUserCacheV123.get('slow');});await page.waitForFunction(()=>gates.length===1);
    await page.evaluate(()=>{me={nick:'other'};userCache={};telechatUserCacheV123.restore([]);gates.shift()();});
    assert.equal(await page.evaluate(()=>oldTask),null);assert.equal(await page.evaluate(()=>userCache.slow),undefined,'late result must not enter another account');
    await page.evaluate(()=>{delayed=false;fail=true;});
    await page.evaluate(()=>telechatUserCacheV123.get('failed').catch(()=>{}));const before=await page.evaluate(()=>requests.length);
    await page.evaluate(()=>Promise.all([telechatUserCacheV123.get('failed'),telechatUserCacheV123.get('failed')]));
    assert.equal(await page.evaluate(()=>requests.length),before,'offline/error retries must not repeat per rendered message');
    const bounded=await fixture(context,'budget');
    const limits=await bounded.evaluate(async()=>{
      await telechatUserCacheV123.many(Array.from({length:205},(_,i)=>'friend'+i));await telechatUserCacheV123.flush();
      const req=indexedDB.open('telechat-user-photos-v123');return new Promise(resolve=>{req.onsuccess=()=>{const q=req.result.transaction('profiles').objectStore('profiles').index('owner').getAll('budget');q.onsuccess=()=>resolve({records:q.result.length,bytes:q.result.reduce((n,r)=>n+r.bytes,0),batchSizes:requests.map(x=>x.length)});};});
    });
    assert.equal(limits.records,200);assert(limits.bytes<=6*1024*1024);assert(limits.batchSizes.every(size=>size<=40));
    const bytes=await bounded.evaluate(async()=>{
      for(let i=0;i<40;i++)telechatUserCacheV123.merge({nick:'large'+i,status:'A'.repeat(90000)});await telechatUserCacheV123.flush();
      const req=indexedDB.open('telechat-user-photos-v123');return new Promise(resolve=>{req.onsuccess=()=>{const q=req.result.transaction('profiles').objectStore('profiles').index('owner').getAll('budget');q.onsuccess=()=>resolve(q.result.reduce((n,r)=>n+r.bytes,0));};});
    });assert(bytes<=6*1024*1024,'oversized cache must be pruned to its byte budget');
    const concurrent=await fixture(context,'concurrency');
    await concurrent.evaluate(()=>{delayed=true;window.a=telechatUserCacheV123.get('a');});await concurrent.waitForFunction(()=>gates.length===1);
    await concurrent.evaluate(()=>{window.b=telechatUserCacheV123.get('b');});await concurrent.waitForFunction(()=>gates.length===2);
    await concurrent.evaluate(()=>{window.c=telechatUserCacheV123.get('c');});await concurrent.waitForTimeout(30);
    assert.equal(await concurrent.evaluate(()=>requests.length),2,'requests from separate turns must share the same concurrency limit');
    await concurrent.evaluate(()=>gates.splice(0).forEach(done=>done()));await concurrent.waitForFunction(()=>requests.length===3&&gates.length===1);
    await concurrent.evaluate(async()=>{gates.shift()();await Promise.all([a,b,c]);});
    const deniedContext=await browser.newContext();await deniedContext.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('storage blocked');}}});});
    const denied=await fixture(deniedContext);await denied.evaluate(async()=>{await telechatUserCacheV123.get('alice');await telechatUserCacheV123.flush();});
    assert.equal(await denied.evaluate(()=>userCache.alice.nick),'alice','blocked device storage must not block normal network avatars');await deniedContext.close();
    assert.deepEqual(errors,[]);
    console.log(`PASS user cache: overlapping callers share 1 batch; restart avatar ${result.ms}ms / 0 network requests; snapshot restoration, bounded retry, sensitive-field exclusion and account isolation.`);
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
