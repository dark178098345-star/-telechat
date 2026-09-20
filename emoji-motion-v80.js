(()=>{
  'use strict';
  const desktopQuery=window.matchMedia('(min-width:721px) and (pointer:fine)');
  const customArt=window.telechatEmojiArtV127;
  const categoryShapes={
    animals:'<path d="M7 15c-6 6 0 9 5 6 5 3 11 0 5-6-3-4-7-4-10 0Z"/><ellipse cx="5" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>',
    food:'<path d="M12 8C0 2 2 19 8 22h8C22 19 24 2 12 8Zm0 0c-1-4 1-6 5-6-1 3-2 4-5 4"/>',
    objects:'<path d="M9 18h6M10 22h4M8 15C0 5 10-1 16 4c5 4 1 8 0 11l-1 3H9Z"/>',
    symbols:'<path d="m9 3-3 18M18 3l-3 18M3 8h18M2 16h18"/>',
    flags:'<path d="M5 22V3c5-5 9 5 15 0v12c-6 5-10-5-15 0"/>'
  };
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
  if(customArt)CATEGORIES.unshift({id:'telechat',icon:'🌙',label:'Наши смайлики',keywords:'свои наши telechat теле чат',emojis:customArt.all.map(item=>item.emoji).join(' ')});
  const RECENT_KEY='telechat-emoji-recent-v80';
  const unique=list=>[...new Set(list.filter(Boolean))];
  CATEGORIES.forEach(category=>{category.list=unique(category.emojis.split(/\s+/));});
  const total=unique(CATEGORIES.flatMap(category=>category.list)).length;
  let active=customArt?'telechat':'smileys';

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
      const matching=(customArt?.all||[]).filter(item=>(item.label+' '+item.keywords).toLocaleLowerCase('ru').includes(normalized)).map(item=>item.emoji);
      list=unique([...matching,...list]);
    }else list=categoryList(active);
    grid.classList.toggle('tele-grid-v127',active==='telechat'&&!normalized);
    grid.replaceChildren();
    if(!list.length){
      const empty=document.createElement('div');empty.className='emoji-empty-v80';empty.textContent=active==='recent'?'Здесь появятся недавно выбранные эмодзи':'Ничего не найдено';grid.appendChild(empty);return;
    }
    const fragment=document.createDocumentFragment();
    list.forEach(emoji=>{
      const button=document.createElement('button');button.type='button';button.className='emoji-item-v80';
      const art=customArt?.get(emoji);if(art){button.innerHTML=art.html;button.dataset.teleEmoji=emoji;}else button.textContent=emoji;
      button.title=art?.label||'Вставить '+emoji;button.setAttribute('aria-label','Вставить '+(art?.label||emoji));button.addEventListener('click',()=>insertEmoji(emoji));fragment.appendChild(button);
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
      const button=document.createElement('button');button.type='button';button.className='emoji-category-v80'+(category.id===active?' active':'');button.dataset.category=category.id;
      const iconNames={recent:'clock',smileys:'smile',gestures:'heart',people:'users',animals:'spark',food:'spark',activity:'game',travel:'rocket',objects:'file',symbols:'spark',flags:'globe'};
      if(category.id==='telechat'&&customArt)button.innerHTML=customArt.get('🌙').html;else if(categoryShapes[category.id])button.innerHTML='<svg class="ui-icon-v125" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+categoryShapes[category.id]+'</svg>';else if(window.telechatIconsV125)button.innerHTML=window.telechatIconsV125.html(iconNames[category.id]||'spark');else button.textContent=category.icon;
      button.title=category.label;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(category.id===active));button.setAttribute('aria-label',category.label);button.addEventListener('click',()=>{
        active=category.id;tabs.querySelectorAll('button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-selected',String(item===button));});head.querySelector('input').value='';renderGrid();
      });tabs.appendChild(button);
    });
    const grid=document.createElement('div');grid.className='emoji-grid-v80';grid.setAttribute('role','grid');
    const foot=document.createElement('div');foot.className='emoji-studio-foot-v80';foot.innerHTML='<strong>Смайлики tele.chat</strong><span>'+(customArt?customArt.all.length+' своих · ':'')+total+' символов</span>';
    picker.append(head,tabs,grid,foot);
    head.querySelector('input').addEventListener('input',event=>renderGrid(event.target.value));
    head.querySelector('.emoji-close-v80').addEventListener('click',()=>picker.classList.remove('open'));
    renderGrid();
  }

  window.buildEmojiPicker=mountPicker;
  window.toggleEmojiPicker=function(event){event?.stopPropagation();mountPicker();document.getElementById('emoji-picker')?.classList.toggle('open');};
  mountPicker();

  // The picker works on phones too; shared desktop button effects stay desktop-only.
  if(!desktopQuery.matches)return;

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
