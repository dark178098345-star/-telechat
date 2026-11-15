/* Original code-native artwork: shared sculpted shapes, per-expression features.
 * No fonts, downloaded pictures, raster sheets, filters or perpetual animation. */
(()=>{'use strict';const catalog=window.exstraEmojiCatalogV182;if(!catalog)return;let serial=0;
 const p=(d,fill='#624439',stroke='',width=2)=>'<path d="'+d+'" fill="'+fill+'"'+(width===0?'':' stroke="'+(stroke||fill)+'" stroke-width="'+(stroke?width:.65)+'"')+' stroke-linecap="round" stroke-linejoin="round"/>';
 const e=(x,y,rx,ry,fill,extra='')=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" '+extra+'/>';
 const line=(d,color='#80502e',w=2.5)=>p(d,'none',color,w),g=(part,content)=>'<g data-emoji-part="'+part+'">'+content+'</g>';
 const heart=(x,y,size=1)=>'<g transform="translate('+x+' '+y+') scale('+size+')">'+p('M0 4C-7-6-18-1-13 10C-10 16-4 20 0 23C4 20 10 16 13 10C18-1 7-6 0 4Z','url(#IDheart)','',0)+p('M-10 6C-11 0-5-1-3 2C-7 1-8 5-8 8Z','#fff7','',0)+p('M9 12Q6 18 0 22Q8 18 11 11Z','#a9194726','',0)+'</g>';
 const star=(x,y,s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('M-2-9Q0-14 2-9L5-3 11-2Q15-1 11 2L6 6 7 12Q8 16 4 13L0 10-5 13Q-9 16-8 11L-6 6-11 2Q-15-1-11-2L-5-3Z','#ffe697')+'</g>';
 const drop=(x,y,s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('M0-9C-12 3-9 13 0 13S12 3 0-9Z','url(#IDwater)')+e(-2,1,1.5,4,'#ffffff85')+'</g>';
 function eye(x,type){
  if(type==='happy')return line('M'+(x-8)+' 46C'+(x-5)+' 37 '+(x+5)+' 37 '+(x+8)+' 46','#593622',3.7);
  if(type==='sleep')return line('M'+(x-8)+' 43Q'+x+' 50 '+(x+8)+' 43','#67432c',3.2);
  if(type==='squeeze')return line('M'+(x-6)+' 39Q'+(x+10)+' 44 '+(x-6)+' 50','#603a28',3.5);
  if(type==='heart')return g('hearts',heart(x,34,.73));if(type==='star')return g('hearts',star(x,44,.76));
  if(type==='money')return line('M'+(x+5)+' 37C'+(x-7)+' 30 '+(x-10)+' 45 '+x+' 45S'+(x+10)+' 60 '+(x-6)+' 53M'+x+' 31v28','#4a4427',2.9);
  if(type==='spiral')return e(x,45,10,11,'#eed9ff')+line('M'+(x-6)+' 47c-6-13 13-17 13-4 0 10-12 9-10 2 1-5 7-4 5 0','#8262c2',2.8);
  if(type==='cucumber')return e(x,45,11,12,'#7bbd83')+e(x,45,8,9,'#d8ecab')+line('m'+(x-4)+' 43 3-2m5 5-2 2','#83b56e',2);
  if(type==='cry')return line(x<50?'M27 45Q35 37 43 43':'M57 43Q65 37 73 45','#70432d',3.3)+line(x<50?'M25 29Q34 28 40 23':'M60 23Q66 28 75 29','#93612c',2.8);
  const tender=['sad','wet','wide','roll','angry'].includes(type),py=type==='roll'?39:45,rx=tender?5.5:4.9,ry=tender?7.4:7;
  let result=(tender?e(x,44,type==='wide'?9.8:8.8,type==='wide'?12.3:11.2,'#fff9e9'):'')+e(x+.5,py+.6,rx+.25,ry+.2,'#9f6b3225')+e(x,py,rx,ry,'url(#IDiris)')+g('shine',e(x-1.5,py-3,1.8,2.2,'#fffbed')+e(x+1.7,py+2.5,.8,1,'#e8bf82'));
  if(['side','tired'].includes(type))result=p('M'+(x-7)+' 40Q'+x+' 43 '+(x+7)+' 40Q'+(x+7)+' 53 '+x+' 53Q'+(x-7)+' 53 '+(x-7)+' 40Z','url(#IDiris)')+line('M'+(x-8)+' 39Q'+x+' 42 '+(x+8)+' 39','#79502e',2.5)+g('shine',e(x-1,45,1.4,1.4,'#fff5dc'))+(type==='tired'?line('M'+(x-6)+' 58q6 3 12 0','#bc843b',1.3):'');
  if(['sad','wet'].includes(type))result+=line(x<50?'M25 31Q34 30 41 24':'M59 24Q66 30 75 31','#98632b',2.8);
  if(type==='angry')result+=line(x<50?'M26 33Q35 35 43 40':'M74 33Q65 35 57 40','#69412c',3.5);
  if(type==='wet')result+=p('M'+(x-8)+' 50Q'+x+' 54 '+(x+8)+' 50Q'+(x+6)+' 58 '+x+' 57Q'+(x-6)+' 57 '+(x-8)+' 50Z','url(#IDwater)')+line('M'+(x-4)+' 53h6','#ffffffa6',1.4);
  return result;
 }
 function eyes(type){if(type==='glasses')return g('glasses',p('M22 37Q33 34 45 37Q48 38 46 46Q44 54 34 54T23 46Q20 39 22 37ZM55 37Q67 34 78 37Q80 39 78 46Q76 54 66 54T55 46Q53 38 55 37Z','url(#IDglasses)')+line('M46 40q4-2 9 0','#443946',3)+line('m27 40 10-1m24 1 10-1','#b2c3d594',2));if(type==='wink')return g('eyes',eye(36,'normal')+line('M57 46q7-8 14 0','#68402b',3.3));return g('eyes',eye(36,type)+eye(64,type));}
 function mouth(type){switch(type){
  case 'none':return '';case 'smile':return line('M37 63C43 73 57 73 63 63','#804326',3.2)+line('M35 61q0 4 3 5m27-5q0 4-3 5','#c18b43',1.2);case 'smirk':return line('M37 66Q54 74 66 61','#764126',3.1);case 'flat':return line('M42 66q8-1 16 0','#8e5b30',2.7);case 'frown':return line('M38 70Q50 59 62 70','#89562d',3);case 'small':return e(50,66,3.2,2.3,'#925b2c');case 'o':return g('mouth',e(50,67,7.2,9.7,'url(#IDmouth)')+e(50,73,4.8,2.4,'#ed8e8a'));case 'cry':return g('mouth',p('M36 70C36 52 64 52 64 70Q64 81 50 81T36 70Z','url(#IDmouth)')+p('M41 60Q50 55 59 60L60 64Q50 61 40 64Z','#fff7e7')+p('M40 76Q50 68 60 76Q50 84 40 76Z','#f08f99'));
  case 'kiss':return g('mouth',p('M45 61Q49 59 52 64Q58 60 58 65Q58 69 52 70Q49 75 45 71Q51 68 45 66Q50 65 45 61Z','#cc6a78'));case 'tongue':return g('mouth',p('M35 61Q50 68 65 61C65 84 35 84 35 61Z','url(#IDmouth)')+p('M45 70Q52 67 58 71V78C58 91 44 90 44 79Z','url(#IDtongue)')+line('M51 74v8','#cf6e82',1.3));
  case 'zip':return p('M29 61h42v9H29Z','#bbb5a5')+line('M32 65h34','#666560',2)+Array.from({length:9},(_,i)=>line('M'+(33+i*4)+' 62v6','#f3f0de',1)).join('')+p('m67 65 9 10-3 4-9-11Z','#b1b1ac');
  case 'grit':return g('mouth',p('M32 62Q50 54 68 62Q70 66 67 71Q50 79 33 71Q30 67 32 62Z','#9e6537')+p('M34 63Q50 57 66 63V69Q50 75 34 69Z','#fff9e9')+line('M35 66q15 2 30 0','#d6b98a',.9)+[41,50,59].map(x=>line('M'+x+' 61v11','#dac39a',.8)).join(''));
  case 'tooth':return line('M36 63q14 14 28 0')+p('M43 67Q50 70 57 67V73Q50 78 43 73Z','#fff9eb');case 'wobble':return line('M35 70q4-8 8-2t8 0 8 0 7-1','#aa5a42',3);
  default:return g('mouth',p('M33 60Q50 65 67 60C69 61 65 82 50 82S31 61 33 60Z','url(#IDmouth)')+p('M36 62Q50 66 64 62Q63 67 61 68Q50 71 39 68Z','#fff9ec')+p('M40 77Q50 70 60 77Q50 85 40 77Z','url(#IDtongue)'));
 }}
 const fist=(x,y,fill='url(#IDskin)',s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+p('M-14-3C-15-13-8-18-3-13C0-18 6-16 8-12C15-16 20-10 18-3V7C17 17 4 20-7 15Q-16 12-14-3Z',fill)+p('M-13 3Q-18-4-12-7Q-7-8-3-2L3 4Q5 10-1 11Q-8 11-13 3Z',fill)+line('M-5-10v8M3-11v10M11-8v9M-7 8q5 4 11 1','#c68b3d',1.3)+line('M-9-10q3-3 5-1M0-12q3-2 5 0','#fff1bf9c',1.2)+'</g>';
 const hands=()=>g('hand',fist(37,78,'url(#IDskin)',.65)+fist(64,78,'url(#IDskin)',.65));
 function gesture(id){const skin='url(#IDskin)',crease='#c49149';
  const finger=(x,y,w=13,h=43,angle=0)=>'<g transform="rotate('+angle+' '+(x+w/2)+' '+(y+h)+')">'+p('M'+x+' '+(y+h)+'V'+(y+w/2)+'a'+w/2+' '+w/2+' 0 0 1 '+w+' 0V'+(y+h)+'Z',skin)+line('M'+(x+4)+' '+(y+7)+'q2-2 5 0','#fff3d780',1.1)+'</g>';
  const palm=p('M29 52C29 42 39 39 48 42H65Q78 42 77 55L74 75Q71 88 54 88Q35 88 30 75Z',skin);
  const fold=p('M30 58C25 50 30 44 36 48L48 60Q53 67 47 71Q42 75 37 69Z',skin)+line('M39 71q11 4 20-4',crease,1.5);
  if(id==='heart-hands')return heart(50,35,1.15)+p('M12 64Q16 55 25 50L40 34Q46 29 50 34Q53 39 47 45L36 57Q31 61 37 65L49 74Q54 79 48 84Q41 88 34 82L23 76Q17 74 12 69Z',skin)+p('M88 64Q84 55 75 50L60 34Q54 29 50 34Q47 39 53 45L64 57Q69 61 63 65L51 74Q46 79 52 84Q59 88 66 82L77 76Q83 74 88 69Z',skin)+line('m26 57 9-8m39 8-9-8',crease,1.5);
  if(id==='fist')return fist(48,51,skin,1.7);
  if(id==='thumb')return p('M20 48H30Q35 48 35 53V80Q35 85 30 85H20Q15 85 15 80V53Q15 48 20 48Z',skin)+p('M38 79V51Q38 45 44 39Q51 31 52 20C53 9 66 10 66 20Q66 30 61 41H76Q86 41 85 50L79 76Q77 86 66 87H48Q38 87 38 79Z',skin)+line('M41 55v23M65 53h15m-16 10h14m-16 10h13',crease,1.3)+p('M55 20Q59 15 62 19L60 30Q55 32 54 28Z','#fff0bf80');
  if(id==='muscle')return p('M13 67C15 52 25 45 35 52Q41 56 42 64Q49 55 62 56L65 31Q54 32 49 25Q45 19 50 13Q55 6 62 12L74 18Q82 22 81 35L77 75Q69 89 48 90Q26 90 14 82Q9 77 13 67Z',skin)+line('M29 67q9-10 19 1m13-11q11 4 7 17M53 21q5 4 10 3',crease,2);
  if(['peace','rock','call','up','ok','fingers-crossed'].includes(id)){let fingers='';
   if(id==='peace')fingers=finger(29,9,13,47,-15)+finger(51,6,13,49,10);
   if(id==='rock')fingers=finger(24,9,13,48,-7)+finger(63,11,12,46,9)+finger(39,35,12,26)+finger(51,34,12,27);
   if(id==='call')fingers=finger(64,10,12,49,12)+p('M34 60 16 43Q9 38 7 44Q5 48 10 53L31 75Z',skin)+finger(34,36,13,28)+finger(47,37,13,28);
   if(id==='up')fingers=finger(38,6,14,51)+finger(53,35,12,25)+finger(64,40,11,22);
   if(id==='fingers-crossed')fingers=finger(50,7,13,49,19)+finger(37,10,13,46,-16)+line('m44 31 16-5',crease,1.4);
   if(id==='ok')return finger(49,11,13,49,8)+finger(63,20,12,43,17)+p('M31 45C12 15 58 11 58 39Q58 50 45 54Q37 57 34 49Q39 53 46 46Q52 39 46 34Q36 28 31 38Q29 42 34 48L44 58Q55 52 65 50Q79 48 75 64L70 79Q64 90 48 88Q30 87 26 75L23 60Q21 49 31 45Z',skin)+line('M42 65q12-7 22-2',crease,1.6);
   return fingers+palm+fold;
  }
  const openHand=[finger(22,23,12,40),finger(35,12,13,50),finger(49,8,13,54),finger(63,18,12,45)].join('')+p('M22 52Q22 46 30 47H70Q78 47 77 59L73 79Q69 91 50 91Q31 91 25 77L14 58Q10 51 16 48Q21 46 26 54L35 66',skin)+line('M35 69q13-9 27-1M36 48v12m14-13v12m14-11v13',crease,1.4);
  if(id==='manicure')return openHand+[22,35,49,63].map((x,i)=>p('M'+(x+2)+' '+([25,14,10,20][i])+'q4-5 8 0v8q-4 3-8 0Z',['#f586b9','#ee74a6','#cf6cba','#f58fb8'][i])).join('');
  if(id==='prayer')return '<g transform="translate(0 6) rotate(-16 50 65) scale(.76)">'+openHand+'</g><g transform="translate(100 6) scale(-.76 .76) rotate(-16 50 65)">'+openHand+'</g>'+line('M48 23v55',crease,1.1);
  if(id==='raise'||id==='clap')return '<g transform="translate(-5 15) scale(.65)">'+openHand+'</g><g transform="translate(105 15) scale(-.65 .65)">'+openHand+'</g>'+line(id==='clap'?'M43 15v-7m9 10 4-9m6 16 8-4':'M15 10v8m70-8v8','#e3af49',2.5);
  return openHand;
 }
 function background(prop){if(['flame','firecat','aura'].includes(prop))return p('M15 81C2 70 7 49 15 36Q17 33 18 38L20 47C30 34 28 18 34 13Q36 10 38 16L44 29Q47 27 51 9Q53 2 56 10L62 29Q68 25 73 20Q77 17 76 24L76 41Q81 37 86 36Q90 35 90 41C96 61 96 73 85 83Z',prop==='aura'?'#b38df2':'#ff8b25')+p('M22 79C16 64 24 46 31 40Q35 36 36 43L39 51Q46 44 52 31Q55 25 57 32L62 49Q69 43 72 44C81 51 86 69 80 81Z',prop==='aura'?'#e4cbff':'#ffe082');if(prop==='ufo')return p('m30 17-21 68q41 16 82-1L70 17Z','#9bf4b8aa');if(prop==='frog')return e(50,50,43,44,'#73a63a')+e(22,17,12,14,'#91bf50')+e(78,17,12,14,'#91bf50')+e(22,15,7,8,'#fff')+e(78,15,7,8,'#fff')+e(22,14,3,4,'#1f3515')+e(78,14,3,4,'#1f3515');if(['wolf','dog'].includes(prop))return p('M15 53C10 37 12 20 16 8Q18 4 23 9L35 22Q50 15 65 22L77 9Q82 4 84 8C88 20 90 37 85 53L83 75Q80 92 50 93T17 75Z',prop==='wolf'?'#c6d2e0':'#ac805b')+p('M19 14Q21 11 24 16L32 26Q25 27 20 34Z','#f4d9c4')+p('M81 14Q79 11 76 16L68 26Q75 27 80 34Z','#f4d9c4');return '';}
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
  case 'flowers':return e(26,69,6,12,'#78a577','transform="rotate(-32 26 69)"')+e(75,70,6,12,'#78a577','transform="rotate(32 75 70)"')+p('M27 75Q50 84 73 75L59 96Q50 101 41 96Z','#e4bccb')+[[32,65],[49,60],[66,65],[42,75],[58,75]].map(([x,y],i)=>'<g transform="translate('+x+' '+y+')">'+[0,72,144,216,288].map(angle=>e(0,-4,5.5,6,['#e75e85','#f184a2','#d94e7c'][i%3],'transform="rotate('+angle+')"')).join('')+e(0,0,4.5,4.5,'#f9abc0')+line('M-2-1q4-3 5 1','#ce567a',1)+'</g>').join('')+p('M43 89q7-5 14 0l-7 8Z','#fae8ef');
  case 'bag':return p('M17 13h66v76q-33 14-66 0Z','#c4a17d')+eye(36,'sad')+eye(64,'sad')+drop(76,44,.55)+fist(21,84,skin,.6)+fist(80,84,skin,.6);
  case 'gossip':return p('m18 42 11 1 1 17-7 4q2 10 11 16l6-6 13 9q-5 14-13 10Q15 82 10 54Z','#d29cce')+fist(25,78,skin,.55);
  case 'cheek':return g('hand',p('M72 89V60q2-9 8-8 6 2 2 13l3 18-5 11Z',skin));
  case 'steam':return p('M29 66q-23-7-26 6 0 12 16 7L9 91q19 1 22-18Zm42 0q23-7 26 6 0 12-16 7l10 12q-19 1-22-18Z','#fff8e9');
  case 'hug':return p('M20 82Q12 80 6 74C-2 66 4 61 10 66L17 71V57C17 48 25 49 27 56L33 73Q36 83 29 86Q24 87 20 82Z',skin)+p('M80 82Q88 80 94 74C102 66 96 61 90 66L83 71V57C83 48 75 49 73 56L67 73Q64 83 71 86Q76 87 80 82Z',skin)+line('M21 62v12m58-12v12','#d59a50',1.1);
  case 'skull':return p('M15 47C9 0 92 0 85 47q0 18-17 24l-3 20H35l-3-20q-17-6-17-24Z','url(#IDbone)')+e(34,47,11,14,'#413531')+e(67,47,11,14,'#413531')+p('m50 61-6 9h12Z','#6e5e51')+[39,47,55,63].map(x=>line('M'+x+' 81v11','#8c7c6c',2)).join('');
  case 'frog':return '';case 'wolf':case 'dog':return e(50,23,17,11,prop==='dog'?'#9b6e49':'#d9e3eb')+e(50,26,5,4,'#514238')+(prop==='dog'?fist(16,78,skin,.5)+fist(85,78,skin,.5):'');
  case 'heart':return heart(50,23,2.8);
  default:if(prop.startsWith('hand-'))return g('hand',gesture(prop.slice(5)));throw Error('Missing emoji artwork: '+prop);
 }}
 function html(item){const id='ex182-'+(++serial)+'-',prop=item.prop,headless=prop.startsWith('hand-')||['67','heart','skull','fire-symbol'].includes(prop),tint=prop==='devil'?['#f1dcff','#c89ce9','#9867c4']:prop==='pale'?['#fcfae9','#dfdfd1','#b2b6ae']:item.id==='curse'?['#ffd09d','#ff9361','#e05543']:['#fff1bd','#ffdb76','#efa83e'];
  const defs='<defs><radialGradient id="IDskin" cx=".34" cy=".24" r=".86"><stop stop-color="'+tint[0]+'"/><stop offset=".52" stop-color="'+tint[1]+'"/><stop offset="1" stop-color="'+tint[2]+'"/></radialGradient><radialGradient id="IDiris" cx=".35" cy=".25" r=".85"><stop stop-color="#8b5c3a"/><stop offset=".6" stop-color="#503022"/><stop offset="1" stop-color="#35251f"/></radialGradient><radialGradient id="IDheart" cx=".3" cy=".15" r=".95"><stop stop-color="#ff91a4"/><stop offset=".36" stop-color="#ff486e"/><stop offset="1" stop-color="#cb244b"/></radialGradient><linearGradient id="IDwater" x2="0" y2="1"><stop stop-color="#c4f3ff"/><stop offset="1" stop-color="#51b6e7"/></linearGradient><radialGradient id="IDred" cx=".3" cy=".2" r=".9"><stop stop-color="#ffba8a"/><stop offset=".4" stop-color="#fa7052"/><stop offset="1" stop-color="#d73c39"/></radialGradient><radialGradient id="IDbubble"><stop stop-color="#ffd8ec"/><stop offset="1" stop-color="#f485c0"/></radialGradient><radialGradient id="IDbone" cx=".35" cy=".2" r=".9"><stop stop-color="#fffdf0"/><stop offset="1" stop-color="#c4b4a0"/></radialGradient><linearGradient id="IDmouth" x2="0" y2="1"><stop stop-color="#63352f"/><stop offset="1" stop-color="#964c46"/></linearGradient><linearGradient id="IDtongue" x2="0" y2="1"><stop stop-color="#ffb1b5"/><stop offset="1" stop-color="#e7778e"/></linearGradient><linearGradient id="IDglasses" x2=".3" y2="1"><stop stop-color="#62616e"/><stop offset="1" stop-color="#2b303f"/></linearGradient><radialGradient id="IDblush"><stop stop-color="#f5986b" stop-opacity=".4"/><stop offset="1" stop-color="#f5986b" stop-opacity="0"/></radialGradient><linearGradient id="IDfire" x2=".2" y2="1"><stop stop-color="#ffb94e"/><stop offset=".55" stop-color="#ff803b"/><stop offset="1" stop-color="#ee4c40"/></linearGradient></defs>';
  const face=headless?'':e(50,89,27,2.5,'#26180b0d')+e(50,51,36.5,37,'url(#IDskin)')+p('M23 35C27 17 47 12 62 19C46 15 30 22 23 35Z','#fff7dc50')+e(27,60,13,9,'url(#IDblush)')+e(73,60,13,9,'url(#IDblush)')+eyes(item.eyes)+mouth(item.mouth)+(item.eyes==='cry'?g('tears',p('M28 48Q33 46 38 48C37 58 39 72 36 79Q33 84 30 79C27 72 29 57 28 48ZM62 48Q67 46 72 48C71 58 73 72 70 79Q67 84 64 79C61 72 63 57 62 48Z','url(#IDwater)')+line('M31 53v18m34-18v18','#fff7',1.6)):'');
  const artwork=prop==='fire-symbol'?g('flame',p('M51 7C55 28 79 31 80 53C87 45 86 41 86 41C103 70 83 93 53 94C20 94 6 76 13 55C16 46 22 40 22 40C22 51 27 56 31 58C28 32 48 28 51 7Z','url(#IDfire)'))+g('core',p('M53 44C57 58 71 63 69 76C68 88 58 93 49 91C33 89 29 76 37 66Q41 62 42 56Q44 65 47 67Q52 57 53 44Z','#ffdd78')+p('M50 72Q61 83 52 90Q42 91 43 82Z','#fff1b2')):background(prop)+face+props(prop);
  return '<svg class="tele-emoji-art-v127 reaction-art-v126 exstra-emoji-art-v182" data-emoji-id="'+item.id+'" data-emoji-motion="'+item.motion+'" data-art-revision="213" viewBox="-3 -3 106 106" fill="none" aria-hidden="true" focusable="false">'+(defs+g('body',artwork)).replaceAll('ID',id)+'</svg>';
 }
 const all=catalog.all.map(item=>Object.freeze({...item,color:item.group==='love'?'#f46b8d':'#ffcf43',get html(){return html(item);}})),byId=new Map(all.map(x=>[x.id,x]));
 // Preserve renderer/reaction API, not the retired artwork or picker.
 const fire=Object.freeze({id:'fire',emoji:'🔥',token:'🔥',label:'Огонь',color:'#ff924e',motion:'fire',prop:'fire-symbol',get html(){return html(this);}});
 window.telechatEmojiArtV127=Object.freeze({all,get:token=>{if(token==='🔥')return fire;const item=token==='🥰'?catalog.get('hearts'):catalog.get(token);return item?byId.get(item.id):undefined;}});
})();
