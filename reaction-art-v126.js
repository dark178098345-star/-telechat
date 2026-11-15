/* New artwork in reactions; historic Unicode keys and counts are preserved. */
(()=>{'use strict';
 const motions=new WeakMap(),escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function info(emoji){const item=window.telechatEmojiArtV127?.get(emoji);return item||{label:'Реакция '+emoji,color:'#ffcf43',html:'<span class="reaction-art-v126" aria-hidden="true">'+escape(emoji)+'</span>'};}
 function animate(button){if(window.telechatEmojiMotionV128&&button?.querySelector('[data-emoji-motion]'))return window.telechatEmojiMotionV128.animate(button);if(!button?.animate||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const node=button.querySelector('.reaction-art-v126')||button;motions.get(node)?.cancel();const motion=node.animate([{transform:'scale(.8)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});motions.set(node,motion);motion.onfinish=()=>motions.delete(node);}
 // A hold previews the artwork; it must never write a second reaction.
 let hold=null,preview=null,suppress=null,suppressUntil=0;
 const choice=target=>target?.closest?.('[data-reaction-v36],.message-reaction-v36');
 function cancel(){if(hold){clearTimeout(hold.timer);hold.button.classList.remove('reaction-holding-v213');}hold=null;preview?.remove();preview=null;}
 function peek(job){if(hold!==job||!job.button.isConnected||job.button.disabled||document.hidden)return;const token=job.button.dataset.reactionV36||job.button.dataset.emojiV36,art=info(token);preview=document.createElement('div');preview.className='reaction-preview-v213';preview.setAttribute('role','tooltip');preview.innerHTML='<span class="reaction-preview-art-v213">'+art.html+'</span><span>'+escape(art.label)+'</span>';document.body.append(preview);const r=job.button.getBoundingClientRect(),v=window.visualViewport,left=v?.offsetLeft||0,top=v?.offsetTop||0,width=v?.width||innerWidth,height=v?.height||innerHeight,box=preview.getBoundingClientRect();preview.style.left=Math.max(left+8,Math.min(left+width-box.width-8,r.left+r.width/2-box.width/2))+'px';preview.style.top=Math.max(top+8,Math.min(top+height-box.height-8,r.top-box.height-12<top+8?r.bottom+12:r.top-box.height-12))+'px';job.active=true;job.button.classList.add('reaction-holding-v213');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)preview.animate?.([{opacity:.12,transform:'translateY(6px) scale(.85)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});requestAnimationFrame(()=>{if(hold===job&&preview)animate(preview);});}
 document.addEventListener('pointerdown',event=>{if(event.button!==0||event.isPrimary===false)return;const button=choice(event.target);if(!button||button.disabled)return;cancel();const job={button,x:event.clientX,y:event.clientY,pointer:event.pointerId,active:false};hold=job;job.timer=setTimeout(()=>peek(job),300);},true);
 document.addEventListener('pointermove',event=>{if(hold&&event.pointerId===hold.pointer&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>16)cancel();},{capture:true,passive:true});
 document.addEventListener('pointerup',event=>{if(!hold||event.pointerId!==hold.pointer)return;if(hold.active){suppress=hold.button;suppressUntil=Date.now()+700;event.preventDefault();}cancel();},true);
 document.addEventListener('pointercancel',cancel,true);
 document.addEventListener('click',event=>{const button=choice(event.target);if(button&&button===suppress&&Date.now()<suppressUntil){suppress=null;event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('contextmenu',event=>{if(choice(event.target)){event.preventDefault();event.stopPropagation();}},true);
 document.addEventListener('touchstart',event=>{if(choice(event.target))event.stopPropagation();},{capture:true,passive:true});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.addEventListener('telechat-account-ready-v175',cancel);window.addEventListener('pagehide',cancel);window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);document.addEventListener('scroll',cancel,{capture:true,passive:true});
 window.telechatReactionArtV126=Object.freeze({info,animate});
})();
