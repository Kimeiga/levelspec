import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { diagram, explore, parsePacket } from "../../src/generate/exploration/index.ts";
import type { ConfigInput, ExplorationPacket } from "../../src/generate/exploration/types.ts";

/** Writes a new immutable experiment directory. Existing AI-authored sources are never replaced. */
export async function writeExperiment(packet: ExplorationPacket, destination: string): Promise<void> {
  await mkdir(destination, { recursive: false });
  await writeFile(resolve(destination, "experiment.json"), JSON.stringify(packet, null, 2) + "\n");
  for (const candidate of packet.candidates) {
    await writeFile(resolve(destination, `${candidate.id}.svg`), diagram(candidate.graph, packet.config));
    for (const spatial of packet.realizations.filter(r => r.candidate === candidate.id)) {
      await writeFile(resolve(destination, `${spatial.id}.aml`), spatial.aml);
      await writeFile(resolve(destination, `${spatial.id}.svg`), diagram(candidate.graph, packet.config, spatial));
    }
  }
}

/** Runs the same engine as the browser. Diagnostics go to stderr and the result to stdout. */
async function main(): Promise<void> {
  const args = process.argv.slice(2), options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!["--config", "--seed", "--out", "--replay", "--proposals", "--restarts", "--verticality"].includes(args[i]) || !args[i + 1]) throw new Error("Usage: npm run explore -- --out <new-directory> [--config file.json] [--seed text] [--verticality 0..1] [--proposals 2000] [--restarts 4] [--replay experiment.json]");
    options.set(args[i], args[i + 1]);
  }
  if (!options.has("--out")) throw new Error("--out must name a new experiment directory");
  const input: ConfigInput = options.has("--config") ? JSON.parse(await readFile(options.get("--config")!, "utf8")) : {};
  if (options.has("--seed")) input.seed = options.get("--seed");
  if (options.has("--proposals")) input.proposals = Number(options.get("--proposals"));
  if (options.has("--restarts")) input.restarts = Number(options.get("--restarts"));
  if (options.has("--verticality")) input.verticality = Number(options.get("--verticality"));
  process.stderr.write("Exploring deterministic graph and spatial alternatives…\n");
  const packet = options.has("--replay") ? parsePacket(await readFile(options.get("--replay")!, "utf8")) : explore(input);
  const out = resolve(options.get("--out")!);
  await writeExperiment(packet, out);
  process.stdout.write(JSON.stringify({ out, version: packet.version, seed: packet.config.seed,
    proposals: packet.config.restarts * packet.config.proposals,
    candidates: packet.candidates.map(c => ({ id: c.id, deficits: c.metrics.deficits })),
    interpretations: packet.realizations.length, publication: "premap" }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
