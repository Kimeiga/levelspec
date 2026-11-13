import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root='generated/ninefold-reboot-r08-';const out='projects/ninefold-reboot/reviews/evidence/compiled-r08/boards';await mkdir(out,{recursive:true});
const sets=[['interiors',12],['coverage',8],['low-cover',4],['table',4]];
const boards=[];
for(const [dir,size] of sets){
 let data;try{data=JSON.parse(await readFile(root+dir+'/capture.json'));}catch{continue;}
 const captures=data.captures.filter(x=>x.mode==='actual physical inspection stance');
 for(let start=0;start<captures.length;start+=size){
  const chunk=captures.slice(start,start+size),columns=chunk.length<=4?2:4,width=columns*480,height=Math.ceil(chunk.length/columns)*386+42;
  const title=`Ninefold R08 / ${dir} ${Math.floor(start/size)+1} / actual walking camera / roof ON / 65 deg vertical FOV`;
  const compos=[{input:Buffer.from(`<svg width="${width}" height="42"><rect width="100%" height="100%" fill="#f6f5ec"/><text x="16" y="28" font-family="Arial" font-size="20">${title}</text></svg>`),left:0,top:0}];
  for(let i=0;i<chunk.length;i++){
   const c=chunk[i],left=i%columns*480,top=Math.floor(i/columns)*386+42;
   compos.push({input:await sharp(root+dir+'/'+c.id+'.png').resize(480,360,{fit:'contain',background:'#eee'}).toBuffer(),left,top:top+26});
   compos.push({input:Buffer.from(`<svg width="480" height="26"><rect width="100%" height="100%" fill="#e7e8df"/><text x="8" y="19" font-family="Arial" font-size="16">${c.id.replace('-actualwalk','')}</text></svg>`),left,top});
  }
  const file=`${dir}-${Math.floor(start/size)+1}.png`;await sharp({create:{width,height,channels:3,background:'#f6f5ec'}}).composite(compos).png().toFile(out+'/'+file);boards.push({file,sourceSha256:data.sourceSha256,sourceDirectory:root+dir,ids:chunk.map(x=>x.id)});
 }
}
await writeFile(out+'/index.json',JSON.stringify(boards,null,2)+'\n');console.log(boards.map(x=>x.file));
