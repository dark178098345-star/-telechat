'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sandbox={window:{},performance};
for(const file of ['mesh-art-v229.js','gift-art-v198.js'])vm.runInNewContext(read(file),sandbox,{filename:file});
const art=sandbox.window.exstraGiftArtV198;
const catalog=[...read('supabase-moons-v20.sql').matchAll(/^\('([^']+)','[^']+','[^']*',\d+,'[^']+','[^']+',(true|false),/gm)].map(m=>m[1]);
assert.equal(catalog.length,37);
assert.deepEqual(Array.from(art.ids()).sort(),catalog.sort());
let maxFaces=0;
for(const id of [...catalog,'fallback']){
 const geometries=new Set();
 for(let angle=0;angle<8;angle++){
  const svg=art.view(id,angle),geometry=[...svg.matchAll(/ d="M([^"]+)"/g)].map(m=>m[1]);
  assert(geometry.length>4&&geometry.length<=320,id+' has a bounded face count from every angle');
  maxFaces=Math.max(maxFaces,geometry.length);
  const coords=geometry.join(' ').match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert(!/NaN|Infinity/.test(svg)&&coords.every(n=>n>=8&&n<=152),id+' fits inside the 160×160 stage');
  geometries.add(geometry.join(' '));
 }
 assert(geometries.size>=4,id+' produces distinct geometric views');
 assert(!art.html(id).includes(' src='),id+' does not render until its catalog card becomes visible');
}
assert.equal(art.view('<script>'),art.view('fallback'));
console.log('PASS V229: 37 catalog models, 8 views per model, maximum '+maxFaces+' visible faces, bounded stage, lazy previews.');
