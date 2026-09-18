const fs=require('fs'),path=require('path'),assert=require('assert/strict');const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const index=read('index.html'),sw=read('sw.js'),logout=read('smooth-ui-v76.js'),native=read('android-app/app/src/main/java/chat/tele/app/MainActivity.java');
for(const asset of ['presence-model-v120.js?v=120','presence-v120.js?v=120','smooth-ui-v76.js?v=120','chat-speed-v51.js?v=120']){assert.ok(index.includes(asset));assert.ok(sw.includes(asset));}
assert.doesNotMatch(index,/<script[^>]+(?:device-presence-v72|background-presence-v101)\.js/,'Old competing writers are no longer loaded');
assert.match(sw,/telechat-shell-v120-stable-presence/);assert.match(logout,/telechatPresenceV120\.leave/);assert.doesNotMatch(logout,/delete\(\)\.eq\('nick',user\.nick\),/,'Logout must not erase other devices or privacy markers');
assert.match(native,/protected void onStart/);assert.match(native,/protected void onStop/);assert.match(native,/telechat-native-visibility/);assert.match(native,/isInBackground/);assert.match(native,/telechat-android\/1\.2\.4/);
console.log('PASS presence integration: single writer, versioned assets, safe per-session logout and Android lifecycle bridge.');
