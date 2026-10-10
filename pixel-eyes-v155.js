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
 let key='',primed=false,primeTimer=0,scanQueued=false,seen=new Set(),look={x:0,y:0},motionOn=false,motionAllowed=false,lastMotion=null,lastShake=0;
 const heart=text=>/[❤♥💕💖💗💘💝😍🥰😘]|<3/u.test(String(text||''));
 const storageKey=nick=>'telechat.pixel-eyes.v155.'+nick;
 function read(){try{const p=JSON.parse(localStorage.getItem(storageKey(owner))||'null');prefs={enabled:p?.enabled!==false,style:styles.some(([id])=>id===p?.style)?p.style:'classic',shake:p?.shake===true};}catch(_){prefs={enabled:true,style:'classic',shake:false};}}
 function save(){try{localStorage.setItem(storageKey(owner),JSON.stringify(prefs));}catch(_){}sync();scheduleScan();paintSettings();}
 function pixel(ctx,color,x,y,w=1,h=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
 function heartPixels(ctx,x,y,color,scale=1){['0110110','1111111','1111111','0111110','0011100','0001000'].forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')pixel(ctx,color,x+xx*scale,y+yy*scale,scale,scale);}));}
 function draw(target,style,expression,time,pointer={x:0,y:0}){
  const ctx=target.getContext('2d');ctx.clearRect(0,0,64,32);ctx.imageSmoothingEnabled=false;
  const ink='#202335',white='#fff8ee',shadow='#aab5c6',accent=styles.find(([id])=>id===style)?.[2]||'#8793b2';
  const phase=(time%5200),blink=expression==='idle'&&phase>4750&&phase<4900;
  const happy=expression==='happy',sad=expression==='sad',love=expression==='love',dizzy=expression==='dizzy';
  const positions=style==='cyclops'?[24]:[9,39];
  const px=Math.round(expression==='typing'?1:expression==='curious'?Math.sin(time/280)*2:expression==='idle'?pointer.x:0);
  const py=Math.round(expression==='typing'?2:expression==='idle'?pointer.y:sad?2:0);
  positions.forEach((x,i)=>{
   const y=8;
   if(happy||blink){
    if(happy){pixel(ctx,white,x+2,y+8,3,2);pixel(ctx,white,x+5,y+6,6,2);pixel(ctx,white,x+11,y+8,3,2);pixel(ctx,accent,x+3,y+12,3,1);pixel(ctx,accent,x+10,y+12,3,1);}
    else{pixel(ctx,ink,x+1,y+7,14,4);pixel(ctx,shadow,x+3,y+8,10,2);}return;
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
   if(expression==='curious'){pixel(ctx,'#e9bf6c',x+7,y-5,2,3);pixel(ctx,'#fff2bd',x+7,y-1,2,1);}
  });
  if(love){const rise=Math.floor(time/180)%5;heartPixels(ctx,21,5-rise,'#ee779e');heartPixels(ctx,51,7-rise,'#f6a0bf');}
  if(dizzy){pixel(ctx,'#e1bb70',29,5,2,2);pixel(ctx,'#d0adfb',31,26,2,2);}
 }
 function currentMood(now){if(now<until)return mood;if(now<typingUntil)return 'typing';return remoteTyping?'curious':'idle';}
 function tick(now){
  if(!running)return;frame=requestAnimationFrame(tick);if(now-lastFrame<50)return;lastFrame=now;
  const state=currentMood(now),pointer={x:look.x||Math.round(Math.sin(now/1900)*2),y:look.y};
  if(!stage.hidden)draw(canvas,prefs.style,state,now-moodStart,pointer);
  if(dialog?.open)draw(preview,prefs.style,state,now-moodStart,pointer);
 }
 function react(expression,duration=1700){
  if(!owner||owner!==self()||!prefs.enabled||stage.hidden)return;
  mood=expression;moodStart=performance.now();until=moodStart+duration;stage.dataset.mood=expression;sync();
 }
 function resetConversation(){clearTimeout(primeTimer);primeTimer=0;key=conversation();primed=false;seen.clear();mood='idle';until=typingUntil=0;remoteTyping=$('chat-status-text')?.classList.contains('typing')||false;stage.dataset.mood='idle';scheduleScan();}
 function sync(){
  const account=self();if(account!==owner){owner=account;read();resetConversation();if(dialog?.open)dialog.close();paintSettings();}
  if(key!==conversation())resetConversation();
  const visible=!!owner&&prefs.enabled&&!document.hidden&&!nativeHidden&&$('chat-screen')?.classList.contains('active')&&active.getClientRects().length>0&&!!conversation();
  const wasHidden=stage.hidden;stage.hidden=!visible;if(visible&&wasHidden)scheduleScan();
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
   react(heart(source.text)?'love':'curious',heart(source.text)?2400:1500);
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
   const button=document.createElement('button');button.type='button';button.dataset.peStyle=id;button.innerHTML='<canvas width="64" height="32" aria-hidden="true"></canvas><span></span>';button.querySelector('span').textContent=label;draw(button.querySelector('canvas'),id,'idle',0);button.onclick=()=>{prefs.style=id;mood='idle';until=0;save();};catalog.append(button);
  });
  $('pe-enabled-v155').onchange=event=>{prefs.enabled=event.target.checked;save();};$('pe-shake-v155').onclick=shake;
  dialog.querySelector('.pe-close-v155').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{sync();focusBefore?.isConnected&&focusBefore.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 }
 function open(){if(!self())return;sync();ensureDialog();focusBefore=document.activeElement;paintSettings();if(!dialog.open)dialog.showModal();sync();}
 stage=document.createElement('section');stage.id='pixel-eyes-stage-v155';stage.hidden=true;
 stage.innerHTML='<button type="button" class="pe-character-v155" aria-label="Настроить живые глазки" title="Настроить живые глазки"><canvas width="64" height="32" aria-hidden="true"></canvas></button><button type="button" class="pe-settings-v155" aria-label="Внешность глазок" title="Внешность глазок">'+eyeIcon+'</button>';
 active.insertBefore(stage,messages);canvas=stage.querySelector('canvas');stage.querySelectorAll('button').forEach(button=>button.onclick=open);
 const settings=$('settings-panel');if(settings){const section=document.createElement('section');section.className='panel-section';section.id='pixel-eyes-settings-v155';section.innerHTML='<div class="panel-section-title">Живые глазки</div><button type="button" class="pe-settings-entry-v155">'+eyeIcon+'<span><strong>Пиксельный характер</strong><small>Внешность, анимации и встряска</small></span><span aria-hidden="true">›</span></button>';settings.append(section);section.querySelector('button').onclick=open;}
 input.addEventListener('input',()=>{sync();typingUntil=input.value?performance.now()+1800:0;});
 document.addEventListener('pointermove',event=>{if(!running||stage.hidden||event.pointerType==='touch')return;const r=canvas.getBoundingClientRect();look={x:Math.max(-2,Math.min(2,Math.round((event.clientX-r.left-r.width/2)/110))),y:Math.max(-1,Math.min(1,Math.round((event.clientY-r.top-r.height/2)/130)))};},{passive:true});
 window.addEventListener('telechat-chat-action-v155',event=>{sync();const data=event.detail;if(!data||data.owner!==owner||data.key!==conversation())return;if(data.action==='send')typingUntil=0;react(data.action==='delete'?'sad':heart(data.text)?'love':'happy',data.action==='delete'?2100:heart(data.text)?2400:1600);});
 new MutationObserver(scheduleScan).observe(messages,{childList:true});
 new MutationObserver(()=>{sync();scheduleScan();}).observe(active,{attributes:true,attributeFilter:['style','class']});
 if($('chat-screen'))new MutationObserver(sync).observe($('chat-screen'),{attributes:true,attributeFilter:['class','style']});
 if($('chat-status-text'))new MutationObserver(()=>{remoteTyping=$('chat-status-text').classList.contains('typing');}).observe($('chat-status-text'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{nativeHidden=true;sync();});window.addEventListener('pageshow',()=>{nativeHidden=false;sync();});window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;sync();});
 document.addEventListener('keydown',event=>{if(dialog?.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dialog.close();}},true);
 window.telechatPixelEyesV155=Object.freeze({open,react,getState:()=>({owner,enabled:prefs.enabled,style:prefs.style,shake:prefs.shake,mood:currentMood(performance.now()),running})});sync();scheduleScan();
})();
