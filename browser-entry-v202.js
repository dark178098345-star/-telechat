/* Windows-only native utility. No iframe, remote page preload or idle work. */
(()=>{'use strict';
 const desktop=window.telechatDesktop;if(!desktop?.isDesktop)return;
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01m0 7.5h5m-2-2 2 2-2 2"/></svg>';
 async function open(){if(typeof desktop.openBrowser!=='function'||desktop.browserVersion<2){window.showToast?.('Нужна новая Windows-версия ExstraChat 1.4.0.');return;}try{const result=await desktop.openBrowser('','embedded');if(!result?.ok)window.showToast?.(result?.error||'Не удалось открыть раздел сайтов.');}catch(_){window.showToast?.('Не удалось открыть раздел сайтов. Попробуй ещё раз.');}}
 const rail=document.querySelector('.section-rail-v109');
 if(rail&&!document.getElementById('browser-entry-v202')){const b=document.createElement('button');b.type='button';b.id='browser-entry-v202';b.className='browser-entry-v202';b.innerHTML=icon+'<span>Сайты</span>';b.title='Сайты · раздел с вкладками';b.onclick=open;const music=rail.querySelector(':scope>.music-entry-v96');if(music)music.after(b);else rail.append(b);}
 const settings=document.getElementById('settings-home-v160');if(settings){const b=document.createElement('button');b.type='button';b.id='browser-settings-v202';b.innerHTML=icon+'<span><strong>Окно сайтов</strong></span><span aria-hidden="true">↗</span>';b.onclick=open;settings.append(b);}
 window.exstraBrowserV202=Object.freeze({open});
})();
