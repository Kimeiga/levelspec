import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { diagram, explore } from "../../src/generate/exploration/index.ts";

const output = resolve(process.argv[2] ?? "generated/complexity-comparison");
await mkdir(output);
const profiles = [
  { id: "connectivity", label: "Connectivity targets only", targets: { decisionDepth: 0, territories: 0, stackedRegions: 0 } },
  { id: "staged", label: "Developed regions and journeys", targets: { decisionDepth: 2, territories: 3, stackedRegions: 0 } },
  { id: "layered", label: "Add a stacked region pair", targets: { decisionDepth: 2, territories: 3, stackedRegions: 1 } },
];
const sources = {};
for (const name of (await readdir("src/generate/exploration")).sort()) if (name.endsWith(".ts")) sources[name] = createHash("sha256").update(await readFile(`src/generate/exploration/${name}`)).digest("hex");
const runs = [], cards = [];
for (let seed = 1; seed <= 4; seed++) for (const profile of profiles) {
  const id = `${seed}-${profile.id}`, started = performance.now();
  const packet = explore({ seed: `complexity-${String(seed).padStart(2, "0")}`, restarts: 2, proposals: 1200, targets: profile.targets });
  await writeFile(resolve(output, `${id}.json`), JSON.stringify(packet));
  const candidates = packet.candidates.map(c => ({ id: c.id, nodes: c.graph.nodes.length, edges: c.graph.edges.length,
    regions: c.metrics.structure.territories.length, depth: c.metrics.structure.journeys.map(j => j.depth), stacked: c.metrics.structure.stacked.length,
    penalty: c.metrics.penalty, deficits: c.metrics.deficits }));
  runs.push({ id, seed: packet.config.seed, profile: profile.id, seconds: (performance.now() - started) / 1000, candidates,
    realizations: packet.realizations.map(r => ({ id: r.id, issues: r.issues, structure: r.realizedMetrics.structure })) });
  const first = packet.candidates[0], plan = packet.realizations.find(r => r.candidate === first.id && r.interpretation === "galleries");
  cards.push(`<article data-seed="${seed}"><h2>${profile.label}</h2><p>${packet.config.seed} · fixed 2 × 1,200 proposal budget</p>${diagram(first.graph, packet.config)}<p>${candidates[0].nodes} areas · ${candidates[0].regions} developed regions · depth ${candidates[0].depth.join("/")} · ${candidates[0].stacked} stacked pairs</p><details open><summary>Local shared-volume interpretation</summary>${diagram(first.graph, packet.config, plan)}</details><p>${first.metrics.deficits.length} unmet graph demands · ${plan.issues.length} geometry follow-ups. Premap, not gameplay-validated.</p><details><summary>Retained alternative</summary>${packet.candidates.slice(1).map(c => diagram(c.graph, packet.config)).join("")}</details><a href="${id}.json">Import this packet in the lab</a></article>`);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ sources, fixedBudget: 2400, profiles, runs }, null, 2));
  process.stderr.write(`${id}: ${candidates.map(c => `${c.nodes} areas/depth ${c.depth}`).join("; ")}\n`);
}
await writeFile(resolve(output, "index.html"), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FPS exploration structure comparison</title><style>body{margin:0;padding:32px;background:#101c22;color:#e1e9e6;font:16px/1.5 system-ui}header{max-width:1050px;margin-bottom:28px}h1{font-size:34px;margin:0}h2{font-size:20px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{border:1px solid #405255;padding:18px;border-radius:12px;background:#1a2b31}svg{width:100%;display:block}p{color:#b7c8c8}a{color:#acd9cd}summary{cursor:pointer}@media(max-width:850px){main{grid-template-columns:1fr}}</style><header><h1>From connectivity to developed journeys</h1><p>Same engine, same seed and budget in each row. Only structural demands differ. These are planning alternatives, not quality rankings or finished maps. Colored groups are proposed territories. Spatial interpretations preserve separate local envelopes and report choices lost to shared floors.</p><p><a href="http://127.0.0.1:63302/">Open editable exploration lab</a></p></header><main>${cards.join("")}</main>`);
console.log(JSON.stringify({ output, runs: runs.length, candidates: runs.flatMap(r => r.candidates).length }));
