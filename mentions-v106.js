/* Nickname completion and safe, clickable mentions. */
(()=>{
  'use strict';
  const input=document.getElementById('msg-input');
  if(!input)return;
  const panel=document.createElement('div');
  panel.id='mention-picker-v106';panel.className='mention-picker-v106';panel.hidden=true;
  panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Упомянуть человека');document.body.append(panel);
  input.setAttribute('aria-controls',panel.id);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const cache=new Map(),jobs=new Map();
  let revision=0,timer=0,results=[],selected=0,range=null,composing=false;
  const chat=()=>{try{return conversationKey()||'';}catch(_){return '';}};
  const nickOf=user=>String(user?.nick||'').toLowerCase();
  const valid=nick=>/^[a-z0-9_]{3,20}$/.test(nick);
  function token(){
    if(input.selectionStart!==input.selectionEnd)return null;
    const end=input.selectionStart,before=input.value.slice(0,end);
    const match=/(?:^|[\s([{«"',:;!?])@([\p{L}\p{N}_]{0,32})$/u.exec(before);
    if(!match||/[a-z0-9_]/i.test(input.value[end]||''))return null;
    return {start:end-match[1].length-1,end,query:match[1].toLowerCase(),key:chat()};
  }
  function close(){revision++;clearTimeout(timer);panel.hidden=true;results=[];range=null;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
  function position(){
    if(panel.hidden)return;
    const rect=input.getBoundingClientRect(),viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth;
    panel.style.width=Math.min(350,width-24)+'px';
    panel.style.left=Math.max(left+12,Math.min(rect.left,left+width-panel.offsetWidth-12))+'px';
    panel.style.maxHeight=Math.max(90,Math.min(280,rect.top-top-16))+'px';
    panel.style.top=Math.max(top+8,rect.top-panel.offsetHeight-8)+'px';
  }
  function highlight(){
    [...panel.querySelectorAll('[role="option"]')].forEach((button,index)=>{
      const active=index===selected;button.classList.toggle('selected',active);button.setAttribute('aria-selected',String(active));
      if(active){input.setAttribute('aria-activedescendant',button.id);if(button.offsetTop<panel.scrollTop)panel.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>panel.scrollTop+panel.clientHeight)panel.scrollTop=button.offsetTop+button.offsetHeight-panel.clientHeight;}
    });
  }
  function choose(index){
    const current=token(),user=results[index];
    if(!user||!range||!current||current.key!==range.key||current.start!==range.start||current.end!==range.end||current.query!==range.query){close();return;}
    const space=/\s/.test(input.value[range.end]||'')?'':' ';
    input.setRangeText('@'+nickOf(user)+space,range.start,range.end,'end');close();input.focus();
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function show(users,current){
    const previous=range?.key===current.key&&range?.query===current.query?nickOf(results[selected]):'';
    results=users.slice(0,8);selected=Math.max(0,results.findIndex(user=>nickOf(user)===previous));range=current;panel.replaceChildren();
    if(!results.length){panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');return;}
    const title=document.createElement('div');title.className='mention-heading-v106';title.textContent='Упомянуть';panel.append(title);
    results.forEach((user,index)=>{
      const button=document.createElement('button');button.type='button';button.tabIndex=-1;button.id='mention-option-v106-'+index;button.setAttribute('role','option');
      const avatar=document.createElement('span');avatar.className='mention-avatar-v106';avatar.textContent=String(user.name||user.nick).slice(0,1).toUpperCase();
      const copy=document.createElement('span'),name=document.createElement('b'),nick=document.createElement('small');
      name.textContent=user.name||user.nick;nick.textContent='@'+nickOf(user);copy.append(name,nick);button.append(avatar,copy);
      button.addEventListener('pointerdown',event=>event.preventDefault());button.addEventListener('click',()=>choose(index));panel.append(button);
    });
    panel.hidden=false;input.setAttribute('aria-expanded','true');position();highlight();
  }
  function matching(users,query){
    const unique=new Map();users.forEach(user=>{const nick=nickOf(user);if(valid(nick)&&(nick.includes(query)||String(user.name||'').toLowerCase().includes(query)))unique.set(nick,user);});
    return [...unique.values()].sort((a,b)=>Number(nickOf(b).startsWith(query))-Number(nickOf(a).startsWith(query))||nickOf(a).localeCompare(nickOf(b)));
  }
  function cached(key,load){
    const old=cache.get(key);if(old&&Date.now()-old.at<60000)return Promise.resolve(old.users);
    if(jobs.has(key))return jobs.get(key);
    const job=Promise.resolve().then(load).then(users=>{cache.set(key,{at:Date.now(),users});if(cache.size>40)cache.delete(cache.keys().next().value);return users;}).finally(()=>jobs.delete(key));
    jobs.set(key,job);return job;
  }
  async function candidates(current){
    const room=typeof currentRoom!=='undefined'?currentRoom:null;
    if(room){
      const members=await cached('room:'+me.nick+':'+room.id,async()=>{
        const result=await sb.from('room_members').select('user_nick').eq('room_id',room.id).limit(500);
        if(result.error)throw result.error;
        const nicks=[...new Set((result.data||[]).map(row=>row.user_nick))],users=[];
        for(let start=0;start<nicks.length;start+=100){
          const response=await sb.from('users').select('nick,name').in('nick',nicks.slice(start,start+100));
          if(response.error)throw response.error;users.push(...(response.data||[]));
        }
        return users;
      });
      return matching(members,current.query);
    }
    const known=matching([...(typeof userCache!=='undefined'?Object.values(userCache):[]),me],current.query);
    if(!current.query||!/^[a-z0-9_]+$/.test(current.query))return known;
    const users=await cached('search:'+me.nick+':'+current.query,async()=>{
      const prefix=current.query.replace(/_/g,'\\_');
      const result=await sb.from('users').select('nick,name').ilike('nick',prefix+'%').limit(8);
      if(result.error)throw result.error;return result.data||[];
    });
    return matching([...known,...users],current.query);
  }
  function update(){
    if(composing)return;
    const current=token();if(!current||!current.key||document.activeElement!==input){close();return;}
    const ticket=++revision;clearTimeout(timer);
    if(typeof currentRoom==='undefined'||!currentRoom)show(matching([...(typeof userCache!=='undefined'?Object.values(userCache):[]),me],current.query),current);
    else {panel.hidden=true;results=[];input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
    timer=setTimeout(async()=>{
      try{const users=await candidates(current);if(ticket===revision&&chat()===current.key&&document.activeElement===input)show(users,current);}catch(_){/* Local matches remain usable when offline. */}
    },180);
  }
  input.addEventListener('input',update);input.addEventListener('click',update);input.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))update();});
  input.addEventListener('compositionstart',()=>{composing=true;close();});input.addEventListener('compositionend',()=>{composing=false;update();});
  input.addEventListener('keydown',event=>{
    if(event.isComposing||panel.hidden||!results.length)return;
    if(['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Escape')close();
      else if(event.key==='Enter'||event.key==='Tab')choose(selected);
      else {selected=(selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;highlight();}
    }
  },true);
  input.addEventListener('blur',close);
  document.addEventListener('pointerdown',event=>{if(event.target!==input&&!panel.contains(event.target))close();},{passive:true});
  window.addEventListener('resize',position,{passive:true});window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
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
      const text=node.nodeValue,pattern=/(^|[\s([{«"',:;!?])@([a-z0-9_]{3,20})(?![a-z0-9_])/gi;
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
