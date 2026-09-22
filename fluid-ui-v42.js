/* Keep tab selection and button feedback; do not reanimate lists or media. */
(()=>{
 'use strict';
 const tabs=document.querySelector('.sidebar-tabs');
 function sync(){if(!tabs)return;const buttons=[...tabs.querySelectorAll('.sidebar-tab')];const value=String(Math.max(0,buttons.findIndex(b=>b.classList.contains('active'))));if(tabs.style.getPropertyValue('--tab-index-v42')!==value)tabs.style.setProperty('--tab-index-v42',value);}
 if(tabs){const observer=new MutationObserver(sync);for(const tab of tabs.querySelectorAll('.sidebar-tab'))observer.observe(tab,{attributes:true,attributeFilter:['class']});sync();}
 let pressed=null;
 function release(){pressed?.classList.remove('is-pressing-v42');pressed=null;}
 document.addEventListener('pointerdown',event=>{release();const control=event.target.closest('button,[role="button"]');if(!control||control.disabled)return;pressed=control;pressed.classList.add('is-pressing-v42');},{passive:true});
 window.addEventListener('pointerup',release,{passive:true});window.addEventListener('pointercancel',release,{passive:true});window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 document.body.classList.add('telechat-motion-v42');
})();
