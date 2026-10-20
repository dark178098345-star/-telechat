/* Presentation only. Called by the existing message painter before scroll restoration. */
(()=>{
 'use strict';
 const classes=['flow-start-v150','flow-joined-v150','flow-next-v150','flow-time-shared-v150'];
 const states=new WeakMap();
 function data(row){
  const m=row?._messageSourceV136;
  if(!row?.classList.contains('msg')||!m||m._type==='poll'||m.deleted||m.reply_text||m.forward_from||row.querySelector('.msg-reply-ref,.msg-forward,.poll-card,.call-history-card,.chat-gift-card,.tele-emoji-run-v127'))return null;
  const ts=Number(m.ts);return m.from_nick&&Number.isFinite(ts)?{nick:m.from_nick,ts,key:m.chat_key||''}:null;
 }
 function same(a,b,start,count){return !!a&&!!b&&a.nick===b.nick&&a.key===b.key&&b.ts>=a.ts&&b.ts-start<=300000&&count<8&&new Date(a.ts).toDateString()===new Date(b.ts).toDateString();}
 function apply(row,f){for(const name of classes)if(row.classList.contains(name)!==f.has(name))row.classList.toggle(name,f.has(name));
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
 sync(document.getElementById('messages'));
})();
