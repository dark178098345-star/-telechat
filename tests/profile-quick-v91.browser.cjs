const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:800}});
      await page.route('**/*',route=>route.abort());
      let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      html=html.replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,file)=>file.endsWith('.css')?'<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>':'');
      await page.setContent(html);
      await page.evaluate(()=>{
        window.me={nick:'creator',name:'Кирилл',status:'Делаем tele.chat ✨',banner:'preset:aurora'};
        document.getElementById('startup-loader')?.remove();
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('chat-screen').classList.add('active');
        const nav=document.querySelector('[data-nav="profile"]');
        // Keep the real button and its inline handler; isolate placement from chat data.
        document.body.append(nav);Object.assign(nav.style,{position:'fixed',bottom:'14px',left:'180px',width:'76px',height:'56px',zIndex:'100'});
        window.telechatNavigate=target=>{window.lastNavigation=target;};
        window.previewMyProfile=()=>{window.previewOpened=true;};
        window.unpackProfileData=status=>({status});
        window.setAvatarElement=element=>{element.textContent='🌙';};
        window.applyProfileBanner=(element,value)=>{element.dataset.banner=value;element.style.background='linear-gradient(135deg,#355979,#8672bc 50%,#4a3767)';};
      });
      for(const file of ['smooth-ui-v76.js','profile-quick-v91.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
      const trigger=page.locator('[data-nav="profile"]'),card=page.locator('#profile-quick-v91');
      await trigger.click();
      assert(await card.isVisible());
      assert.equal(await page.locator('.pq-name').textContent(),'Кирилл');
      assert.equal(await page.locator('.pq-cover').getAttribute('data-banner'),'preset:aurora');
      assert.equal(await page.locator('.pq-status').textContent(),'Делаем tele.chat ✨');
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      const rect=await card.boundingBox();
      assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width&&rect.y+rect.height<=800,JSON.stringify(rect));
      assert(await card.evaluate(el=>el.scrollWidth<=el.clientWidth));
      fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
      await card.screenshot({path:path.join(root,'outputs',`profile-quick-v91-${width}.png`)});
      await page.keyboard.press('Escape');
      assert(!(await card.isVisible()));
      assert(await trigger.evaluate(el=>document.activeElement===el));
      await trigger.click();await trigger.click();assert(!(await card.isVisible()));
      await trigger.click();await page.locator('[data-pq="edit"]').click();
      assert.equal(await page.evaluate(()=>window.lastNavigation),'profile');assert(!(await card.isVisible()));
      await trigger.click();await page.locator('[data-pq="view"]').click();assert(await page.evaluate(()=>window.previewOpened));
      await trigger.click();await page.locator('[data-pq="switch"]').click();
      assert(await page.locator('#logout-dialog-v76').isVisible());
      assert.equal(await page.locator('#logout-title-v76').textContent(),'Сменить аккаунт?');
      await page.locator('[data-logout-cancel-v76]').click();
      await page.evaluate(()=>window.openLogoutDialogV76());
      assert.equal(await page.locator('#logout-title-v76').textContent(),'Выйти из аккаунта?');
      await page.locator('[data-logout-cancel-v76]').click();
      await trigger.click();await page.mouse.click(width-5,5);assert(!(await card.isVisible()));
      await page.evaluate(()=>{me.name='<img src=x onerror=alert(1)>';me.status='Очень длинный статус '.repeat(80);});
      await trigger.click();assert.equal(await page.locator('.pq-name img').count(),0);
      assert(await card.evaluate(el=>el.scrollWidth<=el.clientWidth));
      await page.evaluate(()=>{
        const video=document.createElement('video');video.dataset.test='media';document.querySelector('.pq-cover').append(video);
        window.testVideo=video;
        telechatNavigate('settings');
      });
      assert.equal(await page.locator('#profile-quick-v91 video').count(),0);
      assert(await page.evaluate(()=>window.testVideo.paused));
      assert.equal(await page.evaluate(()=>window.lastNavigation),'settings');
      await page.close();console.log('Quick profile interactions passed at '+width+'px');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
