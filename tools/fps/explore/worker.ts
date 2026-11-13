import { ExplorationSearch, INTERPRETATIONS, parsePacket, realize, VERSION } from "../../../src/generate/exploration/index.ts";
import type { ConfigInput, ExplorationPacket } from "../../../src/generate/exploration/types.ts";

/** A dedicated run worker is terminated on cancellation; request IDs also reject already queued replies. */
self.onmessage = async (event: MessageEvent<{ id: number; config?: ConfigInput; packet?: string }>) => {
  const { id, config, packet } = event.data;
  try {
    if (packet !== undefined) { self.postMessage({ id, kind: "result", packet: parsePacket(packet) }); return; }
    const search = new ExplorationSearch(config);
    while (!search.done) {
      search.step(50);
      self.postMessage({ id, kind: "progress", attempted: search.attempted, total: search.config.proposals * search.config.restarts });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const candidates = search.finish();
    const result: ExplorationPacket = { version: VERSION, config: search.config, candidates, realizations: [] };
    for (const candidate of candidates) for (const interpretation of INTERPRETATIONS) {
      result.realizations.push(realize(candidate, search.config, interpretation));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    self.postMessage({ id, kind: "result", packet: result });
  } catch (error) { self.postMessage({ id, kind: "error", message: error instanceof Error ? error.message : String(error) }); }
};
