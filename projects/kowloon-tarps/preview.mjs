import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#cbc7be');
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.02,60),controls=new OrbitControls(camera,renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe5edf3,0x7b7060,1.5));const sun=new THREE.DirectionalLight(0xffedda,3.1);sun.position.set(-5,11,-7);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:35});sun.shadow.normalBias=.003;scene.add(sun);
const model=await new GLTFLoader().loadAsync('./tarps.glb');model.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model.scene);
const views=await fetch('./views.json').then(r=>r.json());
window.setView=id=>{const v=views.find(v=>v.id===id);if(v){camera.position.set(v.x+4.0,v.z+2.15,-4.0);controls.target.set(v.x+1.5,v.z-.25,-.6);}else{camera.position.set(10,9.5,-14);controls.target.set(3.3,3.7,-.4);}controls.update();document.querySelector('#label').textContent=v?`${v.id} · simulated canvas`:'Four cloth tension variants';};
for(const id of ['all',...views.map(v=>v.id)]){const button=document.createElement('button');button.textContent=id;button.onclick=()=>setView(id);document.querySelector('nav').append(button);}
document.querySelector('#light').onclick=()=>{sun.position.x*=-1;};
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
setView(new URLSearchParams(location.search).get('view')??'all');window.ready=true;renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
