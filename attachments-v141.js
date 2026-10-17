/* Attachments reuse the existing composer, durable sender and context menu. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const max=20*1024*1024;let uploading=false,readOwner='',cacheBytes=0;
 const readCache=new Map(),readFlights=new Map(),cacheLimit=32*1024*1024;
 const unpackBefore=unpackMedia,renderBefore=renderMessageContent,previewBefore=messagePreviewText,pendingBefore=renderPendingMedia,sendBefore=sendMsg;
 const descriptor=raw=>{try{const d=JSON.parse(raw);return d&&/^[0-9a-f-]{36}$/i.test(d.id)&&typeof d.name==='string'&&d.name.length<=180&&Number.isFinite(d.size)&&d.size>0&&d.size<=max?d:null;}catch(_){return null;}};
 unpackMedia=function(text){const old=unpackBefore(text);if(old)return old;try{if(!String(text).startsWith(MEDIA_PREFIX))return null;const m=JSON.parse(text.slice(MEDIA_PREFIX.length));return m.kind==='file'&&descriptor(m.data)?m:null;}catch(_){return null;}};
 const photo=d=>d?.view==='image'&&/^image\/(jpeg|png|webp)$/.test(d.mime||'');
 messagePreviewText=function(text){const m=unpackMedia(text);if(m?.kind==='file'){const d=descriptor(m.data);return (photo(d)?'Фотография':'Файл: '+d.name)+(m.caption?' · '+m.caption:'');}return previewBefore(text);};
 const size=n=>n>=1048576?(n/1048576).toFixed(1)+' МБ':Math.max(1,Math.ceil(n/1024))+' КБ';
 renderMessageContent=function(text){const m=unpackMedia(text);if(m?.kind!=='file')return renderBefore(text);const d=descriptor(m.data);return '<button type="button" class="attachment-file-v141" data-file-v141="'+esc(d.id)+'" data-attachment-v179="'+esc(JSON.stringify(d))+'" aria-label="Сохранить файл '+esc(d.name)+'">'+icon('file')+'<span><strong>'+esc(d.name)+'</strong><small>'+size(d.size)+' · Скачать</small></span>'+icon('download')+'</button>'+(m.caption?'<div class="media-caption">'+esc(m.caption)+'</div>':'');};
 async function api(action,data,signal){const owner=me?.nick;if(!owner)throw Error('Сначала войди в аккаунт');const pass=me.pass||($('l-login')?.value.trim().toLowerCase()===owner?$('l-pass')?.value:'');let q=sb.rpc('telechat_files_v141',{p_nick:owner,p_pass:pass||'',p_action:action,p_data:data});if(signal&&q.abortSignal)q=q.abortSignal(signal);const r=await q;if(r.error)throw r.error;if(me?.nick!==owner)throw Error('Аккаунт изменился');return r.data;}
 async function downloadFetch(ticket,signal,input,init){
  const response=await fetch(input,{...init,signal,cache:'no-store'});if(!response.ok)return response;
  const length=Number(response.headers.get('content-length')),encoding=response.headers.get('content-encoding');
  if((!encoding||encoding==='identity')&&length>ticket.size){await response.body?.cancel();throw Error('Размер загрузки превышает размер вложения');}
  if(response.body&&typeof TransformStream==='function'){
   let total=0;const stream=new TransformStream({transform(chunk,controller){total+=chunk.byteLength;if(total>ticket.size)throw Error('Размер загрузки превышает размер вложения');controller.enqueue(chunk);}});
   return new Response(response.body.pipeThrough(stream),{status:response.status,statusText:response.statusText,headers:response.headers});
  }
  return response;
 }
 const storage=(ticket,signal)=>window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{'x-telechat-file-token':ticket.token},...(signal?{fetch:(input,init)=>downloadFetch(ticket,signal,input,init)}:{})},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).storage.from('chat-files');
 function syncReadOwner(){const owner=me?.nick||'';if(owner!==readOwner){for(const job of readFlights.values())job.controller.abort();readFlights.clear();readCache.clear();cacheBytes=0;readOwner=owner;}return owner;}
 function rememberFile(id,value,owner){if(syncReadOwner()!==owner)return;const old=readCache.get(id);if(old){cacheBytes-=old.blob.size;readCache.delete(id);}while(readCache.size&&(cacheBytes+value.blob.size>cacheLimit||readCache.size>=24)){const [key,item]=readCache.entries().next().value;readCache.delete(key);cacheBytes-=item.blob.size;}if(value.blob.size<=cacheLimit){readCache.set(id,value);cacheBytes+=value.blob.size;}}
 function cachedFile(id){syncReadOwner();const item=readCache.get(id);if(item){readCache.delete(id);readCache.set(id,item);}return item||null;}
 async function loadFile(raw,{automatic=false}={}){const d=typeof raw==='string'?descriptor(raw):descriptor(JSON.stringify(raw)),owner=syncReadOwner();if(!d||!owner)throw Error('Не удалось прочитать вложение');const cached=cachedFile(d.id);if(cached)return cached;const existing=readFlights.get(d.id);if(existing&&!existing.controller.signal.aborted){if(!automatic)existing.automatic=false;return existing.promise;}
  if(navigator.onLine===false)throw Error('Нет соединения с интернетом');const controller=new AbortController(),job={controller,automatic,promise:null,timedOut:false};
  job.promise=(async()=>{const timer=setTimeout(()=>{job.timedOut=true;controller.abort();},30000);
   try{
    const ticket=await api('read',{id:d.id},controller.signal);
    if(!ticket||ticket.id!==d.id||!Number.isFinite(ticket.size)||ticket.size<1||ticket.size>max||ticket.size!==d.size)throw Error('Размер вложения изменился');
    if(job.automatic&&ticket.mime!==d.mime)throw Error('Тип вложения изменился');
    if(controller.signal.aborted)throw new DOMException('Отменено','AbortError');
    const result=await storage(ticket,controller.signal).download(d.id+'/file');
    if(controller.signal.aborted||syncReadOwner()!==owner)throw new DOMException('Отменено','AbortError');if(result.error)throw result.error;
    if(!(result.data instanceof Blob)||result.data.size!==ticket.size)throw Error('Файл загрузился не полностью');
    const value={blob:result.data,name:ticket.name,mime:ticket.mime,size:ticket.size};rememberFile(d.id,value,owner);return value;
   }catch(error){if(job.timedOut)throw Error('Загрузка заняла слишком много времени. Повтори попытку.');if(controller.signal.aborted)throw new DOMException('Отменено','AbortError');throw error;}
   finally{clearTimeout(timer);if(readFlights.get(d.id)===job)readFlights.delete(d.id);}
  })();readFlights.set(d.id,job);return job.promise;
 }
 function abortAutomaticReads(){for(const job of readFlights.values())if(job.automatic)job.controller.abort();}
 window.addEventListener('telechat-account-ready-v175',syncReadOwner);
 function errorToast(error){showToast(/PGRST202|function.*does not exist/i.test((error?.code||'')+' '+(error?.message||''))?'Хранилище файлов ещё не подключено':error?.message||'Не удалось загрузить файл');}
 function selected(file){if(!file||uploading)return;if(!conversationKey()||!canWriteCurrent()){showToast('Здесь нельзя отправлять файлы');return;}if(file.size<=0||file.size>max){showToast('Выбери непустой файл до 20 МБ');return;}
  window.telechatVoiceV125?.cancel();pendingMedia={kind:'file',data:'',duration:0,_fileV141:file};renderPendingMedia();
 }
 renderPendingMedia=function(){if(pendingMedia?.kind!=='file'){const result=pendingBefore();if(uploading&&pendingMedia?.kind==='image'){const label=$('pending-media')?.querySelector('.pending-label');if(label)label.textContent='Загружаем фотографию…';}return result;}const file=pendingMedia._fileV141||descriptor(pendingMedia.data);if(!file)return;const box=$('pending-media');box.classList.add('show');box.innerHTML=icon('file')+'<div class="pending-label">'+esc(file.name)+'<small>'+size(file.size)+(uploading?' · Загружаем…':' · Готов к отправке')+'</small></div><button type="button" class="pending-remove" aria-label="Убрать файл">×</button>';box.querySelector('button').onclick=()=>cancelPendingMedia();};
 sendMsg=async function(...args){if(uploading)return;const isPhoto=pendingMedia?.kind==='image'&&/^data:image\/(jpeg|png|webp);base64,/i.test(pendingMedia.data||'');if(!pendingMedia?._fileV141&&!isPhoto)return sendBefore.apply(this,args);const media=pendingMedia,key=conversationKey(),owner=me?.nick;if(!key||!canWriteCurrent())return;uploading=true;renderPendingMedia();let file=media._fileV141,ticket=null,client=null,uploaded=false,handedOff=false;
  try{if(isPhoto){const blob=await (await fetch(media.data)).blob(),ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[blob.type];if(!ext||blob.size<1||blob.size>max)throw Error('Не удалось подготовить фотографию до 20 МБ');file=new File([blob],'photo-'+Date.now()+'.'+ext,{type:blob.type});}if(pendingMedia!==media||conversationKey()!==key||me?.nick!==owner)throw Error('Загрузка отменена: чат или вложение изменились');ticket=await api('reserve',{chat_key:key,name:file.name.slice(0,180),size:file.size,mime:file.type||'application/octet-stream'});client=storage(ticket);const result=await client.upload(ticket.id+'/file',file,{contentType:'application/octet-stream',upsert:false});if(result.error)throw result.error;uploaded=true;
   if(pendingMedia!==media||conversationKey()!==key||me?.nick!==owner)throw Error('Загрузка отменена: чат или вложение изменились');
   rememberFile(ticket.id,{blob:file,name:ticket.name,mime:ticket.mime,size:ticket.size},owner);media.kind='file';media.data=JSON.stringify({id:ticket.id,name:ticket.name,size:ticket.size,mime:ticket.mime,...(isPhoto?{view:'image'}:{})});delete media._fileV141;handedOff=true;await sendBefore.apply(this,args);
  }catch(error){errorToast(error);}finally{if(ticket&&!handedOff&&me?.nick===owner){try{if(uploaded){const removed=await client.remove([ticket.id+'/file']);if(removed.error)throw removed.error;}await api('cancel',{id:ticket.id});}catch(_){/* Never risk deleting an accepted attachment. */}}uploading=false;if(pendingMedia===media)renderPendingMedia();}
 };
 async function saveBlob(blob,name){
  const filename=String(name||'telechat-file').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,180);
  if(window.TelechatAndroid?.isApp?.()&&navigator.canShare?.({files:[new File([blob],filename,{type:blob.type})]})){await navigator.share({files:[new File([blob],filename,{type:blob.type})]});return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 const downloads=new Set();
 async function download(raw){const d=typeof raw==='string'?descriptor(raw):raw;if(!d||downloads.has(d.id))return;downloads.add(d.id);try{const value=await loadFile(d);await saveBlob(value.blob,value.name);}catch(e){if(e.name!=='AbortError')errorToast(e);}finally{downloads.delete(d.id);}}
 async function saveMessage(message){const m=unpackMedia(message?.text);if(!m)return;if(m.kind==='file')return download(descriptor(m.data));if(!['image','voice'].includes(m.kind))return;try{const response=await fetch(m.data),blob=await response.blob();const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','audio/wav':'wav'})[blob.type.split(';')[0]]||'webm';await saveBlob(blob,'telechat-'+(message.id||Date.now())+'.'+ext);}catch(e){if(e.name!=='AbortError')errorToast(e);}}
 $('messages')?.addEventListener('click',event=>{const button=event.target.closest('[data-file-v141]');if(button){event.preventDefault();download(descriptor(button.dataset.attachmentV179||''));}});
 const tools=document.querySelector('.composer-tools');if(!tools)return;
 const oldPhoto=tools.querySelector('[onclick*="chat-photo-input"]'),poll=tools.querySelector('[onclick*="openPollModal"]');oldPhoto?.remove();poll?.remove();
 const trigger=document.createElement('button');trigger.type='button';trigger.id='attach-button-v141';trigger.className='composer-tool';trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 12V6a4 4 0 0 1 8 0v11a6 6 0 0 1-12 0V7m8-1v11a2 2 0 0 1-4 0v-5"/></svg>';trigger.setAttribute('aria-label','Прикрепить');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','attachment-menu-v141');tools.prepend(trigger);
 const menu=document.createElement('div');menu.id='attachment-menu-v141';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Вложения');menu.innerHTML=[['photo','image','Фото'],['video','video','Видео как файл'],['file','file','Файл до 20 МБ'],['poll','chart','Опрос']].map(([action,symbol,label])=>'<button type="button" data-attach="'+action+'">'+icon(symbol)+'<span>'+label+'</span></button>').join('');document.body.append(menu);
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.hidden=true;fileInput.id='attachment-input-v141';document.body.append(fileInput);fileInput.onchange=()=>{const file=fileInput.files?.[0];fileInput.value='';selected(file);};
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
 function position(){const r=trigger.getBoundingClientRect(),v=window.visualViewport,h=v?.height||innerHeight,top=v?.offsetTop||0;menu.style.left=Math.max(8,Math.min(r.left,innerWidth-240))+'px';menu.style.top=Math.max(top+8,Math.min(r.top-menu.offsetHeight-8,top+h-menu.offsetHeight-8))+'px';}
 trigger.onclick=()=>{if(!menu.hidden){close();return;}menu.hidden=false;trigger.setAttribute('aria-expanded','true');position();menu.querySelector('button').focus();};
 menu.onclick=event=>{const action=event.target.closest('[data-attach]')?.dataset.attach;if(!action)return;close();if(action==='photo')$('chat-photo-input').click();else if(action==='poll')openPollModal();else{fileInput.accept=action==='video'?'video/*':'';fileInput.click();}};
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();close(true);}});addEventListener('resize',()=>close());window.visualViewport?.addEventListener('resize',()=>close());
 const record=$('record-btn');record?.classList.add('voice-button-v141');if(record){if(!record.querySelector('svg'))record.innerHTML=icon('mic');tools.append(record);}
 window.telechatAttachmentsV141={saveMessage,canSave:message=>!!unpackMedia(message?.text),selectFile:selected,loadFile,cachedFile,abortAutomaticReads,descriptor,isPhoto:photo};
})();
