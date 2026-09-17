/** Isolated v1 adapter: resolve implicit geometry once, then emit native SVGX. */
import { compile as compileLegacy } from "../../src/core/compiler.ts";
import { decomposeToRects, unkey } from "../../src/core/grid.ts";
import { planToSpec } from "../../src/authoring/plan.ts";
import type { LevelSpec } from "../../src/core/types.ts";
import {
  createDocument,
  type Layer,
  type V3,
  type EdgeKind,
} from "../../src/vector/types.ts";
import { serializeLevelSvgx } from "../../src/vector/format.ts";
export function migrateSpec(spec: LevelSpec) {
  const old = compileLegacy(spec),
    d = createDocument(spec.id);
  d.name = spec.name;
  d.description = spec.description;
  d.expectFail = spec.expect_fail;
  d.wallThickness = spec.wall_thickness ?? 0.22;
  d.floorThickness = spec.floor_thickness ?? 0.2;
  d.player = { ...d.player, ...spec.player };
  const used = new Set([d.id]);
  const id = (s: string) => {
    let base = s.replace(/[^\w.:/-]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) base = "id_" + base;
    let result = base,
      i = 1;
    while (used.has(result)) result = `${base}.${i++}`;
    used.add(result);
    return result;
  };
  const layers = new Map<string, Layer>();
  for (const l of spec.layers) {
    const layer: Layer = {
      id: id(l.id),
      label: l.label,
      vertices: [],
      edges: [],
      regions: [],
    };
    layers.set(l.id, layer);
    d.layers.push(layer);
  }
  const vertices = new Map<string, string>(),
    edges = new Map<string, { id: string; from: string; to: string }>();
  const vertex = (l: Layer, p: V3) => {
    const key = `${l.id}:${p.join(",")}`;
    if (vertices.has(key)) return vertices.get(key)!;
    const v = id(`v${vertices.size}`);
    l.vertices.push({ id: v, x: p[0], y: p[1], z: p[2] });
    vertices.set(key, v);
    return v;
  };
  const edge = (l: Layer, a: string, b: string) => {
    const key = `${l.id}:${[a, b].sort().join("|")}`,
      existing = edges.get(key);
    if (existing) return existing.from === a ? existing.id : `-${existing.id}`;
    const e = {
      id: id(`e${edges.size}`),
      from: a,
      to: b,
      kind: "open" as const,
      openings: [],
    };
    edges.set(key, e);
    l.edges.push(e);
    return e.id;
  };
  for (const s of old.solids) {
    const l = layers.get(s.layer) ?? d.layers[0];
    if (!l) continue;
    const [x, y, z] = s.box.min,
      [X, Y, Z] = s.box.max;
    const owner = s.spaces.filter((x) => x !== "__outside__").join("/") || s.id;
    if (["floor", "ramp", "stair"].includes(s.role) && !s.dynamic) {
      const rectangles: { bounds: number[]; area: string }[] = [];
      if (s.role === "floor") {
        const groups = new Map<string, Set<string>>(),
          g = spec.grid ?? 1;
        for (const [cell, space] of old.occupancy.get(s.layer) ?? []) {
          const [cx, cy] = unkey(cell);
          if (
            (cx + 1) * g <= x ||
            cx * g >= X ||
            (cy + 1) * g <= y ||
            cy * g >= Y
          )
            continue;
          const set = groups.get(space) ?? new Set<string>();
          set.add(cell);
          groups.set(space, set);
        }
        for (const [area, cells] of groups)
          for (const [cx, cy, w, h] of decomposeToRects(cells))
            rectangles.push({
              area,
              bounds: [
                Math.max(x, cx * g),
                Math.max(y, cy * g),
                Math.min(X, (cx + w) * g),
                Math.min(Y, (cy + h) * g),
              ],
            });
      } else
        rectangles.push({
          area: s.id.replace(/_(?:step|slice)_\d+$/, ""),
          bounds: [x, y, X, Y],
        });
      for (const {
        area,
        bounds: [x, y, X, Y],
      } of rectangles) {
        const points: V3[] = [
            [x, y, Z],
            [X, y, Z],
            [X, Y, Z],
            [x, Y, Z],
          ],
          vs = points.map((p) => vertex(l, p));
        l.regions.push({
          id: id(s.id),
          label: s.label ?? area,
          area,
          role: s.role,
          fill: "floor",
          boundary: vs.map((v, i) => edge(l, v, vs[(i + 1) % 4])),
          holes: [],
          interior: [],
          creases: [],
          thickness: Z - z,
        });
      }
    } else if (
      [
        "static_hard",
        "exterior_wall",
        "soft_panel",
        "glass",
        "reinforcement_slot",
        "sill",
        "lintel",
        "riser",
      ].includes(s.role)
    ) {
      // A resolved wall strip remains an editable vector edge; independent ends
      // retain v1's exact junction allocation instead of applying new joins.
      const vertical = X - x < Y - y,
        a: V3 = vertical ? [(x + X) / 2, y, z] : [x, (y + Y) / 2, z],
        b: V3 = vertical ? [(x + X) / 2, Y, z] : [X, (y + Y) / 2, z],
        from = id(`${s.id}.a`),
        to = id(`${s.id}.b`);
      l.vertices.push(
        { id: from, x: a[0], y: a[1], z: a[2] },
        { id: to, x: b[0], y: b[1], z: b[2] },
      );
      l.edges.push({
        id: id(s.id),
        label: `${s.role}: ${owner}`,
        from,
        to,
        kind: (s.dynamic
          ? s.role === "glass"
            ? "glass"
            : "soft"
          : "wall") as EdgeKind,
        height: Z - z,
        thickness: Math.min(X - x, Y - y),
        openings: [],
      });
    } else
      d.covers.push({
        id: id(s.id),
        label: s.label ?? owner,
        layer: l.id,
        min: [x, y, z],
        max: [X, Y, Z],
        dynamic: s.dynamic,
        role: s.role,
      });
  }
  // Resolve every same-height crossing into explicit shared junctions once.
  // Different heights remain separate vector networks even at coincident XY.
  for (const l of d.layers) {
    const byId = new Map(l.vertices.map((v) => [v.id, v]));
    const cuts = new Map(
      l.edges.map((e) => [
        e.id,
        [
          { t: 0, id: e.from },
          { t: 1, id: e.to },
        ],
      ]),
    );
    for (let i = 0; i < l.edges.length; i++)
      for (let j = i + 1; j < l.edges.length; j++) {
        const a = l.edges[i],
          b = l.edges[j],
          A = byId.get(a.from)!,
          B = byId.get(a.to)!,
          C = byId.get(b.from)!,
          D = byId.get(b.to)!,
          dx = B.x - A.x,
          dy = B.y - A.y,
          ex = D.x - C.x,
          ey = D.y - C.y,
          den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((C.x - A.x) * ey - (C.y - A.y) * ex) / den,
          u = ((C.x - A.x) * dy - (C.y - A.y) * dx) / den;
        if (t <= 1e-7 || t >= 1 - 1e-7 || u <= 1e-7 || u >= 1 - 1e-7) continue;
        const z = A.z + t * (B.z - A.z);
        if (Math.abs(z - C.z - u * (D.z - C.z)) > 1e-7) continue;
        const v = vertex(l, [A.x + t * dx, A.y + t * dy, z]);
        cuts.get(a.id)!.push({ t, id: v });
        cuts.get(b.id)!.push({ t: u, id: v });
      }
    const replacements = new Map<string, string[]>(),
      next: typeof l.edges = [];
    for (const e of l.edges) {
      const c = cuts
          .get(e.id)!
          .sort((a, b) => a.t - b.t)
          .filter((v, i, a) => i === 0 || Math.abs(v.t - a[i - 1].t) > 1e-7),
        parts: string[] = [];
      for (let i = 1; i < c.length; i++) {
        const part = i === 1 ? e.id : id(e.id + ".part" + i);
        parts.push(part);
        next.push({ ...e, id: part, from: c[i - 1].id, to: c[i].id });
      }
      replacements.set(e.id, parts);
    }
    const rewrite = (refs: string[]) =>
      refs.flatMap((ref) =>
        ref.startsWith("-")
          ? [...replacements.get(ref.slice(1))!].reverse().map((x) => "-" + x)
          : replacements.get(ref)!,
      );
    for (const r of l.regions) {
      r.boundary = rewrite(r.boundary);
      r.holes = r.holes.map(rewrite);
    }
    l.edges = next;
  }
  d.markers = old.markers.map((m) => ({
    id: id(m.id),
    label: m.label,
    layer: layers.get(m.layer)!.id,
    position: m.pos,
    kind: m.kind,
    team: m.team,
    region: old.nav.nodes.find(
      (n) =>
        n.layer === m.layer &&
        n.cell[0] === m.cell[0] &&
        n.cell[1] === m.cell[1],
    )?.space,
  }));
  const markerIds = new Map(old.markers.map((m, i) => [m.id, d.markers[i].id]));
  d.routes = (spec.gameplay?.required_routes ?? []).map((r) => ({
    id: id(r.id),
    from: markerIds.get(r.from) ?? r.from,
    to: markerIds.get(r.to) ?? r.to,
    minRoutes: r.min_routes ?? 1,
    minDistance: r.min_distance,
    maxDistance: r.max_distance,
  }));
  d.noSpawnLos = (spec.gameplay?.no_spawn_los ?? []).map(([a, b]) => [
    markerIds.get(a) ?? a,
    markerIds.get(b) ?? b,
  ]);
  const connected = new Set<string>();
  for (const e of old.nav.edges) {
    const a = old.nav.nodes[e.a],
      b = old.nav.nodes[e.b];
    if (a.space === b.space && a.layer === b.layer) continue;
    const key =
      [`${a.layer}:${a.space}`, `${b.layer}:${b.space}`].sort().join("|") +
      ":" +
      (e.via ?? e.kind);
    if (connected.has(key)) continue;
    connected.add(key);
    d.links.push({
      id: id(e.via ?? `link${d.links.length}`),
      from: a.pos,
      to: b.pos,
      kind: e.kind,
      bidirectional: true,
    });
  }
  return { document: d, legacy: old, text: serializeLevelSvgx(d) };
}
export function migrateText(text: string, json = false) {
  return migrateSpec(json ? JSON.parse(text) : planToSpec(text));
}
