/* Virtual wallet transport: bounded requests, account isolation, retry-safe writes. */
(()=>{'use strict';
 const self=()=>{try{return me||null;}catch(_){return null;}},pending=new Map(),controllers=new Set();let owner='',generation=0,revision=0,state=null,flight=null,busy=false;
 const pendingKey=nick=>'exstrachat.wallet-pending.v197.'+nick;
 function remember(){try{localStorage.setItem(pendingKey(owner),JSON.stringify([...pending]));}catch(_){/* In-memory retries remain safe when device storage is unavailable. */}}
 function sync(){const next=self()?.nick||'';if(next!==owner){owner=next;generation++;for(const c of controllers)c.abort();controllers.clear();pending.clear();state=null;flight=null;busy=false;try{for(const [key,item]of JSON.parse(localStorage.getItem(pendingKey(owner))||'[]').slice(-20))if(/^[a-f0-9]{64}$/.test(key)&&/^[a-f0-9-]{36}$/.test(item.id)&&Date.now()-item.at<7*86400000)pending.set(key,item);}catch(_){}}return owner;}
 function uuid(){return crypto.randomUUID();}
 async function call(action,data={},request=null){const nick=sync(),g=generation,u=self();if(!nick)throw Error('Сначала войди в аккаунт');if(navigator.onLine===false)throw Error('Нет соединения. Повтори, когда появится сеть.');
  const pass=u.pass||(document.getElementById('l-login')?.value.trim().toLowerCase()===nick?document.getElementById('l-pass')?.value:'');if(!pass)throw Error('Войди в аккаунт заново');
  const c=new AbortController();controllers.add(c);let timer;
  try{let q=sb.rpc('exstra_wallet_v197',{p_nick:nick,p_pass:pass,p_action:action,p_data:data,p_request:request});if(q.abortSignal)q=q.abortSignal(c.signal);
   const result=await Promise.race([q,new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error('Сервер не ответил. Можно безопасно повторить операцию.'));},12000);c.signal.addEventListener('abort',()=>reject(Error('Запрос отменён')),{once:true});})]);
   if(g!==generation||self()?.nick!==nick)throw Error('Аккаунт изменился');if(result.error){if(/PGRST202|does not exist|schema cache/.test((result.error.code||'')+' '+result.error.message))throw Error('Кошелёк ещё не подключён к серверу');throw Error(result.error.message||'Не удалось выполнить операцию');}return result.data;
  }finally{clearTimeout(timer);controllers.delete(c);}
 }
 function announce(){window.dispatchEvent(new CustomEvent('exstra-wallet-updated-v197',{detail:{nick:owner,state:state?{...state}:null}}));}
 async function load(force=false){sync();if(state&&!force)return state;if(flight)return flight;const nick=owner,g=generation,r=revision;const task=call('state').then(value=>{if(!value||typeof value.premium!=='boolean'||!Array.isArray(value.history)||(!value.unlimited&&!Number.isSafeInteger(value.balance)))throw Error('Некорректный ответ кошелька');if(g===generation&&owner===nick&&r===revision){state=value;announce();}return value;}).finally(()=>{if(flight===task)flight=null;});flight=task;return task;}
 async function mutate(action,data){sync();if(busy)throw Error('Подожди завершения предыдущей операции');const g=generation;busy=true;
  try{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([action,data]))),key=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');if(g!==generation)throw Error('Аккаунт изменился');let item=pending.get(key);if(!item){item={id:uuid(),at:Date.now()};pending.set(key,item);while(pending.size>20)pending.delete(pending.keys().next().value);remember();}const result=await call(action,data,item.id);if(result?.ok!==true)throw Error('Сервер не подтвердил операцию');pending.delete(key);remember();revision++;flight=null;state=null;return result;}finally{if(g===generation)busy=false;}
 }
 window.addEventListener('telechat-account-ready-v175',sync);document.getElementById('auth-screen')&&new MutationObserver(sync).observe(document.getElementById('auth-screen'),{attributes:true,attributeFilter:['class']});
 window.exstraWalletV197=Object.freeze({load,mutate,call,sync,state:()=>{sync();return state;},owner:()=>sync(),busy:()=>busy,format:n=>n===null?'∞':Number(n||0).toLocaleString('ru-RU')});sync();
})();
