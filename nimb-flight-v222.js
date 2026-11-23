/* Decorative, local-only flights. One visible message, one flight, no message data. */
(() => {
  'use strict';
  const pet=window.exstraNimbV221,clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
  if(!pet)return;
  const flightEmotions=new Set(['love','laugh','surprised']),cooldownMs=25000;
  const celebrates=expression=>flightEmotions.has(expression);
  const steps=48,round=value=>Number(value.toFixed(3));
  // Cache a single trajectory for the shell, drifting wake and the liquid inside.
  // Tangents are continuous through pickup, with zero velocity only at the dock.
  function coast(dx,dy,side,duration,bounds){
    const length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,nx=-uy*side,ny=ux*side;
    const bend=clamp(length*.17,13,44),orbit=clamp(length*.075,8,21),dt=duration/steps/1000;
    const project=(t,lateral,forward)=>[
      t,clamp(forward*dx+lateral*nx,bounds.minX,bounds.maxX),clamp(forward*dy+lateral*ny,bounds.minY,bounds.maxY)
    ];
    const knots=[
      [0,0,0],project(.22,bend,.40),project(.39,orbit*.65,1-orbit/length),[.5,dx,dy],
      project(.62,-orbit*.80,1-orbit*.55/length),project(.80,-bend*.66,.44),[1,0,0]
    ];
    const tangent=knots.map((_,i)=>{
      if(i===0||i===knots.length-1)return [0,0];
      const [t0,x0,y0]=knots[i-1],[t1,x1,y1]=knots[i+1];
      return [(x1-x0)*.83/(t1-t0),(y1-y0)*.83/(t1-t0)];
    });
    let segment=0;
    const points=Array.from({length:steps+1},(_,i)=>{
      const offset=i/steps;
      while(segment<knots.length-2&&offset>knots[segment+1][0])segment++;
      const [start,x0,y0]=knots[segment],[end,x1,y1]=knots[segment+1],span=end-start,
        t=(offset-start)/span,t2=t*t,t3=t2*t;
      const value=(from,to,head,tail)=>(2*t3-3*t2+1)*from+(t3-2*t2+t)*span*head+
        (-2*t3+3*t2)*to+(t3-t2)*span*tail;
      return {
        offset,
        x:clamp(value(x0,x1,tangent[segment][0],tangent[segment+1][0]),bounds.minX,bounds.maxX),
        y:clamp(value(y0,y1,tangent[segment][1],tangent[segment+1][1]),bounds.minY,bounds.maxY)
      };
    });
    const motion=points.map(({x,y},i)=>{
      if(i===0||i===steps)return {vx:0,vy:0,speed:0};
      const before=points[i-1],after=points[i+1],vx=(after.x-before.x)/(2*dt),vy=(after.y-before.y)/(2*dt);
      return {vx,vy,speed:Math.hypot(vx,vy)};
    });
    const shell=points.map(({offset,x,y},i)=>{
      const {vx,vy,speed}=motion[i],along=1+clamp(speed/7000,0,.14),across=1/along;
      const xx=speed?vx/speed:1,yy=speed?vy/speed:0,diff=along-across;
      const first=across+diff*xx*xx,second=diff*xx*yy,last=across+diff*yy*yy;
      // Area-preserving stretch follows velocity while the face stays upright.
      return {offset,transform:'matrix('+[first,second,second,last,x,y].map(round).join(',')+')'};
    });
    const damping=Math.exp(-5.5*dt);let lagX=0,lagY=0,fluidVX=0,fluidVY=0;
    const flow=motion.map(({vx,vy},i)=>{
      const earlier=motion[Math.max(0,i-1)],ax=clamp((earlier.vx-vx)/dt,-5200,5200),
        ay=clamp((earlier.vy-vy)/dt,-5200,5200);
      fluidVX=(fluidVX+(ax*.16-41*lagX)*dt)*damping;
      fluidVY=(fluidVY+(ay*.16-41*lagY)*dt)*damping;
      lagX=clamp(lagX+fluidVX*dt,-14,14);lagY=clamp(lagY+fluidVY*dt,-14,14);
      const dock=clamp((1-i/steps)/.13,0,1);
      return [round(lagX*dock/14),round(lagY*dock/14)];
    });
    const liquid=flow.map(([px,py],i)=>({offset:i/steps,transform:'translate('+round(px*11)+'px,'+
      round(py*11)+'px) rotate('+round((px*6-py*3)*side)+'deg)'}));
    const wake=points.map(({offset},i)=>{
      const trailing=Math.max(0,i-4),{x,y}=points[trailing],{speed,vx,vy}=motion[trailing],angle=Math.atan2(vy,vx);
      const opacity=clamp(speed/650,0,.54)*clamp((1-offset)*10,0,1);
      return {offset,opacity,transform:'translate('+round(x)+'px,'+round(y)+'px) rotate('+round(angle)+'rad) scale('+
        round(.66+clamp(speed/950,0,.66))+',.55)'};
    });
    return {points,shell,flow,liquid,wake};
  }
  function create(stage,messages,eligible){
    let layer,ship,glider,seed,wake,wait=0,pending=null,flight=null,last=-Infinity;
    function ensure(){
      if(layer)return;
      layer=document.createElement('div');layer.className='nimb-air-v222';layer.hidden=true;layer.setAttribute('aria-hidden','true');
      glider=document.createElement('div');glider.className='nimb-glider-v222';ship=pet.make();ship.classList.add('nimb-air-sprite-v222');
      const frost=document.createElement('div');frost.className='nimb-frost-v223';frost.setAttribute('aria-hidden','true');
      seed=document.createElement('span');seed.className='nimb-seed-v222';
      wake=document.createElement('span');wake.className='nimb-wake-v222';
      glider.append(frost,ship);layer.append(seed,wake,glider);document.body.append(layer);
    }
    function land(){
      const current=flight;flight=null;
      if(current)for(const animation of current)animation.cancel();
      if(ship)pet.stop(ship);
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
       spriteWidth=clamp(origin.width,52,116),spriteHeight=spriteWidth*105/152;
      const x=origin.left+origin.width/2-left,y=origin.top+origin.height/2-top;
      const bx=side<0?mark.left-left:mark.right-left,by=mark.top+Math.min(23,mark.height/2)-top;
      const tx=clamp(bx+side*spriteWidth*.13,spriteWidth*.52,width-spriteWidth*.52);
      const ty=clamp(by-12,spriteHeight*.6,height-spriteHeight*.55);
      const dx=tx-x,dy=ty-y;
      if(Math.hypot(dx,dy)<32)return;
      const duration=clamp(1510+Math.hypot(dx,dy)*.43,1520,1900);
      const route=coast(dx,dy,side,duration,{
        minX:Math.min(0,spriteWidth*.50-x),maxX:Math.max(0,width-spriteWidth*.50-x),
        minY:Math.min(0,spriteHeight*.55-y),maxY:Math.max(0,height-spriteHeight*.55-y)
      });
      ensure();
      layer.style.cssText='left:'+left+'px;top:'+top+'px;width:'+width+'px;height:'+height+'px';
      glider.style.cssText='left:'+(x-spriteWidth/2)+'px;top:'+(y-spriteHeight/2)+'px;width:'+spriteWidth+'px;height:'+spriteHeight+'px';
      wake.style.cssText='left:'+x+'px;top:'+y+'px';
      const sx=clamp(bx,8,width-8),sy=clamp(by,8,height-8);
      seed.style.cssText='left:'+sx+'px;top:'+sy+'px';
      layer.hidden=false;pet.paint(ship,expression,false,details);
      const took=()=>{if(flight===animations)land();};
      const animations=[];flight=animations;
      const drawnSeed=(offset,opacity,scale,approach)=>{
        const point=route.points[Math.round(offset*steps)];
        return {offset,opacity,transform:'translate('+round((x+point.x-sx)*approach)+'px,'+
          round((y+point.y-sy)*approach)+'px) scale('+scale+')'};
      };
      try{
        const swoop=glider.animate(route.shell,{duration});
        animations.push(swoop);
        stage.setAttribute('data-nimb-away','');
        animations.push(seed.animate([
          drawnSeed(0,0,.45,0),drawnSeed(.24,1,1,0),drawnSeed(.43,.95,.91,0),
          drawnSeed(.51,.85,.74,.62),drawnSeed(.59,.44,.34,1),drawnSeed(.64,0,.14,1),{offset:1,opacity:0}
        ],{duration}));
        if(details)animations.push(wake.animate(route.wake,{duration}));
        const soul=ship.querySelector('.nimb-soul');
        animations.push(soul.animate([{offset:0,scale:1},{offset:.50,scale:1},{offset:.62,scale:1.22},{offset:.80,scale:1.04},{offset:1,scale:1}],{duration}));
        animations.push(ship.querySelector('.nimb-current').animate(route.liquid,{duration}));
        pet.deform?.(ship,'flight',{duration,side,flow:route.flow});
        last=performance.now();swoop.finished.then(took,took);
      }catch(_){land();}
    }
    function request(row,expression,details){
      if(!row||!celebrates(expression)||flight||!eligible()||!pet.motionAllowed()||performance.now()-last<cooldownMs)return;
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
  window.exstraNimbFlightV222=Object.freeze({create,celebrates});
})();
