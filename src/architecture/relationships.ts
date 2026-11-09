import { pathLength } from "../vector/geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";

/** Returns whether a named owner is inside the physical boundary it resolves. */
function contains(boundary: ResolvedElement, node: ResolvedElement): boolean {
  for (
    let current: ResolvedElement | undefined = node;
    current;
    current = current.parent
  )
    if (current === boundary) return true;
  return false;
}

/**
 * Validates authored relationships before solid composition can conceal mistakes.
 * Geometric support checks follow during wall construction, before its parent union.
 */
export function validateRelationships(
  resolution: ArchitectureResolution,
): void {
  for (const link of resolution.document.links) {
    for (const area of [link.fromArea, link.toArea]) {
      if (area && !resolution.nodes.has(area))
        resolution.fail(
          link.id,
          `Unknown link area ${area}.`,
          "AML_REFERENCE",
          [area],
        );
    }
  }
  for (const node of resolution.nodes.values()) {
    const element = node.element;
    if (
      "coincidentMaterial" in element &&
      element.coincidentMaterial !== undefined
    ) {
      if (!["error", "retained-face"].includes(element.coincidentMaterial))
        resolution.fail(node.id, "Unknown coincident material policy.");
      if (
        !["assembly", "union", "intersect", "subtract", "collision"].includes(
          element.kind,
        )
      )
        resolution.fail(
          node.id,
          "Coincident material policy requires a physical composition boundary.",
        );
      if (
        element.materialOwner &&
        element.coincidentMaterial === "retained-face"
      )
        resolution.fail(
          node.id,
          "Choose material-owner or retained-face ownership on one boundary, not both.",
        );
    }
    if ("materialOwner" in element && element.materialOwner) {
      if (
        !["assembly", "union", "intersect", "subtract", "collision"].includes(
          element.kind,
        )
      )
        resolution.fail(
          node.id,
          "Material ownership requires a physical composition boundary.",
        );
      const owner = resolution.reference(node, element.materialOwner);
      if (owner === node || !contains(node, owner))
        resolution.fail(
          node.id,
          "Material owner must name a descendant of this composition boundary.",
          "AML_REFERENCE",
          [owner.id],
        );
    }
    if (element.kind === "wall") {
      const path = resolution.paths.get(element.path);
      if (!path) resolution.fail(node.id, `Unknown path ${element.path}.`);
      const length = pathLength(path);
      if (length <= 1e-8)
        resolution.fail(node.id, "A wall requires a nonzero plan path.");
      if (element.top && element.topFloor)
        resolution.fail(
          node.id,
          "Choose a longitudinal top profile or a soffit anchor, not both.",
        );
      if (element.base && element.baseFloor)
        resolution.fail(
          node.id,
          "Choose a longitudinal base profile or a base-floor anchor, not both.",
        );
      for (const id of [element.base, element.top])
        if (id) {
          const profile = resolution.paths.get(id);
          if (
            !profile ||
            Math.abs(profile[0][0]) > 1e-7 ||
            Math.abs(profile.at(-1)![0] - length) > 1e-7
          )
            resolution.fail(
              node.id,
              "Wall profiles must cover their complete path from station zero to its length.",
              "AML_WALL_PROFILE",
              [id],
            );
        }
      for (const id of [
        element.baseFloor,
        element.contactFloor,
        element.topFloor,
      ])
        if (id) {
          const target = resolution.reference(node, id);
          if (
            !["slab", "landing", "roof", "canopy", "ramp"].includes(
              target.element.kind,
            ) ||
            target.element.collidable === false
          )
            resolution.fail(
              node.id,
              "Wall anchors require a native physical floor or soffit.",
              "AML_ANCHOR",
              [target.id],
            );
        }
    }
    if (element.kind === "face-material") {
      const host = resolution.reference(node, element.host);
      if (
        [
          "visual-mesh",
          "face-material",
          "water",
          "room",
          "zone",
          "volume",
          "clearance",
        ].includes(host.element.kind)
      )
        resolution.fail(
          node.id,
          "Face material assignments require native architectural faces.",
          "AML_REFERENCE",
          [host.id],
        );
      if (
        element.position ||
        element.rotation ||
        element.scale ||
        element.frame
      )
        resolution.fail(
          node.id,
          "Face assignments use their host frame; place the shared partition profile instead.",
        );
    }
  }
}

/** Checks inclusive boundary contact in unrolled profile coordinates, including tangencies. */
export function loopsMeet(
  first: [number, number, number][],
  second: [number, number, number][],
): boolean {
  const on = (p: number[], a: number[], b: number[]) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = Math.hypot(dx, dy);
    if (length < 1e-10) return Math.hypot(p[0] - a[0], p[1] - a[1]) < 1e-7;
    return (
      Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) <= 1e-7 * length &&
      (p[0] - a[0]) * dx + (p[1] - a[1]) * dy >= -1e-7 &&
      (p[0] - b[0]) * dx + (p[1] - b[1]) * dy <= 1e-7
    );
  };
  for (let i = 0; i < first.length; i++)
    for (let j = 0; j < second.length; j++) {
      const a = first[i],
        b = first[(i + 1) % first.length],
        c = second[j],
        d = second[(j + 1) % second.length];
      if (on(a, c, d) || on(b, c, d) || on(c, a, b) || on(d, a, b)) return true;
      const orient = (a: number[], b: number[], p: number[]) =>
        (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (
        orient(a, b, c) * orient(a, b, d) < 0 &&
        orient(c, d, a) * orient(c, d, b) < 0
      )
        return true;
    }
  return false;
}
