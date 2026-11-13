import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {validateBytes} from 'gltf-validator';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';

const output=process.argv[2];
if(!output)throw new Error('Provide a new output directory');
await mkdir(output,{recursive:false});
const plan=JSON.parse(await readFile('projects/kowloon-liquor-props/lowpoly-regeneration-plan.json','utf8'));
const models=[];
for(const step of plan.steps){
 let result;
 try{result=JSON.parse(await readFile(`generated/liquor-props/lowpoly-regeneration/${step.asset}.stdout.json`,'utf8'));}
 catch{continue;}
 if(result.status!=='success')continue;
 const bytes=await readFile(result.model_file);
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const triangles=gltf.meshes.flatMap(mesh=>mesh.primitives).reduce((sum,primitive)=>sum+gltf.accessors[primitive.indices].count/3,0);
 const validation=await validateBytes(bytes,{maxIssues:30});
 assert.equal(validation.issues.numErrors,0,`${step.asset}: invalid GLB`);
 models.push({name:step.asset,path:result.model_file,taskId:result.task_id,credits:result.credits_consumed,
  requestedTriangles:step.faceLimit,triangles,sha256:createHash('sha256').update(bytes).digest('hex'),validation:validation.issues});
}
assert.ok(models.length,'No completed models to compare');
await writeFile(resolve(output,'models.json'),JSON.stringify(models,null,2));
await writeFile(resolve(output,'index.html'),`<!doctype html><html><head><style>body{margin:0;background:#292e34;color:white;font:16px system-ui}header{position:absolute;top:12px;width:100%;display:flex;justify-content:space-around;pointer-events:none}canvas{display:block}</style></head><body><header><span id="left"></span><span id="right"></span></header><script type="module" src="./viewer.mjs"></script></body></html>`);
await writeFile(resolve(output,'viewer.mjs'),`
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const models=await(await fetch('./models.json')).json();
const catalog=await(await fetch('/src/dressing/kowloon/shop/assets/grocer-props.json')).json();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,640);renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const loader=new THREE.TextureLoader();
const [map,normalMap,properties]=await Promise.all(['','-normal','-properties'].map(suffix=>loader.loadAsync('/projects/dressing-demo/textures/grocer-props'+suffix+'.png')));map.colorSpace=THREE.SRGBColorSpace;
const material=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap:properties,metalnessMap:properties,roughness:1,metalness:1});
const gltf=new GLTFLoader();let active=[];
/** Places a Z-up mesh on the support using one uniform scale and no axis stretching. */
function normalize(root,height){root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root);const size=box.getSize(new THREE.Vector3());root.scale.multiplyScalar(height/size.z);root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);root.position.set(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-box.min.z);root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray();}
/** Compares the approved catalog mesh and unmodified generated GLB under identical light/camera. */
window.compare=async(name,view)=>{
 document.body.dataset.ready='false';for(const root of active)root.traverse(o=>o.geometry?.dispose());active=[];
 const asset=catalog[name],height=asset.size[2],base=new THREE.Group(),geometry=new THREE.BufferGeometry(),corners=asset.faces.flat();
 for(const [attribute,start,length] of [['position',0,3],['normal',3,3],['uv',6,2]])geometry.setAttribute(attribute,new THREE.Float32BufferAttribute(corners.flatMap(v=>v.slice(start,start+length)),length));
 base.add(new THREE.Mesh(geometry,material));
 const model=models.find(m=>m.name===name),candidate=new THREE.Group(),loaded=await gltf.loadAsync('/'+model.path);loaded.scene.rotation.x=Math.PI/2;candidate.add(loaded.scene);candidate.rotation.z=-Math.PI/2;
 const size=normalize(candidate,height);active=[base,candidate];
 const span=Math.max(...asset.size,...size),directions={front:[.9,-2.6,1.1],side:[2.6,0,.8],back:[1,2.4,1]};
 renderer.setScissorTest(true);
 for(const [index,root] of active.entries()){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#292e34');scene.add(new THREE.HemisphereLight('#ecf2ff','#625746',2));
  const key=new THREE.DirectionalLight('#fff3df',3);key.position.set(-2,-3,5);scene.add(key);const fill=new THREE.DirectionalLight('#dbe9ff',1);fill.position.set(3,2,3);scene.add(fill);
  if(view==='context'){
   for(let x=0;x<4;x++)for(let y=0;y<2;y++){const item=root.clone();item.position.x+=(x-1.5)*span*1.12;item.position.y+=y*span*1.12;scene.add(item);}
   const shelf=new THREE.Mesh(new THREE.BoxGeometry(span*5,span*2.6,.015),new THREE.MeshStandardMaterial({color:'#75624d',roughness:.9}));shelf.position.set(0,span*.5,-.0075);scene.add(shelf);
  }else scene.add(root);
  const camera=new THREE.PerspectiveCamera(40,600/640,.001,100);camera.up.set(0,0,1);const direction=view==='context'?[2,-6,3]:directions[view];camera.position.set(direction[0]*span,direction[1]*span,height/2+direction[2]*span);camera.lookAt(0,0,height/2);camera.updateProjectionMatrix();renderer.setViewport(index*600,0,600,640);renderer.setScissor(index*600,0,600,640);renderer.render(scene,camera);
 }
 document.querySelector('#left').textContent=name+' — current '+asset.faces.length+' triangles';document.querySelector('#right').textContent='Tripo '+model.triangles+' triangles (requested '+model.requestedTriangles+')';
 window.comparison={name,view,baselineTriangles:asset.faces.length,candidateTriangles:model.triangles,candidateSize:size};document.body.dataset.ready='true';
};
await window.compare(models[0].name,'front');
`);
let browser;const errors=[],captures=[];
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve(output,'.vite'),server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
try{
 await server.listen();browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1200,height:640}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/${output}/index.html`);await page.waitForSelector('body[data-ready="true"]');
 for(const model of models)for(const view of ['front','side','back','context']){
  await page.evaluate(({name,view})=>window.compare(name,view),{name:model.name,view});await waitForFrames(page,2);
  const file=`${model.name}-${view}.png`;await page.screenshot({path:resolve(output,file)});captures.push({file,...await page.evaluate(()=>window.comparison)});
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'capture.json'),JSON.stringify({models,captures,errors},null,2));
}finally{await browser?.close();await server.close();}
console.log(`${captures.length} matched raw-model comparisons saved to ${output}`);
