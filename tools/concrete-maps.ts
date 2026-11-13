import * as THREE from "three";
import { CONCRETE_MAP, concreteMapMaterial } from "../src/materials/concrete/maps.ts";

/** Renders shared intrinsic PBR maps; the Node exporter saves these without lighting. */
async function generate(): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(CONCRETE_MAP.pixels, CONCRETE_MAP.pixels);
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.append(renderer.domElement);
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(["concrete-plain.png", "concrete-fine-sand.png"].map(async name => {
    const texture = await loader.loadAsync(new URL(`../src/materials/concrete/textures/${name}`, import.meta.url).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }));
  const plane = new THREE.PlaneGeometry(CONCRETE_MAP.meters, CONCRETE_MAP.meters);
  const uv = plane.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4);
  plane.setAttribute("concreteFaceHalfSize", new THREE.Float32BufferAttribute(new Float32Array(8).fill(4), 2));
  plane.setAttribute("concreteTopDistance", new THREE.Float32BufferAttribute(new Float32Array(4).fill(2), 1));
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 10);
  camera.position.z = 2;
  const scene = new THREE.Scene();
  const outputs: Record<string, string> = {};
  for (const channel of ["color", "normal"] as const) {
    const material = concreteMapMaterial(textures[0], textures[1], channel);
    const mesh = new THREE.Mesh(plane, material);
    scene.add(mesh);
    renderer.outputColorSpace = channel === "color" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    renderer.render(scene, camera);
    outputs[channel] = renderer.domElement.toDataURL("image/png");
    scene.remove(mesh);
    material.dispose();
  }
  Object.assign(window, { concreteMaps: outputs });
  document.body.dataset.ready = "true";
  plane.dispose();
  textures.forEach(texture => texture.dispose());
  renderer.dispose();
}

generate().catch(error => { document.body.dataset.error = String(error); });
