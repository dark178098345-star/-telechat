/* TELECHAT SAVED ACCOUNTS V75
   Encrypted multi-account cards for quick login on this device. */
(()=>{
  'use strict';

  const DB_NAME='telechat-device-v70';
  const STORE_NAME='private';
  const KEY_ID='remember-key-v70';
  const ACCOUNTS_ID='saved-accounts-v75';
  const LEGACY_LOGIN_ID='remember-login-v70';
  const MAX_ACCOUNTS=6;
  let databasePromise=null,accountsCache=[],accountsReady=false,selectedNick='';

  const byId=id=>document.getElementById(id);
  const normalizeNick=value=>String(value||'').trim().toLowerCase();
  const currentUser=()=>{
    try{return typeof me!=='undefined'&&me?me:(window.me||null);}catch(error){return window.me||null;}
  };

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

  async function deleteRecord(id){
    const database=await openDatabase();
    return new Promise((resolve,reject)=>{
      const transaction=database.transaction(STORE_NAME,'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error||new Error('DB_DELETE_FAILED'));
      transaction.onabort=()=>reject(transaction.error||new Error('DB_DELETE_ABORTED'));
    });
  }

  async function encryptionKey(){
    if(!window.crypto?.subtle)throw new Error('NO_WEB_CRYPTO');
    const savedKey=await readRecord(KEY_ID);
    if(savedKey?.type==='secret'&&savedKey.algorithm?.name==='AES-GCM')return savedKey;
    const newKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await writeRecord(KEY_ID,newKey);return newKey;
  }

  async function encryptRecord(id,value){
    const key=await encryptionKey(),iv=crypto.getRandomValues(new Uint8Array(12));
    const encoded=new TextEncoder().encode(JSON.stringify(value));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded);
    await writeRecord(id,{version:2,iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted)),savedAt:Date.now()});
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
      status:typeof profile.status==='string'?profile.status:'',
      moons:Number.isFinite(Number(profile.moons))?Math.max(0,Number(profile.moons)):0
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
      seen.add(account.nick);result.push(account);if(result.length>=MAX_ACCOUNTS)break;
    }
    return result.sort((a,b)=>b.savedAt-a.savedAt);
  }

  async function loadAccounts(force=false){
    if(accountsReady&&!force)return accountsCache;
    let accounts=[];
    try{accounts=sanitizeAccounts(await decryptRecord(ACCOUNTS_ID));}catch(error){}
    if(!accounts.length){
      try{
        const legacy=await decryptRecord(LEGACY_LOGIN_ID),account=safeAccount(legacy&&{...legacy,profile:{nick:legacy.nick,name:legacy.nick,av:0,moons:0},savedAt:legacy.savedAt});
        if(account)accounts=[account];
      }catch(error){}
    }
    accountsCache=accounts;accountsReady=true;return accountsCache;
  }

  async function persistAccounts(accounts){
    accountsCache=accounts.slice(0,MAX_ACCOUNTS);accountsReady=true;
    if(!accountsCache.length){
      await Promise.all([deleteRecord(ACCOUNTS_ID).catch(()=>{}),deleteRecord(LEGACY_LOGIN_ID).catch(()=>{})]);
      return;
    }
    await encryptRecord(ACCOUNTS_ID,{version:1,accounts:accountsCache});
    const latest=accountsCache[0];
    await encryptRecord(LEGACY_LOGIN_ID,{nick:latest.nick,password:latest.password,savedAt:latest.savedAt});
  }

  function balanceText(account){
    if(account.nick==='creator')return '∞ 🌙';
    const value=Math.max(0,Number(account.profile?.moons)||0);
    return new Intl.NumberFormat('ru-RU',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1}).format(value)+' 🌙';
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
    list.replaceChildren();
    for(const account of accountsCache){
      const card=document.createElement('article');card.className='saved-account-card-v75';card.dataset.nick=account.nick;if(account.nick===selectedNick)card.classList.add('selected');
      const main=document.createElement('button');main.type='button';main.className='saved-account-main-v75';main.setAttribute('aria-label','Войти как @'+account.nick);
      const avatar=document.createElement('span');avatar.className='saved-account-avatar-v75';avatarInto(avatar,account);
      const copy=document.createElement('span');copy.className='saved-account-copy-v75';
      const name=document.createElement('strong');name.textContent=account.profile?.name||account.nick;
      const nick=document.createElement('small');nick.textContent='@'+account.nick;
      copy.append(name,nick);
      const balance=document.createElement('span');balance.className='saved-account-balance-v75';balance.textContent=balanceText(account);
      const arrow=document.createElement('span');arrow.className='saved-account-arrow-v75';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
      main.append(avatar,copy,balance,arrow);main.onclick=()=>useAccount(account.nick);
      const remove=document.createElement('button');remove.type='button';remove.className='saved-account-remove-v75';remove.textContent='×';remove.title='Убрать аккаунт';remove.setAttribute('aria-label','Убрать @'+account.nick+' из списка');
      remove.onclick=event=>{event.stopPropagation();removeAccount(account.nick);};
      card.append(main,remove);list.appendChild(card);
    }
  }

  async function saveAccount(nick,password){
    const safeNick=normalizeNick(nick),user=currentUser();if(!safeNick||!password)return;
    const accounts=await loadAccounts();
    const profile=safeProfile(user&&normalizeNick(user.nick)===safeNick?user:null,safeNick);
    const next={nick:safeNick,password,profile,savedAt:Date.now()};
    const merged=[next,...accounts.filter(account=>account.nick!==safeNick)].slice(0,MAX_ACCOUNTS);
    await persistAccounts(merged);renderAccounts();
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
    const accounts=(await loadAccounts()).filter(account=>account.nick!==target);
    await persistAccounts(accounts);if(selectedNick===target)selectedNick='';renderAccounts();
    try{window.showToast?.('Аккаунт убран с этого устройства');}catch(error){}
  }

  function loginSucceeded(nick,result){
    if(result===true)return true;
    const authHidden=!byId('auth-screen')?.classList.contains('active');
    const chatVisible=byId('chat-screen')?.classList.contains('active');
    return Boolean(authHidden&&chatVisible&&normalizeNick(currentUser()?.nick)===nick);
  }

  function wrapLogin(){
    const previousLogin=window.doLogin;if(typeof previousLogin!=='function'||previousLogin.savedAccountsWrappedV75)return;
    const wrapped=async function(...args){
      const nick=normalizeNick(byId('l-login')?.value),password=byId('l-pass')?.value||'';
      const result=await previousLogin.apply(this,args);
      if(loginSucceeded(nick,result))await saveAccount(nick,password).catch(()=>{try{window.showToast?.('Не удалось сохранить аккаунт на этом устройстве');}catch(error){}});
      return result;
    };
    wrapped.savedAccountsWrappedV75=true;window.doLogin=wrapped;
  }

  async function init(){await loadAccounts();renderAccounts();}
  wrapLogin();init().catch(()=>renderAccounts());
  window.telechatAccountsV75=Object.freeze({
    list:async()=> (await loadAccounts()).map(account=>({nick:account.nick,profile:{...account.profile},savedAt:account.savedAt})),
    use:useAccount,
    remove:removeAccount,
    clear:async()=>{await persistAccounts([]);renderAccounts();}
  });
})();
