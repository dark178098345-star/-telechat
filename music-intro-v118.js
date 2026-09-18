/* An original, short audio/visual welcome. No downloaded startup sound. */
(() => {
  'use strict';
  const seen=new Set(), muteKey='telechat_music_intro_muted_v118';
  let active=null, sound=null, soundCleanup=0, finishTimer=0, removeTimer=0, pendingFinish=null;
  let muted=false;try{muted=localStorage.getItem(muteKey)==='1';}catch(_){}
  const inCall=()=>document.body.classList.contains('voice-call-full-v32')||!!document.querySelector('#voice-call-overlay.show,#voice-call-mini.show');
  function stopSound(immediate=false){
    const s=sound;sound=null;if(!s)return;
    clearTimeout(soundCleanup);
    if(immediate){s.context.close().catch(()=>{});return;}
    try{const now=s.context.currentTime;s.master.gain.cancelScheduledValues(now);s.master.gain.setValueAtTime(s.master.gain.value,now);s.master.gain.linearRampToValueAtTime(0,now+.12);}catch(_){}
    soundCleanup=setTimeout(()=>s.context.close().catch(()=>{}),160);
  }
  function playSound(){
    if(muted||sound||!active||document.hidden||inCall())return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    // The welcome is entered from a tap/click. Never queue sound for a later gesture.
    if(navigator.userActivation&&!navigator.userActivation.isActive)return;
    let context;
    try{
      context=new AudioContext();const master=context.createGain(),filter=context.createBiquadFilter();
      master.gain.value=.13;filter.type='lowpass';filter.frequency.value=2100;filter.Q.value=.35;
      filter.connect(master);master.connect(context.destination);sound={context,master};
      const start=context.currentTime+.035;
      // A warm open chord and two light, ascending overtones, composed for tele.music.
      const notes=[[146.83,0,3.2,.48],[220,.12,3,.28],[293.66,.28,2.9,.22],[587.33,.64,2.4,.12],[880,1.03,2.05,.07]];
      for(const [hz,delay,length,level] of notes){
        const oscillator=context.createOscillator(),envelope=context.createGain(),at=start+delay;
        oscillator.type='sine';oscillator.frequency.value=hz;envelope.gain.setValueAtTime(0,at);
        envelope.gain.linearRampToValueAtTime(level,at+.38);
        envelope.gain.exponentialRampToValueAtTime(.0001,at+length);
        oscillator.connect(envelope);envelope.connect(filter);oscillator.start(at);oscillator.stop(at+length+.03);
      }
      const expected=sound;
      context.resume().then(()=>{if(sound!==expected||!active||context.state!=='running'){if(sound===expected)sound=null;context.close().catch(()=>{});}}).catch(()=>{if(sound===expected)sound=null;context.close().catch(()=>{});});
      soundCleanup=setTimeout(()=>{if(sound===expected)sound=null;context.close().catch(()=>{});},3800);
    }catch(_){context?.close().catch(()=>{});sound=null;}
  }
  function soundButton(){
    if(!active)return;const button=active.node.querySelector('[data-intro-sound]');
    button.setAttribute('aria-pressed',String(!muted));button.setAttribute('aria-label',muted?'Включить звук заставки':'Выключить звук заставки');
    button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 4-6 5H2v6h3l6 5Z"/><path d="${muted?'m16 9 5 6m-5 0 5-6':'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'}"/></svg><span>${muted?'Без звука':'Звук включён'}</span>`;
  }
  function dismiss(immediate=false){
    if(!active)return;
    const session=active;active=null;clearTimeout(finishTimer);clearTimeout(removeTimer);stopSound(immediate);
    session.observer.disconnect();session.node.classList.add('is-leaving');
    session.node.setAttribute('aria-hidden','true');
    const finish=()=>{pendingFinish=null;session.node.remove();session.blocks.forEach(([node,wasInert])=>node.inert=wasInert);if(!session.root.hidden&&session.root.isConnected)session.focus?.focus?.({preventScroll:true});};
    pendingFinish=finish;
    if(immediate)finish();else removeTimer=setTimeout(finish,450);
  }
  function enter(root,nick,playback){
    if(active||!nick||seen.has(nick)||document.hidden||inCall()||new URL(location.href).searchParams.has('music')||playback?.track&&!playback.paused)return false;
    seen.add(nick);clearTimeout(removeTimer);pendingFinish?.();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const node=document.createElement('section');node.className='mh-intro-v118'+(reduced?' is-reduced':'');
    node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-labelledby','mh-intro-title-v118');
    node.innerHTML=`<div class="mh-intro-halo" aria-hidden="true"><i></i><i></i><i></i></div><div class="mh-intro-brand" aria-hidden="true">tele<span>.</span>music</div><div class="mh-intro-center"><span class="mh-intro-eyebrow" aria-hidden="true">ТВОЙ КРУГ ЗВУКА</span><h1 id="mh-intro-title-v118"><span>Ну что,</span><span>готов попасть</span><span>в мир музыки?</span></h1><div class="mh-intro-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div><footer class="mh-intro-footer"><button type="button" data-intro-sound></button><button type="button" data-intro-skip>Пропустить <span aria-hidden="true">→</span></button></footer>`;
    const blocks=[...root.children].map(el=>[el,el.inert]);blocks.forEach(([el])=>el.inert=true);
    const focus=document.activeElement;root.append(node);
    const observer=new MutationObserver(()=>{if(root.hidden||inCall())dismiss(true);});
    observer.observe(root,{attributes:true,attributeFilter:['hidden']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    active={root,node,blocks,focus,observer};soundButton();
    node.querySelector('[data-intro-skip]').onclick=()=>dismiss();
    node.querySelector('[data-intro-sound]').onclick=()=>{muted=!muted;try{localStorage.setItem(muteKey,muted?'1':'0');}catch(_){}if(muted)stopSound();else playSound();soundButton();};
    node.querySelector('[data-intro-skip]').focus({preventScroll:true});
    playSound();finishTimer=setTimeout(()=>dismiss(),reduced?2800:4200);return true;
  }
  document.addEventListener('keydown',e=>{
    if(!active)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss();}
    else if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();const buttons=[...active.node.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss(true);});
  window.addEventListener('pagehide',()=>dismiss(true));
  window.addEventListener('telechat-music-progress-v117',e=>{if(e.detail?.track&&!e.detail.paused)dismiss(true);});
  window.telechatMusicIntroV118=Object.freeze({enter,dismiss,isActive:()=>!!active});
})();
