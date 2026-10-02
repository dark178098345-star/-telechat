const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.route('https://delivery.test/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="messages"></div><textarea id="msg-input">Мой незаконченный текст</textarea>'}));await page.goto('https://delivery.test/');
 await page.evaluate(()=>{
  window.me={nick:'host'};window.doLogin=async()=>{};window.sendMsg=()=>{};window.rows=[];window.appended=[];window.accepted=[];window.sidebar=[];window.fail=false;window.conversationKey=()=> 'host_other';window.chatKey=(a,b)=>[a,b].sort().join('_');
  window.appendMessage=async row=>{appended.push(row);return null;};window.renderContacts=()=>{};window.playSendSound=()=>{};window.showToast=()=>{};
  window.telechatChatSpeedV51={latestTimestamp:()=>0,acceptSent:row=>accepted.push(row)};window.telechatApplySidebarMessageV25=row=>sidebar.push(row);
  window.sb={from(){return {insert(row){return {select:()=>({single:async()=>{if(fail)return {error:{message:'offline'}};const saved={...row,id:rows.length+1};rows.push(saved);return {data:saved};}})};},select(){const q={eq:()=>q,limit:()=>q,maybeSingle:async()=>({data:null})};return q;}};}};
 });await page.addScriptTag({path:path.join(root,'chat-reliability-v24.js')});
 assert.equal(await page.evaluate(()=>telechatDeliveryV72.sendDirect('friend','test invite',{expiresAt:Date.now()+900000})),true);
 let result=await page.evaluate(()=>({rows,appended,accepted,sidebar,draft:document.getElementById('msg-input').value,chat:conversationKey()}));assert.equal(result.rows[0].chat_key,'friend_host');assert.equal(result.rows[0].from_nick,'host');assert.equal(result.appended.length,0);assert.equal(result.accepted.length,1);assert.equal(result.sidebar.length,1);assert.equal(result.draft,'Мой незаконченный текст');assert.equal(result.chat,'host_other');
 await page.evaluate(()=>window.conversationKey=()=> 'friend_host');assert.equal(await page.evaluate(()=>telechatDeliveryV72.sendDirect('friend','visible invite')),true);assert.equal(await page.evaluate(()=>appended.length),1);
 const before=await page.evaluate(()=>rows.length);assert.equal(await page.evaluate(()=>telechatDeliveryV72.sendDirect('friend','expired',{expiresAt:Date.now()-1})),false);assert.equal(await page.evaluate(()=>rows.length),before);
 await assert.rejects(()=>page.evaluate(()=>telechatDeliveryV72.sendDirect('host','self')));
 await page.evaluate(()=>{fail=true;});assert.equal(await page.evaluate(()=>telechatDeliveryV72.sendDirect('friend','queued',{expiresAt:Date.now()+60000})),false);
 await page.evaluate(async()=>{fail=false;await telechatDeliveryV72.drain();});assert.equal(await page.evaluate(()=>rows.filter(r=>r.text==='queued').length),1);await page.evaluate(()=>telechatDeliveryV72.drain());assert.equal(await page.evaluate(()=>rows.filter(r=>r.text==='queued').length),1);
 console.log('PASS direct delivery: recipient, draft preservation, no navigation, optimistic same-chat only, expiry, invalid self, durable offline retry without duplicate');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
