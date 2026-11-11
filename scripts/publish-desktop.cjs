'use strict';
// Publish only after the local package tests pass. Never overwrite a release asset.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pkg=require('../desktop-app/package.json'),repo='dark178098345-star/-telechat';
async function main(){
 const version=pkg.version,tag='v'+version,name='ExstraChat-Setup-'+version+'.exe',file=path.join(root,'desktop-app/dist',name);if(!/^\d+\.\d+\.\d+$/.test(version)||!fs.existsSync(file))throw Error('Build the installer first');
 const notesFile=path.join(root,'desktop-app/release-notes.json'),releaseNotes=fs.existsSync(notesFile)?JSON.parse(fs.readFileSync(notesFile,'utf8')):null;
 const notes=releaseNotes?.version===version&&Array.isArray(releaseNotes.notes)?releaseNotes.notes.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,240)):['Обновления прямо в приложении','Ярлыки сайтов, фоновое прослушивание и окно поверх приложений'];
 const verified=spawnSync(process.execPath,[path.join(root,'tests/desktop-package.test.cjs')],{cwd:root,encoding:'utf8',windowsHide:true});if(verified.status!==0)throw Error('Packaged source verification failed');
 const size=fs.statSync(file).size,hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);const sha256=hash.digest('hex');
 const credential=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});const token=credential.stdout?.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);if(!token)throw Error('GitHub sign-in is required to publish the release');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ExstraChat-release-publisher'};
 async function request(url,options={}){const response=await fetch(url,{...options,headers:{...headers,...options.headers}});if(response.status===404)return null;const result=await response.json();if(!response.ok)throw Error('GitHub '+response.status+': '+String(result.message||'request failed'));return result;}
 const base='https://api.github.com/repos/'+repo;let release=await request(base+'/releases/tags/'+tag);
 if(process.argv.includes('--withdraw')){if(!release)throw Error('Release not found');await request(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:true})});console.log('Withdrawn '+tag+'; no update pointer changed');return;}
 if(!release){const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).stdout.trim();release=await request(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'ExstraChat '+version,draft:true,prerelease:false,body:'Windows x64. Обновление через кнопку внутри приложения.\n\n'+notes.map(note=>'- '+note).join('\n')+'\n\nАккаунты и данные сохраняются. Установщик не подписан; Windows может запросить подтверждение.'})});}
 let asset=release.assets.find(value=>value.name===name);
 if(asset){if(asset.size!==size||asset.digest!=='sha256:'+sha256)throw Error('An asset with this name has different content; bump the version instead');}
 else{if(!release.draft)throw Error('Refusing to add an installer to an already-published release');const blob=await fs.openAsBlob(file);asset=await request('https://uploads.github.com/repos/'+repo+'/releases/'+release.id+'/assets?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(size)},body:blob});}
 if(asset.state!=='uploaded'||asset.size!==size||asset.digest!=='sha256:'+sha256)throw Error('Uploaded release asset did not match the local SHA-256 and size');
 if(release.draft)release=await request(base+'/releases/'+release.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:false,make_latest:'true'})});
 // Draft assets use an untagged URL. Obtain and validate the final published URL.
 release=await request(base+'/releases/'+release.id);asset=release.assets.find(value=>value.name===name);
 const pointer=require('../desktop-app/update-model').manifest({schema:1,version,platform:'win32',arch:'x64',url:asset.browser_download_url,sha256,size,notes});
 console.log(JSON.stringify(pointer,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
