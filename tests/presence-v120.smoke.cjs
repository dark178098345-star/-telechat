const fs=require('fs'),path=require('path'),assert=require('assert/strict');const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const index=read('index.html'),sw=read('sw.js'),logout=read('smooth-ui-v76.js'),native=read('android-app/app/src/main/java/chat/tele/app/MainActivity.java');
for(const file of ['presence-model-v120.js','presence-v120.js','listening-v145.css','smooth-ui-v76.js','chat-speed-v51.js','game-status-v151.js','game-status-catalog-v151.js','game-status-v151.css']){const asset=index.match(new RegExp(file.replace(/\./g,'\\.')+'\\?v=\\d+'))?.[0];assert.ok(asset,file+' must have a versioned entry');assert.ok(sw.includes(asset),asset+' must match the offline shell');}
assert.doesNotMatch(index,/<script[^>]+(?:device-presence-v72|background-presence-v101)\.js/,'Old competing writers are no longer loaded');
assert.match(sw,/telechat-shell-v\d+/);assert.match(logout,/telechatPresenceV120\.leave/);assert.doesNotMatch(logout,/delete\(\)\.eq\('nick',user\.nick\),/,'Logout must not erase other devices or privacy markers');
for(const asset of ['background-presence-v101.css?v=101','device-presence-v72.css?v=72']){assert.ok(index.includes(asset));assert.ok(sw.includes(asset));}
assert.match(read('background-presence-v101.css'),/av-background-v101/);assert.match(read('background-presence-v101.css'),/presence-moon-v101/);
assert.match(native,/protected void onStart/);assert.match(native,/protected void onStop/);assert.match(native,/telechat-native-visibility/);assert.match(native,/isInBackground/);assert.match(native,/telechat-android\/\d+\.\d+\.\d+/);
console.log('PASS presence integration: single writer, versioned assets, safe per-session logout and Android lifecycle bridge.');
