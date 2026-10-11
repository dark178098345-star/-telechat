/* One short send transition, triggered only by a newly submitted local message. */
(()=>{
 'use strict';
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'),seen=new WeakSet(),playing=new Set();
 let nativeHidden=false;
 function visible(node){return !!node?.isConnected&&node.getClientRects().length>0&&!document.hidden&&!nativeHidden;}
 function stop(){for(const animation of playing)animation.cancel();playing.clear();}
 function play(node,keyframes,options,cleanup=()=>{}){
  if(typeof node.animate!=='function'){cleanup();return;}
  const animation=node.animate(keyframes,options);playing.add(animation);
  animation.finished.then(finish,finish);
  function finish(){playing.delete(animation);cleanup();}
 }
 window.addEventListener('telechat-message-sent-v164',event=>{
  const {element:row,owner,key}=event.detail||{};
  if(!row||seen.has(row)||typeof me==='undefined'||owner!==me?.nick||typeof conversationKey!=='function'||key!==conversationKey()||!row.matches('#messages>.msg.me'))return;
  seen.add(row);
  const bubble=row.querySelector('.msg-bubble');if(reduce.matches||!visible(bubble))return;
  row.classList.add('send-enter-v164');
  play(bubble,[{opacity:.55,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'},()=>row.classList.remove('send-enter-v164'));
  const icon=document.querySelector('.send-btn svg');
  if(visible(icon))play(icon,[{transform:'scale(.92)'},{transform:'scale(1)'}],{duration:180,easing:'ease-out'});
 });
 reduce.addEventListener?.('change',()=>{if(reduce.matches)stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.addEventListener('pagehide',stop);
 window.addEventListener('telechat-native-visibility',event=>{nativeHidden=event.detail?.background===true;if(nativeHidden)stop();});
})();
