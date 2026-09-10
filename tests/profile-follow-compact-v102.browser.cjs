const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(()=>{
      window.openUserProfile=async()=>{};
      window.me={nick:'viewer'};
    });
    const page=await context.newPage();
    await page.setContent(`<style>${fs.readFileSync(path.join(root,'profile-follow-compact-v102.css'),'utf8')}</style><div class="user-profile-body"><div class="user-profile-avatar">🙂</div><div class="user-profile-name">creator</div><div class="user-profile-nick">@creator</div><div id="follow-stats" class="follow-stats"><div class="follow-stat"><span class="follow-count">8</span><span class="follow-label">подписчики</span></div><div class="follow-stat"><span class="follow-count">2</span><span class="follow-label">подписки</span></div></div><button id="follow-btn">Подписаться</button></div>`);
    await page.addScriptTag({path:path.join(root,'profile-follow-compact-v102.js')});
    await page.waitForSelector('#profile-follow-compact-v102');
    assert.equal(await page.locator('#profile-follow-compact-v102 #follow-stats').count(),1);
    assert.equal(await page.locator('#profile-follow-compact-v102 #follow-btn').textContent(),'Подписаться');
    const box=await page.locator('#profile-follow-compact-v102').boundingBox();
    assert(box&&box.width>0&&box.height<70);
    assert.equal(await page.locator('#profile-follow-compact-v102').evaluate(el=>el.previousElementSibling.classList.contains('user-profile-nick')),true);
    console.log('profile-follow-compact-v102 browser ok');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
