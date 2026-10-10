const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
 let html=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');html=html.replace(/<link\b[^>]*href="([^"?]+)[^"]*"[^>]*>/gi,(tag,file)=>file.endsWith('.css')?'<style>'+read(file)+'</style>':'');await page.route('https://pixels.test/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html}));await page.goto('https://pixels.test/');
 await page.evaluate(()=>{
  document.getElementById('startup-loader').remove();document.getElementById('auth-screen').classList.remove('active');document.getElementById('chat-screen').classList.add('active');document.getElementById('sidebar').classList.add('hidden');document.getElementById('empty-state').style.display='none';document.getElementById('active-chat').style.display='flex';
  window.me={nick:'alice'};window.currentChat='bob';window.currentRoom=null;window.conversationKey=()=>currentChat?'alice_'+currentChat:'';window.autoResize=()=>{};window.sendTyping=()=>{};window.DeviceMotionEvent=undefined;
  window.addRow=(id,text,from='bob',ts=Date.now())=>{const row=document.createElement('div');row.className='msg '+(from==='alice'?'me':'them');row.dataset.id=id;row.textContent=text;row._messageSourceV136={id,text,from_nick:from,ts,chat_key:conversationKey()};document.getElementById('messages').append(row);return row;};addRow('old','История чата','bob',Date.now()-60000);
  document.getElementById('chat-name-hdr').textContent='Максим';document.getElementById('chat-status-text').textContent='В сети';
  const edit=document.createElement('div');edit.id='message-edit-overlay-v36';document.body.append(edit);
 });
 await page.addScriptTag({content:read('pixel-eyes-v155.js')});await page.waitForTimeout(250);
 const state=()=>page.evaluate(()=>telechatPixelEyesV155.getState());assert.equal((await state()).mood,'welcome');await page.waitForTimeout(600);assert.equal((await state()).mood,'idle');assert((await state()).running);
 assert(await page.locator('#pixel-eyes-stage-v155').isVisible());
 const original=await page.evaluate(()=>({text:document.getElementById('messages').textContent,count:document.getElementById('messages').children.length}));
 await page.locator('#msg-input').fill('Пишем');assert.equal((await state()).mood,'typing');
 const action=(action,text='',owner='alice',key='alice_bob')=>page.evaluate(data=>window.dispatchEvent(new CustomEvent('telechat-chat-action-v155',{detail:data})),{action,text,owner,key});
 await action('send','hello','other');assert.equal((await state()).mood,'typing');await action('send','hello');assert.equal((await state()).mood,'happy');
 await action('send','❤️');assert.equal((await state()).mood,'love');await action('delete');assert.equal((await state()).mood,'sad');
 await page.evaluate(()=>{document.getElementById('msg-input').value='';document.getElementById('msg-input').blur();telechatPixelEyesV155.react('idle',1);addRow('new','Привет');});await page.waitForTimeout(80);assert.equal((await state()).mood,'curious');
 await page.evaluate(()=>{telechatPixelEyesV155.react('idle',1);const row=document.querySelector('.msg[data-id="new"]');document.getElementById('messages').append(row);});await page.waitForTimeout(50);assert.equal((await state()).mood,'idle','Rerender does not replay incoming reaction');
 await page.evaluate(()=>addRow('heart','💕'));await page.waitForTimeout(50);assert.equal((await state()).mood,'love');
 await page.evaluate(()=>{telechatPixelEyesV155.react('idle',1);addRow('history','Old heart ❤️','bob',Date.now()-60000);});await page.waitForTimeout(50);assert.equal((await state()).mood,'idle','Older history does not animate');
 await page.locator('.pe-character-v155').click();assert(await page.locator('#pixel-eyes-dialog-v155').isVisible());assert.equal(await page.locator('[data-pe-style]').count(),7);
 assert.equal(await page.locator('[data-pe-style] canvas').evaluateAll(nodes=>new Set(nodes.map(n=>n.toDataURL())).size),7,'Seven distinct original pixel designs');
 for(const style of ['classic','anime','kawaii','cat','robot','demon','cyclops']){await page.locator('[data-pe-style="'+style+'"]').click();assert.equal((await state()).style,style);assert.equal(await page.locator('[data-pe-style="'+style+'"]').getAttribute('aria-pressed'),'true');}
 assert.equal(await page.locator('[data-pe-demo]').count(),10);
 for(const demo of ['happy','love','sad','typing','record','dizzy','angry','laugh','surprised','sleep']){await page.locator('[data-pe-demo="'+demo+'"]').click();const frames=[];for(const delay of [100,220,310]){await page.waitForTimeout(delay);frames.push(await page.locator('.pe-preview-v155 canvas').evaluate(c=>c.toDataURL()));}assert(new Set(frames).size>1,'Moving preview '+demo);}
 await page.locator('[data-pe-style="classic"]').click();for(const demo of ['angry','laugh']){await page.locator('[data-pe-demo="'+demo+'"]').click();await page.waitForTimeout(250);await page.locator('.pe-preview-v155').screenshot({path:path.join(root,`outputs/pixel-eyes-v157-${demo}.png`)});}
 await page.locator('.pe-close-v155').click();
 const clear=async()=>{await page.evaluate(()=>{document.activeElement?.blur();telechatPixelEyesV155.react('idle',1);});await page.waitForTimeout(25);};
 for(const [text,expected] of [['😡','angry'],['🤬','angry'],['Я рад 😄','laugh'],['😂🤣','laugh'],['😢','sad'],['❤️','love'],['😮','surprised'],['😴','sleep'],['🤔','think'],['😉','wink'],['😵','dizzy'],['🥳','excited'],['❤️😂','laugh'],['😂❤️','love']]){
  await action('send',text);assert.equal((await state()).mood,expected,'Sent '+text);
  await clear();await page.evaluate(([text,id])=>addRow(id,text),[text,'emoji-'+text]);await page.waitForTimeout(40);assert.equal((await state()).mood,expected,'Incoming '+text);
 }
 await action('send','😡');await action('send','😂');assert.equal((await state()).mood,'laugh','Latest sent emotion takes precedence immediately');
 await action('reaction','😡');assert.equal((await state()).mood,'angry');await action('reaction','😄');assert.equal((await state()).mood,'laugh');
 await action('send','__telechat_media_v1__:'+JSON.stringify({kind:'file',data:JSON.stringify({name:'angry😡.txt'}),caption:'Я рад 😂'}));assert.equal((await state()).mood,'laugh','Use media caption, not metadata');
 await action('send','__telechat_media_v1__:'+JSON.stringify({kind:'file',data:'angry😡.txt',caption:''}));assert.equal((await state()).mood,'happy','Ignore emoji in attachment metadata');
 await action('send','https://example.com/😡');assert.equal((await state()).mood,'happy','Ignore emoji inside URL');
 await clear();await page.locator('#msg-input').focus();assert.equal((await state()).mood,'focus');await clear();
 for(const [id,flag,expected] of [['reply-bar','show','think'],['pending-media','show','attach'],['emoji-picker','open','excited'],['message-edit-overlay-v36','show','think']]){await clear();await page.evaluate(([id,flag])=>document.getElementById(id).classList.add(flag),[id,flag]);await page.waitForTimeout(30);assert.equal((await state()).mood,expected,id);await page.evaluate(([id,flag])=>document.getElementById(id).classList.remove(flag),[id,flag]);}
 await clear();await action('edit','changed');assert.equal((await state()).mood,'wink');await clear();await action('reaction','❤️');assert.equal((await state()).mood,'love');await clear();await action('reaction','👍');assert.equal((await state()).mood,'excited');await clear();await action('reaction','');assert.equal((await state()).mood,'wink');
 await clear();await page.evaluate(()=>{document.getElementById('record-btn').dataset.voiceState='recording';});assert.equal((await state()).mood,'record');await page.evaluate(()=>document.getElementById('record-btn').dataset.voiceState='idle');
 await clear();await page.evaluate(()=>{const box=document.getElementById('messages');window.beforeScroll=box.scrollTop;box.dispatchEvent(new WheelEvent('wheel',{deltaY:80}));box.dispatchEvent(new Event('scroll'));});assert.equal((await state()).mood,'read');assert(await page.evaluate(()=>beforeScroll===document.getElementById('messages').scrollTop),'Eyes never change scroll position');
 await clear();await page.locator('.pe-character-v155').click();
 for(const theme of ['','theme-light','theme-green'])for(const [width,height] of [[320,640],[390,800],[740,360],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(theme=>{document.body.classList.remove('theme-light','theme-green');if(theme)document.body.classList.add(theme);document.body.classList.toggle('telechat-mobile-v100',innerWidth<=720);},theme);
  assert(await page.locator('#pixel-eyes-dialog-v155').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;}),'Settings bounds '+width+' '+theme);
 }
 await page.setViewportSize({width:390,height:800});await page.evaluate(()=>{document.body.classList.remove('theme-green');telechatPixelEyesV155.react('idle',2500);});await page.waitForTimeout(70);await page.screenshot({path:path.join(root,'outputs/pixel-eyes-v155-settings.png')});
 await page.locator('[data-pe-style="cat"]').click();await page.locator('#pe-enabled-v155').uncheck();await page.locator('.pe-close-v155').click();assert(!(await page.locator('#pixel-eyes-stage-v155').isVisible()));assert(!(await state()).running);
 await page.evaluate(()=>document.querySelector('.pe-settings-entry-v155').click());await page.locator('#pe-enabled-v155').check();
 await page.evaluate(()=>{window.permissionCalls=0;window.DeviceMotionEvent={requestPermission:async()=>{permissionCalls++;return 'granted';}};});await page.locator('#pe-shake-v155').click();assert.equal(await page.evaluate(()=>permissionCalls),1);assert((await state()).shake);
 await page.locator('.pe-close-v155').click();await page.evaluate(()=>{for(const x of [0,30]){const event=new Event('devicemotion');Object.defineProperty(event,'accelerationIncludingGravity',{value:{x,y:0,z:9.8}});window.dispatchEvent(event);}});assert.equal((await state()).mood,'dizzy');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:true}})));assert(!(await state()).running);await page.evaluate(()=>window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:false}})));assert((await state()).running);
 await page.evaluate(()=>{me={nick:'eve'};document.getElementById('chat-screen').classList.add('session-test');});await page.waitForTimeout(30);assert.equal((await state()).style,'classic');
 await page.evaluate(()=>{me={nick:'alice'};document.getElementById('chat-screen').classList.remove('session-test');});await page.waitForTimeout(30);assert.equal((await state()).style,'cat');
 await page.evaluate(()=>{telechatPixelEyesV155.react('idle',1);currentChat='empty';document.getElementById('messages').replaceChildren();});await page.waitForTimeout(250);await page.evaluate(()=>addRow('first','Первое сообщение'));await page.waitForTimeout(50);assert.equal((await state()).mood,'curious','First message in empty chat reacts');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:800});await page.evaluate(()=>{document.body.classList.toggle('telechat-mobile-v100',innerWidth<=720);document.documentElement.style.setProperty('--v100-height','800px');telechatPixelEyesV155.react('love',2500);document.getElementById('messages').scrollTop=0;});await page.waitForTimeout(150);assert(await page.locator('#pixel-eyes-stage-v155').evaluate(e=>{const r=e.getBoundingClientRect(),box=document.getElementById('messages').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=box.top+1;}));await page.screenshot({path:path.join(root,`outputs/pixel-eyes-v155-chat-${width}.png`)});}
 assert.equal(original.count,1);assert.equal(original.text,'История чата');assert.deepEqual(errors,[]);
 console.log('PASS pixel eyes: emoji emotions in sent/incoming messages and reactions, latest emotion wins, safe media caption/URL handling; 10 moving demos, 7 styles, history dedupe, settings, shake/background and 320–1440px dark/light/green layout');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
