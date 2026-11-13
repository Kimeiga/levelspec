/**
 * Ninefold first-person preview. Everything is lit in real time: a low sun
 * with a static shadow map, shadowed sky-fill lights standing in for bounce and
 * skylight, a pool of the nearest lamps, screen-space ambient occlusion and
 * bloom. The player walks the unchanged R08 collision mesh with the
 * repository's sample character controller.
 *
 * Debug camera: ?pos=x,y,z&yaw=deg&pitch=deg (glTF Y-up metres) &hud=0 &exposure=n
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { CollisionWorld, type Vec3 } from "../../../game/collision.ts";
import { RUN_SPEED, stepPlayer, type PlayerShape, type PlayerState } from "../../../game/controller.ts";
import { readGlbTriangles } from "../../../game/glb.ts";
import { bindGameInput } from "../../../game/input.ts";

interface Marker { id: string; kind: string; position: Vec3 }
interface GameMeta { name: string; player: PlayerShape; markers: Marker[] }
interface ArtLight { kind: "lamp" | "tube" | "sign" | "fire"; pos: Vec3; dir: Vec3; color: Vec3; power: number; reach: number | null }
interface ArtManifest {
  build?: number;
  materials: Record<string, { texture: string | null; lighting: "lit" | "emit" }>;
  lights: ArtLight[];
}

/** Callout names by position (glTF Y-up: x east, y up, z = -north). */
const PLACES: [string, number, number, number][] = [
  ["Canal · T spawn", 11, 0, -14], ["Butcher", 17, 0, -37], ["School stair", 27, 1.6, -42], ["School", 36, 3.2, -46],
  ["Tailor street", 45, 0, -24], ["Tailor stair", 65, 1.6, -29], ["Underpass", 48, 0, -33], ["Well", 51, 0, -46],
  ["Machine works · B", 55, 3.2, -36], ["Porcelain works · A", 85, 0, -46], ["Kiln", 80, 0, -55], ["Sign stair", 88, 1.6, -58],
  ["Dye works", 57, 0, -57], ["Boiler court", 35, 0, -57], ["Boiler gallery", 58, 3.2, -61], ["Water street · CT spawn", 76, 0, -77],
  ["Reservoir roof", 52, 6.4, -72], ["East porch", 67, 3.2, -42],
];
const WET = new Set(["street", "tiles", "floorpaint", "roofing"]);
const WALLS = new Set(["plaster", "mosaic", "concrete", "brick"]);
const METALNESS: Record<string, number> = { metal: 0.55, corrugated: 0.5 };

/** Late afternoon. Directions are the way light travels, glTF Y-up; ?sunAz / ?sunEl (degrees) override for look-dev. */
const lookDev = new URLSearchParams(location.search);
const sunAzimuth = THREE.MathUtils.degToRad(Number(lookDev.get("sunAz") ?? 12));   // 0 = travelling east, positive swings north
const sunElevation = THREE.MathUtils.degToRad(Number(lookDev.get("sunEl") ?? 36));
const SUN_DIRECTION = new THREE.Vector3(Math.cos(sunAzimuth) * Math.cos(sunElevation), -Math.sin(sunElevation), -Math.sin(sunAzimuth) * Math.cos(sunElevation));
const SUN_COLOUR = new THREE.Color(1.0, 0.72, 0.46);
const SKY_STOPS: [number, [number, number, number]][] = [
  [0.0, [1.05, 0.66, 0.40]], [0.10, [0.80, 0.62, 0.56]], [0.34, [0.34, 0.46, 0.78]], [1.0, [0.10, 0.20, 0.52]],
];
const SKY_FILL = new THREE.Color(0.46, 0.60, 1.0);
const POOL = 16;          // lamps lit at once; must match LAMP_COUNT in the shader
const LAMP_REACH = 52;    // metres at which a lamp has faded out of the pool
const LAMPS = {           // cone (cosine of half angle), default range in metres, strength, pool priority
  lamp: { cone: 0.22, range: 14, strength: 27, weight: 1 },
  tube: { cone: -0.25, range: 6.5, strength: 17, weight: 1 },
  sign: { cone: 0.10, range: 7, strength: 5.5, weight: 1.7 },
  fire: { cone: 0.20, range: 5, strength: 2.4, weight: 1.2 },
};

const query = new URLSearchParams(location.search);
const status = document.querySelector<HTMLElement>("#status")!;
const place = document.querySelector<HTMLElement>("#place")!;
const hud = document.querySelector<HTMLElement>("#hud")!;
const loading = document.querySelector<HTMLElement>("#loading")!;
if (query.get("hud") === "0") for (const element of [hud, place, document.querySelector("#crosshair")!]) element.classList.add("hidden");

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // applied by OutputPass after bloom
renderer.toneMappingExposure = Number(query.get("exposure") ?? 1.15);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(84, 1, 0.06, 900);

const fresh = (file: string) => fetch(file, { cache: "no-store" }).then((r) => r.json());
const [art, meta] = await Promise.all([
  fresh("ninefold.art.json") as Promise<ArtManifest>,
  fresh("ninefold.game.json") as Promise<GameMeta>,
]);
/** Appended to every asset URL so a republished build is never served from cache. */
const version = `?v=${art.build ?? 0}`;

// ---------------------------------------------------------------- sky, haze, reflections
const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    stops: { value: SKY_STOPS.map(([position]) => position) },
    colours: { value: SKY_STOPS.map(([, c]) => new THREE.Vector3(...c)) },
    toSun: { value: SUN_DIRECTION.clone().negate() },
    sunColour: { value: new THREE.Vector3(SUN_COLOUR.r, SUN_COLOUR.g, SUN_COLOUR.b) },
  },
  vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform float stops[4]; uniform vec3 colours[4]; uniform vec3 toSun; uniform vec3 sunColour; varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, v = 0.0; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir);
      vec3 c = colours[0];
      for (int i = 0; i < 3; i++) c = mix(c, colours[i + 1], smoothstep(stops[i], stops[i + 1], d.y));
      float s = max(dot(d, toSun), 0.0);
      // High, thin evening cloud: streaked along one axis, lit warm on the sun side.
      vec2 plane = d.xz / (max(d.y, 0.0) + 0.22);
      float cloud = smoothstep(0.50, 0.82, fbm(plane * vec2(0.55, 1.5) + 3.0)) * smoothstep(0.02, 0.25, d.y);
      vec3 cloudColour = mix(vec3(0.62, 0.64, 0.74), sunColour * 1.25, pow(s, 3.0) * 0.8 + 0.12);
      c = mix(c, cloudColour, cloud * 0.6);
      c += sunColour * (pow(s, 900.0) * 14.0 + pow(s, 24.0) * 0.55 + pow(s, 4.0) * 0.16);
      c = mix(c, colours[0] * 0.8, smoothstep(0.0, -0.25, d.y));
      gl_FragColor = vec4(c, 1.0);
    }`,
}));
sky.frustumCulled = false;
scene.add(sky);
scene.fog = new THREE.FogExp2(new THREE.Color(0.52, 0.54, 0.66), 0.0052);
const skyScene = new THREE.Scene();
skyScene.add(sky.clone());
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(skyScene, 0.02).texture;

// ---------------------------------------------------------------- level geometry
const [gltf, collisionBytes] = await Promise.all([
  new GLTFLoader().loadAsync("ninefold.glb" + version),
  fetch("ninefold.collision.glb" + version).then((r) => r.arrayBuffer()),
]);
const { positions, indices } = readGlbTriangles(collisionBytes);
const world = new CollisionWorld(positions, indices);
const bounds = new THREE.Box3().setFromObject(gltf.scene);
const centre = bounds.getCenter(new THREE.Vector3());

// ---------------------------------------------------------------- cover map: what stands above each point
// A top-down height render lets the shader tell street from interior, so skylight
// and sky reflections fall off under roofs, balconies and bridges without any bake.
const coverTarget = new THREE.WebGLRenderTarget(1024, 1024, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const coverSize = bounds.getSize(new THREE.Vector3());
const coverRect = new THREE.Vector4(centre.x, centre.z, 1 / (coverSize.x + 4), 1 / (coverSize.z + 4));
{
  const above = new THREE.OrthographicCamera(-coverSize.x / 2 - 2, coverSize.x / 2 + 2, coverSize.z / 2 + 2, -coverSize.z / 2 - 2, 1, bounds.max.y - bounds.min.y + 40);
  above.position.set(centre.x, bounds.max.y + 20, centre.z);
  above.up.set(0, 0, -1);
  above.lookAt(centre.x, 0, centre.z);
  const heights = new THREE.Scene();
  const writeHeight = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: "varying float vHeight; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vHeight = w.y; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "varying float vHeight; void main(){ gl_FragColor = vec4(vHeight, 0.0, 0.0, 1.0); }",
  });
  gltf.scene.traverse((object) => {
    // Structure only: cables and aerials are not roofs.
    if (object instanceof THREE.Mesh && /^(arch|shell)_/.test(object.name)) heights.add(new THREE.Mesh(object.geometry, writeHeight));
  });
  renderer.setRenderTarget(coverTarget);
  renderer.setClearColor(new THREE.Color(-100, 0, 0), 1);
  renderer.clear();
  renderer.render(heights, above);
  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 1);
}

// ---------------------------------------------------------------- materials
const loader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
function texture(file: string, colour: boolean, repeat = true) {
  const t = loader.load(file + version);
  t.flipY = false; // UVs follow the glTF convention
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, maxAnisotropy);
  return t;
}
const macroMap = texture("textures/macro_color.jpg", false);

const lampUniforms = {
  lampPosition: { value: Array.from({ length: POOL }, () => new THREE.Vector4()) }, // view-space xyz, w = range
  lampAxis: { value: Array.from({ length: POOL }, () => new THREE.Vector4()) },     // view-space throw direction, w = cone cosine
  lampColour: { value: Array.from({ length: POOL }, () => new THREE.Vector3()) },   // linear colour x strength x fade
};

/** World-space weathering that never repeats, skylight that knows when it is under cover, and the lamp list. */
function weather(material: THREE.MeshStandardMaterial, options: { wet: boolean; walls: boolean; macro: boolean }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.macroMap = { value: macroMap };
    shader.uniforms.coverMap = { value: coverTarget.texture };
    shader.uniforms.coverRect = { value: coverRect };
    Object.assign(shader.uniforms, lampUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * objectNormal);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D macroMap; uniform sampler2D coverMap; uniform vec4 coverRect;
        #define LAMP_COUNT ${POOL}
        uniform vec4 lampPosition[LAMP_COUNT]; uniform vec4 lampAxis[LAMP_COUNT]; uniform vec3 lampColour[LAMP_COUNT];
        varying vec3 vWorldPos; varying vec3 vWorldNormal;
        float openAt(vec2 xz, float y) {
          vec2 uv = vec2(0.5 + (xz.x - coverRect.x) * coverRect.z, 0.5 - (xz.y - coverRect.y) * coverRect.w);
          return 1.0 - smoothstep(0.5, 1.6, texture2D(coverMap, uv).r - y);
        }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 wn = normalize(vWorldNormal);
        bool flatFace = abs(wn.y) > 0.6;
        // Sample the air in front of the surface, not the wall's own top.
        vec2 air = vWorldPos.xz + wn.xz * 0.45;
        float skyOpen = 0.36 * openAt(air, vWorldPos.y)
          + 0.16 * (openAt(air + vec2(1.7, 0.0), vWorldPos.y) + openAt(air - vec2(1.7, 0.0), vWorldPos.y)
                  + openAt(air + vec2(0.0, 1.7), vWorldPos.y) + openAt(air - vec2(0.0, 1.7), vWorldPos.y));
        ${options.macro ? `
        vec2 mp = flatFace ? vWorldPos.xz : vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y);
        vec3 m1 = texture2D(macroMap, mp * 0.027).rgb;
        vec3 m2 = texture2D(macroMap, mp.yx * 0.083 + 0.37).rgb;
        float broad = m1.r;
        diffuseColor.rgb *= mix(0.80, 1.10, broad) * mix(0.93, 1.06, m2.g);
        diffuseColor.rgb *= mix(vec3(1.025, 1.0, 0.96), vec3(0.97, 1.0, 1.03), m1.g);
        ${options.walls ? `if (!flatFace) {
          // Storeys are 3.2 m: dirt sits on each floor line and ledge, stains run down from the one above.
          float storey = mod(vWorldPos.y + 0.04, 3.2);
          float streak = texture2D(macroMap, vec2(mp.x * 0.13, mp.y * 0.031)).b;
          float splash = (1.0 - smoothstep(0.0, 0.85, storey)) * (0.35 + 0.65 * m2.r);
          float drip = smoothstep(1.7, 3.2, storey) * smoothstep(0.42, 0.78, streak);
          diffuseColor.rgb *= 1.0 - 0.22 * splash;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.52, 0.47, 0.40), 0.30 * drip);
          diffuseColor.rgb *= 1.0 - 0.10 * smoothstep(0.50, 0.82, streak);
        } else {
          diffuseColor.rgb *= mix(0.84, 1.0, m2.b);
        }` : ""}` : "float broad = 0.6;"}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        ${options.wet ? "if (flatFace) roughnessFactor *= mix(0.46, 1.08, smoothstep(0.30, 0.60, broad));" : ""}`)
      .replace("#include <lights_fragment_begin>", `#include <lights_fragment_begin>
        irradiance *= mix(0.55, 1.0, skyOpen);
        // Street and room lamps: a short list in view space; pixels outside a lamp's range skip it entirely.
        for (int i = 0; i < LAMP_COUNT; i++) {
          vec3 toLamp = lampPosition[i].xyz - geometryPosition;
          float d2 = dot(toLamp, toLamp), range = lampPosition[i].w;
          if (d2 < range * range) {
            float d = sqrt(d2);
            vec3 L = toLamp / d;
            float nl = dot(geometryNormal, L);
            if (nl > 0.0) {
              float cone = smoothstep(lampAxis[i].w, lampAxis[i].w + 0.4, dot(-L, lampAxis[i].xyz));
              float fall = (1.0 - d / range);
              vec3 lampLight = lampColour[i] * (cone * fall * fall * nl / (1.0 + 0.12 * d2));
              reflectedLight.directDiffuse += lampLight * BRDF_Lambert(material.diffuseColor);
              float gloss = 1.0 - material.roughness;
              vec3 H = normalize(L + geometryViewDir);
              reflectedLight.directSpecular += lampLight * material.specularColor
                * pow(max(dot(geometryNormal, H), 0.0), 6.0 + 220.0 * gloss * gloss) * (0.3 + 5.0 * gloss * gloss);
            }
          }
        }`)
      .replace("#include <lights_fragment_maps>", `#include <lights_fragment_maps>
        #if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
          iblIrradiance = vec3(0.0);
          radiance *= mix(0.06, 1.0, skyOpen);
        #endif`);
  };
  material.customProgramCacheKey = () => `weather:${options.wet}:${options.walls}:${options.macro}`;
}

function createMaterial(name: string, spec: { texture: string | null; lighting: string }): THREE.Material {
  if (name === "emit") return new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color().setScalar(0.8) });
  if (name === "glass") {
    const glass = new THREE.MeshStandardMaterial({
      map: texture("textures/glass_color.jpg", true, false), emissiveMap: texture("textures/glass_emit.jpg", true, false),
      emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0, envMapIntensity: 1.5,
    });
    weather(glass, { wet: false, walls: false, macro: false });
    return glass;
  }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.8 });
  if (spec.texture) {
    material.map = texture(`textures/${spec.texture}_color.jpg`, true);
    material.normalMap = texture(`textures/${spec.texture}_normal.jpg`, false);
    const relief = spec.texture === "concrete" ? 0.45 : 0.9; // deep pits sparkle under spot lights
    material.normalScale.set(relief, -relief);
    material.roughnessMap = texture(`textures/${spec.texture}_orm.jpg`, false);
    material.roughness = 1;
    material.metalness = METALNESS[spec.texture] ?? 0;
  }
  if (name === "cloth") material.side = THREE.DoubleSide;
  weather(material, { wet: WET.has(spec.texture ?? ""), walls: WALLS.has(spec.texture ?? ""), macro: Boolean(spec.texture) });
  return material;
}

// Dark ground past the map edge so fly and overview cameras do not see a void.
const apron = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.10, 0.10, 0.11), roughness: 0.95 }));
apron.rotation.x = -Math.PI / 2;
apron.position.set(centre.x, bounds.min.y - 0.05, centre.z);
scene.add(apron);
let triangles = 0;
gltf.scene.traverse((object) => {
  if (!(object instanceof THREE.Mesh)) return;
  const spec = art.materials[object.name];
  if (!spec) throw new Error(`No art material for mesh ${object.name}`);
  object.material = createMaterial(object.name, spec);
  const lit = spec.lighting === "lit";
  object.castShadow = lit;
  object.receiveShadow = lit && object.name !== "glass";
  triangles += object.geometry.index.count / 3;
});
scene.add(gltf.scene);

// ---------------------------------------------------------------- sun and sky fill, shadows drawn once
function shadowed(colour: THREE.Color, intensity: number, direction: THREE.Vector3, mapSize: number, radius: number, normalBias: number) {
  const light = new THREE.DirectionalLight(colour, intensity);
  const reach = bounds.getSize(new THREE.Vector3()).length() / 2 + 20;
  light.position.copy(centre).addScaledVector(direction, -reach);
  light.target.position.copy(centre);
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.radius = radius;
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = normalBias;
  scene.add(light, light.target);
  // Fit the shadow frustum to the level as seen from this direction.
  const view = new THREE.Matrix4().lookAt(light.position, centre, new THREE.Vector3(0, 1, 0)).setPosition(light.position).invert();
  const fit = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z])
    fit.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(view));
  Object.assign(light.shadow.camera, { left: fit.min.x - 1, right: fit.max.x + 1, bottom: fit.min.y - 1, top: fit.max.y + 1, near: Math.max(0.5, -fit.max.z - 2), far: -fit.min.z + 2 });
  light.shadow.camera.updateProjectionMatrix();
  return light;
}
shadowed(SUN_COLOUR, 4.2, SUN_DIRECTION, 4096, 2.0, 0.035);
// Five tilted sky lights with soft shadows approximate occluded skylight: alleys and rooms darken on their own.
const FILLS = Number(lookDev.get("fills") ?? 3);
for (let i = 0; i < FILLS; i++) {
  const azimuth = (i / FILLS) * Math.PI * 2 + 0.35, elevation = THREE.MathUtils.degToRad(54);
  const direction = new THREE.Vector3(Math.cos(azimuth) * Math.cos(elevation), -Math.sin(elevation), Math.sin(azimuth) * Math.cos(elevation));
  shadowed(SKY_FILL, 2.6 / FILLS, direction, 2048, 4.5, 0.09);
}
scene.add(new THREE.HemisphereLight(new THREE.Color(0.50, 0.58, 0.88), new THREE.Color(0.52, 0.42, 0.32), 1.05));
renderer.shadowMap.autoUpdate = false; // the level is static
renderer.shadowMap.needsUpdate = true;

// ---------------------------------------------------------------- lamp pool
interface Slot { source: number; level: number }
const slots: Slot[] = Array.from({ length: POOL }, () => ({ source: -1, level: 0 }));
const lampPositions = art.lights.map((l) => new THREE.Vector3(...l.pos));
const lampDirections = art.lights.map((l) => new THREE.Vector3(...l.dir));
const scratch = new THREE.Vector3();
function updateLamps(dt: number) {
  const distances = new Map<number, number>();
  art.lights
    .map((l, i) => ({ i, d: lampPositions[i].distanceTo(camera.position) * LAMPS[l.kind].weight }))
    .filter((s) => s.d < LAMP_REACH).sort((a, b) => a.d - b.d).slice(0, POOL)
    .forEach((s) => distances.set(s.i, s.d));
  const placed = new Set<number>();
  for (const slot of slots) {
    const keep = distances.has(slot.source);
    slot.level = THREE.MathUtils.clamp(slot.level + (keep ? dt : -dt) * 3.5, 0, 1);
    if (keep) placed.add(slot.source);
    else if (slot.level === 0) slot.source = -1;
  }
  for (const index of distances.keys()) {
    if (placed.has(index)) continue;
    const slot = slots.find((s) => s.source === -1);
    if (!slot) break;
    slot.source = index;
  }
  camera.updateMatrixWorld();
  const view = camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  slots.forEach((slot, k) => {
    const position = lampUniforms.lampPosition.value[k], axis = lampUniforms.lampAxis.value[k], colour = lampUniforms.lampColour.value[k];
    if (slot.source < 0) {
      position.set(0, 0, 0, 0);
      return;
    }
    const spec = art.lights[slot.source], shape = LAMPS[spec.kind];
    const range = spec.reach ?? shape.range;
    scratch.copy(lampPositions[slot.source]).applyMatrix4(view);
    position.set(scratch.x, scratch.y, scratch.z, range);
    scratch.copy(lampDirections[slot.source]).transformDirection(view);
    axis.set(scratch.x, scratch.y, scratch.z, shape.cone);
    const fade = 1 - THREE.MathUtils.smoothstep(distances.get(slot.source) ?? LAMP_REACH, LAMP_REACH * 0.72, LAMP_REACH);
    const tall = spec.reach ? Math.max(1, (spec.reach / 4.2) ** 1.6) : 1; // taller rooms need more from the same fitting
    colour.set(...spec.color).multiplyScalar(shape.strength * tall * slot.level * fade * spec.power / (spec.kind === "lamp" ? 260 : spec.kind === "tube" ? 95 : 70));
  });
}

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Number(lookDev.get("msaa") ?? 4) }));
composer.addPass(new RenderPass(scene, camera));
const occlusion = new GTAOPass(scene, camera, 1, 1);
occlusion.updateGtaoMaterial({ radius: 0.75, distanceExponent: 1.3, thickness: 1.4, scale: 1.25, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
occlusion.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 });
composer.addPass(occlusion);
occlusion.enabled = lookDev.get("ao") !== "0";
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.55, 1.25);
composer.addPass(bloom);
bloom.enabled = lookDev.get("bloom") !== "0";
composer.addPass(new OutputPass());
/** Resolution multiplier on top of CSS pixels; lowered automatically when the frame rate cannot hold. */
let renderScale = Number(lookDev.get("scale") ?? Math.min(devicePixelRatio, 1.25));
function resize() {
  renderer.setPixelRatio(renderScale);
  composer.setPixelRatio(renderScale);
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  occlusion.setSize(Math.ceil(innerWidth * renderScale / 2), Math.ceil(innerHeight * renderScale / 2)); // AO at half resolution
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------- player
const first = (kind: string, index = 0) => meta.markers.filter((m) => m.kind === kind)[index];
const teleports = [first("attacker_spawn"), first("defender_spawn"), first("objective", 0), first("objective", 1)];
const player: PlayerState = { position: [...teleports[0].position] as Vec3, verticalSpeed: 0, grounded: false };
let yaw = -0.6, pitch = 0, overview = false, fly = false, crouch = false, eye = meta.player.height - 0.14;
const flyPosition = new THREE.Vector3();
const saved = JSON.parse(sessionStorage.getItem("ninefold-view") ?? "null") as null | { p: Vec3; f: Vec3; yaw: number; pitch: number; fly: boolean; exposure: number };
if (saved) {
  sessionStorage.removeItem("ninefold-view");
  player.position = saved.p;
  flyPosition.fromArray(saved.f);
  [yaw, pitch, fly] = [saved.yaw, saved.pitch, saved.fly];
  renderer.toneMappingExposure = saved.exposure;
}
const debugPosition = query.get("pos")?.split(",").map(Number);
if (debugPosition?.length === 3) {
  fly = true;
  flyPosition.set(debugPosition[0], debugPosition[1], debugPosition[2]);
  yaw = THREE.MathUtils.degToRad(Number(query.get("yaw") ?? 0));
  pitch = THREE.MathUtils.degToRad(Number(query.get("pitch") ?? 0));
}
const keys = bindGameInput(window, (code) => {
  const slot = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(code);
  if (slot >= 0 && teleports[slot]) {
    player.position = [...teleports[slot].position] as Vec3;
    player.verticalSpeed = 0;
    fly = false;
  }
  if (code === "KeyO") overview = !overview;
  if (code === "KeyC") crouch = !crouch;
  if (code === "KeyH") hud.classList.toggle("hidden");
  if (code === "KeyG") occlusion.enabled = !occlusion.enabled;
  if (code === "KeyQ") { // full quality, and stop adapting
    autoQuality = false;
    occlusion.enabled = true;
    renderScale = Math.min(devicePixelRatio, 1.25);
    resize();
  }
  if (code === "KeyF") {
    fly = !fly;
    if (fly) flyPosition.set(player.position[0], player.position[1] + eye, player.position[2]);
  }
  if (code === "BracketLeft") renderer.toneMappingExposure /= 1.15;
  if (code === "BracketRight") renderer.toneMappingExposure *= 1.15;
}, document);
renderer.domElement.addEventListener("click", () => renderer.domElement.requestPointerLock());
addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= event.movementX * 0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - event.movementY * 0.0022));
});

function wish(): [number, number] {
  const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  const strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  return [-Math.sin(yaw) * forward + Math.cos(yaw) * strafe, -Math.cos(yaw) * forward - Math.sin(yaw) * strafe];
}
function nearestPlace(x: number, y: number, z: number) {
  let best = "", distance = 14;
  for (const [name, px, py, pz] of PLACES) {
    const d = Math.hypot(px - x, (py - y) * 2.5, pz - z);
    if (d < distance) [best, distance] = [name, d];
  }
  return best;
}

loading.classList.add("done");
let last = performance.now(), frames = 0, fps = 0, fpsClock = last, slowFor = 0;
const started = last;
let autoQuality = lookDev.get("auto") !== "0";
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const slow = keys.has("ShiftLeft") || crouch;
  if (fly) {
    const [wx, wz] = wish();
    const lift = Number(keys.has("Space")) - Number(keys.has("ControlLeft"));
    const speed = keys.has("ShiftLeft") ? 30 : 9;
    flyPosition.x += wx * speed * dt;
    flyPosition.z += wz * speed * dt;
    flyPosition.y += (lift + Math.sin(pitch) * (Number(keys.has("KeyW")) - Number(keys.has("KeyS")))) * speed * dt;
  } else {
    stepPlayer(world, meta.player, player, { wish: wish(), jump: keys.has("Space") }, dt, slow ? RUN_SPEED * 0.52 : RUN_SPEED);
    if (player.position[1] < world.min[1] - 20) player.position = [...teleports[0].position] as Vec3;
  }
  const targetEye = crouch ? 1.023 : meta.player.height - 0.14;
  eye += (targetEye - eye) * Math.min(1, dt * 12);
  if (overview) {
    camera.position.set(centre.x - 30, 105, centre.z + 95);
    camera.lookAt(centre.x, 4, centre.z);
  } else {
    if (fly) camera.position.copy(flyPosition);
    else camera.position.set(player.position[0], player.position[1] + eye, player.position[2]);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
  sky.position.copy(camera.position);
  updateLamps(dt);
  composer.render(dt);
  frames++;
  if (now - fpsClock > 500) {
    fps = Math.round(frames * 1000 / (now - fpsClock));
    frames = 0;
    fpsClock = now;
    // Hold the frame rate: shed ambient occlusion first, then resolution. Q restores full quality.
    slowFor = fps < 44 && document.visibilityState === "visible" && now - started > 8000 ? slowFor + 1 : 0; // ignore warm-up
    if (autoQuality && slowFor >= 4) {
      slowFor = 0;
      if (occlusion.enabled) occlusion.enabled = false;
      else if (renderScale > 0.62) {
        renderScale = Math.max(0.6, renderScale * 0.88);
        resize();
      }
    }
  }
  const p = fly ? flyPosition.toArray() : player.position;
  place.textContent = overview ? "" : nearestPlace(p[0], fly ? p[1] - eye : p[1], p[2]);
  status.textContent = `${p.map((n) => n.toFixed(1)).join(", ")} · ${fly ? "fly" : player.grounded ? "ground" : "air"} · ${fps} fps · ${(triangles / 1000).toFixed(0)}k tris · scale ${renderScale.toFixed(2)}${occlusion.enabled ? " · ao" : ""} · exp ${renderer.toneMappingExposure.toFixed(2)}`;
});
// Live preview: when the art pass republishes, reload in place and keep the current view.
setInterval(async () => {
  const next = await fresh("ninefold.art.json").catch(() => null) as ArtManifest | null;
  if (!next || next.build === art.build) return;
  sessionStorage.setItem("ninefold-view", JSON.stringify({
    p: player.position, f: flyPosition.toArray(), yaw, pitch, fly, exposure: renderer.toneMappingExposure,
  }));
  location.reload();
}, 3000);
// Exposed for automated capture of a settled frame.
(window as unknown as { ninefoldReady: boolean }).ninefoldReady = true;
