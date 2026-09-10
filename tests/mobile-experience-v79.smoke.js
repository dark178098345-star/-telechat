const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const style=read('mobile-experience-v79.css');
const script=read('mobile-experience-v79.js');
const worker=read('sw.js');
const activity=read('android-app/app/src/main/java/chat/tele/app/MainActivity.java');
const gradle=read('android-app/app/build.gradle');

assert.match(html,/mobile-experience-v79\.css\?v=79/);
assert.match(html,/mobile-experience-v79\.js\?v=79/);
assert.ok(html.indexOf('mobile-experience-v79.css?v=79')>html.indexOf('chat-stability-v78.css?v=78'));
assert.ok(html.indexOf('mobile-experience-v79.js?v=79')>html.indexOf('smooth-ui-v76.js?v=76'));

assert.match(style,/telechat-mobile-v79/);
assert.match(style,/#clear-chat-btn\{display:none!important\}/);
assert.match(style,/telechat-mobile-native-v79 #install-app-section/);
assert.match(style,/backdrop-filter:none!important/);
assert.match(script,/visualViewport/);
assert.match(script,/trimDecorations/);
assert.match(script,/deviceMemory/);

assert.match(worker,/telechat-shell-v101-background/);
assert.match(worker,/mobile-experience-v79\.css\?v=79/);
assert.match(worker,/mobile-experience-v79\.js\?v=79/);
assert.match(activity,/\?app=android&v=85/);
assert.match(activity,/telechat-android\/1\.2\.2/);
assert.match(gradle,/versionCode 5/);
assert.match(gradle,/versionName '1\.2\.2'/);

console.log('mobile-experience-v79 smoke ok');
