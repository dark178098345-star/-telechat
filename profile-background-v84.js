/* TELECHAT PROFILE BACKGROUND V84 — separately persisted full-card photo */
(()=>{
  const PREFIX='__telechat_appearance_v84__:';
  const IMAGE_RE=/^data:image\/(jpeg|png|webp);base64,/i;
  let selectedBackground='';

  function cleanBackground(value){
    const raw=typeof value==='string'?value.trim():'';
    return IMAGE_RE.test(raw)?raw:'';
  }
  function decode(value){
    const raw=typeof value==='string'?value:'';
    if(!raw.startsWith(PREFIX))return{banner:raw||'preset:cosmos',background:''};
    try{
      const data=JSON.parse(raw.slice(PREFIX.length));
      return{
        banner:typeof data.banner==='string'&&data.banner?data.banner:'preset:cosmos',
        background:cleanBackground(data.background)
      };
    }catch(error){return{banner:'preset:cosmos',background:''};}
  }
  function encode(banner,background){
    const safeBanner=typeof banner==='string'&&banner?banner:'preset:cosmos';
    const safeBackground=cleanBackground(background);
    if(!safeBackground)return safeBanner;
    return PREFIX+JSON.stringify({banner:safeBanner,background:safeBackground});
  }
  function resetCard(card){
    if(!card)return;
    card.classList.remove('profile-photo-background-v84');
    card.style.removeProperty('--profile-card-photo-v84');
  }
  function paintCard(background){
    const card=document.querySelector('#user-profile-modal .user-profile-card');
    const photo=cleanBackground(background);
    if(!photo){resetCard(card);return;}
    card.style.setProperty('--profile-card-photo-v84','url('+JSON.stringify(photo)+')');
    card.classList.add('profile-photo-background-v84');
  }
  function renderEditor(){
    const preview=document.getElementById('profile-background-preview-v84');
    const label=document.getElementById('profile-background-preview-label-v84');
    const remove=document.getElementById('profile-background-remove-v84');
    if(!preview)return;
    if(selectedBackground){
      preview.style.backgroundImage='linear-gradient(180deg,rgba(7,8,22,.08),rgba(7,9,23,.62)),url('+JSON.stringify(selectedBackground)+')';
      if(label)label.textContent='Твой фон карточки';
      if(remove)remove.disabled=false;
    }else{
      preview.style.backgroundImage='';
      if(label)label.textContent='Стандартный фон';
      if(remove)remove.disabled=true;
    }
  }
  function cropImage(file){
    return new Promise((resolve,reject)=>{
      const objectUrl=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{
        try{
          const canvas=document.createElement('canvas');
          canvas.width=480;canvas.height=720;
          const targetRatio=canvas.width/canvas.height;
          const sourceRatio=image.naturalWidth/image.naturalHeight;
          let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
          if(sourceRatio>targetRatio){sw=image.naturalHeight*targetRatio;sx=(image.naturalWidth-sw)/2;}
          else{sh=image.naturalWidth/targetRatio;sy=(image.naturalHeight-sh)/2;}
          const context=canvas.getContext('2d');
          context.fillStyle='#0b0e1d';context.fillRect(0,0,canvas.width,canvas.height);
          context.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',.66));
        }catch(error){reject(error);}
        URL.revokeObjectURL(objectUrl);
      };
      image.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error('image'))};
      image.src=objectUrl;
    });
  }

  window.handleProfileBackgroundV84=async function(input){
    const file=input&&input.files&&input.files[0];
    if(input)input.value='';
    if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){showToast('Выбери JPG, PNG или WebP');return;}
    if(file.size>12*1024*1024){showToast('Фото слишком большое — максимум 12 МБ');return;}
    try{
      selectedBackground=await cropImage(file);
      renderEditor();
      showToast('Фон карточки выбран — нажми «Сохранить»');
    }catch(error){showToast('Не удалось обработать фон');}
  };
  window.removeProfileBackgroundV84=function(){
    selectedBackground='';
    renderEditor();
    showToast('Фон будет удалён после сохранения');
  };

  const applyBefore=window.applyProfileBanner;
  if(typeof applyBefore==='function'){
    window.applyProfileBanner=function(element,value){
      const appearance=decode(value);
      const result=applyBefore.call(this,element,appearance.banner);
      if(element&&element.id==='view-profile-cover')paintCard(appearance.background);
      return result;
    };
  }

  const buildBefore=window.buildProfPanel;
  if(typeof buildBefore==='function'){
    window.buildProfPanel=function(){
      const result=buildBefore.apply(this,arguments);
      const currentUser=typeof me!=='undefined'&&me?me:(window.me||null);
      const appearance=decode(currentUser&&currentUser.banner);
      selectedBackground=appearance.background;
      if(typeof window.selectedProfileBanner!=='undefined')window.selectedProfileBanner=normalizeProfileBanner(appearance.banner);
      else selectedProfileBanner=normalizeProfileBanner(appearance.banner);
      if(typeof renderProfileBannerEditor==='function')renderProfileBannerEditor();
      renderEditor();
      return result;
    };
  }

  const closeBefore=window.closeUserProfile;
  if(typeof closeBefore==='function'){
    window.closeUserProfile=function(){
      const result=closeBefore.apply(this,arguments);
      resetCard(document.querySelector('#user-profile-modal .user-profile-card'));
      return result;
    };
  }

  const openBefore=window.openUserProfile;
  if(typeof openBefore==='function'){
    window.openUserProfile=async function(nick){
      const args=Array.prototype.slice.call(arguments,1);
      const result=await openBefore.apply(this,[nick].concat(args));
      const key=String(nick||'').toLowerCase();
      const currentUser=typeof me!=='undefined'&&me?me:(window.me||null);
      const isOwn=currentUser&&String(currentUser.nick||'').toLowerCase()===key;
      const cached=(typeof userCache!=='undefined'&&(userCache[key]||userCache[nick]))||null;
      const user=isOwn?currentUser:cached;
      paintCard(decode(user&&user.banner).background);
      return result;
    };
  }

  window.telechatProfileAppearanceV84={
    decode,
    encode,
    getSelected:()=>selectedBackground,
    applyBackground:paintCard
  };
})();
