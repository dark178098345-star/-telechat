/* Small, deterministic CPU mesh projector. No GPU context, dependencies, or render loop. */
(()=>{
 'use strict';
 const TAU=Math.PI*2,add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((r,v,i)=>r+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>mul(a,1/(Math.hypot(...a)||1)),turn=(a,b,t)=>[a*Math.cos(t)-b*Math.sin(t),a*Math.sin(t)+b*Math.cos(t)];
 function rotate([x,y,z],yaw=0,pitch=0,roll=0){[x,z]=turn(x,z,yaw);[y,z]=turn(y,z,pitch);[x,y]=turn(x,y,roll);return [x,y,z];}
 function mesh(){
  const faces=[];
  const face=(vertices,color)=>faces.push({vertices,color});
  const prism=(points,depth,color,pos=[0,0,0],angles=[])=>{
   const contour=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0)<0?[...points].reverse():points;
   const ring=z=>contour.map(([x,y])=>add(rotate([x,y,z],...angles),pos));
   const b=ring(-depth/2),f=ring(depth/2);face(f,color);face([...b].reverse(),color);
   contour.forEach((_,i)=>{const j=(i+1)%b.length;face([b[i],b[j],f[j],f[i]],color);});
  };
  const box=(pos,[x,y,z],color,angles=[])=>prism([[-x/2,-y/2],[x/2,-y/2],[x/2,y/2],[-x/2,y/2]],z,color,pos,angles);
  const wrapped=(rings,color,close=false)=>{
   const steps=rings[0].length;
   for(let j=0;j<(close?rings.length:rings.length-1);j++){
    const low=rings[j],high=rings[(j+1)%rings.length];
    for(let i=0;i<steps;i++){const k=(i+1)%steps;face([low[i],high[i],high[k],low[k]],color);}
   }
   if(!close){face(rings[0],color);face([...rings.at(-1)].reverse(),color);}
  };
  const lathe=(pos,profile,color,steps=10,angles=[],depth=1)=>{
   wrapped(profile.map(([y,r])=>Array.from({length:steps},(_,i)=>{
    const angle=i*TAU/steps;return add(rotate([r*Math.cos(angle),y,r*Math.sin(angle)*depth],...angles),pos);
   })),color);
  };
  const orb=(pos,[x,y,z],color,steps=10,rings=7)=>lathe(pos,Array.from({length:rings+1},(_,i)=>{
   const a=i*Math.PI/rings;return [-Math.cos(a)*y,Math.max(.004,Math.sin(a)*x)];
  }),color,steps,[],z/x);
  const ring=(pos,r,t,color,angles=[0,Math.PI/2],steps=18)=>{
   const rows=Array.from({length:6},(_,j)=>Array.from({length:steps},(_,i)=>{
    const a=i*TAU/steps,b=j*TAU/6;return add(rotate([(r+t*Math.cos(b))*Math.cos(a),t*Math.sin(b),(r+t*Math.cos(b))*Math.sin(a)],...angles),pos);
   }));wrapped(rows,color,true);
  };
  const bar=(from,to,r,color,steps=6)=>{
   const y=unit(sub(to,from)),x=unit(cross(y,Math.abs(y[2])>.92?[1,0,0]:[0,0,1])),z=cross(x,y);
   wrapped([from,to].map(p=>Array.from({length:steps},(_,i)=>add(p,add(mul(x,r*Math.cos(i*TAU/steps)),mul(z,r*Math.sin(i*TAU/steps)))))),color);
  };
  const poly=(points,indexes,color)=>{for(const ids of indexes)face(ids.map(i=>points[i]),color);};
  return {faces,prism,box,lathe,orb,ring,bar,poly};
 }
 const tint=(rgb,k,shine)=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*k+(255-v)*shine))).toString(16).padStart(2,'0')).join('');
 const light=unit([-.53,.75,.82]),highlight=unit([-.27,.40,1]),colors=new Map();
 const coord=v=>Math.round(v*10)/10;
 function normalOf(v){
  // A whole-face normal handles concave outlines (heart, star, crescent) as well as quads.
  let x=0,y=0,z=0;
  for(let i=0;i<v.length;i++){
   const a=v[i],b=v[(i+1)%v.length];
   x+=a[1]*b[2]-a[2]*b[1];y+=a[2]*b[0]-a[0]*b[2];z+=a[0]*b[1]-a[1]*b[0];
  }
  return unit([x,y,z]);
 }
 function draw(faces,{yaw=.38,pitch=.23,roll=-.09,scale=46,x=80,y=79,depth=7,oblique}={}){
  const projected=[],camera=oblique?unit([-oblique[0],oblique[1],1]):[0,0,1];
  for(const face of faces){
   const v=face.vertices.map(p=>rotate(p,yaw,pitch,roll));
   const normal=normalOf(v);
   if(dot(normal,camera)<=.005)continue;
   let rgb=colors.get(face.color);
   if(!rgb){rgb=face.color.match(/[0-9a-f]{2}/gi).map(c=>parseInt(c,16));colors.set(face.color,rgb);}
   const dif=Math.max(0,dot(normal,light)),shine=Math.pow(Math.max(0,dot(normal,highlight)),13)*.25;
   const fill=tint(rgb,.55+dif*.55,shine);
   const d='M'+v.map(([a,b,z])=>{
    const k=oblique?scale:scale*depth/(depth-z);
    return coord(x+(a+(oblique?.[0]||0)*z)*k)+' '+coord(y+(-b+(oblique?.[1]||0)*z)*k);
   }).join('L')+'Z';
   projected.push({z:v.reduce((t,p)=>t+p[2],0)/v.length,d,fill});
  }
  return projected.sort((a,b)=>a.z-b.z).map(({d,fill})=>'<path fill="'+fill+'" stroke="'+fill+'" d="'+d+'"/>').join('');
 }
 window.exstraMeshV229=Object.freeze({mesh,draw});
})();
