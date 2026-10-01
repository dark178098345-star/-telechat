const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='profile.test')return route.abort();const file=path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1));if(!fs.existsSync(file))return route.fulfill({status:404,body:''});let body=fs.readFileSync(file,'utf8');if(file.endsWith('.html'))body=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');return route.fulfill({contentType:file.endsWith('.css')?'text/css':'text/html',body});});
 await page.goto('https://profile.test/');
 await page.evaluate(()=>{
  document.querySelector('#startup-loader')?.remove();document.querySelector('#auth-screen')?.classList.remove('active');
  window.me={nick:'viewer'};window.openUserProfile=async()=>{};window.closeUserProfile=()=>document.querySelector('#user-profile-modal').classList.remove('show');
  const body=document.querySelector('.user-profile-body');
  document.querySelector('#view-profile-name').textContent='creator';document.querySelector('#view-profile-nick').textContent='@creator';
  document.querySelector('#view-profile-seen').classList.add('listening-v145');document.querySelector('#view-profile-seen').innerHTML='<svg class="listening-icon-v145" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z"/></svg>Слушает музыку';document.querySelector('#view-profile-status').textContent='Занят. Создаю что-то интересное';document.querySelector('#view-profile-bio').innerHTML='Мой tg: NexOri_0<br>Люблю tele.chat<br>Создаю tele.chat';
  const svg='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#314642"/><path d="M0 320L160 30 340 340 490 90 600 300V400H0" fill="#152b29"/></svg>');
  document.querySelector('#view-profile-cover').classList.add('banner-photo');document.querySelector('#view-profile-cover').style.backgroundImage=`url("${svg}")`;
  document.querySelector('.user-profile-card').classList.add('profile-photo-background-v84');document.querySelector('.user-profile-card').style.setProperty('--profile-card-photo-v84',`url("${svg}")`);
  document.querySelector('#view-profile-avatar').innerHTML=`<img class="avatar-photo" alt="Аватар" src="${svg}">`;
  document.querySelector('#view-profile-nick').insertAdjacentHTML('afterend','<button class="activity-badge-v124">✦ Уровень 3</button><div id="follow-stats"><div class="follow-stat"><span class="follow-count">10</span><span class="follow-label">подписчики</span></div><div class="follow-stat"><span class="follow-count">0</span><span class="follow-label">подписки</span></div></div><button id="follow-btn">Подписаться</button><div id="view-profile-role" class="user-profile-role show creator">Создатель</div>');
  document.querySelector('#view-profile-status').insertAdjacentHTML('afterend','<section id="moon-profile-showcase-v29" class="moon-profile-showcase-v29"><button class="moon-showcase-head"><span><small>РЕДКИЕ ЭКЗЕМПЛЯРЫ</small><strong>Лимитированная коллекция</strong></span><em>Все подарки ›</em></button><div class="moon-profile-showcase-list">'+['Полярная звезда','Чёрная комета','Зимняя сказка','Первая Луна'].map((s,i)=>`<button class="moon-showcase-star"><span>${i===3?'☾':'✧'}</span><small>${s}</small></button>`).join('')+'</div></section><div class="profile-music-v97"><button class="profile-music-play-v97">▷</button><div class="profile-music-copy-v97"><small>МУЗЫКА ПРОФИЛЯ</small><strong>Твоя волна</strong></div></div>');
  window.playClicks=0;document.querySelector('.profile-music-play-v97').onclick=()=>window.playClicks++;
  window.followClicks=0;document.querySelector('#follow-btn').onclick=()=>window.followClicks++;
  document.querySelector('#user-profile-modal').classList.add('show');
 });
 for(const f of ['profile-details-v22.js','profile-follow-compact-v102.js'])await page.addScriptTag({content:read(f)});
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:950});await page.evaluate(w=>document.body.classList.toggle('telechat-mobile-v100',w<=720),width);
  await page.waitForTimeout(400);
  const card=page.locator('#user-profile-modal .user-profile-card');
  assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'card overflow '+width);
  const bounds=await card.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:innerHeight,width:innerWidth};});
  assert(bounds.left>=0&&bounds.right<=bounds.width+1&&bounds.top>=0&&bounds.bottom<=bounds.height+1,'card bounds '+width+' '+JSON.stringify(bounds));
  const name=await page.locator('#view-profile-name').boundingBox(),avatar=await page.locator('#view-profile-avatar').boundingBox();assert(name.y>=avatar.y+avatar.height,'header overlap');
  const musicLabel=await page.locator('#view-profile-seen').boundingBox();assert(name.x+name.width<=musicLabel.x+1,'listening badge does not overlap name');
  assert.equal(await page.locator('#profile-follow-compact-v102').evaluate(e=>e.previousElementSibling.id),'view-profile-nick');
  assert.equal(await page.locator('.activity-badge-v124').count(),1);
  assert(await page.locator('.profile-music-v97').evaluate(e=>e.clientWidth>e.parentElement.clientWidth*.75),'music full width');
  await page.locator('.profile-music-play-v97').click();await page.locator('#follow-btn').click();
  await page.locator('#profile-details-toggle').click();assert.equal(await page.locator('#profile-details-toggle').getAttribute('aria-expanded'),'true');await page.locator('#profile-details-toggle').click();
  await page.waitForTimeout(350);await card.evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(root,`outputs/profile-card-v143-${width}.png`)});
 }
 assert.equal(await page.evaluate(()=>playClicks),4);assert.equal(await page.evaluate(()=>followClicks),4);
 assert(await page.locator('#view-profile-avatar img').getAttribute('src'));assert(await page.locator('#view-profile-cover').evaluate(e=>e.style.backgroundImage.includes('data:image')));
 await page.setViewportSize({width:320,height:640});
 await page.evaluate(()=>{document.querySelector('#view-profile-name').textContent='ОченьДлинноеИмяПользователяБезПробелов';document.querySelector('#view-profile-nick').textContent='@very_long_username_here';document.querySelector('.profile-music-v97').remove();document.querySelector('#moon-profile-showcase-v29').remove();document.querySelector('.user-profile-card').classList.remove('profile-photo-background-v84');document.querySelector('.user-profile-card').scrollTop=0;});
 assert(await page.locator('.user-profile-card').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'long identity overflow');
 await page.locator('.user-profile-close').click();assert.equal(await page.locator('#user-profile-modal').evaluate(e=>e.classList.contains('show')),false);
 console.log('PASS profile v143: 320/390/768/1440px, follow/music/details/close, original media and single badge');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
