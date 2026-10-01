const path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:390,height:844}});await p.setContent('<div id="messages"></div><div id="pending-media"></div><div class="composer-tools" style="position:fixed;bottom:0"><button onclick="openPollModal()">poll</button><button onclick="document.getElementById(\'chat-photo-input\').click()">photo</button><button id="record-btn">mic</button></div><input id="chat-photo-input" type="file" hidden>');
 await p.evaluate(()=>Object.assign(window,{MEDIA_PREFIX:'media:',me:{nick:'a',pass:'fixture'},SUPABASE_URL:'https://example.test',SUPABASE_KEY:'fixture',pendingMedia:null,key:'a_b',sent:[],calls:[],uploaded:[],removed:[],toasts:[],
 conversationKey:()=>key,canWriteCurrent:()=>true,showToast:s=>toasts.push(s),openPollModal:()=>{},unpackMedia:text=>{try{const m=JSON.parse(text.slice(6));return m.kind==='image'?m:null;}catch(_){return null;}},renderMessageContent:t=>t,messagePreviewText:t=>t,renderPendingMedia:()=>{},cancelPendingMedia:()=>{pendingMedia=null;},
 sendMsg:async()=>{sent.push({...pendingMedia});pendingMedia=null;},
 sb:{rpc:async(name,args)=>{calls.push(args);return {data:{id:'11111111-1111-4111-8111-111111111111',token:'ticket',name:args.p_data.name||'test.txt',size:args.p_data.size||3,mime:'text/plain'}};}},
 supabase:{createClient:()=>({storage:{from:()=>({
 upload:async(path,file)=>{uploaded.push(path);if(window.delay)await new Promise(resolve=>window.release=resolve);return window.fail?{error:{message:'upload failed'}}:{};},
 remove:async paths=>{removed.push(...paths);return {};},
 download:async()=>({data:new Blob(['abc'],{type:'text/plain'})})
 })}})}
 }));for(const f of ['ui-symbols-v125.js','attachments-v141.js'])await p.addScriptTag({path:path.join(root,f)});await p.addStyleTag({path:path.join(root,'attachments-v141.css')});
 await p.locator('#attach-button-v141').click();assert(await p.locator('#attachment-menu-v141').isVisible());await p.keyboard.press('Escape');assert(!(await p.locator('#attachment-menu-v141').isVisible()));
 await p.locator('#attach-button-v141').click();const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.getByRole('button',{name:'Файл до 20 МБ'}).click()]);await chooser.setFiles({name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('abc')});assert((await p.locator('#pending-media').textContent()).includes('test.txt'));
 await p.evaluate(()=>sendMsg());assert.equal(await p.evaluate(()=>sent.length),1);assert.equal(await p.evaluate(()=>sent[0]._fileV141),undefined);assert(!JSON.stringify(await p.evaluate(()=>sent)).includes('ticket'),'storage capability is never included in a message');
 await p.evaluate(()=>{const m={...sent[0],caption:'hi'};window.text=MEDIA_PREFIX+JSON.stringify(m);document.querySelector('#messages').innerHTML=renderMessageContent(text);});assert(await p.locator('.attachment-file-v141').isVisible());
 const [download]=await Promise.all([p.waitForEvent('download'),p.locator('.attachment-file-v141').click()]);assert.equal(download.suggestedFilename(),'test.txt');
 assert.equal(await p.evaluate(()=>telechatAttachmentsV141.canSave({text:'ordinary'})),false);
 assert.equal(await p.evaluate(()=>telechatAttachmentsV141.canSave({text:'media:'+JSON.stringify({kind:'image',data:'data:image/png;base64,AAAA'})})),true);
 await p.evaluate(()=>{telechatAttachmentsV141.selectFile(new File([new Uint8Array(20*1024*1024+1)],'large.bin'));});assert.equal(await p.evaluate(()=>pendingMedia),null);
 await p.evaluate(()=>{delay=true;telechatAttachmentsV141.selectFile(new File(['abc'],'race.txt'));window.sending=sendMsg();});await p.waitForFunction(()=>typeof release==='function');await p.evaluate(async()=>{await sendMsg();key='a_c';release();await sending;});assert.equal(await p.evaluate(()=>sent.length),1,'upload cannot send into switched chat');assert.equal(await p.evaluate(()=>removed.length),1,'cancelled uploaded object cleaned');
 await p.evaluate(()=>{key='a_b';delay=false;fail=true;telechatAttachmentsV141.selectFile(new File(['abc'],'retry.txt'));});await p.evaluate(()=>sendMsg());assert(await p.evaluate(()=>!!pendingMedia._fileV141),'failed upload retains local file');assert.equal(await p.evaluate(()=>sent.length),1);
 console.log('PASS attachments: menu/escape/file chooser, reserve/upload/send/download, no token leakage, size cap, duplicate send guard, chat-switch cleanup, retained failed draft, save visibility');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
