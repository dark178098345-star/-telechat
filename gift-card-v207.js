/* One on-demand gift detail dialog. No wallet writes, polling or media decoders. */
(()=>{
 'use strict';
 let dialog,current=null;
 const themes=new Set(['violet','blue','cyan','rose','amber','red','green','black','orange','indigo']);
 const rarities={common:'Обычный',rare:'Редкий',epic:'Эпический',legendary:'Легендарный',mythic:'Мифический'};
 const owner=()=>window.exstraWalletV197?.owner()||'';
 const icon=name=>window.telechatIconsV125?.html(name)||'';
 const nick=value=>/^[a-z0-9_]{1,64}$/.test(String(value||''))?String(value):'';
 const price=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value).toLocaleString('ru-RU')+' Лун':'Не указана';
 function date(value){const d=new Date(typeof value==='string'&&/^\d+$/.test(value)?Number(value):value);return value&&Number.isFinite(d.getTime())?d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'Не указана';}
 function cached(value){try{return userCache[value]||(me?.nick===value?me:null);}catch(_){return null;}}
 function close(restore=true){if(current)current.restore=restore;dialog?.close();}
 function build(){
  dialog=document.createElement('dialog');dialog.id='gift-card-v207';dialog.className='ex-wallet-dialog-v197 ex-gift-card-v207';
  dialog.setAttribute('aria-labelledby','gift-card-title-v207');
  dialog.innerHTML=`<div class="ex-gift-hero-v207">
   <div class="ex-gift-top-v207"><span>EXSTRACHAT GIFTS</span><button type="button" data-gift-card-close aria-label="Закрыть карточку подарка">${icon('close')}</button></div>
   <div class="ex-gift-stage-v207" aria-hidden="true"><span class="ex-gift-orbit-v207"></span><div data-gift-card-art></div></div>
   <div class="ex-gift-caption-v207"><span data-gift-card-series></span><h2 id="gift-card-title-v207"></h2><p data-gift-card-subtitle></p></div>
  </div><div class="ex-gift-body-v207"><dl data-gift-card-details></dl><blockquote data-gift-card-note hidden></blockquote>
   <p class="ex-gift-card-status-v207" role="status" data-gift-card-status></p>
   <button type="button" class="ex-gift-card-action-v207" data-gift-card-action></button><p class="ex-gift-footnote-v207" data-gift-card-footnote></p>
  </div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-gift-card-close]').onclick=()=>close();
  let outside=false;dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog;});
  dialog.addEventListener('click',e=>{if(outside&&e.target===dialog)close();outside=false;});
  dialog.querySelector('[data-gift-card-action]').onclick=act;
  dialog.addEventListener('close',()=>{if(dialog.open)return;const view=current;current=null;view?.host?.removeEventListener('close',view.onHostClose);if(view?.restore&&view.account===owner()&&view.trigger?.isConnected&&view.host?.open)view.trigger.focus({preventScroll:true});});
 }
 function row(label,value){const block=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;if(value?.nodeType)detail.append(value);else detail.textContent=String(value);block.append(term,detail);dialog.querySelector('[data-gift-card-details]').append(block);return detail;}
 function avatar(user){const shared=window.exstraWalletRecipientsV198?.avatar;if(shared)return shared(user);const node=document.createElement('span');node.className='ex-recipient-avatar-v198';node.textContent=String(user?.name||user?.nick||'?').slice(0,1).toLocaleUpperCase('ru-RU');return node;}
 function person(value,view){
  const name=nick(value);if(!name)return document.createTextNode('Не указан');
  const button=document.createElement('button');button.type='button';button.className='ex-gift-person-v207';button.dataset.giftPerson=name;button.title='Открыть профиль @'+name;
  const paint=user=>{const label=document.createElement('span');label.textContent=user?.name||'@'+name;button.replaceChildren(avatar(user||{nick:name}),label);};paint(cached(name));
  button.disabled=typeof window.openUserProfile!=='function';button.onclick=()=>{if(current!==view||view.account!==owner())return;close(false);view.host?.close();Promise.resolve(window.openUserProfile?.(name)).catch(()=>window.showToast?.('Не удалось открыть профиль'));};
  if(!cached(name)){
   let timer;Promise.race([Promise.resolve().then(()=>window.telechatUserCacheV123?.get(name)||window.getUser?.(name)),new Promise(resolve=>timer=setTimeout(()=>resolve(null),5000))])
    .then(user=>{if(current===view&&view.account===owner()&&dialog.open&&user?.nick===name)paint(user);}).catch(()=>{}).finally(()=>clearTimeout(timer));
  }
  return button;
 }
 async function act(){
  const view=current;if(!view||view.account!==owner()||view.working)return;
  if(view.owned){close();return;}
  if(!view.recipient){close(false);view.onChoose?.();return;}
  const button=dialog.querySelector('[data-gift-card-action]'),status=dialog.querySelector('[data-gift-card-status]');
  view.working=true;button.disabled=true;status.textContent='';
  try{const result=await view.onSend?.(value=>{if(current===view&&view.account===owner())status.textContent=value;});if(current!==view||view.account!==owner())return;if(result?.ok)close();else if(!result?.cancelled)status.textContent=result?.error||'Подарок не отправлен. Попробуй ещё раз.';}
  catch(error){if(current===view&&view.account===owner())status.textContent=error?.message||'Не удалось отправить подарок';}
  finally{view.working=false;if(current===view)button.disabled=view.ended;}
 }
 function open(gift,options={}){
  if(!gift||!owner())return;if(!dialog)build();
  current?.host?.removeEventListener('close',current.onHostClose);
  const view={...options,account:owner(),owned:options.owned===true,recipient:nick(options.recipient),restore:true,working:false};
  view.ended=!view.owned&&!!gift.limited&&Number(gift.available_until)<=Date.now();view.onHostClose=()=>{if(current===view)close(false);};current=view;view.host?.addEventListener('close',view.onHostClose);
  dialog.dataset.theme=themes.has(gift.theme)?gift.theme:'violet';dialog.dataset.owned=String(view.owned);
  const get=selector=>dialog.querySelector(selector),id=gift.gift_id||gift.id;
  // Detail gradients must not resolve to a hidden SVG in the catalog/collection.
  get('[data-gift-card-art]').innerHTML=(window.exstraGiftArtV198?.html(id)||icon('gift')).replace(/exg198-/g,'exg207-card-');
  get('h2').textContent=gift.gift_name||gift.name||'Подарок';
  get('[data-gift-card-series]').textContent=gift.limited?'Лимитированная серия':'Коллекция ExstraChat';
  get('[data-gift-card-subtitle]').textContent=view.owned&&gift.id!==undefined?'Подарок №'+gift.id:'Маленький знак большого внимания';
  get('[data-gift-card-details]').replaceChildren();
  if(view.owned){row('От кого',person(gift.sender_nick,view));row('Владелец',person(gift.owner_nick||options.ownerNick,view));row('Получен',date(gift.created_at));if(gift.price!==undefined)row('Стоимость при получении',price(gift.price));}
  else{row('Получатель',view.recipient?person(view.recipient,view):'Пока не выбран');row('Стоимость',price(gift.price));}
  row('Редкость',rarities[gift.rarity]||(gift.limited?'Лимитированный':'Коллекционный'));
  const note=String(view.owned?gift.message||'':options.note||'').slice(0,120);get('[data-gift-card-note]').textContent=note;get('[data-gift-card-note]').hidden=!note;
  const button=get('[data-gift-card-action]');button.disabled=view.ended;button.textContent=view.owned?'Готово':view.ended?'Коллекция закрыта':view.recipient?'Подарить за '+price(gift.price):'Выбрать получателя';
  get('[data-gift-card-status]').textContent='';get('[data-gift-card-footnote]').textContent=view.owned?'Сохранён в коллекции владельца':'Списание Лун — только после подтверждения';
  dialog.scrollTop=0;if(!dialog.open)dialog.showModal();
 }
 window.addEventListener('telechat-account-ready-v175',()=>{if(current&&current.account!==owner())close(false);});
 window.exstraGiftCardV207=Object.freeze({open,close});
})();
