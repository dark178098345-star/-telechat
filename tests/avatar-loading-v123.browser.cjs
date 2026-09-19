const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
async function setup(context,legacy=false){
  const page=await context.newPage();await page.route('http://avatars.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://avatars.test/');
  await page.evaluate(()=>{
    Object.assign(window,{
      me:{nick:'me'},userCache:{},currentChat:'friend',currentRoom:null,sidebarFilter:'all',roomRows:[],roomsAvailable:true,viewedProfileNickV5:'',
      renderContacts:async()=>{throw Error('Unexpected fallback');},renderMessages:async()=>{},loadMyRooms:async()=>[],handleRoomMembershipChangeV4:async()=>{},
      appendMessage:async()=>{},renderMessageContent:text=>text,updateOnline:async()=>{},updateStatusBar:async()=>{},
      openChat:async()=>{},openRoom:async()=>{},setSidebarFilter:()=>{},getUser:async()=>{},openUserProfile:async()=>{},closeUserProfile:()=>{},showToast:()=>{},
      messagePreviewText:text=>text,chatKey:(a,b)=>a+'_'+b,escHtml:String,formatMsgTime:String,isOnline:()=>false,formatLastSeen:()=>'',
      unpackProfileData:raw=>{try{return JSON.parse(raw.slice('__telechat_profile_v1__:'.length));}catch(_){return {status:raw,photo:''};}},
      avatarMarkup:user=>{const photo=unpackProfileData(user.status).photo;return photo?'<img class="avatar-photo" src="'+photo+'">':'fallback';},
      setAvatarElement:(el,user)=>{if(el)el.innerHTML=avatarMarkup(user);},applyProfileBanner:()=>{},events:[],userQueries:0,offlineFixture:false,
    });
    const photo='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const user={nick:'friend',name:'Friend',av:0,status:'__telechat_profile_v1__:'+JSON.stringify({status:'Hello',photo}),last_seen:0};
    sb={from:table=>({select(fields){this.fields=fields;return this;},eq(){return this;},order(){return this;},limit(){return this;},in(){return this;},maybeSingle(){this.single=true;return this;},abortSignal(){return this;},
      async then(resolve,reject){try{
        if(offlineFixture)throw Error('Unexpected network request on warm load');
        const kind=table==='users'?'users':this.fields==='id,text'?'text':'metadata';events.push({kind,event:'start'});if(kind==='users')userQueries++;
        await new Promise(r=>setTimeout(r,kind==='text'?120:80));events.push({kind,event:'end'});
        const data=table==='users'?[{...user}]:[{id:1,chat_key:'me_friend',from_nick:'friend',ts:100,text:'Hi'}];resolve({data:this.single?data[0]:data});
      }catch(error){reject(error);}}})};
  });
  const source=file=>legacy?cp.execFileSync('git',['show','1d3901f:'+file],{cwd:root,encoding:'utf8'}):read(file);
  if(!legacy)await page.addScriptTag({content:read('user-cache-v123.js')});
  for(const file of ['profile-performance-v11.js','app-performance-v17.js'])await page.addScriptTag({content:source(file)});
  return page;
}
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    let baseline;
    if(process.env.COMPARE_AVATAR_BASELINE==='1'){
      const oldContext=await browser.newContext(),old=await setup(oldContext,true);
      baseline=await old.evaluate(async()=>{const start=performance.now();await renderContacts();const coldMs=Math.round(performance.now()-start);await getUser('friend');await new Promise(r=>setTimeout(r,100));return {coldMs,userQueries,events};});await oldContext.close();
    }
    const context=await browser.newContext(),page=await setup(context),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const current=await page.evaluate(async()=>{const start=performance.now();await renderContacts();const coldMs=Math.round(performance.now()-start);await getUser('friend');await new Promise(r=>setTimeout(r,100));await telechatUserCacheV123.flush();return {coldMs,userQueries,events};});
    assert.equal(current.userQueries,1,'sidebar batch followed by getUser must not download the avatar twice');
    assert(current.events.findIndex(e=>e.kind==='users'&&e.event==='start')<current.events.findIndex(e=>e.kind==='text'&&e.event==='end'),'avatar request must overlap message-text loading');
    await page.waitForFunction(()=>document.querySelector('#contacts-list .avatar-photo')?.complete);
    const restored=await setup(context);await restored.evaluate(()=>{offlineFixture=true;});
    const warm=await restored.evaluate(async()=>{const start=performance.now();await renderContacts();return {ms:Math.round(performance.now()-start),queries:userQueries};});
    await restored.waitForSelector('#contacts-list .avatar-photo',{state:'attached'});
    assert.equal(warm.queries,0,'restart must use the saved photo without server access');
    assert.deepEqual(errors,[]);
    if(baseline){assert.equal(baseline.userQueries,2);assert(baseline.events.findIndex(e=>e.kind==='users'&&e.event==='start')>baseline.events.findIndex(e=>e.kind==='text'&&e.event==='end'));console.log('Controlled 80/120 ms network baseline:',JSON.stringify(baseline));}
    console.log('PASS avatar integration:',JSON.stringify({coldMs:current.coldMs,userQueries:current.userQueries,warm,parallelAvatars:true}));await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
