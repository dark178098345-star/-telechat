const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const css=read('profile-background-v84.css');
const js=read('profile-background-v84.js');
const worker=read('sw.js');

assert.match(html,/profile-background-v84\.css\?v=86/);
assert.match(html,/profile-background-v84\.js\?v=93/);
assert.match(html,/Загрузить баннер/);
assert.match(html,/Фон карточки профиля/);
assert.match(html,/Установить фото/);
assert.match(html,/Убрать фон/);
assert.match(html,/telechatProfileAppearanceV84\.encode/);
assert.doesNotMatch(html,/profile-background-v83/);
assert.match(css,/\.profile-background-editor-v84/);
assert.match(css,/#user-profile-modal \.user-profile-card\.profile-photo-background-v84/);
assert.match(js,/__telechat_appearance_v84__/);
assert.match(js,/background:cleanBackground/);
assert.match(js,/canvas\.width=480;canvas\.height=720/);
assert.match(js,/element\.id==='view-profile-cover'/);
assert.match(js,/window\.buildProfPanel/);
assert.match(js,/window\.openUserProfile=async/);
assert.match(js,/const user=isOwn\?currentUser:cached/);
assert.match(worker,/telechat-shell-v101-background/);
assert.match(worker,/profile-background-v84\.css\?v=86/);
assert.match(worker,/profile-background-v84\.js\?v=93/);

console.log('profile background V84 smoke: ok');
