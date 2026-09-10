const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(()=>{
      window.me={nick:'me'};window.currentChat='other';window.currentRoom=null;window.viewedProfileNickV5='';
      window.rows={other:[{chat_key:'__telechat_background_phone_v101__',ts:Date.now()}],me:[]};
      window.sb={from(){let nick='';const query={select(){return query},eq(field,value){if(field==='nick')nick=value;return query},in(){return Promise.resolve({data:window.rows[nick]||[]})},upsert(row){const list=window.rows[row.nick]||(window.rows[row.nick]=[]);const old=list.find(item=>item.chat_key===row.chat_key);if(old)old.ts=row.ts;else list.push({chat_key:row.chat_key,ts:row.ts});return Promise.resolve({data:null,error:null})}};return query;}};
      window.updateStatusBar=async()=>{const el=document.getElementById('chat-status-text');el.textContent='в сети';el.className='chat-status-text online';};
      window.renderContacts=async()=>{const row=document.createElement('div');row.className='contact';row.dataset.contactNick='other';row.innerHTML='<div class="av av-online"></div><div class="contact-name">Друг</div>';document.body.append(row);};
      window.openUserProfile=async()=>{document.getElementById('view-profile-seen').textContent='● сейчас в сети';};
    });
    const page=await context.newPage();
    await page.setContent(`<style>body{margin:0}.chat-status-text{display:inline-flex}.av{width:30px;height:30px;border-radius:50%;position:relative}</style><div id="chat-status-text" class="chat-status-text online"></div><div id="chat-av" class="av av-online"></div><div id="view-profile-seen"></div>`);
    await page.addScriptTag({path:path.join(root,'background-presence-v101.js')});
    await page.addStyleTag({path:path.join(root,'background-presence-v101.css')});
    await page.evaluate(()=>window.telechatBackgroundPresenceV101.refresh());
    await page.waitForFunction(()=>document.getElementById('chat-status-text').classList.contains('background-v101'));
    assert.equal(await page.locator('#chat-status-text').textContent(),'в фоне☾');
    assert.equal(await page.locator('#chat-av').evaluate(el=>el.classList.contains('av-online')),false);
    assert.equal(await page.locator('#chat-av').evaluate(el=>el.classList.contains('av-background-v101')),true);
    await page.evaluate(()=>window.renderContacts());
    await page.waitForFunction(()=>document.querySelector('.contact .presence-moon-v101'));
    await page.evaluate(()=>window.openUserProfile('other'));
    await page.waitForFunction(()=>document.querySelector('#view-profile-seen.background-v101'));
    await page.evaluate(()=>window.telechatBackgroundPresenceV101.markActive());
    assert.equal(await page.evaluate(()=>window.rows.me.some(row=>['__telechat_background_phone_v101__','__telechat_background_pc_v101__'].includes(row.chat_key)&&row.ts===0)),true);
    console.log('background-presence-v101 browser ok');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
