/* Original pixel artwork and local chat companion. No message or profile data is stored. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),self=()=>typeof me!=='undefined'?String(me?.nick||''):'';
 const conversation=()=>typeof conversationKey==='function'?String(conversationKey()||''):'';
 const styles=[['classic','Классика','#8793b2'],['anime','Аниме','#a68aff'],['kawaii','Кавай','#ed8fc5'],['cat','Котик','#b9d958'],['robot','Робот','#60dbed'],['demon','Демон','#f18b54'],['cyclops','Циклоп','#a8db83']];
 const eyeIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
 const active=$('active-chat'),messages=$('messages'),input=$('msg-input');if(!active||!messages||!input)return;
 let owner='',prefs={enabled:true,style:'classic',shake:false},stage,canvas,dialog,preview,focusBefore;
 let frame=0,lastFrame=0,running=false,nativeHidden=false,mood='idle',until=0,moodStart=0,typingUntil=0,remoteTyping=false;
 let typingX=0,readingUntil=0,readingY=0,scrollIntentUntil=0,lastScroll=0;
 let previewMood='',previewUntil=0,previewStart=0;
 let welcomePending=false;
 const artCanvases=new WeakMap();
 let key='',primed=false,primeTimer=0,scanQueued=false,seen=new Set(),look={x:0,y:0},motionOn=false,motionAllowed=false,lastMotion=null,lastShake=0;
 const emotions=new Map();
 for(const [expression,tokens] of Object.entries({angry:['😡','😠','😤','🤬','👿','😾','💢'],laugh:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','☺','🙂','🙃','😋','😛','😜','😝','🤪','😸','😹'],sad:['😢','😭','😥','😞','😔','😟','😩','☹','🙁','😿'],love:['❤','♥','💕','💖','💗','💘','💝','💜','💙','💚','💛','🧡','🤍','🖤','🤎','🩷','🩵','🩶','😍','🥰','😘','<3'],surprised:['😮','😯','😲','😳','😱','😨','😰','🤯'],sleep:['😴','🥱','😪','💤'],think:['🤔','🧐','🤨'],wink:['😉'],dizzy:['😵','🥴'],excited:['🥳','🎉','🔥','👍','👏','🤩']}))for(const token of tokens)emotions.set(token,expression);
 const emotionPattern=new RegExp('(?:'+[...emotions.keys()].join('|')+')[\\uFE0E\\uFE0F]?','gu');
 const emotionCandidate=new RegExp([...emotions.keys()].join('|'),'u');
 function emotion(text){
  let value=String(text||'');
  if(!emotionCandidate.test(value))return '';
  if(value.startsWith('__telechat_story_reply_v152__:')){try{value=JSON.parse(value.slice('__telechat_story_reply_v152__:'.length)).text||'';}catch(_){return '';}}
  else if(value.startsWith('__telechat_media_v1__:')){try{const media=JSON.parse(value.slice('__telechat_media_v1__:'.length));value=['image','voice','file'].includes(media.kind)?String(media.caption||''):'';}catch(_){return '';}}
  else if(value.startsWith('__telechat_'))return '';
  value=value.replace(/https?:\/\/\S+/gi,'');let found='';
  for(const match of value.matchAll(emotionPattern))found=emotions.get(match[0].replace(/[\uFE0E\uFE0F]/g,''))||found;
  return found;
 }
 const emotionDuration=expression=>({angry:2300,laugh:2500,sad:2400,love:2400,sleep:2200,dizzy:2400,surprised:1800,think:1800,excited:1800})[expression]||1600;
 const storageKey=nick=>'telechat.pixel-eyes.v155.'+nick;
 function read(){try{const p=JSON.parse(localStorage.getItem(storageKey(owner))||'null');prefs={enabled:p?.enabled!==false,style:styles.some(([id])=>id===p?.style)?p.style:'classic',shake:p?.shake===true};}catch(_){prefs={enabled:true,style:'classic',shake:false};}}
 function save(){try{localStorage.setItem(storageKey(owner),JSON.stringify(prefs));}catch(_){}sync();scheduleScan();paintSettings();}
 function pixel(ctx,color,x,y,w=1,h=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
 function heartPixels(ctx,x,y,color,scale=1){['0110110','1111111','1111111','0111110','0011100','0001000'].forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')pixel(ctx,color,x+xx*scale,y+yy*scale,scale,scale);}));}
 function draw(target,style,expression,time,pointer={x:0,y:0}){
  let art=artCanvases.get(target);if(!art){art=document.createElement('canvas');art.width=64;art.height=32;artCanvases.set(target,art);}
  const ctx=art.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,64,32);ctx.imageSmoothingEnabled=false;
  const ink='#202335',white='#fff8ee',shadow='#aab5c6',accent=expression==='angry'?'#ee7974':styles.find(([id])=>id===style)?.[2]||'#8793b2';
  const phase=(time%5200),blink=['idle','focus','typing','read','think','record','attach'].includes(expression)&&phase>4750&&phase<4900;
  const laugh=expression==='laugh',angry=expression==='angry',sleep=expression==='sleep';
  const happy=expression==='happy'||laugh,sad=expression==='sad',love=expression==='love',dizzy=expression==='dizzy';
  const positions=style==='cyclops'?[24]:[9,39];
  const px=Math.round(expression==='typing'?typingX+Math.sin(time/300):['think','attach','record'].includes(expression)?Math.sin(time/400)*2:['curious','surprised'].includes(expression)?Math.sin(time/280)*2:expression==='read'?pointer.x+Math.sin(time/400):expression==='idle'?pointer.x:0);
  const py=Math.round(['typing','focus','attach'].includes(expression)?2:expression==='read'?readingY:expression==='think'?-1:expression==='idle'?pointer.y:sad?2:0);
  positions.forEach((x,i)=>{
   const bounce=happy?Math.round(Math.abs(Math.sin(time/(laugh?75:110)))*(laugh?3:2)):angry?Math.round(Math.sin(time/80)):love?Math.round(Math.sin(time/180)):expression==='welcome'?Math.round(Math.sin(time/100)*Math.max(0,2-time/500)):sad?1:0;
   const y=8-bounce;
   const wink=expression==='wink'&&i===0&&(Math.floor(time/160)%3!==2);
   if(happy&&Math.floor(time/(laugh?140:200))%4!==3||blink||wink||sleep){
    if(happy){pixel(ctx,white,x+2,y+8,3,2);pixel(ctx,white,x+5,y+6,6,2);pixel(ctx,white,x+11,y+8,3,2);pixel(ctx,accent,x+3,y+12,3,1);pixel(ctx,accent,x+10,y+12,3,1);}
    else{pixel(ctx,ink,x+1,y+7,14,4);pixel(ctx,shadow,x+3,y+8,10,2);}
    if(laugh){const drop=Math.floor(time/90)%7;pixel(ctx,'#74d4ef',x+(i?16:-2),y+8+drop,2,3);pixel(ctx,'#d8faff',x+(i?16:-2),y+8+drop,1,1);}return;
   }
   if(style==='robot'){
    pixel(ctx,ink,x,y+1,16,14);pixel(ctx,'#375269',x+1,y+2,14,12);pixel(ctx,accent,x+3,y+4,10,8);pixel(ctx,ink,x+5+px,y+5+py,6,6);pixel(ctx,'#e6ffff',x+6+px,y+6+py,2,2);pixel(ctx,'#8bebed',x+1,y+2,2,2);
    if(love)heartPixels(ctx,x+4,y+5,'#ee628c');
    if(dizzy){const step=Math.floor(time/100)%4;pixel(ctx,ink,x+5,y+5,6,6);pixel(ctx,white,x+5+(step%2)*4,y+5+Math.floor(step/2)*4,2,2);}
   }else{
    const cat=style==='cat'||style==='demon';
    const shape=cat?[6,10,14,16,16,16,14,10,6]:[8,12,14,16,16,16,16,16,16,16,14,12,8];
    const shift=cat?3:1;
    shape.forEach((w,row)=>{const left=(16-w)/2;pixel(ctx,ink,x+left,y+shift+row,w,1);if(row>0&&row<shape.length-1)pixel(ctx,cat?accent:white,x+left+1,y+shift+row,w-2,1);});
    pixel(ctx,cat?'#899e42':shadow,x+4,y+shift+shape.length-3,8,1);
    if(style==='kawaii'&&!love&&!dizzy){
     pixel(ctx,ink,x+3,y+3,10,10);pixel(ctx,accent,x+4,y+10,8,3);pixel(ctx,'#fff8f3',x+4,y+4,3,3);pixel(ctx,'#fff8f3',x+10,y+8,2,2);
    }else if(love){heartPixels(ctx,x+4,y+5,'#ee628c');}
    else if(dizzy){
     const step=Math.floor(time/100)%4;pixel(ctx,accent,x+4,y+4,8,8);pixel(ctx,ink,x+6,y+6,4,4);pixel(ctx,white,x+5+(step%2)*4,y+5+Math.floor(step/2)*4,2,2);
    }else if(cat){pixel(ctx,ink,x+7+px,y+4,2,8);pixel(ctx,white,x+4,y+5,2,2);}
    else{
     const iris=style==='anime'?8:style==='cyclops'?9:6;
     pixel(ctx,accent,x+Math.round((16-iris)/2)+px,y+4+py,iris,8);
     pixel(ctx,ink,x+6+px,y+5+py,4,5);pixel(ctx,white,x+5+px,y+4+py,2,2);pixel(ctx,white,x+9+px,y+8+py,1,1);
    }
    if(style==='anime'){pixel(ctx,ink,x-1,y+5,2,2);pixel(ctx,ink,x+15,y+5,2,2);pixel(ctx,ink,x+3,y,10,1);}
    if(style==='demon'){pixel(ctx,'#cc5862',x+1,y+1,5,2);pixel(ctx,'#cc5862',x+9,y+1,5,2);}
   }
   if(sad){const drop=Math.floor(time/130)%8;pixel(ctx,'#66ccef',x+(i?2:12),y+13+drop,2,3);pixel(ctx,'#c8f6ff',x+(i?2:12),y+13+drop,1,1);pixel(ctx,ink,x+2,y,4,1);pixel(ctx,ink,x+10,y+1,4,1);}
   if(laugh){const drop=Math.floor(time/90)%7;pixel(ctx,'#74d4ef',x+(i?16:-2),y+8+drop,2,3);}
   if(angry){for(let step=0;step<3;step++){const xx=x+1+step*5,yy=y+(i?3-step:1+step);pixel(ctx,'#713e50',xx,yy+1,5,2);pixel(ctx,'#f48a82',xx,yy,5,2);}}
   if(['curious','welcome','excited','surprised'].includes(expression)){pixel(ctx,'#e9bf6c',x+7,y-5,2,3);pixel(ctx,'#fff2bd',x+7,y-1,2,1);}
   if(expression==='think'){pixel(ctx,shadow,x+2,y-2,4,1);pixel(ctx,shadow,x+10,y-1,4,1);}
  });
  if(love){const rise=Math.floor(time/180)%5;heartPixels(ctx,21,5-rise,'#ee779e');heartPixels(ctx,51,7-rise,'#f6a0bf');}
  if(dizzy){pixel(ctx,'#e1bb70',29,5,2,2);pixel(ctx,'#d0adfb',31,26,2,2);}
  if(expression==='record'){for(let i=0;i<4;i++){const height=2+Math.round((1+Math.sin(time/140+i))*2);pixel(ctx,'#ee829f',27+i*3,29-height,2,height);}}
  if(expression==='attach'){const lift=Math.round(Math.sin(time/200));pixel(ctx,'#ccb0f3',29,2-lift,6,4);pixel(ctx,'#ccb0f3',27,4-lift,10,5);pixel(ctx,'#514362',28,5-lift,8,3);}
  if(expression==='think'){const p=Math.floor(time/180)%3;for(let i=0;i<3;i++)pixel(ctx,i===p?'#eed5a2':'#746581',28+i*3,3,2,2);}
  if(expression==='excited'){const step=Math.floor(time/130)%3;pixel(ctx,'#efd898',29,3,6,2);pixel(ctx,'#efd898',31,1,2,6);pixel(ctx,'#b9a0ea',24-step,25,2,2);pixel(ctx,'#f09ec0',39+step,26,2,2);}
  if(angry){const lift=Math.floor(time/150)%2;pixel(ctx,'#f48a82',29,1+lift,2,3);pixel(ctx,'#f48a82',31,3+lift,2,2);pixel(ctx,'#f48a82',34,1+lift,2,3);}
  if(sleep){const rise=Math.floor(time/260)%5;pixel(ctx,'#c7b5f2',29,7-rise,5,1);pixel(ctx,'#c7b5f2',32,8-rise,1,1);pixel(ctx,'#c7b5f2',31,9-rise,1,1);pixel(ctx,'#c7b5f2',30,10-rise,1,1);pixel(ctx,'#c7b5f2',29,11-rise,5,1);}
  // A one-pixel dark contour and a stepped silver lower edge, like the reference.
  const out=target.getContext('2d');out.clearRect(0,0,64,32);out.imageSmoothingEnabled=false;
  const pixels=ctx.getImageData(0,0,64,32).data,occupied=[];
  for(let y=0;y<32;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3])occupied.push([x,y]);
  out.fillStyle='#9298ad';for(const [x,y] of occupied)out.fillRect(x+1,y+2,1,1);
  out.fillStyle='#0b0e19';for(const [x,y] of occupied)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])out.fillRect(x+dx,y+dy,1,1);
  out.drawImage(art,0,0);
 }
 function currentMood(now){if(now<until)return mood;if($('record-btn')?.dataset.voiceState==='recording')return 'record';if(document.activeElement?.id==='message-edit-input-v36')return 'think';if(now<typingUntil)return 'typing';if(now<readingUntil)return 'read';if(document.activeElement===input)return 'focus';return remoteTyping?'curious':'idle';}
 function tick(now){
  if(!running)return;frame=requestAnimationFrame(tick);if(now-lastFrame<50)return;lastFrame=now;
  const state=currentMood(now),pointer={x:look.x||Math.round(Math.sin(now/1900)*2),y:look.y};
  if(!stage.hidden)draw(canvas,prefs.style,state,now-moodStart,pointer);
  if(dialog?.open)draw(preview,prefs.style,now<previewUntil?previewMood:state,now<previewUntil?now-previewStart:now-moodStart,pointer);
 }
 function react(expression,duration=1700,force=false){
  if(!owner||owner!==self()||!prefs.enabled||stage.hidden)return;
  const priority=value=>['love','sad','dizzy','angry'].includes(value)?4:['happy','laugh','wink'].includes(value)?3:['think','attach','excited','surprised','sleep'].includes(value)?2:1;
  if(!force&&expression!=='idle'&&performance.now()<until&&priority(mood)>priority(expression))return;
  mood=expression;moodStart=performance.now();until=moodStart+duration;stage.dataset.mood=expression;sync();
 }
 function resetConversation(){clearTimeout(primeTimer);primeTimer=0;key=conversation();welcomePending=!!key;primed=false;seen.clear();mood='idle';until=typingUntil=readingUntil=0;remoteTyping=$('chat-status-text')?.classList.contains('typing')||false;stage.dataset.mood='idle';scheduleScan();}
 function sync(){
  const account=self();if(account!==owner){owner=account;read();resetConversation();if(dialog?.open)dialog.close();paintSettings();}
  if(key!==conversation())resetConversation();
  const visible=!!owner&&prefs.enabled&&!document.hidden&&!nativeHidden&&$('chat-screen')?.classList.contains('active')&&active.getClientRects().length>0&&!!conversation();
  const wasHidden=stage.hidden;stage.hidden=!visible;if(visible&&(wasHidden||welcomePending)){welcomePending=false;scheduleScan();react('welcome',800);}
  const shouldRun=!document.hidden&&!nativeHidden&&(visible||dialog?.open);
  if(shouldRun&&!running){running=true;frame=requestAnimationFrame(tick);}
  if(!shouldRun&&running){running=false;cancelAnimationFrame(frame);frame=0;}
  if(!visible){primed=false;seen.clear();}
  if(prefs.shake&&!(typeof window.DeviceMotionEvent?.requestPermission==='function'))motionAllowed=true;
  motion(prefs.shake&&motionAllowed&&visible);
 }
 function scan(){
  scanQueued=false;sync();if(stage.hidden)return;
  const rows=[...messages.children].filter(n=>n.classList.contains('msg'));
  const first=!primed;for(const row of rows.slice(-12)){
   const source=row._messageSourceV136;if(!source)continue;
   const id=String(source.id||source.client_id||row.dataset.messageKeyV105||row.dataset.id||'');if(!id||seen.has(id))continue;seen.add(id);
   if(first||source.from_nick===owner||source.deleted||source.chat_key&&source.chat_key!==key||!Number.isFinite(Number(source.ts))||Math.abs(Date.now()-Number(source.ts))>30000)continue;
   const expression=emotion(source.text);react(expression||'curious',expression?emotionDuration(expression):1500,!!expression);
  }
  if(rows.length){primed=true;clearTimeout(primeTimer);primeTimer=0;}
  else if(!primeTimer){const initialKey=key;primeTimer=setTimeout(()=>{primeTimer=0;if(initialKey===key&&!stage.hidden)primed=true;},200);}
  if(seen.size>250)seen=new Set([...seen].slice(-150));
 }
 function scheduleScan(){if(scanQueued)return;scanQueued=true;queueMicrotask(scan);}
 function motion(enable){if(enable===motionOn)return;motionOn=enable;lastMotion=null;if(enable)window.addEventListener('devicemotion',onMotion);else window.removeEventListener('devicemotion',onMotion);}
 function onMotion(event){
  const a=event.accelerationIncludingGravity;if(!a||![a.x,a.y,a.z].every(Number.isFinite))return;
  if(lastMotion){const distance=Math.hypot(a.x-lastMotion.x,a.y-lastMotion.y,a.z-lastMotion.z);if(distance>19&&Date.now()-lastShake>2800){lastShake=Date.now();react('dizzy',2400);}}
  lastMotion={x:a.x,y:a.y,z:a.z};
 }
 async function shake(){
  if(prefs.shake){prefs.shake=false;save();return;}
  const account=owner;try{if(!prefs.shake&&typeof window.DeviceMotionEvent?.requestPermission==='function'){const allowed=await DeviceMotionEvent.requestPermission();if(account!==self())return;if(allowed!=='granted'){$('pe-shake-note-v155').textContent='Доступ не разрешён. Остальные анимации работают.';return;}}
   if(!window.DeviceMotionEvent){$('pe-shake-note-v155').textContent='На этом устройстве нет доступного датчика. Остальные анимации работают.';return;}
   motionAllowed=true;prefs.shake=!prefs.shake;save();
  }catch(_){$('pe-shake-note-v155').textContent='Не удалось включить датчик. Можно попробовать ещё раз.';}
 }
 function paintSettings(){
  if(!dialog)return;$('pe-enabled-v155').checked=prefs.enabled;
  dialog.querySelectorAll('[data-pe-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.peStyle===prefs.style)));
  $('pe-shake-v155').textContent=prefs.shake?'Встряска включена':'Включить встряску';$('pe-shake-v155').setAttribute('aria-pressed',String(prefs.shake));
  draw(preview,prefs.style,'idle',0);
 }
 function ensureDialog(){
  if(dialog)return;dialog=document.createElement('dialog');dialog.id='pixel-eyes-dialog-v155';dialog.setAttribute('aria-labelledby','pe-title-v155');
  dialog.innerHTML='<header><div><small>МАЛЕНЬКИЙ ХАРАКТЕР ТВОЕГО ЧАТА</small><h2 id="pe-title-v155">Живые глазки</h2></div><button type="button" class="pe-close-v155" aria-label="Закрыть">×</button></header><div class="pe-preview-v155"><canvas width="64" height="32" aria-hidden="true"></canvas><span>Смотрят, радуются и переживают вместе с тобой</span></div><label class="pe-toggle-v155"><span>Показывать в чатах<small>Нажми на глазки в чате, чтобы изменить их</small></span><input id="pe-enabled-v155" type="checkbox"></label><div class="pe-catalog-v155" role="group" aria-label="Внешность глазок"></div><div class="pe-motion-v155"><div><strong>Встряска телефона</strong><p id="pe-shake-note-v155">Встряхни телефон — глазки закружатся.</p></div><button type="button" id="pe-shake-v155"></button></div><footer>Выбор сохраняется для твоего аккаунта на этом устройстве.</footer>';
  document.body.append(dialog);preview=dialog.querySelector('.pe-preview-v155 canvas');
  const catalog=dialog.querySelector('.pe-catalog-v155');styles.forEach(([id,label])=>{
   const button=document.createElement('button');button.type='button';button.dataset.peStyle=id;button.innerHTML='<canvas width="64" height="32" aria-hidden="true"></canvas><span></span>';button.querySelector('span').textContent=label;draw(button.querySelector('canvas'),id,'idle',0);button.onclick=()=>{prefs.style=id;mood='idle';until=previewUntil=0;save();};catalog.append(button);
  });
  const demos=document.createElement('div');demos.className='pe-demos-v156';demos.setAttribute('role','group');demos.setAttribute('aria-label','Попробовать анимации');
  for(const [expression,label] of [['happy','Отправка'],['love','Сердечко'],['sad','Удаление'],['typing','Набор'],['record','Запись'],['dizzy','Встряска'],['angry','Злость'],['laugh','Смех'],['surprised','Удивление'],['sleep','Сон']]){const button=document.createElement('button');button.type='button';button.dataset.peDemo=expression;button.textContent=label;button.onclick=()=>{previewMood=expression;previewStart=performance.now();previewUntil=previewStart+2600;};demos.append(button);}
  catalog.after(demos);
  $('pe-enabled-v155').onchange=event=>{prefs.enabled=event.target.checked;save();};$('pe-shake-v155').onclick=shake;
  dialog.querySelector('.pe-close-v155').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{previewUntil=0;sync();focusBefore?.isConnected&&focusBefore.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 }
 function open(){if(!self())return;sync();ensureDialog();focusBefore=document.activeElement;paintSettings();if(!dialog.open)dialog.showModal();sync();}
 stage=document.createElement('section');stage.id='pixel-eyes-stage-v155';stage.hidden=true;
 stage.innerHTML='<button type="button" class="pe-character-v155" aria-label="Настроить живые глазки" title="Настроить живые глазки"><canvas width="64" height="32" aria-hidden="true"></canvas></button><button type="button" class="pe-settings-v155" aria-label="Внешность глазок" title="Внешность глазок">'+eyeIcon+'</button>';
 active.insertBefore(stage,messages);canvas=stage.querySelector('canvas');stage.querySelectorAll('button').forEach(button=>button.onclick=open);
 const settings=$('settings-panel');if(settings){const section=document.createElement('section');section.className='panel-section';section.id='pixel-eyes-settings-v155';section.innerHTML='<div class="panel-section-title">Живые глазки</div><button type="button" class="pe-settings-entry-v155">'+eyeIcon+'<span><strong>Пиксельный характер</strong><small>Внешность, анимации и встряска</small></span><span aria-hidden="true">›</span></button>';settings.append(section);section.querySelector('button').onclick=open;}
 input.addEventListener('input',()=>{sync();if(mood==='welcome')until=0;typingX=Math.max(-2,Math.min(2,Math.floor((input.selectionStart||input.value.length)%24/5)-2));typingUntil=input.value?performance.now()+1800:0;});
 input.addEventListener('focus',()=>{sync();});
 input.addEventListener('paste',event=>{if([...event.clipboardData?.items||[]].some(item=>item.kind==='file'))react('attach',1200);});
 document.addEventListener('pointermove',event=>{if(!running||stage.hidden||event.pointerType==='touch')return;const r=canvas.getBoundingClientRect();look={x:Math.max(-2,Math.min(2,Math.round((event.clientX-r.left-r.width/2)/110))),y:Math.max(-1,Math.min(1,Math.round((event.clientY-r.top-r.height/2)/130)))};},{passive:true});
 window.addEventListener('telechat-chat-action-v155',event=>{sync();const data=event.detail;if(!data||data.owner!==owner||data.key!==conversation())return;if(data.action==='send')typingUntil=0;const expression=data.action==='delete'?'sad':data.action==='edit'||data.action==='reaction'&&!data.text?'wink':emotion(data.text)||(data.action==='reaction'?'excited':'happy');react(expression,emotionDuration(expression),true);});
 function observeFlag(id,name,expression){const node=$(id);if(!node)return;let was=node.classList.contains(name);new MutationObserver(()=>{const value=node.classList.contains(name);if(value&&!was)react(expression,1000);was=value;}).observe(node,{attributes:true,attributeFilter:['class']});}
 observeFlag('reply-bar','show','think');observeFlag('message-edit-overlay-v36','show','think');observeFlag('pending-media','show','attach');observeFlag('emoji-picker','open','excited');observeFlag('poll-modal','show','think');
 if($('record-btn'))new MutationObserver(()=>{if($('record-btn').dataset.voiceState==='requesting')react('curious',900);}).observe($('record-btn'),{attributes:true,attributeFilter:['data-voice-state']});
 for(const type of ['wheel','touchmove'])messages.addEventListener(type,()=>{scrollIntentUntil=performance.now()+600;},{passive:true});
 messages.addEventListener('scroll',()=>{const now=performance.now();if(now<scrollIntentUntil){readingY=messages.scrollTop>lastScroll?1:-1;readingUntil=now+700;}lastScroll=messages.scrollTop;},{passive:true});
 messages.addEventListener('play',event=>{if(event.target.matches?.('.voice-message audio'))react('record',1800);},true);
 new MutationObserver(scheduleScan).observe(messages,{childList:true});
 new MutationObserver(()=>{sync();scheduleScan();}).observe(active,{attributes:true,attributeFilter:['style','class']});
 if($('chat-screen'))new MutationObserver(sync).observe($('chat-screen'),{attributes:true,attributeFilter:['class','style']});
 if($('chat-status-text'))new MutationObserver(()=>{remoteTyping=$('chat-status-text').classList.contains('typing');}).observe($('chat-status-text'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{nativeHidden=true;sync();});window.addEventListener('pageshow',()=>{nativeHidden=false;sync();});window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;sync();});
 document.addEventListener('keydown',event=>{if(dialog?.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dialog.close();}},true);
 window.telechatPixelEyesV155=Object.freeze({open,react,getState:()=>({owner,enabled:prefs.enabled,style:prefs.style,shake:prefs.shake,mood:currentMood(performance.now()),running})});sync();scheduleScan();
})();
