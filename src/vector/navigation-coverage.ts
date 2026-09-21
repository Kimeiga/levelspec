import { cross, sub } from "./geometry.ts";
import {
  aborted,
  type CompiledLevel,
  type FloorPatch,
  type NavigationBlockReason,
  type NavigationCoverage,
  type NavigationOptions,
  type V3,
} from "./types.ts";

type Triangle = {
  a: V3;
  b: V3;
  c: V3;
  mesh?: string;
  obstacle?: boolean;
  floor?: FloorPatch;
  slope?: number;
};
const BIN = 2;
const EPS = 1e-5;

/** XY bins retain every Z interval. Stacked surfaces must never share a height sample. */
class TriangleIndex {
  cells = new Map<string, Triangle[]>();
  add(t: Triangle) {
    const xs = [t.a[0], t.b[0], t.c[0]],
      ys = [t.a[1], t.b[1], t.c[1]];
    for (
      let x = Math.floor(Math.min(...xs) / BIN);
      x <= Math.floor(Math.max(...xs) / BIN);
      x++
    )
      for (
        let y = Math.floor(Math.min(...ys) / BIN);
        y <= Math.floor(Math.max(...ys) / BIN);
        y++
      ) {
        const k = `${x},${y}`,
          list = this.cells.get(k) ?? [];
        list.push(t);
        this.cells.set(k, list);
      }
  }
  at(x: number, y: number) {
    return (
      this.cells.get(`${Math.floor(x / BIN)},${Math.floor(y / BIN)}`) ?? []
    );
  }
  around(x: number, y: number, radius: number) {
    const all = new Set<Triangle>();
    for (
      let ix = Math.floor((x - radius) / BIN);
      ix <= Math.floor((x + radius) / BIN);
      ix++
    )
      for (
        let iy = Math.floor((y - radius) / BIN);
        iy <= Math.floor((y + radius) / BIN);
        iy++
      )
        for (const t of this.cells.get(`${ix},${iy}`) ?? []) all.add(t);
    return all;
  }
}
function zAt(t: Triangle, x: number, y: number) {
  const { a, b, c } = t,
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(d) < 1e-12) return undefined;
  const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d,
    v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
  if (u < -EPS || v < -EPS || u + v > 1 + EPS) return undefined;
  return u * a[2] + v * b[2] + (1 - u - v) * c[2];
}
function closest(at: V3, a: V3, b: V3) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = dx * dx + dy * dy,
    t = l
      ? Math.max(
          0,
          Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / l),
        )
      : 0;
  const x = a[0] + t * dx - at[0],
    y = a[1] + t * dy - at[1];
  return {
    x,
    y,
    d: Math.hypot(x, y),
    dx,
    dy,
    interior: t > EPS && t < 1 - EPS,
  };
}

/** Audit required floor samples independently of the surviving Recast polygons. */
export function auditNavigationCoverage(
  level: CompiledLevel,
  options: NavigationOptions,
  locate: (
    at: V3,
    distance: number,
    region: string,
  ) => { position: V3; reachable: boolean } | undefined,
): NavigationCoverage {
  const p = level.document.player,
    cell = options.cell ?? 0.125,
    ch = options.cellHeight ?? 0.05,
    spacing = options.sampleSpacing ?? 0.5,
    mesh = new TriangleIndex(),
    floors = new TriangleIndex();
  const triangles: Triangle[] = [],
    obstacleMeshes = new Set<string>();
  for (let i = 0; i < level.mesh.indices.length; i += 3) {
    const surface = level.surfaces[level.mesh.surfaces[i / 3]];
    if (surface.collidable === false || (surface.dynamic && !options.sealed)) continue;
    if (surface.kind === "wall" || surface.kind === "prop")
      obstacleMeshes.add(surface.mesh);
    const [a, b, c] = level.mesh.indices
      .slice(i, i + 3)
      .map((v) => level.mesh.positions.slice(v * 3, v * 3 + 3) as V3);
    mesh.add({
      a,
      b,
      c,
      mesh: surface.mesh,
      obstacle: surface.kind === "wall" || surface.kind === "prop",
    });
  }
  for (const floor of level.floors)
    for (const indices of floor.triangles) {
      const [a, b, c] = indices.map((i) => floor.points[i]),
        n = cross(sub(b, a), sub(c, a));
      if (Math.abs(n[2]) < 1e-12) continue;
      const t = {
        a,
        b,
        c,
        floor,
        slope:
          (Math.atan2(Math.hypot(n[0], n[1]), Math.abs(n[2])) * 180) / Math.PI,
      };
      triangles.push(t);
      floors.add(t);
    }
  const report: NavigationCoverage = {
      sampleSpacing: spacing,
      sampled: 0,
      covered: 0,
      excluded: 0,
      uncoveredCount: 0,
      uncovered: [],
      regions: [],
    },
    rows = new Map<string, NavigationCoverage["regions"][number]>(),
    seen = new Set<string>();
  const excessiveSteps = new Set<string>();
  for (const region of level.document.layers
    .flatMap((l) => l.regions)
    .filter((r) => r.fill === "stairs")) {
    const heights = [
      ...new Set([
        ...level.floors
          .filter((f) => f.region === region.id)
          .flatMap((f) => f.points.map((v) => Math.round(v[2] * 1e6) / 1e6)),
        ...(region.lower
          ? (level.curves[region.lower]?.map((v) => v[2]) ?? [])
          : []),
      ]),
    ].sort((a, b) => a - b);
    if (heights.some((z, i) => i > 0 && z - heights[i - 1] > p.step + EPS))
      excessiveSteps.add(region.id);
  }
  for (const f of level.floors)
    if (!rows.has(f.region))
      rows.set(f.region, {
        region: f.region,
        sampled: 0,
        covered: 0,
        excluded: 0,
        uncovered: 0,
        reasons: {},
      });
  const supported = (
    x: number,
    y: number,
    z: number,
    tolerance = p.step + ch,
  ) =>
    floors.at(x, y).some((t) => {
      const h = zAt(t, x, y);
      return h !== undefined && Math.abs(h - z) <= tolerance + EPS;
    });
  const occupied = (x: number, y: number, z: number) => {
    const hits = new Map<string, number[]>();
    for (const tri of mesh.at(x, y)) {
      const h = zAt(tri, x, y);
      if (h === undefined || h <= z + 0.03) continue;
      const values = hits.get(tri.mesh!) ?? [];
      if (!values.some((v) => Math.abs(v - h) < EPS)) values.push(h);
      hits.set(tri.mesh!, values);
    }
    return [...hits.values()].some((h) => h.length % 2 === 1);
  };
  function inspect(at: V3, t: Triangle) {
    const f = t.floor!,
      key = `${f.region}:${at.map((v) => Math.round(v * 1e6)).join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    if ((seen.size & 511) === 0) aborted(options.signal);
    const row = rows.get(f.region)!;
    row.sampled++;
    report.sampled++;
    const excluded = () => {
      row.excluded++;
      report.excluded++;
    };
    const fail = (reason: NavigationBlockReason, clearance?: number) => {
      row.uncovered++;
      report.uncoveredCount++;
      row.reasons[reason] = (row.reasons[reason] ?? 0) + 1;
      if (report.uncovered.length < 2048)
        report.uncovered.push({
          region: f.region,
          position: at,
          reason,
          ...(clearance === undefined ? {} : { clearance }),
        });
    };
    const hits = new Map<string, number[]>();
    let ceiling = Infinity;
    for (const tri of mesh.at(at[0], at[1])) {
      const z = zAt(tri, at[0], at[1]);
      if (z === undefined) continue;
      if (z > at[2] + 0.06) ceiling = Math.min(ceiling, z - at[2]);
      if (z > at[2] + 0.03) {
        const h = hits.get(tri.mesh!) ?? [];
        if (!h.some((v) => Math.abs(v - z) < EPS)) h.push(z);
        hits.set(tri.mesh!, h);
      }
    }
    // A sample inside any solid (including the next stair tread at a shared edge)
    // is not exposed playable ground.
    if ([...hits.values()].some((h) => h.length % 2 === 1)) {
      excluded();
      return;
    }
    // Walls and props can overhang an adjacent lower tread by less than one
    // step. Their low solid footprint is still an obstacle, not an advertised
    // underpass. Keep floor slabs and ceilings out of this classification, and
    // retain headroom failures for beams whose undersides are above step height.
    if (
      [...hits].some(
        ([id, heights]) =>
          obstacleMeshes.has(id) &&
          Math.min(...heights) - at[2] <= p.step + EPS,
      )
    ) {
      excluded();
      return;
    }
    if ((t.slope ?? 0) > p.slope + 0.1) {
      fail("slope");
      return;
    }
    if (ceiling < p.height - ch * 0.5) {
      // A ray precisely on a vertical union edge may count two different top
      // elevations. Probe a sub-millimetre neighborhood before calling that edge
      // an overhead obstruction; an exposed beam still has even entry/exit hits.
      const e = cell * 0.001;
      if (
        [
          [e, 0],
          [-e, 0],
          [0, e],
          [0, -e],
        ].some(([dx, dy]) => occupied(at[0] + dx, at[1] + dy, at[2]))
      ) {
        excluded();
        return;
      }
      fail("headroom", ceiling);
      return;
    }
    if (excessiveSteps.has(f.region)) {
      fail("step");
      return;
    }
    const nav = locate(at, p.radius + cell, f.region);
    if (nav?.reachable) {
      row.covered++;
      report.covered++;
      return;
    }

    // A floor boundary is a margin only when it has no supported continuation.
    // Height-compatible adjacent regions/treads do not erase step or gap failures.
    const limits: ReturnType<typeof closest>[] = [];
    let step = false;
    const margin = p.radius + cell * 2;
    for (const loop of f.loops)
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i],
          b = loop[(i + 1) % loop.length],
          near = closest(at, a, b);
        if (near.d > margin || near.d < EPS) continue;
        const x = at[0] + near.x * (1 + cell / near.d),
          y = at[1] + near.y * (1 + cell / near.d);
        if (supported(x, y, at[2])) continue;
        if (
          floors.at(x, y).some((t) => {
            const z = zAt(t, x, y);
            return (
              z !== undefined &&
              Math.abs(z - at[2]) > p.step + ch &&
              Math.abs(z - at[2]) < p.height
            );
          })
        )
          step = true;
        limits.push(near);
      }
    // Wall faces account for thickness, freestanding partitions and cover beside a route.
    for (const tri of mesh.around(at[0], at[1], margin)) {
      if (!tri.obstacle) continue;
      const z = at[2] + Math.min(p.height * 0.5, 0.75),
        vertices = [tri.a, tri.b, tri.c],
        crossings: V3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = vertices[i],
          b = vertices[(i + 1) % 3];
        if ((a[2] <= z && b[2] > z) || (b[2] <= z && a[2] > z)) {
          const u = (z - a[2]) / (b[2] - a[2]);
          crossings.push([
            a[0] + u * (b[0] - a[0]),
            a[1] + u * (b[1] - a[1]),
            z,
          ]);
        }
      }
      if (crossings.length === 2) {
        const q = closest(at, crossings[0], crossings[1]);
        if (q.d <= margin && q.d > EPS) limits.push(q);
      }
    }
    // Two almost parallel opposing sides identify a tight passage. A sharp corner
    // or the endpoint of a partition is an ordinary capsule margin, not a hallway.
    const narrow = limits.some(
      (a, i) =>
        a.interior &&
        limits
          .slice(i + 1)
          .some(
            (b) =>
              b.interior &&
              Math.abs(a.dx * b.dx + a.dy * b.dy) >
                0.98 * Math.hypot(a.dx, a.dy) * Math.hypot(b.dx, b.dy) &&
              (a.x * b.x + a.y * b.y) / (a.d * b.d) < -0.7 &&
              a.d + b.d < 2 * p.radius + cell,
          ),
    );
    if (narrow) {
      fail("width");
      return;
    }
    if (step) {
      fail("step");
      return;
    }
    if (limits.length) {
      excluded();
      return;
    }
    fail(nav ? "disconnected" : "uncovered");
  }
  // Sample the authored surface, not nav centroids: partial low ceilings cannot disappear.
  for (const t of triangles) {
    const minX = Math.min(t.a[0], t.b[0], t.c[0]),
      maxX = Math.max(t.a[0], t.b[0], t.c[0]),
      minY = Math.min(t.a[1], t.b[1], t.c[1]),
      maxY = Math.max(t.a[1], t.b[1], t.c[1]);
    let count = 0;
    for (
      let ix = Math.ceil(minX / spacing - 0.5);
      (ix + 0.5) * spacing <= maxX + EPS;
      ix++
    )
      for (
        let iy = Math.ceil(minY / spacing - 0.5);
        (iy + 0.5) * spacing <= maxY + EPS;
        iy++
      ) {
        const x = (ix + 0.5) * spacing,
          y = (iy + 0.5) * spacing,
          z = zAt(t, x, y);
        if (z !== undefined) {
          inspect([x, y, z], t);
          count++;
        }
      }
    // Small triangles and thin corridors still receive an independent sample.
    if (!count)
      inspect(
        [
          (t.a[0] + t.b[0] + t.c[0]) / 3,
          (t.a[1] + t.b[1] + t.c[1]) / 3,
          (t.a[2] + t.b[2] + t.c[2]) / 3,
        ],
        t,
      );
  }
  report.regions = [...rows.values()];
  return report;
}
