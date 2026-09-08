/* Reuse the existing editor controls so uploads and unsaved edits survive tabs. */
(()=>{
  const panel=document.getElementById('profile-panel');
  if(!panel||panel.dataset.editorV88)return;
  panel.dataset.editorV88='1';
  const cover=panel.querySelector('#profile-banner-preview');
  const toolbar=panel.querySelector('.profile-avatar-toolbar');
  const avatarControls=toolbar.querySelector('.profile-avatar-upload-copy');
  const editor=panel.querySelector('.profile-editor-card');
  const background=panel.querySelector('.profile-background-card-v87');
  const collection=panel.querySelector('.profile-choice-card');
  const fields=panel.querySelector('.profile-fields-card');
  const preview=panel.querySelector('.profile-preview-btn');
  const dock=panel.querySelector('.profile-action-dock');
  const hero=document.createElement('section');
  hero.className='profile-hero-v88';
  hero.setAttribute('aria-label','Твой профиль');
  panel.querySelector('.panel-head').after(hero);
  hero.append(cover,toolbar);
  const identity=document.createElement('div');
  identity.className='profile-identity-v88';
  identity.innerHTML='<strong id="profile-editor-name-v88"></strong><span id="profile-editor-nick-v88"></span>';
  avatarControls.replaceWith(identity);
  hero.append(preview);
  const animated=panel.querySelector('#animated-profile-card');
  if(animated)hero.after(animated);

  const tabs=document.createElement('div');
  tabs.className='profile-tabs-v88';
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','Разделы профиля');
  tabs.innerHTML='<button type="button" id="profile-tab-about-v88" role="tab" aria-controls="profile-pane-about-v88" aria-selected="true">О себе</button><button type="button" id="profile-tab-style-v88" role="tab" aria-controls="profile-pane-style-v88" aria-selected="false" tabindex="-1">Оформление</button>';
  const about=document.createElement('div'),style=document.createElement('div');
  for(const [pane,key] of [[about,'about'],[style,'style']]){
    pane.className='profile-pane-v88';pane.id='profile-pane-'+key+'-v88';
    pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','profile-tab-'+key+'-v88');
  }
  style.hidden=true;
  dock.before(tabs,about,style);
  about.append(fields);
  const avatarCard=document.createElement('section');
  avatarCard.className='profile-avatar-card-v88';
  avatarCard.innerHTML='<div class="profile-section-heading-v88"><strong>Аватарка</strong><span>Фото, видео или смайлик — выбирай свой образ</span></div>';
  avatarCard.append(avatarControls,collection);
  editor.querySelector('.profile-card-title').textContent='Баннер';
  editor.querySelector('.profile-banner-label-v87').remove();
  style.append(avatarCard,editor,background);
  const buttons=[...tabs.querySelectorAll('button')];
  function select(index){
    buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
    about.hidden=index!==0;style.hidden=index!==1;
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>select(index));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;
      select(next);buttons[next].focus();
    });
  });
  function refreshIdentity(){
    const user=typeof me!=='undefined'?me:null;
    document.getElementById('profile-editor-name-v88').textContent=user?.name||user?.nick||'Твой профиль';
    document.getElementById('profile-editor-nick-v88').textContent=user?.nick?'@'+user.nick:'';
  }
  const build=window.buildProfPanel;
  window.buildProfPanel=function(){const result=build.apply(this,arguments);refreshIdentity();return result;};
  panel.querySelector('#prof-name-inp').addEventListener('input',event=>{
    document.getElementById('profile-editor-name-v88').textContent=event.target.value.trim()||'Твой профиль';
  });
  refreshIdentity();
})();
