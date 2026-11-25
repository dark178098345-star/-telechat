/* Visible-only media preparation. No avatar/music changes, polling, or file-system auto-save. */
(()=>{'use strict';
 const model=window.exstraMediaPolicyV179;if(!model)return;
 const $=id=>document.getElementById(id),self=()=>typeof me!=='undefined'?String(me?.nick||''):'',files=()=>window.telechatAttachmentsV141;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=name=>window.telechatIconsV125?.html(name)||'',bytes=n=>n>=1048576?(n/1048576).toFixed(1)+' МБ':Math.max(1,Math.ceil(n/1024))+' КБ';
 const key=nick=>'exstrachat.media.v179.'+nick,targets=new Set(),visible=new Set(),jobs=new WeakSet(),attempted=new WeakMap(),urls=new Map();
 let owner='',prefs=model.defaults(),section,scanTimer=0,pumping=false,pumpAgain=false,revision=0,fullScan=false;
 const addedRoots=new Set(),removedRoots=new Set();
 const loadedPhotos=new Set(),parked=new Map(),leased=new Set(),decoding=new WeakMap();
 let wasInline=new WeakSet(),restoredPhotos=new WeakSet();
 const photoIdleMs=9000,viewer=$('media-viewer');
 let parkTimer=0,parkedBytes=0;
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const net=()=>model.network(prefs,connection,navigator.onLine!==false);
 function loadPrefs(){const nick=self();if(owner===nick)return;owner=nick;try{prefs=model.clean(JSON.parse(localStorage.getItem(key(owner))||'null'));}catch(_){prefs=model.defaults();}if(!owner)prefs=model.defaults();revision++;for(const node of [...new Set([...loadedPhotos,...urls.keys()])])releasePhoto(node);wasInline=new WeakSet();restoredPhotos=new WeakSet();files()?.abortAutomaticReads();paintSettings();}
 function savePrefs(next){loadPrefs();if(!owner)return;const value=model.clean(next);try{localStorage.setItem(key(owner),JSON.stringify(value));}catch(_){window.showToast?.('Не удалось сохранить настройки на устройстве');paintSettings();return;}prefs=value;revision++;files()?.abortAutomaticReads();paintSettings();pump();}
 function current(){loadPrefs();return net();}
 function allowed(kind,size){return !!self()&&model.allows(prefs,current(),kind,size);}
 function paintSettings(){if(!section)return;const n=net();$('media-network-v179').textContent=n.label+(n.saving?' · системная экономия трафика':'');$('media-mode-v179').value=prefs.mode;$('media-respect-v179').checked=prefs.respectSaver;for(const name of ['wifi','mobile']){for(const kind of ['image','video','file'])$(`media-${name}-${kind}-v179`).checked=prefs[name][kind];$(`media-${name}-size-v179`).value=prefs[name].maxMB;}}
 function describe(node){try{const file=files()?.descriptor?.(node.dataset.attachmentV179||'');if(file)return {kind:model.kind(file),size:file.size,file};const inline=node.dataset.inlineV179;if(/^data:image\/(jpeg|png|webp);base64,/i.test(inline||''))return {kind:'image',size:Math.max(1,Math.floor((inline.length-inline.indexOf(',')-1)*.75)),inline};}catch(_){}return null;}
 function unpark(node){
  const entry=parked.get(node);if(!entry)return;
  parkedBytes-=entry.bytes;parked.delete(node);
 }
 function releasePhoto(node){
  unpark(node);leased.delete(node);loadedPhotos.delete(node);
  decoding.get(node)?.();
  const image=node.querySelector('img'),button=node.querySelector('button'),ready=node.dataset.mediaReadyV179==='1';
  if(image){image.hidden=true;image.onclick=null;image.removeAttribute('src');image.loading='lazy';}
  if(urls.has(node)){URL.revokeObjectURL(urls.get(node));urls.delete(node);}
  if(ready){
   delete node.dataset.mediaReadyV179;attempted.delete(node);restoredPhotos.add(node);
   if(button){button.hidden=false;button.querySelector('small').textContent='Нажми, чтобы загрузить';}
  }
 }
 function photoInViewer(node){return viewer?.classList.contains('show')&&$('media-viewer-image')?.getAttribute('src')===node.querySelector('img')?.getAttribute('src');}
 function retireParked(node){
  unpark(node);
  if(!node.isConnected||visible.has(node))return;
  if(photoInViewer(node))leased.add(node);else releasePhoto(node);
 }
 function planParking(){
  if(parkTimer||!parked.size)return;
  const due=parked.values().next().value.deadline;
  parkTimer=setTimeout(()=>{
   parkTimer=0;const now=performance.now();
   for(const [node,entry] of parked){if(entry.deadline>now)break;retireParked(node);}
   planParking();
  },Math.max(1,Math.ceil(due-performance.now())));
 }
 function parkPhoto(node){
  if(!loadedPhotos.has(node)||!node.closest('#messages')||visible.has(node)||parked.has(node)||leased.has(node))return;
  // Estimate RGBA decode size for the warm offscreen window; visible pictures are never evicted.
  const limited=document.body.classList.contains('telechat-phone-v159')||(Number(navigator.deviceMemory)||8)<=4;
  const image=node.querySelector('img'),size=(image?.naturalWidth||0)*(image?.naturalHeight||0)*4;
  parked.set(node,{deadline:performance.now()+photoIdleMs,bytes:size});parkedBytes+=size;
  while(parked.size>(limited?5:10)||parkedBytes>(limited?16:32)*1048576)retireParked(parked.keys().next().value);
  planParking();
 }
 if(viewer)new MutationObserver(()=>{
  if(viewer.classList.contains('show'))return;
  for(const node of leased){leased.delete(node);if(node.isConnected&&!visible.has(node))releasePhoto(node);}
 }).observe(viewer,{attributes:true,attributeFilter:['class']});
 function decode(node,image,src){
  return new Promise((resolve,reject)=>{
   const finish=error=>{decoding.delete(node);image.onload=image.onerror=null;if(error)reject(error);else resolve();};
   decoding.set(node,()=>finish(new DOMException('Cancelled','AbortError')));
   image.onload=()=>finish();image.onerror=()=>finish(Error('Не удалось прочитать фотографию'));
   image.src=src;if(image.complete&&image.naturalWidth)finish();
  });
 }
 function readyFromMemory(node,data){return data.file?files()?.cachedFile(data.file.id):wasInline.has(node);}
 function markup(media){const file=media.kind==='file'?files()?.descriptor(media.data):null,inline=file?'':String(media.data||''),size=file?.size||Math.max(1,Math.floor((inline.length-inline.indexOf(',')-1)*.75));return '<div class="auto-photo-v179" '+(file?'data-attachment-v179="'+esc(JSON.stringify(file))+'"':'data-inline-v179="'+esc(inline)+'"')+'><button type="button" class="auto-photo-load-v179" aria-label="Загрузить фотографию">'+icon('image')+'<strong>Фотография</strong><small>'+bytes(size)+' · Нажми, чтобы загрузить</small></button><img class="chat-photo auto-photo-image-v179" alt="Фотография" hidden decoding="async"></div>'+(media.caption?'<div class="media-caption">'+(window.telechatEmojiV127?.decorate(esc(media.caption),false)||esc(media.caption))+'</div>':'');}
 const before=window.renderMessageContent;if(typeof before==='function')window.renderMessageContent=function(text){const media=window.unpackMedia?.(text);if(media?.kind==='album'){const items=window.exstraPhotoAlbumV183?.parse(media.data);if(items)return '<div class="photo-album-v183" data-count="'+items.length+'" data-album-v183="'+esc(JSON.stringify(items))+'" role="group" aria-label="Альбом · '+items.length+' фото">'+items.map(file=>markup({kind:'file',data:JSON.stringify(file)})).join('')+'</div>'+(media.caption?'<div class="media-caption">'+(window.telechatEmojiV127?.decorate(esc(media.caption),false)||esc(media.caption))+'</div>':'');}if(media?.kind==='image'||media?.kind==='file'&&files()?.isPhoto?.(files()?.descriptor?.(media.data)))return markup(media);return before.apply(this,arguments);};
 async function prepare(node,manual=false){const data=describe(node),who=self();if(!data||!who||jobs.has(node))return;loadPrefs();if(!manual&&!readyFromMemory(node,data)&&!allowed(data.kind,data.size))return;if(!manual&&(document.hidden||!node.getClientRects().length))return;const token=revision,photo=node.classList.contains('auto-photo-v179'),button=photo?node.querySelector('button'):node;
  jobs.add(node);node.setAttribute('aria-busy','true');if(photo){button.disabled=true;button.querySelector('small').textContent='Загружаем…';}
  try{let value;if(data.file)value=await files().loadFile(data.file,{automatic:!manual});if(self()!==who||!node.isConnected||!manual&&token!==revision)return;
   if(photo){
    if(value&&!/^image\/(jpeg|png|webp)$/.test(value.mime||''))throw Error('Вложение не является фотографией');
    const image=node.querySelector('img');image.loading='eager';
    const url=value?URL.createObjectURL(new Blob([value.blob],{type:value.mime})):data.inline;
    if(urls.has(node))URL.revokeObjectURL(urls.get(node));if(value)urls.set(node,url);
    await decode(node,image,url);
    if(self()!==who||!node.isConnected||!manual&&token!==revision){releasePhoto(node);return;}
    const restoring=restoredPhotos.has(node);restoredPhotos.delete(node);if(!value)wasInline.add(node);
    image.hidden=false;button.hidden=true;node.dataset.mediaReadyV179='1';loadedPhotos.add(node);parkPhoto(node);
    if(!restoring)window.exstraMotionV184?.reveal(image,'photo');
    image.onclick=()=>{const album=node.closest('.photo-album-v183');if(album){try{window.exstraAlbumViewerV183?.open(JSON.parse(album.dataset.albumV183),[...album.children].indexOf(node));}catch(_){}return;}if(node._openPhotoV179)node._openPhotoV179(image.src);else window.openMediaViewer?.(image.src);};
   }
   else{node.dataset.mediaReadyV179='1';const note=node.querySelector('small');if(note)note.textContent=bytes(data.size)+' · Подготовлен · Сохранить';}
  }catch(error){if(photo){releasePhoto(node);if(node.isConnected)button.querySelector('small').textContent=error?.name==='AbortError'?'Загрузка остановлена · Нажми для загрузки':'Не загрузилось · Нажми, чтобы повторить';}if(manual&&error?.name!=='AbortError')window.showToast?.(error?.message||'Не удалось загрузить фотографию');}
  finally{jobs.delete(node);node.removeAttribute('aria-busy');if(photo)button.disabled=false;}
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const e of entries){if(e.isIntersecting){visible.add(e.target);unpark(e.target);leased.delete(e.target);}else visible.delete(e.target);}
  for(const e of entries)if(!e.isIntersecting)parkPhoto(e.target);
  pump();
 },{rootMargin:'80px 0px',threshold:.01}):null;
 async function pump(){if(document.hidden||!self())return;if(pumping){pumpAgain=true;return;}loadPrefs();const token=revision;pumping=true;try{for(const node of [...visible]){if(document.hidden)break;if(!node.isConnected||!node.getClientRects().length||node.dataset.mediaReadyV179==='1'||jobs.has(node))continue;const data=describe(node);if(!data)continue;if(!readyFromMemory(node,data)&&!allowed(data.kind,data.size))continue;if(attempted.get(node)===revision)continue;attempted.set(node,revision);await prepare(node);}}finally{pumping=false;if(pumpAgain||token!==revision){pumpAgain=false;pump();}}}
 function watch(root){if(!(root instanceof Element))return;const nodes=root.matches('.auto-photo-v179,[data-file-v141][data-attachment-v179]')?[root]:[...root.querySelectorAll('.auto-photo-v179,[data-file-v141][data-attachment-v179]')];for(const node of nodes){if(targets.has(node))continue;targets.add(node);if(node.classList.contains('auto-photo-v179'))node.querySelector('button').onclick=()=>prepare(node,true);if(observer)observer.observe(node);else visible.add(node);}if(nodes.length)pump();}
 function forget(node){observer?.unobserve(node);targets.delete(node);visible.delete(node);if(node.classList.contains('auto-photo-v179'))releasePhoto(node);}
 function scan(){scanTimer=0;loadPrefs();if(fullScan){for(const node of targets)if(!node.isConnected)forget(node);}else for(const root of removedRoots){if(root.isConnected)continue;const nodes=root.matches('.auto-photo-v179,[data-file-v141][data-attachment-v179]')?[root]:root.querySelectorAll('.auto-photo-v179,[data-file-v141][data-attachment-v179]');for(const node of nodes)if(targets.has(node))forget(node);}removedRoots.clear();
  const roots=new Set(addedRoots);addedRoots.clear();
  if(fullScan){fullScan=false;watch($('messages'));watch($('shared-media-list-v152'));}
  else for(const root of roots){if(!root.isConnected)continue;let parent=root.parentElement;while(parent&&!roots.has(parent))parent=parent.parentElement;if(!parent)watch(root);}
 }
 function scheduleScan(){fullScan=true;if(!scanTimer)scanTimer=setTimeout(scan,0);}
 function changed(){loadPrefs();revision++;files()?.abortAutomaticReads();paintSettings();pump();}
 const panel=$('settings-panel');if(panel){section=document.createElement('section');section.id='media-settings-v179';section.className='panel-section';section.dataset.settingsGroup='data';section.innerHTML='<div class="panel-section-title">Автозагрузка медиа</div><p class="media-note-v179">Правила сохраняются для аккаунта на этом устройстве. Загружаются только видимые вложения. В папку «Загрузки» ничего не сохраняется без нажатия.</p><div class="media-network-v179" id="media-network-v179" role="status"></div><label class="media-field-v179">Определение сети<select id="media-mode-v179"><option value="auto">Автоматически</option><option value="wifi">Использовать правила Wi-Fi</option><option value="mobile">Использовать правила мобильной сети</option></select></label><p class="media-note-v179">Если браузер не сообщает тип сети, применяются правила мобильной сети. «4G» в оценке скорости не означает Wi-Fi.</p>'+['wifi','mobile'].map(name=>'<fieldset class="media-profile-v179"><legend>'+(name==='wifi'?'Wi-Fi и проводная сеть':'Мобильная и неизвестная сеть')+'</legend>'+[['image','Фото'],['video','Видео'],['file','Файлы']].map(([kind,label])=>'<label class="media-toggle-v179"><span>'+icon(kind==='image'?'image':kind==='video'?'video':'file')+label+'</span><input type="checkbox" id="media-'+name+'-'+kind+'-v179" aria-label="'+label+' · '+(name==='wifi'?'Wi-Fi':'Мобильная сеть')+'"></label>').join('')+'<label class="media-field-v179">Лимит на одно вложение<select id="media-'+name+'-size-v179">'+[1,2,5,10,20].map(n=>'<option value="'+n+'">'+n+' МБ</option>').join('')+'</select></label></fieldset>').join('')+'<label class="media-toggle-v179"><span>Учитывать системную экономию трафика</span><input id="media-respect-v179" type="checkbox"></label><p class="media-note-v179">При системной экономии автоматическая загрузка отключается. По нажатию загрузка доступна всегда, если есть сеть.</p><p class="media-note-v179">Старые фото встроены в сообщения: отключение автозагрузки откладывает их показ, но не уменьшает уже полученную историю. Новые фото хранятся отдельно и действительно загружаются по правилам. Лимит хранилища вложений аккаунта — 250 МБ.</p><p class="media-note-v179">Видео отправляются как файлы: их подготовка не запускает воспроизведение. Аватарки, голосовые, музыка и звонки этими правилами не меняются. Подготовленные вложения хранятся только в памяти до закрытия приложения, не более 32 МБ.</p><button type="button" class="media-reset-v179" id="media-reset-v179">Сбросить правила</button>';panel.append(section);section.addEventListener('change',()=>{const value=model.clean(prefs);value.mode=$('media-mode-v179').value;value.respectSaver=$('media-respect-v179').checked;for(const name of ['wifi','mobile']){for(const kind of ['image','video','file'])value[name][kind]=$(`media-${name}-${kind}-v179`).checked;value[name].maxMB=Number($(`media-${name}-size-v179`).value);}savePrefs(value);});$('media-reset-v179').onclick=()=>savePrefs(model.defaults());}
 const dom=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes)if(node.nodeType===1)addedRoots.add(node);for(const node of record.removedNodes)if(node.nodeType===1)removedRoots.add(node);}if((addedRoots.size||removedRoots.size)&&!scanTimer)scanTimer=setTimeout(scan,0);});if($('messages'))dom.observe($('messages'),{childList:true,subtree:true});
 function mountPhoto(container,media,onOpen){container.innerHTML=markup(media);const node=container.querySelector('.auto-photo-v179');node._openPhotoV179=onOpen;watch(container);return node;}
 window.addEventListener('telechat-account-ready-v175',()=>{loadPrefs();scheduleScan();});window.addEventListener('telechat-user-updated-v123',()=>{if(self()!==owner){loadPrefs();scheduleScan();}});
 window.addEventListener('storage',event=>{if(event.key===key(self())){owner='';loadPrefs();changed();}});connection?.addEventListener?.('change',changed);window.addEventListener('online',changed);window.addEventListener('offline',changed);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)files()?.abortAutomaticReads();else changed();});window.addEventListener('pagehide',event=>{files()?.abortAutomaticReads();if(!event.persisted){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}});
 window.exstraAutoMediaV179=Object.freeze({getState:()=>{loadPrefs();return {owner,prefs:model.clean(prefs),network:net()};},set:savePrefs,mountPhoto,scan:scheduleScan,allowed});loadPrefs();scheduleScan();
})();
