import type { Manifold } from "manifold-3d";
import { aborted, type Diagnostic, type V3 } from "../vector/types.ts";
import { cross, dot, norm, sub } from "../vector/geometry.ts";
import {
  PhysicalGeometryIndex,
  spatialBounds,
} from "../vector/spatial-geometry.ts";
import { transform, type ResolvedProfile } from "./geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import type { CompiledArchitecture } from "./types.ts";

/** Clips one complete spatial contact span against an actual native triangle. */
function interval(a: V3, b: V3, triangle: V3[]): [number, number] | undefined {
  const n = norm(
      cross(sub(triangle[1], triangle[0]), sub(triangle[2], triangle[0])),
    ),
    tolerance = 0.0001;
  if ([a, b].some((p) => Math.abs(dot(n, sub(p, triangle[0]))) > tolerance))
    return;
  let low = 0,
    high = 1;
  for (let i = 0; i < 3; i++) {
    const edge = sub(triangle[(i + 1) % 3], triangle[i]),
      inward = norm(cross(n, edge)),
      start = dot(inward, sub(a, triangle[i])),
      finish = dot(inward, sub(b, triangle[i])),
      change = finish - start;
    if (Math.abs(change) < 1e-14) {
      if (start < -tolerance) return;
      continue;
    }
    const t = (-tolerance - start) / change;
    if (change > 0) low = Math.max(low, t);
    else high = Math.min(high, t);
    if (low > high) return;
  }
  return [Math.max(0, low), Math.min(1, high)];
}

/** Proves continuous contact by unioning parameter intervals; endpoints alone cannot fill a gap. */
function covered(
  a: V3,
  b: V3,
  faces: Iterable<V3[]>,
  spend: () => void,
): boolean {
  const intervals: [number, number][] = [];
  for (const face of faces) {
    spend();
    const range = interval(a, b, face);
    if (range) intervals.push(range);
  }
  intervals.sort((x, y) => {
    spend();
    return x[0] - y[0];
  });
  const epsilon = 1e-6 / Math.max(1, Math.hypot(...sub(b, a)));
  let end = 0;
  for (const range of intervals) {
    spend();
    if (range[0] > end + epsilon) return false;
    end = Math.max(end, range[1]);
  }
  return end >= 1 - epsilon;
}

/** Checks both retained post-cut members and final physical geometry along an explicit seam path. */
export function auditSharedEdges(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  built: Map<string, { solids: Manifold[] }>,
  profiles: Map<string, ResolvedProfile>,
  originalSurfaces: Map<number, number>,
  maximumWork: number,
  signal?: AbortSignal,
): Diagnostic[] {
  const assertions = [...resolution.nodes.values()].filter(
    (node) => node.element.kind === "shared-edge",
  );
  if (!assertions.length) return [];
  let work = 0;
  const spend = () => {
    if ((++work & 1023) === 0) aborted(signal);
    if (work > maximumWork)
      throw new Error("Shared-edge query work budget exceeded.");
  };
  const sources = new Map<string, V3[][]>();
  const geometry = (host: ResolvedElement): V3[][] => {
    const prior = sources.get(host.id);
    if (prior) return prior;
    if (host.element.kind === "collision-surface")
      throw new Error(
        "Shared-edge hosts must be native solids, open terrain, or assemblies; collision surfaces are unsupported.",
      );
    if (
      host.element.collidable === false ||
      ["visual-mesh", "room", "zone", "volume", "clearance", "water"].includes(
        host.element.kind,
      )
    )
      return [];
    const faces: V3[][] = [];
    for (const solid of built.get(host.id)?.solids ?? []) {
      const mesh = solid.getMesh();
      let run = 0;
      for (let i = 0; i < mesh.triVerts.length; i += 3) {
        spend();
        while (
          run + 1 < mesh.runOriginalID.length &&
          i >= mesh.runIndex[run + 1]
        )
          run++;
        const si = originalSurfaces.get(mesh.runOriginalID[run]);
        if (si === undefined || level.surfaces[si].collidable === false)
          continue;
        faces.push(
          [0, 1, 2].map(
            (k) =>
              Array.from(
                mesh.vertProperties.slice(
                  mesh.triVerts[i + k] * mesh.numProp,
                  mesh.triVerts[i + k] * mesh.numProp + 3,
                ),
              ) as V3,
          ),
        );
      }
    }
    const open = (node: ResolvedElement) => {
      if (
        node.element.kind === "terrain" &&
        node.element.base === undefined &&
        node.element.collidable !== false
      ) {
        const profile = profiles.get(node.id);
        if (profile)
          for (const triangle of profile.triangles) {
            spend();
            faces.push(triangle.map((i) => profile.points[i]));
          }
      }
      for (const child of node.children) open(child);
    };
    open(host);
    sources.set(host.id, faces);
    return faces;
  };
  const index = new PhysicalGeometryIndex(level, signal, maximumWork),
    diagnostics: Diagnostic[] = [];
  for (const assertion of assertions) {
    if (assertion.element.kind !== "shared-edge") continue;
    try {
      const from = resolution.reference(assertion, assertion.element.from),
        to = resolution.reference(assertion, assertion.element.to),
        source = resolution.paths.get(assertion.element.path);
      if (!source || source.length < 2)
        resolution.fail(
          assertion.id,
          "Shared-edge requires a known nonempty path.",
        );
      const path = source.map((p) => transform(p, assertion.matrix));
      let valid = true;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i];
        if (
          !covered(a, b, geometry(from), spend) ||
          !covered(a, b, geometry(to), spend)
        ) {
          valid = false;
          break;
        }
        const bounds = spatialBounds([a, b]);
        for (let axis = 0; axis < 3; axis++) {
          bounds.min[axis] -= 0.0001;
          bounds.max[axis] += 0.0001;
        }
        const faces = function* () {
          for (const face of index.faces(bounds)) yield face.points;
        };
        if (!covered(a, b, faces(), spend)) {
          valid = false;
          break;
        }
      }
      if (!valid)
        diagnostics.push({
          severity: "error",
          code: "AML_SHARED_EDGE",
          objects: [assertion.id, from.id, to.id],
          source: assertion.element.source,
          message:
            "Declared shared edge lacks continuous native contact on both named hosts or final physical geometry.",
        });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      diagnostics.push({
        severity: "error",
        code: "AML_SHARED_EDGE",
        objects: [assertion.id, assertion.element.from, assertion.element.to],
        source: assertion.element.source,
        message: (error as Error).message,
      });
    }
  }
  return diagnostics;
}
