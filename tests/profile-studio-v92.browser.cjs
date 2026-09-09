const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [1280,800,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      await page.route('**/*',route=>route.abort());
      let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      html=html.replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,file)=>file.endsWith('.css')?'<style>'+fs.readFileSync(path.join(root,file),'utf8')+'</style>':'');
      await page.setContent(html);
      await page.evaluate(()=>{
        window.me={nick:'creator',name:'Кирилл'};
        window.buildProfPanel=()=>{
          document.getElementById('prof-name-inp').value='Кирилл';
          document.getElementById('prof-status-inp').value='Делаем tele.chat ✨';
          document.getElementById('prof-bio-inp').value='Место для своих.\nЛюблю музыку, ночные разговоры и хорошие идеи.';
        };
        window.renderProfileAvatar=()=>{document.getElementById('prof-av-prev').textContent='🌙';};
        window.renderProfileBannerEditor=()=>{document.getElementById('profile-banner-preview').className='profile-banner-preview banner-preset-aurora';};
        let photo='';
        window.telechatProfileAppearanceV84={getSelected:()=>photo};
        window.handleProfileBackgroundV84=async()=>{photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';};
        window.removeProfileBackgroundV84=()=>{photo='';};
        window.saveProfile=()=>{window.savedDraft={name:document.getElementById('prof-name-inp').value};};
        document.getElementById('startup-loader')?.remove();
        document.getElementById('profile-panel').classList.add('v65-full-panel','open');
        const premium=document.createElement('div');premium.id='animated-profile-card';premium.textContent='✨ Анимированный профиль · Доступ открыт';
        document.querySelector('.profile-preview-btn').after(premium);
        window.originalInput=document.getElementById('avatar-file-input');
        renderProfileAvatar();renderProfileBannerEditor();
      });
      for(const file of ['profile-editor-v88.js','profile-studio-v92.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
      await page.evaluate(()=>window.buildProfPanel());
      const panel=page.locator('#profile-panel');
      await page.locator('#prof-name-inp').fill('Мой новый профиль');
      await page.locator('#prof-status-inp').fill('На своей волне');
      assert.equal(await page.locator('#profile-editor-name-v88').textContent(),'Мой новый профиль');
      assert.equal(await page.locator('.ps-status').textContent(),'На своей волне');
      await page.locator('#prof-bio-inp').fill('<script>not executable</script>');
      assert.equal(await page.locator('.ps-bio p').textContent(),'<script>not executable</script>');
      assert.equal(await page.locator('.ps-bio script').count(),0);
      await page.locator('#prof-bio-inp').fill('Место для своих.\nЛюблю музыку, ночные разговоры и хорошие идеи.');
      await page.getByRole('tab',{name:'Оформление',exact:true}).click();
      assert(await page.locator('#profile-pane-style-v88').isVisible());
      assert(await page.locator('.ps-controls-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth));
      fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
      await panel.screenshot({path:path.join(root,'outputs',`profile-studio-v92-style-${width}.png`)});
      assert(await page.evaluate(()=>window.originalInput===document.getElementById('avatar-file-input')));
      await page.evaluate(()=>window.handleProfileBackgroundV84());
      assert(await page.locator('.profile-hero-v88').evaluate(el=>el.classList.contains('ps-has-photo')));
      await page.evaluate(()=>window.removeProfileBackgroundV84());
      assert(!(await page.locator('.profile-hero-v88').evaluate(el=>el.classList.contains('ps-has-photo'))));
      await page.getByRole('tab',{name:'О себе',exact:true}).click();
      assert.equal(await page.locator('#prof-name-inp').inputValue(),'Мой новый профиль');
      await page.locator('.profile-action-dock .auth-btn').click();
      assert.equal(await page.evaluate(()=>window.savedDraft.name),'Мой новый профиль');
      const sizes=await page.evaluate(()=>{
        const panel=document.getElementById('profile-panel'),rect=panel.getBoundingClientRect();
        const controls=panel.querySelector('.ps-controls').getBoundingClientRect(),preview=panel.querySelector('.ps-preview').getBoundingClientRect();
        const dock=panel.querySelector('.profile-action-dock').getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,overflow:panel.scrollWidth-panel.clientWidth,sideBySide:preview.left>=controls.right-1,dockBottom:dock.bottom};
      });
      assert(sizes.left>=-1&&sizes.right<=width+1&&sizes.bottom<=901&&sizes.top>=-1,JSON.stringify(sizes));
      assert(sizes.overflow<=1,JSON.stringify(sizes));
      assert(sizes.dockBottom<=901,JSON.stringify(sizes));
      if(width>760)assert(sizes.sideBySide,JSON.stringify(sizes));
      await page.evaluate(()=>document.querySelector('.ps-layout').scrollTop=0);
      fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
      await panel.screenshot({path:path.join(root,'outputs',`profile-studio-v92-${width}.png`)});
      await page.close();console.log('Profile studio passed at '+width+'px');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
