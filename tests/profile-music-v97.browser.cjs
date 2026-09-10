const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent('<main><div id="status">Привет</div></main>');
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
 await page.addScriptTag({content:source.slice(source.indexOf("const PROFILE_DATA_PREFIX="),source.indexOf('function getAvatarPhoto'))});
 await page.evaluate(()=>{
  window.me={nick:'self',name:'Self',status:'старый статус'};window.userCache={self:me};
  window.remoteStatus='__telechat_profile_v1__:'+JSON.stringify({status:'свежий статус',photo:'data:image/png;base64,AA==',extra:'keep'});
  window.conflict=false;window.failed=false;window.reads=0;window.writes=0;
  window.sb={from:()=>{
   let update=null,filters={};const q={
    select(){return q;},update(data){update=data;return q;},eq(key,value){filters[key]=value;return q;},is(key,value){filters[key]=value;return q;},
    async maybeSingle(){
     if(!update){reads++;if(conflict)me.status=remoteStatus.replace('свежий статус','изменён локально');return {data:{nick:'self',status:remoteStatus},error:null};}
     writes++;if(failed)return {error:{message:'Сеть недоступна'}};
     if('status' in filters)throw new Error('Large profile payload must not be sent as a URL filter');
     remoteStatus=update.status;return {data:{nick:'self',status:remoteStatus},error:null};
    }
   };return q;
  }};
  window.playCalls=[];window.telechatMusicV96={playLink:async(...args)=>{playCalls.push(args);}};
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'profile-music-v97.js'),'utf8')});
 const track={url:'https://audio.example/song.mp3',title:'Мой трек',duration:123};
 await page.evaluate(track=>telechatProfileMusicV97.save(track),track);
 const saved=await page.evaluate(()=>JSON.parse(remoteStatus.split('__telechat_profile_v1__:')[1]));
 assert.equal(saved.status,'свежий статус');assert.equal(saved.photo,'data:image/png;base64,AA==');assert.equal(saved.extra,'keep');assert.equal(saved.music.url,track.url);
 assert.equal(await page.evaluate(()=>unpackProfileData(packProfileData('Новый статус','')).music.title),'Мой трек');
 await page.evaluate(()=>telechatProfileMusicV97.renderAfter(document.querySelector('#status'),me));
 assert.equal(await page.locator('.profile-music-copy-v97 strong').textContent(),'Мой трек');
 assert.equal(await page.evaluate(()=>playCalls.length),0);
 await page.locator('.profile-music-play-v97').click();assert.equal(await page.evaluate(()=>playCalls.length),1);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-music-state-v97',{detail:{url:'https://audio.example/song.mp3',playing:true}})));
 assert.equal(await page.locator('.profile-music-play-v97').getAttribute('data-state'),'pause');
 const node=await page.locator('.profile-music-play-v97').elementHandle();await page.evaluate(()=>telechatProfileMusicV97.renderAfter(document.querySelector('#status'),me));assert(await node.evaluate(el=>el.isConnected));
 await page.evaluate(()=>{conflict=true;});
 assert.match(await page.evaluate(async()=>{try{await telechatProfileMusicV97.save(null);}catch(e){return e.message;}}),/успел измениться/);
 assert.equal(await page.evaluate(()=>telechatProfileMusicV97.getOwn().title),'Мой трек');
 await page.evaluate(()=>{conflict=false;failed=true;me.status=remoteStatus;});
 assert.match(await page.evaluate(async()=>{try{await telechatProfileMusicV97.save(null);}catch(e){return e.message;}}),/Сеть/);
 await page.evaluate(()=>{failed=false;});
 await page.locator('.profile-music-remove-v97').click();await page.waitForFunction(()=>!document.querySelector('.profile-music-v97'));
 assert.equal(await page.evaluate(()=>telechatProfileMusicV97.getOwn()),null);
 assert.equal(await page.evaluate(()=>unpackProfileData(me.status).status),'свежий статус');
 await page.evaluate(()=>telechatProfileMusicV97.renderAfter(document.querySelector('#status'),{nick:'friend',status:'__telechat_profile_v1__:'+JSON.stringify({status:'Hi',music:{url:'https://audio.example/song.mp3',title:'<img src=x onerror=alert(1)>',duration:12}})}));
 assert.equal(await page.locator('.profile-music-v97 img').count(),0);assert.equal(await page.locator('.profile-music-remove-v97').count(),0);
 await page.locator('.profile-music-play-v97').click();assert.equal(await page.evaluate(()=>playCalls[1][1]),'friend');
 assert.equal(await page.evaluate(()=>telechatProfileMusicV97.clean({url:'javascript:alert(1)'})),null);
 assert.equal(await page.evaluate(()=>telechatProfileMusicV97.clean({url:'data:audio/mp3;base64,AAAA'})),null);
 assert.equal(await page.evaluate(()=>telechatProfileMusicV97.clean({url:'https://user:password@example.com/a.mp3'})),null);
 console.log('PASS: public profile music, fresh status/photo preservation, later edits retain music, play opt-in, stable DOM, removal, conflicts, server errors, unsafe URLs, escaped titles.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
