/* Render known Unicode emoji using local artwork, without changing stored text. */
(()=>{
 'use strict';
 const art=window.telechatEmojiArtV127;
 if(!art||typeof window.renderMessageContent!=='function')return;
 const emojiPattern=/\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\p{Emoji_Modifier})*(?:\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\p{Emoji_Modifier})*)*/gu;
 const candidates=/[😀😂😍🥰😘😎🥺😭😡😮🤔😴❤👍🔥🌙]/u;
 const before=window.renderMessageContent;
 function decorate(html){
  if(!candidates.test(html))return html;
  const template=document.createElement('template');template.innerHTML=html;
  const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   if(node.parentElement?.closest('svg,script,style,button,a,code,pre,textarea,.tele-emoji-v127,.voice-message,.chat-gift-card'))continue;
   const text=node.nodeValue;let last=0,fragment=null;
   for(const match of text.matchAll(emojiPattern)){
    const item=art.get(match[0]);if(!item)continue;
    if(!fragment)fragment=document.createDocumentFragment();
    fragment.append(document.createTextNode(text.slice(last,match.index)));
    const span=document.createElement('span');span.className='tele-emoji-v127';span.dataset.teleEmoji=match[0];span.setAttribute('role','img');span.setAttribute('aria-label',item.label);span.title=item.label;
    const fallback=document.createElement('span');fallback.className='tele-emoji-text-v127';fallback.textContent=match[0];fallback.setAttribute('aria-hidden','true');span.append(fallback);span.insertAdjacentHTML('beforeend',item.html);fragment.append(span);last=match.index+match[0].length;
   }
   if(fragment){fragment.append(document.createTextNode(text.slice(last)));node.replaceWith(fragment);}
  }
  const plain=template.content.textContent.trim(),tokens=[...plain.matchAll(emojiPattern)];
  if(tokens.length>0&&tokens.length<=3&&tokens.every(m=>art.get(m[0]))&&!plain.replace(emojiPattern,'').trim()&&template.content.querySelector('.tele-emoji-v127')&&!template.content.querySelector('img,audio,video,button,a,code,pre,.tele-emoji-run-v127')){
   const run=document.createElement('span');run.className='tele-emoji-run-v127';run.append(...template.content.childNodes);template.content.append(run);
  }
  return template.innerHTML;
 }
 window.renderMessageContent=function(...args){return decorate(before.apply(this,args));};
 document.getElementById('messages')?.addEventListener('click',event=>{
  const emoji=event.target.closest('.tele-emoji-v127');if(emoji)window.telechatReactionArtV126?.animate(emoji);
 });
 window.telechatEmojiV127={decorate};
})();
