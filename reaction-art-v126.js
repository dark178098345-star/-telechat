/* New artwork in reactions; historic Unicode keys and counts are preserved. */
(()=>{'use strict';
 const motions=new WeakMap(),escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function info(emoji){const item=window.telechatEmojiArtV127?.get(emoji);return item||{label:'Реакция '+emoji,color:'#ffcf43',html:'<span class="reaction-art-v126" aria-hidden="true">'+escape(emoji)+'</span>'};}
 function animate(button){if(window.telechatEmojiMotionV128&&button?.querySelector('[data-emoji-motion]'))return window.telechatEmojiMotionV128.animate(button);if(!button?.animate||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const node=button.querySelector('.reaction-art-v126')||button;motions.get(node)?.cancel();const motion=node.animate([{transform:'scale(.8)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});motions.set(node,motion);motion.onfinish=()=>motions.delete(node);}
 window.telechatReactionArtV126=Object.freeze({info,animate});
})();
