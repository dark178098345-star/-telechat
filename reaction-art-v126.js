/* Custom reaction artwork; existing emoji keys remain unchanged in storage. */
(()=>{'use strict';
 const face='<circle cx="16" cy="16" r="12" fill="currentColor" fill-opacity=".14"/><circle cx="16" cy="16" r="11.2"/>';
 const shapes={
 '❤️':['Сердце','#fb8ca6','<path d="M16 27S3 19 3 10.5C3 3 12 2 16 8c4-6 13-5 13 2.5C29 19 16 27 16 27Z" fill="currentColor" fill-opacity=".24"/><path d="M8 10c0-2 2-3 4-2" stroke-opacity=".65"/>'],
 '🥰':['Нежность','#e9a4c6',face+'<path d="M9 14q2-3 4 0M19 14q2-3 4 0M11 20q5 5 10 0"/><path d="M25 10s-5-3-5-6c0-3 4-3 5-1 1-2 5-2 5 1 0 3-5 6-5 6Z" fill="currentColor" stroke-width="1.2"/>'],
 '😘':['Поцелуй','#d5acf4',face+'<path d="M9 13h2M20 13l3 1-3 1M15 19l3 1.5-3 1.5"/><path d="M27 27s-5-3-5-6c0-3 4-3 5-1 1-2 5-2 5 1 0 3-5 6-5 6Z" fill="currentColor" stroke-width="1"/>'],
 '👍':['Класс','#91c9ef','<path d="M12 27H6V14h6m0 13h11a3 3 0 0 0 3-2l3-10a2 2 0 0 0-2-3h-8l1-6c0-5-4-5-5-1l-3 9Z" fill="currentColor" fill-opacity=".18"/><path d="M12 14v13M8 23h1"/>'],
 '🔥':['Огонь','#f6b17b','<path d="M17 2c2 8 11 10 11 18a12 12 0 0 1-24 0c0-5 3-9 6-11 0 5 3 6 4 4 2-2 3-6 3-11Z" fill="currentColor" fill-opacity=".16"/><path d="M17 16c0 5 5 6 4 9-1 5-9 5-10 0-1-3 4-5 6-9Z" fill="currentColor" fill-opacity=".5" stroke-width="1.2"/>'],
 '😍':['Восхищение','#f3a0b8',face+'<path d="M10 17s-5-3-5-6c0-3 4-3 5-1 1-2 5-2 5 1 0 3-5 6-5 6Zm12 0s-5-3-5-6c0-3 4-3 5-1 1-2 5-2 5 1 0 3-5 6-5 6Z" fill="currentColor" stroke-width="1"/><path d="M11 21q5 5 10 0"/>']};
 const motions=new WeakMap();
 function info(emoji){const custom=window.telechatEmojiArtV127?.get(emoji);if(custom)return custom;const [label,color,shape]=shapes[emoji]||['Реакция','#b9acf0','<circle cx="16" cy="16" r="10"/><path d="m11 16 3 3 7-7"/>'];return {label,color,html:'<svg class="reaction-art-v126" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+shape+'</svg>'};}
 function animate(button){if(!button?.animate)return;const icon=button.querySelector('.reaction-art-v126')||button;motions.get(icon)?.cancel();motions.delete(icon);if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;const motion=icon.animate([{transform:'scale(.7) rotate(-9deg)'},{transform:'scale(1.18) rotate(5deg)',offset:.55},{transform:'scale(1) rotate(0)'}],{duration:320,easing:'cubic-bezier(.2,.7,.3,1)'});motions.set(icon,motion);motion.onfinish=()=>motions.delete(icon);}
 window.telechatReactionArtV126={info,animate};
})();
