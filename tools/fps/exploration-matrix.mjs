import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { explore } from "../../src/generate/exploration/index.ts";

const output = resolve(process.argv[2] ?? "generated/exploration-matrix");
await mkdir(output);
const profiles = [
  { id: "loops", targets: { cycles: 2, crossings: 0, lengthVariation: .25 }, elevations: [0, 4] },
  { id: "overlap", targets: { cycles: 3, crossings: 2, lengthVariation: .4 }, elevations: [0, 4, 8] },
  { id: "mobility", targets: { cycles: 2, crossings: 1, lengthVariation: .6 }, profile: { modes: ["walk", "ramp", "stairs", "ladder", "drop", "jump", "vent"] } },
];
const sources = {};
for (const name of (await readdir("src/generate/exploration")).sort()) if (name.endsWith(".ts")) sources[name] = createHash("sha256").update(await readFile(`src/generate/exploration/${name}`)).digest("hex");
const runs = [];
for (let seed = 1; seed <= 8; seed++) for (const { id, ...profile } of profiles) {
  const input = { seed: `shipyard-${String(seed).padStart(2, "0")}`, ...profile };
  try {
    const packet = explore(input);
    await writeFile(resolve(output, `${seed}-${id}.json`), JSON.stringify(packet));
    runs.push({ seed: input.seed, profile: id, budget: packet.config.proposals * packet.config.restarts,
      candidates: packet.candidates.map(c => ({ id: c.id, nodes: c.graph.nodes.length, edges: c.graph.edges.length, deficits: c.metrics.deficits, signature: c.signature })),
      realizations: packet.realizations.map(r => ({ id: r.id, issues: r.issues, transfers: r.transfers, realizedDeficits: r.realizedMetrics.deficits, mobility: r.mobility })) });
  } catch (error) { runs.push({ seed: input.seed, profile: id, failed: String(error) }); }
  await writeFile(resolve(output, "report.json"), JSON.stringify({ sources, expectedRuns: 24, runs }, null, 2));
  process.stderr.write(`${input.seed} / ${id}: retained\n`);
}
console.log(JSON.stringify({ output, runs: runs.length, errors: runs.filter(r => r.failed).length,
  candidates: runs.reduce((sum, r) => sum + (r.candidates?.length ?? 0), 0),
  unmet: runs.flatMap(r => r.candidates ?? []).filter(c => c.deficits.length).length }));
