/* Original tele.chat artwork. Unicode is the portable message/storage format. */
(()=>{
 'use strict';
 const ink='#33283f';
 const eye=(x,y=21)=>`<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="${ink}"/>`;
 const cheeks='<ellipse cx="12" cy="28" rx="4" ry="2.2" fill="#ef7f9d" opacity=".5"/><ellipse cx="36" cy="28" rx="4" ry="2.2" fill="#ef7f9d" opacity=".5"/>';
 const line=d=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
 const heart=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 3C-7-3-10 4-7 8L0 14 7 8C10 4 7-3 0 3Z" fill="#e35e96" stroke="#a94477" stroke-width=".8"/>`;
 function face(color,features){return `<circle cx="24" cy="25" r="20.5" fill="#191326" opacity=".18"/><circle cx="24" cy="23.5" r="20" fill="${color}" stroke="#493454" stroke-opacity=".22" stroke-width="1.2"/><path d="M7 31c8 12 26 13 35-2-3 21-32 22-35 2Z" fill="#644389" opacity=".12"/><path d="M11 14c3-5 8-7 13-7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".48"/>${features}`;}
 const entries=[
  ['😀','Радость','улыбка рад счастлив joy smile','#c7a9f2',face('#c7a9f2',eye(17)+eye(31)+cheeks+'<path d="M14 29h20c-1 12-19 12-20 0Z" fill="'+ink+'"/><path d="M17 30h14l-2 4H19Z" fill="#fff4fc"/>')],
  ['😂','Смех','смешно ахаха laugh lol','#f8d093',face('#f8d093',line('m12 21 5-4 4 4m6 0 4-4 5 4')+'<path d="M14 28h20c0 15-20 15-20 0Z" fill="'+ink+'"/><path d="M19 36q5-5 10 0" stroke="#ed839e" stroke-width="4"/>'+ '<path d="M7 22c-2 4-5 6-4 9 2 6 9 2 7-2Zm34 0c2 4 5 6 4 9-2 6-9 2-7-2Z" fill="#81cfea"/>')],
  ['😍','Восхищение','любовь влюблен love wow','#f5b2cd',face('#f5b2cd',heart(15,15,.7)+heart(33,15,.7)+line('M16 31q8 9 16 0'))],
  ['🥰','Нежность','любовь обнимаю hug love','#efb8d9',face('#efb8d9',line('M12 21q4-5 8 0m8 0q4-5 8 0M18 30q6 5 12 0')+cheeks)+heart(40,1,.65)+heart(6,31,.6)],
  ['😘','Поцелуй','целую kiss love','#d3b6f2',face('#d3b6f2',eye(16)+line('m29 20 5 2-5 2m-7 5 4 2-4 2')+cheeks)+heart(38,28,.8)],
  ['😎','Круто','класс крутой очки cool','#b9c8ef',face('#b9c8ef','<path d="M9 17h12v7q-6 6-11-1Zm18 0h12l-1 6q-5 7-11 1Z" fill="'+ink+'"/>'+line('M21 19h6M18 32q6 4 12-1')+'<path d="m12 19 5 0m13 0h5" stroke="#bba7ed" stroke-width="2" stroke-linecap="round"/>')],
  ['🥺','Прошу','пожалуйста мило умоляю please','#dcc1f6',face('#dcc1f6','<ellipse cx="16" cy="23" rx="5" ry="6" fill="'+ink+'"/><ellipse cx="32" cy="23" rx="5" ry="6" fill="'+ink+'"/><circle cx="14.5" cy="21" r="2" fill="white"/><circle cx="30.5" cy="21" r="2" fill="white"/>'+line('m12 14 7-2m10 0 7 2M21 34q3-3 6 0')+cheeks)],
  ['😭','Слёзы','грусть плачу печаль sad cry','#aacded',face('#aacded',line('m12 17 7-3m10 0 7 3M12 22h8m8 0h8')+'<path d="M13 24h6v16h-6Zm16 0h6v16h-6Z" fill="#69acd5"/><ellipse cx="24" cy="33" rx="4" ry="5" fill="'+ink+'"/>')],
  ['😡','Злость','злой бесит angry mad','#efaaa9',face('#efaaa9',eye(17,23)+eye(31,23)+line('m12 16 9 4m6 0 9-4M17 34q7-7 14 0')+'<path d="m37 6 2 3 4-1m-3 3 1 4" fill="none" stroke="#a65076" stroke-width="2"/>')],
  ['😮','Удивление','ого шок удивлен surprise wow','#d5bbf5',face('#d5bbf5',eye(16)+eye(32)+line('M12 14q4-3 8 0m8 0q4-3 8 0')+'<ellipse cx="24" cy="33" rx="4" ry="5" fill="'+ink+'"/>')],
  ['🤔','Думаю','хм вопрос думаю think hmm','#d8c2ef',face('#d8c2ef',eye(16)+eye(31,23)+line('M12 14h8m8 3 7 2M24 31h7')+'<path d="m18 39 3-8c1-3 5-2 4 1l-1 4 7-1c5-1 5 5 1 7l-9 3Z" fill="#edd2ac" stroke="#745878" stroke-width="1.5"/>')],
  ['😴','Сон','сплю спать устал sleep tired','#b8b1e7',face('#b8b1e7',line('M12 23q4 3 8 0m8 0q4 3 8 0')+'<ellipse cx="24" cy="32" rx="3" ry="2.5" fill="'+ink+'"/>')+'<path d="M34 4h8l-8 8h8M42 15h4l-4 4h4" fill="none" stroke="#8063bb" stroke-width="2.4" stroke-linejoin="round"/>'],
  ['❤️','Сердце','люблю любовь сердце love heart','#ed94be','<path d="M24 42S3 29 3 15C3 3 18 1 24 11 30 1 45 3 45 15c0 14-21 27-21 27Z" fill="#ed94be" stroke="#bd679a" stroke-width="1.5"/><path d="M9 16c0-5 5-8 9-5" fill="none" stroke="#ffe1ee" stroke-width="3.5" stroke-linecap="round"/><path d="M11 31q15 6 30-10C35 34 24 42 24 42Z" fill="#aa5a92" opacity=".2"/>'],
  ['👍','Класс','да лайк хорошо палец like yes','#a3c9ed','<path d="M19 41H8V21h11m0 20h15c3 0 5-2 6-5l5-15c1-3-1-5-4-5H29l1-8c1-7-6-7-8-1l-5 14Z" fill="#a3c9ed" stroke="#668bb3" stroke-width="1.7" stroke-linejoin="round"/><path d="M18 23v16M26 9l-2 11h13" fill="none" stroke="#e6efff" stroke-width="2.6" stroke-linecap="round"/><circle cx="13" cy="35" r="2" fill="#6486ac"/>'],
  ['🔥','Огонь','огонь жарко fire hot','#f2af92','<path d="M26 3c2 11 17 16 17 28a19 19 0 0 1-38 0c0-8 4-14 10-19-1 8 4 11 6 7 3-5 5-9 5-16Z" fill="#eea38f" stroke="#b97188" stroke-width="1.5"/><path d="M25 22c0 8 9 10 8 15-2 11-18 11-19 0-1-5 7-9 11-15Z" fill="#ffdfaa"/><path d="m13 24-3 7" stroke="#ffe0c1" stroke-width="2.5" stroke-linecap="round"/>'],
  ['🌙','Луна','ночь луна telechat moon night','#c0acee','<path d="M35 5C12 2 0 28 17 41c13 10 29 0 29-11C24 41 13 16 35 5Z" fill="#c0acee" stroke="#8f78be" stroke-width="1.5"/><path d="M18 11C8 21 12 35 23 38" fill="none" stroke="#e7dcff" stroke-width="3" stroke-linecap="round"/><path d="m36 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f2cf9e"/>']
 ];
 entries.push(['🌧️','Дождик','облако дождь погода rain cloud','#acc6ed','<path d="M12 29C1 29 1 15 11 14 12 2 31 1 34 13c15-1 17 16 3 16Z" fill="#c4c2ea" stroke="#8b8db6" stroke-width="1.5"/><path d="M12 16c1-7 11-10 16-4" fill="none" stroke="#efecff" stroke-width="3" stroke-linecap="round"/><path d="m14 33-3 7M25 33l-3 7M36 33l-3 7" fill="none" stroke="#83bee6" stroke-width="3" stroke-linecap="round"/>']);
 const modes=['joy','laugh','love','tender','kiss','cool','plea','cry','anger','surprise','think','sleep','heart','thumb','fire','moon','rain'];
 const selectors={
  joy:{eyes:'ellipse[rx="2"]',mouth:'path[d^="M14 29"]'},
  laugh:{tears:'path[fill="#81cfea"]'},love:{hearts:'path[fill="#e35e96"]'},tender:{hearts:'path[fill="#e35e96"]'},kiss:{hearts:'path[fill="#e35e96"]'},
  cool:{glasses:'path[fill="#33283f"]',shine:'path[stroke="#bba7ed"]'},plea:{shine:'circle[fill="white"]'},
  cry:{tears:'path[fill="#69acd5"]',mouth:'ellipse[rx="4"]'},anger:{vein:'path[stroke="#a65076"]'},surprise:{mouth:'ellipse[rx="4"]',eyes:'ellipse[rx="2"]'},
  think:{hand:'path[fill="#edd2ac"]'},sleep:{sleep:'path[stroke="#8063bb"]',mouth:'ellipse[rx="3"]'},fire:{flame:'path[fill="#eea38f"]',core:'path[fill="#ffdfaa"]'},moon:{star:'path[fill="#f2cf9e"]'},rain:{cloud:'path[fill="#c4c2ea"]'}
 };
 function tint(hex,amount){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(amount>0?v+(255-v)*amount:v*(1+amount)).toString(16).padStart(2,'0')).join('');}
 function motionMarkup(shape,mode,color){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.innerHTML=shape;
  const base=mode==='fire'?'#eea38f':mode==='rain'?'#c4c2ea':color;
  const primary=[...svg.querySelectorAll('[fill]')].filter(node=>node.getAttribute('fill')===base);
  // Keep expressive facial lines, but remove contour strokes around filled shapes.
  for(const node of svg.querySelectorAll('[fill][stroke]'))if(node.getAttribute('fill')!=='none')node.removeAttribute('stroke');
  // Wrap moving details so CSS transforms never replace an original SVG transform.
  for(const [part,selector] of Object.entries(selectors[mode]||{}))for(const node of svg.querySelectorAll(selector)){
   const group=document.createElementNS(svg.namespaceURI,'g');group.dataset.emojiPart=part;node.replaceWith(group);group.append(node);
  }
  if(mode==='rain'){
   svg.querySelector('path[stroke="#83bee6"]').remove();
   for(const x of [14,25,36]){const drop=document.createElementNS(svg.namespaceURI,'path');drop.dataset.emojiPart='drop';drop.setAttribute('d',`m${x} 33-3 7`);drop.setAttribute('stroke','#83bee6');drop.setAttribute('stroke-width','3');drop.setAttribute('stroke-linecap','round');svg.append(drop);}
  }
  for(const node of primary)node.setAttribute('fill','url(#tele-fill-token)');
  const colors=mode==='heart'?['#ff7179','#ff1834','#bd002b']:[tint(base,.38),base,tint(base,-.25)];
  if(mode==='heart'){svg.querySelector('[stroke="#ffe1ee"]')?.setAttribute('stroke','#fff4f5');svg.querySelector('[fill="#aa5a92"]')?.setAttribute('fill','#920027');}
  return `<defs><linearGradient id="tele-fill-token" x1="8" y1="3" x2="34" y2="45" gradientUnits="userSpaceOnUse"><stop stop-color="${colors[0]}"/><stop offset=".42" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs><g data-emoji-part="body">${svg.innerHTML}</g>`;
 }
 let serial=0;
 const all=entries.map(([emoji,label,keywords,color,shape],index)=>{const markup=motionMarkup(shape,modes[index],color);return {emoji,label,keywords,color,get html(){return `<svg class="tele-emoji-art-v127 reaction-art-v126" data-emoji-motion="${modes[index]}" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">${markup.replaceAll('tele-fill-token','tele-fill-v130-'+(++serial))}</svg>`;}};});
 const byEmoji=new Map(all.map(item=>[item.emoji,item]));byEmoji.set('❤',byEmoji.get('❤️'));
 byEmoji.set('🌧',byEmoji.get('🌧️'));
 window.telechatEmojiArtV127={all,get:emoji=>byEmoji.get(emoji)};
})();
