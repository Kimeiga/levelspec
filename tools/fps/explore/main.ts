import "./style.css";
import { diagram, normalizeConfig } from "../../../src/generate/exploration/index.ts";
import { escapeMarkup } from "../../../src/generate/exploration/presentation.ts";
import type { AreaNode, ExplorationPacket, Graph, Interpretation, Mobility, Realization } from "../../../src/generate/exploration/types.ts";

/** Retrieves a required element owned by this page. */
function get<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
let config = normalizeConfig();
let packet: ExplorationPacket | undefined;
let selected = 0, frame = 0, request = 0, previewRevision = 0;
let editing = true, view = "graph", selectedNode = "entry";
let worker: Worker | undefined;
let interpretation: Interpretation = "terraces";
let previewReady = false;

/** Returns the selected immutable spatial hypothesis. */
function spatial(): Realization | undefined {
  return packet?.realizations.find(r => r.candidate === packet!.candidates[selected].id && r.interpretation === interpretation);
}

/** Selects either the editable starting state or a retained search state. */
function visibleGraph(): Graph {
  if (!packet || editing) return config.initial;
  return packet.candidates[selected].trace[frame]?.graph ?? packet.candidates[selected].graph;
}

/** Synchronizes the small controls with the complete configuration. */
function fillControls(): void {
  for (const [id, value] of Object.entries({ seed: config.seed, restarts: config.restarts, proposals: config.proposals,
    verticality: config.verticality,
    cycles: config.targets.cycles, crossings: config.targets.crossings, variation: config.targets.lengthVariation,
    "decision-depth": config.targets.decisionDepth, territories: config.targets.territories, "stacked-regions": config.targets.stackedRegions })) get<HTMLInputElement>(id).value = String(value);
  get<HTMLSelectElement>("mobility").value = config.profile.modes.includes("jump") ? "all" : config.profile.modes.includes("ladder") ? "vertical" : "ordinary";
  get<HTMLTextAreaElement>("config").value = JSON.stringify(config, null, 2);
  loadEdge();
}

/** Reads user edits while preserving advanced settings not represented by the small controls. */
function readControls(): void {
  config = normalizeConfig({ ...config, seed: get<HTMLInputElement>("seed").value,
    verticality: Number(get<HTMLInputElement>("verticality").value),
    restarts: Number(get<HTMLInputElement>("restarts").value), proposals: Number(get<HTMLInputElement>("proposals").value),
    targets: { ...config.targets, cycles: Number(get<HTMLInputElement>("cycles").value), crossings: Number(get<HTMLInputElement>("crossings").value),
      lengthVariation: Number(get<HTMLInputElement>("variation").value), decisionDepth: Number(get<HTMLInputElement>("decision-depth").value),
      territories: Number(get<HTMLInputElement>("territories").value), stackedRegions: Number(get<HTMLInputElement>("stacked-regions").value) } });
}

/** Marks a run's observable state without interpreting target satisfaction as quality. */
function status(message: string, state: string): void {
  get("status").textContent = message; get("status").dataset.state = state;
}

/** Cancels owned work and invalidates replies that may already be queued. */
function cancel(): void {
  request++; worker?.terminate(); worker = undefined;
  get<HTMLButtonElement>("cancel").disabled = true;
  get<HTMLButtonElement>("run").disabled = false;
}

/** Runs or imports in a fresh worker, so cancellation also releases partial realization work. */
function begin(imported?: string): void {
  try {
    readControls(); cancel();
    const id = request, current = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker = current;
    get<HTMLButtonElement>("run").disabled = true; get<HTMLButtonElement>("cancel").disabled = false;
    get<HTMLProgressElement>("progress").value = 0;
    status(imported ? "Restoring experiment and recomputing evidence…" : "Exploring graph alternatives…", "running");
    current.onmessage = event => {
      if (id !== request || event.data.id !== id || worker !== current) return;
      if (event.data.kind === "progress") {
        get<HTMLProgressElement>("progress").value = event.data.attempted / event.data.total;
        status(`${event.data.attempted.toLocaleString()} / ${event.data.total.toLocaleString()} proposals · then spatial interpretations`, "running");
      } else if (event.data.kind === "result") {
        packet = event.data.packet; config = structuredClone(packet!.config); selected = 0; editing = false;
        frame = packet!.candidates[0].trace.length - 1;
        cancel(); fillControls(); render(); updatePreview();
        status(`${packet!.candidates.length} graph alternatives · ${packet!.realizations.length} spatial hypotheses`, "ready");
        get<HTMLProgressElement>("progress").value = 1;
      } else if (event.data.kind === "error") { cancel(); status(event.data.message, "error"); }
    };
    current.onerror = event => { if (worker === current) { cancel(); status(event.message, "error"); } };
    current.postMessage({ id, config, packet: imported });
  } catch (error) { cancel(); status(String(error), "error"); }
}

/** Renders comparisons, selected evidence, and the current graph without changing search data. */
function render(): void {
  get<HTMLButtonElement>("export").disabled = !packet;
  get<HTMLButtonElement>("download-aml").disabled = !packet;
  get<HTMLButtonElement>("use-candidate").disabled = !packet;
  if (packet) {
    get("candidate-count").textContent = `${packet.candidates.length} graphs × 3 interpretations`;
    get("candidates").innerHTML = packet.candidates.map((candidate, index) => `<button class="candidate" data-candidate="${index}" aria-pressed="${index === selected && !editing}">${diagram(candidate.graph, packet!.config)}<span class="caption"><strong>Alternative ${index + 1}</strong>${candidate.graph.nodes.length} areas · ${candidate.metrics.structure.territories.length} regions · depth ${candidate.metrics.structure.journeys.map(j => j.depth).join(" / ")}<br>${candidate.metrics.deficits.length ? `${candidate.metrics.deficits.length} unmet targets` : "Graph targets met"}</span></button>`).join("");
  }
  const current = spatial(), graph = visibleGraph();
  const isHistory = !!packet && !editing && frame < packet.candidates[selected].trace.length - 1;
  get("drawing").innerHTML = diagram(graph, config, !editing && !isHistory && view !== "graph" ? current : undefined, view === "section");
  get("drawing").hidden = view === "3d"; get<HTMLIFrameElement>("preview").hidden = view !== "3d";
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  const slider = get<HTMLInputElement>("iteration");
  slider.disabled = !packet || editing; slider.max = String(packet ? packet.candidates[selected].trace.length - 1 : 0); slider.value = String(frame);
  get("iteration-label").textContent = editing ? "Editing starting graph" : `Proposal ${packet?.candidates[selected].trace[frame]?.proposal ?? 0}${isHistory ? " · graph only" : ""}`;
  if (current && !editing) {
    const candidate = packet!.candidates[selected];
    const list = (items: string[]) => `<ul>${items.map(item => `<li>${escapeMarkup(item)}</li>`).join("")}</ul>`;
    get("evidence").innerHTML = `<div><h3>Intended routes · ${candidate.metrics.cycles} cycles</h3>${list(candidate.metrics.approaches.map(t => `${t.from} → ${t.to}: ${t.actualEdge} edge / ${t.actualVertex} vertex approaches; ${t.travelSeconds?.toFixed(1) ?? "unreachable"} estimated seconds`))}<h3>Unmet graph demands</h3>${list(candidate.metrics.deficits.length ? candidate.metrics.deficits : ["None in the abstract graph. This does not establish playable geometry."])}</div><div><h3>Realized interpretation · feedback round ${current.feedbackRound}</h3>${list(current.transfers.length ? current.transfers : ["No additional transfers found by the provisional plan checks."])}<h3 class="flag">Geometry / movement follow-up</h3>${list([...current.issues, ...current.realizedMetrics.deficits].slice(0, 14))}<p>All ${current.mobility.length} links: engine verification pending. Plan-derived transfers are incomplete until compiled navigation and physical portals are inspected.${isHistory ? " History is graph-only; 3D retains the selected spatial hypothesis." : ""}</p></div>`;
    get("evidence").insertAdjacentHTML("afterbegin", `<div><h3>Structure before → after realization</h3>${list(candidate.metrics.structure.journeys.map((j, i) => `${j.from} → ${j.to}: progressive depth ${j.depth} → ${current.realizedMetrics.structure.journeys[i]?.depth ?? 0}; ordinary centerline ${j.distance?.toFixed(1) ?? "unreachable"} m`))}<p>Developed regions ${candidate.metrics.structure.territories.length} → ${current.realizedMetrics.structure.territories.length}; stacked pairs ${candidate.metrics.structure.stacked.length} → ${current.realizedMetrics.structure.stacked.length}. Shared floors can erase choices; this is reported, not treated as preserved complexity.</p></div>`);
  } else get("evidence").innerHTML = "<p>Editing the starting graph. Drag a node to pin it, or select it to edit coordinates and size. Search can restructure every unlocked part.</p>";
  renderNode();
}

/** Shows precise editable node coordinates alongside pointer controls. */
function renderNode(): void {
  const node = config.initial.nodes.find(n => n.id === selectedNode);
  if (!node) { get("node-editor").textContent = "Use a candidate as the starting graph to edit its nodes."; return; }
  get("node-editor").innerHTML = `<strong>${escapeMarkup(node.id)}</strong><div class="pair">${["X", "Y", "Z"].map((axis, i) => `<label>${axis} meters<input data-coordinate="${i}" type="number" step=".1" value="${node.position[i]}"></label>`).join("")}<label>Radius<input id="node-radius" type="number" min="2" max="15" step=".1" value="${node.radius}"></label></div><label class="check"><input id="node-pin" type="checkbox" ${node.pinned ? "checked" : ""}>Pin this area</label>`;
}

/** Sends AML across the isolated reviewer boundary; revision guards exist on both sides. */
function updatePreview(): void {
  const current = spatial();
  if (previewReady && current) get<HTMLIFrameElement>("preview").contentWindow?.postMessage({ kind: "exploration-preview", revision: ++previewRevision, aml: current.aml }, location.origin);
}

/** Downloads an owned snapshot rather than mutating an authoring file in place. */
function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Promotes a chosen graph to editable input; generated AML remains an independent snapshot. */
function editCandidate(): void {
  if (packet) config.initial = structuredClone(visibleGraph());
  editing = true; view = "graph"; frame = 0; selectedNode = config.initial.nodes[0].id;
  fillControls(); render();
}

get("run").onclick = () => begin();
get("cancel").onclick = () => { cancel(); status("Cancelled. Edit or run another experiment.", "cancelled"); };
get("use-candidate").onclick = () => { cancel(); editCandidate(); };
get("reset").onclick = () => {
  try {
    readControls();
    const next = normalizeConfig({ ...config, initial: undefined,
      targets: { ...config.targets, approaches: normalizeConfig().targets.approaches } });
    cancel(); config = next; editing = true; frame = 0; selectedNode = "entry";
    fillControls(); render(); status("Starter floors assigned from the current seed and settings.", "idle");
  } catch (error) { status(String(error), "error"); }
};
get("export").onclick = () => { if (packet) download(`experiment-${packet.config.seed.replace(/[^\w-]/g, "_")}.json`, JSON.stringify(packet, null, 2), "application/json"); };
get("download-aml").onclick = () => { const current = spatial(); if (current) download(`${current.id}.aml`, current.aml, "application/xml"); };
get("import").onclick = () => get<HTMLInputElement>("file").click();
get<HTMLInputElement>("file").onchange = async event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) { if (file.size > 30_000_000) status("Experiment exceeds 30 MB", "error"); else begin(await file.text()); }
  get<HTMLInputElement>("file").value = "";
};
get("apply-config").onclick = () => {
  try { const next = normalizeConfig(JSON.parse(get<HTMLTextAreaElement>("config").value)); cancel(); config = next; editing = true; fillControls(); render(); status("Configuration applied.", "idle"); }
  catch (error) { status(String(error), "error"); }
};
get<HTMLSelectElement>("mobility").onchange = event => {
  const value = (event.target as HTMLSelectElement).value;
  config.profile.modes = value === "all" ? ["walk", "ramp", "stairs", "jump", "ladder", "drop", "vent"] : value === "vertical" ? ["walk", "ramp", "stairs", "ladder", "drop"] : ["walk", "ramp", "stairs"];
};
get("candidates").onclick = event => {
  const button = (event.target as Element).closest<HTMLElement>("[data-candidate]");
  if (!button || !packet) return;
  selected = Number(button.dataset.candidate); frame = packet.candidates[selected].trace.length - 1; editing = false;
  render(); updatePreview();
};
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => button.onclick = () => { view = button.dataset.view!; render(); });
get<HTMLSelectElement>("interpretation").onchange = event => { interpretation = (event.target as HTMLSelectElement).value as Interpretation; render(); updatePreview(); };
get<HTMLInputElement>("iteration").oninput = event => { frame = Number((event.target as HTMLInputElement).value); render(); };
window.addEventListener("message", event => {
  if (event.origin === location.origin && event.source === get<HTMLIFrameElement>("preview").contentWindow && event.data?.kind === "exploration-preview-ready") { previewReady = true; updatePreview(); }
});
get("node-editor").onchange = event => {
  try {
    const initial = structuredClone(config.initial), node = initial.nodes.find(n => n.id === selectedNode), input = event.target as HTMLInputElement;
    if (!node) return;
    if (input.dataset.coordinate !== undefined) node.position[Number(input.dataset.coordinate)] = Number(input.value);
    if (input.id === "node-radius") node.radius = Number(input.value);
    if (input.id === "node-pin") node.pinned = input.checked;
    const next = normalizeConfig({ ...config, initial });
    cancel(); config = next; editing = true; view = "graph"; fillControls(); render(); status("Area updated.", "idle");
  } catch (error) { renderNode(); status(String(error), "error"); }
};

/** Loads the existing connection's declarations when the user selects its endpoint pair. */
function loadEdge(): void {
  const from = get<HTMLInputElement>("edge-from").value, to = get<HTMLInputElement>("edge-to").value;
  const edge = config.initial.edges.find(e => [e.from, e.to].includes(from) && [e.from, e.to].includes(to));
  get<HTMLSelectElement>("edge-mode").value = edge?.mode ?? "walk";
  get<HTMLInputElement>("edge-cross-level").checked = edge?.crossLevel === true;
  get<HTMLInputElement>("edge-both").checked = edge?.bidirectional ?? true;
  get<HTMLInputElement>("edge-lock").checked = edge?.locked === true;
}
get<HTMLInputElement>("edge-from").onchange = loadEdge;
get<HTMLInputElement>("edge-to").onchange = loadEdge;

/** Applies connection edits through normal validation, preserving the prior graph on invalid input. */
function editEdge(remove: boolean): void {
  try {
    const initial = structuredClone(config.initial), from = get<HTMLInputElement>("edge-from").value, to = get<HTMLInputElement>("edge-to").value;
    const old = initial.edges.find(e => [e.from, e.to].includes(from) && [e.from, e.to].includes(to));
    initial.edges = initial.edges.filter(e => e !== old);
    if (!remove) initial.edges.push({ id: old?.id ?? `edit-${initial.edges.length + 1}`, from, to, width: old?.width ?? 4, bend: old?.bend ?? 0,
      mode: get<HTMLSelectElement>("edge-mode").value as Mobility, crossLevel: get<HTMLInputElement>("edge-cross-level").checked,
      bidirectional: get<HTMLInputElement>("edge-both").checked, locked: get<HTMLInputElement>("edge-lock").checked });
    config = normalizeConfig({ ...config, initial }); cancel(); editing = true; view = "graph"; fillControls(); render(); status("Connection updated.", "idle");
  } catch (error) { status(String(error), "error"); }
}
get("edge-save").onclick = () => editEdge(false); get("edge-delete").onclick = () => editEdge(true);
let drag: { id: string; startX: number; startY: number; moved: boolean } | undefined;
get("drawing").onpointerdown = event => {
  const group = (event.target as Element).closest<SVGElement>("[data-node]");
  if (!group) return;
  if (!editing) editCandidate();
  selectedNode = group.dataset.node!; renderNode();
  drag = { id: selectedNode, startX: event.clientX, startY: event.clientY, moved: false };
  get("drawing").setPointerCapture(event.pointerId);
};
get("drawing").onpointermove = event => {
  if (!drag) return;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 3 && !drag.moved) return;
  const svg = get("drawing").querySelector("svg")!, matrix = svg.getScreenCTM();
  if (!matrix) return;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const node = config.initial.nodes.find(n => n.id === drag!.id)!;
  node.position[0] = Math.round(Math.max(-config.bounds[0] / 2, Math.min(config.bounds[0] / 2, p.x)) * 10) / 10;
  node.position[1] = Math.round(Math.max(-config.bounds[1] / 2, Math.min(config.bounds[1] / 2, -p.y)) * 10) / 10;
  node.pinned = true; drag.moved = true; cancel(); fillControls(); render();
};
get("drawing").onpointerup = () => { drag = undefined; };
get("drawing").onpointercancel = () => { drag = undefined; };
get("drawing").onkeydown = event => {
  if (event.key !== "Enter") return;
  const group = (event.target as Element).closest<SVGElement>("[data-node]");
  if (group) { selectedNode = group.dataset.node!; renderNode(); }
};
document.querySelector("aside.controls")!.addEventListener("input", event => {
  if (worker && (event.target as HTMLElement).id !== "progress") { cancel(); status("Run cancelled because its inputs changed.", "cancelled"); }
});
window.addEventListener("pagehide", cancel);
fillControls(); render();
