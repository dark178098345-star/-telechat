const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="messages"></div><div id="contacts-list"></div>'}));
    await page.goto('http://telechat.test');
    await page.evaluate(()=>{
      Object.assign(window,{
        me:{nick:'me'},currentChat:'friend',currentRoom:null,lastRenderedDate:'',userCache:{},
        conversationKey:()=>currentChat?'me_'+currentChat:'',renderMessages:async()=>{},
        updateStatusBar:async()=>{},markAsRead:async()=>{},avatarMarkup:()=>'',renderPoll:()=>{},scrollToBottom:()=>{},
        batchUsersV15:async()=>{},isOnline:()=>false,formatLastSeen:()=>'',normalizedRoomVisibility:()=>'',
        makeDateStr:ts=>new Date(ts).toDateString(),serverRows:[],queries:0,
        sb:{from:table=>({select(){return this},eq(){return this},order(){return this},limit(){return this},
          then(resolve,reject){queries++;const result={data:table==='messages'?serverRows.map(row=>({...row})):[]};return Promise.resolve(result).then(resolve,reject);}})},
        appendMessage:async message=>{
          if(window.pauseAppend){window.pauseAppend=false;await new Promise(resolve=>window.releaseAppend=resolve);}
          const element=document.createElement('div');element.className='msg';element.dataset.id=message.id||'';
          const media=document.createElement('video');media.dataset.fixture='stable';
          const text=document.createElement('span');text.textContent=message.text;
          const check=document.createElement('span');check.className='msg-check';element.append(media,text,check);
          document.getElementById('messages').append(element);
        }
      });
    });
    await page.addScriptTag({content:source('chat-speed-v51.js')});
    await page.evaluate(async()=>{
      const row={id:1,chat_key:conversationKey(),from_nick:'friend',text:'first',ts:100,read_by:[]};
      serverRows=[row];await renderMessages();window.original=document.querySelector('.msg');window.video=original.querySelector('video');
      serverRows.push({...row,id:2,text:'second',ts:200});await telechatChatSpeedV51.refreshActive();
    });
    assert(await page.evaluate(()=>original===document.querySelector('.msg')&&video===document.querySelector('.msg video')),'new messages must preserve existing media and rows');
    await page.evaluate(async()=>{
      window.second=document.querySelectorAll('.msg')[1];serverRows[1].text='edited';
      await telechatChatSpeedV51.refreshActive();
    });
    assert(await page.evaluate(()=>original===document.querySelector('.msg')&&second!==document.querySelectorAll('.msg')[1]),'edit must replace only its own row');
    await page.evaluate(async()=>{
      await appendMessage({chat_key:conversationKey(),from_nick:'me',text:'pending',ts:300});
      await telechatChatSpeedV51.refreshActive();
    });
    assert(await page.locator('#messages').textContent().then(text=>text.includes('pending')),'pending sends must survive a server snapshot');
    await page.evaluate(async()=>{serverRows.push({id:3,chat_key:conversationKey(),from_nick:'me',text:'pending',ts:300});await telechatChatSpeedV51.refreshActive();});
    assert.equal(await page.locator('.msg').count(),3,'server acknowledgement must replace optimistic row without a duplicate');
    const before=await page.evaluate(()=>queries);
    assert.equal(await page.evaluate(()=>telechatChatSpeedV51.applyRealtimeUpdate({...serverRows[0],read_by:['me']})),false);
    assert.equal(await page.evaluate(()=>queries),before,'read receipts must not fetch history');
    await page.evaluate(async()=>{
      window.beforeCount=document.querySelectorAll('.msg').length;
      await appendMessage({id:90,chat_key:'me_other',from_nick:'other',text:'wrong chat',ts:400});
    });
    assert(await page.evaluate(()=>beforeCount===document.querySelectorAll('.msg').length),'background chat must not append into visible chat');
    await page.evaluate(()=>{pauseAppend=true;serverRows[1].text='slow edit';window.refreshTask=telechatChatSpeedV51.refreshActive();});
    await page.waitForFunction(()=>typeof releaseAppend==='function');
    await page.evaluate(()=>{window.arrivalTask=appendMessage({id:4,chat_key:conversationKey(),from_nick:'friend',text:'arrived during paint',ts:400});releaseAppend();});
    await page.evaluate(()=>Promise.all([refreshTask,arrivalTask]));
    assert.equal(await page.locator('.msg[data-id="4"]').count(),1,'arrival during async history paint must remain visible exactly once');

    const sidebar=await browser.newPage();await sidebar.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="contacts-list"></div>'}));await sidebar.goto('http://telechat.test');
    await sidebar.evaluate(()=>{
      Object.assign(window,{
        me:{nick:'me'},currentChat:'friend',currentRoom:null,sidebarFilter:'all',roomRows:[],roomsAvailable:true,
        userCache:{friend:{nick:'friend',name:'Friend',av:1,status:'',last_seen:0}},
        renderContacts:async()=>{},renderMessages:async()=>{},loadMyRooms:async()=>[],handleRoomMembershipChangeV4:async()=>{},
        appendMessage:async()=>{},renderMessageContent:text=>text,updateOnline:async()=>{},updateStatusBar:async()=>{},
        openChat:async()=>{},openRoom:async()=>{},setSidebarFilter:()=>{},
        unpackProfileData:status=>({status}),messagePreviewText:text=>text,chatKey:(a,b)=>a+'_'+b,escHtml:text=>String(text),
        formatMsgTime:ts=>String(ts),isOnline:()=>false,avatarMarkup:()=>'<video data-fixture="avatar"></video>',
        sb:{from:()=>{throw Error('snapshot should avoid network')}},
      });
      localStorage.setItem('telechat.sidebar.v18.me',JSON.stringify({version:18,at:Date.now(),rooms:[],users:userCache,messages:[{id:1,chat_key:'me_friend',from_nick:'friend',text:'hello',ts:1}]}));
      localStorage.setItem('telechat.chat-actions.v52.me',JSON.stringify({pins:['me_friend']}));
    });
    await sidebar.addScriptTag({content:source('app-performance-v17.js')});
    await sidebar.addScriptTag({content:source('chat-actions-v52.js')});
    await sidebar.evaluate(async()=>{
      await renderContacts();window.row=document.querySelector('.contact');window.avatar=row.querySelector('video');window.more=row.querySelector('.chat-more-v52');
      window.changes=[];window.observer=new MutationObserver(records=>changes.push(...records));observer.observe(document.getElementById('contacts-list'),{childList:true,subtree:true});
      for(let i=0;i<5;i++)await renderContacts();
    });
    assert(await sidebar.evaluate(()=>row===document.querySelector('.contact')&&avatar===document.querySelector('video')&&more===row.querySelector('.chat-more-v52')),'unchanged sidebar must preserve avatar, row and open-menu button');
    assert.equal(await sidebar.evaluate(()=>changes.filter(record=>[...record.removedNodes].some(node=>node===row||node===avatar)).length),0,'unchanged pinned row must never detach');
    await sidebar.evaluate(async()=>{telechatApplySidebarMessageV25({id:2,chat_key:'me_friend',from_nick:'me',text:'sent',ts:2});await renderContacts();await renderContacts();});
    assert.equal(await sidebar.locator('.contact-last').textContent(),'sent');
    assert(await sidebar.evaluate(()=>avatar===document.querySelector('video')),'sending must keep avatar alive');
    await sidebar.addScriptTag({content:source('index.html').match(/function setAvatarElement\(el,user\)\{[\s\S]*?\n\}/)[0]});
    await sidebar.evaluate(()=>{
      window.header=document.createElement('div');document.body.append(header);setAvatarElement(header,userCache.friend);
      window.headerVideo=header.firstChild;setAvatarElement(header,userCache.friend);
    });
    assert(await sidebar.evaluate(()=>headerVideo===header.firstChild),'opening helpers must not restart the same header avatar');
    const reactions=await browser.newPage();await reactions.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="messages"><div class="msg" data-id="1"><div class="msg-meta"></div></div></div>'}));await reactions.goto('http://telechat.test');
    await reactions.evaluate(()=>Object.assign(window,{
      me:{nick:'me'},active:'a',conversationKey:()=>active,showCtxMenu(){},ctxPin(){},loadPinned(){},unpinMsg(){},ctxDelete(){},
      appendMessage:async()=>{},renderMessages:async()=>{},requests:[],subscriptions:0,
      sb:{from:()=>({select(){return this},in(){return new Promise(resolve=>requests.push(resolve));}}),channel:()=>({on(){return this},subscribe(){subscriptions++;return this;}})}
    }));
    await reactions.addScriptTag({content:source('message-context-v36.js')});
    await reactions.evaluate(()=>telechatSyncVisibleMessagesV105([{id:1,from_nick:'friend',text:'a'}]));
    await reactions.waitForFunction(()=>requests.length===1);
    await reactions.evaluate(()=>{
      active='b';document.querySelector('.msg').dataset.id='2';
      telechatSyncVisibleMessagesV105([{id:2,from_nick:'friend',text:'b'}]);
    });
    await reactions.waitForFunction(()=>requests.length===2);
    await reactions.evaluate(async()=>{requests[1]({data:[{message_id:2,user_nick:'friend',emoji:'❤️'}]});await Promise.resolve();});
    await reactions.waitForFunction(()=>document.querySelector('.message-reaction-v36'));
    await reactions.evaluate(async()=>{window.reaction=document.querySelector('.message-reaction-v36');requests[0]({data:[]});await Promise.resolve();});
    assert(await reactions.evaluate(()=>reaction===document.querySelector('.message-reaction-v36')),'late reactions from previous chat must not clear current reactions');
    assert.equal(await reactions.evaluate(()=>subscriptions),1,'history renderer must establish a reaction subscription once');
    console.log('V105 browser: stable history/media/sidebar, targeted edits, pending sends, receipts and cross-chat isolation passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
