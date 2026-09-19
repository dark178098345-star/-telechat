/* Pure calculations shared by the UI and regression tests. No timers/network. */
((root,factory)=>{const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.telechatActivityModelV124=model;})(globalThis,()=>{
 'use strict';
 function progress(value){const xp=Math.max(0,Math.floor(Number(value)||0)),level=Math.floor(Math.sqrt(xp/100))+1,start=100*(level-1)**2,next=100*level**2;return {xp,level,start,next,percent:100*(xp-start)/(next-start)};}
 function listening(previous,current,elapsed){
  if(!previous||!current||previous.paused||current.paused||!current.track||!previous.track||elapsed<=0||elapsed>90)return 0;
  const key=t=>t.id||t.url; if(!key(current.track)||key(previous.track)!==key(current.track))return 0;
  const delta=Number(current.time)-Number(previous.time);
  return delta>0&&delta<=elapsed*1.25+.5?Math.min(delta,elapsed):0;
 }
 return {progress,listening};
});
