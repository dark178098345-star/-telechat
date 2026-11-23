/* Decorative, local-only flights. One visible message, one flight, no message data. */
(() => {
  'use strict';
  const pet=window.exstraNimbV221,clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
  if(!pet)return;
  // Bake a damped spring once per launch; no per-frame JS or layout reads during flight.
  function gelFrames(points,duration){
    const steps=40,dt=duration/steps/1000,damping=Math.exp(-9*dt);
    let segment=0,prevX=0,prevY=0,vx=0,vy=0,lagX=0,lagY=0;
    return Array.from({length:steps+1},(_,i)=>{
      const time=i/steps;
      while(segment<points.length-2&&time>points[segment+1][0])segment++;
      const [start,x0,y0]=points[segment],[end,x1,y1]=points[segment+1];
      const t=clamp((time-start)/(end-start),0,1),ease=t*t*(3-2*t);
      const x=x0+(x1-x0)*ease,y=y0+(y1-y0)*ease;
      const forceX=clamp((prevX-x)*1.25,-12,12),forceY=clamp((prevY-y)*1.15,-12,12);
      vx=(vx+(forceX-lagX)*145*dt)*damping;vy=(vy+(forceY-lagY)*145*dt)*damping;
      lagX+=vx*dt;lagY+=vy*dt;prevX=x;prevY=y;
      const settle=time>.92?(1-time)/.08:1;
      return {offset:time,transform:'translate('+Number((lagX*settle).toFixed(2))+'px,'+Number((lagY*settle).toFixed(2))+'px) rotate('+Number((lagX*.7*settle).toFixed(2))+'deg)'};
    });
  }
  function create(stage,messages,eligible){
    let layer,ship,glider,seed,wake,wait=0,pending=null,flight=null,last=-Infinity;
    function ensure(){
      if(layer)return;
      layer=document.createElement('div');layer.className='nimb-air-v222';layer.hidden=true;layer.setAttribute('aria-hidden','true');
      glider=document.createElement('div');glider.className='nimb-glider-v222';ship=pet.make();ship.classList.add('nimb-air-sprite-v222');
      seed=document.createElement('span');seed.className='nimb-seed-v222';
      wake=document.createElement('span');wake.className='nimb-wake-v222';
      glider.append(ship);layer.append(seed,wake,glider);document.body.append(layer);
    }
    function land(){
      const current=flight;flight=null;
      if(current)for(const animation of current)animation.cancel();
      if(layer)layer.hidden=true;
      stage.removeAttribute('data-nimb-away');
    }
    function cancel(){
      clearTimeout(wait);wait=0;pending=null;if(flight)land();
    }
    function launch(){
      wait=0;const request=pending;pending=null;
      if(!request||flight||!eligible()||!pet.motionAllowed())return;
      let {row}=request;const {expression,details,identity}=request;
      if(!messages.contains(row)&&identity){
        for(let candidate=messages.lastElementChild,i=0;candidate&&i<16;candidate=candidate.previousElementSibling,i++){
          if(candidate.dataset.messageKeyV105===identity||candidate.dataset.id===identity){row=candidate;break;}
        }
      }
      if(!messages.contains(row))return;
      const bubble=row.querySelector('.msg-bubble'),home=stage.querySelector('.nimb-v221');
      if(!bubble||!home)return;
      const slot=stage.getBoundingClientRect(),log=messages.getBoundingClientRect(),origin=home.getBoundingClientRect(),mark=bubble.getBoundingClientRect();
      const top=Math.max(0,slot.top),bottom=Math.min(innerHeight,log.bottom),
       left=Math.max(0,log.left),right=Math.min(innerWidth,log.right);
      if(origin.width<24||mark.width<12||mark.height<12||bottom-top<155||right-left<220||
         mark.top<log.top-4||mark.top+Math.min(mark.height,40)>bottom+4)return;
      const width=right-left,height=bottom-top,side=row.classList.contains('me')?-1:1,
       spriteWidth=clamp(origin.width,60,95),spriteHeight=spriteWidth*105/152;
      const x=origin.left+origin.width/2-left,y=origin.top+origin.height/2-top;
      const bx=side<0?mark.left-left:mark.right-left,by=mark.top+Math.min(23,mark.height/2)-top;
      const tx=clamp(bx+side*spriteWidth*.34,spriteWidth*.52,width-spriteWidth*.52);
      const ty=clamp(by-12,spriteHeight*.6,height-spriteHeight*.55);
      const dx=tx-x,dy=ty-y,arc=clamp(Math.abs(dx)*.27+Math.abs(dy)*.09,16,45),bend=side*arc;
      if(Math.hypot(dx,dy)<32)return;
      ensure();
      layer.style.cssText='left:'+left+'px;top:'+top+'px;width:'+width+'px;height:'+height+'px';
      glider.style.cssText='left:'+(x-spriteWidth/2)+'px;top:'+(y-spriteHeight/2)+'px;width:'+spriteWidth+'px;height:'+spriteHeight+'px';
      wake.style.cssText='left:'+x+'px;top:'+y+'px';
      seed.style.cssText='left:'+clamp(bx,8,width-8)+'px;top:'+clamp(by,8,height-8)+'px';
      layer.hidden=false;pet.paint(ship,expression,false,details);
      const took=()=>{if(flight===animations)land();};
      const animations=[];flight=animations;
      const point=(offset,px,py,angle,sx,sy,easing='ease-in-out')=>({
       offset,transform:'translate3d('+px+'px,'+py+'px,0) rotate('+angle+'deg) scale('+sx+','+sy+')',easing
      });
      const duration=clamp(1380+Math.abs(dy)*.45,1400,1720);
      try{
        const swoop=glider.animate([
         point(0,0,0,0,1,1),point(.09,0,4,0,1.12,.83,'cubic-bezier(.2,.5,.3,1)'),
         point(.33,dx*.53+bend,dy*.42,-side*14,.88,1.13),
         point(.49,dx,dy,-side*3,1.11,.86,'ease-out'),
         point(.61,dx,dy-3,side*3,.98,1.08),
         point(.8,dx*.40-bend,dy*.46,side*12,.9,1.11),
         point(.94,0,-2,0,1.12,.86,'ease-out'),point(1,0,0,0,1,1)
        ],{duration});
        animations.push(swoop);
        stage.setAttribute('data-nimb-away','');
        animations.push(seed.animate([
          {offset:0,opacity:0,transform:'scale(.3)'},{offset:.16,opacity:1,transform:'scale(1.15)'},
          {offset:.44,opacity:1,transform:'scale(.85)'},
          {offset:.58,opacity:.75,transform:'translate('+(tx-bx)+'px,'+(ty-by)+'px) scale(.4)'},
          {offset:.65,opacity:0,transform:'translate('+(tx-bx)+'px,'+(ty-by)+'px) scale(.12)'},{offset:1,opacity:0}
        ],{duration}));
        if(details)animations.push(wake.animate([
          {...point(0,0,0,0,.35,.35),opacity:0},
          {...point(.14,0,5,0,1,.7),opacity:.40},
          {...point(.39,dx*.48+bend,dy*.37,-side*16,1.6,.72),opacity:.75},
          {...point(.57,dx,dy,0,.6,.6),opacity:0},
          {...point(.73,dx,dy,side*8,.8,.6),opacity:.46},
          {...point(.89,dx*.35-bend,dy*.40,side*16,1.45,.66),opacity:.61},
          {...point(1,0,0,0,.56,.56),opacity:0}
        ],{duration}));
        const soul=ship.querySelector('.nimb-soul');
        animations.push(soul.animate([{offset:0,scale:1},{offset:.52,scale:1},{offset:.61,scale:1.55},{offset:.76,scale:1.05},{offset:1,scale:1}],{duration}));
        animations.push(ship.querySelector('.nimb-current').animate(gelFrames([
         [0,0,0],[.09,0,4],[.33,dx*.53+bend,dy*.42],[.49,dx,dy],[.61,dx,dy-3],
         [.8,dx*.40-bend,dy*.46],[.94,0,-2],[1,0,0]
        ],duration),{duration}));
        last=performance.now();swoop.finished.then(took,took);
      }catch(_){land();}
    }
    function request(row,expression,details){
      if(!row||flight||!eligible()||!pet.motionAllowed()||performance.now()-last<1900)return;
      pending={row,expression,details,identity:row.dataset.messageKeyV105||row.dataset.id};
      if(!wait)wait=setTimeout(launch,230); // Let message insertion and autoscroll settle.
    }
    // Natural autoscroll may happen while the brief launch delay is running, not mid-flight.
    messages.addEventListener('scroll',()=>{if(flight)cancel();},{passive:true});
    for(const type of ['wheel','touchmove','pointerdown'])messages.addEventListener(type,()=>{if(flight||pending)cancel();},{passive:true});
    window.addEventListener('resize',cancel,{passive:true});
    window.visualViewport?.addEventListener('resize',cancel,{passive:true});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',cancel);
    return Object.freeze({request,cancel});
  }
  window.exstraNimbFlightV222=Object.freeze({create});
})();
