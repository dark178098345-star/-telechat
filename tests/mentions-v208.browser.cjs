const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [320,390,1440]){
  const {p,errors}=await fixture(browser,width,900,width<600);
  await p.evaluate(()=>{
   window.mentionChecks={queries:[],photoLoads:[],held:[],hold:false,hang:false};
   const photo=(color)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,64,64);x.fillStyle='#f9dfc6';x.beginPath();x.arc(32,25,13,0,Math.PI*2);x.fill();x.fillStyle='#f0e9ed';x.beginPath();x.ellipse(32,61,24,23,0,0,Math.PI*2);x.fill();return c.toDataURL('image/png');};
   window.mentionPhoto=photo('#7179ac');for(const [i,u]of Object.values(userCache).entries())u.status=JSON.stringify({photo:photo(['#7179ac','#b1788d','#689b95','#a38363'][i%4])});
   window.getAvatarPhoto=u=>{try{return JSON.parse(u.status).photo||'';}catch(_){return '';}};
   window.SUPABASE_URL='https://fixture.supabase.co';
   const remote={nick:'remote_person_with_a_long_nickname_12345',name:'Новый собеседник',status:JSON.stringify({photo:mentionPhoto})};
   const members=[{nick:'member_one',name:'Участник группы',status:JSON.stringify({photo:mentionPhoto})},{nick:'member_two',name:'Ещё один участник',status:''}];
   const all=()=>[...Object.values(userCache),remote,...members];
   window.telechatUserCacheV123={many:async nicks=>{mentionChecks.photoLoads.push([...nicks]);const users=all().filter(u=>nicks.includes(u.nick));for(const u of users)userCache[u.nick]=u;return users;}};
   sb.from=table=>{let prefix='',ids=[];const q={select:()=>q,eq:()=>q,limit:()=>q,abortSignal:()=>q,ilike(_,v){prefix=v;return q;},in(_,v){ids=v;return q;},then(resolve,reject){mentionChecks.queries.push({table,prefix});if(mentionChecks.hang)return new Promise(()=>{});if(mentionChecks.hold&&table==='users'&&prefix)return new Promise(r=>mentionChecks.held.push({resolve:r,prefix})).then(resolve,reject);const data=table==='room_members'?members.map(u=>({user_nick:u.nick})):all().filter(u=>ids.length?ids.includes(u.nick):u.nick.startsWith(prefix.replace(/%$/,'').replace(/\\_/g,'_'))).map(({nick,name})=>({nick,name}));return Promise.resolve({data,error:null}).then(resolve,reject);}};return q;};
   window.openedMention='';window.openUserProfile=async nick=>{openedMention=nick;};
   window.renderMessageContent=text=>{const node=document.createElement('span');node.textContent=text;return node.innerHTML;};
  });
  for(const file of ['emoji-catalog-v182.js','emoji-composer-v182.js','mentions-v106.js'])await p.addScriptTag({content:read(file)});
  await p.evaluate(()=>openChat('friend0'));
  const input=p.locator('#msg-input'),picker=p.locator('#mention-picker-v106');await input.fill('Киря @');
  await p.waitForSelector('#mention-picker-v106:not([hidden])');assert.equal(await picker.locator('[role=option]').count(),8);assert.equal(await picker.locator('img').count(),8);
  assert.equal(await picker.locator('video').count(),0);assert(await picker.locator('.mention-avatar-v106').first().evaluate(n=>getComputedStyle(n).borderRadius==='50%'));
  assert(await picker.locator('[role=option]').first().evaluate(n=>Math.abs(n.querySelector('b').getBoundingClientRect().top-n.querySelector('small').getBoundingClientRect().top)<4),'Name and @nickname share one row');
  assert(await picker.evaluate(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&n.scrollWidth<=n.clientWidth;}));
  await p.screenshot({path:path.join(root,'outputs/mentions-v208-dark-'+width+'.png')});
  await p.evaluate(()=>{window.originalMentionImage=document.querySelector('#mention-option-v106-friend0 img');});
  await input.fill('Киря @fr');await p.waitForTimeout(240);await input.fill('Киря @fri');
  assert(await p.evaluate(()=>originalMentionImage===document.querySelector('#mention-option-v106-friend0 img')),'Stable options retain their loaded image nodes');
  const sentBefore=await p.evaluate(()=>calls.filter(v=>v.startsWith('send:')).length);await input.press('ArrowDown');await input.press('Enter');
  assert.equal(await input.inputValue(),'Киря @friend1 ');assert.equal(await p.evaluate(()=>calls.filter(v=>v.startsWith('send:')).length),sentBefore,'Choosing a mention must not send the draft');
  await input.press('Enter');assert.equal(await p.evaluate(()=>calls.filter(v=>v.startsWith('send:')).length),sentBefore+1);
  if(width<600){await input.fill('@fr');await picker.locator('[role=option]').first().tap();assert.equal(await input.inputValue(),'@friend0 ');assert(await input.evaluate(n=>n===document.activeElement),'Touch selection keeps focus in the composer');}
  await input.fill('@fr');await input.press('Shift+Enter');assert((await input.inputValue()).includes('\n'));assert(await picker.evaluate(n=>n.hidden));
  await input.fill('Привет @Ари');assert((await picker.textContent()).includes('Арина'),'Russian display-name matching works locally');
  await input.fill('test@example.com');assert(await picker.evaluate(n=>n.hidden));await input.fill('https://site/@friend0');assert(await picker.evaluate(n=>n.hidden));
  await input.fill('@remote_');await p.waitForFunction(()=>document.querySelector('#mention-picker-v106 img')&&document.querySelector('#mention-picker-v106')?.textContent.includes('@remote_person'));
  assert.equal(await picker.locator('img').count(),1,'Only visible missing profiles are hydrated through the shared batch loader');
  assert((await p.evaluate(()=>mentionChecks.photoLoads)).every(nicks=>nicks.length<=8));await input.press('Tab');assert.equal(await input.inputValue(),'@remote_person_with_a_long_nickname_12345 ');
  await p.evaluate(()=>{const input=document.getElementById('msg-input');input.value='@fr ';input.dispatchEvent(new Event('input',{bubbles:true}));exstraEmojiComposerV182.insert(exstraEmojiCatalogV182.get('boxing'));input.setSelectionRange(3,3);input.dispatchEvent(new Event('click',{bubbles:true}));});
  await picker.locator('[role=option]').first().click();assert.equal(await p.evaluate(()=>exstraEmojiComposerV182.serialize()),'@friend0 '+await p.evaluate(()=>exstraEmojiCatalogV182.get('boxing').token),'Completion preserves custom emoji entities after the replaced token');
  await p.evaluate(()=>openRoom({id:7}));await input.fill('@');await p.waitForFunction(()=>document.querySelector('#mention-picker-v106')?.textContent.includes('@member_one'));
  assert(!(await picker.textContent()).includes('@friend0'));assert.equal(await picker.locator('[role=option]').count(),2);
  await p.evaluate(()=>document.body.classList.add('theme-light'));await p.screenshot({path:path.join(root,'outputs/mentions-v208-light-'+width+'.png')});
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await picker.evaluate(n=>getComputedStyle(n).animationName),'none');
  await p.setViewportSize({width,height:480});await p.waitForTimeout(120);assert(await picker.evaluate(n=>{const r=n.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth;}),'Picker stays within a shortened mobile scene');await p.setViewportSize({width,height:900});
  await p.evaluate(()=>{currentRoom=null;});await p.evaluate(()=>openChat('friend0'));await input.fill('@late');await p.evaluate(()=>mentionChecks.hold=true);await p.waitForFunction(()=>mentionChecks.held.length>0);
  await input.fill('@friend');await p.evaluate(()=>{mentionChecks.hold=false;for(const item of mentionChecks.held.splice(0))item.resolve({data:[{nick:'late_person',name:'Старый ответ'}]});});await p.waitForTimeout(80);
  assert(!(await picker.textContent()).includes('Старый ответ'),'Late prefix search cannot replace the current query');
  await input.fill('@owner_old');await p.evaluate(()=>mentionChecks.hold=true);await p.waitForFunction(()=>mentionChecks.held.length>0);
  await p.evaluate(()=>{me={nick:'other',name:'Другой'};dispatchEvent(new Event('telechat-account-ready-v175'));for(const item of mentionChecks.held.splice(0))item.resolve({data:[{nick:'owner_old',name:'Прошлый аккаунт'}]});mentionChecks.hold=false;});await p.waitForTimeout(70);assert(await picker.evaluate(n=>n.hidden));
  await p.evaluate(()=>{me={nick:'creator',name:'Кирилл'};dispatchEvent(new Event('telechat-account-ready-v175'));document.getElementById('messages').innerHTML=renderMessageContent('Привет @remote_person_with_a_long_nickname_12345! test@example.com https://site/@friend0 <img src=x onerror=alert(1)>');});
  assert.equal(await p.locator('#messages .message-mention-v106').count(),1);assert.equal(await p.locator('#messages img').count(),0);await p.locator('#messages .message-mention-v106').click();assert.equal(await p.evaluate(()=>openedMention),'remote_person_with_a_long_nickname_12345');
  if(width===1440){
   await p.clock.install();await p.evaluate(()=>mentionChecks.hang=true);await input.fill('@hung');await p.clock.runFor(200);const first=await p.evaluate(()=>mentionChecks.queries.filter(q=>q.prefix==='hung%').length);await p.clock.fastForward(8200);await p.evaluate(()=>mentionChecks.hang=false);await input.fill('@hung');await p.clock.runFor(220);assert.equal(await p.evaluate(()=>mentionChecks.queries.filter(q=>q.prefix==='hung%').length),first+1,'Ignored cancellation cannot lock later searches');await p.clock.resume();
  }
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS v208 mentions: inline avatar/name/nickname rows, stable images, keyboard/touch targets, Cyrillic and 64-char IDs, safe links, custom emoji preservation, group scope, stale query/account isolation, bounded retry, reduced motion and 320/390/1440 dark/light.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
