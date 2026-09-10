/* TELECHAT PROFILE FOLLOW COMPACT V102 */
(()=>{
  'use strict';
  let scheduled=false;
  function ensure(){
    const body=document.querySelector('.user-profile-body');
    const stats=document.getElementById('follow-stats');
    if(!body||!stats)return;
    let wrap=document.getElementById('profile-follow-compact-v102');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='profile-follow-compact-v102';
      wrap.setAttribute('aria-label','Подписки профиля');
    }
    if(stats.parentElement!==wrap)wrap.appendChild(stats);
    const button=document.getElementById('follow-btn');
    if(button&&button.parentElement!==wrap)wrap.appendChild(button);
    const anchor=body.querySelector('.user-profile-nick')||body.querySelector('.user-profile-name')||body.querySelector('.user-profile-avatar');
    if(anchor&&wrap.parentElement!==body)anchor.insertAdjacentElement('afterend',wrap);
    else if(anchor&&wrap.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',wrap);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensure();});
  }
  if(typeof openUserProfile==='function'){
    const before=openUserProfile;
    openUserProfile=async function(nick,...args){
      const value=await before.apply(this,[nick,...args]);
      ensure();schedule();
      return value;
    };
  }
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  ensure();
  window.telechatFollowCompactV102={ensure};
})();
