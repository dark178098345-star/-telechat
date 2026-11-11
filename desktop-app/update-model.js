(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.exstraUpdateModel=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const version=value=>typeof value==='string'&&/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(value)?value.split('.').map(Number):null;
 function newer(next,current){const a=version(next),b=version(current);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
 function manifest(input){
  if(!input||input.schema!==1||!version(input.version)||input.platform!=='win32'||input.arch!=='x64')throw Error('Неподдерживаемое обновление.');
  const expected='https://github.com/dark178098345-star/-telechat/releases/download/v'+input.version+'/ExstraChat-Setup-'+input.version+'.exe';
  if(input.url!==expected||typeof input.sha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(input.sha256)||!Number.isSafeInteger(input.size)||input.size<1024||input.size>400*1024*1024)throw Error('Не удалось проверить сведения об обновлении.');
  return {schema:1,version:input.version,platform:'win32',arch:'x64',url:expected,sha256:input.sha256.toLowerCase(),size:input.size,notes:Array.isArray(input.notes)?input.notes.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,240)):[]};
 }
 return Object.freeze({newer,manifest});
});
