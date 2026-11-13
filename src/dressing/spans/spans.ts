import { AmlError } from "../../architecture/format.ts";
import type { ArchitectureResolution } from "../../architecture/resolve.ts";
import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import { spatialDiagnostic } from "../../vector/diagnostics.ts";
import { aborted } from "../../vector/types.ts";
import type { MeshData } from "../../vector/types.ts";
import type { KitBudget } from "../geometry.ts";
import { kitFinishes } from "../kit.ts";
import type { Dressing, SpanRule } from "../types.ts";
import {
  anchorPlanes,
  utilityAnchors,
  windowAnchors,
  type AnchorPlane,
  type SpanHost,
} from "./anchors.ts";
import { SpanPainter } from "./draw.ts";
import { planSpans } from "./plan.ts";
import { Obstructions, WalkingSurfaces } from "./scene.ts";

/** Raises an authoring error at a span recipe. */
function invalid(rule: SpanRule, message: string, objects: string[] = []): never {
  throw new AmlError([
    { severity: "error", code: "AML_DRESSING", message, objects, source: rule.source },
  ]);
}

/**
 * Resolves the hosts a span recipe may fix parts to: the wall and building
 * recipes it names, or all of them. Hidden hosts have no finished geometry
 * and are left out.
 */
function spanHosts(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  settings: Dressing,
  rule: SpanRule,
): SpanHost[] {
  const receivers = new Map(
    settings.rules
      .filter((recipe) => recipe.kind === "wall" || recipe.kind === "building")
      .map((recipe) => [recipe.host, recipe]),
  );
  if (rule.hosts) {
    if (!rule.hosts.length || new Set(rule.hosts).size !== rule.hosts.length)
      invalid(rule, "Span hosts must be a nonempty list without repeats.");
    const unknown = rule.hosts.filter((id) => !receivers.has(id));
    if (unknown.length)
      invalid(rule, "Span hosts must have a wall or building dressing recipe.", unknown);
  }
  const hosts: SpanHost[] = [];
  for (const id of rule.hosts ?? receivers.keys()) {
    const recipe = receivers.get(id)!;
    const node = resolution.nodes.get(id)!;
    if (node.element.visible === false) continue;
    const { materials } = kitFinishes(level, settings.finishes, recipe.material, settings.wallMaterials);
    hosts.push({
      id,
      layer: node.group,
      wall: recipe.material,
      walls: [...new Set([recipe.material, materials.concrete, ...(settings.wallMaterials ?? [])])],
      glazing: [...new Set([materials.pane, materials["interior-lit"]])],
    });
  }
  return hosts;
}

/** Rejects amounts and lengths outside the ranges the generator supports. */
function validate(rule: SpanRule): void {
  for (const amount of [rule.cables, rule.clotheslines, rule.signs])
    if (!Number.isFinite(amount) || amount < 0 || amount > 1)
      invalid(rule, "Span cables, clotheslines and signs must be between 0 and 1.");
  if (!Number.isFinite(rule.clearance) || rule.clearance < 2 || rule.clearance > 10)
    invalid(rule, "Span clearance must be 2–10 m.");
  if (!Number.isFinite(rule.reach) || rule.reach < 2 || rule.reach > 40)
    invalid(rule, "Span reach must be 2–40 m.");
}

/** The corners of every plane's solid wall, as an inspection target for a recipe that placed nothing. */
function planeCorners(planes: AnchorPlane[]): V3[] {
  return planes.flatMap((plane) => [
    plane.point(plane.bounds.u0, plane.bounds.z0),
    plane.point(plane.bounds.u1, plane.bounds.z1),
  ]);
}

/** Uses explicit span recipes verbatim, otherwise connects nearby building hosts. */
export function spanRules(settings: Dressing): SpanRule[] {
  if (settings.spans !== undefined) return settings.spans;
  const hosts = [...new Set(settings.rules
    .filter((rule) => rule.kind === "building")
    .map((rule) => rule.host))];
  if (hosts.length < 2) return [];
  return [{ hosts, cables: 0.6, clotheslines: 0.35, signs: 0, clearance: 2.6, reach: 14 }];
}

/**
 * Strings the level's span recipes between their hosts. It runs after every
 * other dressing pass, so anchors sit on the finished walls and facades and
 * spans avoid everything already drawn. `physical` is the collision mesh,
 * read for walking surfaces only. Generated parts are render-only.
 *
 * An explicitly requested family that fits nowhere raises a `DRESSING_NO_SPAN_FIT`
 * warning located at the hosts' walls.
 */
export function dressSpans(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  settings: Dressing,
  budget: KitBudget,
  physical: MeshData,
): void {
  const rules = spanRules(settings);
  if (!rules.length) return;
  if (rules.length > 16)
    invalid(rules[16], "Dressing is limited to 16 span recipes.");
  rules.forEach(validate);
  const floors = new WalkingSurfaces(physical, level.surfaces);
  const painter = new SpanPainter(level, settings, budget);
  for (const [index, rule] of rules.entries()) {
    aborted(budget.signal);
    const hosts = spanHosts(level, resolution, settings, rule);
    if (rule.cables === 0 && rule.clotheslines === 0 && rule.signs === 0) continue;
    // Each recipe indexes the scene afresh, so its spans avoid what earlier recipes strung.
    const surroundings = { obstructions: Obstructions.ofMesh(level.mesh, level.surfaces), floors };
    const seed = `${settings.seed}/spans/${index}`;
    const planes = anchorPlanes(level, hosts);
    const utility = planes.flatMap((plane, i) =>
      utilityAnchors(plane, `${seed}/${plane.host.id}/${i}`, surroundings),
    );
    const windows = rule.clotheslines <= 0 ? [] : planes.flatMap((plane, i) =>
      windowAnchors(plane, `${seed}/${plane.host.id}/${i}`, surroundings),
    );
    aborted(budget.signal);
    const plan = planSpans(rule, seed, utility, windows, surroundings);
    painter.draw(plan, seed);
    const families = [
      ["cables", "cable", plan.cables.length],
      ["clotheslines", "clothesline", plan.clotheslines.length],
      ["signs", "street sign", plan.signs.length],
    ] as const;
    if (settings.spans === undefined) continue;
    for (const [attribute, name, placed] of families) {
      if (rule[attribute] <= 0 || placed > 0) continue;
      level.diagnostics.push({
        ...spatialDiagnostic(
          level,
          "DRESSING_NO_SPAN_FIT",
          `No ${name} fits between these hosts within the span reach and clearance; set ${attribute}="0" to leave them out.`,
          hosts.map((host) => host.id),
          planeCorners(planes),
        ),
        source: rule.source,
      });
    }
  }
}
