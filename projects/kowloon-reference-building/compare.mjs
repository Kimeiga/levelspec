/** Compose unchanged reference and actual render pixels with declared uniform framing. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision=process.argv[2]??'r01';if(!/^[a-z0-9-]+$/.test(revision))throw new Error('Invalid revision.');
const root=`generated/reference-building/${revision}`;
const reference=await readFile('projects/kowloon-reference-building/reference/target.png');
const render=await readFile(`${root}/hero.png`);
const crop={left:0,top:0,width:946,height:1024};
const width=1000,height=1120,pad=28,header=66;
const refPanel=await sharp(reference).extract(crop).resize(width,height,{fit:'contain',background:'#e8e2d9'}).png().toBuffer();
const modelPanel=await sharp(render).resize(width,height,{fit:'contain',background:'#e8e2d9'}).png().toBuffer();
const labels=Buffer.from(`<svg width="${width*2+pad*3}" height="${header}"><style>text{font-family:Arial,sans-serif;fill:#272722}</style><text x="28" y="28" font-size="21">REFERENCE · Original concept</text><text x="1056" y="28" font-size="21">RENDER · ${revision} · Real-time lighting</text><text x="28" y="53" font-size="13">Main-building crop; complete source retained below. Camera is approximate, not pixel-calibrated.</text></svg>`);
const context=await sharp(reference).resize(1000,667,{fit:'contain',background:'#e8e2d9'}).png().toBuffer();
const output=`${root}/comparison.png`;
await sharp({create:{width:width*2+pad*3,height:header+height+pad*2+667,channels:3,background:'#e8e2d9'}}).composite([{input:labels,top:0,left:0},{input:refPanel,top:header,left:pad},{input:modelPanel,top:header,left:width+pad*2},{input:context,top:header+height+pad,left:pad}]).png().toFile(output);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
await writeFile(`${root}/comparison.json`,JSON.stringify({revision,camera:'diagnostic approximation',referenceSha256:sha(reference),renderSha256:sha(render),referenceCrop:crop,renderCrop:null,fit:'uniform contain',capture:'capture.json',output:'comparison.png'},null,2));
console.log(output);
