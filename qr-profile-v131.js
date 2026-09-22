/* Profile QR codes are public links, never login/session credentials. */
(()=>{
 'use strict';
 const BASE='https://dark178098345-star.github.io/-telechat/';
 const owner=()=>typeof me!=='undefined'?me:null;
 const nickOK=nick=>typeof nick==='string'&&/^[a-z0-9_]{3,20}$/.test(nick);
 const link=nick=>nickOK(nick)?BASE+'#profile='+encodeURIComponent(nick):null;
 function parse(value){
  try{const url=new URL(value);if(url.origin!==new URL(BASE).origin||url.pathname!=='/-telechat/'||url.username||url.password)return null;
   const params=new URLSearchParams(url.hash.slice(1)),nick=params.get('profile');
   return params.getAll('profile').length===1&&nickOK(nick)?nick:null;
  }catch(_){return null;}
 }
 const icon=paths=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
 const qrIcon=icon('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6v-3M21 12v3M12 3v3M3 12h6M12 12h3M12 21v-6"/>');
 const scanIcon=icon('<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M6 12h12"/>');
 const loads=new Map();
 function load(file,global){
  if(window[global])return Promise.resolve(window[global]);
  if(!loads.has(file))loads.set(file,new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='./vendor/qr/'+file;
   const timer=setTimeout(()=>fail(),15000);
   function fail(){clearTimeout(timer);script.remove();loads.delete(file);reject(new Error('library'));}
   script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(window[global])resolve(window[global]);else fail();};document.head.append(script);
  }));return loads.get(file);
 }
 let modal,card,video,canvas,notice,ownPanel,scanPanel,backButton,scanButton,saveButton,copyButton,trigger,previousFocus;
 let stream=null,timer=0,epoch=0,openEpoch=0,opened=false,account='',nativeHidden=false,qrCanvas=null;
 const status=text=>{if(notice)notice.textContent=text;};
 function stop(){epoch++;clearTimeout(timer);timer=0;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;if(video){video.pause();video.srcObject=null;}}
 function close(){if(!opened)return;stop();openEpoch++;opened=false;modal.hidden=true;qrCanvas=null;previousFocus?.isConnected&&previousFocus.focus();}
 function button(label,action,cls=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.addEventListener('click',action);return b;}
 function build(){
  if(modal)return;
  modal=document.createElement('div');modal.className='qr-overlay-v131';modal.hidden=true;
  modal.innerHTML='<section class="qr-card-v131" role="dialog" aria-modal="true" aria-labelledby="qr-title-v131"><header><div><span class="qr-eyebrow-v131">ТВОЙ КРУГ ОБЩЕНИЯ</span><h2 id="qr-title-v131">Мой QR</h2></div><button type="button" class="qr-close-v131" aria-label="Закрыть">'+icon('<path d="m6 6 12 12M18 6 6 12"/>')+'</button></header><div class="qr-own-v131"><div class="qr-avatar-v131"></div><h3></h3><p class="qr-nick-v131"></p><div class="qr-code-v131" role="img" aria-label="QR-код твоего профиля"></div><p class="qr-explain-v131">Покажи код, чтобы тебя нашли<br>и открыли твой профиль.</p><div class="qr-actions-v131"></div></div><div class="qr-scan-v131" hidden><div class="qr-camera-v131"><video muted playsinline></video><div class="qr-target-v131" aria-hidden="true"></div></div><p class="qr-explain-v131">Наведи камеру на QR профиля tele.chat.<br>Или выбери картинку с кодом.</p><div class="qr-scan-actions-v131"></div><input type="file" accept="image/*" hidden aria-label="Картинка с QR-кодом"></div><p class="qr-notice-v131" role="status" aria-live="polite"></p><div class="qr-bottom-v131"></div></section>';
  document.body.append(modal);card=modal.querySelector('section');video=modal.querySelector('video');video.muted=true;canvas=document.createElement('canvas');notice=modal.querySelector('.qr-notice-v131');ownPanel=modal.querySelector('.qr-own-v131');scanPanel=modal.querySelector('.qr-scan-v131');
  modal.querySelector('.qr-close-v131').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
  saveButton=button('Сохранить QR',save);copyButton=button('Скопировать ссылку',copy);
  ownPanel.querySelector('.qr-actions-v131').append(saveButton,copyButton);
  scanButton=button('Отсканировать',start,'qr-primary-v131');scanButton.insertAdjacentHTML('afterbegin',scanIcon);backButton=button('Мой QR',showOwn);backButton.hidden=true;modal.querySelector('.qr-bottom-v131').append(scanButton,backButton);
  const file=scanPanel.querySelector('input');scanPanel.querySelector('.qr-scan-actions-v131').append(button('Включить камеру',start),button('Выбрать картинку',()=>file.click()));file.onchange=()=>{const image=file.files?.[0];file.value='';if(image)scanImage(image);};
  modal.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
   if(e.key==='Tab'){const focusable=[...card.querySelectorAll('button,input')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  });
 }
 function showOwn(){stop();ownPanel.hidden=false;scanPanel.hidden=true;backButton.hidden=true;scanButton.hidden=false;status('');modal.querySelector('.qr-close-v131').focus();}
 async function open(){
  const user=owner();if(!nickOK(user?.nick)){window.showToast?.('Сначала войди в аккаунт');return;}
  build();stop();previousFocus=document.activeElement;account=user.nick;opened=true;modal.hidden=false;showOwn();
  ownPanel.querySelector('h3').textContent=user.name||user.nick;ownPanel.querySelector('.qr-nick-v131').textContent='@'+user.nick;
  const avatar=ownPanel.querySelector('.qr-avatar-v131');avatar.replaceChildren();
  if(typeof setAvatarElement==='function')setAvatarElement(avatar,user);else avatar.textContent=(user.name||user.nick)[0].toUpperCase();
  ownPanel.querySelector('.qr-code-v131').replaceChildren();saveButton.disabled=copyButton.disabled=true;status('Создаём твой QR…');modal.querySelector('.qr-close-v131').focus();const token=++openEpoch;
  try{const encode=await load('qrcode-1.4.4.js','qrcode');if(!opened||token!==openEpoch||owner()?.nick!==account)return;
   const qr=encode(0,'M');qr.addData(link(account));qr.make();const count=qr.getModuleCount(),cell=8,margin=4;
   qrCanvas=document.createElement('canvas');qrCanvas.width=qrCanvas.height=(count+margin*2)*cell;const ctx=qrCanvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,qrCanvas.width,qrCanvas.height);ctx.fillStyle='#151321';for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))ctx.fillRect((x+margin)*cell,(y+margin)*cell,cell,cell);
   ownPanel.querySelector('.qr-code-v131').append(qrCanvas);saveButton.disabled=copyButton.disabled=false;if(!ownPanel.hidden)status('');
  }catch(_){if(opened&&token===openEpoch)status('Не удалось загрузить QR. Проверь интернет и открой окно ещё раз.');}
 }
 async function copy(){try{await navigator.clipboard.writeText(link(account));status('Ссылка скопирована');}catch(_){status('Не удалось скопировать. Можно сохранить QR картинкой.');}}
 function save(){
  if(!qrCanvas)return;const output=document.createElement('canvas');output.width=720;output.height=900;const ctx=output.getContext('2d');ctx.fillStyle='#151422';ctx.fillRect(0,0,720,900);ctx.textAlign='center';ctx.fillStyle='#c5b3ff';ctx.font='bold 36px sans-serif';ctx.fillText('tele.chat',360,82);ctx.fillStyle='#fff';ctx.fillRect(88,140,544,544);ctx.imageSmoothingEnabled=false;ctx.drawImage(qrCanvas,104,156,512,512);ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.fillText('@'+account,360,751);ctx.fillStyle='#b7b3cc';ctx.font='23px sans-serif';ctx.fillText('Сканируй, чтобы открыть профиль',360,808);
  if(window.TelechatAndroid?.saveQrImage){window.TelechatAndroid.saveQrImage(output.toDataURL('image/png'));return;}
  if(window.TelechatAndroid?.isApp?.()){status('Для сохранения QR установи Android-приложение версии 1.2.5 или новее.');return;}
  output.toBlob(async blob=>{if(!blob)return;try{const file=new File([blob],'telechat-'+account+'-qr.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})&&matchMedia('(pointer:coarse)').matches){await navigator.share({files:[file],title:'Мой QR в tele.chat'});return;}}catch(e){if(e.name==='AbortError')return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='telechat-'+account+'-qr.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  },'image/png');
 }
 function scanView(){ownPanel.hidden=true;scanPanel.hidden=false;backButton.hidden=false;scanButton.hidden=true;}
 async function found(raw){
  const nick=parse(raw);if(!nick){stop();status('Это не QR профиля tele.chat. Выбери другой код или снова включи камеру.');return false;}
  close();await Promise.resolve(window.openUserProfile?.(nick)).catch(()=>window.showToast?.('Не удалось открыть профиль. Проверь соединение.'));return true;
 }
 function pixels(source,width,height,max){const scale=Math.min(1,max/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,canvas.width,canvas.height);return ctx.getImageData(0,0,canvas.width,canvas.height);}
 async function start(){
  if(!opened)return;stop();scanView();status('Запрашиваем доступ к камере…');const token=epoch;
  try{await load('jsqr-1.4.0.js','jsQR');if(token!==epoch||!opened)return;if(!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');
   const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:640}},audio:false});
   if(token!==epoch||!opened||document.hidden||nativeHidden){acquired.getTracks().forEach(t=>t.stop());return;}
   stream=acquired;video.srcObject=stream;await video.play();if(token!==epoch)return;status('Ищем QR-код…');
   const tick=()=>{if(token!==epoch||!opened||document.hidden||nativeHidden)return;try{if(video.readyState>=2&&video.videoWidth){const data=pixels(video,video.videoWidth,video.videoHeight,640);const code=window.jsQR(data.data,data.width,data.height,{inversionAttempts:'dontInvert'});if(code){void found(code.data);return;}}}catch(_){stop();status('Не удалось прочитать камеру. Попробуй выбрать картинку.');return;}timer=setTimeout(tick,400);};tick();
  }catch(e){if(token!==epoch||!opened)return;stop();status(e.name==='NotAllowedError'?'Камера не разрешена. Разреши доступ в настройках или выбери картинку.':e.name==='NotFoundError'?'Камера не найдена. Выбери картинку с QR.':'Не удалось включить камеру. В старом Android-приложении выбери картинку или установи обновление.');}
 }
 async function scanImage(file){
  stop();scanView();const token=epoch;if(file.size>20*1024*1024){status('Выбери картинку до 20 МБ.');return;}status('Читаем QR с картинки…');let url;
  try{await load('jsqr-1.4.0.js','jsQR');if(token!==epoch||!opened)return;url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();if(token!==epoch||!opened)return;
   const data=pixels(img,img.naturalWidth,img.naturalHeight,1600),code=window.jsQR(data.data,data.width,data.height,{inversionAttempts:'attemptBoth'});if(code)await found(code.data);else status('QR не найден. Выбери чёткую картинку, где код виден целиком.');
  }catch(_){if(token===epoch&&opened)status('Не удалось прочитать картинку. Попробуй PNG или JPEG.');}finally{if(url)URL.revokeObjectURL(url);}
 }
 const sidebar=document.getElementById('sidebar'),rail=sidebar?.querySelector('.section-rail-v109');
 if(sidebar){trigger=button('Мой QR',open,'qr-entry-v131');trigger.innerHTML=qrIcon+'<span>Мой QR</span>';const desktop=matchMedia('(min-width:901px), (min-width:721px) and (pointer:fine)');const place=()=>{const parent=desktop.matches?rail:sidebar.querySelector('.sidebar-top');if(parent&&trigger.parentNode!==parent)parent.append(trigger);};place();desktop.addEventListener?.('change',place);}
 function hidden(){if(opened){stop();if(!scanPanel.hidden)status('Камера остановлена. Нажми «Включить камеру», чтобы продолжить.');}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hidden();});window.addEventListener('pagehide',hidden);window.addEventListener('telechat-native-visibility',e=>{nativeHidden=e.detail?.background===true;if(nativeHidden)hidden();});
 let pending=parse(location.href),opening=false;
 async function onSession(){
  if(opened&&(!owner()||owner().nick!==account||!document.getElementById('chat-screen')?.classList.contains('active')))close();
  if(!pending||opening||!owner()?.nick||!document.getElementById('chat-screen')?.classList.contains('active'))return;
  const nick=pending;pending=null;opening=true;close();try{await window.openUserProfile?.(nick);}catch(_){window.showToast?.('Не удалось открыть профиль. Проверь соединение.');}finally{opening=false;if(parse(location.href)===nick){const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}if(pending)void onSession();}
 }
 window.addEventListener('hashchange',()=>{pending=parse(location.href);void onSession();});const chat=document.getElementById('chat-screen');if(chat)new MutationObserver(()=>{void onSession();}).observe(chat,{attributes:true,attributeFilter:['class']});void onSession();
 window.telechatQrV131={open,close,parse,link};
})();
