'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {ShortcutStore,MAX_SHORTCUTS}=require('../desktop-app/browser/shortcuts');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'exstra-shortcuts-test-'));
 try{
  const file=path.join(dir,'shortcuts.json'),store=new ShortcutStore(file);await Promise.all([store.load(),store.load()]);assert(store.loaded);assert.deepEqual(store.list(),[]);
  for(const url of ['javascript:alert(1)','file:///C:/secret','data:text/html,hi','https://u:p@x.test','https://x.test/'+'я'.repeat(2000)])assert.equal((await store.mutate('save',{entry:{name:'No',url}})).ok,false);
  for(const entry of [{name:' ',url:'x.test'},{name:'x'.repeat(49),url:'x.test'},{name:'X',url:'x.test',icon:'unknown'}])assert.equal((await store.mutate('save',{entry})).ok,false);
  await Promise.all(Array.from({length:8},(_,i)=>store.mutate('save',{entry:{name:'Сайт '+i,url:'site'+i+'.test',icon:'globe'}})));
  assert.equal(store.list().length,8);assert.equal(new Set(store.list().map(x=>x.id)).size,8);
  const copy=store.list();copy[0].name='mutated';assert.equal(store.list()[0].name,'Сайт 0');
  const first=store.list()[0];assert((await store.mutate('save',{entry:{...first,name:'Обновлённый',url:'https://example.org/path'}})).ok);assert((await store.mutate('move',{id:first.id,step:1})).ok);assert.equal(store.list()[1].id,first.id);
  const reloaded=new ShortcutStore(file);await reloaded.load();assert.deepEqual(reloaded.list(),store.list());assert.equal(reloaded.error,'');
  assert((await store.mutate('remove',{id:first.id})).ok);assert.equal(store.list().length,7);assert.equal((await store.mutate('remove',{id:first.id})).ok,false);
  await Promise.all(Array.from({length:25},(_,i)=>store.mutate('save',{entry:{name:'Ещё '+i,url:'more.test/'+i}})));assert.equal(store.list().length,MAX_SHORTCUTS);
  assert.equal((await store.mutate('save',{entry:{name:'Overflow',url:'overflow.test'}})).ok,false);
  const persisted=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(persisted.items,store.list());assert.equal((await fs.readdir(dir)).filter(x=>x.endsWith('.tmp')).length,0);
  const corrupt=path.join(dir,'corrupt.json');await fs.writeFile(corrupt,'{"version":1,"items":[{"id":"x","name":"X","url":"javascript:evil"}]}');const broken=new ShortcutStore(corrupt);await broken.load();assert(broken.error);const before=await fs.readFile(corrupt,'utf8');assert.equal((await broken.mutate('save',{entry:{name:'No overwrite',url:'example.org'}})).ok,false);assert.equal(await fs.readFile(corrupt,'utf8'),before);
  const blocked=new ShortcutStore(path.join(file,'not-a-folder.json'));blocked.loaded=true;assert.equal((await blocked.mutate('save',{entry:{name:'Fail',url:'example.org'}})).ok,false);assert.equal(blocked.list().length,0,'Failed write never changes memory');
  console.log('PASS shortcuts store: persistent CRUD, concurrent atomic saves, bounds, invalid URLs, clone isolation, reload, corrupt-file protection and failed-write rollback');
 }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'exstra-shortcuts-test-'));await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
