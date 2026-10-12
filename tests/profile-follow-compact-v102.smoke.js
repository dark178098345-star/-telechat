const fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),html=read('index.html'),worker=read('sw.js'),script=read('profile-follow-compact-v102.js'),style=read('profile-card-v143.css');
assert.match(html,/profile-follow-compact-v102\.js\?v=167/);assert.match(worker,/profile-follow-compact-v102\.js\?v=167/);
assert.match(style,/profile-follow-compact-v102/);assert.match(script,/follow-stats/);assert.match(script,/follow-btn/);assert(!script.includes('new MutationObserver'));
for(const file of ['profile-follow-compact-v102.css','profile-follow-compact-v103.css','profile-quick-v91.css']){assert(!html.includes(file));assert(!worker.includes(file));}
console.log('PASS profile follow: single v167 stylesheet, preserved controls, no global mutation observer');
