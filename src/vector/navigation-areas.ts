import type {
  CompiledLevel,
  Diagnostic,
  FloorPatch,
  MeshData,
  NavigationOptions,
  SpatialVolume,
  V3,
} from "./types.ts";
import { aborted } from "./types.ts";
import { cross, dot, norm, sub } from "./geometry.ts";
import { ClipContext, polygonArea } from "./clipping.ts";
import {
  PhysicalGeometryIndex,
  clipToPrism,
  prismPlanes,
  spatialArea,
  spatialBounds,
  type SpatialPlane,
} from "./spatial-geometry.ts";

type Domain = { volume: SpatialVolume; planes: SpatialPlane[] };

/** Splits a polygon into one prism intersection and disjoint outside fragments. */
function subtractPrism(input: V3[], planes: SpatialPlane[]): V3[][] {
  let inside = input;
  const outside: V3[][] = [];
  for (const plane of planes) {
    const part = clipToPrism(inside, [
      { normal: plane.normal.map((n) => -n) as V3, offset: -plane.offset },
    ]);
    if (spatialArea(part) > 1e-12) outside.push(part);
    inside = clipToPrism(inside, [plane]);
    if (spatialArea(inside) <= 1e-12) break;
  }
  return outside;
}

/** Partitions a physical face once across a union, avoiding duplicate temporary faces. */
function partitionDomains(
  input: V3[],
  domains: Domain[],
  check: () => void,
): { inside: V3[][]; outside: V3[][] } {
  let outside = [input];
  const inside: V3[][] = [];
  for (const domain of domains) {
    const remaining: V3[][] = [];
    for (const fragment of outside) {
      check();
      const part = clipToPrism(fragment, domain.planes);
      if (spatialArea(part) <= 1e-12) {
        remaining.push(fragment);
        continue;
      }
      inside.push(part);
      remaining.push(...subtractPrism(fragment, domain.planes));
    }
    outside = remaining;
  }
  return { inside, outside };
}

/** Tests authored point membership without projecting it across excluded support. */
function inDomains(point: V3, domains: Domain[]): boolean {
  return domains.some((domain) =>
    domain.planes.every(
      (plane) => dot(plane.normal, point) <= plane.offset + 1e-6,
    ),
  );
}

/**
 * Creates navigation-only geometry within explicitly authored playable domains.
 * Nearby physical obstacles above the support band remain rasterized; upward
 * surfaces outside the band are made nonwalkable in this temporary mesh only.
 */
export function restrictNavigationAreas(
  level: CompiledLevel & { movementDiagnostics?: Diagnostic[] },
  options: NavigationOptions,
): CompiledLevel & { movementDiagnostics?: Diagnostic[] } {
  const movement = options.movement ?? "land",
    volumes = (level.spatialVolumes ?? []).filter(
      (v) =>
        v.kind === "zone" &&
        v.role === "playable" &&
        (v.movement ?? "land") === movement,
    );
  if (!volumes.length) return level;
  const player = level.document.player,
    context = new ClipContext(options);
  const domains: Domain[] = [],
    expanded: Domain[] = [];
  for (const volume of volumes) {
    context.begin(volume.id, volume.source);
    if (Math.hypot(volume.extrusion[0], volume.extrusion[1]) > 1e-7)
      context.fail(
        "playable domain",
        "Playable zone extrusion must be vertical; tilted rooms and clearance volumes remain supported.",
      );
    const cell = options.cell ?? 0.0625;
    if (
      ((volume.bounds.max[0] - volume.bounds.min[0]) *
        (volume.bounds.max[1] - volume.bounds.min[1])) /
        (cell * cell) >
      4_000_000
    )
      context.fail(
        "playable domain",
        "Playable zone exceeds the navigation cell budget; author smaller domains or an explicit coarser navigation cell.",
        "CLIP_COMPLEXITY_LIMIT",
      );
    for (const triangle of volume.triangles) {
      const base = triangle.map((i) => volume.points[i]);
      domains.push({ volume, planes: prismPlanes(base, volume.extrusion) });
      const lower =
        volume.extrusion[2] >= 0
          ? base
          : base.map(
              (p) => p.map((n, axis) => n + volume.extrusion[axis]) as V3,
            );
      const bottom = lower.map(
        (p) => [p[0], p[1], p[2] - player.step - 0.01] as V3,
      );
      expanded.push({
        volume,
        planes: prismPlanes(bottom, [
          0,
          0,
          Math.abs(volume.extrusion[2]) + player.step + player.height + 0.02,
        ]),
      });
    }
  }
  const index = new PhysicalGeometryIndex(level, options.signal),
    mesh: MeshData = {
      positions: [],
      normals: [],
      indices: [],
      uv: [],
      surfaces: [],
    },
    floors = new Map<string, FloorPatch>();
  const originals = new Map(level.floors.map((floor) => [floor.region, floor]));
  const supports: V3[][] = [],
    seen = new Set<number>();
  let work = 0;
  const check = () => {
    aborted(options.signal);
    if (++work > 8_000_000)
      context.fail(
        "playable domain",
        "Domain clipping work budget exceeded.",
        "CLIP_COMPLEXITY_LIMIT",
      );
  };
  const emit = (poly: V3[], surface: number, flip: boolean) => {
    context.allocate(poly.length);
    const normal = norm(cross(sub(poly[1], poly[0]), sub(poly[2], poly[0]))),
      base = mesh.positions.length / 3;
    for (const point of poly) {
      mesh.positions.push(...point);
      mesh.normals.push(...normal.map((n) => (flip ? -n : n)));
      mesh.uv.push(0, 0);
    }
    for (let i = 1; i + 1 < poly.length; i++) {
      mesh.indices.push(
        ...(flip
          ? [base + i + 1, base + i, base]
          : [base, base + i, base + i + 1]),
      );
      mesh.surfaces.push(surface);
    }
  };
  for (const volume of volumes) {
    const bounds = {
      min: [
        volume.bounds.min[0],
        volume.bounds.min[1],
        volume.bounds.min[2] - player.step - 0.01,
      ] as V3,
      max: [
        volume.bounds.max[0],
        volume.bounds.max[1],
        volume.bounds.max[2] + player.height + 0.01,
      ] as V3,
    };
    for (const face of index.faces(bounds)) {
      if (seen.has(face.index)) continue;
      seen.add(face.index);
      check();
      const selected = partitionDomains(face.points, expanded, check).inside;
      for (const fragment of selected) {
        const pieces = partitionDomains(fragment, domains, check);
        for (const part of pieces.outside)
          emit(part, index.mesh.surfaces[face.index], face.normal[2] > 1e-7);
        for (const part of pieces.inside) {
          emit(part, index.mesh.surfaces[face.index], false);
          if (face.normal[2] < Math.cos((player.slope * Math.PI) / 180) - 1e-7)
            continue;
          supports.push(part);
          const original = originals.get(face.surface.object),
            floor = floors.get(face.surface.object) ?? {
              region: face.surface.object,
              layer: face.surface.layer,
              area: original?.area,
              points: [],
              triangles: [],
              loops: [],
              navigationRequired: true,
            };
          const base = floor.points.length;
          floor.points.push(...part);
          for (let i = 1; i + 1 < part.length; i++)
            floor.triangles.push([base, base + i, base + i + 1]);
          floors.set(floor.region, floor);
        }
      }
    }
  }
  const diagnostics: Diagnostic[] = [];
  for (const volume of volumes) {
    context.begin(volume.id, volume.source);
    let missing: V3[][] = volume.triangles.map((triangle) =>
      triangle.map((i) => volume.points[i]),
    );
    for (const support of supports)
      missing = context.subtractMany(missing, support);
    if (missing.reduce((sum, p) => sum + polygonArea(p), 0) > 1e-6)
      diagnostics.push({
        severity: "error",
        code: "NAV_PLAYABLE_SUPPORT",
        objects: [volume.id],
        source: volume.source,
        message:
          "Playable domain includes area without native walkable support.",
      });
  }
  const required = new Set(
    level.document.routes
      .filter((r) => (r.minRoutes ?? 1) > 0)
      .flatMap((r) => [r.from, r.to]),
  );
  if (level.document.validation !== "premap")
    for (const marker of level.document.markers)
      if (marker.kind.includes("spawn")) required.add(marker.id);
  const markers = level.document.markers.filter(
    (marker) => required.has(marker.id) || inDomains(marker.position, domains),
  );
  for (const marker of markers)
    if (required.has(marker.id) && !inDomains(marker.position, domains))
      diagnostics.push({
        severity: "error",
        code: "NAV_PLAYABLE_ENDPOINT",
        objects: [
          marker.id,
          ...level.document.routes
            .filter((r) => r.from === marker.id || r.to === marker.id)
            .map((r) => r.id),
        ],
        source: marker.source,
        message:
          "Required route endpoint is outside its authored playable domains.",
      });
  return {
    ...level,
    document: { ...level.document, markers },
    mesh,
    physicalMesh: undefined,
    terrainTiles: undefined,
    floors: [...floors.values()],
    movementDiagnostics: [...(level.movementDiagnostics ?? []), ...diagnostics],
  };
}
