/* Official SoundCloud widget only. No stream extraction, proxy or downloading. */
(() => {
  'use strict';
  const hosts = new Set(['soundcloud.com','www.soundcloud.com','m.soundcloud.com']);
  const isLink = value => {try{return hosts.has(new URL(value).hostname);}catch(_){return false;}};
  function normalize(value) {
    const url = new URL(value);
    if (!hosts.has(url.hostname) || url.protocol !== 'https:' || url.username || url.password) throw new Error('Нужна HTTPS-ссылка на трек SoundCloud.');
    const parts = url.pathname.split('/').filter(Boolean);
    if(parts.length !== 2 || ['sets','likes','reposts','tracks','albums','popular-tracks'].includes(parts[1])) throw new Error('Скопируй ссылку на отдельный трек SoundCloud, не на профиль или плейлист.');
    url.hostname = 'soundcloud.com';url.hash = '';
    for(const key of [...url.searchParams.keys()]) if(key !== 'secret_token') url.searchParams.delete(key);
    return url.href.replace(/\/$/,'');
  }
  const brand = '<img src="./branding/soundcloud-white.png" alt="SoundCloud" width="118" height="21">';
  let scriptPromise;
  function api() {
    if(window.SC?.Widget)return Promise.resolve(window.SC);
    if(scriptPromise)return scriptPromise;
    scriptPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';script.async=true;
      const timer=setTimeout(()=>finish(new Error('SoundCloud не отвечает. Проверь интернет и повтори.')),15000);
      function finish(error){clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();scriptPromise=null;reject(error);}else resolve(window.SC);}
      script.onload=()=>finish(window.SC?.Widget?null:new Error('Не удалось загрузить плеер SoundCloud.'));
      script.onerror=()=>finish(new Error('Плеер SoundCloud недоступен. Проверь интернет или блокировщик.'));
      document.head.append(script);
    });
    return scriptPromise;
  }
  async function create(value, host, options={}) {
    const url=normalize(value), SC=await api();
    if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
    return new Promise((resolve,reject) => {
      let alive=true,settled=false,ready=false;
      const iframe=document.createElement('iframe');
      iframe.title='Плеер SoundCloud';iframe.width='100%';iframe.height='166';iframe.allow='autoplay';iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.src='https://w.soundcloud.com/player/?'+new URLSearchParams({url,auto_play:'false',show_artwork:'true',show_user:'true',show_comments:'false',visual:'false',color:'#ff5500'});
      host.replaceChildren(iframe);
      const widget=SC.Widget(iframe), events=SC.Widget.Events;
      const controller={paused:true,currentTime:0,duration:0,title:'',
        play(){if(alive&&ready&&options.canPlay?.()!==false)widget.play();return Promise.resolve();},
        pause(){if(!alive)return;widget.pause();controller.paused=true;options.onState?.();},
        seek(seconds){if(alive&&ready)widget.seekTo(Math.max(0,Math.min(Number(seconds)||0,controller.duration))*1000);},
        destroy(){if(!alive)return;alive=false;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);for(const name of Object.values(events))widget.unbind(name);iframe.remove();if(!settled){settled=true;reject(new DOMException('Cancelled','AbortError'));}}
      };
      const abort=()=>controller.destroy();options.signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(()=>fail(new Error('Трек SoundCloud не загрузился. Он может быть недоступен в твоём регионе или запрещён для встраивания.')),20000);
      function fail(error){if(!alive)return;if(!settled){settled=true;reject(error);controller.destroy();}else{controller.paused=true;options.onState?.();options.onError?.(error);}}
      widget.bind(events.ERROR,()=>fail(new Error('SoundCloud не разрешил воспроизвести этот трек. Проверь доступность на самом SoundCloud.')));
      widget.bind(events.READY,()=>{
        if(!alive)return;
        widget.getCurrentSound(sound=>{
          if(!alive||settled)return;
          if(!sound||!(sound.duration>0)){fail(new Error('SoundCloud не вернул доступный аудиотрек.'));return;}
          controller.title=String(sound.title||'Трек SoundCloud').slice(0,160);controller.duration=sound.duration/1000;
          ready=true;settled=true;clearTimeout(timer);resolve(controller);
        });
      });
      widget.bind(events.PLAY,()=>{if(!alive)return;if(!ready||options.canPlay?.()===false){controller.pause();return;}controller.paused=false;options.onState?.();});
      widget.bind(events.PAUSE,()=>{if(alive){controller.paused=true;options.onState?.();}});
      widget.bind(events.PLAY_PROGRESS,event=>{if(alive){controller.currentTime=Math.max(0,(event.currentPosition||0)/1000);options.onState?.();}});
      widget.bind(events.SEEK,event=>{if(alive){controller.currentTime=Math.max(0,(event.currentPosition||0)/1000);options.onState?.();}});
      widget.bind(events.FINISH,()=>{if(alive){controller.paused=true;options.onState?.();options.onEnd?.();}});
    });
  }
  window.telechatSoundCloudV98={isLink,normalize,create,brand};
})();
