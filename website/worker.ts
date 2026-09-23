import {
  compile,
  parseLevelSvgx,
  validateForRuntime,
} from "../src/vector/index.ts";
import { toSVGPlan } from "../src/vector/export.ts";
import type { CompiledLevel, ValidationReport } from "../src/vector/types.ts";
export type BuildReply =
  | { id: number; type: "progress"; stage: string }
  | {
      id: number;
      type: "ready";
      level: CompiledLevel;
      report: ValidationReport;
      plan: string;
    }
  | { id: number; type: "error"; message: string };
self.onmessage = async (
  event: MessageEvent<{ id: number; source: string }>,
) => {
  const { id, source } = event.data;
  const send = (message: BuildReply) => self.postMessage(message);
  try {
    const document = parseLevelSvgx(source);
    const level = await compile(document, {
      onProgress: (stage) => send({ id, type: "progress", stage }),
    });
    const report = await validateForRuntime(level, { sealed: true });
    send({ id, type: "ready", level, report, plan: toSVGPlan(level) });
  } catch (error) {
    send({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "Compilation failed.",
    });
  }
};
