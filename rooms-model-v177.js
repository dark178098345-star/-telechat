/* Resumable room setup using the existing rooms/icon/membership schema. */
(()=>{
 'use strict';
 const flights=new Map(),prefix='exstra.rooms.pending.v177.';
 const account=()=>{try{return String(me?.nick||'');}catch(_){return '';}};
 const check=actor=>{if(!actor||account()!==actor)throw Error('Аккаунт изменился. Открой создание заново.');};
 const colors=['violet','blue','mint','rose','amber','slate'];
 const nick=value=>String(value||'').trim().replace(/^@/,'').toLowerCase();
 function validate(value){
  const name=String(value.name||'').trim(),description=String(value.description||'').trim();
  if(Array.from(name).length<2||Array.from(name).length>48)throw Error('Название должно содержать от 2 до 48 символов.');
  if(Array.from(description).length>180)throw Error('Описание — до 180 символов.');
  if(!['group','channel'].includes(value.type)||!['public','private'].includes(value.visibility))throw Error('Выбери тип и доступ.');
  const icon=String(value.icon||'exstra-room:v177:violet');
  if(icon.length>150000||!( /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(icon)||/^exstra-room:v177:(violet|blue|mint|rose|amber|slate)$/.test(icon)||icon.length<=64))throw Error('Не удалось подготовить аватарку. Выбери фото ещё раз.');
  if(value.members!==undefined&&!Array.isArray(value.members))throw Error('Проверь список участников.');
  const members=[...new Set((value.members||[]).map(nick).filter(Boolean))];
  if(members.length>100||members.some(n=>! /^[a-z0-9_]{1,64}$/.test(n)))throw Error('Добавь до 100 участников за один раз. Проверь ники.');
  return {type:value.type,visibility:value.visibility,name,description,icon,members};
 }
 async function request(query){
  if(navigator.onLine===false)throw Error('Нет подключения к сети. Данные останутся в окне — попробуй позже.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const result=await (query.abortSignal?query.abortSignal(controller.signal):query);if(result.error)throw result.error;return result;}
  catch(error){if(error instanceof Error&&/Аккаунт|Название|Описание|участник|Нет подключения/.test(error.message))throw error;throw Error(controller.signal.aborted?'Сервер не подтвердил действие вовремя. Повтори — создание не продублируется.':'Не удалось подтвердить действие. Проверь связь и повтори.');}
  finally{clearTimeout(timer);}
 }
 function remember(command){try{sessionStorage.setItem(prefix+command.actor,JSON.stringify(command));return true;}catch(_){return false;}}
 function pending(actor=account()){
  try{const c=JSON.parse(sessionStorage.getItem(prefix+actor)||'null');if(c?.actor!==actor||!Number.isSafeInteger(c.id)||c.id<=0||!Number.isSafeInteger(c.at))return null;return {...c,data:validate(c.data)};}catch(_){return null;}
 }
 function command(value){
  const actor=account();check(actor);const data=validate(value);data.members=data.members.filter(n=>n!==actor);
  const bytes=crypto.getRandomValues(new Uint32Array(2));return {actor,id:(bytes[0]&0x1fffff)*4294967296+bytes[1]||1,at:Date.now(),data};
 }
 async function users(actor,nicks){
  if(!nicks.length)return [];const result=await request(sb.from('users').select('nick,name,av').in('nick',nicks));check(actor);
  const found=new Set((result.data||[]).map(u=>u.nick)),missing=nicks.filter(n=>!found.has(n));
  if(missing.length)throw Error('Не найдены участники: '+missing.slice(0,5).map(n=>'@'+n).join(', ')+'. Удали их из выбора и повтори.');
  return result.data||[];
 }
 async function owned(actor,id){check(actor);const {data}=await request(sb.from('rooms').select('*').eq('id',id).maybeSingle());check(actor);if(!data||data.owner_nick!==actor)throw Error('Управлять этим пространством может только владелец.');return data;}
 function create(c){
  const key=c.actor+':'+c.id;if(flights.has(key))return flights.get(key);
  const job=(async()=>{
   check(c.actor);c.data=validate(c.data);c.data.members=c.data.members.filter(n=>n!==c.actor);
   await users(c.actor,c.data.members);check(c.actor);
   // Persist a stable client ID before any write. Retry repairs the same private room.
   c.started=true;c.durable=remember(c);
   let {data:room}=await request(sb.from('rooms').select('*').eq('id',c.id).maybeSingle());check(c.actor);
   if(!room){
    try{const result=await request(sb.from('rooms').insert({id:c.id,type:c.data.type,name:c.data.name,description:c.data.description,icon:c.data.icon,visibility:'private',owner_nick:c.actor,created_at:c.at}).select('*').single());room=result.data;}
    catch(error){check(c.actor);const result=await request(sb.from('rooms').select('*').eq('id',c.id).maybeSingle());room=result.data;if(!room)throw error;}
   }
   check(c.actor);
   if(!room||room.owner_nick!==c.actor||room.type!==c.data.type||Number(room.created_at)!==c.at||room.name!==c.data.name)throw Error('Не удалось подтвердить это создание. Не меняй данные и повтори проверку.');
   const rows=[{room_id:c.id,user_nick:c.actor,role:'owner',joined_at:c.at},...c.data.members.map(n=>({room_id:c.id,user_nick:n,role:'member',joined_at:c.at}))];
   await request(sb.from('room_members').upsert(rows,{onConflict:'room_id,user_nick',ignoreDuplicates:true}));check(c.actor);
   const membership=await request(sb.from('room_members').select('user_nick,role').eq('room_id',c.id).in('user_nick',rows.map(r=>r.user_nick)));check(c.actor);
   const confirmed=new Map((membership.data||[]).map(r=>[r.user_nick,r.role]));
   if(confirmed.get(c.actor)!=='owner'||rows.some(r=>!confirmed.has(r.user_nick)))throw Error('Не удалось подтвердить всех участников и роль владельца. Повтори создание.');
   // Publish only after memberships are confirmed. Failed setup stays private.
   if(room.visibility!==c.data.visibility){const result=await request(sb.from('rooms').update({visibility:c.data.visibility}).eq('id',c.id).eq('owner_nick',c.actor).select('*').single());room=result.data;check(c.actor);}
   if(!room)throw Error('Сервер не подтвердил сохранение. Повтори.');
   try{sessionStorage.removeItem(prefix+c.actor);}catch(_){}
   return {...room,my_role:'owner'};
  })().finally(()=>flights.delete(key));flights.set(key,job);return job;
 }
 async function edit(room,value){const actor=account();await owned(actor,room.id);const data=validate({...value,type:room.type,members:[]});const result=await request(sb.from('rooms').update({name:data.name,description:data.description,icon:data.icon,visibility:data.visibility}).eq('id',room.id).eq('owner_nick',actor).select('*').single());check(actor);if(!result.data)throw Error('Не удалось подтвердить сохранение.');return result.data;}
 async function add(room,nicks){const actor=account();await owned(actor,room.id);const selected=validate({type:room.type,visibility:room.visibility,name:room.name,members:nicks}).members.filter(n=>n!==actor);await users(actor,selected);check(actor);if(selected.length)await request(sb.from('room_members').upsert(selected.map(n=>({room_id:room.id,user_nick:n,role:'member',joined_at:Date.now()})),{onConflict:'room_id,user_nick',ignoreDuplicates:true}));check(actor);}
 async function remove(room,target){const actor=account(),fresh=await owned(actor,room.id);if(target===fresh.owner_nick)throw Error('Владельца нельзя удалить из участников.');await request(sb.from('room_members').delete().eq('room_id',room.id).eq('user_nick',target));check(actor);}
 async function leave(room){const actor=account();check(actor);const fresh=await request(sb.from('rooms').select('owner_nick').eq('id',room.id).maybeSingle());check(actor);if(fresh.data?.owner_nick===actor)throw Error('Владелец может удалить пространство, но не покинуть его.');await request(sb.from('room_members').delete().eq('room_id',room.id).eq('user_nick',actor));check(actor);}
 async function destroy(room){const actor=account();await owned(actor,room.id);for(const table of ['messages','polls']){check(actor);await request(sb.from(table).delete().eq('chat_key','room_'+room.id));}check(actor);await request(sb.from('rooms').delete().eq('id',room.id).eq('owner_nick',actor));check(actor);}
 async function details(room,offset=0){const actor=account();check(actor);const result=await request(sb.from('rooms').select('*').eq('id',room.id).maybeSingle());check(actor);if(!result.data)throw Error('Пространство больше недоступно.');const fresh=result.data;
  if(fresh.owner_nick!==actor){const access=await request(sb.from('room_members').select('role').eq('room_id',room.id).eq('user_nick',actor).maybeSingle());check(actor);if(!access.data)throw Error('Ты больше не участник этого пространства.');}
  const members=await request(sb.from('room_members').select('user_nick,role,joined_at',{count:'exact'}).eq('room_id',room.id).order('joined_at',{ascending:true}).order('user_nick',{ascending:true}).range(offset,offset+49));check(actor);
  return {room:fresh,members:members.data||[],count:members.count,more:members.count===null||members.count===undefined?(members.data||[]).length===50:offset+(members.data||[]).length<members.count};
 }
 async function search(query){const actor=account();check(actor);const q=String(query||'').trim().replace(/^@/,'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,64);if(q.length<2)return [];const result=await request(sb.from('users').select('nick,name,av').ilike('nick','%'+q.replace(/_/g,'\\_')+'%').order('nick',{ascending:true}).limit(20));check(actor);return (result.data||[]).filter(u=>u.nick!==actor);}
 window.exstraRoomsModelV177=Object.freeze({account,check,validate,command,pending,create,edit,add,remove,leave,destroy,details,search,colors});
})();
