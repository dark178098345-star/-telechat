const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'remember-login-v70.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'remember-login-v70.css'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.match(index, /id="remember-login-v70"/);
assert.match(index, /autocomplete="username"/);
assert.match(index, /autocomplete="current-password"/);
assert.match(index, /remember-login-v70\.js\?v=70/);
assert.match(index, /remember-login-v70\.css\?v=70/);
assert.match(script, /AES-GCM/);
assert.match(script, /crypto\.subtle\.encrypt/);
assert.match(script, /crypto\.subtle\.decrypt/);
assert.doesNotMatch(script, /localStorage|sessionStorage/);
assert.match(script, /loginSucceeded/);
assert.match(style, /remember-switch-v70/);
assert.match(worker, /telechat-shell-v70-remember-login/);
assert.match(worker, /remember-login-v70\.js\?v=70/);

console.log('remember-login-v70 smoke: ok');
