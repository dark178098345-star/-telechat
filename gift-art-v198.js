/* The catalog stores only static previews; the open card can reproject the same solids. */
(()=>{
 'use strict';
 const renderer=window.exstraMeshV229;if(!renderer)return;
 const colors={violet:'#aa76ef',blue:'#53a9f1',cyan:'#59d5de',rose:'#f075b2',amber:'#efb251',red:'#f76b72',
  green:'#68cfab',orange:'#f69a63',indigo:'#8999f5',black:'#697ea7'};
 const gold='#f7c66c',metal='#aebdd9',dark='#334266',cream='#f8eee2',ink='#232641';
 const PI=Math.PI,R=PI/2,P=[0,R],models=new Map(),previews=new Map();
 const add=(id,color,build)=>models.set(id,{color:colors[color],build});
 const gem=(m,pos,r,c)=>m.lathe(pos,[[-r,0.015],[-r*.14,r*.65],[r*.12,r*.81],[r*.42,r*.43]],c,6);
 const ball=(m,pos,r,c)=>m.orb(pos,[r,r,r],c);
 const star=(m,pos,r,c,k=5,depth=.16)=>m.prism(Array.from({length:2*k},(_,i)=>{
  const a=i*PI/k+R,s=i%2?r*.40:r;return [s*Math.cos(a),s*Math.sin(a)];
 }),depth,c,pos);
 const disk=(m,pos,r,d,c,steps=16,angle=P)=>m.lathe(pos,[[-d/2,r*.93],[-d*.29,r],[d*.29,r],[d/2,r*.93]],c,steps,angle);
 const line=(m,points,r,c)=>points.slice(1).forEach((p,i)=>m.bar(points[i],p,r,c));
 const badge=(m,pos,outline,c,depth=.24)=>m.prism(outline,depth,c,pos);
 const crest=[[-.94,.36],[-.43,.07],[0,.64],[.43,.07],[.94,.36],[.65,-.49],[-.65,-.49]];
 const crescent=(m,pos,r,c)=>{
  const p=Array.from({length:19},(_,i)=>{const a=(.23+i*1.54/18)*PI;return [r*Math.cos(a),r*Math.sin(a)];});
  const lo=p.at(-1),hi=p[0];
  for(let i=1;i<14;i++){const t=i/14,u=1-t;p.push([u*u*lo[0]-r*1.38*u*t+t*t*hi[0],u*u*lo[1]+t*t*hi[1]]);}
  badge(m,pos,p,c,r*.35);
 };
 const heart=(m,pos,r,c)=>badge(m,pos,Array.from({length:32},(_,i)=>{
  const a=i*PI/16;return [r*.0625*16*Math.sin(a)**3,r*.063*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))+.16];
 }),c,r*.63);
 const ears=(m,c,fox=false)=>{
  if(fox)badge(m,[0,-.02,0],[[-.72,.21],[-.51,-.35],[0,-.77],[.51,-.35],[.72,.21],[.34,.56],[-.34,.56]],c,.64);
  else m.orb([0,-.1,0],[.78,.64,.55],c,12,8);
  for(const s of [-1,1]){
   badge(m,[s*.53,.52,.02],[[-.25,-.23],[.25,-.23],[s*.15,.49]],c,.48);
   badge(m,[s*.55,.54,.277],[[-.13,-.16],[.13,-.16],[s*.09,.24]],fox?'#c46b73':'#ed9ed0',.022);
   m.orb([s*.25,-.07,fox ? .43 : .51],[.096,.074,.034],ink,8,4);
  }
  m.orb([0,-.31,fox ? .44 : .52],[.115,.075,.042],ink,8,5);
  if(fox)badge(m,[0,-.40,.32],[[-.47,.24],[0,.09],[.47,.24],[.25,.02],[0,-.37],[-.25,.02]],cream,.035);
  else crescent(m,[.15,.25,.46],.17,gold);
 };
 const comet=(m,c,stony=false)=>{
  m.orb([.31,-.29,.13],[.55,.53,.45],c,stony?8:12,stony?5:8);
  for(let i=0;i<3;i++){const o=i*.2;m.bar([-.97+o,.78+o*.1,-.26],[.12+o,-.18+o,.03],.047+(2-i)*.023,i===1?c:metal,5);}
  if(stony){m.orb([.35,-.20,.53],[.14,.12,.047],dark,7,4);gem(m,[.66,-.58,.31],.19,'#99b3e4');}
  else star(m,[.78,.53,-.01],.15,'#d0ffff',4);
 };
 const crown=(m,c,quantum=false)=>{
  badge(m,[0,.08,0],crest,c,.53);m.box([0,-.40,0],[1.39,.25,.66],quantum?metal:gold);
  gem(m,[0,.02,.38],.23,quantum?'#86eaff':'#ef88b6');
  for(const s of [-1,1])ball(m,[s*.91,.45,0],.116,quantum?'#a8ddff':gold);
  ball(m,[0,.72,0],.13,quantum?c:gold);
  if(!quantum)m.ring([0,-.23,0],1.05,.027,'#d8b16d',[.12,.4],22);
 };
 const hourglass=(m,c,pos=[0,0,0],s=1)=>{
  const [x,y,z]=pos,shell=(h,r)=>[h*s,r*s];
  m.lathe(pos,[shell(-.87,.56),shell(-.62,.49),shell(-.29,.27),shell(0,.11),shell(.29,.27),shell(.62,.49),shell(.87,.56)],c,12);
  for(const sign of [-1,1])disk(m,[x,y+sign*.86*s,z],.64*s,.16*s,gold,12,[]);
  for(const a of [.3,2.39,4.49])m.bar([x+.56*s*Math.cos(a),y-.85*s,z+.56*s*Math.sin(a)],[x+.56*s*Math.cos(a),y+.85*s,z+.56*s*Math.sin(a)],.052*s,metal,5);
  gem(m,[x,y+.04*s,z+.18*s],.19*s,'#ffe7a8');
 };
 add('spark_seed','violet',(m,c)=>{gem(m,[0,.05,0],1.08,c);m.ring([0,-.17,0],1.06,.045,'#ceb0ff',[.05,.37],20);star(m,[.9,.75,0],.18,'#e5c5ff',4);});
 add('comet_drop','cyan',(m,c)=>comet(m,c));
 add('tiny_orbit','indigo',(m,c)=>{ball(m,[0,.06,0],.68,c);m.ring([0,.02,0],1.03,.077,'#c0c7fa',[.38,.30],24);m.orb([-.21,.20,.60],[.15,.12,.056],dark,8,5);star(m,[.83,.72,0],.17,'#dce1ff',4);});
 add('crystal_dust','blue',(m,c)=>{gem(m,[.18,.13,-.12],1.02,c);gem(m,[-.55,-.23,.17],.64,'#84dafa');gem(m,[.57,-.51,.28],.41,'#abdefb');star(m,[-.65,.80,0],.14,cream,4);});
 add('nova_heart','rose',(m,c)=>{heart(m,[0,-.02,0],.96,c);star(m,[.94,.64,0],.16,'#ffd5ef',4);star(m,[-.88,-.46,.04],.12,'#ffbbd8',4);});
 add('star_compass','amber',(m,c)=>{disk(m,[0,-.02,0],.82,.32,c);disk(m,[0,-.02,.185],.67,.06,dark);m.ring([0,-.02,.23],.65,.041,gold);star(m,[0,-.02,.225],.56,'#f8df9b',4,.075);ball(m,[0,-.02,.32],.11,c);m.ring([0,.85,0],.17,.047,metal);});
 add('dream_capsule','cyan',(m,c)=>{const angle=[0,0,-.39];m.lathe([0,0,0],[[-1,.20],[-.83,.43],[.04,.43],[.82,.43],[1,.18]],c,14,angle);
  m.lathe([0,0,0],[[-.88,.408],[-.74,.443],[.02,.445]],'#3386ad',14,angle);
  disk(m,[0,0,0],.451,.08,metal,14,angle);star(m,[.19,-.46,.44],.19,'#b3f5fa',4);});
 add('cosmic_flower','rose',(m,c)=>{m.bar([0,-.96,0],[0,.27,0],.096,'#5fb5a1');for(let i=0;i<7;i++){
  const a=i*2*PI/7;m.orb([.56*Math.cos(a),.18+.56*Math.sin(a),.025],[.29,.27,.16],i%2?c:'#e99dd1',10,6);
 }ball(m,[0,.18,.18],.28,gold);m.orb([-.23,-.57,.05],[.25,.13,.12],'#7ed2a6',9,6);});
 add('night_lantern','amber',(m,c)=>{m.lathe([0,0,0],[[-.64,.39],[-.41,.46],[.45,.53],[.64,.40]],c,8);
  for(const y of [-.68,.62])disk(m,[0,y,0],.58,.14,metal,8,[]);
  for(let i=0;i<6;i++){const a=i*PI/3;m.bar([.44*Math.cos(a),-.61,.44*Math.sin(a)],[.53*Math.cos(a),.55,.53*Math.sin(a)],.044,dark);}
  m.ring([0,.81,0],.19,.05,gold);});
 add('pixel_moon','violet',(m,c)=>{badge(m,[0,0,0],[[-.69,-.46],[-.69,.42],[-.45,.42],[-.45,.66],[-.18,.66],[-.18,.89],[.55,.89],[.55,.61],[.26,.61],[.26,.38],[.04,.38],[.04,-.40],[.33,-.40],[.33,-.58],[.63,-.58],[.63,-.79],[-.42,-.79],[-.42,-.46]],c,.43);star(m,[.67,.22,.10],.28,'#e5caff',4,.18);});
 add('galaxy_cup','amber',(m,c)=>{m.lathe([0,.09,0],[[-.32,.22],[-.20,.36],[.67,.68],[.75,.68],[.75,.54],[.43,.50],[.25,.34]],c,14);
  m.bar([0,-.29,0],[0,-.88,0],.12,gold);disk(m,[0,-.85,0],.49,.17,gold,12,[]);
  for(const s of [-1,1])m.ring([s*.6,.35,0],.35,.074,gold);star(m,[0,.26,.51],.31,'#ffecb0',4);});
 add('stellar_key','blue',(m,c)=>{m.ring([-.27,.53,0],.36,.13,metal);gem(m,[-.27,.53,.03],.31,c);
  line(m,[[-.10,.18,0],[.64,-.78,0],[.41,-.94,0]],.108,c);m.bar([.43,-.47,0],[.16,-.65,0],.09,metal);});
 add('meteor_skate','red',(m,c)=>{m.box([0,0,0],[1.98,.18,.77],c,[0,0,.21]);m.box([0,.09,0],[1.88,.045,.69],ink,[0,0,.21]);
  for(const x of [-.63,.62]){m.bar([x,-.22+x*.22,-.42],[x,-.22+x*.22,.42],.065,metal);
   for(const z of [-.41,.41])disk(m,[x,-.25+x*.22,z],.19,.17,gold,10);
  }star(m,[.54,.18,.39],.18,cream,4);});
 add('orbit_crown','amber',(m,c)=>crown(m,c));
 add('lunar_cat','violet',(m,c)=>ears(m,c));
 add('nebula_fox','orange',(m,c)=>ears(m,c,true));
 add('space_whale','cyan',(m,c)=>{m.orb([-.22,-.05,.02],[.79,.51,.55],c,12,8);m.orb([-.22,-.24,.08],[.62,.30,.48],'#a5ebe7',12,7);
  m.orb([.53,.06,-.06],[.48,.23,.27],c);badge(m,[.84,.41,-.07],[[-.37,.17],[0,.08],[.36,.21],[.20,-.14],[.02,-.29],[-.20,-.15]],c,.25);
  badge(m,[-.2,-.30,.43],[[-.16,.12],[.44,.06],[.29,-.28]],'#397f9d',.18);ball(m,[-.53,.04,.519],.065,ink);
  for(const s of [-1,1])m.bar([-.61,.38,.05],[-.61+s*.20,.72,.07],.035,'#caffff');});
 add('astro_radio','green',(m,c)=>{m.box([0,-.13,0],[1.76,1.15,.66],c);m.box([0,-.13,.35],[1.53,.93,.072],dark);
  disk(m,[-.37,-.1,.42],.34,.11,metal);disk(m,[-.37,-.1,.495],.245,.045,ink);disk(m,[-.37,-.1,.53],.12,.044,c);
  m.box([.43,.08,.425],[.39,.16,.08],'#c7f8a9');disk(m,[.42,-.32,.43],.14,.12,gold);
  line(m,[[.56,.39,-.13],[.87,1,-.13]],.035,metal);line(m,[[-.63,.42,0],[-.63,.58,0],[-.14,.58,0],[-.14,.42,0]],.054,c);});
 add('solar_dragon','orange',(m,c)=>{m.orb([-.27,-.32,0],[.54,.45,.40],c);m.orb([.28,.27,.08],[.47,.39,.35],c);
  m.box([.58,.15,.16],[.46,.30,.43],'#f4b378',[0,0,.07]);ball(m,[.42,.32,.398],.072,ink);
  line(m,[[-.6,-.35,0],[-.92,-.07,-.06],[-.84,.29,-.12]],.126,c);
  for(const s of [-1,1]){badge(m,[-.32,-.05,s*.24],[[-.06,-.08],[-.69,.40],[-.36,.64],[.18,.16]],'#dc654f',.14);
   m.bar([.11,.56,s*.14],[.02,.94,s*.21],.09,gold);
  }});
 add('gravity_cube','indigo',(m,c)=>{m.box([0,0,0],[1.44,1.44,1.44],c,[.08,.11,.07]);
  m.box([0,.73,0],[.88,.11,.88],metal);gem(m,[0,.91,0],.35,'#b8d6fd');
  m.ring([0,-.64,0],1.01,.046,'#a1b5ef',[.1,.12],24);});
 add('moon_castle','blue',(m,c)=>{m.box([0,-.49,0],[1.75,.22,1.2],metal);
  for(const [x,h,r] of [[-.57,.63,.28],[0,1.06,.35],[.57,.63,.28]]){
   m.lathe([x,-.45,0],[[0,r],[h,r]],c,8);
   m.lathe([x,h-.47,0],[[0,r*1.35],[.42,.012]],'#6659cf',8);
   m.box([x,h*.57-.46,r+.014],[.106,.17,.026],'#f7d882');
  }m.box([0,-.29,.365],[.29,.32,.06],dark);});
 add('time_relic','amber',(m,c)=>hourglass(m,'#9bd4e6'));
 add('void_guitar','red',(m,c)=>{badge(m,[-.19,-.37,0],[[-.54,.14],[-.41,.34],[-.08,.24],[.17,.41],[.42,.27],[.30,.035],[.53,-.23],[.37,-.52],[-.21,-.57],[-.54,-.37],[-.64,-.08]],c,.38);
  line(m,[[-.18,-.45,.06],[.1,.11,.06],[.63,1.04,.06]],.12,metal);
  badge(m,[.62,.87,.04],[[-.13,-.19],[.13,-.22],[.22,.21],[-.16,.17]],c,.23);
  for(let i=0;i<3;i++)m.bar([-.2+i*.055,-.48,.209],[.68+i*.045,.95,.20],.009,cream,4);
  m.box([-.11,-.30,.20],[.22,.08,.062],ink);});
 add('universe_seed','green',(m,c)=>{m.lathe([0,-.56,0],[[-.35,.44],[.1,.58],[.23,.61],[.26,.51]],'#597a8d',12);
  m.bar([0,-.37,0],[0,.64,0],.067,c);m.lathe([-.33,.32,0],[[-.45,.046],[-.22,.22],[.14,.23],[.41,.026]],c,10,[0,0,.61],.49);
  m.lathe([.29,.54,0],[[-.37,.043],[-.14,.16],[.15,.19],[.39,.022]],'#9aeb95',10,[0,0,-.72],.51);
  star(m,[.77,-.19,.04],.16,gold,4);});
 add('eternal_eclipse','black',(m,c)=>{disk(m,[0,.08,0],.83,.31,gold);ball(m,[-.15,.18,.13],.71,c);m.ring([0,0,0],1.06,.045,'#a6badb',[.03,.32],24);star(m,[.88,.79,.06],.15,cream,4);});
 add('aurora_core','violet',(m,c)=>{m.lathe([0,-.72,0],[[-.19,.60],[.18,.46]],metal,10);m.orb([0,.10,0],[.72,.74,.69],c,12,8);m.ring([0,.08,0],.71,.105,'#65e1d1',[.12,.37],22);star(m,[.12,.23,.665],.24,'#c7fff1',4);});
 add('red_eclipse','red',(m,c)=>{disk(m,[0,.05,0],.82,.38,c);m.orb([-.18,.22,.22],[.68,.68,.34],dark,12,7);crescent(m,[.26,-.08,.18],.69,'#ff8172');for(let i=0;i<8;i++){const a=i*PI/4;m.bar([.91*Math.cos(a),.91*Math.sin(a),0],[1.03*Math.cos(a),1.03*Math.sin(a),0],.031,gold,5);}});
 add('celestial_mask','rose',(m,c)=>{badge(m,[0,.02,0],[[-.91,.54],[-.46,.65],[0,.49],[.46,.65],[.91,.54],[.79,-.30],[.26,-.64],[0,-.49],[-.26,-.64],[-.79,-.30]],c,.48);
  for(const s of [-1,1])badge(m,[s*.37,.08,.34],[[-.25,.06],[0,.14],[.25,.06],[.08,-.10],[-.14,-.085]],ink,.045);
  gem(m,[0,-.08,.35],.27,metal);star(m,[0,.84,.03],.2,'#eab5f4',4);});
 add('chrono_moon','amber',(m,c)=>{crescent(m,[-.12,.06,0],.96,c);hourglass(m,'#a998e8',[.36,-.03,.29],.62);star(m,[.88,.71,0],.13,cream,4);});
 add('phoenix_orbit','orange',(m,c)=>{m.orb([0,-.07,0],[.39,.58,.27],c);ball(m,[.15,.48,0],.26,gold);
  for(const s of [-1,1])badge(m,[s*.43,.02,-.08],[[s*-.41,-.37],[s*.21,.42],[s*.58,.67],[s*.38,.08],[s*.18,-.15]],c,.21);
  badge(m,[0,-.46,.01],[[-.14,.26],[.19,.25],[.48,-.65],[.13,-.48],[-.04,-.71],[-.24,-.42]],gold,.18);
  m.ring([0,-.23,0],1.03,.032,'#ffc486',[.29,.31],24);});
 add('quantum_crown','blue',(m,c)=>crown(m,c,true));
 add('singularity_eye','black',(m,c)=>{m.orb([0,0,0],[1.04,.63,.39],metal,14,7);m.orb([0,0,.19],[.94,.45,.331],dark,14,7);
  m.orb([0,0,.45],[.42,.42,.19],c,12,8);disk(m,[0,0,.621],.24,.067,ink);star(m,[0,0,.676],.22,'#a8d4ff',4,.043);});
 add('frozen_supernova','cyan',(m,c)=>{const p=Array.from({length:12},(_,i)=>{const a=i*PI/6,r=i%2 ? .40 : 1.13;return [Math.cos(a)*r,Math.sin(a)*r];});
  badge(m,[0,0,0],p,c,.28);gem(m,[0,0,.25],.43,'#bcf5ff');gem(m,[0,0,-.26],.43,'#93d7f6');});
 add('black_comet','black',(m,c)=>comet(m,c,true));
 add('royal_satellite','indigo',(m,c)=>{m.box([0,0,0],[.66,.94,.68],metal);m.bar([-1,0,0],[1,0,0],.086,gold);
  for(const s of [-1,1]){m.box([s*.83,0,0],[.62,.83,.14],c);for(const y of [-.23,0,.23])m.box([s*.83,y,.079],[.55,.037,.02],'#c3d7fb');}
  m.lathe([0,.62,0],[[0,.31],[.14,.49],[.18,.47],[.08,.15]],c,14);ball(m,[0,.99,0],.087,gold);gem(m,[0,0,.39],.23,'#caf1ff');});
 add('dream_portal','violet',(m,c)=>{m.box([0,-.83,0],[1.57,.22,.72],metal);
  const arch=(r,b,col,depth,z)=>{const points=[[-r,b],[r,b],...Array.from({length:13},(_,i)=>[r*Math.cos(i*PI/12),r*Math.sin(i*PI/12)+.22])];badge(m,[0,0,z],points,col,depth);};
  arch(.75,-.73,c,.46,0);arch(.60,-.69,metal,.16,.25);arch(.49,-.64,'#553e8d',.11,.36);arch(.36,-.54,'#9464d7',.08,.43);
  star(m,[0,.13,.51],.24,'#e6ccff',4);});
 add('first_moon','amber',(m,c)=>{m.lathe([0,-.73,0],[[-.24,.65],[-.13,.62],[.15,.47]],c,10);ball(m,[0,.13,0],.72,'#ead399');
  for(const [x,y,z,r] of [[-.27,.13,.67,.16],[.34,.39,.58,.113],[.30,-.22,.54,.092]])
   m.orb([x,y,z],[r,r*.79,.053],'#bc9b6e',8,5);star(m,[.88,.64,.03],.16,'#ffeaa6',4);});
 add('fallback','violet',(m,c)=>{m.box([0,-.22,0],[1.40,1.04,1.07],c);m.box([0,.38,0],[1.54,.25,1.20],metal);
  m.box([0,-.12,.553],[.23,1.14,.07],gold);m.box([0,.52,0],[.22,.07,1.2],gold);for(const s of [-1,1])m.ring([s*.19,.68,0],.23,.067,gold);});

 function frame(id,yaw){
  const model=models.get(id),m=renderer.mesh();model.build(m,model.color);
  return '<ellipse cx="80" cy="136" rx="42" ry="5.5" fill="#201a34" opacity=".19"/>'+
   '<g stroke-width=".39" stroke-linejoin="round">'+renderer.draw(m.faces,{yaw,y:76})+'</g>';
 }
 const shell=(id,body)=>'<svg xmlns="http://www.w3.org/2000/svg" class="ex-gift-svg-v198" data-gift-art-v198="'+id+'" data-mesh-art-v229="" viewBox="0 0 160 160" aria-hidden="true" focusable="false">'+body+'</svg>';
 const resolve=value=>models.has(value)?value:'fallback';
 function html(value){
  return '<img class="ex-gift-svg-v198" data-gift-art-v198="'+resolve(value)+'" data-mesh-art-v229 width="160" height="160" alt="" aria-hidden="true" draggable="false" decoding="async">';
 }
 const pending=new Set(),owners=new WeakMap();
 let tick=0;
 function pump(){
  tick=0;const start=performance.now();let rendered=0;
  for(const img of pending){
   pending.delete(img);
   if(!img.isConnected)continue;
   if(observer&&!img.getClientRects().length){observer.observe(img);continue;}
   const id=resolve(img.dataset.giftArtV198);
   if(!previews.has(id))previews.set(id,'data:image/svg+xml,'+encodeURIComponent(shell(id,frame(id,.38))));
   img.src=previews.get(id);
   if(++rendered===3||performance.now()-start>5)break;
  }
  if(pending.size)tick=requestAnimationFrame(pump);
 }
 const schedule=()=>{if(pending.size&&!tick)tick=requestAnimationFrame(pump);};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);pending.add(entry.target);}
  schedule();
 },{rootMargin:'64px'}):null;
 function watch(root){
  if(!root)return;
  for(const previous of owners.get(root)||[]){observer?.unobserve(previous);pending.delete(previous);}
  const images=root.querySelectorAll('img[data-gift-art-v198]:not([src])');owners.set(root,images);
  for(const img of images){if(observer)observer.observe(img);else pending.add(img);}
  schedule();
 }
 function view(value,turn=0){const id=resolve(value);return shell(id,frame(id,.38+(Number.isInteger(turn)?turn%8:0)*PI/4));}
 window.exstraGiftArtV198=Object.freeze({html,view,watch,ids:()=>[...models.keys()].filter(id=>id!=='fallback')});
})();
