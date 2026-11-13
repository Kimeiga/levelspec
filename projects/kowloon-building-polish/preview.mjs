
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#d7d0c6');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(devicePixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.05,150);const controls=new OrbitControls(camera,renderer.domElement);
scene.add(new THREE.HemisphereLight(0xdde8ef,0x6c6052,2));const sun=new THREE.DirectionalLight(0xffecd5,3.2);sun.position.set(-10,22,13);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.1,far:70});sun.shadow.bias=-.00008;scene.add(sun);
const gltf=await new GLTFLoader().loadAsync('./building.glb');gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(gltf.scene);
window.setView=(name)=>{const views={overview:[[-13,13,19],[3.8,5,-3]],roof:[[-5,19,10],[3.8,10.6,-3.5]],base:[[-2,3.2,6],[2.3,1,-.2]],balcony:[[-1,7.8,8],[3.7,5.5,0]],ac:[[-5,10,5],[0,7.4,-1.3]],posters:[[-4,2.2,-3],[0,1.25,-3.5]]};const [at,target]=views[name];camera.position.set(...at);controls.target.set(...target);controls.update()};setView('overview');window.ready=true;
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
