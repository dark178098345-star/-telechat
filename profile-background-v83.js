/* TELECHAT PROFILE BACKGROUND V83 — reuse the saved photo banner, no schema change */
(()=>{
  const PHOTO_PREFIX='photo:';

  function resetCardV83(card){
    if(!card)return;
    card.classList.remove('profile-photo-background-v83');
    card.style.removeProperty('--profile-card-photo-v83');
  }

  function paintCardV83(value){
    const card=document.querySelector('#user-profile-modal .user-profile-card');
    const raw=String(value||'');
    if(!raw.startsWith(PHOTO_PREFIX)){
      resetCardV83(card);
      return;
    }
    const photo=raw.slice(PHOTO_PREFIX.length).trim();
    if(!photo||(!photo.startsWith('data:image/')&&!/^https:\/\//i.test(photo))){
      resetCardV83(card);
      return;
    }
    card.style.setProperty('--profile-card-photo-v83','url('+JSON.stringify(photo)+')');
    card.classList.add('profile-photo-background-v83');
  }

  const applyBeforeV83=window.applyProfileBanner;
  if(typeof applyBeforeV83==='function'){
    window.applyProfileBanner=function(element,value){
      const result=applyBeforeV83.apply(this,arguments);
      if(element&&element.id==='view-profile-cover')paintCardV83(value);
      return result;
    };
  }

  const closeBeforeV83=window.closeUserProfile;
  if(typeof closeBeforeV83==='function'){
    window.closeUserProfile=function(){
      const result=closeBeforeV83.apply(this,arguments);
      resetCardV83(document.querySelector('#user-profile-modal .user-profile-card'));
      return result;
    };
  }

  window.telechatProfileBackgroundV83={apply:paintCardV83,reset:resetCardV83};
})();
