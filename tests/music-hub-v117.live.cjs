/* Live smoke test: one generated, unpublished 1-second silent file only.
   --setup prints SQL for a five-minute ticket. Run that SQL in the project,
   then run this script without arguments. No user password is exported. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),stateFile=path.join(root,'outputs/music-storage-test-state.json');
if(process.argv.includes('--setup')){
 const state={id:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex')};fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(state));
 console.log(`insert into public.music_upload_tickets_v117(token_hash,folder,nick,reserved_size,expires_at) values('${crypto.createHash('md5').update(state.token).digest('hex')}','${state.id}','creator',16044,now()+interval '5 minutes');`);process.exit(0);
}
(async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),url=html.match(/const SUPABASE_URL='([^']+)'/)[1],key=html.match(/const SUPABASE_KEY='([^']+)'/)[1],headers={apikey:key,Authorization:'Bearer '+key};
 let r=await fetch(url+'/rest/v1/music_catalog_v117?select=id&limit=1',{headers});assert.equal(r.status,200,'Public catalog readable');
 r=await fetch(url+'/rest/v1/music_saves_v117?select=track_id&limit=1',{headers});assert.ok(!r.ok,'Private libraries not readable anonymously');
 r=await fetch(url+'/rest/v1/rpc/telechat_music_v117',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_nick:'creator',p_pass:'incorrect-test-'+crypto.randomUUID(),p_action:'library'})});assert.ok(!r.ok,'Wrong password rejected');
 const {id,token}=JSON.parse(fs.readFileSync(stateFile,'utf8')),object=id+'/audio.wav';
 const data=Buffer.alloc(16044);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(16000,40);
 const authHeaders={...headers,'x-telechat-music-token':token};let uploaded=false;
 try{
  r=await fetch(url+'/storage/v1/object/music-media/'+object,{method:'POST',headers:{...headers,'Content-Type':'audio/wav'},body:data});assert.ok(!r.ok,'Upload without ticket must be blocked');
  r=await fetch(url+'/storage/v1/object/music-media/'+object,{method:'POST',headers:{...authHeaders,'Content-Type':'audio/wav'},body:data});const msg=await r.text();assert.ok(r.ok,'Authorized upload: '+msg);uploaded=true;
  r=await fetch(url+'/storage/v1/object/public/music-media/'+object);assert.ok(r.ok,'Uploaded audio is publicly playable');assert.equal((await r.arrayBuffer()).byteLength,data.length);
  r=await fetch(url+'/storage/v1/object/music-media',{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[object]})});
  r=await fetch(url+'/storage/v1/object/public/music-media/'+object+'?verify=untouched');assert.ok(r.ok,'Unauthenticated deletion must not delete the file');
  console.log('PASS live: public catalog, private libraries, password check, authorized upload/playback, blocked anonymous upload/deletion.');
 }finally{if(uploaded){const result=await fetch(url+'/storage/v1/object/music-media',{method:'DELETE',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[object]})});assert.ok(result.ok,'Clean up generated smoke-test audio');console.log('Temporary unpublished audio removed.');}}
})().catch(e=>{console.error(e.message);process.exitCode=1});
