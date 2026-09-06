const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'saved-accounts-v75.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'saved-accounts-v75.css'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.match(index, /id="saved-accounts-v75"/);
assert.match(index, /id="saved-account-list-v75"/);
assert.doesNotMatch(index, /id="remember-login-v70"/);
assert.match(index, /autocomplete="username"/);
assert.match(index, /autocomplete="current-password"/);
assert.match(index, /saved-accounts-v75\.js\?v=75/);
assert.match(index, /saved-accounts-v75\.css\?v=75/);
assert.match(script, /AES-GCM/);
assert.match(script, /crypto\.subtle\.encrypt/);
assert.match(script, /crypto\.subtle\.decrypt/);
assert.doesNotMatch(script, /localStorage|sessionStorage/);
assert.match(script, /loginSucceeded/);
assert.match(script, /saved-accounts-v75/);
assert.match(script, /remember-login-v70/);
assert.match(script, /MAX_ACCOUNTS=6/);
assert.match(style, /saved-account-card-v75/);
assert.match(style, /saved-account-balance-v75/);
assert.match(worker, /telechat-shell-v\d+/);
assert.match(worker, /saved-accounts-v75\.js\?v=75/);
assert.match(worker, /saved-accounts-v75\.css\?v=75/);

console.log('saved accounts V75 smoke: ok');
