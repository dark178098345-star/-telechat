const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const css=read('profile-background-v83.css');
const js=read('profile-background-v83.js');
const worker=read('sw.js');

assert.match(html,/profile-background-v83\.css\?v=83/);
assert.match(html,/profile-background-v83\.js\?v=83/);
assert.ok(html.indexOf('profile-background-v83.css?v=83')>html.indexOf('emoji-motion-v80.css?v=82'));
assert.ok(html.indexOf('profile-background-v83.js?v=83')>html.indexOf('emoji-motion-v80.js?v=82'));
assert.match(html,/Фото на фон/);
assert.match(html,/обложкой и мягким фоном всей карточки/);
assert.match(css,/\.user-profile-card\.profile-photo-background-v83/);
assert.match(css,/--profile-card-photo-v83/);
assert.match(css,/linear-gradient\(180deg/);
assert.match(css,/@media\(max-width:720px\)/);
assert.match(js,/PHOTO_PREFIX='photo:'/);
assert.match(js,/element\.id==='view-profile-cover'/);
assert.match(js,/data:image\//);
assert.match(js,/window\.applyProfileBanner/);
assert.match(worker,/telechat-shell-v83-profile-background/);
assert.match(worker,/profile-background-v83\.css\?v=83/);
assert.match(worker,/profile-background-v83\.js\?v=83/);

console.log('profile background V83 smoke: ok');
