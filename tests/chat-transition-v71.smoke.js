const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const style = fs.readFileSync(path.join(root, 'chat-experience-v62.css'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.match(index, /chat-experience-v62\.css\?v=71/);
assert.match(worker, /telechat-shell-v\d+-/);
assert.match(worker, /chat-experience-v62\.css\?v=71/);
assert.match(style, /#active-chat\.v62-content-enter \.chat-header,[\s\S]*animation: none;/);
assert.doesNotMatch(style, /#active-chat\.v62-content-enter \.messages \{ animation-duration/);

console.log('chat-transition-v71 smoke: ok');
