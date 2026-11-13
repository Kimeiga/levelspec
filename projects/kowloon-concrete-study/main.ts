import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { concreteMaterial } from "../../src/materials/concrete/material.ts";

const status = document.querySelector<HTMLElement>("#status")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d8dad7");
const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.05, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 20;
controls.minDistance = 0.35;
controls.maxPolarAngle = Math.PI * 0.49;
scene.add(new THREE.HemisphereLight("#e9eff1", "#a2a09a", 2));
const light = new THREE.DirectionalLight("#fff7ed", 2.4);
light.position.set(-4, 7, 5);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 0.1, far: 24 });
light.shadow.camera.updateProjectionMatrix();
light.shadow.normalBias = 0.008;
scene.add(light);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: "#c6c9c2", roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

/** Uses renderer coordinates (Y up) to map every box face at the same two-meter texture scale. */
function wallGeometry(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(8, 3.2, 0.22);
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const faceSizes = new Float32Array(positions.count * 2);
  const topDistances = new Float32Array(positions.count);
  geometry.computeBoundingBox();
  const topHeight = geometry.boundingBox!.max.y;
  for (let i = 0; i < positions.count; i++) {
    topDistances[i] = topHeight - positions.getY(i);
    const side = Math.abs(normals.getX(i)) > 0.5;
    const top = Math.abs(normals.getY(i)) > 0.5;
    faceSizes[i * 2] = side ? 0.11 : 4;
    faceSizes[i * 2 + 1] = top ? 0.11 : 1.6;
    uv.setXY(i, (side ? positions.getZ(i) : positions.getX(i)) / 2,
      (top ? positions.getZ(i) : positions.getY(i)) / 2);
  }
  geometry.setAttribute("concreteTopDistance", new THREE.BufferAttribute(topDistances, 1));
  geometry.setAttribute("concreteFaceHalfSize", new THREE.BufferAttribute(faceSizes, 2));
  return geometry;
}

/** Presents the same receiver at a wide repetition-check distance or a pore-scale inspection distance. */
function view(close: boolean): void {
  camera.position.set(close ? 1.15 : 1.2, close ? 1.75 : 2.45, close ? 1.7 : 9.5);
  controls.target.set(close ? 0.55 : 0, close ? 1.55 : 1.6, 0);
  controls.update();
}
view(false);

try {
  const texture = await new THREE.TextureLoader().loadAsync(new URL("../../src/materials/concrete/textures/concrete-plain.png", import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const textureB = await new THREE.TextureLoader().loadAsync(new URL("../../src/materials/concrete/textures/concrete-fine-sand.png", import.meta.url).href);
  textureB.colorSpace = THREE.SRGBColorSpace;
  textureB.wrapS = textureB.wrapT = THREE.RepeatWrapping;
  textureB.anisotropy = texture.anisotropy;
  const plasterTexture = await new THREE.TextureLoader().loadAsync(new URL("../../src/materials/concrete/textures/plaster-plain.png", import.meta.url).href);
  plasterTexture.colorSpace = THREE.SRGBColorSpace;
  plasterTexture.wrapS = plasterTexture.wrapT = THREE.RepeatWrapping;
  plasterTexture.anisotropy = texture.anisotropy;
  const finish = concreteMaterial(texture, textureB, plasterTexture);
  const materialSelect = document.querySelector<HTMLSelectElement>("#wall-type")!;
  /** Selects the coating while preserving substrate controls and cached textures. */
  function selectMaterial(): void {
    const plaster = materialSelect.value === "plaster";
    finish.setPlaster(plaster);
    document.querySelector("h1")!.textContent = plaster ? "Plaster over concrete" : "Concrete / base material";
    document.querySelector<HTMLButtonElement>("#chips")!.disabled = !plaster;
    document.querySelector<HTMLAnchorElement>("#base-texture")!.href = plaster
      ? "../../src/materials/concrete/textures/plaster-plain.png" : "../../src/materials/concrete/textures/concrete-plain.png";
    document.body.dataset.material = materialSelect.value;
  }
  materialSelect.onchange = selectMaterial;
  if (new URLSearchParams(location.search).get("material") === "plaster") materialSelect.value = "plaster";
  selectMaterial();
  const chipButton = document.querySelector<HTMLButtonElement>("#chips")!;
  chipButton.onclick = () => {
    const enabled = chipButton.getAttribute("aria-pressed") !== "true";
    finish.setChips(enabled);
    chipButton.setAttribute("aria-pressed", String(enabled));
    chipButton.textContent = `Chipped plaster: ${enabled ? "on" : "off"}`;
  };
  const wall = new THREE.Mesh(wallGeometry(), finish.material);
  wall.position.y = 1.6;
  wall.castShadow = wall.receiveShadow = true;
  scene.add(wall);

  /** Changes sampling only; receiver geometry, texture scale and lighting stay directly comparable. */
  function variation(enabled: boolean): void {
    finish.setVariation(enabled);
    document.querySelector("#varied")!.setAttribute("aria-pressed", String(enabled));
    document.querySelector("#regular")!.setAttribute("aria-pressed", String(!enabled));
    document.body.dataset.tiling = enabled ? "varied" : "regular";
  }
  document.querySelector<HTMLButtonElement>("#varied")!.onclick = () => variation(true);
  document.querySelector<HTMLButtonElement>("#regular")!.onclick = () => variation(false);
  document.querySelector<HTMLButtonElement>("#front")!.onclick = () => view(false);
  document.querySelector<HTMLButtonElement>("#detail")!.onclick = () => view(true);
  document.querySelector<HTMLButtonElement>("#light")!.onclick = () => { light.position.x = -light.position.x; };
  const cutoutButton = document.querySelector<HTMLButtonElement>("#cutouts")!;
  cutoutButton.onclick = () => {
    const enabled = cutoutButton.getAttribute("aria-pressed") !== "true";
    finish.setCutouts(enabled);
    cutoutButton.setAttribute("aria-pressed", String(enabled));
    cutoutButton.textContent = `Concrete cutouts: ${enabled ? "on" : "off"}`;
  };
  const holeButton = document.querySelector<HTMLButtonElement>("#holes")!;
  holeButton.onclick = () => {
    const enabled = holeButton.getAttribute("aria-pressed") !== "true";
    finish.setHoles(enabled);
    holeButton.setAttribute("aria-pressed", String(enabled));
    holeButton.textContent = `Form-tie holes: ${enabled ? "on" : "off"}`;
  };
  const grimeButton = document.querySelector<HTMLButtonElement>("#grime")!;
  grimeButton.onclick = () => {
    const enabled = grimeButton.getAttribute("aria-pressed") !== "true";
    finish.setGrime(enabled);
    grimeButton.setAttribute("aria-pressed", String(enabled));
    grimeButton.textContent = `Top grime: ${enabled ? "on" : "off"}`;
  };
  /** Keeps live shader strengths and their displayed values in sync with the controls. */
  function updatePigment(): void {
    const darkness = document.querySelector<HTMLInputElement>("#darkness")!.valueAsNumber;
    const hue = document.querySelector<HTMLInputElement>("#hue-amount")!.valueAsNumber;
    const angle = document.querySelector<HTMLInputElement>("#hue-angle")!.valueAsNumber;
    finish.setPigment(darkness / 100, hue / 100, angle);
    const b = document.querySelector<HTMLInputElement>("#darkness-b")!.valueAsNumber;
    const scale = document.querySelector<HTMLInputElement>("#blend-scale")!.valueAsNumber;
    const contrast = document.querySelector<HTMLInputElement>("#blend-contrast")!.valueAsNumber;
    const jaggedness = document.querySelector<HTMLInputElement>("#jaggedness")!.valueAsNumber;
    finish.setBlend(b / 100, scale, contrast, jaggedness);
    document.querySelector("#jaggedness-value")!.textContent = `${jaggedness.toFixed(1)}×`;
    document.querySelector("#darkness-b-value")!.textContent = `${b}%`;
    document.querySelector("#blend-scale-value")!.textContent = `${scale.toFixed(1)}×`;
    document.querySelector("#blend-contrast-value")!.textContent = `${contrast.toFixed(1)}×`;
    document.querySelector("#darkness-value")!.textContent = `${darkness}%`;
    document.querySelector("#hue-amount-value")!.textContent = `${hue}%`;
    document.querySelector("#hue-angle-value")!.textContent = `${angle}°`;
  }
  for (const id of ["darkness", "hue-amount", "hue-angle", "darkness-b", "blend-scale", "blend-contrast", "jaggedness"])
    document.querySelector<HTMLInputElement>(`#${id}`)!.addEventListener("input", updatePigment);
  updatePigment();
  variation(true);
  status.textContent = "Drag to orbit · Scroll to inspect · Wall 8 × 3.2 m";
  document.body.dataset.ready = "true";
} catch (error) {
  status.textContent = `Unable to load wall materials: ${error instanceof Error ? error.message : String(error)}`;
}

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
