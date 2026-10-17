/* Original code-native artwork: shared sculpted shapes, per-expression features.
 * No fonts, downloaded pictures, raster sheets, filters or perpetual animation. */
(()=>{'use strict';const catalog=window.exstraEmojiCatalogV182;if(!catalog)return;let serial=0;
 const p=(d,fill='#5a2914',stroke='',width=2)=>'<path d="'+d+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"':'')+'/>';
 const e=(x,y,rx,ry,fill,extra='')=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" '+extra+'/>';
 const line=(d,color='#7b3c12',w=2.5)=>p(d,'none',color,w),g=(part,content)=>'<g data-emoji-part="'+part+'">'+content+'</g>';
 const heart=(x,y,size=1)=>'<g transform="translate('+x+' '+y+') scale('+size+')">'+p('M0 4C-8-5-15 4-9 11L0 19 9 11C15 4 8-5 0 4Z','url(#IDheart)')+line('M-8 5q1-4 5-3','#fff5',2)+'</g>';
 const star=(x,y,s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('m0-12 4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1Z','#ffea71')+'</g>';
 const drop=(x,y,s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('M0-9C-12 3-9 13 0 13S12 3 0-9Z','url(#IDwater)')+e(-2,1,1.5,4,'#ffffff85')+'</g>';
 function eye(x,type){const y=45;
  if(['happy','sleep','squeeze'].includes(type))return line(type==='happy'?'M'+(x-9)+' 46q9-10 18 0':type==='sleep'?'M'+(x-8)+' 44q8 6 16 0':'m'+(x-7)+' 40 11 6-11 6','#6d391b',3.8);
  if(type==='heart')return g('hearts',heart(x,36,.86));if(type==='star')return g('hearts',star(x,45,.86));
  if(type==='money')return '<text x="'+x+'" y="52" text-anchor="middle" font-size="24" font-family="system-ui" font-weight="900" fill="#4d3510">$</text>';
  if(type==='spiral')return e(x,45,10,12,'#f5cce8')+line('M'+(x-7)+' 47c-5-14 14-18 14-4 0 10-13 9-11 1 1-5 8-4 6 1','#7655bb',3);
  if(type==='cucumber')return e(x,45,11,12,'#75bd73')+e(x,45,8,9,'#def0ac')+line('m'+(x-4)+' 43 3-2m5 5-2 2','#83b56e',2);
  let result=e(x,y,type==='wide'?10:9,12,'#fffdf1')+e(x+.2,type==='roll'?39:type==='side'?46:47,5.5,7.3,'url(#IDiris)')+e(x+.5,type==='roll'?39:type==='side'?46:47,3,4.3,'#301808')+g('shine',e(x-1.8,type==='roll'?36:43,2.1,2.6,'#fff')+e(x+2,49,1,1,'#ffe6a2'));
  if(['side','tired'].includes(type))result+=p('M'+(x-11)+' 32h22v11q-10 1-22-2Z','url(#IDskin)')+line('M'+(x-9)+' 42h18','#c98519',1.8);
  if(['sad','wet','cry'].includes(type))result+=line(x<50?'M'+(x-9)+' 31q8 0 13-6':'M'+(x-4)+' 25q5 6 13 6','#966019',3);
  if(type==='angry')result+=p(x<50?'M24 31 46 38 44 43 26 37Z':'M76 31 54 38 56 43 74 37Z','#69371d');
  if(type==='wet')result+=e(x,51,8,5,'#a6e3f7b0')+e(x-3,49,3,1.5,'white');
  return result;
 }
 function eyes(type){if(type==='glasses')return g('glasses',p('M20 38h27l-2 15q-18 10-23-3Zm33 0h27l-2 12q-5 13-23 3Z','#202029')+line('M46 41h9','#202029',4)+line('m27 42 9 0m26 0h9','#647487',3));if(type==='wink')return eye(36,'normal')+line('M56 44q8-7 17 1','#6d391b',3.5);return g('eyes',eye(36,type)+eye(64,type));}
 function mouth(type){switch(type){
  case 'none':return '';case 'smile':return line('M39 64q11 10 22 0','#8a4115',3);case 'smirk':return line('M37 65q18 8 29-5','#7f3714',3);case 'flat':return line('M42 65h16','#845124',3);case 'frown':return line('M38 70q12-11 24 0','#905b26',3);case 'small':return e(50,66,4,2.4,'#89521e');case 'o':return g('mouth',e(50,66,8,11,'#74331c')+e(50,72,5,3,'#e86a62'));case 'cry':return g('mouth',p('M35 75c0-30 30-30 30 0Z','#70241b')+p('M41 58q9-7 18 0v4H41Z','#fff8ee')+e(50,74,9,5,'#f7797a'));
  case 'kiss':return p('M47 60q12 2 5 6 7 5-5 6l-4-5Z','#c94859');case 'tongue':return p('M35 60q16 13 30-2c0 26-30 27-30 2Z','#73371f')+p('M46 68q6-3 13 1v10c0 12-16 11-16 0Z','#f86d87')+line('M51 73v9','#d94262',1.5);
  case 'zip':return p('M29 61h42v9H29Z','#bbb5a5')+line('M32 65h34','#666560',2)+Array.from({length:9},(_,i)=>line('M'+(33+i*4)+' 62v6','#f3f0de',1)).join('')+p('m67 65 9 10-3 4-9-11Z','#b1b1ac');
  case 'grit':return p('M30 60q20-7 40 0v10q-20 9-40 0Z','#fffaf0')+line('M32 65h36','#bf9e61',1)+[38,46,54,62].map(x=>line('M'+x+' 59v13','#d6c6a0',1)).join('');
  case 'tooth':return line('M36 64q14 12 28 0')+p('M43 65h14v10H43Z','#fff');case 'wobble':return line('m34 70 5-5 6 4 6-5 6 5 7-3','#be5843',4);
  default:return g('mouth',p('M31 59q19 9 38-1c-1 30-36 32-38 1Z','#6e291b')+p('M35 60q15 5 30 0l-3 8q-12 4-24 0Z','#fffdf3')+p('M40 78q10-10 21 0-10 7-21 0Z','#ef6b72'));
 }}
 const fist=(x,y,fill='url(#IDskin)',s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('M-13-5q-2-12 5-11 5-3 8 0 5-3 9 1 9-1 9 8v12q-4 10-17 8-13 0-14-12Z',fill)+line('M-6-11v10m8-10v10m8-8v9','#c68b25',1.4)+'</g>';
 const hands=()=>g('hand',fist(37,78,'url(#IDskin)',.65)+fist(64,78,'url(#IDskin)',.65));
 function gesture(id){const skin='url(#IDskin)';let shape='';
  const palm=p('M31 54q-4-13 7-14h28q10 1 8 14l-5 27H38Z',skin);
  if(id==='heart-hands')return heart(50,35,1.5)+p('M14 67 27 48q8-10 18-15 8-4 9 4 0 4-9 9l-8 12 17 13-14 15-19-7Z',skin)+p('M86 67 73 48q-8-10-18-15-8-4-9 4 0 4 9 9l8 12-17 13 14 15 19-7Z',skin);
  if(id==='fist')return fist(49,53,skin,1.65);
  if(id==='thumb')return p('M20 47h20v40H20Zm21 40V46l12-28q5-11 13-5 5 4 2 13l-4 16h15q12 0 8 14l-8 25q-2 6-10 6Z',skin)+line('M40 49v35','#c88a24',2);
  if(id==='muscle')return p('M13 66q9-33 20-18l9 14 16-11 3-22-12-7 6-14 21 9q7 6 5 15l-3 43q-29 23-65 4Z',skin)+line('M34 65q8-8 15 1m9-13q11 7 8 21','#c98623',3);
  if(['peace','rock','call','up','ok','fingers-crossed'].includes(id)){
   shape=palm;
   if(id==='peace')shape+=p('M34 49 22 15q-2-9 7-10 5 0 8 8l10 30 5-34q1-9 10-7 6 2 4 11l-7 35Z',skin);
   if(id==='rock')shape+=p('M29 53 24 14q0-10 9-10 6 0 7 10l4 30h16l5-32q1-9 9-7 6 1 5 10l-4 44Z',skin);
   if(id==='call')shape+=p('M34 50 18 35q-8-7-14 1-3 5 3 11l25 26m27-23 8-37q2-10 10-8 7 2 5 12l-6 48Z',skin);
   if(id==='up')shape+=p('M39 49V12q0-10 9-10t9 10v39Z',skin);
   if(id==='fingers-crossed')shape+=p('m38 51 16-39q4-9 11-5 6 4 1 13L50 54Z',skin)+p('M49 51 38 16q-4-10 4-13 7-3 10 6l13 43Z',skin)+line('m45 30 15-5','#c88a24',2);
   if(id==='ok')shape+=p('M52 50 59 17q3-8 10-5 6 2 3 11l-4 25 9-21q4-8 10-4 4 3 0 12L74 64Z',skin)+p('M25 50c-14-25 24-40 30-15 4 19-18 26-22 11l-6 10Zm7-14c-2 12 10 14 12 5 3-11-10-16-12-5Z',skin);
   return shape+line('M43 61q12-7 21 1','#d1942b',2);
  }
  if(id==='manicure')return palm+[27,39,51,63].map((x,i)=>p('M'+x+' 57V'+(18-i%2*5)+'q0-8 8-8t8 8v38Z',skin)+p('M'+(x+1)+' '+(18-i%2*5)+'v-9h6v9Z','#ed52a4')).join('')+p('m74 34 7-22 10 3-7 22Z','#ef5caa');
  const single=p('M35 71V31q0-10 7-10 5 0 5 6V16q0-9 7-9t7 9v10q0-10 7-10t7 10v7q0-8 6-8 7 0 7 9v39q-3 17-27 17-20-1-26-19Z',skin)+line('M48 34v24m13-24v22m14-17v18','#d3972d',1.7);
  if(id==='prayer')return '<g transform="rotate(-14 50 50) scale(.8) translate(0 8)">'+single+'</g><g transform="translate(100 0) scale(-.8 .8) rotate(-14 50 50) translate(0 8)">'+single+'</g>';
  if(id==='raise'||id==='clap')return '<g transform="translate(-10 9) scale(.72)">'+single+'</g><g transform="translate(107 9) scale(-.72 .72)">'+single+'</g>'+line(id==='clap'?'M40 11v-8m13 8 5-7m6 15 8-3':'M10 8v12m80-12v12','#e7ac25',3);
  return single;
 }
 function background(prop){if(['flame','firecat','aura'].includes(prop))return p('M14 80C-4 58 10 39 16 29l2 17c9-13 9-22 16-38l9 18L53 0l7 26 15-13-1 25 15-9c5 22 14 40-3 54Z',prop==='aura'?'#b38df2':'#ff8b25')+p('M20 78q-7-26 14-47l3 17L54 18l6 28 13-7q15 20 9 41Z',prop==='aura'?'#e4cbff':'#ffe082');if(prop==='ufo')return p('m30 17-21 68q41 16 82-1L70 17Z','#9bf4b8aa');if(prop==='frog')return e(50,50,43,44,'#73a63a')+e(22,17,12,14,'#91bf50')+e(78,17,12,14,'#91bf50')+e(22,15,7,8,'#fff')+e(78,15,7,8,'#fff')+e(22,14,3,4,'#1f3515')+e(78,14,3,4,'#1f3515');if(['wolf','dog'].includes(prop))return p('M12 52 8 5l25 15q17-12 34 0L92 5l-4 49v30H12Z',prop==='wolf'?'#d9e3eb':'#9b6e49')+p('m15 13 15 12-13 7m68-19L70 25l13 7','#f9e5ca');return '';}
 function props(prop){const skin='url(#IDskin)',purple='#9b79de';switch(prop){
  case '':case 'pale':case 'flame':return '';
  case 'knuckles':case 'nails':return hands();case 'headhands':return fist(20,23,skin,.8)+fist(80,23,skin,.8);case 'cheeks':return fist(20,66,skin,.85)+fist(80,66,skin,.85);
  case 'love':return g('hearts',heart(18,17,.7)+heart(82,29,.65)+heart(27,80,.5));case 'kiss':return g('hearts',heart(76,64,.8));
  case 'tears':case 'bigtears':return g('tears',drop(20,63,.7)+drop(80,63,.7));case 'sweat':return g('tears',drop(80,25,.8));
  case 'pray':return '<g transform="translate(13 45) scale(.74)">'+gesture('prayer')+'</g>';
  case 'shush':return g('hand',p('M47 88V60q0-7 7-7t6 7v17q9-4 12 4l-3 14H48Z',skin));case 'think':return g('hand',p('M33 85 46 63q4-7 10-4 5 4 0 9l-3 5 13-1q12 3 3 12l-20 9Z',skin));
  case 'point':return '<g transform="translate(5 49) scale(.6) rotate(75 50 50)">'+gesture('up')+'</g>';
  case 'thumb':return g('hand','<g transform="translate(-3 42) scale(.52)">'+gesture('thumb')+'</g>');
  case 'question':return '<text x="78" y="25" font-size="29" font-weight="900" fill="#b473bb">?</text>';
  case 'zzz':return g('sleep','<text x="69" y="24" font-size="18" font-family="system-ui" font-weight="800" fill="#6d9fd8">Z<tspan dy="-10" font-size="13">z</tspan></text>');
  case 'thermometer':return p('M34 74 68 60l4 7-34 14Z','#fcfaf0')+line('m39 75 20-8','#f16b70',3)+p('M22 19q27-14 56 0l-4 9H25Z','#cbe6f1');
  case 'spectacles':case 'notes':return e(35,45,15,17,'none','stroke="#59452b" stroke-width="3"')+e(65,45,15,17,'none','stroke="#59452b" stroke-width="3"')+line('M49 44h2','#59452b',3)+(prop==='notes'?p('M24 70h51l-4 27H20Z','#e4d4b3')+line('M29 76h35m-35 6h27m-27 6h31','#ad9b7d',1.3)+p('m54 79 22-20 4 4-22 20Z','#634d27'):'');
  case 'bigheart':case 'smallheart':return g('hearts',heart(50,prop==='bigheart'?63:73,prop==='bigheart'?1.75:1))+fist(29,79,skin,.5)+fist(72,79,skin,.5);
  case 'couple':return '<g transform="translate(33 3) scale(.65)">'+e(50,50,32,33,skin)+eyes('happy')+mouth('smile')+'</g>'+p('M15 74q29 23 69-7l3 16q-44 27-75 6Z','#67cad5')+p('M81 75q-26 27-60 2L15 91q42 20 73-2Z','#d590bb');
  case 'aura':return star(11,27,.35)+star(87,64,.35)+star(80,7,.3);
  case 'explosion':return p('m12 24 12-12 9 4 9-14 11 12 13-9 5 12 15 3-4 19H20Z','#ffb143')+e(49,26,28,12,'#fff5c0')+e(29,12,10,9,'#ffb85b')+e(63,10,13,9,'#ffe29a');
  case 'ghost':return p('M72 31q-14-19-23-4-3 9 7 11l-5 10 11-6q22 0 10-11Z','#eee8db')+e(60,28,1.5,2,'#6d6c71')+e(67,29,1.5,2,'#6d6c71');
  case 'sigh':return p('M23 68q-20-9-22 1-2 9 11 6-8 10 4 11 8 0 9-9l12-2Z','#f4ede2');
  case 'curse':return p('M23 60h54v20H23Z','#393136')+'<text x="50" y="75" text-anchor="middle" font-size="14" font-weight="800" fill="white">$#%!</text>';
  case 'pie':return p('M11 39q17-29 48-16L42 66q-22 8-31-27Z','#e6e7e6')+e(30,37,19,22,'#fffcef')+p('M10 20q-10-8-9 3l7 7m35-11 7-8q4 14-3 19Z','#fff8e7');
  case 'bandage':return p('M18 29q31-18 65 5l-4 16q-29-20-62-7Z','#f1eee3')+line('M20 35q35-13 60 5','#d3cec5',2);
  case 'crossarms':return p('M20 86q11-17 54-9l8 15q-28 9-62-6Z',skin)+line('M33 78q16 7 34 9','#d3972c',2);
  case 'gum':return e(51,73,19,18,'url(#IDbubble)')+e(44,65,6,3,'#fff7');
  case '67':return '<text x="50" y="67" text-anchor="middle" font-size="54" font-weight="900" font-family="system-ui" fill="#f591c4" stroke="#f4b8d6" stroke-width="1">67</text>'+fist(24,80,skin,.55)+fist(78,80,skin,.55);
  case 'firecat':return p('m21 32 1-18 18 14m38 5-1-19-18 14',skin)+p('M72 68h19v22H72Z','#fff5df')+e(82,68,10,3,'#c0a58a')+line('M91 72q11-1 7 10h-7','#fff5df',3)+line('m31 62-16-3m16 8-15 3m53-8 16-3m-16 8 15 3','#72441e',1.5);
  case 'rofl':return g('tears',drop(16,72,.75)+drop(84,42,.65));
  case 'boxing':return fist(17,68,'url(#IDred)',.9)+fist(83,68,'url(#IDred)',.9)+p('M5 80h22v12H5Zm68 0h22v12H73Z','#f45946');
  case 'tea':return p('M35 62h30l-4 32H39Z','#d3ac70')+e(50,62,16,5,'#efd8af')+line('m51 69 8-30','#7b502f',3)+[43,51,58,46,55].map((x,i)=>e(x,78+i%3*4,2,2,'#554533')).join('');
  case 'slay':return p('M9 65h82v29H9Z',purple)+'<text x="50" y="85" text-anchor="middle" fill="white" font-size="20" font-family="system-ui" font-weight="900">SLAY</text>'+fist(10,69,skin,.47)+fist(90,69,skin,.47);
  case 'clown':return e(50,57,8,7,'url(#IDred)')+p('M24 35q12-23 22-5l-8-2-8 11Z','#409cdb')+p('M76 35Q64 12 54 30l8-2 8 11Z','#409cdb')+e(77,74,11,14,'#afbdc8')+e(77,72,8,11,'#eef6fb')+line('m72 86-5 11','#b5ad82',4);
  case 'wall':return p('M2 13h35v84H2Z','#aaa9a8')+[25,39,53,67,81].map(y=>line('M2 '+y+'h35','#7f8082',1)).join('')+line('M18 13v12m-7 0v14m17 0v14m-17 0v14m17 0v14m-17 0v16','#7f8082',1)+fist(34,69,skin,.55);
  case 'manhole':return p('M0 55h100v45H0Z','var(--emoji-cutout-v182,#1c1d22)')+e(50,60,43,10,'#66676d')+e(50,60,35,5,'#25232b')+fist(31,61,skin,.5)+fist(73,61,skin,.5)+e(49,37,39,7,'#98999e')+line('M19 36h61m-51-3h43','#c9c9cc',1.5);
  case 'fan':return e(24,65,10,11,'#bde7ee')+p('M23 65q-13-13-4-13 7 1 6 11 13-10 12-2-1 8-12 6 2 14-5 9-4-3 3-11Z','#74bacc')+line('m23 76-1 14','#71a9b6',5)+drop(77,23,.55);
  case 'rainbow':return ['#f95e73','#ffcf5f','#9bd67c','#6bc9d4','#ae94e6'].map((c,i)=>p('M'+(36+i*6)+' 65q2 20-10 32h8q12-13 8-32Z',c)).join('')+star(51,85,.35);
  case 'devil':return p('M18 30 16 8q8 5 17 13M82 30 84 8q-8 5-17 13','#9651cf');
  case 'cash':return p('m69 76 20-14 11 13-22 17Z','#91b956')+e(84,77,5,4,'#c2d982');
  case 'wine':return p('M8 51h24q0 23-12 23T8 51Z','#eef7f7')+p('M9 57h22q-2 15-11 15T9 57Z','#a92f56')+line('M20 73v16m-8 2h17','#d3cbac',2.5);
  case 'towel':return p('M17 27q-3-32 29-19 11-12 26 1 18 9 7 25Z','#fbf8ec')+line('M26 20q25-9 46 8M43 7q-2 10 19 17','#d0d5d5',3);
  case 'noodles':return p('M27 77h49q-3 21-25 21T27 77Z','#f4efe4')+[36,43,50,57,64].map(x=>line('M'+x+' 63q-7 17 3 17','#efc44f',2)).join('')+line('M20 58 63 76m-45-12 44 15','#97653a',2);
  case 'party':return p('m58 21 11-21 15 29Z',purple)+e(69,3,4,4,'#91d35b')+p('m41 66-27 10-3-6 27-10Z','#bd72c7')+p('m17 77-6 8-6-8 7-7Z','#6ccacc');
  case 'helmet':return e(50,51,43,44,'#d1eef130','stroke="#cce8ef" stroke-width="2"')+e(50,11,32,7,'#b8d3df')+line('M15 46q1-24 19-28','#fff8',3)+fist(22,83,skin,.6)+fist(78,83,skin,.6);
  case 'ufo':return e(50,12,32,8,'#7f9f9c')+e(50,8,19,10,'#c0d5cc')+e(50,12,35,5,'#7d9490')+e(35,11,3,1.5,'#e0ffe0')+e(63,11,3,1.5,'#e0ffe0');
  case 'dining':return line('M17 57v34m-5-43v12q5 8 10 0V48m-5 0v13m64-10v40m0-40q-11 16 0 21','#e6e0cc',3);
  case 'phone':return p('m12 44 16-2 4 40-17 2Z','#464952')+e(23,49,3,3,'#c4d7de')+fist(27,78,skin,.5)+fist(77,78,skin,.5);
  case 'ninja':return p('M16 18q37-25 68 0v65q-33 24-68 0Z','#3c4046')+p('M22 36q28-10 56 0l-5 18q-24 14-46 0Z',skin)+eye(36,'angry')+eye(64,'angry')+g('hand',p('M46 93V63q0-8 7-8t7 8v23Z',skin));
  case 'cheer':return p('m6 47 9-2 10 45-9 2Z','#ec83c9')+p('m85 44 9 2-10 46-9-2Z','#80cde3')+fist(23,84,skin,.52)+fist(77,84,skin,.52);
  case 'cigar':return p('m57 71 34-12 4 9-34 12Z','#986536')+p('m88 59 7-2 4 9-6 2Z','#f4b778')+p('M92 53q-15-10-5-18 10-5 2-13 21 7 6 21-5 5 1 10Z','#eee9d8')+line('m30 79 10 11 20 0 10-11','#e5bc32',5)+e(50,91,7,7,'none','stroke="#f6d150" stroke-width="3"');
  case 'makeup':return p('m16 80 5-23 6 2-4 22Z','#ed4b80')+p('m13 79 14 3-3 14-14-3Z','#a976a2')+fist(19,87,skin,.5)+fist(78,79,skin,.5);
  case 'flowers':return p('m30 76 41-1-16 23-11-1Z','#dab2bd')+Array.from({length:9},(_,i)=>e(30+i%3*17,67+Math.floor(i/3)*5,9,8,['#ce325e','#ef5775','#eb929c'][i%3])).join('')+p('m46 87 12 0-6 11Z','#f5e7d2');
  case 'bag':return p('M17 13h66v76q-33 14-66 0Z','#c4a17d')+eye(36,'sad')+eye(64,'sad')+drop(76,44,.55)+fist(21,84,skin,.6)+fist(80,84,skin,.6);
  case 'gossip':return p('m18 42 11 1 1 17-7 4q2 10 11 16l6-6 13 9q-5 14-13 10Q15 82 10 54Z','#d29cce')+fist(25,78,skin,.55);
  case 'cheek':return g('hand',p('M72 89V60q2-9 8-8 6 2 2 13l3 18-5 11Z',skin));
  case 'steam':return p('M29 66q-23-7-26 6 0 12 16 7L9 91q19 1 22-18Zm42 0q23-7 26 6 0 12-16 7l10 12q-19 1-22-18Z','#fff8e9');
  case 'hug':return p('M19 82 7 75q-10-8 0-11l10 5 1-13q0-7 7-4l8 20-1 15Z',skin)+p('M81 82 93 75q10-8 0-11l-10 5-1-13q0-7-7-4l-8 20 1 15Z',skin);
  case 'skull':return p('M15 47C9 0 92 0 85 47q0 18-17 24l-3 20H35l-3-20q-17-6-17-24Z','url(#IDbone)')+e(34,47,11,14,'#413531')+e(67,47,11,14,'#413531')+p('m50 61-6 9h12Z','#6e5e51')+[39,47,55,63].map(x=>line('M'+x+' 81v11','#8c7c6c',2)).join('');
  case 'frog':return '';case 'wolf':case 'dog':return e(50,23,17,11,prop==='dog'?'#9b6e49':'#d9e3eb')+e(50,26,5,4,'#514238')+(prop==='dog'?fist(16,78,skin,.5)+fist(85,78,skin,.5):'');
  case 'heart':return heart(50,23,2.8);
  default:if(prop.startsWith('hand-'))return g('hand',gesture(prop.slice(5)));throw Error('Missing emoji artwork: '+prop);
 }}
 function html(item){const id='ex182-'+(++serial)+'-',prop=item.prop,headless=prop.startsWith('hand-')||['67','heart','skull'].includes(prop),tint=prop==='devil'?['#e8c1ff','#bd7ee7','#8342af']:prop==='pale'?['#ededdf','#c6c9c7','#969c9c']:item.id==='curse'?['#ffad81','#f26942','#bd382b']:['#fff4a0','#ffcf43','#f2a111'];
  const defs='<defs><radialGradient id="IDskin" cx=".34" cy=".2" r=".85"><stop stop-color="'+tint[0]+'"/><stop offset=".55" stop-color="'+tint[1]+'"/><stop offset="1" stop-color="'+tint[2]+'"/></radialGradient><radialGradient id="IDiris" cx=".3" cy=".25"><stop stop-color="#a87941"/><stop offset="1" stop-color="#542e17"/></radialGradient><radialGradient id="IDheart" cx=".35" cy=".2" r=".9"><stop stop-color="#ff8b9e"/><stop offset=".4" stop-color="#f3456b"/><stop offset="1" stop-color="#c71d46"/></radialGradient><linearGradient id="IDwater" x2="0" y2="1"><stop stop-color="#c2f3ff"/><stop offset="1" stop-color="#48ade4"/></linearGradient><radialGradient id="IDred" cx=".3" cy=".2" r=".9"><stop stop-color="#ffae86"/><stop offset=".4" stop-color="#f65d45"/><stop offset="1" stop-color="#d7312b"/></radialGradient><radialGradient id="IDbubble"><stop stop-color="#ffd8ec"/><stop offset="1" stop-color="#f485c0"/></radialGradient><radialGradient id="IDbone" cx=".35" cy=".2" r=".9"><stop stop-color="#fffdf0"/><stop offset="1" stop-color="#c4b4a0"/></radialGradient></defs>';
  const face=headless?'':e(50,86,27,4,'#57331b18')+e(50,51,33,34,'url(#IDskin)')+e(29,58,7,4,'#f58d5a40')+e(72,58,7,4,'#f58d5a40')+eyes(item.eyes)+mouth(item.mouth)+(item.eyes==='cry'?g('tears',p('M28 50h10v32H28Zm34 0h10v32H62Z','url(#IDwater)')):'');
  return '<svg class="tele-emoji-art-v127 reaction-art-v126 exstra-emoji-art-v182" data-emoji-id="'+item.id+'" data-emoji-motion="'+item.motion+'" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">'+(defs+g('body',background(prop)+face+props(prop))).replaceAll('ID',id)+'</svg>';
 }
 const all=catalog.all.map(item=>Object.freeze({...item,color:item.group==='love'?'#f46b8d':'#ffcf43',get html(){return html(item);}})),byId=new Map(all.map(x=>[x.id,x]));
 // Preserve renderer/reaction API, not the retired artwork or picker.
 window.telechatEmojiArtV127=Object.freeze({all,get:token=>{const item=catalog.get(token);return item?byId.get(item.id):undefined;}});
})();
