import type { SvgxDocument } from "./svgx-types.ts";
import type { V3 } from "../vector/types.ts";
import { snapCoordinate, validateCoordinate } from "../vector/precision.ts";
/** Snap authored geometry without welding IDs or quantizing calibrated reference cameras. */
export function normalizeCoordinates(document: SvgxDocument): SvgxDocument {
  const d = structuredClone(document),
    q = snapCoordinate;
  const optional = (o: any, keys: string[]) => {
    for (const k of keys) if (o[k] !== undefined) o[k] = q(o[k]);
  };
  const vector = (v: V3) => v.map(q) as V3;
  optional(d, [
    "wallThickness",
    "wallHeight",
    "floorThickness",
    "curveTolerance",
  ]);
  optional(d.player, ["radius", "height", "step", "crouch", "vault"]);
  if (d.boat) optional(d.boat, ["radius", "height", "draft"]);
  for (const l of d.layers) {
    for (const v of l.vertices) optional(v, ["x", "y", "z"]);
    for (const e of l.edges) {
      optional(e, ["height", "thickness"]);
      if (e.control) e.control = e.control.map((v) => [q(v[0]), q(v[1])]);
      for (const o of e.openings) optional(o, ["start", "end", "sill", "head"]);
    }
    for (const r of l.regions) optional(r, ["ceiling", "thickness", "rise"]);
  }
  for (const m of d.markers) m.position = vector(m.position);
  for (const l of d.lights) {
    l.position = vector(l.position);
    l.target = vector(l.target);
  }
  for (const l of d.links) {
    l.from = vector(l.from);
    l.to = vector(l.to);
  }
  for (const c of d.covers) {
    c.min = vector(c.min);
    c.max = vector(c.max);
  }
  for (const p of d.props ?? []) {
    p.position = vector(p.position);
    if (p.shape !== "asset") p.scale = vector(p.scale);
  }
  for (const ref of d.references ?? []) {
    ref.camera.position.forEach(validateCoordinate);
    ref.camera.target.forEach(validateCoordinate);
    for (const landmark of ref.landmarks)
      landmark.position = vector(landmark.position);
  }
  for (const r of d.routes) optional(r, ["minDistance", "maxDistance"]);
  return d;
}
