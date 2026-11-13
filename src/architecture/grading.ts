import { validateTerrainGeometry } from "./terrain.ts";
import { AmlError } from "./format.ts";
import type { Matrix4 } from "three";
import { aborted, type V3 } from "../vector/types.ts";
import { orient, pathLength, triangleOverlap } from "../vector/geometry.ts";
import { placement, transform, type ResolvedProfile } from "./geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import type { TerrainGrade } from "./types.ts";
import { profileSampler } from "./flights.ts";

interface Cell {
  points: V3[];
  weights: number[];
}
interface Grade {
  node: ResolvedElement;
  element: TerrainGrade;
  cells: Cell[];
  path: V3[];
  bounds: number[];
}
interface Vertex {
  id: number;
  point: V3;
  lines: Set<string>;
}
interface Line {
  id: string;
  a: V3;
  b: V3;
  bounds: number[];
}

/** Owns admission for overlay, interpolation, and conforming refinement work. */
export class GradingBudget {
  private work = 0;
  private readonly maximum: number;
  private readonly signal?: AbortSignal;
  constructor(maximum: number, signal?: AbortSignal) {
    this.maximum = maximum;
    this.signal = signal;
  }
  /** Accounts for one bounded geometric candidate or refinement step. */
  spend(): void {
    aborted(this.signal);
    if (++this.work > this.maximum)
      throw new Error("Grading work budget exceeded.");
  }
}

/** Computes planar bounds for bounded candidate rejection. */
function bounds(points: V3[]): number[] {
  const result = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    result[0] = Math.min(result[0], p[0]);
    result[1] = Math.min(result[1], p[1]);
    result[2] = Math.max(result[2], p[0]);
    result[3] = Math.max(result[3], p[1]);
  }
  return result;
}
/** Rejects distant candidate polygons without changing them. */
function overlaps(a: number[], b: number[]): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Interpolates a triangle field without assuming its winding. */
function barycentric(point: V3, triangle: V3[]): number[] | undefined {
  const denominator = orient(triangle[0], triangle[1], triangle[2]);
  if (Math.abs(denominator) < 1e-14) return;
  const a = orient(triangle[1], triangle[2], point) / denominator,
    b = orient(triangle[2], triangle[0], point) / denominator,
    c = 1 - a - b;
  if (Math.min(a, b, c) < -1e-8) return;
  return [a, b, c];
}

/** Builds a transported road ribbon with fixed centers and linear transition weights. */
function resolveGrade(
  node: ResolvedElement,
  resolution: ArchitectureResolution,
  budget: GradingBudget,
): Grade {
  const element = node.element as TerrainGrade,
    source = resolution.paths.get(element.path);
  if (!source || source.length < 2)
    throw new Error(`Unknown or empty grading path ${element.path}.`);
  if (
    !Number.isFinite(element.width + element.crossSlope + element.transition) ||
    element.width <= 0 ||
    element.transition <= 0
  )
    throw new Error(
      "Grading width and transition must be positive and dimensions finite.",
    );
  if (element.order !== undefined && !Number.isInteger(element.order))
    throw new Error("Grading order must be an integer.");
  const matrix = resolution
      .frame(element.frame)
      .clone()
      .multiply(placement(element)),
    origin = transform([0, 0, 0], matrix),
    axis = transform([0, 0, 1], matrix);
  if (Math.hypot(axis[0] - origin[0], axis[1] - origin[1]) > 1e-8)
    throw new Error(
      "Grading placement must preserve the terrain vertical axis.",
    );
  const length = pathLength(source),
    widthPath = element.widthProfile
      ? resolution.paths.get(element.widthProfile)
      : undefined;
  if (
    element.widthProfile &&
    (!widthPath ||
      widthPath[0][0] !== 0 ||
      widthPath.at(-1)![0] < length - 1e-7 ||
      widthPath.some(
        (p, i) => p[1] <= 0 || (i > 0 && p[0] <= widthPath[i - 1][0]),
      ))
  )
    throw new Error(
      "Grade width profile must cover the complete path with positive widths and ordered stations.",
    );
  const sampleWidth = widthPath
    ? profileSampler(widthPath)
    : () => element.width;
  const originalStations = [0];
  for (let i = 1; i < source.length; i++) {
    const run = Math.hypot(
      source[i][0] - source[i - 1][0],
      source[i][1] - source[i - 1][1],
    );
    if (run <= 1e-9) throw new Error("Grading path has zero plan run.");
    originalStations.push(originalStations.at(-1)! + run);
  }
  const stations = [
    ...new Set([
      ...originalStations,
      ...(widthPath
        ?.map((p) => p[0])
        .filter((station) => station >= 0 && station <= length) ?? []),
    ]),
  ].sort((a, b) => a - b);
  let segment = 1;
  const path = stations.map((station) => {
    while (segment < source.length - 1 && originalStations[segment] < station)
      segment++;
    const t =
      (station - originalStations[segment - 1]) /
      (originalStations[segment] - originalStations[segment - 1]);
    return source[segment - 1].map(
      (n, a) => n + (source[segment][a] - n) * t,
    ) as V3;
  });
  const directions = path.slice(1).map((p, i) => {
    const run = Math.hypot(p[0] - path[i][0], p[1] - path[i][1]);
    return [(p[0] - path[i][0]) / run, (p[1] - path[i][1]) / run];
  });
  const rows = path.map((p, i) => {
    const before = directions[Math.max(0, i - 1)],
      after = directions[Math.min(i, directions.length - 1)],
      denominator = 1 + before[0] * after[0] + before[1] * after[1];
    if (denominator < 0.1) throw new Error("Grading path reverses or folds.");
    const normal = [
        -(before[1] + after[1]) / denominator,
        (before[0] + after[0]) / denominator,
      ],
      half = sampleWidth(stations[i], "after") / 2;
    const offsets = [
      -half - element.transition,
      -half,
      0,
      half,
      half + element.transition,
    ];
    return offsets.map((offset, j) => ({
      point: [
        p[0] + normal[0] * offset,
        p[1] + normal[1] * offset,
        p[2] + element.crossSlope * Math.max(-half, Math.min(half, offset)),
      ] as V3,
      weight: j === 0 || j === 4 ? 0 : 1,
    }));
  });
  const cells: Cell[] = [];
  const join = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    for (let i = 0; i + 1 < a.length; i++) {
      const values = [a[i], b[i], b[i + 1], a[i + 1]],
        points = values.map((v) => transform(v.point, matrix)),
        weights = values.map((v) => v.weight);
      const sign = Math.sign(orient(points[0], points[1], points[2]));
      for (const ids of [
        [0, 1, 2],
        [0, 2, 3],
      ]) {
        budget.spend();
        if (
          orient(...(ids.map((id) => points[id]) as [V3, V3, V3])) * sign <=
          1e-12
        )
          throw new Error("Grading ribbon folds across its width.");
        cells.push({
          points: ids.map((id) => points[id]),
          weights: ids.map((id) => weights[id]),
        });
      }
    }
  };
  const start = element.startTransition ?? sampleWidth(0, "after") / 2,
    end = element.endTransition ?? sampleWidth(length, "before") / 2;
  if (!Number.isFinite(start + end) || start <= 0 || end <= 0)
    throw new Error("Grading endpoint transitions must be positive.");
  const cap = (
    row: (typeof rows)[number],
    direction: number[],
    distance: number,
  ) =>
    row.map((v) => ({
      point: [
        v.point[0] + direction[0] * distance,
        v.point[1] + direction[1] * distance,
        v.point[2],
      ] as V3,
      weight: 0,
    }));
  join(cap(rows[0], directions[0], -start), rows[0]);
  for (let i = 1; i < rows.length; i++) join(rows[i - 1], rows[i]);
  join(rows.at(-1)!, cap(rows.at(-1)!, directions.at(-1)!, end));
  const boxes = cells.map((cell) => bounds(cell.points)),
    ordered = cells.map((_, i) => i).sort((a, b) => boxes[a][0] - boxes[b][0]);
  for (let i = 0; i < ordered.length; i++)
    for (let j = i + 1; j < ordered.length; j++) {
      budget.spend();
      const a = ordered[i],
        b = ordered[j];
      if (boxes[b][0] > boxes[a][2]) break;
      if (
        overlaps(boxes[a], boxes[b]) &&
        triangleOverlap(cells[a].points, cells[b].points) > 1e-9
      )
        throw new Error(
          "A grading ribbon overlaps itself; use separate explicitly ordered grades with compatible center junctions.",
        );
    }
  return {
    node,
    element,
    cells,
    path: path.map((p) => transform(p, matrix)),
    bounds: bounds(cells.flatMap((c) => c.points)),
  };
}

/** Finds crossings including collinear shared spans, retaining both source elevations. */
function crossings(a: V3, b: V3, c: V3, d: V3): [number, number][] {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    ex = d[0] - c[0],
    ey = d[1] - c[1],
    denominator = dx * ey - dy * ex;
  if (Math.abs(denominator) > 1e-12) {
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / denominator,
      u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / denominator;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [[t, u]] : [];
  }
  if (Math.abs(orient(a, b, c)) > 1e-8) return [];
  const length = dx * dx + dy * dy,
    other = ex * ex + ey * ey;
  const first = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / length,
    last = ((d[0] - a[0]) * dx + (d[1] - a[1]) * dy) / length,
    low = Math.max(0, Math.min(first, last)),
    high = Math.min(1, Math.max(first, last));
  return low > high
    ? []
    : [low, high].map((t) => [
        t,
        ((a[0] + t * dx - c[0]) * ex + (a[1] + t * dy - c[1]) * ey) / other,
      ]);
}

/** Validates explicit precedence and exact center junctions before changing terrain. */
export function resolveGrades(
  nodes: ResolvedElement[],
  resolution: ArchitectureResolution,
  budget: GradingBudget,
): Grade[] {
  const grades = nodes.map((node) => {
    try {
      return resolveGrade(node, resolution, budget);
    } catch (error) {
      if ((error as Error).name === "AbortError" || error instanceof AmlError)
        throw error;
      resolution.fail(node.id, (error as Error).message, "AML_GRADE");
    }
  });
  for (let i = 0; i < grades.length; i++)
    for (let j = i + 1; j < grades.length; j++) {
      const a = grades[i],
        b = grades[j];
      if (!overlaps(a.bounds, b.bounds)) continue;
      for (let p = 1; p < a.path.length; p++)
        for (let q = 1; q < b.path.length; q++) {
          budget.spend();
          for (const [t, u] of crossings(
            a.path[p - 1],
            a.path[p],
            b.path[q - 1],
            b.path[q],
          )) {
            budget.spend();
            const z = a.path[p - 1][2] + t * (a.path[p][2] - a.path[p - 1][2]),
              w = b.path[q - 1][2] + u * (b.path[q][2] - b.path[q - 1][2]);
            if (Math.abs(z - w) > 1e-6)
              resolution.fail(
                a.node.id,
                "Intersecting grade center profiles have contradictory elevations.",
                "AML_GRADE_JUNCTION",
                [b.node.id],
              );
          }
        }
      let overlap = false;
      for (const x of a.cells)
        for (const y of b.cells) {
          budget.spend();
          if (
            overlaps(bounds(x.points), bounds(y.points)) &&
            triangleOverlap(x.points, y.points) > 1e-10
          )
            overlap = true;
        }
      if (
        overlap &&
        (a.element.order === undefined ||
          b.element.order === undefined ||
          a.element.order === b.element.order)
      )
        resolution.fail(
          a.node.id,
          "Overlapping grading influences require distinct explicit orders.",
          "AML_GRADE_ORDER",
          [b.node.id],
        );
    }
  return grades.sort(
    (a, b) =>
      (a.element.order ?? 0) - (b.element.order ?? 0) ||
      a.node.id.localeCompare(b.node.id),
  );
}

/** Applies one grade with shared overlay vertices and conforming error-bounded refinement. */
function applyGrade(
  profile: ResolvedProfile,
  grade: Grade,
  tolerance: number,
  maximumTriangles: number,
  budget: GradingBudget,
): ResolvedProfile {
  const baseHeights = profile.points.map((p) => p[2]),
    points = [...profile.points],
    vertices = new Map<number, Vertex>(),
    intersections = new Map<string, Vertex>();
  const gradeHeight = (p: V3, base: number): number => {
    for (const cell of grade.cells) {
      budget.spend();
      const weights = barycentric(p, cell.points);
      if (!weights) continue;
      const blend = weights.reduce((s, w, i) => s + w * cell.weights[i], 0);
      if (blend <= 1e-12) return base;
      const target = weights.reduce((s, w, i) => s + w * cell.points[i][2], 0);
      return base + (target - base) * Math.max(0, Math.min(1, blend));
    }
    return base;
  };
  const lines: Line[] = [],
    equations: { nx: number; ny: number; offset: number }[] = [];
  for (const cell of grade.cells)
    for (let i = 0; i < 3; i++) {
      const a = cell.points[i],
        b = cell.points[(i + 1) % 3],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = (b[1] - a[1]) / length,
        ny = (a[0] - b[0]) / length;
      if (nx < 0 || (nx === 0 && ny < 0)) {
        nx = -nx;
        ny = -ny;
      }
      const offset = nx * a[0] + ny * a[1],
        scale = Math.max(1, ...a.map(Math.abs), ...b.map(Math.abs));
      const duplicate = equations.some((e) => {
        budget.spend();
        return (
          Math.abs(e.nx - nx) <= Number.EPSILON * 128 &&
          Math.abs(e.ny - ny) <= Number.EPSILON * 128 &&
          Math.abs(e.offset - offset) <= Number.EPSILON * 128 * scale
        );
      });
      if (duplicate) {
        const existing = equations.findIndex(
          (e) =>
            Math.abs(e.nx - nx) <= Number.EPSILON * 128 &&
            Math.abs(e.ny - ny) <= Number.EPSILON * 128 &&
            Math.abs(e.offset - offset) <= Number.EPSILON * 128 * scale,
        );
        const box = bounds([a, b]),
          prior = lines[existing].bounds;
        lines[existing].bounds = [
          Math.min(box[0], prior[0]),
          Math.min(box[1], prior[1]),
          Math.max(box[2], prior[2]),
          Math.max(box[3], prior[3]),
        ];
        continue;
      }
      equations.push({ nx, ny, offset });
      lines.push({
        id: `g:${grade.node.id}:${lines.length}`,
        a,
        b,
        bounds: bounds([a, b]),
      });
    }
  const vertex = (id: number): Vertex => {
    let value = vertices.get(id);
    if (!value) {
      value = { id, point: points[id], lines: new Set() };
      vertices.set(id, value);
    }
    return value;
  };
  const split = (poly: Vertex[], line: Line): Vertex[][] => {
    const positive: Vertex[] = [],
      negative: Vertex[] = [];
    const distance = (v: Vertex) => {
      if (v.lines.has(line.id)) return 0;
      const value = orient(line.a, line.b, v.point),
        scale = Math.max(
          1,
          Math.abs(line.a[0]),
          Math.abs(line.a[1]),
          Math.abs(line.b[0]),
          Math.abs(line.b[1]),
          Math.abs(v.point[0]),
          Math.abs(v.point[1]),
        );
      const error =
        scale *
        Math.hypot(line.b[0] - line.a[0], line.b[1] - line.a[1]) *
        Number.EPSILON *
        64;
      if (Math.abs(value) <= error) {
        v.lines.add(line.id);
        return 0;
      }
      return value;
    };
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length],
        da = distance(a),
        db = distance(b);
      if (da >= 0) positive.push(a);
      if (da <= 0) negative.push(a);
      if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const common = [...a.lines].filter((id) => b.lines.has(id)).sort()[0];
        if (!common) throw new Error("Grading lost an overlay edge identity.");
        const key = [common, line.id].sort().join("|");
        let v = intersections.get(key);
        if (!v) {
          const p = a.point.map(
            (n, axis) => n + ((b.point[axis] - n) * da) / (da - db),
          ) as V3;
          v = {
            id: points.length,
            point: p,
            lines: new Set([common, line.id]),
          };
          points.push(p);
          baseHeights.push(p[2]);
          vertices.set(v.id, v);
          intersections.set(key, v);
        }
        positive.push(v);
        negative.push(v);
      }
    }
    return [positive, negative].filter(
      (p) =>
        p.length >= 3 &&
        Math.abs(
          p
            .slice(1, -1)
            .reduce(
              (s, v, i) => s + orient(p[0].point, v.point, p[i + 2].point),
              0,
            ),
        ) > 1e-12,
    );
  };
  let triangles: [number, number, number][] = [];
  for (const triangle of profile.triangles) {
    budget.spend();
    const box = bounds(triangle.map((i) => points[i]));
    if (!overlaps(box, grade.bounds)) {
      triangles.push(triangle);
      continue;
    }
    const initial = triangle.map(vertex);
    for (let i = 0; i < 3; i++) {
      const edge = `e:${[triangle[i], triangle[(i + 1) % 3]].sort((a, b) => a - b).join(",")}`;
      initial[i].lines.add(edge);
      initial[(i + 1) % 3].lines.add(edge);
    }
    let fragments = [initial];
    for (const line of lines)
      if (overlaps(box, line.bounds)) {
        const next: Vertex[][] = [];
        for (const fragment of fragments) {
          budget.spend();
          next.push(...split(fragment, line));
          if (next.length > maximumTriangles)
            throw new Error("Grading fragment budget exceeded.");
        }
        fragments = next;
      }
    for (const fragment of fragments)
      for (let i = 1; i + 1 < fragment.length; i++)
        triangles.push([fragment[0].id, fragment[i].id, fragment[i + 1].id]);
    if (triangles.length > maximumTriangles)
      throw new Error("Grading triangle budget exceeded.");
  }
  const active = new Set<number>();
  for (const triangle of triangles)
    for (const id of triangle)
      if (
        overlaps(
          [points[id][0], points[id][1], points[id][0], points[id][1]],
          grade.bounds,
        )
      )
        active.add(id);
  for (const id of active) {
    const p = points[id];
    points[id] = [p[0], p[1], gradeHeight(p, baseHeights[id])];
  }
  const midpoints = new Map<string, number>();
  const midpoint = (a: number, b: number): number => {
    const key = [a, b].sort((x, y) => x - y).join(",");
    let id = midpoints.get(key);
    if (id === undefined) {
      const p = points[a].map((n, axis) => (n + points[b][axis]) / 2) as V3;
      id = points.length;
      const base = (baseHeights[a] + baseHeights[b]) / 2;
      points.push([p[0], p[1], gradeHeight(p, base)]);
      baseHeights.push(base);
      midpoints.set(key, id);
    }
    return id;
  };
  for (let pass = 0; pass < 20; pass++) {
    const marked = new Set<string>();
    for (const triangle of triangles) {
      if (!overlaps(bounds(triangle.map((i) => points[i])), grade.bounds))
        continue;
      budget.spend();
      let refine = false;
      for (let i = 0; i < 3; i++) {
        const a = points[triangle[i]],
          b = points[triangle[(i + 1) % 3]],
          p = a.map((n, axis) => (n + b[axis]) / 2) as V3;
        if (
          Math.abs(
            gradeHeight(
              p,
              (baseHeights[triangle[i]] + baseHeights[triangle[(i + 1) % 3]]) /
                2,
            ) - p[2],
          ) >
          tolerance / 2
        )
          refine = true;
      }
      const center = points[triangle[0]].map((_, axis) =>
        triangle.reduce((sum, id) => sum + points[id][axis] / 3, 0),
      ) as V3;
      if (
        Math.abs(
          gradeHeight(
            center,
            triangle.reduce((sum, id) => sum + baseHeights[id] / 3, 0),
          ) - center[2],
        ) >
        tolerance / 2
      )
        refine = true;
      if (refine)
        for (let i = 0; i < 3; i++)
          marked.add(
            [triangle[i], triangle[(i + 1) % 3]]
              .sort((a, b) => a - b)
              .join(","),
          );
    }
    if (!marked.size) return { points, triangles, loops: profile.loops };
    const refined: [number, number, number][] = [];
    for (const triangle of triangles) {
      const mids = triangle.map((a, i) =>
          marked.has([a, triangle[(i + 1) % 3]].sort((x, y) => x - y).join(","))
            ? midpoint(a, triangle[(i + 1) % 3])
            : -1,
        ),
        count = mids.filter((i) => i >= 0).length;
      if (!count) refined.push(triangle);
      else if (count === 3) {
        const [a, b, c] = triangle,
          [ab, bc, ca] = mids;
        refined.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
      } else {
        const first =
            count === 1
              ? mids.findIndex((i) => i >= 0)
              : mids.findIndex((i) => i < 0),
          a = triangle[first],
          b = triangle[(first + 1) % 3],
          c = triangle[(first + 2) % 3];
        if (count === 1) {
          const ab = mids[first];
          refined.push([a, ab, c], [ab, b, c]);
        } else {
          const bc = mids[(first + 1) % 3],
            ca = mids[(first + 2) % 3];
          refined.push([c, ca, bc], [a, b, ca], [b, bc, ca]);
        }
      }
      if (refined.length > maximumTriangles)
        throw new Error("Grading refinement triangle budget exceeded.");
    }
    triangles = refined;
  }
  throw new Error(
    "Grading approximation did not converge within its refinement limit.",
  );
}

/** Applies explicitly ordered grades in the named terrain's local frame. */
export function applyTerrainGrades(
  profile: ResolvedProfile,
  node: ResolvedElement,
  grades: Grade[],
  tolerance: number,
  maximumTriangles: number,
  budget: GradingBudget,
  resolution: ArchitectureResolution,
  onProgress?: (stage: string) => void,
): ResolvedProfile {
  if (!grades.length) return profile;
  if (
    node.element.kind === "terrain" &&
    !node.element.profile &&
    !node.element.heightmap &&
    node.element.columns === undefined
  )
    resolution.fail(
      node.id,
      "Grading requires a grid, heightmap, or constrained height profile; explicit faceted overhangs remain independent native geometry.",
      "AML_GRADE",
    );
  const inverse = node.matrix.clone().invert();
  let local: ResolvedProfile = {
    points: profile.points.map((p) => transform(p, inverse)),
    triangles:
      node.matrix.determinant() < 0
        ? profile.triangles.map(([a, b, c]) => [c, b, a])
        : profile.triangles,
    loops: profile.loops.map((loop) => loop.map((p) => transform(p, inverse))),
  };
  let world: ResolvedProfile = profile;
  for (const grade of grades) {
    try {
      onProgress?.(`Grading ${grade.node.id}`);
      budget.spend();
      local = applyGrade(local, grade, tolerance, maximumTriangles, budget);
      world = {
        points: local.points.map((p) => transform(p, node.matrix)),
        triangles:
          node.matrix.determinant() < 0
            ? local.triangles.map(([a, b, c]) => [c, b, a])
            : local.triangles,
        loops: local.loops.map((loop) =>
          loop.map((p) => transform(p, node.matrix)),
        ),
      };
      validateTerrainGeometry(world, maximumTriangles);
    } catch (error) {
      if ((error as Error).name === "AbortError" || error instanceof AmlError)
        throw error;
      resolution.fail(grade.node.id, (error as Error).message, "AML_GRADE", [
        node.id,
      ]);
    }
  }
  return world;
}
