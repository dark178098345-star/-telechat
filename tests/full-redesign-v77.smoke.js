'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const style=read('full-redesign-v77.css');
const worker=read('sw.js');

assert.match(index,/full-redesign-v77\.css\?v=77/);
assert.match(index,/sidebar-brand-copy-v77/);
assert.match(index,/empty-card-v77/);
assert.match(index,/Твои разговоры рядом/);
assert.match(index,/Найти собеседника/);

for(const selector of [
  '#chat-screen.active','.auth-box','.sidebar','.contact','.chat-main','.empty-card-v77',
  '.chat-header','.messages','.msg-bubble','.input-area','.composer-shell','.send-btn',
  '#settings-panel','#profile-panel','.modal','.ctx-menu','.toast','.voice-call-overlay',
  '.voice-call-controls','.emoji-picker'
])assert.ok(style.includes(selector),`V77 redesign is missing ${selector}`);

assert.match(style,/@media\(max-width:640px\)/);
assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(style,/transition\s*:\s*all/i);
assert.match(worker,/telechat-shell-v95-appearance-mode/);
assert.match(worker,/full-redesign-v77\.css\?v=77/);

console.log('full redesign V77 smoke: ok');
