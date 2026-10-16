/* Delegated phone gesture. Native vertical scrolling and media controls keep ownership. */
(()=>{
 'use strict';
 const box=document.getElementById('messages');if(!box)return;
 let gesture=null,suppressUntil=0;const threshold=58,limit=78;
 const key=()=>{try{return conversationKey()||'';}catch(_){return '';}};
 const owner=()=>{try{return me?.nick||'';}catch(_){return '';}};
 const enabled=()=>document.body.classList.contains('telechat-phone-v159')&&!document.body.classList.contains('message-selection-mode-v36')&&!document.querySelector('dialog[open],.ctx-menu.show,.modal-overlay.show,.side-panel.open');
 const selection=()=>Boolean(window.getSelection()?.toString());
 function clear(){const g=gesture;gesture=null;if(!g)return;g.row.classList.remove('swipe-active-v174','swipe-ready-v174');g.row.style.removeProperty('--swipe-x-v174');}
 box.addEventListener('touchstart',event=>{clear();if(!enabled()||event.touches.length!==1||selection()||event.target.closest('button,a,input,textarea,audio,video,.voice-track,[role=slider],.voice-waveform,.poll-card,[contenteditable],.message-reaction-v36'))return;const row=event.target.closest('.msg'),m=row?._messageSourceV136,t=event.touches[0];if(!row||!m||m.deleted||m._type==='poll'||typeof m.text!=='string'||t.clientX<24||t.clientX>innerWidth-16||(m.chat_key&&m.chat_key!==key())||typeof canWriteCurrent==='function'&&!canWriteCurrent())return;gesture={row,message:m,owner:owner(),key:key(),id:t.identifier,x:t.clientX,y:t.clientY,start:performance.now(),locked:false,dx:0};},{passive:true});
 box.addEventListener('touchmove',event=>{const g=gesture;if(!g)return;const t=[...event.touches].find(t=>t.identifier===g.id);if(!t||event.touches.length!==1||!enabled()||selection()||g.key!==key()||g.owner!==owner()||!g.row.isConnected){clear();return;}const dx=t.clientX-g.x,dy=t.clientY-g.y;if(!g.locked){if(Math.abs(dy)>9||dx< -8||performance.now()-g.start>450){clear();return;}if(dx<12||dx<Math.abs(dy)*1.8)return;g.locked=true;g.row.classList.add('swipe-active-v174');}if(!event.cancelable){clear();return;}event.preventDefault();g.dx=Math.max(0,Math.min(limit,dx));g.row.style.setProperty('--swipe-x-v174',g.dx+'px');g.row.classList.toggle('swipe-ready-v174',g.dx>=threshold);},{passive:false});
 box.addEventListener('touchend',event=>{const g=gesture;if(!g)return;const ended=[...event.changedTouches].some(t=>t.identifier===g.id);if(!ended)return;const fire=g.locked&&g.dx>=threshold&&g.key===key()&&g.owner===owner()&&g.row.isConnected&&!g.message.deleted&&!selection()&&enabled();if(g.locked)suppressUntil=performance.now()+400;clear();if(fire)window.replyToMessage?.(g.row._messageSourceV136||g.message);},{passive:true});
 box.addEventListener('touchcancel',clear,{passive:true});
 box.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});window.addEventListener('resize',clear,{passive:true});window.addEventListener('telechat-native-visibility',clear,{passive:true});
})();
