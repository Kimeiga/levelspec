import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {shopPreview} from './shop-preview.ts';
import {shopWalls} from './shop-walls.ts';
const enclosurePath=new URL(location.href).searchParams.get('enclosure');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
// The page owns the neutral backdrop so tone mapping affects only the actual scene.
const scene=new THREE.Scene();
const environmentSource=new RoomEnvironment();
const environmentGenerator=new THREE.PMREMGenerator(renderer);
const environmentTarget=environmentGenerator.fromScene(environmentSource,.04);
scene.environment=environmentTarget.texture;scene.environmentIntensity=.18;
environmentSource.dispose();environmentGenerator.dispose();
const ambient=new THREE.HemisphereLight('#d9e6ff','#817363',.38);
ambient.position.set(0,0,1);scene.add(ambient);
const key=new THREE.DirectionalLight('#dfe9ff',1.65);key.position.set(-2,-4,7);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.normalBias=.012;scene.add(key);
const fill=new THREE.PointLight('#dfe9e3',.75,5,2);fill.position.set(1.8,2.1,2.3);scene.add(fill);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.01,100);camera.up.set(0,0,1);
const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,target);
const colorPass=new RenderPass(scene,camera);
/** The color pass retains glass; the AO depth pass sees the opaque stock behind it. */
class ShopContactAO extends GTAOPass {
 excludedGlassMeshes=0;
 /** Temporarily excludes transparent-only meshes and restores visibility even if rendering fails. */
 render(renderer,writeBuffer,readBuffer,deltaTime,maskActive){
  const transparent=[];
  this.scene.traverse(object=>{
   const materials=Array.isArray(object.material)?object.material:[object.material];
   if(object.isMesh&&object.visible&&materials.every(material=>material?.transparent))transparent.push(object);
  });
  this.excludedGlassMeshes=transparent.length;
  for(const object of transparent)object.visible=false;
  try{super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);}
  finally{for(const object of transparent)object.visible=true;}
 }
}
const occlusion=new ShopContactAO(scene,camera,innerWidth,innerHeight);
// A tight physical radius emphasizes local contact without blackening entire display bays.
occlusion.updateGtaoMaterial({radius:.14,thickness:.07,distanceExponent:1.3,distanceFallOff:1,scale:1,samples:32,screenSpaceRadius:false});
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
 outputPass.dispose();composer.dispose();environmentTarget.dispose();
});
let enclosureTriangles=0,hiddenWallMeshes=0,enclosureRoot;
if(enclosurePath){
 const loaded=await new GLTFLoader().loadAsync(enclosurePath);
 const enclosure=new THREE.Group();enclosureRoot=enclosure;enclosure.rotation.x=Math.PI/2;enclosure.add(loaded.scene);
 loaded.scene.traverse(object=>{if(object.isMesh){
  if (/\/(back|left|right)-wall$/.test(object.userData.objectId??'')) { object.visible=false;hiddenWallMeshes++;return; }
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
function dispose(group){
 const materials=new Set();
 group?.traverse(object=>{
  object.geometry?.dispose();object.shadow?.dispose();
  if(object.material)materials.add(object.material);
 });
 for(const material of materials)material.dispose();
}
/** Render the current production generator with neutral shop lighting and real maps. */
async function render(){
 const current=++request,candidate=new THREE.Group();document.body.dataset.ready='false';
 const view=document.querySelector('#view').value;
 const width=view==='narrow'?1.8:3.6;
 if(enclosureRoot)enclosureRoot.visible=view!=='narrow';
 const study=shopPreview(width,2.9,view==='narrow'?2.08:2.6,view==='alternate'?'restaurant-4':'restaurant-8');
 const concreteMaps=await Promise.all(['concrete-plain.png','concrete-fine-sand.png','plaster-plain.png'].map(name=>texture('/projects/kowloon-concrete-study/textures/'+name,true)));
 if(current!==request)return;
 candidate.add(shopWalls(width,study.depth,study.height,concreteMaps));
 const renderedProps=[],taskLights=[];let roomTriangles=0;
 for(const [index,surface] of study.surfaces.entries()){
  if(surface.object==='study/$dressing/room-walls')continue;
  const room=surface.object==='study/$dressing/room';
  if(enclosurePath&&view!=='narrow'&&room)continue;
  const def=study.materials.find(m=>m.id===surface.material);
  const ids=study.mesh.surfaces.flatMap((s,t)=>s===index?study.mesh.indices.slice(t*3,t*3+3):[]);
  if(room)roomTriangles+=ids.length/3;
  const [map,normalMap,properties]=await Promise.all([texture(def.texture,true),texture(def.normalTexture),texture(def.metallicRoughnessTexture)]);
  if(current!==request){dispose(candidate);return;}
  const geometry=new THREE.BufferGeometry();
  for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['uv','uv',2],['color','colors',3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(ids.flatMap(i=>study.mesh[key].slice(i*size,i*size+size)),size));
  if(!room)renderedProps.push({surface,material:def,attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,value])=>[name,Array.from(value.array)]))});
  if(/\/task-lamp-\d+$/.test(surface.object)&&def.id==='$kowloon/pane'){
   geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new THREE.Vector3());
   const light=new THREE.PointLight('#ffc17b',2.2,3.2,2);light.position.copy(center);
   light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.normalBias=.003;light.shadow.camera.near=.02;light.shadow.camera.updateProjectionMatrix();
   candidate.add(light);taskLights.push({part:surface.object,position:center.toArray(),color:'#ffc17b',intensity:2.2});
  }
  const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:def.color,vertexColors:true,map,normalMap,roughnessMap:properties,metalnessMap:properties,roughness:def.roughness,metalness:def.metalness,alphaTest:def.alphaCutoff??0,opacity:def.opacity??1,transparent:(def.opacity??1)<1,depthWrite:(def.opacity??1)>=1}));
  if(/\/task-lamp-\d+$/.test(surface.object)&&def.id==='$kowloon/pane'){
   object.material.emissive.set('#ffb95b');object.material.emissiveIntensity=2;
  }
  object.castShadow=(def.opacity??1)>=1 && !(/\/task-lamp-\d+$/.test(surface.object)&&def.id==='$kowloon/pane');
  object.receiveShadow=true;candidate.add(object);
 }
 if(root){scene.remove(root);dispose(root);}root=candidate;scene.add(root);
 const cameras={
  'posters':[[2.25,1.8,1.95],[3.6,1.23,1.9]],
  'poster-left':[[1.8,.1,1.9],[0,1.1,1.85]],
  'wide-store':[[1.8,-4.2,1.8],[1.8,1.2,1.25]],
  counter:[[2.2,-1.2,1.65],[1.6,.5,1.05]],
  'work-details':[[2.7,-.55,1.63],[2.43,.32,1.02]],
  food:[[1.35,-1.05,1.8],[1.35,.3,1.6]],
  elevated:[[4.3,-3.2,3.2],[1.7,1.2,.85]],
  narrow:[[.9,-3.7,1.7],[.9,1.2,1.05]],
  alternate:[[1.8,-4.2,2.0],[1.8,1.2,1.1]],
 };
 const pose=cameras[view];
 camera.position.set(...pose[0]);camera.lookAt(...pose[1]);camera.updateProjectionMatrix();drawFrame();
 document.querySelector('#stats').textContent=`${study.triangles.toLocaleString()} prop triangles${study.layout?` · ${study.layout.kind}`: ""}`;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(renderedProps)));
 if(current!==request)return;
 const propHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 window.storeState={view,triangles:study.triangles,propHash,taskLights,lighting:{environment:.18,hemisphere:.38,fill:.75,key:1.65},aoSettings:{radius:.14,thickness:.07,samples:32,blendIntensity:.85,excludedGlassMeshes:occlusion.excludedGlassMeshes},wallFinish:"live-concrete-study + production-ceramic-field",hiddenWallMeshes,enclosureTriangles:view==='narrow'?0:enclosureTriangles,
  camera:{position:camera.position.toArray(),target:pose[1],fov:camera.fov},ambientOcclusion:occlusion.enabled,
  viewport:{width:innerWidth,height:innerHeight,aspect:camera.aspect},placeholderRoom:roomTriangles>0,roomTriangles};document.body.dataset.ready='true';
}
window.setTaskLights=(enabled)=>{root?.traverse(object=>{if(object.isPointLight)object.visible=enabled;});drawFrame();};
document.querySelector('#view').onchange=()=>render().catch(e=>{document.body.dataset.error=e.message;console.error(e);});await render();
