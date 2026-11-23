/* Settings screens keep the original controls and their event handlers. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),panel=$('settings-panel'),header=panel?.querySelector('.panel-head'),title=header?.querySelector('.panel-title');
 if(!panel||!header||!title)return;
 const meNow=()=>typeof me!=='undefined'?me:null;
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const definitions={
  home:{title:'Настройки',children:['account','appearance','chats','storage','app']},
  account:{title:'Аккаунт',hint:'Профиль, статистика, Premium и вход',icon:'user',parent:'home'},
  appearance:{title:'Оформление',hint:'Тема, фон, сообщения и эффекты',icon:'palette',parent:'home',children:['theme','style','effects']},
  chats:{title:'Чаты и уведомления',hint:'Звуки, проверка текста и режим фокуса',icon:'bell',parent:'home',children:['notifications','composer','focus']},
  storage:{title:'Данные и связь',hint:'Автозагрузка и состояние соединения',icon:'folder',parent:'home',children:['data','connection']},
  app:{title:'Приложение',hint:'Музыка, сайты и обновления',icon:'phone',parent:'home',children:['updates','music','sites']},
  theme:{title:'Тема и текст',hint:'Цвет, размер шрифта и вид карточек',icon:'palette',parent:'appearance'},
  style:{title:'Фон и сообщения',hint:'Фотофон, цвет и форма сообщений',icon:'image',parent:'appearance'},
  effects:{title:'Эффекты и Нимб',hint:'Персонаж, анимации и зимнее оформление',icon:'spark',parent:'appearance'},
  notifications:{title:'Уведомления и звуки',hint:'Новые сообщения и push',icon:'bell',parent:'chats'},
  composer:{title:'Ввод и отправка',hint:'Проверка текста и поле сообщения',icon:'edit',parent:'chats'},
  focus:{title:'Режим фокуса',hint:'Убрать отвлекающие элементы',icon:'eye',parent:'chats'},
  data:{title:'Автозагрузка медиа',hint:'Фото, видео и файлы в разных сетях',icon:'folder',parent:'storage'},
  connection:{title:'Соединение',hint:'Сеть, проверка сервера и очередь',icon:'globe',parent:'storage'},
  updates:{title:'Запуск и обновления',hint:'Перезапуск, установка и что нового',icon:'phone',parent:'app'},
  music:{title:'Музыка',hint:'Таймер сна и остановка трека',icon:'music',parent:'app'},
  sites:{title:'Сайты',hint:'Открыть отдельное окно сайтов',icon:'globe',parent:'app'}
 };
 const screens=new Map(),routeButtons=new Map(),scrollByPage=new Map();
 const backButton=document.createElement('button');
 backButton.type='button';backButton.id='settings-back-v160';backButton.setAttribute('aria-label','Назад');
 backButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
 header.prepend(backButton);
 title.id='settings-title-v160';title.tabIndex=-1;
 panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby',title.id);
 panel.classList.add('settings-navigation-v160','settings-screens-v226');
 const close=header.querySelector('.panel-head-close');
 if(close)close.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';

 function row(id){
  const item=definitions[id],b=document.createElement('button');
  b.type='button';b.dataset.settingsSection=id;
  b.innerHTML='<span class="settings-route-icon-v226" aria-hidden="true">'+icon(item.icon)+'</span><span class="settings-route-copy-v226"><strong></strong><small></small></span><svg class="settings-chevron-v226" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>';
  b.querySelector('strong').textContent=item.title;b.querySelector('small').textContent=item.hint;
  b.onclick=()=>select(id);routeButtons.set(id,b);
  if(id==='sites')b.hidden=true;
  return b;
 }
 const profile=document.createElement('section');profile.id='settings-profile-v165';
 profile.innerHTML='<button type="button" class="settings-profile-main-v165"><span class="settings-profile-avatar-v165 av" aria-hidden="true"></span><span class="settings-profile-copy-v165"><strong></strong><small></small><span>Редактировать профиль</span></span></button><button type="button" class="settings-profile-qr-v165" aria-label="Мой QR"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h3v3h3v3h-6M12 3v3M3 12h6M12 12h3M12 21v-6"/></svg></button>';
 profile.querySelector('.settings-profile-main-v165').onclick=()=>{if(!meNow())return;window.buildProfPanel?.();window.openPanel?.('profile-panel');};
 profile.querySelector('.settings-profile-qr-v165').onclick=()=>window.telechatQrV131?.open();
 let profileMark='';
 function paintProfile(){
  const user=meNow();profile.hidden=!user;
  if(!user){profileMark='';return;}
  const mark=JSON.stringify([user.nick,user.name,user.av,user.status,user.avatar_video]);
  if(mark===profileMark)return;profileMark=mark;
  profile.querySelector('strong').textContent=user.name||user.nick;
  profile.querySelector('small').textContent='@'+user.nick;
  const avatar=profile.querySelector('.av');
  if(typeof window.setAvatarElement==='function')window.setAvatarElement(avatar,user);
  else avatar.innerHTML=window.avatarMarkup?.(user)||icon('user');
 }

 const fragments=document.createDocumentFragment();
 for(const [id,item] of Object.entries(definitions)){
  const screen=document.createElement('section');screen.className='settings-screen-v226';screen.dataset.settingsScreen=id;screen.hidden=true;
  if(id==='home')screen.append(profile);
  if(item.children){
   const list=document.createElement('nav');list.className='settings-list-v226';list.setAttribute('aria-label',id==='home'?'Разделы настроек':item.title);
   if(id==='home')list.id='settings-home-v160';list.append(...item.children.map(row));screen.append(list);
  }
  const actions=document.createElement('div');actions.className='settings-actions-v226';const content=document.createElement('div');content.className='settings-controls-v226';
  screen.append(actions,content);screens.set(id,{screen,actions,content});fragments.append(screen);
 }
 header.after(fragments);
 const nav=$('settings-home-v160');
 const contentRoute=node=>{
  const title=node.querySelector('.panel-section-title')?.textContent.trim()||'';
  if(node.matches('#pixel-eyes-settings-v155,#winter-settings-v225,#interface-motion-settings-v184,.interface-settings-v200'))return 'effects';
  if(node.matches('#wallpaper-settings-v119,.comfort-section-v167[data-settings-group=chats]'))return 'style';
  if(node.matches('#profile-layout-settings-v196')||node.querySelector('.theme-btns,.font-btns')||/^(Тема|Шрифт)$/.test(title))return 'theme';
  if(node.dataset.settingsGroup==='focus')return 'focus';
  if(node.dataset.settingsGroup==='data'||node.id==='media-settings-v179')return 'data';
  if(node.id==='interface-settings-v36'||node.dataset.settingsGroup==='chats'||/Проверка текста/.test(title))return 'composer';
  if(node.id==='connection-diagnostics-v176'||/Соединение/.test(title))return 'connection';
  if(node.id==='sleep-settings-v176')return 'music';
  if(node.id==='account-session-v76'||/Аккаунт/.test(title))return 'account';
  if(/Уведомления/.test(title))return 'notifications';
  return 'updates';
 };
 const actionRoute=node=>node.id==='browser-settings-v202'?'sites':
  node.id==='stats-open-v124'||node.id==='mc-settings-v187'||/Кошелёк/.test(node.querySelector('strong')?.textContent||'')?'account':'updates';
 function organize(){
  for(const node of [...panel.children]){
   if(node.id==='stats-open-v124'){screens.get('account').actions.append(node);continue;}
   if(node.classList.contains('panel-section'))screens.get(contentRoute(node)).content.append(node);
  }
  for(const node of [...nav.children])if(node instanceof HTMLButtonElement&&!node.dataset.settingsSection)screens.get(actionRoute(node)).actions.append(node);
  routeButtons.get('sites').hidden=!screens.get('sites').actions.children.length;
 }
 let pageId='home';
 function select(id,{restore=false,quiet=false}={}){
  if(!screens.has(id))id='home';
  const from=pageId;
  if(from!==id)scrollByPage.set(from,panel.scrollTop);
  pageId=id;panel.dataset.settingsView=id;screens.forEach(({screen},key)=>{screen.hidden=key!==id;});
  backButton.hidden=id==='home';
  if(id!=='home'){const label='Назад: '+definitions[definitions[id].parent].title;backButton.setAttribute('aria-label',label);backButton.title=label;}
  title.textContent=definitions[id].title;panel.scrollTop=restore?scrollByPage.get(id)||0:0;paintProfile();
  if(!quiet&&panel.classList.contains('open')){
   const previous=restore?routeButtons.get(from):null;
   if(previous?.getClientRects().length)previous.focus({preventScroll:true});else title.focus({preventScroll:true});
   document.dispatchEvent(new CustomEvent('exstra-settings-view-v184',{detail:{target:screens.get(id).screen}}));
  }
 }
 function back(){if(pageId==='home')return false;select(definitions[pageId].parent,{restore:true});return true;}
 backButton.onclick=back;
 // Browser and desktop shortcuts reopen the proper view after a nested dialog.
 panel.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||!panel.classList.contains('open'))return;
  const focusable=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')]
   .filter(node=>node.tabIndex>=0&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
  if(!focusable.length)return;
  const first=focusable[0],last=focusable.at(-1),current=document.activeElement;
  if(event.shiftKey&&(current===first||current===title)){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&current===last){event.preventDefault();first.focus();}
 });
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented||!panel.classList.contains('open')||document.querySelector('dialog[open],.qr-overlay-v131:not([hidden]),.modal-overlay.show'))return;
  if(back()){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 organize();select('home',{quiet:true});
 const observer=new MutationObserver(organize);observer.observe(panel,{childList:true});observer.observe(nav,{childList:true});
 let opened=panel.classList.contains('open');
 new MutationObserver(()=>{
  const next=panel.classList.contains('open');
  if(!next&&opened){scrollByPage.clear();select('home',{quiet:true});}
  if(next&&!opened){paintProfile();if(!panel.contains(document.activeElement))title.focus({preventScroll:true});}
  opened=next;
 }).observe(panel,{attributes:true,attributeFilter:['class']});
 window.addEventListener('telechat-user-updated-v123',()=>{if(panel.classList.contains('open'))paintProfile();});
 window.addEventListener('telechat-account-ready-v175',()=>{scrollByPage.clear();select('home',{quiet:true});});
 window.telechatSettingsV160=Object.freeze({openSection:select,back});
})();
