const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      await page.route('**/*',route=>route.abort());
      let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
      html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      html=html.replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,file)=>{
        if(!file.endsWith('.css'))return '';
        return '<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>';
      });
      await page.setContent(html);
      await page.evaluate(()=>{
        window.me={nick:'tester',name:'Test profile'};
        window.buildProfPanel=()=>{};
        window.renderProfileAvatar=()=>{document.getElementById('prof-av-prev').textContent='🌙';};
        window.renderProfileBannerEditor=()=>{document.getElementById('profile-banner-preview').className='profile-banner-preview banner-preset-ocean';};
        document.getElementById('startup-loader')?.remove();
        document.getElementById('profile-panel').classList.add('v65-full-panel','open');
        document.getElementById('prof-av-prev').textContent='T';
        const premium=document.createElement('div');premium.id='animated-profile-card';premium.textContent='Анимированный профиль';
        document.querySelector('.profile-preview-btn').after(premium);
        window.originalInput=document.getElementById('avatar-file-input');
      });
      await page.addScriptTag({content:fs.readFileSync(path.join(root,'profile-editor-v88.js'),'utf8')});
      assert(await page.locator('#profile-pane-about-v88').isVisible());
      assert(!(await page.locator('#profile-pane-style-v88').isVisible()));
      await page.locator('#prof-name-inp').fill('Unsaved name');
      await page.getByRole('tab',{name:'Оформление',exact:true}).click();
      assert(await page.locator('#profile-pane-style-v88').isVisible());
      await page.evaluate(()=>{window.renderProfileAvatar();window.renderProfileBannerEditor();});
      assert.equal(await page.locator('.profile-avatar-thumb-v89').textContent(),'🌙');
      assert(await page.locator('.profile-banner-thumb-v89').evaluate(el=>el.classList.contains('banner-preset-ocean')));
      await page.evaluate(async()=>{
        const source=document.createElement('canvas');source.width=160;source.height=80;
        const context=source.getContext('2d');context.fillStyle='#ff0000';context.fillRect(0,0,160,80);
        const video=document.createElement('video');video.muted=true;video.srcObject=source.captureStream(10);
        document.getElementById('profile-banner-preview').append(video);
        const started=video.play();context.fillRect(0,0,160,80);await started;
        window.renderProfileBannerEditor();
      });
      await page.waitForFunction(()=>{
        const canvas=document.querySelector('.profile-banner-thumb-v89 canvas');
        return canvas&&canvas.getContext('2d').getImageData(20,20,1,1).data[0]>200;
      });
      assert.equal(await page.locator('.profile-banner-thumb-v89 video').count(),0);
      await page.locator('.profile-choice-card summary').click();
      assert(await page.locator('.profile-choice-card').evaluate(el=>el.open));
      await page.getByRole('tab',{name:'О себе',exact:true}).click();
      assert.equal(await page.locator('#prof-name-inp').inputValue(),'Unsaved name');
      assert(await page.evaluate(()=>window.originalInput===document.getElementById('avatar-file-input')));
      assert.equal(await page.locator('#animated-profile-card').count(),1);
      const sizes=await page.evaluate(()=>{
        const panel=document.getElementById('profile-panel');
        const cover=document.getElementById('profile-banner-preview').getBoundingClientRect();
        const avatar=document.getElementById('prof-av-prev').getBoundingClientRect();
        return {overflow:panel.scrollWidth-panel.clientWidth,coverAboveAvatar:cover.top<avatar.top};
      });
      assert(sizes.overflow<=1,JSON.stringify(sizes));assert(sizes.coverAboveAvatar);
      await page.close();
      console.log('Profile layout and tabs passed at '+width+'px');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
