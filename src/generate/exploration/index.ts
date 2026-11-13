import { assertInvariants, normalizeConfig, VERSION } from "./config.ts";
import { diversitySignature, evaluateGraph } from "./metrics.ts";
import { search } from "./search.ts";
import { INTERPRETATIONS, realize } from "./spatial.ts";
import type { Candidate, ConfigInput, ExplorationPacket } from "./types.ts";
export * from "./types.ts";
export { normalizeConfig, VERSION } from "./config.ts";
export { ExplorationSearch, search } from "./search.ts";
export { realize, INTERPRETATIONS } from "./spatial.ts";
export { diagram } from "./presentation.ts";

/** Produces replayable graph alternatives and three spatial interpretations per graph. */
export function explore(input: ConfigInput = {}): ExplorationPacket {
  const { config, candidates } = search(input);
  return { version: VERSION, config, candidates,
    realizations: candidates.flatMap(candidate => INTERPRETATIONS.map(interpretation => realize(candidate, config, interpretation))) };
}

/** Reads experiment state, validates every retained graph, and recomputes derived evidence and AML. */
export function parsePacket(text: string): ExplorationPacket {
  if (text.length > 30_000_000) throw new Error("Experiment packet exceeds 30 MB");
  const packet = JSON.parse(text) as ExplorationPacket;
  if (packet.version !== VERSION) throw new Error(`Unsupported experiment version; expected ${VERSION}`);
  const config = normalizeConfig(packet.config);
  if (!Array.isArray(packet.candidates) || !packet.candidates.length || packet.candidates.length > config.restarts) throw new Error("Invalid candidate list");
  const ids = new Set<string>();
  const candidates: Candidate[] = packet.candidates.map(candidate => {
    if (!/^candidate-\d+-r\d+-p\d+$/.test(candidate.id) || ids.has(candidate.id)) throw new Error("Invalid or duplicate candidate identity");
    ids.add(candidate.id); assertInvariants(candidate.graph, config);
    if (!Array.isArray(candidate.trace) || !candidate.trace.length || candidate.trace.length > config.proposals + 2) throw new Error("Invalid trace length");
    let previous = -1;
    const trace = candidate.trace.map(frame => {
      assertInvariants(frame.graph, config);
      if (!Number.isInteger(frame.proposal) || frame.proposal < 0 || frame.proposal > config.proposals || typeof frame.mutation !== "string") throw new Error("Invalid trace frame");
      if (frame.proposal <= previous) throw new Error("Trace proposals must increase strictly");
      previous = frame.proposal;
      return { ...frame, metrics: evaluateGraph(frame.graph, config) };
    });
    const identity = /^candidate-(\d+)-r(\d+)-p(\d+)$/.exec(candidate.id)!;
    if (Number(identity[2]) < 1 || Number(identity[2]) > config.restarts || Number(identity[3]) !== trace.at(-1)!.proposal
      || trace[0].proposal !== 0 || JSON.stringify(trace[0].graph) !== JSON.stringify(config.initial)
      || JSON.stringify(trace.at(-1)!.graph) !== JSON.stringify(candidate.graph)) throw new Error("Candidate identity and trace endpoints disagree");
    const metrics = evaluateGraph(candidate.graph, config);
    return { id: candidate.id, graph: candidate.graph, proposals: config.proposals, trace, metrics,
      signature: diversitySignature(candidate.graph, metrics) };
  });
  return { version: VERSION, config, candidates,
    realizations: candidates.flatMap(candidate => INTERPRETATIONS.map(interpretation => realize(candidate, config, interpretation))) };
}
