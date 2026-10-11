const assert=require('assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,1440]){
  const {p,errors}=await fixture(browser,width,844,width<600);await p.evaluate(()=>openChat('friend0'));await p.waitForTimeout(80);
  const send=(text,extra={})=>p.evaluate(({text,extra})=>window.dispatchEvent(new CustomEvent('telechat-chat-action-v155',{detail:{action:'send',owner:me.nick,key:conversationKey(),text,...extra}})),{text,extra});
  const state=()=>p.evaluate(()=>telechatPixelEyesV155.getState());const speech=p.locator('.pe-speech-v165');
  await p.evaluate(()=>{window.localCompanionRequests=[];window.fetch=async(...args)=>{localCompanionRequests.push(args[0]);throw Error('Companion must stay local');};});
  const height=await p.locator('#messages').evaluate(n=>n.clientHeight);
  await send('привет');assert.equal((await state()).mood,'happy');assert.equal(await speech.textContent(),'Привет) Я на месте.');
  await send('спасибо');assert.equal(await speech.textContent(),'Привет) Я на месте.','No interrupting active speech');
  await p.waitForTimeout(4350);await send('привет');assert(!(await state()).talking,'Same phrase does not replay within 30 seconds');
  await send('спасибо');assert.equal(await speech.textContent(),'Маленькое спасибо — большое тепло.','Suppressed replies do not consume variants');
  assert.equal(await p.locator('#messages').evaluate(n=>n.clientHeight),height,'Replies do not resize chat');
  await p.evaluate(()=>openChat('friend1'));await p.waitForTimeout(70);assert(!(await state()).talking,'Chat switch clears speech');
  await send('люблю музыку');assert.equal((await state()).mood,'happy');assert.equal(await speech.textContent(),'Похоже, это твой любимый вайб)','No romance reply for favorite object');
  await p.evaluate(()=>openChat('friend0'));await p.waitForTimeout(60);await send('__telechat_voice_v1__:спасибо');assert(!(await state()).talking,'Metadata is never interpreted');
  await send('я тебя люблю',{owner:'other'});assert(!(await state()).talking,'Wrong owner ignored');await send('я тебя люблю',{key:'wrong'});assert(!(await state()).talking,'Wrong chat ignored');
  await send('__telechat_media_v1__:'+JSON.stringify({kind:'image',data:'x'.repeat(10000),url:'https://image.test/привет',caption:'доброе утро'}));assert.equal(await speech.textContent(),'Доброе утро. Просыпаемся понемногу)','Caption after a large attachment is preserved; only caption is interpreted');
  await p.evaluate(()=>openChat('friend1'));await p.waitForTimeout(70);await send('приветик');assert.equal(await speech.textContent(),'О, знакомые буквы! Привет)','Variants rotate across phrases');
  await p.evaluate(()=>telechatPixelEyesV155.open());await p.locator('#pe-speech-v165').uncheck();await p.locator('.pe-close-v155').click();await send('мне грустно');assert.equal((await state()).mood,'sad');assert(!(await state()).talking,'Speech toggle keeps reactions');
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));await send('привет');assert(!(await state()).running);assert(!(await state()).talking,'No background replies');
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));assert.deepEqual(await p.evaluate(()=>localCompanionRequests),[],'Zero AI/network requests');
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS v166 browser: local context/variants, active speech protection, repeats, owner/chat/background guards, metadata/captions, settings and stable layout at 320/1440');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
