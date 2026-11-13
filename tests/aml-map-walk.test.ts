import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, type V3 } from 'levelspec';
import { prepareInspectionWalk } from '../review/walk.ts';

for (const name of ['dust2', 'daiban']) {
  test(`${name} required routes replay through the existing constrained walker without waypoint teleportation`, async () => {
    const level = await compile(parseAml(await readFile(new URL(`../examples/${name}.aml`, import.meta.url), 'utf8')));
    const traces = [];
    for (const route of level.navigation!.routes) {
      assert.ok(route.path?.length && route.reachable, route.id);
      const path = route.path, prepared = prepareInspectionWalk(level, { feet: path[0], yaw: 0, pitch: 0 });
      assert.ok(prepared.ok, route.id);
      const surface = prepared.surface;
      let position = prepared.pose.feet, distance = 0;
      const trace: V3[] = [[...position]];
      for (const target of path.slice(1)) {
        let iterations = 0;
        while (Math.hypot(position[0] - target[0], position[1] - target[1]) > 1e-7) {
          assert.ok(++iterations < 10000, `${route.id} bounded progression`);
          const dx = target[0] - position[0], dy = target[1] - position[1], remaining = Math.hypot(dx, dy), scale = Math.min(.04, remaining) / remaining;
          const next = surface.move(position, dx * scale, dy * scale);
          const moved = Math.hypot(...next.map((n, i) => n - position[i]));
          assert.ok(moved > 1e-8, `${route.id} blocked at ${position}; target ${target}; locate ${JSON.stringify(surface.locate(target, false))}; reached ${surface.reachable.size}/${surface.triangles.length}`);
          distance += moved; position = next;
          if (iterations % 5 === 0) trace.push([...position]);
        }
      }
      trace.push([...position]);
      assert.ok(Math.hypot(...position.map((n, i) => n - path.at(-1)![i])) < .15, route.id);
      const authored = level.architecture.routes.find(r => r.id === route.id)!;
      assert.ok(distance <= authored.maxDistance! + 1e-5, `${route.id} actual movement ${distance} exceeds local limit ${authored.maxDistance}`);
      const start = prepareInspectionWalk(level, { feet: trace[0], yaw: 0, pitch: 0 });
      const end = prepareInspectionWalk(level, { feet: trace.at(-1)!, yaw: 0, pitch: 0 });
      assert.equal(start.ok, true, `${route.id} start capsule`); assert.equal(end.ok, true, `${route.id} end capsule`);
      traces.push({ route: route.id, distance, trace, checkpoints: { start: { ok: start.ok, pose: start.ok ? start.pose : undefined }, end: { ok: end.ok, pose: end.ok ? end.pose : undefined } } });
    }
    await mkdir('generated/aml-phase3-walks', { recursive: true });
    await writeFile(`generated/aml-phase3-walks/${name}.json`, JSON.stringify(traces, null, 2));
  });
}
