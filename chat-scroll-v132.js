/* Follow late media layout without polling or pulling a reader out of history. */
(()=>{
 'use strict';
 const box=document.getElementById('messages'),host=document.getElementById('active-chat');if(!box||!host)return;
 const button=document.createElement('button');button.type='button';button.className='chat-bottom-v132';button.hidden=true;button.title='К последним сообщениям';button.setAttribute('aria-label','К последним сообщениям');button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6"/></svg>';host.append(button);
 let pinned=false,frame=0,generation=0,intent=0,opening=false,cancelled=false,positionDirty=true;
 const distance=()=>Math.max(0,box.scrollHeight-box.clientHeight-box.scrollTop);
 const visible=()=>box.clientHeight>0&&host.getClientRects().length>0;
 function paint(){
  if(!visible()){button.hidden=true;return;}
  if(positionDirty){positionDirty=false;const r=box.getBoundingClientRect(),h=host.getBoundingClientRect();const left=Math.max(r.left-h.left+8,r.right-h.left-58)+'px',top=Math.max(r.top-h.top+8,r.bottom-h.top-58)+'px';if(button.style.left!==left)button.style.left=left;if(button.style.top!==top)button.style.top=top;}
  button.hidden=distance()<150;
 }
 function schedule(){if(frame)return;const token=generation;frame=requestAnimationFrame(()=>{frame=0;if(token!==generation)return;if(pinned&&visible())box.scrollTop=box.scrollHeight;paint();});}
 function bottom(force=false){if(force!==true&&(!pinned||opening&&cancelled)){schedule();return;}pinned=true;schedule();}
 window.scrollToBottom=bottom;
 button.addEventListener('click',()=>{cancelled=false;pinned=true;schedule();});
 function manual(){intent++;cancelled=true;pinned=false;}
 box.addEventListener('wheel',e=>{if(e.deltaY<0)manual();},{passive:true});
 let touchY=0;box.addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY||0;},{passive:true});box.addEventListener('touchmove',e=>{const y=e.touches[0]?.clientY||0;if(y>touchY)manual();touchY=y;},{passive:true});
 box.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.clientX>=box.getBoundingClientRect().right-18)manual();},{passive:true});
 box.addEventListener('keydown',e=>{if(['ArrowUp','PageUp','Home'].includes(e.key)||(e.key===' '&&e.shiftKey))manual();});
 box.addEventListener('scroll',()=>{if(distance()<3)pinned=true;else if(!opening&&!frame)pinned=false;schedule();},{passive:true});
 const append=window.appendMessage;if(typeof append==='function')window.appendMessage=async function(message,doScroll=true){
  const key=window.conversationKey?.(),token=generation,startIntent=intent;
  const own=doScroll&&message&&typeof me!=='undefined'&&message.from_nick===me?.nick&&(!message.chat_key||message.chat_key===key);
  if(own)bottom(true);
  const result=await append.apply(this,arguments);
  if(own&&token===generation&&key===window.conversationKey?.()&&startIntent===intent)bottom(true);
  return result;
 };
 const observed=new Set(),resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{if(entries.some(entry=>entry.target===box))positionDirty=true;schedule();}):null;
 function observe(child){if(child.nodeType!==1||observed.has(child))return;observed.add(child);resize?.observe(child);}
 resize?.observe(box);for(const child of box.children)observe(child);
 new MutationObserver(records=>{
  for(const record of records){
   for(const child of record.removedNodes)if(observed.has(child)&&child.parentNode!==box){resize?.unobserve(child);observed.delete(child);}
   for(const child of record.addedNodes)if(child.parentNode===box)observe(child);
  }
  schedule();
 }).observe(box,{childList:true});schedule();
 const layout=()=>{positionDirty=true;schedule();};
 box.addEventListener('load',schedule,true);box.addEventListener('loadedmetadata',schedule,true);window.addEventListener('resize',layout,{passive:true});window.visualViewport?.addEventListener('resize',layout,{passive:true});
 for(const name of ['openChat','openRoom']){const before=window[name];if(typeof before!=='function')continue;window[name]=async function(...args){const token=++generation;cancelAnimationFrame(frame);frame=0;positionDirty=true;opening=true;cancelled=false;pinned=true;const startIntent=intent;try{return await before.apply(this,args);}finally{if(token===generation){opening=false;if(startIntent===intent&&!cancelled)pinned=true;schedule();}}};}
 const back=window.goBack;if(typeof back==='function')window.goBack=function(...args){generation++;cancelAnimationFrame(frame);frame=0;opening=false;pinned=false;button.hidden=true;return back.apply(this,args);};
})();
