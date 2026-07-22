/* TELECHAT COSMIC BACKGROUND V27 — wandering stars + lightweight meteor showers */
(()=>{
  const bg=document.getElementById('emojiBg');
  if(!bg||document.getElementById('cosmic-star-layer-v27'))return;

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const starLayer=document.createElement('div');
  starLayer.id='cosmic-star-layer-v27';
  starLayer.className='cosmic-star-layer-v27';
  starLayer.setAttribute('aria-hidden','true');
  const shootingLayer=document.createElement('div');
  shootingLayer.id='cosmic-shooting-layer-v27';
  shootingLayer.className='cosmic-shooting-layer-v27';
  shootingLayer.setAttribute('aria-hidden','true');
  bg.append(starLayer,shootingLayer);

  const random=(min,max)=>min+Math.random()*(max-min);
  const palette=['star-white','star-violet','star-blue','star-soft'];
  function makeStars(){
    starLayer.replaceChildren();
    const count=reduceMotion?.matches?18:(innerWidth<=640?24:38);
    const fragment=document.createDocumentFragment();
    for(let index=0;index<count;index++){
      const star=document.createElement('i');
      star.className='cosmic-star-v27 '+palette[index%palette.length];
      const size=random(.8,2.25);
      star.style.cssText=`--x:${random(1,99).toFixed(2)}vw;--y:${random(1,99).toFixed(2)}vh;--mx:${random(-28,28).toFixed(1)}px;--my:${random(-24,24).toFixed(1)}px;--dx:${random(-54,54).toFixed(1)}px;--dy:${random(-42,42).toFixed(1)}px;--size:${size.toFixed(2)}px;--wander:${random(18,42).toFixed(1)}s;--twinkle:${random(2.4,6.2).toFixed(1)}s;--delay:${random(-38,0).toFixed(1)}s;--glow:${random(4,11).toFixed(1)}px`;
      fragment.appendChild(star);
    }
    starLayer.appendChild(fragment);
  }

  function effectsEnabled(){
    return !document.hidden&&!reduceMotion?.matches&&!bg.classList.contains('no-emoji')&&!document.body.classList.contains('telechat-app-paused');
  }
  function spawnShootingStar(delay=0){
    if(!effectsEnabled())return false;
    setTimeout(()=>{
      if(!effectsEnabled())return;
      while(shootingLayer.childElementCount>=4)shootingLayer.firstElementChild?.remove();
      const meteor=document.createElement('i');
      meteor.className='cosmic-shooting-star-v27';
      meteor.style.cssText=`--start-x:${random(-12,78).toFixed(1)}vw;--start-y:${random(-12,42).toFixed(1)}vh;--travel-x:${random(42,72).toFixed(1)}vw;--travel-y:${random(35,59).toFixed(1)}vh;--angle:${random(28,42).toFixed(1)}deg;--length:${random(82,145).toFixed(0)}px;--speed:${random(.95,1.55).toFixed(2)}s`;
      shootingLayer.appendChild(meteor);
      meteor.addEventListener('animationend',()=>meteor.remove(),{once:true});
      setTimeout(()=>meteor.remove(),2200);
    },delay);
    return true;
  }

  let showerTimer=0;
  function scheduleSky(){
    clearTimeout(showerTimer);
    const wait=random(8500,18500);
    showerTimer=setTimeout(()=>{
      if(effectsEnabled()){
        const shower=Math.random()<.27;
        const count=shower?Math.floor(random(2,4)):1;
        for(let index=0;index<count;index++)spawnShootingStar(index*random(180,380));
      }
      scheduleSky();
    },wait);
  }

  makeStars();
  scheduleSky();
  setTimeout(()=>spawnShootingStar(),random(1800,4200));
  let resizeTimer=0;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(makeStars,300);},{passive:true});
  reduceMotion?.addEventListener?.('change',()=>{makeStars();scheduleSky();});

  window.spawnShootingStarV27=()=>spawnShootingStar();
})();
