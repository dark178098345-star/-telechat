/* TELECHAT SAVED ACCOUNTS V75
   Encrypted multi-account cards for quick login on this device. */
(()=>{
  'use strict';

  const DB_NAME='telechat-device-v70';
  const STORE_NAME='private';
  const KEY_ID='remember-key-v70';
  const ACCOUNTS_ID='saved-accounts-v75';
  const LEGACY_LOGIN_ID='remember-login-v70';
  // Read old six-card records without silently deleting saved credentials.
  const LEGACY_STORAGE_CEILING=6,BASE_LIMIT=2,PREMIUM_LIMIT=4;
  const premiumCache=new Map();
  let databasePromise=null,accountsCache=[],accountsReady=false,selectedNick='',changeQueue=Promise.resolve(),limit=BASE_LIMIT,premiumUnavailable=false,profileTimer=0;

  const byId=id=>document.getElementById(id);
  const normalizeNick=value=>String(value||'').trim().toLowerCase();
  const currentUser=()=>{
    try{return typeof me!=='undefined'&&me?me:(window.me||null);}catch(error){return window.me||null;}
  };
  const premiumActive=row=>row?.premium===true&&(row.premium_forever===true||!row.premium_until||Date.parse(row.premium_until)>Date.now());
  const cachedLimit=nicks=>nicks.some(n=>{const v=premiumCache.get(n);return v&&Date.now()-v.at<=300000&&premiumActive(v.row);})?PREMIUM_LIMIT:BASE_LIMIT;
  function serverClient(){try{return typeof sb!=='undefined'?sb:window.sb;}catch(_){return window.sb;}}
  async function accountLimit(accounts,extraNick=''){
    const nicks=[...new Set([...accounts.map(a=>a.nick),normalizeNick(extraNick)].filter(Boolean))];
    const missing=nicks.filter(n=>!premiumCache.has(n)||Date.now()-premiumCache.get(n).at>300000);
    premiumUnavailable=false;
    if(missing.length){let timer;const controller=new AbortController();
      try{
        const client=serverClient();if(!client?.from)throw Error('PREMIUM_UNAVAILABLE');
        let q=client.from('exstra_badges_public_v197').select('nick,premium,premium_until,premium_forever').in('nick',missing);
        if(q.abortSignal)q=q.abortSignal(controller.signal);
        const result=await Promise.race([q,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('PREMIUM_TIMEOUT'));},5000);})]);
        if(result?.error||!Array.isArray(result?.data))throw Error('PREMIUM_UNAVAILABLE');
        const rows=new Map(result.data.map(row=>[normalizeNick(row.nick),row]));
        for(const nick of missing)premiumCache.set(nick,{row:rows.get(nick)||null,at:Date.now()});
        while(premiumCache.size>16)premiumCache.delete(premiumCache.keys().next().value);
      }catch(_){premiumUnavailable=true;}finally{clearTimeout(timer);}
    }
    limit=cachedLimit(accountsCache.map(a=>a.nick));
    return cachedLimit(nicks);
  }
  function changeAccounts(work){
    const run=()=>window.navigator?.locks?.request?window.navigator.locks.request('exstra-saved-accounts-v210',work):work();
    const next=changeQueue.then(run,run);changeQueue=next.catch(()=>{});return next;
  }
  function notice(message){const node=byId('saved-account-limit-v210');if(node)node.textContent=message;try{window.showToast?.(message);}catch(_){}}

  function openDatabase(){
    if(!('indexedDB' in window))return Promise.reject(new Error('NO_INDEXED_DB'));
    if(databasePromise)return databasePromise;
    databasePromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('DB_OPEN_FAILED'));
      request.onblocked=()=>reject(new Error('DB_BLOCKED'));
    });
    return databasePromise;
  }

  async function readRecord(id){
    const database=await openDatabase();
    return new Promise((resolve,reject)=>{
      const request=database.transaction(STORE_NAME,'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('DB_READ_FAILED'));
    });
  }

  async function writeRecord(id,value){
    const database=await openDatabase();
    return new Promise((resolve,reject)=>{
      const transaction=database.transaction(STORE_NAME,'readwrite');
      transaction.objectStore(STORE_NAME).put(value,id);
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error||new Error('DB_WRITE_FAILED'));
      transaction.onabort=()=>reject(transaction.error||new Error('DB_WRITE_ABORTED'));
    });
  }

  async function commitRecords(records){
    const database=await openDatabase();
    return new Promise((resolve,reject)=>{
      const transaction=database.transaction(STORE_NAME,'readwrite');
      const store=transaction.objectStore(STORE_NAME);
      for(const [id,value] of records){if(value===null)store.delete(id);else store.put(value,id);}
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error||new Error('DB_WRITE_FAILED'));
      transaction.onabort=()=>reject(transaction.error||new Error('DB_WRITE_ABORTED'));
    });
  }

  async function encryptionKey(){
    if(!window.crypto?.subtle)throw new Error('NO_WEB_CRYPTO');
    const savedKey=await readRecord(KEY_ID);
    if(savedKey?.type==='secret'&&savedKey.algorithm?.name==='AES-GCM')return savedKey;
    const newKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await writeRecord(KEY_ID,newKey);return newKey;
  }

  async function encryptRecord(key,value){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const encoded=new TextEncoder().encode(JSON.stringify(value));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded);
    return {version:2,iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted)),savedAt:Date.now()};
  }

  async function decryptRecord(id){
    const record=await readRecord(id);
    if(!record?.iv?.length||!record?.data?.length)return null;
    const key=await encryptionKey();
    const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(record.iv)},key,new Uint8Array(record.data));
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  function safeProfile(raw,nick){
    const profile=raw&&typeof raw==='object'?raw:{};
    return{
      nick,
      name:String(profile.name||nick).slice(0,48),
      av:Math.max(0,Math.min(23,Number(profile.av)||0)),
      status:typeof profile.status==='string'?profile.status:''
    };
  }

  function safeAccount(raw){
    const nick=normalizeNick(raw?.nick),password=typeof raw?.password==='string'?raw.password:'';
    if(!nick||!password)return null;
    return{nick,password,profile:safeProfile(raw.profile,nick),savedAt:Number(raw.savedAt)||0};
  }

  function sanitizeAccounts(value){
    const source=Array.isArray(value?.accounts)?value.accounts:[];
    const seen=new Set(),result=[];
    for(const raw of source){
      const account=safeAccount(raw);if(!account||seen.has(account.nick))continue;
      seen.add(account.nick);result.push(account);if(result.length>=LEGACY_STORAGE_CEILING)break;
    }
    return result.sort((a,b)=>b.savedAt-a.savedAt);
  }

  async function loadAccounts(force=false){
    if(accountsReady&&!force)return accountsCache;
    let accounts=[],readError=null;
    try{accounts=sanitizeAccounts(await decryptRecord(ACCOUNTS_ID));}catch(error){readError=error;}
    if(!accounts.length){
      try{
        const legacy=await decryptRecord(LEGACY_LOGIN_ID),account=safeAccount(legacy&&{...legacy,profile:{nick:legacy.nick,name:legacy.nick,av:0},savedAt:legacy.savedAt});
        if(account)accounts=[account];
      }catch(error){readError=readError||error;}
    }
    // A failed read is not an empty vault. Never overwrite it after a login.
    if(readError&&force)throw Error('SAVED_ACCOUNTS_UNAVAILABLE');
    accountsCache=accounts;accountsReady=true;return accountsCache;
  }

  async function persistAccounts(accounts){
    const next=accounts.slice(0,LEGACY_STORAGE_CEILING);
    if(!next.length){
      await commitRecords([[ACCOUNTS_ID,null],[LEGACY_LOGIN_ID,null]]);
      accountsCache=[];accountsReady=true;
      return;
    }
    const latest=next[0],key=await encryptionKey();
    const saved=await encryptRecord(key,{version:1,accounts:next});
    const legacy=await encryptRecord(key,{nick:latest.nick,password:latest.password,savedAt:latest.savedAt});
    await commitRecords([[ACCOUNTS_ID,saved],[LEGACY_LOGIN_ID,legacy]]);
    accountsCache=next;accountsReady=true;
  }

  function avatarInto(element,account){
    const profile={...(account.profile||{}),nick:account.nick,avatar_video:''};
    try{setAvatarElement(element,profile);}catch(error){element.textContent=(window.AVATARS||[])[Number(profile.av)||0]||'😺';}
  }

  function renderAccounts(){
    const shell=byId('saved-accounts-v75'),list=byId('saved-account-list-v75'),empty=byId('saved-account-empty-v75'),divider=byId('saved-account-divider-v75');
    if(!shell||!list)return;
    shell.classList.toggle('has-accounts',accountsCache.length>0);
    if(empty)empty.hidden=accountsCache.length>0;
    if(divider)divider.hidden=!accountsCache.length;
    let hint=byId('saved-account-limit-v210');
    if(!hint){hint=document.createElement('p');hint.id='saved-account-limit-v210';hint.className='saved-account-limit-v210';hint.setAttribute('role','status');shell.append(hint);}
    hint.textContent=accountsCache.length>limit
      ?'Сохранено '+accountsCache.length+' из '+limit+'. Прежние карточки сохранены; убери лишние вручную, чтобы добавить другую.'
      :'На этом устройстве: '+accountsCache.length+' из '+limit+'. '+(limit===PREMIUM_LIMIT?'Premium — до 4 аккаунтов.':'С Premium — до 4 аккаунтов.')+(premiumUnavailable?' Проверка Premium недоступна; новые места пока не добавлены.':'');
    list.replaceChildren();
    for(const account of accountsCache){
      const card=document.createElement('article');card.className='saved-account-card-v75';card.dataset.nick=account.nick;if(account.nick===selectedNick)card.classList.add('selected');
      const main=document.createElement('button');main.type='button';main.className='saved-account-main-v75';main.setAttribute('aria-label','Войти как @'+account.nick);
      const avatar=document.createElement('span');avatar.className='saved-account-avatar-v75';avatarInto(avatar,account);
      const copy=document.createElement('span');copy.className='saved-account-copy-v75';
      const name=document.createElement('strong');name.textContent=account.profile?.name||account.nick;
      const nick=document.createElement('small');nick.textContent='@'+account.nick;
      copy.append(name,nick);
      const arrow=document.createElement('span');arrow.className='saved-account-arrow-v75';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
      main.append(avatar,copy,arrow);main.onclick=()=>useAccount(account.nick);
      const remove=document.createElement('button');remove.type='button';remove.className='saved-account-remove-v75';remove.textContent='×';remove.title='Убрать аккаунт';remove.setAttribute('aria-label','Убрать @'+account.nick+' из списка');
      remove.onclick=event=>{event.stopPropagation();removeAccount(account.nick).catch(()=>notice('Не удалось изменить список аккаунтов. Прежние карточки сохранены.'));};
      card.append(main,remove);list.appendChild(card);
    }
  }

  async function saveAccount(nick,password){
    const safeNick=normalizeNick(nick),user=currentUser();if(!safeNick||!password)return;
    return changeAccounts(async()=>{
      const accounts=await loadAccounts(true),exists=accounts.some(a=>a.nick===safeNick);
      // The first two places and existing cards need no subscription round trip.
      const max=!exists&&accounts.length>=BASE_LIMIT?await accountLimit(accounts,safeNick):BASE_LIMIT;
      if(!exists&&accounts.length>=max){renderAccounts();notice('Вход выполнен, но аккаунт не сохранён: доступно '+max+' места. Убери одну карточку'+(max===BASE_LIMIT?' или подключи Premium.':'.'));return false;}
      const profile=safeProfile(user&&normalizeNick(user.nick)===safeNick?user:null,safeNick);
      const next={nick:safeNick,password,profile,savedAt:Date.now()};
      const merged=[next,...accounts.filter(account=>account.nick!==safeNick)];
      await persistAccounts(merged);limit=cachedLimit(merged.map(a=>a.nick));renderAccounts();
      // Enrichment is background-only; it cannot delay ordinary sign-in hooks.
      accountLimit(merged).then(renderAccounts).catch(()=>{});
      return true;
    });
  }

  async function useAccount(nick){
    const account=(await loadAccounts()).find(item=>item.nick===normalizeNick(nick));if(!account)return;
    selectedNick=account.nick;renderAccounts();
    const nickInput=byId('l-login'),passwordInput=byId('l-pass');
    if(nickInput)nickInput.value=account.nick;if(passwordInput)passwordInput.value=account.password;
    await Promise.resolve(window.doLogin?.()).catch(()=>{});
  }

  async function removeAccount(nick){
    const target=normalizeNick(nick);if(!target)return;
    if(typeof confirm==='function'&&!confirm('Убрать @'+target+' из списка аккаунтов?'))return;
    await changeAccounts(async()=>{const accounts=(await loadAccounts(true)).filter(account=>account.nick!==target);
    await persistAccounts(accounts);await accountLimit(accounts);if(selectedNick===target)selectedNick='';renderAccounts();});
    try{window.showToast?.('Аккаунт убран с этого устройства');}catch(error){}
  }

  function loginSucceeded(nick,result,before){
    if(result===false)return false;
    const authHidden=!byId('auth-screen')?.classList.contains('active');
    const chatVisible=byId('chat-screen')?.classList.contains('active');
    const user=currentUser();
    return Boolean(authHidden&&chatVisible&&normalizeNick(user?.nick)===nick&&(result===true||before.authVisible||user!==before.user));
  }

  function wrapLogin(){
    const previousLogin=window.doLogin;if(typeof previousLogin!=='function'||previousLogin.savedAccountsWrappedV75)return;
    const wrapped=async function(...args){
      const nick=normalizeNick(byId('l-login')?.value),password=byId('l-pass')?.value||'';
      const before={user:currentUser(),authVisible:byId('auth-screen')?.classList.contains('active')};
      const result=await previousLogin.apply(this,args);
      if(loginSucceeded(nick,result,before))await saveAccount(nick,password).catch(()=>{try{window.showToast?.('Не удалось сохранить аккаунт на этом устройстве');}catch(error){}});
      return result;
    };
    wrapped.savedAccountsWrappedV75=true;window.doLogin=wrapped;
  }

  async function init(){const accounts=await loadAccounts();renderAccounts();await accountLimit(accounts);renderAccounts();}
  wrapLogin();const ready=init().catch(()=>renderAccounts());
  window.telechatAccountsV75=Object.freeze({
    ready,
    list:async()=> (await loadAccounts()).map(account=>({nick:account.nick,profile:{...account.profile},savedAt:account.savedAt})),
    use:useAccount,
    remove:removeAccount,
    limits:async()=>{const accounts=await loadAccounts();await accountLimit(accounts);renderAccounts();return {count:accounts.length,max:limit,premium:limit===PREMIUM_LIMIT,overLimit:accounts.length>limit,unavailable:premiumUnavailable};},
    clear:()=>changeAccounts(async()=>{await persistAccounts([]);premiumCache.clear();limit=BASE_LIMIT;renderAccounts();})
  });
  window.addEventListener?.('exstra-wallet-updated-v197',event=>{const nick=normalizeNick(event.detail?.nick);if(nick)premiumCache.delete(nick);});
  // Refresh an already-saved card after a confirmed own-profile save only.
  // Routine avatar/cache reads must not re-encrypt the account vault.
  window.addEventListener?.('telechat-user-updated-v123',event=>{
    const source=currentUser(),nick=normalizeNick(event.detail?.nick);
    if(event.detail?.profileSaved!==true||!source||nick!==normalizeNick(source.nick))return;
    clearTimeout(profileTimer);profileTimer=setTimeout(()=>{profileTimer=0;
      changeAccounts(async()=>{
        if(currentUser()!==source)return;const accounts=await loadAccounts(true);
        if(currentUser()!==source)return;const old=accounts.find(a=>a.nick===nick);if(!old)return;
        const profile=safeProfile(source,nick);if(JSON.stringify(old.profile)===JSON.stringify(profile))return;
        await persistAccounts(accounts.map(a=>a.nick===nick?{...a,profile}:a));renderAccounts();
      }).catch(()=>{try{window.showToast?.('Не удалось обновить сохранённую карточку. Аккаунт остаётся в списке.');}catch(_){}});
    },200);
  });
  window.addEventListener?.('telechat-account-ready-v175',()=>{clearTimeout(profileTimer);profileTimer=0;});
})();
