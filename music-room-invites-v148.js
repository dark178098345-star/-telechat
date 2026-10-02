/* Explicit, private-chat listening invitations. No auto-join or automatic fan-out. */
(()=>{
 'use strict';
 const prefix='Приглашение слушать вместе\n',lifetime=15*60*1000;
 const user=()=>{try{return me?.nick||'';}catch(_){return '';}};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2M3 12h4v8H3zM17 12h4v8h-4z"/></svg>';
 const sent=new Map(),pending=new Set(),ignoredMemory=new Set();
 function parse(text){try{if(typeof text!=='string'||text.length>1600||!text.startsWith(prefix))return null;const link=text.slice(prefix.length),url=new URL(link);if(url.origin!==location.origin||url.pathname!==location.pathname||url.username||url.password)return null;const data=window.telechatTogetherV147.invitation(link),at=Number(url.searchParams.get('invite'));if(!data||!Number.isSafeInteger(at)||at<=0||at>Date.now()+60000)return null;return {...data,link,at,expiresAt:at+lifetime};}catch(_){return null;}}
 const ignoreKey=d=>'telechat-room-ignore-v148:'+user()+':'+d.id+':'+d.at;
 function ignored(d){const k=ignoreKey(d);try{return ignoredMemory.has(k)||!!sessionStorage.getItem(k);}catch(_){return ignoredMemory.has(k);}}
 function markIgnored(d){const k=ignoreKey(d);ignoredMemory.add(k);try{sessionStorage.setItem(k,'1');}catch(_){}}
 function card(d){const expired=Date.now()>d.expiresAt,skip=ignored(d);return `<section class="room-invitation-v148" data-room-link="${escape(d.link)}"><div class="room-invite-title-v148">${icon}<div><strong>Слушаем вместе</strong><small>Приглашение в музыкальную комнату</small></div></div><p>Подключись к музыке друга.</p><div class="room-invite-buttons-v148" ${expired||skip?'hidden':''}><button type="button" data-room-invite="join">Войти</button><button type="button" data-room-invite="ignore">Проигнорировать</button></div><small class="room-invite-result-v148" role="status">${expired?'Срок приглашения истёк':skip?'Приглашение проигнорировано':''}</small><small class="room-invite-sent-v148">Приглашение отправлено · действует 15 минут</small></section>`;}
 const render=window.renderMessageContent;if(typeof render==='function')window.renderMessageContent=function(text,...args){const d=parse(text);return d?card(d):render.call(this,text,...args);};
 const preview=window.messagePreviewText;if(typeof preview==='function')window.messagePreviewText=function(text,...args){return parse(text)?'Приглашение слушать музыку вместе':preview.call(this,text,...args);};
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-room-invite]'),cardNode=b?.closest('.room-invitation-v148');if(!cardNode||cardNode.closest('.msg.me')||b.disabled)return;
  e.preventDefault();e.stopPropagation();const d=parse(prefix+cardNode.dataset.roomLink),status=cardNode.querySelector('.room-invite-result-v148');if(!d)return;
  if(Date.now()>d.expiresAt){status.textContent='Срок приглашения истёк';cardNode.querySelector('.room-invite-buttons-v148').hidden=true;return;}
  if(b.dataset.roomInvite==='ignore'){markIgnored(d);cardNode.querySelector('.room-invite-buttons-v148').hidden=true;status.textContent='Приглашение проигнорировано';return;}
  const account=user();b.disabled=true;try{const current=window.telechatTogetherV147.state();if(current?.id===d.id)window.telechatTogetherV147.open();else await window.telechatTogetherV147.join(d.link);if(user()===account)status.textContent='Ты в комнате';}catch(error){status.textContent=error.message||'Не удалось войти';}finally{b.disabled=false;}
 });
 function existingChats(){const nicks=new Set();document.querySelectorAll('#contacts-list [data-contact-nick],#contacts-list [data-chat-kind="private"][data-nick]').forEach(el=>nicks.add(el.dataset.contactNick||el.dataset.nick));try{const snapshot=JSON.parse(localStorage.getItem('telechat.sidebar.v18.'+user())||'null');Object.keys(snapshot?.users||{}).forEach(nick=>nicks.add(nick));}catch(_){}return [...nicks].filter(nick=>nick!==user()&&/^[a-zA-Z0-9_]{1,64}$/.test(nick));}
 function profile(nick){try{return nick===me.nick?me:userCache[nick];}catch(_){return null;}}
 function open(panel,r){
  panel.replaceChildren();const title=document.createElement('h3');title.textContent='Пригласить слушателя';
  const form=document.createElement('form');form.className='together-invite-form-v148';form.innerHTML='<input aria-label="Ник пользователя" placeholder="@ник пользователя" maxlength="65" autocomplete="off" spellcheck="false"><button type="submit">Пригласить</button>';
  const status=document.createElement('p');status.setAttribute('role','status');status.className='together-invite-status-v148';const list=document.createElement('div');list.className='together-invite-chats-v148';
  const label=document.createElement('small');label.textContent='ИЗ ТВОИХ ЧАТОВ';panel.append(title,form,status,label,list);
  async function send(nick,button){
   nick=nick.trim().replace(/^@/,'').toLowerCase();const owner=user(),key=owner+':'+r.id+':'+nick;
   if(pending.has(key))return;if(sent.has(key)){status.textContent='Приглашение уже отправлено в этот чат.';return;}
   if(!/^[a-zA-Z0-9_]{1,64}$/.test(nick)||nick===owner){status.textContent='Укажи ник другого пользователя.';return;}
   pending.add(key);button.disabled=true;status.textContent='Отправляем приглашение…';
   try{const found=await sb.from('users').select('nick').eq('nick',nick).maybeSingle();if(found.error)throw Error('Не удалось проверить ник. Проверь соединение.');if(!found.data)throw Error('Пользователь не найден.');const current=window.telechatTogetherV147.state();if(user()!==owner||owner!==r.owner||current?.id!==r.id||!current.host)throw Error('Комната уже закрыта.');
    const url=new URL(r.link),at=Date.now();url.searchParams.set('invite',String(at));const sender=window.telechatDeliveryV72?.sendDirect;if(!sender)throw Error('Обнови приложение, чтобы отправлять приглашения.');
    const ok=await sender(nick,prefix+url.href,{expiresAt:at+lifetime});sent.set(key,true);if(user()===owner)status.textContent=ok?'Приглашение отправлено @'+nick:'Нет связи. Приглашение в очереди, оно действительно 15 минут.';button.textContent=ok?'Отправлено':'В очереди';
   }catch(error){status.textContent=error.message||'Не удалось пригласить.';}finally{pending.delete(key);button.disabled=sent.has(key);}
  }
  form.addEventListener('submit',e=>{e.preventDefault();send(form.querySelector('input').value,form.querySelector('button'));});
  form.querySelector('input').addEventListener('input',()=>{form.querySelector('button').disabled=false;form.querySelector('button').textContent='Пригласить';});
  const nicks=existingChats();if(!nicks.length){const empty=document.createElement('p');empty.textContent='Нет чатов в текущем списке. Пригласи по нику.';list.append(empty);}
  for(const nick of nicks){const p=profile(nick),row=document.createElement('div');row.className='together-invite-chat-v148';const name=document.createElement('span');name.textContent=(p?.name||nick)+' · @'+nick;const b=document.createElement('button');b.type='button';b.textContent=sent.has(user()+':'+r.id+':'+nick)?'Отправлено':'Пригласить';b.disabled=sent.has(user()+':'+r.id+':'+nick);b.onclick=()=>send(nick,b);row.append(name,b);list.append(row);}
  form.querySelector('input').focus();
 }
 window.telechatRoomInvitesV148=Object.freeze({open,parse});
})();
