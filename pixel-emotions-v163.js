/* Small local phrase rules, not an AI service. No requests, storage or timers. */
(()=>{
 'use strict';
 const rule=(mood,phrase,negation=false)=>({mood,pattern:new RegExp('(?:^|[^а-яa-z0-9])('+phrase+')(?=$|[^а-яa-z0-9])','g'),negation});
 const rules=[
  rule('love','люблю|обожаю|влюблен(?:а)?|ты мне нравишься|скучаю по тебе|хочу (?:тебя )?обнять|любовь к тебе|i love you'),
  rule('sad','(?:нет|без) настроения|настроени[ея] (?:совсем |вообще )?нет|плохое настроение|настроение (?:плохое|на нуле)|мне (?:очень )?(?:плохо|грустно|одиноко)|все плохо|грустно|грустн(?:ый|ая|о)|тоскливо|плачу|(?:хочу|хочется) плакать|сердце разбито|нет сил',true),
  rule('angry','злюсь|зл(?:ой|ая)|бесит|раздражает|достал(?:а|и)?|ненавижу|взбесил(?:а)?'),
  rule('laugh','а?ха(?:ха)+|ахах(?:ах)*|ржу|смеюсь|смешно|рассмешил(?:а)?|лол|lol|lmao'),
  rule('happy','(?:я )?рад(?:а)?|радуюсь|счастлив(?:а|ый|ая)?|(?:отличное|хорошее|прекрасное) настроение|настроение (?:супер|отличное|хорошее)|все (?:отлично|хорошо)|ура|круто|кайф'),
  rule('sleep','(?:хочу|иду|пора) спать|засыпаю|сонн(?:ый|ая)|устал(?:а)?|спокойной ночи'),
  rule('think','думаю|размышляю|не понимаю|не знаю|как думаешь',true),
  rule('surprised','ничего себе|вот это да|ого|вау|офигеть|невероятно')
 ];
 function negated(text,index){
  const prefix=text.slice(0,index).trim().split(/\s+/).slice(-4);
  // "Не только люблю" is not a denial; ordinary nearby negations are.
  if(prefix.join(' ').endsWith('не только'))return false;
  return /(?:^| )(?:не|ни)(?: (?:очень|особо|слишком|сильно|больше|совсем|вообще|так|тебя|его|ее|это|их|вас|нас)){0,3}$/.test(prefix.join(' '));
 }
 function detect(raw){
  const text=String(raw||'').slice(0,8000).normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/https?:\/\/\S+|```[\s\S]*?```|`[^`]*`/g,' ');
  let found='';
  for(const part of text.split(/[.!?;\n]+|\s+(?:но|зато|однако)\s+|,\s*(?:а|но|зато|однако)\s+/)){
   const clause=part.replace(/[^а-яa-z0-9]+/g,' ').trim();let last=-1;
   for(const item of rules){item.pattern.lastIndex=0;for(const match of clause.matchAll(item.pattern)){
    const index=match.index+match[0].indexOf(match[1]);
    if(!item.negation&&negated(clause,index)){if(found===item.mood)found='';continue;}
    // Explicit negative phrases already express sadness. Other sad words
    // still respect "не грустно", "не плачу", etc.
    if(item.mood==='sad'&&!/^(?:нет |без |настроени[ея] .*нет)/.test(match[1])&&negated(clause,index))continue;
    if(index>=last){last=index;found=item.mood;}
   }}
  }
  return found;
 }
 window.telechatPixelEmotionsV163=Object.freeze({detect});
})();
