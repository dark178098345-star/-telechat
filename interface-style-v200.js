/* Account-local background choice. Static SVG, no observers or background loop. */
(()=>{'use strict';
 const key='exstrachat.interface.v200.',body=document.body;
 const nick=()=>{try{return typeof me!=='undefined'&&me?String(me.nick||''):'';}catch(_){return '';}};
 let owner='',mode='clean';
 function paint(){body.dataset.interfaceV200=mode;document.querySelectorAll('[data-interface-choice-v200]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.interfaceChoiceV200===mode)));}
 function sync(){owner=nick();try{const saved=localStorage.getItem(key+(owner||'guest'));mode=saved==='drawings'?'drawings':'clean';}catch(_){mode='clean';}paint();}
 function set(value){if(!['clean','drawings'].includes(value))return false;if(nick()!==owner)sync();mode=value;try{localStorage.setItem(key+(owner||'guest'),mode);}catch(_){window.showToast?.('Не удалось сохранить оформление на устройстве.');}paint();return true;}
 const panel=document.getElementById('settings-panel');
 if(panel){const section=document.createElement('section');section.className='panel-section comfort-section-v167 interface-settings-v200';section.dataset.settingsGroup='appearance';section.innerHTML='<h3 class="panel-section-title">Фон и характер</h3><p>Фирменные рисунки или спокойный однотонный фон. Твои фотофоны остаются на месте.</p><div class="interface-choices-v200"><button type="button" data-interface-choice-v200="drawings"><span class="interface-sample-v200 interface-sample-drawings-v200" aria-hidden="true"></span><strong>С рисунками</strong><small>Музыка, глазки и разговоры</small></button><button type="button" data-interface-choice-v200="clean"><span class="interface-sample-v200" aria-hidden="true"></span><strong>Чистый</strong><small>Ничего лишнего</small></button></div>';section.addEventListener('click',event=>{const b=event.target.closest('[data-interface-choice-v200]');if(b)set(b.dataset.interfaceChoiceV200);});panel.append(section);}
 sync();window.addEventListener('telechat-account-ready-v175',sync);window.addEventListener('telechat-user-updated-v123',()=>{if(nick()!==owner)sync();});window.addEventListener('pageshow',()=>{if(nick()!==owner)sync();});window.addEventListener('storage',event=>{if(event.key===null||event.key===key+(nick()||'guest'))sync();});
 window.exstraInterfaceV200=Object.freeze({set,sync,getState:()=>({owner,mode})});
})();
