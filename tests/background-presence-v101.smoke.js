const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),css=read('background-presence-v101.css'),js=read('background-presence-v101.js'),worker=read('sw.js');
assert.match(html,/background-presence-v101\.css\?v=101/);assert.match(html,/background-presence-v101\.js\?v=101/);
assert.match(css,/av-background-v101/);assert.match(css,/presence-moon-v101/);
assert.match(js,/visibilitychange/);assert.match(js,/__telechat_background_phone_v101__/);assert.match(js,/BACKGROUND_MS/);
assert.match(worker,/background-presence-v101\.css\?v=101/);assert.match(worker,/background-presence-v101\.js\?v=101/);
console.log('background-presence-v101 smoke ok');
