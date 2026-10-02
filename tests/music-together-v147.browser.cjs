const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext();const peers=new Map();let lastPacket;
 await context.route('https://together.test/**',r=>r.fulfill({contentType:'text/html',body:'<div class="sidebar-top"></div>'}));
 await context.exposeBinding('relay',async({page},data)=>{if(data.remove){peers.delete(page);return 'ok';}peers.set(page,data.topic);if(data.message){if(data.message.event==='state')lastPacket=data.message.payload;await Promise.all([...peers].filter(([p,t])=>p!==page&&t===data.topic).map(([p])=>p.evaluate(m=>window.deliver(m),data.message)));}return 'ok';});
 async function make(nick){const p=await context.newPage();await p.goto('https://together.test/');await p.evaluate(nick=>{
  window.me={nick};window.doLogin=async()=>{};window.player={track:{id:'song',kind:'link',url:'https://audio.test/one.mp3',title:'Один трек',duration:180},time:15,paused:false};window.plays=0;
  window.telechatMusicV96={getState:()=>({...player}),async playTrack(t){player.track=t;player.paused=false;plays++;},async toggle(){player.paused=!player.paused},pause(){player.paused=true},stop(){player.track=null;player.paused=true},seek(t){player.time=t}};
  window.sb={channel(topic){const listeners={};window.deliver=m=>listeners[m.event]?.({payload:m.payload});return {on(type,{event},fn){listeners[event]=fn;return this},subscribe(fn){relay({topic}).then(()=>fn('SUBSCRIBED'));return this},send(message){return relay({topic,message})}}},removeChannel(){return relay({remove:true})}};
 },nick);await p.addStyleTag({path:path.join(root,'music-together-v147.css')});await p.addScriptTag({path:path.join(root,'music-together-v147.js')});return p;}
 const host=await make('host'),guest=await make('guest');
 await host.evaluate(()=>telechatTogetherV147.create());const link=await host.evaluate(()=>telechatTogetherV147.state().link);assert(!link.includes('private'));
 await guest.evaluate(link=>telechatTogetherV147.join(link),link);await guest.waitForFunction(()=>player.track?.id.startsWith('together:')&&!player.paused);assert.equal(await guest.evaluate(()=>player.track.title),'Один трек');
 await host.evaluate(()=>{player.paused=true;dispatchEvent(new Event('telechat-music-state-v97'));});await guest.waitForFunction(()=>player.paused);
 await host.evaluate(()=>{player.paused=false;player.time=83;dispatchEvent(new Event('telechat-music-state-v97'));});await guest.waitForFunction(()=>!player.paused&&player.time>=83);
 const malicious={...lastPacket,raw:lastPacket.raw.replace('Один трек','Взломанный трек')};await guest.evaluate(payload=>deliver({event:'state',payload}),malicious);assert.equal(await guest.evaluate(()=>player.track.title),'Один трек');
 await host.evaluate(()=>{player.track={id:'local',kind:'file',title:'Local'};dispatchEvent(new Event('telechat-music-state-v97'));});await guest.waitForFunction(()=>player.paused);
 await host.evaluate(()=>{player.track={id:'song2',kind:'link',url:'https://audio.test/two.mp3',title:'Второй трек'};player.paused=false;player.time=0;dispatchEvent(new Event('telechat-music-state-v97'));});await guest.waitForFunction(()=>player.track.title==='Второй трек'&&!player.paused);
 await guest.setViewportSize({width:320,height:640});assert(await guest.locator('#together-v147').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await guest.screenshot({path:path.join(root,'outputs/together-v147-320.png')});
 await host.evaluate(()=>telechatTogetherV147.leave(true));await guest.waitForFunction(()=>telechatTogetherV147.state()===null);assert.equal(await guest.evaluate(()=>player.paused),true);
 await assert.rejects(()=>guest.evaluate(()=>telechatTogetherV147.join('https://example.com/#listen=bad')));
 await host.evaluate(()=>{player.track={kind:'file',url:'blob:private',title:'Secret'};});await assert.rejects(()=>host.evaluate(()=>telechatTogetherV147.create()));
 console.log('PASS together: signed two-client sync, pause/seek/track change, local-file gate, tamper rejection, close, invalid invite, mobile dialog');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
