/* TELECHAT NAVIGATION + SETTINGS POLISH V16 */
(()=>{
  const STORAGE={theme:'telechat_theme_v16',font:'telechat_font_v16',sound:'telechat_sound_v16',emoji:'telechat_emoji_v16'};
  function setNavActive(target){document.querySelectorAll('.telechat-nav-btn').forEach(button=>button.classList.toggle('active',button.dataset.nav===target));}
  function refreshNavProfile(){const avatar=document.getElementById('footer-profile-avatar');if(!avatar||typeof me==='undefined'||!me)return;avatar.innerHTML=avatarMarkup(me);}
  window.telechatNavigate=function(target){
    if(target==='chats'){closeAllPanels();setNavActive('chats');return;}
    if(target==='profile'){if(typeof me==='undefined'||!me)return;buildProfPanel();refreshNavProfile();openPanel('profile-panel');setNavActive('profile');return;}
    if(target==='settings'){openPanel('settings-panel');setNavActive('settings');}
  };
  window.previewMyProfile=async function(){if(typeof me==='undefined'||!me)return;closeAllPanels();setNavActive('chats');await openUserProfile(me.nick);};
  const closePanelsBeforeV16=closeAllPanels;
  closeAllPanels=function(...args){const value=closePanelsBeforeV16(...args);setNavActive('chats');return value;};
  const buildProfileBeforeV16=buildProfPanel;
  buildProfPanel=function(...args){const value=buildProfileBeforeV16(...args);refreshNavProfile();return value;};
  const saveProfileBeforeV16=saveProfile;
  saveProfile=async function(...args){const value=await saveProfileBeforeV16(...args);refreshNavProfile();return value;};
  function safeStore(key,value){try{localStorage.setItem(key,String(value));}catch(error){}}
  function safeRead(key){try{return localStorage.getItem(key);}catch(error){return null;}}
  function applyTheme(theme){const next=['dark','light','green'].includes(theme)?theme:'dark';document.body.classList.remove('theme-light','theme-green');if(next!=='dark')document.body.classList.add('theme-'+next);document.querySelectorAll('.theme-btn').forEach(button=>button.classList.toggle('active',button.dataset.theme===next));safeStore(STORAGE.theme,next);}
  setTheme=function(theme){applyTheme(theme);};
  function applyFont(size){const next=[12,14,16,18].includes(Number(size))?Number(size):14;document.documentElement.style.setProperty('--font-size',next+'px');document.querySelectorAll('.font-btn[data-font]').forEach(button=>button.classList.toggle('active',Number(button.dataset.font)===next));safeStore(STORAGE.font,next);}
  setFont=function(size){applyFont(size);};
  const sound=document.getElementById('sound-toggle'),emoji=document.getElementById('emoji-toggle');
  const storedSound=safeRead(STORAGE.sound),storedEmoji=safeRead(STORAGE.emoji);
  if(sound){if(storedSound!==null)sound.checked=storedSound==='true';sound.addEventListener('change',()=>safeStore(STORAGE.sound,sound.checked));}
  if(emoji){if(storedEmoji!==null)emoji.checked=storedEmoji==='true';emoji.addEventListener('change',()=>safeStore(STORAGE.emoji,emoji.checked));}
  applyTheme(safeRead(STORAGE.theme)||'dark');applyFont(Number(safeRead(STORAGE.font)||14));setNavActive('chats');refreshNavProfile();
})();