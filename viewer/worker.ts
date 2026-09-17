import {
  compile,
  parseLevelSvgx,
  generateUVs,
  validateForRuntime,
  SvgxError,
} from "../src/vector/index.ts";
self.onmessage = async (event: MessageEvent) => {
  const { id, text, uvs } = event.data;
  try {
    const level = await compile(parseLevelSvgx(text), {
      onProgress: (stage) => self.postMessage({ id, stage }),
      onGeometry: (geometry) =>
        self.postMessage({ id, level: geometry, stage: "Geometry ready" }),
    });
    if (
      level.diagnostics.some((d) => d.severity === "error") &&
      !level.navigation
    ) {
      self.postMessage({
        id,
        level,
        report: { passed: false, diagnostics: level.diagnostics },
        stage: "Geometry needs attention",
      });
      return;
    }
    const report = await validateForRuntime(level, { sealed: true });
    self.postMessage({ id, level, report, stage: "Navigation ready" });
    if (uvs) {
      self.postMessage({ id, stage: "Generating lightmap atlas" });
      try {
        await generateUVs(level);
        self.postMessage({ id, level, report, stage: "UVs ready" });
      } catch (error) {
        self.postMessage({
          id,
          level,
          report,
          partial: "uv",
          error: `Lightmap UVs: ${(error as Error).message}`,
          stage: "Navigation ready · UV generation failed",
        });
        return;
      }
    }
    self.postMessage({ id, level, report, stage: "Ready" });
  } catch (error) {
    self.postMessage({
      id,
      error: (error as Error).message,
      diagnostics: error instanceof SvgxError ? error.diagnostics : undefined,
    });
  }
};
