import "./style.css";
import { setupExport } from "./export.ts";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import showcase from "../examples/showcase.level.svgx?raw";
import dust2 from "../examples/dust2.level.svgx?raw";
import { toSVGPlan, atlasSVG } from "../src/vector/index.ts";
import {
  validateLightingManifest,
  sha256Bytes,
  lightingStateKey,
} from "../src/lighting/manifest.ts";
import type {
  CompiledLevel,
  ValidationReport,
  Diagnostic,
  NavigationBlockReason,
  NavigationCoverage,
} from "../src/vector/types.ts";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const navigationReasons: Record<
  NavigationBlockReason,
  { label: string; color: string }
> = {
  headroom: { label: "Low headroom", color: "#d73d4d" },
  width: { label: "Too narrow", color: "#eb6441" },
  slope: { label: "Too steep", color: "#bd326e" },
  step: { label: "Step too high", color: "#c67927" },
  disconnected: { label: "Disconnected", color: "#993f89" },
  uncovered: { label: "No navigation", color: "#bc3030" },
};
type CoverageSample = NavigationCoverage["uncovered"][number];
function navigation() {
  return report?.navigation ?? level?.navigation;
}
function sampleLabel(sample: CoverageSample) {
  return `${navigationReasons[sample.reason].label}${sample.clearance === undefined ? "" : ` (${sample.clearance.toFixed(2)} m clearance)`}`;
}
function visibleCoverage() {
  return (navigation()?.coverage.uncovered ?? []).filter(
    (sample) =>
      !layers.value ||
      level?.document.layers.some(
        (layer) =>
          layer.id === layers.value &&
          layer.regions.some((region) => region.id === sample.region),
      ),
  );
}
const source = $<HTMLTextAreaElement>("source"),
  mode = $<HTMLSelectElement>("mode"),
  layers = $<HTMLSelectElement>("layer"),
  uvs = $<HTMLInputElement>("uvs");
let level: CompiledLevel | undefined,
  report: ValidationReport | undefined,
  selected = "",
  worker: Worker | undefined,
  revision = 0,
  flyMode = false;
let exportReady = false;
const exportUI = setupExport(() =>
  exportReady && level ? { level, source: source.value } : undefined,
);
function setExportReady(value: boolean) {
  exportReady = value;
  exportUI.setAvailable(value);
}
type Panel = "source" | "inspect" | "atlas" | "validation";
let activePanel: Panel | undefined;
const panelButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-panel]"),
];
function showPanel(panel?: Panel) {
  activePanel = panel;
  $("utility-panel").hidden = !panel;
  for (const button of panelButtons) {
    const name = button.dataset.panel as Panel;
    button.setAttribute("aria-expanded", String(panel === name));
    $(`${name}-panel`).hidden = panel !== name;
  }
  if (panel)
    $("panel-title").textContent = {
      source: "Source",
      inspect: "Selection",
      atlas: "Lightmap atlas",
      validation: "Validation",
    }[panel];
}
for (const button of panelButtons)
  button.onclick = () => {
    const next = button.dataset.panel as Panel;
    showPanel(activePanel === next ? undefined : next);
  };
$("close-panel").onclick = () => {
  const previous = activePanel;
  showPanel();
  panelButtons.find((b) => b.dataset.panel === previous)?.focus();
};
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activePanel) $("close-panel").click();
});
const scene = new THREE.Scene();
scene.background = new THREE.Color("#e6eef3");
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
camera.up.set(0, 0, 1);
camera.position.set(30, -25, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("three").append(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(10, 5, 0);
orbit.enableDamping = true;
const fly = new FlyControls(camera, renderer.domElement);
fly.enabled = false;
fly.movementSpeed = 10;
fly.rollSpeed = 0.3;
fly.dragToLook = true;
const ambient = new THREE.HemisphereLight("#dce8f5", "#647580", 0);
ambient.position.set(0, 0, 1);
scene.add(ambient);
const lights = new THREE.Group(),
  group = new THREE.Group();
scene.add(group, lights);
let environment: THREE.WebGLRenderTarget | undefined;
const environmentGenerator = new THREE.PMREMGenerator(renderer);
function setEnvironment() {
  if (!level) return;
  const sky = level.document.sky,
    color = new THREE.Color(sky.color).multiplyScalar(sky.intensity),
    pixels = new Float32Array(128 * 64 * 4);
  for (let i = 0; i < pixels.length; i += 4)
    pixels.set([color.r, color.g, color.b, 1], i);
  const image = new THREE.DataTexture(
    pixels,
    128,
    64,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  image.mapping = THREE.EquirectangularReflectionMapping;
  image.needsUpdate = true;
  const next = environmentGenerator.fromEquirectangular(image);
  scene.environment = next.texture;
  environment?.dispose();
  environment = next;
  image.dispose();
}
const grid = new THREE.GridHelper(100, 100, "#a7bbc9", "#cbd8e1");
grid.rotation.x = Math.PI / 2;
grid.position.z = -0.25;
scene.add(grid);
const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000),
  checkerCanvas = document.createElement("canvas");
checkerCanvas.width = checkerCanvas.height = 128;
const cx = checkerCanvas.getContext("2d")!;
cx.fillStyle = "#e8edf0";
cx.fillRect(0, 0, 128, 128);
cx.fillStyle = "#738b9d";
cx.fillRect(0, 0, 64, 64);
cx.fillRect(64, 64, 64, 64);
cx.fillStyle = "#233749";
cx.font = "18px sans-serif";
cx.fillText("1 m", 72, 94);
const checker = new THREE.CanvasTexture(checkerCanvas);
checker.wrapS = checker.wrapT = THREE.RepeatWrapping;
checker.colorSpace = THREE.SRGBColorSpace;
const resize = new ResizeObserver(() => {
  const host = $("three"),
    w = host.clientWidth,
    h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
resize.observe($("three"));
let previous = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(),
    dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  if (flyMode) fly.update(dt);
  else orbit.update();
  renderer.render(scene, camera);
});
let lightmaps: THREE.DataTexture[] = [],
  lightingRevision = "",
  lightingScale = Math.PI;
function disposeModel() {
  for (const child of [...group.children]) {
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      if (child instanceof THREE.InstancedMesh) child.dispose();
      child.geometry.dispose();
      for (const m of Array.isArray(child.material)
        ? child.material
        : [child.material])
        m.dispose();
    }
  }
}
function clearLighting() {
  for (const texture of lightmaps) texture.dispose();
  lightmaps = [];
  lightingRevision = "";
}
function materials(si: number, page: number) {
  const surface = level!.surfaces[si],
    def = level!.document.materials.find((m) => m.id === surface.material),
    color = new THREE.Color(def?.color ?? "#b9c7d1");
  if (selected === surface.object) color.set("#d69b39");
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: def?.roughness ?? 0.8,
    metalness: def?.metalness ?? 0,
    side: THREE.FrontSide,
    clippingPlanes: [plane],
    polygonOffset: surface.role === "navigation",
    polygonOffsetFactor: -1,
  });
  if (mode.value === "checker") {
    mat.map = checker;
    mat.color.set("#ffffff");
  }
  if (mode.value === "charts") mat.vertexColors = true;
  if (mode.value === "density") {
    mat.color.set(page >= 0 ? "#65ae86" : "#cfaa73");
  }
  if (
    mode.value === "lighting" &&
    page >= 0 &&
    lightmaps[page] &&
    lightingRevision === lightingStateKey(level!)
  ) {
    mat.lightMap = lightmaps[page];
    mat.lightMapIntensity = lightingScale;
    mat.onBeforeCompile = (shader) => {
      const begin = THREE.ShaderChunk.lights_fragment_begin,
        end = THREE.ShaderChunk.lights_fragment_end;
      if (
        !begin.includes("getAmbientLightIrradiance") ||
        !end.includes("RE_IndirectDiffuse")
      )
        throw new Error("Unsupported Three.js lighting shader.");
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_begin>",
        begin
          .replace(
            "getAmbientLightIrradiance( ambientLightColor )",
            "vec3( 0.0 )",
          )
          .replace(/irradiance \+= getHemisphereLightIrradiance\([^;]+;/g, ""),
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        end.replace(
          "irradiance += iblIrradiance;",
          "// Sky diffuse is already in the lightmap.",
        ),
      );
    };
    mat.customProgramCacheKey = () => `levelspec-hybrid-${THREE.REVISION}`;
  }
  return mat;
}
function renderModel(fit = false) {
  if (!level) return;
  disposeModel();
  const m = level.mesh,
    groups = new Map<string, number[]>();
  for (let t = 0; t < m.surfaces.length; t++) {
    const s = level.surfaces[m.surfaces[t]];
    if (s.visible === false) continue;
    if (layers.value && s.layer !== layers.value) continue;
    if (!$<HTMLInputElement>("roofs").checked && s.role === "roof") continue;
    const key = JSON.stringify([
        s.mesh,
        s.object,
        s.material,
        m.atlasPages?.[t] ?? -1,
      ]),
      list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  for (const [key, ts] of groups) {
    const si = m.surfaces[ts[0]],
      page = m.atlasPages?.[ts[0]] ?? -1,
      positions: number[] = [],
      normals: number[] = [],
      uv: number[] = [],
      uv1: number[] = [],
      colors: number[] = [];
    for (const t of ts)
      for (const i of m.indices.slice(t * 3, t * 3 + 3)) {
        positions.push(...m.positions.slice(i * 3, i * 3 + 3));
        normals.push(...m.normals.slice(i * 3, i * 3 + 3));
        uv.push(...m.uv.slice(i * 2, i * 2 + 2));
        if (m.uv1) uv1.push(...m.uv1.slice(i * 2, i * 2 + 2));
        const c = new THREE.Color().setHSL(
          ((m.chartIds?.[t] ?? si) * 0.381966) % 1,
          0.4,
          0.65,
        );
        colors.push(c.r, c.g, c.b);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    if (uv1.length)
      geometry.setAttribute("uv1", new THREE.Float32BufferAttribute(uv1, 2));
    const mesh = new THREE.Mesh(geometry, materials(si, page));
    mesh.userData.object = level.surfaces[si].object;
    mesh.userData.meshPart = level.surfaces[si].mesh;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  const nav = navigation();
  if (mode.value === "navigation" && nav) {
    const n = nav,
      g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(n.positions, 3),
    );
    g.setIndex(n.indices);
    g.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      color: "#378faf",
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [plane],
    });
    const navigationMesh = new THREE.Mesh(g, mat);
    navigationMesh.renderOrder = 1;
    group.add(navigationMesh);
    const patches = new Map<string, CoverageSample[]>();
    for (const sample of visibleCoverage()) {
      const key = `${sample.region}:${sample.reason}`;
      const list = patches.get(key) ?? [];
      list.push(sample);
      patches.set(key, list);
    }
    for (const samples of patches.values()) {
      const first = samples[0];
      const geometry = new THREE.CircleGeometry(
        Math.min(0.2, n.coverage.sampleSpacing * 0.36),
        12,
      );
      const material = new THREE.MeshBasicMaterial({
        color: navigationReasons[first.reason].color,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        clippingPlanes: [plane],
      });
      const markers = new THREE.InstancedMesh(
        geometry,
        material,
        samples.length,
      );
      const matrix = new THREE.Matrix4();
      samples.forEach((sample, i) =>
        markers.setMatrixAt(
          i,
          matrix.makeTranslation(
            sample.position[0],
            sample.position[1],
            sample.position[2] + 0.06,
          ),
        ),
      );
      markers.instanceMatrix.needsUpdate = true;
      markers.userData.object = first.region;
      markers.userData.navigationSamples = samples;
      markers.renderOrder = 2;
      group.add(markers);
    }
  }
  if (fit) fitMap();
}
function fitMap() {
  if (!level) return;
  const box = new THREE.Box3().setFromObject(group),
    center = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3()),
    span = Math.max(size.x, size.y, size.z, 5);
  const direction = new THREE.Vector3(0.75, -0.9, 0.85).normalize();
  const right = new THREE.Vector3()
    .crossVectors(camera.up, direction)
    .normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanHorizontal = tanVertical * camera.aspect;
  let distance = 5;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const corner = new THREE.Vector3(x, y, z).sub(center);
        distance = Math.max(
          distance,
          corner.dot(direction) + Math.abs(corner.dot(right)) / tanHorizontal,
          corner.dot(direction) + Math.abs(corner.dot(up)) / tanVertical,
        );
      }
  orbit.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance * 1.12);
  camera.near = 0.05;
  camera.far = Math.max(500, span * 20);
  camera.updateProjectionMatrix();
  orbit.update();
  plane.constant = box.max.z + 1;
  $<HTMLInputElement>("cut").value = "1";
}
type PlanCamera = { x: number; y: number; width: number; height: number };
let planCamera: PlanCamera | undefined;
let planBounds: PlanCamera | undefined;
const planHost = $("plan");
function applyPlanCamera() {
  if (!planCamera) return;
  planHost
    .querySelector("svg")
    ?.setAttribute(
      "viewBox",
      `${planCamera.x} ${planCamera.y} ${planCamera.width} ${planCamera.height}`,
    );
}
function fitPlan() {
  if (!planBounds) return;
  const padding = Math.max(planBounds.width, planBounds.height) * 0.07;
  planCamera = {
    x: planBounds.x - padding,
    y: planBounds.y - padding,
    width: planBounds.width + padding * 2,
    height: planBounds.height + padding * 2,
  };
  applyPlanCamera();
}
function renderPlan(fit = false) {
  if (!level) return;
  planHost.innerHTML = toSVGPlan(level, layers.value || undefined);
  const view = planHost.querySelector("svg")!.viewBox.baseVal;
  planBounds = {
    x: view.x,
    y: view.y,
    width: Math.max(view.width, 0.1),
    height: Math.max(view.height, 0.1),
  };
  if (fit || !planCamera) fitPlan();
  else applyPlanCamera();
  for (const el of planHost.querySelectorAll<SVGElement>("[data-object]")) {
    el.classList.toggle("selected", el.dataset.object === selected);
  }
  if ($<HTMLInputElement>("heights").checked) {
    const svg = $("plan").querySelector("g")!;
    for (const l of level.document.layers.filter(
      (l) => !layers.value || l.id === layers.value,
    ))
      for (const v of l.vertices) {
        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        label.setAttribute("x", String(v.x));
        label.setAttribute("y", String(-v.y));
        label.setAttribute("font-size", ".32");
        label.setAttribute("fill", "#ad6200");
        label.textContent = `${v.z}m`;
        svg.append(label);
      }
  }
  renderNavigationPlan();
}
function renderNavigationPlan() {
  $("navigation-legend").hidden = mode.value !== "navigation";
  if (mode.value !== "navigation") return;
  const nav = navigation();
  $("navigation-legend").textContent = nav
    ? `${nav.settings.player.height} m × ${nav.settings.player.radius * 2} m capsule · Colored marks: uncovered floor`
    : "Building capsule navigation…";
  const svg = planHost.querySelector("g");
  if (!svg) return;
  for (const sample of visibleCoverage()) {
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    marker.setAttribute("cx", String(sample.position[0]));
    marker.setAttribute("cy", String(-sample.position[1]));
    marker.setAttribute(
      "r",
      String(Math.min(0.2, (nav?.coverage.sampleSpacing ?? 0.5) * 0.36)),
    );
    marker.setAttribute("fill", navigationReasons[sample.reason].color);
    marker.setAttribute("stroke", "white");
    marker.setAttribute("stroke-width", ".025");
    marker.dataset.object = sample.region;
    marker.dataset.navigationReason = sample.reason;
    marker.dataset.navigationLabel = sampleLabel(sample);
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title",
    );
    title.textContent = `${sample.region}: ${sampleLabel(sample)} at ${sample.position[2].toFixed(2)} m`;
    marker.append(title);
    svg.append(marker);
  }
}
function planPoint(x: number, y: number) {
  const matrix = planHost.querySelector("svg")?.getScreenCTM();
  return matrix
    ? new DOMPoint(x, y).matrixTransform(matrix.inverse())
    : undefined;
}
function zoomPlan(scale: number, x: number, y: number) {
  if (!planCamera || !planBounds) return;
  const point = planPoint(x, y);
  if (!point) return;
  const ratio =
    (Math.max(
      0.01,
      Math.min(20, (planCamera.width * scale) / planBounds.width),
    ) *
      planBounds.width) /
    planCamera.width;
  planCamera.x = point.x + (planCamera.x - point.x) * ratio;
  planCamera.y = point.y + (planCamera.y - point.y) * ratio;
  planCamera.width *= ratio;
  planCamera.height *= ratio;
  applyPlanCamera();
}
type PlanPointer = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  dragged: boolean;
  object?: string;
  detail?: string;
  selectable: boolean;
};
const planPointers = new Map<number, PlanPointer>();
function pointerPair() {
  const pair = [...planPointers.values()];
  if (pair.length < 2) return;
  return {
    x: (pair[0].x + pair[1].x) / 2,
    y: (pair[0].y + pair[1].y) / 2,
    distance: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y),
  };
}
planHost.addEventListener("contextmenu", (event) => event.preventDefault());
planHost.addEventListener("pointerdown", (event) => {
  if (!planCamera || ![0, 1, 2].includes(event.button)) return;
  const hit = (event.target as Element).closest<SVGElement>("[data-object]");
  const object = hit?.dataset.object;
  planPointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    dragged: false,
    object,
    detail: hit?.dataset.navigationLabel,
    selectable:
      event.button === 0 &&
      !spacePan &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey,
  });
  if (planPointers.size > 1)
    for (const pointer of planPointers.values()) pointer.dragged = true;
  planHost.setPointerCapture(event.pointerId);
  planHost.focus({ preventScroll: true });
  event.preventDefault();
});
planHost.addEventListener("pointermove", (event) => {
  const pointer = planPointers.get(event.pointerId);
  if (!pointer || !planCamera) return;
  const pair = pointerPair();
  const previousX = pointer.x,
    previousY = pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  if (
    Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >
    4
  )
    pointer.dragged = true;
  if (!pointer.dragged) return;
  planHost.classList.add("dragging");
  const nextPair = pointerPair();
  if (pair && nextPair) {
    if (pair.distance > 1 && nextPair.distance > 1)
      zoomPlan(pair.distance / nextPair.distance, pair.x, pair.y);
    const before = planPoint(pair.x, pair.y),
      after = planPoint(nextPair.x, nextPair.y);
    if (before && after) {
      planCamera.x += before.x - after.x;
      planCamera.y += before.y - after.y;
    }
  } else {
    const before = planPoint(previousX, previousY),
      after = planPoint(pointer.x, pointer.y);
    if (before && after) {
      planCamera.x += before.x - after.x;
      planCamera.y += before.y - after.y;
    }
  }
  applyPlanCamera();
});
function endPlanPointer(event: PointerEvent) {
  const pointer = planPointers.get(event.pointerId);
  planPointers.delete(event.pointerId);
  if (!planPointers.size) planHost.classList.remove("dragging");
  if (
    event.type === "pointerup" &&
    pointer?.selectable &&
    !pointer.dragged &&
    pointer.object
  )
    select(pointer.object, pointer.detail);
}
planHost.addEventListener("pointerup", endPlanPointer);
planHost.addEventListener("pointercancel", endPlanPointer);
planHost.addEventListener("lostpointercapture", endPlanPointer);
planHost.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const delta =
      event.deltaY *
      (event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? planHost.clientHeight
          : 1);
    zoomPlan(
      Math.exp(Math.max(-1, Math.min(1, delta * 0.0015))),
      event.clientX,
      event.clientY,
    );
  },
  { passive: false },
);
function renderAtlas() {
  const sel = $<HTMLSelectElement>("atlas-page");
  if (!level?.atlas) {
    sel.innerHTML = "";
    $("atlas").textContent = "Enable lightmap UVs to inspect the packed mesh.";
    return;
  }
  const old = sel.value;
  sel.innerHTML = level.atlas.pages
    .map((p) => `<option value="${p.id}">Page ${p.id + 1}</option>`)
    .join("");
  if (old && level.atlas.pages.some((p) => String(p.id) === old))
    sel.value = old;
  $("atlas").innerHTML = atlasSVG(level, Number(sel.value));
  for (const el of $("atlas").querySelectorAll<SVGElement>("[data-chart]"))
    el.addEventListener("click", () => {
      const chart = level!.atlas!.charts.find(
        (c) => c.id === Number(el.dataset.chart),
      );
      if (chart?.objects[0]) select(chart.objects[0]);
    });
}
function selectedObject() {
  return level?.document.layers
    .flatMap((l) => [l, ...l.vertices, ...l.edges, ...l.regions])
    .find((o) => o.id === selected);
}
function revealSource(location = selectedObject()?.source) {
  if (!location) return;
  showPanel("source");
  source.focus({ preventScroll: true });
  source.setSelectionRange(location.offset, location.end ?? location.offset);
  source.scrollTop = Math.max(0, (location.line - 4) * 20.4);
}
$("reveal-source").onclick = () => revealSource();
function select(id: string, detail?: string) {
  selected = id;
  const objects =
      level?.document.layers.flatMap((l) => [
        l,
        ...l.vertices,
        ...l.edges,
        ...l.regions,
      ]) ?? [],
    obj = objects.find((o) => o.id === id);
  $("selection").textContent = obj
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(obj).filter(
            ([k]) => !["source", "vertices", "edges", "regions"].includes(k),
          ),
        ),
        null,
        2,
      )
    : id;
  $("selection-summary").textContent = detail ? `${id} · ${detail}` : id;
  $<HTMLButtonElement>("reveal-source").disabled = !obj?.source;
  renderPlan();
  renderModel();
}
const ray = new THREE.Raycaster();
let spacePan = false;
const threePointers = new Map<
  number,
  { x: number; y: number; dragged: boolean; selectable: boolean }
>();
function resetSpacePan() {
  spacePan = false;
  orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
}
window.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    flyMode ||
    (event.target as HTMLElement).closest(
      "input,textarea,select,button,[contenteditable=true]",
    )
  )
    return;
  event.preventDefault();
  spacePan = true;
  orbit.mouseButtons.LEFT = THREE.MOUSE.PAN;
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") resetSpacePan();
});
window.addEventListener("blur", resetSpacePan);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute(
  "aria-label",
  "3D map. Drag to orbit, right-drag or Space and drag to pan, scroll to zoom.",
);
renderer.domElement.addEventListener(
  "pointerdown",
  (e) => {
    threePointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      dragged: false,
      selectable:
        !flyMode &&
        !spacePan &&
        e.button === 0 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey,
    });
    if (threePointers.size > 1)
      for (const pointer of threePointers.values()) pointer.dragged = true;
    renderer.domElement.focus({ preventScroll: true });
  },
  { capture: true },
);
renderer.domElement.addEventListener("pointermove", (e) => {
  const pointer = threePointers.get(e.pointerId);
  if (pointer && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 4)
    pointer.dragged = true;
});
renderer.domElement.addEventListener("pointerup", (e) => {
  const pointer = threePointers.get(e.pointerId);
  threePointers.delete(e.pointerId);
  if (!pointer?.selectable || pointer.dragged || flyMode) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    ),
    camera,
  );
  const hits = ray.intersectObjects(group.children);
  const hit =
    hits.find((h) => h.object.userData.navigationSamples) ??
    hits.find((h) => h.object.userData.object);
  if (hit) {
    const sample =
      hit.instanceId === undefined
        ? undefined
        : (hit.object.userData.navigationSamples?.[hit.instanceId] as
            | CoverageSample
            | undefined);
    select(
      hit.object.userData.object,
      sample ? sampleLabel(sample) : undefined,
    );
  }
});
renderer.domElement.addEventListener("pointercancel", (e) =>
  threePointers.delete(e.pointerId),
);
renderer.domElement.addEventListener("lostpointercapture", (e) =>
  threePointers.delete(e.pointerId),
);
source.addEventListener("click", () => {
  if (!level) return;
  const pos = source.selectionStart,
    obj = level.document.layers
      .flatMap((l) => [...l.vertices, ...l.edges, ...l.regions])
      .filter(
        (o) =>
          o.source &&
          o.source.offset <= pos &&
          (o.source.end ?? Infinity) >= pos,
      )
      .sort((a, b) => b.source!.offset - a.source!.offset)[0];
  if (obj) select(obj.id);
});
function renderCoverageSummary() {
  const host = $("coverage-summary"),
    nav = navigation();
  host.replaceChildren();
  if (!nav) return;
  const summary = document.createElement("p");
  summary.textContent = `${nav.settings.player.height} m tall × ${nav.settings.player.radius * 2} m wide capsule. ${nav.coverage.covered.toLocaleString()} covered samples; ${nav.coverage.uncoveredCount.toLocaleString()} uncovered.`;
  host.append(summary);
  const note = document.createElement("p");
  note.className = "panel-hint";
  note.textContent = `${nav.coverage.excluded.toLocaleString()} wall footprints and normal boundary margins excluded. ${nav.coverage.sampleSpacing} m sample spacing.${nav.coverage.uncoveredCount > nav.coverage.uncovered.length ? ` Showing ${nav.coverage.uncovered.length.toLocaleString()} representative failure markers.` : ""}`;
  host.append(note);
  for (const row of nav.coverage.regions) {
    for (const reason of Object.keys(
      navigationReasons,
    ) as NavigationBlockReason[]) {
      const count = row.reasons[reason];
      if (!count) continue;
      const button = document.createElement("button");
      button.className = "coverage-reason";
      button.style.borderLeftColor = navigationReasons[reason].color;
      button.textContent = `${row.region}: ${navigationReasons[reason].label} (${count.toLocaleString()})`;
      button.onclick = () => {
        mode.value = "navigation";
        select(row.region, navigationReasons[reason].label);
      };
      host.append(button);
    }
  }
}
function showDiagnostics(items: Diagnostic[]) {
  renderCoverageSummary();
  $("diagnostics").replaceChildren();
  const errors = items.filter((d) => d.severity === "error").length;
  const warnings = items.filter((d) => d.severity === "warning").length;
  $("diagnostic-count").textContent = String(errors + warnings);
  const validationButton = panelButtons.find(
    (b) => b.dataset.panel === "validation",
  )!;
  validationButton.classList.toggle("has-errors", errors > 0);
  validationButton.classList.toggle("has-warnings", !errors && warnings > 0);
  validationButton.setAttribute(
    "aria-label",
    `Validation: ${errors} errors, ${warnings} warnings`,
  );
  for (const d of items) {
    const b = document.createElement("button");
    b.className = d.severity;
    b.textContent = `${d.source ? `${d.source.line}:${d.source.column}  ` : ""}${d.code} — ${d.message}`;
    b.onclick = () => {
      if (d.objects[0]) select(d.objects[0]);
      if (d.source) revealSource(d.source);
    };
    $("diagnostics").append(b);
  }
  if (!items.some((d) => d.severity === "error")) {
    const p = document.createElement("p");
    p.className = "success";
    p.textContent = report?.passed
      ? "Geometry and playable navigation passed."
      : "Geometry compiled. Navigation validation is running.";
    $("diagnostics").append(p);
  }
}
function compile() {
  setExportReady(false);
  clearTimeout(debounce);
  worker?.terminate();
  const id = ++revision;
  worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  $("status").className = "";
  $("status").textContent = "Compiling…";
  report = undefined;
  worker.onmessage = (e) => {
    if (e.data.id !== revision) return;
    const data = e.data;
    if (data.error) {
      $("status").textContent =
        `${level ? (data.partial === "uv" ? "Geometry and navigation retained. " : "Previous preview retained. ") : ""}${data.error}`;
      $("status").className = "error";
      $("validation-status").textContent =
        data.partial === "uv"
          ? "UV generation failed"
          : "Source needs attention";
      showDiagnostics(
        data.diagnostics ?? [
          {
            severity: "error",
            code: data.partial === "uv" ? "UV_GENERATION" : "COMPILE",
            message: data.error,
            objects: [],
          },
        ],
      );
      return;
    }
    if (data.stage) $("status").textContent = data.stage;
    if (data.level) {
      const next = data.level as CompiledLevel;
      if (next.diagnostics.some((d) => d.severity === "error")) {
        showDiagnostics(next.diagnostics);
        $("status").textContent =
          "Source needs attention. Previous preview retained.";
        $("status").className = "error";
        return;
      }
      const first = !level || level.document.id !== next.document.id;
      if (level && lightingStateKey(level) !== lightingStateKey(next))
        clearLighting();
      level = next;
      report = data.report ?? report;
      $("map-name").textContent = level.document.name;
      $("stats").textContent =
        `${level.stats.triangles.toLocaleString()} triangles / ${level.floors.length} regions`;
      const current = layers.value;
      layers.innerHTML = '<option value="">All layers</option>';
      for (const l of level.document.layers) {
        const o = document.createElement("option");
        o.value = l.id;
        o.textContent = l.label ?? l.id;
        layers.append(o);
      }
      layers.value = current;
      for (const l of lights.children)
        if (l instanceof THREE.Light)
          (l as THREE.DirectionalLight).shadow?.dispose();
      lights.clear();
      setEnvironment();
      for (const l of level.document.lights) {
        const light =
          l.kind === "directional"
            ? new THREE.DirectionalLight(l.color, l.intensity)
            : l.kind === "spot"
              ? new THREE.SpotLight(
                  l.color,
                  l.intensity,
                  0,
                  l.angle ?? Math.PI / 4,
                )
              : new THREE.PointLight(l.color, l.intensity);
        light.position.set(...l.position);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        if (light instanceof THREE.DirectionalLight) {
          light.target.position.set(...l.target);
          lights.add(light.target);
          Object.assign(light.shadow.camera, {
            left: -40,
            right: 40,
            top: 40,
            bottom: -40,
            near: 0.1,
            far: 150,
          });
        }
        if (light instanceof THREE.SpotLight) {
          light.target.position.set(...l.target);
          lights.add(light.target);
        }
        lights.add(light);
      }
      renderPlan(first);
      renderModel(first);
      renderAtlas();
      showDiagnostics(report?.diagnostics ?? level.diagnostics);
      $("validation-status").textContent = report
        ? report.passed
          ? "Passed"
          : "Needs attention"
        : "Checking navigation";
      if (data.stage === "Ready") setExportReady(Boolean(report?.passed));
      if (data.stage === "Ready")
        $("status").textContent = report?.passed
          ? "Ready to inspect"
          : "Compiled with validation errors";
    }
  };
  worker.onerror = (e) => {
    if (id !== revision) return;
    $("status").textContent = `Worker failed: ${e.message}`;
    $("status").className = "error";
  };
  worker.postMessage({ id, text: source.value, uvs: uvs.checked });
}
$("compile").onclick = compile;
$("cancel").onclick = () => {
  setExportReady(false);
  clearTimeout(debounce);
  worker?.terminate();
  revision++;
  $("status").textContent = "Cancelled. Previous preview retained.";
};
let debounce: ReturnType<typeof setTimeout>;
source.oninput = () => {
  setExportReady(false);
  clearTimeout(debounce);
  // An edit invalidates in-flight results immediately, including the debounce
  // interval before its replacement compilation is started.
  worker?.terminate();
  revision++;
  $("status").textContent = "Source changed. Preview is stale.";
  debounce = setTimeout(compile, 650);
};
function save(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("download").onclick = () =>
  save(
    `${level?.document.id ?? "map"}.level.svgx`,
    source.value,
    "application/xml",
  );
$("open").onclick = () => $<HTMLInputElement>("file").click();
$<HTMLInputElement>("file").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    source.value = await file.text();
    $("filename").textContent = file.name;
    compile();
  }
};
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
});
window.addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) document.body.classList.remove("dragging");
});
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  const files = [...e.dataTransfer!.files];
  if (
    files.some(
      (f) => f.name.endsWith(".lighting.json") || f.name.endsWith(".exr"),
    )
  ) {
    await loadLighting(files);
    return;
  }
  const f = files.find((f) => f.name.endsWith(".svgx"));
  if (f) {
    source.value = await f.text();
    $("filename").textContent = f.name;
    compile();
  }
});
async function loadLighting(files: File[]) {
  const generation = revision,
    text = files.find((f) => f.name.endsWith(".lighting.json"));
  if (!level?.atlas || !text) {
    $("status").textContent =
      "Drop the lighting manifest and all EXR pages and mips together after generating UVs.";
    return;
  }
  const created: THREE.DataTexture[] = [],
    receivers = level;
  try {
    const manifest = JSON.parse(await text.text());
    await validateLightingManifest(receivers, manifest);
    const read = async (entry: { file: string; sha256: string }) => {
      const file = files.find((f) => f.name === entry.file);
      if (!file) throw new Error(`Missing ${entry.file}`);
      const bytes = await file.arrayBuffer();
      if ((await sha256Bytes(bytes)) !== entry.sha256)
        throw new Error(`Checksum mismatch: ${entry.file}`);
      const parsed = new EXRLoader().parse(bytes);
      if (!parsed.data) throw new Error("Empty EXR image.");
      return { ...parsed, data: parsed.data };
    };
    for (const page of manifest.pages) {
      const parsed = await read(page),
        expected = receivers.atlas!.pages[page.id];
      if (parsed.width !== expected.width || parsed.height !== expected.height)
        throw new Error("Lightmap dimensions do not match the atlas.");
      const texture = new THREE.DataTexture(
        parsed.data,
        parsed.width,
        parsed.height,
        THREE.RGBAFormat,
        parsed.type,
      );
      created.push(texture);
      texture.mipmaps = [
        { data: parsed.data, width: parsed.width, height: parsed.height },
      ];
      for (let i = 0; i < page.mips.length; i++) {
        const mip = await read(page.mips[i]);
        if (
          mip.width !== Math.max(1, parsed.width >> (i + 1)) ||
          mip.height !== Math.max(1, parsed.height >> (i + 1)) ||
          mip.type !== parsed.type
        )
          throw new Error("Invalid lightmap mip dimensions or type.");
        texture.mipmaps.push({
          data: mip.data,
          width: mip.width,
          height: mip.height,
        });
      }
      // Three r186 allocates immutable storage with exactly these levels; the
      // incomplete tail is never sampled beyond the validated safe mip.
      texture.colorSpace = THREE.LinearSRGBColorSpace;
      texture.channel = 1;
      texture.flipY = false;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    }
    if (generation !== revision || level !== receivers)
      throw new Error("Map changed while loading lighting.");
    clearLighting();
    lightmaps = created;
    lightingRevision = lightingStateKey(receivers);
    lightingScale = manifest.irradianceScale;
    mode.value = "lighting";
    renderModel();
    $("status").textContent =
      "Baked skylight and bounce loaded; direct lights remain live.";
  } catch (error) {
    created.forEach((t) => t.dispose());
    if (generation !== revision || level !== receivers) return;
    $("status").textContent = (error as Error).message;
  }
}

mode.onchange = () => {
  if (mode.value === "lighting" && !lightmaps.length) {
    $("status").textContent =
      "Drop a matching .lighting.json and its EXR pages to load baked light.";
  }
  renderPlan();
  renderModel();
};
layers.onchange = () => {
  renderPlan();
  renderModel();
};
$("roofs").onchange = () => renderModel();
$("heights").onchange = () => renderPlan();
$("atlas-page").onchange = renderAtlas;
$("fit").onclick = () => {
  fitPlan();
  fitMap();
};
$("fit-plan").onclick = fitPlan;
$("fit-three").onclick = fitMap;
$("cut").oninput = () => {
  if (!level) return;
  const z = level.mesh.positions.filter((_, i) => i % 3 === 2),
    min = Math.min(...z),
    max = Math.max(...z) + 1;
  plane.constant =
    min + ((Number($<HTMLInputElement>("cut").value) + 1) / 2) * (max - min);
};
$("fly").onclick = () => {
  resetSpacePan();
  flyMode = !flyMode;
  fly.enabled = flyMode;
  orbit.enabled = !flyMode;
  $("fly").textContent = flyMode ? "Orbit" : "Free-fly";
  $("help").textContent = flyMode
    ? "WASD to move · R/F up/down · Drag to look"
    : "Drag to orbit · Right-drag or Space+drag to pan · Scroll to zoom";
};
window.addEventListener("beforeunload", () => {
  worker?.terminate();
  clearTimeout(debounce);
  resize.disconnect();
  renderer.setAnimationLoop(null);
  disposeModel();
  clearLighting();
  checker.dispose();
  orbit.dispose();
  fly.dispose();
  grid.geometry.dispose();
  (grid.material as THREE.Material).dispose();
  environment?.dispose();
  environmentGenerator.dispose();
  renderer.dispose();
});
const initialMap = new URLSearchParams(window.location.search).get("map");
source.value = initialMap === "dust2" ? dust2 : showcase;
$("filename").textContent =
  initialMap === "dust2" ? "dust2.level.svgx" : "showcase.level.svgx";
// Open the large reference map directly into geometry inspection. Atlas
// generation remains available explicitly through the existing checkbox.
if (initialMap === "dust2") uvs.checked = false;
compile();
