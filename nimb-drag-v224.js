/* Manual Nimb placement in the current chat. No pointer history or UI state is persisted. */
(() => {
  'use strict';
  const pet=window.exstraNimbV221,clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
  if(!pet)return;
  function create({stage,messages,dock,eligible,onGrab,onDrop,react}){
    let layer,grip,ship,gesture=null,blockedClick=null,free=false,coast=0,position=null,lastFluid=-Infinity;
    let visual={mood:'idle',talking:false,details:true};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function bounds(width,height){
      if(!eligible()||!stage.isConnected||!messages.isConnected)return null;
      const slot=stage.getBoundingClientRect(),log=messages.getBoundingClientRect(),viewport=window.visualViewport;
      const ox=viewport?.offsetLeft||0,oy=viewport?.offsetTop||0;
      const left=Math.max(ox,log.left)+5,top=Math.max(oy,slot.top)+3;
      const right=Math.min(innerWidth,ox+(viewport?.width||innerWidth),log.right)-5;
      const bottom=Math.min(innerHeight,oy+(viewport?.height||innerHeight),log.bottom)-3;
      return right-left>=width&&bottom-top>=height?{left,top,right:right-width,bottom:bottom-height}:null;
    }
    function paint(mood,talking,details){
      visual={mood,talking,details};
      if(free)pet.paint(ship,mood,talking,details);
    }
    function reaction(mood){
      if(!free)return;
      if(react)react(mood);
      else paint(mood,false,visual.details);
      if(free)pet.bounce(ship,mood);
    }
    function ensure(){
      if(layer)return;
      layer=document.createElement('div');layer.className='nimb-drag-layer-v224';layer.hidden=true;
      grip=document.createElement('button');grip.type='button';grip.className='nimb-drag-grip-v224';
      grip.setAttribute('aria-label','Передвинуть Нимба');grip.title='Перетащи Нимба · Esc — вернуть на место';
      ship=pet.make();ship.setAttribute('aria-hidden','true');
      const frost=document.createElement('span');frost.className='nimb-frost-v223';frost.setAttribute('aria-hidden','true');
      grip.append(frost,ship);layer.append(grip);document.body.append(layer);
      grip.addEventListener('pointerdown',start);
      grip.addEventListener('click',click);
      grip.addEventListener('keydown',event=>{
        const direction=({ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1]})[event.key];
        if(!free||!direction)return;
        event.preventDefault();stopCoast();
        const box=bounds(position.width,position.height);
        if(!box){reset();return;}
        translate(position.x+direction[0]*32,position.y+direction[1]*32,box);
        reaction('happy');
      });
    }
    function stopCoast(){if(coast){cancelAnimationFrame(coast);coast=0;}}
    function reset(){
      const current=gesture;gesture=null;stopCoast();position=null;
      if(current?.active&&current.host===dock)block(current);
      try{if(current?.host.hasPointerCapture(current.id))current.host.releasePointerCapture(current.id);}catch(_){}
      if(!free)return;
      free=false;stage.removeAttribute('data-nimb-drag-away');
      grip.removeAttribute('data-dragging');layer.hidden=true;
      drift(0,0);pet.setFloat?.(ship,false);pet.stop(ship);
    }
    function translate(x,y,box){
      position.x=clamp(x,box.left,box.right);position.y=clamp(y,box.top,box.bottom);
      grip.style.transform='translate3d('+position.x.toFixed(1)+'px,'+position.y.toFixed(1)+'px,0)';
    }
    function start(event){
      const host=event.currentTarget;
      if(event.defaultPrevented||event.button!==0||event.isPrimary===false||gesture||!eligible()||host===dock&&free)return;
      if(blockedClick?.host===host)blockedClick=null;
      stopCoast();if(free)drift(0,0);
      const rect=(free?grip:dock.querySelector('.nimb-v221')||dock).getBoundingClientRect();
      const width=free?position.width:clamp(rect.width,52,116),height=width*105/152;
      const box=bounds(width,height);if(!box)return;
      const now=performance.now();
      gesture={host,id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,last:now,
        anchorX:free?position.x:rect.left+(rect.width-width)/2,anchorY:free?position.y:rect.top+(rect.height-height)/2,
        width,height,box,vx:0,vy:0,active:false,pointerType:event.pointerType};
      try{host.setPointerCapture?.(event.pointerId);}catch(_){}
    }
    function block(g){
      blockedClick={host:g.host,id:g.id,until:performance.now()+750};
    }
    function click(event){
      const gate=blockedClick;
      if(gate&&event.currentTarget===gate.host&&performance.now()<gate.until&&event.detail!==0&&
        (event.pointerId===undefined||event.pointerId===-1||event.pointerId===gate.id)){
        blockedClick=null;event.preventDefault();event.stopImmediatePropagation();return;
      }
      if(event.currentTarget===grip&&free)reaction('happy');
    }
    function begin(g){
      ensure();onGrab?.();if(g!==gesture||!eligible()){reset();return false;}
      g.active=true;free=true;position={x:g.anchorX,y:g.anchorY,width:g.width,height:g.height};
      grip.style.width=g.width+'px';grip.style.height=g.height+'px';
      translate(g.anchorX,g.anchorY,g.box);stage.setAttribute('data-nimb-drag-away','');
      layer.hidden=false;grip.setAttribute('data-dragging','');
      pet.paint(ship,visual.mood,visual.talking,visual.details);pet.setFloat?.(ship,true);
      reaction('surprised');
      return g===gesture;
    }
    function drift(vx,vy){
      // Keep the drag itself responsive without redrawing the 3D material for every raw pointer sample.
      const now=performance.now();
      if((vx||vy)&&now-lastFluid<28)return;
      lastFluid=(vx||vy)?now:-Infinity;
      pet.drift?.(ship,clamp(-vx/.92,-1,1)||0,clamp(-vy/.92,-1,1)||0);
    }
    function move(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;
      if(!eligible()){reset();return;}
      const dx=event.clientX-g.x,dy=event.clientY-g.y;
      if(!g.active&&(Math.hypot(dx,dy)<8||!begin(g)))return;
      const now=performance.now(),dt=clamp(now-g.last,10,90);
      const alpha=1-Math.exp(-dt/45);
      g.vx+=(clamp((event.clientX-g.lastX)/dt,-1.8,1.8)-g.vx)*alpha;
      g.vy+=(clamp((event.clientY-g.lastY)/dt,-1.8,1.8)-g.vy)*alpha;
      g.lastX=event.clientX;g.lastY=event.clientY;g.last=now;
      translate(g.anchorX+dx,g.anchorY+dy,g.box);
      if(!reduced.matches&&pet.motionAllowed())drift(g.vx,g.vy);
    }
    function finish(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;
      gesture=null;
      if(event.type==='pointercancel'){reset();if(g.active)block(g);return;}
      if(!g.active)return;
      block(g);grip.removeAttribute('data-dragging');
      const idle=performance.now()-g.last,attenuation=Math.exp(-idle/90);
      const vx=clamp(g.vx*attenuation,-1.02,1.02),vy=clamp(g.vy*attenuation,-1.02,1.02),speed=Math.hypot(vx,vy);
      reaction(speed>.82?'dizzy':speed>.38?'laugh':'happy');
      if(!free)return;
      onDrop?.();if(!free)return;
      if(g.pointerType!=='touch'&&g.host===dock&&document.activeElement===dock)grip.focus({preventScroll:true});
      if(reduced.matches||!pet.motionAllowed()||speed<.09){drift(0,0);return;}
      const started=performance.now(),x=position.x,y=position.y;
      function coastTo(now){
        coast=0;if(!free||!eligible()){reset();return;}
        const elapsed=now-started,carry=Math.exp(-elapsed/129),distance=(1-carry)*129;
        translate(x+vx*distance,y+vy*distance,g.box);
        if(elapsed<460&&!reduced.matches&&pet.motionAllowed()){
          drift(vx*carry,vy*carry);coast=requestAnimationFrame(coastTo);
        }else drift(0,0);
      }
      coast=requestAnimationFrame(coastTo);
    }
    function stopLostCapture(event){
      if(gesture?.id!==event.pointerId)return;
      const active=gesture.active;if(active)block(gesture);gesture=null;
      if(active)reset();
    }
    dock.addEventListener('pointerdown',start);
    dock.addEventListener('click',click,true);
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('pointerup',finish,{passive:true});
    window.addEventListener('pointercancel',finish,{passive:true});
    window.addEventListener('lostpointercapture',stopLostCapture,true);
    window.addEventListener('resize',reset,{passive:true});
    window.visualViewport?.addEventListener('resize',reset,{passive:true});
    window.visualViewport?.addEventListener('scroll',reset,{passive:true});
    window.addEventListener('blur',reset);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
    reduced.addEventListener?.('change',()=>{stopCoast();if(free)drift(0,0);});
    document.addEventListener('keydown',event=>{
      if(!free||event.key!=='Escape'||event.defaultPrevented||!eligible())return;
      event.preventDefault();event.stopPropagation();const focused=document.activeElement===grip;reset();
      if(focused&&dock.isConnected)dock.focus({preventScroll:true});
    },true);
    return Object.freeze({away:()=>free,reset,paint});
  }
  window.exstraNimbDragV224=Object.freeze({create});
})();
