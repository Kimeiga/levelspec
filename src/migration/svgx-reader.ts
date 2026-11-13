import { createSvgxDocument, type SvgxDocument } from "./svgx-types.ts";
/** Private read-only decoder for the explicit SVGX migration command. */
import { validateReference } from "../vector/reference.ts";
import { validateProps } from "./svgx-props.ts";
import { normalizeCoordinates } from "./svgx-precision.ts";
import { SaxesParser } from "saxes";
import {
  DEFAULT_BOAT,
  type Diagnostic,
  type SourceLocation,
  type Named,
  type V3,
  type EdgeKind,
} from "../vector/types.ts";
interface Element {
  tag: string;
  a: Record<string, string>;
  children: Element[];
  source: SourceLocation;
}
export class SvgxError extends Error {
  diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super(
      diagnostics
        .map(
          (d) =>
            `${d.source?.line ?? "?"}:${d.source?.column ?? "?"} ${d.message}`,
        )
        .join("\n"),
    );
    this.name = "SvgxError";
    this.diagnostics = diagnostics;
  }
}
export function parseLevelSvgx(text: string): SvgxDocument {
  const issues: Diagnostic[] = [],
    stack: Element[] = [];
  let root: Element | undefined;
  const starts = [0];
  for (let i = 0; i < text.length; i++)
    if (text[i] === "\n") starts.push(i + 1);
  const at = (offset: number): SourceLocation => {
    let lo = 0,
      hi = starts.length;
    while (lo + 1 < hi) {
      const m = (lo + hi) >> 1;
      if (starts[m] <= offset) lo = m;
      else hi = m;
    }
    return { line: lo + 1, column: offset - starts[lo] + 1, offset };
  };
  const p = new SaxesParser({ xmlns: false });
  p.on("doctype", () => {
    throw new Error("DOCTYPE and entity declarations are not supported.");
  });
  p.on("opentag", (tag) => {
    const e: Element = {
      tag: tag.name,
      a: tag.attributes as Record<string, string>,
      children: [],
      source: at(text.lastIndexOf("<", p.position - 1)),
    };
    if (stack.length) stack.at(-1)!.children.push(e);
    else root = e;
    stack.push(e);
  });
  p.on("closetag", () => {
    const e = stack.pop();
    if (e) e.source.end = p.position;
  });
  p.on("text", (value) => {
    if (value.trim())
      throw new Error(
        "Use attributes for text values; element text is not supported.",
      );
  });
  try {
    p.write(text).close();
  } catch (error) {
    throw new SvgxError([
      {
        severity: "error",
        code: "XML_SYNTAX",
        message: (error as Error).message,
        objects: [],
        source: at(Math.max(0, p.position - 1)),
      },
    ]);
  }
  const fail = (e: Element, message: string, code = "INVALID_ATTRIBUTE") =>
    issues.push({
      severity: "error",
      code,
      message,
      objects: e.a.id ? [e.a.id] : [],
      source: e.source,
    });
  if (!root || root.tag !== "level")
    throw new SvgxError([
      {
        severity: "error",
        code: "ROOT",
        message: 'Expected a <level version="2"> root.',
        objects: [],
        source: at(0),
      },
    ]);
  const known: Record<string, string> = {
    level:
      "version id name validation description units wall-thickness wall-height floor-thickness curve-tolerance expect-fail",
    "review-suppression": "suggestion fingerprint reason",
    layer: "id label",
    vertex: "id label x y z",
    edge: "id label from to kind control height thickness material join base-floor top-floor span-floors",
    opening: "id label kind start end sill head barricade",
    region:
      "id label boundary fill interior material ceiling thickness role lower upper rise underside area",
    hole: "boundary",
    crease: "from to",
    seam: "id label edges kind material",
    material: "id label color repeat roughness metalness texture",
    light: "id label kind position target color intensity angle",
    marker: "id label layer region position kind team movement",
    route: "id label from to min-routes min-distance max-distance movement",
    link: "id label from to kind bidirectional ability movement from-area to-area",
    cover: "id label layer min max material dynamic role",
    asset: "id label src",
    prop: "id label layer shape asset position rotation scale material collision segments",
    reference:
      "id label image width height position target up fov near far scale scale-note",
    landmark: "id label position image",
    mask: "id label points",
    player: "radius height step slope crouch vault rappel ladder",
    boat: "radius draft height",
    sky: "color intensity",
    "no-spawn-los": "markers",
  };
  const children: Record<string, string[]> = {
    level: [
      "review-suppression",
      "layer",
      "seam",
      "material",
      "light",
      "marker",
      "route",
      "link",
      "cover",
      "asset",
      "prop",
      "reference",
      "player",
      "boat",
      "sky",
      "no-spawn-los",
    ],
    layer: ["vertex", "edge", "region"],
    edge: ["opening"],
    region: ["hole", "crease"],
    reference: ["landmark", "mask"],
  };
  const ids = new Set<string>();
  function check(e: Element) {
    if (!(e.tag in known)) {
      fail(e, `Unknown element <${e.tag}>.`, "UNKNOWN_ELEMENT");
      return;
    }
    for (const a of Object.keys(e.a))
      if (!known[e.tag].split(" ").includes(a))
        fail(e, `Unknown attribute ${a} on <${e.tag}>.`);
    if (known[e.tag].split(" ").includes("id")) {
      if (!e.a.id || !/^[A-Za-z_][\w.:/-]*$/.test(e.a.id))
        fail(
          e,
          "An id must start with a letter or underscore and contain no whitespace.",
        );
      else if (ids.has(e.a.id))
        fail(e, `Duplicate id ${e.a.id}.`, "DUPLICATE_ID");
      else ids.add(e.a.id);
    }
    for (const c of e.children) {
      if (!children[e.tag]?.includes(c.tag))
        fail(
          c,
          `<${c.tag}> is not allowed inside <${e.tag}>.`,
          "INVALID_CHILD",
        );
      check(c);
    }
  }
  check(root);
  const s = (e: Element, key: string, fallback?: string) => {
    const v = e.a[key] ?? fallback;
    if (v === undefined) {
      fail(e, `Missing ${key}.`);
      return "";
    }
    return v;
  };
  const n = (e: Element, key: string, fallback?: number) => {
    const raw = e.a[key];
    if (raw === undefined && fallback !== undefined) return fallback;
    const v = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
    if (!Number.isFinite(v)) {
      fail(e, `${key} must be a finite number.`);
      return 0;
    }
    return v;
  };
  const opt = (e: Element, key: string) =>
    e.a[key] === undefined ? undefined : n(e, key);
  const b = (e: Element, key: string, fallback = false) => {
    if (!(key in e.a)) return fallback;
    if (!["true", "false"].includes(e.a[key]))
      fail(e, `${key} must be true or false.`);
    return e.a[key] === "true";
  };
  const list = (v = "") => v.trim().split(/\s+/).filter(Boolean);
  const vector = (
    e: Element,
    key: string,
    size: number,
    fallback?: number[],
  ) => {
    if (!(key in e.a) && fallback) return fallback.slice();
    const v = list(s(e, key)).map(Number);
    if (v.length !== size || v.some((x) => !Number.isFinite(x))) {
      fail(e, `${key} requires ${size} finite numbers.`);
      return Array(size).fill(0);
    }
    return v;
  };
  const named = (e: Element): Named => ({
    id: s(e, "id"),
    label: e.a.label,
    source: e.source,
  });
  const one = <T extends string>(
    e: Element,
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T => {
    const v = e.a[key] ?? fallback;
    if (!allowed.includes(v as T))
      fail(e, `${key} must be one of ${allowed.join(", ")}.`);
    return v as T;
  };
  const edgeKinds: EdgeKind[] = [
    "wall",
    "hard",
    "soft",
    "reinforced",
    "glass",
    "open",
    "door",
    "window",
    "arch",
    "breach",
    "railing",
    "rappel_window",
    "rappel_door",
  ];
  const doc = createSvgxDocument(s(root, "id"));
  doc.source = root.source;
  if (root.a.version !== "2")
    fail(root, 'Only version="2" is supported.', "VERSION");
  if (s(root, "units", "meters") !== "meters")
    fail(root, "Units must be meters.");
  doc.name = s(root, "name", doc.id);
  doc.validation = one(
    root,
    "validation",
    ["premap", "playable"] as const,
    "playable",
  );
  doc.description = root.a.description;
  doc.expectFail = b(root, "expect-fail");
  doc.wallThickness = n(root, "wall-thickness", 0.22);
  doc.wallHeight = n(root, "wall-height", 3);
  doc.floorThickness = n(root, "floor-thickness", 0.2);
  doc.curveTolerance = n(root, "curve-tolerance", 0.01);
  for (const e of root.children)
    switch (e.tag) {
      case "review-suppression": {
        const suppression = {
          suggestion: s(e, "suggestion"),
          fingerprint: s(e, "fingerprint"),
          reason: s(e, "reason"),
        };
        if (!suppression.reason.trim())
          fail(e, "A review suppression requires a nonempty reason.");
        if (
          doc.reviewSuppressions?.some(
            (value) => value.suggestion === suppression.suggestion,
          )
        )
          fail(
            e,
            `Duplicate suppression for ${suppression.suggestion}; replace the existing annotation.`,
          );
        (doc.reviewSuppressions ??= []).push(suppression);
        break;
      }
      case "layer":
        doc.layers.push({
          ...named(e),
          vertices: e.children
            .filter((c) => c.tag === "vertex")
            .map((c) => ({
              ...named(c),
              x: n(c, "x"),
              y: n(c, "y"),
              z: n(c, "z"),
            })),
          edges: e.children
            .filter((c) => c.tag === "edge")
            .map((c) => {
              const control = c.a.control
                ?.split(";")
                .map(
                  (v) => v.trim().split(/\s+/).map(Number) as [number, number],
                );
              if (
                control &&
                (control.length < 1 ||
                  control.length > 2 ||
                  control.some(
                    (v) => v.length !== 2 || v.some((x) => !Number.isFinite(x)),
                  ))
              )
                fail(
                  c,
                  "control requires one or two XY pairs, separated by a semicolon.",
                );
              return {
                ...named(c),
                from: s(c, "from"),
                to: s(c, "to"),
                kind: one(c, "kind", edgeKinds, "wall"),
                control,
                join: one(c, "join", ["miter", "round"] as const, "miter"),
                height: opt(c, "height"),
                baseFloor: c.a["base-floor"],
                topFloor: c.a["top-floor"],
                spanFloors: b(c, "span-floors"),
                thickness: opt(c, "thickness"),
                material: c.a.material,
                openings: c.children.map((o) => ({
                  ...named(o),
                  kind: one(o, "kind", edgeKinds, "door"),
                  start: n(o, "start"),
                  end: n(o, "end"),
                  sill: n(o, "sill", 0),
                  head: n(o, "head", 2.1),
                  barricade: b(o, "barricade"),
                })),
              };
            }),
          regions: e.children
            .filter((c) => c.tag === "region")
            .map((c) => ({
              ...named(c),
              boundary: list(s(c, "boundary")),
              holes: c.children
                .filter((h) => h.tag === "hole")
                .map((h) => list(s(h, "boundary"))),
              fill: one(
                c,
                "fill",
                ["floor", "stairs", "ramp", "water"],
                "floor",
              ),
              interior: list(c.a.interior),
              creases: c.children
                .filter((h) => h.tag === "crease")
                .map((h) => [s(h, "from"), s(h, "to")] as [string, string]),
              material: c.a.material,
              ceiling: opt(c, "ceiling"),
              thickness: opt(c, "thickness"),
              role: c.a.role,
              lower: c.a.lower,
              upper: c.a.upper,
              rise: opt(c, "rise"),
              underside:
                c.a.underside === undefined
                  ? undefined
                  : one(
                      c,
                      "underside",
                      ["filled", "sloped", "stepped"] as const,
                      "filled",
                    ),
              area: c.a.area,
            })),
        });
        break;
      case "material":
        doc.materials.push({
          ...named(e),
          color: s(e, "color", "#b9c7d1"),
          repeat: n(e, "repeat", 1),
          roughness: n(e, "roughness", 0.8),
          metalness: n(e, "metalness", 0),
          texture: e.a.texture,
        });
        break;
      case "seam": {
        const edges = list(s(e, "edges"));
        if (edges.length !== 2) fail(e, "A seam needs two edge IDs.");
        doc.seams.push({
          ...named(e),
          edges: edges as [string, string],
          kind: one(e, "kind", ["open", "wall"], "open"),
          material: e.a.material,
        });
        break;
      }
      case "light":
        doc.lights.push({
          ...named(e),
          kind: one(e, "kind", ["directional", "point", "spot"], "point"),
          position: vector(e, "position", 3) as V3,
          target: vector(e, "target", 3, [0, 0, 0]) as V3,
          color: s(e, "color", "#ffffff"),
          intensity: n(e, "intensity", 1),
          angle: opt(e, "angle"),
        });
        break;
      case "marker":
        doc.markers.push({
          ...named(e),
          movement: e.a.movement
            ? one(e, "movement", ["land", "water", "none"] as const, "land")
            : undefined,
          layer: s(e, "layer"),
          region: e.a.region,
          position: vector(e, "position", 3) as V3,
          kind: s(e, "kind", "poi"),
          team: e.a.team,
        });
        break;
      case "route":
        doc.routes.push({
          ...named(e),
          movement: e.a.movement
            ? one(e, "movement", ["land", "water"] as const, "land")
            : undefined,
          from: s(e, "from"),
          to: s(e, "to"),
          minRoutes: n(e, "min-routes", 1),
          minDistance: opt(e, "min-distance"),
          maxDistance: opt(e, "max-distance"),
        });
        break;
      case "link":
        doc.links.push({
          ...named(e),
          movement: e.a.movement
            ? one(e, "movement", ["land", "water"] as const, "land")
            : undefined,
          from: vector(e, "from", 3) as V3,
          to: vector(e, "to", 3) as V3,
          kind: s(e, "kind"),
          bidirectional: b(e, "bidirectional", true),
          ability: e.a.ability,
          fromArea: e.a["from-area"],
          toArea: e.a["to-area"],
        });
        break;
      case "cover":
        doc.covers.push({
          ...named(e),
          layer: s(e, "layer"),
          min: vector(e, "min", 3) as V3,
          max: vector(e, "max", 3) as V3,
          material: e.a.material,
          dynamic: b(e, "dynamic"),
          role: e.a.role,
        });
        break;
      case "asset":
        (doc.assets ??= []).push({ ...named(e), src: s(e, "src") });
        break;
      case "prop":
        s(e, "collision");
        (doc.props ??= []).push({
          ...named(e),
          layer: s(e, "layer"),
          shape: one(e, "shape", ["box", "cylinder", "asset"], "box"),
          position: vector(e, "position", 3) as V3,
          rotation: vector(e, "rotation", 3, [0, 0, 0]) as V3,
          scale: vector(e, "scale", 3, [1, 1, 1]) as V3,
          material: s(e, "material", "default"),
          collision: one(e, "collision", ["solid", "none", "box"], "solid"),
          asset: e.a.asset,
          segments: opt(e, "segments"),
        });
        break;
      case "reference":
        (doc.references ??= []).push({
          ...named(e),
          image: s(e, "image"),
          width: n(e, "width"),
          height: n(e, "height"),
          scale: one(e, "scale", ["assumed", "measured"], "assumed"),
          scaleNote: s(e, "scale-note"),
          camera: {
            position: vector(e, "position", 3) as V3,
            target: vector(e, "target", 3) as V3,
            up: vector(e, "up", 3, [0, 0, 1]) as V3,
            fov: n(e, "fov", 45),
            near: n(e, "near", 0.05),
            far: n(e, "far", 2000),
          },
          landmarks: e.children
            .filter((c) => c.tag === "landmark")
            .map((c) => ({
              ...named(c),
              position: vector(c, "position", 3) as V3,
              image: vector(c, "image", 2) as [number, number],
            })),
          masks: e.children
            .filter((c) => c.tag === "mask")
            .map((c) => ({
              ...named(c),
              points: s(c, "points")
                .split(";")
                .map(
                  (pair) =>
                    pair.trim().split(/\s+/).map(Number) as [number, number],
                ),
            })),
        });
        break;
      case "boat":
        doc.boat = {
          radius: n(e, "radius", DEFAULT_BOAT.radius),
          draft: n(e, "draft", DEFAULT_BOAT.draft),
          height: n(e, "height", DEFAULT_BOAT.height),
        };
        for (const [key, value] of Object.entries(doc.boat))
          if (value <= 0) fail(e, `Boat ${key} must be positive.`);
        break;
      case "player":
        for (const k of Object.keys(doc.player))
          (doc.player as any)[k] =
            typeof (doc.player as any)[k] === "boolean"
              ? b(e, k, (doc.player as any)[k])
              : n(e, k, (doc.player as any)[k]);
        break;
      case "sky":
        doc.sky = {
          color: s(e, "color", "#dce8f5"),
          intensity: n(e, "intensity", 0.5),
        };
        break;
      case "no-spawn-los": {
        const pair = list(s(e, "markers"));
        if (pair.length !== 2) fail(e, "Expected two marker IDs.");
        doc.noSpawnLos.push(pair as [string, string]);
        break;
      }
    }
  issues.push(
    ...validateProps(doc),
    ...(doc.references ?? []).flatMap(validateReference),
  );
  if (issues.length) throw new SvgxError(issues);
  const normalized = normalizeCoordinates(doc),
    normalizedIssues = [
      ...validateProps(normalized),
      ...(normalized.references ?? []).flatMap(validateReference),
    ];
  if (normalizedIssues.length) throw new SvgxError(normalizedIssues);
  return normalized;
}
