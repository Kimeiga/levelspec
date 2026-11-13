import { Matrix4, Vector3 } from "three";
import type { ArchitectureResolution } from "../architecture/resolve.ts";
import type { GroundPlan, V3 } from "../architecture/types.ts";
import { Rng } from "../generate/rng.ts";
import { aborted } from "../vector/types.ts";
import { groundEdgeDistance } from "./ground-field.ts";
import type { Seam } from "./seams.ts";

/** A rectangular construction grid in a floor-aligned frame; the matrix maps it back to world meters. */
export interface GroundLayout {
  world: Matrix4;
  columns: number[];
  rows: number[];
  zonesX: number[];
  zonesY: number[];
  constructionX: number[];
  constructionY: number[];
  anchors: GroundPlan["anchors"];
}

interface Anchor {
  point: V3;
  priority: number;
  kind: GroundPlan["anchors"][number]["kind"];
}

/** Retains actual path ends and corners, excluding collinear tessellation and gentle curve samples. */
function corners(points: V3[], closed: boolean): V3[] {
  return points.filter((p, i) => {
    if (!closed && (i === 0 || i === points.length - 1)) return true;
    const a = points[(i + points.length - 1) % points.length],
      b = points[(i + 1) % points.length];
    const ux = p[0] - a[0],
      uy = p[1] - a[1],
      vx = b[0] - p[0],
      vy = b[1] - p[1];
    const length = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return (
      length > 1e-12 && (ux * vx + uy * vy) / length < Math.cos(Math.PI / 18)
    );
  });
}

/** Chooses a stable orthogonal frame from the longest authored floor boundary, not render triangulation. */
function floorFrame(loops: V3[][], origin: V3): Matrix4 {
  let longest = 0,
    angle = 0;
  for (const loop of loops)
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i],
        q = loop[(i + 1) % loop.length];
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (length <= longest + 1e-8) continue;
      longest = length;
      angle = Math.atan2(q[1] - p[1], q[0] - p[0]);
    }
  return new Matrix4()
    .makeRotationZ(angle)
    .setPosition(origin[0], origin[1], 0);
}

/** Keeps structural axes exact while merging nearby wall-face offsets and avoiding narrow sliver pours. */
function constructionLines(
  anchors: Anchor[],
  axis: number,
  low: number,
  high: number,
  spacing: number,
): number[] {
  const result = [low, high];
  const separation = Math.min(0.6, spacing * 0.4);
  const sorted = [...anchors].sort(
    (a, b) => b.priority - a.priority || a.point[axis] - b.point[axis],
  );
  for (const anchor of sorted) {
    const value = anchor.point[axis];
    if (
      value <= low ||
      value >= high ||
      result.some((line) => Math.abs(line - value) < separation)
    )
      continue;
    result.push(value);
    if (result.length > 256) throw new Error("Ground layout budget exceeded.");
  }
  return result.sort((a, b) => a - b);
}

/** Groups many pours into broad finish regions, snapping their boundaries to nearby construction axes. */
function finishLines(
  anchors: number[],
  size: number,
  minimumPour: number,
): number[] {
  const end = anchors.at(-1)!,
    result = [anchors[0]];
  while (end - result.at(-1)! > size * 1.5) {
    const start = result.at(-1)!;
    const candidates = anchors.filter(
      (value) =>
        value >= start + size * 0.5 &&
        value <= Math.min(start + size * 1.5, end - size * 0.5),
    );
    candidates.sort(
      (a, b) =>
        Math.abs(a - start - size) - Math.abs(b - start - size) || a - b,
    );
    const desired = candidates[0] ?? start + size;
    const nearby = anchors.find(
      (value) => Math.abs(value - desired) < minimumPour,
    );
    result.push(nearby ?? desired);
    if (result.length > 256) throw new Error("Ground layout budget exceeded.");
  }
  result.push(end);
  return result;
}

/** Adds regular pour subdivisions between anchored boundaries without shifting those boundaries. */
function pourLines(
  construction: number[],
  finishes: number[],
  size: number,
): number[] {
  const boundaries = [...new Set([...construction, ...finishes])].sort(
    (a, b) => a - b,
  );
  const result = [boundaries[0]];
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const start = boundaries[i],
      length = boundaries[i + 1] - start;
    // Native Float32 boundary rounding must not add a pour to an exact multiple after a rigid transform.
    const count = Math.max(1, Math.ceil((length - 1e-6) / size));
    if (result.length + count > 256)
      throw new Error("Ground layout budget exceeded.");
    for (let n = 1; n <= count; n++) result.push(start + (length * n) / count);
  }
  return result;
}

/**
 * Plans pours from authored floor/hole corners, touching wall corners, adjoining floors and declared mouths.
 * Remote or elevated components cannot seed this floor's layout; stochastic variation is left to its finishes.
 */
export function groundLayout(
  resolution: ArchitectureResolution,
  host: string,
  receiving: V3[][],
  wallContacts: Map<string, Seam[]>,
  patchSize: number,
  materialSize: number,
  signal?: AbortSignal,
): GroundLayout {
  const node = resolution.nodes.get(host)!;
  if (node.element.kind !== "slab" && node.element.kind !== "landing")
    throw new Error("Ground layout requires a floor profile.");
  const loops = resolution.profile(
    node,
    node.element.profile,
    resolution.elevation(node.element.elevation),
  ).loops;
  const origin = new Vector3()
    .setFromMatrixPosition(node.matrix)
    .toArray() as V3;
  const world = floorFrame(loops, origin),
    inverse = world.clone().invert();
  const local = (point: V3) =>
    new Vector3(...point).applyMatrix4(inverse).toArray() as V3;
  const localLoops = loops.map((loop) => loop.map(local));
  const edges = loops.flatMap((loop) =>
    loop.map((p, i) => [p, loop[(i + 1) % loop.length]]),
  );
  const points = [...localLoops.flat(), ...receiving.flat().map(local)];
  const elevation = receiving[0][0][2];
  const anchors: Anchor[] = localLoops.flatMap((loop) =>
    corners(loop, true).map((point) => ({
      point,
      priority: 3,
      kind: "floor" as const,
    })),
  );
  let work = 0;
  const near = (point: V3, segments: V3[][], distance: number): boolean => {
    for (const [a, b] of segments) {
      aborted(signal);
      if (++work > 2_000_000)
        throw new Error("Ground layout contact budget exceeded.");
      if (groundEdgeDistance(point, a, b) <= distance) return true;
    }
    return false;
  };
  const add = (point: V3, priority: number, kind: Anchor["kind"]) => {
    if (anchors.length >= 20000)
      throw new Error("Ground layout anchor budget exceeded.");
    anchors.push({ point: local(point), priority, kind });
  };
  for (const other of resolution.nodes.values()) {
    aborted(signal);
    if (
      other.id === host ||
      other.element.visible === false ||
      other.element.collidable === false
    )
      continue;
    if (other.element.kind === "wall") {
      const wall = other.element;
      const contacts = wallContacts.get(other.id);
      if (!contacts) continue;
      const matrix = other.matrix.elements;
      const thickness =
        wall.thickness *
        Math.max(
          Math.hypot(matrix[0], matrix[1], matrix[2]),
          Math.hypot(matrix[4], matrix[5], matrix[6]),
        );
      for (const point of corners(resolution.path(other, wall.path), false)) {
        if (point[2] > elevation + 0.05) continue;
        if (near(point, contacts, thickness + 0.05)) add(point, 2, "wall");
      }
    } else if (
      other.element.kind === "slab" ||
      other.element.kind === "landing"
    ) {
      const slab = other.element;
      for (const loop of resolution.profile(
        other,
        slab.profile,
        resolution.elevation(slab.elevation),
      ).loops)
        for (const point of corners(loop, true))
          if (Math.abs(point[2] - elevation) < 0.05 && near(point, edges, 0.05))
            add(point, 4, "floor-connection");
    }
  }
  for (const connection of resolution.document.connections) {
    if (
      (connection.from !== host && connection.to !== host) ||
      !connection.path
    )
      continue;
    for (const point of corners(resolution.paths.get(connection.path)!, false))
      if (Math.abs(point[2] - elevation) < 0.05 && near(point, edges, 0.3))
        add(point, 5, "connection");
  }
  return gridLayout(world, points, anchors, patchSize, materialSize);
}

/**
 * Plans pours for a floor given directly by its outline instead of an AML
 * profile, such as a generated deck. `loops` are the outline and any holes in
 * world meters at the floor's elevation; pours break at their corners. The
 * longest outline edge sets the grid orientation.
 */
export function footprintLayout(
  loops: V3[][],
  patchSize: number,
  materialSize: number,
): GroundLayout {
  const world = floorFrame(loops, loops[0][0]),
    inverse = world.clone().invert();
  const points = loops
    .flat()
    .map((point) => new Vector3(...point).applyMatrix4(inverse).toArray() as V3);
  const corners: Anchor[] = points.map((point) => ({
    point,
    priority: 3,
    kind: "floor",
  }));
  return gridLayout(world, points, corners, patchSize, materialSize);
}

/**
 * Lays the construction grid over points and anchors already in the floor
 * frame: anchored axes first, then broad finish zones snapped to them, then
 * regular pour subdivisions between both.
 */
function gridLayout(
  world: Matrix4,
  points: V3[],
  anchors: Anchor[],
  patchSize: number,
  materialSize: number,
): GroundLayout {
  const bounds = points.reduce(
    (box, p) => [
      Math.min(box[0], p[0]),
      Math.min(box[1], p[1]),
      Math.max(box[2], p[0]),
      Math.max(box[3], p[1]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
  const columns = constructionLines(
    anchors,
    0,
    bounds[0],
    bounds[2],
    patchSize,
  );
  const rows = constructionLines(anchors, 1, bounds[1], bounds[3], patchSize);
  const minimumPour = Math.min(0.6, patchSize * 0.4);
  const zonesX = finishLines(columns, materialSize, minimumPour),
    zonesY = finishLines(rows, materialSize, minimumPour);
  return {
    world,
    columns: pourLines(columns, zonesX, patchSize),
    rows: pourLines(rows, zonesY, patchSize),
    zonesX,
    zonesY,
    constructionX: columns,
    constructionY: rows,
    anchors: anchors.map(({ point, kind }) => ({ point, kind })),
  };
}

/** A rectangular pour owns several original cells, whose terrain sampling remains unchanged. */
export interface GroundPour {
  x: number;
  y: number;
  endX: number;
  endY: number;
}

/** Joins optional subdivisions into varied rectangles without crossing architectural or material axes. */
export function groundPours(
  layout: GroundLayout,
  seed: number,
  amount: number,
): GroundPour[] {
  const width = layout.columns.length - 1,
    height = layout.rows.length - 1;
  if (width * height > 10000)
    throw new Error("Ground dressing patch budget exceeded.");
  const occupied = new Set<string>(),
    result: GroundPour[] = [];
  const protectedX = [...layout.constructionX, ...layout.zonesX];
  const protectedY = [...layout.constructionY, ...layout.zonesY];
  const protectedLine = (value: number, lines: number[]) =>
    lines.some((line) => Math.abs(line - value) < 1e-6);
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++) {
      if (occupied.has(`${x}/${y}`)) continue;
      const rng = new Rng(`${seed}/${x}/${y}/join`);
      let endX = x + 1,
        endY = y + 1;
      const targetX = rng.next() < amount ? rng.int(2, 3) : 1;
      const targetY = rng.next() < amount * 0.65 ? 2 : 1;
      while (
        endX < width &&
        endX - x < targetX &&
        !protectedLine(layout.columns[endX], protectedX) &&
        !occupied.has(`${endX}/${y}`)
      )
        endX++;
      while (
        endY < height &&
        endY - y < targetY &&
        !protectedLine(layout.rows[endY], protectedY)
      ) {
        if (
          Array.from({ length: endX - x }, (_, i) =>
            occupied.has(`${x + i}/${endY}`),
          ).some(Boolean)
        )
          break;
        endY++;
      }
      for (let i = x; i < endX; i++)
        for (let j = y; j < endY; j++) occupied.add(`${i}/${j}`);
      result.push({ x, y, endX, endY });
    }
  return result;
}
