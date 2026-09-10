/* Edit existing form nodes beside a live profile preview; no duplicate media. */
(()=>{
  const panel=document.getElementById('profile-panel');
  const hero=panel?.querySelector('.profile-hero-v88');
  if(!hero||panel.classList.contains('profile-studio-v92'))return;
  panel.classList.add('profile-studio-v92');
  panel.querySelector('.panel-title').textContent='Настроить профиль';
  panel.querySelector('.panel-subtitle').textContent='Твой образ в tele.chat';
  const layout=document.createElement('div');layout.className='ps-layout';
  const controls=document.createElement('div');controls.className='ps-controls';
  const scroll=document.createElement('div');scroll.className='ps-controls-scroll';
  const preview=document.createElement('aside');preview.className='ps-preview';
  preview.setAttribute('aria-label','Предпросмотр изменений профиля');
  preview.innerHTML='<div class="ps-preview-label"><span>ТВОЯ КАРТОЧКА</span><span class="ps-live">Предпросмотр</span></div>';
  const tabs=panel.querySelector('.profile-tabs-v88');
  controls.append(tabs,scroll);
  scroll.append(panel.querySelector('#profile-pane-about-v88'),panel.querySelector('#profile-pane-style-v88'));
  const premium=panel.querySelector('#animated-profile-card');
  if(premium)scroll.append(premium);
  preview.append(hero);
  const details=document.createElement('div');details.className='ps-preview-details';
  details.innerHTML='<div class="ps-status"></div><section class="ps-bio"><h3>ОБО МНЕ</h3><p></p></section>';
  const publicButton=hero.querySelector('.profile-preview-btn');
  publicButton.before(details);
  publicButton.querySelector('.profile-preview-title').textContent='Открыть сохранённый профиль';
  const note=document.createElement('p');note.className='ps-preview-note';
  note.textContent='Меняй имя, фото и оформление — результат сразу появится здесь. Другие увидят изменения после сохранения.';
  preview.append(note);
  layout.append(controls,preview);
  const dock=panel.querySelector('.profile-action-dock');
  dock.before(layout);
  const hint=document.createElement('span');hint.className='ps-save-hint';hint.textContent='Твой профиль, твои детали.';
  dock.prepend(hint);

  function refresh(){
    const name=panel.querySelector('#prof-name-inp').value.trim();
    const status=panel.querySelector('#prof-status-inp').value.trim();
    const bio=panel.querySelector('#prof-bio-inp').value.trim();
    const user=typeof me!=='undefined'?me:null;
    panel.querySelector('#profile-editor-name-v88').textContent=name||user?.name||user?.nick||'Твой профиль';
    const statusNode=details.querySelector('.ps-status');
    statusNode.textContent=status||'Здесь может быть твой статус';statusNode.classList.toggle('ps-placeholder',!status);
    window.telechatProfileMusicV97?.renderAfter(statusNode,user);
    const bioNode=details.querySelector('.ps-bio p');
    bioNode.textContent=bio||'Расскажи немного о себе — что любишь и чем увлекаешься.';
    bioNode.classList.toggle('ps-placeholder',!bio);
    const background=window.telechatProfileAppearanceV84?.getSelected()||'';
    if(/^data:image\/(jpeg|png|webp);base64,/i.test(background)){
      hero.style.setProperty('--ps-photo','url('+JSON.stringify(background)+')');hero.classList.add('ps-has-photo');
    }else{hero.style.removeProperty('--ps-photo');hero.classList.remove('ps-has-photo');}
  }
  panel.addEventListener('input',event=>{if(event.target.matches('#prof-name-inp,#prof-status-inp,#prof-bio-inp'))refresh();});
  const build=window.buildProfPanel;
  window.buildProfPanel=function(){const result=build.apply(this,arguments);refresh();return result;};
  const upload=window.handleProfileBackgroundV84;
  if(upload)window.handleProfileBackgroundV84=async function(){const result=await upload.apply(this,arguments);refresh();return result;};
  const remove=window.removeProfileBackgroundV84;
  if(remove)window.removeProfileBackgroundV84=function(){const result=remove.apply(this,arguments);refresh();return result;};
  tabs.addEventListener('click',()=>{scroll.scrollTop=0;});
  refresh();
})();
