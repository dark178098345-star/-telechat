/* Shared lightweight users: deduplicated requests and private device photo cache. */
(() => {
  'use strict';
  const FIELDS='nick,name,av,status,last_seen,avatar_video,animated_profile';
  const FRESH_MS=60000,DISK_TTL=7*86400000,MAX_RECORDS=200,MAX_BYTES=6*1024*1024;
  const fresh=new Map(),versions=new Map(),jobs=new Map(),restored=new Set(),reads=new Map(),retryAt=new Map(),pending=new Map(),writes=new Map(),batches=[];
  let owner='',generation=0,database=null,scheduled=false,writeTimer=0,activeRequests=0;
  const nick=value=>String(value||'').trim().toLowerCase();
  const account=()=>{try{return nick(me?.nick);}catch(_){return '';}};
  const memory=()=>userCache;
  function syncOwner(){const next=account();if(next!==owner){owner=next;generation++;fresh.clear();versions.clear();jobs.clear();restored.clear();reads.clear();retryAt.clear();}return generation;}
  function open(){
    try{if(!window.indexedDB)return Promise.resolve(null);}catch(_){return Promise.resolve(null);}
    if(database)return database;
    database=new Promise(resolve=>{
      let request;try{request=indexedDB.open('telechat-user-photos-v123',1);}catch(_){resolve(null);return;}
      request.onupgradeneeded=()=>{const store=request.result.createObjectStore('profiles',{keyPath:'id'});store.createIndex('owner','owner');};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
    });return database;
  }
  function lightRecord(user){const result={};for(const field of FIELDS.split(','))if(user[field]!==undefined)result[field]=user[field];return result;}
  async function flush(){
    clearTimeout(writeTimer);writeTimer=0;if(!writes.size)return;
    const records=[...writes.values()];writes.clear();const db=await open();if(!db)return;
    try{await new Promise(resolve=>{
      const tx=db.transaction('profiles','readwrite'),store=tx.objectStore('profiles');
      for(const record of records)store.put(record);
      for(const user of new Set(records.map(record=>record.owner))){
        const request=store.index('owner').getAll(user);
        request.onsuccess=()=>{let count=0,bytes=0;for(const record of request.result.sort((a,b)=>b.at-a.at)){
          bytes+=Number(record.bytes)||0;
          if(++count>MAX_RECORDS||bytes>MAX_BYTES||Date.now()-record.at>DISK_TTL)store.delete(record.id);
        }};
      }
      tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
    });}catch(_){/* Storage may be unavailable/full. Network and memory still work. */}
  }
  function persist(user,at){
    if(!owner)return;
    const value=lightRecord(user),bytes=JSON.stringify(value).length*2;if(bytes>MAX_BYTES)return;
    const id=JSON.stringify([owner,user.nick]);writes.set(id,{id,owner,at,value,bytes});
    clearTimeout(writeTimer);writeTimer=setTimeout(flush,200);
  }
  function merge(user,{at=Date.now(),save=true}={}){
    if(!user?.nick)return null;syncOwner();const key=nick(user.nick),old=memory()[key];
    const next={...old,...user,nick:key};next.last_seen=Math.max(Number(old?.last_seen)||0,Number(user.last_seen)||0);
    memory()[key]=next;fresh.set(key,at);versions.set(key,(versions.get(key)||0)+1);retryAt.delete(key);
    if(save)persist(next,at);
    if(!old||['name','av','status','avatar_video','animated_profile'].some(field=>old[field]!==next[field]))window.dispatchEvent(new CustomEvent('telechat-user-updated-v123',{detail:{nick:key}}));
    return next;
  }
  async function restore(keys){
    const token=syncOwner(),user=owner;if(!user)return;
    const missing=keys.filter(key=>!restored.has(key)&&!reads.has(key));
    if(missing.length){
      const task=(async()=>{
        const db=await open();if(!db||token!==generation)return;
        await new Promise(resolve=>{
          let tx;try{tx=db.transaction('profiles','readonly');}catch(_){resolve();return;}
          for(const key of missing){const request=tx.objectStore('profiles').get(JSON.stringify([user,key]));
            request.onsuccess=()=>{const record=request.result,age=Date.now()-Number(record?.at||0);
              if(token!==generation||account()!==user||!record?.value||record.value.nick!==key||age<0||age>DISK_TTL)return;
              if(key===user&&memory()[key])return;
              if((fresh.get(key)||0)<record.at)merge(record.value,{at:record.at,save:false});
            };
          }
          tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
        });
      })().catch(()=>{}).finally(()=>{if(token===generation)for(const key of missing){restored.add(key);reads.delete(key);}});
      for(const key of missing)reads.set(key,task);
    }
    await Promise.all(keys.map(key=>reads.get(key)).filter(Boolean));
  }
  async function fetchPart(entries){
    const first=entries[0],controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{
      if(first.token!==generation||first.owner!==account()){entries.forEach(entry=>entry.resolve(null));return;}
      const query=fields=>{const q=sb.from('users').select(fields).in('nick',entries.map(entry=>entry.nick));return q.abortSignal?q.abortSignal(controller.signal):q;};
      let result=await query(FIELDS);
      if(result.error&&/avatar_video|animated_profile/.test(String(result.error.message)))result=await query('nick,name,av,status,last_seen');
      if(result.error)throw result.error;
      if(first.token!==generation||first.owner!==account()){entries.forEach(entry=>entry.resolve(null));return;}
      const data=new Map((result.data||[]).map(user=>[nick(user.nick),user]));
      for(const entry of entries){
        if((versions.get(entry.nick)||0)!==entry.version){entry.resolve(memory()[entry.nick]||null);continue;}
        const user=data.get(entry.nick);if(!user)retryAt.set(entry.nick,Date.now()+15000);entry.resolve(user?merge(user):null);
      }
    }catch(error){for(const entry of entries){if(entry.token===generation)retryAt.set(entry.nick,Date.now()+15000);entry.reject(error);}}
    finally{clearTimeout(timeout);for(const entry of entries)if(jobs.get(entry.nick)===entry.promise)jobs.delete(entry.nick);}
  }
  function drain(){
    scheduled=false;const entries=[...pending.values()];pending.clear();
    const current=entries.filter(entry=>entry.token===generation&&entry.owner===account());
    entries.filter(entry=>!current.includes(entry)).forEach(entry=>entry.resolve(null));
    for(let i=0;i<current.length;i+=40)batches.push(current.slice(i,i+40));
    pump();
  }
  function pump(){
    // The limit is shared by batches arriving in different event-loop turns too.
    while(activeRequests<2&&batches.length){activeRequests++;fetchPart(batches.shift()).finally(()=>{activeRequests--;pump();});}
  }
  function request(key){
    const token=syncOwner();if(jobs.has(key))return jobs.get(key);
    if(navigator.onLine===false||Date.now()<(retryAt.get(key)||0))return Promise.resolve(memory()[key]||null);
    const entry={nick:key,owner,token,version:versions.get(key)||0};entry.promise=new Promise((resolve,reject)=>Object.assign(entry,{resolve,reject}));
    jobs.set(key,entry.promise);pending.set(JSON.stringify([token,key]),entry);
    if(!scheduled){scheduled=true;queueMicrotask(drain);}return entry.promise;
  }
  async function many(values,force=false){
    const token=syncOwner(),keys=[...new Set(values.map(nick).filter(Boolean))];await restore(keys);
    if(token!==generation)return [];
    await Promise.all(keys.filter(key=>!memory()[key]||(force&&Date.now()-(fresh.get(key)||0)>FRESH_MS)).map(request));
    return token===generation?keys.map(key=>memory()[key]).filter(Boolean):[];
  }
  async function get(value){
    const token=syncOwner(),key=nick(value);if(!key)return null;await restore([key]);if(token!==generation)return null;
    const saved=memory()[key];if(saved){if(Date.now()-(fresh.get(key)||0)>FRESH_MS)request(key).catch(()=>{});return saved;}
    return request(key);
  }
  window.telechatUserCacheV123={get,many,merge,restore:values=>restore(values.map(nick)),flush};
})();
