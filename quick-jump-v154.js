/* One small, on-demand navigator. It searches loaded conversations without requests. */
(()=>{
  'use strict';
  const self=()=>typeof me!=='undefined'?String(me?.nick||''):'';
  const icon=name=>name==='qr'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6v-3M21 12v3M12 3v3M3 12h6M12 12h3M12 21v-6"/></svg>':window.telechatIconsV125?.html(name)||'';
  const compass='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></svg>';
  let dialog,input,list,owner='',opener=null,restore=true,items=[],shown=[],selected=0;
  function fold(text){return String(text||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();}
  function layouts(text){const en="qwertyuiop[]asdfghjkl;'zxcvbnm,.",ru='йцукенгшщзхъфывапролджэячсмитьбю';return [text,[...text].map(c=>en.includes(c)?ru[en.indexOf(c)]:c).join(''),[...text].map(c=>ru.includes(c)?en[ru.indexOf(c)]:c).join('')];}
  function collect(){
    const commands=[
      ['Музыка','Твоя волна и любимые треки','music','музыка music треки песни',()=>window.telechatMusicHubV117?.open()],
      ['Мой профиль','Твой маленький мир','user','профиль profile аккаунт',()=>window.previewMyProfile?.()],
      ['Моя статистика','Посмотри, как растёт твой уровень','chart','статистика stats уровень level',()=>window.telechatActivityV124?.open()],
      ['Мой QR','Встретимся одним сканированием','qr','qr куар код сканировать',()=>window.telechatQrV131?.open()],
      ['Настройки','Сделай tele.chat своим','settings','настройки settings тема уведомления',()=>window.telechatNavigate?.('settings')]
    ].map(([name,description,symbol,search,run])=>({name,description,symbol,search,run,type:'Раздел'}));
    const chats=[...document.querySelectorAll('#contacts-list .contact')].slice(0,300).map(row=>{
      const label=row.querySelector('.contact-name')?.cloneNode(true);label?.querySelectorAll('svg,button,small,.room-type-badge,.room-owner-star,.verified-badge,.user-role-badge').forEach(n=>n.remove());
      const nick=row.dataset.contactNick||row.dataset.nick||'',name=label?.textContent.trim()||nick;
      const room=!!row.querySelector('.room-avatar,.room-type-badge');
      return {name,description:nick?'@'+nick:room?'Группа или канал':'Переписка',symbol:room?'users':'mail',search:name+' '+nick,run:()=>{if(row.isConnected)row.click();else window.showToast?.('Список чатов обновился. Открой переход ещё раз.');},type:'Чат'};
    }).filter(row=>row.name);
    return [...chats,...commands];
  }
  function setSelected(index){
    selected=Math.max(0,Math.min(shown.length-1,index));
    [...list.children].forEach((row,i)=>{row.classList.toggle('qj-selected-v154',i===selected);row.setAttribute('aria-current',String(i===selected));});
    list.children[selected]?.scrollIntoView({block:'nearest'});
  }
  function render(){
    const terms=layouts(fold(input.value));
    const query=terms[0];shown=items.filter(item=>!query||terms.some(term=>fold(item.search+' '+item.name+' '+item.description).includes(term))).slice(0,24);
    if(!query)shown=[...items.filter(item=>item.type==='Раздел'),...items.filter(item=>item.type==='Чат')].slice(0,14);
    list.replaceChildren();
    shown.forEach((item,index)=>{
      const row=document.createElement('button');row.type='button';row.className='qj-item-v154';row.innerHTML='<span class="qj-symbol-v154">'+icon(item.symbol)+'</span><span class="qj-copy-v154"><strong></strong><small></small></span><span class="qj-arrow-v154" aria-hidden="true">↗</span>';
      row.querySelector('strong').textContent=item.name;row.querySelector('small').textContent=item.description;row.onclick=()=>choose(index);list.append(row);
    });
    dialog.querySelector('.qj-empty-v154').hidden=shown.length>0;
    dialog.querySelector('.qj-count-v154').textContent=query?'Найдено: '+shown.length:'Разделы и твои разговоры';setSelected(0);
  }
  function close(focus=true){restore=focus;dialog?.close();}
  async function choose(index){
    if(owner!==self()){close();return;}const item=shown[index];if(!item)return;
    close(false);try{await item.run();}catch(_){window.showToast?.('Не удалось открыть. Попробуй ещё раз.');}
  }
  function ensure(){
    if(dialog)return;dialog=document.createElement('dialog');dialog.id='quick-jump-v154';dialog.setAttribute('aria-labelledby','qj-title-v154');
    dialog.innerHTML='<header><div class="qj-mark-v154">'+compass+'</div><div><small>ВСЁ РЯДОМ</small><h2 id="qj-title-v154">Куда отправимся?</h2></div><button type="button" class="qj-close-v154" aria-label="Закрыть">'+icon('close')+'</button></header><div class="qj-search-v154">'+icon('search')+'<input type="search" placeholder="Имя, чат или раздел…" aria-label="Найти чат или раздел" autocomplete="off" autocapitalize="none" spellcheck="false"><kbd>Esc</kbd></div><div class="qj-count-v154"></div><div class="qj-list-v154"></div><p class="qj-empty-v154" hidden>Пока ничего не нашлось. Попробуй часть имени или название раздела.</p><footer><span>Одно движение — и ты на месте.</span><span class="qj-keys-v154">↑ ↓ <span>выбрать</span> ↵ <span>открыть</span></span></footer>';
    document.body.append(dialog);input=dialog.querySelector('input');list=dialog.querySelector('.qj-list-v154');
    input.addEventListener('input',render);dialog.querySelector('.qj-close-v154').onclick=()=>close();
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('close',()=>{items=[];shown=[];list.replaceChildren();input.value='';trigger.setAttribute('aria-expanded','false');if(restore&&opener?.isConnected)opener.focus({preventScroll:true});opener=null;});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  }
  function open(){
    if(!self()||!document.getElementById('chat-screen')?.classList.contains('active'))return;ensure();if(dialog.open){input.focus();return;}owner=self();opener=document.activeElement;restore=true;items=collect();input.value='';render();dialog.showModal();trigger.setAttribute('aria-expanded','true');input.focus();
  }
  const sidebar=document.getElementById('sidebar');if(!sidebar)return;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='quick-jump-trigger-v154';trigger.innerHTML=compass+'<span>Переход</span>';trigger.setAttribute('aria-label','Быстрый переход');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','quick-jump-v154');trigger.setAttribute('aria-expanded','false');trigger.title='Быстрый переход · Ctrl+K';trigger.onclick=open;
  const desktop=matchMedia('(min-width:901px), (min-width:721px) and (pointer:fine)');
  function place(){const parent=desktop.matches?sidebar.querySelector('.section-rail-v109'):sidebar.querySelector('.sidebar-brand-row');if(parent&&trigger.parentNode!==parent)parent.append(trigger);}
  place();desktop.addEventListener?.('change',place);
  document.addEventListener('keydown',e=>{
    if(dialog?.open){
      if(owner!==self()){close();return;}
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(e.target===input&&!e.isComposing&&['ArrowDown','ArrowUp','Enter'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Enter')void choose(selected);else setSelected(selected+(e.key==='ArrowDown'?1:-1));}
    }else if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='k'&&self()&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('voice-call-full-v32')){e.preventDefault();e.stopImmediatePropagation();open();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog?.open)close();});
  const screen=document.getElementById('chat-screen');if(screen)new MutationObserver(()=>{if(dialog?.open&&(!screen.classList.contains('active')||owner!==self()))close();}).observe(screen,{attributes:true,attributeFilter:['class']});
  window.telechatQuickJumpV154=Object.freeze({open,close});
})();
