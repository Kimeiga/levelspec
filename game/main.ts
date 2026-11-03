/** Sample Three.js consumer of a LevelSpec game export: load, light, walk. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CollisionWorld, type Vec3 } from "./collision.ts";
import { stepPlayer, RUN_SPEED, type PlayerShape, type PlayerState } from "./controller.ts";
import { readGlbTriangles } from "./glb.ts";
import { bindGameInput } from "./input.ts";

interface GameMarker { id: string; kind: string; label?: string; position: Vec3 }
interface GameMeta { id: string; name: string; player: PlayerShape; markers: GameMarker[] }

const map = new URLSearchParams(location.search).get("map") ?? "kiln/og_kiln";
const base = `${import.meta.env.BASE_URL}maps/${map}`;
const title = document.querySelector<HTMLElement>("#title")!;
const status = document.querySelector<HTMLElement>("#status")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#b9cde0");
scene.fog = new THREE.Fog("#b9cde0", 60, 180);
const camera = new THREE.PerspectiveCamera(90, 1, 0.05, 400);
scene.add(new THREE.HemisphereLight("#dfeaf5", "#6b5a48", 1.1));
const sun = new THREE.DirectionalLight("#fff3dc", 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
scene.add(sun, sun.target);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

const [gltf, collisionBytes, meta] = await Promise.all([
  new GLTFLoader().loadAsync(`${base}.glb`),
  fetch(`${base}.collision.glb`).then((r) => r.arrayBuffer()),
  fetch(`${base}.game.json`).then((r) => r.json() as Promise<GameMeta>),
]);
// Untextured blockout: shade by surface orientation so walls and floors read.
gltf.scene.traverse((o) => {
  if (!(o instanceof THREE.Mesh)) return;
  o.castShadow = o.receiveShadow = true;
  o.material = new THREE.MeshStandardMaterial({ color: "#c9b8a3", roughness: 0.9, vertexColors: false });
});
scene.add(gltf.scene);
const { positions, indices } = readGlbTriangles(collisionBytes);
const world = new CollisionWorld(positions, indices);
const centre = new THREE.Vector3(...world.min).add(new THREE.Vector3(...world.max)).multiplyScalar(0.5);
sun.position.copy(centre).add(new THREE.Vector3(-40, 80, 30));
sun.target.position.copy(centre);
const span = Math.max(world.max[0] - world.min[0], world.max[2] - world.min[2]) / 2 + 5;
Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, far: 250 });
sun.shadow.camera.updateProjectionMatrix();

for (const m of meta.markers) {
  const colour = m.kind === "site" ? "#e0503c" : m.kind.startsWith("attacker") ? "#e8b13a" : "#3a8fe8";
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.04, 32),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.55 }));
  disc.position.set(m.position[0], m.position[1] + 0.03, m.position[2]);
  scene.add(disc);
}
title.textContent = meta.name;

const order = ["attacker_spawn", "defender_spawn", "site", "site"];
const markerAt = (i: number) => meta.markers.filter((m) => m.kind === order[i])[i === 3 ? 1 : 0];
const player: PlayerState = { position: [...markerAt(0).position] as Vec3, verticalSpeed: 0, grounded: false };
let yaw = 0, pitch = 0, overview = false;
const teleport = (i: number) => {
  player.position = [...markerAt(i).position] as Vec3;
  player.verticalSpeed = 0;
};
const keys = bindGameInput(window, (code) => {
  if (code === "KeyO") overview = !overview;
  const i = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(code);
  if (i >= 0 && markerAt(i)) teleport(i);
}, document);
renderer.domElement.addEventListener("click", () => renderer.domElement.requestPointerLock());
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * 0.0022));
});

/** WASD relative to the view direction, in world (x, z). */
function wishFromKeys(): [number, number] {
  const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  const s = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  return [-Math.sin(yaw) * f + Math.cos(yaw) * s, -Math.cos(yaw) * f - Math.sin(yaw) * s];
}
function placeCamera() {
  if (overview) {
    // Debug overhead view of the whole map, south (attackers) at the bottom.
    camera.position.set(centre.x, centre.y + span * 1.9, centre.z + span * 0.55);
    camera.lookAt(centre);
    return;
  }
  const eye = meta.player.height - 0.16;
  camera.position.set(player.position[0], player.position[1] + eye, player.position[2]);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const speed = keys.has("ShiftLeft") ? RUN_SPEED * 0.52 : RUN_SPEED;
  stepPlayer(world, meta.player, player, { wish: wishFromKeys(), jump: keys.has("Space") }, dt, speed);
  if (player.position[1] < world.min[1] - 20) teleport(0);
  placeCamera();
  status.textContent = `${player.position.map((n) => n.toFixed(1)).join(", ")}${player.grounded ? "" : " (airborne)"}`;
  renderer.render(scene, camera);
});
