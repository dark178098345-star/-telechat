/* New group/channel creation and management; no background queries or render loops. */
(()=>{
 'use strict';
 const model=window.exstraRoomsModelV177,$=id=>document.getElementById(id),panel=$('room-panel');if(!model||!panel)return;
 const paths={group:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 5a3 3 0 0 1 0 6M19 15a5 5 0 0 1 3 5"/>',channel:'<path d="m3 10 17-6v16L3 14zM3 10v4M7 16l2 6h3l-2-5M20 8h2M20 16h2"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',public:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',photo:'<path d="m3 7 4-1 2-3h6l2 3 4 1v13H3z"/><circle cx="12" cy="13" r="4"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',plus:'<path d="M12 4v16M4 12h16"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4 4L20 5"/>',arrow:'<path d="m9 5 7 7-7 7"/>'};
 const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
 const title=r=>r.type==='channel'?'Канал':'Группа',memberWord=r=>r.type==='channel'?'Подписчики':'Участники';
 const cached=nick=>{try{return userCache[nick]||{nick,name:nick,av:0};}catch(_){return {nick,name:nick,av:0};}};
 let dialog,draft=null,creation=null,mode='create',step=1,busy=false,photoBusy=false,opener,searchToken=0,searchTimer=0,photoToken=0,candidates=[],searchNote='',view=null,viewVersion=0;
 function message(text){$('rooms-error-v177').textContent=text||'';}
 function label(user){return user.name||user.nick;}
 function picture(user){return typeof avatarMarkup==='function'?avatarMarkup(user):'';}
 function draftData(){return {type:draft.type,visibility:draft.visibility,name:$('rooms-name-v177').value,description:$('rooms-description-v177').value,icon:draft.icon,members:[...draft.members.keys()]};}
 function locked(){return busy||photoBusy||!!creation?.started;}
 function contacts(){return [...new Set([...document.querySelectorAll('#contacts-list [data-contact-nick]')].map(n=>n.dataset.contactNick))].filter(n=>n&&n!==model.account()).slice(0,16).map(cached);}
 function selected(){
  if(!draft)return;
  const box=$('rooms-selected-v177');box.replaceChildren();
  for(const u of draft.members.values()){const b=document.createElement('button');b.type='button';b.className='rooms-chip-v177';b.disabled=locked();b.innerHTML='<span></span>'+icon('close');b.firstChild.textContent=label(u);b.setAttribute('aria-label','Убрать @'+u.nick);b.onclick=()=>{draft.members.delete(u.nick);selected();paintCandidates();paint();};box.append(b);}
  $('rooms-selected-count-v177').textContent='Выбрано: '+draft.members.size+' / 100';
 }
 function paintCandidates(){
  if(!draft)return;
  const box=$('rooms-candidates-v177');box.replaceChildren();$('rooms-search-note-v177').textContent=searchNote||(!candidates.length?'Введи минимум 2 символа ника, чтобы найти человека.':'Выбранные люди будут добавлены сразу.');
  for(const user of candidates){const already=mode==='add'&&view?.members.has(user.nick),checked=draft.members.has(user.nick)||already;
   const b=document.createElement('button');b.type='button';b.className='rooms-person-v177';b.disabled=locked()||already;b.setAttribute('aria-pressed',String(checked));b.innerHTML='<span class="av">'+picture({...cached(user.nick),...user})+'</span><span><strong></strong><small></small></span><i>'+icon('check')+'</i>';b.querySelector('strong').textContent=label(user);b.querySelector('small').textContent='@'+user.nick+(already?' · уже добавлен':'');
   b.onclick=()=>{if(draft.members.has(user.nick))draft.members.delete(user.nick);else if(draft.members.size<100)draft.members.set(user.nick,user);else message('За один раз можно добавить до 100 человек.');selected();paintCandidates();paint();};box.append(b);
  }
 }
 function paint(){
  if(!dialog||!draft)return;
  const data=draftData(),isChannel=data.type==='channel',frozen=locked(),max=mode==='create'?3:mode==='edit'?2:2;
  dialog.dataset.mode=mode;dialog.dataset.step=step;
  $('rooms-title-v177').textContent=mode==='create'?'Создать '+(isChannel?'канал':'группу'):mode==='edit'?'Настройки '+(isChannel?'канала':'группы'):'Добавить '+(isChannel?'подписчиков':'участников');
  for(const node of dialog.querySelectorAll('[data-stage]'))node.hidden=Number(node.dataset.stage)!==step;
  $('rooms-type-v177').hidden=mode!=='create';$('rooms-steps-v177').hidden=mode==='add';
  $('rooms-privacy-v177').hidden=mode==='add';$('rooms-picker-v177').hidden=mode==='edit';
  for(const button of dialog.querySelectorAll('[data-type]')){button.setAttribute('aria-pressed',String(button.dataset.type===data.type));button.disabled=frozen;}
  for(const button of dialog.querySelectorAll('[data-access]')){button.setAttribute('aria-pressed',String(button.dataset.access===data.visibility));button.disabled=frozen;}
  for(const node of dialog.querySelectorAll('[data-step-label]')){node.classList.toggle('is-current',Number(node.dataset.stepLabel)===step);node.hidden=mode==='edit'&&node.dataset.stepLabel==='3';}
  $('rooms-name-count-v177').textContent=Array.from(data.name).length+' / 48';$('rooms-description-count-v177').textContent=Array.from(data.description).length+' / 180';
  $('rooms-privacy-note-v177').textContent=data.visibility==='public'?'Можно найти по названию в поиске и вступить самостоятельно.':'Не показывается в общем поиске. Владелец сам добавляет участников.';
  $('rooms-type-note-v177').textContent=isChannel?'Публикует владелец. Подходит для новостей, музыки и объявлений.':'Писать могут участники. Подходит для компании, команды и обсуждений.';
  const avatar={...data,name:data.name.trim()||title(data)};const markup=roomAvatarMarkupV113(avatar);
  for(const node of dialog.querySelectorAll('[data-room-preview-avatar]'))if(node._roomMarkup!==markup){node.innerHTML=markup;node._roomMarkup=markup;}
  for(const node of dialog.querySelectorAll('[data-room-preview-name]'))node.textContent=data.name.trim()||'Название '+(isChannel?'канала':'группы');
  for(const node of dialog.querySelectorAll('[data-room-preview-description]'))node.textContent=data.description.trim()||'Здесь появится описание';
  for(const node of dialog.querySelectorAll('[data-room-preview-meta]'))node.textContent=title(data)+' · '+(data.visibility==='public'?'Публичный доступ':'Приватный доступ');
  for(const node of dialog.querySelectorAll('[data-room-preview-members]'))node.textContent=draft.members.size?memberWord(data)+': '+draft.members.size+' + ты':'Пока только ты. Людей можно добавить позже.';
  for(const input of dialog.querySelectorAll('input,textarea'))input.disabled=frozen;
  for(const button of dialog.querySelectorAll('[data-color],#rooms-photo-v177,#rooms-reset-photo-v177'))button.disabled=frozen;
  $('rooms-photo-v177').setAttribute('aria-label',data.icon.startsWith('data:')?'Изменить аватарку':'Добавить аватарку');
  $('rooms-reset-photo-v177').hidden=!data.icon.startsWith('data:');
  $('rooms-back-v177').hidden=step===1||mode==='add';$('rooms-back-v177').disabled=busy||photoBusy;
  $('rooms-submit-v177').disabled=busy||photoBusy||(mode==='add'&&!draft.members.size);
  $('rooms-submit-v177').textContent=busy?'Сохраняем…':photoBusy?'Готовим фото…':creation?.started?'Завершить создание':mode==='add'?'Добавить':step<max?'Далее':mode==='edit'?'Сохранить':isChannel?'Создать канал':'Создать группу';
  $('rooms-close-v177').disabled=busy||photoBusy;
 }
 function ensure(){
  if(dialog)return;dialog=document.createElement('dialog');dialog.id='room-create-v177';dialog.className='rooms-dialog-v177';dialog.setAttribute('aria-labelledby','rooms-title-v177');
  const preview='<div class="rooms-preview-card-v177"><div class="rooms-preview-top-v177"><span data-room-preview-avatar></span><strong data-room-preview-name></strong><small data-room-preview-meta></small></div><p data-room-preview-description></p><div class="rooms-preview-bottom-v177" data-room-preview-members></div></div>';
  dialog.innerHTML='<form id="rooms-form-v177"><header class="rooms-head-v177"><div><small>ТВОЁ ПРОСТРАНСТВО</small><h2 id="rooms-title-v177"></h2></div><button type="button" id="rooms-close-v177" aria-label="Закрыть">'+icon('close')+'</button></header><nav id="rooms-steps-v177" aria-label="Шаги создания"><span data-step-label="1">1 · Основное</span><span data-step-label="2">2 · Доступ и люди</span><span data-step-label="3">3 · Проверка</span></nav><div class="rooms-editor-body-v177"><main><section data-stage="1"><div id="rooms-type-v177">'+[['group','Группа','Для общения вместе'],['channel','Канал','Для твоих публикаций']].map(([id,t,n])=>'<button type="button" data-type="'+id+'">'+icon(id)+'<strong>'+t+'</strong><small>'+n+'</small></button>').join('')+'</div><p id="rooms-type-note-v177" class="rooms-note-v177"></p><div class="rooms-photo-line-v177"><button type="button" id="rooms-photo-v177"><span data-room-preview-avatar></span><i>'+icon('photo')+'</i></button><div><strong>Своя аватарка</strong><p class="rooms-note-v177">Фото до 12 МБ. Обрежем по центру и подготовим лёгкую копию.</p><button type="button" id="rooms-reset-photo-v177">Убрать фото</button><div class="rooms-colors-v177">'+model.colors.map(c=>'<button type="button" data-color="'+c+'" aria-label="Цвет '+c+'"></button>').join('')+'</div></div></div><label for="rooms-name-v177">Название <small id="rooms-name-count-v177"></small></label><input id="rooms-name-v177" maxlength="48" autocomplete="off" placeholder="Например, Близкие люди"><label for="rooms-description-v177">Описание <small id="rooms-description-count-v177"></small></label><textarea id="rooms-description-v177" maxlength="180" rows="3" placeholder="Для чего это пространство?"></textarea></section><section data-stage="2"><div id="rooms-privacy-v177"><h3>Кто сможет присоединиться?</h3><div class="rooms-access-v177">'+[['private','Приватный', 'lock'],['public','Публичный','public']].map(([id,t,i])=>'<button type="button" data-access="'+id+'">'+icon(i)+'<span>'+t+'</span></button>').join('')+'</div><p class="rooms-note-v177" id="rooms-privacy-note-v177"></p></div><div id="rooms-picker-v177"><label for="rooms-find-v177">Найти по нику</label><input id="rooms-find-v177" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@username"><p class="rooms-note-v177" id="rooms-selected-count-v177"></p><div id="rooms-selected-v177"></div><p class="rooms-note-v177" id="rooms-search-note-v177" role="status"></p><div id="rooms-candidates-v177"></div></div></section><section data-stage="3"><h3>Всё готово к созданию</h3><p class="rooms-note-v177">Проверь название, доступ и людей. Всё это можно будет изменить в управлении.</p>'+preview+'</section><p id="rooms-error-v177" role="status" aria-live="polite"></p></main><aside class="rooms-preview-v177"><small>ТАК УВИДЯТ ДРУГИЕ</small>'+preview+'<p class="rooms-note-v177">Название, фото и описание сохранятся для всех участников.</p></aside></div><footer class="rooms-footer-v177"><button type="button" id="rooms-back-v177">Назад</button><button type="submit" id="rooms-submit-v177">Далее</button></footer></form><input id="rooms-photo-file-v177" type="file" accept="image/jpeg,image/png,image/webp" hidden>';
  document.body.append(dialog);
  $('rooms-close-v177').onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy||photoBusy)event.preventDefault();});dialog.addEventListener('close',()=>{++searchToken;clearTimeout(searchTimer);if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});});
  $('rooms-form-v177').onsubmit=submit;$('rooms-back-v177').onclick=()=>{step=Math.max(1,step-1);paint();dialog.querySelector('main').scrollTop=0;};
  $('rooms-name-v177').oninput=$('rooms-description-v177').oninput=()=>{if(!creation?.started)message('');paint();};
  dialog.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{draft.type=b.dataset.type;paint();});dialog.querySelectorAll('[data-access]').forEach(b=>b.onclick=()=>{draft.visibility=b.dataset.access;paint();});
  dialog.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{draft.icon='exstra-room:v177:'+b.dataset.color;paint();});
  $('rooms-reset-photo-v177').onclick=()=>{draft.icon='exstra-room:v177:violet';paint();};$('rooms-photo-v177').onclick=()=>$('rooms-photo-file-v177').click();$('rooms-photo-file-v177').onchange=loadPhoto;
  $('rooms-find-v177').oninput=()=>{const token=++searchToken,q=$('rooms-find-v177').value;clearTimeout(searchTimer);if(q.replace(/^@/,'').trim().length<2){candidates=contacts();searchNote='';paintCandidates();return;}searchNote='Ищем пользователей…';paintCandidates();searchTimer=setTimeout(async()=>{try{const result=await model.search(q);if(token!==searchToken||!dialog.open)return;candidates=result;searchNote=result.length?'':'Никого не нашли. Проверь ник.';paintCandidates();}catch(error){if(token===searchToken){searchNote=error.message;paintCandidates();}}},250);};
 }
 async function loadPhoto(){
  const file=$('rooms-photo-file-v177').files?.[0];$('rooms-photo-file-v177').value='';if(!file||locked())return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){message('Выбери JPG, PNG или WebP до 12 МБ.');return;}
  const token=++photoToken,actor=draft.owner,url=URL.createObjectURL(file);photoBusy=true;paint();
  try{const image=new Image();image.src=url;await image.decode();if(token!==photoToken||draft.owner!==actor||model.account()!==actor)return;const side=Math.min(image.naturalWidth,image.naturalHeight);if(!side)throw Error();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.getContext('2d').drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);draft.icon=canvas.toDataURL('image/jpeg',.82);message('');}
  catch(_){message('Не удалось открыть изображение. Попробуй другой файл.');}finally{URL.revokeObjectURL(url);photoBusy=false;paint();}
 }
 function openEditor(kind='create',room=null,photo=false){
  const actor=model.account();if(!actor){window.showToast?.('Сначала войди в аккаунт');return;}if(busy)return;ensure();opener=document.activeElement;mode=kind;step=kind==='add'?2:1;photoBusy=false;++photoToken;
  if(kind==='create'){
   const saved=model.pending(actor);if(saved){creation=saved;draft={...saved.data,owner:actor,members:new Map(saved.data.members.map(n=>[n,cached(n)]))};step=3;}
   else if(!draft||draft.owner!==actor||draft.room||creation){creation=null;draft={owner:actor,type:'group',visibility:'private',name:'',description:'',icon:'exstra-room:v177:violet',members:new Map()};}
  }else{if(room.owner_nick!==actor)return;creation=null;draft={...room,owner:actor,room,members:new Map()};}
  $('rooms-name-v177').value=draft.name||'';$('rooms-description-v177').value=draft.description||'';$('rooms-find-v177').value='';candidates=contacts();searchNote='';message(creation?.started?'Это создание ещё не подтверждено. Повтори завершение — используем тот же номер, без новой копии.':'');
  selected();paintCandidates();paint();if(!dialog.open)dialog.showModal();if(photo)$('rooms-photo-file-v177').click();
 }
 function commitRoom(room){
  if(typeof roomRows!=='undefined'){const old=roomRows.find(r=>String(r.id)===String(room.id));roomRows=old?roomRows.map(r=>String(r.id)===String(room.id)?{...r,...room}:r):[{...room,my_role:room.owner_nick===model.account()?'owner':'member'},...roomRows];}
  if(typeof currentRoom!=='undefined'&&String(currentRoom?.id)===String(room.id)){currentRoom={...currentRoom,...room};$('chat-name-hdr').textContent=room.name;$('chat-av').innerHTML=roomAvatarMarkupV113(room);}
 }
 async function submit(event){
  event?.preventDefault();if(busy||photoBusy||!draft||draft.owner!==model.account())return;
  if(mode!=='add'&&step===1){try{model.validate(draftData());}catch(error){message(error.message);$('rooms-name-v177').focus();return;}}
  const last=mode==='create'?3:2;if(step<last){step++;paint();return;}
  const actor=draft.owner,kind=mode,target=draft.room;busy=true;message('');paint();let result;
  try{
   if(kind==='create'){creation=creation||model.command(draftData());result=await model.create(creation);creation=null;draft=null;}
   else if(kind==='edit')result=await model.edit(target,draftData());else await model.add(target,[...draft.members.keys()]);
   model.check(actor);if(result)commitRoom(result);dialog.close();window.showToast?.(kind==='create'?title(result)+' создан'+(result.type==='group'?'а':''):kind==='edit'?'Изменения сохранены':'Участники добавлены');
  }catch(error){if(creation&&!creation.started)creation=null;if(actor===model.account())message(error.message+(creation?.started&&creation.durable===false?' Не закрывай приложение до завершения: браузер не сохранил попытку.':''));return;}
  finally{busy=false;paint();paintCandidates();selected();}
  if(actor!==model.account())return;
  try{await window.renderContacts?.();if(kind==='create'){model.check(actor);await window.openRoom?.(result);}else if(view&&String(view.room.id)===String(target.id))await loadManager(false);if(actor===model.account())Promise.resolve(window.updateStatusBar?.()).catch(()=>{});}catch(_){window.showToast?.('Сохранено. Если чат не открылся, выбери его в списке.');}
 }
 function buildManager(){
  if(panel.dataset.roomsStudioV177)return;panel.dataset.roomsStudioV177='true';
  panel.innerHTML='<header class="rooms-head-v177"><h2 class="panel-title">Управление</h2><button type="button" id="rooms-manager-close-v177" aria-label="Закрыть">'+icon('close')+'</button></header><div class="rooms-manager-body-v177"><div class="rooms-manager-hero-v177"><button type="button" id="rooms-manager-avatar-v177" aria-label="Аватарка пространства"></button><h2 id="room-panel-name"></h2><p id="room-panel-meta"></p><button type="button" id="rooms-manager-edit-v177">'+icon('edit')+'Изменить</button></div><p id="rooms-manager-error-v177" role="status"></p><button type="button" id="rooms-manager-retry-v177" hidden>Повторить загрузку</button><section class="rooms-manager-section-v177"><h3>Описание</h3><p id="room-panel-description"></p><div class="rooms-manager-access-v177"><span id="rooms-manager-access-icon-v177"></span><span><strong id="room-access-title"></strong><small id="room-access-text"></small></span></div></section><section class="rooms-manager-section-v177"><div class="rooms-members-heading-v177"><h3 id="rooms-manager-member-title-v177">Участники</h3><button type="button" id="rooms-manager-add-v177">'+icon('plus')+'Добавить</button></div><div id="room-member-list"></div><button type="button" id="rooms-manager-more-v177" hidden>Показать ещё</button></section><div class="rooms-manager-bottom-v177"><button type="button" id="room-add-all-creator" hidden>Добавить все аккаунты</button><p id="room-add-all-result" role="status"></p><button type="button" id="room-leave-btn"></button></div></div>';
  $('rooms-manager-close-v177').onclick=()=>window.closeAllPanels?.();$('rooms-manager-retry-v177').onclick=()=>loadManager(false);$('rooms-manager-more-v177').onclick=()=>loadManager(true);
  $('rooms-manager-edit-v177').onclick=()=>openEditor('edit',view.room);$('rooms-manager-add-v177').onclick=()=>openEditor('add',view.room);$('rooms-manager-avatar-v177').onclick=()=>{if(view.room.owner_nick===model.account())openEditor('edit',view.room,true);};$('room-add-all-creator').onclick=()=>window.addAllAccountsToChannel?.();$('room-leave-btn').onclick=()=>danger();
 }
 function paintManager(){
  if(!view)return;const r=view.room,owner=r.owner_nick===model.account(),publicRoom=r.visibility==='public';
  $('room-panel-name').textContent=r.name;const managerAvatar=$('rooms-manager-avatar-v177'),managerMarkup=roomAvatarMarkupV113(r);if(managerAvatar._roomMarkup!==managerMarkup){managerAvatar.innerHTML=managerMarkup;managerAvatar._roomMarkup=managerMarkup;}managerAvatar.disabled=!owner;
  panel.querySelector('.panel-title').textContent=owner?'Управление':r.type==='channel'?'О канале':'О группе';
  $('room-panel-meta').textContent=title(r)+' · '+(r.type==='channel'?'Подписчиков: ':'Участников: ')+(view.count??(view.members.size||'…'));$('room-panel-description').textContent=r.description||'Описание пока не добавлено.';
  $('room-access-title').textContent=publicRoom?'Публичный доступ':'Приватный доступ';$('room-access-text').textContent=publicRoom?'Можно найти в поиске и вступить.':'Добавлять людей может владелец.';$('rooms-manager-access-icon-v177').innerHTML=icon(publicRoom?'public':'lock');
  $('rooms-manager-edit-v177').hidden=!owner;$('rooms-manager-add-v177').hidden=!owner;$('room-add-all-creator').hidden=!(owner&&model.account()==='creator'&&r.type==='channel');$('room-add-all-creator').style.display=$('room-add-all-creator').hidden?'none':'';
  $('rooms-manager-member-title-v177').textContent=memberWord(r);$('room-leave-btn').textContent=owner?'Удалить '+(r.type==='channel'?'канал':'группу'):'Покинуть '+(r.type==='channel'?'канал':'группу');$('rooms-manager-more-v177').hidden=!view.more;
  const list=$('room-member-list'),existing=new Map([...list.children].map(n=>[n.dataset.nick,n])),wanted=new Set(view.members.keys());
  for(const row of [...list.children])if(!wanted.has(row.dataset.nick))row.remove();
  let index=0;
  for(const member of view.members.values()){
   const user=cached(member.user_nick),row=existing.get(member.user_nick)||document.createElement('div');row.className='rooms-member-v177';row.dataset.nick=member.user_nick;
   let b=row.querySelector('.rooms-member-profile-v177');if(!b){b=document.createElement('button');b.type='button';b.className='rooms-member-profile-v177';b.innerHTML='<span class="av"></span><span><strong></strong><small></small></span>';b.onclick=()=>window.openUserProfile?.(member.user_nick);row.append(b);}
   const avatar=b.querySelector('.av'),markup=picture(user);if(avatar._roomMarkup!==markup){avatar.innerHTML=markup;avatar._roomMarkup=markup;}b.querySelector('strong').textContent=label(user);b.querySelector('small').textContent='@'+user.nick+(user.nick===r.owner_nick?' · владелец':member.role==='admin'?' · администратор':'');
   const previousRemove=row.querySelector('.rooms-member-remove-v177');if(owner&&member.user_nick!==r.owner_nick){if(!previousRemove){const remove=document.createElement('button');remove.type='button';remove.className='rooms-member-remove-v177';remove.innerHTML=icon('close');remove.setAttribute('aria-label','Удалить @'+user.nick);remove.onclick=()=>removeMember(member.user_nick,remove);row.append(remove);}}else previousRemove?.remove();
   if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);index++;
  }
 }
 async function loadManager(more=false){
  if(!view)return;if(view.loading){view.reload=true;return;}const current=view,version=++viewVersion,actor=model.account();current.loading=true;$('rooms-manager-more-v177').disabled=true;$('rooms-manager-retry-v177').hidden=true;$('rooms-manager-error-v177').textContent='';
  try{const data=await model.details(current.room,more?current.members.size:0);if(view!==current||version!==viewVersion||actor!==model.account())return;
   if(!more)current.members.clear();for(const item of data.members)current.members.set(item.user_nick,item);current.room=data.room;current.count=data.count;current.more=data.more;commitRoom(data.room);paintManager();
   if(window.telechatUserCacheV123)await window.telechatUserCacheV123.many(data.members.map(m=>m.user_nick));if(view===current&&version===viewVersion&&actor===model.account())paintManager();
  }catch(error){if(view===current&&actor===model.account()){$('rooms-manager-error-v177').textContent=error.message;$('rooms-manager-retry-v177').hidden=false;}}
  finally{current.loading=false;if(view===current){$('rooms-manager-more-v177').disabled=false;if(current.reload){current.reload=false;loadManager(false);}}}
 }
 async function openManager(){if(typeof currentRoom==='undefined'||!currentRoom)return;buildManager();view={room:{...currentRoom},members:new Map(),count:null,more:false,loading:false};paintManager();window.openPanel?.('room-panel');return loadManager(false);}
 async function renderManager(){if(typeof currentRoom==='undefined'||!currentRoom)return;if(!view||String(view.room.id)!==String(currentRoom.id)){buildManager();view={room:{...currentRoom},members:new Map(),count:null,more:false,loading:false};}return loadManager(false);}
 async function removeMember(nick,button){const current=view,actor=model.account();if(!current||!confirm('Удалить @'+nick+' из '+(current.room.type==='channel'?'канала':'группы')+'?'))return;button.disabled=true;try{await model.remove(current.room,nick);if(actor===model.account()&&view===current){await loadManager(false);Promise.resolve(window.updateStatusBar?.()).catch(()=>{});}}catch(error){if(view===current)$('rooms-manager-error-v177').textContent=error.message;}finally{button.disabled=false;}}
 async function danger(){const current=view,actor=model.account();if(!current||current.deleting)return;const owner=current.room.owner_nick===actor;if(!confirm(owner?'Удалить '+current.room.name+' и всю переписку? Это нельзя отменить.':'Покинуть '+current.room.name+'?'))return;current.deleting=true;$('room-leave-btn').disabled=true;try{if(owner)await model.destroy(current.room);else await model.leave(current.room);if(actor===model.account()&&view===current){window.closeAllPanels?.();if(String(currentRoom?.id)===String(current.room.id))window.goBack?.();await window.renderContacts?.();window.showToast?.(owner?'Пространство удалено':'Ты вышел из пространства');}}catch(error){if(view===current)$('rooms-manager-error-v177').textContent=error.message;}finally{current.deleting=false;$('room-leave-btn').disabled=false;}}
 window.openCreateRoomModal=()=>openEditor();window.closeCreateRoomModal=()=>{if(!busy&&!photoBusy)dialog?.close();};window.createRoom=()=>submit();window.openRoomPanel=openManager;window.renderRoomPanel=renderManager;
 function syncRoom(room){if(!room?.id)return;const known=typeof roomRows!=='undefined'&&roomRows.some(r=>String(r.id)===String(room.id));if(!known&&String(currentRoom?.id)!==String(room.id))return;commitRoom(room);if(view&&String(view.room.id)===String(room.id)){view.room={...view.room,...room};paintManager();}window.updateComposerAccess?.();}
 window.exstraRoomsV177=Object.freeze({openCreate:()=>openEditor(),openManager,renderManager,syncRoom,openEdit:()=>view&&openEditor('edit',view.room),getState:()=>({mode,step,busy,photoBusy,pending:!!creation?.started})});
 window.addEventListener('telechat-account-ready-v175',()=>{if(draft?.owner!==model.account()){++photoToken;++searchToken;dialog?.close();panel.classList.remove('open','v65-full-panel','v65-closing');draft=null;creation=null;view=null;++viewVersion;}});
})();
