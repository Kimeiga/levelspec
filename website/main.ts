import "./styles.css";
import template from "./demo.level.svgx?raw";
import { LevelScene } from "./scene.ts";
import { NavigationSurface } from "./navigation.ts";
import {
  normalizeCurve,
  readState,
  sourceForState,
  normalizeHeight,
  writeState,
} from "./state.ts";
import type { DemoState } from "./state.ts";
import type { BuildReply } from "./worker.ts";
import type { CompiledLevel, ValidationReport } from "../src/vector/types.ts";
function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing interface element: ${id}`);
  return node as T;
}
const state: DemoState = readState(location.search);
const playground = element("playground");
const range = element<HTMLInputElement>("curve");
const steps = [...document.querySelectorAll<HTMLButtonElement>("[data-step]")];
const chapters = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
let scene: LevelScene | undefined;
let level: CompiledLevel | undefined;
let report: ValidationReport | undefined;
let plan = "",
  compiledSource = "",
  ready = false,
  compiledCurve = 3;
let worker: Worker | undefined,
  revision = 0;
let debounce: ReturnType<typeof setTimeout> | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let exporting = false,
  disposed = false;
const fullSource = () => sourceForState(template, state);
function notify(message: string) {
  clearTimeout(toastTimer);
  element("toast").textContent = message;
  element("toast").hidden = false;
  toastTimer = setTimeout(() => {
    element("toast").hidden = true;
  }, 4000);
}
function syncUrl() {
  try {
    history.replaceState(null, "", writeState(new URL(location.href), state));
  } catch {
    /* The controls remain usable in restricted embedded frames. */
  }
}
function setStatus(message: string, status: "busy" | "ready" | "error") {
  element("compile-status").textContent = message;
  element("status-dot").className =
    `status-dot ${status === "ready" ? "" : status}`;
  playground.dataset.status = status;
}
function updateExports() {
  const valid = ready && !exporting && compiledSource === fullSource();
  element<HTMLButtonElement>("download-glb").disabled = !valid;
  element<HTMLButtonElement>("download-gltf").disabled = !valid;
  element<HTMLButtonElement>("enter").disabled = !valid || !scene;
  element<HTMLButtonElement>("tour").disabled = !valid || !scene;
  element("export-warning").hidden = !report || ready;
}
function updateSource() {
  const presets = {
    clay: { height: 3, curve: 3 },
    chalk: { height: 5, curve: 6 },
    night: { height: 2, curve: 0 },
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-preset]",
  )) {
    const name = button.dataset.preset as DemoState["look"],
      preset = presets[name];
    button.setAttribute(
      "aria-pressed",
      String(
        name === state.look &&
          state.height === preset.height &&
          state.curve === preset.curve &&
          !state.blocked,
      ),
    );
  }

  const value = normalizeCurve(state.curve),
    coordinate = value === 0 ? "0" : `-${value}`;
  range.value = String(value);
  element<HTMLInputElement>("terrace-height").value = String(state.height);
  element("height-value").textContent = `${state.height} m`;
  element("height-code").textContent = `"${state.height}"`;
  element("block-route").hidden = state.blocked;
  element("repair-route").hidden = !state.blocked;
  element("low-terrace").setAttribute(
    "aria-pressed",
    String(state.height === 3),
  );
  element("raise-terrace").setAttribute(
    "aria-pressed",
    String(state.height === 5),
  );
  range.setAttribute(
    "aria-valuetext",
    value === 0 ? "Straight" : `Curve control offset ${value} metres`,
  );
  element("curve-value").textContent = String(value);
  const text = `"4 ${coordinate}; 10 ${coordinate}"`;
  element("code-before").textContent = text;
  element("code-after").textContent = text;
  element("original").setAttribute("aria-pressed", String(value === 3));
  element("deeper").setAttribute("aria-pressed", String(value === 6));
}
function drawPlan() {
  if (!plan || !level) return;
  // Compiler-generated SVG from a fixed fixture and bounded numeric inputs only.
  element("plan").innerHTML = plan;
  const svg = element("plan").querySelector("svg");
  if (!svg) return;
  svg.setAttribute("viewBox", "-1 -13 29 20");
  svg.setAttribute(
    "aria-label",
    `Courtyard floor plan. Curve control offset ${compiledCurve} metres. Ramp and stairs lead to the upper bridge.`,
  );
  const colors: Record<string, string> = {
    courtyard: "#d6ded1",
    ramp: "#e6c3aa",
    stairs: "#b6d0c4",
    bridge: "#cbd9c8",
  };
  for (const node of svg.querySelectorAll<SVGElement>(
    "path[data-object],polygon[data-object]",
  )) {
    const color = colors[node.dataset.object || ""];
    if (color && node.getAttribute("fill") !== "none")
      node.setAttribute("fill", color);
  }
  for (const node of svg.querySelectorAll<SVGElement>(
    '[data-object="courtyard.e0"]',
  )) {
    node.setAttribute("stroke", state.step === 2 ? "#61796b" : "#ba4027");
    node.setAttribute("stroke-width", "0.25");
  }
  const nav = report?.navigation ?? level.navigation;
  if (state.step === 2 && nav) {
    const surface = new NavigationSurface(nav, [2, 2, 0]);
    for (const connected of [true, false]) {
      const overlay = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      let d = "";
      surface.triangles.forEach((triangle, index) => {
        if (surface.reachable.has(index) !== connected) return;
        triangle.p.forEach((p, k) => {
          d += `${k ? "L" : "M"}${p[0]},${-p[1]} `;
        });
        d += "Z ";
      });
      overlay.setAttribute("d", d);
      overlay.setAttribute("fill", connected ? "#16816e" : "#b93f36");
      overlay.setAttribute("opacity", "0.65");
      overlay.setAttribute("pointer-events", "none");
      svg.append(overlay);
    }
  }
}
function updateValidation() {
  const nav =
      ready || report ? (report?.navigation ?? level?.navigation) : undefined,
    result = element("validation-result");
  result.textContent = ready
    ? "Passed"
    : report
      ? "Needs attention"
      : "Compiling…";
  result.className = ready ? "passed" : report ? "failed" : "";
  const total = level?.document.layers.reduce(
    (sum, layer) => sum + layer.regions.length,
    0,
  );
  element("regions-result").textContent =
    nav && total !== undefined
      ? `${nav.reachableRegions.length} / ${total}`
      : "—";
  element("coverage-result").textContent = nav
    ? String(nav.coverage.uncoveredCount)
    : "—";
  const route = nav?.routes.find((r) => r.id === "climb");
  element("route-result").textContent = route
    ? route.reachable
      ? "Reachable"
      : "Unreachable"
    : "Checking…";
  element("route-result").className = route
    ? route.reachable
      ? "passed"
      : "failed"
    : "";
  element("route-story").textContent =
    report && !ready
      ? "Both approaches are closed. The upper terrace is disconnected from the spawn. Restore access to make it reachable again."
      : "The terrace has two approaches. Close both and see what the validator catches.";
  const list = element("diagnostic-list");
  list.replaceChildren();
  for (const diagnostic of report?.diagnostics ?? []) {
    const li = document.createElement("li");
    li.textContent = `${diagnostic.code}: ${diagnostic.message}`;
    list.append(li);
  }
  if (report && !report.diagnostics.length) {
    const li = document.createElement("li");
    li.textContent = "No errors or warnings in this compiled example.";
    list.append(li);
  }
}
function applyStep(step: number, interactive = false) {
  const previous = state.step;
  state.step = Math.max(0, Math.min(3, Math.floor(step)));
  steps.forEach((button, index) => {
    if (index === state.step) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  chapters.forEach((chapter, index) => {
    chapter.hidden = index !== state.step;
  });
  element<HTMLButtonElement>("previous").disabled = state.step === 0;
  element("next").innerHTML = [
    'Reshape the space <span aria-hidden="true">→</span>',
    'Check the space <span aria-hidden="true">→</span>',
    'Take it with you <span aria-hidden="true">→</span>',
    'Start again <span aria-hidden="true">↺</span>',
  ][state.step];
  element("view-mode").textContent =
    state.step === 2 ? "Navigation overlay" : "3D geometry";
  element("plan-key-label").textContent =
    state.step === 2 ? "Computed navigation" : "The edge you can change";
  element("plan-key-swatch").classList.toggle("navigation", state.step === 2);
  scene?.setNavigation(state.step === 2);
  if (scene && !scene.isWalking())
    scene.view(state.step === 0 ? "courtyard" : "overview");
  drawPlan();
  // First advance performs the promised edit. Other chapters preserve the input.
  if (interactive && previous === 0 && state.step === 1 && state.curve === 3)
    changeCurve(6);
  syncUrl();
}
function fail(message: string) {
  clearTimeout(timeout);
  ready = false;
  report = undefined;
  worker?.terminate();
  worker = undefined;
  element("loading").hidden = true;
  element("retry").hidden = false;
  setStatus(
    level
      ? "Update failed. Showing the previous geometry."
      : "The compiler could not start.",
    "error",
  );
  element("compile-status").title = message;
  element("validation-result").textContent = "Unavailable";
  element("validation-result").className = "failed";
  element("regions-result").textContent = "—";
  element("coverage-result").textContent = "—";
  updateExports();
  notify(message);
}
function requestBuild(delay = 0) {
  clearTimeout(debounce);
  clearTimeout(timeout);
  worker?.terminate();
  worker = undefined;
  revision += 1;
  ready = false;
  report = undefined;
  scene?.setBusy(true);
  element("retry").hidden = true;
  element("compile-status").title = "";
  setStatus(
    level ? "Updating geometry and navigation…" : "Starting the compiler…",
    "busy",
  );
  updateValidation();
  updateExports();
  const id = revision;
  debounce = setTimeout(() => {
    const source = fullSource();
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      timeout = setTimeout(() => {
        if (id === revision)
          fail("Compilation took too long. Use Retry to try again.");
      }, 25000);
      worker.onerror = () => {
        if (id === revision)
          fail("The compiler could not load. Reconnect and retry.");
      };
      worker.onmessage = (event: MessageEvent<BuildReply>) => {
        const reply = event.data;
        if (disposed || reply.id !== revision) return;
        if (reply.type === "progress") {
          element("compile-status").textContent = reply.stage;
          return;
        }
        if (reply.type === "error") {
          fail(reply.message);
          return;
        }
        clearTimeout(timeout);
        level = reply.level;
        report = reply.report;
        if (report.navigation) level.navigation = report.navigation;
        ready =
          report.passed &&
          !report.diagnostics.some(
            (diagnostic) => diagnostic.severity === "error",
          );
        compiledSource = source;
        compiledCurve = state.curve;
        plan = reply.plan;
        playground.dataset.curve = String(state.curve);
        playground.dataset.geometryHash = level.geometryHash;
        playground.dataset.revision = String(id);
        playground.dataset.height = String(state.height);
        playground.dataset.blocked = String(state.blocked);
        scene?.setBusy(false);
        scene?.setLevel(level);
        scene?.setNavigation(state.step === 2);
        drawPlan();
        element("loading").hidden = true;
        const errors = report.diagnostics.filter(
          (d) => d.severity === "error",
        ).length;
        const warnings = report.diagnostics.filter(
          (d) => d.severity === "warning",
        ).length;
        setStatus(
          ready
            ? `Compiled locally · ${errors} errors${warnings ? ` · ${warnings} warnings` : ""}`
            : "Validation needs attention. Export is disabled.",
          ready ? "ready" : "error",
        );
        element("mesh-summary").textContent =
          `${(level.mesh.indices.length / 3).toLocaleString()} triangles · ${level.document.layers.reduce((sum, layer) => sum + layer.regions.length, 0)} regions`;
        element("scene-description").textContent =
          `Curve control offset: ${state.curve} metres. Both views show the same compiled source. ${ready ? "This example passed validation." : "Validation did not pass."}`;
        updateValidation();
        updateExports();
        worker?.terminate();
        worker = undefined;
      };
      worker.postMessage({ id, source });
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Unable to create the compiler worker.",
      );
    }
  }, delay);
}
function changeCurve(value: number) {
  const normalized = normalizeCurve(value);
  if (normalized === state.curve && ready) {
    updateSource();
    return;
  }
  state.curve = normalized;
  updateSource();
  syncUrl();
  requestBuild(120);
}
function reset() {
  const mustBuild =
    state.curve !== 3 ||
    state.height !== 3 ||
    state.blocked ||
    state.look !== "clay" ||
    !ready;
  state.curve = 3;
  state.height = 3;
  state.blocked = false;
  state.look = "clay";
  updateSource();
  applyStep(0);
  scene?.view("courtyard");
  if (mustBuild) requestBuild();
}
function presentation(value: boolean) {
  state.present = value;
  document.body.classList.toggle("present", value);
  element("exit-present").hidden = !value;
  element("present").innerHTML = value
    ? 'Exit <span aria-hidden="true">×</span>'
    : 'Present <span aria-hidden="true">⤢</span>';
  element("present").setAttribute("aria-pressed", String(value));
  syncUrl();
  window.scrollTo({ top: 0, behavior: "instant" });
  scene?.view(state.step === 0 ? "courtyard" : "overview");
}
function save(bytes: Uint8Array | string, name: string, mime: string) {
  const data = typeof bytes === "string" ? bytes : new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function exportModel(format: "glb" | "gltf") {
  if (!ready || !level || compiledSource !== fullSource() || exporting) return;
  const exportingLevel = level,
    source = compiledSource,
    version = revision;
  exporting = true;
  updateExports();
  try {
    const exporter = await import("../src/vector/export.ts");
    if (!ready || version !== revision)
      throw new Error(
        "The shape changed. Wait for compilation, then download again.",
      );
    if (format === "glb") {
      save(
        exporter.toGLB(exportingLevel),
        "levelspec-courtyard.glb",
        "model/gltf-binary",
      );
    } else {
      const [{ zipSync, strToU8 }, { exportMetadata }] = await Promise.all([
        import("fflate"),
        import("../src/vector/export-assets.ts"),
      ]);
      if (!ready || version !== revision)
        throw new Error(
          "The shape changed. Wait for compilation, then download again.",
        );
      const files = exporter.toGLTF(exportingLevel);
      files["source.level.svgx"] = source;
      files["showcase.levelspec.json"] = JSON.stringify(
        exportMetadata(exportingLevel, ["gltf"]),
        null,
        2,
      );
      const zip = zipSync(
        Object.fromEntries(
          Object.entries(files).map(([name, value]) => [
            name,
            typeof value === "string" ? strToU8(value) : value,
          ]),
        ),
      );
      save(zip, "levelspec-courtyard-gltf.zip", "application/zip");
    }
    notify(
      format === "glb"
        ? "Your GLB model is ready."
        : "Your glTF, metadata, and editable source are ready.",
    );
  } catch (error) {
    notify(
      error instanceof Error ? error.message : "Export failed. Try again.",
    );
  } finally {
    exporting = false;
    updateExports();
  }
}
async function share() {
  const url = writeState(new URL(location.href), { ...state, present: false });
  url.hash = "playground";
  try {
    await navigator.clipboard.writeText(url.href);
    notify(
      "Link copied, including the shape, material, access state, and chapter.",
    );
  } catch {
    element("share-fallback").hidden = false;
    const input = element<HTMLInputElement>("share-url");
    input.value = url.href;
    input.focus();
    input.select();
  }
}
function noWebGL() {
  updateMode("overview");
  scene?.dispose();
  scene = undefined;
  element("webgl-fallback").hidden = false;
  element("webgl-fallback").classList.add("inline-fallback");
  document.querySelector(".visual-panel")!.append(element("webgl-fallback"));
  element("loading").hidden = true;
  document.querySelector<HTMLElement>(".camera-tools")!.hidden = true;
  element("model-hint").textContent = "Use the floor plan";
  element("model").hidden = true;
  setPreview("plan");
  updateExports();
}
async function prepareOffline() {
  if (import.meta.env.DEV) {
    element("offline-status").textContent = "Local development";
    return;
  }
  if (!("serviceWorker" in navigator)) {
    element("offline-status").textContent = "Keep this tab open for the demo";
    return;
  }
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
    await navigator.serviceWorker.ready;
    if (!disposed)
      element("offline-status").textContent = "Ready offline on this device";
  } catch {
    element("offline-status").textContent = "Keep this tab open for the demo";
  }
}
steps.forEach((button) => {
  button.onclick = () => applyStep(Number(button.dataset.step), true);
});
element("next").onclick = () => {
  if (state.step === 3) reset();
  else applyStep(state.step + 1, true);
};
element("previous").onclick = () => applyStep(state.step - 1);
range.oninput = () => changeCurve(Number(range.value));
element("original").onclick = () => changeCurve(3);
element("deeper").onclick = () => changeCurve(6);
element("reset").onclick = reset;
element("retry").onclick = () => requestBuild();
element("present").onclick = () => presentation(!state.present);
element("exit-present").onclick = () => presentation(false);
element("try-demo").onclick = () => applyStep(0);
element("reset-camera").onclick = () => scene?.reset();
element("zoom-in").onclick = () => scene?.zoom(1.2);
element("zoom-out").onclick = () => scene?.zoom(1 / 1.2);
element("download-glb").onclick = () => {
  void exportModel("glb");
};
element("download-gltf").onclick = () => {
  void exportModel("gltf");
};
element("download-source").onclick = () =>
  save(fullSource(), "courtyard.level.svgx", "application/xml");
element("share").onclick = () => {
  void share();
};
element("close-share").onclick = () => {
  element("share-fallback").hidden = true;
  element("share").focus();
};
window.addEventListener("keydown", (event) => {
  if (
    !state.present ||
    (event.target instanceof Element &&
      event.target.closest("input,textarea,select,[contenteditable]"))
  )
    return;
  if (event.key === "Escape") {
    event.preventDefault();
    presentation(false);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    applyStep(Math.min(3, state.step + 1), true);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    applyStep(Math.max(0, state.step - 1));
  }
  if (/^[1-4]$/.test(event.key)) {
    event.preventDefault();
    applyStep(Number(event.key) - 1, true);
  }
});
window.addEventListener("beforeunload", () => {
  disposed = true;
  clearTimeout(timeout);
  clearTimeout(debounce);
  clearTimeout(toastTimer);
  worker?.terminate();
  scene?.dispose();
});
try {
  scene = new LevelScene(element("model"), noWebGL);
} catch {
  noWebGL();
}
updateSource();
applyStep(state.step);
if (state.present) presentation(true);
requestBuild();
void prepareOffline();

function changeHeight(value: number) {
  const height = normalizeHeight(value);
  if (height === state.height && ready) return;
  state.height = height;
  updateSource();
  syncUrl();
  requestBuild(120);
}
function setBlocked(blocked: boolean) {
  state.blocked = blocked;
  updateSource();
  syncUrl();
  requestBuild();
}
function setPreview(view: "space" | "plan") {
  if (view === "plan" && scene?.isWalking()) scene.exitWalk();
  document.querySelector<HTMLElement>(".visual-panel")!.dataset.view = view;
  element("show-space").setAttribute("aria-pressed", String(view === "space"));
  element("show-plan").setAttribute("aria-pressed", String(view === "plan"));
}
function updateMode(mode: string) {
  const walk = mode === "walk";
  document.body.classList.toggle("walking", walk);
  document.querySelector<HTMLElement>(".walk-hud")!.hidden = !walk;
  element("view-mode").textContent =
    mode === "courtyard"
      ? "Courtyard · eye level"
      : mode === "terrace"
        ? "Upper terrace · eye level"
        : mode === "walk"
          ? "Inside the level"
          : "Architectural overview";
  element("model-hint").textContent = walk
    ? "WASD / buttons to move · Drag to look · Esc to leave"
    : "Drag to orbit · Choose a viewpoint";
  for (const [id, value] of [
    ["view-courtyard", "courtyard"],
    ["view-terrace", "terrace"],
    ["reset-camera", "overview"],
  ])
    element(id).setAttribute("aria-pressed", String(mode === value));
}
element("model").addEventListener("scene-mode", (event) =>
  updateMode((event as CustomEvent<string>).detail),
);
element("model").addEventListener("tour-change", (event) => {
  const playing = (event as CustomEvent<boolean>).detail;
  element("tour").textContent = playing
    ? "Stop tour ■"
    : "Take a 12-second tour ▶";
  element("tour").setAttribute("aria-pressed", String(playing));
});
element<HTMLInputElement>("terrace-height").oninput = (event) =>
  changeHeight(Number((event.target as HTMLInputElement).value));
element("raise-terrace").onclick = () => changeHeight(5);
element("low-terrace").onclick = () => changeHeight(3);
element("block-route").onclick = () => setBlocked(true);
element("repair-route").onclick = () => setBlocked(false);
element("enter").onclick = () => {
  setPreview("space");
  if (scene?.enterWalk()) window.scrollTo({ top: 0, behavior: "instant" });
};
element("exit-walk").onclick = () => scene?.exitWalk();
element("view-courtyard").onclick = () => scene?.view("courtyard");
element("view-terrace").onclick = () => scene?.view("terrace");
element("tour").onclick = () => scene?.tour();
element("show-plan").onclick = () => setPreview("plan");
element("show-space").onclick = () => setPreview("space");
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-move]",
)) {
  const values: Record<string, [number, number]> = {
    forward: [1, 0],
    back: [-1, 0],
    left: [0, -1],
    right: [0, 1],
  };
  const [f, s] = values[button.dataset.move!];
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    scene?.moveInput(f, s);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(type, () => scene?.moveInput(0, 0));
  button.onkeydown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      scene?.moveInput(f, s);
    }
  };
  button.onkeyup = () => scene?.moveInput(0, 0);
  button.onblur = () => scene?.moveInput(0, 0);
}
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-preset]",
))
  button.onclick = () => {
    const look = button.dataset.preset as DemoState["look"];
    Object.assign(state, {
      look,
      curve: look === "chalk" ? 6 : look === "night" ? 0 : 3,
      height: look === "chalk" ? 5 : look === "night" ? 2 : 3,
      blocked: false,
    });
    document
      .querySelectorAll("[data-preset]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    updateSource();
    applyStep(0);
    setPreview("space");
    requestBuild();
    element("playground").scrollIntoView({
      behavior: "instant",
      block: "start",
    });
  };
