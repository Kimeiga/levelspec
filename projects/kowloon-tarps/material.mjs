/** Publish a shared canvas base color and intrinsic micro-relief/roughness channels. */
import sharp from 'sharp';
import {copyFile} from 'node:fs/promises';
const source=new URL('./assets/tarp-color-source.png',import.meta.url);
const out=new URL('../../src/materials/library/',import.meta.url);
await copyFile(source,new URL('tarp.png',out));
const {data,info}=await sharp(source.pathname).removeAlpha().raw().toBuffer({resolveWithObject:true});
const blurred=await sharp(source.pathname).removeAlpha().blur(2).raw().toBuffer();
const normal=Buffer.alloc(info.width*info.height*3),properties=Buffer.alloc(normal.length);
const wrap=(v,n)=>(v+n)%n;
const height=(x,y)=>{const k=(wrap(y,info.height)*info.width+wrap(x,info.width))*3;let sum=0;for(let c=0;c<3;c++)sum+=data[k+c]-blurred[k+c];return sum/(3*255)};
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const k=(y*info.width+x)*3;
 // Only fine fiber relief contributes; broad color stains never become false folds.
 const dx=(height(x+1,y)-height(x-1,y))*1.6,dy=(height(x,y+1)-height(x,y-1))*1.6;
 const length=Math.hypot(dx,dy,1);
 normal[k]=Math.round(127.5-dx/length*127.5);normal[k+1]=Math.round(127.5+dy/length*127.5);normal[k+2]=Math.round(127.5+127.5/length);
 const luminance=(blurred[k]+blurred[k+1]+blurred[k+2])/(3*255);
 properties[k]=255;properties[k+1]=Math.round(220+(1-luminance)*27);properties[k+2]=0;
}
await sharp(normal,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(new URL('tarp-normal.png',out).pathname);
await sharp(properties,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(new URL('tarp-properties.png',out).pathname);
console.log(`Published ${info.width}×${info.height} canvas PBR maps.`);
