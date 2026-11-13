/** Builds a small, standalone material study through the production surface recipes. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { Matrix4 } from "three";
import type { CompiledArchitecture, V3 } from "../src/architecture/types.ts";
import type { Material } from "../src/vector/types.ts";
import { emptyMesh } from "../src/vector/mesh.ts";
import { triangle } from "../src/dressing/geometry.ts";
import { GroundSurfaceField } from "../src/dressing/ground-surface.ts";
import { groundRectangle } from "../src/dressing/ground-field.ts";
import { WallCondition } from "../src/dressing/finish/wall-condition.ts";
import { smoothStep } from "../src/dressing/finish/noise.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { drawSkin } from "../src/dressing/kowloon/skin.ts";
import { wallMaterials } from "../src/dressing/wall-materials.ts";
import { planWallRuns } from "../src/dressing/wall-planning.ts";
import { tileWallRun } from "../src/dressing/wall-tiles.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { resolveExportAssets, generatedImageManifest } from "../src/vector/export-assets.ts";
import { toGLB } from "../src/vector/export.ts";
import { localMaterialImages } from "../src/cli/material-images.ts";
import { decodeMaterialPng } from "../src/materials/node-images.ts";

const output = resolve("generated/weathering-study");
const started = performance.now();
/** Reports finite generation stages so expensive geometry remains diagnosable. */
function progress(stage: string): void {
  process.stderr.write(`${stage} (${((performance.now() - started) / 1000).toFixed(1)}s)\n`);
}
const sourceFile = resolve("projects/dressing-demo/level.aml");
const level = JSON.parse(await readFile("generated/dressing-demo/presets/kowloon/preview.json", "utf8")).level as CompiledArchitecture;
const sourceIds = ["kowloon-ground", "kowloon-asphalt", "kowloon-plaster", "kowloon-wall-concrete", "kowloon-wall-render", "kowloon-wall-ceramic", "kowloon-wall-edge"];
const sources = level.document.materials.filter(material => sourceIds.includes(material.id));
level.document = { ...level.document, id: "weathering-study", name: "Weathered surface study", materials: sources, markers: [], routes: [], assets: [], lights: [] };
level.mesh = emptyMesh(); level.mesh.colors = []; level.mesh.solidIds = [];
level.physicalMesh = emptyMesh(); level.parts = []; level.surfaces = []; level.floors = []; level.water = [];
level.diagnostics = []; level.suggestions = []; level.provenance = {};
level.groundPlans = []; level.signPlans = []; level.connections = []; level.curves = {};
delete level.navigation; delete level.waterNavigation; delete level.generatedImages; delete level.surfaceAppearance; delete level.atlas;
level.architecture = { ...level.architecture, id: "weathering-study", materials: structuredClone(sources), elements: [] };
level.architecture.dressing = { ...level.architecture.dressing!, seed: "weathering-study", detail: "medium", grime: 0.7, wear: 0.85,
  wallMaterials: ["kowloon-wall-concrete"], finishes: "kowloon", rules: [{ kind: "wall", host: "tile-wall", material: "kowloon-wall-concrete", face: "back", windows: false, tileShare: 0.8 }] };
const budget = { maximumTriangles: 500_000 };

/** Adds one study material while preserving the approved source image and PBR channels. */
function material(id: string, source: string, overrides: Partial<Material> = {}): Material {
  const result = { ...sources.find(item => item.id === source)!, ...overrides, id };
  level.document.materials.push(result);
  return result;
}
material("substrate", "kowloon-ground", { color: "#9c9789", roughness: 0.98 });
material("study-concrete", "kowloon-ground", { color: "#c4c1b5", roughness: 0.94 });
material("grout", "kowloon-ground", { color: "#666452", roughness: 1 });
material("water-film", "kowloon-ground", { color: "#2f3936", roughness: 0.1, opacity: 0.16, texture: undefined, normalTexture: undefined });

/** Emits a planar study receiver with the same render-only ownership as generated dressing. */
function face(host: string, polygon: V3[], normal: V3, materialId: string): number {
  const index = level.surfaces.length;
  level.surfaces.push({ id: `${host}/${index}`, object: host, mesh: host, kind: "prop", role: "surface-study", layer: "study",
    material: materialId, dynamic: false, collidable: false, visible: true, closed: false, domain: "visualization" });
  level.provenance[host] ??= { id: host, sourceId: host, host, instances: [], contributors: [host] };
  const first = level.mesh.surfaces.length;
  const repeat = level.document.materials.find(item => item.id === materialId)!.repeat;
  for (let i = 1; i + 1 < polygon.length; i++) {
    const points = [polygon[0], polygon[i], polygon[i + 1]];
    triangle(level.mesh, points, normal, points.map(p => [p[0] * repeat, p[Math.abs(normal[2]) > 0.5 ? 1 : 2] * repeat]),
      [[1, 1, 1], [1, 1, 1], [1, 1, 1]], index);
  }
  return first;
}

/** One asymmetric shallow basin drives both the solid bed and its level water shoreline. */
function basinRadius(angle: number): number {
  return 1 + Math.sin(angle * 3 + 0.4) * 0.1 + Math.sin(angle * 7 - 0.8) * 0.045;
}

/** Exercises the production multi-material evaluator and its physical edge relief. */
function ground(host: string, x: number, width: number, tile: boolean): void {
  const polygon = groundRectangle(x, 0, width, 2);
  const field = new GroundSurfaceField({ seed: 317, kind: tile ? "tile" : "concrete", polygon,
    asphalt: tile ? undefined : [[0.12, 0.15, 0], [1.65, 0.12, 0], [1.87, 1.28, 0], [0.85, 1.85, 0], [0.16, 1.6, 0]],
    deposits: [],
    tileSize: 0.24, wornEdges: [true, true, true, true], angle: 0.31, phase: 0.37, relief: true, wear: 0.85, receivingEdges: [],
    material(finish) { const id = ({ concrete: "study-concrete", asphalt: "kowloon-asphalt", tile: "kowloon-wall-ceramic" } as Record<string, string>)[finish] ?? finish;
      return { id, repeat: level.document.materials.find(item => item.id === id)!.repeat }; },
    color: () => [1, 1, 1],
  });
  const firstTriangle = face(host, polygon, [0, 0, 1], tile ? "kowloon-wall-ceramic" : "kowloon-ground");
  registerSurfaceChart(level, { id: host, host, firstTriangle, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds: [x, 0, x + width, 2],
    materials: field.materials, layerElevations: field.layerElevations,
    geometryStep: 0.055, featureScale: field.featureScale([x, 0, x + width, 2]),
    constructionCuts: field.constructionCuts([x, 0, x + width, 2]),
    uniformCoverage: area => field.uniformCoverage(area),
    appearanceTint(u, v, layer) {
      const dx = (u - 2.4) / 0.4, dy = (v - 0.85) / 0.55;
      const radius = Math.hypot(dx, dy) / basinRadius(Math.atan2(dy, dx));
      const damp = tile ? 0 : 1 - smoothStep(0.75, 1.12, radius);
      return field.tint(u, v, layer).map(value => value * (1 - damp * 0.27)) as V3;
    },
    sample(u, v) { const sample = field.sample(u, v);
      const dx = (u - 2.4) / 0.4, dy = (v - 0.85) / 0.55;
      const radius = Math.hypot(dx, dy) / basinRadius(Math.atan2(dy, dx));
      const depression = tile ? 0 : 0.012 * (1 - smoothStep(0.2, 1, radius));
      const damp = tile ? 0 : 1 - smoothStep(0.75, 1.12, radius);
      return { ...sample, height: sample.height - depression,
        ...(damp > 0 ? { roughness: 0.94 - damp * 0.4 } : {}) }; },
  });
  if (!tile) {
    const rim = Array.from({ length: 64 }, (_, i): V3 => {
      const angle = i * Math.PI / 32;
      const radius = basinRadius(angle);
      return [2.4 + Math.cos(angle) * radius * 0.29, 0.85 + Math.sin(angle) * radius * 0.4, -0.002];
    });
    face("retained-bed-water", rim, [0, 0, 1], "water-film");
  }
}
ground("asphalt-concrete", 0, 3, false);
ground("missing-floor-tiles", 3.4, 2, true);

const wallFrame = new Matrix4().set(1, 0, 0, 0, 0, -1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 1);
const skinSlots = Object.fromEntries(["wall", "paint", "metal", "sheet", "timber", "pane", "glazing", "lettering", "board", "rust", "cloth", "aircon", "market-apple", "snack-packet", "grocer-props"].map(slot => [slot, "kowloon-plaster"])) as Record<KitSlot, string>;
skinSlots["substrate-0"] = "kowloon-wall-concrete";
const skinMesh = new KitMesh(level, "plaster-wall", "study", skinSlots, budget);
const condition = new WallCondition({ base: 0, ledges: [{ u0: 0, u1: 2, z: 2, flow: 0.8 }] }, { grime: 0.6, wear: 0.9, seed: 317 });
drawSkin({ pen: new Pen(skinMesh, "skin", wallFrame, true), rects: [{ u0: 0, u1: 2, v0: 0, v1: 2 }], openings: [],
  condition, washAt: () => [1, 0.98, 0.94], uMarks: [0, 2], zMarks: [0, 2], finish: { coat: "wall", bare: "substrate-0" } });
const wall: V3[] = [[3.4, 2, 0], [5.4, 2, 0], [5.4, 2, 2], [3.4, 2, 2]];
face("tile-wall", wall, [0, -1, 0], "kowloon-wall-concrete");
wallMaterials(level);
const runs = planWallRuns([{ rule: level.architecture.dressing!.rules[0], layer: "study", inverse: new Matrix4(), continuous: true,
  faces: [[wall[0], wall[1], wall[2]], [wall[0], wall[2], wall[3]]] }]);
for (const run of runs) tileWallRun(level, run, level.architecture.dressing!, budget);

const images = localMaterialImages(sourceFile);
progress(`Surface fields; ${level.mesh.surfaces.length} source triangles`);
await compileSurfaceAppearance(level, { resolveMaterialImage: images.load, decodeMaterialPng, appearance: { maximumTexels: 4 * 1024 * 1024 }, onProgress: progress }, budget.maximumTriangles);
progress(`Export; ${level.mesh.surfaces.length} triangles`);
const used = new Set(level.mesh.surfaces.map(index => level.surfaces[index].material));
level.document.materials = level.document.materials.filter(item => used.has(item.id));
level.stats = { ...level.stats, triangles: level.mesh.indices.length / 3, vertices: level.mesh.positions.length / 3, meshes: 5, regions: 0, architecturalObjects: 0 };
await mkdir(output, { recursive: true });
const assets = await resolveExportAssets(level, images.load);
await writeFile(join(output, "study.glb"), toGLB(level, { assets }));
for (const image of Object.values(assets)) {
  await mkdir(dirname(join(output, image.file)), { recursive: true });
  await writeFile(join(output, image.file), image.bytes);
}
await writeFile(join(output, "report.json"), JSON.stringify({ purpose: "Standalone production-recipe study; render-only, no navigation or baked lighting", stats: level.stats,
  appearance: level.surfaceAppearance, generatedImages: generatedImageManifest(level), materials: level.document.materials,
  assets: Object.fromEntries(Object.entries(assets).map(([reference, { bytes: _bytes, ...metadata }]) => [reference, metadata])),
  cases: ["asphalt/concrete", "transparent water over retained depressed bed", "plaster coat loss", "missing floor tiles", "ceramic wall fragments with real sidewalls"] }, null, 2));
await writeFile(join(output, "index.html"), `<!doctype html><meta charset="utf-8"><title>Weathered surfaces / material study</title>
<style>body{margin:0;background:#111;color:#eee;font:14px system-ui}canvas{display:block}header{position:absolute;z-index:2;left:24px;top:20px}h1{font-size:20px;margin:0 0 6px}p{margin:0 0 12px;color:#b8bec0}button,a{color:#ddd;border:1px solid #596165;background:#202629;padding:8px 12px;border-radius:6px;margin-right:6px;text-decoration:none}#status{position:absolute;bottom:18px;left:24px;color:#bbc3c4}</style>
<header><h1>Weathered surfaces</h1><p>Production material fields · Actual edge relief · Real-time lighting · Portable GLB</p>
<button data-view="overview">Overview</button><button data-view="asphalt">Asphalt edge</button><button data-view="plaster">Plaster</button><button data-view="tiles">Tiles</button><button data-view="floor">Floor tiles</button><button id="light">Rotate light</button><a href="study.glb">Download GLB</a></header><div id="status">Loading study…</div>
<script type="importmap">{"imports":{"three":"/@fs/${resolve("node_modules/three/build/three.module.js")}","three/addons/":"/@fs/${resolve("node_modules/three/examples/jsm")}/"}}</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#363c3c');const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.01,60);const controls=new OrbitControls(camera,renderer.domElement);
scene.add(new THREE.HemisphereLight('#d9e6ea','#555145',2));const sun=new THREE.DirectionalLight('#fff1dd',3);sun.position.set(-3,5,3);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.camera.near=.1;sun.shadow.camera.far=20;sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.008;sun.shadow.bias=-.00003;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#565953',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const views={overview:[[7,4.5,5.5],[2.6,.65,-.8]],asphalt:[[1.9,.65,.4],[1.48,.01,-.9]],plaster:[[1.5,1.15,.1],[1.05,.95,-2]],tiles:[[5.6,1.9,.2],[4.3,.6,-1.45]],floor:[[5,2.3,.5],[4.4,0,-1]]};
window.studyView=name=>{const[p,t]=views[name];camera.position.set(...p);controls.target.set(...t);controls.update()};window.studyView(new URL(location.href).searchParams.get('view')||'overview');document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>window.studyView(button.dataset.view));document.querySelector('#light').onclick=()=>{sun.position.x=-sun.position.x;sun.position.z=-sun.position.z;};
new GLTFLoader().load('study.glb',gltf=>{gltf.scene.traverse(object=>{if(object.isMesh){object.castShadow=!object.material.transparent;object.receiveShadow=true;object.material.shadowSide=THREE.DoubleSide;}});scene.add(gltf.scene);window.studyReady=true;document.querySelector('#status').textContent='Drag to orbit · Scroll to inspect · Lighting is rendered live';},undefined,error=>document.querySelector('#status').textContent=error.message);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
</script>`);
console.log(JSON.stringify({ output, triangles: level.stats.triangles, appearance: level.surfaceAppearance }));
