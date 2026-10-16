/* Local, account-scoped themes. No network requests, polling or message mutations. */
(()=>{
  'use strict';
  if(window.exstraThemesV175)return;
  const palettes=[
    ['track','Под трек','#141315','#c4a0a5'],
    ['dark','Neutral','#101011','#dedee2'],
    ['amoled','AMOLED','#000000','#f2f2f3'],
    ['crimson','Crimson','#170d11','#f14d73'],
    ['nord','Nord','#1c2530','#88c0d0'],
    ['sky','Sky','#101b2c','#6baaff'],
    ['green','Mint','#0d201b','#47d6ab'],
    ['violet','Violet','#1a1327','#b685f5'],
    ['blossom','Blossom','#25131e','#ff779a'],
    ['sakura','Sakura','#24191f','#ed99b8'],
    ['terminal','Terminal','#080f0a','#35eb6d'],
    ['aqua','Aqua','#0d2227','#38d3d1'],
    ['sunset','Sunset','#261714','#ffa25c'],
    ['slate','Slate','#17212c','#89add5'],
    ['light','Светлая','#f6f7f9','#7156b5']
  ].map(([id,name,bg,accent])=>({id,name,bg,accent}));
  const byId=new Map(palettes.map(p=>[p.id,p])),prefix='exstrachat.theme.v175.';
  const body=document.body,grid=document.querySelector('#settings-panel .theme-btns');
  let owner='',state={theme:'dark',custom:null},trackKey='',applied='',editor,note,customButton;
  const hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
  const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  function mix(a,b,t){return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');}
  function luminance(c){return rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function readable(fg,backgrounds,light){let c=fg;for(let i=0;i<45&&backgrounds.some(bg=>contrast(c,bg)<4.5);i++)c=mix(c,light?'#000000':'#ffffff',.15);return c;}
  function account(){try{return typeof me!=='undefined'&&me?.nick?String(me.nick):'';}catch(_){return '';}}
  function read(key){try{return localStorage.getItem(key);}catch(_){return null;}}
  function clean(value){
    const custom=value?.custom;
    const validCustom=custom&&hex(custom.bg)&&hex(custom.accent)?{bg:custom.bg.toLowerCase(),accent:custom.accent.toLowerCase()}:null;
    return {theme:byId.has(value?.theme)?value.theme:value?.theme==='custom'&&validCustom?'custom':'dark',custom:validCustom};
  }
  function save(){try{localStorage.setItem(prefix+(owner||'guest'),JSON.stringify(state));}catch(_){if(note)note.textContent='Тема применена. Браузер не разрешил сохранить её на устройстве.';}}
  function currentTrack(){try{return window.telechatMusicV96?.getState()?.track||null;}catch(_){return null;}}
  function identity(track){return track?String(track.id||track.url||track.title||''):'';}
  function trackPalette(track){
    const key=identity(track);if(!key)return byId.get('dark');
    const choices=palettes.filter(p=>!['track','dark','amoled','light'].includes(p.id));
    let hash=2166136261;for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
    return choices[(hash>>>0)%choices.length];
  }
  function apply(track=currentTrack()){
    trackKey=identity(track);
    const palette=state.theme==='track'?trackPalette(track):state.theme==='custom'?state.custom:byId.get(state.theme);
    const key=[owner,state.theme,palette.bg,palette.accent].join('|');
    if(key===applied)return;
    applied=key;
    const {bg,accent}=palette,white='#ffffff',black='#000000',light=contrast(black,bg)>=contrast(white,bg),custom=state.theme==='custom';
    const surface=state.theme==='amoled'?bg:mix(bg,custom&&!light?black:white,light?.8:custom?.12:.035);
    const raised=custom?mix(bg,light?white:black,light?.35:.2):mix(bg,light?black:white,light?.045:.08);
    const line=mix(bg,light?black:white,light?.14:.16),backgrounds=[bg,surface,raised];
    const text=readable(light?'#21232a':'#f3f3f5',backgrounds,light),muted=readable(mix(text,bg,.34),backgrounds,light);
    const soft=readable(accent,backgrounds,light);
    let fill=accent;for(let i=0;i<30&&contrast(fill,white)<4.6;i++)fill=mix(fill,black,.09);
    const variables={
      '--bg':bg,'--bg2':surface,'--bg3':raised,'--border':line,'--text':text,
      '--text2':muted,'--text3':muted,'--accent':fill,'--accent2':mix(fill,black,.15),'--accent3':soft,
      '--flow-selected':mix(surface,accent,light?.13:.17),'--flow-hover':mix(surface,accent,.06),
      '--flow-unread':mix(surface,accent,.04),'--flow-incoming':raised,'--flow-outgoing':fill,'--flow-secondary':muted,
      '--shell-rail':bg,'--shell-field':raised,'--msg-me':fill,'--msg-them':raised,
      '--phone-bg':bg,'--phone-card':surface,'--phone-raised':raised,'--phone-line':line,
      '--phone-text':text,'--phone-muted':muted,'--phone-accent':soft,
      '--pc-bg':surface,'--pc-line':line,'--pc-text':text,'--pc-muted':muted,'--pc-block':raised
    };
    for(const [name,value] of Object.entries(variables))if(body.style.getPropertyValue(name)!==value)body.style.setProperty(name,value);
    body.classList.toggle('theme-light',light);body.classList.toggle('theme-green',state.theme==='green');
    body.dataset.themeV175=state.theme;body.style.colorScheme=light?'light':'dark';
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=bg;
    if(grid){
      grid.querySelectorAll('[data-theme]').forEach(button=>{const selected=button.dataset.theme===state.theme;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
      if(customButton){
        customButton.classList.toggle('has-custom-v175',!!state.custom);
        for(const field of ['bg','accent']){if(state.custom)customButton.style.setProperty('--preset-'+field,state.custom[field]);else customButton.style.removeProperty('--preset-'+field);}
      }
      if(note)note.textContent=state.theme==='track'?'Цвет меняется при смене трека. Без музыки — Neutral. Палитра подбирается по треку, не по обложке.':'Выбор сохраняется для этого аккаунта на устройстве. Свои фотофоны и цвет сообщений остаются.';
    }
    window.dispatchEvent(new CustomEvent('exstra-theme-changed-v175',{detail:{theme:state.theme}}));
  }
  function select(id){
    if(id==='mint')id='green';if(id==='neutral')id='dark';
    if(!byId.has(id)&&!(id==='custom'&&state.custom))id='dark';
    state.theme=id;apply();save();
  }
  function sync(){
    const next=account(),raw=read(prefix+(next||'guest'));
    let value;try{value=raw?JSON.parse(raw):null;}catch(_){value=null;}
    owner=next;
    if(!value){const legacy=read('telechat_theme_v16');value={theme:['dark','light','green'].includes(legacy)?legacy:'dark'};}
    state=clean(value);applied='';if(editor)editor.hidden=true;if(customButton)customButton.setAttribute('aria-expanded','false');apply();
  }
  function build(){
    if(!grid)return;
    grid.classList.add('theme-grid-v175');grid.setAttribute('role','group');grid.setAttribute('aria-label','Готовые темы');
    const row=grid.closest('.setting-row');row?.classList.add('theme-setting-v175');
    const label=row?.querySelector('.setting-label');if(label)label.textContent='Готовые темы';
    const oldNote=row?.querySelector('.setting-note');if(oldNote)oldNote.textContent='Найди свой цвет ExstraChat';
    for(const palette of palettes){
      const button=grid.querySelector(`[data-theme="${palette.id}"]`)||document.createElement('button');
      button.type='button';button.classList.add('theme-btn','theme-preset-v175');button.dataset.theme=palette.id;
      button.style.setProperty('--preset-bg',palette.bg);button.style.setProperty('--preset-accent',palette.accent);
      button.setAttribute('aria-label',palette.name);button.title=palette.name;
      button.innerHTML='<span class="theme-swatches-v175" aria-hidden="true"><i></i><i></i></span><span class="theme-name-v175"></span>';
      button.lastElementChild.textContent=palette.name;
      button.onclick=()=>select(palette.id);grid.append(button);
    }
    customButton=document.createElement('button');customButton.type='button';customButton.className='theme-btn theme-preset-v175 theme-custom-v175';
    customButton.dataset.theme='custom';customButton.setAttribute('aria-label','Настроить свою тему');customButton.setAttribute('aria-expanded','false');customButton.setAttribute('aria-controls','theme-editor-v175');
    customButton.innerHTML='<span class="theme-plus-v175" aria-hidden="true"></span><span class="theme-swatches-v175" aria-hidden="true"><i></i><i></i></span><span class="theme-name-v175">Своя тема</span>';
    customButton.onclick=()=>{
      editor.hidden=!editor.hidden;customButton.setAttribute('aria-expanded',String(!editor.hidden));
      if(!editor.hidden){const p=state.custom||byId.get('violet');editor.elements.bg.value=p.bg;editor.elements.accent.value=p.accent;editor.elements.bg.focus({preventScroll:true});editor.scrollIntoView({block:'nearest',behavior:'instant'});}
    };
    grid.append(customButton);
    note=document.createElement('p');note.id='theme-note-v175';note.className='theme-note-v175';grid.setAttribute('aria-describedby',note.id);
    editor=document.createElement('form');editor.id='theme-editor-v175';editor.hidden=true;
    editor.innerHTML='<div class="theme-editor-colors-v175"><label>Фон<input type="color" name="bg" value="#1a1327"></label><label>Акцент<input type="color" name="accent" value="#b685f5"></label></div><p>Текст и панели подстроятся автоматически.</p><div class="theme-editor-actions-v175"><button type="button" data-cancel>Отмена</button><button type="submit">Сохранить тему</button></div>';
    const closeEditor=()=>{editor.hidden=true;customButton.setAttribute('aria-expanded','false');customButton.focus({preventScroll:true});};
    editor.querySelector('[data-cancel]').onclick=closeEditor;
    editor.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeEditor();}});
    editor.onsubmit=event=>{event.preventDefault();state.custom={bg:editor.elements.bg.value,accent:editor.elements.accent.value};select('custom');closeEditor();};
    row?.append(note,editor);
    grid.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)||!event.target.matches('.theme-preset-v175'))return;
      const buttons=[...grid.querySelectorAll('button')],index=buttons.indexOf(event.target);
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      event.preventDefault();buttons[next].focus();
    });
  }
  build();window.setTheme=select;sync();
  window.addEventListener('telechat-account-ready-v175',sync);
  window.addEventListener('telechat-user-updated-v123',()=>{if(account()!==owner)sync();});
  window.addEventListener('pageshow',()=>{if(account()!==owner)sync();});
  window.addEventListener('storage',event=>{if(event.key===prefix+(account()||'guest'))sync();});
  window.addEventListener('telechat-music-progress-v117',event=>{
    if(state.theme==='track'&&identity(event.detail?.track)!==trackKey)apply(event.detail?.track||null);
  });
  window.exstraThemesV175=Object.freeze({setTheme:select,sync,getState:()=>({owner,...state,custom:state.custom?{...state.custom}:null}),list:()=>palettes.map(p=>({...p}))});
})();
