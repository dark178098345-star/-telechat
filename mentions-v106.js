/* Nickname completion and safe, clickable mentions. */
(()=>{
  'use strict';
  const input=document.getElementById('msg-input');
  if(!input)return;
  const panel=document.createElement('div');
  panel.id='mention-picker-v106';panel.className='mention-picker-v106';panel.hidden=true;
  panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Упомянуть человека');document.body.append(panel);
  input.setAttribute('aria-controls',panel.id);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const cache=new Map(),jobs=new Map(),options=new Map(),failedPhotos=new Set();
  let revision=0,ownerGeneration=0,timer=0,frame=0,results=[],selected=0,range=null,composing=false,owner='';
  const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}};
  const chat=()=>{try{return conversationKey()||'';}catch(_){return '';}};
  const nickOf=user=>String(user?.nick||'').toLowerCase();
  const valid=nick=>/^[a-z0-9_]{1,64}$/.test(nick);
  const stored=nick=>{try{return userCache[nick]||(me?.nick===nick?me:null);}catch(_){return null;}};
  function syncOwner(){const next=account();if(next===owner)return;owner=next;ownerGeneration++;close();for(const job of jobs.values())job.controller.abort();jobs.clear();cache.clear();options.clear();failedPhotos.clear();panel.replaceChildren();}
  function token(){
    if(input.selectionStart!==input.selectionEnd)return null;
    const end=input.selectionStart,before=input.value.slice(0,end);
    const match=/(?:^|[\s([{«"',:;!?])@([\p{L}\p{N}_]{0,64})$/u.exec(before);
    if(!match||/[\p{L}\p{N}_]/u.test(input.value[end]||''))return null;
    return {start:end-match[1].length-1,end,query:match[1].toLowerCase(),key:chat(),owner:account(),room:typeof currentRoom!=='undefined'?currentRoom:null};
  }
  function close(){revision++;clearTimeout(timer);panel.hidden=true;results=[];range=null;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
  function position(){
    if(panel.hidden)return;
    const phone=innerWidth<=640||document.body.classList.contains('telechat-phone-v159');
    const rect=input.getBoundingClientRect(),anchor=((phone?input.closest('#input-area'):input.closest('.composer-shell'))||input).getBoundingClientRect(),viewport=window.visualViewport;
    if(!rect.width||!rect.height){close();return;}
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight,bottom=top+height;
    const w=Math.min(560,width-16,Math.max(240,anchor.width)),above=Math.max(0,Math.min(rect.top,bottom-8)-top-8),below=Math.max(0,bottom-Math.max(rect.bottom,top+8)-8),up=above>=below;
    panel.style.width=Math.max(1,w)+'px';panel.style.left=Math.max(left+8,Math.min(anchor.left,left+width-w-8))+'px';
    panel.style.maxHeight=Math.max(32,Math.min(320,up?above:below))+'px';
    const y=up?rect.top-panel.offsetHeight-8:rect.bottom+8;
    panel.style.top=Math.max(top+8,Math.min(y,bottom-panel.offsetHeight-8))+'px';
  }
  function schedulePosition(){if(panel.hidden||frame)return;frame=requestAnimationFrame(()=>{frame=0;position();});}
  function highlight(){
    results.forEach((user,index)=>{const button=options.get(nickOf(user));if(!button)return;
      const active=index===selected;button.classList.toggle('selected',active);button.setAttribute('aria-selected',String(active));
      if(active){input.setAttribute('aria-activedescendant',button.id);if(button.offsetTop<panel.scrollTop)panel.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>panel.scrollTop+panel.clientHeight)panel.scrollTop=button.offsetTop+button.offsetHeight-panel.clientHeight;}
    });
  }
  function choose(nick){
    const current=token(),user=results.find(user=>nickOf(user)===nick);
    if(!user||!range||!current||current.owner!==range.owner||current.key!==range.key||current.start!==range.start||current.end!==range.end||current.query!==range.query){close();return;}
    const space=/\s/.test(input.value[range.end]||'')?'':' ';
    const replacement='@'+nickOf(user)+space;
    input.setSelectionRange(range.start,range.end);
    const before=typeof InputEvent==='function'?new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertReplacementText',data:replacement}):new Event('beforeinput',{bubbles:true,cancelable:true});
    if(!input.dispatchEvent(before)){input.setSelectionRange(current.end,current.end);close();return;}
    input.setRangeText(replacement,current.start,current.end,'end');close();input.focus({preventScroll:true});
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function photo(user){try{const src=window.getAvatarPhoto?.(user)||window.unpackProfileData?.(user?.status)?.photo||'';if(src.length>2000000)return '';if(/^data:image\/(jpeg|png|webp);base64,/i.test(src))return src;const url=new URL(src);if(url.protocol==='https:'&&url.origin===new URL(SUPABASE_URL).origin&&url.pathname.startsWith('/storage/v1/object/public/'))return url.href;}catch(_){}return '';}
  function paint(button,user){
    const name=String(user.name||user.nick),image=button.firstElementChild,copy=button.lastElementChild,src=photo(user)||photo(stored(nickOf(user))),fallback=Array.from(name)[0]?.toLocaleUpperCase('ru-RU')||'?';
    if(copy.firstElementChild.textContent!==name)copy.firstElementChild.textContent=name;
    if(copy.lastElementChild.textContent!=='@'+nickOf(user))copy.lastElementChild.textContent='@'+nickOf(user);
    const key=src&&!failedPhotos.has(src)?src:'initial:'+fallback;
    if(image._mentionKey===key)return;image._mentionKey=key;
    if(!src||failedPhotos.has(src)){image.textContent=fallback;return;}
    const img=new Image(34,34);img.alt='';img.decoding='async';img.referrerPolicy='no-referrer';img.src=src;
    const generation=ownerGeneration;img.onerror=()=>{if(generation!==ownerGeneration)return;failedPhotos.add(src);if(failedPhotos.size>40)failedPhotos.delete(failedPhotos.values().next().value);if(image._mentionKey===src){image._mentionKey='initial:'+fallback;image.textContent=fallback;}};image.replaceChildren(img);
  }
  function hydrate(current){
    const loader=window.telechatUserCacheV123;if(!loader?.many)return;
    const nicks=results.map(nickOf).filter(nick=>!stored(nick)||stored(nick).status===undefined),ticket=revision;if(!nicks.length)return;
    Promise.resolve().then(()=>loader.many(nicks,true)).then(users=>{if(ticket!==revision||panel.hidden||account()!==current.owner||chat()!==current.key)return;for(const user of users||[]){const button=options.get(nickOf(user));if(button)paint(button,user);}}).catch(()=>{});
  }
  function show(users,current){
    const previous=range?.key===current.key&&range?.query===current.query?nickOf(results[selected]):'';
    results=users.slice(0,8);selected=Math.max(0,results.findIndex(user=>nickOf(user)===previous));range=current;
    if(!results.length){panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');return;}
    const wanted=new Set(results.map(nickOf));for(const [nick,button]of options)if(!wanted.has(nick)){button.remove();options.delete(nick);}
    results.forEach((user,index)=>{
      const nick=nickOf(user);let button=options.get(nick);
      if(!button){button=document.createElement('button');button.type='button';button.tabIndex=-1;button.id='mention-option-v106-'+nick;button.setAttribute('role','option');
        const avatar=document.createElement('span');avatar.className='mention-avatar-v106';avatar.setAttribute('aria-hidden','true');
        const copy=document.createElement('span');copy.className='mention-copy-v106';copy.append(document.createElement('b'),document.createElement('small'));button.append(avatar,copy);
        button.addEventListener('pointerdown',event=>event.preventDefault());button.addEventListener('click',()=>choose(nick));options.set(nick,button);
      }
      paint(button,user);if(panel.children[index]!==button)panel.insertBefore(button,panel.children[index]||null);
    });
    panel.hidden=false;input.setAttribute('aria-expanded','true');position();highlight();hydrate(current);
  }
  function matching(users,query){
    const unique=new Map();users.forEach(user=>{const nick=nickOf(user);if(valid(nick)&&(nick.includes(query)||String(user.name||'').toLowerCase().includes(query)))unique.set(nick,user);});
    return [...unique.values()].sort((a,b)=>Number(nickOf(b).startsWith(query))-Number(nickOf(a).startsWith(query)));
  }
  function local(current){
    if(current.room)return cache.get('room:'+current.owner+':'+current.room.id)?.users||[me].filter(Boolean);
    const nicks=new Set();try{if(currentChat)nicks.add(currentChat);}catch(_){}
    for(const row of document.querySelectorAll('#contacts-list [data-contact-nick]')){nicks.add(row.dataset.contactNick);if(nicks.size>=100)break;}
    let users=nicks.size?[...nicks].map(nick=>stored(nick)||{nick,name:nick}):Object.values(typeof userCache!=='undefined'?userCache:{});
    return [...users,me].filter(Boolean);
  }
  function cached(key,load){
    const old=cache.get(key);if(old&&Date.now()-old.at<60000)return Promise.resolve(old.users);
    if(jobs.has(key))return jobs.get(key).promise;
    if(navigator.onLine===false)return old?Promise.resolve(old.users):Promise.reject(Error('offline'));
    const actor=owner,generation=ownerGeneration,controller=new AbortController(),entry={controller};let deadline;
    entry.promise=Promise.race([Promise.resolve().then(()=>load(controller.signal)),new Promise((_,reject)=>deadline=setTimeout(()=>{reject(Error('Mention lookup timeout'));controller.abort();},8000))])
      .then(users=>{if(generation===ownerGeneration&&actor===owner&&account()===actor){cache.set(key,{at:Date.now(),users});if(cache.size>40)cache.delete(cache.keys().next().value);}return users;})
      .finally(()=>{clearTimeout(deadline);if(jobs.get(key)===entry)jobs.delete(key);});
    jobs.set(key,entry);return entry.promise;
  }
  function query(value,signal){if(signal.aborted)throw Error('cancelled');return value.abortSignal?value.abortSignal(signal):value;}
  async function candidates(current){
    const room=current.room;
    if(room){
      const members=await cached('room:'+current.owner+':'+room.id,async signal=>{
        const result=await query(sb.from('room_members').select('user_nick').eq('room_id',room.id).limit(500),signal);
        if(result.error)throw result.error;
        const nicks=[...new Set((result.data||[]).map(row=>row.user_nick))],users=[];
        for(let start=0;start<nicks.length;start+=100){
          const response=await query(sb.from('users').select('nick,name').in('nick',nicks.slice(start,start+100)),signal);
          if(response.error)throw response.error;users.push(...(response.data||[]));
        }
        return users;
      });
      return matching(members,current.query);
    }
    const known=matching(local(current),current.query);
    if(!current.query||!/^[a-z0-9_]+$/.test(current.query))return known;
    const users=await cached('search:'+current.owner+':'+current.query,async signal=>{
      const prefix=current.query.replace(/_/g,'\\_');
      const result=await query(sb.from('users').select('nick,name').ilike('nick',prefix+'%').limit(8),signal);
      if(result.error)throw result.error;return result.data||[];
    });
    return matching([...known,...users],current.query);
  }
  function update(){
    if(composing)return;
    syncOwner();
    const current=token();if(!current||!current.key||document.activeElement!==input){close();return;}
    const ticket=++revision;clearTimeout(timer);
    show(matching(local(current),current.query),current);
    timer=setTimeout(async()=>{
      try{const users=await candidates(current);if(ticket===revision&&account()===current.owner&&chat()===current.key&&document.activeElement===input)show(users,current);}catch(_){/* Local matches remain usable when offline. */}
    },180);
  }
  input.addEventListener('input',update);input.addEventListener('click',update);input.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))update();});
  input.addEventListener('compositionstart',()=>{composing=true;close();});input.addEventListener('compositionend',()=>{composing=false;update();});
  input.addEventListener('keydown',event=>{
    if(event.isComposing||panel.hidden||!results.length)return;
    if(event.key==='Enter'&&event.shiftKey){close();return;}
    if(['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Escape')close();
      else if(event.key==='Enter'||event.key==='Tab')choose(nickOf(results[selected]));
      else {selected=(selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;highlight();}
    }
  },true);
  input.addEventListener('blur',close);
  document.addEventListener('pointerdown',event=>{if(event.target!==input&&!panel.contains(event.target))close();},{passive:true});
  window.addEventListener('resize',schedulePosition,{passive:true});window.visualViewport?.addEventListener('resize',schedulePosition);window.visualViewport?.addEventListener('scroll',schedulePosition);
  if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(schedulePosition);for(const node of new Set([input,input.closest('.composer-shell'),input.closest('#input-area')]))if(node)observer.observe(node);}
  window.addEventListener('telechat-account-ready-v175',syncOwner);
  window.addEventListener('telechat-user-updated-v123',event=>{if(panel.hidden)return;const user=stored(event.detail?.nick),button=options.get(event.detail?.nick);if(user&&button)paint(button,user);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  for(const name of ['openChat','openRoom','goBack']){
    const previous=window[name];if(typeof previous==='function')window[name]=function(...args){close();return previous.apply(this,args);};
  }

  const renderBefore=renderMessageContent;
  renderMessageContent=function(...args){
    const html=renderBefore.apply(this,args);if(!String(html).includes('@'))return html;
    const template=document.createElement('template');template.innerHTML=html;
    const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('a,button,code,pre,script,style,textarea'))continue;
      const text=node.nodeValue,pattern=/(^|[\s([{«"',:;!?])@([a-z0-9_]{1,64})(?![a-z0-9_])/gi;
      let match,last=0,fragment=null;
      while((match=pattern.exec(text))){
        if(!fragment)fragment=document.createDocumentFragment();
        const start=match.index+match[1].length;fragment.append(document.createTextNode(text.slice(last,start)));
        const button=document.createElement('button');button.type='button';button.className='message-mention-v106';button.dataset.mentionNick=match[2].toLowerCase();button.textContent='@'+match[2];button.setAttribute('aria-label','Открыть профиль @'+match[2]);fragment.append(button);last=pattern.lastIndex;
      }
      if(fragment){fragment.append(document.createTextNode(text.slice(last)));node.replaceWith(fragment);}
    }
    return template.innerHTML;
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.message-mention-v106');if(!button||document.body.classList.contains('message-selection-mode-v36'))return;
    event.preventDefault();event.stopPropagation();Promise.resolve(openUserProfile(button.dataset.mentionNick)).catch(()=>showToast('Не удалось открыть профиль'));
  });
})();
