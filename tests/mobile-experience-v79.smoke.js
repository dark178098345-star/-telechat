const fs=require('fs'),path=require('path'),assert=require('assert/strict');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
assert(!fs.existsSync(path.join(root,'mobile-experience-v79.js')),'retired duplicate viewport controller stays removed');
for(const f of ['index.html','sw.js']){assert(!read(f).includes('mobile-experience-v79.js'));assert(read(f).includes('mobile-optimization-v100.js?v=136'));assert(read(f).includes('mobile-experience-v79.css'),'layout compatibility styles remain');}
const script=read('mobile-optimization-v100.js');for(const feature of ['telechat-mobile-v79','telechat-mobile-native-v79','telechat-mobile-lowpower-v79','visualViewport','viewportFrame','mediaFrame'])assert(script.includes(feature));
console.log('PASS mobile migration: one viewport owner, legacy layout compatibility, independent viewport/media queues');
