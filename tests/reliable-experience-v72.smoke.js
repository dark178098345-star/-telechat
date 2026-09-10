const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const reliability = read('chat-reliability-v24.js');
const speed = read('chat-speed-v51.js');
const calls = read('voice-calls-v32.js');
const device = read('device-presence-v72.js');
const index = read('index.html');
const serviceWorker = read('sw.js');

assert.match(reliability, /telechat-outbox-v72/);
assert.match(reliability, /Отправляется/);
assert.match(reliability, /Повторить/);
assert.match(reliability, /messageExists/);
assert.match(reliability, /lastTimestamp=Math\.max\(now,lastTimestamp\+1\)/);
assert.match(reliability, /optimisticQueue=optimisticQueue\.then/);
assert.doesNotMatch(reliability, /appendMessage\(\{\.\.\.item\.row,id:''\}\)/);
assert.doesNotMatch(reliability, /localStorage/);

assert.match(speed, /telechat-history-v72/);
assert.match(speed, /hydratePersistentV72/);
assert.match(speed, /deletePersistentV72/);
assert.match(speed, /acceptSent/);
assert.match(speed, /!item\?\.id/);

assert.match(calls, /getStats\(\)/);
assert.match(calls, /restart-request/);
assert.match(calls, /retryCount<3/);
assert.match(calls, /mic-state/);
assert.match(calls, /mutedMembers:new Set\(\)/);
assert.match(calls, /voice-call-muted-v72/);

assert.match(device, /__telechat_device_phone_v72__/);
assert.match(device, /__telechat_device_pc_v72__/);
assert.match(device, /С телефона/);
assert.match(device, /С компьютера/);

for (const asset of ['delivery-v72.css?v=72', 'device-presence-v72.js?v=72']) {
  assert(index.includes(asset), `index is missing ${asset}`);
  assert(serviceWorker.includes(asset), `service worker is missing ${asset}`);
}
for (const asset of ['chat-reliability-v24.js?v=78', 'chat-speed-v51.js?v=109', 'voice-calls-v32.js?v=78']) {
  assert(index.includes(asset), `index is missing ${asset}`);
  assert(serviceWorker.includes(asset), `service worker is missing ${asset}`);
}
assert.match(serviceWorker, /telechat-shell-v109-navigation-readers/);

console.log('V72 reliable experience smoke test passed');
