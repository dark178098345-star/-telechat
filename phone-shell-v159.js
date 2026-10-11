/* Phone screens own navigation and presentation; existing features own data and actions. */
(()=>{
 'use strict';
 const query=matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse)), ((max-width:1100px) and (max-height:600px) and (pointer:coarse))');
 const phoneMode=()=>query.matches||/telechat-android/i.test(navigator.userAgent);
 const $=id=>document.getElementById(id),self=()=>typeof me!=='undefined'?me:null;
 const paths={chats:'<path d="M21 11a8 8 0 0 1-8 8H5l-3 2 1-5A8 8 0 1 1 21 11Z"/><path d="M7 9h8M7 13h5"/>',music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',you:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',more:'<rect x="3" y="3" width="6" height="6" rx="2"/><rect x="15" y="3" width="6" height="6" rx="2"/><rect x="3" y="15" width="6" height="6" rx="2"/><rect x="15" y="15" width="6" height="6" rx="2"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',settings:'<path d="m10 3-1 3-3 1-3 3 2 3v3l3 2 3-1 3 1 3-2v-3l2-3-3-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',qr:'<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h3v3h3v3h-6M12 3v3M3 12h6M12 12h3M12 21v-6"/>',stats:'<path d="M4 20h16M6 15v-5M12 15V4M18 15V8"/>',game:'<path d="M7 7h10c2 0 3 2 3.5 4l1 5c.5 3-2 4-4 2l-2-2h-7l-2 2c-2 2-4.5 1-4-2l1-5C4 9 5 7 7 7Z"/><path d="M6 11v4m-2-2h4m7-2h.01M18 14h.01"/>',eye:'<path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',swap:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',edit:'<path d="m15 5 4 4M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15Z"/>',back:'<path d="m14 5-7 7 7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
 const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.more)+'</svg>';
 const screen=$('chat-screen'),sidebar=$('sidebar'),main=document.querySelector('.chat-main'),active=$('active-chat');if(!screen||!sidebar||!main||!active)return;
 const placements=new Map(),mediaMarks=new WeakMap();let created=false,phone=false,page='chats',owner='',head,nav,you,more,sheet,frame=0,lastView='',accountMark='',droppingBackGuard=false;
 const beforeNavigate=window.telechatNavigate;
 function klass(node,name,value){if(node.classList.contains(name)!==value)node.classList.toggle(name,value);}
 function move(node,parent){if(!node||!parent||node.parentNode===parent)return;if(!placements.has(node)){const marker=document.createComment('phone-v159-original');node.before(marker);placements.set(node,marker);}parent.append(node);}
 function restore(){for(const [node,marker] of placements){if(marker.isConnected)marker.before(node);marker.remove();}placements.clear();main.hidden=false;for(const node of [head,nav,you,more])if(node)node.hidden=true;document.body.removeAttribute('data-phone-page');document.body.classList.remove('phone-chat-open-v159','phone-can-send-v159','phone-recording-v159');sheet?.close();pauseAccount();lastView='';if(history.state?.telechatPhoneBackV159&&!droppingBackGuard){droppingBackGuard=true;history.back();}}
 function button(title,symbol,action,description=''){const node=document.createElement('button');node.type='button';node.className='phone-action-v159';node.innerHTML=icon(symbol)+'<span><strong></strong><small></small></span><b aria-hidden="true">›</b>';node.querySelector('strong').textContent=title;node.querySelector('small').textContent=description;node.querySelector('small').hidden=!description;node.onclick=action;return node;}
 function call(fn){try{const result=fn?.();result?.catch?.(()=>window.showToast?.('Не удалось открыть. Попробуй ещё раз.'));}catch(_){window.showToast?.('Не удалось открыть. Попробуй ещё раз.');}}
 function editProfile(part){call(()=>{window.buildProfPanel?.();window.openPanel?.('profile-panel');if(part){const target=$(part==='avatar'?'prof-av-prev':'profile-banner-preview');target?.click();}});}
 function pauseAccount(){you?.querySelectorAll('video').forEach(video=>video.pause());}
 function paintMedia(node,mark,render){const old=mediaMarks.get(node);if(old?.mark===mark&&old.child===node.firstChild)return;render();mediaMarks.set(node,{mark,child:node.firstChild});}
 function paintAccount(){
  const user=self();if(!user||!you)return;const mark=JSON.stringify([user.nick,user.name,user.av,user.status,user.banner,user.avatar_video,user.animated_profile]);if(mark===accountMark)return;accountMark=mark;
  you.querySelector('.phone-self-name-v159').textContent=user.name||user.nick;you.querySelector('.phone-self-nick-v159').textContent='@'+user.nick;
  const avatar=you.querySelector('.phone-self-avatar-v159'),cover=you.querySelector('.phone-self-cover-v159');
  paintMedia(avatar,JSON.stringify([user.nick,user.av,user.status,user.avatar_video,user.animated_profile]),()=>{if(window.setAvatarElement)window.setAvatarElement(avatar,user);else avatar.textContent=(user.name||user.nick).slice(0,1);});
  paintMedia(cover,JSON.stringify([user.nick,user.banner]),()=>window.applyProfileBanner?.(cover,user.banner));
  const status=you.querySelector('.phone-self-status-v159');let text='';try{text=window.unpackProfileData?.(user.status)?.status||'';}catch(_){}status.textContent=text||'Добавить статус';window.telechatProfileMusicV97?.renderAfter(status,user);
 }
 function closePanels(){call(()=>window.closeAllPanels?.());}
 function setPage(next){
  if(!phone||!self())return;if(!created)sync();if(!created)return;sheet?.close();closePanels();
  if(next!=='chats'&&sidebar.classList.contains('hidden'))call(()=>window.goBack?.());
  page=next;document.body.dataset.phonePage=page;you.hidden=page!=='you';more.hidden=page!=='more';main.hidden=page!=='chats';
  if(page==='you'){paintAccount();you.querySelectorAll('video[autoplay]').forEach(video=>video.play()?.catch(()=>{}));}else pauseAccount();
  nav.querySelectorAll('[data-phone-tab]').forEach(node=>{const selected=node.dataset.phoneTab===page;node.classList.toggle('active',selected);node.setAttribute('aria-current',selected?'page':'false');});
  window.telechatViewportV124?.refresh();window.telechatPixelEyesV155?.refresh?.();sync();
 }
 function openMusic(){setPage('chats');call(()=>window.telechatMusicHubV117?.open());}
 function prepareMusic(){
  const root=$('music-hub-v117');if(!root)return;if(root.dataset.phoneReadyV159){move(root.querySelector('.mh-together-v147'),root.querySelector('.phone-music-tools-v159'));return;}root.dataset.phoneReadyV159='true';
  const open=document.createElement('button');open.type='button';open.className='phone-now-open-v159';open.setAttribute('aria-label','Открыть плеер');open.onclick=()=>root.querySelector('.mh-now-toggle')?.click();root.querySelector('.mh-player-track')?.append(open);
  const close=document.createElement('button');close.type='button';close.className='phone-now-close-v159';close.setAttribute('aria-label','Закрыть плеер');close.innerHTML=icon('back');close.onclick=()=>root.querySelector('.mh-now-toggle')?.click();root.querySelector('.mh-listening')?.prepend(close);
  const tools=document.createElement('div');tools.className='phone-music-tools-v159';root.querySelector('.mh-workspace')?.insertBefore(tools,root.querySelector('.mh-scroll'));move(root.querySelector('.mh-together-v147'),tools);
 }
 function chatMenu(){
  if(!phone)return;if(!sheet){sheet=document.createElement('dialog');sheet.id='phone-chat-menu-v159';sheet.setAttribute('aria-labelledby','phone-chat-menu-title-v159');sheet.innerHTML='<header><h2 id="phone-chat-menu-title-v159">Действия чата</h2><button type="button" aria-label="Закрыть">'+icon('close')+'</button></header><div></div>';document.body.append(sheet);sheet.querySelector('header button').onclick=()=>sheet.close();sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)sheet.close();}});}
  const box=sheet.querySelector('div');box.replaceChildren();
  const choose=fn=>()=>{sheet.close();call(fn);};
  box.append(button('Найти сообщение','search',choose(()=>window.toggleChatSearch?.())));
  if(typeof currentRoom!=='undefined'&&currentRoom)box.append(button(currentRoom.type==='channel'?'Информация о канале':'Информация о группе','you',choose(()=>window.openRoomPanel?.())));
  else box.append(button('Профиль собеседника','you',choose(()=>window.openCurrentHeaderInfo?.())));
  box.append(button('Быстрый переход','more',choose(()=>window.telechatQuickJumpV154?.open())));
  const clear=button('Очистить переписку','close',choose(()=>window.clearChat?.()));clear.classList.add('phone-danger-v159');box.append(clear);sheet.showModal();
 }
 function ensure(){
  if(created)return;created=true;
  head=document.createElement('header');head.id='phone-home-head-v159';head.innerHTML='<div class="phone-home-row-v159"><div><span>ExstraChat</span><h1>Чаты</h1></div><div class="phone-home-actions-v159"><button type="button" aria-label="Быстрый переход">'+icon('search')+'</button></div></div><div class="phone-search-slot-v159"></div><div class="phone-filter-slot-v159"></div>';sidebar.prepend(head);head.querySelector('button').onclick=()=>call(()=>window.telechatQuickJumpV154?.open());
  nav=document.createElement('nav');nav.id='phone-nav-v159';nav.setAttribute('aria-label','Разделы приложения');for(const [id,title] of [['chats','Чаты'],['music','Музыка'],['you','Профиль'],['more','Ещё']]){const node=document.createElement('button');node.type='button';node.dataset.phoneTab=id;node.innerHTML=icon(id)+'<span>'+title+'</span>';node.onclick=()=>id==='music'?openMusic():setPage(id);nav.append(node);}screen.append(nav);
  you=document.createElement('section');you.id='phone-you-v159';you.className='phone-page-v159';you.hidden=true;you.setAttribute('aria-label','Мой профиль');you.innerHTML='<header class="phone-page-head-v159"><div><span>ТВОЁ ПРОСТРАНСТВО</span><h1>Профиль</h1></div><button type="button" class="phone-profile-settings-v159" aria-label="Настройки">'+icon('settings')+'</button></header><div class="phone-page-scroll-v159"><section class="phone-self-card-v159"><button type="button" class="phone-self-cover-v159" aria-label="Изменить баннер"></button><div class="phone-self-body-v159"><button type="button" class="phone-self-avatar-v159 av" aria-label="Изменить аватарку"></button><div class="phone-self-title-v159"><h2 class="phone-self-name-v159"></h2><span class="phone-self-nick-v159"></span></div><button type="button" class="phone-self-status-v159"></button><button type="button" class="phone-profile-edit-v159">'+icon('edit')+'<span>Редактировать профиль</span></button></div></section><div class="phone-self-tools-v159"></div><div class="phone-self-links-v159"></div></div>';screen.append(you);
  you.querySelector('.phone-self-cover-v159').onclick=()=>editProfile('banner');you.querySelector('.phone-self-avatar-v159').onclick=()=>editProfile('avatar');you.querySelector('.phone-self-status-v159').onclick=()=>editProfile();you.querySelector('.phone-profile-edit-v159').onclick=()=>editProfile();you.querySelector('.phone-profile-settings-v159').onclick=()=>call(()=>window.openPanel?.('settings-panel'));
  const tools=you.querySelector('.phone-self-tools-v159');tools.append(button('Статистика','stats',()=>call(()=>window.telechatActivityV124?.open()),'Время, музыка и уровень'),button('Мой QR','qr',()=>call(()=>window.telechatQrV131?.open()),'Найти друг друга'));
  const links=you.querySelector('.phone-self-links-v159');links.append(button('Моя карточка','you',()=>call(()=>window.previewMyProfile?.()),'Посмотреть свой профиль'),button('Игровой статус','game',()=>call(()=>window.telechatGameStatusV151?.open()),'Чем ты сейчас занят'),button('Сменить аккаунт','swap',()=>call(()=>window.openLogoutDialogV76?.('switch'))));
  more=document.createElement('section');more.id='phone-more-v159';more.className='phone-page-v159';more.hidden=true;more.setAttribute('aria-label','Меню приложения');more.innerHTML='<header class="phone-page-head-v159"><div><span>ПОД РУКОЙ</span><h1>Ещё</h1></div></header><div class="phone-page-scroll-v159"><div class="phone-menu-card-v159"></div><p class="phone-menu-note-v159">Твой круг общения. Твой ритм.</p></div>';screen.append(more);const menu=more.querySelector('.phone-menu-card-v159');menu.append(button('Быстрый переход','search',()=>call(()=>window.telechatQuickJumpV154?.open()),'Чат или раздел одним движением'),button('Мой QR','qr',()=>call(()=>window.telechatQrV131?.open()),'Показать или отсканировать'),button('Статистика','stats',()=>call(()=>window.telechatActivityV124?.open()),'Твоя активность'),button('Живые глазки','eye',()=>call(()=>window.telechatPixelEyesV155?.open()),'Внешность, эмоции и обводка'),button('Настройки','settings',()=>call(()=>window.openPanel?.('settings-panel'))));
  const moreButton=document.createElement('button');moreButton.type='button';moreButton.id='phone-chat-more-v159';moreButton.className='hdr-btn';moreButton.setAttribute('aria-label','Действия чата');moreButton.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';active.querySelector('.chat-header-actions')?.append(moreButton);moreButton.onclick=chatMenu;
  const inline=document.createElement('div');inline.id='phone-composer-tools-v159';document.querySelector('.composer-shell')?.append(inline);
 }
 function arrange(){
  if(!created)return;move(sidebar.querySelector('.create-room-btn'),head.querySelector('.phone-home-actions-v159'));move(sidebar.querySelector('.search-wrap'),head.querySelector('.phone-search-slot-v159'));move(sidebar.querySelector('.sidebar-tabs'),head.querySelector('.phone-filter-slot-v159'));
  const stories=$('stories-strip-v115'),list=$('contacts-list');move(stories,sidebar);if(stories&&list&&stories.nextElementSibling!==list)sidebar.insertBefore(stories,list);
  const area=$('input-area'),inline=$('phone-composer-tools-v159');move($('attach-button-v141'),area);if($('attach-button-v141')&&area.firstElementChild!==$('attach-button-v141'))area.insertBefore($('attach-button-v141'),area.firstChild);move(document.querySelector('.composer-tool[onclick*="toggleEmojiPicker"]'),inline);move($('record-btn'),area);if($('record-btn')&&$('record-btn').nextElementSibling!==area.querySelector('.send-btn'))area.insertBefore($('record-btn'),area.querySelector('.send-btn'));
  const shell=document.querySelector('.composer-shell'),status=$('recording-status');move(status,shell);if(status&&shell.firstElementChild!==status)shell.insertBefore(status,shell.firstChild);move($('voice-cancel-v125'),status);
 }
 function hasBackLayer(){return page!=='chats'||sidebar.classList.contains('hidden')||document.body.classList.contains('music-hub-open-v117')||!!document.querySelector('dialog[open],.side-panel.open,#user-profile-modal.show,.qr-overlay-v131:not([hidden]),.story-overlay-v115.open-v115,.modal-overlay.show,.message-modal-overlay-v36.show,#voice-call-overlay.show');}
 function updateBackGuard(){
  if(droppingBackGuard||!phone||!self()||!screen.classList.contains('active'))return;
  const guard=history.state?.telechatPhoneBackV159;
  if(hasBackLayer()){if(!guard){if($('user-profile-modal')?.classList.contains('show')&&window.telechatQrV131?.parse?.(location.href)){const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}history.pushState({...history.state,telechatPhoneBackV159:true},'');}}
  else if(guard){droppingBackGuard=true;history.back();}
 }
 function back(){
  if(!phone||!self())return false;
  const dialogs=[...document.querySelectorAll('dialog[open]')],dialog=document.activeElement?.closest?.('dialog[open]')||dialogs.at(-1);
  if(dialog){const event=new Event('cancel',{cancelable:true});dialog.dispatchEvent(event);if(dialog.open&&!event.defaultPrevented)dialog.close();return true;}
  if($('voice-call-overlay')?.classList.contains('show')){call(()=>window.minimizeCallV32?.());return true;}
  const qr=document.querySelector('.qr-overlay-v131:not([hidden])');if(qr){call(()=>window.telechatQrV131?.close());return true;}
  if($('story-viewer-v115')?.classList.contains('open-v115')){$('story-viewer-close-v115')?.click();return true;}
  if($('story-compose-v115')?.classList.contains('open-v115')){call(()=>window.telechatStoriesV115?.closeComposer());return true;}
  if($('user-profile-modal')?.classList.contains('show')){call(()=>window.closeUserProfile?.());return true;}
  const attachment=$('attachment-menu-v141');if(attachment&&!attachment.hidden){attachment.hidden=true;$('attach-button-v141')?.setAttribute('aria-expanded','false');return true;}
  const transient=document.querySelector('.ctx-menu.show,.emoji-picker.open');if(transient){transient.classList.remove('show','open');return true;}
  const modal=document.querySelector('.modal-overlay.show,.message-modal-overlay-v36.show');if(modal){const close=modal.querySelector('button[onclick^="close"],button[aria-label*="Закрыть"],button[id*="close"]');if(close)close.click();else{modal.classList.remove('show');modal.querySelectorAll('video,audio').forEach(media=>media.pause());}return true;}
  if($('settings-panel')?.classList.contains('open')&&$('settings-panel').dataset.settingsView!=='home'&&window.telechatSettingsV160){window.telechatSettingsV160.openSection('home');return true;}
  if(document.querySelector('.side-panel.open')){closePanels();return true;}
  if(document.body.classList.contains('music-hub-open-v117')){const music=$('music-hub-v117');if(music?.classList.contains('mh-show-now'))music.querySelector('.mh-now-toggle')?.click();else call(()=>window.telechatMusicHubV117?.close());return true;}
  if(sidebar.classList.contains('hidden')){call(()=>window.goBack?.());return true;}
  if(page!=='chats'){setPage('chats');return true;}return false;
 }
 function sync(){
  const enabled=phoneMode();klass(document.body,'telechat-phone-v159',enabled);
  if(!enabled){if(phone)restore();phone=false;return;}phone=true;
  const user=self();if(!user){if(created){pauseAccount();for(const node of [head,nav,you,more])node.hidden=true;main.hidden=false;}owner='';accountMark='';return;}
  ensure();arrange();prepareMusic();head.hidden=false;
  if(owner!==user.nick){owner=user.nick;page='chats';accountMark='';document.body.dataset.phonePage=page;you.hidden=more.hidden=true;main.hidden=false;}
  const chatOpen=sidebar.classList.contains('hidden')&&active.style.display!=='none';if(chatOpen&&page!=='chats'){page='chats';document.body.dataset.phonePage=page;you.hidden=more.hidden=true;main.hidden=false;pauseAccount();}
  const typing=!!inputValue(),pending=$('pending-media')?.classList.contains('show'),recording=$('record-btn')?.dataset.voiceState==='recording'||$('record-btn')?.dataset.voiceState==='requesting';
  klass(document.body,'phone-can-send-v159',typing||!!pending);klass(document.body,'phone-recording-v159',!!recording);klass(document.body,'phone-chat-open-v159',chatOpen);
  nav.hidden=chatOpen||!screen.classList.contains('active')||document.body.classList.contains('music-hub-open-v117');
  const view=[page,chatOpen,nav.hidden,document.body.classList.contains('telechat-mobile-keyboard-v100'),document.body.classList.contains('telechat-mobile-cramped-v159')].join(':');if(view!==lastView){lastView=view;nav.querySelectorAll('[data-phone-tab]').forEach(node=>{const selected=node.dataset.phoneTab===page;node.classList.toggle('active',selected);node.setAttribute('aria-current',selected?'page':'false');});window.telechatPixelEyesV155?.refresh?.();}
  if(page==='you')paintAccount();updateBackGuard();
 }
 function inputValue(){return $('msg-input')?.value.trim()||'';}
 function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync();});}
 if(typeof beforeNavigate==='function')window.telechatNavigate=function(target,...args){if(phoneMode()&&self()){if(target==='profile'){setPage('you');return;}if(target==='chats'){setPage('chats');return;}if(target==='settings'){call(()=>window.openPanel?.('settings-panel'));return;}}return beforeNavigate.apply(this,[target,...args]);};
 const observer=new MutationObserver(schedule);for(const node of [screen,sidebar,active,document.body,$('profile-panel'),$('settings-panel')])if(node)observer.observe(node,{attributes:true,attributeFilter:['class','style']});
 if($('record-btn'))observer.observe($('record-btn'),{attributes:true,attributeFilter:['data-voice-state']});if($('pending-media'))observer.observe($('pending-media'),{attributes:true,attributeFilter:['class']});
 $('msg-input')?.addEventListener('input',schedule);document.addEventListener('click',()=>{if(phoneMode())schedule();});document.addEventListener('keydown',()=>{if(phoneMode())schedule();});document.addEventListener('close',()=>{if(phoneMode())schedule();},true);query.addEventListener?.('change',schedule);window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('popstate',()=>{if(droppingBackGuard){droppingBackGuard=false;schedule();return;}if(phoneMode()&&self()){back();schedule();}});
 window.addEventListener('telechat-chat-action-v155',schedule);window.addEventListener('telechat-user-updated-v123',event=>{if(event.detail?.nick===owner){accountMark='';schedule();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAccount();else schedule();});
 window.telechatPhoneV159=Object.freeze({open:setPage,back,refresh:schedule,getState:()=>({phone,page,owner})});sync();
})();
