/* First-party line icons. No font or image requests. */
(()=>{'use strict';const paths={
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',reply:'<path d="m9 5-7 7 7 7M2 12h11a8 8 0 0 1 8 8"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="3"/>',play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
 chart:'<path d="M4 20h16M6 16v-5M12 16V4M18 16V8"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 4 5"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4"/>',settings:'<path d="m10 2-1 3-3 1-3-1-2 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 2 2 0 0 1 1-4h2a3 3 0 0 0 3-3c0-4-4-7-9-7Z"/><path d="M7 9h.01M10 6h.01M15 7h.01M6 14h.01"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',video:'<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 9 6-3v12l-6-3"/>',music:'<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
 moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C2 8 6-1 12 8Zm0 0c10 0 6-9 0 0Z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/>',globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 pin:'<path d="m9 3 10 10-4 1-4 4-5-5 4-4ZM7 17l-4 4"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM3 10h18"/>',file:'<path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8M8 16h6"/>',
 search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',warning:'<path d="m12 3 10 18H2ZM12 9v5M12 17h.01"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 5 9 8 9-8"/>',shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',link:'<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92)"/>',
 heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-6 6 8 16 8 16S26 11 20 5Z"/>',rocket:'<path d="M9 15 4 13l5-5 4-1 4-4 5-1-1 5-4 4-1 4-5 5-2-5ZM5 17l-3 5 5-3"/><circle cx="17" cy="7" r="1"/>',crown:'<path d="m3 6 5 5 4-7 4 7 5-5-3 13H6ZM6 22h12"/>',sound:'<path d="M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 4a11 11 0 0 1 0 16"/>',edit:'<path d="m4 16 12-12 4 4L8 20H4ZM14 6l4 4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',game:'<path d="M7 7h10c4 0 6 12 3 13-2 1-4-4-5-4H9c-1 0-3 5-5 4C1 19 3 7 7 7ZM6 11v4M4 13h4M16 12h.01M19 14h.01"/>',send:'<path d="m3 3 19 9-19 9 4-9ZM7 12h15"/>'};
 paths.bellOff=paths.bell+'<path d="m3 3 18 18"/>';paths.soundOff=paths.sound+'<path d="m3 3 18 18"/>';
 paths.logout='<path d="M9 3H3v18h6M8 12h13m-5-5 5 5-5 5"/>';
 paths.call='<path d="m6 3 4 5-3 3a16 16 0 0 0 6 6l3-3 5 4c-1 4-4 5-8 3A23 23 0 0 1 3 11C1 7 2 4 6 3Z"/>';
 window.telechatIconsV125={html:name=>'<svg class="ui-icon-v125" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[name]||paths.spark)+'</svg>'};
})();
