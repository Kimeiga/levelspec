import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { MeshData, Surface, Material } from "../../src/vector/types.ts";

interface Baseline {
  id: string;
  front: string;
  mesh: MeshData;
  surfaces: Surface[];
  materials: Material[];
  sourceHashes: Record<string, string>;
}

const stage = document.querySelector<HTMLElement>("#stage")!;
const controls = Object.fromEntries(["asset", "view", "surface", "light"].map(id => [id, document.querySelector<HTMLSelectElement>(`#${id}`)!]));
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
stage.append(renderer.domElement);
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const clay = new THREE.MeshStandardMaterial({ color: "#bdbbb2", roughness: 0.85, side: THREE.DoubleSide });
const modelPaths: Record<string, string | null> = await (await fetch("./models.json")).json();
const cache = new Map<string, ReturnType<typeof loadPair>>();
let request = 0, hasPair = false;
let viewGroups: THREE.Group[] = [];
let currentPair: Awaited<ReturnType<typeof loadPair>>;
let latest: unknown;

/** Reads JSON and reports HTTP failures instead of displaying an empty successful view. */
async function json<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** Reconstructs the real kit triangles/materials, retaining linear colors and the cloth atlas. */
async function loadBaseline(id: string): Promise<{ root: THREE.Group; source: Baseline }> {
  const source = await json<Baseline>(`/projects/kowloon-asset-pilot/evidence/baseline/${id}.json`);
  const root = new THREE.Group();
  const { mesh } = source;
  for (const [surfaceIndex, surface] of source.surfaces.entries()) {
    const def = source.materials.find(m => m.id === surface.material)!;
    const indices = mesh.surfaces.flatMap((value, triangle) => value === surfaceIndex ? mesh.indices.slice(triangle * 3, triangle * 3 + 3) : []);
    const geometry = new THREE.BufferGeometry();
    for (const [name, values, size] of [
      ["position", mesh.positions, 3], ["normal", mesh.normals, 3],
      ["color", mesh.colors!, 3], ["uv", mesh.uv, 2],
    ] as const) {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(indices.flatMap(index => values.slice(index * size, index * size + size)), size));
    }
    const map = def.texture ? await textureLoader.loadAsync(def.texture) : null;
    if (map) { map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; }
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: def.color, roughness: def.roughness, metalness: def.metalness,
      vertexColors: true, map, side: THREE.DoubleSide,
    })));
  }
  if (source.front === "+Y") root.rotation.z = Math.PI;
  return { root, source };
}

/** Places an asset on Z=0 with a centered footprint; applies only a uniform size adjustment. */
function normalize(root: THREE.Group, height?: number) {
  root.updateMatrixWorld(true);
  const original = new THREE.Box3().setFromObject(root);
  const size = original.getSize(new THREE.Vector3());
  if (![...size].every(Number.isFinite) || Math.min(...size) <= 0) throw new Error("Asset has invalid or empty bounds");
  const scale = height === undefined ? 1 : height / size.z;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  root.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
  root.updateMatrixWorld(true);
  return { originalSize: size.toArray(), uniformScale: scale, position: root.position.toArray(), rotation: root.rotation.toArray(), size: new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray() };
}

/** Counts actual draw geometry and texture images, distinguishing shared geometry from instances. */
function measure(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Map<THREE.Texture, Set<string>>();
  let triangles = 0, meshes = 0;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes++;
    const geometry = object.geometry;
    const positions = geometry.getAttribute("position");
    if (!positions || [...positions.array].some(value => !Number.isFinite(value))) throw new Error("Nonfinite geometry");
    triangles += (geometry.index?.count ?? positions.count) / 3;
    geometries.add(geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const [slot, value] of Object.entries(material)) if (value instanceof THREE.Texture) {
        if (!textures.has(value)) textures.set(value, new Set());
        textures.get(value)!.add(slot);
      }
    }
  });
  if (triangles === 0) throw new Error("No mesh triangles loaded");
  const images = [...textures].map(([texture, slots]) => {
    const image = texture.image as { width?: number; height?: number } | undefined;
    const width = image?.width ?? 0, height = image?.height ?? 0;
    if (width <= 0 || height <= 0) throw new Error("Missing or empty texture image");
    return { width, height, colorSpace: texture.colorSpace, slots: [...slots].sort() };
  });
  return { triangles, uniqueTriangles: [...geometries].reduce((sum, g) => sum + (g.index?.count ?? g.getAttribute("position").count) / 3, 0), meshes, materials: materials.size, textures: images };
}

/** Loads the approved candidate when present; a missing candidate remains explicitly pending. */
async function loadPair(id: string) {
  const baseline = await loadBaseline(id);
  const baselineTransform = normalize(baseline.root);
  const path = modelPaths[id];
  let candidate: THREE.Group | undefined, candidateTransform;
  if (path) {
    const gltf = await gltfLoader.loadAsync(`/${path}`);
    candidate = new THREE.Group();
    gltf.scene.rotation.x = Math.PI / 2;
    candidate.add(gltf.scene);
    candidate.rotation.z = -Math.PI / 2;
    candidateTransform = { ...normalize(candidate, baselineTransform.size[2]), glbToZUpRotationX: Math.PI / 2 };
  }
  for (const root of [baseline.root, candidate]) root?.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = object.receiveShadow = true;
      object.userData.assetMaterial = true;
    }
  });
  return { id, baseline: baseline.root, candidate, height: baselineTransform.size[2], metadata: {
    baseline: { transform: baselineTransform, ...measure(baseline.root), sourceHashes: baseline.source.sourceHashes },
    candidate: candidate ? { path, transform: candidateTransform, ...measure(candidate) } : null,
  } };
}

/** Adds a plain procedural support that is identical on both sides of the comparison. */
function box(parent: THREE.Object3D, size: number[], center: number[], color: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  mesh.position.fromArray(center);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
}

/** Arranges repeated assets at known meter spacing, sharing geometry and materials within each side. */
function arrangement(root: THREE.Group, id: string, height: number) {
  const group = new THREE.Group();
  if (id === "laundry-shirt") {
    for (let i = 0; i < 3; i++) {
      const item = root.clone(); item.position.x += (i - 1) * 0.9; item.position.z += 1.65 - height; group.add(item);
    }
    box(group, [3, 0.012, 0.012], [0, 0, 1.65], "#827553");
    for (const x of [-1.5, 1.5]) box(group, [0.04, 0.04, 1.8], [x, 0, 0.9], "#687572");
  } else {
    box(group, [0.7, 0.34, 0.045], [0, 0, 0.8], "#82735b");
    box(group, [0.7, 0.025, 0.34], [0, 0.17, 0.96], "#aca18c");
    const columns = id === "market-apple" ? 7 : 4;
    const spacing = id === "market-apple" ? 0.085 : 0.16;
    for (let row = 0; row < 2; row++) for (let column = 0; column < columns; column++) {
      const item = root.clone();
      item.position.x += (column - (columns - 1) / 2) * spacing;
      item.position.y += row * 0.11 - 0.055;
      item.position.z += 0.8225;
      group.add(item);
    }
  }
  return group;
}

/** Creates a matched neutral stage, with reversible lighting to expose baked highlights. */
function scene(root: THREE.Group | undefined, right: boolean) {
  const result = new THREE.Scene();
  result.background = new THREE.Color("#dedbd4");
  const ambient = new THREE.HemisphereLight("#fff9ed", "#929a9e", 2.1);
  ambient.position.set(0, 0, 1);
  result.add(ambient);
  const sun = new THREE.DirectionalLight("#ffffff", 3);
  const lightScale = controls.view.value === "context" ? 1 : currentPair.height;
  sun.position.set(controls.light.value === "left" ? -3 : 3, -4, 6).multiplyScalar(lightScale);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -3 * lightScale, right: 3 * lightScale, top: 3 * lightScale, bottom: -3 * lightScale, near: 0.01 * lightScale, far: 15 * lightScale });
  sun.shadow.normalBias = 0.003 * lightScale;
  sun.shadow.bias = -0.0001;
  result.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#c5c1b7", roughness: 1 }));
  floor.receiveShadow = true; floor.position.z = -0.002; result.add(floor);
  if (root) {
    const group = controls.view.value === "context" ? arrangement(root, currentPair.id, currentPair.height) : root.clone();
    group.traverse(object => {
      if (object instanceof THREE.Mesh && object.userData.assetMaterial && controls.surface.value === "clay") object.material = clay;
    });
    result.add(group); viewGroups.push(group);
  }
  document.querySelector(`#${right ? "candidate" : "baseline"}-label`)!.textContent = root
    ? `${measure(root).triangles.toLocaleString()} triangles · ${measure(root).textures.length} texture maps · ${currentPair.height.toFixed(3)} m high`
    : "Pending generation — no comparison result yet";
  return result;
}

/** Renders both sides with exactly one camera and the same exposure, viewport and lighting. */
function render() {
  const width = stage.clientWidth, height = stage.clientHeight;
  renderer.setSize(width, height);
  viewGroups = [];
  const scenes = [scene(currentPair.baseline, false), scene(currentPair.candidate, true)];
  const camera = new THREE.PerspectiveCamera(38, width / 2 / height, 0.001, 100);
  camera.up.set(0, 0, 1);
  const assetHeight = currentPair.height;
  const distance = assetHeight * 2.5;
  const positions: Record<string, number[]> = { front: [0, -distance, assetHeight * 0.65], back: [0, distance, assetHeight * 0.65], side: [distance, 0, assetHeight * 0.65], oblique: [distance * 0.55, -distance, assetHeight * 1.0] };
  const context = controls.view.value === "context";
  camera.position.fromArray(context ? (currentPair.id === "laundry-shirt" ? [1.2, -5.5, 2.4] : [0.42, -1.8, 1.25]) : positions[controls.view.value]);
  camera.lookAt(0, 0, context ? (currentPair.id === "laundry-shirt" ? 1.1 : 0.94) : assetHeight * 0.5);
  renderer.setScissorTest(true);
  scenes.forEach((scene, index) => {
    renderer.setViewport(index * width / 2, 0, width / 2, height);
    renderer.setScissor(index * width / 2, 0, width / 2, height);
    renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);
  latest = { id: currentPair.id, view: controls.view.value, surface: controls.surface.value, light: controls.light.value,
    camera: { position: camera.position.toArray(), targetZ: context ? (currentPair.id === "laundry-shirt" ? 1.1 : 0.94) : assetHeight * 0.5, fov: camera.fov, aspect: camera.aspect },
    exposure: renderer.toneMappingExposure, status: currentPair.candidate ? "comparison" : "candidate-pending", ...currentPair.metadata,
    lighting: { hemisphereUp: [0, 0, 1], hemisphereIntensity: 2.1, sunIntensity: 3, position: [controls.light.value === "left" ? -3 : 3, -4, 6], scale: context ? 1 : currentPair.height, shadowMapSize: 2048, normalBias: 0.003 * (context ? 1 : currentPair.height), bias: -0.0001 },
    visible: viewGroups.map(measure),
  };
  for (const scene of scenes) scene.traverse(object => {
    if (object instanceof THREE.Mesh && !object.userData.assetMaterial) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    }
    if (object instanceof THREE.DirectionalLight) object.shadow.map?.dispose();
  });
  const contextNote = currentPair.id === "laundry-shirt" ? "provisional hanging placement; attachments not validated" : "procedural shelf; repeated instances";
  document.querySelector("#status")!.textContent = `${currentPair.id} · matched scale and camera · ${context ? contextNote : "close inspection"} · visual comparison only`;
  document.body.dataset.ready = "true";
}

/** Loads a selected pair once and exposes errors to both the person and the capture runner. */
async function update() {
  const currentRequest = ++request;
  document.body.dataset.ready = "false";
  try {
    const id = controls.asset.value;
    if (!cache.has(id)) cache.set(id, loadPair(id));
    const pair = await cache.get(id)!;
    if (currentRequest !== request) return;
    currentPair = pair;
    hasPair = true;
    render();
  } catch (error) {
    document.querySelector("#error")!.textContent = String(error);
    throw error;
  }
}

Object.assign(window, { pilot: { capture: () => latest } });
for (const control of Object.values(controls)) control.addEventListener("change", update);
window.addEventListener("resize", () => { if (hasPair) render(); });
await update();
