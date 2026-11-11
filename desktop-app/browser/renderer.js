'use strict';
(()=>{
 const api=window.exstraSites,$=id=>document.getElementById(id),input=$('address');
 let state=null,currentId=0,gridMark='',editing=null,editorPending=false,busy=false,opener=null,removeConfirm=false;
 const command=(action,data={})=>api.command({action,...data});
 const focus=()=>{if(editing)return;input.focus();input.select();};
 const icons={auto:['Автоматически','M5 5h5v5H5Zm9 0h5v5h-5ZM5 14h5v5H5Zm9 0h5v5h-5Z'],globe:['Сайт','M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3q-7 9 0 18 7-9 0-18'],music:['Музыка','M9 18V5l11-2v13M9 9l11-2M9 18c0 3-6 4-6 1s6-4 6-1Zm11-2c0 3-6 4-6 1s6-4 6-1Z'],video:['Видео','M4 4h16v16H4Zm5 4 7 4-7 4Z'],chat:['Общение','M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Zm3 6h8m-8 4h5'],code:['Разработка','m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18'],book:['Чтение','M12 5v16M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 2-4-4-9-2Z'],game:['Игры','M8 7h8q4 0 5 5l1 5q0 4-4 2l-3-3H9l-3 3q-4 2-4-2l1-5q1-5 5-5Zm-2 4v4m-2-2h4m8-2h.01m3 3h.01']};
 const svg=key=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+icons[key][1]+'"/></svg>';
 function paintIcon(node,item){
  const mark=JSON.stringify([item.name,item.url,item.icon,item.favicon||'']);if(node._iconMark===mark)return;node._iconMark=mark;
  node.replaceChildren();node.style.background='';node.style.color='';node.dataset.siteIcon='false';
  const key=icons[item.icon]?item.icon:'auto';
  if(key!=='auto'){node.innerHTML=svg(key);return;}
  if(typeof item.favicon==='string'&&item.favicon.length<180000&&/^data:image\/(?:png|x-icon);base64,[A-Za-z0-9+/=]+$/.test(item.favicon)){const img=document.createElement('img');img.className='site-favicon';img.alt='';img.width=28;img.height=28;img.decoding='async';img.onerror=()=>{if(img.parentNode===node)paintIcon(node,{...item,favicon:''});};node.dataset.siteIcon='true';img.src=item.favicon;node.append(img);return;}
  let host='';try{host=new URL(item.url).hostname.toLowerCase().replace(/^www\./,'');}catch{}
  const matches=domain=>host===domain||host.endsWith('.'+domain);
  const brands=[['vk.com','VK','#1976f3','#fff'],['soundcloud.com','music','#ff6700','#fff'],['mail.google.com','M','#f3eee8','#db4843'],['gmail.com','M','#f3eee8','#db4843'],['tiktok.com','music','#0b0c10','#fb779f'],['pinterest.com','P','#e92746','#fff'],['chatgpt.com','✳','#e6ece9','#172722'],['yandex.ru','Я','#fc5445','#fff'],['ya.ru','Я','#fc5445','#fff'],['youtube.com','video','#ee3e44','#fff'],['github.com','code','#e3e5eb','#20222b'],['dark178098345-star.github.io','E','#ac99ed','#21182e']];
  const brand=brands.find(value=>matches(value[0]));
  if(brand){node.style.background=brand[2];node.style.color=brand[3];if(icons[brand[1]])node.innerHTML=svg(brand[1]);else node.textContent=brand[1];}
  else{node.textContent=Array.from(item.name||host||'С')[0].toLocaleUpperCase('ru');}
 }
 function renderShortcuts(next){
  const items=Array.isArray(next.shortcuts)?next.shortcuts:[],ready=next.shortcutsReady!==false;
  const mark=JSON.stringify([items,ready,next.shortcutsError||'',next.shortcutsMax||24]);if(mark===gridMark)return;gridMark=mark;
  const grid=$('shortcut-grid'),old=new Map([...grid.querySelectorAll('.shortcut-tile')].map(node=>[node.dataset.id,node]));let index=0;
  for(const item of items){
   let tile=old.get(item.id);old.delete(item.id);
   if(!tile){tile=document.createElement('div');tile.className='shortcut-tile';tile.dataset.id=item.id;tile.innerHTML='<button type="button" class="shortcut-open"><span class="shortcut-icon" aria-hidden="true"></span><span class="shortcut-name"></span></button><button type="button" class="shortcut-menu" title="Изменить ярлык">···</button>';const open=tile.querySelector('.shortcut-open'),menu=tile.querySelector('.shortcut-menu'),saved=()=>state?.shortcuts?.find(value=>value.id===item.id)||item;
    open.onclick=event=>command('shortcut-open',{id:item.id,newTab:event.ctrlKey||event.metaKey});open.onauxclick=event=>{if(event.button===1){event.preventDefault();command('shortcut-open',{id:item.id,newTab:true});}};menu.onclick=()=>openEditor(saved(),menu);tile.oncontextmenu=event=>{event.preventDefault();openEditor(saved(),menu);};}
   const open=tile.querySelector('.shortcut-open');open.title=item.name+'\n'+item.url;tile.querySelector('.shortcut-name').textContent=item.name;tile.querySelector('.shortcut-menu').setAttribute('aria-label','Изменить: '+item.name);paintIcon(tile.querySelector('.shortcut-icon'),item);
   if(grid.children[index]!==tile)grid.insertBefore(tile,grid.children[index]||null);index++;
  }
  old.forEach(node=>node.remove());let add=grid.querySelector('.shortcut-add');if(!add){add=document.createElement('button');add.type='button';add.className='shortcut-add';add.innerHTML='<span class="shortcut-icon" aria-hidden="true">+</span><span class="shortcut-name">Добавить ярлык</span>';add.onclick=()=>openEditor({},add);}add.disabled=!ready||!!next.shortcutsError||items.length>=(next.shortcutsMax||24);add.title=add.disabled?'Можно сохранить до 24 ярлыков':'Добавить свой сайт';if(grid.lastElementChild!==add)grid.append(add);
  $('shortcut-error').hidden=!next.shortcutsError;$('shortcut-error').textContent=next.shortcutsError||'';
  updateTools();
 }
 function updateTools(){
  const index=(state?.shortcuts||[]).findIndex(item=>item.id===editing?.id);
  $('move-left').disabled=busy||index<=0;$('move-right').disabled=busy||index<0||index>=(state?.shortcuts?.length||0)-1;
 }
 function setBusy(value){busy=value;for(const control of $('shortcut-editor').querySelectorAll('button,input'))control.disabled=value;updateTools();$('editor-save').textContent=value?'Сохраняем…':'Сохранить';}
 function editorError(message=''){$('editor-error').hidden=!message;$('editor-error').textContent=message;}
 async function openEditor(item,source){
  if(editing||editorPending)return;editorPending=true;
  try{const result=await command('shortcut-editor',{open:true});if(!result?.ok)return;
   editing={...item,icon:icons[item.icon]?item.icon:'auto'};opener=source||document.activeElement;removeConfirm=false;
   $('editor-title').textContent=item.id?'Изменить ярлык':'Новый ярлык';$('shortcut-name').value=item.name||'';$('shortcut-url').value=item.url||'';$('edit-tools').hidden=!item.id;$('remove-shortcut').textContent='Удалить';
   for(const node of $('icon-options').children)node.setAttribute('aria-checked',String(node.dataset.icon===editing.icon));
   editorError();setBusy(false);document.body.dataset.editing='true';$('chrome').inert=true;$('stage').inert=true;$('editor-backdrop').hidden=false;$('shortcut-name').focus();$('shortcut-name').select();
  }catch{$('status').textContent='Не удалось открыть редактор. Попробуй ещё раз.';}finally{editorPending=false;}
 }
 async function closeEditor(){
  if(!editing||busy)return;editing=null;$('editor-backdrop').hidden=true;document.body.dataset.editing='false';$('chrome').inert=false;$('stage').inert=false;
  try{await command('shortcut-editor',{open:false});}catch{}
  if(!state?.tabs.find(tab=>tab.id===state.active)?.url&&opener?.isConnected)opener.focus();
 }
 async function changeShortcut(action,data,close=true){
  if(busy)return;setBusy(true);editorError();
  try{const result=await command(action,data);if(!result?.ok)editorError(result?.error||'Не удалось сохранить. Попробуй ещё раз.');else{setBusy(false);if(close)await closeEditor();return;}}catch{editorError('Нет ответа от приложения. Попробуй ещё раз.');}finally{setBusy(false);}
 }
 for(const [key,[label]]of Object.entries(icons)){
  const button=document.createElement('button');button.type='button';button.className='icon-option';button.dataset.icon=key;button.title=label;button.setAttribute('role','radio');button.setAttribute('aria-label',label);button.setAttribute('aria-checked','false');button.innerHTML=svg(key);button.onclick=()=>{if(!editing)return;editing.icon=key;for(const node of $('icon-options').children)node.setAttribute('aria-checked',String(node===button));};$('icon-options').append(button);
 }
 $('icon-options').setAttribute('role','radiogroup');$('icon-options').setAttribute('aria-label','Значок ярлыка');
 $('icon-options').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||busy)return;event.preventDefault();const choices=[...$('icon-options').children],index=choices.indexOf(document.activeElement),step=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;const next=choices[(index+step+choices.length)%choices.length];next.focus();next.click();});
 $('shortcut-form').onsubmit=event=>{event.preventDefault();if(editing)changeShortcut('shortcut-save',{entry:{...(editing.id?{id:editing.id}:{}),name:$('shortcut-name').value,url:$('shortcut-url').value,icon:editing.icon}});};
 $('editor-close').onclick=closeEditor;$('editor-cancel').onclick=closeEditor;
 $('move-left').onclick=()=>changeShortcut('shortcut-move',{id:editing.id,step:-1},false);$('move-right').onclick=()=>changeShortcut('shortcut-move',{id:editing.id,step:1},false);
 $('remove-shortcut').onclick=()=>{if(!removeConfirm){removeConfirm=true;$('remove-shortcut').textContent='Да, удалить';return;}changeShortcut('shortcut-remove',{id:editing.id});};
 $('editor-backdrop').onclick=event=>{if(event.target===$('editor-backdrop'))closeEditor();};
 document.addEventListener('keydown',event=>{if(!editing)return;if(event.key==='Escape'){event.preventDefault();closeEditor();}if(event.key==='Tab'){const controls=[...$('shortcut-editor').querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>!node.closest('[hidden]'));if(!controls.length){event.preventDefault();return;}const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 function render(next){
  if(!next||!Array.isArray(next.tabs))return;state=next;
  document.body.dataset.mode=next.mode||'embedded';$('dock').textContent=next.mode==='window'?'В раздел':'Отдельное окно';$('dock').title=next.mode==='window'?'Вернуть внутрь ExstraChat':'Вынести раздел в отдельное окно';
  const active=next.tabs.find(t=>t.id===next.active),switched=currentId!==next.active;currentId=next.active;
  const old=new Map([...$('tabs').children].map(n=>[Number(n.dataset.id),n]));
  for(const tab of next.tabs){
   let node=old.get(tab.id);old.delete(tab.id);
   if(!node){node=document.createElement('div');node.className='tab';node.dataset.id=tab.id;node.innerHTML='<button class="tab-select" role="tab"><span class="tab-mark" aria-hidden="true"></span><span class="tab-title"></span></button><button class="tab-close" aria-label="Закрыть вкладку">×</button>';node.querySelector('.tab-select').onclick=()=>command('select',{id:tab.id});node.querySelector('.tab-close').onclick=()=>command('close',{id:tab.id});$('tabs').append(node);}
   const selected=tab.id===next.active;node.setAttribute('aria-selected',String(selected));node.dataset.loading=String(tab.loading);node.dataset.error=String(!!tab.error);node.dataset.background=String(!!tab.background);
   const select=node.querySelector('.tab-select');select.setAttribute('aria-selected',String(selected));select.tabIndex=selected?0:-1;
   node.querySelector('.tab-title').textContent=tab.title;node.title=tab.title+(tab.url?'\n'+tab.url:'')+(tab.background?'\nФоновое прослушивание включено':'');node.querySelector('.tab-close').setAttribute('aria-label','Закрыть: '+tab.title);
   if(selected&&switched)node.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  old.forEach(node=>node.remove());
  if(switched||document.activeElement!==input)input.value=active?.url||'';
  $('back').disabled=!active?.canBack;$('forward').disabled=!active?.canForward;$('external').disabled=!active?.url;$('mute').disabled=!active?.url;$('new').disabled=next.tabs.length>=next.max;
  $('save-page').disabled=!active?.url||!!next.shortcutsError||(next.shortcuts?.length||0)>=(next.shortcutsMax||24)||next.shortcutsReady===false;
  $('background').disabled=!active?.url;$('background').setAttribute('aria-pressed',String(!!active?.background));$('background').title=active?.background?'Выключить фоновое прослушивание этой вкладки':'Слушать в фоне · только эта вкладка';
  $('pin').setAttribute('aria-pressed',String(!!next.alwaysOnTop));$('pin').title=next.alwaysOnTop?'Открепить окно от переднего плана':next.mode==='window'?'Закрепить окно поверх других приложений':'Вынести в небольшое окно поверх других приложений';
  const background=next.tabs.find(tab=>tab.background);$('background-status').hidden=!background;$('background-status').dataset.id=background?.id||'';$('background-status').querySelector('span').textContent=background?'В фоне: '+background.title:'';$('background-status').title=background?'Перейти к фоновой вкладке: '+background.title:'';
  $('reload').disabled=!active?.url;$('reload').setAttribute('aria-label',active?.loading?'Остановить загрузку':'Обновить');$('reload').title=active?.loading?'Остановить загрузку':'Обновить · Ctrl+R';
  $('reload').querySelector('path').setAttribute('d',active?.loading?'M7 7h10v10H7Z':'M20 11a8 8 0 1 0-2 6M20 4v7h-7');
  $('mute').setAttribute('aria-pressed',String(!!active?.muted));$('mute').setAttribute('aria-label',active?.muted?'Включить звук вкладки':'Выключить звук вкладки');$('mute').title=active?.muted?'Включить звук вкладки':'Выключить звук вкладки';
  $('protocol').textContent=active?.url?.startsWith('https:')?'HTTPS':active?.url?'HTTP':'↗';
  $('popup').hidden=!active?.popup;$('popup').title=active?.popup?'Открыть: '+active.popup:'';
  $('progress').hidden=!active?.loading;
  const empty=!active?.url||!!active?.error;$('empty').hidden=!empty;
  document.body.dataset.surface=active?.error?'error':empty?'home':'page';
  $('empty-title').textContent=active?.error?'Страница не открылась.':'Открывай по-своему.';
  $('empty-copy').textContent=active?.error||'Любимые сайты, музыка и новые открытия — рядом с твоими чатами.';
  $('retry').hidden=!active?.error;$('shortcuts').hidden=!!active?.error;$('favorites').hidden=!!active?.error;renderShortcuts(next);
  $('status').textContent=next.notice||active?.error||(active?.loading?'Открываем страницу…':'Страницы изолированы от чатов');$('status').dataset.notice=String(!!next.notice);$('status').title=$('status').textContent;$('dismiss').hidden=!next.notice;
  $('count').textContent=next.tabs.length+' / '+next.max;
  if(switched&&!active?.url)focus();
 }
 $('address-form').onsubmit=event=>{event.preventDefault();if(input.value.trim())command('navigate',{url:input.value});};
 for(const action of ['back','forward','new','external','popup','mute','dismiss','dock','home','background','pin'])$(action).onclick=()=>command(action);
 $('background-status').onclick=()=>command('select',{id:Number($('background-status').dataset.id)});
 $('reload').onclick=()=>command(state?.tabs.find(t=>t.id===state.active)?.loading?'stop':'reload');$('retry').onclick=()=>command('reload');
 $('save-page').onclick=()=>{const tab=state?.tabs.find(t=>t.id===state.active);if(tab?.url)openEditor({name:(tab.title||new URL(tab.url).hostname).slice(0,48),url:tab.url},$('save-page'));};
 $('tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();command(event.key==='ArrowRight'?'next-tab':'previous-tab');}});
 api.onState(render);api.onFocus(focus);api.state().then(render);input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value=state?.tabs.find(t=>t.id===state.active)?.url||'';input.blur();}});
})();
