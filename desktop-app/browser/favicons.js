'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const MAX_ICON=128*1024,MAX_ENTRIES=32,DAY=86400000;
function publicURL(value){
 try{const url=new URL(value),host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if(url.protocol!=='https:'||url.username||url.password||url.port&&!['443'].includes(url.port)||!host.includes('.')||/(?:^|\.)(?:localhost|local|internal|home|test|invalid)$/.test(host))return null;
  if(host.includes(':'))return null;
  if(/^\d+\.\d+\.\d+\.\d+$/.test(host)){const [a,b]=host.split('.').map(Number);if(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a>=224)return null;}
  url.hash='';return url;
 }catch{return null;}
}
function png(bytes){return bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(16)<=512&&bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=512;}
function iconData(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length>MAX_ICON)return '';
 let mime='';if(png(bytes))mime='image/png';
 else if(bytes.length>=22&&bytes.readUInt16LE(0)===0&&bytes.readUInt16LE(2)===1){
  const count=bytes.readUInt16LE(4);if(!count||count>32||6+count*16>bytes.length)return '';
  for(let i=0;i<count;i++){const p=6+i*16,size=bytes.readUInt32LE(p+8),offset=bytes.readUInt32LE(p+12);if(!size||offset<6+count*16||offset+size>bytes.length)return '';const data=bytes.subarray(offset,offset+size);if(data[0]===137){if(!png(data))return '';}else if(data.length<40||data.readUInt32LE(0)<40||data.readInt32LE(4)<=0||data.readInt32LE(4)>512||Math.abs(data.readInt32LE(8))>1024)return '';}
  mime='image/x-icon';
 }
 return mime?'data:'+mime+';base64,'+bytes.toString('base64'):'';
}
function fetchIcon(net,url,controllers){
 return new Promise((resolve,reject)=>{
  if(!publicURL(url))return reject(Error('UNSUPPORTED_ORIGIN'));
  const request=net.request({url,method:'GET',redirect:'manual',credentials:'omit',useSessionCookies:false,cache:'no-store'});let finished=false,total=0,redirects=0;const chunks=[];
  const finish=(error,data)=>{if(finished)return;finished=true;clearTimeout(timer);controllers.delete(request);error?reject(error):resolve(data);};
  const timer=setTimeout(()=>{finish(Error('ICON_TIMEOUT'));request.abort();},8000);controllers.add(request);
  request.on('redirect',(_status,_method,next)=>{if(++redirects>4||!publicURL(next)){finish(Error('UNSAFE_REDIRECT'));request.abort();}else request.followRedirect();});
  request.on('login',(_info,callback)=>callback());request.on('error',error=>finish(error));request.on('abort',()=>finish(Error('ICON_ABORTED')));
  request.on('response',response=>{
   if(response.statusCode!==200){finish(Error('ICON_UNAVAILABLE'));request.abort();return;}
   response.on('end',()=>{const data=iconData(Buffer.concat(chunks));finish(data?null:Error('ICON_FORMAT'),data);});
   response.on('error',error=>finish(error));response.on('aborted',()=>finish(Error('ICON_ABORTED')));
   response.on('data',chunk=>{if(finished)return;total+=chunk.length;if(total>MAX_ICON){finish(Error('ICON_TOO_LARGE'));request.abort();return;}chunks.push(Buffer.from(chunk));});
  });request.end();
 });
}
class FaviconCache{
 constructor({file=null,net=null,onChange=()=>{}}={}){this.file=file;this.net=net;this.onChange=onChange;this.entries=new Map();this.wanted=new Map();this.hints=new Map();this.flights=new Map();this.controllers=new Set();this.active=false;this.loaded=false;this.writer=Promise.resolve();this.saveTimer=null;}
 load(){if(this.loaded)return Promise.resolve();if(this.loading)return this.loading;this.loading=(async()=>{try{if(!this.file)return;const stat=await fs.stat(this.file);if(stat.size>6*1024*1024)return;const data=JSON.parse((await fs.readFile(this.file,'utf8')).replace(/^\uFEFF/,''));if(data.version!==1||!Array.isArray(data.items))return;for(const item of data.items.slice(0,MAX_ENTRIES)){const url=publicURL(item.origin);if(!url||url.origin!==item.origin||typeof item.data!=='string'||item.data.length>MAX_ICON*1.4)continue;const match=/^data:image\/(?:png|x-icon);base64,([A-Za-z0-9+/=]+)$/.exec(item.data);if(item.data&&(!match||iconData(Buffer.from(match[1],'base64'))!==item.data))continue;this.entries.set(item.origin,{data:item.data,expires:Number(item.expires)||0,used:Number(item.used)||0});}}catch{}finally{this.loaded=true;}})().finally(()=>this.loading=null);return this.loading;}
 get(value){const origin=publicURL(value)?.origin;if(!origin)return '';const entry=this.entries.get(origin);if(entry)entry.used=Date.now();return entry?.data||'';}
 ensure(items){this.active=true;this.wanted=new Map(items.filter(item=>item.icon==='auto'||!item.icon).flatMap(item=>{const url=publicURL(item.url);return url?[[url.origin,url.origin+'/favicon.ico']]:[];}));this.plan();}
 observe(page,urls){const origin=publicURL(page)?.origin;if(!origin||!this.wanted.has(origin)||this.entries.get(origin)?.data)return;const url=Array.isArray(urls)?urls.find(value=>publicURL(value)&&/\.(?:ico|png)(?:[?#]|$)/i.test(value)):null;if(!url||this.hints.get(origin)===url)return;this.hints.set(origin,url);const entry=this.entries.get(origin);if(entry)entry.expires=0;this.plan();}
 plan(){
  if(!this.active||!this.net?.request)return;
  for(const [origin,fallback]of this.wanted){if(this.flights.size>=2)break;if(this.flights.has(origin)||(this.entries.get(origin)?.expires||0)>Date.now())continue;
   const flight=fetchIcon(this.net,this.hints.get(origin)||fallback,this.controllers).then(data=>{this.entries.set(origin,{data,expires:Date.now()+7*DAY,used:Date.now()});try{this.onChange();}catch{}},error=>{if(error.message!=='ICON_ABORTED')this.entries.set(origin,{data:this.entries.get(origin)?.data||'',expires:Date.now()+DAY/4,used:Date.now()});}).finally(()=>{this.flights.delete(origin);if(this.entries.size>MAX_ENTRIES){const keep=[...this.entries].sort((a,b)=>b[1].used-a[1].used).slice(0,MAX_ENTRIES);this.entries=new Map(keep);}clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.flush(),250);this.plan();});this.flights.set(origin,flight);
  }
 }
 async idle(){while(this.flights.size)await Promise.all([...this.flights.values()]);}
 flush(){clearTimeout(this.saveTimer);if(!this.file)return Promise.resolve();const data=JSON.stringify({version:1,items:[...this.entries].map(([origin,entry])=>({origin,...entry}))});this.writer=this.writer.catch(()=>{}).then(async()=>{const temp=this.file+'.'+randomUUID()+'.tmp';try{await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(temp,data,{flag:'wx'});await fs.rename(temp,this.file);}catch{await fs.unlink(temp).catch(()=>{});}});return this.writer;}
 pause(){this.active=false;this.wanted.clear();for(const request of this.controllers)request.abort();}
}
module.exports={FaviconCache,fetchIcon,iconData,publicURL};
