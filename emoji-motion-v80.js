(()=>{
  'use strict';
  const desktopQuery=window.matchMedia('(min-width:721px) and (pointer:fine)');
  if(!desktopQuery.matches)return;
  const CATEGORIES=[
    {id:'recent',icon:'🕘',label:'Недавние',keywords:'недавние последние recent',emojis:''},
    {id:'smileys',icon:'😀',label:'Эмоции',keywords:'лицо улыбка эмоции смех грусть злость любовь face smile emotion',emojis:'😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 🙂‍↔️ 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😶‍🌫️ 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 🫥 😐 🫤 😑 🫨 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'},
    {id:'gestures',icon:'👋',label:'Жесты',keywords:'руки жесты сердце пальцы hand gesture love',emojis:'👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 🫷 🫸 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 💋 🩸 ❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟'},
    {id:'people',icon:'🧑',label:'Люди',keywords:'люди профессии семья человек people person family',emojis:'👶 🧒 👦 👧 🧑 👱 👨 🧔 🧔‍♂️ 🧔‍♀️ 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👩‍🍼 👨‍🍼 🧑‍🍼 👼 🎅 🤶 🧑‍🎄 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈️ 🧑‍🚀 🧑‍🚒 👥 🫂 👣 🗣️ 👤 👪 🧑‍🤝‍🧑 👭 👬 💏 💑'},
    {id:'animals',icon:'🐶',label:'Животные',keywords:'животные природа цветы погода animals nature flower weather',emojis:'🐵 🐒 🦍 🦧 🐶 🐕 🦮 🐕‍🦺 🐩 🐺 🦊 🦝 🐱 🐈 🐈‍⬛ 🦁 🐯 🐅 🐆 🐴 🫎 🫏 🐎 🦄 🦓 🦌 🦬 🐮 🐂 🐃 🐄 🐷 🐖 🐗 🐽 🐏 🐑 🐐 🐪 🐫 🦙 🦒 🐘 🦣 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦫 🦔 🦇 🐻 🐻‍❄️ 🐨 🐼 🦥 🦦 🦨 🦘 🦡 🐾 🦃 🐔 🐓 🐣 🐤 🐥 🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦤 🪶 🦩 🦚 🦜 🪽 🐦‍⬛ 🪿 🐦‍🔥 🐸 🐊 🐢 🦎 🐍 🐲 🐉 🦕 🦖 🐳 🐋 🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🪸 🪼 🦀 🦞 🦐 🦑 🦪 🐌 🦋 🐛 🐜 🐝 🪲 🐞 🦗 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🦠 💐 🌸 💮 🪷 🌹 🥀 🌺 🌻 🌼 🌷 🪻 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🍄 🪨 🪵 🌍 🌎 🌏 🌐 🗺️ 🗾 🧭 🏔️ ⛰️ 🌋 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌈 ☔ ⚡ ⭐ 🌟 ✨ 💫 🌙 🌚 🌛 🌜 🌝 🌞 🪐 ☄️ 🔥 💧 🌊'},
    {id:'food',icon:'🍕',label:'Еда',keywords:'еда напитки фрукты food drink fruit',emojis:'🍏 🍎 🍐 🍊 🍋 🍋‍🟩 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🫛 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫚 🫘 🥐 🥯 🍞 🥖 🫓 🥨 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊 🥢 🍽️ 🍴 🥄 🔪 🫙 🏺'},
    {id:'activity',icon:'⚽',label:'Занятия',keywords:'спорт музыка игры праздник activity sport music game',emojis:'🎃 🎄 🎆 🎇 🧨 ✨ 🎈 🎉 🎊 🎋 🎍 🎎 🎏 🎐 🎑 🧧 🎀 🎁 🎗️ 🎟️ 🎫 🎖️ 🏆 🏅 🥇 🥈 🥉 ⚽ ⚾ 🥎 🏀 🏐 🏈 🏉 🎾 🥏 🎳 🏏 🏑 🏒 🥍 🏓 🏸 🥊 🥋 🥅 ⛳ ⛸️ 🎣 🤿 🎽 🎿 🛷 🥌 🎯 🪀 🪁 🔫 🎱 🔮 🪄 🎮 🕹️ 🎰 🎲 🧩 🧸 🪅 🪩 🪆 ♠️ ♥️ ♦️ ♣️ ♟️ 🃏 🀄 🎴 🎭 🖼️ 🎨 🧵 🪡 🧶 🪢 🎼 🎵 🎶 🎙️ 🎚️ 🎛️ 🎤 🎧 📻 🎷 🪗 🎸 🎹 🎺 🎻 🪕 🥁 🪘 🪇 🪈'},
    {id:'travel',icon:'🚀',label:'Места',keywords:'транспорт путешествия здания travel transport places',emojis:'🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🛞 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 ⛽ 🚧 🚦 🚥 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏕️ ⛺ 🛖 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏬 🏭 🏯 🏛️ ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎑 🛝'},
    {id:'objects',icon:'💡',label:'Предметы',keywords:'предметы техника одежда objects technology clothes',emojis:'⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ ⛓️‍💥 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 🩻 🩼 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚿 🛁 🪥 🪒 🧴 🧼 🫧 🧽 🧯 🛒 🎒 👓 🕶️ 🥽 🥼 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 🪭 👛 👜 👝 🛍️ 🎒 🩴 👞 👟 🥾 🥿 👠 👡 🩰 👢 🪮 👑 👒 🎩 🎓 🧢 🪖 ⛑️ 📿 💄 💍 💎 🔇 🔈 🔉 🔊 📢 📣 📯 🔔 🔕 🎼 🎵 🎶'},
    {id:'symbols',icon:'💯',label:'Символы',keywords:'символы знаки цифры arrows symbols signs',emojis:'🏧 🚮 🚰 ♿ 🚹 🚺 🚻 🚼 🚾 🛂 🛃 🛄 🛅 ⚠️ 🚸 ⛔ 🚫 🚳 🚭 🚯 🚱 🚷 📵 🔞 ☢️ ☣️ ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ 🕉️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ☮️ 🕎 🔯 🪯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ 🔀 🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 🛜 📳 📴 ♀️ ♂️ ⚧️ ✖️ ➕ ➖ ➗ 🟰 ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿ 〽️ ✳️ ✴️ ❇️ ©️ ®️ ™️ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔠 🔡 🔢 🔣 🔤 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🅿️ 🆘 🆙 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸 🈴 🈳 ㊗️ ㊙️ 🈺 🈵 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲'},
    {id:'flags',icon:'🏳️',label:'Флаги',keywords:'страны флаги flags countries',emojis:'🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇺🇳 🇰🇬 🇰🇿 🇷🇺 🇺🇦 🇧🇾 🇺🇿 🇹🇯 🇹🇲 🇦🇿 🇦🇲 🇬🇪 🇲🇩 🇺🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇱 🇨🇴 🇵🇪 🇬🇧 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇵🇱 🇨🇿 🇸🇰 🇭🇺 🇷🇴 🇧🇬 🇬🇷 🇹🇷 🇸🇪 🇳🇴 🇫🇮 🇩🇰 🇮🇸 🇮🇪 🇪🇪 🇱🇻 🇱🇹 🇷🇸 🇭🇷 🇸🇮 🇧🇦 🇲🇪 🇲🇰 🇦🇱 🇨🇾 🇲🇹 🇻🇦 🇯🇵 🇨🇳 🇰🇷 🇮🇳 🇵🇰 🇧🇩 🇱🇰 🇳🇵 🇧🇹 🇲🇳 🇹🇭 🇻🇳 🇸🇬 🇲🇾 🇮🇩 🇵🇭 🇦🇺 🇳🇿 🇸🇦 🇦🇪 🇶🇦 🇰🇼 🇮🇱 🇪🇬 🇿🇦 🇳🇬 🇰🇪 🇲🇦 🇩🇿 🇹🇳'}
  ];
  const RECENT_KEY='telechat-emoji-recent-v80';
  const unique=list=>[...new Set(list.filter(Boolean))];
  CATEGORIES.forEach(category=>{category.list=unique(category.emojis.split(/\s+/));});
  const total=unique(CATEGORIES.flatMap(category=>category.list)).length;
  let active='smileys';

  function readRecent(){try{return unique(JSON.parse(localStorage.getItem(RECENT_KEY))||[]).slice(0,28);}catch{return[];}}
  function saveRecent(emoji){try{localStorage.setItem(RECENT_KEY,JSON.stringify(unique([emoji,...readRecent()]).slice(0,28)));}catch{}}
  function insertEmoji(emoji){
    const input=document.getElementById('msg-input');
    if(!input)return;
    const start=Number.isFinite(input.selectionStart)?input.selectionStart:input.value.length;
    const end=Number.isFinite(input.selectionEnd)?input.selectionEnd:start;
    input.setRangeText(emoji,start,end,'end');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    saveRecent(emoji);
    if(window.matchMedia('(max-width:720px), ((max-width:900px) and (pointer:coarse))').matches){
      document.getElementById('emoji-picker')?.classList.remove('open');
      input.focus({preventScroll:true});
    }
  }

  function categoryList(id){return id==='recent'?readRecent():CATEGORIES.find(item=>item.id===id)?.list||[];}
  function renderGrid(query=''){
    const picker=document.getElementById('emoji-picker');
    const grid=picker?.querySelector('.emoji-grid-v80');
    if(!grid)return;
    const normalized=query.trim().toLocaleLowerCase('ru');
    let list;
    if(normalized){
      list=unique(CATEGORIES.filter(category=>category.id!=='recent'&&(`${category.label} ${category.keywords}`).toLocaleLowerCase('ru').includes(normalized)||category.list.includes(query.trim())).flatMap(category=>category.list));
      if(!list.length&&query.trim())list=unique(CATEGORIES.flatMap(category=>category.list).filter(emoji=>emoji.includes(query.trim())));
    }else list=categoryList(active);
    grid.replaceChildren();
    if(!list.length){
      const empty=document.createElement('div');empty.className='emoji-empty-v80';empty.textContent=active==='recent'?'Здесь появятся недавно выбранные эмодзи':'Ничего не найдено';grid.appendChild(empty);return;
    }
    const fragment=document.createDocumentFragment();
    list.forEach(emoji=>{
      const button=document.createElement('button');button.type='button';button.className='emoji-item-v80';button.textContent=emoji;button.title='Вставить '+emoji;button.setAttribute('aria-label','Вставить '+emoji);button.addEventListener('click',()=>insertEmoji(emoji));fragment.appendChild(button);
    });
    grid.appendChild(fragment);
  }

  function mountPicker(){
    const picker=document.getElementById('emoji-picker');
    if(!picker||picker.dataset.v80Ready==='true')return;
    picker.dataset.v80Ready='true';picker.classList.add('emoji-studio-v80');picker.replaceChildren();
    const head=document.createElement('div');head.className='emoji-studio-head-v80';
    head.innerHTML='<label class="emoji-search-wrap-v80"><span aria-hidden="true">⌕</span><input class="emoji-search-v80" type="search" placeholder="Найти эмодзи или категорию…" aria-label="Поиск эмодзи"></label><button type="button" class="emoji-close-v80" aria-label="Закрыть эмодзи">×</button>';
    const tabs=document.createElement('div');tabs.className='emoji-category-tabs-v80';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Категории эмодзи');
    CATEGORIES.forEach(category=>{
      const button=document.createElement('button');button.type='button';button.className='emoji-category-v80'+(category.id===active?' active':'');button.dataset.category=category.id;button.textContent=category.icon;button.title=category.label;button.setAttribute('aria-label',category.label);button.addEventListener('click',()=>{
        active=category.id;tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));head.querySelector('input').value='';renderGrid();
      });tabs.appendChild(button);
    });
    const grid=document.createElement('div');grid.className='emoji-grid-v80';grid.setAttribute('role','grid');
    const foot=document.createElement('div');foot.className='emoji-studio-foot-v80';foot.innerHTML='<strong>Эмодзи tele.chat</strong><span>'+total+' символов</span>';
    picker.append(head,tabs,grid,foot);
    head.querySelector('input').addEventListener('input',event=>renderGrid(event.target.value));
    head.querySelector('.emoji-close-v80').addEventListener('click',()=>picker.classList.remove('open'));
    renderGrid();
  }

  window.buildEmojiPicker=mountPicker;
  window.toggleEmojiPicker=function(event){event?.stopPropagation();mountPicker();document.getElementById('emoji-picker')?.classList.toggle('open');};

  function prepareButton(button){
    if(!(button instanceof HTMLButtonElement))return;
    button.classList.add('v80-motion-ready');
  }
  function prepareButtons(root=document){root.querySelectorAll?.('button').forEach(prepareButton);}
  prepareButtons();
  document.body.classList.add('telechat-motion-v80');

  let pressedButton=null;
  const releaseButton=()=>{
    pressedButton?.classList.remove('v80-pressing');
    pressedButton=null;
  };
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button.v80-motion-ready');
    if(!button||button.disabled)return;
    releaseButton();
    pressedButton=button;
    button.classList.add('v80-pressing');
  },{passive:true});
  window.addEventListener('pointerup',releaseButton,{passive:true,capture:true});
  window.addEventListener('pointercancel',releaseButton,{passive:true,capture:true});
  window.addEventListener('blur',releaseButton);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseButton();});
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;prepareButton(node);prepareButtons(node);}))).observe(document.body,{childList:true,subtree:true});
})();
