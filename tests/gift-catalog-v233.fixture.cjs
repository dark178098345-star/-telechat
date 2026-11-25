const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
module.exports=(now=Date.now())=>['supabase-moons-v20.sql','supabase-gifts-week-v233.sql'].flatMap((name,index)=>
 [...fs.readFileSync(path.join(root,name),'utf8').matchAll(/^\('([^']+)','([^']+)','[^']*',(\d+),'([^']+)','([^']+)',(true|false),/gm)]
 .map(m=>({id:m[1],name:m[2],price:+m[3],rarity:m[4],theme:m[5],limited:m[6]==='true',available_until:m[6]==='true'?(index?now+604800000:1):null})));
