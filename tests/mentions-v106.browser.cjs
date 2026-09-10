const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:`<style>body{margin:0}textarea{position:fixed;bottom:30px;left:12px;width:${width-40}px;height:65px}</style><div id="messages"></div><textarea id="msg-input" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sent++}"></textarea>`}));
   await page.goto('http://telechat.test');
   await page.evaluate(()=>Object.assign(window,{
    me:{nick:'self',name:'Self'},currentRoom:null,key:'self_friend',sent:0,opened:'',lookups:0,
    userCache:{friend:{nick:'friend',name:'Friend'},frost:{nick:'frost',name:'Frost'}},
    conversationKey:()=>key,openChat:nick=>{key='self_'+nick;},openRoom:room=>{currentRoom=room;key='room_'+room.id;},goBack:()=>{key='';},
    showToast(){},openUserProfile:nick=>{opened=nick;},
    renderMessageContent:text=>{const div=document.createElement('div');div.textContent=text;return div.innerHTML;},
    sb:{from:table=>({select(){return this},eq(){return this},ilike(field,query){this.query=query;return this},limit(){return this},in(){return this},then(resolve){lookups++;return Promise.resolve({data:table==='room_members'?[{user_nick:'member'}]:currentRoom?[{nick:'member',name:'Member'}]:[]}).then(resolve);}})}
   }));
   await page.addStyleTag({path:path.join(root,'mentions-v106.css')});await page.addScriptTag({path:path.join(root,'mentions-v106.js')});
   const input=page.locator('#msg-input');await input.focus();await input.fill('@fr');
   await page.waitForSelector('#mention-picker-v106:not([hidden])');
   await input.press('ArrowDown');await input.press('Enter');
   assert.equal(await input.inputValue(),'@frost ');assert.equal(await page.evaluate(()=>sent),0,'selecting must not send');
   await input.press('Enter');assert.equal(await page.evaluate(()=>sent),1,'normal enter must still send');
   await input.fill('hello @fr rest');await input.evaluate(el=>{el.setSelectionRange(9,9);el.dispatchEvent(new Event('click',{bubbles:true}));});
   await page.locator('#mention-picker-v106 [role=option]').first().click();assert.equal(await input.inputValue(),'hello @friend rest');
   await input.fill('test@example.com');assert(await page.locator('#mention-picker-v106').evaluate(el=>el.hidden),'emails must not open suggestions');
   await input.fill('@fr');await input.press('Escape');assert(await page.locator('#mention-picker-v106').evaluate(el=>el.hidden));
   await input.fill('@');await page.waitForSelector('#mention-picker-v106:not([hidden])');
   const rect=await page.locator('#mention-picker-v106').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0,'picker must fit viewport');
   await page.evaluate(()=>openRoom({id:1}));assert(await page.locator('#mention-picker-v106').evaluate(el=>el.hidden));
   await input.focus();await input.fill('@');await page.waitForFunction(()=>document.querySelector('#mention-picker-v106')?.textContent.includes('@member'));
   assert(!(await page.locator('#mention-picker-v106').textContent()).includes('@friend'),'group completion must use members');
   await page.evaluate(()=>document.getElementById('messages').innerHTML=renderMessageContent('Hi @friend! test@example.com https://site/@frost <img src=x onerror=alert(1)>'));
   assert.equal(await page.locator('.message-mention-v106').count(),1,'only standalone mentions become buttons');
   assert.equal(await page.locator('#messages img').count(),0,'escaped messages must remain escaped');
   await page.locator('.message-mention-v106').click();assert.equal(await page.evaluate(()=>opened),'friend');
   await page.close();console.log('Mentions passed at '+width+'px: selection, send, caret, emails, Escape, groups, layout, profile links and escaping');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
