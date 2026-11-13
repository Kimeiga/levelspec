/** Reviews actual GLBs under fixed lighting with backface culling and orbit controls. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const query=new URLSearchParams(location.search),raw=query.has('raw'),inspect=raw||query.has('asset');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#424b4b');
scene.add(new THREE.HemisphereLight('#ebf0ed','#70685d',1.3));
const key=new THREE.DirectionalLight('#fff3dd',2.5);key.position.set(-3,raw?-4:4,7);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.normalBias=.012;key.shadow.bias=-.0001;scene.add(key);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.01,100);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);
const gltf=await new GLTFLoader().loadAsync(query.get('model'));
const root=new THREE.Group();root.rotation.x=Math.PI/2;root.add(gltf.scene);
const outer=new THREE.Group();outer.add(root);if(raw)outer.rotation.z=-Math.PI/2;
scene.add(outer);outer.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(outer),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
let triangles=0;
gltf.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.castShadow=true;o.receiveShadow=true;
 const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.side=query.has('double')?THREE.DoubleSide:THREE.FrontSide;if(m.map)m.map.anisotropy=8;}}});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#68706d',roughness:1}));floor.position.z=box.min.z-.015;floor.receiveShadow=true;scene.add(floor);
/** Uses the same bounds and camera for before/after context views; asset views fit uniformly. */
window.setView=(view='front')=>{
 if(inspect){const r=Math.max(size.x,size.y,size.z)*2.35;const directions={front:[0,raw?-1:1,.2],back:[0,raw?1:-1,.2],side:[1,0,.15],oblique:[.75,raw?-1:1,.5],underside:[.5,raw?-1:1,-.6]};camera.position.copy(center).add(new THREE.Vector3(...(directions[view]??directions.front)).normalize().multiplyScalar(r));controls.target.copy(center);}
 else{const views={front:[[3.15,9.5,3.5],[3.15,0,1.25]],oblique:[[8,7,4.5],[3.2,0,1.3]],plants:[[3.1,3.9,1.4],[3.1,0,.35]],cloth:[[3.1,5.7,2.4],[3.1,0,1.9]],back:[[3.15,-7,3.5],[3.15,0,1.25]]};const [at,to]=views[view]??views.front;camera.position.set(...at);controls.target.set(...to);}
 controls.update();renderer.render(scene,camera);window.studyState={view,triangles,size:size.toArray(),raw,doubleSided:query.has("double"),shadowNormalBias:key.shadow.normalBias,shadowBias:key.shadow.bias};
};
window.reverseLight=()=>{key.position.x*=-1;key.position.y*=-1;renderer.render(scene,camera);};
window.clay=()=>{gltf.scene.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({color:'#c3c1b6',roughness:.8,side:THREE.FrontSide});});};
document.querySelector('#title').textContent=query.get('title')??'Balcony prop study';
window.setView(query.get('view')??'front');renderer.setAnimationLoop(()=>renderer.render(scene,camera));document.body.dataset.ready='true';
