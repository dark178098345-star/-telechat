/* Camera/gallery preparation is owned by the account, conversation and selection.
 * A compressed Blob, not an inline photo message, is handed to private storage. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);let generation=0,job=null,preview='';
 const context=()=>{try{return [String(me?.nick||''),String(conversationKey()||'')];}catch(_){return ['',''];}};
 function busy(value){$('input-area')?.toggleAttribute('data-photo-preparing-v182',value);for(const b of document.querySelectorAll('#input-area .send-btn')){if(value){b.dataset.photoDisabledV182=String(b.disabled);b.disabled=true;}else if(b.dataset.photoDisabledV182!==undefined){b.disabled=b.dataset.photoDisabledV182==='true';delete b.dataset.photoDisabledV182;}}}
 function cancel(){generation++;job?.abort();job=null;busy(false);}
 function release(){if(preview&&pendingMedia?.data!==preview){URL.revokeObjectURL(preview);preview='';}}
 async function select(input){const file=input.files?.[0];input.value='';if(!file)return;cancel();const [owner,key]=context();if(!owner||!key||!window.canWriteCurrent?.()){window.showToast?.('Здесь нельзя отправить фотографию');return;}
  if(!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type)&&!(file.type===''&&/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name))){window.showToast?.('Выбери фото JPG, PNG, WebP, GIF, AVIF или HEIC');return;}
  if(file.size<1||file.size>32*1048576){window.showToast?.('Выбери непустое фото до 32 МБ. Оно будет сжато перед отправкой.');return;}
  if(window.telechatAttachmentsV141?.isUploading?.()){window.showToast?.('Дождись отправки или убери отправляемое вложение');return;}
  window.telechatVoiceV125?.cancel();const token=generation,base=pendingMedia,controller=new AbortController();job=controller;busy(true);window.showToast?.('Подготавливаем фотографию…');
  const current=()=>!controller.signal.aborted&&generation===token&&context()[0]===owner&&context()[1]===key&&pendingMedia===base;
  const source=URL.createObjectURL(file),image=new Image();let timeout=false;const timer=setTimeout(()=>{timeout=true;controller.abort();},20000);
  try{
   await new Promise((resolve,reject)=>{const aborted=()=>{image.src='';reject(new DOMException('Отменено','AbortError'));};controller.signal.addEventListener('abort',aborted,{once:true});image.onload=()=>{controller.signal.removeEventListener('abort',aborted);resolve();};image.onerror=()=>{controller.signal.removeEventListener('abort',aborted);reject(Error('Телефон не смог открыть фото. Попробуй JPG/PNG или отправь оригинал как файл.'));};image.src=source;});
   if(!current())return;const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height||width*height>60000000)throw Error('Разрешение фото слишком большое. Выбери снимок до 60 мегапикселей.');
   const scale=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Не удалось подготовить фото');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Отменено','AbortError'));controller.signal.addEventListener('abort',abort,{once:true});canvas.toBlob(b=>{controller.signal.removeEventListener('abort',abort);if(b)resolve(b);else reject(Error('Не удалось сжать фото'));},'image/jpeg',.84);});canvas.width=canvas.height=1;if(!current())return;if(blob.size>20*1048576)throw Error('Фото не удалось сжать до 20 МБ');
   release();if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(blob);pendingMedia={kind:'image',data:preview,duration:0,_photoBlobV182:blob};window.renderPendingMedia?.();window.showToast?.('Фотография готова к отправке');
  }catch(error){if(timeout)window.showToast?.('Подготовка фото заняла слишком много времени. Выбери его ещё раз.');else if(error.name!=='AbortError'&&current())window.showToast?.(error.message||'Не удалось подготовить фото');}
  finally{clearTimeout(timer);URL.revokeObjectURL(source);image.src='';if(job===controller){job=null;busy(false);}}
 }
 const render=window.renderPendingMedia;if(typeof render==='function')window.renderPendingMedia=function(...args){if(job&&pendingMedia!==null&&pendingMedia?._photoBlobV182===undefined)cancel();release();return render.apply(this,args);};
 const remove=window.cancelPendingMedia;if(typeof remove==='function')window.cancelPendingMedia=function(...args){cancel();const result=remove.apply(this,args);release();return result;};
 for(const name of ['openChat','openRoom','goBack']){const before=window[name];if(typeof before==='function')window[name]=function(...args){cancel();window.telechatAttachmentsV141?.cancelUpload();return before.apply(this,args);};}
 window.addEventListener('telechat-account-ready-v175',()=>{cancel();release();});window.addEventListener('pagehide',event=>{cancel();if(!event.persisted&&preview){URL.revokeObjectURL(preview);preview='';}});
 window.handleChatPhoto=select;window.exstraPhotoComposeV182=Object.freeze({select,cancel,isPreparing:()=>!!job});
})();
