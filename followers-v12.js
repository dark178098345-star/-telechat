/* TELECHAT FOLLOWERS LISTS V14 */
(()=>{
  const css=document.createElement('style');
  css.textContent=`
  .follow-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0 2px}
  .follow-stat{padding:10px 6px;border:1px solid rgba(167,139,250,.13);border-radius:13px;background:rgba(124,110,247,.07);text-align:center;cursor:pointer;user-select:none;transition:.2s ease}
  .follow-stat:hover{border-color:rgba(167,139,250,.3);background:rgba(124,110,247,.13);transform:translateY(-1px)}
  .follow-count{display:block;color:var(--text);font-size:18px;font-weight:1000;line-height:1}
  .follow-label{display:block;margin-top:4px;color:var(--text3);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
  .follow-count.loading{color:transparent;background:linear-gradient(90deg,transparent,rgba(167,139,250,.3),transparent);background-size:200% 100%;animation:follow-shimmer 1s linear infinite}
  .follow-btn{min-height:44px;background:linear-gradient(135deg,var(--accent),#6353df)!important;color:#fff!important;box-shadow:0 8px 20px rgba(91,77,224,.22)}
  .follow-btn.following{border:1px solid rgba(167,139,250,.2)!important;background:rgba(124,110,247,.08)!important;color:var(--text2)!important;box-shadow:none}
  .follow-btn:disabled{opacity:.55}
  .follow-list-overlay{position:fixed;inset:0;z-index:10080;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,4,13,.76);backdrop-filter:blur(12px)}
  .follow-list-overlay.open{display:flex;animation:follow-list-fade .18s ease}
  .follow-list-card{width:min(390px,100%);max-height:min(620px,86vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(167,139,250,.22);border-radius:22px;background:linear-gradient(160deg,rgba(26,25,48,.98),rgba(13,14,29,.99));box-shadow:0 28px 80px rgba(0,0,0,.55)}
  .follow-list-head{display:flex;align-items:center;gap:12px;padding:17px 18px;border-bottom:1px solid rgba(167,139,250,.11)}
  .follow-list-head-text{min-width:0;flex:1}.follow-list-title{color:var(--text);font-size:16px;font-weight:900}.follow-list-subtitle{margin-top:2px;color:var(--text3);font-size:11px}
  .follow-list-close{width:34px;height:34px;border:1px solid rgba(167,139,250,.15);border-radius:11px;background:rgba(124,110,247,.08);color:var(--text2);font-size:20px;cursor:pointer}
  .follow-list-body{min-height:180px;overflow:auto;padding:8px}
  .follow-list-user{width:100%;display:flex;align-items:center;gap:11px;padding:9px;border:0;border-radius:14px;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:.18s ease}
  .follow-list-user:hover{background:rgba(124,110,247,.1)}.follow-list-user .av{flex:0 0 auto;width:42px;height:42px}
  .follow-list-user-text{min-width:0;flex:1}.follow-list-user-name{overflow:hidden;color:var(--text);font-size:13px;font-weight:850;text-overflow:ellipsis;white-space:nowrap}.follow-list-user-nick{margin-top:3px;color:var(--text3);font-size:10px}
  .follow-list-arrow{color:#8175bd;font-size:18px}.follow-list-message{display:flex;min-height:165px;align-items:center;justify-content:center;padding:25px;color:var(--text3);font-size:12px;text-align:center}
  .follow-list-spinner{width:28px;height:28px;margin:0 auto 10px;border:3px solid rgba(167,139,250,.14);border-top-color:var(--accent);border-radius:50%;animation:follow-spin .7s linear infinite}
  @keyframes follow-shimmer{to{background-position:-200% 0}}@keyframes follow-spin{to{transform:rotate(360deg)}}@keyframes follow-list-fade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}`;
  document.head.appendChild(css);

  const state={target:'',following:false,followers:0,followingCount:0,request:0,ready:false},followCacheV25=new Map(),FOLLOW_TTL_V25=30000;
  const account=()=>{try{return String(me?.nick||'').toLowerCase();}catch(_){return '';}};
  const cacheKey=(actor,target)=>JSON.stringify([actor,target]);
  let owner=account(),generation=0,followController=null;
  function syncOwner(force=false){const next=account();if(force||owner!==next){owner=next;generation++;state.request++;state.target='';state.ready=false;followCacheV25.clear();followController?.abort();followController=null;closeFollowListV14();}return owner;}
  async function bounded(tasks,controller=new AbortController()){
    let timer;const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Подписки не ответили вовремя'));controller.abort();},8000);controller.signal.addEventListener('abort',()=>reject(Error('Запрос подписок отменён')),{once:true});});
    try{return await Promise.race([Promise.all(tasks.map(q=>q?.abortSignal?q.abortSignal(controller.signal):q)),expired]);}finally{clearTimeout(timer);}
  }
  function remember(actor,target){followCacheV25.set(cacheKey(actor,target),{time:Date.now(),data:{followers:state.followers,followingCount:state.followingCount,following:state.following}});while(followCacheV25.size>128)followCacheV25.delete(followCacheV25.keys().next().value);}
  function ensureUi(){
    const seen=document.getElementById('view-profile-seen'),actions=document.querySelector('.user-profile-actions');
    if(!seen||!actions)return;
    if(!document.getElementById('follow-stats')){
      const stats=document.createElement('div');stats.id='follow-stats';stats.className='follow-stats';
      stats.innerHTML='<div class="follow-stat" data-follow-list="followers" role="button" tabindex="0"><span class="follow-count" id="followers-count">0</span><span class="follow-label">подписчики</span></div><div class="follow-stat" data-follow-list="following" role="button" tabindex="0"><span class="follow-count" id="following-count">0</span><span class="follow-label">подписки</span></div>';
      seen.insertAdjacentElement('afterend',stats);
    }
    if(!document.getElementById('follow-btn')){
      const button=document.createElement('button');button.id='follow-btn';button.type='button';button.className='modal-btn follow-btn';button.textContent='Подписаться';button.onclick=toggleFollowV12;
      actions.insertBefore(button,document.getElementById('view-profile-message-btn'));
    }    document.querySelectorAll('[data-follow-list]').forEach(item=>{
      item.onclick=()=>openFollowListV14(item.dataset.followList);
      item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openFollowListV14(item.dataset.followList);}};
    });
    ensureFollowListUiV14();

  }
  function loading(value){
    ['followers-count','following-count'].forEach(id=>document.getElementById(id)?.classList.toggle('loading',value));
    const button=document.getElementById('follow-btn');if(button)button.disabled=value;
  }
  function render(){
    ensureUi();
    document.getElementById('followers-count').textContent=state.ready?String(Math.max(0,state.followers)):'—';
    document.getElementById('following-count').textContent=state.ready?String(Math.max(0,state.followingCount)):'—';
    const button=document.getElementById('follow-btn'),own=!me||!state.target||state.target===me.nick;
    button.style.display=own?'none':'';button.classList.toggle('following',state.following);button.textContent=state.following?'✓ Вы подписаны':'Подписаться';button.title='';
  }
  async function loadFollowV12(nick){
    const actor=syncOwner(),epoch=generation,target=String(nick||'').toLowerCase();
    ensureUi();followController?.abort();followController=null;state.target=target;const request=++state.request,cached=followCacheV25.get(cacheKey(actor,target));
    const current=()=>request===state.request&&state.target===target&&actor===account()&&epoch===generation;
    if(cached&&Date.now()-cached.time<FOLLOW_TTL_V25){Object.assign(state,cached.data,{ready:true});render();loading(false);return;}
    state.ready=false;state.following=false;loading(true);render();const controller=new AbortController();followController=controller;
    try{
      const followers=sb.from('user_follows').select('follower_nick',{count:'exact',head:true}).eq('following_nick',target);
      const following=sb.from('user_follows').select('following_nick',{count:'exact',head:true}).eq('follower_nick',target);
      const mine=actor&&actor!==target?sb.from('user_follows').select('follower_nick').eq('follower_nick',actor).eq('following_nick',target).maybeSingle():Promise.resolve({data:null,error:null});
      const [a,b,c]=await bounded([followers,following,mine],controller);if(!current())return;
      if(a.error||b.error||c.error)throw a.error||b.error||c.error;
      state.followers=a.count||0;state.followingCount=b.count||0;state.following=!!c.data;state.ready=true;remember(actor,target);render();
    }catch(e){
      if(!current())return;state.followers=0;state.followingCount=0;state.following=false;render();
      const button=document.getElementById('follow-btn');if(button&&state.target!==me?.nick){button.textContent='Не удалось загрузить';button.title='Открой профиль ещё раз, чтобы повторить проверку подписок';button.disabled=true;}
    }finally{if(followController===controller)followController=null;if(current()){loading(false);if(!state.ready){const b=document.getElementById('follow-btn');if(b&&state.target!==me?.nick)b.disabled=true;}}}
  }
  async function toggleFollowV12(){
    if(!me||!state.target||state.target===me.nick||!state.ready)return;
    const actor=account(),target=state.target,request=state.request,epoch=generation,was=state.following,count=state.followers;
    const current=()=>actor===account()&&target===state.target&&request===state.request&&epoch===generation;
    state.following=!was;state.followers+=was?-1:1;render();document.getElementById('follow-btn').disabled=true;
    try{
      const query=was?sb.from('user_follows').delete().eq('follower_nick',actor).eq('following_nick',target):sb.from('user_follows').insert({follower_nick:actor,following_nick:target,created_at:Date.now()});
      const [result]=await bounded([query]);followCacheV25.delete(cacheKey(actor,target));followCacheV25.delete(cacheKey(actor,actor));if(!current())return;
      if(result.error)throw result.error;remember(actor,target);showToast(state.following?'Вы подписались ✅':'Подписка отменена');
    }catch(_){followCacheV25.delete(cacheKey(actor,target));if(!current())return;state.following=was;state.followers=count;render();showToast('Не удалось подтвердить подписку. Открой профиль заново.');}
    finally{if(current())document.getElementById('follow-btn').disabled=false;}
  }
  let listRequestV14=0;
  function ensureFollowListUiV14(){
    if(document.getElementById('follow-list-modal'))return;
    const modal=document.createElement('div');modal.id='follow-list-modal';modal.className='follow-list-overlay';
    modal.innerHTML='<section class="follow-list-card" role="dialog" aria-modal="true"><header class="follow-list-head"><div class="follow-list-head-text"><div class="follow-list-title" id="follow-list-title">Подписки</div><div class="follow-list-subtitle" id="follow-list-subtitle"></div></div><button class="follow-list-close" type="button" aria-label="Закрыть">×</button></header><div class="follow-list-body" id="follow-list-body"></div></section>';
    modal.onclick=event=>{if(event.target===modal)closeFollowListV14();};
    modal.querySelector('.follow-list-close').onclick=closeFollowListV14;
    document.body.appendChild(modal);
  }
  function closeFollowListV14(){
    listRequestV14++;
    document.getElementById('follow-list-modal')?.classList.remove('open');
  }
  async function openFollowListV14(kind){
    if(!state.target)return;
    ensureFollowListUiV14();
    const actor=account(),epoch=generation,target=state.target,request=++listRequestV14,isFollowing=kind==='following';
    const current=()=>request===listRequestV14&&actor===account()&&epoch===generation;
    const modal=document.getElementById('follow-list-modal'),body=document.getElementById('follow-list-body');
    document.getElementById('follow-list-title').textContent=isFollowing?'Подписки':'Подписчики';
    document.getElementById('follow-list-subtitle').textContent='@'+target;
    body.innerHTML='<div class="follow-list-message"><div><div class="follow-list-spinner"></div>Загружаем список…</div></div>';
    modal.classList.add('open');
    try{
      const column=isFollowing?'following_nick':'follower_nick',filter=isFollowing?'follower_nick':'following_nick';
      const [result]=await bounded([sb.from('user_follows').select(column+',created_at').eq(filter,target).order('created_at',{ascending:false}).limit(200)]);
      if(result.error)throw result.error;
      if(!current())return;
      const nicks=[...new Set((result.data||[]).map(row=>row[column]).filter(Boolean))];
      if(!nicks.length){
        body.innerHTML='<div class="follow-list-message">'+(isFollowing?'Этот пользователь пока ни на кого не подписан':'У этого пользователя пока нет подписчиков')+'</div>';
        return;
      }
      const [usersResult]=await bounded([sb.from('users').select('nick,name,av,status,last_seen,avatar_video').in('nick',nicks)]);
      if(usersResult.error)throw usersResult.error;
      if(!current())return;
      const usersByNick=new Map((usersResult.data||[]).map(user=>{
        if(window.telechatUserCacheV123)window.telechatUserCacheV123.merge(user);else userCache[user.nick]={...(userCache[user.nick]||{}),...user};
        return[user.nick,userCache[user.nick]];
      }));
      body.innerHTML='';
      nicks.forEach(nick=>{
        const user=usersByNick.get(nick)||{nick,name:nick,av:0,status:''},row=document.createElement('button');
        row.type='button';row.className='follow-list-user';
        const badge=typeof verifiedBadgeHtml==='function'?verifiedBadgeHtml(user.nick):'';
        row.innerHTML='<div class="av">'+avatarMarkup(user)+'</div><div class="follow-list-user-text"><div class="follow-list-user-name">'+escHtml(user.name||user.nick)+badge+'</div><div class="follow-list-user-nick">@'+escHtml(user.nick)+'</div></div><span class="follow-list-arrow">›</span>';
        row.onclick=()=>{closeFollowListV14();openUserProfile(user.nick);};
        body.appendChild(row);
      });
    }catch(error){
      if(current())body.innerHTML='<div class="follow-list-message">Не удалось загрузить список.<br>Попробуй ещё раз.</div>';
    }
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeFollowListV14();});
  window.openFollowListV14=openFollowListV14;
  window.closeFollowListV14=closeFollowListV14;
  window.loadFollowV12=loadFollowV12;window.toggleFollowV12=toggleFollowV12;ensureUi();
  window.addEventListener('telechat-account-ready-v175',()=>syncOwner(true));
  const openBefore=openUserProfile;openUserProfile=async function(nick,...args){const profileTask=openBefore(nick,...args),followTask=loadFollowV12(nick);const [value]=await Promise.all([profileTask,followTask]);return value;};
  const closeBefore=closeUserProfile;closeUserProfile=function(){state.request++;state.target='';followController?.abort();followController=null;closeFollowListV14();closeBefore();};
})();
