import type { CompiledLevel, Suggestion, V3 } from "./types.ts";
import { aborted } from "./types.ts";
import { cross, sub, norm, dot, hash, pathLength, pathAt } from "./geometry.ts";
import { spatialBounds } from "./spatial-geometry.ts";

const CONTACT = 0.002;
const NEAR = 0.25;
const PARALLEL = Math.cos(Math.PI / 180);
const NOISE = 0.00001;
type Interval = [number, number];
type Face = {
  object: string;
  layer: string;
  normal: V3;
  points: V3[];
  triangles: V3[][];
  enclosure: boolean;
};

/** Canonical coordinates absorb float32 construction noise without hiding millimeter edits. */
function pointKey(p: V3): string {
  return p.map((v) => Math.round(v * 100000)).join(",");
}

/** Extracts native wall sides before decorative displacement, merging coplanar triangles by authored object. */
function wallFaces(level: CompiledLevel): Face[] {
  const mesh = level.physicalMesh ?? level.mesh;
  const faces = new Map<string, Face>();
  const edges = new Map(
    level.document.layers.flatMap((l) => l.edges).map((e) => [e.id, e]),
  );
  for (let t = 0; t < mesh.surfaces.length; t++) {
    const surface = level.surfaces[mesh.surfaces[t]];
    if (surface.kind !== "wall" || surface.visible === false) continue;
    const edge = edges.get(surface.object);
    const path = level.curves[surface.object];
    const enclosure = ["parapet", "curb", "railing"].includes(surface.role);
    if ((!edge || !path) && !enclosure) continue;
    const points = mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const raw = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...raw) < 1e-10) continue;
    const normal = norm(raw);
    if (Math.abs(normal[2]) > 0.0001) continue;
    // End caps are not wall continuations or flight-side boundaries.
    if (
      path &&
      !path.slice(1).some((p, i) => {
        const tangent = norm([p[0] - path[i][0], p[1] - path[i][1], 0]);
        return Math.abs(dot(tangent, normal)) < 0.02;
      })
    )
      continue;
    const key = [
      surface.object,
      pointKey(normal),
      Math.round(dot(normal, points[0]) * 10000),
    ].join("/");
    let face = faces.get(key);
    if (!face) {
      face = {
        object: surface.object,
        layer: surface.layer,
        normal,
        points: [],
        triangles: [],
        enclosure,
      };
      faces.set(key, face);
    }
    face.points.push(...points);
    face.triangles.push(points);
  }
  return [...faces.values()];
}

/** Projects a face without placing an unbounded vertex array on the call stack. */
function projectionRange(face: Face, direction: V3): Interval {
  let minimum = Infinity, maximum = -Infinity;
  for (const point of face.points) {
    const value = dot(point, direction);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}

/** Unions covered distances along a rail; inputs and outputs are in meters. */
function union(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals.sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && interval[0] <= last[1] + NOISE)
      last[1] = Math.max(last[1], interval[1]);
    else result.push([...interval]);
  }
  return result;
}

/** Clips a projected rail against a wall triangle in its tangent/height plane. */
function coverage(
  a: V3,
  b: V3,
  triangle: V3[],
  normal: V3,
  verticalRange = 0,
): Interval | undefined {
  const tangent: V3 = [-normal[1], normal[0], 0];
  const project = (p: V3) => [dot(p, tangent), p[2]];
  if (verticalRange > 0) {
    const start = project(a),
      end = project(b),
      run = end[0] - start[0];
    if (Math.abs(run) < 1e-10) return;
    let polygon = triangle
      .map(project)
      .map((p) => [
        (p[0] - start[0]) / run,
        p[1] - start[1] - ((p[0] - start[0]) / run) * (end[1] - start[1]),
      ]);
    for (const [axis, boundary, sign] of [
      [0, 0, -1],
      [0, 1, 1],
      [1, 0, -1],
      [1, verticalRange, 1],
    ]) {
      const clipped: number[][] = [];
      for (let i = 0; i < polygon.length; i++) {
        const p = polygon[i],
          q = polygon[(i + 1) % polygon.length];
        const dp = sign * (p[axis] - boundary),
          dq = sign * (q[axis] - boundary);
        if (dp <= NOISE) clipped.push(p);
        if (dp * dq < 0)
          clipped.push(p.map((n, k) => n + (dp / (dp - dq)) * (q[k] - n)));
      }
      polygon = clipped;
    }
    if (!polygon.length) return;
    const lo = Math.min(...polygon.map((p) => p[0])),
      hi = Math.max(...polygon.map((p) => p[0]));
    if (hi > lo + 1e-8) return [lo, hi];
    return;
  }
  const vertices = triangle.map(project),
    start = project(a),
    end = project(b);
  let lo = 0,
    hi = 1;
  const orient = (p: number[], q: number[], r: number[]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const sign = Math.sign(orient(vertices[0], vertices[1], vertices[2]));
  for (let i = 0; i < 3; i++) {
    const p = vertices[i],
      q = vertices[(i + 1) % 3];
    const c = sign * orient(p, q, start),
      d = sign * orient(p, q, end);
    if (c < -NOISE && d < -NOISE) return;
    if (c < -NOISE) lo = Math.max(lo, c / (c - d));
    if (d < -NOISE) hi = Math.min(hi, c / (c - d));
  }
  if (hi > lo + 1e-8) return [lo, hi];
}

/** Computes local, deterministic review findings without changing source or physical geometry. */
export async function auditSuggestions(
  level: CompiledLevel,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const faces = wallFaces(level);
  const bounds = new Map(faces.map((face) => [face, spatialBounds(face.points)]));
  const ordered = [...faces].sort(
    (a, b) => bounds.get(a)!.min[0] - bounds.get(b)!.min[0],
  );
  const named = new Map(
    level.document.layers
      .flatMap((l) => [...l.edges, ...l.regions])
      .map((o) => [o.id, o]),
  );
  const suggestions: Suggestion[] = [];
  /** Attaches immutable source targets and a fingerprint of local effective geometry. */
  async function emit(
    code: Suggestion["code"],
    key: string,
    objects: string[],
    layers: string[],
    points: V3[],
    direction: V3,
    evidence: Suggestion["evidence"],
    message: string,
    dependencies: unknown,
  ) {
    aborted(signal);
    const id = `${code}:${key}`;
    const fingerprint = await hash({ detector: 1, code, dependencies });
    const suppression = level.document.reviewSuppressions?.find(
      (s) => s.suggestion === id,
    );
    const { min, max } = spatialBounds(points);
    suggestions.push({
      id,
      code,
      message,
      objects: [...new Set(objects)],
      layers: [...new Set(layers)],
      sources: [...new Set(objects)].map((object) => ({
        object,
        source: named.get(object)?.source,
      })),
      position: min.map((v, i) => (v + max[i]) / 2) as V3,
      bounds: { min, max },
      direction,
      evidence,
      fingerprint,
      state: suppression?.fingerprint === fingerprint ? "suppressed" : "active",
      ...(suppression
        ? {
            suppression: {
              reason: suppression.reason,
              stale: suppression.fingerprint !== fingerprint,
            },
          }
        : {}),
    });
  }
  /** Encodes geometry independently of triangle order, materials and source positions. */
  function geometry(face: Face) {
    return {
      object: face.object,
      normal: pointKey(face.normal),
      points: [...new Set(face.points.map(pointKey))].sort(),
    };
  }
  /** Audits adjoining exposed wall faces, grouped by source pair. */
  async function inspectWallContinuations() {
    const seenPairs = new Set<string>();
    for (let i = 0; i < ordered.length; i++) {
      aborted(signal);
      const a = ordered[i],
        xmax = bounds.get(a)!.max[0];
      for (const b of ordered.slice(i + 1)) {
        if (bounds.get(b)!.min[0] > xmax + Math.hypot(NEAR, 0.1) + NOISE) break;
        if (a.object === b.object || dot(a.normal, b.normal) < PARALLEL)
          continue;
        const tangent: V3 = [-a.normal[1], a.normal[0], 0];
        const A = projectionRange(a, tangent),
          B = projectionRange(b, tangent);
        const gap = Math.max(A[0], B[0]) - Math.min(A[1], B[1]);
        if (gap < -NOISE || gap > NEAR + NOISE) continue;
        const az = projectionRange(a, [0, 0, 1]),
          bz = projectionRange(b, [0, 0, 1]);
        if (Math.min(az[1], bz[1]) - Math.max(az[0], bz[0]) < 0.25 - NOISE)
          continue;
        const station = (Math.max(A[0], B[0]) + Math.min(A[1], B[1])) / 2;
        const origin = a.points[0];
        const along = station - dot(origin, tangent);
        const onA: V3 = [
          origin[0] + tangent[0] * along,
          origin[1] + tangent[1] * along,
          Math.max(az[0], bz[0]) + 0.25,
        ];
        const displacement =
          dot(sub(b.points[0], onA), b.normal) / dot(a.normal, b.normal);
        const offset = Math.abs(displacement);
        if (offset <= CONTACT + NOISE || offset > 0.1 + NOISE) continue;
        const objects = [a.object, b.object].sort(),
          key = objects.join("|");
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        const points: V3[] = [
          onA,
          onA.map((v, i) => v + a.normal[i] * displacement) as V3,
        ];
        await emit(
          "WALL_ALIGNMENT",
          key,
          objects,
          [a.layer, b.layer],
          points,
          a.normal,
          { offset, length: Math.min(A[1] - A[0], B[1] - B[0]) },
          `Did you mean to align walls ${objects.join(" and ")}? Their continuing faces step sideways by ${(offset * 100).toFixed(1)} cm.`,
          faces
            .filter((f) => objects.includes(f.object))
            .map(geometry)
            .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
        );
      }
    }
  }
  /** Audits continuous flight sides independently of landing edges. */
  async function inspectFlightSides() {
    for (const layer of level.document.layers)
      for (const region of layer.regions) {
        if (region.fill !== "stairs" && region.fill !== "ramp") continue;
        const ids = region.boundary.map((ref) => ref.replace(/^-/, ""));
        const lower = ids.indexOf(region.lower!),
          upper = ids.indexOf(region.upper!);
        if (lower < 0 || upper < 0) continue;
        for (const [start, end] of [
          [lower, upper],
          [upper, lower],
        ]) {
          const refs: string[] = [];
          for (
            let i = (start + 1) % ids.length;
            i !== end;
            i = (i + 1) % ids.length
          )
            refs.push(region.boundary[i]);
          const rail = refs.flatMap((ref, i) => {
            const points = level.curves[ref.replace(/^-/, "")];
            const path = ref.startsWith("-") ? [...points].reverse() : points;
            return i ? path.slice(1) : path;
          });
          const total = pathLength(rail),
            covered: Interval[] = [],
            nearby: Interval[] = [],
            gaps: number[] = [],
            local = new Set<Face>();
          let distance = 0;
          for (let i = 1; i < rail.length; i++) {
            aborted(signal);
            const a = rail[i - 1],
              b = rail[i],
              length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const tangent = norm([b[0] - a[0], b[1] - a[1], 0]);
            for (const face of ordered) {
              const box = bounds.get(face)!;
              if (box.min[0] > Math.max(a[0], b[0]) + NEAR + NOISE) break;
              if (
                [0, 1].some(
                  (axis) =>
                    box.max[axis] < Math.min(a[axis], b[axis]) - NEAR - NOISE ||
                    box.min[axis] > Math.max(a[axis], b[axis]) + NEAR + NOISE,
                )
              )
                continue;
              if (Math.abs(dot(tangent, face.normal)) > Math.sin(Math.PI / 180))
                continue;
              const da = dot(sub(a, face.points[0]), face.normal),
                db = dot(sub(b, face.points[0]), face.normal);
              if (Math.max(Math.abs(da), Math.abs(db)) > NEAR + NOISE) continue;
              for (const triangle of face.triangles) {
                const interval = coverage(
                  [a[0], a[1], a[2] + 0.05],
                  [b[0], b[1], b[2] + 0.05],
                  triangle,
                  face.normal,
                  face.enclosure ? level.document.player.height - 0.05 : 0,
                );
                if (!interval) continue;
                local.add(face);
                const span: Interval = [
                  distance + interval[0] * length,
                  distance + interval[1] * length,
                ];
                nearby.push(span);
                const offset = Math.min(Math.abs(da), Math.abs(db));
                // A boundary inside a wall's thickness is already in contact.
                const edge = level.document.layers
                  .flatMap((l) => l.edges)
                  .find((e) => e.id === face.object)!;
                const thickness =
                  edge?.thickness ?? level.document.wallThickness;
                const touching =
                  offset <= CONTACT + NOISE ||
                  (da < 0 &&
                    db < 0 &&
                    Math.max(Math.abs(da), Math.abs(db)) <= thickness + NOISE);
                if (touching) covered.push(span);
                else gaps.push(offset);
              }
            }
            distance += length;
          }
          const coverageIntervals = union(covered);
          const coveredLength = coverageIntervals.reduce(
            (sum, [a, b]) => sum + b - a,
            0,
          );
          const uncovered: Interval[] = [];
          let cursor = 0;
          for (const [start, end] of coverageIntervals) {
            if (start > cursor + CONTACT) uncovered.push([cursor, start]);
            cursor = Math.max(cursor, end);
          }
          if (total > cursor + CONTACT) uncovered.push([cursor, total]);
          if (!uncovered.length) continue;
          const uncoveredLength = uncovered.reduce(
            (sum, [start, end]) => sum + end - start,
            0,
          );
          const targetPoints = uncovered.flatMap(([start, end]) => [
            pathAt(rail, start),
            ...rail.filter((_, i) => {
              const distance = pathLength(rail.slice(0, i + 1));
              return distance > start && distance < end;
            }),
            pathAt(rail, end),
          ]);
          if (total - coveredLength <= CONTACT + NOISE) continue;
          const nearLength = union(nearby).reduce(
            (sum, [a, b]) => sum + b - a,
            0,
          );
          const code =
            nearLength >= total - CONTACT && gaps.length
              ? "FLIGHT_WALL_GAP"
              : "FLIGHT_OPEN_SIDE";
          const objects = [
            region.id,
            ...[...local].map((f) => f.object).sort(),
          ];
          const offset = gaps.length ? gaps.reduce((minimum, gap) => Math.min(minimum, gap), Infinity) : undefined;
          const dependency = {
            rail: rail.map(pointKey),
            fill: region.fill,
            rise: region.rise ?? 0.18,
            underside: region.underside ?? "filled",
            thickness: region.thickness ?? level.document.floorThickness,
            walls: [...local]
              .map(geometry)
              .sort((x, y) =>
                JSON.stringify(x).localeCompare(JSON.stringify(y)),
              ),
          };
          await emit(
            code,
            `${region.id}|${refs
              .map((r) => r.replace(/^-/, ""))
              .sort()
              .join("|")}`,
            objects,
            [layer.id, ...[...local].map((f) => f.layer)],
            targetPoints,
            [tangentDirection(rail)[1], -tangentDirection(rail)[0], 0],
            { offset, length: uncoveredLength },
            code === "FLIGHT_WALL_GAP"
              ? `Did you mean to align ${region.id} with its side boundary? A gap of ${(offset! * 100).toFixed(1)} cm remains.`
              : `Did you intend this side of ${region.id} to be open? ${uncoveredLength.toFixed(2)} m has no adjoining wall, glass barrier, or railing.`,
            dependency,
          );
        }
      }
  }
  await inspectWallContinuations();
  await inspectFlightSides();
  return suggestions.sort((a, b) => a.id.localeCompare(b.id));
}

/** Returns the horizontal direction of a flight rail. */
function tangentDirection(rail: V3[]): V3 {
  return norm([rail.at(-1)![0] - rail[0][0], rail.at(-1)![1] - rail[0][1], 0]);
}
