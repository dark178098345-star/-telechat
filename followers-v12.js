/* TELECHAT FOLLOWERS V12 */
(()=>{
  const css=document.createElement('style');
  css.textContent=`
  .follow-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0 2px}
  .follow-stat{padding:10px 6px;border:1px solid rgba(167,139,250,.13);border-radius:13px;background:rgba(124,110,247,.07);text-align:center}
  .follow-count{display:block;color:var(--text);font-size:18px;font-weight:1000;line-height:1}
  .follow-label{display:block;margin-top:4px;color:var(--text3);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
  .follow-count.loading{color:transparent;background:linear-gradient(90deg,transparent,rgba(167,139,250,.3),transparent);background-size:200% 100%;animation:follow-shimmer 1s linear infinite}
  .follow-btn{min-height:44px;background:linear-gradient(135deg,var(--accent),#6353df)!important;color:#fff!important;box-shadow:0 8px 20px rgba(91,77,224,.22)}
  .follow-btn.following{border:1px solid rgba(167,139,250,.2)!important;background:rgba(124,110,247,.08)!important;color:var(--text2)!important;box-shadow:none}
  .follow-btn:disabled{opacity:.55}@keyframes follow-shimmer{to{background-position:-200% 0}}`;
  document.head.appendChild(css);

  const state={target:'',following:false,followers:0,followingCount:0,request:0,ready:false};
  function ensureUi(){
    const seen=document.getElementById('view-profile-seen'),actions=document.querySelector('.user-profile-actions');
    if(!seen||!actions)return;
    if(!document.getElementById('follow-stats')){
      const stats=document.createElement('div');stats.id='follow-stats';stats.className='follow-stats';
      stats.innerHTML='<div class="follow-stat"><span class="follow-count" id="followers-count">0</span><span class="follow-label">подписчики</span></div><div class="follow-stat"><span class="follow-count" id="following-count">0</span><span class="follow-label">подписки</span></div>';
      seen.insertAdjacentElement('afterend',stats);
    }
    if(!document.getElementById('follow-btn')){
      const button=document.createElement('button');button.id='follow-btn';button.type='button';button.className='modal-btn follow-btn';button.textContent='Подписаться';button.onclick=toggleFollowV12;
      actions.insertBefore(button,document.getElementById('view-profile-message-btn'));
    }
  }
  function loading(value){
    ['followers-count','following-count'].forEach(id=>document.getElementById(id)?.classList.toggle('loading',value));
    const button=document.getElementById('follow-btn');if(button)button.disabled=value;
  }
  function render(){
    ensureUi();
    document.getElementById('followers-count').textContent=String(Math.max(0,state.followers));
    document.getElementById('following-count').textContent=String(Math.max(0,state.followingCount));
    const button=document.getElementById('follow-btn'),own=!me||state.target===me.nick;
    button.style.display=own?'none':'';button.classList.toggle('following',state.following);button.textContent=state.following?'✓ Вы подписаны':'Подписаться';
  }
  async function loadFollowV12(nick){
    ensureUi();state.target=String(nick||'').toLowerCase();state.ready=false;const request=++state.request;loading(true);render();
    try{
      const followers=sb.from('user_follows').select('follower_nick',{count:'exact',head:true}).eq('following_nick',state.target);
      const following=sb.from('user_follows').select('following_nick',{count:'exact',head:true}).eq('follower_nick',state.target);
      const mine=me&&me.nick!==state.target?sb.from('user_follows').select('follower_nick').eq('follower_nick',me.nick).eq('following_nick',state.target).maybeSingle():Promise.resolve({data:null,error:null});
      const [a,b,c]=await Promise.all([followers,following,mine]);if(request!==state.request)return;
      if(a.error||b.error||c.error)throw a.error||b.error||c.error;
      state.followers=a.count||0;state.followingCount=b.count||0;state.following=!!c.data;state.ready=true;render();
    }catch(e){
      if(request!==state.request)return;state.followers=0;state.followingCount=0;state.following=false;render();
      const button=document.getElementById('follow-btn');if(button&&state.target!==me?.nick){button.textContent='Подписки скоро';button.disabled=true;}
    }finally{if(request===state.request){loading(false);if(!state.ready){const b=document.getElementById('follow-btn');if(b&&state.target!==me?.nick)b.disabled=true;}}}
  }
  async function toggleFollowV12(){
    if(!me||!state.target||state.target===me.nick||!state.ready)return;
    const was=state.following;state.following=!was;state.followers+=was?-1:1;render();document.getElementById('follow-btn').disabled=true;
    const result=was?await sb.from('user_follows').delete().eq('follower_nick',me.nick).eq('following_nick',state.target):await sb.from('user_follows').insert({follower_nick:me.nick,following_nick:state.target,created_at:Date.now()});
    if(result.error){state.following=was;state.followers+=was?1:-1;render();showToast('Не удалось изменить подписку');}else showToast(state.following?'Вы подписались ✅':'Подписка отменена');
    document.getElementById('follow-btn').disabled=false;
  }
  window.loadFollowV12=loadFollowV12;window.toggleFollowV12=toggleFollowV12;ensureUi();
  const openBefore=openUserProfile;openUserProfile=async function(nick,...args){await openBefore(nick,...args);await loadFollowV12(nick);};
  const closeBefore=closeUserProfile;closeUserProfile=function(){state.request++;state.target='';closeBefore();};
})();
