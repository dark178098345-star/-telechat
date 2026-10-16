// Deterministic format/size conversion of the supplied artwork. No redrawing,
// cropping, background removal or colour changes; keep the original as master.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const master=path.join(root,'branding/exstrachat-logo-v178.png');
async function main(){
 if(process.argv[2])fs.copyFileSync(path.resolve(process.argv[2]),master);
 const meta=await sharp(master).metadata();
 if(meta.width!==meta.height)throw new Error('The supplied logo must be square');
 const png=size=>sharp(master).resize(size,size,{kernel:'lanczos3'}).png({compressionLevel:9}).toBuffer();
 for(const size of [128,256])await sharp(master).resize(size,size).webp({quality:90,effort:6}).toFile(path.join(root,`branding/logo-v178-${size}.webp`));
 for(const [file,size] of [['favicon-16.png',16],['favicon-32.png',32],['favicon-48.png',48],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['desktop-app/assets/icon.png',512],['android-app/app/src/main/res/drawable/telechat_icon.png',512]])fs.writeFileSync(path.join(root,file),await png(size));
 // Windows ICO directory with PNG frames (Windows Vista and newer).
 const sizes=[16,24,32,48,64,128,256],frames=await Promise.all(sizes.map(png));
 const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
 let offset=header.length;
 frames.forEach((frame,i)=>{const entry=6+i*16;header[entry]=header[entry+1]=sizes[i]===256?0:sizes[i];header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(frame.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=frame.length;});
 const ico=Buffer.concat([header,...frames]);
 for(const file of ['favicon.ico','desktop-app/assets/icon.ico'])fs.writeFileSync(path.join(root,file),ico);
 console.log('Built logo variants, PWA/Apple/favicons, Windows and Android source icons from the supplied master');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
