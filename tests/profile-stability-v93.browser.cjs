const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();await page.route('**/*',r=>r.abort());
    await page.setContent(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
    await page.evaluate(()=>{
      window.me={nick:'self',name:'Self',banner:'preset:aurora',bio:'My bio',status:''};
      window.userCache={friend:{nick:'friend',name:'Friend',bio:'Hello',banner:'video:test',status:'Hi'}};
      window.viewedProfileNickV5='';window.getUser=()=>{};window.openUserProfile=()=>{};
      window.closeUserProfile=()=>{};window.openChat=()=>{};window.showToast=()=>{};
      window.escHtml=x=>x;window.isOnline=()=>true;window.formatLastSeen=()=>'';
      window.unpackProfileData=status=>({status:status||''});
      window.avatarMarkup=u=>'<video data-owner="'+u.nick+'"></video>';
      window.setAvatarElement=(el,u)=>{window.avatarWrites++;el.innerHTML=avatarMarkup(u);};
      window.applyProfileBanner=(el,banner)=>{window.bannerWrites++;el.innerHTML='<video></video>';el.dataset.banner=banner;};
      window.avatarWrites=0;window.bannerWrites=0;window.pending={};window.queries=0;
      window.sb={from:()=>({select:()=>({eq:(key,nick)=>({maybeSingle:()=>{window.queries++;return new Promise(resolve=>pending[nick]=resolve);}})})})};
    });
    for(const file of ['profile-performance-v11.js','profile-background-v84.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
    await page.evaluate(()=>{
      window.openTask=openUserProfile('friend');
      window.firstAvatar=document.querySelector('#view-profile-avatar video');
      window.firstBanner=document.querySelector('#view-profile-cover video');
    });
    assert.equal(await page.locator('#view-profile-cover').getAttribute('data-banner'),'video:test');
    assert.equal(await page.locator('#view-profile-bio').textContent(),'Hello');
    assert(!(await page.locator('#profile-refresh').evaluate(el=>el.classList.contains('show'))));
    await page.evaluate(async()=>{pending.friend({data:{...userCache.friend}});await openTask;});
    assert(await page.evaluate(()=>firstAvatar===document.querySelector('#view-profile-avatar video')&&firstBanner===document.querySelector('#view-profile-cover video')));
    assert.deepEqual(await page.evaluate(()=>[avatarWrites,bannerWrites]),[1,1]);
    await page.evaluate(async()=>{closeUserProfile();await openUserProfile('friend');});
    assert.deepEqual(await page.evaluate(()=>[avatarWrites,bannerWrites,queries]),[1,1,1]);
    await page.evaluate(async()=>{closeUserProfile();me.name='Fresh name';await openUserProfile('self');});
    assert.equal(await page.locator('#view-profile-name').textContent(),'Fresh name');
    assert.equal(await page.evaluate(()=>queries),1);
    // A late response must not repaint a different profile or reopen a closed one.
    await page.evaluate(()=>{window.oldTask=openUserProfile('late');});
    await page.evaluate(async()=>{await openUserProfile('self');pending.late({data:{nick:'late',name:'Late',status:'',banner:'preset:ocean'}});await oldTask;});
    assert.equal(await page.locator('#view-profile-name').textContent(),'Fresh name');
    assert.equal(await page.locator('#view-profile-cover').getAttribute('data-banner'),'preset:aurora');
    await page.evaluate(()=>{window.closedTask=openUserProfile('closed');closeUserProfile();pending.closed({data:{nick:'closed',name:'Closed',status:'',banner:'preset:ocean'}});});
    await page.evaluate(()=>window.closedTask);
    assert(!(await page.locator('#user-profile-modal').evaluate(el=>el.classList.contains('show'))));
    console.log('Public profile: stable media, cached opening, own edits and late responses passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
