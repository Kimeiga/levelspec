import {validateReference} from "../vector/reference.ts";
import { registerLibraryMaterials } from "../materials/catalog.ts";
import {AmlError} from "./format.ts";
import { snapCoordinate } from "../vector/precision.ts";
import { validateMaterial } from "../vector/materials.ts";
import type { ArchitectureDocument, ArchitectureInput, ArchitectureElement, Placement, ProfileLoop, V3 } from "./types.ts";

/** Clones source dimensions onto the authoring lattice exactly once, before any geometry is derived. */
export function normalizeArchitecture(document: ArchitectureInput): ArchitectureDocument {
  const result = structuredClone(document) as ArchitectureDocument, q = snapCoordinate;
  registerLibraryMaterials(result);
  const materialFindings = result.materials.flatMap(validateMaterial);
  if (materialFindings.length) throw new AmlError(materialFindings);
  const vector = (point: V3): V3 => point.map(q) as V3;
  const placement = (object: Placement) => { if (object.position) object.position = vector(object.position); };
  const loop = (loop: ProfileLoop) => { if (loop.points) loop.points = loop.points.map(vector); };
  for (const frame of result.frames) placement(frame);
  for (const datum of result.datums) datum.elevation = q(datum.elevation);
  for (const path of result.paths) {
    placement(path); path.points = path.points.map(vector);
    if (path.elevation) path.elevation = path.elevation.map(q) as [number, number];
    for (const segment of path.segments) {
      if (segment.kind === "arc") { segment.center = vector(segment.center); segment.radii = segment.radii.map(q) as [number, number]; }
      else { segment.to = vector(segment.to); if (segment.kind === "bezier") segment.controls = segment.controls.map(vector); }
    }
  }
  for (const profile of result.profiles) {
    placement(profile); loop(profile.outer); profile.holes.forEach(loop); profile.interior = profile.interior.map(vector); profile.breaklines = profile.breaklines.map(line => line.map(vector));
  }
  const element = (node: ArchitectureElement): void => {
    placement(node);
    if ("children" in node) node.children.forEach(element);
    if ("thickness" in node) node.thickness = q(node.thickness);
    if ("height" in node && node.height !== undefined) node.height = q(node.height);
    if ("width" in node && node.width !== undefined) node.width = q(node.width);
    if ("depth" in node && node.depth !== undefined) node.depth = q(node.depth);
    if ("radius" in node) node.radius = q(node.radius);
    if ("offset" in node) node.offset = q(node.offset);
    if ("border" in node) node.border = q(node.border);
    if ("ceiling" in node && node.ceiling !== undefined) node.ceiling = q(node.ceiling);
    if ("elevation" in node) {
      if (typeof node.elevation === "number") node.elevation = q(node.elevation);
      else node.elevation.offset = q(node.elevation.offset);
    }
    if (node.kind === "opening") { node.center = node.center.map(q) as [number, number]; node.radii = node.radii.map(q) as [number, number]; }
    if (node.kind === "cone" || node.kind === "cylinder" || node.kind === "sphere" || node.kind === "box" || node.kind === "wedge") node.topRadius = q(node.topRadius);
    if (node.kind === "extrusion") node.distance = q(node.distance);
    if ((node.kind === "stairs" || node.kind === "ramp") && node.maximumRiser !== undefined) node.maximumRiser = q(node.maximumRiser);
    if (node.kind === "enclosure") { if (node.startReturn !== undefined) node.startReturn = q(node.startReturn); if (node.endReturn !== undefined) node.endReturn = q(node.endReturn); for (const rail of node.rails ?? []) rail.topOffset = q(rail.topOffset); if (node.posts) node.posts.maximumSpacing = q(node.posts.maximumSpacing); node.start = q(node.start); if (node.end !== undefined) node.end = q(node.end); }
    if (node.kind === 'grade') {
      node.transition = q(node.transition);
      if (node.startTransition !== undefined) node.startTransition = q(node.startTransition);
      if (node.endTransition !== undefined) node.endTransition = q(node.endTransition);
    }
    if (node.kind === "terrain") {
      node.points = node.points.map(vector); node.heights = node.heights.map(q); node.cellSize = node.cellSize.map(q) as [number, number];
      if (node.base !== undefined) node.base = q(node.base);
      if (node.minHeight !== undefined) node.minHeight = q(node.minHeight);
      if (node.maxHeight !== undefined) node.maxHeight = q(node.maxHeight);
    }
  };
  result.elements.forEach(element); for (const definition of result.definitions) definition.children.forEach(element);
  for (const marker of result.markers) marker.position = vector(marker.position);
  for (const link of result.links) { link.from = vector(link.from); link.to = vector(link.to); }
  for (const light of result.lights) { light.position = vector(light.position); light.target = vector(light.target); }
  for (const reference of result.references) {
    const diagnostics=validateReference(reference);if(diagnostics.length)throw new AmlError(diagnostics);
    for (const landmark of reference.landmarks) landmark.position = vector(landmark.position);
  }
  for (const key of ["radius", "height", "step", "crouch", "vault"] as const) result.player[key] = q(result.player[key]);
  if (result.boat) for (const key of ["radius", "height", "draft"] as const) result.boat[key] = q(result.boat[key]);
  for (const route of result.routes) { if (route.minDistance !== undefined) route.minDistance = q(route.minDistance); if (route.maxDistance !== undefined) route.maxDistance = q(route.maxDistance); }
  return result;
}
