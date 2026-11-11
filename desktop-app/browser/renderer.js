'use strict';
(()=>{
 const api=window.exstraSites,$=id=>document.getElementById(id),input=$('address');
 let state=null,currentId=0;
 const command=(action,data={})=>api.command({action,...data});
 const focus=()=>{input.focus();input.select();};
 function render(next){
  if(!next||!Array.isArray(next.tabs))return;state=next;
  document.body.dataset.mode=next.mode||'embedded';$('dock').textContent=next.mode==='window'?'В раздел':'Отдельное окно';$('dock').title=next.mode==='window'?'Вернуть внутрь ExstraChat':'Вынести раздел в отдельное окно';
  const active=next.tabs.find(t=>t.id===next.active),switched=currentId!==next.active;currentId=next.active;
  const old=new Map([...$('tabs').children].map(n=>[Number(n.dataset.id),n]));
  for(const tab of next.tabs){
   let node=old.get(tab.id);old.delete(tab.id);
   if(!node){node=document.createElement('div');node.className='tab';node.dataset.id=tab.id;node.innerHTML='<button class="tab-select" role="tab"><span class="tab-mark" aria-hidden="true"></span><span class="tab-title"></span></button><button class="tab-close" aria-label="Закрыть вкладку">×</button>';node.querySelector('.tab-select').onclick=()=>command('select',{id:tab.id});node.querySelector('.tab-close').onclick=()=>command('close',{id:tab.id});$('tabs').append(node);}
   const selected=tab.id===next.active;node.setAttribute('aria-selected',String(selected));node.dataset.loading=String(tab.loading);node.dataset.error=String(!!tab.error);
   const select=node.querySelector('.tab-select');select.setAttribute('aria-selected',String(selected));select.tabIndex=selected?0:-1;
   node.querySelector('.tab-title').textContent=tab.title;node.title=tab.title+(tab.url?'\n'+tab.url:'');node.querySelector('.tab-close').setAttribute('aria-label','Закрыть: '+tab.title);
   if(selected&&switched)node.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  old.forEach(node=>node.remove());
  if(switched||document.activeElement!==input)input.value=active?.url||'';
  $('back').disabled=!active?.canBack;$('forward').disabled=!active?.canForward;$('external').disabled=!active?.url;$('mute').disabled=!active?.url;$('new').disabled=next.tabs.length>=next.max;
  $('reload').disabled=!active?.url;$('reload').setAttribute('aria-label',active?.loading?'Остановить загрузку':'Обновить');$('reload').title=active?.loading?'Остановить загрузку':'Обновить · Ctrl+R';
  $('reload').querySelector('path').setAttribute('d',active?.loading?'M7 7h10v10H7Z':'M20 11a8 8 0 1 0-2 6M20 4v7h-7');
  $('mute').setAttribute('aria-pressed',String(!!active?.muted));$('mute').setAttribute('aria-label',active?.muted?'Включить звук вкладки':'Выключить звук вкладки');$('mute').title=active?.muted?'Включить звук вкладки':'Выключить звук вкладки';
  $('protocol').textContent=active?.url?.startsWith('https:')?'HTTPS':active?.url?'HTTP':'↗';
  $('popup').hidden=!active?.popup;$('popup').title=active?.popup?'Открыть: '+active.popup:'';
  $('progress').hidden=!active?.loading;
  const empty=!active?.url||!!active?.error;$('empty').hidden=!empty;
  $('empty-title').textContent=active?.error?'Страница не открылась.':'Чуть дальше привычного.';
  $('empty-copy').textContent=active?.error||'Вставь ссылку сверху — и открой свою следующую страницу.';
  $('retry').hidden=!active?.error;$('shortcuts').hidden=!!active?.error;
  $('status').textContent=next.notice||active?.error||(active?.loading?'Открываем страницу…':'Страницы изолированы от чатов');$('status').dataset.notice=String(!!next.notice);$('status').title=$('status').textContent;$('dismiss').hidden=!next.notice;
  $('count').textContent=next.tabs.length+' / '+next.max;
  if(switched&&!active?.url)focus();
 }
 $('address-form').onsubmit=event=>{event.preventDefault();if(input.value.trim())command('navigate',{url:input.value});};
 for(const action of ['back','forward','new','external','popup','mute','dismiss','dock','home'])$(action).onclick=()=>command(action);
 $('reload').onclick=()=>command(state?.tabs.find(t=>t.id===state.active)?.loading?'stop':'reload');$('retry').onclick=()=>command('reload');
 $('tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();command(event.key==='ArrowRight'?'next-tab':'previous-tab');}});
 api.onState(render);api.onFocus(focus);api.state().then(render);input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value=state?.tabs.find(t=>t.id===state.active)?.url||'';input.blur();}});
})();
