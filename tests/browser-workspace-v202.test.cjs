'use strict';
const assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {normalizeURL,safePage,safeFrame,trustedFrame,MAX_TABS}=require('../desktop-app/browser/policy');
const {SitesWorkspace}=require('../desktop-app/browser/workspace');
for(const input of ['javascript:alert(1)','file:///C:/Users/test.txt','data:text/html,hi','ftp://example.org','https://user:pass@example.org','https://good.org\n.evil.org',{},null,'x'.repeat(5000)])assert.equal(normalizeURL(input),'');
assert.equal(normalizeURL('example.org/a?q=1'),'https://example.org/a?q=1');assert.equal(normalizeURL('localhost:8080/a'),'https://localhost:8080/a');assert(safePage('https://example.org'));assert(!safePage('//example.org'));assert(safeFrame('about:blank'));assert(!safeFrame('file:///C:/test'));
class WC extends EventEmitter{
 constructor(){super();this.mainFrame={url:''};this.loads=[];this.dead=false;this.muted=false;this.navigationHistory={canGoBack:()=>false,canGoForward:()=>false};}
 setWindowOpenHandler(fn){this.popup=fn;}loadFile(file){this.mainFrame.url=require('node:url').pathToFileURL(file).href;return Promise.resolve();}loadURL(url){this.loads.push(url);this.mainFrame.url=url;return Promise.resolve();}isDestroyed(){return this.dead;}close(){this.dead=true;}send(channel,data){this.last={channel,data};}focus(){}isCurrentlyAudible(){return false;}isAudioMuted(){return this.muted;}setAudioMuted(v){this.muted=v;}stop(){}
}
const windows=[],views=[],handlers=new Map(),external=[];
class Win extends EventEmitter{
 constructor(options){super();this.options=options;this.webContents=new WC;this.contentView={children:[],addChildView:v=>this.contentView.children.push(v),removeChildView:v=>this.contentView.children=this.contentView.children.filter(x=>x!==v)};this.shown=false;this.dead=false;windows.push(this);}
 loadFile(file){this.webContents.mainFrame.url=require('node:url').pathToFileURL(file).href;}getContentSize(){return[1220,820];}isDestroyed(){return this.dead;}isMinimized(){return false;}show(){this.shown=true;}focus(){}setTitle(t){this.title=t;}close(){this.dead=true;this.emit('closed');}
}
class View{constructor(options){this.options=options;this.webContents=new WC;views.push(this);}setBackgroundColor(){}setBorderRadius(v){this.radius=v;}setVisible(v){this.visible=v;}setBounds(v){this.bounds=v;}}
const browserSession=new EventEmitter;for(const name of ['setPermissionCheckHandler','setPermissionRequestHandler','setDevicePermissionHandler','setDisplayMediaRequestHandler'])browserSession[name]=fn=>browserSession[name+'Value']=fn;
let mainHost;
const workspace=new SitesWorkspace({BrowserWindow:Win,WebContentsView:View,session:{fromPartition:p=>{assert.equal(p,'persist:exstra-sites-v202');return browserSession;}},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},shell:{openExternal:url=>external.push(url)}},()=>mainHost||(mainHost=new Win({})));
assert.equal(workspace.open('javascript:alert(1)').ok,false);assert.equal(windows.length,0);assert(workspace.open('https://example.org','window').ok);const view=workspace.tabs[0].view;assert.equal(view.webContents.loads.length,1,'One navigation per new tab');assert.equal(windows[0].shown,false,'Wait for local chrome before showing');
const win=windows[0];assert.equal(view.options.webPreferences.nodeIntegration,false);assert.equal(view.options.webPreferences.sandbox,true);assert.equal(view.options.webPreferences.contextIsolation,true);assert.equal(view.options.webPreferences.preload,undefined);assert.equal(view.options.webPreferences.webviewTag,false);assert.equal(view.radius,14);assert.equal(view.bounds.y,108);
assert.equal(browserSession.setPermissionCheckHandlerValue(),false);let granted;browserSession.setPermissionRequestHandlerValue(null,'media',v=>granted=v);assert.equal(granted,false);
const appEvent={sender:win.webContents,senderFrame:win.webContents.mainFrame};assert(trustedFrame(appEvent,win,()=>true));assert(!trustedFrame({...appEvent,sender:new WC},win,()=>true));assert(!trustedFrame({...appEvent,senderFrame:{url:workspace.chromeURL}},win,()=>true));const trusted={sender:workspace.chrome.webContents,senderFrame:workspace.chrome.webContents.mainFrame};
assert.equal(handlers.get('exstra-sites:state')({sender:view.webContents,senderFrame:view.webContents.mainFrame}),null);assert.equal(handlers.get('exstra-sites:state')(trusted).tabs.length,1);
let prevented=false;view.webContents.emit('will-navigate',{url:'file:///C:/secret',preventDefault:()=>prevented=true});assert(prevented);prevented=false;view.webContents.emit('will-frame-navigate',{url:'file:///C:/secret',preventDefault:()=>prevented=true});assert(prevented);prevented=false;view.webContents.emit('will-frame-navigate',{url:'https://example.org/second',preventDefault:()=>prevented=true});assert(!prevented,'Real Electron frame event permits ordinary links');
const count=workspace.tabs.length;assert.deepEqual(view.webContents.popup({url:'https://other.org'}),{action:'deny'});assert.equal(workspace.tabs.length,count,'Popups need an explicit trusted action');
(async()=>{
 await workspace.chromeReady;await Promise.resolve();assert(win.shown);
 await workspace.command({action:'popup'});assert.equal(workspace.tabs.length,count+1);assert.equal(view.visible,false,'Background tab is not painted');
 while(workspace.tabs.length<MAX_TABS)workspace.add();workspace.add('https://overflow.org');assert.equal(workspace.tabs.length,MAX_TABS);
 const tab=workspace.tabs[0];workspace.select(tab.id);await workspace.command({action:'mute'});assert(view.webContents.muted);await workspace.command({action:'external'});assert.deepEqual(external,['https://example.org/']);
 const same=tab.view.webContents,loads=same.loads.length;await workspace.command({action:'dock'});assert.equal(workspace.mode,'embedded');assert.equal(workspace.host,mainHost);assert(win.dead);assert.equal(tab.view.webContents,same);assert.equal(same.loads.length,loads,'Docking does not reload pages');await workspace.command({action:'home'});assert.equal(workspace.host,null);assert(!view.visible);workspace.open();assert.equal(workspace.mode,'embedded');assert.equal(tab.view.webContents,same);await workspace.command({action:'dock'});assert.equal(workspace.mode,'window');assert.equal(tab.view.webContents,same,'Undocking preserves the same page instance');
 let canceled=false;browserSession.emit('will-download',{preventDefault:()=>canceled=true});assert(canceled);
 const wc=tab.view.webContents;workspace.closeTab(tab.id);assert(wc.isDestroyed(),'Closing a tab destroys its content');workspace.close();assert(views.every(v=>v.webContents.isDestroyed()),'Closing the window frees every remaining renderer');assert.equal(workspace.tabs.length,0);
 assert.equal((await handlers.get('exstra-sites:command')({sender:view.webContents,senderFrame:view.webContents.mainFrame},{action:'new'})).ok,false);
 console.log('PASS v202 native workspace policy: URL validation, one load, separate sessions, sandbox/no preload, main-frame IPC ownership, navigation blocks, user-confirmed popups, tab cap, mute/external, denied downloads and renderer cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
