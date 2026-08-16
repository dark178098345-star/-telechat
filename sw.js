const CACHE_NAME='telechat-shell-v63-drafts';
const APP_SHELL=[
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
  './profile-performance-v11.js',
  './followers-v12.js',
  './app-performance-v17.js?v=51',
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
  './message-send-animation-v35.css?v=54',
  './message-send-animation-v35.js?v=54',
  './voice-calls-v32.css?v=58',
  './voice-calls-v32.js?v=58',
  './glass-context-v36.css?v=36',
  './message-context-v36.js?v=36',
  './desktop-notifications-v37.js?v=37',
  './voice-send-v38.js?v=39',
  './media-compat-v40.js?v=40',
  './chat-boot-v41.css?v=51',
  './chat-boot-v41.js?v=51',
  './fluid-ui-v42.css?v=48',
  './fluid-ui-v42.js?v=48',
  './chat-open-loader-v44.css?v=51',
  './chat-open-loader-v44.js?v=51',
  './desktop-panel-fix-v45.css?v=45',
  './gpu-safe-panels-v46.css?v=47',
  './liquid-glass-v50.css?v=50',
  './chat-speed-v51.css?v=51',
  './chat-speed-v51.js?v=51',
  './chat-actions-v52.css?v=59',
  './chat-actions-v52.js?v=59',
  './sound-studio-v53.css?v=53',
  './sound-studio-v53.js?v=53',
  './chat-experience-v62.css?v=63',
  './chat-experience-v62.js?v=63'
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
