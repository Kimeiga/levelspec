import { DEFAULT_APPEARANCE } from "./view.ts";
import { appendTerrainPlan } from "./terrain.ts";
import "./style.css";
import { renderArchitectureInspection } from "./architecture.ts";
import { parseWalkPose, walkURL, WALK_PARAMETERS, type WalkPose, type WalkStartResult } from "./walk.ts";
import { diagnosticPanel } from "./diagnostics.ts";
import { suggestionPanel } from "./suggestions.ts";
import * as THREE from "three";
import { toSVGPlan } from "../src/vector/export.ts";
import { navigationIndices } from "./navigation.ts";
import { parseNavigationCell } from "./navigation-cell.ts";
import { ReviewScene, type ReviewOptions } from "./scene.ts";
import type { CompiledLevel, ValidationReport, ReviewFinding } from "../src/vector/types.ts";
import { FRAME_ASPECT_MIN, FRAME_ASPECT_MAX, parseAppearance, parseFrameAspect, parseViewOptions, viewURL, type ReviewViewOptions, type ReviewViewState, type ViewState } from "./view.ts";

interface ReviewerConfig {
  source: string;
  deferLoad?: boolean;
  local: boolean;
  worker: () => Worker;
  assets?: Record<string, string>;
}
/** Mounts the shared read-only reviewer. File access belongs to the local adapter. */
export function mountReviewer(config: ReviewerConfig) {
  document.body.innerHTML = `
    <header><a class="brand" href="./">LevelSpec</a><span id="title">Layout review</span><span id="summary"></span><nav aria-label="Project"><span id="offline"></span>${config.local ? '<button id="open">Open layout</button><button id="companions">Companion assets</button><input id="file" type="file" accept=".aml,.xml" hidden><input id="assets" type="file" multiple accept=".glb,.png,.jpg,.jpeg,.webp" hidden>' : '<a href="https://github.com/Kimeiga/levelspec">GitHub ↗</a>'}</nav></header>
    <main>
    <section class="reviewer" aria-label="Layout reviewer" data-view="3d" aria-busy="true">
      <div class="toolbar"><div class="tabs" role="group" aria-label="Review view"><button id="view-2d" aria-pressed="false">01 / 2D plan</button><button id="view-3d" aria-pressed="true">02 / 3D space</button></div><div class="tools"><label>Floor <select id="floor"><option value="">All floors</option></select></label><button id="fit">Fit view</button><button id="walk" disabled>Walk inside ↗</button><button id="exit-walk" hidden>Exit walk · Esc</button></div></div>
      <div class="workspace"><div class="viewport"><div id="model" data-mode="overview"></div><div id="plan" hidden tabindex="0" aria-label="2D floor plan. Drag to pan, scroll to zoom, click to select."></div><p id="fallback" hidden>3D is unavailable. The 2D plan and validation remain available.</p><div class="view-label" id="view-label">ORTHOGRAPHIC / Z-UP METERS</div><p id="viewport-dimensions" aria-label="Geometry dimensions"></p><div class="compass" aria-label="3D camera presets"><button data-preset="iso">¾</button><button data-preset="top">Top</button><button data-preset="front">Front</button><button data-preset="side">Side</button><button id="turn" aria-label="Turn ninety degrees">↻ 90°</button></div><div id="walk-pad" hidden><button data-move="w" aria-label="Walk forward">↑</button><button data-move="a" aria-label="Walk left">←</button><button data-move="s" aria-label="Walk backward">↓</button><button data-move="d" aria-label="Walk right">→</button></div></div>
      <aside aria-label="Review layers"><p class="eyebrow">REVIEW LAYERS</p><label>Projection <select id="projection"><option value="orthographic">Orthographic</option><option value="perspective">Perspective</option></select></label><details id="camera-controls"><summary>Camera / Z-up meters</summary><form id="camera-form"><label>Position XYZ <input id="camera-position" type="text" required></label><label>Target XYZ <input id="camera-target" type="text" required></label><label>Vertical FOV (degrees) <input id="camera-fov" type="number" min="0.01" max="149.99" step="any" value="55" required></label><label>Orthographic view height (m) <input id="camera-height" type="number" min="0.000001" step="any" value="40" required></label><label>Roll (degrees) <input id="camera-roll" type="number" step="any" value="0" required></label><button type="submit">Apply camera</button><p id="camera-error" role="status"></p></form><p id="view-description"></p><a id="view-link">Open this view ↗</a></details><details id="walk-controls"><summary>Walk from coordinates</summary><form id="walk-form" novalidate><label>Feet XYZ (Z-up meters) <input id="walk-feet" type="text" value="0 0 0" required></label><label>Yaw degrees (+X=0, +Y=90) <input id="walk-yaw" type="number" step="any" value="0" required></label><label>Pitch degrees (−80 to 80) <input id="walk-pitch" type="number" step="any" min="-80" max="80" value="0" required></label><button id="walk-start" type="submit" disabled>Start inspection walk</button></form><p id="walk-error" role="status"></p><p id="walk-description">Uses existing land navigation with physical step support and standing-body collision checks. Nearby supported feet resolve within 0.10m.</p><a id="walk-link">Open this walking pose ↗</a></details><label>Appearance <select id="appearance"><option value="flat">Flat</option><option value="illustrated">Illustrated</option><option value="materials">Authored materials</option><option value="inspection">Neutral inspection</option></select></label><details id="frame-controls"><summary>Image frame</summary><label>Frame <select id="frame-mode"><option value="viewport">Viewport</option><option value="0.75">Portrait 3:4</option><option value="1">Square</option><option value="1.3333333333333333">Landscape 4:3</option><option value="custom">Custom</option></select></label><form id="frame-form" novalidate><label>Width / height <input id="frame-aspect" type="number" min="0.1" max="10" step="any" placeholder="Responsive viewport"></label><button type="submit">Apply frame</button></form><button id="frame-reference" disabled>Use selected reference ratio</button><p id="frame-description"></p><p id="frame-error" role="status"></p></details><label class="check"><input id="roofs" type="checkbox"> Show roofs</label><label>Section height <input id="cut" type="range" min="0" max="1" step="0.01" value="1"></label><label>Navigation <select id="navigation"><option value="">Off</option><option value="land">Land</option><option value="water">Boat</option></select></label><details id="navigation-grid"><summary>Walking grid</summary><form id="nav-cell-form" novalidate><label>Horizontal cell size (m) <input id="nav-cell" type="number" min="0.025" max="0.5" step="any" value="0.0625" required></label><button type="submit">Rebuild navigation</button></form><p>Smaller cells can resolve narrow passages. Player dimensions stay unchanged.</p><p id="nav-cell-status" role="status"></p><p id="nav-cell-error" role="status"></p></details><label class="check"><input id="issues" type="checkbox"> Spatial issues</label><label class="check"><input id="dimensions" type="checkbox" checked> Dimensions</label><details id="references"><summary>References</summary><select id="reference" aria-label="Reference image"><option value="">No reference</option></select><p id="reference-note"></p><img id="reference-image" alt="Architectural reference" hidden></details><hr><p class="eyebrow">SELECTION</p><p id="selection">Select a floor or wall in either view.</p><details id="architecture-inspection" hidden open></details><p id="dimensions-value"></p><p id="navigation-summary"></p><details id="suggestion-panel" open><summary>Suggestions</summary><div id="suggestions"></div></details><details id="validation"><summary>Validation <span id="issue-count"></span></summary><p id="validation-mode"></p><div id="diagnostics"></div></details></aside></div>
      <footer><span id="status" role="status" aria-live="polite">Loading layout…</span><button id="cancel">Cancel loading</button><button id="retry" hidden>Retry loading</button><span id="help">Drag to rotate horizontally · Right drag to pan · Scroll to zoom</span></footer>
    </section></main>`;
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const options: ReviewOptions = {
    layer: "",
    roofs: false,
    cut: 1,
    appearance: DEFAULT_APPEARANCE,
    movement: "",
    selected: "",
    issues: false,
  };
  let scene: ReviewScene | undefined;
  let previousInspection: { camera?: ViewState; layer: string; selected: string; cut: number; roofs: boolean; movement: ReviewOptions["movement"]; plan?: number[] } | undefined;
  const inspectionActions = {
    inspect(suggestion: ReviewFinding, frame: boolean) {
      if (!level) return;
      previousInspection ??= { camera: scene?.getView(), layer: options.layer, selected: options.selected, cut: options.cut, roofs: options.roofs, movement: options.movement, plan: planBox?.slice() };
      scene?.exitWalk();
      options.suggestion = suggestion;
      if (suggestion.navigation || suggestion.code === "FLIGHT_NAV_MISSING") options.movement = "land";
      get<HTMLSelectElement>("navigation").value = options.movement;
      options.selected = "";
      options.layer = suggestion.layers.length === 1 ? suggestion.layers[0] : "";
      get<HTMLSelectElement>("floor").value = options.layer;
      get("selection").textContent = suggestion.objects.join(" · ");
      if (frame) {
        const { min, max } = suggestion.bounds;
        const span = Math.max(1.5, Math.hypot(...max.map((v, i) => v - min[i])) * 1.6);
        const direction = new THREE.Vector3(...suggestion.direction).add(new THREE.Vector3(-suggestion.direction[1] * 0.4, suggestion.direction[0] * 0.4, 0.9)).normalize();
        const position = new THREE.Vector3(...suggestion.position).addScaledVector(direction, span * 2);
        scene?.setView({ position: position.toArray(), target: suggestion.position, viewHeight: span });
        const pad = Math.max(0.5, span * 0.2);
        planBox = [min[0]-pad, -max[1]-pad, Math.max(1,max[0]-min[0])+2*pad, Math.max(1,max[1]-min[1])+2*pad];
      }
      redraw();
    },
    restore() {
      const url = new URL(location.href);
      url.searchParams.delete("diagnostic");
      url.searchParams.delete("suggestion");
      history.replaceState(null,"",url);
      options.suggestion = undefined;
      if (previousInspection) {
        options.layer = previousInspection.layer;
        options.selected = previousInspection.selected;
        options.cut = previousInspection.cut;
        options.roofs = previousInspection.roofs;
        options.movement = previousInspection.movement;
        planBox = previousInspection.plan;
        if (previousInspection.camera) scene?.setView(previousInspection.camera);
        previousInspection = undefined;
      }
      get<HTMLSelectElement>("floor").value = options.layer;
      get<HTMLSelectElement>("navigation").value = options.movement;
      get<HTMLInputElement>("cut").value = String(options.cut);
      get<HTMLInputElement>("roofs").checked = options.roofs;
      get("selection").textContent = options.selected || "Select a floor or wall in either view.";
      redraw();
    },
    cutaway(suggestion: ReviewFinding) {
      if (!level) return;
      const values = level.mesh.positions.filter((_, i) => i % 3 === 2);
      const bottom = Math.min(...values)-0.1, top = Math.max(...values)+0.1;
      options.cut = THREE.MathUtils.clamp((suggestion.bounds.max[2]+0.2-bottom)/(top-bottom),0,1);
      options.roofs = false;
      get<HTMLInputElement>("cut").value = String(options.cut);
      get<HTMLInputElement>("roofs").checked = false;
      redraw();
    },
  };
  const suggestions = suggestionPanel(get("suggestions"), inspectionActions);
  const spatialDiagnostics = diagnosticPanel(get("diagnostics"), inspectionActions);
  let navigationCell: number | undefined;
  let navigationConfigurationError: string | undefined;
  try {
    navigationCell = parseNavigationCell(new URL(location.href).searchParams.get("nav-cell"));
    get<HTMLInputElement>("nav-cell").value = String(navigationCell ?? 0.0625);
  } catch (error) {
    navigationConfigurationError = (error as Error).message;
    get("nav-cell-error").textContent = navigationConfigurationError;
    get<HTMLDetailsElement>("navigation-grid").open = true;
  }
  let initialView: ReviewViewOptions = {};
  let viewApplied = false;
  let initialWalk: WalkPose | undefined;
  let walkApplied = false;
  try { initialWalk = parseWalkPose(new URL(location.href).searchParams); }
  catch (error) {
    get("walk-error").textContent = (error as Error).message;
    get<HTMLDetailsElement>("walk-controls").open = true;
  }
  let frameAspectLock: number | undefined;
  let lastFrameAspect = 1;
  try {
    initialView = parseViewOptions(new URL(location.href).searchParams);
    options.appearance = initialView.appearance ?? DEFAULT_APPEARANCE;
    frameAspectLock = initialView.frameAspect;
    get<HTMLSelectElement>("appearance").value = options.appearance;
  } catch (error) {
    get("camera-error").textContent = (error as Error).message;
  }
  const viewport = get("model").parentElement!;
  const frameObserver = new ResizeObserver(() => layoutFrame());
  frameObserver.observe(viewport);
  layoutFrame();
  updateFrameControls();

  /** Contains a locked image; boundary-crossing CSS rounding moves its long axis inward to a whole pixel. */
  function layoutFrame() {
    if (frameAspectLock === undefined) return;
    const { width, height } = viewport.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    let frameWidth = Math.min(width, height * frameAspectLock);
    let frameHeight = frameWidth / frameAspectLock;
    const model = get("model");
    Object.assign(model.style, { width: frameWidth + "px", height: frameHeight + "px", right: "auto", bottom: "auto" });
    const measured = model.getBoundingClientRect();
    if (measured.width > 0 && measured.height > 0) {
      frameWidth = measured.width;
      frameHeight = measured.height;
      const aspect = frameWidth / frameHeight;
      if (aspect < FRAME_ASPECT_MIN) {
        const inwardHeight = Math.floor(frameWidth / FRAME_ASPECT_MIN);
        if (inwardHeight > 0) frameHeight = inwardHeight;
      } else if (aspect > FRAME_ASPECT_MAX) {
        const inwardWidth = Math.floor(frameHeight * FRAME_ASPECT_MAX);
        if (inwardWidth > 0) frameWidth = inwardWidth;
      }
    }
    Object.assign(model.style, {
      width: frameWidth + "px", height: frameHeight + "px",
      left: (width - frameWidth) / 2 + "px", top: (height - frameHeight) / 2 + "px",
    });
  }
  /** Reflects the preferred lock separately from the measured current image aspect. */
  function updateFrameControls() {
    const value = frameAspectLock === undefined ? "viewport" : String(frameAspectLock);
    get<HTMLSelectElement>("frame-mode").value = ["viewport", "0.75", "1", "1.3333333333333333"].includes(value) ? value : "custom";
    const input = get<HTMLInputElement>("frame-aspect");
    if (document.activeElement !== input) input.value = frameAspectLock === undefined ? "" : String(frameAspectLock);
    get("frame-description").textContent = frameAspectLock === undefined ? "Follows viewport. Exact view links lock its measured aspect." : `Locked ${frameAspectLock} width / height.`;
  }
  /** Commits a validated lock or releases it, preserving camera state and unrelated URL context. */
  function applyFrameAspect(ratio: number | undefined) {
    frameAspectLock = ratio;
    if (ratio === undefined) {
      for (const name of ["width", "height", "left", "top", "right", "bottom"]) get("model").style.removeProperty(name);
    }
    layoutFrame();
    updateFrameControls();
    get("frame-error").textContent = "";
    const url = new URL(location.href);
    if (ratio === undefined) url.searchParams.delete("frame-aspect");
    else url.searchParams.set("frame-aspect", String(ratio));
    history.replaceState(null, "", url);
    scene?.invalidate();
  }

  let level: CompiledLevel | undefined, report: ValidationReport | undefined;
  let source = config.source,
    worker: Worker | undefined,
    revision = 0,
    view = "3d";
  let currentDocument = "";
  let files: Record<string, Uint8Array> = {};
  let imageURLs: Record<string, string> = { ...config.assets };
  const objectURLs: string[] = [];
  let planBox: number[] | undefined;
  let ready = false;
  let timeout: ReturnType<typeof setTimeout>;

  /** Publishes explicitly supplied image companions; URLs live until replacement or page disposal. */
  function updateImages() {
    for (const url of objectURLs) URL.revokeObjectURL(url);
    objectURLs.length = 0;
    imageURLs = { ...config.assets };
    for (const [name, bytes] of Object.entries(files)) {
      if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;
      const type = /\.png$/i.test(name)
        ? "image/png"
        : /\.webp$/i.test(name)
          ? "image/webp"
          : "image/jpeg";
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type }),
      );
      objectURLs.push(url);
      imageURLs[name] = url;
    }
  }
  /** Shows reference evidence without editing the source or fetching arbitrary paths. */
  function updateReference() {
    const reference = level?.document.references?.find(
      (r) => r.id === get<HTMLSelectElement>("reference").value,
    );
    get<HTMLButtonElement>("frame-reference").disabled = !reference;
    const image = get<HTMLImageElement>("reference-image");
    const url =
      reference &&
      (imageURLs[reference.image] ??
        imageURLs[reference.image.split("/").at(-1)!]);
    image.hidden = !url;
    if (url) image.src = url;
    else image.removeAttribute("src");
    get("reference-note").textContent = reference
      ? url
        ? reference.scaleNote
        : `Supply companion image: ${reference.image}`
      : "Choose a declared reference to compare.";
  }
  get("reference").onchange = updateReference;
  get("model").addEventListener("asset-error", (event) => {
    get("status").textContent =
      `Unable to decode companion image: ${(event as CustomEvent<string>).detail}`;
  });
  /** Cancels in-flight work and discards its worker-owned native and tile-cache state. */
  function stopWorker() {
    worker?.terminate();
    worker = undefined;
  }
  /** Announces loading failures while explicitly retaining stale geometry. */
  function fail(message: string) {
    ready = false;
    suggestions.setEnabled(false);
    spatialDiagnostics.setEnabled(false);
    stopWorker();
    clearTimeout(timeout);
    scene?.exitWalk();
    get<HTMLButtonElement>("walk").disabled = true;
    get<HTMLButtonElement>("walk-start").disabled = true;
    get("status").textContent =
      `${level ? "Previous preview is stale. " : ""}${message}`;
    get("status").dataset.state = "error";
    get("nav-cell-status").textContent = "Navigation is unavailable for the current source/settings. Retry after resolving the loading error.";
    get("retry").hidden = false;
    get("cancel").hidden = true;
    get("model").dataset.stale = String(Boolean(level));
    get("plan").dataset.stale = String(Boolean(level));
    document.querySelector(".reviewer")!.setAttribute("aria-busy", "false");
  }
  /** Labels the visible plan or active render camera while preserving the saved overview pose. */
  function updateViewLabel() {
    let label: string;
    if (view === "2d") {
      label = "PLAN / METERS";
    } else if (scene?.getWalk().active) {
      label = "FIRST PERSON / PERSPECTIVE / Z-UP METERS";
    } else {
      const projection = scene?.getView().projection ?? "orthographic";
      label = `${projection.toUpperCase()} / Z-UP METERS`;
    }
    get("view-label").textContent = label;
  }
  /** Combines actual camera state with reviewer-owned appearance for exact view replay. */
  function currentView(camera: ViewState): ReviewViewState {
    const { width, height } = get("model").getBoundingClientRect();
    if (width > 0 && height > 0) lastFrameAspect = width / height;
    return { ...camera, appearance: options.appearance, frameAspect: lastFrameAspect, frameAspectLock };
  }
  /** Publishes the actual overview pose without overwriting a camera field being edited. */
  function updateCamera(state: ViewState) {
    get<HTMLSelectElement>("projection").value = state.projection;
    const fields = {
      "camera-position": state.position.map(n => Number(n.toFixed(6))).join(" "),
      "camera-target": state.target.map(n => Number(n.toFixed(6))).join(" "),
      "camera-fov": String(state.fov),
      "camera-height": String(state.viewHeight),
      "camera-roll": String(state.roll),
    };
    for (const [id, value] of Object.entries(fields)) {
      const input = get<HTMLInputElement>(id);
      if (document.activeElement !== input) input.value = value;
    }
    get("view-description").textContent = `${state.projection} / position ${fields["camera-position"]} / target ${fields["camera-target"]} / roll ${state.roll}°`;
    const presentation = currentView(state);
    get("model").dataset.view = JSON.stringify(presentation);
    const link = get<HTMLAnchorElement>("view-link");
    try {
      const overviewURL = new URL(location.href);
      for (const key of WALK_PARAMETERS) overviewURL.searchParams.delete(key);
      link.href = viewURL(overviewURL.href, presentation);
      link.textContent = "Open this view ↗";
      link.removeAttribute("aria-disabled");
      link.removeAttribute("title");
    } catch (error) {
      link.removeAttribute("href");
      link.textContent = "Frame replay unavailable";
      link.setAttribute("aria-disabled", "true");
      link.title = (error as Error).message;
    }
    updateViewLabel();
  }
  get("model").addEventListener("review-view-change", event => updateCamera((event as CustomEvent<ViewState>).detail));
  /** Keeps one viewport visible, preserving each view's camera and selection. */
  function setView(next: string, keepWalk = false) {
    view = next;
    if (!keepWalk) scene?.exitWalk();
    get("model").hidden = next !== "3d";
    get("plan").hidden = next !== "2d";
    layoutFrame();
    scene?.setVisible(next === "3d");
    document.querySelector<HTMLElement>(".reviewer")!.dataset.view = next;
    get("view-2d").setAttribute("aria-pressed", String(next === "2d"));
    get("view-3d").setAttribute("aria-pressed", String(next === "3d"));
    updateViewLabel();
    get("help").textContent =
      next === "2d"
        ? "Drag to pan · Scroll to zoom · Click to select"
        : "Drag to rotate horizontally · Right drag to pan · Scroll to zoom";
  }
  /** Reflects geometry selection without exposing XML or editing controls. */
  function select(id: string) {
    options.selected = id;
    get("selection").textContent =
      id || "Select a floor or wall in either view.";
    redraw();
  }
  try {
    scene = new ReviewScene(
      get("model"),
      select,
      (walking) => {
        get("exit-walk").hidden = !walking;
        get("walk-pad").hidden = !walking;
        get("walk").hidden = walking;
        get("model").dataset.mode = walking ? "walk" : "overview";
        updateViewLabel();
        get("help").textContent = walking
          ? "WASD / arrows to walk · Drag to look · Esc to exit"
          : "Drag to rotate horizontally · Right drag to pan · Scroll to zoom";
      },
      (available) => {
        get<HTMLButtonElement>("view-3d").disabled = !available;
        get<HTMLButtonElement>("walk").disabled =
          !available || !ready || !level?.navigation;
        get<HTMLButtonElement>("walk-start").disabled = !available || !ready || !level?.navigation;
        get("fallback").hidden = available;
        if (available) redraw();
        if (!available) {
          setView("2d");
          get("fallback").textContent =
            "3D graphics context lost. Review the 2D plan while the browser restores graphics.";
        }
      },
    );
  } catch {
    get("fallback").hidden = false;
    get<HTMLButtonElement>("view-3d").disabled = true;
    setView("2d");
  }
  /** Rebuilds optional review overlays; dimensions are axis-aligned geometric extents. */
  function redraw(fit = false, fitModel = false) {
    if (!level) return;
    scene?.setLevel(level, options, fitModel);
    const host = get("plan");
    const previous = planBox;
    host.innerHTML = toSVGPlan(level, options.layer || undefined);
    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "group");
    if (previous && !fit) svg.setAttribute("viewBox", previous.join(" "));
    planBox = svg.getAttribute("viewBox")!.split(/\s+/).map(Number);
    for (const floor of level.water ?? []) {
      for (const node of svg.querySelectorAll<SVGElement>("[data-object]"))
        if (node.dataset.object === floor.region) node.classList.add("water");
    }
    if (options.issues) appendTerrainPlan(svg, level);
    for (const node of svg.querySelectorAll<SVGElement>("[data-object]")) {
      node.dataset.selected = String(node.dataset.object === options.selected || options.suggestion?.objects.includes(node.dataset.object!));
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute(
        "aria-pressed",
        String(node.dataset.object === options.selected || options.suggestion?.objects.includes(node.dataset.object!)),
      );
      node.setAttribute("aria-label", node.dataset.object!);
    }
    const nav =
      options.movement === "water" ? level.waterNavigation : level.navigation;
    const ns = "http://www.w3.org/2000/svg";
    const navIndices = nav ? navigationIndices(level, nav, options.layer, options.suggestion?.navigation?.component) : [];
    if (options.movement && nav) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute(
        "d",
        Array.from(
          { length: navIndices.length / 3 },
          (_, t) =>
            "M " +
            navIndices
              .slice(t * 3, t * 3 + 3)
              .map(
                (i) => `${nav.positions[i * 3]},${-nav.positions[i * 3 + 1]}`,
              )
              .join(" L ") +
            " Z",
        ).join(" "),
      );
      path.setAttribute("class", "navigation-overlay");
      path.style.pointerEvents = "none";
      svg.append(path);
    }
    for (const patch of options.suggestion?.patches ?? []) {
      const polygon = document.createElementNS(ns,"polygon");
      polygon.setAttribute("points",patch.map(p=>`${p[0]},${-p[1]}`).join(" "));
      polygon.setAttribute("class","suggestion-marker");
      polygon.style.pointerEvents="none";
      svg.append(polygon);
    }
    if (options.suggestion) {
      const { min, max } = options.suggestion.bounds;
      const marker = document.createElementNS(ns, "rect");
      marker.setAttribute("x", String(min[0]-0.04));
      marker.setAttribute("y", String(-max[1]-0.04));
      marker.setAttribute("width", String(Math.max(0.08,max[0]-min[0]+0.08)));
      marker.setAttribute("height", String(Math.max(0.08,max[1]-min[1]+0.08)));
      marker.setAttribute("class", "suggestion-marker");
      marker.style.pointerEvents = "none";
      svg.append(marker);
    }
    if (get<HTMLInputElement>("issues").checked) {
      for (const sample of [
        ...(nav?.coverage.uncovered ?? []),
        ...(nav?.coverage.blocked ?? []),
      ].filter(
        (sample) =>
          !options.layer ||
          [...level!.floors, ...(level!.water ?? [])].some(
            (f) => f.region === sample.region && f.layer === options.layer,
          ),
      )) {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(sample.position[0]));
        circle.setAttribute("cy", String(-sample.position[1]));
        circle.setAttribute("r", ".22");
        circle.setAttribute("class", "issue-marker");
        const title = document.createElementNS(ns, "title");
        title.textContent = sample.reason;
        circle.append(title);
        svg.append(circle);
      }
    }
    get("navigation-summary").textContent = options.movement
      ? nav
        ? `${options.movement === "water" ? "Boat" : "Land"} · ${nav.components} components · ${nav.coverage.uncoveredCount} uncovered samples`
        : "No navigation available for this movement."
      : "";
    const positions: number[] = [];
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      const surface = level.surfaces[level.mesh.surfaces[t]];
      if (surface.visible === false || (!options.roofs && surface.role === "roof")) continue;
      if (options.selected && surface.object !== options.selected) continue;
      if (options.layer && surface.layer !== options.layer) continue;
      for (const i of level.mesh.indices.slice(t * 3, t * 3 + 3))
        positions.push(...level.mesh.positions.slice(i * 3, i * 3 + 3));
    }
    const box = new THREE.Box3();
    for (let i = 0; i < positions.length; i += 3)
      box.expandByPoint(
        new THREE.Vector3(
          ...(positions.slice(i, i + 3) as [number, number, number]),
        ),
      );
    const extent = box.getSize(new THREE.Vector3());
    const dimensions = get<HTMLInputElement>("dimensions").checked;
    const text = box.isEmpty() ? "No visible geometry in this selection." : `${options.selected ? "Selected" : "Layout"} bounds / ${extent.x.toFixed(2)} × ${extent.y.toFixed(2)} × ${extent.z.toFixed(2)} m`;
    get("dimensions-value").textContent = dimensions ? text : "";
    renderArchitectureInspection(get("architecture-inspection"), level, options.selected ?? "");
    const overlay = get("viewport-dimensions");
    overlay.hidden = !dimensions;
    overlay.textContent = text.replace("bounds /", "bounds XYZ /");
    overlay.dataset.scope = options.selected || options.layer || "layout";
    overlay.dataset.extent = box.isEmpty() ? "" : extent.toArray().join(",");
    overlay.dataset.min = box.isEmpty() ? "" : box.min.toArray().join(",");
    overlay.dataset.max = box.isEmpty() ? "" : box.max.toArray().join(",");
  }
  /** Loads source in an isolated worker; revision checks reject superseded replies. */
  function load() {
    if (navigationConfigurationError) {
      fail(navigationConfigurationError);
      return;
    }
    get("nav-cell-status").textContent = `Rebuilding with ${navigationCell ?? 0.0625} m horizontal cells…`;
    suggestions.setEnabled(false);
    spatialDiagnostics.setEnabled(false);
    if (!ready) stopWorker();
    scene?.exitWalk();
    const id = ++revision;
    ready = false;
    clearTimeout(timeout);
    get<HTMLButtonElement>("walk").disabled = true;
    get<HTMLButtonElement>("walk-start").disabled = true;
    get("cancel").hidden = false;
    get("retry").hidden = true;
    get("status").textContent = level
      ? "Loading layout. Previous preview is stale."
      : "Loading layout…";
    get("status").dataset.state = "busy";
    get("model").dataset.stale = String(Boolean(level));
    get("plan").dataset.stale = String(Boolean(level));
    document.querySelector(".reviewer")!.setAttribute("aria-busy", "true");
    try {
      worker ??= config.worker();
      timeout = setTimeout(
        () => fail("Loading timed out. Retry or open another layout."),
        120000,
      );
      worker.onerror = (e) => {
        if (id === revision) fail(e.message);
      };
      worker.onmessage = (event) => {
        if (id !== revision) return;
        const data = event.data;
        if (data.error) {
          fail(data.error);
          return;
        }
        if (data.stage)
          get("status").textContent =
            `${level ? "Previous preview is stale. " : ""}${data.stage}`;
        if (!data.level) return;
        const next = data.level as CompiledLevel;
        const errors = next.diagnostics.filter(
          (diagnostic) => diagnostic.severity === "error",
        );
        if (!next.mesh.indices.length && errors.length) {
          fail(
            errors
              .map((diagnostic) => `${diagnostic.code} [${diagnostic.objects.join(", ")}]${diagnostic.source ? ` line ${diagnostic.source.line}` : ""}: ${diagnostic.message}`)
              .join(" "),
          );
          return;
        }
        const first = currentDocument !== next.document.id;
        level = next;
        report = data.report;
        if (next.navigation) {
          get("nav-cell-status").textContent = `Applied: ${next.navigation.settings.cell} m horizontal cells / body ${next.navigation.settings.player.height} m tall, ${2 * next.navigation.settings.player.radius} m wide.`;
        }
        currentDocument = next.document.id;
        if (first) {
          options.selected = "";
          options.layer = "";
          planBox = undefined;
          get("selection").textContent =
            "Select a floor or wall in either view.";
        }
        get("title").textContent = level.document.name;
        get("summary").textContent =
          `${level.floors.length} floor regions / ${level.stats.triangles.toLocaleString()} triangles`;
        const floor = get<HTMLSelectElement>("floor");
        floor.replaceChildren(
          new Option("All floors", ""),
          ...level.document.layers.map(
            (l) => new Option(l.label ?? l.id, l.id),
          ),
        );
        if (!level.document.layers.some((l) => l.id === options.layer))
          options.layer = "";
        floor.value = options.layer;
        scene?.setAssets(imageURLs);
        redraw(first, first);
        if (!viewApplied && scene) {
          scene.setView(initialView);
          if (initialView.projection === "perspective" && !initialView.position) scene.fit();
          viewApplied = true;
        }
        suggestions.setEnabled(true);
        suggestions.update(level);
        const references = get<HTMLSelectElement>("reference");
        references.replaceChildren(
          new Option("No reference", ""),
          ...(level.document.references ?? []).map(
            (r) => new Option(r.label ?? r.id, r.id),
          ),
        );
        updateReference();
        const diagnostics = report?.diagnostics ?? level.diagnostics;
        get("issue-count").textContent = String(diagnostics.length);
        spatialDiagnostics.setEnabled(true);
        spatialDiagnostics.update(diagnostics);
        if (diagnostics.some(d=>d.severity === "error")) get<HTMLDetailsElement>("validation").open = true;
        get("validation-mode").textContent = report
          ? `${report.validation ?? "playable"} / ${report.passed ? "Passed declared validation" : "Needs attention"}. Navigation checks do not establish building-code compliance.`
          : "Checking navigation…";
        if (
          data.stage === "Ready" ||
          data.stage === "Geometry needs attention"
        ) {
          ready = true;
          if (!level.navigation) {
            get("nav-cell-status").textContent = "Navigation is unavailable for this layout. Resolve the geometry diagnostics before walking.";
          }
          clearTimeout(timeout);
          get("status").textContent = report?.passed
            ? "Ready / validated layout"
            : "Ready / review validation issues";
          get("status").dataset.state = "ready";
          get("model").dataset.stale = "false";
          get("plan").dataset.stale = "false";
          get("cancel").hidden = true;
          get<HTMLButtonElement>("walk").disabled = !scene || !level.navigation;
          get<HTMLButtonElement>("walk-start").disabled = !scene || !level.navigation;
          if (!walkApplied) {
            walkApplied = true;
            if (initialWalk) startWalk(initialWalk);
          }
          document
            .querySelector(".reviewer")!
            .setAttribute("aria-busy", "false");
        }
      };
      worker.postMessage({ id, text: source, uvs: false, assetFiles: files, navigationCell });
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
  get<HTMLFormElement>("nav-cell-form").onsubmit = event => {
    event.preventDefault();
    try {
      const cell = parseNavigationCell(get<HTMLInputElement>("nav-cell").value);
      const url = new URL(location.href);
      url.searchParams.set("nav-cell", String(cell));
      navigationCell = cell;
      navigationConfigurationError = undefined;
      get("nav-cell-error").textContent = "";
      history.replaceState(null, "", url);
      get<HTMLAnchorElement>("walk-link").removeAttribute("href");
      if (scene) updateCamera(scene.getView());
      load();
    } catch (error) {
      get("nav-cell-error").textContent = (error as Error).message;
    }
  };
  get("projection").onchange = () => {
    scene?.setView({ projection: get<HTMLSelectElement>("projection").value as ViewState["projection"] });
  };
  get<HTMLFormElement>("camera-form").onsubmit = event => {
    event.preventDefault();
    const parameters = new URLSearchParams({
      camera: get<HTMLInputElement>("camera-position").value,
      target: get<HTMLInputElement>("camera-target").value,
      projection: get<HTMLSelectElement>("projection").value,
      fov: get<HTMLInputElement>("camera-fov").value,
      "view-height": get<HTMLInputElement>("camera-height").value,
      roll: get<HTMLInputElement>("camera-roll").value,
    });
    try {
      const next = parseViewOptions(parameters);
      scene?.setView(next);
      get("camera-error").textContent = "";
    } catch (error) {
      get("camera-error").textContent = (error as Error).message;
    }
  };
  get("view-2d").onclick = () => setView("2d");
  get("view-3d").onclick = () => setView("3d");
  get("fit").onclick = () => {
    if (view === "3d") scene?.fit();
    else {
      planBox = undefined;
      redraw(true);
    }
  };
  get("turn").onclick = () => scene?.turn();
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-preset]",
  ))
    button.onclick = () => scene?.preset(button.dataset.preset!);
  /** Shared UI/API/URL entry; failures preserve the previous mode and pose. */
  function startWalk(pose?: WalkPose): WalkStartResult {
    const result = ready && scene
      ? scene.enterWalk(pose)
      : { ok: false as const, message: "Wait for a current layout and land navigation before walking." };
    get("walk-error").textContent = result.ok ? "" : result.message;
    if (!result.ok) get<HTMLDetailsElement>("walk-controls").open = true;
    if (result.ok) {
      for (const [id, value] of Object.entries({ "walk-feet": result.pose.feet.join(" "), "walk-yaw": String(result.pose.yaw), "walk-pitch": String(result.pose.pitch) })) {
        get<HTMLInputElement>(id).value = value;
      }
      setView("3d", true);
      get("help").textContent = "WASD / arrows to walk · Drag to look · Esc to exit";
    }
    return result;
  }
  get("walk").onclick = () => { startWalk(); };
  get<HTMLFormElement>("walk-form").onsubmit = event => {
    event.preventDefault();
    try {
      const pose = parseWalkPose(new URLSearchParams({
        "walk-feet": get<HTMLInputElement>("walk-feet").value,
        "walk-yaw": get<HTMLInputElement>("walk-yaw").value,
        "walk-pitch": get<HTMLInputElement>("walk-pitch").value,
      }));
      startWalk(pose);
    } catch (error) {
      get("walk-error").textContent = (error as Error).message;
      get<HTMLDetailsElement>("walk-controls").open = true;
    }
  };
  get("model").addEventListener("review-walk-change", event => {
    const walk = (event as CustomEvent<ReturnType<ReviewScene["getWalk"]>>).detail;
    if (!walk.active) return;
    get("walk-description").textContent = `Actual feet ${walk.feet.map(v => v.toFixed(3)).join(" ")}m / yaw ${walk.yaw}° / pitch ${walk.pitch}° / body ${walk.height}m × ${2 * (walk.radius ?? 0)}m / movement constrained to land navigation.`;
    get<HTMLAnchorElement>("walk-link").href = walkURL(location.href, walk);
  });
  get("exit-walk").onclick = () => scene?.exitWalk();
  get("floor").onchange = () => {
    options.layer = get<HTMLSelectElement>("floor").value;
    planBox = undefined;
    redraw();
  };
  get("appearance").onchange = () => {
    options.appearance = parseAppearance(get<HTMLSelectElement>("appearance").value);
    const url = new URL(location.href);
    url.searchParams.set("appearance", options.appearance);
    history.replaceState(null, "", url);
    redraw();
    if (scene) updateCamera(scene.getView());
  };
  get<HTMLFormElement>("frame-form").onsubmit = event => {
    event.preventDefault();
    try {
      applyFrameAspect(parseFrameAspect(get<HTMLInputElement>("frame-aspect").value));
    } catch (error) {
      get("frame-error").textContent = (error as Error).message;
    }
  };
  get("frame-mode").onchange = () => {
    const value = get<HTMLSelectElement>("frame-mode").value;
    if (value === "custom") { get<HTMLInputElement>("frame-aspect").focus(); return; }
    applyFrameAspect(value === "viewport" ? undefined : parseFrameAspect(value));
  };
  get("frame-reference").onclick = () => {
    const reference = level?.document.references?.find(r => r.id === get<HTMLSelectElement>("reference").value);
    if (!reference) return;
    try {
      applyFrameAspect(parseFrameAspect(String(reference.width / reference.height)));
    } catch (error) {
      get("frame-error").textContent = (error as Error).message;
    }
  };
  get("roofs").onchange = () => {
    options.roofs = get<HTMLInputElement>("roofs").checked;
    redraw();
  };
  get("cut").oninput = () => {
    options.cut = Number(get<HTMLInputElement>("cut").value);
    if (level) scene?.setLevel(level, options);
  };
  get("navigation").onchange = () => {
    options.movement = get<HTMLSelectElement>("navigation")
      .value as ReviewOptions["movement"];
    redraw();
  };
  get("issues").onchange = () => {
    options.issues = get<HTMLInputElement>("issues").checked;
    get<HTMLDetailsElement>("validation").open =
      get<HTMLInputElement>("issues").checked;
    redraw();
  };
  get("dimensions").onchange = () => redraw();
  get("cancel").onclick = () => {
    revision++;
    fail("Loading cancelled. Retry or open another layout.");
  };
  get("retry").onclick = load;
  const planHost = get("plan");
  let drag: { x: number; y: number; box: number[] } | undefined;
  let moved = false;
  planHost.onpointerdown = (e) => {
    if (!planBox) return;
    drag = { x: e.clientX, y: e.clientY, box: [...planBox] };
    moved = false;
    planHost.setPointerCapture(e.pointerId);
  };
  planHost.onpointermove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    moved ||= Math.hypot(dx, dy) > 4;
    const scale = Math.max(
      drag.box[2] / planHost.clientWidth,
      drag.box[3] / planHost.clientHeight,
    );
    planBox = [
      drag.box[0] - dx * scale,
      drag.box[1] - dy * scale,
      drag.box[2],
      drag.box[3],
    ];
    planHost.querySelector("svg")?.setAttribute("viewBox", planBox.join(" "));
  };
  planHost.onpointerup = (e) => {
    drag = undefined;
    if (moved) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<SVGElement>("[data-object]");
    if (target) select(target.dataset.object!);
  };
  planHost.onpointercancel = () => {
    drag = undefined;
  };
  planHost.onwheel = (e) => {
    if (!planBox) return;
    e.preventDefault();
    const factor = Math.exp(Math.sign(e.deltaY) * 0.12),
      [x, y, w, h] = planBox;
    planBox = [
      x + (w * (1 - factor)) / 2,
      y + (h * (1 - factor)) / 2,
      w * factor,
      h * factor,
    ];
    planHost.querySelector("svg")?.setAttribute("viewBox", planBox.join(" "));
  };
  planHost.onkeydown = (e) => {
    const target = (e.target as Element).closest<SVGElement>("[data-object]");
    if (target && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      select(target.dataset.object!);
    }
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-move]",
  )) {
    const release = () =>
      window.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: button.dataset.move!,
          bubbles: true,
        }),
      );
    button.onpointerdown = (e) => {
      button.setPointerCapture(e.pointerId);
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: button.dataset.move!,
          bubbles: true,
        }),
      );
    };
    button.onpointerup = release;
    button.onpointercancel = release;
    button.onlostpointercapture = release;
  }
  if (config.local) {
    get("open").onclick = () => get<HTMLInputElement>("file").click();
    get("companions").onclick = () => get<HTMLInputElement>("assets").click();
    get("file").onchange = async () => {
      const file = get<HTMLInputElement>("file").files?.[0];
      if (!file) return;
      const request = ++revision;
      stopWorker();
      try {
        const text = await file.text();
        if (request !== revision) return;
        source = text;
        files = {};
        updateImages();
        load();
      } catch (error) {
        fail(String(error));
      }
    };
    get("assets").onchange = async () => {
      const request = ++revision;
      stopWorker();
      try {
        const next: Record<string, Uint8Array> = {};
        for (const file of get<HTMLInputElement>("assets").files ?? [])
          next[file.webkitRelativePath || file.name] = new Uint8Array(
            await file.arrayBuffer(),
          );
        if (request !== revision) return;
        files = { ...files, ...next };
        updateImages();
        load();
      } catch (error) {
        fail(String(error));
      }
    };
  }
  if (!config.local && import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        get("offline").textContent = "Ready offline on this device";
      })
      .catch(() => {
        get("offline").textContent = "Offline storage unavailable";
      });
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) return;
      revision++;
      stopWorker();
      clearTimeout(timeout);
      frameObserver.disconnect();
      scene?.dispose();
      for (const url of objectURLs) URL.revokeObjectURL(url);
    },
    { once: true },
  );
  if (!config.deferLoad) load();
  return {
    startWalk,
    /** Returns the actual read-only inspection pose, if a 3D scene is available. */
    getWalk: () => scene?.getWalk(),
    /** Rebuilds without resetting inspection state for the same document identity. */
    updateSource(text: string, assetFiles: Record<string, Uint8Array> = {}) {
      source = text;
      files = assetFiles;
      updateImages();
      load();
    },
    /** Invalidates in-flight replies and retains visibly stale previous geometry. */
    failSource(message: string) {
      revision++;
      fail(message);
    },
    /** Releases resources owned by this reviewer instance. */
    dispose() {
      revision++;
      stopWorker();
      clearTimeout(timeout);
      frameObserver.disconnect();
      scene?.dispose();
      for (const url of objectURLs) URL.revokeObjectURL(url);
    },
  };
}
