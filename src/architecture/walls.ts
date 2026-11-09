import { Matrix4, Vector3 } from "three";
import { heightAt, norm, pathAt, pathLength, sub } from "../vector/geometry.ts";
import { resolveWallProfile, wallFootHeight } from "../vector/wall-profile.ts";
import type { AssetGeometry } from "../vector/props.ts";
import type { FloorPatch, RuntimeContext } from "../vector/types.ts";
import { surfaceSolid, transform } from "./geometry.ts";
import { endpointIncident, type WallIncident } from "./joins.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import type { Wall, V3 } from "./types.ts";

export interface WallGeometry {
  geometry: AssetGeometry[];
  path: V3[];
  incidents: WallIncident[];
  /** Unrolled distance/height silhouette relative to the wall path. */
  silhouette: V3[];
  offsets: { station: number; normal: V3 }[];
}

/** Evaluates one side of an authored station, preserving vertical steps in a wall profile. */
function profileHeight(
  profile: V3[] | undefined,
  distance: number,
  fallback: number,
  side: "left" | "right",
): number {
  if (!profile) return fallback;
  const equal = profile.filter((point) => Math.abs(point[0] - distance) < 1e-8);
  if (equal.length) return (side === "right" ? equal.at(-1)! : equal[0])[1];
  for (let i = 1; i < profile.length; i++)
    if (distance < profile[i][0]) {
      const a = profile[i - 1],
        b = profile[i],
        t = (distance - a[0]) / (b[0] - a[0]);
      return a[1] + t * (b[1] - a[1]);
    }
  return profile.at(-1)![1];
}

/** Joins two wall sections with a consistent longitudinal diagonal on each face. */
function wallSpan(start: V3[], end: V3[]): AssetGeometry {
  const order = (section: V3[]) => [
    section[1],
    section[0],
    section[2],
    section[3],
  ];
  return {
    positions: [...order(start), ...order(end)],
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
  };
}

/**
 * Constructs wall sections in the authored local frame, then applies its affine placement.
 * Floor anchoring uses resolved physical guides and never changes source coordinates.
 */
export function wallGeometry(
  node: ResolvedElement,
  element: Wall,
  resolution: ArchitectureResolution,
  floors: Map<string, FloorPatch>,
  runtime: Pick<RuntimeContext, "layers" | "floorThickness">,
  soffits: ReadonlyMap<string, FloorPatch>,
): WallGeometry {
  const height = element.height ?? 3;
  if (element.spanFloors && element.height !== undefined)
    throw new Error(
      "Choose a fixed wall height or floor/soffit spanning, not both.",
    );
  if (
    ![element.thickness, height].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    throw new Error("Wall dimensions must be finite and positive.");
  const original = resolution.paths.get(element.path);
  if (!original) resolution.fail(node.id, `Unknown path ${element.path}.`);
  const world = resolution.path(node, element.path),
    inverse = node.matrix.clone().invert();
  let contactPath: V3[] | undefined;
  if (element.contactFloor) {
    const id = resolution.reference(node, element.contactFloor).id;
    const contact = resolveWallProfile(
      { id: node.id, kind: "wall", height, baseFloor: id },
      world,
      [...floors.values()],
      runtime,
    )!;
    let station = 0;
    contactPath = contact.path.map((point, i) => {
      if (i)
        station += Math.hypot(
          point[0] - contact.path[i - 1][0],
          point[1] - contact.path[i - 1][1],
        );
      return pathAt(world, station);
    });
  }
  const anchored = resolveWallProfile(
    {
      id: node.id,
      kind: "wall",
      baseFloor: element.baseFloor
        ? resolution.reference(node, element.baseFloor).id
        : undefined,
      topFloor: element.topFloor
        ? resolution.reference(node, element.topFloor).id
        : undefined,
      spanFloors: element.spanFloors,
      height: element.spanFloors ? undefined : height,
    },
    world,
    [...floors.values()],
    runtime,
    soffits,
  );
  const path = (anchored?.path ?? contactPath ?? world).map((point) =>
    transform(point, inverse),
  );
  const anchoredTop = anchored?.top?.map((point) => transform(point, inverse));
  const length = pathLength(path),
    base = element.base ? resolution.paths.get(element.base) : undefined,
    top = element.top ? resolution.paths.get(element.top) : undefined;
  if ((element.base && !base) || (element.top && !top))
    throw new Error("Unknown longitudinal wall profile.");
  const outlineDistances = [0];
  const offsets = original.map((point, i): V3 => {
    if (i)
      outlineDistances.push(
        outlineDistances[i - 1] +
          Math.hypot(
            point[0] - original[i - 1][0],
            point[1] - original[i - 1][1],
          ),
      );
    const before = norm(
        sub(original[Math.max(1, i)], original[Math.max(1, i) - 1]),
      ),
      after = norm(
        sub(
          original[Math.min(original.length - 1, i + 1)],
          original[Math.min(original.length - 1, i + 1) - 1],
        ),
      );
    const n0 = norm([-before[1], before[0], 0]),
      n1 = norm([-after[1], after[0], 0]),
      bisector = norm([n0[0] + n1[0], n0[1] + n1[1], 0]);
    const denominator = bisector[0] * n0[0] + bisector[1] * n0[1];
    if (denominator < 0.25)
      throw new Error("Wall path turns too sharply for its thickness.");
    return bisector.map(
      (value) => (value * element.thickness) / 2 / denominator,
    ) as V3;
  });
  const offsetAt = (station: number) => {
    const i = outlineDistances.findIndex(
      (distance) => distance >= station - 1e-7,
    );
    if (i <= 0) return offsets[i < 0 ? offsets.length - 1 : 0];
    const a = outlineDistances[i - 1],
      b = outlineDistances[i],
      t = Math.max(0, Math.min(1, (station - a) / (b - a)));
    return offsets[i - 1].map(
      (n, axis) => n + (offsets[i][axis] - n) * t,
    ) as V3;
  };
  const stations = [0];
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    distance += Math.hypot(
      path[i][0] - path[i - 1][0],
      path[i][1] - path[i - 1][1],
    );
    stations.push(distance);
  }
  for (const profile of [base, top])
    if (profile) {
      if (
        profile.some(
          (point, i) =>
            point[0] < 0 ||
            point[0] > length + 1e-7 ||
            (i > 0 && point[0] < profile[i - 1][0]),
        )
      )
        throw new Error(
          "Wall profile stations must be ordered along their path.",
        );
      stations.push(...profile.map((point) => point[0]));
    }
  const cuts = [...new Set(stations)].sort((a, b) => a - b),
    geometry: AssetGeometry[] = [];
  const supportId =
      element.contactFloor ?? element.fitFloor ?? element.baseFloor,
    support = supportId
      ? floors.get(resolution.reference(node, supportId).id)
      : undefined;
  if (element.contactFloor)
    for (let i = 0; i < cuts.length; i++)
      for (const station of [
        cuts[i],
        i ? (cuts[i - 1] + cuts[i]) / 2 : cuts[i],
      ]) {
        for (const side of ["left", "right"] as const) {
          const point = pathAt(path, station),
            bottom = point[2] + profileHeight(base, station, 0, side),
            center = transform([point[0], point[1], bottom], node.matrix);
          const floor = heightAt(support!, center[0], center[1]);
          if (floor === undefined || Math.abs(floor - center[2]) > 0.001 + 1e-7)
            resolution.fail(
              node.id,
              `Wall base leaves its declared contact floor at station ${station.toFixed(3)} m.`,
              "AML_ANCHOR",
              [resolution.reference(node, element.contactFloor).id],
            );
        }
      }
  const section = (point: V3, station: number, side: "left" | "right") => {
    const bottom = point[2] + profileHeight(base, station, 0, side);
    const ceiling = anchoredTop
      ? pathAt(anchoredTop, station)[2]
      : point[2] + profileHeight(top, station, height, side);
    if (ceiling <= bottom)
      throw new Error("Wall top must remain above its base.");
    const offset = offsetAt(station),
      low =
        element.alignment === "left"
          ? 0
          : element.alignment === "right"
            ? -2
            : -1,
      high = low + 2;
    const local = [
      [point[0] + offset[0] * low, point[1] + offset[1] * low, bottom],
      [point[0] + offset[0] * high, point[1] + offset[1] * high, bottom],
      [point[0] + offset[0] * high, point[1] + offset[1] * high, ceiling],
      [point[0] + offset[0] * low, point[1] + offset[1] * low, ceiling],
    ] as V3[];
    const result = local.map((point) => transform(point, node.matrix));
    if (support)
      for (const index of [0, 1])
        result[index][2] =
          wallFootHeight(
            support,
            transform([point[0], point[1], bottom], node.matrix),
            result[index],
          ) ?? result[index][2];
    return result;
  };
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i] - cuts[i - 1] <= 1e-9) continue;
    const a = pathAt(path, cuts[i - 1]),
      b = pathAt(path, cuts[i]);
    const piece = wallSpan(
      section(a, cuts[i - 1], "right"),
      section(b, cuts[i], "left"),
    );
    if (node.matrix.determinant() < 0)
      piece.triangles = piece.triangles.map(([a, b, c]) => [c, b, a]);
    geometry.push(piece);
  }
  if (element.join === "round")
    for (const station of [0, length]) {
      const openings = [...resolution.nodes.values()].filter(
        (candidate) =>
          candidate.element.kind === "opening" &&
          resolution.reference(candidate, candidate.element.host).id ===
            node.id,
      );
      if (
        openings.some((candidate) => {
          const aperture = candidate.element;
          if (aperture.kind !== "opening") return false;
          const radius =
            aperture.shape === "circle"
              ? aperture.radius
              : aperture.shape === "ellipse"
                ? aperture.radii[0]
                : aperture.width / 2;
          return (
            station >= aperture.center[0] - radius - 1e-7 &&
            station <= aperture.center[0] + radius + 1e-7
          );
        })
      )
        continue;
      const point = pathAt(path, station),
        bottom =
          point[2] +
          profileHeight(base, station, 0, station ? "left" : "right");
      const ceiling = anchoredTop
        ? pathAt(anchoredTop, station)[2]
        : point[2] +
          profileHeight(top, station, height, station ? "left" : "right");
      const points: V3[] = Array.from({ length: 16 }, (_, i) => [
        point[0] + (element.thickness / 2) * Math.cos((i * Math.PI) / 8),
        point[1] + (element.thickness / 2) * Math.sin((i * Math.PI) / 8),
        ceiling,
      ]);
      const piece = surfaceSolid(
        {
          points,
          triangles: Array.from({ length: 14 }, (_, i) => [0, i + 1, i + 2]),
          loops: [points],
        },
        (point) => [point[0], point[1], bottom],
      );
      piece.positions = piece.positions.map((point) =>
        transform(point, node.matrix),
      );
      if (node.matrix.determinant() < 0)
        piece.triangles = piece.triangles.map(([a, b, c]) => [c, b, a]);
      geometry.push(piece);
    }
  const resolved = path.map((point) => transform(point, node.matrix));
  const heightScale = new Vector3(0, 0, 1)
    .applyMatrix4(node.matrix)
    .sub(new Vector3().applyMatrix4(node.matrix))
    .length();
  const widthScale = new Vector3(1, 0, 0)
    .applyMatrix4(node.matrix)
    .sub(new Vector3().applyMatrix4(node.matrix))
    .length();
  const incidents: WallIncident[] = [];
  if (
    !element.dynamic &&
    Math.abs(node.matrix.elements[2]) < 1e-9 &&
    Math.abs(node.matrix.elements[6]) < 1e-9
  )
    for (const i of [0, path.length - 1]) {
      const station = i ? length : 0,
        localTop = anchoredTop
          ? pathAt(anchoredTop, station)[2]
          : path[i][2] +
            profileHeight(top, station, height, i ? "left" : "right");
      incidents.push(
        endpointIncident(
          node.id,
          resolved[i],
          resolved[i ? i - 1 : 1],
          element.thickness * widthScale,
          resolved[i][2] + (localTop - path[i][2]) * heightScale,
        ),
      );
    }
  const lower: V3[] = [],
    upper: V3[] = [];
  for (const station of cuts)
    for (const side of ["left", "right"] as const) {
      const point = pathAt(path, station);
      lower.push([station, profileHeight(base, station, 0, side), 0]);
      upper.push([
        station,
        anchoredTop
          ? pathAt(anchoredTop, station)[2] - point[2]
          : profileHeight(top, station, height, side),
        0,
      ]);
    }
  return {
    geometry,
    path: resolved,
    incidents,
    silhouette: [...lower, ...upper.reverse()],
    offsets: offsets.map((offset, i) => ({
      station: outlineDistances[i],
      normal: offset.map((n) => (n * 2) / element.thickness) as V3,
    })),
  };
}
