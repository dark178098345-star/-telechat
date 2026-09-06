'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const style=read('smooth-ui-v76.css');
const script=read('smooth-ui-v76.js');
const worker=read('sw.js');

assert.match(index,/smooth-ui-v76\.css\?v=76/);
assert.match(index,/smooth-ui-v76\.js\?v=76/);
assert.match(index,/id="account-session-v76"/);
assert.match(index,/openLogoutDialogV76\(\)/);
assert.match(index,/Выйти из аккаунта|Выйти/);

for(const selector of ['.sidebar','.contact','.chat-header','.msg-bubble','.composer-shell','#settings-panel','#profile-panel','.modal','.voice-call-overlay']){
  assert.ok(style.includes(selector),`smooth UI is missing ${selector}`);
}
assert.match(style,/prefers-reduced-motion/);
assert.match(style,/prefers-reduced-transparency/);
assert.doesNotMatch(style,/transition\s*:\s*all/i);

assert.match(script,/renderAccountSessionV76/);
assert.match(script,/openLogoutDialogV76/);
assert.match(script,/confirmLogoutV76/);
assert.match(script,/removeAllChannels/);
assert.match(script,/location\.reload\(\)/);
assert.doesNotMatch(script,/deleteDatabase|indexedDB\.delete|saved-accounts-v75/);

assert.match(worker,/telechat-shell-v77-full-redesign/);
assert.match(worker,/smooth-ui-v76\.css\?v=76/);
assert.match(worker,/smooth-ui-v76\.js\?v=76/);

console.log('smooth UI V76 smoke: ok');
