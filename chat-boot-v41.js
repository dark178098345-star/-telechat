/* First sidebar load is local to the list, not a second full-screen loader. */
(()=>{
 'use strict';
 const before=renderContacts;
 let owner='',token=0;
 renderContacts=async function(...args){
  const nick=String(me?.nick||'').toLowerCase();
  if(!nick||owner===nick)return before.apply(this,args);
  owner=nick;const current=++token,list=document.getElementById('contacts-list');
  const busy=!!list&&!list.children.length;
  if(busy){list.classList.add('contacts-pending-v201');list.setAttribute('aria-busy','true');}
  try{return await before.apply(this,args);}
  finally{if(current===token){list?.classList.remove('contacts-pending-v201');list?.removeAttribute('aria-busy');}}
 };
})();
