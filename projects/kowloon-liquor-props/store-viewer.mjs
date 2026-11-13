import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {shopPreview} from './shop-preview.ts';
const enclosurePath=new URL(location.href).searchParams.get('enclosure');
if(enclosurePath){
 const select=document.querySelector('#view');
 for(const option of [...select.options])if(option.value!=='wide-store'&&!option.value.startsWith('layout-'))option.remove();
 select.add(new Option('walls-floor','walls-floor'));select.value='wide-store';
}
const layoutSeeds={bags:'layout-7','layout-front-left':'layout-2','layout-front-right':'layout-20','layout-side-left':'layout-5','layout-side-right':'layout-1','layout-recessed-left':'layout-7','layout-recessed-right':'layout-0'};
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
// The page owns the neutral backdrop so tone mapping affects only the actual scene.
const scene=new THREE.Scene();
const ambient=new THREE.HemisphereLight('#e7eeff','#9b8c6b',1.4);
ambient.position.set(0,0,1);scene.add(ambient);
const key=new THREE.DirectionalLight('#fff2dc',3);key.position.set(-2,-4,7);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.normalBias=.012;scene.add(key);
const fill=new THREE.PointLight('#fff4db',8,6,2);fill.position.set(1.2,1.4,2.4);scene.add(fill);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.01,100);camera.up.set(0,0,1);
const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,target);
const colorPass=new RenderPass(scene,camera);
const occlusion=new GTAOPass(scene,camera,innerWidth,innerHeight);
// A 22 cm world-space reach grounds small stock without shading entire shelf bays black.
occlusion.updateGtaoMaterial({radius:.22,thickness:.15,distanceExponent:1.3,distanceFallOff:1,scale:1,samples:16,screenSpaceRadius:false});
occlusion.updatePdMaterial({radius:4,rings:2,samples:16,lumaPhi:10,depthPhi:2,normalPhi:3});
occlusion.blendIntensity=.85;
const outputPass=new OutputPass();
for(const pass of [colorPass,occlusion,outputPass])composer.addPass(pass);
const aoControl=document.querySelector('#ao');
/** Redraws without rebuilding stock; both AO modes share HDR output and tone mapping. */
function drawFrame(){
 occlusion.enabled=aoControl.checked;composer.render();
 if(window.storeState){window.storeState.ambientOcclusion=occlusion.enabled;window.storeState.viewport={width:innerWidth,height:innerHeight,aspect:camera.aspect};}
}
aoControl.onchange=drawFrame;
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);drawFrame();
});
addEventListener('pagehide',event=>{
 if(event.persisted)return;
 colorPass.dispose();occlusion.dispose();occlusion.gtaoMaterial.dispose();occlusion.blendMaterial.dispose();
 outputPass.dispose();composer.dispose();
});
let enclosureTriangles=0;
if(enclosurePath){
 const loaded=await new GLTFLoader().loadAsync(enclosurePath);
 const enclosure=new THREE.Group();enclosure.rotation.x=Math.PI/2;enclosure.add(loaded.scene);
 loaded.scene.traverse(object=>{if(object.isMesh){
  enclosureTriangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
  object.castShadow=true;object.receiveShadow=true;
 }});scene.add(enclosure);
}
const loader=new THREE.TextureLoader(),cache=new Map();let root,request=0;
/** Share pending loads as well as decoded production maps. */
function texture(path,color=false){
 if(!path)return Promise.resolve(null);
 if(!cache.has(path))cache.set(path,loader.loadAsync(path).then(map=>{
  if(color)map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
 }));
 return cache.get(path);
}
/** Release scene geometry and materials; texture maps remain shared. */
function dispose(group){group?.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}
/** Render the current production generator with neutral shop lighting and real maps. */
async function render(){
 const current=++request,candidate=new THREE.Group();document.body.dataset.ready='false';
 const view=document.querySelector('#view').value, wide=Boolean(enclosurePath)||view==='wide-store'||view in layoutSeeds;
 const study=shopPreview(wide?3.6:2.4,2.9,2.6,view==='street-displays',layoutSeeds[view]??'layout-20');
 const renderedProps=[];let roomTriangles=0;
 for(const [index,surface] of study.surfaces.entries()){
  const room=surface.object==='study/$dressing/room';
  if(enclosurePath&&room)continue;
  const def=study.materials.find(m=>m.id===surface.material);
  const ids=study.mesh.surfaces.flatMap((s,t)=>s===index?study.mesh.indices.slice(t*3,t*3+3):[]);
  if(room)roomTriangles+=ids.length/3;
  const [map,normalMap,properties]=await Promise.all([texture(def.texture,true),texture(def.normalTexture),texture(def.metallicRoughnessTexture)]);
  if(current!==request){dispose(candidate);return;}
  const geometry=new THREE.BufferGeometry();
  for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['uv','uv',2],['color','colors',3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(ids.flatMap(i=>study.mesh[key].slice(i*size,i*size+size)),size));
  if(!room)renderedProps.push({surface,material:def,attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,value])=>[name,Array.from(value.array)]))});
  const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:def.color,vertexColors:true,map,normalMap,roughnessMap:properties,metalnessMap:properties,roughness:def.roughness,metalness:def.metalness}));
  object.castShadow=true;object.receiveShadow=true;candidate.add(object);
 }
 if(root){scene.remove(root);dispose(root);}root=candidate;scene.add(root);
 const cameras={bags:[[1.8,-2.2,1.15],[1.8,.3,.28]],'street-displays':[[2.3,-5.3,2.7],[2.3,0,.4]],storefront:[[1.2,-3.4,1.65],[1.2,1.3,1.2]],counter:[[2.0,-1.1,1.65],[1.8,.45,1.05]],chips:[[.52,-.8,2.15],[.52,.7,2.15]],crates:[[.55,-1.1,1.05],[.35,.35,.5]],'wide-store':[[1.8,-4.0,1.75],[1.8,1.3,1.25]]};
 const pose=view==='walls-floor'?[[1.1,-1.3,1.8],[3.2,.8,.9]]:cameras[view]??[[1.8,-3.8,2.7],[1.8,1.3,1.0]];
 camera.position.set(...pose[0]);camera.lookAt(...pose[1]);camera.updateProjectionMatrix();drawFrame();
 document.querySelector('#stats').textContent=`${study.triangles.toLocaleString()} prop triangles${study.layout?` · ${study.layout.kind}`: ""}`;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(renderedProps)));
 if(current!==request)return;
 const propHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 window.storeState={view,triangles:study.triangles,frontageTriangles:study.frontageTriangles,plans:study.plans,layout:study.layout,propHash,enclosureTriangles,
  camera:{position:camera.position.toArray(),target:pose[1],fov:camera.fov},ambientOcclusion:occlusion.enabled,
  viewport:{width:innerWidth,height:innerHeight,aspect:camera.aspect},placeholderRoom:roomTriangles>0,roomTriangles};document.body.dataset.ready='true';
}
document.querySelector('#view').onchange=()=>render().catch(e=>{document.body.dataset.error=e.message;console.error(e);});await render();
