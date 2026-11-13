import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const root = new URL(location.href).searchParams.get('models') ?? '/generated/kowloon-doors/current';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d4cfc5');
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, .04).texture;
scene.environmentIntensity = .35;
room.dispose(); pmrem.dispose();
const hemisphere = new THREE.HemisphereLight('#e5edfa', '#766957', 1.6);
scene.add(hemisphere);
const key = new THREE.DirectionalLight('#fff0d8', 3);
key.position.set(-3, 5, -5);
key.target.position.set(1.3, 1.2, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera, {left:-4,right:4,top:4,bottom:-4,near:.1,far:15});
key.shadow.normalBias = .003;
scene.add(key, key.target);
const floor = new THREE.Mesh(new THREE.BoxGeometry(40,.08,40), new THREE.MeshStandardMaterial({color:'#a9a59b',roughness:.95}));
floor.position.set(1.3,-.045,0); floor.receiveShadow=true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(35, innerWidth/innerHeight, .01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
const loader = new GLTFLoader();
const models = new Map();
for (const name of ['steel','timber-glass','painted-timber','gate','shutter']) {
 const {scene: model} = await loader.loadAsync(`${root}/${name}.glb`);
 model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
 model.visible = false; scene.add(model); models.set(name, model);
}
const asset = document.querySelector('#asset');
const view = document.querySelector('#view');
/** Presents real meter-scale geometry under identical cameras for each bake. */
function update() {
 for(const [name,model] of models) model.visible = name===asset.value;
 const poses = {
  front:[[1.3,1.45,-5.8],[1.3,1.43,0]],
  oblique:[[-1.7,2.8,-5.2],[1.3,1.4,0]],
  hardware:[[1.2,1.15,-1.6],[1.2,1.1,0]],
  lower:[[1.3,.4,-1.7],[1.3,.35,0]],
  side:[[-2.6,1.6,-.9],[1.3,1.4,0]],
  rear:[[1.3,1.5,5.8],[1.3,1.43,0]],
  distance:[[1.3,1.6,-10],[1.3,1.43,0]],
  relight:[[1.3,1.45,-5.8],[1.3,1.43,0]],
 };
 const [position,target] = poses[view.value];
 camera.position.fromArray(position);controls.target.fromArray(target);controls.update();
 key.position.set(view.value==='relight'?5:-3,5,-5);
 document.querySelector('#status').textContent = root.split('/').at(-1)+' · '+view.value;
 window.doorStudy = {asset:asset.value,view:view.value,models:root,exposure:1.1,scale:1};
 document.body.dataset.ready='true';
}
asset.onchange=update;view.onchange=update;update();
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
