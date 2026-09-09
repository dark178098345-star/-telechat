'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const reliability=read('chat-reliability-v24.js');
const context=read('message-context-v36.js');
const calls=read('voice-calls-v32.js');
const style=read('chat-stability-v78.css');
const index=read('index.html');
const worker=read('sw.js');

assert.match(reliability,/telechatApplySidebarMessageV25\?\.\(saved\.row\|\|item\.row\)/);
assert.match(reliability,/Promise\.resolve\(renderContacts\(\)\)\.catch/);
assert.match(context,/contextOpenedAtV36/);
assert.match(context,/manualMessageScrollAtV36/);
assert.match(context,/message-call-v78/);
assert.match(context,/const remaining = new Map/);
assert.doesNotMatch(context,/const reaction = event\.target\.closest\('\[data-reaction-v36\]'\);[\s\S]{0,140}closeContextMenuV36\(\)/);
assert.match(calls,/Звонок завершён/);
assert.match(calls,/Позвонить снова/);
assert.match(calls,/>Снова</);
for(const selector of ['.contacts-list.tab-swap-v17','.message-reaction-v36','.call-history-card','.call-history-redial']){
  assert.ok(style.includes(selector),`V78 stability styles are missing ${selector}`);
}
for(const asset of [
  'chat-stability-v78.css?v=78',
  'chat-reliability-v24.js?v=78',
  'message-context-v36.js?v=78',
  'voice-calls-v32.js?v=78'
]){
  assert.ok(index.includes(asset),`index is missing ${asset}`);
  assert.ok(worker.includes(asset),`service worker is missing ${asset}`);
}
assert.match(worker,/telechat-shell-v92-profile-studio/);

console.log('chat stability V78 smoke: ok');
