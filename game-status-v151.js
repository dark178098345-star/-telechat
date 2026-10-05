(()=>{
 'use strict';
 const cache=new Map(),jobs=new Map(),versions=new Map();
 let dialog,owner='',busy=false,filter='all',returnFocus;
 const normalize=value=>String(value||'').trim().toLowerCase();
 const account=()=>typeof me!=='undefined'?me:null;
 const self=()=>normalize(account()?.nick);
 const catalogue=window.telechatGameCatalogV151||[];
 const fold=value=>normalize(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ё/g,'е');
 const entries=catalogue.map(item=>({...item,search:fold(item.title)}));
 const label=item=>item?.title?(item.kind==='app'?'Использует ':'Играет в ')+item.title:'';
 const icon=(kind='game')=>{const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.setAttribute('viewBox','0 0 24 24');node.setAttribute('aria-hidden','true');node.setAttribute('class','game-icon-v151');node.innerHTML=kind==='app'?'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>':'<path d="M7 7h10c2 0 3 2 3.5 4l1 5c.5 3-2 4-4 2l-2-2h-7l-2 2c-2 2-4.5 1-4-2l1-5C4 9 5 7 7 7Z"/><path d="M6 11v4m-2-2h4m7-2h.01M18 14h.01"/>';return node;};
 function valid(row){return row&&['game','app'].includes(row.kind)&&typeof row.title==='string'&&row.title.trim()&&row.title.length<=80?{kind:row.kind,title:row.title}:null;}
 function get(nick){const item=cache.get(normalize(nick));return item&&Date.now()-item.at<90000?item.value:null;}
 function repaint(){window.telechatPresenceV120?.paintProfile();paintQuick();window.dispatchEvent(new CustomEvent('telechat-game-status-v151'));if(dialog?.open&&owner===self())paintCurrent();}
 async function refresh(nick,force=false){
  nick=normalize(nick);if(!nick||document.hidden||navigator.onLine===false||typeof sb==='undefined')return;
  if(jobs.has(nick))return jobs.get(nick);
  if(!force&&Date.now()-(cache.get(nick)?.checked||0)<15000)return;
  const prior=cache.get(nick);cache.set(nick,{...prior,checked:Date.now()});
  const version=versions.get(nick)||0,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  const task=(async()=>{try{
   const result=await sb.from('game_status_v151').select('nick,kind,title,updated_at').eq('nick',nick).maybeSingle().abortSignal(controller.signal);
   if(result.error)throw result.error;
   if((versions.get(nick)||0)===version)cache.set(nick,{value:valid(result.data),at:Date.now(),checked:Date.now()});
  }catch(_){/* Keep a short-lived last confirmed value; never turn a read failure into a saved reset. */}
  finally{clearTimeout(timer);jobs.delete(nick);repaint();}})();
  jobs.set(nick,task);return task;
 }
 function paintQuick(card=document.getElementById('profile-quick-v91')){
  if(!card||card.hidden)return;
  const item=get(self()),button=card.querySelector('[data-pq="game"] span');
  if(button)button.textContent=item?'Изменить игровой статус':'Добавить игровой статус';
 }
 function paintCurrent(){const item=get(owner),node=dialog.querySelector('.gs-current');node.replaceChildren(icon(item?.kind));const text=document.createElement('span');text.textContent=item?label(item):'Игровой статус не выбран';node.append(text);dialog.querySelector('.gs-clear').hidden=!item;}
 function error(text){dialog.querySelector('.gs-error').textContent=text;}
 function setBusy(value){busy=value;dialog.querySelectorAll('button,input').forEach(node=>node.disabled=value);dialog.setAttribute('aria-busy',String(value));}
 async function save(item){
  if(busy||!owner||owner!==self())return;
  const nick=owner,user=account(),pass=user?.pass||(normalize(document.getElementById('l-login')?.value)===nick?document.getElementById('l-pass')?.value:'');
  if(!pass){error('Войди в аккаунт заново, чтобы изменить статус.');return;}
  error('');setBusy(true);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  // In-flight reads from before the write may not overwrite the confirmed result.
  versions.set(nick,(versions.get(nick)||0)+1);
  try{
   const result=await sb.rpc('telechat_game_status_v151',{p_nick:nick,p_pass:pass,p_kind:item?.kind||null,p_title:item?.title||null}).abortSignal(controller.signal);
   if(result.error)throw result.error;
   if(self()!==nick)return;
   versions.set(nick,(versions.get(nick)||0)+1);cache.set(nick,{value:valid(result.data),at:Date.now(),checked:Date.now()});repaint();close();
   window.dispatchEvent(new CustomEvent('telechat-game-status-v151',{detail:{nick}}));
  }catch(_){if(self()===nick)error('Не удалось сохранить статус. Проверь соединение и попробуй ещё раз.');}
  finally{clearTimeout(timer);setBusy(false);}
 }
 function render(){
  const query=fold(dialog.querySelector('input').value),list=dialog.querySelector('.gs-results');
  const matches=entries.filter(item=>(filter==='all'||item.kind===filter)&&item.search.includes(query));
  const fragment=document.createDocumentFragment();
  for(const item of matches.slice(0,60)){const button=document.createElement('button');button.type='button';button.className='gs-option';button.append(icon(item.kind));const text=document.createElement('span');text.textContent=item.title;const small=document.createElement('small');small.textContent=item.kind==='game'?'Игра':'Приложение';button.append(text,small);button.addEventListener('click',()=>save(item));fragment.append(button);}
  list.replaceChildren(fragment);
  dialog.querySelector('.gs-count').textContent=matches.length?'Найдено: '+matches.length+(matches.length>60?' · уточни поиск, чтобы увидеть остальные':''):'Нет совпадений — можно указать своё название';
  const custom=dialog.querySelector('.gs-custom'),title=dialog.querySelector('input').value.trim();custom.hidden=!title;
  custom.querySelector('span').textContent='Свой вариант: '+title;
 }
 function close(){if(dialog?.open)dialog.close();returnFocus?.focus?.({preventScroll:true});}
 function ensure(){
  if(dialog)return;dialog=document.createElement('dialog');dialog.id='game-status-v151';dialog.setAttribute('aria-labelledby','gs-title-v151');
  dialog.innerHTML='<div class="gs-heading"><div><span class="gs-eyebrow">ТВОЯ АКТИВНОСТЬ</span><h2 id="gs-title-v151">Игровой статус</h2></div><button type="button" class="gs-close" aria-label="Закрыть">×</button></div><p class="gs-help">Выбери, во что играешь или каким приложением пользуешься. Друзья увидят это в профиле вместо музыки, пока ты в сети или в фоне.</p><div class="gs-current"></div><button type="button" class="gs-clear">Убрать игровой статус</button><label class="gs-search"><span>Поиск игры или приложения</span><input type="search" maxlength="80" placeholder="Minecraft, Dota 2, Blender…" autocomplete="off"></label><div class="gs-filters" role="group" aria-label="Категория"><button type="button" data-filter="all" aria-pressed="true">Все</button><button type="button" data-filter="game" aria-pressed="false">Игры</button><button type="button" data-filter="app" aria-pressed="false">Приложения</button></div><div class="gs-count" aria-live="polite"></div><div class="gs-results"></div><div class="gs-custom" hidden><span></span><div><button type="button" data-custom="game">Игра</button><button type="button" data-custom="app">Приложение</button></div></div><p class="gs-error" role="alert"></p><p class="gs-note">Ручной статус · сохраняется для аккаунта, пока ты его не уберёшь. Запущенные программы не отслеживаются.</p>';
  document.body.append(dialog);dialog.querySelector('.gs-close').addEventListener('click',close);dialog.querySelector('.gs-clear').addEventListener('click',()=>save(null));dialog.querySelector('input').addEventListener('input',render);
  dialog.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;dialog.querySelectorAll('[data-filter]').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));render();}));
  dialog.querySelectorAll('[data-custom]').forEach(button=>button.addEventListener('click',()=>{const title=dialog.querySelector('input').value.replace(/[\x00-\x1f\x7f]/g,'').trim();if(title)save({kind:button.dataset.custom,title});}));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy)close();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)close();}},true);
 }
 async function open(){if(!self())return;ensure();if(busy)return;owner=self();returnFocus=document.querySelector('[data-nav="profile"]');filter='all';dialog.querySelector('input').value='';dialog.querySelectorAll('[data-filter]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.filter==='all')));error('');paintCurrent();render();if(!dialog.open)dialog.showModal();dialog.querySelector('input').focus();await refresh(owner,true);}
 window.telechatGameStatusV151=Object.freeze({open,get,refresh,label,icon,paintQuick});
 setInterval(()=>{if(document.hidden)return;if(dialog?.open&&owner!==self()){close();return;}const quick=document.getElementById('profile-quick-v91');if(dialog?.open||(quick&&!quick.hidden))refresh(self());},15000);
})();
