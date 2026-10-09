const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 await page.evaluate(()=>{
  window.me=null;window.currentChat=null;window.currentRoom=null;window.userCache={};window.getUser=async nick=>({nick,name:nick,av:0});window.showToast=()=>{};window.escHtml=s=>String(s);window.avatarMarkup=u=>'<img alt="'+u.nick+'">';
  window.messagePreviewText=t=>t;window.renderMessageContent=t=>t;window.doLogin=async()=>{};
  window.openChat=async()=>{};window.openRoom=async()=>{};window.goBack=()=>{};window.renderMessages=async()=>{};window.renderContacts=async()=>{};
 });
 const source=fs.readFileSync(path.join(root,'voice-calls-v32.js'),'utf8').replace('window.telechatCallsV31=window.telechatCallsV32;','window.telechatCallsV31=window.telechatCallsV32;window.testRender=renderCallPeopleV32;');
 await page.addScriptTag({content:source});
 await page.evaluate(async()=>{
  me={nick:'alice',name:'Alice',av:0};window.state={id:'fixture',members:new Map([['alice',{nick:'alice',status:'joined',user:me}],['bob',{nick:'bob',status:'joined',user:{nick:'bob',name:'Bob',av:1}}]]),mutedMembers:new Set()};
  await testRender(state);window.people=[...document.querySelectorAll('.voice-call-person')];window.avatars=people.map(n=>n.querySelector('img'));window.mini=document.querySelector('.voice-call-mini-avatar img');
  people[1].classList.add('speaking','connected');state.mutedMembers.add('alice');await testRender(state);
 });
 assert(await page.evaluate(()=>people.every((p,i)=>p===document.querySelectorAll('.voice-call-person')[i]&&avatars[i]===p.querySelector('img'))),'Mute keeps participant and avatar nodes');
 assert(await page.evaluate(()=>mini===document.querySelector('.voice-call-mini-avatar img')),'Mute keeps mini avatar');
 assert.equal(await page.locator('.voice-call-muted-v72').count(),1);
 assert(await page.locator('.voice-call-person').nth(1).evaluate(n=>n.classList.contains('speaking')&&n.classList.contains('connected')),'Connection/speaking state survives');
 await page.evaluate(async()=>{state.members.get('bob').user={nick:'bob',name:'Bob updated',av:2,status:'new'};await testRender(state);});
 assert(await page.evaluate(()=>avatars[0]===people[0].querySelector('img')&&avatars[1]!==people[1].querySelector('img')),'Only changed avatar repaints');
 await page.evaluate(async()=>{state.mutedMembers.clear();state.members.delete('bob');await testRender(state);});
 assert.equal(await page.locator('.voice-call-person').count(),1);assert.equal(await page.locator('.voice-call-muted-v72').count(),0);assert.equal(await page.locator('.voice-call-connector').count(),0);
 await page.evaluate(()=>telechatCallsV32.closePreview());assert.equal(await page.locator('.voice-call-person,.voice-call-mini-avatar').count(),0);
 console.log('PASS v153 call cards: stable nodes on mute, preserved speaking/connection, selective avatar refresh, participant removal, media cleanup');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
