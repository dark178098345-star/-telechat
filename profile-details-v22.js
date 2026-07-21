/* TELECHAT PROFILE DETAILS V22 — one clean expandable section */
(()=>{
  let detailsOpenV22=false;
  function ensureDetailsV22(){
    const body=document.querySelector('.user-profile-body'),about=body?.querySelector('.user-profile-section');if(!body||!about)return;
    if(!document.getElementById('profile-details-toggle')){
      const toggle=document.createElement('button');toggle.id='profile-details-toggle';toggle.type='button';toggle.className='profile-details-toggle';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span class="profile-details-icon">✦</span><span class="profile-details-copy"><span class="profile-details-title">Подробнее</span><span class="profile-details-subtitle">Луны, подарки, подписки и управление</span></span><span class="profile-details-chevron">⌄</span>';
      const shell=document.createElement('div');shell.id='profile-details-shell';shell.className='profile-details-shell';shell.innerHTML='<div class="profile-details-clip"><div class="profile-details-inner"><section class="profile-details-group" id="profile-details-moons"><div class="profile-details-label">Луны и подарки</div></section><section class="profile-details-group" id="profile-details-social"><div class="profile-details-label">Социальное</div></section><div id="profile-details-moderation"></div></div></div>';
      about.insertAdjacentElement('beforebegin',toggle);toggle.insertAdjacentElement('afterend',shell);toggle.onclick=()=>setDetailsV22(!detailsOpenV22);
    }
    organizeDetailsV22();
  }
  function organizeDetailsV22(){
    const moonGroup=document.getElementById('profile-details-moons'),socialGroup=document.getElementById('profile-details-social'),moderationGroup=document.getElementById('profile-details-moderation');if(!moonGroup||!socialGroup||!moderationGroup)return;
    const moonSummary=document.getElementById('moon-profile-summary'),moonActions=document.getElementById('moon-profile-actions'),followStats=document.getElementById('follow-stats'),moderation=document.getElementById('moderation-profile-btn');
    if(moonSummary&&moonSummary.parentElement!==moonGroup)moonGroup.appendChild(moonSummary);if(moonActions&&moonActions.parentElement!==moonGroup)moonGroup.appendChild(moonActions);if(followStats&&followStats.parentElement!==socialGroup)socialGroup.appendChild(followStats);if(moderation&&moderation.parentElement!==moderationGroup)moderationGroup.appendChild(moderation);
  }
  function setDetailsV22(open){detailsOpenV22=!!open;const toggle=document.getElementById('profile-details-toggle'),shell=document.getElementById('profile-details-shell');if(!toggle||!shell)return;toggle.setAttribute('aria-expanded',String(detailsOpenV22));shell.classList.toggle('open',detailsOpenV22);toggle.querySelector('.profile-details-title').textContent=detailsOpenV22?'Скрыть подробности':'Подробнее';}
  const openBeforeV22=openUserProfile;openUserProfile=async function(nick,...args){const profileTask=openBeforeV22(nick,...args);ensureDetailsV22();organizeDetailsV22();setDetailsV22(false);requestAnimationFrame(organizeDetailsV22);const value=await profileTask;organizeDetailsV22();return value;};
  const closeBeforeV22=closeUserProfile;closeUserProfile=function(){setDetailsV22(false);return closeBeforeV22();};
  window.toggleProfileDetailsV22=()=>setDetailsV22(!detailsOpenV22);ensureDetailsV22();setDetailsV22(false);
})();
