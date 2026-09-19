const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const retired=['app-performance-v15.js','device-presence-v72.js','background-presence-v101.js','voice-calls-v31.js','voice-calls-v31.css','remember-login-v70.js','remember-login-v70.css'];
const index=read('index.html'),worker=read('sw.js');
const shell=vm.runInNewContext(worker.slice(0,worker.indexOf("self.addEventListener"))+';APP_SHELL');
const pathname=url=>new URL(url,'https://telechat.test/').pathname.slice(1);
const runtimeAssets=[...index.matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g)].map(match=>match[1]).filter(url=>/\.(?:js|css)(?:\?|$)/.test(url));
assert.equal(new Set(shell.map(pathname)).size,shell.length,'Precache must contain only one version of each path');
for(const asset of runtimeAssets){
  assert.ok(shell.includes(asset),'Active asset must be cached with the same version: '+asset);
  assert.ok(fs.existsSync(path.join(root,pathname(asset))),'Active asset must exist: '+asset);
}
for(const asset of shell)assert.ok(!pathname(asset)||fs.existsSync(path.join(root,pathname(asset))),'Missing cached file: '+asset);
for(const file of retired){
  assert.ok(!fs.existsSync(path.join(root,file)),'Retired file returned: '+file);
  for(const [source,text] of [['index.html',index],['sw.js',worker],...runtimeAssets.map(asset=>[asset,read(pathname(asset))])]){
    assert.ok(!text.includes(file),`${source} must not depend on retired ${file}`);
  }
}
// Compatibility data is still needed by installed/older clients. It is not dead code.
const accounts=read('saved-accounts-v75.js'),presence=read('presence-model-v120.js');
for(const key of ['telechat-device-v70','remember-key-v70','remember-login-v70'])assert.ok(accounts.includes(key),'Keep saved-account compatibility: '+key);
for(const key of ['__telechat_device_phone_v72__','__telechat_device_pc_v72__','__telechat_background_phone_v101__','__telechat_background_pc_v101__'])assert.ok(presence.includes(key),'Keep legacy presence compatibility: '+key);
console.log(`PASS cleanup: ${retired.length} retired assets, ${runtimeAssets.length} active JS/CSS assets, no duplicate precache paths or broken dependencies; legacy account/presence data supported.`);
