/* Pure presence reduction: one lease per session, active sessions always win. */
(function(root){
  'use strict';
  const PREFIX='telechat-presence-v120:',ACTIVE_MS=65000,BACKGROUND_MS=120000;
  const LEGACY=['__telechat_device_phone_v72__','__telechat_device_pc_v72__','__telechat_background_phone_v101__','__telechat_background_pc_v101__'];
  const normalize=value=>String(value||'').trim().toLowerCase();
  const encode=(at,state)=>Math.floor(at)*10+({offline:0,online:1,background:2}[state]||0);
  function decode(row){const key=String(row.chat_key||'');if(!key.startsWith(PREFIX))return null;const value=Number(row.ts),code=value%10,at=Math.floor(value/10);if(!Number.isSafeInteger(value)||at<=0||code>2)return null;return {key,nick:normalize(row.nick),device:key.endsWith(':phone')?'phone':'pc',state:['offline','online','background'][code],at};}
  const fresh=(at,now,limit)=>at>0&&at<=now+15000&&now-at<limit;
  function reduce({rows=[],live=[],departed=new Map(),lastSeen=0,now=Date.now(),available=true}){
    const sessions=new Map(),newest={phone:0,pc:0};let seen=Number(lastSeen)||0,known=false;
    for(const row of rows){const s=decode(row);if(!s||s.at>now+15000)continue;known=true;newest[s.device]=Math.max(newest[s.device],s.at);if(s.state==='online')seen=Math.max(seen,s.at);sessions.set(s.key,s);}
    for(const item of live){if(!item||!['online','background','offline'].includes(item.state))continue;const old=sessions.get(item.key);if(!old||item.at>=old.at)sessions.set(item.key,{...item,live:true});else if(old.state===item.state)old.live=true;known=true;}
    const active=[],background=[];
    for(const s of sessions.values()){
      const left=departed.get(s.key);if(left&&left.at>=s.at){if(left.state==='online')seen=Math.max(seen,left.at);if(s.state!=='offline'&&left.state==='background'&&fresh(left.at,now,BACKGROUND_MS))background.push({...s,at:left.at});continue;}
      if(s.live||fresh(s.at,now,s.state==='background'?BACKGROUND_MS:ACTIVE_MS)){if(s.state==='online')active.push(s);if(s.state==='background')background.push(s);}
    }
    // Compatibility with older apps; an older device marker cannot override its new session.
    for(const device of ['phone','pc']){const a=rows.find(r=>r.chat_key===`__telechat_device_${device}_v72__`),b=rows.find(r=>r.chat_key===`__telechat_background_${device}_v101__`);const at=Number(a?.ts)||0,bt=Number(b?.ts)||0;
      if(Math.max(at,bt)<=newest[device])continue;
      if(bt>=at&&fresh(bt,now,BACKGROUND_MS))background.push({device,at:bt});else if(fresh(at,now,90000))active.push({device,at});
      seen=Math.max(seen,at<=now+15000?at:0,bt<=now+15000?bt:0);
    }
    if(active.length)return {state:'online',device:active.sort((a,b)=>b.at-a.at)[0].device,lastSeen:Math.min(seen,now)};
    if(background.length)return {state:'background',device:background.sort((a,b)=>b.at-a.at)[0].device,lastSeen:Math.min(seen,now)};
    if(!known&&available&&fresh(lastSeen,now,90000))return {state:'online',device:'',lastSeen};
    return {state:available?'offline':'unknown',device:'',lastSeen:Math.min(seen,now)};
  }
  function label(value,now=Date.now()){
    if(value.state==='online')return 'в сети';if(value.state==='background')return 'в фоне';if(value.state==='unknown')return 'статус недоступен';
    const ts=value.lastSeen;if(!ts)return 'не в сети';const elapsed=Math.max(0,now-ts);if(elapsed<60000)return 'был(а) только что';if(elapsed<3600000)return `был(а) ${Math.floor(elapsed/60000)} мин. назад`;if(elapsed<86400000)return `был(а) ${Math.floor(elapsed/3600000)} ч. назад`;return `был(а) ${new Date(ts).toLocaleDateString('ru',{day:'numeric',month:'short'})}`;
  }
  const api=Object.freeze({PREFIX,LEGACY,ACTIVE_MS,BACKGROUND_MS,normalize,encode,decode,reduce,label});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.telechatPresenceModelV120=api;
})(typeof window==='undefined'?globalThis:window);
