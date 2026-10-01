const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const db=new Map(),users=new Map(),clients=new Map(),pages=new Set(),errors=[],requests=[];
let delayBackground=false,delayMusicInit=false,failWrites=false;const failReads=new Set();
const dbKey=r=>r.nick+'|'+r.chat_key;
const matches=(r,filters)=>filters.every(([op,k,v])=>op==='eq'?r[k]===v:op==='in'?v.includes(r[k]):op==='lt'?Number(r[k])<Number(v):op==='gte'?Number(r[k])>=Number(v):op==='like'?String(r[k]).startsWith(v.slice(0,-1)):true);
async function broadcast(){const state={};for(const item of clients.values())if(item.payload)state[item.payload.key]=[item.payload];await Promise.all([...pages].filter(p=>!p.isClosed()).map(p=>p.evaluate(s=>window.fixtureChannel?.apply(s),state)));}
function init({nick,device}){
 window.me={nick};window.currentChat=nick==='observer'?'alice':'observer';window.currentRoom=null;window.viewedProfileNickV5=currentChat;window.userCache={};window.SUPABASE_URL='https://presence.test';window.SUPABASE_KEY='public-fixture';window.blocked=false;window.telechatIsBlockedV74=()=>blocked;
 Object.defineProperty(navigator,'userAgentData',{configurable:true,value:{mobile:device==='phone'}});
 window.doLogin=async()=>true;window.updateOnline=async()=>{};window.updateStatusBar=async()=>{};window.renderContacts=async()=>{};window.openUserProfile=async nick=>{viewedProfileNickV5=nick;};
 window.sb={channel(){const c={state:{},callback:null,on(event,filter,fn){if(event==='presence')this.callback=fn;return this},subscribe(fn){this.status=fn;setTimeout(()=>fn('SUBSCRIBED'),0);return this},track(payload){return window.presenceFixture({a:'track',payload})},untrack(){return window.presenceFixture({a:'untrack'})},presenceState(){return this.state},apply(state){this.state=state;this.callback?.();}};window.fixtureChannel=c;return c;},removeChannel(c){c.status('CLOSED');return window.presenceFixture({a:'untrack'})},from(table){const filters=[];let action='select',values=null;const q={select(){return q},abortSignal(){return q},eq(k,v){filters.push(['eq',k,v]);return q},in(k,v){filters.push(['in',k,v]);return q},like(k,v){filters.push(['like',k,v]);return q},lt(k,v){filters.push(['lt',k,v]);return q},gte(k,v){filters.push(['gte',k,v]);return q},update(v){action='update';values=v;return q},delete(){action='delete';return q},then(resolve,reject){return window.presenceFixture({a:'query',table,filters,action,values}).then(resolve,reject)}};return q;}};
 window.setVisible=visible=>{Object.defineProperty(document,'hidden',{configurable:true,value:!visible});Object.defineProperty(document,'visibilityState',{configurable:true,value:visible?'visible':'hidden'});document.dispatchEvent(new Event('visibilitychange'));};
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext();await context.exposeBinding('presenceFixture',async({page},data)=>{requests.push(data);
  if(data.a==='track'){clients.set(page,{payload:data.payload});await broadcast();return 'ok';}
  if(data.a==='untrack'){clients.delete(page);await broadcast();return 'ok';}
  if(data.a==='query'){const kind=data.table==='users'?'users':data.filters.some(f=>f[0]==='like')?'modern':'legacy';if(data.action==='select'&&failReads.has(kind)){if(kind==='modern')throw Error('temporary modern failure');return {data:null,error:{message:'temporary '+kind+' failure'}};}const source=data.table==='typing'?db:users,rows=[...source.values()].filter(r=>matches(r,data.filters));if(data.action==='delete')rows.forEach(r=>source.delete(data.table==='typing'?dbKey(r):r.nick));if(data.action==='update')rows.forEach(r=>Object.assign(r,data.values));return {data:structuredClone(rows),error:null};}
 });
 await context.route('https://presence.test/**',async route=>{const req=route.request(),url=new URL(req.url()),method=req.method();
  if(method==='OPTIONS')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PATCH','Access-Control-Allow-Headers':'*'}});
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Date',Date:new Date().toUTCString()};
  if(failWrites&&method!=='GET')return route.fulfill({status:503,headers,body:'offline fixture'});
  if(method==='POST'){const row=req.postDataJSON();if(delayMusicInit&&row.chat_key.includes(':music:'))await new Promise(r=>setTimeout(r,180));if(!db.has(dbKey(row)))db.set(dbKey(row),row);}
  if(method==='PATCH'){const row=req.postDataJSON();if(delayBackground&&row.ts%10===2)await new Promise(r=>setTimeout(r,180));const key=url.searchParams.get('nick').slice(3)+'|'+url.searchParams.get('chat_key').slice(3),old=db.get(key),max=Number(url.searchParams.get('ts').slice(3));if(old&&Number(old.ts)<max)Object.assign(old,row);}
  return route.fulfill({status:method==='GET'?200:204,headers,body:method==='GET'?'[]':''});
 });
 async function pageFor(nick,device='pc'){const p=await context.newPage();pages.add(p);p.on('pageerror',e=>errors.push(e.message));users.set(nick,{nick,last_seen:Date.now()-200000});await p.goto('https://presence.test/');await p.evaluate(init,{nick,device});await p.setContent('<div id="contacts-list"><div class="contact" data-contact-nick="alice"><div class="av"></div><div class="contact-name">Alice</div></div></div><div id="chat-status-text" class="chat-status-text offline"></div><div id="chat-av" class="av"></div><div id="view-profile-seen"></div><div id="view-profile-avatar"></div>');await p.addScriptTag({path:path.join(root,'presence-model-v120.js')});await p.addScriptTag({path:path.join(root,'presence-v120.js')});await p.waitForFunction(()=>window.fixtureChannel);return p;}
 const observer=await pageFor('observer'),pc=await pageFor('alice'),phone=await pageFor('alice','phone');
 const state=async wanted=>observer.waitForFunction(w=>telechatPresenceV120.state('alice').state===w,wanted);
 await state('online');await observer.waitForFunction(()=>document.querySelector('#chat-status-text').classList.contains('online'));
 const music=async(page,playing)=>page.evaluate(playing=>window.dispatchEvent(new CustomEvent('telechat-music-state-v97',{detail:{playing,url:'https://private.test/secret-track.mp3',title:'Private title'}})),playing);
 await music(phone,true);
 await observer.waitForFunction(()=>document.querySelector('#view-profile-seen').textContent==='Слушает музыку');
 assert.equal(await observer.locator('#chat-status-text').textContent(),'в сети','Music only changes profile label');
 const musicPayload=clients.get(phone).payload;assert.equal(musicPayload.listening,true);
 assert.deepEqual(Object.keys(musicPayload).sort(),['at','device','key','listening','nick','state'],'No track identity in presence');
 await phone.waitForTimeout(200);await observer.evaluate(()=>telechatPresenceV120.refresh(true,'alice'));
 assert.equal(await observer.locator('#view-profile-seen .listening-icon-v145').count(),1,'Listening has a custom headphones icon');
 clients.set(phone,{payload:{...musicPayload,at:Date.now()-180000}});await broadcast();
 assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('alice').listening),true,'Fresh stored lease survives stale realtime');
 clients.set(phone,{payload:musicPayload});await broadcast();await observer.waitForFunction(()=>telechatPresenceV120.state('alice').listening);
 await observer.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});
 await observer.waitForFunction(()=>!document.querySelector('#view-profile-seen').textContent.includes('Слушает'));
 await observer.evaluate(()=>{delete navigator.onLine;window.dispatchEvent(new Event('online'));});await observer.waitForFunction(()=>telechatPresenceV120.state('alice').listening);
 await phone.evaluate(()=>{viewedProfileNickV5='alice';telechatPresenceV120.paintProfile();});
 assert.equal(await phone.locator('#view-profile-seen').textContent(),'Слушает музыку','Own profile updates too');
 await music(pc,true);await music(phone,false);
 await observer.waitForFunction(()=>telechatPresenceV120.state('alice').listening===true);
 await music(pc,false);await observer.waitForFunction(()=>!telechatPresenceV120.state('alice').listening);
 await observer.waitForFunction(()=>document.querySelector('#view-profile-seen').textContent==='● сейчас в сети');
 await pc.evaluate(()=>setVisible(false));await phone.evaluate(()=>setVisible(false));await music(phone,true);
 await observer.waitForFunction(()=>document.querySelector('#view-profile-seen').textContent==='Слушает музыку☾');
 await observer.evaluate(()=>{blocked=true;telechatPresenceV120.paintProfile();});assert.equal(await observer.locator('#view-profile-seen').textContent(),'был давно','Blocked profile hides listening');
 await observer.evaluate(()=>{blocked=false;telechatPresenceV120.paintProfile();});
 await phone.evaluate(()=>telechatPresenceV120.leave());await observer.waitForFunction(()=>!telechatPresenceV120.state('alice').listening);
 await phone.evaluate(()=>{telechatPresenceV120.wake();setVisible(true);});await music(phone,false);await pc.evaluate(()=>setVisible(true));
 await observer.waitForFunction(()=>document.querySelector('#view-profile-seen').textContent==='● сейчас в сети');
 const noMusicTracks=requests.filter(x=>x.a==='track').length;
 await music(phone,false);await music(phone,false);await phone.waitForTimeout(100);
 assert.equal(requests.filter(x=>x.a==='track').length,noMusicTracks,'Repeated playback event does not force new requests');
 await phone.evaluate(()=>viewedProfileNickV5='observer');
 await observer.evaluate(()=>{window.oldPresenceChannel=fixtureChannel;fixtureChannel.status('CHANNEL_ERROR');});await observer.waitForFunction(()=>fixtureChannel!==oldPresenceChannel);await state('online');
 await observer.evaluate(()=>{window.recoveredPresenceChannel=fixtureChannel;oldPresenceChannel.status('CLOSED');oldPresenceChannel.apply({});});await observer.waitForTimeout(150);assert.equal(await observer.evaluate(()=>fixtureChannel===recoveredPresenceChannel),true,'Late events from replaced channel cannot restart or erase new connection');
 await pc.evaluate(()=>setVisible(false));await phone.evaluate(()=>setVisible(false));await state('background');await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent==='в фоне☾');assert.equal(await observer.locator('.contact .av').evaluate(e=>e.classList.contains('av-online')),false);
 assert.equal(await observer.locator('#view-profile-seen').textContent(),'в фоне☾');
 await phone.evaluate(()=>setVisible(true));await state('online');assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('alice').device),'phone');
 await pc.evaluate(()=>telechatPresenceV120.leave());await state('online');assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('alice').device),'phone','Exiting desktop does not hide active phone');
 delayBackground=true;await phone.evaluate(()=>{setVisible(false);setVisible(true);});await state('online');await phone.waitForTimeout(250);const key=await phone.evaluate(()=>fixtureChannel.state[Object.keys(fixtureChannel.state).find(k=>fixtureChannel.state[k][0].nick==='alice'&&fixtureChannel.state[k][0].device==='phone')][0].key);assert.equal(db.get('alice|'+key).ts%10,1,'Delayed background PATCH cannot overwrite newer online PATCH');delayBackground=false;
 await observer.evaluate(()=>{document.querySelector('#chat-status-text').className='chat-status-text typing';document.querySelector('#chat-status-text').textContent='печатает…';});await phone.evaluate(()=>setVisible(false));await state('background');assert.equal(await observer.locator('#chat-status-text').textContent(),'печатает…','Typing takes priority');
 await observer.evaluate(()=>{document.querySelector('#chat-status-text').classList.remove('typing');updateStatusBar();});await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent==='в фоне☾');
 await observer.evaluate(()=>{blocked=true;updateStatusBar();});await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent==='был давно');assert.equal(await observer.locator('#chat-av').evaluate(e=>e.classList.contains('av-background-v101')),false,'Privacy hides moon too');await observer.evaluate(()=>{blocked=false;updateStatusBar();});
 await phone.evaluate(()=>{window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}}));setVisible(true);});await state('online');await phone.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));await state('background');
 await phone.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));await state('online');
 await phone.evaluate(()=>telechatPresenceV120.leave());await state('offline');await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent.includes('только что'));
 failWrites=true;await phone.evaluate(()=>{telechatPresenceV120.wake();});await state('online');failWrites=false;await phone.evaluate(()=>window.dispatchEvent(new Event('online')));await phone.waitForTimeout(200);assert.equal([...db.values()].filter(r=>r.nick==='alice').some(r=>r.ts%10===1),true,'Reconnect republishes after transient storage failure');
 const before=requests.filter(x=>x.a==='query'&&x.action==='select').length;await observer.evaluate(async()=>{for(let i=0;i<12;i++)await renderContacts();});await observer.waitForTimeout(200);assert.ok(requests.filter(x=>x.a==='query'&&x.action==='select').length-before<=3,'Contact redraws share cached batched reads');
 const aliceKeys=[...db.values()].filter(r=>r.nick==='alice').map(r=>r.chat_key);await phone.evaluate(async()=>{me={nick:'bob'};await doLogin();});await phone.waitForTimeout(200);assert.ok([...db.values()].some(r=>r.nick==='bob'));assert.ok(aliceKeys.every(k=>db.has('alice|'+k)),'Account switch does not delete another session');
 const model=require('../presence-model-v120.js'),partialKey=model.PREFIX+'partial:pc';
 const partial={chat_key:partialKey,nick:'partial',ts:model.encode(Date.now(),'background')};db.set(dbKey(partial),partial);users.set('partial',{nick:'partial',last_seen:Date.now()-300000});
 failReads.add('users');await observer.evaluate(async()=>{currentChat='partial';viewedProfileNickV5='partial';await telechatPresenceV120.refresh(true,'partial');});await observer.waitForFunction(()=>telechatPresenceV120.state('partial').state==='background');
 await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent==='в фоне☾');
 failReads.delete('users');failReads.add('legacy');partial.ts=model.encode(Date.now(),'online');
 await observer.evaluate(()=>telechatPresenceV120.refresh(true,'partial'));await observer.waitForFunction(()=>telechatPresenceV120.state('partial').state==='online');
 failReads.add('modern');users.set('timestamp',{nick:'timestamp',last_seen:Date.now()-300000});
 await observer.evaluate(async()=>{currentChat='timestamp';viewedProfileNickV5='timestamp';await telechatPresenceV120.refresh(true,'timestamp');});await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent.includes('мин. назад'));assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('timestamp').state),'unknown','A timestamp alone during partial failure cannot claim online');
 assert((await observer.locator('#chat-status-text').getAttribute('title')).includes('подтверждённая'));
 await observer.evaluate(()=>{currentChat='blank';viewedProfileNickV5='blank';telechatPresenceV120.paintHeader();});assert.equal(await observer.locator('#chat-status-text').textContent(),'обновляем статус…');
 failReads.add('users');await observer.evaluate(()=>telechatPresenceV120.refresh(true,'blank'));await observer.waitForFunction(()=>document.querySelector('#chat-status-text').textContent==='нет данных об активности');
 const blankReads=()=>requests.filter(x=>x.a==='query'&&x.action==='select'&&x.filters.some(f=>f[0]==='in'&&f[1]==='nick'&&f[2].includes('blank'))).length;
 const failedBefore=blankReads();await observer.evaluate(async()=>{for(let i=0;i<20;i++){await updateStatusBar();await renderContacts();}});await observer.waitForTimeout(250);assert.equal(blankReads(),failedBefore,'Failed reads are throttled too; repaint cannot create a request storm');
 failReads.clear();const recovered={chat_key:model.PREFIX+'blank:phone',nick:'blank',ts:model.encode(Date.now(),'online')};db.set(dbKey(recovered),recovered);
 await observer.evaluate(()=>telechatPresenceV120.refresh(true,'blank'));await observer.waitForFunction(()=>document.querySelector('#chat-status-text').classList.contains('online'));
 await observer.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});await observer.waitForFunction(()=>!document.querySelector('#chat-status-text').classList.contains('online'));assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('blank').state),'unknown');
 assert((await observer.locator('#chat-status-text').getAttribute('title')).includes('Нет соединения'));
 await observer.evaluate(()=>{delete navigator.onLine;window.dispatchEvent(new Event('online'));});await observer.waitForFunction(()=>document.querySelector('#chat-status-text').classList.contains('online'));
 // A different account can open a profile using only the batched REST result, without any peer Realtime metadata.
 const addStored=(nick,age=0)=>{const at=Date.now()-age,key=model.PREFIX+nick+':phone';for(const chat_key of [key,model.PREFIX+'music:'+nick+':phone']){const row={chat_key,nick,ts:model.encode(at,'online')+(chat_key.includes(':music:')?2:0)};db.set(dbKey(row),row);}return key;};
 addStored('listener');await observer.evaluate(async()=>{viewedProfileNickV5='listener';await telechatPresenceV120.refresh(true,'listener');});
 assert.equal(model.decode(db.get('listener|'+model.PREFIX+'music:listener:phone')),null,'Old clients cannot interpret listening marker as online');
 await observer.waitForFunction(()=>document.querySelector('#view-profile-seen').textContent==='Слушает музыку');
 assert.equal(await observer.locator('.listening-icon-v145').count(),1);
 const marker=db.get('listener|'+model.PREFIX+'music:listener:phone');marker.ts=model.encode(Date.now()+1,'offline');
 await observer.evaluate(()=>telechatPresenceV120.refresh(true,'listener'));await observer.waitForFunction(()=>!document.querySelector('#view-profile-seen').textContent.includes('Слушает'));
 assert.equal(await observer.locator('.listening-icon-v145').count(),0,'Pause removes headphones');
 addStored('expired_listener',180000);await observer.evaluate(async()=>{viewedProfileNickV5='expired_listener';await telechatPresenceV120.refresh(true,'expired_listener');});
 assert.equal(await observer.evaluate(()=>telechatPresenceV120.state('expired_listener').listening),false,'Stored listening lease expires');
 delayMusicInit=true;const race=await pageFor('race');await music(race,true);await music(race,false);await race.waitForTimeout(350);delayMusicInit=false;
 const raceMarkers=[...db.values()].filter(r=>r.nick==='race'&&r.chat_key.includes(':music:'));assert.equal(raceMarkers.length,1);assert.equal(raceMarkers[0].ts%10,0,'Rapid first play/pause cannot leave delayed active lease');
 assert.deepEqual(errors,[]);console.log('PASS presence browser: headphones, cross-account REST fallback, lease expiry, first-play race, music lifecycle/multidevice/privacy, source failures, recovery and bounded requests.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
