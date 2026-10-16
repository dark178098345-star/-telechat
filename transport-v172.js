/* Shared bounded transport. No credentials, message bodies or nicknames in diagnostics. */
(()=>{
 'use strict';
 const unsupported=new Map(),inflight=new Map();
 const stats={requests:0,sends:0,heartbeats:0,snapshots:0,timeouts:0,missing:0};
 let offset=null;
 const self=()=>{try{return me||null;}catch(_){return null;}};
 function credentials(owner){const u=self();if(!u||u.nick!==owner)return null;const login=document.getElementById('l-login'),pass=document.getElementById('l-pass');const secret=u.pass||(login?.value.trim().toLowerCase()===owner?pass?.value:'');return secret?{p_nick:owner,p_pass:secret}:null;}
 const missing=error=>/PGRST202|42883|schema cache|function.*does not exist/.test(String(error?.code||'')+' '+String(error?.message||''));
 function observe(data,start){const server=Number(data?.server_time),end=Date.now();if(Number.isFinite(server)&&end-start<4000)offset=server-(start+end)/2;}
 async function call(name,args,{terminal=false,timeout=10000}={}){
  if(Date.now()<(unsupported.get(name)||0))return null;
  if(navigator.onLine===false)throw Object.assign(Error('Нет соединения с интернетом'),{code:'NETWORK'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout),start=Date.now();stats.requests++;
  try{
   let result;
   if(terminal){const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(args),keepalive:true,signal:controller.signal,cache:'no-store'});if(!response.ok){let error;try{error=await response.json();}catch(_){error={message:'Соединение с сервером временно недоступно',code:String(response.status)};}throw error;}result={data:await response.json()};}
   else{let query=sb.rpc(name,args);if(query.abortSignal)query=query.abortSignal(controller.signal);result=await query;}
   if(result.error)throw result.error;observe(result.data,start);return result.data;
  }catch(error){if(missing(error)){unsupported.set(name,Date.now()+300000);stats.missing++;return null;}if(controller.signal.aborted||error?.name==='AbortError'){stats.timeouts++;throw Object.assign(Error('Сервер не успел подтвердить запрос. Проверим автоматически.'),{code:'TIMEOUT'});}throw error;}
  finally{clearTimeout(timer);}
 }
 function packet(row){if(!row.client_id_v172)row.client_id_v172=crypto.randomUUID();return {chat_key:row.chat_key,from_nick:row.from_nick,text:row.text,ts:row.ts,reply_text:row.reply_text??null,client_id_v172:row.client_id_v172};}
 async function send(row){const owner=row?.from_nick,auth=credentials(owner);if(!auth)return null;const value=packet(row),key=JSON.stringify([owner,value.client_id_v172]);if(inflight.has(key))return inflight.get(key);
  const job=(async()=>{await Promise.resolve();try{stats.sends++;const result=await call('exstra_send_messages_v172',{...auth,p_rows:[value]},{timeout:Math.max(15000,Math.min(45000,String(row.text||'').length/64))});if(result===null)return null;const saved=result.rows?.[0];if(!saved?.id||saved.from_nick!==owner||saved.client_id_v172!==value.client_id_v172||saved.chat_key!==row.chat_key)throw Error('Не удалось подтвердить ответ сервера');return {ok:true,row:saved};}catch(error){return {ok:false,error};}finally{inflight.delete(key);}})();inflight.set(key,job);return job;
 }
 async function snapshot(nicks){const auth=credentials(self()?.nick);if(!auth)return null;stats.snapshots++;const result=await call('exstra_presence_snapshot_v172',{...auth,p_nicks:[...new Set(nicks)].slice(0,80)});if(!result)return null;if(!['modern','legacy','users'].every(k=>Array.isArray(result[k])))throw Error('Некорректный ответ статуса');return result;}
 async function heartbeat(session,snapshot,terminal=false){const auth=credentials(session.nick);if(!auth)return null;stats.heartbeats++;return call('exstra_presence_heartbeat_v172',{...auth,p_key:session.key,p_state:snapshot.state,p_at:snapshot.at,p_listening:!!snapshot.listening},{terminal,timeout:8000});}
 window.telechatTransportV172=Object.freeze({send,snapshot,heartbeat,now:()=>offset===null?null:Date.now()+offset,diagnostics:()=>({...stats,inflight:inflight.size})});
})();
