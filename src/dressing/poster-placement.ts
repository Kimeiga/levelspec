import { spatialDiagnostic } from "../vector/diagnostics.ts";
import { Matrix3, Vector3 } from "three";
import { AmlError } from "../architecture/format.ts";
import type { ArchitectureResolution } from "../architecture/resolve.ts";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { aborted } from "../vector/types.ts";
import type { KitBudget } from "./geometry.ts";
import { kitFinishes } from "./kit.ts";
import { KitMesh } from "./kit-mesh.ts";
import { Pen } from "./pen.ts";
import { drawPoster, posterBounds } from "./posters.ts";
import type { PosterRule } from "./types.ts";
import { wallFits, wallSurfaces } from "./wall-surfaces.ts";

/** Reports definite placement failures at the authored decal, with its receiver identity. */
function invalid(rule: PosterRule, message: string, level?: CompiledArchitecture, points?: V3[]): never {
  const diagnostic = level && points?.length
    ? spatialDiagnostic(level, "AML_POSTER", message, [rule.host], points)
    : { code: "AML_POSTER", message, objects: [rule.host] };
  throw new AmlError([{ ...diagnostic, severity: "error", source: rule.source }]);
}

/**
 * Attaches explicit decals to actual visible planar host faces after wall finishing.
 * Openings remain holes. Generated dressing never becomes a receiver; separate interior geometry
 * uses the same drawPoster emitter directly. Physical meshes remain untouched.
 */
export function placePosters(level: CompiledArchitecture, resolution: ArchitectureResolution, budget: KitBudget): void {
  const settings = level.architecture.dressing!;
  const rules = settings.posters ?? [];
  if (rules.length > 256) invalid(rules[256], "At most 256 explicit posters may be placed.");
  const ids = new Set<string>();
  const placed: { host: string; plane: string; x: number; z: number; width: number; height: number; layer: number }[] = [];
  const triangleCount = level.mesh.surfaces.length;
  for (const rule of rules) {
    aborted(budget.signal);
    if (!rule.id.trim() || ids.has(rule.id)) invalid(rule, "Poster IDs must be nonempty and unique.");
    ids.add(rule.id);
    if (!rule.at || rule.at.length !== 2 || !rule.at.every(Number.isFinite)) invalid(rule, "Poster at requires two finite meter coordinates.");
    if (!["front", "back", "left", "right"].includes(rule.face)) invalid(rule, "Poster face must be front, back, left, or right.");
    let bounds: ReturnType<typeof posterBounds>;
    try { bounds = posterBounds(rule); } catch (error) { invalid(rule, (error as Error).message); }
    const node = resolution.nodes.get(rule.host);
    if (!node) invalid(rule, "Unknown poster host.");
    if (node.element.dynamic) invalid(rule, "Posters require a static receiver.");
    const toLocalNormal = new Matrix3().setFromMatrix4(node.matrix).transpose();
    const faces: V3[][] = [];
    const receiverPoints: V3[] = [];
    for (let t = 0; t < triangleCount; t++) {
      if (t % 1024 === 0) aborted(budget.signal);
      const surface = level.surfaces[level.mesh.surfaces[t]];
      if (surface.object !== rule.host || !surface.visible || surface.dynamic) continue;
      const points = level.mesh.indices.slice(t*3,t*3+3).map(i => level.mesh.positions.slice(i*3,i*3+3) as V3);
      receiverPoints.push(...points);
      const a = new Vector3(...points[0]);
      const normal = new Vector3(...points[1]).sub(a).cross(new Vector3(...points[2]).sub(a)).normalize();
      const n = normal.clone().applyMatrix3(toLocalNormal).normalize();
      const selected = { front: n.y < -.99999, back: n.y > .99999, left: n.x < -.99999, right: n.x > .99999 };
      if (selected[rule.face]) faces.push(points);
    }
    const surfaces = wallSurfaces(faces);
    if (surfaces.length !== 1) invalid(rule, "Poster face must select one exposed planar wall; select a separate planar host for corners or curved walls.", level, receiverPoints);
    const surface = surfaces[0];
    const x = surface.right - rule.at[0], z = surface.bottom + rule.at[1];
    if (!wallFits(surface, x-bounds.width/2, z-bounds.height/2, bounds.width, bounds.height))
      invalid(rule, "The complete rotated poster and its 2 cm margin must fit on solid wall, clear of openings.", level, faces.flat());
    const layer = rule.layer ?? 0;
    if (placed.some(other => other.host === rule.host && other.plane === surface.key && other.layer === layer
      && Math.abs(other.x-x) < (other.width+bounds.width)/2 && Math.abs(other.z-z) < (other.height+bounds.height)/2))
      level.diagnostics.push({ ...spatialDiagnostic(level, "AML_POSTER_OVERLAP",
        "Poster bounds overlap on the same layer; inspect the sheets and use different layer values (0–8) if they touch.",
        [rule.host], faces.flat()), source: rule.source });
    placed.push({ host: rule.host, plane: surface.key, x, z, ...bounds, layer });
    const finishes = kitFinishes(level, settings.finishes, node.element.material ?? level.document.materials[0].id);
    const mesh = new KitMesh(level, rule.host, node.group, finishes.materials, budget);
    if (!mesh.textured("posters")) invalid(rule, "Declare a textured <finishes>-wall-posters material using the shared poster atlas.");
    const pen = new Pen(mesh, `poster/${rule.id}`, surface.frame, false).move(x,0,z);
    drawPoster(pen, { ...rule, seed: `${settings.seed}/${rule.id}` });
  }
}
