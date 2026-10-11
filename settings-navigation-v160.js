/* Reuse existing controls and listeners; no copies, requests or preference migrations. */
(()=>{
 'use strict';
 const panel=document.getElementById('settings-panel');if(!panel)return;
 const groups=[['appearance','Внешний вид tele.chat','Тема, размер текста, фотофон и живые глазки','palette'],['notifications','Уведомления и звуки','Звуки сообщений и уведомления приложения','bell'],['account','Аккаунт','Текущий сеанс и выход из аккаунта','user'],['app','Приложение','Установка и дополнительные параметры','phone']];
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const nav=document.createElement('nav');nav.id='settings-home-v160';nav.setAttribute('aria-label','Разделы настроек');
 for(const [id,title,note,symbol] of groups){const b=document.createElement('button');b.type='button';b.dataset.settingsSection=id;b.innerHTML=icon(symbol)+'<span><strong>'+title+'</strong><small>'+note+'</small></span><span aria-hidden="true">›</span>';b.onclick=()=>select(id);nav.append(b);}
 const stats=document.getElementById('stats-open-v124');if(stats){const b=document.createElement('button');b.type='button';b.innerHTML=icon('chart')+'<span><strong>Статистика</strong><small>Активность, уровень, музыка и память</small></span><span aria-hidden="true">›</span>';b.onclick=()=>stats.click();nav.append(b);}
 const back=document.createElement('button');back.type='button';back.id='settings-back-v160';back.innerHTML='<span aria-hidden="true">‹</span><span>Все настройки</span>';back.onclick=()=>select('home');
 const heading=document.createElement('h2');heading.id='settings-title-v160';
 panel.querySelector('.panel-head')?.after(nav,back,heading);panel.classList.add('settings-navigation-v160');
 function classify(){for(const node of panel.children){if(!node.matches('.panel-section,#stats-open-v124'))continue;let group='app';const title=node.querySelector('.panel-section-title')?.textContent||'';if(node===stats||/Аккаунт/.test(title))group='account';else if(/Уведомления/.test(title))group='notifications';else if(/Тема|Шрифт|Интерфейс|Фотофон|Живые глазки/.test(title))group='appearance';node.dataset.settingsGroup=group;}}
 function select(id){panel.dataset.settingsView=id;heading.textContent=groups.find(g=>g[0]===id)?.[1]||'';panel.scrollTop=0;}
 classify();select('home');
 new MutationObserver(classify).observe(panel,{childList:true});
 let opened=panel.classList.contains('open');new MutationObserver(()=>{const next=panel.classList.contains('open');if(next&&!opened)select('home');opened=next;}).observe(panel,{attributes:true,attributeFilter:['class']});
 window.telechatSettingsV160={openSection:select};
})();
