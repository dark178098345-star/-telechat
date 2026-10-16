/* Compact settings navigation; original controls and listeners are retained. */
(()=>{
 'use strict';
 const panel=document.getElementById('settings-panel');if(!panel)return;
 const self=()=>typeof me!=='undefined'?me:null;
 const groups=[['account','Мой аккаунт','user'],['notifications','Уведомления и звуки','bell'],['chats','Оформление сообщений','mail'],['focus','Режим фокуса','eye'],['appearance','Внешний вид ExstraChat','palette'],['connection','Соединение','globe'],['music','Музыка','music'],['app','Приложение','phone']];
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const nav=document.createElement('nav');nav.id='settings-home-v160';nav.setAttribute('aria-label','Разделы настроек');
 function entry(title,symbol,action,id){const b=document.createElement('button');b.type='button';if(id)b.dataset.settingsSection=id;b.innerHTML=icon(symbol)+'<span><strong>'+title+'</strong></span><span aria-hidden="true">›</span>';b.onclick=action;nav.append(b);}
 for(const [id,title,symbol] of groups)entry(title,symbol,()=>select(id),id);
 entry('Живые глазки','eye',()=>window.telechatPixelEyesV155?.open());
 const stats=document.getElementById('stats-open-v124');if(stats)entry('Статистика','chart',()=>stats.click());
 const profile=document.createElement('section');profile.id='settings-profile-v165';profile.innerHTML='<button type="button" class="settings-profile-main-v165"><span class="settings-profile-avatar-v165 av"></span><span class="settings-profile-copy-v165"><strong></strong><small></small><span>Редактировать профиль</span></span></button><button type="button" class="settings-profile-qr-v165" aria-label="Мой QR">'+icon('globe')+'</button>';
 profile.querySelector('.settings-profile-main-v165').onclick=()=>{if(!self())return;window.buildProfPanel?.();window.openPanel?.('profile-panel');};
 profile.querySelector('.settings-profile-qr-v165').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h3v3h3v3h-6M12 3v3M3 12h6M12 12h3M12 21v-6"/></svg>';
 profile.querySelector('.settings-profile-qr-v165').onclick=()=>window.telechatQrV131?.open();
 const back=document.createElement('button');back.type='button';back.id='settings-back-v160';back.innerHTML='<span aria-hidden="true">‹</span><span>Все настройки</span>';back.onclick=()=>select('home');
 const heading=document.createElement('h2');heading.id='settings-title-v160';
 panel.querySelector('.panel-head')?.after(profile,nav,back,heading);panel.classList.add('settings-navigation-v160');
 let profileMark='';
 function paintProfile(){const user=self();profile.hidden=!user;if(!user){profileMark='';return;}const mark=JSON.stringify([user.nick,user.name,user.av,user.status,user.avatar_video]);if(mark===profileMark)return;profileMark=mark;profile.querySelector('strong').textContent=user.name||user.nick;profile.querySelector('small').textContent='@'+user.nick;const avatar=profile.querySelector('.av');if(typeof window.setAvatarElement==='function')window.setAvatarElement(avatar,user);else avatar.innerHTML=window.avatarMarkup?.(user)||icon('user');}
 function classify(){for(const node of panel.children){if(!node.matches('.panel-section,#stats-open-v124'))continue;let group=node.classList.contains('comfort-section-v167')?node.dataset.settingsGroup:'app';const title=node.querySelector('.panel-section-title')?.textContent||'';if(!node.classList.contains('comfort-section-v167')){if(node===stats||/Аккаунт/.test(title))group='account';else if(/Уведомления/.test(title))group='notifications';else if(/Соединение/.test(title))group='connection';else if(node.id==='sleep-settings-v176')group='music';else if(/Тема|Шрифт|Интерфейс|Фотофон|Живые глазки/.test(title))group='appearance';}node.dataset.settingsGroup=group;node.hidden=panel.dataset.settingsView==='home'||panel.dataset.settingsView!==group;}}
 function select(id){if(id!=='home'&&!groups.some(g=>g[0]===id))id='home';panel.dataset.settingsView=id;const title=groups.find(g=>g[0]===id)?.[1]||'Настройки';heading.textContent=title;panel.querySelector('.panel-title').textContent=title;panel.scrollTop=0;classify();paintProfile();}
 classify();select('home');
 new MutationObserver(classify).observe(panel,{childList:true});
 let opened=panel.classList.contains('open');new MutationObserver(()=>{const next=panel.classList.contains('open');if(next&&!opened)select('home');if(next)paintProfile();opened=next;}).observe(panel,{attributes:true,attributeFilter:['class']});
 window.addEventListener('telechat-user-updated-v123',()=>{if(panel.classList.contains('open'))paintProfile();});
 window.telechatSettingsV160={openSection:select};
})();
