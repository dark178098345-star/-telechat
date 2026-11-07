/* Presentation only. Called by the existing message painter before scroll restoration. */
(()=>{
 'use strict';
 const classes=['flow-start-v150','flow-joined-v150','flow-next-v150','flow-time-shared-v150'];
 const states=new WeakMap();
 const avatars=new WeakMap();
 function avatar(row){
  const m=row._messageSourceV136,nick=m?.from_nick;if(!nick||m.deleted){row.querySelector(':scope > .message-avatar-v189')?.remove();if(row.classList.contains('has-avatar-v189'))row.classList.remove('has-avatar-v189');avatars.delete(row);return;}
  if(!row.classList.contains('has-avatar-v189'))row.classList.add('has-avatar-v189');
  if(row.classList.contains('flow-next-v150')){row.querySelector(':scope > .message-avatar-v189')?.remove();avatars.delete(row);return;}
  let user;try{user=nick===me?.nick?me:userCache[nick];}catch(_){}
  const name=String(user?.name||nick),initial=(Array.from(name.trim())[0]||'?').toLocaleUpperCase('ru'),photo=typeof window.getAvatarPhoto==='function'?window.getAvatarPhoto(user):'';
  const safe=typeof photo==='string'&&(/^(data:image\/(png|jpeg|webp);base64,|blob:|https:\/\/)/i.test(photo))?photo:'';
  let button=row.querySelector(':scope > .message-avatar-v189');
  const signature=JSON.stringify([nick,name,safe]);if(button&&avatars.get(row)===signature)return;
  if(!button){button=document.createElement('button');button.type='button';button.className='message-avatar-v189';button.onclick=()=>window.openUserProfile?.(button.dataset.sender);row.append(button);}
  button.dataset.sender=nick;button.setAttribute('aria-label','Открыть профиль: '+name);button.title=name;
  button.replaceChildren();if(safe){const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.src=safe;img.onerror=()=>{if(img.parentNode===button)button.textContent=initial;};button.append(img);}else button.textContent=initial;
  avatars.set(row,signature);
 }
 function data(row){
  const m=row?._messageSourceV136;
  if(!row?.classList.contains('msg')||!m||m._type==='poll'||m.deleted||m.reply_text||m.forward_from||row.querySelector('.msg-reply-ref,.msg-forward,.poll-card,.call-history-card,.chat-gift-card,.tele-emoji-run-v127'))return null;
  const ts=Number(m.ts);return m.from_nick&&Number.isFinite(ts)?{nick:m.from_nick,ts,key:m.chat_key||''}:null;
 }
 function same(a,b,start,count){return !!a&&!!b&&a.nick===b.nick&&a.key===b.key&&b.ts>=a.ts&&b.ts-start<=300000&&count<8&&new Date(a.ts).toDateString()===new Date(b.ts).toDateString();}
 function apply(row,f){for(const name of classes)if(row.classList.contains(name)!==f.has(name))row.classList.toggle(name,f.has(name));
  avatar(row);
  const stamp=row.querySelector('.msg-time'),bubble=row.querySelector('.msg-bubble');
  if(stamp&&bubble&&!bubble.title)bubble.title=stamp.textContent;
 }
 function sync(box,tail){
  if(tail?.parentNode===box&&tail===box.lastElementChild&&tail.classList.contains('msg')){
   const previous=tail.previousElementSibling,prior=states.get(previous);
   if(!previous||!previous.classList.contains('msg')||prior){
    const m=data(tail),joined=same(prior?.data,m,prior?.start,prior?.count);
    apply(tail,new Set([joined?'flow-joined-v150':'flow-start-v150']));
    if(previous?.classList.contains('msg')){
     previous.classList.toggle('flow-next-v150',joined);
     previous.classList.toggle('flow-time-shared-v150',!!joined&&Math.floor(prior.data.ts/60000)===Math.floor(m.ts/60000));
     avatar(previous);
    }
    states.set(tail,{data:m,start:joined?prior.start:m?.ts||0,count:joined?prior.count+1:1});return;
   }
  }
  if(!box)return;const children=[...box.children],flags=new Map();let previous=null,prior=null,start=0,count=0;
  for(const row of children){
   const m=data(row);if(!row.classList.contains('msg')){previous=null;prior=null;count=0;continue;}
   const f=new Set(['flow-start-v150']);flags.set(row,f);
   if(same(prior,m,start,count)){f.delete('flow-start-v150');f.add('flow-joined-v150');flags.get(previous).add('flow-next-v150');count++;
    if(Math.floor(prior.ts/60000)===Math.floor(m.ts/60000))flags.get(previous).add('flow-time-shared-v150');
   }else{start=m?.ts||0;count=1;}
   states.set(row,{data:m,start,count});
   previous=row;prior=m;
  }
  // Exact times remain available on hover and to assistive technology.
  for(const [row,f] of flags)apply(row,f);
 }
 window.telechatMessageLayoutV150=Object.freeze({sync});
 window.addEventListener('telechat-user-updated-v123',event=>{const nick=event.detail?.nick;if(typeof nick!=='string'||!window.CSS?.escape)return;for(const button of document.querySelectorAll('#messages > .msg > .message-avatar-v189[data-sender="'+CSS.escape(nick)+'"]'))avatar(button.parentElement);});
 sync(document.getElementById('messages'));
})();
