(()=>{'use strict';
 const api=window.telechatDesktop,model=window.exstraUpdateModel;
 if(!api?.isDesktop||typeof api.getVersion!=='function'||!model)return;
 let current='',update=null,working=false,requestPending=false,checking=false,phase='',card,settings,lastCheck=0;
 const $=id=>document.getElementById(id),busy=()=>['starting','downloading','verifying','ready'].includes(phase);
 function mount(){if(card)return;card=document.createElement('aside');card.id='desktop-update-v204';card.hidden=true;card.setAttribute('aria-label','Обновление ExstraChat');card.innerHTML='<div class="du-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg></div><div class="du-content"><p class="du-kicker">EXSTRACHAT · WINDOWS</p><h3 id="du-title">Доступно обновление</h3><p id="du-copy"></p><div id="du-progress" role="progressbar" aria-label="Загрузка обновления" aria-valuemin="0" aria-valuemax="100" hidden><span></span></div><p id="du-status" role="status" aria-live="polite"></p><div class="du-actions"><button id="du-install" type="button">Обновить</button><button id="du-later" type="button">Позже</button></div></div>';document.body.append(card);$('du-install').onclick=install;$('du-later').onclick=()=>{if(busy())return;card.hidden=true;if(update)try{localStorage.setItem('exstrachat.update-later.v1',JSON.stringify({version:update.version,until:Date.now()+24*60*60*1000}));}catch{}};}
 function show(){mount();card.hidden=false;}
 function paint(){
  if(settings){settings.querySelector('small').textContent=busy()?'Обновляем…':update?'Доступна '+update.version:current?'Версия '+current:'Проверить';}
  if(!card)return;
  $('du-title').textContent=update?'Доступна версия '+update.version:'Обновление приложения';
  $('du-copy').textContent=update?'Загрузка '+Math.ceil(update.size/1024/1024)+' МБ. После проверки ExstraChat закроется, установит обновление и запустится снова.':'';
  $('du-install').disabled=working||checking||!update;$('du-install').textContent=busy()?'Обновляем…':typeof api.installUpdate!=='function'?'Скачать установщик':phase==='error'?'Повторить':'Обновить';$('du-later').disabled=busy();$('du-progress').hidden=!busy();
 }
 function status(payload){if(!payload||typeof payload!=='object')return;phase=payload.state;mount();show();paint();const text={starting:'Подготовка загрузки…',downloading:'Загружаем обновление…',verifying:'Проверяем целостность файла…',ready:'Устанавливаем. Приложение скоро перезапустится.'};$('du-status').textContent=phase==='error'?String(payload.error||'Обновить не удалось. Можно повторить.'):text[phase]||'';card.dataset.state=phase;
  const progress=Math.max(0,Math.min(100,Number(payload.progress)||0));$('du-progress').setAttribute('aria-valuenow',String(progress));$('du-progress').querySelector('span').style.width=progress+'%';if(phase==='downloading')$('du-status').textContent='Загружаем… '+progress+'%';if(phase==='error'&&!requestPending)working=false;paint();
 }
 function postponed(){try{const value=JSON.parse(localStorage.getItem('exstrachat.update-later.v1')||'null');return value?.version===update?.version&&value.until>Date.now();}catch{return false;}}
 async function check(explicit=false){
  if(checking||working)return;checking=true;if(explicit){show();$('du-status').textContent='Проверяем обновления…';}paint();
  try{
   current=String(await api.getVersion());let info;
   if(api.updaterVersion>=2&&typeof api.checkUpdate==='function'){info=await api.checkUpdate();if(!info?.ok)throw Error(info?.error||'Не удалось проверить обновления.');}
   else{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('./desktop-update.json?check='+Date.now(),{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});if(!response.ok)throw Error('Сервер обновлений пока недоступен.');const text=await response.text();if(text.length>32768)throw Error('Неверный ответ сервера обновлений.');info={update:JSON.parse(text)};}finally{clearTimeout(timer);}}
   const next=model.manifest(info.update);update=model.newer(next.version,current)?next:null;lastCheck=Date.now();
   if(update){phase='';mount();$('du-status').textContent=info.installationError||'Перед установкой заверши звонок и незавершённые загрузки.';if(explicit||!postponed())show();}
   else if(explicit){show();$('du-status').textContent='У тебя последняя версия — '+current+'.';}else if(card)card.hidden=true;
  }catch(error){if(explicit){show();$('du-status').textContent=error.name==='AbortError'?'Проверка заняла слишком много времени. Попробуй позже.':error.message||'Нет связи с сервером обновлений.';}}
  finally{checking=false;paint();}
 }
 async function install(){
  if(working||checking||!update||!model.newer(update.version,current))return;
  if(typeof api.installUpdate!=='function'){if(typeof api.openExternal==='function')api.openExternal(update.url);else window.open(update.url,'_blank','noopener,noreferrer');$('du-status').textContent='Эта старая версия требует однократной ручной установки. Дальше обновления будут внутри приложения.';return;}
  if(window.mediaRecorder?.state==='recording'||$('voice-recording')?.classList.contains('active')){$('du-status').textContent='Сначала закончи запись голосового сообщения.';return;}
  working=true;requestPending=true;status({state:'starting',progress:0});
  try{const result=await api.installUpdate({...update});if(!result?.ok)status({state:'error',error:result?.error||'Не удалось установить обновление.'});}catch{status({state:'error',error:'Нет ответа от приложения. Можно попробовать ещё раз.'});}finally{requestPending=false;if(phase==='error'){working=false;paint();}}
 }
 const nav=$('settings-home-v160');if(nav){settings=document.createElement('button');settings.type='button';settings.id='desktop-update-settings-v204';settings.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg><span><strong>Обновление приложения</strong></span><small>Проверить</small>';settings.onclick=()=>check(true);nav.append(settings);}
 if(typeof api.onUpdateStatus==='function')api.onUpdateStatus(status);
 setTimeout(()=>check(false),5000);
 const timer=setInterval(()=>{if(!document.hidden&&Date.now()-lastCheck>60*60*1000)check(false);},60*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastCheck>60*60*1000)check(false);});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 window.exstraDesktopUpdateV204=Object.freeze({check:()=>check(true)});
})();
