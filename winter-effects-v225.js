/* Seasonal chat decorations; all motion is CSS and all choices stay on-device. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),body=document.body;
  const screen=$('chat-screen'),activeChat=$('active-chat'),sidebar=$('sidebar'),main=activeChat?.closest('.chat-main');
  if(!body||!screen)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const phoneQuery=matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse)), ((max-width:1100px) and (max-height:600px) and (pointer:coarse))');
  const readAccount=()=>typeof me!=='undefined'?String(me?.nick||''):'';
  const storageKey=nick=>'exstrachat.winter.v225.'+nick;
  const defaults={enabled:true,snow:true},decorations=[];
  let owner='',prefs={...defaults},season=false,nativeHidden=false,pageHidden=false,snowActive=false;
  let layer,count=0,queued=false,masterToggle,snowToggle;

  function readPrefs(nick){
    if(!nick)return {...defaults};
    try{
      const value=JSON.parse(localStorage.getItem(storageKey(nick))||'null');
      return {enabled:value?.enabled!==false,snow:value?.snow!==false};
    }catch(_){return {...defaults};}
  }
  function decorate(host,className){
    if(!host||decorations.some(item=>item.host===host&&item.node.className===className&&item.node.parentElement===host))return;
    const node=document.createElement('span');
    node.className=className;
    node.setAttribute('aria-hidden','true');
    host.append(node);
    decorations.push({host,node});
  }
  function mountDecorations(){
    const header=activeChat?.querySelector('.chat-header');
    for(const host of [sidebar,main||header,$('input-area')])decorate(host,'winter-ridge-v225');
    decorate(sidebar?.querySelector('.search-wrap'),'winter-garland-v225');
    const rail=sidebar?.querySelector('.section-rail-v109');
    decorate(rail?.querySelector('.rail-brand-v109'),'winter-hat-v225');
    decorate($('phone-home-head-v159')?.querySelector('.phone-home-row-v159 > div:first-child > span'),'winter-hat-v225');
    for(const button of rail?.querySelectorAll('button[data-rail-filter="all"],button[data-rail-filter="group"]')||[])decorate(button,'winter-icon-snow-v225');
  }
  function attachSnow(host,wanted){
    if(!layer){
      layer=document.createElement('div');layer.id='winter-snowfall-v225';layer.hidden=true;
      layer.setAttribute('aria-hidden','true');layer.setAttribute('inert','');
    }
    if(layer.parentElement!==host)host.append(layer);
    if(count===wanted)return;
    const flakes=document.createDocumentFragment();let seed=1949;
    const next=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    for(let i=0;i<wanted;i++){
      const node=document.createElement('span');node.className='winter-flake-v225';
      const duration=10+next()*9;
      node.style.setProperty('--winter-x',((i+.22+next()*.56)/wanted*100).toFixed(2)+'%');
      node.style.setProperty('--winter-size',(2+next()*2.8).toFixed(2)+'px');
      node.style.setProperty('--winter-drift',((next()-.5)*60).toFixed(1)+'px');
      node.style.setProperty('--winter-duration',duration.toFixed(2)+'s');
      node.style.setProperty('--winter-delay',(-next()*duration).toFixed(2)+'s');
      node.style.setProperty('--winter-opacity',(.28+next()*.38).toFixed(2));
      flakes.append(node);
    }
    layer.replaceChildren(flakes);count=wanted;
  }
  function snowHost(phone){
    if(!phone)return screen;
    if(phone&&body.dataset.phonePage&&body.dataset.phonePage!=='chats')return null;
    if(phone&&sidebar&&!sidebar.hidden&&!sidebar.classList.contains('hidden'))return sidebar;
    return main&&!main.hidden?main:null;
  }
  function canMove(){
    return !document.hidden&&!nativeHidden&&!pageHidden&&!reduce.matches&&
      !navigator.connection?.saveData&&(Number(navigator.deviceMemory)||8)>2&&(Number(navigator.hardwareConcurrency)||8)>2&&
      !['off','lite'].includes(body.dataset.uiMotionV184)&&
      !body.classList.contains('focus-v167')&&!window.telechatComfortV167?.isFocused?.()&&
      !body.classList.contains('telechat-mobile-keyboard-v100')&&!body.classList.contains('telechat-mobile-keyboard-v79')&&
      !body.classList.contains('telechat-mobile-cramped-v159')&&!body.classList.contains('music-hub-open-v117');
  }
  function refresh(){
    const previous=[season,snowActive,decorations.length].join('/');
    const nick=readAccount();
    if(owner!==nick){owner=nick;prefs=readPrefs(owner);}
    season=!!owner&&prefs.enabled&&screen.classList.contains('active');
    if(season){
      if(body.dataset.winterV225!=='on')body.dataset.winterV225='on';
      mountDecorations();
    }else if(body.hasAttribute('data-winter-v225'))body.removeAttribute('data-winter-v225');
    for(let i=decorations.length-1;i>=0;i--){
      const {node}=decorations[i];
      if(!node.isConnected)decorations.splice(i,1);
      else if(node.hidden===season)node.hidden=!season;
    }
    if(masterToggle)masterToggle.checked=prefs.enabled;
    if(snowToggle){snowToggle.checked=prefs.snow;snowToggle.disabled=!prefs.enabled;}
    const phone=phoneQuery.matches||body.classList.contains('telechat-phone-v159')||/telechat-android/i.test(navigator.userAgent);
    const host=season&&prefs.snow&&canMove()?snowHost(phone):null;
    snowActive=!!host;
    if(host)attachSnow(host,phone?16:30);
    if(layer&&layer.hidden===snowActive)layer.hidden=!snowActive;
    if(previous!==[season,snowActive,decorations.length].join('/'))window.dispatchEvent(new Event('exstra-winter-change-v226'));
  }
  function schedule(){
    if(queued)return;
    queued=true;queueMicrotask(()=>{queued=false;refresh();});
  }
  function save(part,checked){
    const nick=readAccount();
    if(!nick||nick!==owner){refresh();return;}
    prefs={...prefs,[part]:checked};
    try{localStorage.setItem(storageKey(nick),JSON.stringify(prefs));}catch(_){}
    refresh();
  }

  const settings=$('settings-panel');
  if(settings){
    const panel=document.createElement('section');
    panel.id='winter-settings-v225';panel.className='panel-section';panel.dataset.settingsGroup='appearance';
    panel.innerHTML='<div class="panel-section-title">Интерфейс · Зима</div>'+
      '<div class="setting-row"><div class="setting-copy"><label class="setting-label" id="winter-enabled-label-v225" for="winter-enabled-v225">Зимнее оформление</label><div class="setting-note" id="winter-enabled-note-v225">Снежные края, гирлянда и шапочки в чатах</div></div><label class="setting-switch" title="Зимнее оформление"><input class="telechat-switch-v36" id="winter-enabled-v225" type="checkbox" aria-labelledby="winter-enabled-label-v225" aria-describedby="winter-enabled-note-v225"></label></div>'+
      '<div class="setting-row"><div class="setting-copy"><label class="setting-label" id="winter-snow-label-v225" for="winter-snow-v225">Снегопад</label><div class="setting-note" id="winter-snow-note-v225">Падающий снег можно отключить отдельно</div></div><label class="setting-switch" title="Снегопад"><input class="telechat-switch-v36" id="winter-snow-v225" type="checkbox" aria-labelledby="winter-snow-label-v225" aria-describedby="winter-snow-note-v225"></label></div>';
    masterToggle=panel.querySelector('#winter-enabled-v225');snowToggle=panel.querySelector('#winter-snow-v225');
    masterToggle.addEventListener('change',()=>save('enabled',masterToggle.checked));
    snowToggle.addEventListener('change',()=>save('snow',snowToggle.checked));
    settings.append(panel);
  }
  const observer=new MutationObserver(schedule);
  observer.observe(body,{attributes:true,attributeFilter:['class','data-ui-motion-v184','data-phone-page']});
  for(const target of [screen,activeChat,main,sidebar]){
    if(target)observer.observe(target,{attributes:true,attributeFilter:['class','style','hidden'],childList:target===sidebar});
  }
  const observeQuery=query=>typeof query.addEventListener==='function'?query.addEventListener('change',refresh):query.addListener?.(refresh);
  observeQuery(reduce);observeQuery(phoneQuery);
  navigator.connection?.addEventListener?.('change',refresh);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('pagehide',()=>{pageHidden=true;refresh();});
  window.addEventListener('pageshow',()=>{pageHidden=false;refresh();});
  window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;refresh();});
  window.addEventListener('telechat-account-ready-v175',refresh);
  window.addEventListener('storage',event=>{
    const nick=readAccount();
    if(nick&&(event.key===storageKey(nick)||event.key===null)){owner=nick;prefs=readPrefs(nick);refresh();}
  });
  window.exstraWinterV225=Object.freeze({refresh,getState:()=>({owner,...prefs,active:season,snowActive,flakes:count})});
  refresh();
})();
