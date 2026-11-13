/** Export a numbered, self-contained revision of the explicit reference-building composition. */
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from 'vite';
import {compile,parseAml,toGLB,resolveExportAssets} from '../../src/architecture/index.ts';
import {compileSurfaceAppearance} from '../../src/dressing/surface/compile.ts';
import {localMaterialImages} from '../../src/cli/material-images.ts';
import {meshParts} from '../../src/vector/mesh.ts';
import {hash} from '../../src/vector/geometry.ts';
import {collisionMesh} from '../../src/vector/collision.ts';
import {createDiskMaterialCache} from '../../tools/dressing-demo/material-cache.ts';
import {rasterCodeHash} from '../../tools/dressing-demo/raster-protocol.ts';
import {dressReferenceBuilding} from './building.ts';
const revision=process.argv[2]??'r01';if(!/^[a-z0-9-]+$/.test(revision))throw new Error('Use a simple revision name.');
const output=`generated/reference-building/${revision}`;await mkdir('generated/reference-building',{recursive:true});await mkdir(output);
const source='projects/kowloon-reference-building/level.aml';
const sourceBytes=await readFile(source);const images=localMaterialImages(source);
const started=performance.now();
const level=await compile(parseAml(sourceBytes.toString()),{navigation:false,resolveMaterialImage:images.load});
const physicalBefore=await hash(collisionMesh(level,true));
level.mesh=structuredClone(level.mesh);level.mesh.colors??=level.mesh.positions.map(()=>1);
dressReferenceBuilding(level);
const maximumTriangles=700000;
await compileSurfaceAppearance(level,{navigation:false,resolveMaterialImage:images.load,
 materialCache:createDiskMaterialCache(resolve('generated/material-cache'),await rasterCodeHash()),
 appearance:{maximumTexels:48*1024*1024,maximumBytes:384*1024*1024,maximumCharts:65536},
 onProgress:stage=>console.error(`${revision}: ${stage}`)},maximumTriangles);
if(await hash(collisionMesh(level,true))!==physicalBefore)throw new Error('Reference dressing changed authored collision.');
if(level.diagnostics.some(d=>d.severity==='error'))throw new Error(JSON.stringify(level.diagnostics));
for(const values of [level.mesh.positions,level.mesh.normals,level.mesh.uv])if(!values.every(Number.isFinite))throw new Error('Non-finite visual geometry.');
level.parts=meshParts(level.mesh,level.surfaces);
level.stats={...level.stats,triangles:level.mesh.indices.length/3,vertices:level.mesh.positions.length/3,meshes:level.parts.length};
level.renderHash=await hash({mesh:level.mesh,materials:level.document.materials,surfaceAppearance:level.surfaceAppearance});
const bytes=toGLB(level,{assets:await resolveExportAssets(level,images.load)});
await writeFile(`${output}/building.glb`,bytes);await writeFile(`${output}/level.aml`,sourceBytes);
await cp('projects/kowloon-reference-building/building.ts',`${output}/building-source.ts`);
await cp('projects/kowloon-reference-building/parts',`${output}/parts`,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const manifest={revision,glbSha256:sha(bytes),referenceSha256:sha(await readFile('projects/kowloon-reference-building/reference/target.png')),
 sourceSha256:sha(sourceBytes),renderHash:level.renderHash,physicalHash:level.physicalHash,triangles:level.mesh.indices.length/3,texels:level.surfaceAppearance?.texels,textureBytes:level.surfaceAppearance?.imageBytes,glbBytes:bytes.length,seconds:(performance.now()-started)/1000};
await writeFile(`${output}/build.json`,JSON.stringify(manifest,null,2));
await build({configFile:false,logLevel:'warn',build:{outDir:resolve(output),emptyOutDir:false,lib:{entry:resolve('projects/kowloon-reference-building/preview.mjs'),formats:['es'],fileName:()=> 'preview.js'}}});
const rooms=JSON.parse(await readFile('projects/kowloon-reference-building/interiors.json','utf8'));
await writeFile(`${output}/lighting.json`,JSON.stringify({coordinates:'right-handed Z-up meters',effect:'Runtime room shading: depth-based daytime attenuation and warm nighttime lift. GLB pigments remain unchanged.',rooms},null,2));
await cp('projects/kowloon-reference-building/preview.html',`${output}/index.html`);
console.log(JSON.stringify(manifest));
