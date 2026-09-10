/* A public audio link lives with the existing profile data; media stays opt-in. */
(() => {
  'use strict';
  const PREFIX='__telechat_profile_v1__:';
  let saving=false, editing=false, playback={url:'',playing:false};
  const meNow=()=>{try{return typeof me!=='undefined'?me:null;}catch(_){return null;}};
  function clean(value) {
    if(!value||typeof value.url!=='string'||value.url.length>4096)return null;
    try {
      const url=new URL(value.url);
      if(url.protocol!=='https:'||url.username||url.password)return null;
      if(window.telechatSoundCloudV98?.isLink(url.href))return {url:window.telechatSoundCloudV98.normalize(url.href),title:typeof value.title==='string'&&value.title.trim()?value.title.trim().slice(0,160):'Трек SoundCloud',duration:Number.isFinite(value.duration)&&value.duration>0?Math.min(value.duration,604800):0};
      if(/(^|\.)(youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|music\.yandex\.(ru|com))$/i.test(url.hostname))return null;
      return {url:url.href,title:typeof value.title==='string'&&value.title.trim()?value.title.trim().slice(0,160):'Любимый трек',duration:Number.isFinite(value.duration)&&value.duration>0?Math.min(value.duration,604800):0};
    }catch(_){return null;}
  }
  function rawData(raw) {
    if(typeof raw==='string'&&raw.startsWith(PREFIX)){
      try {const data=JSON.parse(raw.slice(PREFIX.length));if(data&&typeof data==='object'&&!Array.isArray(data))return data;}catch(_){}
    }
    return {status:typeof raw==='string'?raw:''};
  }
  const fromStatus=raw=>clean(rawData(raw).music);
  function encode(raw,music) {
    const data=rawData(raw);delete data.music;
    if(music)data.music=music;
    if(Object.keys(data).every(key=>key==='status'||key==='photo')&&!data.photo)return data.status||'';
    return PREFIX+JSON.stringify(data);
  }
  const unpack=window.unpackProfileData,pack=window.packProfileData;
  if(typeof unpack==='function')window.unpackProfileData=function(raw){return {...unpack.apply(this,arguments),music:fromStatus(raw)};};
  if(typeof pack==='function')window.packProfileData=function(){
    const encoded=pack.apply(this,arguments),music=fromStatus(meNow()?.status);
    return music?encode(encoded,music):encoded;
  };
  const saveProfileBefore=window.saveProfile;
  if(typeof saveProfileBefore==='function')window.saveProfile=async function(){
    if(saving){window.showToast?.('Подожди, трек ещё сохраняется в профиле.');return;}
    editing=true;
    try{return await saveProfileBefore.apply(this,arguments);}finally{editing=false;}
  };
  async function save(value) {
    if(saving||editing)throw new Error('Подожди, профиль ещё сохраняется.');
    const user=meNow(),nick=user?.nick;if(!nick)throw new Error('Сначала войди в аккаунт.');
    const initialStatus=user.status;
    const music=value===null?null:clean(value);
    if(value!==null&&!music)throw new Error('Для профиля нужна прямая HTTPS-ссылка на аудио.');
    saving=true;
    try {
      const latest=await sb.from('users').select('nick,status').eq('nick',nick).maybeSingle();
      if(latest.error)throw latest.error;
      if(!latest.data)throw new Error('Профиль не найден.');
      if(meNow()?.nick!==nick)throw new Error('Аккаунт изменился. Повтори действие.');
      if(user.status!==initialStatus)throw new Error('Профиль успел измениться. Нажми ещё раз — сохраним свежую версию.');
      const before=latest.data.status,next=encode(before,music);
      if(next!==before){
        // Status may include a large avatar: never put it in a URL filter.
        const result=await sb.from('users').update({status:next}).eq('nick',nick).select('nick,status').maybeSingle();
        if(result.error)throw result.error;
        if(!result.data)throw new Error('Не удалось сохранить профиль. Повтори действие.');
      }
      user.status=next;
      if(typeof userCache!=='undefined')userCache[nick]={...(userCache[nick]||{}),...user,status:next};
      document.querySelectorAll('.profile-music-v97').forEach(node=>{if(node.dataset.nick===nick)renderAfter(node.previousElementSibling,user);});
      window.dispatchEvent(new CustomEvent('telechat-profile-music-updated-v97',{detail:{nick}}));
      return music;
    }finally{saving=false;}
  }
  const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m8 5 11 7-11 7Z"/></svg>';
  const pauseIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 5v14m8-14v14"/></svg>';
  function syncButton(button,url) {
    const playing=playback.url===url&&playback.playing,state=playing?'pause':'play';
    if(button.dataset.state!==state){button.dataset.state=state;button.innerHTML=playing?pauseIcon:playIcon;button.setAttribute('aria-label',playing?'Пауза':'Слушать трек профиля');}
  }
  function renderAfter(anchor,user) {
    if(!anchor)return;
    let node=anchor.nextElementSibling?.classList.contains('profile-music-v97')?anchor.nextElementSibling:null;
    const music=fromStatus(user?.status);
    if(!music){node?.remove();return;}
    const key=JSON.stringify([user.nick,music.url,music.title,music.duration,meNow()?.nick===user.nick]);
    if(node?.dataset.key===key){syncButton(node.querySelector('.profile-music-play-v97'),music.url);return;}
    if(!node){node=document.createElement('div');node.className='profile-music-v97';anchor.after(node);}
    node.dataset.key=key;node.dataset.nick=user.nick;node.dataset.url=music.url;
    node.innerHTML='<button type="button" class="profile-music-play-v97"></button><div class="profile-music-copy-v97"><small>МУЗЫКА ПРОФИЛЯ</small><strong></strong></div>';
    node.querySelector('strong').textContent=music.title;
    if(window.telechatSoundCloudV98?.isLink(music.url)){
      const source=document.createElement('a');source.className='music-soundcloud-source-v98';source.href=music.url;source.target='_blank';source.rel='noopener noreferrer';source.innerHTML=window.telechatSoundCloudV98.brand;source.setAttribute('aria-label','Открыть трек на SoundCloud');node.querySelector('.profile-music-copy-v97').append(source);
    }
    const button=node.querySelector('.profile-music-play-v97');syncButton(button,music.url);
    button.addEventListener('click',async()=>{
      if(!window.telechatMusicV96)return;
      button.disabled=true;
      try{await window.telechatMusicV96.playLink(music,user.nick);}catch(error){window.showToast?.(error.message||'Не удалось включить трек');}finally{button.disabled=false;}
    });
    if(meNow()?.nick===user.nick){
      const remove=document.createElement('button');remove.type='button';remove.className='profile-music-remove-v97';remove.textContent='×';remove.setAttribute('aria-label','Убрать музыку из профиля');remove.title='Убрать из профиля';
      remove.addEventListener('click',async()=>{remove.disabled=true;try{await save(null);window.showToast?.('Музыка убрана из профиля');}catch(error){remove.disabled=false;window.showToast?.(error.message||'Не удалось сохранить профиль');}});node.append(remove);
    }
  }
  window.addEventListener('telechat-music-state-v97',event=>{
    playback=event.detail||{url:'',playing:false};
    document.querySelectorAll('.profile-music-v97').forEach(node=>syncButton(node.querySelector('.profile-music-play-v97'),node.dataset.url));
  });
  window.telechatProfileMusicV97={clean,save,renderAfter,getOwn:()=>fromStatus(meNow()?.status)};
})();
