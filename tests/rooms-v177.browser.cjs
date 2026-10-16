const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
async function setup(browser,width){
 const {p,errors}=await fixture(browser,width,900,width<600);p.on('dialog',d=>d.accept());
 await p.evaluate(()=>{
  window.roomRows=[];window.roomDB=new Map();window.memberDB=new Map();window.roomRequests=[];window.roomMode='ok';window.roomInserts=0;
  window.roomUsers=[me,...Object.values(userCache)];
  window.sb={from(table){let action='select',payload=null,one=false,range=null,pattern='',order=[],filters=[],options={};const q={
   select(){return q},insert(data){action='insert';payload=data;return q},update(data){action='update';payload=data;return q},delete(){action='delete';return q},upsert(data,opts){action='upsert';payload=data;options=opts||{};return q},eq(k,v){filters.push([k,[v]]);return q},in(k,v){filters.push([k,v]);return q},ilike(k,v){pattern=v.replace(/\\_/g,'_').replace(/%/g,'');return q},order(k){order.push(k);return q},range(a,b){range=[a,b];return q},limit(n){range=[0,n-1];return q},single(){one=true;return q},maybeSingle(){one=true;return q},abortSignal(){return q},then(resolve,reject){return Promise.resolve().then(()=>{
    roomRequests.push({table,action});let rows=table==='users'?roomUsers:table==='rooms'?[...roomDB.values()]:table==='room_members'?[...memberDB.values()]:[];
    if(action==='select'&&table==='room_members'&&roomMode==='members-select-fail')return {error:{message:'temporary failure'}};
    const matches=row=>filters.every(([k,values])=>values.some(v=>String(row[k])===String(v)));rows=rows.filter(matches);if(pattern)rows=rows.filter(r=>r.nick.includes(pattern));
    if(action==='insert'){roomInserts++;if(roomDB.has(payload.id))return {error:{code:'23505'}};roomDB.set(payload.id,{...payload});if(roomMode==='lost'){roomMode='ok';return {error:{message:'lost acknowledgement'}};}rows=[{...payload}];}
    if(action==='upsert'){
     if(roomMode==='members-fail'){roomMode='ok';return {error:{message:'membership rejected'}};}
     for(const row of [].concat(payload)){const key=row.room_id+'|'+row.user_nick;if(options.ignoreDuplicates&&memberDB.has(key))continue;memberDB.set(key,{...row});}rows=[].concat(payload);
    }
    if(action==='update'){for(const row of rows){Object.assign(row,payload);roomDB.set(row.id,row);}if(roomMode==='edit-fail')return {error:{message:'update rejected'}};}
    if(action==='delete'){if(roomMode==='delete-fail')return {error:{message:'delete rejected'}};for(const row of rows){if(table==='rooms'){roomDB.delete(row.id);for(const [k,m] of memberDB)if(String(m.room_id)===String(row.id))memberDB.delete(k);}else if(table==='room_members')memberDB.delete(row.room_id+'|'+row.user_nick);}rows=[];}
    if(order.length)rows.sort((a,b)=>{for(const key of order){const diff=typeof a[key]==='number'?a[key]-b[key]:String(a[key]).localeCompare(String(b[key]));if(diff)return diff;}return 0;});
    const count=rows.length;if(range)rows=rows.slice(range[0],range[1]+1);return {data:one?rows[0]||null:rows.map(r=>({...r})),count,error:null};
   }).then(resolve,reject);}
  };return q;}};
 });
 for(const f of ['room-media-v113.js','rooms-model-v177.js','rooms-studio-v177.js'])await p.addScriptTag({content:read(f)});
 return {p,errors};
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,1440]){
  const {p,errors}=await setup(browser,width);await p.evaluate(()=>openCreateRoomModal());
  assert.equal(await p.locator('#room-modal').count(),0,'Retired creator removed, not hidden');
  await p.locator('#rooms-submit-v177').click();assert.match(await p.locator('#rooms-error-v177').textContent(),/Название/);
  await p.locator('#rooms-name-v177').fill('Наша команда');await p.locator('#rooms-description-v177').fill('Обсуждаем планы и делимся музыкой.');
  const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=450;c.getContext('2d').fillRect(0,0,800,450);return c.toDataURL('image/png').split(',')[1];});
  await p.locator('#rooms-photo-file-v177').setInputFiles({name:'team.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.waitForFunction(()=>!exstraRoomsV177.getState().photoBusy);
  assert((await p.locator('#rooms-photo-v177 img').getAttribute('src')).startsWith('data:image/jpeg;base64,'));
  assert(await p.locator('#room-create-v177').evaluate(n=>n.scrollWidth<=n.clientWidth),'Creator fits '+width);
  if(width<600){await p.locator('#rooms-name-v177').focus();await p.evaluate(()=>{const v=new EventTarget();v.height=420;v.offsetTop=0;Object.defineProperty(window,'visualViewport',{value:v,configurable:true});window.dispatchEvent(new Event('resize'));});await p.waitForTimeout(70);assert(await p.locator('.rooms-footer-v177').evaluate(n=>n.getBoundingClientRect().bottom<=421),'Keyboard preserves navigation');await p.evaluate(()=>{document.activeElement.blur();visualViewport.height=900;window.dispatchEvent(new Event('resize'));});await p.waitForTimeout(70);}
  if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/rooms-v177-create-${width}.png`)});
  await p.locator('#rooms-submit-v177').click();await p.locator('[data-access=public]').click();await p.locator('#rooms-candidates-v177 button').first().click();
  await p.locator('#rooms-find-v177').fill('friend2');await p.waitForFunction(()=>document.querySelectorAll('#rooms-candidates-v177 button').length===1);await p.locator('#rooms-candidates-v177 button').click();
  assert.equal(await p.locator('#rooms-selected-v177 button').count(),2);await p.locator('#rooms-submit-v177').click();
  await p.evaluate(()=>roomMode='members-fail');await p.locator('#rooms-submit-v177').click();await p.waitForFunction(()=>!exstraRoomsV177.getState().busy);
  assert.match(await p.locator('#rooms-error-v177').textContent(),/Не удалось/);assert.equal(await p.evaluate(()=>roomDB.size),1);assert.equal(await p.evaluate(()=>[...roomDB.values()][0].visibility),'private','Failed setup is not published');assert.equal(await p.evaluate(()=>currentRoom),null,'Failed setup never opens a fake success chat');assert(await p.locator('#rooms-name-v177').isDisabled());
  await p.locator('#rooms-close-v177').click();await p.evaluate(()=>openCreateRoomModal());assert.match(await p.locator('#rooms-error-v177').textContent(),/не подтверждено/);await p.locator('#rooms-submit-v177').click();await p.waitForFunction(()=>currentRoom?.name==='Наша команда');
  assert.equal(await p.evaluate(()=>roomInserts),1,'Retry resumes same row');assert.equal(await p.evaluate(()=>memberDB.size),3);assert.equal(await p.evaluate(()=>currentRoom.visibility),'public');assert.equal(await p.evaluate(()=>exstraRoomsModelV177.pending()),null);
  await p.evaluate(()=>openRoomPanel());await p.waitForFunction(()=>document.querySelectorAll('.rooms-member-v177').length===3);assert(await p.locator('#rooms-manager-edit-v177').isVisible());
  if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/rooms-v177-manage-${width}.png`)});
  assert(await p.locator('#room-panel').evaluate(n=>n.scrollWidth<=n.clientWidth),'Manager fits '+width);
  await p.evaluate(()=>document.body.classList.add('theme-light'));assert(await p.locator('#room-panel').evaluate(n=>n.scrollWidth<=n.clientWidth));await p.evaluate(()=>document.body.classList.remove('theme-light'));
  const originalMember=await p.locator('.rooms-member-v177').first().elementHandle(),originalPhoto=await p.locator('#rooms-manager-avatar-v177 img').elementHandle();await p.evaluate(()=>renderRoomPanel());assert(await originalMember.evaluate(n=>n.isConnected),'Member nodes survive refresh');assert(await originalPhoto.evaluate(n=>n.isConnected),'Room photo does not blink on refresh');
  assert.equal(await p.locator('#room-panel').evaluate(n=>getComputedStyle(n).opacity),'1');
  await p.locator('#rooms-manager-edit-v177').click();await p.locator('#rooms-name-v177').fill('Обновлённая команда');await p.locator('[data-color=blue]').click();await p.locator('#rooms-submit-v177').click();await p.locator('[data-access=private]').click();await p.locator('#rooms-submit-v177').click();await p.waitForFunction(()=>currentRoom?.name==='Обновлённая команда');assert.equal(await p.evaluate(()=>currentRoom.icon),'exstra-room:v177:blue');assert.equal(await p.evaluate(()=>currentRoom.visibility),'private');
  await p.locator('#rooms-manager-add-v177').click();await p.locator('#rooms-find-v177').fill('friend3');await p.waitForFunction(()=>document.querySelectorAll('#rooms-candidates-v177 button').length===1);await p.locator('#rooms-candidates-v177 button').click();await p.locator('#rooms-submit-v177').click();await p.waitForFunction(()=>memberDB.size===4);
  await p.waitForFunction(()=>document.querySelectorAll('.rooms-member-v177').length===4);await p.locator('[aria-label="Удалить @friend3"]').click();await p.waitForFunction(()=>memberDB.size===3);
  // Existing owner/admin roles are never downgraded by adding an existing nick.
  await p.evaluate(async()=>{await exstraRoomsModelV177.add(currentRoom,['creator','friend0']);});assert.equal(await p.evaluate(()=>memberDB.get(currentRoom.id+'|creator').role),'owner');
  await p.evaluate(()=>{me={nick:'friend0'};window.dispatchEvent(new Event('telechat-account-ready-v175'));});await p.evaluate(()=>openRoomPanel());await p.waitForFunction(()=>document.querySelector('#rooms-manager-edit-v177').hidden);assert(!(await p.locator('#rooms-manager-add-v177').isVisible()));assert.equal(await p.locator('.rooms-member-remove-v177').count(),0);const refused=await p.evaluate(()=>exstraRoomsModelV177.edit(currentRoom,{name:'hijack',description:'',icon:'exstra-room:v177:rose',visibility:'public'}).then(()=>false,()=>true));assert(refused,'Fresh owner check rejects non-owner edits');
  await p.evaluate(()=>{me={nick:'creator'};window.dispatchEvent(new Event('telechat-account-ready-v175'));closeAllPanels();openCreateRoomModal();});await p.locator('[data-type=channel]').click();await p.locator('#rooms-name-v177').fill('Новости команды');await p.locator('#rooms-submit-v177').click();await p.locator('#rooms-submit-v177').click();await p.evaluate(()=>roomMode='lost');await p.locator('#rooms-submit-v177').click();await p.waitForFunction(()=>currentRoom?.type==='channel');assert.equal(await p.evaluate(()=>roomDB.size),2,'Lost response adopts same inserted channel');
  assert.deepEqual(errors,[]);await p.close();
 }
 // Single flight, server validation before writes, offline preservation and account races.
 const {p,errors}=await setup(browser,1440);
 const same=await p.evaluate(async()=>{const c=exstraRoomsModelV177.command({type:'group',visibility:'private',name:'Double click',members:[]});const [a,b]=await Promise.all([exstraRoomsModelV177.create(c),exstraRoomsModelV177.create(c)]);return [a.id,b.id,roomInserts,memberDB.size];});assert.equal(same[0],same[1]);assert.equal(same[2],1);assert.equal(same[3],1);
 assert(await p.evaluate(()=>exstraRoomsModelV177.create(exstraRoomsModelV177.command({type:'group',visibility:'public',name:'Bad member',members:['missing']})).then(()=>false,()=>true)));assert.equal(await p.evaluate(()=>roomDB.size),1,'Unknown people do not produce half-created rooms');
 await p.evaluate(()=>Object.defineProperty(navigator,'onLine',{value:false,configurable:true}));assert(await p.evaluate(()=>exstraRoomsModelV177.create(exstraRoomsModelV177.command({type:'channel',visibility:'private',name:'Offline',members:[]})).then(()=>false,()=>true)));assert.equal(await p.evaluate(()=>roomDB.size),1);await p.evaluate(()=>delete navigator.onLine);
 await p.evaluate(()=>{
  const from=sb.from;sb.from=function(table){const q=from.call(this,table),insert=q.insert,then=q.then;let writing=false;q.insert=function(...args){writing=true;return insert.apply(q,args);};q.then=function(resolve,reject){if(table==='rooms'&&writing)return new Promise(done=>window.releaseRoomCreate=done).then(()=>then.call(q,resolve,reject));return then.call(q,resolve,reject);};return q;};
  const c=exstraRoomsModelV177.command({type:'channel',visibility:'public',name:'Account race',members:[]});window.accountAttempt=exstraRoomsModelV177.create(c).catch(e=>e.message);
 });await p.waitForFunction(()=>!!window.releaseRoomCreate);
 await p.evaluate(()=>{me={nick:'other'};releaseRoomCreate();});assert.match(await p.evaluate(()=>accountAttempt),/Аккаунт/);assert.equal(await p.evaluate(()=>memberDB.size),1,'Changing account cannot write memberships for previous account');assert.equal(await p.evaluate(()=>[...roomDB.values()].find(r=>r.name==='Account race').visibility),'private');
 await p.evaluate(async()=>{me={nick:'creator'};await exstraRoomsModelV177.create(exstraRoomsModelV177.pending());});assert.equal(await p.evaluate(()=>roomInserts),2,'Original account resumes the staged room without another insert');
 // A failed delete reports failure and keeps the room, never a false success.
 assert(await p.evaluate(async()=>{roomMode='delete-fail';return exstraRoomsModelV177.destroy([...roomDB.values()][0]).then(()=>false,()=>true);}));assert.equal(await p.evaluate(()=>roomDB.size),2);
 // Exercise the real sidebar membership loader, including account-specific subscriptions.
 const html=read('index.html'),start=html.indexOf('async function handleRoomMembershipChangeV4(){'),end=html.indexOf('renderContacts=async function',start);assert(start>=0&&end>start);
 await p.evaluate(()=>{roomMode='ok';window.roomMemberSubV3=null;window.roomMemberSubOwnerV177='';window.roomsAvailable=true;window.roomChannels=[];window.removedChannels=0;sb.channel=name=>{roomChannels.push(name);const c={on(){return c},subscribe(){return c}};return c;};sb.removeChannel=async()=>removedChannels++;});await p.addScriptTag({content:html.slice(start,end)});
 await p.evaluate(()=>loadMyRooms());assert.equal(await p.evaluate(()=>roomRows.length),2);await p.evaluate(()=>{roomMode='members-select-fail';});await p.evaluate(()=>loadMyRooms());assert.equal(await p.evaluate(()=>roomRows.length),2,'Transient membership failure preserves cached groups');
 await p.evaluate(()=>{currentRoom=[...roomDB.values()][0];});await p.evaluate(()=>handleRoomMembershipChangeV4());assert(await p.evaluate(()=>!!currentRoom),'A failed membership check does not falsely eject the user');
 await p.evaluate(()=>{roomMode='ok';me={nick:'other'};});await p.evaluate(()=>loadMyRooms());assert.equal(await p.evaluate(()=>roomRows.length),0);assert.equal(await p.evaluate(()=>roomChannels.at(-1)),'my-rooms-other');assert.equal(await p.evaluate(()=>removedChannels),1);
 assert.deepEqual(errors,[]);await p.close();
 console.log('PASS v177: actual creator/manager at 320/390/1440, photo preparation, checked members, private staging, durable retry/lost acknowledgement/no duplicates, edit access/avatar/name, add/remove, owner protection, offline and retired UI removal.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
