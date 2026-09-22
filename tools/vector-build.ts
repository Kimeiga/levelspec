import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  parseLevelSvgx,
  compile,
  validateForRuntime,
  toRuntime,
  toOBJ,
  toSVGPlan,
  atlasSVG,
  exportName,
  createGLBAssetResolver,
} from "../src/vector/index.ts";
import {
  exportLevel,
  type ExportFormat,
  type ExportFiles,
} from "../src/export/vector/index.ts";
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    formats: { type: "string" },
    out: { type: "string" },
    blender: { type: "string" },
    qbsp: { type: "string" },
    vis: { type: "string" },
    light: { type: "string" },
    "quake-palette": { type: "string" },
    "no-uv": { type: "boolean" },
    "strict-floor-gaps": { type: "boolean" },
    "strict-surface-contacts": { type: "boolean" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(
    "Usage: npm run compile:vector -- [map.level.svgx] [--formats glb,gltf,fbx,bsp] [--out directory]\n  --blender PATH --qbsp PATH --vis PATH --light PATH --quake-palette palette.lmp\n  --no-uv --strict-floor-gaps --strict-surface-contacts\nDefaults: showcase; GLB + runtime JSON, reports, OBJ, SVG and UV layouts. Native tools are optional.",
  );
} else {
  const file = positionals[0] ?? "examples/showcase.level.svgx",
    formats = (values.formats ?? "glb").split(",") as ExportFormat[];
  if (
    positionals.length > 1 ||
    formats.some((f) => !["glb", "gltf", "fbx", "bsp"].includes(f))
  )
    throw new Error("Expected one SVGX file and formats glb,gltf,fbx,bsp.");
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort(new Error("Export cancelled")));
  try {
    const sourceFile = resolve(file),
      sourceDir = dirname(sourceFile),
      resolveAsset = createGLBAssetResolver(async (reference, signal) => {
        signal?.throwIfAborted();
        if (/^[a-z]+:/i.test(reference))
          throw new Error("GLB assets must be local files, not URLs.");
        return readFile(resolve(sourceDir, reference));
      }),
      level = await compile(parseLevelSvgx(await readFile(sourceFile, "utf8")), {
      signal: abort.signal,
      resolveAsset,
      retainExportSolids: formats.includes("bsp"),
      uvs: !values["no-uv"],
      floorGaps: values["strict-floor-gaps"] ? "error" : "warning",
      surfaceContacts: values["strict-surface-contacts"] ? "error" : "warning",
      onProgress: console.log,
    });
    const report = await validateForRuntime(level, { sealed: true });
    if (!report.passed)
      throw new Error(
        `Runtime validation failed; existing exports were preserved.\n${JSON.stringify(report.diagnostics, null, 2)}`,
      );
    const id = exportName(level.document.id),
      additionalFiles: ExportFiles = {
        [`${id}.runtime.json`]: JSON.stringify(toRuntime(level)),
        [`${id}.report.json`]: JSON.stringify(report, null, 2),
        [`${id}.obj`]: toOBJ(level),
        [`${id}.svg`]: toSVGPlan(level),
      };
    if (level.atlas) {
      additionalFiles[`${id}.uv.json`] = JSON.stringify(level.atlas, null, 2);
      for (const page of level.atlas.pages)
        additionalFiles[`${id}.atlas-${page.id}.svg`] = atlasSVG(
          level,
          page.id,
        );
    }
    const result = await exportLevel(level, {
      formats,
      output: resolve(values.out ?? "generated/vector"),
      sourceFile,
      additionalFiles,
      signal: abort.signal,
      onProgress: console.log,
      blender: values.blender,
      qbsp: values.qbsp,
      vis: values.vis,
      light: values.light,
      quakePalette: values["quake-palette"] ?? process.env.QUAKE_PALETTE_PATH,
    });
    console.log(
      JSON.stringify(
        { passed: report.passed, stats: level.stats, ...result },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
