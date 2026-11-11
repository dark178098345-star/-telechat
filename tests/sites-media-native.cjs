'use strict';
// The Node launcher starts isolated Electron. No visible windows or user profile access.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(!process.versions.electron){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'exstra-sites-media-test-')),env={...process.env,EXSTRA_TEST_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
 const child=require('node:child_process').spawn(path.resolve(__dirname,'../desktop-app/node_modules/electron/dist/electron.exe'),[__filename],{env,windowsHide:true,stdio:'inherit'});
 const timer=setTimeout(()=>{console.error('Native media test timed out');child.kill();},25000);
 child.on('error',error=>{console.error(error);process.exitCode=1;});child.on('close',code=>{clearTimeout(timer);assert(path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep+'exstra-sites-media-test-'));fs.rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:100});process.exitCode=code===0?0:1;});return;
}
const electron=require('electron'),{app,BrowserWindow}=electron,{SitesWorkspace}=require('../desktop-app/browser/workspace');
const profile=process.env.EXSTRA_TEST_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'exstra-sites-media-test-'));app.setPath('userData',profile);
app.commandLine.appendSwitch('mute-audio');app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,message){const end=Date.now()+8000;while(Date.now()<end){if(await fn())return;await wait(80);}throw Error(message);}
const pcm=Buffer.alloc(44+8000*2*30);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(8000,24);pcm.writeUInt32LE(16000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
for(let i=44;i<pcm.length;i+=2)pcm.writeInt16LE(Math.round(Math.sin((i-44)/2*Math.PI*2*220/8000)*1000),i);
const server=http.createServer((req,res)=>{if(req.url==='/audio.wav'){res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':pcm.length});return res.end(pcm);}res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Media fixture</title><audio id="a" src="/audio.wav" loop></audio><script>window.a=document.getElementById("a");window.changes=[];function sync(){changes.push(document.visibilityState);if(document.hidden)a.pause();else a.play().catch(()=>{});}document.addEventListener("visibilitychange",sync);a.addEventListener("canplay",sync,{once:true});</script>');});
let host,workspace;
(async()=>{
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 host=new BrowserWindow({show:false,paintWhenInitiallyHidden:false,width:900,height:700,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const facade={webContents:host.webContents,contentView:host.contentView,getContentSize:()=>host.getContentSize(),isDestroyed:()=>host.isDestroyed(),isVisible:()=>false,isMinimized:()=>false,show(){},focus(){},on:(...args)=>host.on(...args),removeListener:(...args)=>host.removeListener(...args)};
 function HiddenWindow(options){const win=new BrowserWindow({...options,show:false,paintWhenInitiallyHidden:false});win.show=()=>{};win.focus=()=>{};return win;}
 workspace=new SitesWorkspace({app,BrowserWindow:HiddenWindow,WebContentsView:electron.WebContentsView,ipcMain:electron.ipcMain,session:electron.session,shell:electron.shell},()=>facade);workspace.open('http://127.0.0.1:'+server.address().port+'/');await workspace.chromeReady;
 const tab=workspace.current(),wc=tab.view.webContents,read=()=>wc.executeJavaScript('({visibility:document.visibilityState,time:a.currentTime,paused:a.paused,ready:a.readyState})');
 await until(async()=>{try{return(await read()).ready>=3;}catch{return false;}},'Fixture did not load');
 assert.equal(wc.getBackgroundThrottling(),true);assert.equal((await read()).visibility,'hidden');
 await workspace.command({action:'background'});assert.equal(wc.getBackgroundThrottling(),false);
 await until(async()=>{const s=await read();return s.visibility==='visible'&&!s.paused;},'Background mode did not keep the hidden native page visible to the site');
 let before=(await read()).time;await wait(500);assert((await read()).time>before+.2,'Hidden media clock must advance');
 const loads=wc.getURL();workspace.hide();assert.equal(workspace.mode,'hidden');before=(await read()).time;await wait(500);assert((await read()).time>before+.2,'Playback must continue after returning to chats');
 workspace.open();assert.equal(workspace.current().view.webContents,wc);assert.equal(wc.getURL(),loads);workspace.add();before=(await read()).time;await wait(500);assert((await read()).time>before+.2,'Playback must continue while another tab is selected');
 workspace.select(tab.id);await workspace.command({action:'pin'});assert.equal(workspace.mode,'window');await until(()=>workspace.window.isAlwaysOnTop(),'Native pin state did not settle');assert(!host.isAlwaysOnTop());assert.equal(workspace.current().view.webContents,wc);before=(await read()).time;await wait(500);assert((await read()).time>before+.2,'Pinning/reparenting must preserve playback');await workspace.command({action:'pin'});await until(()=>!workspace.window.isAlwaysOnTop(),'Native unpin state did not settle');await workspace.command({action:'dock'});assert.equal(workspace.mode,'embedded');assert.equal(workspace.alwaysOnTop,false);assert.equal(workspace.current().view.webContents,wc);
 await workspace.command({action:'background'});assert.equal(wc.getBackgroundThrottling(),true);await until(async()=>(await read()).visibility==='hidden'&&(await read()).paused,'Disabling background mode must restore normal visibility and site pause');
 assert(BrowserWindow.getAllWindows().every(win=>!win.isVisible()),'No native test window may become visible');
 assert.equal(host.isVisible(),false,'Tests must never show a desktop window');workspace.close();await until(()=>wc.isDestroyed(),'Closing workspace must destroy the media renderer');
 console.log('PASS real Electron 45 hidden native media: visibility-aware page, advancing audio clock while hidden/detached/from another tab, real pin/unpin/rehost without reload, toggle off restores pause, all windows remained hidden');
})().then(()=>finish(0),error=>{console.error(error);finish(1);});
async function finish(code){try{workspace?.close();if(host&&!host.isDestroyed())host.destroy();await new Promise(resolve=>server.close(resolve));}catch{}app.exit(code);}
