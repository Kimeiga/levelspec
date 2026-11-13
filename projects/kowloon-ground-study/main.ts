import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { asphaltOverflow } from "./asphalt.ts";
import { concreteMaterial } from "../../src/materials/concrete/material.ts";
import { ReviewLighting } from "../../review/lighting.ts";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.08, 200);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const lighting = new ReviewLighting(renderer, scene, new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000));
lighting.setAppearance("full-render");
lighting.resize(innerWidth, innerHeight);
const status = document.querySelector<HTMLElement>("#status")!;

/** Uses the reviewer's domain coordinates: meters, Z up. */
function view(mode: "wide" | "concrete" | "tiles"): void {
  const poses: Record<typeof mode, { position: [number, number, number]; target: [number, number, number] }> = {
    wide: { position: [10, 2, 4], target: [5, 6, 0] },
    concrete: { position: [4.7, 2.1, 1.3], target: [3.2, 4.7, 0] },
    tiles: { position: [3, 7.8, 1.5], target: [2, 9.5, 0] },
  };
  camera.position.set(...poses[mode].position);
  controls.target.set(...poses[mode].target);
  controls.update();
}
view("wide");

/** Loads each shared concrete source once; both variants reuse the same GPU texture. */
async function texture(name: string): Promise<THREE.Texture> {
  const result = await new THREE.TextureLoader().loadAsync(new URL(`../../src/materials/concrete/textures/${name}`, import.meta.url).href);
  result.colorSpace = THREE.SRGBColorSpace;
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  return result;
}

try {
  const [asset, base, secondary] = await Promise.all([
    new GLTFLoader().loadAsync(new URL("../../generated/dressing-demo/presets/kowloon/dressing-demo.glb", import.meta.url).href),
    texture("concrete-plain.png"), texture("concrete-fine-sand.png"),
  ]);
  const model = asset.scene;
  // GLB is Y-up; restore domain Z-up before computing the ground's texture coordinates.
  model.rotation.x = Math.PI / 2;
  scene.add(model);
  model.updateMatrixWorld(true);
  const replacements: { mesh: THREE.Mesh; original: THREE.Material; updated: THREE.Material; originalGeometry: THREE.BufferGeometry }[] = [];
  const finishes = new Set(["concrete", "repair", "chip", "spall", "edge"]);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    if (Array.isArray(object.material)) return;
    const original = object.material;
    if (!(original instanceof THREE.MeshStandardMaterial)) return;
    const prefix = "$ground/courtyard/";
    const namedFinish = original.name.startsWith(prefix) && finishes.has(original.name.slice(prefix.length));
    const rasterFinish = object.userData.objectId === "courtyard" && finishes.has(String(object.userData.role).replace("ground-", ""));
    if (!namedFinish && !rasterFinish) return;
    const originalGeometry = object.geometry;
    const geometry = originalGeometry.clone();
    const positions = geometry.getAttribute("position");
    const uv = new Float32Array(positions.count * 2);
    const faceSizes = new Float32Array(positions.count * 2).fill(1000);
    const topDistances = new Float32Array(positions.count).fill(1000);
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      uv[i * 2] = point.x / 2;
      uv[i * 2 + 1] = point.y / 2;
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute("concreteFaceHalfSize", new THREE.BufferAttribute(faceSizes, 2));
    geometry.setAttribute("concreteTopDistance", new THREE.BufferAttribute(topDistances, 1));
    const finish = concreteMaterial(base, secondary, base, "ground");
    const updated = finish.material;
    updated.name = original.name;
    updated.color.copy(original.color);
    updated.vertexColors = original.vertexColors;
    updated.side = original.side;
    updated.transparent = original.transparent;
    updated.opacity = original.opacity;
    updated.depthWrite = original.depthWrite;
    updated.polygonOffset = original.polygonOffset;
    updated.polygonOffsetFactor = original.polygonOffsetFactor;
    updated.polygonOffsetUnits = original.polygonOffsetUnits;
    object.geometry = geometry;
    object.material = updated;
    replacements.push({ mesh: object, original, updated, originalGeometry });
  });
  const regionResponse = await fetch(new URL("../../generated/ground-study/asphalt-regions.json", import.meta.url));
  if (!regionResponse.ok) throw new Error("Build courtyard ground with: node projects/kowloon-ground-study/build.ts");
  const regions: [number, number, number][][] = await regionResponse.json();
  const asphaltMap = await new THREE.TextureLoader().loadAsync(new URL("../dressing-demo/textures/ground-asphalt.png", import.meta.url).href);
  const asphaltNormal = await new THREE.TextureLoader().loadAsync(new URL("../dressing-demo/textures/ground-asphalt-normal.png", import.meta.url).href);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  for (const image of [asphaltMap, asphaltNormal]) {
    image.wrapS = image.wrapT = THREE.RepeatWrapping;
    image.anisotropy = base.anisotropy;
  }
  const asphaltSource = new THREE.MeshStandardMaterial({ map: asphaltMap, normalMap: asphaltNormal, normalScale: new THREE.Vector2(1.15, 1.15) });
  const pavement = new Set(["concrete", "repair", "chip", "spall", "edge", "joint", "crack", "tile", "grout", "substrate", "timber"]);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
    const name = object.material.name;
    if (object.userData.objectId === "courtyard" && pavement.has(String(object.userData.role).replace("ground-", ""))) {
      asphaltOverflow(object.material, regions, asphaltSource!);
    }
  });
  for (const item of replacements) if (item.original instanceof THREE.MeshStandardMaterial)
    asphaltOverflow(item.original, regions, asphaltSource);
  if (!replacements.length) throw new Error("No courtyard concrete surfaces found in the generated demo.");
  const updatedGeometry = new Map(replacements.map(item => [item.mesh, item.mesh.geometry]));
  /** Switches cached materials and UVs together, keeping geometry and lighting comparable. */
  function select(updated: boolean): void {
    for (const item of replacements) {
      item.mesh.material = updated ? item.updated : item.original;
      item.mesh.geometry = updated ? updatedGeometry.get(item.mesh)! : item.originalGeometry;
    }
    document.querySelector("#new")!.setAttribute("aria-pressed", String(updated));
    document.querySelector("#old")!.setAttribute("aria-pressed", String(!updated));
    document.body.dataset.appearance = updated ? "new" : "old";
  }
  document.querySelector<HTMLButtonElement>("#new")!.onclick = () => select(true);
  document.querySelector<HTMLButtonElement>("#old")!.onclick = () => select(false);
  document.querySelector<HTMLButtonElement>("#wide")!.onclick = () => view("wide");
  document.querySelector<HTMLButtonElement>("#close")!.onclick = () => view("concrete");
  document.querySelector<HTMLButtonElement>("#tiles")!.onclick = () => view("tiles");
  select(true);
  lighting.fit(new THREE.Box3().setFromObject(model));
  status.textContent = `New concrete on ${replacements.length} ground surfaces · Drag to orbit · Scroll to inspect`;
  document.body.dataset.ready = "true";
} catch (error) {
  status.textContent = `Unable to load ground study: ${error instanceof Error ? error.message : String(error)}`;
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  lighting.resize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  controls.update();
  lighting.render(camera);
});
