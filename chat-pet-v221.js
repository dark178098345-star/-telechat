/* Нимб: original vector character and locally synthesized voice. No IO or text input. */
(() => {
  'use strict';
  let sequence=0;
  const contour='M23 50C22 36 33 25 46 23C53 14 67 12 78 16C92 11 106 16 113 26C125 31 132 42 129 54C132 67 122 77 111 80C101 89 87 91 74 87C60 91 46 87 37 79C26 76 20 64 23 50Z';
  const spark='M0-5Q1.5-1.5 5 0Q1.5 1.5 0 5Q-1.5 1.5-5 0Q-1.5-1.5 0-5Z';
  const heart='M0 5.5-5.9-.3C-9-4-4.7-8 0-4.6C4.7-8 9-4 5.9-.3Z';
  const moods=new Map(Object.entries({idle:'calm',welcome:'glad',pet:'glad',happy:'glad',laugh:'laugh',excited:'glad',love:'love',sad:'sad',angry:'angry',jealous:'angry',dance:'dance',sleep:'sleep',surprised:'wow',dizzy:'wow',wink:'glad',curious:'watch',typing:'watch',think:'watch',focus:'watch',read:'watch',record:'watch',attach:'glad'}));
  const mark='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.55" aria-hidden="true"><path d="M3 13a4 4 0 0 1 3-6 5 5 0 0 1 8-2 4 4 0 0 1 5 3 4 4 0 0 1 1 7 4 4 0 0 1-6 4 5 5 0 0 1-7-1 4 4 0 0 1-4-5Z"/><path d="M9 11v2m5-2v2" stroke-linecap="round"/></svg>';
  function make() {
    const uid='exstra-nimb-'+(++sequence),template=document.createElement('template');
    template.innerHTML=`<svg class="nimb-v221" viewBox="0 0 152 105" width="152" height="105" aria-hidden="true" focusable="false" data-feeling="calm">
      <defs>
        <radialGradient id="${uid}-shell" cx=".49" cy=".39" r=".7">
          <stop stop-color="#302452" stop-opacity=".35"/><stop offset=".54" stop-color="#201639" stop-opacity=".61"/>
          <stop offset=".81" stop-color="#5d37ab" stop-opacity=".61"/><stop offset="1" stop-color="#9874ec" stop-opacity=".49"/>
        </radialGradient>
        <linearGradient id="${uid}-edge" gradientUnits="userSpaceOnUse" x1="33" y1="14" x2="116" y2="90">
          <stop stop-color="#fff4ff" stop-opacity=".94"/><stop offset=".28" stop-color="#a8a0ff" stop-opacity=".55"/>
          <stop offset=".53" class="nimb-glow-stop" stop-opacity=".4"/><stop offset=".83" stop-color="#b884ff" stop-opacity=".9"/><stop offset="1" stop-color="#ffd2fa"/>
        </linearGradient>
        <radialGradient id="${uid}-glow" cx=".57" cy=".5" r=".5">
          <stop stop-color="#f3f7ff" stop-opacity=".84"/><stop offset=".29" class="nimb-glow-stop" stop-opacity=".8"/>
          <stop offset=".67" class="nimb-glow-stop" stop-opacity=".36"/><stop offset="1" class="nimb-glow-stop" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${uid}-halo"><stop class="nimb-glow-stop" stop-opacity=".3"/><stop offset="1" class="nimb-glow-stop" stop-opacity="0"/></radialGradient>
        <linearGradient id="${uid}-current" x1=".08" y1=".02" x2=".83" y2=".88">
          <stop class="nimb-glow-stop" stop-opacity=".05"/><stop offset=".42" class="nimb-glow-stop" stop-opacity=".32"/>
          <stop offset=".73" stop-color="#6e50d5" stop-opacity=".19"/><stop offset="1" stop-color="#c894ff" stop-opacity=".49"/>
        </linearGradient>
        <linearGradient id="${uid}-shine" x1="0" y1="0" x2=".82" y2=".6">
          <stop stop-color="#fff" stop-opacity=".94"/><stop offset=".34" stop-color="#ebfaff" stop-opacity=".7"/>
          <stop offset="1" stop-color="#d6c9ff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${uid}-caustic" x1=".04" y1=".89" x2=".91" y2=".1">
          <stop stop-color="#ae8aff" stop-opacity="0"/><stop offset=".53" stop-color="#b587ff" stop-opacity=".59"/>
          <stop offset=".83" stop-color="#efd0ff" stop-opacity=".85"/><stop offset="1" stop-color="#a5f1ff" stop-opacity=".11"/>
        </linearGradient>
        <radialGradient id="${uid}-bead" cx=".35" cy=".3" r=".64"><stop stop-color="#edffff" stop-opacity=".95"/><stop offset=".4" stop-color="#c3acff" stop-opacity=".39"/><stop offset=".75" stop-color="#41346b" stop-opacity=".08"/><stop offset="1" stop-color="#d3c6ff" stop-opacity=".75"/></radialGradient>
        <radialGradient id="${uid}-soul" cx=".41" cy=".33" r=".63">
          <stop stop-color="#f8fbff" stop-opacity=".72"/><stop offset=".48" class="nimb-glow-stop" stop-opacity=".40"/>
          <stop offset=".8" class="nimb-glow-stop" stop-opacity=".12"/><stop offset="1" class="nimb-glow-stop" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-face" x1="0" y1="0" x2=".12" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e2d9ff"/></linearGradient>
        <radialGradient id="${uid}-shadow"><stop stop-color="#291a52" stop-opacity=".6"/><stop offset="1" stop-color="#291a52" stop-opacity="0"/></radialGradient>
        <clipPath id="${uid}-mask"><path d="${contour}"/></clipPath>
      </defs>
      <ellipse class="nimb-shadow" cx="76" cy="97" rx="43" ry="6" fill="url(#${uid}-shadow)"/>
      <g class="nimb-pose">
        <g class="nimb-body">
          <path d="${contour}" fill="url(#${uid}-shell)" stroke="#31234b" stroke-opacity=".55" stroke-width="2.8"/>
          <g clip-path="url(#${uid}-mask)">
            <g class="nimb-depth">
              <ellipse cx="77" cy="55" rx="54" ry="39" fill="url(#${uid}-halo)"/>
              <g class="nimb-current">
                <path d="M18 56C40 74 55 74 75 64C95 54 111 50 135 61L139 92H18Z" fill="url(#${uid}-current)"/>
                <path d="M18 58C40 76 58 75 77 66C97 56 111 53 134 63" fill="none" stroke="url(#${uid}-caustic)" stroke-width=".9" opacity=".56"/>
                <ellipse cx="76" cy="60" rx="36" ry="25" fill="url(#${uid}-glow)" opacity=".79"/>
                <circle class="nimb-soul" cx="77" cy="60" r="20" fill="url(#${uid}-soul)"/>
                <g class="nimb-beads" fill="url(#${uid}-bead)">
                  <circle cx="45" cy="60" r="3.8"/><circle cx="53" cy="69" r="1.8"/><circle cx="71" cy="35" r="2.1"/>
                  <circle cx="102" cy="43" r="3.5"/><circle cx="109" cy="56" r="1.9"/><circle cx="101" cy="72" r="2.7"/>
                  <circle cx="84" cy="76" r="1.35"/><circle cx="112" cy="38" r="1.3"/>
                </g>
              </g>
            </g>
          <g class="nimb-face" fill="none" stroke="url(#${uid}-face)" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round">
            <g class="nimb-eyes"><path d="M62 45.5v7m26-7v7"/><path d="M60 44.5h.01m26 0h.01" stroke-width="1.5" opacity=".71"/></g>
            <g class="nimb-smile"><path d="M56 51q6-10 12 0m14 0q6-10 12 0"/></g>
            <g class="nimb-frown"><path d="m55 45 11 5m18 0 11-5"/></g>
            <g class="nimb-droop"><path d="M56 48q5 7 11 2m15 2q6 5 11-2"/></g>
            <g class="nimb-sleep"><path d="M56 49q6 6 12 0m13 0q6 6 12 0"/></g>
            <g class="nimb-hearteyes" fill="#fff5fb" stroke="none"><path d="${heart}" transform="translate(62 49)"/><path d="${heart}" transform="translate(88 49)"/></g>
            <path class="nimb-mouth" d="M71 62q4 5 8 0" stroke-width="2.6"/>
            <ellipse class="nimb-open" cx="75" cy="62" rx="4.4" ry="5.1" fill="#fff8ff" stroke="none"/>
          </g>
            <g class="nimb-refraction" aria-hidden="true">
              <g class="nimb-surface-light">
              <path d="M28 48C30 36 38 31 50 29C57 20 71 17 79 22C66 21 57 26 53 32C41 33 33 40 28 48Z" fill="url(#${uid}-shine)"/>
              <path d="M83 21C97 17 108 24 113 33C104 27 96 25 88 25Z" fill="url(#${uid}-shine)" opacity=".71"/>
              <ellipse cx="40" cy="37" rx="4.8" ry="1.25" transform="rotate(-32 40 37)" fill="#f6ffff" opacity=".88"/>
              </g>
              <path d="M36 72C47 80 65 84 75 82C96 88 121 75 125 63C120 81 95 90 74 86C56 89 44 82 36 72Z" fill="url(#${uid}-caustic)"/>
              <path d="M96 81q11-2 17-8" fill="none" stroke="#fff0ff" stroke-width="1.45" stroke-linecap="round" opacity=".79"/>
            </g>
          </g>
          <path d="${contour}" fill="none" stroke="url(#${uid}-edge)" stroke-width="1.35"/>
        </g>
      </g>
      <g class="nimb-heart" fill="#f5a5d5"><path d="${heart}" transform="translate(123 19)"/><path d="${heart}" transform="translate(135 30) scale(.5)" opacity=".7"/></g>
      <g class="nimb-stars" fill="#ffe4a9"><path d="${spark}" transform="translate(24 31)"/><path d="${spark}" transform="translate(129 23) scale(1.3)"/><path d="${spark}" transform="translate(136 38) scale(.49)"/></g>
      <g class="nimb-note" fill="none" stroke="#d9b6ff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M128 25V13l10-2v12"/><ellipse cx="125" cy="26" rx="3.4" ry="2"/><ellipse cx="135" cy="24" rx="3.4" ry="2"/></g>
      <path class="nimb-tear" fill="#97d8fa" d="M103 51q-10 10 0 12 10-2 0-12Z"/>
      <path class="nimb-fire" fill="none" stroke="#ff9a8f" stroke-width="2.3" stroke-linecap="round" d="M122 20l5 4-3-8m8 13 7-1"/>
      <path class="nimb-zzz" fill="none" stroke="#b9ccff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M117 19h6l-6 6h6m6-15h7l-7 7h7"/>
    </svg>`;
    return template.content.firstElementChild;
  }
  function paint(svg,mood,talking,extras) {
    if(!svg)return;
    const feeling=moods.get(mood)||'calm';
    if(svg.dataset.feeling!==feeling)svg.dataset.feeling=feeling;
    if(svg.hasAttribute('data-talk')!==talking)svg.toggleAttribute('data-talk',talking);
    if(svg.hasAttribute('data-simple')===extras)svg.toggleAttribute('data-simple',!extras);
  }
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const motionAllowed=()=>!document.hidden&&!reduced.matches&&!['off','lite'].includes(document.body.dataset.uiMotionV184)&&window.exstraMotionV184?.enabled?.()!==false;
  function track(svg,target){
    function reset(){if(!svg.style.getPropertyValue('--nimb-x'))return;svg.style.removeProperty('--nimb-x');svg.style.removeProperty('--nimb-y');}
    target.addEventListener('pointerleave',reset,{passive:true});
    target.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||!motionAllowed()||svg.closest('[data-nimb-away]')){reset();return;}
      const rect=target.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const step=(value,center,span)=>Math.max(-6,Math.min(6,Math.round((value-center)*12/span)))+'px';
      const x=step(event.clientX,rect.left+rect.width/2,rect.width),y=step(event.clientY,rect.top+rect.height/2,rect.height);
      if(svg.style.getPropertyValue('--nimb-x')!==x)svg.style.setProperty('--nimb-x',x);
      if(svg.style.getPropertyValue('--nimb-y')!==y)svg.style.setProperty('--nimb-y',y);
    },{passive:true});
  }
  function bounce(svg,mood) {
    if(!svg?.isConnected||svg.hasAttribute('hidden')||!motionAllowed())return;
    const target=svg.querySelector('.nimb-pose'),excited=['pet','happy','laugh','excited','love','welcome'].includes(mood),hot=['jealous','angry'].includes(mood);
    svg._nimbMotion?.cancel();
    const animation=target.animate?.(hot?[{transform:'none'},{transform:'translateX(-3px) rotate(-6deg) scale(1.06,.93)'},{transform:'translateX(3px) rotate(4deg) scale(.97,1.04)'},{transform:'none'}]:[
      {transform:'none'},{offset:.18,transform:'translateY(4px) scale(1.12,.85)'},
      {offset:.49,transform:excited?'translateY(-8px) rotate(-3deg) scale(.91,1.12)':'translateY(-3px) scale(.96,1.055)'},
      {offset:.77,transform:'translateY(1px) scale(1.04,.95)'},{transform:'none'}
    ],{duration:hot?420:excited?670:520,easing:'ease-out'});
    svg._nimbMotion=animation;
    animation?.finished.then(()=>{if(svg._nimbMotion===animation)delete svg._nimbMotion;},()=>{if(svg._nimbMotion===animation)delete svg._nimbMotion;});
    if(mood==='pet'){
      svg._nimbLiquid?.cancel();
      const wave=svg.querySelector('.nimb-current').animate?.([
       {transform:'none'},{offset:.17,transform:'translate(0,-2px) rotate(-2deg)'},
       {offset:.44,transform:'translate(-5px,5px) rotate(-9deg)'},{offset:.75,transform:'translate(4px,-3px) rotate(6deg)'},{transform:'none'}
      ],{duration:840,easing:'ease-out'});
      svg._nimbLiquid=wave;const forget=()=>{if(svg._nimbLiquid===wave)delete svg._nimbLiquid;};wave?.finished.then(forget,forget);
    }
  }
  function stop(svg){svg?._nimbMotion?.cancel();svg?._nimbLiquid?.cancel();}
  let audio=null,voice=null,lastSound=-Infinity;
  const sounds={
    calm:[.23,305,245,390,1050],glad:[.24,365,640,650,1680],laugh:[.32,430,570,625,1500],
    love:[.27,322,456,440,1200],sad:[.26,298,188,360,990],angry:[.22,228,145,540,1230],
    wow:[.23,365,715,720,1790],sleep:[.24,219,171,360,960],watch:[.2,322,418,480,1360],
    dance:[.27,440,554,610,1520]
  };
  function silence(){
    const current=voice;voice=null;
    if(current){try{current.osc.stop();}catch(_){}current.gain.disconnect();}
    if(current&&audio?.state!=='closed')audio?.suspend().catch(()=>{});
  }
  function speak(mood) {
    if(document.hidden||voice||performance.now()-lastSound<650||navigator.userActivation?.hasBeenActive===false)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    try{
      audio??=new Audio();lastSound=performance.now();
      const [length,from,to,f1,f2]=sounds[moods.get(mood)||'calm'];
      const osc=audio.createOscillator(),gain=audio.createGain(),a=audio.createBiquadFilter(),b=audio.createBiquadFilter();
      a.type=b.type='bandpass';a.frequency.value=f1;b.frequency.value=f2;a.Q.value=1.65;b.Q.value=2.4;
      osc.type='triangle';osc.connect(a);osc.connect(b);a.connect(gain);b.connect(gain);gain.connect(audio.destination);
      const note={osc,gain};voice=note;
      const t=audio.currentTime+.014;
      osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+length*.72);osc.frequency.exponentialRampToValueAtTime(to*.88,t+length);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.145,t+.028);
      if(mood==='laugh'){gain.gain.exponentialRampToValueAtTime(.014,t+length*.37);gain.gain.exponentialRampToValueAtTime(.115,t+length*.6);}
      gain.gain.exponentialRampToValueAtTime(.0001,t+length);
      osc.onended=()=>{if(voice!==note)return;voice=null;gain.disconnect();audio.suspend().catch(()=>{});};
      osc.start(t);osc.stop(t+length+.01);
      audio.resume().catch(()=>{if(voice===note)silence();});
      return Math.ceil((length+.024)*1000);
    }catch(_){silence();}
  }
  window.exstraNimbV221=Object.freeze({make,paint,bounce,stop,track,motionAllowed,mark,speak,silence});
})();
