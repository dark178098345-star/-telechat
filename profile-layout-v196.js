/* Optional, local profile composition. Classic remains the default for everyone. */
(()=>{'use strict';
 const panel=document.getElementById('settings-panel'),body=document.querySelector('#user-profile-modal .user-profile-body');if(!panel||!body)return;
 const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}},key=nick=>'exstrachat.profile-layout.v196.'+nick;
 let owner='',layout='classic';
 const section=document.createElement('section');section.id='profile-layout-settings-v196';section.className='panel-section comfort-section-v167';section.dataset.settingsGroup='appearance';
 section.innerHTML='<div class="panel-section-title">Карточка профиля</div><p class="profile-layout-note-v196">Выбери, как выглядят открываемые тобой профили. Только для твоего аккаунта на этом устройстве. У других людей ничего не изменится.</p><div class="profile-layout-choices-v196" role="group" aria-label="Оформление карточки профиля"><button type="button" data-profile-layout="classic" aria-pressed="true"><span class="profile-layout-sample-v196 sample-classic-v196" aria-hidden="true"><i></i><b></b><em></em></span><strong>Классическая</strong><small>Прежний вид · баннер сверху</small></button><button type="button" data-profile-layout="panel" aria-pressed="false"><span class="profile-layout-sample-v196 sample-panel-v196" aria-hidden="true"><i></i><b></b><em></em></span><strong>Профиль-панель</strong><small>Новый вид · баннер сбоку</small></button></div>';
 panel.append(section);
 function apply(){if(layout==='panel')document.body.dataset.profileLayoutV196='panel';else document.body.removeAttribute('data-profile-layout-v196');for(const b of section.querySelectorAll('[data-profile-layout]'))b.setAttribute('aria-pressed',String(b.dataset.profileLayout===layout));}
 function sync(){const nick=account();if(nick!==owner){owner=nick;layout='classic';try{if(owner&&localStorage.getItem(key(owner))==='panel')layout='panel';}catch(_){}apply();}}
 function set(value){sync();if(!owner||!['classic','panel'].includes(value))return false;try{if(value==='classic')localStorage.removeItem(key(owner));else localStorage.setItem(key(owner),value);}catch(_){window.showToast?.('Не удалось сохранить оформление. Проверь свободное место.');return false;}layout=value;apply();return true;}
 section.addEventListener('click',event=>{const b=event.target.closest('[data-profile-layout]');if(b)set(b.dataset.profileLayout);});
 const kicker=document.createElement('span');kicker.className='profile-layout-kicker-v196';kicker.textContent='ПРОФИЛЬ';body.prepend(kicker);
 window.addEventListener('telechat-account-ready-v175',sync);window.addEventListener('pageshow',sync);window.addEventListener('storage',event=>{if(!event.key||event.key===key(account())){owner='';sync();}});
 const auth=document.getElementById('auth-screen');if(auth)new MutationObserver(sync).observe(auth,{attributes:true,attributeFilter:['class']});
 window.exstraProfileLayoutV196=Object.freeze({set,sync,getState:()=>({owner,layout})});sync();
})();
