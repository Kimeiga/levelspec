import { zipSync, strToU8 } from "fflate";
import {
  toGLB,
  toGLTF,
  exportName,
  exportMetadata,
  resolveExportAssets,
  type CompiledLevel,
  type ExportFormat,
  type ExportFiles,
} from "../src/vector/index.ts";
type Snapshot = { level: CompiledLevel; source: string };
export function setupExport(getSnapshot: () => Snapshot | undefined) {
  const button = document.getElementById("export") as HTMLButtonElement;
  const dialog = document.createElement("dialog");
  dialog.className = "export-dialog";
  dialog.innerHTML = `<form method="dialog"><header><h2>Export level</h2><button aria-label="Close export" value="close">×</button></header></form>
    <p>Export all layers with materials, markers, and source metadata.</p>
    <fieldset><legend>Formats</legend>
      <label><input type="checkbox" name="format" value="glb" checked> GLB <small>Web · Godot · single model file</small></label>
      <label><input type="checkbox" name="format" value="gltf"> glTF <small>Web · Godot · separate images and buffer</small></label>
      <label><input type="checkbox" name="format" value="fbx" disabled> FBX <small>Unity · requires local Blender</small></label>
      <label><input type="checkbox" name="format" value="bsp" disabled> Quake BSP2 <small>Modern Quake ports · requires compiler and palette</small></label>
    </fieldset>
    <p class="export-dependencies" role="status">Checking local export tools…</p>
    <details><summary>Material images</summary><p>Select referenced PNG/JPEG files or their parent folder. Paths are relative to the SVGX file.</p>
      <label>Image files <input id="export-images" type="file" accept=".png,.jpg,.jpeg" multiple></label>
      <label>Asset folder <input id="export-folder" type="file" webkitdirectory multiple></label>
      <p id="export-assets">No companion files selected.</p>
    </details>
    <p class="export-state" role="status" aria-live="polite"></p>
    <progress hidden aria-label="Export progress"></progress>
    <div class="export-actions"><button type="button" id="export-cancel" hidden>Cancel export</button><button type="button" id="export-run">Export ZIP</button></div>
    <p><small>The ZIP includes model files and LevelSpec metadata. Lightmap UVs are preserved when generated; baked illumination is not included.</small></p>`;
  document.body.append(dialog);
  const status = dialog.querySelector(".export-state") as HTMLElement,
    dependencies = dialog.querySelector(".export-dependencies") as HTMLElement;
  const run = dialog.querySelector("#export-run") as HTMLButtonElement,
    cancel = dialog.querySelector("#export-cancel") as HTMLButtonElement,
    progress = dialog.querySelector("progress")!;
  const files = new Map<string, File>();
  let controller: AbortController | undefined,
    jobId: string | undefined,
    available = false;
  const download = (bytes: Uint8Array, name: string) => {
    const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type: "application/zip" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stop = () => {
    controller?.abort();
    if (jobId)
      void fetch(`/api/exports/${jobId}`, { method: "DELETE" }).catch(() => {});
  };
  cancel.onclick = stop;
  dialog.addEventListener("close", stop);
  function busy(value: boolean) {
    run.disabled = value || !available;
    cancel.hidden = !value;
    progress.hidden = !value;
  }
  for (const input of dialog.querySelectorAll<HTMLInputElement>(
    "input[type=file]",
  ))
    input.onchange = () => {
      for (const file of input.files ?? []) {
        const path = file.webkitRelativePath || file.name;
        files.set(path, file);
        // A selected directory contributes paths relative to that directory too.
        if (path.includes("/"))
          files.set(path.slice(path.indexOf("/") + 1), file);
      }
      dialog.querySelector("#export-assets")!.textContent =
        `${new Set(files.values()).size} companion files selected.`;
    };
  button.onclick = async () => {
    if (!getSnapshot()) return;
    status.textContent = "";
    dialog.showModal();
    try {
      const response = await fetch("/api/exports/capabilities");
      if (!response.ok) throw new Error();
      const caps = await response.json();
      for (const format of ["fbx", "bsp"])
        (
          dialog.querySelector(`input[value=${format}]`) as HTMLInputElement
        ).disabled = !caps[format];
      dependencies.textContent = [
        caps.fbx ? "Blender ready." : caps.instructions.fbx,
        caps.bsp ? "Quake tools ready." : caps.instructions.bsp,
      ].join(" ");
    } catch {
      dependencies.textContent =
        "Native export is available through the local viewer (npm run dev) or CLI: npm run compile:vector -- map.level.svgx --formats fbx,bsp. Set BLENDER_PATH, QBSP_PATH, VIS_PATH, LIGHT_PATH and QUAKE_PALETTE_PATH as needed.";
    }
    busy(false);
  };
  run.onclick = async () => {
    const snapshot = getSnapshot();
    if (!snapshot) {
      status.textContent = "Recompile the current source before exporting.";
      return;
    }
    const formats = [
      ...dialog.querySelectorAll<HTMLInputElement>(
        "input[name=format]:checked:not(:disabled)",
      ),
    ].map((i) => i.value as ExportFormat);
    if (!formats.length) {
      status.textContent = "Select an export format.";
      return;
    }
    const abort = (controller = new AbortController());
    jobId = undefined;
    busy(true);
    try {
      status.textContent = "Resolving material images…";
      const assets = await resolveExportAssets(
        snapshot.level,
        async (ref) => {
          const normalized = ref.replaceAll("\\", "/").replace(/^\.\//, "");
          const file = files.get(normalized);
          if (!file)
            throw new Error(`Select "${ref}" or its containing folder.`);
          return new Uint8Array(await file.arrayBuffer());
        },
        abort.signal,
      );
      if (formats.some((f) => f === "fbx" || f === "bsp")) {
        const encoded: Record<string, string> = {};
        for (const [ref, asset] of Object.entries(assets)) {
          let binary = "";
          for (let i = 0; i < asset.bytes.length; i += 8192)
            binary += String.fromCharCode(...asset.bytes.subarray(i, i + 8192));
          encoded[ref] = btoa(binary);
        }
        const response = await fetch("/api/exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: snapshot.source,
            geometryHash: snapshot.level.geometryHash,
            uvs: Boolean(snapshot.level.atlas),
            formats,
            assets: encoded,
          }),
          signal: abort.signal,
        });
        const started = await response.json();
        if (!response.ok)
          throw new Error(started.error ?? "Local export service unavailable.");
        jobId = started.id;
        for (;;) {
          abort.signal.throwIfAborted();
          const response = await fetch(`/api/exports/${jobId}`, {
              signal: abort.signal,
            }),
            state = await response.json();
          if (!response.ok) throw new Error(state.error);
          status.textContent = state.progress;
          if (state.state === "failed" || state.state === "cancelled")
            throw new Error(state.error ?? "Export cancelled.");
          if (state.state === "done") break;
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
        }
        const result = await fetch(`/api/exports/${jobId}/download`, {
          signal: abort.signal,
        });
        if (!result.ok) throw new Error("Export download failed.");
        const bytes = new Uint8Array(await result.arrayBuffer());
        abort.signal.throwIfAborted();
        download(bytes, `${exportName(snapshot.level.document.id)}-export.zip`);
        void fetch(`/api/exports/${jobId}`, { method: "DELETE" });
        jobId = undefined;
      } else {
        status.textContent = "Packaging model and metadata…";
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        abort.signal.throwIfAborted();
        const name = exportName(snapshot.level.document.id),
          bundle: ExportFiles = {
            [`${name}.levelspec.json`]: JSON.stringify(
              exportMetadata(snapshot.level, formats),
              null,
              2,
            ),
          };
        if (formats.includes("glb"))
          bundle[`${name}.glb`] = toGLB(snapshot.level, { assets });
        if (formats.includes("gltf"))
          Object.assign(bundle, toGLTF(snapshot.level, { assets }));
        const bytes = zipSync(
          Object.fromEntries(
            Object.entries(bundle).map(([key, value]) => [
              key,
              typeof value === "string" ? strToU8(value) : value,
            ]),
          ),
        );
        abort.signal.throwIfAborted();
        download(bytes, `${name}-export.zip`);
      }
      status.textContent = "Export downloaded.";
    } catch (error) {
      status.textContent = abort.signal.aborted
        ? "Export cancelled."
        : (error as Error).message;
    } finally {
      controller = undefined;
      busy(false);
    }
  };
  return {
    setAvailable(value: boolean) {
      available = value;
      button.disabled = !value;
      button.title = value
        ? "Export all layers"
        : "Compile and validate the current source before exporting";
      if (!value) stop();
      busy(Boolean(controller));
    },
  };
}
