'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const privacy = read('chat-privacy-v74.js');
const privacyCss = read('chat-privacy-v74.css');
const speed = read('chat-speed-v51.js');
const flow = read('chat-flow-v64.js');
const experience = read('chat-experience-v62.js');
const notifications = read('desktop-notifications-v37.js');
const calls = read('voice-calls-v32.js');
const index = read('index.html');
const serviceWorker = read('sw.js');

assert.match(privacy, /__telechat_block_v74__:/);
assert.match(privacy, /__telechat_mute_v74__:/);
assert.match(privacy, /from\('typing'\)\.upsert/);
assert.match(privacy, /from\('typing'\)\.delete/);
assert.match(privacy, /profile-block-v74/);
assert.match(privacy, /profile-mute-v74/);
assert.match(privacy, /был давно/);
assert.match(privacy, /telechatIsBlockedV74/);
assert.match(privacy, /telechatShouldSilenceV74/);
assert.match(privacy, /telechatShouldHideMessageV74/);
assert.match(privacyCss, /v74-blocked-avatar::after/);

assert.match(speed, /visibleItems = state\.items\.filter/);
assert.match(speed, /repaintActive/);
assert.match(flow, /telechatIsBlockedV74/);
assert.match(flow, /telechatShouldSilenceV74/);
assert.match(experience, /telechatShouldHideMessageV74/);
assert.match(notifications, /telechatShouldSilenceV74/);
assert.match(calls, /telechatIsBlockedV74/);
assert.match(index, /el\.dataset\.contactNick=c\.nick/);

for (const asset of [
  'chat-privacy-v74.css?v=75',
  'chat-privacy-v74.js?v=74',
  'chat-speed-v51.js?v=74',
  'chat-flow-v64.js?v=74',
  'chat-experience-v62.js?v=74',
  'desktop-notifications-v37.js?v=74',
  'voice-calls-v32.js?v=78'
]) {
  assert(index.includes(asset), `index is missing ${asset}`);
  assert(serviceWorker.includes(asset), `service worker is missing ${asset}`);
}
assert.match(serviceWorker, /telechat-shell-v103-profile-follow-polish/);

console.log('chat privacy V74 smoke: ok');
