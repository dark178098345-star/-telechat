/* TELECHAT MOONS V20 — wallet, transfers and original celestial gifts */
(()=>{
  const LIMIT_WINDOW=1814400000;
  let catalogV20=[],catalogReadyV20=false,catalogTabV20='regular',giftTargetV20='',selectedGiftV20=null;
  let viewedMoonUserV20=null,profileMoonRequestV20=0,limitedNextV20=0,giftRealtimeV20=null,celebrationTimerV20=null;
  let catalogPromiseV21=null,cooldownLoadedAtV21=0;const moonUserTimesV21=new Map(),collectionGiftsV23=new Map();
  const lowerV20=value=>String(value||'').trim().toLowerCase();
  const creatorV20=nick=>lowerV20(nick)==='creator';
  const themeClassV20=theme=>'gift-theme-'+String(theme||'violet').replace(/[^a-z]/g,'');
  const numberV20=new Intl.NumberFormat('ru-RU');
  function compactV20(value){
    const amount=Math.max(0,Number(value||0)),units=[[1e12,'T'],[1e9,'B'],[1e6,'M']];
    for(const [limit,label] of units)if(amount>=limit){const fixed=(amount/limit).toFixed(amount>=limit*100?0:amount>=limit*10?1:2).replace(/\.0+$|(?<=\.[0-9])0$/,'');return fixed+label;}
    return numberV20.format(amount);
  }
  function balanceTextV20(user){return creatorV20(user?.nick)?'∞':compactV20(user?.moons);}
  function dateV20(ts){return new Date(Number(ts||0)).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
  function countdownV20(ts){const diff=Number(ts||0)-Date.now();if(diff<=0)return 'завершено';const days=Math.floor(diff/86400000),hours=Math.ceil((diff%86400000)/3600000);return days?days+' дн. '+hours+' ч.':hours+' ч.';}
  function mergeMoonUserV20(user){if(!user?.nick)return null;userCache[user.nick]={...(userCache[user.nick]||{}),...user};if(me&&me.nick===user.nick)Object.assign(me,userCache[user.nick]);return userCache[user.nick];}
  function moonErrorV20(error){
    const message=String(error?.message||error||'');
    if(message.includes('Недостаточно'))return 'Недостаточно Лун';
    if(message.includes('21 день'))return 'Лимитированный подарок можно отправить раз в 21 день';
    if(message.includes('закрыта'))return 'Эта лимитированная коллекция уже закрыта';
    if(message.includes('не найден'))return 'Пользователь или подарок не найден';
    if(message.includes('telechat_'))return 'Сначала выполни SQL для Лун';
    return message||'Не удалось выполнить действие';
  }

  function ensureMoonUiV20(){
    const seen=document.getElementById('view-profile-seen');
    if(seen&&!document.getElementById('moon-profile-summary')){
      const summary=document.createElement('div');summary.id='moon-profile-summary';summary.className='moon-profile-summary';summary.innerHTML='<button class="moon-profile-stat balance" id="moon-profile-balance" type="button"><strong id="moon-profile-balance-value">— 🌙</strong><span>Баланс Лун</span></button><button class="moon-profile-stat" id="moon-profile-collection" type="button"><strong id="moon-profile-gift-count">0</strong><span>Подарки</span></button>';
      seen.insertAdjacentElement('afterend',summary);
      const actions=document.createElement('div');actions.id='moon-profile-actions';actions.className='moon-profile-actions';actions.innerHTML='<button class="moon-profile-action" id="moon-profile-transfer" type="button">🌙 Перевести</button><button class="moon-profile-action primary" id="moon-profile-gift" type="button">🎁 Подарить</button><button class="moon-profile-action creator" id="moon-profile-admin" type="button">✦ Управлять Лунами</button>';
      summary.insertAdjacentElement('afterend',actions);
      document.getElementById('moon-profile-balance').onclick=()=>viewedMoonUserV20&&(me?.nick===viewedMoonUserV20.nick?openWalletV20():openTransferV20(viewedMoonUserV20.nick));
      document.getElementById('moon-profile-collection').onclick=()=>viewedMoonUserV20&&openCollectionV20(viewedMoonUserV20.nick);
      document.getElementById('moon-profile-transfer').onclick=()=>viewedMoonUserV20&&openTransferV20(viewedMoonUserV20.nick);
      document.getElementById('moon-profile-gift').onclick=()=>viewedMoonUserV20&&openGiftCatalogV20(viewedMoonUserV20.nick);
      document.getElementById('moon-profile-admin').onclick=()=>viewedMoonUserV20&&openTransferV20(viewedMoonUserV20.nick,true);
    }
    if(document.getElementById('moon-wallet-modal'))return;
    const root=document.createElement('div');root.id='moon-ui-root';root.innerHTML=`
      <div class="moon-overlay" id="moon-wallet-modal"><section class="moon-card compact"><header class="moon-head"><div class="moon-head-orb">🌙</div><div class="moon-head-copy"><div class="moon-title">Мои Луны</div><div class="moon-subtitle">кошелёк tele.chat</div></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body"><div class="moon-wallet-hero"><div class="moon-wallet-label">Твой баланс</div><div class="moon-wallet-value" id="moon-wallet-value">— 🌙</div><div class="moon-wallet-note">Внутренняя валюта без реальных платежей</div></div><div class="moon-wallet-actions"><button class="moon-main-btn primary" id="moon-wallet-transfer">Перевести</button><button class="moon-main-btn" id="moon-wallet-gifts">Выбрать подарок</button></div><div class="moon-section-title">История</div><div class="moon-history" id="moon-history"></div></div></section></div>
      <div class="moon-overlay" id="moon-transfer-modal"><section class="moon-card compact"><header class="moon-head"><div class="moon-head-orb">↗</div><div class="moon-head-copy"><div class="moon-title" id="moon-transfer-title">Перевести Луны</div><div class="moon-subtitle">мгновенный перевод внутри tele.chat</div></div><div class="moon-head-balance" id="moon-transfer-balance"></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body"><div class="moon-form"><label class="moon-label" for="moon-transfer-target">Получатель</label><input class="moon-input" id="moon-transfer-target" placeholder="ник без @" autocomplete="off" autocapitalize="none"><label class="moon-label" for="moon-transfer-amount">Количество Лун</label><input class="moon-input" id="moon-transfer-amount" type="number" min="1" max="1000000000" value="50" inputmode="numeric"><label class="moon-label" for="moon-transfer-note">Сообщение</label><input class="moon-input" id="moon-transfer-note" maxlength="120" placeholder="необязательно"><div class="moon-form-actions" id="moon-transfer-actions"><button class="moon-submit" id="moon-transfer-send">Перевести</button><button class="moon-submit grant" id="moon-creator-grant">Начислить</button><button class="moon-submit take" id="moon-creator-take">Списать</button></div></div></div></section></div>
      <div class="moon-overlay" id="gift-catalog-modal"><section class="moon-card"><header class="moon-head"><div class="moon-head-orb">🎁</div><div class="moon-head-copy"><div class="moon-title">Обсерватория подарков</div><div class="moon-subtitle" id="gift-catalog-target"></div></div><div class="moon-head-balance" id="gift-catalog-balance"></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body"><div class="gift-tabs"><button class="gift-tab active" data-gift-tab="regular">25 подарков</button><button class="gift-tab" data-gift-tab="limited">12 лимитированных</button></div><div class="gift-limit-banner" id="gift-limit-banner"></div><div class="gift-grid" id="gift-catalog-grid"></div></div></section></div>
      <div class="moon-overlay" id="gift-confirm-modal"><section class="moon-card compact"><header class="moon-head"><div class="moon-head-orb">✦</div><div class="moon-head-copy"><div class="moon-title">Отправить подарок</div><div class="moon-subtitle" id="gift-confirm-target"></div></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body"><div id="gift-confirm-content"></div><label class="moon-label" for="gift-confirm-message">Подпись к подарку</label><input class="moon-input" id="gift-confirm-message" maxlength="120" placeholder="Напиши пару тёплых слов"><button class="moon-submit" id="gift-confirm-send" style="width:100%;margin-top:12px">Отправить подарок</button></div></section></div>
      <div class="moon-overlay" id="gift-collection-modal"><section class="moon-card"><header class="moon-head"><div class="moon-head-orb">✧</div><div class="moon-head-copy"><div class="moon-title">Коллекция подарков</div><div class="moon-subtitle" id="gift-collection-owner"></div></div><div class="moon-head-balance" id="gift-collection-count"></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body"><div class="gift-collection-grid" id="gift-collection-grid"></div></div></section></div>
      <div class="moon-overlay" id="gift-detail-modal"><section class="moon-card compact"><header class="moon-head"><div class="moon-head-orb">✦</div><div class="moon-head-copy"><div class="moon-title">Подарок</div><div class="moon-subtitle">тёплый момент в tele.chat</div></div><button class="moon-close" data-moon-close>×</button></header><div class="moon-body" id="gift-detail-content"></div></section></div>
      <div class="moon-celebration" id="moon-celebration"><div class="moon-celebration-box"><div class="moon-celebration-icon" id="moon-celebration-icon">🌙</div><div class="moon-celebration-title" id="moon-celebration-title"></div><div class="moon-celebration-sub" id="moon-celebration-sub"></div></div></div>`;
    document.body.appendChild(root);
    document.querySelectorAll('[data-moon-close]').forEach(button=>button.onclick=()=>button.closest('.moon-overlay').classList.remove('show'));
    document.querySelectorAll('.moon-overlay').forEach(overlay=>overlay.onclick=event=>{if(event.target===overlay)overlay.classList.remove('show');});
    document.getElementById('moon-wallet-transfer').onclick=()=>openTransferV20('');document.getElementById('moon-wallet-gifts').onclick=()=>openGiftCatalogV20(me?.nick);
    document.getElementById('moon-transfer-send').onclick=()=>runMoonTransferV20('send');document.getElementById('moon-creator-grant').onclick=()=>runMoonTransferV20('grant');document.getElementById('moon-creator-take').onclick=()=>runMoonTransferV20('take');
    document.querySelectorAll('[data-gift-tab]').forEach(button=>button.onclick=()=>{catalogTabV20=button.dataset.giftTab;renderGiftCatalogV20();});document.getElementById('gift-confirm-send').onclick=sendSelectedGiftV20;
    document.getElementById('gift-catalog-grid').onclick=event=>{const button=event.target.closest('[data-gift-id]');if(button&&!button.disabled)openGiftConfirmV20(button.dataset.giftId);};
    document.getElementById('gift-collection-grid').onclick=event=>{const card=event.target.closest('[data-owned-gift-id]');if(card)openGiftDetailV23(card.dataset.ownedGiftId);};
  }

  async function fetchMoonUserV20(nick,force=false){
    nick=lowerV20(nick);if(!nick)return null;const cached=userCache[nick];if(!force&&cached&&cached.moons!=null&&Date.now()-(moonUserTimesV21.get(nick)||0)<30000)return cached;
    const result=await sb.from('users').select('nick,name,av,moons').eq('nick',nick).maybeSingle();if(result.error||!result.data)return cached||null;moonUserTimesV21.set(nick,Date.now());return mergeMoonUserV20(result.data);
  }
  async function loadCatalogV20(){
    if(catalogReadyV20)return catalogV20;if(catalogPromiseV21)return catalogPromiseV21;catalogPromiseV21=(async()=>{const result=await sb.from('moon_gifts').select('*').order('sort_order',{ascending:true});if(result.error)throw result.error;catalogV20=result.data||[];catalogReadyV20=true;return catalogV20;})().finally(()=>catalogPromiseV21=null);return catalogPromiseV21;
  }
  async function loadLimitedCooldownV20(force=false){
    if(!me)return 0;if(!force&&Date.now()-cooldownLoadedAtV21<45000)return limitedNextV20;const result=await sb.from('user_gifts').select('created_at').eq('sender_nick',me.nick).eq('limited',true).order('created_at',{ascending:false}).limit(1);cooldownLoadedAtV21=Date.now();limitedNextV20=result.error||!result.data?.length?0:Number(result.data[0].created_at)+LIMIT_WINDOW;return limitedNextV20;
  }

  function renderShowcaseV20(gifts){
    const cover=document.getElementById('view-profile-cover');if(!cover)return;cover.querySelector('.moon-profile-showcase')?.remove();if(!gifts?.length)return;
    const layer=document.createElement('div');layer.className='moon-profile-showcase';gifts.slice(0,5).forEach(gift=>{const star=document.createElement('span');star.className='moon-showcase-star '+themeClassV20(gift.theme);star.textContent=gift.gift_icon;star.title=gift.gift_name;layer.appendChild(star);});cover.appendChild(layer);
  }
  async function loadProfileMoonsV20(nick){
    ensureMoonUiV20();nick=lowerV20(nick);const request=++profileMoonRequestV20;
    try{
      const [user,countResult,limitedResult]=await Promise.all([
        fetchMoonUserV20(nick),
        sb.from('user_gifts').select('id',{count:'exact',head:true}).eq('owner_nick',nick),
        sb.from('user_gifts').select('gift_icon,gift_name,theme,created_at').eq('owner_nick',nick).eq('limited',true).order('created_at',{ascending:false}).limit(5)
      ]);
      if(request!==profileMoonRequestV20)return;
      viewedMoonUserV20=user||{nick,name:nick,moons:0};document.getElementById('moon-profile-balance-value').textContent=balanceTextV20(viewedMoonUserV20)+' 🌙';document.getElementById('moon-profile-gift-count').textContent=compactV20(countResult.count||0);
      const own=me?.nick===nick,giftButton=document.getElementById('moon-profile-gift');document.getElementById('moon-profile-transfer').style.display=own?'none':'';giftButton.textContent=own?'🎁 Подарок себе':'🎁 Подарить';giftButton.style.gridColumn=own?'1 / -1':'';document.getElementById('moon-profile-admin').style.display=creatorV20(me?.nick)&&!own?'':'none';renderShowcaseV20(limitedResult.data||[]);
    }catch(error){if(request===profileMoonRequestV20){document.getElementById('moon-profile-balance-value').textContent='— 🌙';document.getElementById('moon-profile-gift-count').textContent='0';}}
  }

  async function openWalletV20(){
    if(!me)return;ensureMoonUiV20();document.getElementById('moon-wallet-modal').classList.add('show');document.getElementById('moon-history').innerHTML='<div class="moon-empty">Загружаем историю…</div>';
    const user=await fetchMoonUserV20(me.nick);if(user)document.getElementById('moon-wallet-value').textContent=balanceTextV20(user)+' 🌙';await renderHistoryV20();
  }
  async function renderHistoryV20(){
    const box=document.getElementById('moon-history');const result=await sb.rpc('telechat_moon_history',{p_nick:me.nick,p_limit:50});if(result.error){box.innerHTML='<div class="moon-empty">История появится после запуска SQL для Лун</div>';return;}
    const rows=result.data||[];if(!rows.length){box.innerHTML='<div class="moon-empty">Здесь появятся переводы и подарки</div>';return;}
    box.innerHTML=rows.map(row=>{
      const from=lowerV20(row.from_nick),to=lowerV20(row.to_nick),mine=lowerV20(me.nick),gift=row.kind==='gift',grant=row.kind==='creator_grant',take=row.kind==='creator_take',animated=row.kind==='animated_profile',incoming=to===mine&&from!==mine;
      let icon='🌙',name='',sign='',amount='';
      if(animated){icon='🎬';name='Анимированный профиль';amount=compactV20(row.amount)+' 🌙';sign='−';}
      else if(gift){const giftInfo=catalogV20.find(item=>item.id===row.gift_id);icon=giftInfo?.icon||'🎁';name=(incoming?'Подарок от @'+from:'Подарок для @'+to);amount=compactV20(row.amount)+' 🌙';sign=creatorV20(mine)?'':incoming?'':'−';}
      else if(grant){icon='✦';name=incoming?'Начислено creator':'Начисление @'+to;sign=incoming?'+':'';amount=compactV20(row.amount)+' 🌙';}
      else if(take){icon='◇';name=incoming?'Списано creator':'Списание у @'+to;sign=incoming?'−':'';amount=compactV20(row.amount)+' 🌙';}
      else{icon=incoming?'↙':'↗';name=incoming?'Перевод от @'+from:'Перевод для @'+to;sign=incoming?'+':creatorV20(mine)?'':'−';amount=compactV20(row.amount)+' 🌙';}
      const plus=sign==='+'?' plus':sign==='−'?' minus':'';return '<div class="moon-history-row"><div class="moon-history-icon">'+icon+'</div><div class="moon-history-copy"><div class="moon-history-name">'+escHtml(name)+'</div><div class="moon-history-date">'+dateV20(row.created_at)+(row.note?' · '+escHtml(row.note):'')+'</div></div><div class="moon-history-amount'+plus+'">'+sign+amount+'</div></div>';
    }).join('');
  }

  async function openTransferV20(target='',creatorMode=false){
    if(!me)return;ensureMoonUiV20();const modal=document.getElementById('moon-transfer-modal'),isCreator=creatorV20(me.nick),useCreator=isCreator&&creatorMode;document.getElementById('moon-transfer-target').value=lowerV20(target);document.getElementById('moon-transfer-target').readOnly=!!target;document.getElementById('moon-transfer-amount').value=useCreator?'50':'50';document.getElementById('moon-transfer-note').value='';document.getElementById('moon-transfer-title').textContent=useCreator?'Управление Лунами':'Перевести Луны';document.getElementById('moon-transfer-balance').textContent=balanceTextV20(me)+' 🌙';document.getElementById('moon-transfer-send').style.display=useCreator?'none':'';document.getElementById('moon-creator-grant').style.display=useCreator?'':'none';document.getElementById('moon-creator-take').style.display=useCreator?'':'none';document.getElementById('moon-transfer-actions').classList.toggle('creator-mode',useCreator);modal.classList.add('show');
  }
  async function runMoonTransferV20(mode){
    const target=lowerV20(document.getElementById('moon-transfer-target').value),amount=Math.floor(Number(document.getElementById('moon-transfer-amount').value)),note=document.getElementById('moon-transfer-note').value.trim();if(!target){showToast('Укажи ник получателя');return;}if(!Number.isFinite(amount)||amount<1||amount>1000000000){showToast('Укажи сумму от 1 до 1B');return;}
    const buttons=document.querySelectorAll('#moon-transfer-modal .moon-submit');buttons.forEach(button=>button.disabled=true);
    try{
      const result=mode==='send'?await sb.rpc('telechat_transfer_moons',{p_actor_nick:me.nick,p_target_nick:target,p_amount:amount,p_note:note}):await sb.rpc('telechat_creator_moons',{p_actor_nick:me.nick,p_target_nick:target,p_amount:mode==='take'?-amount:amount,p_note:note});if(result.error)throw result.error;
      if(mode==='send'&&!creatorV20(me.nick)){me.moons=Number(result.data.balance);mergeMoonUserV20(me);}else if(mode!=='send'&&userCache[target])userCache[target].moons=Number(result.data.balance);
      document.getElementById('moon-transfer-modal').classList.remove('show');showCelebrationV20('🌙',mode==='send'?'Луны отправлены':mode==='take'?'Луны списаны':'Луны начислены',compactV20(amount)+' 🌙 · @'+target);if(lowerV20(viewedProfileNickV5)===target)loadProfileMoonsV20(target);
    }catch(error){showToast(moonErrorV20(error));}finally{buttons.forEach(button=>button.disabled=false);}
  }

  async function openGiftCatalogV20(target){
    if(!me)return;ensureMoonUiV20();giftTargetV20=lowerV20(target||me.nick);catalogTabV20='regular';document.getElementById('gift-catalog-modal').classList.add('show');if(catalogReadyV20)renderGiftCatalogV20();else document.getElementById('gift-catalog-grid').innerHTML='<div class="moon-empty" style="grid-column:1/-1">Открываем обсерваторию…</div>';
    try{await Promise.all([loadCatalogV20(),loadLimitedCooldownV20(),fetchMoonUserV20(giftTargetV20)]);if(document.getElementById('gift-catalog-modal').classList.contains('show'))renderGiftCatalogV20();}catch(error){document.getElementById('gift-catalog-grid').innerHTML='<div class="moon-empty" style="grid-column:1/-1">Не удалось открыть обсерваторию</div>';}
  }
  function renderGiftCatalogV20(){
    if(!catalogReadyV20)return;const limited=catalogTabV20==='limited',target=userCache[giftTargetV20]||{nick:giftTargetV20};document.querySelectorAll('[data-gift-tab]').forEach(button=>button.classList.toggle('active',button.dataset.giftTab===catalogTabV20));document.getElementById('gift-catalog-target').textContent=(giftTargetV20===me.nick?'подарок себе':'для '+(target.name||'@'+giftTargetV20));document.getElementById('gift-catalog-balance').textContent=balanceTextV20(me)+' 🌙';
    const banner=document.getElementById('gift-limit-banner'),cooldown=limitedNextV20>Date.now();banner.classList.toggle('show',limited);if(limited){const active=catalogV20.find(gift=>gift.limited&&Number(gift.available_until)>Date.now());banner.textContent=cooldown?'Следующий лимитированный подарок будет доступен через '+countdownV20(limitedNextV20):active?'Коллекция закроется через '+countdownV20(active.available_until)+' · можно выбрать только один подарок на 21 день':'Коллекция закрыта';}
    const gifts=catalogV20.filter(gift=>!!gift.limited===limited),box=document.getElementById('gift-catalog-grid');box.innerHTML=gifts.map(gift=>{
      const expired=gift.limited&&Number(gift.available_until)<=Date.now(),unaffordable=!creatorV20(me.nick)&&Number(me.moons||0)<Number(gift.price),disabled=expired||(gift.limited&&cooldown)||unaffordable;
      return '<button class="gift-card '+themeClassV20(gift.theme)+(gift.limited?' limited':'')+'" data-gift-id="'+escHtml(gift.id)+'" '+(disabled?'disabled':'')+'><div class="gift-orbit"><span class="gift-icon">'+gift.icon+'</span></div><div class="gift-name">'+escHtml(gift.name)+'</div><div class="gift-price">'+compactV20(gift.price)+' 🌙</div><div class="gift-meta">'+(expired?'коллекция закрыта':unaffordable?'не хватает Лун':gift.limited?countdownV20(gift.available_until):gift.rarity)+'</div></button>';
    }).join('');
  }
  function openGiftConfirmV20(id){
    selectedGiftV20=catalogV20.find(gift=>gift.id===id);if(!selectedGiftV20)return;const target=userCache[giftTargetV20]||{nick:giftTargetV20,name:giftTargetV20};document.getElementById('gift-confirm-target').textContent='для '+(target.name||target.nick)+' · @'+target.nick;document.getElementById('gift-confirm-content').innerHTML='<div class="gift-confirm-preview '+themeClassV20(selectedGiftV20.theme)+'"><div class="gift-orbit"><span class="gift-icon">'+selectedGiftV20.icon+'</span></div></div><div class="gift-confirm-name">'+escHtml(selectedGiftV20.name)+'</div><div class="gift-confirm-price">'+compactV20(selectedGiftV20.price)+' 🌙</div><div class="gift-confirm-target">Подарок останется в коллекции профиля</div>'+(selectedGiftV20.limited?'<div class="gift-confirm-limit">Лимитированный экземпляр · следующий через 21 день</div>':'');document.getElementById('gift-confirm-message').value='';document.getElementById('gift-confirm-modal').classList.add('show');
  }
  const GIFT_CHAT_PREFIX_V21='[tc_gift_v1]';
  function packGiftChatV21(gift,target,recordId,message){return GIFT_CHAT_PREFIX_V21+encodeURIComponent(JSON.stringify({v:1,id:gift.id,n:gift.name,i:gift.icon,t:gift.theme,p:Number(gift.price||0),l:!!gift.limited,o:target,r:recordId||0,m:String(message||'').slice(0,120)}));}
  function unpackGiftChatV21(text){if(!String(text||'').startsWith(GIFT_CHAT_PREFIX_V21))return null;try{return JSON.parse(decodeURIComponent(String(text).slice(GIFT_CHAT_PREFIX_V21.length)));}catch(error){return null;}}
  function giftChatHtmlV21(gift){
    const theme=themeClassV20(gift.t),owner=lowerV20(gift.o);return '<button type="button" class="chat-gift-card '+theme+(gift.l?' limited':'')+'" data-chat-gift-owner="'+escHtml(owner)+'"><span class="chat-gift-label">'+(gift.l?'ЛИМИТИРОВАННЫЙ ПОДАРОК':'ПОДАРОК TELE.CHAT')+'</span><span class="chat-gift-orbit"><span>'+escHtml(gift.i||'🎁')+'</span></span><strong>'+escHtml(gift.n||'Подарок')+'</strong><span class="chat-gift-price">'+compactV20(gift.p)+' 🌙</span>'+(gift.m?'<em>«'+escHtml(gift.m)+'»</em>':'')+'<span class="chat-gift-open">Открыть коллекцию ›</span></button>';
  }
  async function persistGiftChatV23(row){
    let lastError=null;
    for(let attempt=0;attempt<3;attempt++){
      const result=await sb.from('messages').insert(row);if(!result.error)return true;lastError=result.error;
      const existing=await sb.from('messages').select('id').eq('chat_key',row.chat_key).eq('from_nick',row.from_nick).eq('ts',row.ts).limit(1);if(!existing.error&&existing.data?.length)return true;
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
    console.error('Gift chat message was not saved',lastError);return false;
  }
  async function postGiftChatCardV21(gift,target,recordId,message){
    target=lowerV20(target);if(!me||!target)return false;if(target===me.nick)return true;
    const text=packGiftChatV21(gift,target,recordId,message),ts=Date.now(),key=chatKey(me.nick,target),row={chat_key:key,from_nick:me.nick,text,ts,reply_text:null,read_by:[],deleted:false};
    const saved=await persistGiftChatV23(row);if(!saved){showToast('Подарок в коллекции, но карточку чата сохранить не удалось');return false;}
    if(currentChat===target&&!currentRoom)await renderMessages();if(typeof telechatApplySidebarMessageV25==='function')telechatApplySidebarMessageV25(row);await renderContacts();if(typeof playSendSound==='function')playSendSound();return true;
  }
  const previewBeforeV21=messagePreviewText;messagePreviewText=function(text){const gift=unpackGiftChatV21(text);return gift?'🎁 Подарок: '+gift.n:previewBeforeV21(text);};
  const contentBeforeV21=renderMessageContent;renderMessageContent=function(text){const gift=unpackGiftChatV21(text);return gift?giftChatHtmlV21(gift):contentBeforeV21(text);};
  async function sendSelectedGiftV20(){
    if(!selectedGiftV20||!giftTargetV20)return;const button=document.getElementById('gift-confirm-send'),message=document.getElementById('gift-confirm-message').value.trim();button.disabled=true;button.textContent='Отправляем…';
    try{
      const result=await sb.rpc('telechat_send_gift',{p_actor_nick:me.nick,p_target_nick:giftTargetV20,p_gift_id:selectedGiftV20.id,p_message:message});if(result.error)throw result.error;if(!creatorV20(me.nick)){me.moons=Number(result.data.balance);mergeMoonUserV20(me);}if(selectedGiftV20.limited)limitedNextV20=Number(result.data.next_limited_at||Date.now()+LIMIT_WINDOW);
      const sentGift=selectedGiftV20,sentTarget=giftTargetV20;document.getElementById('gift-confirm-modal').classList.remove('show');document.getElementById('gift-catalog-modal').classList.remove('show');const chatSaved=await postGiftChatCardV21(sentGift,sentTarget,result.data.gift_record_id,message);showCelebrationV20(sentGift.icon,'Подарок отправлен',sentGift.name+' · @'+sentTarget+(chatSaved?'':' · без карточки чата'));if(lowerV20(viewedProfileNickV5)===sentTarget)loadProfileMoonsV20(sentTarget);
    }catch(error){showToast(moonErrorV20(error));}finally{button.disabled=false;button.textContent='Отправить подарок';}
  }

  async function openCollectionV20(nick){
    ensureMoonUiV20();nick=lowerV20(nick);const owner=userCache[nick]||{nick,name:nick},modal=document.getElementById('gift-collection-modal'),box=document.getElementById('gift-collection-grid');document.getElementById('gift-collection-owner').textContent=(owner.name||nick)+' · @'+nick;document.getElementById('gift-collection-count').textContent='…';box.innerHTML='<div class="moon-empty" style="grid-column:1/-1">Собираем созвездие…</div>';modal.classList.add('show');
    const result=await sb.from('user_gifts').select('*').eq('owner_nick',nick).order('created_at',{ascending:false}).limit(200);if(result.error){box.innerHTML='<div class="moon-empty" style="grid-column:1/-1">Коллекция пока недоступна</div>';return;}const gifts=result.data||[];collectionGiftsV23.clear();gifts.forEach(gift=>collectionGiftsV23.set(String(gift.id),gift));document.getElementById('gift-collection-count').textContent=compactV20(gifts.length)+' 🎁';if(!gifts.length){box.innerHTML='<div class="moon-empty" style="grid-column:1/-1">У пользователя пока нет подарков</div>';return;}
    box.innerHTML=gifts.map(gift=>'<button type="button" class="owned-gift '+themeClassV20(gift.theme)+(gift.limited?' limited':'')+'" data-owned-gift-id="'+escHtml(String(gift.id))+'"><span class="gift-serial">#'+String(gift.id).padStart(6,'0')+'</span><div class="gift-orbit"><span class="gift-icon">'+gift.gift_icon+'</span></div><div class="gift-name">'+escHtml(gift.gift_name)+'</div><div class="gift-price">'+compactV20(gift.price)+' 🌙</div><div class="owned-gift-sender">от @'+escHtml(gift.sender_nick)+' · '+dateV20(gift.created_at)+'</div>'+(gift.message?'<div class="owned-gift-message">'+escHtml(gift.message)+'</div>':'')+'<span class="owned-gift-more">Подробнее ›</span></button>').join('');
  }

  function openGiftDetailV23(id){
    const gift=collectionGiftsV23.get(String(id));if(!gift)return;const modal=document.getElementById('gift-detail-modal'),box=document.getElementById('gift-detail-content'),sender=lowerV20(gift.sender_nick);
    box.innerHTML='<div class="gift-detail-hero '+themeClassV20(gift.theme)+(gift.limited?' limited':'')+'"><span class="gift-detail-serial">#'+String(gift.id).padStart(6,'0')+'</span><div class="gift-orbit"><span class="gift-icon">'+escHtml(gift.gift_icon||'🎁')+'</span></div><strong>'+escHtml(gift.gift_name||'Подарок')+'</strong><span>'+compactV20(gift.price)+' 🌙</span></div><div class="gift-detail-note"><span>ТЁПЛОЕ СООБЩЕНИЕ</span><blockquote>'+(gift.message?'«'+escHtml(gift.message)+'»':'Без подписи')+'</blockquote></div><button type="button" class="gift-detail-sender" data-gift-detail-sender="'+escHtml(sender)+'"><span>Отправитель</span><strong>@'+escHtml(sender)+'</strong><small>'+dateV20(gift.created_at)+' · открыть профиль ›</small></button>';
    box.querySelector('[data-gift-detail-sender]').onclick=()=>{modal.classList.remove('show');document.getElementById('gift-collection-modal').classList.remove('show');openUserProfile(sender);};modal.classList.add('show');
  }
  function showCelebrationV20(icon,title,subtitle){
    ensureMoonUiV20();const overlay=document.getElementById('moon-celebration');document.getElementById('moon-celebration-icon').textContent=icon;document.getElementById('moon-celebration-title').textContent=title;document.getElementById('moon-celebration-sub').textContent=subtitle;overlay.querySelectorAll('.moon-particle').forEach(item=>item.remove());for(let i=0;i<18;i++){const particle=document.createElement('span');particle.className='moon-particle';particle.textContent=i%3?'✦':'🌙';const angle=Math.PI*2*i/18,distance=100+Math.random()*170;particle.style.setProperty('--x',Math.cos(angle)*distance+'px');particle.style.setProperty('--y',Math.sin(angle)*distance+'px');particle.style.animationDelay=Math.random()*.25+'s';overlay.appendChild(particle);}clearTimeout(celebrationTimerV20);overlay.classList.remove('show');void overlay.offsetWidth;overlay.classList.add('show');celebrationTimerV20=setTimeout(()=>overlay.classList.remove('show'),2450);
  }
  function subscribeGiftsV20(){
    if(!me)return;if(giftRealtimeV20)sb.removeChannel(giftRealtimeV20);giftRealtimeV20=sb.channel('moon-gifts-'+me.nick+'-'+Date.now()).on('postgres_changes',{event:'INSERT',schema:'public',table:'user_gifts',filter:'owner_nick=eq.'+me.nick},payload=>{const gift=payload.new;if(gift.sender_nick===me.nick)return;showCelebrationV20(gift.gift_icon||'🎁','Новый подарок!',(gift.gift_name||'Подарок')+' · от @'+gift.sender_nick);if(lowerV20(viewedProfileNickV5)===me.nick)loadProfileMoonsV20(me.nick);}).subscribe();
  }
  async function initMoonsV20(){if(!me)return;ensureMoonUiV20();await Promise.allSettled([fetchMoonUserV20(me.nick),loadCatalogV20(),loadLimitedCooldownV20()]);subscribeGiftsV20();}

  const loginBeforeV20=doLogin;doLogin=async function(...args){const value=await loginBeforeV20(...args);if(me)initMoonsV20();return value;};
  const profileBeforeV20=openUserProfile;openUserProfile=async function(nick,...args){const profileTask=profileBeforeV20(nick,...args);loadProfileMoonsV20(nick);return profileTask;};
  const closeProfileBeforeV20=closeUserProfile;closeUserProfile=function(){profileMoonRequestV20++;viewedMoonUserV20=null;document.getElementById('view-profile-cover')?.querySelector('.moon-profile-showcase')?.remove();return closeProfileBeforeV20();};
  document.addEventListener('click',event=>{const card=event.target.closest('[data-chat-gift-owner]');if(card){event.stopPropagation();openCollectionV20(card.dataset.chatGiftOwner);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.moon-overlay.show').forEach(item=>item.classList.remove('show'));});
  setInterval(()=>{if(document.getElementById('gift-catalog-modal')?.classList.contains('show'))renderGiftCatalogV20();},60000);
  window.openMoonWalletV20=openWalletV20;window.openGiftCatalogV20=openGiftCatalogV20;window.openMoonCollectionV20=openCollectionV20;ensureMoonUiV20();
})();
