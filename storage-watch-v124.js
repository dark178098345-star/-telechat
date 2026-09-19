/* App storage, not RAM or total free device disk. Never deletes personal files. */
(() => {
  'use strict';
  let state={usage:null,quota:null,ratio:null},job=null,lastCheck=0,lastNotice=0,notice,forcedFull=false,lastFull=false;
  const quotaError=error=>error?.name==='QuotaExceededError'||error?.code===22||error?.code===1014;
  function warn(full=false){
    const now=Date.now();if(now-lastNotice<15*60000&&notice?.hidden&&(!full||lastFull))return;
    lastNotice=now;lastFull=full;
    if(!notice){notice=document.createElement('aside');notice.id='storage-notice-v124';notice.setAttribute('role','alert');notice.innerHTML='<strong></strong><p></p><button type="button">Понятно</button>';notice.querySelector('button').onclick=()=>{notice.hidden=true;};document.body.append(notice);}
    notice.hidden=false;notice.querySelector('strong').textContent=full?'Хранилище tele.chat заполнено':'Хранилище tele.chat почти заполнено';
    notice.querySelector('p').textContent=full?'Не удалось сохранить данные на устройстве. Удали ненужные скачанные треки или освободи место. Чаты на сервере не удалены.':'Для новых файлов скоро может не хватить места. Проверь раздел «Статистика» и удали ненужные скачанные треки.';
  }
  async function check(force=false){
    if(job)return job;if(!navigator.storage?.estimate)return state;
    if(!force&&(document.hidden||Date.now()-lastCheck<60000))return state;lastCheck=Date.now();
    job=navigator.storage.estimate().then(value=>{
      const usage=Number(value.usage),quota=Number(value.quota);
      state={usage:Number.isFinite(usage)?usage:null,quota:quota>0?quota:null,ratio:quota>0?usage/quota:null};
      if(state.ratio>=.9)warn(forcedFull||state.ratio>=.98);else if(notice&&!forcedFull)notice.hidden=true;
      window.dispatchEvent(new CustomEvent('telechat-storage-v124',{detail:{...state}}));return state;
    }).catch(()=>state).finally(()=>{job=null;});return job;
  }
  function report(error){if(quotaError(error)){forcedFull=true;warn(true);check(true);}return error;}
  window.telechatStorageV124={check,report,getState:()=>({...state})};
  window.addEventListener('unhandledrejection',event=>report(event.reason));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  setInterval(()=>check(),60000);setTimeout(()=>check(),3000);
})();
