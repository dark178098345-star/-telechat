const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:850}});
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    await context.route('**/*',route=>{
      const u=new URL(route.request().url());if(u.hostname!=='telechat.test')return route.abort();
      if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
      const file=path.join(root,path.basename(u.pathname));if(!fs.existsSync(file))return route.abort();
      return route.fulfill({contentType:file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file)});
    });
    const page=await context.newPage();await page.goto('http://telechat.test/');
    await page.evaluate(()=>{
      document.querySelector('#startup-loader').remove();document.querySelector('#auth-screen').classList.remove('active');document.querySelector('#chat-screen').classList.add('active');
      document.querySelector('#empty-state').style.display='none';document.querySelector('#active-chat').style.display='flex';
      Object.assign(window,{
        me:{nick:'me'},currentChat:'friend',currentRoom:null,userCache:{friend:{nick:'friend',name:'Арина',av:1}},AVATARS:['😺','🌙'],
        conversationKey:()=>currentRoom?'room_1':'me_'+currentChat,
        getAvatarPhoto:user=>user.photo||'',getUser:async nick=>{window.userFetches++;await new Promise(resolve=>window.finishUser=()=>{userCache[nick]={nick,name:'Поздний ответ',av:0};resolve(userCache[nick]);});},userFetches:0,
        setSidebarFilter:(filter,button)=>{window.filter=filter;document.querySelectorAll('.sidebar-tab').forEach(el=>el.classList.toggle('active',el===button));},
        telechatNavigate:target=>{window.navigation=target;}
      });
      document.querySelector('#chat-name-hdr').textContent='Арина';document.querySelector('#chat-status-text').textContent='в сети';
      const music=document.createElement('button');music.className='music-entry-v96';music.textContent='Моя музыка';music.addEventListener('click',()=>window.musicOpened=true);document.querySelector('.sidebar-top').append(music);
      document.querySelector('#contacts-list').innerHTML=['Арина','Команда tele.chat','Данил','Fox'].map((name,i)=>`<div class="contact ${i===0?'active':''}"><div class="av">${['🌙','🚀','😺','🦊'][i]}</div><div class="contact-info"><div class="contact-name">${name}</div><div class="contact-last">Увидимся вечером</div></div><div class="contact-time">12:41</div></div>`).join('');
      document.querySelector('#messages').innerHTML='<div class="msg me" data-id="1"><div class="msg-bubble">Привет! Как тебе новая панель?</div><div class="msg-meta"><span>12:41</span><span class="msg-check read">✓✓</span></div></div>';
    });
    await page.addScriptTag({path:path.join(root,'navigation-readers-v109.js')});
    await page.locator('[data-rail-filter="group"]').click();assert.equal(await page.evaluate(()=>filter),'group');
    assert.equal(await page.locator('[data-rail-filter="group"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-rail-filter="all"]').click();
    await page.locator('.section-rail-v109 .music-entry-v96').click();assert(await page.evaluate(()=>musicOpened));
    await page.locator('[data-nav="profile"]').click();assert.equal(await page.evaluate(()=>navigation),'profile');
    const sidebar=await page.locator('#sidebar').boundingBox(),profile=await page.locator('[data-nav="profile"]').boundingBox();
    assert(profile.y>sidebar.y+sidebar.height-90,'profile stays at bottom');
    assert(profile.x<sidebar.x+72,'profile belongs to rail');
    await page.evaluate(()=>{
      window.message={id:1,from_nick:'me',chat_key:conversationKey(),read_by:['me','friend','friend']};
      window.row=document.querySelector('.msg');window.bubble=row.firstElementChild;
      telechatReadReceiptV109(row,message);window.avatar=row.querySelector('.reader-avatar-v109');
      for(let i=0;i<5;i++)telechatReadReceiptV109(row,message);
    });
    assert.equal(await page.locator('.reader-avatar-v109').count(),1);
    assert(await page.evaluate(()=>avatar===row.querySelector('.reader-avatar-v109')&&bubble===row.firstElementChild),'unchanged read receipt preserves nodes');
    assert.equal(await page.locator('.readers-v109').getAttribute('aria-label'),'Прочитали: Арина');
    await page.screenshot({path:path.join(root,'outputs','navigation-v109-desktop.png')});
    await page.evaluate(()=>{currentRoom={id:1};telechatReadReceiptV109(row,{...message,chat_key:conversationKey(),read_by:['me','friend','two','three','four']});});
    assert.equal(await page.locator('.reader-avatar-v109').count(),3);assert.equal(await page.locator('.reader-more-v109').textContent(),'+1');
    await page.evaluate(()=>{telechatReadReceiptV109(row,{...message,chat_key:conversationKey(),deleted:true});});
    assert.equal(await page.locator('.readers-v109').count(),0);
    await page.evaluate(()=>{finishUser?.();});await page.waitForTimeout(25);
    assert.equal(await page.locator('.readers-v109').count(),0,'late profile result must not revive deleted receipt');
    await page.evaluate(()=>{currentRoom=null;telechatReadReceiptV109(row,{...message,from_nick:'friend'});});
    assert.equal(await page.locator('.readers-v109').count(),0,'incoming messages have no own read receipt');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.section-rail-v109').isVisible(),false);
    assert.equal(await page.locator('.sidebar-tabs').isVisible(),true);
    assert.equal(await page.locator('.sidebar-top .music-entry-v96').count(),1,'mobile reuses the same music opener');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    console.log('V109: rail filtering, bottom profile, mobile layout, readers, groups, stable nodes and deleted/late updates passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
