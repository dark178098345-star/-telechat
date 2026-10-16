const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const {fixture}=require('./phone-shell-v159.browser.cjs'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function luminance(c){const values=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values.reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,390,720,1440]){
   const {p,errors}=await fixture(browser,width,900,width<=720);
   await p.evaluate(()=>{window.originalThemeButtons=[...document.querySelectorAll('.theme-btn')];window.extraThemeClicks=0;originalThemeButtons[0].addEventListener('click',()=>extraThemeClicks++);document.body.classList.add('preserve-theme-test');});
   for(const f of ['settings-navigation-v160.js','chat-comfort-v167.js','theme-presets-v175.js'])await p.addScriptTag({content:read(f)});
   await p.evaluate(()=>openPanel('settings-panel'));
   await p.locator('[data-settings-section="appearance"]').click();
   assert.equal(await p.locator('.theme-preset-v175').count(),16);
   assert(await p.evaluate(()=>originalThemeButtons.every(b=>b.isConnected)),'Existing controls/listeners retained');
   const themes=await p.evaluate(()=>exstraThemesV175.list());
   const backgrounds=new Set();
   for(const theme of themes){
    await p.locator(`.theme-preset-v175[data-theme="${theme.id}"]`).click();
    assert.equal(await p.locator(`.theme-preset-v175[data-theme="${theme.id}"]`).getAttribute('aria-pressed'),'true');
    const colors=await p.evaluate(()=>{
     const s=getComputedStyle(document.body),n=document.createElement('span');document.body.append(n);n.style.color='var(--text)';n.style.backgroundColor='var(--bg2)';const c=getComputedStyle(n),result={text:c.color,surface:c.backgroundColor};n.style.color='var(--text3)';result.muted=getComputedStyle(n).color;n.style.color='var(--accent3)';result.soft=getComputedStyle(n).color;n.style.backgroundColor='var(--accent)';result.fill=getComputedStyle(n).backgroundColor;n.style.backgroundColor='var(--bg)';result.bg=getComputedStyle(n).backgroundColor;n.remove();return result;
    });
    assert(ratio(colors.text,colors.surface)>=4.5,theme.id+' text contrast '+JSON.stringify(colors));
    assert(ratio(colors.muted,colors.surface)>=4.5,theme.id+' muted contrast');
    assert(ratio(colors.soft,colors.surface)>=4.5,theme.id+' icon contrast');
    assert(ratio('rgb(255,255,255)',colors.fill)>=4.5,theme.id+' primary button contrast');
    assert(await p.locator('.theme-grid-v175').evaluate(n=>n.scrollWidth<=n.clientWidth),'Grid fits '+width+' '+theme.id);
    assert(await p.locator('#settings-panel').evaluate(n=>n.scrollWidth<=n.clientWidth),'Settings fit '+width+' '+theme.id);
    assert(await p.evaluate(()=>document.body.classList.contains('preserve-theme-test')),'No whole className replacement');
    backgrounds.add(colors.bg);
    if(theme.id==='amoled'){
     assert.equal(colors.bg,'rgb(0, 0, 0)');
     assert.equal(await p.locator('#sidebar').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
    }
   }
   assert(backgrounds.size>=13,'Distinct real palettes, not just button colour');
   assert.equal(await p.evaluate(()=>extraThemeClicks),1);
   await p.evaluate(()=>{setTheme('violet');telechatComfortV167.setAppearance({color:'teal',radius:20,density:'normal'});document.getElementById('messages').classList.add('has-wallpaper-v119');document.getElementById('messages').style.setProperty('--wallpaper-photo-v119','url("data:image/svg+xml,test")');});
   const prefs=await p.evaluate(()=>[document.body.style.getPropertyValue('--chat-outgoing-v167'),document.body.style.getPropertyValue('--chat-radius-v167')]);
   await p.locator('[data-theme=custom]').click();assert(await p.locator('#theme-editor-v175').isVisible());
   await p.locator('#theme-editor-v175 [name=bg]').fill('#ebf7f4');await p.locator('#theme-editor-v175 [name=accent]').fill('#e7eeee');
   await p.locator('#theme-editor-v175 [type=submit]').click();
   assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'custom');assert(!(await p.locator('#theme-editor-v175').isVisible()));
   assert(await p.evaluate(()=>document.body.classList.contains('theme-light')),'Custom light palette gets correct contrast mode');
   assert.deepEqual(await p.evaluate(()=>[document.body.style.getPropertyValue('--chat-outgoing-v167'),document.body.style.getPropertyValue('--chat-radius-v167')]),prefs,'Custom message appearance unchanged');
   assert(await p.locator('#messages').evaluate(n=>n.classList.contains('has-wallpaper-v119')&&n.style.getPropertyValue('--wallpaper-photo-v119').includes('svg')),'Wallpaper untouched');
   for(const bg of ['#777777','#6e6e6e','#888888','#000000','#ffffff','#ff8800']){
    await p.evaluate(bg=>{localStorage.setItem('exstrachat.theme.v175.creator',JSON.stringify({theme:'custom',custom:{bg,accent:'#888888'}}));exstraThemesV175.sync();},bg);
    const values=await p.evaluate(()=>{
     const n=document.createElement('span'),values={};document.body.append(n);
     for(const token of ['bg','bg2','bg3']){n.style.backgroundColor=`var(--${token})`;values[token]=getComputedStyle(n).backgroundColor;}
     for(const token of ['text','text3','accent3']){n.style.color=`var(--${token})`;values[token]=getComputedStyle(n).color;}
     n.remove();return values;
    });
    for(const surface of ['bg','bg2','bg3'])for(const fg of ['text','text3','accent3'])assert(ratio(values[surface],values[fg])>=4.5,'Custom mid-tone readability '+bg+' '+surface+' '+fg+' '+JSON.stringify(values));
   }
   await p.evaluate(()=>{setTheme('amoled');exstraThemesV175.sync();});assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'amoled','Saved theme survives reinit');
   await p.evaluate(()=>{me={nick:'second'};window.dispatchEvent(new Event('telechat-account-ready-v175'));});assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'dark','Another account has independent choice');assert(!(await p.locator('[data-theme=custom]').evaluate(n=>n.classList.contains('has-custom-v175'))),'Previous account custom swatch cleared');
   await p.evaluate(()=>{setTheme('sky');me={nick:'creator'};window.dispatchEvent(new Event('telechat-account-ready-v175'));});assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'amoled');
   await p.evaluate(()=>{localStorage.setItem('exstrachat.theme.v175.creator',JSON.stringify({theme:'custom',custom:{bg:'url(javascript:bad)',accent:'#ffffff'}}));exstraThemesV175.sync();});assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'dark','Invalid stored colours rejected');
   await p.evaluate(()=>{setTheme('track');window.dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{track:{id:'track-one'}}}));window.themeMutations=0;window.themeObserver=new MutationObserver(records=>themeMutations+=records.length);themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','style','data-theme-v175']});});
   await p.evaluate(()=>{for(let i=0;i<100;i++)window.dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:{track:{id:'track-one'},time:i}}));});await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>themeMutations),0,'Playback time updates do not restyle interface');
   await p.evaluate(()=>{themeObserver.disconnect();setTheme('mint');});assert(await p.evaluate(()=>document.body.classList.contains('theme-green')),'Legacy green remains compatible');
   await p.evaluate(()=>setTheme('violet'));
   if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/themes-v175-${width}.png`)});
   await p.evaluate(()=>{closeAllPanels();telechatMusicHubV117.open();});await p.waitForSelector('.mh-wave-v171');
   for(const id of ['amoled','sky','light']){
    await p.evaluate(id=>setTheme(id),id);
    const colors=await p.locator('#music-hub-v117').evaluate(n=>{const s=getComputedStyle(n);return {bg:s.backgroundColor,text:s.color};});
    assert(ratio(colors.bg,colors.text)>=4.5,'Music text contrast '+id);
    if(id==='amoled')assert.equal(colors.bg,'rgb(0, 0, 0)','AMOLED applies to real music view');
    assert(await p.locator('#music-hub-v117').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Music layout retained '+width);
   }
   await p.evaluate(()=>setTheme('custom'));
   assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'dark','Unavailable custom theme cannot produce broken styles');
   await p.evaluate(()=>{localStorage.removeItem('exstrachat.theme.v175.creator');localStorage.setItem('telechat_theme_v16','light');exstraThemesV175.sync();});assert.equal(await p.evaluate(()=>exstraThemesV175.getState().theme),'light','Existing light choice migrates');
   assert.deepEqual(errors,[]);await p.close();
  }
  for(const file of ['theme-presets-v175.css','theme-presets-v175.js']){assert(read('index.html').includes('./'+file+'?v=175'));assert(read('sw.js').includes('./'+file+'?v=175'));}
  console.log('PASS v175 themes: 15 palettes + custom, real colours/contrast, 320–1440 fit, legacy nodes, account persistence, invalid storage, wallpapers/message prefs, no music progress restyle loop.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
