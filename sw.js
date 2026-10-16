const CACHE_NAME='telechat-shell-v171-cover-first-music';
const APP_SHELL=[
  './settings-navigation-v160.css?v=165',
  './settings-navigation-v160.js?v=167',
  './phone-shell-v159.css?v=167',
  './phone-shell-v159.js?v=168',
  './pixel-eyes-v155.css?v=165',
  './pixel-emotions-v163.js?v=166',
  './pixel-eyes-v155.js?v=167',
  './chat-comfort-v167.css?v=167',
  './chat-comfort-v167.js?v=167',
  './message-archive-v167.js?v=167',
  './pair-bubble-model-v168.js?v=170',
  './pair-bubble-v168.css?v=170',
  './pair-bubble-v168.js?v=170',
  './chat-streak-v170.css?v=170',
  './chat-streak-v170.js?v=170',
  './quick-jump-v154.css?v=154',
  './quick-jump-v154.js?v=161',
  './social-v152.css?v=152',
  './call-design-v152.css?v=152',
  './shared-media-v152.js?v=152',
  './story-replies-v152.js?v=152',
  './call-chat-v152.js?v=152',
  './game-status-v151.css?v=151',
  './game-status-catalog-v151.js?v=151',
  './game-status-v151.js?v=151',
  './conversation-design-v150.css?v=150',
  './conversation-design-v150.js?v=150',
  './music-together-v147.js?v=149',
  './music-together-v147.css?v=148',
  './music-room-invites-v148.js?v=148',
  './light-theme-v147.css?v=167',
  './listening-v145.css?v=145',
  './profile-card-v143.css?v=167',
  './attachments-v141.js?v=141',
  './attachments-v141.css?v=141',
  './mobile-interface-v138.css?v=138',
  './mobile-interface-v138.js?v=159',
  './chat-scroll-v132.js?v=134',
  './chat-scroll-v132.css?v=132',
  './qr-profile-v131.js?v=161',
  './qr-profile-v131.css?v=131',
  './vendor/qr/qrcode-1.4.4.js',
  './vendor/qr/jsqr-1.4.0.js',
  './tele-emoji-art-v127.js?v=161',
  './tele-emoji-v127.js?v=130',
  './tele-emoji-v127.css?v=130',
  './emoji-animation-v128.js?v=130',
  './reaction-art-v126.js?v=128',
  './reactions-v126.css?v=126',
  './ui-symbols-v125.js?v=125',
  './ui-icons-v125.js?v=159',
  './ui-icons-v125.css?v=125',
  './viewport-performance-v124.js?v=124',
  './viewport-performance-v124.css?v=135',
  './storage-watch-v124.js?v=161',
  './activity-model-v124.js?v=124',
  './activity-stats-v124.js?v=161',
  './activity-stats-v124.css?v=124',
  './presence-model-v120.js?v=129',
  './presence-v120.js?v=151',
  './chat-wallpaper-v119.js?v=124',
  './chat-wallpaper-v119.css?v=119',
  './music-intro-v118.js?v=161',
  './music-intro-v118.css?v=118',
  './music-hub-v117.js?v=171',
  './music-hub-v117.css?v=171',
  './stories-v115.css?v=153',
  './stories-v115.js?v=153',
  './room-media-v113.js?v=113',
  './app-performance-v17.js?v=140',
  './chat-open-loader-v44.js?v=113',
  './message-context-v36.js?v=156',
  './navigation-readers-v109.js?v=161',
  './navigation-readers-v109.css?v=109',
  './performance-v107.js?v=108',
  './mentions-v106.js?v=106',
  './mentions-v106.css?v=106',
  './message-core-v104.js?v=170',
  './profile-follow-compact-v102.js?v=167',
  './background-presence-v101.css?v=101',
  './mobile-adaptation-v100.css?v=100',
  './mobile-optimization-v100.js?v=159',
  './soundcloud-v98.js?v=117',
  './soundcloud-v98.css?v=99',
  './branding/soundcloud-white.png',
  './music-card-v97.css?v=97',
  './profile-music-v97.js?v=168',
  './music-library-v96.js?v=161',
  './music-library-v96.css?v=96',
  './appearance-mode-v95.js?v=95',
  './chat-foundation-v94.css?v=94',
  './profile-studio-v92.css?v=167',
  './profile-studio-v92.js?v=167',
  './profile-quick-v91.js?v=168',
  './profile-editor-v88.css?v=167',
  './profile-editor-v88.js?v=167',
  './profile-editor-v87.css?v=87',
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png',
  './favicon.ico',
  './user-cache-v123.js?v=140',
  './profile-performance-v11.js?v=168',
  './followers-v12.js?v=167',
  './ui-polish-v16.css',
  './ui-polish-v16.js',
  './moderation-v19.css',
  './moderation-v19.js',
  './chat-reliability-v24.css',
  './chat-reliability-v24.js?v=164',
  './delivery-v72.css?v=72',
  './message-send-animation-v35.css?v=164',
  './message-send-animation-v35.js?v=164',
  './voice-calls-v32.css?v=72',
  './voice-calls-v32.js?v=167',
  './glass-context-v36.css?v=36',
  './desktop-notifications-v37.js?v=167',
  './voice-send-v38.js?v=125',
  './media-compat-v40.js?v=40',
  './chat-boot-v41.css?v=51',
  './chat-boot-v41.js?v=161',
  './fluid-ui-v42.css?v=133',
  './fluid-ui-v42.js?v=133',
  './chat-open-loader-v44.css?v=51',
  './desktop-panel-fix-v45.css?v=45',
  './gpu-safe-panels-v46.css?v=47',
  './liquid-glass-v50.css?v=50',
  './chat-speed-v51.css?v=64',
  './chat-speed-v51.js?v=170',
  './chat-actions-v52.css?v=59',
  './chat-actions-v52.js?v=105',
  './sound-studio-v53.css?v=53',
  './sound-studio-v53.js?v=167',
  './chat-experience-v62.css?v=133',
  './chat-experience-v62.js?v=161',
  './chat-flow-v64.js?v=74',
  './interaction-v65.css?v=68',
  './interaction-v65.js?v=66',
  './saved-accounts-v75.css?v=75',
  './saved-accounts-v75.js?v=167',
  './device-presence-v72.css?v=72',
  './chat-privacy-v74.css?v=75',
  './chat-privacy-v74.js?v=74',
  './smooth-ui-v76.css?v=76',
  './smooth-ui-v76.js?v=133',
  './full-redesign-v77.css?v=77',
  './chat-stability-v78.css?v=78',
  './mobile-experience-v79.css?v=79',
  './emoji-motion-v80.css?v=82',
  './emoji-motion-v80.js?v=161',
  './profile-background-v84.css?v=167',
  './profile-background-v84.js?v=93'
];

async function installShellV139(){
  const cache=await caches.open(CACHE_NAME);
  const previous=(await caches.keys()).filter(key=>key.startsWith('telechat-shell-')&&key!==CACHE_NAME);
  let next=0;
  // Reuse only exact explicitly versioned resources. Unversioned files and
  // HTML are mutable and must always be fetched for the new release.
  await Promise.all(Array.from({length:4},async()=>{
    while(next<APP_SHELL.length){
      const asset=APP_SHELL[next++],url=new URL(asset,self.location.href);
      let found=null;
      if(url.searchParams.has('v'))for(const name of previous){found=await (await caches.open(name)).match(url.href);if(found?.ok)break;}
      if(found?.ok)await cache.put(url.href,found);else await cache.add(asset);
    }
  }));
  await self.skipWaiting();
}
self.addEventListener('install',event=>{event.waitUntil(installShellV139());});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('telechat-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
      }
      return response;
    }))
  );
});
