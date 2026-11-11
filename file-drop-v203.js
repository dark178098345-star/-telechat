/* OS files only. Reuses the existing bounded upload and durable send chain. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),max=20*1048576,maxCount=10;
 let busy=false,hint=null,owner='',key='',remaining=0;
 const context=()=>{try{return{owner:String(me?.nick||''),key:String(conversationKey()||'')};}catch(_){return{owner:'',key:''};}};
 const hasFiles=transfer=>Array.from(transfer?.types||[]).includes('Files');
 function active(){
  const chat=$('active-chat'),who=context();
  return !!who.owner&&!!who.key&&$('chat-screen')?.classList.contains('active')&&chat?.style.display!=='none'
   &&!document.body.classList.contains('music-hub-open-v117')
   &&!document.querySelector('.side-panel.open,.modal-overlay.show,.message-modal-overlay-v36.show,dialog[open]');
 }
 function zone(target){const node=target?.nodeType===1?target:target?.parentElement;return !!node?.closest('#messages,#input-area')&&active();}
 function reason(){
  if(busy||window.telechatAttachmentsV141?.isUploading?.())return 'Дождись отправки текущего вложения';
  if(!window.canWriteCurrent?.())return 'В этом чате нельзя отправлять файлы';
  if(window.exstraPhotoComposeV182?.isPreparing?.()||typeof pendingMedia!=='undefined'&&pendingMedia)return 'Сначала отправь или убери подготовленное вложение';
  if(['recording','requesting'].includes($('record-btn')?.dataset.voiceState))return 'Сначала закончи запись голосового';
  return '';
 }
 function hide(){if(hint)hint.hidden=true;}
 function show(){
  if(reason()){hide();return;}
  if(hint&&!hint.hidden)return;
  if(!hint){hint=document.createElement('div');hint.id='chat-file-drop-v203';hint.hidden=true;hint.setAttribute('aria-hidden','true');hint.innerHTML='<div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V3m-4 4 4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg><strong>Отпусти — и файл отправится</strong><span>Оригинал · до 20 МБ на файл</span><small>Набранный текст останется черновиком</small></div>';document.body.append(hint);}
  const messages=$('messages'),area=$('input-area'),r=messages.getBoundingClientRect(),bottom=area?.getBoundingClientRect().bottom||r.bottom;
  hint.style.left=Math.max(0,r.left)+'px';hint.style.top=Math.max(0,r.top)+'px';hint.style.width=Math.min(innerWidth,r.right)-Math.max(0,r.left)+'px';hint.style.height=Math.max(0,Math.min(innerHeight,bottom)-Math.max(0,r.top))+'px';hint.hidden=false;
 }
 async function send(files){
  const blocked=reason();if(blocked){window.showToast?.(blocked);return;}
  if(!files.length){window.showToast?.('Перетащи обычный файл, не папку');return;}
  if(files.length>maxCount){window.showToast?.('За один раз можно перетащить до 10 файлов');return;}
  const invalid=files.find(f=>!(f instanceof File)||f.size<1||f.size>max);
  if(invalid){window.showToast?.('Каждый файл должен быть непустым и не больше 20 МБ');return;}
  if(!window.telechatAttachmentsV141?.selectFile||typeof window.sendMsg!=='function')return;
  const who=context();owner=who.owner;key=who.key;busy=true;remaining=files.length;
  try{
   for(const file of files){
    const current=context();if(current.owner!==owner||current.key!==key)break;
    // Never replace a new attachment or voice prepared during the upload.
    if(pendingMedia||window.exstraPhotoComposeV182?.isPreparing?.()||['recording','requesting'].includes($('record-btn')?.dataset.voiceState))break;
    if(!window.canWriteCurrent?.()||!window.telechatAttachmentsV141.selectFile(file,{direct:true}))break;
    const media=pendingMedia;
    await window.sendMsg();
    if(context().owner!==owner||context().key!==key)break;
    if(pendingMedia===media){window.showToast?.('Файл остался во вложениях для повтора. Остальные файлы не отправлены.');break;}
    remaining--;
   }
  }catch(_){window.showToast?.('Не удалось отправить файл. Проверь вложение перед повтором.');}
  finally{busy=false;remaining=0;owner=key='';}
 }
 document.addEventListener('dragenter',event=>{if(hasFiles(event.dataTransfer)&&zone(event.target))show();},true);
 document.addEventListener('dragover',event=>{
  if(!hasFiles(event.dataTransfer))return;
  event.preventDefault();const allowed=zone(event.target)&&!reason();event.dataTransfer.dropEffect=allowed?'copy':'none';if(allowed)show();else hide();
 },true);
 document.addEventListener('dragleave',event=>{if(!event.relatedTarget||!zone(event.relatedTarget))hide();},true);
 document.addEventListener('drop',event=>{
  if(!hasFiles(event.dataTransfer))return;
  event.preventDefault();event.stopImmediatePropagation();hide();
  if(!zone(event.target))return;
  const items=Array.from(event.dataTransfer.items||[]);
  if(items.some(item=>item.kind==='file'&&item.webkitGetAsEntry?.()?.isDirectory)){window.showToast?.('Папку сначала упакуй в архив и перетащи сам архив');return;}
  const files=Array.from(event.dataTransfer.files||[]);void send(files);
 },true);
 for(const name of ['dragend','blur','resize','pagehide'])window.addEventListener(name,hide);
 window.addEventListener('telechat-account-ready-v175',hide);
 window.exstraFileDropV203=Object.freeze({getState:()=>({busy,remaining})});
})();
