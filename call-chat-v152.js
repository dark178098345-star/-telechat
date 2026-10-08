/* A small ephemeral call chat over the existing encrypted WebRTC peer connections. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),self=()=>typeof me!=='undefined'?me?.nick||'':'',api=()=>window.telechatCallsV32;
 const history=[],seen=new Set();let session='',owner='',panel,toast,timer,unread=0;
 const icons={chat:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-1L3 21l1.5-5A9 9 0 1 1 21 11.5Z"/><path d="M8 10h8M8 14h5"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',end:'<path d="M3 15v-4c5-5 13-5 18 0v4h-5v-4M8 11v4H3"/>',accept:'<path d="m5 3 4 4-2 3a14 14 0 0 0 7 7l3-2 4 4-2 2C11 23 1 13 3 5Z"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M18 8v8M14 12h8"/>',down:'<path d="m6 9 6 6 6-6"/>',arrow:'<path d="M7 17 17 7M7 7h10v10"/>',send:'<path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14"/>'};
 const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
 function name(nick){return api()?.snapshot()?.members.find(m=>m.nick===nick)?.name||nick;}
 function sync(){const current=api()?.snapshot();if(session!==(current?.id||'')||owner!==self()){session=current?.id||'';owner=self();history.length=0;seen.clear();unread=0;clearTimeout(timer);if(toast)toast.hidden=true;closePanel();if(panel){panel.querySelector('input').value='';paint();}}
  const button=$('call-chat-btn-v152');if(button){button.disabled=!current||current.status==='calling';button.setAttribute('aria-label',unread?'Чат звонка, новых сообщений: '+unread:'Чат звонка');button.querySelector('b').textContent=unread?String(unread):'';button.querySelector('b').hidden=!unread;}
 }
 function paint(){if(!panel)return;const list=panel.querySelector('.call-chat-list-v152');list.replaceChildren();for(const item of history){const row=document.createElement('div');row.className='call-chat-message-v152'+(item.from===self()?' own':'');const author=document.createElement('strong'),body=document.createElement('p');author.textContent=item.from===self()?'Ты':name(item.from);body.textContent=item.text;row.append(author,body);list.append(row);}if(!history.length){const p=document.createElement('p');p.className='call-chat-empty-v152';p.textContent='Сообщения видят участники звонка. После его завершения история исчезнет.';list.append(p);}list.scrollTop=list.scrollHeight;}
 function receive(item){sync();if(!session||seen.has(item.id))return;seen.add(item.id);if(seen.size>200)seen.delete(seen.values().next().value);history.push(item);if(history.length>80)history.shift();paint();
  if(item.from!==self()){if(!panel?.classList.contains('show'))unread++;toast.replaceChildren();const author=document.createElement('strong'),body=document.createElement('span');author.textContent=name(item.from);body.textContent=item.text;toast.append(author,body);toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{toast.hidden=true;toast.replaceChildren();},4000);sync();}
 }
 function attach(state,peer,offerer,current){
  const account=self();
  function bind(channel){if(channel.label!=='telechat-chat-v152'||peer.chatChannelV152){channel.close();return;}peer.chatChannelV152=channel;let arrivals=[];
   channel.onopen=()=>{try{channel.send(JSON.stringify({v:1,hello:true}));}catch(_){}};
   channel.onmessage=event=>{if(!current()||self()!==account||typeof event.data!=='string'||event.data.length>10000)return;let data;try{data=JSON.parse(event.data);}catch(_){return;}if(data.v===1&&data.hello===true){peer.chatReadyV152=true;return;}if(state.members.get(peer.nick)?.status!=='joined'||data.v!==1||!/^[a-z0-9-]{10,64}$/i.test(data.id)||typeof data.text!=='string'||!data.text.trim()||data.text.length>1600)return;const now=Date.now();arrivals=arrivals.filter(t=>now-t<10000);if(arrivals.length>=12)return;arrivals.push(now);receive({id:peer.nick+':'+data.id,from:peer.nick,text:data.text});};
   channel.onclose=()=>{if(peer.chatChannelV152===channel){peer.chatChannelV152=null;peer.chatReadyV152=false;}};
   if(channel.readyState==='open')channel.onopen();
  }
  peer.pc.ondatachannel=event=>bind(event.channel);
  if(offerer&&typeof peer.pc.createDataChannel==='function')try{bind(peer.pc.createDataChannel('telechat-chat-v152',{ordered:true}));}catch(_){}
 }
 function send(state,text){text=String(text||'').trim();if(!state||!state.members.has(self())||state.closing||state.preview||!text||text.length>1600)throw Error(state?.preview?'В предпросмотре отправка недоступна.':'Дождись подключения к звонку.');
  const now=Date.now();state.chatSentV152=(state.chatSentV152||[]).filter(at=>now-at<10000);if(state.chatSentV152.length>=10)throw Error('Сообщения отправляются слишком быстро. Подожди несколько секунд.');
  const peers=[...state.peers.values()].filter(p=>state.members.get(p.nick)?.status==='joined'),id=crypto.randomUUID(),payload=JSON.stringify({v:1,id,text});let sent=0;
  for(const peer of peers){const channel=peer.chatChannelV152;if(!peer.chatReadyV152||channel?.readyState!=='open'||channel.bufferedAmount>64000)continue;try{channel.send(payload);sent++;}catch(_){}}
  if(!sent)throw Error('Чат ещё подключается. Если собеседник на старой версии — обновите приложение и перезвоните.');state.chatSentV152.push(now);receive({id:self()+':'+id,from:self(),text});return {sent,total:peers.length};
 }
 function closePanel(){panel?.classList.remove('show');$('call-chat-btn-v152')?.setAttribute('aria-expanded','false');}
 function openPanel(){sync();if(!session)return;window.closeCallSheetsV32?.();panel.classList.add('show');unread=0;sync();$('call-chat-btn-v152').setAttribute('aria-expanded','true');paint();panel.querySelector('input').focus();}
 function ensure(){const surface=document.querySelector('#voice-call-overlay .voice-call-surface');if(!surface)return;
  const map={'call-mic-btn':'mic','call-mixer-btn':'sound','call-add-btn':'users','call-minimize-btn':'down'};for(const [id,symbol] of Object.entries(map))if($(id))$(id).innerHTML=icon(symbol);
  surface.querySelectorAll('.voice-call-control.end').forEach(n=>n.innerHTML=icon('end'));surface.querySelectorAll('.voice-call-control.accept').forEach(n=>n.innerHTML=icon('accept'));
  const add=$('call-add-top-btn');if(add)add.innerHTML=icon('users')+'<b>Добавить</b>';
  document.querySelector('#voice-call-mini .voice-call-mini-end')?.replaceChildren();const miniEnd=document.querySelector('#voice-call-mini .voice-call-mini-end'),miniReturn=document.querySelector('#voice-call-mini .voice-call-mini-return');if(miniEnd)miniEnd.innerHTML=icon('end');if(miniReturn)miniReturn.innerHTML=icon('arrow');
  const wrap=document.createElement('div');wrap.className='voice-call-control-wrap';wrap.innerHTML='<button type="button" class="voice-call-control" id="call-chat-btn-v152" aria-label="Чат звонка" aria-expanded="false">'+icon('chat')+'<b hidden></b></button><span class="voice-call-control-label">Чат</span>';surface.querySelector('.voice-call-controls').insertBefore(wrap,surface.querySelector('.voice-call-controls .voice-call-control-wrap:last-child'));wrap.querySelector('button').onclick=()=>panel.classList.contains('show')?closePanel():openPanel();
  panel=document.createElement('section');panel.id='call-chat-panel-v152';panel.setAttribute('aria-label','Чат звонка');panel.innerHTML='<header><div><strong>Чат звонка</strong><small>Только для участников</small></div><button type="button" aria-label="Закрыть чат">×</button></header><div class="call-chat-list-v152" role="log" aria-live="polite"></div><form><input aria-label="Сообщение участникам звонка" placeholder="Написать участникам…" maxlength="1600" autocomplete="off"><button type="submit" aria-label="Отправить">'+icon('send')+'</button></form><p class="call-chat-result-v152" role="status"></p>';surface.append(panel);panel.querySelector('header button').onclick=closePanel;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePanel();$('call-chat-btn-v152').focus();}});
  panel.querySelector('form').onsubmit=e=>{e.preventDefault();const input=panel.querySelector('input'),status=panel.querySelector('.call-chat-result-v152');if(!input.value.trim())return;try{const result=api().sendText(input.value);input.value='';status.textContent=result.sent<result.total?'Отправлено подключённым участникам: '+result.sent+' из '+result.total:'';}catch(error){status.textContent=error.message;}};
  toast=document.createElement('button');toast.type='button';toast.id='call-message-toast-v152';toast.hidden=true;toast.setAttribute('aria-label','Открыть сообщение в чате звонка');toast.setAttribute('aria-live','polite');toast.onclick=openPanel;surface.append(toast);sync();
 }
 window.telechatCallChatV152=Object.freeze({attach,send,closePanel});window.addEventListener('telechat-call-ui-v152',sync);ensure();
})();
