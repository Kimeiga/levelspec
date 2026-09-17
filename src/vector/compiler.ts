import { normalizeCoordinates } from "./precision.ts";
import { auditFloorGaps } from "./floor-gaps.ts";
import { auditSurfaceContacts } from "./surface-contacts.ts";
import Module from "manifold-3d";
import { resolveWallProfile, wallFootHeight } from "./wall-profile.ts";
import { buildFlight, flightMaterialUV, type Flight } from "./flights.ts";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import {
  aborted,
  type LevelDocument,
  type CompiledLevel,
  type CompileOptions,
  type ExportSolid,
  type V3,
  type Diagnostic,
  type Surface,
  type MeshData,
  type Named,
  type FloorPatch,
  type MeshKind,
} from "./types.ts";
import {
  EPS,
  tessellate,
  triangulate,
  floorVolumeOverlap,
  heightAt,
  norm,
  cross,
  sub,
  dot,
  pathLength,
  pathAt,
  hash,
  orient,
  lerp,
} from "./geometry.ts";
let kernel: Promise<ManifoldToplevel> | undefined;
export function geometryKernel() {
  return (kernel ??= Module().then((m) => {
    m.setup();
    return m;
  }));
}
export const emptyMesh = (): MeshData => ({
  positions: [],
  normals: [],
  indices: [],
  uv: [],
  surfaces: [],
});
export async function compile(
  document: LevelDocument,
  options: CompileOptions = {},
): Promise<CompiledLevel> {
  aborted(options.signal);
  options.onProgress?.("Topology");
  const d = normalizeCoordinates(document),
    diagnostics: Diagnostic[] = [],
    curves: Record<string, V3[]> = {},
    flights = new Map<string, Flight>(),
    floors: FloorPatch[] = [],
    surfaces: Surface[] = [],
    mesh = emptyMesh();
  const err = (o: Named, message: string, code = "TOPOLOGY") =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      objects: [o.id],
      source: o.source,
    });
  for (const [name, value] of Object.entries({
    wallThickness: d.wallThickness,
    wallHeight: d.wallHeight,
    floorThickness: d.floorThickness,
    curveTolerance: d.curveTolerance,
  }))
    if (!Number.isFinite(value) || value <= 0)
      err(d, `${name} must be positive.`, "DIMENSION");
  if (d.curveTolerance < 0.00001)
    err(d, "curve-tolerance must be at least 0.00001 metres.", "DIMENSION");
  const allIds = new Set<string>();
  for (const o of [
    d,
    ...d.layers.flatMap((l) => [
      l,
      ...l.vertices,
      ...l.edges,
      ...l.regions,
      ...l.edges.flatMap((e) => e.openings),
    ]),
    ...d.seams,
    ...d.covers,
    ...d.materials,
    ...d.markers,
    ...d.links,
    ...d.routes,
    ...d.lights,
  ]) {
    if (allIds.has(o.id)) err(o, `Duplicate id ${o.id}.`, "DUPLICATE_ID");
    allIds.add(o.id);
  }
  const materials = new Set(d.materials.map((m) => m.id));
  for (const m of d.materials) {
    if (
      m.repeat <= 0 ||
      !Number.isFinite(m.repeat) ||
      m.roughness < 0 ||
      m.roughness > 1 ||
      m.metalness < 0 ||
      m.metalness > 1 ||
      !/^#[0-9a-f]{6}$/i.test(m.color)
    )
      err(
        m,
        "Invalid material color, repeat, roughness, or metalness.",
        "MATERIAL",
      );
  }
  const owners = new Map<string, string[]>();
  for (const l of d.layers) {
    for (const v of l.vertices)
      if (![v.x, v.y, v.z].every(Number.isFinite))
        err(v, "Vertex coordinates must be finite.");
    for (const e of l.edges) {
      try {
        if (e.material && !materials.has(e.material))
          throw new Error(`Unknown material ${e.material}.`);
        curves[e.id] = tessellate(e, l, d.curveTolerance);
        if (pathLength(curves[e.id]) < EPS)
          throw new Error("Edge has zero length.");
        if (
          (e.height ?? d.wallHeight) <= 0 ||
          (e.thickness ?? d.wallThickness) <= 0
        )
          throw new Error("Wall dimensions must be positive.");
      } catch (error) {
        err(e, (error as Error).message);
      }
    }
    for (const r of l.regions) {
      try {
        if (r.material && !materials.has(r.material))
          throw new Error(`Unknown material ${r.material}.`);
        if ((r.thickness ?? d.floorThickness) <= 0)
          throw new Error("Floor thickness must be positive.");
        const flight =
          r.fill === "stairs" || r.fill === "ramp"
            ? buildFlight(r, l, curves, r.thickness ?? d.floorThickness)
            : undefined;
        if (flight) flights.set(r.id, flight);
        const f = flight?.floor ?? triangulate(r, l, curves);
        if (r.ceiling !== undefined && f.points.some((p) => p[2] >= r.ceiling!))
          throw new Error("Ceiling is at or below the floor.");
        floors.push(f);
        for (const ref of [r.boundary, ...r.holes].flat()) {
          const id = ref.replace(/^-/, "");
          owners.set(id, [...(owners.get(id) ?? []), r.id]);
        }
      } catch (error) {
        err(
          r,
          (error as Error).message,
          r.fill === "stairs" || r.fill === "ramp" ? "FLIGHT" : "TOPOLOGY",
        );
      }
    }
  }
  const wallProfiles = new Map<
    string,
    NonNullable<ReturnType<typeof resolveWallProfile>>
  >();
  for (const l of d.layers)
    for (const e of l.edges) {
      if (!curves[e.id]) continue;
      try {
        const profile = resolveWallProfile(e, curves[e.id], floors, d);
        if (profile) wallProfiles.set(e.id, profile);
      } catch (error) {
        err(e, (error as Error).message, "WALL_ANCHOR");
      }
    }
  for (const l of d.layers) {
    // Crossings on separate layers are intentional overpasses.
    for (let i = 0; i < l.edges.length; i++)
      for (let j = i + 1; j < l.edges.length; j++) {
        const a = l.edges[i],
          b = l.edges[j],
          A = wallProfiles.get(a.id)?.path ?? curves[a.id],
          B = wallProfiles.get(b.id)?.path ?? curves[b.id];
        if (!A || !B) continue;
        for (let u = 1; u < A.length; u++)
          for (let v = 1; v < B.length; v++)
            if (
              orient(A[u - 1], A[u], B[v - 1]) * orient(A[u - 1], A[u], B[v]) <
                -EPS &&
              orient(B[v - 1], B[v], A[u - 1]) * orient(B[v - 1], B[v], A[u]) <
                -EPS
            ) {
              const da = sub(A[u], A[u - 1]),
                db = sub(B[v], B[v - 1]),
                dc = sub(B[v - 1], A[u - 1]),
                den = da[0] * db[1] - da[1] * db[0],
                ta = (dc[0] * db[1] - dc[1] * db[0]) / den,
                tb = (dc[0] * da[1] - dc[1] * da[0]) / den;
              if (
                Math.abs(A[u - 1][2] + ta * da[2] - B[v - 1][2] - tb * db[2]) <
                EPS
              )
                err(
                  a,
                  `Edges ${a.id} and ${b.id} cross without a shared junction.`,
                  "EDGE_CROSSING",
                );
            }
      }
  }
  for (const [id, rs] of owners)
    if (rs.length > 2)
      err(
        { id },
        "A boundary may belong to at most two regions.",
        "NONMANIFOLD_BOUNDARY",
      );
  for (let i = 0; i < floors.length; i++)
    for (let j = i + 1; j < floors.length; j++) {
      const a = floors[i],
        b = floors[j];
      const ra = d.layers
          .flatMap((l) => l.regions)
          .find((r) => r.id === a.region)!,
        rb = d.layers.flatMap((l) => l.regions).find((r) => r.id === b.region)!;
      const span = (region: typeof ra) => ({
        thickness: region.thickness ?? d.floorThickness,
        base:
          region.fill === "stairs"
            ? curves[region.lower!][0][2] -
              (region.thickness ?? d.floorThickness)
            : undefined,
      });
      const aSpan = span(ra),
        bSpan = span(rb);
      const minZA =
          aSpan.base ??
          Math.min(...a.points.map((p) => p[2])) - aSpan.thickness,
        maxZA = Math.max(...a.points.map((p) => p[2])),
        minZB =
          bSpan.base ??
          Math.min(...b.points.map((p) => p[2])) - bSpan.thickness,
        maxZB = Math.max(...b.points.map((p) => p[2]));
      if (maxZA <= minZB + EPS || maxZB <= minZA + EPS) continue;
      const bounds = (f: FloorPatch) => [
        Math.min(...f.points.map((p) => p[0])),
        Math.min(...f.points.map((p) => p[1])),
        Math.max(...f.points.map((p) => p[0])),
        Math.max(...f.points.map((p) => p[1])),
      ];
      const A = bounds(a),
        B = bounds(b);
      if (
        A[2] <= B[0] + EPS ||
        B[2] <= A[0] + EPS ||
        A[3] <= B[1] + EPS ||
        B[3] <= A[1] + EPS
      )
        continue;
      let overlap = false;
      for (const t of a.triangles) {
        if (overlap) break;
        for (const u of b.triangles)
          if (
            floorVolumeOverlap(
              t.map((k) => a.points[k]),
              u.map((k) => b.points[k]),
              aSpan,
              bSpan,
            ) > EPS
          ) {
            overlap = true;
            break;
          }
      }
      if (overlap)
        err(
          { id: a.region },
          `Regions ${a.region} and ${b.region} have overlapping floor solids.`,
          "SPACE_OVERLAP",
        );
    }
  const semantic = {
    nodes: [...new Set(floors.map((f) => f.area ?? f.region))],
    edges: [] as [string, string][],
  };
  const level: CompiledLevel = {
    version: "2",
    document: d,
    mesh,
    parts: [],
    surfaces,
    floors,
    curves,
    diagnostics,
    geometryHash: "",
    semantic,
    stats: {},
    ...(options.retainExportSolids ? { exportSolids: [] } : {}),
  };
  if (diagnostics.some((e) => e.severity === "error")) return level;
  options.onProgress?.("Constructing mesh");
  const K = await geometryKernel();
  aborted(options.signal);
  const staticSolids = new Map<string, Manifold[]>(),
    dynamicSolids: Manifold[] = [],
    allocated: Manifold[] = [],
    originals = new Map<number, number>();
  const keep = (m: Manifold) => {
    allocated.push(m);
    return m;
  };
  const trianglePrisms = (
    points: V3[],
    triangles: number[][],
    bottom: (p: V3) => V3,
    surface: Surface,
  ): ExportSolid[] =>
    triangles.map(([a, b, c]) => ({
      positions: [
        points[a],
        points[b],
        points[c],
        bottom(points[a]),
        bottom(points[b]),
        bottom(points[c]),
      ],
      triangles: [
        [0, 1, 2],
        [5, 4, 3],
        [0, 3, 4],
        [0, 4, 1],
        [1, 4, 5],
        [1, 5, 2],
        [2, 5, 3],
        [2, 3, 0],
      ],
      surface: { ...surface },
    }));
  const add = (
    positions: V3[],
    triangles: number[][],
    surface: Surface,
    exportPieces?: ExportSolid[],
  ) => {
    if (!triangles.length) return;
    if (level.exportSolids)
      level.exportSolids.push(
        ...(exportPieces ?? [
          {
            positions: positions.map((p) => [...p]),
            triangles: triangles.map((t) => [...t]),
            surface: { ...surface },
          },
        ]),
      );
    const si = surfaces.length;
    surfaces.push(surface);
    const id = K.Manifold.reserveIDs(1);
    originals.set(id, si);
    const raw = new K.Mesh({
      numProp: 3,
      vertProperties: new Float32Array(positions.flat()),
      triVerts: new Uint32Array(triangles.flat()),
      runIndex: new Uint32Array([0, triangles.length * 3]),
      runOriginalID: new Uint32Array([id]),
    });
    raw.merge();
    const solid = keep(new K.Manifold(raw));
    if (solid.status() !== "NoError")
      throw new Error(`${surface.id}: ${solid.status()}`);
    if (surface.dynamic) dynamicSolids.push(solid);
    else {
      const list = staticSolids.get(surface.mesh) ?? [];
      list.push(solid);
      staticSolids.set(surface.mesh, list);
    }
  };
  const slab = (f: FloorPatch, thickness: number, surface: Surface) => {
    const p = [
        ...f.points,
        ...f.points.map((v) => [v[0], v[1], v[2] - thickness] as V3),
      ],
      n = f.points.length,
      t = f.triangles.map((v) => [...v]);
    t.push(...f.triangles.map(([a, b, c]) => [c + n, b + n, a + n]));
    const boundary = new Map<string, [number, number]>();
    for (const tri of f.triangles)
      for (let i = 0; i < 3; i++) {
        const a = tri[i],
          b = tri[(i + 1) % 3],
          key = [a, b].sort((a, b) => a - b).join(",");
        if (boundary.has(key)) boundary.delete(key);
        else boundary.set(key, [a, b]);
      }
    for (const [a, b] of boundary.values())
      t.push([a, b + n, b], [a, a + n, b + n]);
    add(
      p,
      t,
      surface,
      options.retainExportSolids
        ? trianglePrisms(
            f.points,
            f.triangles,
            (p) => [p[0], p[1], p[2] - thickness],
            surface,
          )
        : undefined,
    );
  };
  const prism = (base: V3[], top: V3[], surface: Surface) => {
    const n = base.length,
      p = [...base, ...top],
      t: number[][] = [];
    for (let i = 1; i < n - 1; i++)
      t.push([0, i + 1, i], [n, n + i, n + i + 1]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      t.push([i, j, j + n], [i, j + n, i + n]);
    }
    add(p, t, surface);
  };
  const surf = (
    object: string,
    layer: string,
    role: string,
    material = "default",
    dynamic = false,
    path?: V3[],
  ): Surface => {
    const kind: MeshKind =
      role === "floor" || role === "ramp"
        ? "floor"
        : role === "stair"
          ? "stairs"
          : role === "roof"
            ? "ceiling"
            : ["wall", "sill", "lintel", "riser", "door_panel"].includes(role)
              ? "wall"
              : "prop";
    // Never boolean walls against floors or treads: a stair-side wall remains
    // the sloped panel described by its edge, independent of the step count.
    // Layers organize authoring; they are not physical boolean boundaries.
    // Union static wall volumes across storeys so coincident XY walls with
    // overlapping/touching vertical spans form one shell. A real vertical gap
    // remains empty because this is a solid union, not a min/max extrusion.
    const mesh =
      kind === "wall" && !dynamic
        ? "wall:static:network"
        : `${kind}:${layer}:${object}${dynamic ? ":dynamic" : ""}`;
    return {
      mesh,
      kind,
      id: `${object}:${role}:${surfaces.length}`,
      object,
      layer,
      role,
      material,
      dynamic,
      path,
    };
  };
  try {
    for (const l of d.layers)
      for (const r of l.regions) {
        aborted(options.signal);
        const f = floors.find((f) => f.region === r.id)!;
        const flight = flights.get(r.id);
        if (flight) {
          const surface = surf(
            r.id,
            l.id,
            r.fill === "stairs" ? "stair" : "ramp",
            r.material,
          );
          const thickness = r.thickness ?? d.floorThickness;
          const bottom = Math.min(...flight.solid.points.map((p) => p[2]));
          add(
            flight.solid.points,
            flight.solid.triangles,
            surface,
            options.retainExportSolids
              ? trianglePrisms(
                  flight.floor.points,
                  flight.floor.triangles,
                  (p) => [
                    p[0],
                    p[1],
                    r.fill === "stairs" ? bottom : p[2] - thickness,
                  ],
                  surface,
                )
              : undefined,
          );
        } else
          slab(
            f,
            r.thickness ?? d.floorThickness,
            surf(r.id, l.id, "floor", r.material),
          );
        if (r.ceiling !== undefined)
          slab(
            {
              ...(flight?.guide ?? f),
              points: (flight?.guide ?? f).points.map((p) => [
                p[0],
                p[1],
                r.ceiling! + d.floorThickness,
              ]),
            },
            d.floorThickness,
            surf(r.id, l.id, "roof", r.material),
          );
      }
    const junctions = new Map<
      string,
      {
        point: V3;
        incidents: {
          direction: V3;
          thickness: number;
          bottom: number;
          top: number;
          surface: Surface;
        }[];
      }
    >();
    // Explicit seam endpoints are the only aliases across source vertices.
    // Coincident XY coordinates alone never connect separate storeys.
    const endpointAliases = new Map<string, string>();
    const endpointKey = (id: string): string => {
      const parent = endpointAliases.get(id);
      if (!parent) return id;
      const root = endpointKey(parent);
      endpointAliases.set(id, root);
      return root;
    };
    const edgesById = new Map(
      d.layers.flatMap((l) => l.edges).map((e) => [e.id, e]),
    );
    for (const seam of d.seams) {
      const a = edgesById.get(seam.edges[0]),
        b = edgesById.get(seam.edges[1]);
      if (!a || !b) continue;
      const pa = curves[a.id],
        pb = curves[b.id];
      const reversed =
        Math.hypot(pa[0][0] - pb[0][0], pa[0][1] - pb[0][1]) >= EPS;
      for (const [x, y] of [
        [a.from, reversed ? b.to : b.from],
        [a.to, reversed ? b.from : b.to],
      ]) {
        const rx = endpointKey(x),
          ry = endpointKey(y);
        if (rx !== ry) endpointAliases.set(ry, rx);
      }
    }
    for (const l of d.layers)
      for (const e of l.edges) {
        const profile = wallProfiles.get(e.id),
          path = profile?.path ?? curves[e.id],
          length = pathLength(path),
          height = profile?.top ? Infinity : (e.height ?? d.wallHeight),
          thick = e.thickness ?? d.wallThickness,
          rs = owners.get(e.id) ?? [];
        const supportId = e.baseFloor ?? (rs.length === 1 ? rs[0] : undefined);
        const supportRegion = d.layers
          .flatMap((l) => l.regions)
          .find((r) => r.id === supportId);
        // Treads keep their independent smooth side-wall profile. Floor and
        // ramp walls can match the continuous support plane across their width.
        const support =
          supportRegion && supportRegion.fill !== "stairs"
            ? floors.find((f) => f.region === supportId)
            : undefined;
        const heightAtDistance = (s: number) =>
          profile?.top
            ? pathAt(profile.top, s)[2] - pathAt(path, s)[2]
            : e.kind === "railing"
              ? (e.height ?? 1.1)
              : height;
        const cumulative = [0];
        for (let i = 1; i < path.length; i++)
          cumulative.push(
            cumulative[i - 1] +
              Math.hypot(
                path[i][0] - path[i - 1][0],
                path[i][1] - path[i - 1][1],
              ),
          );
        const openings = [...e.openings];
        if (
          [
            "door",
            "window",
            "arch",
            "breach",
            "rappel_window",
            "rappel_door",
          ].includes(e.kind)
        )
          openings.push({
            id: `${e.id}:opening`,
            kind: e.kind,
            start: 0,
            end: length,
            sill: e.kind.includes("window") ? 0.9 : 0,
            head: e.kind === "arch" ? 2.4 : 2.1,
          });
        openings.sort((a, b) => a.start - b.start);
        for (let i = 0; i < openings.length; i++) {
          const o = openings[i];
          if (
            o.start < 0 ||
            o.end > length + EPS ||
            o.end <= o.start ||
            o.sill < 0 ||
            o.head <= o.sill ||
            [
              o.start,
              o.end,
              ...cumulative.filter((s) => s > o.start && s < o.end),
            ].some((s) => o.head > heightAtDistance(s) + EPS) ||
            (i > 0 && openings[i - 1].end > o.start + EPS)
          )
            throw new Error(`${e.id}: invalid or overlapping opening ${o.id}.`);
        }
        if (
          rs.length === 2 &&
          (e.kind === "open" ||
            openings.some(
              (o) =>
                o.end - o.start >= d.player.radius * 2 &&
                o.sill <= Math.max(d.player.step, d.player.vault) &&
                o.head - o.sill >= d.player.crouch,
            ))
        )
          semantic.edges.push([rs[0], rs[1]]);
        if (e.kind === "open") continue;
        // Height anchors and openings can subdivide a curve beside a miter.
        // Preserve the original offset outline at those extra stations; making
        // a fresh perpendicular there can fold the inner strip back on itself.
        const outline = curves[e.id];
        const outlineDistances = [0];
        const outlineOffsets = outline.map((point, i): V3 => {
          if (i)
            outlineDistances.push(
              outlineDistances[i - 1] +
                Math.hypot(
                  point[0] - outline[i - 1][0],
                  point[1] - outline[i - 1][1],
                ),
            );
          const before = norm(
            sub(outline[Math.max(1, i)], outline[Math.max(1, i) - 1]),
          );
          const after = norm(
            sub(
              outline[Math.min(outline.length - 1, i + 1)],
              outline[Math.min(outline.length - 1, i + 1) - 1],
            ),
          );
          const n0 = norm([-before[1], before[0], 0]),
            n1 = norm([-after[1], after[0], 0]),
            bisector = norm([n0[0] + n1[0], n0[1] + n1[1], 0]),
            denominator = dot(bisector, n0);
          if (denominator < 0.25)
            throw new Error(
              `${e.id}: curve turns too sharply for its wall thickness.`,
            );
          return bisector.map((v) => (v * thick) / 2 / denominator) as V3;
        });
        const offsetAt = (distance: number): V3 => {
          const index = outlineDistances.findIndex((s) => s >= distance - EPS);
          if (index <= 0)
            return outlineOffsets[index < 0 ? outlineOffsets.length - 1 : 0];
          const a = outlineDistances[index - 1],
            b = outlineDistances[index];
          return lerp(
            outlineOffsets[index - 1],
            outlineOffsets[index],
            Math.max(0, Math.min(1, (distance - a) / (b - a))),
          );
        };
        const cuts = [0, length, ...openings.flatMap((o) => [o.start, o.end])];
        const sorted = [...new Set(cuts)].sort((a, b) => a - b);
        const dynamic = ["soft", "glass"].includes(e.kind),
          wallHeight = profile?.top
            ? Infinity
            : e.kind === "railing"
              ? (e.height ?? 1.1)
              : height;
        const emit = (
          start: number,
          end: number,
          bottom: number,
          top: number,
          role: string,
          dyn = dynamic,
        ) => {
          if (top - bottom < EPS || end - start < EPS) return;
          const distances = [
              start,
              ...cumulative.filter((s) => s > start + EPS && s < end - EPS),
              end,
            ],
            positions: V3[] = [],
            triangles: number[][] = [];
          for (const s of distances) {
            const p = pathAt(path, s),
              offset = offsetAt(s);
            for (const [index, z] of [
              bottom,
              Number.isFinite(top) ? top : heightAtDistance(s),
            ].entries())
              for (const sign of [1, -1]) {
                const point: V3 = [
                  p[0] + sign * offset[0],
                  p[1] + sign * offset[1],
                  p[2] + z,
                ];
                if (index === 0 && bottom === 0 && support) {
                  point[2] = wallFootHeight(support, p, point) ?? point[2];
                  const cap =
                    p[2] + (Number.isFinite(top) ? top : heightAtDistance(s));
                  if (point[2] >= cap - EPS)
                    throw new Error(
                      `${e.id}: supporting floor rises above the wall across its thickness.`,
                    );
                }
                positions.push(point);
              }
          }
          for (let i = 1; i < distances.length; i++) {
            const a = (i - 1) * 4,
              b = i * 4;
            triangles.push(
              [a, b + 1, a + 1],
              [a, b, b + 1],
              [a + 2, a + 3, b + 3],
              [a + 2, b + 3, b + 2],
              [a, a + 2, b + 2],
              [a, b + 2, b],
              [a + 1, b + 1, b + 3],
              [a + 1, b + 3, a + 3],
            );
          }
          const last = (distances.length - 1) * 4;
          triangles.push(
            [0, 1, 3],
            [0, 3, 2],
            [last + 1, last, last + 2],
            [last + 1, last + 2, last + 3],
          );
          const surface = surf(e.id, l.id, role, e.material, dyn, path);
          const pieces = options.retainExportSolids
            ? Array.from(
                { length: distances.length - 1 },
                (_, i): ExportSolid => ({
                  positions: positions.slice(i * 4, i * 4 + 8),
                  triangles: [
                    [0, 5, 1],
                    [0, 4, 5],
                    [2, 3, 7],
                    [2, 7, 6],
                    [0, 2, 6],
                    [0, 6, 4],
                    [1, 5, 7],
                    [1, 7, 3],
                    [0, 1, 3],
                    [0, 3, 2],
                    [5, 4, 6],
                    [5, 6, 7],
                  ],
                  surface: { ...surface },
                }),
              )
            : undefined;
          add(positions, triangles, surface, pieces);
        };
        for (let i = 1; i < sorted.length; i++) {
          const s = sorted[i - 1],
            t = sorted[i],
            mid = (s + t) / 2,
            o = openings.find((o) => mid >= o.start && mid <= o.end);
          if (o) {
            emit(s, t, 0, o.sill, "sill");
            emit(s, t, o.head, wallHeight, "lintel");
            if (o.barricade) emit(s, t, o.sill, o.head, "door_panel", true);
          } else emit(s, t, 0, wallHeight, "wall");
        }
        for (let i = 0, dist = 0; i < path.length; i++) {
          if (i)
            dist += Math.hypot(
              path[i][0] - path[i - 1][0],
              path[i][1] - path[i - 1][1],
            );
          if (i > 0 && i < path.length - 1) continue;
          if (
            openings.some((o) => dist >= o.start - EPS && dist <= o.end + EPS)
          )
            continue;
          const c = path[i];
          if (e.join === "round") {
            const base: V3[] = Array.from({ length: 16 }, (_, k) => [
              c[0] + (thick / 2) * Math.cos((k * Math.PI) / 8),
              c[1] + (thick / 2) * Math.sin((k * Math.PI) / 8),
              c[2],
            ]);
            prism(
              base,
              base.map((p) => [p[0], p[1], p[2] + heightAtDistance(dist)]),
              surf(e.id, l.id, "wall", e.material, dynamic, path),
            );
          } else {
            const key = endpointKey(i === 0 ? e.from : e.to);
            const node = junctions.get(key) ?? { point: c, incidents: [] };
            for (const adjacent of [
              i > 0 ? path[i - 1] : undefined,
              i + 1 < path.length ? path[i + 1] : undefined,
            ])
              if (adjacent)
                node.incidents.push({
                  direction: norm([adjacent[0] - c[0], adjacent[1] - c[1], 0]),
                  thickness: thick,
                  bottom: c[2],
                  top: c[2] + heightAtDistance(dist),
                  surface: surf(e.id, l.id, "wall", e.material, dynamic, path),
                });
            junctions.set(key, node);
          }
        }
      }
    for (const seam of d.seams) {
      const a = curves[seam.edges[0]],
        rawB = curves[seam.edges[1]];
      if (!a || !rawB) throw new Error(`${seam.id}: unknown seam edge.`);
      const b =
        Math.hypot(a[0][0] - rawB[0][0], a[0][1] - rawB[0][1]) < EPS
          ? rawB
          : [...rawB].reverse();
      if (Math.abs(pathLength(a) - pathLength(b)) > 0.01)
        throw new Error(`${seam.id}: seam boundaries do not match.`);
      // A ramp/stair side often meets the neighboring floor at its first
      // endpoint. Resolve ordering beyond that shared landing rather than
      // letting the endpoint tie select the wrong floor as the upper slab.
      const heightDifference =
        a
          .map(
            (point, i) =>
              point[2] - pathAt(b, pathLength(a.slice(0, i + 1)))[2],
          )
          .find((difference) => Math.abs(difference) > EPS) ?? 0;
      const low = heightDifference <= 0 ? a : b,
        high = low === a ? b : a;
      const lowEdge = low === a ? seam.edges[0] : seam.edges[1],
        highEdge = high === a ? seam.edges[0] : seam.edges[1],
        upperRegion = d.layers
          .flatMap((l) => l.regions)
          .find((r) => r.id === owners.get(highEdge)?.[0]),
        capInset =
          seam.kind === "open" && upperRegion
            ? (upperRegion.thickness ?? d.floorThickness)
            : 0,
        stairUnderside =
          seam.kind === "open" && upperRegion?.fill === "stairs"
            ? curves[upperRegion.lower!][0][2] - capInset
            : undefined;
      const layer = d.layers.find((l) =>
        l.edges.some((e) => e.id === seam.edges[0]),
      )!.id;
      const offsets = low.map((p, i): V3 => {
        const before = norm(sub(low[Math.max(1, i)], low[Math.max(1, i) - 1])),
          after = norm(
            sub(
              low[Math.min(low.length - 1, i + 1)],
              low[Math.min(low.length - 1, i + 1) - 1],
            ),
          ),
          n0 = norm([-before[1], before[0], 0]),
          n1 = norm([-after[1], after[0], 0]),
          bisector = norm([n0[0] + n1[0], n0[1] + n1[1], 0]),
          denominator = dot(bisector, n0);
        if (denominator < 0.25)
          throw new Error(
            `${seam.id}: curve turns too sharply for its wall thickness.`,
          );
        return bisector.map(
          (v) => (v * d.wallThickness) / 2 / denominator,
        ) as V3;
      });
      const seamSurface = surf(
        seam.id,
        layer,
        "riser",
        seam.material,
        false,
        low,
      );
      for (let i = 1; i < low.length; i++) {
        let startOffset = offsets[i - 1],
          endOffset = offsets[i];
        let A = low[i - 1],
          B = low[i],
          h0 = pathAt(high, pathLength(low.slice(0, i))),
          h1 = pathAt(high, pathLength(low.slice(0, i + 1)));
        if (
          Math.hypot(A[0] - h0[0], A[1] - h0[1]) > 0.01 ||
          Math.hypot(B[0] - h1[0], B[1] - h1[1]) > 0.01
        )
          throw new Error(`${seam.id}: seam XY positions differ.`);
        let top0 =
            stairUnderside ??
            h0[2] + (seam.kind === "wall" ? d.wallHeight : -capInset),
          top1 =
            stairUnderside ??
            h1[2] + (seam.kind === "wall" ? d.wallHeight : -capInset);
        if (seam.kind === "open") {
          // The upper slab itself seals shallow steps. A retaining riser fills
          // only the exposed gap below that slab, never a coplanar floor cap.
          const gap0 = top0 - A[2],
            gap1 = top1 - B[2];
          if (gap0 <= EPS && gap1 <= EPS) continue;
          if (gap0 < 0) {
            const t = gap0 / (gap0 - gap1);
            A = lerp(A, B, t);
            top0 = A[2];
            startOffset = lerp(startOffset, endOffset, t);
          } else if (gap1 < 0) {
            const t = gap0 / (gap0 - gap1);
            B = lerp(A, B, t);
            top1 = B[2];
            endOffset = lerp(startOffset, endOffset, t);
          }
        }
        // A riser closes the exposed gap above the lower walking surface.
        // Extending it through the lower slab adds a redundant skirt whose
        // end caps coincide with that slab's outer side faces.
        // Curved strips with changing elevation have nonplanar cross-section
        // quads. Keep the authored centerline as a triangulation edge, so the
        // lower contact cannot float above a tread between curve stations.
        for (const base of [
          [
            [A[0] + startOffset[0], A[1] + startOffset[1], A[2]],
            A,
            B,
            [B[0] + endOffset[0], B[1] + endOffset[1], B[2]],
          ],
          [
            A,
            [A[0] - startOffset[0], A[1] - startOffset[1], A[2]],
            [B[0] - endOffset[0], B[1] - endOffset[1], B[2]],
            B,
          ],
        ] as V3[][])
          prism(
            base,
            base.map((p, j) => [p[0], p[1], j < 2 ? top0 : top1]),
            seamSurface,
          );
        for (const [point, adjacent, top, index] of [
          [A, B, top0, i - 1],
          [B, A, top1, i],
        ] as const) {
          if (index !== 0 && index !== low.length - 1) continue;
          if (
            Math.hypot(point[0] - low[index][0], point[1] - low[index][1]) > EPS
          )
            continue;
          const edge = edgesById.get(lowEdge)!;
          const forward =
            Math.hypot(
              curves[lowEdge][0][0] - low[0][0],
              curves[lowEdge][0][1] - low[0][1],
            ) < EPS;
          const key = endpointKey(
            (index === 0) === forward ? edge.from : edge.to,
          );
          const node = junctions.get(key) ?? { point, incidents: [] };
          node.incidents.push({
            direction: norm([
              adjacent[0] - point[0],
              adjacent[1] - point[1],
              0,
            ]),
            thickness: d.wallThickness,
            bottom: point[2],
            top,
            surface: seamSurface,
          });
          junctions.set(key, node);
        }
      }
      const A = owners.get(seam.edges[0])?.[0],
        B = owners.get(seam.edges[1])?.[0];
      if (
        A &&
        B &&
        seam.kind === "open" &&
        Math.max(
          ...low.map((p, i) =>
            Math.abs(p[2] - pathAt(high, pathLength(low.slice(0, i + 1)))[2]),
          ),
        ) <= d.player.step
      )
        semantic.edges.push([A, B]);
    }
    // Fill offset-line intersections, preserving square corners at 90 degrees.
    // Very acute miters are bevelled at four wall half-widths rather than spiking.
    for (const { point, incidents: allIncidents } of junctions.values()) {
      // Join only physically overlapping spans, never bridge a height gap.
      const heights = [
        ...new Set(allIncidents.flatMap((i) => [i.bottom, i.top])),
      ].sort((a, b) => a - b);
      for (let h = 1; h < heights.length; h++) {
        const bottom = heights[h - 1],
          top = heights[h];
        if (top - bottom < EPS) continue;
        const p: V3 = [point[0], point[1], bottom];
        const active = allIncidents.filter(
          (i) => i.bottom < top - EPS && i.top > bottom + EPS,
        );
        // Multiple stacked walls may share a direction in this height band.
        // The widest incident owns its exterior offset.
        const byDirection = new Map<string, (typeof allIncidents)[number]>();
        for (const incident of active) {
          const key = incident.direction
            .slice(0, 2)
            .map((v) => v.toFixed(7))
            .join(",");
          if ((byDirection.get(key)?.thickness ?? 0) < incident.thickness)
            byDirection.set(key, incident);
        }
        const incidents = [...byDirection.values()];
        incidents.sort(
          (a, b) =>
            Math.atan2(a.direction[1], a.direction[0]) -
            Math.atan2(b.direction[1], b.direction[0]),
        );
        if (incidents.length < 2) continue;
        for (let i = 0; i < incidents.length; i++) {
          const a = incidents[i],
            b = incidents[(i + 1) % incidents.length],
            u = a.direction,
            v = b.direction;
          let angle = Math.atan2(v[1], v[0]) - Math.atan2(u[1], u[0]);
          if (angle <= 0) angle += Math.PI * 2;
          // Only the exterior wedge needs filling; the interior strips overlap.
          if (angle < Math.PI + EPS) continue;
          const A: V3 = [
              p[0] - (u[1] * a.thickness) / 2,
              p[1] + (u[0] * a.thickness) / 2,
              p[2],
            ],
            B: V3 = [
              p[0] + (v[1] * b.thickness) / 2,
              p[1] - (v[0] * b.thickness) / 2,
              p[2],
            ],
            det = u[0] * v[1] - u[1] * v[0];
          if (Math.abs(det) < EPS) continue;
          const t = ((B[0] - A[0]) * v[1] - (B[1] - A[1]) * v[0]) / det,
            M: V3 = [A[0] + u[0] * t, A[1] + u[1] * t, p[2]];
          let base: V3[] = [
            p,
            A,
            ...(Math.hypot(M[0] - p[0], M[1] - p[1]) <=
            2 * Math.max(a.thickness, b.thickness)
              ? [M]
              : []),
            B,
          ];
          const signed = base.reduce((s, a, i) => {
            const b = base[(i + 1) % base.length];
            return s + a[0] * b[1] - b[0] * a[1];
          }, 0);
          if (signed < 0) base.reverse();
          prism(
            base,
            base.map((p) => [p[0], p[1], top]),
            a.surface,
          );
        }
      }
    }

    for (const c of d.covers) {
      if (c.min.some((v, i) => !Number.isFinite(v) || c.max[i] <= v))
        throw new Error(`${c.id}: invalid cover bounds.`);
      const [x, y, z] = c.min,
        [X, Y, Z] = c.max;
      const base: V3[] = [
        [x, y, z],
        [X, y, z],
        [X, Y, z],
        [x, Y, z],
      ];
      prism(
        base,
        base.map((p) => [p[0], p[1], Z]),
        surf(c.id, c.layer, c.role ?? "cover", c.material, c.dynamic),
      );
    }
    const areaFor = (p: V3) =>
      floors.find((f) => {
        const h = heightAt(f, p[0], p[1]);
        return h !== undefined && Math.abs(h - p[2]) < 0.5;
      });
    for (const link of d.links) {
      const a = areaFor(link.from),
        b = areaFor(link.to);
      if (a && b && (!link.ability || (d.player as any)[link.ability] === true))
        semantic.edges.push([a.area ?? a.region, b.area ?? b.region]);
    }
    for (const edge of semantic.edges)
      for (let i = 0; i < 2; i++)
        edge[i] = floors.find((f) => f.region === edge[i])?.area ?? edge[i];
    options.onProgress?.("Resolving shell");
    aborted(options.signal);
    // Boolean round-off can leave micrometre edges that collapse in float32
    // atlas UVs. Resolve them before hashing/export/nav, with a surface deviation
    // below the authored millimetre lattice; preserve Manifold source run IDs.
    const shells = [...staticSolids.values()].map((solids) =>
      keep(
        (solids.length === 1
          ? solids[0]
          : keep(K.Manifold.union(solids))
        ).simplify(0.0001),
      ),
    );
    for (const solid of [...shells, ...dynamicSolids]) {
      const m = solid.getMesh();
      let run = 0;
      for (let i = 0; i < m.triVerts.length; i += 3) {
        while (run + 1 < m.runOriginalID.length && i >= m.runIndex[run + 1])
          run++;
        const si = originals.get(m.runOriginalID[run]);
        if (si === undefined)
          throw new Error("CSG lost source-face ownership.");
        const points = [0, 1, 2].map(
            (k) =>
              Array.from(
                m.vertProperties.slice(
                  m.triVerts[i + k] * m.numProp,
                  m.triVerts[i + k] * m.numProp + 3,
                ),
              ) as V3,
          ),
          normal = norm(
            cross(sub(points[1], points[0]), sub(points[2], points[0])),
          );
        if (
          Math.hypot(
            ...cross(sub(points[1], points[0]), sub(points[2], points[0])),
          ) < 1e-10
        )
          continue;
        const base = mesh.positions.length / 3;
        mesh.positions.push(...points.flat());
        mesh.normals.push(...normal, ...normal, ...normal);
        mesh.indices.push(base, base + 1, base + 2);
        mesh.surfaces.push(si);
        const surface = surfaces[si],
          repeat =
            d.materials.find((m) => m.id === surface.material)?.repeat ?? 1;
        for (const p of points) {
          let u: number, v: number;
          const ramp =
            surface.role === "ramp" ? flights.get(surface.object) : undefined;
          const developed =
            ramp && Math.abs(normal[2]) > EPS
              ? flightMaterialUV(ramp, p)
              : undefined;
          if (developed) {
            [u, v] = developed;
          } else if (surface.path && Math.abs(normal[2]) < 0.5) {
            let best = Infinity,
              acc = 0,
              U = 0;
            for (let j = 1; j < surface.path.length; j++) {
              const a = surface.path[j - 1],
                b = surface.path[j],
                dx = b[0] - a[0],
                dy = b[1] - a[1],
                len = Math.hypot(dx, dy),
                t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (len * len),
                  ),
                ),
                dist = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
              if (dist < best) {
                best = dist;
                U = acc + t * len;
              }
              acc += len;
            }
            u = U;
            v = p[2];
          } else {
            const axis = norm(
                cross(
                  Math.abs(normal[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1],
                  normal,
                ),
              ),
              other = cross(normal, axis);
            u = dot(p, axis);
            v = dot(p, other);
          }
          mesh.uv.push(u * repeat, v * repeat);
        }
      }
    }
  } catch (error) {
    err(d, (error as Error).message, "GEOMETRY");
  } finally {
    for (const s of allocated.reverse()) s.delete();
  }
  level.geometryHash = await hash({
    positions: mesh.positions,
    indices: mesh.indices,
    surfaces: mesh.surfaces,
    owners: surfaces.map((s) => [
      s.object,
      s.role,
      s.material,
      s.dynamic,
      s.mesh,
    ]),
  });
  level.parts = meshParts(mesh, surfaces);
  level.stats = {
    meshes: level.parts.length,
    triangles: mesh.indices.length / 3,
    vertices: mesh.positions.length / 3,
    regions: floors.length,
  };
  if (!diagnostics.some((d) => d.severity === "error")) {
    if (options.surfaceContacts !== false)
      diagnostics.push(
        ...auditSurfaceContacts(
          level,
          options.surfaceContacts ?? "warning",
          options.signal,
        ),
      );
    if (options.floorGaps !== false)
      diagnostics.push(
        ...auditFloorGaps(
          level,
          options.floorGaps ?? "warning",
          options.signal,
        ),
      );
  }
  options.onGeometry?.(level);
  if (
    options.navigation !== false &&
    !diagnostics.some((d) => d.severity === "error")
  ) {
    options.onProgress?.("Navigation");
    try {
      const { bakeNavmesh } = await import("./validate.ts");
      level.navigation = await bakeNavmesh(level, {
        ...(typeof options.navigation === "object" ? options.navigation : {}),
        signal: options.signal,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      err(d, (error as Error).message, "NAV_BAKE");
    }
  }
  if (options.uvs && !diagnostics.some((d) => d.severity === "error")) {
    options.onProgress?.("Lightmap UVs");
    const { generateUVs } = await import("./uv.ts");
    await generateUVs(level, { ...options.uv, signal: options.signal });
  }
  return level;
}

export function meshParts(mesh: MeshData, surfaces: Surface[]) {
  const parts = new Map<
    string,
    {
      id: string;
      kind: MeshKind;
      layer: string;
      layers: string[];
      dynamic: boolean;
      triangles: number[];
    }
  >();
  for (let t = 0; t < mesh.surfaces.length; t++) {
    const s = surfaces[mesh.surfaces[t]],
      part = parts.get(s.mesh) ?? {
        id: s.mesh,
        kind: s.kind,
        layer: s.layer,
        layers: [],
        dynamic: s.dynamic,
        triangles: [],
      };
    part.triangles.push(t);
    if (!part.layers.includes(s.layer)) part.layers.push(s.layer);
    part.layer = part.layers.length === 1 ? part.layers[0] : "";
    parts.set(s.mesh, part);
  }
  return [...parts.values()];
}
