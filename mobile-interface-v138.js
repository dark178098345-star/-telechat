/* Mobile-only direct media editing. Existing upload/save handlers remain owners. */
(()=>{
  'use strict';
  const mobile=matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))');
  const avatar='#prof-av-prev,.profile-avatar-thumb-v89,.pq-avatar,#view-profile-avatar';
  const banner='#profile-banner-preview,.profile-banner-thumb-v89,.pq-cover,#view-profile-cover';
  let sheet=null;
  function choose(target){
    if(!mobile.matches)return;
    const isPublic=target.matches('#view-profile-avatar,#view-profile-cover');
    if(isPublic&&(typeof me==='undefined'||typeof viewedProfileNickV5==='undefined'||viewedProfileNickV5!==me?.nick))return;
    if(target.closest('#profile-quick-v91'))document.querySelector('[data-pq="edit"]')?.click();
    else if(isPublic){closeUserProfile();buildProfPanel();openPanel('profile-panel');}
    const type=target.matches(avatar)?'avatar':'banner';
    if(!sheet){
      sheet=document.createElement('dialog');sheet.id='mobile-media-v138';
      sheet.setAttribute('aria-labelledby','mobile-media-title-v138');
      sheet.innerHTML='<h2 id="mobile-media-title-v138"></h2><p>Выбери файл. Изменения применятся после сохранения профиля.</p><button type="button" data-media="file">Выбрать фото</button><button type="button" data-media="video">Выбрать видео</button><button type="button" data-close>Отмена</button>';
      document.body.append(sheet);
      sheet.addEventListener('click',event=>{
        const action=event.target.closest('button');
        if(action){const input=action.dataset.media?document.getElementById(sheet.dataset.type+'-'+action.dataset.media+'-input'):null;sheet.close();input?.click();}
        else if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)sheet.close();}
      });
    }
    sheet.dataset.type=type;
    sheet.querySelector('h2').textContent=type==='avatar'?'Изменить аватарку':'Изменить баннер';
    if(!sheet.open)sheet.showModal();
    return true;
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest(avatar+','+banner);
    if(target&&choose(target)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  // Static editor previews are keyboard-accessible too. No document-wide observer.
  for(const el of document.querySelectorAll('#prof-av-prev,.profile-avatar-thumb-v89,#profile-banner-preview,.profile-banner-thumb-v89')){
    const original={role:el.getAttribute('role'),tabindex:el.getAttribute('tabindex'),'aria-label':el.getAttribute('aria-label')};
    const update=()=>{for(const [name,value] of Object.entries(mobile.matches?{role:'button',tabindex:'0','aria-label':el.matches(avatar)?'Изменить аватарку':'Изменить баннер'}:original)){if(value===null)el.removeAttribute(name);else el.setAttribute(name,value);}};
    update();mobile.addEventListener('change',update);
    el.addEventListener('keydown',event=>{if(mobile.matches&&(event.key==='Enter'||event.key===' ')){event.preventDefault();choose(el);}});
  }
  mobile.addEventListener('change',()=>{if(!mobile.matches)sheet?.close();});
})();
