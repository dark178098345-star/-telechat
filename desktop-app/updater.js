'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const model=require('./update-model');
const MANIFEST_URL='https://dark178098345-star.github.io/-telechat/desktop-update.json';
const DOWNLOAD_HOSTS=new Set(['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function friendly(error){if(error.code==='ENOSPC')return 'Недостаточно места на диске. Освободи место и повтори.';if(['EACCES','EPERM'].includes(error.code))return 'Нет доступа к папке обновлений. Приложение оставлено открытым.';return /^[А-ЯЁ]/.test(error.message||'')?error.message:'Не удалось получить обновление. Проверь соединение и попробуй ещё раз.';}
class DesktopUpdater{
 constructor({app,net,quit,spawnProcess=spawn,helperTimeout=20000}){this.app=app;this.fetch=net.fetch.bind(net);this.quit=quit;this.spawn=spawnProcess;this.helperTimeout=helperTimeout;this.busy=false;this.cached=null;this.checkedAt=0;this.checking=null;this.result=null;}
 get directory(){return path.join(this.app.getPath('userData'),'updates');}
 async check(force=false){
  if(!this.checking&&(force||!this.cached||Date.now()-this.checkedAt>5*60*1000)){
   this.checking=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{
    const response=await this.fetch(MANIFEST_URL+'?check='+Date.now(),{cache:'no-store',redirect:'error',credentials:'omit',signal:controller.signal});
    if(!response.ok||!response.body)throw Error('Не удалось проверить обновления. Проверь соединение.');
    const reader=response.body.getReader(),chunks=[];let length=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>32768)throw Error('Слишком большой ответ сервера обновлений.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
    this.cached=model.manifest(JSON.parse(Buffer.concat(chunks).toString('utf8')));this.checkedAt=Date.now();
   }catch(error){if(error.name==='AbortError')throw Error('Сервер обновлений не ответил вовремя. Попробуй ещё раз.');throw error;}finally{clearTimeout(timer);}})().finally(()=>{this.checking=null;});
  }
  if(this.checking)await this.checking;
  if(this.result===null){try{const file=path.join(this.directory,'last-result.json'),stat=await fs.stat(file);if(stat.size<16384){const result=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));this.result=result.ok===false?'Предыдущая установка не завершилась. Приложение не удаляло твои данные. Попробуй обновить ещё раз.':'';}else this.result='';}catch{this.result='';}}
  return {ok:true,current:this.app.getVersion(),available:model.newer(this.cached.version,this.app.getVersion()),update:{...this.cached,notes:[...this.cached.notes]},installationError:this.result||''};
 }
 async response(url,signal){
  for(let redirects=0;redirects<6;redirects++){
   const parsed=new URL(url);if(parsed.protocol!=='https:'||!DOWNLOAD_HOSTS.has(parsed.hostname)||parsed.username||parsed.password)throw Error('Недопустимый сервер загрузки.');
   const response=await this.fetch(url,{cache:'no-store',redirect:'manual',credentials:'omit',signal});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('Некорректный переход при загрузке.');url=new URL(location,url).href;continue;}
   if(!response.ok||!response.body)throw Error('Не удалось скачать обновление. Попробуй ещё раз.');return response;
  }throw Error('Слишком много переходов при загрузке.');
 }
 async download(update,report){
  await fs.mkdir(this.directory,{recursive:true});const job=await fs.mkdtemp(path.join(this.directory,'job-')),part=path.join(job,'installer.part'),installer=path.join(job,'ExstraChat-Setup-'+update.version+'.exe');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15*60*1000);let file,reader,idle;
  try{
   const response=await this.response(update.url,controller.signal);reader=response.body.getReader();file=await fs.open(part,'wx');const hash=crypto.createHash('sha256');let received=0,last=0;
   while(true){idle=setTimeout(()=>controller.abort(),45000);let item;try{item=await reader.read();}finally{clearTimeout(idle);}if(item.done)break;const chunk=Buffer.from(item.value);received+=chunk.length;if(received>update.size)throw Error('Размер обновления не совпадает с ожидаемым.');hash.update(chunk);await file.writeFile(chunk);if(Date.now()-last>200){last=Date.now();report({state:'downloading',progress:Math.min(98,Math.floor(received/update.size*100)),received,total:update.size});}}
   await file.sync();await file.close();file=null;report({state:'verifying',progress:99});
   if(received!==update.size||hash.digest('hex')!==update.sha256)throw Error('Проверка файла не пройдена. Установка не запускалась.');
   const header=await fs.open(part,'r');try{const magic=Buffer.alloc(2);await header.read(magic,0,2,0);if(magic.toString()!=='MZ')throw Error('Получен неверный установщик.');}finally{await header.close();}
   await fs.rename(part,installer);return {job,installer};
  }catch(error){if(file)await file.close().catch(()=>{});await fs.rm(job,{recursive:true,force:true}).catch(()=>{});if(error.name==='AbortError')throw Error('Загрузка прервалась или соединение зависло. Можно повторить.');throw error;
  }finally{clearTimeout(timer);clearTimeout(idle);if(reader)await reader.cancel().catch(()=>{});}
 }
 async launch(update,{job,installer},report=()=>{}){
  const script=await fs.readFile(path.join(__dirname,'update-helper.ps1'),'utf8'),encoded=Buffer.from(script,'utf16le').toString('base64');
  const config={installer,exe:process.execPath,parent:process.pid,sha256:update.sha256,size:update.size,version:update.version,job,result:path.join(this.directory,'last-result.json')};
  const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const child=this.spawn(executable,['-NoProfile','-NonInteractive','-EncodedCommand',encoded],{detached:true,windowsHide:true,stdio:'ignore',env:{...process.env,EXSTRACHAT_UPDATE_JOB:JSON.stringify(config)}});
  let failure,approved=false;child.once('error',()=>failure=Error('Не удалось запустить помощник установки. Приложение оставлено открытым.'));child.once('exit',code=>{failure=Error('Помощник обновления завершился до начала установки.');if(approved&&code!==0){this.busy=false;report({state:'error',error:'Установка не началась: приложение не закрылось или помощник был остановлен. Можно повторить.'});}});
  const deadline=Date.now()+this.helperTimeout;while(Date.now()<deadline){if(failure)throw failure;try{await fs.access(path.join(job,'ready'));await fs.writeFile(path.join(job,'approved'),'yes',{flag:'wx'});approved=true;child.unref();return;}catch(error){if(error.code!=='ENOENT')throw error;}await delay(60);}
  throw Error('Не удалось подготовить установку. Приложение оставлено открытым.');
 }
 async install(payload,report=()=>{}){
  if(!this.app.isPackaged)return {ok:false,error:'Установка доступна в установленном Windows-приложении.'};
  if(process.env.PORTABLE_EXECUTABLE_DIR)return {ok:false,error:'Для portable-версии установи обычную версию один раз. После этого обновления будут внутри приложения.'};
  if(this.busy)return {ok:false,error:'Обновление уже загружается.'};this.busy=true;let downloaded;
  try{report({state:'starting',progress:0});const info=await this.check(true),update=info.update;if(!info.available)throw Error('Уже установлена последняя версия.');if(payload?.version&&payload.version!==update.version)throw Error('Вышла другая версия. Проверь обновления ещё раз.');
   downloaded=await this.download(update,report);await this.launch(update,downloaded,report);report({state:'ready',progress:100});this.quit();return {ok:true};
  }catch(error){this.busy=false;if(downloaded){try{await fs.access(path.join(downloaded.job,'approved'));}catch{await fs.rm(downloaded.job,{recursive:true,force:true}).catch(()=>{});}}const message=friendly(error);report({state:'error',error:message});return {ok:false,error:message};}
 }
}
module.exports={DesktopUpdater,MANIFEST_URL};
