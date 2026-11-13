import * as THREE from 'three';
const catalog = await (await fetch('/src/dressing/kowloon/shop/assets/grocer-props.json')).json();
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#292e34');
scene.add(new THREE.HemisphereLight('#ecf2ff', '#625746', 2));
const key = new THREE.DirectionalLight('#fff3df', 3);
key.position.set(-2, -3, 5); scene.add(key);
const fill = new THREE.DirectionalLight('#dbe9ff', 1);
fill.position.set(3, 2, 3); scene.add(fill);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .001, 100);
camera.up.set(0, 0, 1);
const loader = new THREE.TextureLoader();
const [map, normalMap, properties] = await Promise.all(['', '-normal', '-properties'].map(suffix => loader.loadAsync(`/projects/dressing-demo/textures/grocer-props${suffix}.png`)));
map.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshStandardMaterial({map, normalMap, roughnessMap: properties, metalnessMap: properties, roughness: 1, metalness: 1});
const clay = new THREE.MeshStandardMaterial({color:'#c8c4bc',roughness:.85});
const select = document.querySelector('#asset'), view = document.querySelector('#view');
for (const name of Object.keys(catalog)) select.add(new Option(name,name));
let object;
/** Render the actual production catalog under neutral light, retaining its canonical axes. */
function render() {
  document.body.dataset.ready = 'false';
  if(object){scene.remove(object);object.traverse(o=>o.geometry?.dispose());}
  const asset=catalog[select.value]; object=new THREE.Group();
  for(const [faces,painted] of [[asset.faces,false],[asset.paintedFaces??[],true]]) {
  const geometry=new THREE.BufferGeometry();
  const corners=faces.flat();
  for(const [name,start,length] of [['position',0,3],['normal',3,3],['uv',6,2],['color',8,3]])
    geometry.setAttribute(name,new THREE.Float32BufferAttribute(corners.flatMap(v=>v.slice(start,start+length)),length));
  object.add(new THREE.Mesh(geometry,view.value==='clay'?clay:painted?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}):material));
  }
  scene.add(object);
  const size=Math.max(...asset.size), z=asset.size[2]/2;
  const direction=view.value==='back'?[1,2.4,1]:view.value==='side'?[2.6,0,.8]:[.9,-2.6,1.1];
  camera.position.set(direction[0]*size,direction[1]*size,z+direction[2]*size);
  camera.lookAt(0,0,z);camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  document.querySelector('#stats').textContent=`${(asset.faces.length+(asset.paintedFaces?.length??0))} triangles · ${asset.size.map(v=>v.toFixed(3)).join(' × ')} m`;
  window.catalogState={asset:select.value,view:view.value,triangles:asset.faces.length+(asset.paintedFaces?.length??0)};
  document.body.dataset.ready='true';
}
select.onchange=render;view.onchange=render;render();
