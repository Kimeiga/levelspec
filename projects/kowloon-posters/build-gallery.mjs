/** Builds the inspectable AML placement example and a GLB using the public compiler. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compile,parseAml,resolveExportAssets,toGLB,POSTER_DESIGNS} from '../../src/architecture/index.ts';
import {validateBytes} from 'gltf-validator';
import assert from 'node:assert/strict';
const root='projects/kowloon-posters';
const aml=`<architecture version="1" id="poster-gallery" validation="premap">
 <material id="paint" color="#858c80" roughness=".95"/>
 <material id="print-wall-posters" color="#ffffff" roughness=".96" texture="textures/posters-atlas.jpg"/>
 <path id="wall-axis" points="0 0 0; 5.4 0 0"/>
 <wall id="wall" path="wall-axis" height="2.8" thickness=".15" material="paint"/>
 <dressing seed="poster-library" finishes="print">
 ${POSTER_DESIGNS.map((design,i)=>`<poster id="${design}" host="wall" face="front" design="${design}" at="${(.44+i%8*.64).toFixed(2)} ${i<8?1.95:.85}" width=".46" rotation="${[1.5,-2,0,3,-1.5,2,-3,0][i%8]}"/>`).join('\n ')}
 </dressing>
</architecture>\n`;
await writeFile(root+'/level.aml',aml);
const level=await compile(parseAml(aml),{navigation:false});
assert.deepEqual(level.diagnostics,[]);
const assets=await resolveExportAssets(level,reference=>readFile(root+'/'+reference));
const bytes=toGLB(level,{assets});
assert.equal((await validateBytes(bytes)).issues.numErrors,0);
await mkdir('generated/poster-library',{recursive:true});
await writeFile('generated/poster-library/gallery.glb',bytes);
console.log(JSON.stringify({triangles:level.mesh.indices.length/3,posterTriangles:16*6,glbBytes:bytes.length}));
