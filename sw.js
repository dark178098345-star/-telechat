const CACHE_NAME='telechat-shell-v49-boot-failsafe';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './profile-performance-v11.js',
  './followers-v12.js',
  './app-performance-v17.js?v=18',
  './ui-polish-v16.css',
  './ui-polish-v16.js',
  './moderation-v19.css',
  './moderation-v19.js',
  './moons-v20.css',
  './moons-v20.js',
  './animated-profile-v26.css',
  './animated-profile-v26.js',
  './cosmic-background-v27.css',
  './cosmic-background-v27.js',
  './profile-details-v22.css',
  './profile-details-v22.js',
  './profile-card-v29.css',
  './chat-reliability-v24.css',
  './chat-reliability-v24.js',
  './message-send-animation-v35.css',
  './message-send-animation-v35.js',
  './voice-calls-v32.css?v=33',
  './voice-calls-v32.js?v=42',
  './glass-context-v36.css?v=36',
  './message-context-v36.js?v=36',
  './desktop-notifications-v37.js?v=37',
  './voice-send-v38.js?v=39',
  './media-compat-v40.js?v=40',
  './chat-boot-v41.css?v=41',
  './chat-boot-v41.js?v=41',
  './fluid-ui-v42.css?v=43',
  './fluid-ui-v42.js?v=43',
  './chat-open-loader-v44.css?v=44',
  './chat-open-loader-v44.js?v=44',
  './update-manager-v45.css?v=45',
  './nav-reliability-v47.css?v=47',
  './desktop-interaction-v48.css?v=48',
  './chat-boot-failsafe-v49.css?v=49',
  './nav-reliability-v47.js?v=47',
  './desktop-interaction-v48.js?v=48',
  './chat-boot-failsafe-v49.js?v=49',
  './update-manager-v46.js?v=46',
  './telechat-release.json'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(url.pathname.endsWith('/telechat-release.json')){
    event.respondWith(
      fetch(request,{cache:'no-store'})
        .then(response=>{
          if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put('./telechat-release.json',response.clone()));
          return response;
        })
        .catch(()=>caches.match('./telechat-release.json'))
    );
    return;
  }

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
