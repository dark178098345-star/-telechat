/* ExstraChat Music — one player, public releases and private libraries. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), core = () => window.telechatMusicV96;
  const user = () => { try { return typeof me !== 'undefined' ? me : null; } catch (_) { return null; } };
  const paths = {
    music:'M9 18V5l11-2v13M9 8l11-2M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3m11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3',
    home:'m3 10 9-7 9 7v10H3ZM9 20v-7h6v7', search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    library:'M4 4v16M9 4v16M14 4l6 15M2 20h20',list:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
    user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    close:'m6 6 12 12M6 18 18 6',back:'m14 5-7 7 7 7M7 12h14',play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',
    previous:'M5 5v14m14-14L8 12l11 7Z',next:'M19 5v14M5 5l11 7L5 19Z',plus:'M12 4v16M4 12h16',check:'m5 12 4 4L20 5',
    share:'M12 16V3m-5 5 5-5 5 5M4 13v8h16v-8',more:'M5 12h.01M12 12h.01M19 12h.01',
    repeat:'m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
    shuffle:'m17 3 4 4-4 4M3 7h3l12 10h3m-4-4 4 4-4 4M3 17h3l4-4m4-4 4-2h3',volume:'m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',cloud:'M6 18a5 5 0 1 1 1-10 7 7 0 0 1 13 2 4 4 0 0 1-1 8Z'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.music}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time = n => Number.isFinite(n)&&n>0 ? Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0') : '—';
  const safeUrl = url => { try { const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''; } catch(_){return '';} };
  const state = {owner:'',view:'home',filter:'new',query:'',catalog:new Map(),feed:[],local:[],saved:new Set(),liked:new Set(),playlists:[],profiles:new Map(),offset:0,more:true,loading:false,request:0,server:true,selectedPlaylist:'',profile:'',busy:new Set(),queue:[],opened:false,genre:'',feedAt:0,feedKey:'',libraryAt:0,localAt:0};
  let root, lastFocus, searchTimer, uploadFile=null, coverFile=null, coverPreview='', publishing=false, uploadObjectUrl='', importPlaylist='', importing=false;
  let openVersionV199=0,renderVersionV199=0,renderMarkupV199='',playerViewV199='',queueMarkupV199='',libraryFlightV199=null,feedFlightV199=null;
  let generationV212=0,sheetVersionV212=0,publicationVersionV212=0,importVersionV212=0,profileVersionV212=0,playerTrackViewV212='',catalogRevisionV212=0,libraryRevisionV212=0;
  let linkCheckV217=null;
  const requestsV212=new Set(),catalogAtV212=new Map(),catalogVersionsV212=new Map(),profileFlightsV212=new Map(),authorViewsV212=new Map();
  const captureV212=()=>({owner:state.owner,epoch:generationV212});
  const currentV212=ctx=>!!ctx.owner&&ctx.owner===state.owner&&ctx.owner===user()?.nick&&ctx.epoch===generationV212;
  function assertV212(ctx){if(!currentV212(ctx)){const error=new Error('Аккаунт изменился. Открой музыку заново.');error.code='MUSIC_CONTEXT_CHANGED';throw error;}}
  function rememberTracksV212(items,revision=++catalogRevisionV212){const at=Date.now();for(const t of items){if((catalogVersionsV212.get(t.id)||0)>revision)continue;state.catalog.set(t.id,t);catalogAtV212.set(t.id,at);catalogVersionsV212.set(t.id,revision);}}
  function forgetTrackV212(id){state.catalog.delete(id);catalogAtV212.delete(id);catalogVersionsV212.set(id,++catalogRevisionV212);}
  function paintSelfV212(){if(!root||!user())return;const self=root.querySelector('.mh-self'),key=JSON.stringify([user().nick,user().av,user().status]);if(self.avatarKeyV199===key)return;self.avatarKeyV199=key;delete self.dataset.avatarKey;try{self.innerHTML=typeof avatarMarkup==='function'?avatarMarkup({...user(),avatar_video:''}):icon('user');}catch(_){self.innerHTML=icon('user');}}
  function resetOwnerV212(next){
    generationV212++;state.request++;openVersionV199++;profileVersionV212++;publicationVersionV212++;importVersionV212++;
    for(const controller of requestsV212)controller.abort();libraryFlightV199=feedFlightV199=null;profileFlightsV212.clear();catalogAtV212.clear();catalogVersionsV212.clear();authorViewsV212.clear();catalogRevisionV212=libraryRevisionV212=0;
    publishing=false;importing=false;importPlaylist='';closeSheet();clearTimeout(searchTimer);searchTimer=0;
    state.owner=next;state.catalog.clear();state.feed=[];state.saved.clear();state.liked.clear();state.playlists=[];state.view='home';state.query='';state.profile=next;state.local=[];state.queue=[];state.waveActive=false;state.profiles.clear();state.genre='';state.selectedPlaylist='';state.offset=0;state.more=true;state.loading=false;state.server=true;state.busy.clear();state.feedAt=state.libraryAt=state.localAt=0;state.feedKey='';
    renderMarkupV199='';queueMarkupV199='';playerViewV199='';playerTrackViewV212='';if($('mh-search'))$('mh-search').value='';
  }
  // Only local track IDs are stored here. Audio stays in the private device library.
  function localPlaylistMap(){try{const data=JSON.parse(localStorage.getItem('telechat_playlist_files_v119:'+state.owner)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}}
  function localPlaylistIds(id){const ids=localPlaylistMap()[id];return Array.isArray(ids)?ids.filter(x=>typeof x==='string').slice(0,200):[];}
  function saveLocalPlaylist(id,ids){const data=localPlaylistMap();if(ids.length)data[id]=[...new Set(ids)].slice(0,200);else delete data[id];try{localStorage.setItem('telechat_playlist_files_v119:'+state.owner,JSON.stringify(data));}catch(_){throw new Error('Не удалось сохранить плейлист на устройстве. Проверь свободное место.');}}
  function playlistTracks(p){if(!p)return [];const local=localPlaylistIds(p.id).map(id=>state.local.find(t=>t.id===id)).filter(Boolean).map(t=>({...t,local:true,artist:'На этом устройстве'}));return [...(p.track_ids||[]).map(id=>state.catalog.get(id)).filter(Boolean),...local];}
  async function addToPlaylist(listId,id){const ctx=captureV212(),p=state.playlists.find(p=>p.id===listId);if(!p)throw new Error('Плейлист больше не существует');if(playlistTracks(p).some(t=>t.id===id))return;if(playlistTracks(p).length>=200)throw new Error('В плейлисте уже 200 треков');if(state.catalog.has(id)){await api('playlist_add',{playlist_id:listId,track_id:id},ctx);assertV212(ctx);await loadLibrary(true);assertV212(ctx);}else if(state.local.some(t=>t.id===id)){assertV212(ctx);saveLocalPlaylist(listId,[...localPlaylistIds(listId),id]);}else throw new Error('Трек не найден');}
  async function importTracks(event){const files=[...event.target.files],listId=importPlaylist,ctx=captureV212();event.target.value='';importPlaylist='';if(!files.length||importing)return;const job=++importVersionV212;importing=true;
    try{assertV212(ctx);const p=state.playlists.find(p=>p.id===listId);if(listId&&(!p||playlistTracks(p).length+files.length>200))throw new Error('В плейлист можно добавить до 200 треков');toast('Сохраняем музыку на устройстве…');const result=await core().importFilesReport(files);assertV212(ctx);const tracks=await boundedV199(core().getTracks(),8000,ctx);assertV212(ctx);state.local=tracks;state.localAt=Date.now();if(listId){const ids=result.added.map(t=>t.id);saveLocalPlaylist(listId,[...localPlaylistIds(listId),...ids]);state.view='playlist';state.selectedPlaylist=listId;}render();toast((result.added.length?`Добавлено треков: ${result.added.length}. `:'')+(result.error||'Музыка сохранена на этом устройстве.'));}catch(error){if(currentV212(ctx))toast(err(error));}finally{if(job===importVersionV212)importing=false;}}
  const currentTrack = () => core()?.getState().track;
  function toast(message){if(!message)return;window.showToast?.(message);if($('mh-notice')){$('mh-notice').textContent=message;}}
  function err(error){if(error?.code==='MUSIC_CONTEXT_CHANGED')return '';return /PGRST202|PGRST205|42P01|function.*does not exist|relation.*does not exist/i.test((error?.code||'')+' '+(error?.message||''))?'Общая музыка скоро появится. Локальные треки уже доступны.':error?.message||'Не удалось выполнить действие. Попробуй ещё раз.';}
  async function api(action,data={},ctx=captureV212()) {
    assertV212(ctx);
    const u=user(),nick=u?.nick;if(!nick)throw new Error('Сначала войди в аккаунт');
    const pass=u.pass||($('l-login')?.value.trim().toLowerCase()===nick?$('l-pass')?.value:'');
    // A write can commit even if its response is late. Cancel on account changes,
    // but never turn a slow mutation into an automatic timeout/retry.
    const query=sb.rpc('telechat_music_v117',{p_nick:nick,p_pass:pass||'',p_action:action,p_data:data});const result=await boundedV199(query,action==='library'||action==='upload_ticket'?12000:0,ctx);
    assertV212(ctx);
    if(result.error)throw result.error;
    if(action!=='library'&&action!=='upload_ticket')libraryRevisionV212++;
    return result.data;
  }
  function cover(track,extra='') {
    const hue=[...(track.id||track.title||'music')].reduce((s,c)=>s+c.charCodeAt(0),0)%100;
    const src=safeUrl(track.cover_url);
    return `<span class="mh-art ${extra}" style="--art-hue:${230+hue}deg">${src?`<img src="${esc(src)}" alt="" loading="lazy" decoding="async">`:`<span class="mh-cover-initial-v171">${esc(Array.from(track.title||'E')[0].toUpperCase())}</span>${icon('music')}`}</span>`;
  }
  function ensure() {
    if(root)return;
    root=document.createElement('section');root.id='music-hub-v117';root.className='mh-layout-v171';root.tabIndex=-1;root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Музыка ExstraChat');
    root.innerHTML=`
      <aside class="mh-nav"><button class="mh-logo" data-view="home"><span class="mh-logo-symbol">${icon('music')}</span><span>Exstra<span class="mh-logo-dot">Music</span><small>ТВОЙ КРУГ ЗВУКА</small></span></button>
      <span class="mh-nav-label">ОТКРЫВАЙ</span><nav aria-label="Разделы музыки">
      ${[['home','home','Главная'],['library','library','Моя музыка'],['likes','heart','Любимые'],['playlists','list','Плейлисты'],['profile','user','Мои треки']].map(([v,i,t])=>`<button data-view="${v}" title="${t}" aria-label="${t}">${icon(i)}<span>${t}</span></button>`).join('')}</nav>
      <div class="mh-nav-bottom"><div class="mh-support"><img src="./branding/soundcloud-white.png" alt="SoundCloud"><span>Треки, которые ты любишь.<br>Люди, которых ты знаешь.</span></div><button class="mh-back" data-action="close">${icon('back')}<span>Вернуться в чаты</span></button></div></aside>
      <div class="mh-workspace"><header class="mh-top"><button class="mh-mobile-back mh-icon" data-action="close" aria-label="Вернуться в чаты">${icon('back')}</button><label class="mh-search">${icon('search')}<input id="mh-search" type="search" placeholder="Трек, исполнитель или настроение" maxlength="120" aria-label="Поиск музыки"></label><button class="mh-primary mh-publish-top" data-action="publish">${icon('upload')}<span>Выложить трек</span></button><button class="mh-self mh-icon" data-view="profile" aria-label="Мой музыкальный профиль"></button></header>
      <div class="mh-scroll" id="mh-scroll"><div id="mh-content"></div><div id="mh-notice" class="mh-notice" role="status" aria-live="polite"></div></div></div>
      <aside class="mh-listening"><div class="mh-side-heading">СЕЙЧАС ИГРАЕТ<span class="mh-live-dot"></span></div><div id="mh-now-art"></div><h2 id="mh-now-title">Твой следующий<br>любимый трек</h2><button id="mh-now-artist" class="mh-artist-link">Выбирай музыку и оставайся на своей волне</button><div id="mh-cloud-host"></div><div class="mh-cloud-options" hidden id="mh-cloud-options"><img src="./branding/soundcloud-white.png" alt="SoundCloud"><label><input type="checkbox" id="mh-sc-dark" checked> Тёмный плеер</label></div><div class="mh-queue-heading"><span>Далее в очереди</span><span id="mh-queue-count">0</span></div><div id="mh-queue"></div><div class="mh-side-note">Музыка продолжит играть,<br>когда вернёшься в чаты.</div></aside>
      <footer class="mh-player"><div class="mh-player-track"><span id="mh-player-art"></span><div><strong id="mh-player-title">Выбери трек</strong><span id="mh-player-artist">Всё начинается с одного нажатия</span></div><button class="mh-icon" data-action="current-like" aria-label="Лайк текущему треку">${icon('heart')}</button></div><div class="mh-player-center"><div class="mh-controls"><button class="mh-icon" data-action="shuffle" aria-label="Перемешать" aria-pressed="false">${icon('shuffle')}</button><button class="mh-icon" data-action="previous" aria-label="Предыдущий трек">${icon('previous')}</button><button class="mh-play-main" data-action="toggle" aria-label="Воспроизвести">${icon('play')}</button><button class="mh-icon" data-action="next" aria-label="Следующий трек">${icon('next')}</button><button class="mh-icon" data-action="repeat" aria-label="Повтор трека" aria-pressed="false">${icon('repeat')}</button></div><div class="mh-timeline"><span id="mh-elapsed">0:00</span><input id="mh-seek" type="range" min="0" max="1" value="0" step=".1" aria-label="Позиция в треке"><span id="mh-duration">0:00</span></div></div><div class="mh-volume">${icon('volume')}<input id="mh-volume" type="range" min="0" max="1" step=".01" value="1" aria-label="Громкость"><button class="mh-icon mh-now-toggle" data-action="now" aria-label="Сейчас играет">${icon('list')}</button></div></footer>
      <div class="mh-sheet-backdrop" id="mh-sheet" hidden><section class="mh-sheet" role="dialog" aria-modal="true" aria-labelledby="mh-sheet-title"><header><h2 id="mh-sheet-title"></h2><button class="mh-icon" data-action="sheet-close" aria-label="Закрыть">${icon('close')}</button></header><div id="mh-sheet-body"></div></section></div>
      <input id="mh-local-files" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac" multiple hidden>`;
    document.body.append(root);
    const playbackNotice=document.createElement('div');playbackNotice.id='mh-playback-error-v185';playbackNotice.className='mh-playback-error-v185';playbackNotice.hidden=true;playbackNotice.setAttribute('role','alert');root.querySelector('.mh-top').after(playbackNotice);
    $('mh-search').placeholder='Поиск музыки';
    root.querySelector('.mh-logo').setAttribute('aria-label','Главная ExstraMusic');root.querySelector('.mh-logo').title='ExstraMusic';root.querySelector('.mh-back').title='Вернуться в чаты';root.querySelector('.mh-back').setAttribute('aria-label','Вернуться в чаты');
    const queueClose=document.createElement('button');queueClose.className='mh-icon mh-now-close-v171';queueClose.dataset.action='now';queueClose.setAttribute('aria-label','Закрыть очередь');queueClose.innerHTML=icon('close');root.querySelector('.mh-listening').prepend(queueClose);root.querySelector('.mh-listening').id='mh-listening-v171';const queueToggle=root.querySelector('.mh-now-toggle');queueToggle.setAttribute('aria-controls','mh-listening-v171');queueToggle.setAttribute('aria-expanded','false');queueToggle.setAttribute('aria-label','Плеер и очередь');
    root.addEventListener('click',onClick);
    $('mh-search').addEventListener('input',()=>{clearTimeout(searchTimer);state.query=$('mh-search').value.trim();state.genre='';searchTimer=setTimeout(()=>{state.view==='home'?loadFeed(true):render();},280);});
    $('mh-seek').addEventListener('input',e=>core()?.seek(Number(e.target.value)));
    $('mh-volume').addEventListener('input',e=>core()?.setVolume(Number(e.target.value)));
    $('mh-sc-dark').checked=localStorage.getItem('telechat_sc_original_v117')!=='1';
    $('mh-sc-dark').addEventListener('change',()=>{root.classList.toggle('mh-original-sc',!$('mh-sc-dark').checked);localStorage.setItem('telechat_sc_original_v117',$('mh-sc-dark').checked?'0':'1');});
    root.classList.toggle('mh-original-sc',!$('mh-sc-dark').checked);
    $('mh-local-files').onchange=importTracks;
    const together=document.createElement('button');together.className='mh-together-v147';together.dataset.action='together';together.setAttribute('aria-label','Слушать вместе');together.innerHTML=icon('music')+'<span>Слушать вместе</span>';root.querySelector('.mh-publish-top').before(together);
    document.addEventListener('keydown',e=>{
      if(document.getElementById('together-v147')?.open||document.getElementById('sleep-timer-v176')?.open)return;
      if(!state.opened)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!$('mh-sheet').hidden)closeSheet();else if(root.classList.contains('mh-show-now'))setNow(false,true);else close();}
      if(e.key==='Tab'){const scope=!$('mh-sheet').hidden?$('mh-sheet'):root;const focus=[...scope.querySelectorAll('button:not(:disabled),a[href],input:not([hidden]),textarea,select')].filter(el=>el.getClientRects().length);if(!focus.length)return;const first=focus[0],last=focus.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===scope||!scope.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===scope)){e.preventDefault();first.focus();}}
    },true);
    $('mh-now-art').innerHTML=cover({id:'telechat-music'},'mh-large-art');
    window.addEventListener('telechat-music-progress-v117',e=>syncPlayer(e.detail));
    window.exstraUtilitiesV176?.attachMusic(root);
  }
  async function open() {
    if(!user()?.nick){toast('Сначала войди в аккаунт');return;}
    const firstOpen=!state.opened;
    ensure();lastFocus=document.activeElement;state.opened=true;root.hidden=false;document.body.classList.add('music-hub-open-v117');document.querySelector('.music-entry-v96')?.setAttribute('aria-expanded','true');
    const changed=state.owner!==user().nick;
    if(changed)resetOwnerV212(user().nick);
    const openingVersion=++openVersionV199,ctx=captureV212();paintSelfV212();
    render();syncPlayer(core()?.getState());root.querySelectorAll('.mh-profile-avatar video[autoplay]').forEach(v=>v.play()?.catch(()=>{}));root.focus({preventScroll:true});
    if(firstOpen)window.telechatMusicIntroV118?.enter(root,state.owner,core()?.getState());
    const openingOwner=state.owner;const results=await Promise.allSettled([state.localAt&&Date.now()-state.localAt<60000?Promise.resolve(state.local):boundedV199(core().getTracks(),8000,ctx),loadLibrary(),loadFeed(true)]);
    if(openingVersion!==openVersionV199||!currentV212(ctx))return;
    if(results[0].status==='fulfilled'){state.local=results[0].value;state.localAt=Date.now();}
    else toast('Локальные файлы сейчас недоступны. Общие треки по ссылке можно слушать независимо от хранилища устройства.');
    if(results[1].status==='rejected'){state.server=false;toast(err(results[1].reason));}
    render();syncPlayer(core()?.getState());
    const shared=new URL(location.href).searchParams.get('music');if(shared){await openShared(shared);}
  }
  function close(){if(publishing){toast('Подожди, трек ещё публикуется');return;}openVersionV199++;clearTimeout(searchTimer);searchTimer=0;state.opened=false;if(root)root.querySelectorAll('.mh-profile-avatar video').forEach(v=>v.pause());if(root){setNow(false);root.hidden=true;}closeSheet();document.body.classList.remove('music-hub-open-v117');document.querySelector('.music-entry-v96')?.setAttribute('aria-expanded','false');lastFocus?.focus?.({preventScroll:true});}
  async function boundedV199(query,timeout=10000,ctx=captureV212()){assertV212(ctx);const controller=new AbortController();requestsV212.add(controller);let timer;if(query.abortSignal)query=query.abortSignal(controller.signal);const expired=new Promise((_,reject)=>{if(timeout>0)timer=setTimeout(()=>{reject(Error('Музыка загружается дольше обычного. Попробуй обновить раздел.'));controller.abort();},timeout);controller.signal.addEventListener('abort',()=>{const error=new Error('Запрос музыки отменён');error.code=currentV212(ctx)?'MUSIC_CANCELLED':'MUSIC_CONTEXT_CHANGED';reject(error);},{once:true});});try{const value=await Promise.race([query,expired]);assertV212(ctx);return value;}finally{clearTimeout(timer);requestsV212.delete(controller);}}
  async function profiles(nicks,full=false) {
    const ctx=captureV212(),missing=[...new Set(nicks)].filter(n=>{const p=state.profiles.get(n);return n&&(!p||Date.now()-(p._atV212||0)>=60000||full&&(!p._fullV199||Date.now()-(p._fullAtV212||0)>=60000));});if(!missing.length)return;
    const key=JSON.stringify([ctx.epoch,full,...missing.sort()]);if(profileFlightsV212.has(key))return profileFlightsV212.get(key);
    const snapshots=new Map(missing.map(n=>[n,{...state.profiles.get(n)}]));
    const task=(async()=>{for(let i=0;i<missing.length;i+=40){const result=await boundedV199(sb.from('users').select(full?'nick,name,av,status,banner':'nick,name,av').in('nick',missing.slice(i,i+40)),10000,ctx);if(result.error)throw result.error;assertV212(ctx);
      for(const u of result.data||[]){const before=snapshots.get(u.nick)||{},latest=state.profiles.get(u.nick)||{},safe={...u};for(const field of Object.keys(safe))if(Object.hasOwn(latest,field)&&latest[field]!==before[field])safe[field]=latest[field];state.profiles.delete(u.nick);state.profiles.set(u.nick,{...latest,...safe,_atV212:Date.now(),...(full?{_fullV199:true,_fullAtV212:Date.now()}:{})});}
      while(state.profiles.size>64)state.profiles.delete(state.profiles.keys().next().value);
    }})().finally(()=>{if(profileFlightsV212.get(key)===task)profileFlightsV212.delete(key);});profileFlightsV212.set(key,task);return task;
  }
  function loadLibrary(force=false){const owner=state.owner;if(!owner||owner!==user()?.nick)return Promise.resolve();
    const ctx=captureV212();if(libraryFlightV199?.owner===owner&&libraryFlightV199.epoch===ctx.epoch)return force?libraryFlightV199.task.catch(()=>{}).then(()=>currentV212(ctx)?loadLibrary(true):undefined):libraryFlightV199.task;
    if(!force&&state.libraryAt&&Date.now()-state.libraryAt<45000)return Promise.resolve();
    const revision=libraryRevisionV212,job={owner,epoch:ctx.epoch,task:null};job.task=(async()=>{const data=await api('library',{},ctx);assertV212(ctx);if(revision!==libraryRevisionV212){state.libraryAt=0;return;}
      const saved=new Set(data.saved||[]),liked=new Set(data.liked||[]),playlists=data.playlists||[],ids=[...new Set([...saved,...liked,...playlists.flatMap(p=>p.track_ids||[])])].filter(id=>force||!state.catalog.has(id)||Date.now()-(catalogAtV212.get(id)||0)>=45000);
      for(let i=0;i<ids.length;i+=100){const part=ids.slice(i,i+100),since=++catalogRevisionV212,result=await boundedV199(sb.from('music_catalog_v117').select('*').in('id',part),10000,ctx);assertV212(ctx);if(revision!==libraryRevisionV212){state.libraryAt=0;return;}if(result.error)throw result.error;const rows=result.data||[],found=new Set(rows.map(t=>t.id));rememberTracksV212(rows,since);for(const id of part)if(!found.has(id)&&(catalogVersionsV212.get(id)||0)<=since)forgetTrackV212(id);}
      assertV212(ctx);if(revision!==libraryRevisionV212){state.libraryAt=0;return;}state.saved=saved;state.liked=liked;state.playlists=playlists;state.server=true;state.libraryAt=Date.now();
    })().finally(()=>{if(libraryFlightV199===job)libraryFlightV199=null;});libraryFlightV199=job;return job.task;
  }
  function loadFeed(reset=false,force=false){const owner=state.owner,key=JSON.stringify([state.filter,state.query]),offset=reset?0:state.offset,jobKey=key+'|'+offset;
    const ctx=captureV212();
    if(reset&&!force&&state.feedKey===key&&state.feedAt&&Date.now()-state.feedAt<60000){if(feedFlightV199&&feedFlightV199.key!==jobKey){state.request++;state.loading=false;}render();return Promise.resolve();}
    if(!force&&feedFlightV199?.owner===owner&&feedFlightV199.epoch===ctx.epoch&&feedFlightV199.key===jobKey)return feedFlightV199.task;
    const req=++state.request,since=++catalogRevisionV212,job={owner,epoch:ctx.epoch,key:jobKey,task:null};state.loading=true;render();
    job.task=(async()=>{try{let query=sb.from('music_catalog_v117').select('*').order(state.filter==='popular'?'likes_count':'created_at',{ascending:false}).order('id',{ascending:false});
      if(state.query){const q=state.query.replace(/[%,()_\\\\]/g,' ').trim();query=query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);}
      const result=await boundedV199(query.range(offset,offset+59),10000,ctx);if(result.error)throw result.error;if(req!==state.request||!currentV212(ctx))return;
      const items=result.data||[];rememberTracksV212(items,since);state.feed=reset?items.map(t=>t.id):[...new Set([...state.feed,...items.map(t=>t.id)])];state.offset=offset+items.length;state.more=items.length===60;state.server=true;state.feedAt=Date.now();state.feedKey=key;
      const missingNames=items.filter(t=>!t.artist).map(t=>t.author_nick);if(missingNames.length)profiles(missingNames).then(()=>{if(req===state.request&&currentV212(ctx))render();}).catch(()=>{});
    }catch(error){if(req===state.request&&currentV212(ctx)){state.server=false;toast(err(error));}}finally{if(req===state.request&&currentV212(ctx)){state.loading=false;render();}if(feedFlightV199===job)feedFlightV199=null;}})();feedFlightV199=job;return job.task;
  }
  async function showProfile(nick){const ctx=captureV212(),target=nick||ctx.owner,request=++profileVersionV212,since=++catalogRevisionV212;state.profile=target;state.view='profile';state.query='';$('mh-search').value='';render();
    const current=()=>currentV212(ctx)&&request===profileVersionV212&&state.view==='profile'&&state.profile===target;
    try{const result=await boundedV199(sb.from('music_catalog_v117').select('*').eq('author_nick',target).order('created_at',{ascending:false}).limit(100),10000,ctx);if(result.error)throw result.error;if(!current())return;rememberTracksV212(result.data||[],since);authorViewsV212.set(target,(result.data||[]).map(t=>t.id));while(authorViewsV212.size>64)authorViewsV212.delete(authorViewsV212.keys().next().value);await profiles([target],true);if(current())render();}catch(error){if(current())toast(err(error));}
  }
  function shownTracks(){let items=[];
    if(state.view==='home')items=state.feed.map(id=>state.catalog.get(id));
    if(state.view==='library')items=[...state.saved].map(id=>state.catalog.get(id));
    if(state.view==='likes')items=[...state.liked].map(id=>state.catalog.get(id));
    if(state.view==='local')items=state.local.map(t=>({...t,local:true,artist:'На этом устройстве'}));
    if(state.view==='profile'){const target=state.profile||state.owner;items=authorViewsV212.has(target)?authorViewsV212.get(target).map(id=>state.catalog.get(id)):[...state.catalog.values()].filter(t=>t.author_nick===target).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));}
    if(state.view==='playlist')items=playlistTracks(state.playlists.find(p=>p.id===state.selectedPlaylist));
    return items.filter(Boolean).filter(t=>(state.view!=='home'||!state.genre||t.genre===state.genre)&&(!state.query||(t.title+' '+(t.artist||'')).toLowerCase().includes(state.query.toLowerCase())));
  }
  function row(t,index){const local=!!t.local, saved=state.saved.has(t.id),liked=state.liked.has(t.id),sc=window.telechatSoundCloudV98?.isLink(t.url);return `<article class="mh-track" data-track="${esc(t.id)}"><span class="mh-track-index">${index+1}</span><button class="mh-track-art" data-action="play" data-id="${esc(t.id)}" aria-label="Слушать ${esc(t.title)}">${cover(t)}<span class="mh-track-play">${icon('play')}</span></button><div class="mh-track-copy"><button class="mh-track-title" data-action="play" data-id="${esc(t.id)}">${esc(t.title)}</button><button class="mh-track-artist" ${local?'disabled':`data-author="${esc(t.author_nick)}"`}>${esc(t.artist||state.profiles.get(t.author_nick)?.name||t.author_nick||'На устройстве')}${sc?'<span class="mh-sc-tag">SOUNDCLOUD</span>':''}</button></div><span class="mh-track-genre">${esc(local?(t.kind==='file'?'Офлайн':'По ссылке'):t.genre||'Релиз')}</span><span class="mh-track-duration">${time(t.duration)}</span>${!local?`<button class="mh-icon mh-like ${liked?'is-active':''}" data-action="like" data-id="${esc(t.id)}" aria-label="${liked?'Убрать лайк':'Лайк'}" aria-pressed="${liked}">${icon('heart')}<small>${t.likes_count||0}</small></button><button class="mh-icon mh-save ${saved?'is-active':''}" data-action="save" data-id="${esc(t.id)}" aria-label="${saved?'Убрать из музыки':'В мою музыку'}" aria-pressed="${saved}">${icon(saved?'check':'plus')}</button>`:''}<button class="mh-icon" data-action="more" data-id="${esc(t.id)}" aria-label="Действия с треком">${icon('more')}</button></article>`;}
  function empty(title,text,action='publish',label='Выложить первый трек'){
    const art=window.exstraEmptyV218?.art(state.query?'search':'music');
    return `<div class="mh-empty" data-empty-view-v218="${esc(state.view+'|'+(state.query?'search':state.selectedPlaylist))}">${art||`<span>${icon('music')}</span>`}<h3>${title}</h3><p>${text}</p>${action?`<button class="mh-primary" data-action="${action}">${label}</button>`:''}</div>`;
  }
  function shelfCard(t){return `<button class="mh-release" data-action="play" data-id="${esc(t.id)}" aria-label="Слушать: ${esc(t.title)}"><span class="mh-cover-wrap-v171">${cover(t)}<span class="mh-release-play">${icon('play')}</span></span><strong>${esc(t.title)}</strong><small>${esc(t.artist||t.author_nick||'На устройстве')}</small></button>`;}
  function shelf(title,id,tracks){return `<section class="mh-shelf-section-v171" aria-label="${esc(title)}"><div class="mh-section-heading"><h2>${esc(title)}</h2><div class="mh-shelf-arrows-v171"><button class="mh-icon" data-action="shelf-back" data-shelf="${id}" aria-label="Назад: ${esc(title)}">${icon('back')}</button><button class="mh-icon" data-action="shelf-next" data-shelf="${id}" aria-label="Далее: ${esc(title)}">${icon('back')}</button></div></div><div class="mh-shelf-v171" data-shelf-v171="${id}" tabindex="0" aria-label="${esc(title)} — прокрутка">${tracks.map(shelfCard).join('')}</div></section>`;}
  function collections(){const cards=[['likes','heart','Любимые',state.liked.size+' треков'],['library','library','Моя музыка',state.saved.size+' в коллекции'],['local','upload','С устройства',state.local.length+' треков']].map(([view,image,title,note])=>`<button class="mh-collection-v171" data-view="${view}"><span class="mh-collection-art-v171" data-kind="${view}">${icon(image)}</span><strong>${title}</strong><small>${note}</small></button>`).join('');return `<section class="mh-shelf-section-v171"><div class="mh-section-heading"><h2>Твои подборки</h2><button class="mh-subtle" data-view="playlists">Все плейлисты ${icon('back')}</button></div><div class="mh-shelf-v171" data-shelf-v171="collections" tabindex="0" aria-label="Твои подборки — прокрутка">${cards}${state.playlists.slice(0,3).map(p=>`<button class="mh-release mh-home-playlist-v171" data-playlist="${esc(p.id)}">${cover(playlistTracks(p)[0]||{id:p.id,title:p.title})}<strong>${esc(p.title)}</strong><small>${playlistTracks(p).length} треков · плейлист</small></button>`).join('')}<button class="mh-collection-v171" data-action="create-playlist"><span class="mh-collection-art-v171" data-kind="new">${icon('plus')}</span><strong>Новый плейлист</strong><small>Собери свою подборку</small></button></div></section>`;}
  function homeV199(items){const hour=new Date().getHours(),greeting=hour<6?'Доброй ночи':hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер',name=Array.from(user()?.name||state.owner).slice(0,40).join('');return `<div class="mh-greeting-v171"><h2>${greeting}, <span>${esc(name)}</span></h2><p>Твой звук. Твоё пространство.</p></div><section class="mh-wave-v171 mh-wave-v199" aria-labelledby="mh-wave-title-v171"><div class="mh-wave-copy-v199"><span class="mh-wave-brand-v171">EXSTRA MUSIC · ТВОЯ ВОЛНА</span><h1 id="mh-wave-title-v171">Поймай<br>свой ритм<span>.</span></h1><p>Любимые треки и новые открытия — просто нажми play.</p><span class="mh-wave-mode-v171">${icon('shuffle')} ${state.genre?esc(state.genre):'Твоя коллекция и сообщество'}</span></div><svg class="mh-wave-art-v199" viewBox="0 0 500 260" fill="none" aria-hidden="true"><path d="M-25 215C90 225 40-30 180 35S290 320 410 95 560 75 560 75" stroke="currentColor" stroke-width="54"/><path d="M-25 217C90 227 40-28 180 37S290 322 410 97 560 77 560 77" stroke="#ffffff32" stroke-width="1"/></svg><button class="mh-wave-play-v171" data-action="play-wave" aria-label="Слушать мою волну">${icon('play')}</button></section>${collections()}${items.length?shelf('На твоей волне','wave',items.slice(0,10)):''}`;}
  function genreBarV199(){const genres=[...new Set(state.feed.map(id=>state.catalog.get(id)?.genre).filter(Boolean))].slice(0,12);return `<div class="mh-discovery-v199"><div class="mh-genres-v199" role="group" aria-label="Жанры в загруженной подборке"><button data-music-genre="" aria-pressed="${!state.genre}">Всё</button>${genres.map(g=>`<button data-music-genre="${esc(g)}" aria-pressed="${state.genre===g}">${esc(g)}</button>`).join('')}</div><button class="mh-icon mh-refresh-v199" data-action="refresh-music" aria-label="Обновить музыку" title="Обновить музыку" ${state.loading?'disabled':''}>${icon('repeat')}</button></div>`;}
  function render(){if(!root||!state.opened)return;
    root.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view||(b.dataset.view==='playlists'&&state.view==='playlist')||(b.dataset.view==='library'&&state.view==='local');b.classList.toggle('is-active',active);b.setAttribute('aria-current',active?'page':'false');});
    let content='',items=shownTracks();
    if(state.view==='home'){
      if(!state.query)content=homeV199(items);
      content+=genreBarV199()+`<div class="mh-section-heading mh-all-heading-v171"><h2>${state.query?'Результаты поиска':'Все треки'}<small class="mh-result-count-v199">${items.length}</small></h2><div class="mh-tabs"><button data-filter="new" class="${state.filter==='new'?'is-active':''}">Новое</button><button data-filter="popular" class="${state.filter==='popular'?'is-active':''}">По лайкам</button></div></div>`;
    }else if(state.view==='profile'){
      const nick=state.profile||state.owner,u=nick===user()?.nick?user():state.profiles.get(nick),own=nick===state.owner;
      let banner=window.telechatProfileAppearanceV84?.decode(u?.banner)?.banner||u?.banner||'';if(banner.startsWith('video:'))banner='';
      const bannerUrl=safeUrl(banner)||(/^data:image\/(jpeg|png|webp);base64,/i.test(banner)?banner:'');
      let av=icon('user');try{if(u&&typeof avatarMarkup==='function')av=avatarMarkup(u);}catch(_){}
      content+=`<section class="mh-profile-hero" ${bannerUrl?`style="background-image:linear-gradient(180deg,rgba(12,13,23,.2),rgba(12,13,23,.94)),url('${esc(bannerUrl)}')"`:''}><span class="mh-eyebrow">МУЗЫКАЛЬНЫЙ ПРОФИЛЬ</span><div class="mh-profile-identity"><span class="mh-profile-avatar">${av}</span><div><h1>${esc(u?.name||nick)}</h1><span>@${esc(nick)}</span></div></div><div class="mh-profile-footer"><span><b>${items.length}</b> треков</span><span><b>${items.reduce((s,t)=>s+(t.likes_count||0),0)}</b> лайков</span>${own?'<button class="mh-primary" data-action="publish">'+icon('upload')+' Выложить трек</button>':''}</div></section><div class="mh-section-heading"><h2>${own?'Твои публикации':'Треки автора'}</h2></div>`;
    }else if(state.view==='playlists'){
      content=`<div class="mh-page-title"><span class="mh-eyebrow">МУЗЫКА ПОД НАСТРОЕНИЕ</span><h1>Твои плейлисты</h1><p>Собирай свои маленькие музыкальные миры.</p></div><div class="mh-playlist-grid"><button class="mh-playlist-new" data-action="create-playlist"><span>${icon('plus')}</span><strong>Новый плейлист</strong><small>Собери свою подборку</small></button>${state.playlists.map(p=>`<button class="mh-playlist-card" data-playlist="${esc(p.id)}">${cover(playlistTracks(p)[0]||{id:p.id})}<strong>${esc(p.title)}</strong><small>${playlistTracks(p).length} треков · личный плейлист</small></button>`).join('')}</div>`;
    }else{
      const titles={library:['ВСЁ, ЧТО ТЕБЕ БЛИЗКО','Моя музыка','Сохранённые треки доступны на всех твоих устройствах.'],likes:['СОБРАНО С ЛЮБОВЬЮ','Любимые треки','Музыка, которой ты поставил сердце.'],local:['ВСЕГДА ПОД РУКОЙ','На устройстве','Загруженные файлы можно слушать офлайн и добавлять в плейлисты.'],playlist:['ТВОЯ ПОДБОРКА',state.playlists.find(p=>p.id===state.selectedPlaylist)?.title||'Плейлист','Треки из ленты синхронизируются. Файлы с устройства доступны только здесь — без публикации.']};const [small,title,note]=titles[state.view]||titles.library;
      const tabs=['library','local'].includes(state.view)?`<div class="mh-tabs"><button data-view="library" class="${state.view==='library'?'is-active':''}">В облаке <span>${state.saved.size}</span></button><button data-view="local" class="${state.view==='local'?'is-active':''}">На устройстве <span>${state.local.length}</span></button></div>`:`<span class="mh-track-count">${items.length} треков</span>`;
      content=`<div class="mh-page-title"><span class="mh-eyebrow">${small}</span><h1>${esc(title)}</h1><p>${note}</p></div><div class="mh-library-tools">${tabs}<button class="mh-subtle" data-action="${state.view==='local'?'import':'play-all'}">${icon(state.view==='local'?'upload':'play')}${state.view==='local'?'Добавить файлы':'Слушать всё'}</button>${state.view==='playlist'?'<button class="mh-primary" data-action="playlist-files">'+icon('plus')+' С устройства</button><button class="mh-icon" data-action="delete-playlist" aria-label="Удалить плейлист">'+icon('trash')+'</button>':''}</div>`;
    }
    if(state.view!=='playlists'){
      if(items.length)content+=`<div class="mh-tracks">${items.map(row).join('')}</div>`;
      else if(state.loading)content+='<div class="mh-loading" role="status">Открываем музыку…</div>';
      else content+=empty(state.query?'Пока ничего не нашлось':state.view==='home'?'Здесь начинается новая волна':'Добавь немного своего ритма',state.query?'Попробуй другое название или исполнителя.':state.view==='home'?'Выложи первый трек — его услышат другие пользователи ExstraChat.':'Сохраняй треки из общей ленты или загрузи свою музыку.',state.query?'':state.view==='home'||state.view==='profile'?'publish':state.view==='playlist'?'playlist-files':state.view==='local'?'import':'discover',state.view==='home'||state.view==='profile'?'Выложить трек':state.view==='playlist'||state.view==='local'?'Добавить с устройства':'Открыть музыку');
      if(state.view==='home'&&state.more&&items.length)content+=`<button class="mh-load-more" data-action="load-more" ${state.loading?'disabled':''}>${state.loading?'Загружаем…':'Показать ещё'}</button>`;
    }
    if(content!==renderMarkupV199){const scroll=$('mh-scroll'),top=scroll.scrollTop,shelves=[...scroll.querySelectorAll('[data-shelf-v171]')].map(n=>[n.dataset.shelfV171,n.scrollLeft]);const body=$('mh-content'),previousEmpty=body.querySelector('[data-empty-view-v218]')?.dataset.emptyViewV218;body.innerHTML=content;const nextEmpty=body.querySelector('[data-empty-view-v218]');if(nextEmpty&&nextEmpty.dataset.emptyViewV218===previousEmpty)nextEmpty.querySelector('.es-animate')?.classList.remove('es-animate');renderMarkupV199=content;renderVersionV199++;scroll.scrollTop=top;for(const [key,left] of shelves){const shelf=[...scroll.querySelectorAll('[data-shelf-v171]')].find(n=>n.dataset.shelfV171===key);if(shelf)shelf.scrollLeft=left;}}syncPlayer(core()?.getState());
  }
  function resolveTrack(id){return state.catalog.get(id)||state.local.find(t=>t.id===id);}
  function playable(t){return {...t,kind:t.kind||'link',owner:state.owner,artist:t.artist||t.author_nick||'Моя музыка'};}
  function setNow(expanded,focus=false){if(!root)return;root.classList.toggle('mh-show-now',expanded);root.querySelector('.mh-now-toggle').setAttribute('aria-expanded',String(expanded));if(focus){const options=expanded?['.phone-now-close-v159','.mh-now-close-v171']:['.phone-now-open-v159','.mh-now-toggle'];options.map(s=>root.querySelector(s)).find(n=>n?.getClientRects().length)?.focus({preventScroll:true});}}
  async function play(id){const ctx=captureV212(),track=resolveTrack(id);if(!track)return;state.waveActive=false;state.queue=shownTracks();if(!state.queue.some(t=>t.id===id))state.queue=[track];renderQueue();try{await core().playTrack(playable(track),state.queue.map(playable));}catch(error){if(currentV212(ctx))toast(err(error));}}
  async function playWave(){const ctx=captureV212();if(state.waveActive&&currentTrack()&&state.queue.some(t=>t.id===currentTrack().id)){await core().toggle();return;}const ids=[...new Set([...state.liked,...state.saved,...state.feed,...state.local.map(t=>t.id)])];const tracks=ids.map(resolveTrack).filter(t=>t&&(!state.genre||t.genre===state.genre)).slice(0,60);if(!tracks.length){toast('Добавь первый трек — и включай свою волну');return;}for(let i=tracks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tracks[i],tracks[j]]=[tracks[j],tracks[i]];}state.queue=tracks;state.waveActive=true;renderQueue();try{await core().playTrack(playable(tracks[0]),tracks.map(playable));}catch(error){if(currentV212(ctx)&&state.queue===tracks){state.waveActive=false;toast(err(error));}}}
  function renderQueue(){if(!$('mh-queue'))return;const current=currentTrack(),index=state.queue.findIndex(t=>t.id===current?.id),next=state.queue.slice(Math.max(0,index+1));$('mh-queue-count').textContent=String(next.length);const markup=next.slice(0,8).map(t=>`<button class="mh-queue-track" data-action="play" data-id="${esc(t.id)}">${cover(t)}<span><strong>${esc(t.title)}</strong><small>${esc(t.artist||t.author_nick||'На устройстве')}</small></span>${icon('play')}</button>`).join('')||'<p class="mh-queue-empty">Включи подборку — следующие треки появятся здесь.</p>';if(markup!==queueMarkupV199){queueMarkupV199=markup;$('mh-queue').innerHTML=markup;}}
  function syncPlayer(info){if(!root||!info||!state.opened)return;const t=info.track?{...info.track,...(state.catalog.get(info.track.id)||state.local.find(x=>x.id===info.track.id)||{})}:null,signature=JSON.stringify([t?.id,t?.title,t?.artist,t?.author_nick,t?.cover_url]),changed=playerTrackViewV212!==signature;playerTrackViewV212=signature;root.dataset.playingId=t?.id||'';
    const notice=$('mh-playback-error-v185'),failure=info.error?.message||'';
    if(notice&&notice.dataset.playbackFailure!==failure){notice.dataset.playbackFailure=failure;notice.hidden=!failure;if(failure){const copy=document.createElement('span');copy.textContent=failure;const retry=document.createElement('button');retry.type='button';retry.className='mh-primary';retry.dataset.action='retry';retry.textContent='Повторить';notice.replaceChildren(copy,retry);}else notice.replaceChildren();}
    if(changed){$('mh-now-art').innerHTML=cover(t||{id:'telechat-music'},'mh-large-art');$('mh-player-art').innerHTML=cover(t||{id:'empty'});$('mh-now-title').textContent=t?.title||'Твой следующий любимый трек';$('mh-now-artist').textContent=t?.artist||t?.author_nick||'Выбирай музыку и оставайся на своей волне';$('mh-player-title').textContent=t?.title||'Выбери трек';$('mh-player-artist').textContent=t?.artist||t?.author_nick||(t?'Моя музыка':'Всё начинается с одного нажатия');renderQueue();}
    $('mh-now-artist').dataset.author=t?.author_nick||'';
    const sc=!!window.telechatSoundCloudV98?.isLink(t?.url);$('mh-cloud-options').hidden=!sc;
    const toggle=root.querySelector('[data-action="toggle"]'),mode=t&&!info.paused?'pause':'play';if(toggle.dataset.mode!==mode){toggle.innerHTML=icon(mode);toggle.dataset.mode=mode;toggle.setAttribute('aria-label',mode==='pause'?'Пауза':'Воспроизвести');}
    if(toggle.getAttribute('aria-busy')!==String(!!info.loading))toggle.setAttribute('aria-busy',String(!!info.loading));
    const wave=root.querySelector('[data-action="play-wave"]');if(wave){const playing=state.waveActive&&t&&state.queue.some(x=>x.id===t.id)&&!info.paused,waveMode=playing?'pause':'play';if(wave.dataset.mode!==waveMode){wave.dataset.mode=waveMode;wave.innerHTML=icon(waveMode);wave.setAttribute('aria-label',playing?'Пауза моей волны':'Слушать мою волну');}}
    const elapsed=info.time?time(info.time):'0:00',duration=info.duration?time(info.duration):'0:00';if($('mh-elapsed').textContent!==elapsed)$('mh-elapsed').textContent=elapsed;if($('mh-duration').textContent!==duration)$('mh-duration').textContent=duration;const seek=$('mh-seek');seek.max=info.duration||1;if(document.activeElement!==seek)seek.value=info.time||0;const progress=Math.min(100,Math.floor((info.time||0)/(info.duration||1)*1000)/10)+'%';if(seek.progressV199!==progress){seek.progressV199=progress;seek.style.setProperty('--progress',progress);}
    ['repeat','shuffle'].forEach(action=>{const b=root.querySelector(`[data-action="${action}"]`);b.classList.toggle('is-active',!!info[action]);b.setAttribute('aria-pressed',String(!!info[action]));});
    const like=root.querySelector('[data-action="current-like"]');like.hidden=!state.catalog.has(t?.id);like.classList.toggle('is-active',state.liked.has(t?.id));
    const viewKey=[renderVersionV199,t?.id||'',!!info.paused].join('|');if(playerViewV199!==viewKey){playerViewV199=viewKey;
    root.querySelectorAll('.mh-track').forEach(row=>{const active=row.dataset.track===t?.id&&!info.paused;row.classList.toggle('is-playing',active);const b=row.querySelector('.mh-track-play');if(b&&b.dataset.mode!==(active?'pause':'play')){b.dataset.mode=active?'pause':'play';b.innerHTML=icon(active?'pause':'play');}});
    root.querySelectorAll('.mh-release[data-id],.mh-track-art').forEach(button=>{const active=button.dataset.id===t?.id&&!info.paused,mode=active?'pause':'play';if(button.dataset.playbackMode===mode)return;button.dataset.playbackMode=mode;button.classList.toggle('is-playing',active);const visual=button.querySelector('.mh-release-play');if(visual){visual.dataset.mode=mode;visual.innerHTML=icon(mode);}button.setAttribute('aria-label',(active?'Пауза: ':'Слушать: ')+(resolveTrack(button.dataset.id)?.title||''));});
    }
  }
  async function toggleCollection(id,kind){const ctx=captureV212(),key=ctx.epoch+':'+id+':'+kind;if(state.busy.has(key))return;state.busy.add(key);const set=kind==='like'?state.liked:state.saved, enabled=!set.has(id);
    try{await api(kind,{track_id:id,enabled},ctx);assertV212(ctx);enabled?set.add(id):set.delete(id);if(kind==='like'){const t=state.catalog.get(id);if(t)rememberTracksV212([{...t,likes_count:Math.max(0,(t.likes_count||0)+(enabled?1:-1))}]);}render();}catch(error){if(currentV212(ctx))toast(err(error));}finally{state.busy.delete(key);}
  }
  function sheet(title,html){ensure();linkCheckV217?.dispose();linkCheckV217=null;const version=++sheetVersionV212;$('mh-sheet-title').textContent=title;$('mh-sheet-body').innerHTML=html;$('mh-sheet').hidden=false;setTimeout(()=>{if(version===sheetVersionV212&&!$('mh-sheet').hidden)$('mh-sheet').querySelector('input,button')?.focus();},0);}
  function closeSheet(){if(publishing)return;linkCheckV217?.dispose();linkCheckV217=null;sheetVersionV212++;if($('mh-sheet'))$('mh-sheet').hidden=true;if(coverPreview)URL.revokeObjectURL(coverPreview);coverPreview='';if(uploadObjectUrl)URL.revokeObjectURL(uploadObjectUrl);uploadObjectUrl='';uploadFile=null;coverFile=null;}
  // Validate on demand, not by crawling the library. Media loading works even
  // when a host does not allow CORS; an optional HEAD only explains failures.
  async function explainLinkFailureV217(url,signal,error){
    if(signal.aborted||error?.name==='AbortError')throw new DOMException('Cancelled','AbortError');
    const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,2000);let message='';
    try{const response=await fetch(url,{method:'HEAD',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
      if(response.status===404||response.status===410)message='Файл по ссылке удалён или не найден. Вставь новую ссылку либо загрузи аудиофайл.';
      else if(response.status===401||response.status===403)message='Сайт закрыл доступ к файлу. Ссылка может требовать входа или уже истечь.';
      else if(response.status===429||response.status>=500)message='Сервер аудио временно недоступен. Проверь ссылку позже или загрузи файл.';
      else if(response.ok&&/text\/html|application\/xhtml/i.test(response.headers.get('content-type')||''))message='По ссылке открывается страница сайта, а не аудиофайл. Нужна прямая ссылка на музыку.';
    }catch(_){}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);controller.abort();}
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    return new Error(message||'Не удалось подтвердить воспроизведение. Ссылка недоступна, формат не поддерживается или сайт ограничивает доступ. Попробуй ещё раз либо загрузи аудиофайл.');
  }
  function createLinkCheckV217(container,getValue,active,input){
    const panel=document.createElement('section');panel.className='mh-link-check-v217';panel.hidden=true;panel.setAttribute('aria-label','Проверка ссылки');
    panel.innerHTML=`<div class="mh-link-result-v217" role="status" aria-live="polite" aria-atomic="true"><span class="mh-link-symbol-v217">${icon('check')}</span><div><strong></strong><p id="mh-link-result-v217"></p></div></div><p class="mh-link-risk-v217">Проверка показывает доступность только сейчас. Сторонний сайт может удалить файл или закрыть доступ позже. Надёжнее загрузить аудиофайл в ExstraChat.</p><button type="button" class="mh-subtle">Проверить снова</button><div class="mh-link-probe-v217" hidden></div>`;
    container.append(panel);const title=panel.querySelector('strong'),message=panel.querySelector('.mh-link-result-v217 p'),retry=panel.querySelector('button'),host=panel.querySelector('.mh-link-probe-v217');
    if(input)input.setAttribute('aria-describedby','mh-link-result-v217');
    let generation=0,timer=0,controller=null,pending=null,cached=null,disposed=false;
    const current=job=>!disposed&&active()&&job===generation;
    function paint(state,text,detail=''){panel.dataset.state=state;title.textContent=text;message.textContent=detail;retry.disabled=state==='checking';panel.setAttribute('aria-busy',String(state==='checking'));input?.setAttribute('aria-invalid',String(state==='error'));}
    function cancel(){generation++;clearTimeout(timer);timer=0;controller?.abort();controller=null;pending=null;cached=null;}
    async function check(force=false){
      if(disposed||!active())throw new DOMException('Cancelled','AbortError');
      clearTimeout(timer);timer=0;panel.hidden=false;let url;
      try{url=core().normalizeLink(String(getValue()||''));if(new URL(url).searchParams.has('secret_token'))throw new Error('Для общей ленты нужна публичная ссылка');}
      catch(error){cancel();paint('error','Ссылку нужно исправить',error.message);throw error;}
      if(pending?.url===url)return pending.task;
      if(!force&&cached?.url===url&&performance.now()-cached.at<30000)return cached.result;
      cancel();const job=generation,abort=controller=new AbortController();paint('checking','Проверяем ссылку…','Открываем аудио без воспроизведения звука.');
      const flight={url,task:null};flight.task=(async()=>{let cloud=null;
        try{let duration,source='link';
          if(window.telechatSoundCloudV98?.isLink(url)){source='soundcloud';cloud=await window.telechatSoundCloudV98.create(url,host,{signal:abort.signal,canPlay:()=>false});duration=cloud.duration;}
          else{try{duration=await core().inspectAudio(url,abort.signal,true);}catch(error){throw await explainLinkFailureV217(url,abort.signal,error);}}
          if(!current(job)||abort.signal.aborted)throw new DOMException('Cancelled','AbortError');
          if(!Number.isFinite(duration)||duration<=0||duration>21600)throw new Error('Нужен аудиотрек с конечной длительностью до 6 часов.');
          const temporary=[...new URL(url).searchParams.keys()].some(key=>/^(?:expires?|exp|token|sig|signature|x-amz-.+|x-goog-.+)$/i.test(key));
          const result={url,duration,source};cached={url,result,at:performance.now()};
          paint(temporary?'warning':'success',temporary?'Аудио доступно · ссылка может быть временной':'Ссылка работает сейчас',temporary?'В адресе есть параметры доступа. Они могут истечь — для постоянного доступа лучше загрузить файл.':`${source==='soundcloud'?'Официальный плеер SoundCloud доступен':'Браузер прочитал аудио'} · ${time(duration)}. Можно публиковать.`);
          return result;
        }catch(error){if(current(job)&&error.name!=='AbortError')paint('error','Не удалось проверить аудио',error.message);throw error;}
        finally{cloud?.destroy();if(current(job)){pending=null;controller=null;retry.disabled=false;panel.setAttribute('aria-busy','false');}}
      })();pending=flight;return flight.task;
    }
    function schedule(enabled=true){cancel();panel.hidden=!enabled;if(!enabled)return;input?.removeAttribute('aria-invalid');
      if(!String(getValue()||'').trim()){paint('idle','Вставь ссылку на трек','ExstraChat автоматически проверит, доступно ли аудио.');return;}
      paint('checking','Проверяем ссылку…','Открываем аудио без воспроизведения звука.');timer=setTimeout(()=>{timer=0;check().catch(()=>{});},500);
    }
    retry.onclick=()=>{check(true).catch(()=>{});};
    return {check,schedule,dispose(){disposed=true;cancel();}};
  }
  function more(id){const t=resolveTrack(id);if(!t)return;const isLocal=state.local.some(x=>x.id===id)&&!state.catalog.has(id);
    sheet(t.title,`<div class="mh-track-detail">${cover(t)}<div><strong>${esc(t.artist||t.author_nick||'На устройстве')}</strong><p>${esc(t.description||'Этот трек уже часть твоей волны.')}</p></div></div><div class="mh-action-list">${!isLocal?`<button data-action="menu-save" data-id="${esc(id)}">${icon(state.saved.has(id)?'check':'plus')} ${state.saved.has(id)?'Убрать из моей музыки':'В мою музыку'}</button><button data-action="to-playlist" data-id="${esc(id)}">${icon('list')} Добавить в плейлист</button><button data-action="share" data-id="${esc(id)}">${icon('share')} Поделиться в чате</button><button data-action="profile-track" data-id="${esc(id)}">${icon('user')} Поставить в профиль</button>${state.view==='playlist'?`<button data-action="playlist-remove" data-id="${esc(id)}">${icon('close')} Убрать из плейлиста</button>`:''}`:`<button data-action="to-playlist" data-id="${esc(id)}">${icon('list')} Добавить в плейлист</button>${state.view==='playlist'?`<button data-action="playlist-remove" data-id="${esc(id)}">${icon('close')} Убрать из плейлиста</button>`:''}<button data-action="publish-local" data-id="${esc(id)}">${icon('upload')} Выложить этот трек</button>`}${isLocal||t.author_nick===state.owner?`<button class="mh-danger" data-action="delete-track" data-id="${esc(id)}">${icon('trash')} ${isLocal?'Удалить с устройства':'Удалить публикацию'}</button>`:''}</div>`);
    if(t.url&&t.source!=='upload'&&!window.telechatSoundCloudV98?.isLink(t.url)){
      const context=captureV212(),version=sheetVersionV212,area=document.createElement('div');area.className='mh-track-link-check-v217';$('mh-sheet-body').querySelector('.mh-track-detail').after(area);
      linkCheckV217=createLinkCheckV217(area,()=>t.url,()=>currentV212(context)&&version===sheetVersionV212&&!$('mh-sheet').hidden);linkCheckV217.check().catch(()=>{});
    }
  }
  function playlistPicker(id){sheet('Добавить в плейлист',`<div class="mh-action-list">${state.playlists.map(p=>`<button data-action="playlist-add" data-id="${esc(id)}" data-list="${esc(p.id)}">${icon(playlistTracks(p).some(t=>t.id===id)?'check':'list')} ${esc(p.title)}<small>${playlistTracks(p).length} треков</small></button>`).join('')}<button data-action="create-playlist" data-id="${esc(id)}">${icon('plus')} Создать плейлист</button></div>`);}
  function devicePlaylistPicker(){sheet('Музыка с устройства',`<p class="mh-form-hint">Файлы останутся личными. Они хранятся на этом устройстве и не публикуются в общей ленте.</p><button class="mh-primary" data-action="playlist-import">${icon('upload')} Выбрать аудиофайлы</button><div class="mh-action-list mh-device-tracks">${state.local.map(t=>`<button data-action="playlist-add" data-id="${esc(t.id)}" data-list="${esc(state.selectedPlaylist)}">${icon(localPlaylistIds(state.selectedPlaylist).includes(t.id)?'check':'music')}<span>${esc(t.title)}</span><small>${time(t.duration)}</small></button>`).join('')}</div><p class="mh-form-hint">До 50 МБ на файл · до 100 файлов и 250 МБ на устройстве. Очистка данных приложения удалит локальные файлы.</p>`);}
  function createPlaylist(trackId){sheet('Новый плейлист',`<form id="mh-playlist-form" class="mh-form"><label>Название<input name="title" maxlength="80" placeholder="Например, ночные прогулки" required></label><p class="mh-form-hint">Треки из ленты синхронизируются. Файлы с устройства остаются только здесь.</p><button class="mh-primary" type="submit">Создать плейлист</button><p class="mh-form-status" role="status"></p></form>`);
    const context=captureV212(),version=sheetVersionV212,form=$('mh-playlist-form');let working=false;
    const active=()=>currentV212(context)&&version===sheetVersionV212&&form.isConnected&&!$('mh-sheet').hidden;
    form.onsubmit=async e=>{e.preventDefault();if(working||!active())return;working=true;const button=form.querySelector('button');button.disabled=true;
      try{const p=await api('create_playlist',{title:new FormData(form).get('title').trim()},context);if(!active())return;await loadLibrary(true);if(!active())return;if(trackId){await addToPlaylist(p.id,trackId);if(!active())return;}closeSheet();state.view='playlist';state.selectedPlaylist=p.id;render();}
      catch(error){if(active())form.querySelector('[role=status]').textContent=err(error);}finally{working=false;if(active())button.disabled=false;}
    };
  }
  async function shareTrack(id){const t=state.catalog.get(id);if(!t)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('music',id);const message=`🎵 ${t.artist||t.author_nick} — ${t.title}\n${url.href}`;
    sheet('Поделиться треком',`<p class="mh-form-hint">Отправь ссылку другу — она откроет этот трек в ExstraMusic.</p><label class="mh-share-link"><input readonly value="${esc(url.href)}" aria-label="Ссылка на трек"><button class="mh-primary" id="mh-copy-link">Копировать</button></label><form id="mh-share-form" class="mh-form"><label>Ник собеседника<input name="nick" placeholder="@username" required maxlength="80"></label><button class="mh-subtle" type="submit">${icon('share')} Открыть чат с черновиком</button><p class="mh-form-status" role="status"></p></form>`);
    const context=captureV212(),version=sheetVersionV212,form=$('mh-share-form'),copy=$('mh-copy-link'),link=$('mh-sheet-body').querySelector('input');let working=false;
    const active=()=>currentV212(context)&&version===sheetVersionV212&&form.isConnected&&!$('mh-sheet').hidden;
    copy.onclick=async()=>{if(!active())return;try{await navigator.clipboard.writeText(url.href);if(active())copy.textContent='Скопировано';}catch(_){if(active()){link.select();toast('Скопируй выделенную ссылку');}}};
    form.onsubmit=async e=>{e.preventDefault();if(working||!active())return;working=true;const nick=String(new FormData(form).get('nick')).replace(/^@/,'').trim().toLowerCase(),button=form.querySelector('button');button.disabled=true;
      try{assertV212(context);const result=await boundedV199(sb.from('users').select('nick').eq('nick',nick).maybeSingle());if(!active())return;if(result.error)throw result.error;if(!result.data)throw new Error('Пользователь не найден');closeSheet();close();const transition=sheetVersionV212;assertV212(context);await window.openChat(nick);
        if(!currentV212(context)||transition!==sheetVersionV212||state.opened||(typeof currentChat!=='undefined'&&currentChat!==nick)||(typeof currentRoom!=='undefined'&&currentRoom))return;
        const input=$('msg-input');if(!input)return;input.value=(input.value?input.value+'\n':'')+message;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();toast('Ссылка в черновике. Нажми отправить, когда будешь готов.');
      }catch(error){if(active())form.querySelector('[role=status]').textContent=err(error);}finally{working=false;if(active())button.disabled=false;}
    };
  }
  function composer(prefill){closeSheet();sheet('Поделись своим звуком',`<form id="mh-publish-form" class="mh-form"><div class="mh-upload-grid"><label class="mh-cover-picker" id="mh-cover-picker"><span>${icon('plus')}<strong>Обложка</strong><small>JPG, PNG, WebP</small></span><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><div><div class="mh-tabs mh-source-tabs"><button type="button" data-source="file" class="is-active">Аудиофайл</button><button type="button" data-source="link">Ссылка / SoundCloud</button></div><label class="mh-file-picker" id="mh-file-picker">${icon('upload')}<strong id="mh-file-label">Выбери аудиофайл</strong><span>MP3, M4A, WAV, OGG, FLAC · до 50 МБ</span><input name="audio" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac" hidden></label><label id="mh-link-field" hidden>Ссылка на трек<input name="url" type="url" placeholder="https://soundcloud.com/artist/track" maxlength="4096"></label><div id="mh-publish-probe"></div></div></div><div class="mh-fields-two"><label>Название<input name="title" required maxlength="160" placeholder="Как называется твой трек?"></label><label>Исполнитель<input name="artist" maxlength="100" placeholder="Имя исполнителя" value="${esc(user()?.name||state.owner)}"></label></div><label>Описание<textarea name="description" maxlength="1000" rows="3" placeholder="Расскажи историю этого трека…"></textarea></label><label>Жанр<select name="genre"><option value="">Выбери настроение</option>${['Электроника','Хип-хоп','Поп','Рок','Фонк','Эмбиент','Инди','Лоу-фай','Другое'].map(g=>`<option>${g}</option>`).join('')}</select></label><p class="mh-form-hint">Публикацию увидят все пользователи ExstraChat. Файлы — до 50 МБ на трек и 250 МБ суммарно. Публикуй свою музыку или ту, которой можешь делиться.</p><label class="mh-consent"><input name="rights" type="checkbox" required> У меня есть право делиться этим треком</label><div class="mh-publish-bottom"><span class="mh-form-status" id="mh-publish-status" role="status"></span><button class="mh-primary" type="submit">${icon('upload')} Опубликовать</button></div></form>`);
    const form=$('mh-publish-form'),context=captureV212(),version=sheetVersionV212;let selection=0;
    const active=()=>currentV212(context)&&version===sheetVersionV212&&form.isConnected&&!$('mh-sheet').hidden;
    const linkArea=document.createElement('div');form.querySelector('.mh-upload-grid').after(linkArea);
    const checker=createLinkCheckV217(linkArea,()=>form.elements.url.value,()=>active()&&form.dataset.source==='link',form.elements.url);linkCheckV217=checker;form.linkCheckV217=checker;
    form.dataset.source='file';form.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{if(!active())return;selection++;form.dataset.source=b.dataset.source;form.querySelectorAll('[data-source]').forEach(x=>x.classList.toggle('is-active',x===b));form.querySelector('#mh-file-picker').hidden=b.dataset.source!=='file';form.querySelector('#mh-link-field').hidden=b.dataset.source!=='link';checker.schedule(b.dataset.source==='link');});
    form.elements.url.oninput=()=>{if(!active()||form.dataset.source!=='link')return;form.querySelector('#mh-publish-status').textContent='';checker.schedule();};
    form.elements.url.onblur=()=>{if(active()&&form.dataset.source==='link'&&form.elements.url.value.trim())checker.check().catch(()=>{});};
    form.elements.audio.onchange=e=>{if(!active())return;selection++;uploadFile=e.target.files[0]||null;if(uploadFile){form.querySelector('#mh-file-label').textContent=uploadFile.name;if(!form.elements.title.value)form.elements.title.value=uploadFile.name.replace(/\.[^.]+$/,'').slice(0,160);}};
    form.elements.cover.onchange=e=>{if(!active())return;const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){form.querySelector('#mh-publish-status').textContent='Обложка — до 5 МБ';return;}coverFile=f;if(coverPreview)URL.revokeObjectURL(coverPreview);coverPreview=URL.createObjectURL(f);form.querySelector('#mh-cover-picker').style.backgroundImage='url('+JSON.stringify(coverPreview)+')';form.querySelector('#mh-cover-picker').classList.add('has-cover');};
    if(prefill){form.elements.title.value=prefill.title||'';if(prefill.kind==='file'){const selected=selection;core().getFile(prefill.id).then(blob=>{if(!active()||selection!==selected||form.dataset.source!=='file')return;uploadFile=blob;form.querySelector('#mh-file-label').textContent=prefill.title;}).catch(e=>{if(active())toast(err(e));});}else{form.querySelector('[data-source=link]').click();form.elements.url.value=prefill.url||'';checker.schedule();}}
    form.onsubmit=e=>{if(!active()){e.preventDefault();return;}return publish(e);};
  }
  async function resizeCover(file){const image=await createImageBitmap(file);try{const canvas=document.createElement('canvas');canvas.width=canvas.height=640;const size=Math.min(image.width,image.height);canvas.getContext('2d').drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,640,640);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не удалось обработать обложку')),'image/webp',.85));}finally{image.close();}}
  function storage(ticket){return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{'x-telechat-music-token':ticket.token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).storage.from('music-media');}
  async function publish(e){e.preventDefault();if(publishing)return;const form=e.currentTarget,context=captureV212(),version=sheetVersionV212;
    if(!form.isConnected||form!==$('mh-publish-form')||$('mh-sheet').hidden||form.dataset.publishUncertain==='true')return;
    const publication=++publicationVersionV212,values=new FormData(form),nick=context.owner,file=uploadFile,image=coverFile,isFile=form.dataset.source==='file',uploaded=[];
    let bucket,ticket,localUrl='',publishAttempted=false;
    const currentForm=()=>currentV212(context)&&publication===publicationVersionV212&&version===sheetVersionV212&&form.isConnected&&form===$('mh-publish-form')&&!$('mh-sheet').hidden;
    const check=()=>{assertV212(context);if(!currentForm()){const error=Error('Окно публикации изменилось');error.code='MUSIC_CONTEXT_CHANGED';throw error;}};
    publishing=true;const buttons=[...form.querySelectorAll('button,input,textarea,select')];buttons.forEach(b=>b.disabled=true);const status=form.querySelector('#mh-publish-status');
    try{check();let url='',duration=0,source='link';
      if(isFile){if(!file)throw new Error('Выбери аудиофайл');if(file.size>50*1024*1024)throw new Error('Трек должен быть не больше 50 МБ');status.textContent='Проверяем аудио…';localUrl=URL.createObjectURL(file);uploadObjectUrl=localUrl;duration=await core().inspectAudio(localUrl);check();source='upload';}
      else{status.textContent='Проверяем ссылку…';const verified=await form.linkCheckV217.check();check();url=verified.url;duration=verified.duration;source=verified.source;}
      if(duration>21600)throw new Error('Трек должен быть не длиннее 6 часов');check();
      ticket=await api('upload_ticket',{size:isFile?file.size:0},context);check();bucket=storage(ticket);let coverUrl='';
      if(isFile){status.textContent='Загружаем трек…';const mime=file.type||'audio/mpeg',ext=({'audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav','audio/flac':'flac','audio/webm':'webm','audio/aac':'aac'})[mime]||'audio';const path=ticket.id+'/audio.'+ext;check();const result=await bucket.upload(path,file,{contentType:mime,cacheControl:'31536000',upsert:false});if(result.error)throw result.error;uploaded.push(path);check();url=bucket.getPublicUrl(path).data.publicUrl;}
      if(image){status.textContent='Сохраняем обложку…';check();const blob=await resizeCover(image);check();const path=ticket.id+'/cover.webp';const result=await bucket.upload(path,blob,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(result.error)throw result.error;uploaded.push(path);check();coverUrl=bucket.getPublicUrl(path).data.publicUrl;}
      status.textContent='Публикуем…';check();publishAttempted=true;
      const t=await api('publish',{id:ticket.id,title:String(values.get('title')).trim(),artist:String(values.get('artist')).trim(),description:String(values.get('description')).trim(),genre:values.get('genre'),url,cover_url:coverUrl,source,duration,size:isFile?file.size:0},context);check();
      rememberTracksV212([{...t,likes_count:0}]);state.saved.add(t.id);publishing=false;closeSheet();const closedVersion=sheetVersionV212;state.query='';$('mh-search').value='';assertV212(context);await showProfile(nick);
      if(currentV212(context)&&publication===publicationVersionV212&&closedVersion===sheetVersionV212)toast('Трек опубликован. Теперь его может услышать твой круг.');
    }catch(error){
      // A lost/late publish response can mean the row already committed. Never
      // remove its audio on an unknown outcome; only clean pre-publish staging.
      if(bucket&&uploaded.length&&!publishAttempted){let cleanupTimer;try{await Promise.race([bucket.remove(uploaded),new Promise(resolve=>cleanupTimer=setTimeout(resolve,10000))]);}catch(_){}finally{clearTimeout(cleanupTimer);}}
      if(currentForm()){
        status.textContent=publishAttempted?'Не удалось подтвердить публикацию. Проверь свои треки перед повтором — загруженные файлы не удалены.':err(error);
        if(publishAttempted){form.dataset.publishUncertain='true';const verify=document.createElement('button');verify.type='button';verify.className='mh-subtle';verify.textContent='Проверить мои треки';verify.onclick=()=>{if(!currentForm())return;closeSheet();showProfile(nick);};status.after(verify);}
      }
    }finally{
      if(localUrl)URL.revokeObjectURL(localUrl);if(uploadObjectUrl===localUrl)uploadObjectUrl='';
      if(publication===publicationVersionV212){publishing=false;if(currentV212(context)&&version===sheetVersionV212)buttons.forEach(b=>b.disabled=form.dataset.publishUncertain==='true');}
    }
  }
  async function deleteTrack(id){const t=resolveTrack(id);if(!t)return;sheet('Удалить трек?',`<p class="mh-form-hint">«${esc(t.title)}» ${state.catalog.has(id)?'исчезнет из общей ленты, сохранённой музыки и плейлистов.':'будет удалён с этого устройства.'}</p><button class="mh-danger mh-confirm-delete" data-action="confirm-delete" data-id="${esc(id)}">Удалить трек</button>`);}
  async function confirmDelete(id){const t=resolveTrack(id),context=captureV212(),version=sheetVersionV212,key=context.epoch+':delete:'+id;if(!t||state.busy.has(key))return;state.busy.add(key);
    try{assertV212(context);if(state.catalog.has(id)){
        const ticket=await api('upload_ticket',{id},context);assertV212(context);await api('delete_track',{track_id:id},context);assertV212(context);
        const paths=[t.url,t.cover_url].filter(u=>u?.includes('/object/public/music-media/')).map(u=>decodeURIComponent(new URL(u).pathname.split('/object/public/music-media/')[1]));
        if(paths.length){assertV212(context);const result=await storage(ticket).remove(paths);assertV212(context);if(result.error)toast('Публикация удалена. Очистка файлов будет нужна отдельно.');}
        assertV212(context);forgetTrackV212(id);state.feed=state.feed.filter(x=>x!==id);state.saved.delete(id);state.liked.delete(id);state.playlists.forEach(p=>p.track_ids=p.track_ids.filter(x=>x!==id));
      }else{assertV212(context);await core().removeLocal(id);assertV212(context);state.local=state.local.filter(t=>t.id!==id);for(const listId of Object.keys(localPlaylistMap()))saveLocalPlaylist(listId,localPlaylistIds(listId).filter(x=>x!==id));}
      assertV212(context);if(currentTrack()?.id===id)core().stop();if(version===sheetVersionV212)closeSheet();render();toast('Трек удалён');
    }catch(error){if(currentV212(context))toast(err(error));}finally{state.busy.delete(key);}
  }
  async function openShared(id){if(!/^[a-f\d-]{36}$/i.test(id))return;const ctx=captureV212(),version=sheetVersionV212,opening=openVersionV199,since=++catalogRevisionV212,current=()=>currentV212(ctx)&&version===sheetVersionV212&&opening===openVersionV199&&state.opened;
    try{let t=state.catalog.get(id);if(!t){const result=await boundedV199(sb.from('music_catalog_v117').select('*').eq('id',id).maybeSingle(),10000,ctx);if(result.error)throw result.error;t=result.data;}if(!current())return;if(!t){toast('Этот трек удалён или недоступен');return;}rememberTracksV212([t],since);await profiles([t.author_nick]);if(!current())return;more(id);const b=document.createElement('button');b.className='mh-primary';b.dataset.action='play';b.dataset.id=id;b.innerHTML=icon('play')+' Слушать трек';$('mh-sheet-body').prepend(b);}catch(error){if(current())toast(err(error));}finally{const url=new URL(location.href);if(currentV212(ctx)&&opening===openVersionV199&&url.searchParams.get('music')===id){url.searchParams.delete('music');history.replaceState(history.state,'',url);}}}
  async function onClick(e){const b=e.target.closest('button');if(!b)return;const ctx=captureV212(),version=sheetVersionV212,selectedPlaylist=state.selectedPlaylist,currentSheet=()=>currentV212(ctx)&&version===sheetVersionV212;
    if(b.dataset.view){closeSheet();const hadQuery=!!state.query;state.query='';$('mh-search').value='';state.view=b.dataset.view;setNow(false);if(state.view==='profile')return showProfile(state.owner);render();$('mh-scroll').scrollTop=0;if(state.view==='home'&&(hadQuery||!state.feed.length))await loadFeed(true);return;}
    if(b.dataset.filter){state.filter=b.dataset.filter;return loadFeed(true,true);}
    if(b.dataset.musicGenre!==undefined){state.genre=b.dataset.musicGenre;state.waveActive=false;render();return;}
    if(b.dataset.author){setNow(false);return showProfile(b.dataset.author);}
    if(b.dataset.playlist){state.view='playlist';state.selectedPlaylist=b.dataset.playlist;return render();}
    const a=b.dataset.action,id=b.dataset.id,locksButton=['playlist-add','playlist-remove','confirm-delete-playlist','profile-track'].includes(a);if(locksButton){if(b.disabled)return;b.disabled=true;}
    try{
      if(a==='refresh-music'){await Promise.allSettled([loadFeed(true,true),loadLibrary(true)]);if(currentV212(ctx))render();return;}
      if(a==='together')window.telechatTogetherV147?.open();
      if(a==='close')close();if(a==='sheet-close')closeSheet();if(a==='publish')composer();if(a==='publish-local')composer(resolveTrack(id));if(a==='discover'){state.view='home';render();}
      if(a==='play')await play(id);if(a==='play-all'){const t=shownTracks()[0];if(t)await play(t.id);else toast('Добавь первый трек — и включай свою волну');}
      if(a==='play-wave')await playWave();if(a==='shelf-back'||a==='shelf-next'){const shelf=[...root.querySelectorAll('[data-shelf-v171]')].find(n=>n.dataset.shelfV171===b.dataset.shelf);shelf?.scrollBy({left:(a==='shelf-next'?1:-1)*shelf.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
      if(a==='toggle'){if(currentTrack())await core().toggle();else if(shownTracks()[0])await play(shownTracks()[0].id);}
      if(a==='retry')await core().retry();
      if(a==='next')core().step(1);if(a==='previous')core().step(-1);if(a==='repeat')core().setRepeat(!core().getState().repeat);if(a==='shuffle')core().setShuffle(!core().getState().shuffle);
      if(a==='now')setNow(!root.classList.contains('mh-show-now'),true);if(a==='load-more')await loadFeed();if(a==='import'){importPlaylist='';$('mh-local-files').click();}
      if(a==='playlist-files')devicePlaylistPicker();if(a==='playlist-import'){importPlaylist=state.selectedPlaylist;closeSheet();$('mh-local-files').click();}
      if(a==='like'||a==='save')await toggleCollection(id,a);if(a==='current-like'&&currentTrack())await toggleCollection(currentTrack().id,'like');
      if(a==='menu-save'){await toggleCollection(id,'save');if(currentSheet())more(id);}
      if(a==='more')more(id);if(a==='share')await shareTrack(id);if(a==='to-playlist')playlistPicker(id);if(a==='create-playlist')createPlaylist(id);
      if(a==='playlist-add'){await addToPlaylist(b.dataset.list,id);if(!currentV212(ctx))return;if(currentSheet())closeSheet();render();toast('Добавлено в плейлист');}
      if(a==='playlist-remove'){if(state.catalog.has(id)){await api('playlist_remove',{playlist_id:selectedPlaylist,track_id:id},ctx);assertV212(ctx);await loadLibrary(true);assertV212(ctx);}else saveLocalPlaylist(selectedPlaylist,localPlaylistIds(selectedPlaylist).filter(x=>x!==id));if(currentSheet())closeSheet();render();}
      if(a==='delete-playlist'){const p=state.playlists.find(p=>p.id===state.selectedPlaylist);sheet('Удалить плейлист?',`<p class="mh-form-hint">Подборка «${esc(p?.title)}» будет удалена. Сами треки останутся.</p><button class="mh-danger mh-confirm-delete" data-action="confirm-delete-playlist">Удалить плейлист</button>`);}
      if(a==='confirm-delete-playlist'){await api('delete_playlist',{playlist_id:selectedPlaylist},ctx);assertV212(ctx);saveLocalPlaylist(selectedPlaylist,[]);await loadLibrary(true);assertV212(ctx);if(currentSheet()){closeSheet();if(state.selectedPlaylist===selectedPlaylist)state.view='playlists';}render();}
      if(a==='profile-track'){const t=state.catalog.get(id);await window.telechatProfileMusicV97.save(t);if(!currentV212(ctx))return;if(currentSheet())closeSheet();toast('Трек добавлен в профиль');}
      if(a==='delete-track')await deleteTrack(id);if(a==='confirm-delete')await confirmDelete(id);
    }catch(error){if(currentV212(ctx))toast(err(error));}finally{if(locksButton&&currentV212(ctx)&&b.isConnected)b.disabled=false;}
  }
  window.telechatMusicHubV117=Object.freeze({open,close,getPlayerHost(){ensure();return $('mh-cloud-host');}});
  window.addEventListener('telechat-account-ready-v175',()=>{resetOwnerV212('');state.opened=false;if(root){root.querySelectorAll('.mh-profile-avatar video').forEach(v=>v.pause());setNow(false);root.hidden=true;}document.body.classList.remove('music-hub-open-v117');document.querySelector('.music-entry-v96')?.setAttribute('aria-expanded','false');});
  window.addEventListener('telechat-user-updated-v123',event=>{if(!state.owner||state.owner!==user()?.nick)return;const nick=String(event.detail?.nick||'');if(!nick)return;let latest;try{latest=nick===state.owner?user():userCache[nick];}catch(_){}const old=state.profiles.get(nick);if(old){const fields={};for(const field of ['nick','name','av','status','banner'])if(latest&&Object.hasOwn(latest,field))fields[field]=latest[field];state.profiles.set(nick,{...old,...fields,_atV212:0,_fullAtV212:0});}if(!state.opened)return;if(nick===state.owner)paintSelfV212();if(nick===state.owner||state.view==='profile'&&state.profile===nick||shownTracks().some(t=>t.author_nick===nick&&!t.artist))render();});
  document.querySelector('.music-entry-v96')?.setAttribute('aria-controls','music-hub-v117');
  const originalLogin=window.doLogin;if(typeof originalLogin==='function')window.doLogin=async function(...args){const result=await originalLogin.apply(this,args);if(new URL(location.href).searchParams.has('music')&&user()?.nick)open();return result;};
  window.addEventListener('telechat-music-library-v117',async()=>{state.localAt=0;const ctx=captureV212();if(!state.opened||importing)return;try{const tracks=await boundedV199(core().getTracks(),8000,ctx);if(!currentV212(ctx))return;state.local=tracks;state.localAt=Date.now();render();}catch(error){if(currentV212(ctx))toast(err(error));}});
})();
