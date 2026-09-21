import "./styles.css";
import template from "./demo.level.svgx?raw";
import { LevelScene } from "./scene.ts";
import {
  normalizeCurve,
  readState,
  sourceForCurve,
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
const fullSource = () => sourceForCurve(template, state.curve);
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
}
function updateSource() {
  const value = normalizeCurve(state.curve),
    coordinate = value === 0 ? "0" : `-${value}`;
  range.value = String(value);
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
    const overlay = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    let d = "";
    for (let i = 0; i < nav.indices.length; i += 3) {
      for (let corner = 0; corner < 3; corner++) {
        const offset = nav.indices[i + corner] * 3;
        d += `${corner === 0 ? "M" : "L"}${nav.positions[offset]},${-nav.positions[offset + 1]} `;
      }
      d += "Z ";
    }
    overlay.setAttribute("d", d);
    overlay.setAttribute("fill", "#16816e");
    overlay.setAttribute("opacity", "0.55");
    overlay.setAttribute("pointer-events", "none");
    svg.append(overlay);
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
    'Make one edit <span aria-hidden="true">→</span>',
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
  const mustBuild = state.curve !== 3 || !ready;
  state.curve = 3;
  updateSource();
  applyStep(0);
  scene?.reset();
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
  scene?.reset();
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
    notify("Link copied, including your curve and chapter.");
  } catch {
    element("share-fallback").hidden = false;
    const input = element<HTMLInputElement>("share-url");
    input.value = url.href;
    input.focus();
    input.select();
  }
}
function noWebGL() {
  scene?.dispose();
  scene = undefined;
  element("webgl-fallback").hidden = false;
  element("loading").hidden = true;
  document.querySelector<HTMLElement>(".camera-tools")!.hidden = true;
  element("model-hint").textContent = "Use the adjacent floor plan";
  element("model").hidden = true;
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
