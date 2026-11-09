import type {Diagnostic} from "../vector/types.ts";

/** A native publication failure with machine-readable diagnostics. */
export class ProducerValidationError extends Error {
  readonly stage: "source" | "architecture";
  readonly diagnostics: readonly Pick<Diagnostic, "severity" | "code" | "message" | "objects">[];
  constructor(stage: "source" | "architecture", diagnostics: ProducerValidationError["diagnostics"]) {
    super(`${stage} validation failed: ${diagnostics.filter(d => d.severity === "error").map(d => `${d.code}: ${d.message}`).join("; ")}`);
    this.name = "ProducerValidationError";
    this.stage = stage;
    this.diagnostics = diagnostics;
  }
}

