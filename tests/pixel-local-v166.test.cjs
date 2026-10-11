const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../pixel-emotions-v163.js'),'utf8'),context);
const {analyze,replies}=context.window.telechatPixelEmotionsV163;
const cases=[
 ['я тебя люблю','love','love'],['люблю музыку','happy','favorite'],['обожаю пиццу','happy','favorite'],
 ['скучаю по тебе','love','miss'],['хочу тебя обнять','love','miss'],['ты мне дорога','love','love'],
 ['настроения нет','sad','sad'],['тяжёлый день','sad','support'],['не с кем поговорить','sad','support'],
 ['я злюсь','angry','angry'],['выводит из себя','angry','angry'],['не злюсь','', ''],
 ['привет','happy','greeting'],['ПРИВЕТИК!!!','happy','greeting'],['hello','happy','greeting'],
 ['доброе утро','happy','morning'],['пока!','wink','goodbye'],['до завтра','wink','goodbye'],
 ['спасибо','happy','thanks'],['благодарю','happy','thanks'],['извини','wink','apology'],
 ['поздравляю','excited','congrats'],['с днём рождения','excited','congrats'],
 ['получилось','excited','success'],['я справилась','excited','success'],['выиграл','excited','success'],
 ['делаю домашку','think','study'],['готовлюсь к экзамену','think','study'],['учу HTML','think','study'],
 ['пишу код','focus','work'],['на работе','focus','work'],['делаю проект','focus','work'],
 ['хочу есть','curious','food'],['приятного аппетита','curious','food'],
 ['пойдём гулять','happy','walk'],['го играть','excited','game'],['играю в майнкрафт','excited','game'],
 ['слушаю музыку','dance','music'],['классный трек','dance','music'],['скинь песню','dance','music'],
 ['уже еду','curious','waiting'],['жду тебя','curious','waiting'],['чем заняться','think','bored'],
 ['идёт дождь','curious','weather'],['за окном снег','curious','weather'],
 ['волнуюсь','think','worry'],['тревожно','think','worry'],['как дела','curious','checkin'],
 ['договорились','wink','agreement'],['я согласна','wink','agreement'],['спокойной ночи','sleep','night'],
 ['привет, мне грустно','sad','sad'],['мне грустно, спасибо','sad','sad'],['я тебя люблю, спасибо','love','love'],
 ['люблю тебя, но всё надоело','sad','support'],['нет сил, но получилось','excited','success'],
 ['не хочу есть','',''],['не волнуюсь','',''],['не скучно','',''],['не играю','',''],['я не выиграл','',''],
 ['я пока дома','',''],['пока не работает','',''],['не до встречи сейчас','',''],
 ['`привет`','',''],['```слушаю музыку```','',''],['https://example.test/спасибо','',''],
 ['__telechat_voice_v1__:привет','',''],['обычное сообщение без эмоции','',''],
 ['приветствие благодарность играющий','',''],['пока! Спасибо','happy','thanks']
];
for(const [text,mood,topic] of cases){const result=analyze(text);assert.equal(result.mood,mood,text+' mood');assert.equal(result.topic,topic,text+' topic');}
for(const list of Object.values(replies)){assert(list.length>=1);assert.equal(new Set(list).size,list.length);for(const text of list){assert(text.length<=90,text);assert(!/[<>]/.test(text));}}
assert(Object.isFrozen(replies));assert(!/fetch\(|XMLHttpRequest|setInterval|setTimeout|localStorage/.test(fs.readFileSync(path.join(__dirname,'../pixel-emotions-v163.js'),'utf8')));
console.log(`PASS local v166: ${cases.length} contextual cases, ${Object.keys(replies).length} reply groups, bounded safe replies, no network/storage/timers`);
