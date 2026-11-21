/* Original inline illustrations. No external assets, timers or observers. */
(() => {
  'use strict';
  const back = '<path class="es-panel" d="M22 45a6 6 0 0 1 6-6h25l10 10h53a6 6 0 0 1 6 6v54H22z"/>';
  const pocket = '<g class="es-lid"><path class="es-face" d="M22 109 32 74a6 6 0 0 1 6-4h80a5 5 0 0 1 5 7l-9 28a6 6 0 0 1-6 4z"/><path class="es-fine" d="M43 82h27"/></g>';
  const spark = '<path class="es-fine es-spark" d="M131 30v10m-5-5h10M17 65v6m-3-3h6"/>';
  const sheet = '<path class="es-panel" d="M37 36h43l16 16v47a8 8 0 0 1-8 8H37a8 8 0 0 1-8-8V44a8 8 0 0 1 8-8z"/><path class="es-fine" d="M80 36v12a4 4 0 0 0 4 4h12M44 67h35M44 79h30M44 91h21"/>';
  const note = '<path class="es-stroke" d="M96 91V66l20-5v24M96 74l20-5"/><ellipse class="es-ink" cx="90" cy="92" rx="7" ry="5"/><ellipse class="es-ink" cx="110" cy="86" rx="7" ry="5"/>';
  const bubble = '<path class="es-panel" d="M42 31h57a12 12 0 0 1 12 12v27a12 12 0 0 1-12 12H61l-18 12V82h-1a12 12 0 0 1-12-12V43a12 12 0 0 1 12-12z"/>';
  const scenes = Object.freeze({
    unread: back + '<g class="es-web"><path class="es-fine" d="M65 49 97 82M81 49l14 34M102 49l-8 35M118 49 96 80M74 59q10-8 19-4t19 2M82 67q6-6 12-3t10 1M89 74l5-3 6 1"/><path class="es-fine" d="M94 63v21"/></g>' + pocket +
      '<g class="es-spider"><path class="es-fine" d="M94 69v18"/><path class="es-stroke" d="m89 88-4-4-4 2m8 4-6-1-3 4m10 0-5 3v4m6-4-2 5 1 3m9-16 4-4 4 2m-8 4 6-1 3 4m-10 0 5 3v4m-6-4 2 5-1 3"/><ellipse class="es-detail" cx="94" cy="91" rx="6" ry="8"/><circle class="es-ink" cx="94" cy="98" r="3.1"/></g>',
    chats: '<g class="es-enter">' + bubble + '<path class="es-face" d="M82 69h34a9 9 0 0 1 9 9v13a9 9 0 0 1-9 9h-2v10l-14-10H82a9 9 0 0 1-9-9V78a9 9 0 0 1 9-9z"/><path class="es-fine" d="M87 84h23"/></g><g class="es-typing es-ink"><circle cx="51" cy="57" r="2.6"/><circle cx="64" cy="57" r="2.6"/><circle cx="77" cy="57" r="2.6"/></g>' + spark,
    group: back + '<g class="es-lift"><path class="es-card" d="M48 43a7 7 0 0 1 7-7h44a7 7 0 0 1 7 7v48H48z"/><path class="es-stroke" d="M62 64a6 6 0 1 1 12 0 6 6 0 1 1-12 0m17 0a5 5 0 1 1 10 0 5 5 0 1 1-10 0m-21 13c2-8 17-8 20 0m1 0c2-6 12-7 15-1"/></g>' + pocket + spark,
    channel: '<g class="es-enter"><path class="es-panel" d="m54 76 7 20 12-3-5-19"/><path class="es-face" d="M38 57h23l34-14v44L61 73H38z"/><path class="es-stroke" d="M62 57v16M96 40v51"/></g><g class="es-signal"><path class="es-stroke" d="M107 58a10 10 0 0 1 0 14m7-21a20 20 0 0 1 0 28"/><path class="es-fine" d="m125 43 4-4m-4 48 4 4"/></g>',
    search: sheet + '<g class="es-search"><circle class="es-detail" cx="92" cy="75" r="20"/><circle class="es-fine" cx="92" cy="75" r="14"/><path class="es-stroke" d="M106 89l17 17"/><path class="es-fine" d="M84 71a9 9 0 0 1 8-5"/></g>' + spark,
    music: '<g class="es-disc"><circle class="es-panel" cx="65" cy="70" r="37"/><circle class="es-fine" cx="65" cy="70" r="30"/><circle class="es-fine" cx="65" cy="70" r="23"/><circle class="es-detail" cx="65" cy="70" r="14"/><circle class="es-ink" cx="65" cy="70" r="3"/><path class="es-stroke" d="M46 49a28 28 0 0 1 20-7"/></g><g class="es-lift">' + note + '</g>' + spark,
    media: '<g class="es-enter"><rect class="es-panel" x="42" y="35" width="73" height="56" rx="8" transform="rotate(10 96 60)"/><rect class="es-face" x="30" y="48" width="82" height="58" rx="8"/><path class="es-stroke" d="m35 97 22-22 12 9 12-15 25 27"/><circle class="es-detail" cx="53" cy="64" r="5"/></g>' + spark,
    files: back + '<g class="es-lift"><path class="es-card" d="M52 46h30l12 12v31H52z"/><path class="es-fine" d="M82 46v12h12M62 64h13"/></g>' + pocket + spark,
    links: '<g class="es-enter"><path class="es-face" d="m69 77-14 14a13 13 0 0 0 18 18l18-18a13 13 0 0 0 0-18"/><path class="es-panel" d="m89 65 14-14a13 13 0 0 0-18-18L67 51a13 13 0 0 0 0 18"/><path class="es-stroke" d="m70 79 24-24"/></g>' + spark
  });
  function art(kind, animate=true) {
    if (!Object.hasOwn(scenes,kind)) return '';
    return `<svg class="exstra-scene-v218${animate?' es-animate':''}" data-scene="${kind}" viewBox="0 0 152 128" width="152" height="128" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path class="es-halo" d="M25 94a52 52 0 1 1 102 0"/><path class="es-ground" d="M25 113h102"/>${scenes[kind]}</svg>`;
  }
  function state(kind,title,detail='') {
    const node=document.createElement('div'),heading=document.createElement('strong');
    node.className='exstra-empty-v218';node.innerHTML=art(kind);
    heading.textContent=title;node.append(heading);
    if(detail){const note=document.createElement('p');note.textContent=detail;node.append(note);}
    return node;
  }
  window.exstraEmptyV218=Object.freeze({art,state});
  const welcome=document.querySelector('#empty-state .empty-mark-v77');
  if(welcome){welcome.classList.add('es-welcome');welcome.innerHTML=art('chats');}
})();
