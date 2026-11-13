/** Build a small production-emitter gallery; Blender runs only when authoring the source asset. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {Matrix4} from 'three';
import {compile,parseAml,toGLB,resolveExportAssets} from '../../src/architecture/index.ts';
import {kitFinishes,kitMaterials} from '../../src/dressing/kit.ts';
import {KitMesh} from '../../src/dressing/kit-mesh.ts';
import {Pen} from '../../src/dressing/pen.ts';
import {Kit} from '../../src/dressing/kowloon/kit.ts';
import {canvasAwning} from '../../src/dressing/kowloon/tarps.ts';
import {srgb} from '../../src/dressing/kowloon/palette.ts';
import {Rng} from '../../src/generate/rng.ts';
import {compileSurfaceAppearance} from '../../src/dressing/surface/compile.ts';
import {withBuiltinMaterialImages} from '../../src/materials/images.ts';
import {build} from 'vite';
const output='generated/tarp-study';await mkdir(output,{recursive:true});
const level=await compile(parseAml(`<architecture version="1" id="tarp-study"><material id="backdrop" color="#a9a397" roughness="1"/><box id="wall" position="-.2 -.2 0" width="7.1" depth=".2" height="7.1" material="backdrop"/><box id="floor" position="-.6 -.5 -.1" width="8" depth="4" height=".1" material="backdrop"/></architecture>`),{navigation:false});
kitMaterials(level);level.mesh.colors??=level.mesh.positions.map(()=>1);
const forms=JSON.parse(await readFile('src/dressing/kowloon/assets/cloth-forms.json','utf8')).forms;
const kit=new Kit('tarp-gallery',1,.9,.3,true,48,.45);
const colors=['#829080','#788d97','#c9c0a7','#9c7d6e'];
const views=[];
for(let i=0;i<forms.length;i++){
 let key='';for(let j=0;;j++){key=`gallery-${j}`;if(new Rng(`${kit.seed}/${key}/0`).int(0,forms.length-1)===i)break;}
 const x=i%2*3.65,z=3.2+Math.floor(i/2)*3.2;
 const mesh=new KitMesh(level,`tarp-${forms[i].id}`,'study',kitFinishes(level,undefined,'backdrop').materials,{maximumTriangles:100000});
 const pen=new Pen(mesh,forms[i].id,new Matrix4().makeTranslation(x,0,0),false);
 canvasAwning(pen,{x0:0,x1:3,z,depth:1.1,drop:.48},srgb(colors[i]),srgb('#b8b4a5'),key,kit);
 views.push({id:forms[i].id,x,z,triangles:forms[i].indices.length/3});
}
const images=withBuiltinMaterialImages();
await compileSurfaceAppearance(level,{navigation:false,resolveMaterialImage:images,appearance:{maximumTexels:4*1024*1024,maximumCharts:4096}},100000);
if(level.diagnostics.some(d=>d.severity==='error'))throw new Error(JSON.stringify(level.diagnostics));
await writeFile(`${output}/tarps.glb`,toGLB(level,{assets:await resolveExportAssets(level,images)}));
await writeFile(`${output}/views.json`,JSON.stringify(views));
await writeFile(`${output}/budget.json`,JSON.stringify({triangles:level.mesh.indices.length/3,appearance:level.surfaceAppearance},null,2));
await build({configFile:false,logLevel:'warn',build:{outDir:output,emptyOutDir:false,lib:{entry:'projects/kowloon-tarps/preview.mjs',formats:['es'],fileName:()=> 'preview.js'}}});
await writeFile(`${output}/index.html`,await readFile('projects/kowloon-tarps/preview.html'));
console.log(`Tarp gallery: ${views.length} forms, ${level.mesh.indices.length/3} triangles.`);
