/** Exports each adopted prop through its actual production emitter for all-angle review. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {Matrix4} from 'three';
import {compile,createArchitecture,resolveExportAssets,toGLB} from '../../src/architecture/index.ts';
import {withBuiltinMaterialImages} from '../../src/materials/images.ts';
import {kitMaterials,kitFinishes} from '../../src/dressing/kit.ts';
import {KitMesh} from '../../src/dressing/kit-mesh.ts';
import {Pen} from '../../src/dressing/pen.ts';
import {BALCONY_PLANTS,BALCONY_LAUNDRY,balconyPlant,hangMeshGarment} from '../../src/dressing/kowloon/balcony-props.ts';
import catalog from '../../src/dressing/kowloon/assets/balcony-props.json' with {type:'json'};
const out=process.argv[2];if(!out)throw new Error('New output directory required');await mkdir(out,{recursive:false});
for(const name of [...BALCONY_PLANTS,...BALCONY_LAUNDRY]){
 const level=await compile(createArchitecture(name),{navigation:false});kitMaterials(level);level.mesh.colors=[];
 const pen=new Pen(new KitMesh(level,'asset','props',kitFinishes(level,undefined,'builtin:concrete').materials,{maximumTriangles:20000}),name,new Matrix4(),false);
 const asset=catalog[name];
 if(BALCONY_PLANTS.includes(name))balconyPlant(pen,name,[0,0,0],1,0);
 else{
  hangMeshGarment(pen,{kind:'mesh',asset:name,width:asset.width,drop:asset.drop+.015,scale:1,support:'line',tint:[1,1,1]},[-asset.width/2,0,asset.drop],[asset.width/2,0,asset.drop],0);
  pen.tube('paint',[[-asset.width*.65,0,asset.drop],[asset.width*.65,0,asset.drop]],.006,[.4,.35,.28],6);
 }
 const bytes=toGLB(level,{assets:await resolveExportAssets(level,withBuiltinMaterialImages(reference=>readFile(reference)))});
 await writeFile(out+'/'+name+'.glb',bytes);
 console.log(name,level.mesh.indices.length/3);
}
