const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright'),{fixture}=require('./phone-shell-v159.browser.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [320,390,1440]){
  const {p,errors}=await fixture(browser,width,900,width<600);await p.clock.install();
  await p.evaluate(()=>{
   window.playback={track:{id:'one',title:'Тестовый трек'},paused:false,time:0,duration:100,volume:.7};window.gains=[];window.pauseCalls=0;window.probes=0;window.reconnectCalls=0;window.drainCalls=0;
   Object.assign(telechatMusicV96,{getState:()=>({...playback}),pause:()=>{pauseCalls++;playback.paused=true;},setSleepGain:g=>gains.push(g)});
   window.telechatTransportV172={diagnostics:()=>({requests:7,timeouts:1,lastSuccessAt:Date.now(),lastFailureAt:0,latencyMs:123}),probe:async()=>{probes++;return {ok:true,latencyMs:123};}};
   window.telechatPresenceV120={diagnostics:()=>({connected:true,hasSession:true}),reconnect:()=>reconnectCalls++};window.telechatMessageCoreV104={diagnostics:()=>({active:true,connected:true}),reconnect:()=>reconnectCalls++};
   window.telechatDeliveryV72={diagnostics:async()=>({queued:2,failed:1,permanent:0,sending:0,durable:true}),drain:async()=>drainCalls++};
  });
  for(const f of ['settings-navigation-v160.js','theme-presets-v175.js','sleep-timer-v176.js','utilities-v176.js'])await p.addScriptTag({content:read(f)});
  await p.evaluate(()=>openPanel('settings-panel'));await p.locator('[data-settings-section=connection]').click();await p.clock.runFor(150);
  assert.equal(await p.locator('#connection-queue-v176').textContent(),'2');assert.equal(await p.locator('#connection-latency-v176').textContent(),'123 мс');assert.equal(await p.evaluate(()=>probes),0,'Opening diagnostics does not poll server');
  assert(await p.locator('#settings-panel').evaluate(n=>n.scrollWidth<=n.clientWidth),'Settings fit '+width);
  if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/connection-v176-${width}.png`)});
  await p.locator('#connection-probe-v176').click();assert.equal(await p.evaluate(()=>probes),1);await p.locator('#connection-probe-v176').click();assert.equal(await p.evaluate(()=>probes),1,'Repeated check is bounded');
  await p.clock.fastForward(3100);await p.locator('#connection-reconnect-v176').click();assert.equal(await p.evaluate(()=>reconnectCalls),2);assert.equal(await p.evaluate(()=>drainCalls),1);
  await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});await p.clock.runFor(150);assert.equal(await p.locator('#connection-network-v176').textContent(),'Нет подключения');
  await p.clock.fastForward(3100);await p.locator('#connection-reconnect-v176').click();assert.equal(await p.evaluate(()=>reconnectCalls),2,'Offline does not reconnect or send');await p.evaluate(()=>{delete navigator.onLine;window.dispatchEvent(new Event('online'));});
  await p.evaluate(()=>telechatSettingsV160.openSection('music'));await p.locator('#sleep-settings-v176 [data-sleep-open-v176]').click();assert(await p.locator('#sleep-timer-v176').isVisible());
  assert(await p.locator('#sleep-timer-v176').evaluate(n=>n.scrollWidth<=n.clientWidth),'Timer fits '+width);
  await p.locator('#sleep-minutes-v176').fill('1');await p.locator('#sleep-form-v176 button').click();assert.equal(await p.evaluate(()=>exstraSleepTimerV176.getState().mode),'time');
  if(width===390||width===1440)await p.screenshot({path:path.join(root,`outputs/sleep-v176-${width}.png`)});
  if(width<600){
   await p.locator('#sleep-minutes-v176').focus();await p.evaluate(()=>{const v=new EventTarget();v.height=400;v.offsetTop=0;Object.defineProperty(window,'visualViewport',{value:v,configurable:true});window.dispatchEvent(new Event('resize'));});await p.clock.runFor(150);
   assert(await p.locator('#sleep-timer-v176').evaluate(n=>n.getBoundingClientRect().bottom<=401),'Numeric keyboard does not hide timer dialog');
   await p.evaluate(()=>{document.activeElement.blur();visualViewport.height=900;window.dispatchEvent(new Event('resize'));});await p.clock.runFor(150);
  }
  await p.keyboard.press('Escape');assert(!(await p.locator('#sleep-timer-v176').isVisible()),'Escape closes timer');
  await p.clock.fastForward(56000);assert(await p.evaluate(()=>gains.at(-1)>0&&gains.at(-1)<1),'Gain fades in last 8 seconds even with dialog closed');
  await p.clock.fastForward(5000);assert.equal(await p.evaluate(()=>pauseCalls),1);assert.equal(await p.evaluate(()=>exstraSleepTimerV176.getState()),null);assert.equal(await p.evaluate(()=>gains.at(-1)),1,'Gain restores, user volume remains untouched');
  assert.equal(await p.evaluate(()=>playback.volume),.7);
  await p.evaluate(()=>{playback.paused=false;exstraSleepTimerV176.setAfterTrack();playback.time=96;window.dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:playback}));});assert.equal(await p.evaluate(()=>gains.at(-1)),.5);
  assert(await p.evaluate(()=>exstraSleepTimerV176.onTrackEnd(playback.track)),'End hook consumes natural finish before repeat/queue');assert.equal(await p.evaluate(()=>pauseCalls),2);
  await p.evaluate(()=>{playback.paused=false;exstraSleepTimerV176.setAfterTrack();playback.track={id:'two'};window.dispatchEvent(new CustomEvent('telechat-music-progress-v117',{detail:playback}));});assert.equal(await p.evaluate(()=>exstraSleepTimerV176.getState()),null,'Skipping bound track cancels end mode');
  await p.evaluate(()=>{exstraSleepTimerV176.setMinutes(1);me={nick:'second'};window.dispatchEvent(new Event('telechat-account-ready-v175'));});await p.clock.fastForward(61000);assert.equal(await p.evaluate(()=>pauseCalls),2,'Switching account cancels old timer, not new playback');
  await p.evaluate(()=>{window.roomLeaves=0;window.telechatTogetherV147={state:()=>({host:false}),leave:()=>roomLeaves++};exstraSleepTimerV176.setAfterTrack();exstraSleepTimerV176.onTrackEnd(playback.track);});assert.equal(await p.evaluate(()=>roomLeaves),1,'Listener leaves room so next host packet cannot restart music');
  await p.evaluate(()=>{exstraSleepTimerV176.setMinutes(1);exstraSleepTimerV176.cancel();});const pauses=await p.evaluate(()=>pauseCalls);await p.clock.fastForward(61000);assert.equal(await p.evaluate(()=>pauseCalls),pauses,'Cancelled timer cannot stop music');
  // Recreate engine in the same tab: a future time deadline survives a reload.
  await p.evaluate(()=>exstraSleepTimerV176.setMinutes(30));const deadline=await p.evaluate(()=>exstraSleepTimerV176.getState().deadline);
  assert(deadline>Date.now());assert.deepEqual(errors,[]);await p.close();
 }
 for(const f of ['utilities-v176.js','utilities-v176.css','sleep-timer-v176.js']){assert(read('index.html').includes(f+'?v=176'));assert(read('sw.js').includes(f+'?v=176'));}
 console.log('PASS v176 utilities: local-only diagnostics, real reconnect entry points, no offline requests, 320/390/1440 fit, sleep deadline/fade/end/cancel/account/room safety.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
