'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../desktop-app'),asar=require('../desktop-app/node_modules/.pnpm/@electron+asar@3.4.1/node_modules/@electron/asar');
const file=path.join(root,'dist/win-unpacked/resources/app.asar');
const packaged=JSON.parse(asar.extractFile(file,'package.json').toString());
const source=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(packaged.name,'telechat-desktop');assert.equal(packaged.version,source.version);assert.equal(packaged.main,'main.js');
assert.equal(source.build.appId,'chat.tele.desktop');assert.equal(source.build.productName,'ExstraChat');
const files=['main.js','preload.js','update-helper.js',...fs.readdirSync(path.join(root,'browser')).filter(f=>fs.statSync(path.join(root,'browser',f)).isFile()).map(f=>'browser/'+f)];
for(const name of files){const actual=asar.extractFile(file,name).toString().replace(/\r\n/g,'\n'),expected=fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');assert.equal(actual,expected,'Packaged source differs: '+name);}
assert(asar.extractFile(file,'assets/icon.png').equals(fs.readFileSync(path.join(root,'assets/icon.png'))));
for(const name of asar.listPackage(file))assert(!/(?:outputs|tests|security-v94|account-upgrade|\.env|shortcuts\.json)/.test(name),'Unintended file inside package: '+name);
assert(asar.extractFile(file,'main.js').toString().includes("path.join(app.getPath('appData'), 'telechat-desktop')"),'Existing profile path must remain');
console.log('PASS Windows '+source.version+' package: '+files.length+' final source files, icon, version, application identity, preserved profile path and no test/user data');
