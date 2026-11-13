import { Worker } from "node:worker_threads";
import { availableParallelism, totalmem } from "node:os";
import { SurfaceRasterJobError, type SurfaceRasterExecutor, type SurfaceRasterJob, type SurfaceRasterResult } from "../../src/dressing/surface/raster-execution.ts";
import { aborted } from "../../src/vector/types.ts";
import { rasterJobsHash, replayHash, type RasterReplayInput, type RasterWorkerInput, type RasterWorkerMessage } from "./raster-protocol.ts";

export interface RasterPoolReport {
  workers: number;
  /** Dispatched cache misses after receiver sharing; cached recipes are excluded. */
  jobs: number;
  /** Channel pixels in dispatched misses; excludes cached maps, source images and separately derived height normals. */
  texels: number;
  estimatedWorkingBytes: number;
}

/** Greedy assignment balances expected pixel/layer work while preserving each shard's recipe order. */
function partition(jobs: readonly SurfaceRasterJob[], count: number): number[][] {
  const shards = Array.from({ length: count }, () => ({ work: 0, indices: [] as number[] }));
  for (const job of [...jobs].sort((a, b) => b.estimatedWork - a.estimatedWork || a.index - b.index)) {
    const shard = shards.reduce((best, next) => next.work < best.work ? next : best);
    shard.indices.push(job.index); shard.work += job.estimatedWork;
  }
  return shards.map(shard => shard.indices.sort((a, b) => a - b));
}

/** A worker sends at most one unacknowledged result; error/exit always wakes a waiting consumer. */
function remoteResults(worker: Worker): AsyncIterableIterator<SurfaceRasterResult> {
  let message: RasterWorkerMessage | undefined, failure: Error | undefined, ended = false;
  let wake: (() => void) | undefined;
  worker.on("message", (value: RasterWorkerMessage) => { message = value; wake?.(); });
  worker.on("error", (error: Error) => { failure = error; wake?.(); });
  worker.on("exit", code => { ended = true; if (code && !failure) failure = new Error(`Raster worker exited with code ${code}.`); wake?.(); });
  return (async function* () {
    while (true) {
      while (!message && !failure && !ended) await new Promise<void>(resolve => { wake = resolve; });
      if (failure) throw failure;
      const received = message; message = undefined;
      if (!received) throw new Error("Raster worker exited before completing its assigned jobs.");
      if (received.kind === "done") return;
      if (received.kind === "error") throw new SurfaceRasterJobError(received.index, received.message);
      yield received.result;
      worker.postMessage("consumed");
    }
  })();
}

/**
 * Uses the main isolate plus bounded replay workers. One raw result per worker
 * remains outstanding, and the caller's frozen inputs are cloned, never detached.
 * The estimate reserves 1 GiB per scene replica plus input/raw/copy/encoder storage;
 * it is an admission estimate, not a hard bound on process RSS or native allocations.
 */
export function createRasterPool(input: RasterReplayInput, codeHash: string, requested: number | undefined,
  report?: (value: RasterPoolReport) => void) {
  const workers: Worker[] = [];
  let used = 1;
  let closing: Promise<void> | undefined;
  /** Terminates all replicas exactly once, including workers blocked on an ACK. */
  const dispose = (): Promise<void> => closing ??= Promise.all(workers.map(worker => worker.terminate())).then(() => {});
  const execute: SurfaceRasterExecutor = async function* (jobs, bake, context) {
    const byIndex = new Map(jobs.map(job => [job.index, job]));
    const largestRaw = jobs.reduce((largest, job) => Math.max(largest, job.texels * 4), 0);
    const inputBytes = input.images.reduce((sum, [, bytes]) => sum + bytes.byteLength, 0);
    const perReplica = 1024 ** 3 + inputBytes * 4 + largestRaw * 4;
    let count = Math.min(requested ?? (jobs.reduce((sum, job) => sum + job.texels, 0) >= 500_000 ? 4 : 1),
      availableParallelism(), Math.max(1, Math.floor(totalmem() / 2 / perReplica)), Math.max(1, jobs.length));
    let shards = partition(jobs, count);
    while (count > 1 && shards.reduce((sum, indices) => sum + indices.reduce((largest, index) => Math.max(largest, byIndex.get(index)!.scratchBytes), 0), 0) > context.maximumScratchBytes)
      shards = partition(jobs, --count);
    used = count;
    report?.({ workers: count, jobs: jobs.length, texels: jobs.reduce((sum, job) => sum + job.texels, 0), estimatedWorkingBytes: count * perReplica });
    if (count === 1) { for (const job of jobs) yield await bake(job.index); return; }
    const inputHash = replayHash(input), jobsHash = rasterJobsHash(context.fullPlan ?? jobs);
    const cancel = () => { void dispose(); };
    context.signal?.addEventListener("abort", cancel, { once: true });
    try {
      aborted(context.signal);
      const streams: AsyncIterator<SurfaceRasterResult>[] = [(async function* () {
        for (const index of shards[0]) yield await bake(index);
      })()];
      for (const indices of shards.slice(1)) {
        const workerData: RasterWorkerInput = { input, inputHash, codeHash, jobsHash, indices };
        const worker = new Worker(new URL("./raster-worker.ts", import.meta.url), {
          workerData, resourceLimits: { maxOldGenerationSizeMb: 1536 },
        });
        workers.push(worker); streams.push(remoteResults(worker));
      }
      const pending = new Map(streams.map((stream, index) => [index, stream.next().then(result => ({ index, result }))]));
      while (pending.size) {
        const { index, result } = await Promise.race(pending.values());
        pending.delete(index);
        aborted(context.signal);
        if (result.done) continue;
        yield result.value;
        pending.set(index, streams[index].next().then(result => ({ index, result })));
      }
    } finally {
      context.signal?.removeEventListener("abort", cancel);
      await dispose();
    }
  };
  return { execute, dispose, usedWorkers: () => used };
}
