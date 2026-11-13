import { placePosters } from "./poster-placement.ts";
import { Matrix3, Vector3 } from "three";
import { AmlError } from "../architecture/format.ts";
import type { ArchitectureResolution } from "../architecture/resolve.ts";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { emptyMesh } from "../vector/mesh.ts";
import { aborted } from "../vector/types.ts";
import { Rng } from "../generate/rng.ts";
import { triangle, wallFrame } from "./geometry.ts";
import { FINISH_ROLES, kitMaterials, WallWindows } from "./kit.ts";
import {
  KowloonBuildings,
  type BuildingRequest,
} from "./kowloon/building.ts";
import { defaultStories, ROOF_RESERVE } from "./kowloon/massing.ts";
import { buildingFootprint } from "./kowloon/footprint.ts";
import { contactSeams } from "./seams.ts";
import { weatherColor } from "./weather.ts";
import { dressPlainWalls } from "./walls.ts";
import { wallMaterials, WALL_FINISH_ROLES } from "./wall-materials.ts";
import { plainWallFinish, registerPlainWallSurface, wallFinishColor, wallFinishSections, type PlainWallFinish } from "./wall-finish.ts";
import { materialRecipeKey } from "./surface/material.ts";
import { spatialDiagnostic } from "../vector/diagnostics.ts";
import type { DressingRule } from "./types.ts";
import { dressGround, groundRuleError, type GroundFace } from "./ground.ts";
import { dressSpans } from "./spans/spans.ts";

/** Raises an actionable authoring error at the recipe source. */
function invalid(
  rule: Pick<DressingRule, "host" | "source">,
  message: string,
): never {
  throw new AmlError([
    {
      severity: "error",
      code: "AML_DRESSING",
      message,
      objects: [rule.host],
      source: rule.source,
    },
  ]);
}

/** Computes rectangle coverage from clipped façade triangles in local X/Z. */
function covered(
  triangles: V3[][],
  left: number,
  right: number,
  bottom: number,
  top: number,
): boolean {
  let area = 0;
  for (const triangle of triangles) {
    let polygon = triangle.map((p) => [p[0], p[2]]);
    for (const [axis, bound, sign] of [
      [0, left, 1],
      [0, right, -1],
      [1, bottom, 1],
      [1, top, -1],
    ]) {
      const output: number[][] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length],
          da = sign * (a[axis] - bound),
          db = sign * (b[axis] - bound);
        if (da >= 0) output.push(a);
        if (da >= 0 !== db >= 0)
          output.push(a.map((v, j) => v + (da / (da - db)) * (b[j] - v)));
      }
      polygon = output;
    }
    for (let i = 1; i + 1 < polygon.length; i++) {
      const [a, b, c] = [polygon[0], polygon[i], polygon[i + 1]];
      area +=
        Math.abs(
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
        ) / 2;
    }
  }
  return Math.abs(area - (right - left) * (top - bottom)) < 1e-5;
}

/** Applies explicit AML recipes to detached render geometry before hashes and lightmap UVs. */
export function applyDressing(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  maximumTriangles: number,
  signal?: AbortSignal,
) {
  const settings = level.architecture.dressing;
  if (!settings) return;
  const settingsLocation = {
    host: level.architecture.id,
    source: settings.source ?? level.architecture.source,
  };
  if (
    settings.theme !== "kowloon-street@1" ||
    !settings.seed ||
    !["low", "medium", "high"].includes(settings.detail)
  )
    invalid(settingsLocation, "Invalid dressing theme, seed, or detail.");
  if (settings.timeOfDay !== undefined && !["day", "night"].includes(settings.timeOfDay))
    invalid(settingsLocation, "Dressing time-of-day must be day or night.");
  if (settings.rules.length > 128)
    invalid(settingsLocation, "Dressing is limited to 128 receiving hosts.");
  if (settings.wallMaterials && (!settings.wallMaterials.length || settings.wallMaterials.length > 8
    || new Set(settings.wallMaterials).size !== settings.wallMaterials.length
    || settings.wallMaterials.some(id => !level.architecture.materials.some(material => material.id === id))))
    invalid(settingsLocation, "wall-materials requires one to eight distinct declared materials.");
  for (const value of [settings.grime, settings.wear, settings.rust ?? settings.wear])
    if (!Number.isFinite(value) || value < 0 || value > 1)
      invalid(settingsLocation, "Grime, wear and rust must be between 0 and 1.");
  const finishRoles = [...FINISH_ROLES, ...WALL_FINISH_ROLES];
  if (
    settings.finishes !== undefined &&
    !finishRoles.some((role) =>
      level.architecture.materials.some(
        (m) => m.id === `${settings.finishes}-${role}`,
      ),
    )
  )
    invalid(
      settingsLocation,
      `No kit finish is declared under the prefix; expected ${finishRoles.map((role) => `${settings.finishes}-${role}`).join(", ")}.`,
    );
  const lettering = level.architecture.materials.find((m) => m.id === `${settings.finishes}-lettering`);
  if (settings.finishes !== undefined && lettering && lettering.alphaCutoff === undefined)
    invalid(
      settingsLocation,
      `The lettering finish ${lettering.id} is a glyph atlas whose alpha is a distance field; give it alpha-cutoff="0.5".`,
    );
  const used = new Set<string>();
  for (const rule of settings.rules) {
    const node = resolution.nodes.get(rule.host);
    if (!node) invalid(rule, "Unknown dressing host.");
    if (used.has(rule.host)) invalid(rule, "Use one dressing rule per host.");
    used.add(rule.host);
    for (const value of [
      rule.grime ?? settings.grime,
      rule.wear ?? settings.wear,
      rule.rust ?? settings.rust ?? settings.wear,
    ])
      if (!Number.isFinite(value) || value < 0 || value > 1)
        invalid(rule, "Grime, wear and rust must be between 0 and 1.");
    if (rule.rust !== undefined && rule.kind !== "building") invalid(rule, "Per-rule rust is currently supported on buildings.");
    const tileSettings = [rule.tileSize, rule.tileAspect, rule.tileWear, rule.tileGrime, rule.tileColor, rule.tilePlasterColor];
    if (tileSettings.some(value => value !== undefined)
      && !(rule.kind === "floor" && rule.ground === "patched") && (rule.kind !== "wall" || rule.windows))
      invalid(rule, "Tile controls require a patched floor or a plain wall with windows=false.");
    for (const [name, value] of [["tile-size", rule.tileSize], ["tile-aspect", rule.tileAspect]] as const)
      if (value !== undefined && (!Number.isFinite(value) || value <= 0))
        invalid(rule, `${name} must be finite and positive.`);
    const tileWidths = rule.tileSize !== undefined ? [rule.tileSize] : rule.kind === "floor" ? [0.4] : [0.09, 0.24];
    if (rule.tileAspect !== undefined && tileWidths
      .some(width => !Number.isFinite(width / rule.tileAspect!) || width / rule.tileAspect! <= 0))
      invalid(rule, "Tile size and aspect must produce a finite positive tile height.");
    if (rule.tileWear !== undefined && (!Number.isFinite(rule.tileWear) || rule.tileWear < 0 || rule.tileWear > 1))
      invalid(rule, "Tile-wear must be between 0 and 1.");
    if (rule.tileGrime !== undefined && (!Number.isFinite(rule.tileGrime) || rule.tileGrime < 0 || rule.tileGrime > 1))
      invalid(rule, "Tile-grime must be between 0 and 1.");
    if (rule.tileColor !== undefined && !/^#[0-9a-f]{6}$/i.test(rule.tileColor))
      invalid(rule, "Tile-color must be a six-digit sRGB hex color.");
    if (rule.tilePlasterColor !== undefined && !/^#[0-9a-f]{6}$/i.test(rule.tilePlasterColor))
      invalid(rule, "Tile-plaster-color must be a six-digit sRGB hex color.");
    if (!level.architecture.materials.some((m) => m.id === rule.material))
      invalid(rule, "Unknown dressing material.");
    const groundError = groundRuleError(rule, node.element.kind);
    if (groundError) invalid(rule, groundError);
    if (rule.asphaltMaterial !== undefined && !level.architecture.materials.some(m => m.id === rule.asphaltMaterial))
      invalid(rule, "Unknown asphalt material.");
    if (rule.kind === "building") {
      if (
        (node.element.kind !== "box" && node.element.kind !== "extrusion") ||
        node.element.collidable !== false ||
        node.parent ||
        node.element.dynamic
      )
        invalid(
          rule,
          "A building requires a standalone, static, non-collidable box or convex extrusion.",
        );
      const axes = [0, 1, 2].map((axis) =>
        new Vector3().setFromMatrixColumn(node.matrix, axis),
      );
      if (
        axes.some((axis) => Math.abs(axis.length() - 1) > 1e-6) ||
        Math.abs(axes[2].z - 1) > 1e-6
      )
        invalid(
          rule,
          "Buildings require a level, unscaled placement; yaw and horizontal reflection are supported.",
        );
      const box = node.element.kind === "extrusion" ? buildingFootprint(node, resolution, rule) : node.element;
      if (node.element.kind === "extrusion" && (rule.baseWall || (rule.shops ?? 0) > 0))
        invalid(rule, "Polygon buildings currently support closed ground frontages; base-wall and open shops require box hosts.");
      if (
        box.width < 3 ||
        box.depth < 3 ||
        box.width > 40 ||
        box.depth > 40 ||
        box.height > 40
      )
        invalid(
          rule,
          "Building width/depth must be 3–40 m and height at most 40 m.",
        );
      const stories =
        rule.stories ?? defaultStories(box.height);
      if (
        !Number.isInteger(stories) ||
        stories < 1 ||
        (box.height - ROOF_RESERVE) / stories < 2.8
      )
        invalid(
          rule,
          "Requested stories cannot fit 2.8 m floor-to-floor heights and a roof.",
        );
      if (!rule.windows || rule.face !== "front")
        invalid(rule, "The building kit requires windows and front frontage.");
      if (rule.shops !== undefined && (!Number.isFinite(rule.shops) || rule.shops < 0 || rule.shops > 1))
        invalid(rule, "Building shops must be between 0 and 1.");
      if (rule.textureDensity !== undefined && (!Number.isFinite(rule.textureDensity) || rule.textureDensity < 16 || rule.textureDensity > 1024))
        invalid(rule, "Building texture-density must be between 16 and 1024 texels per meter.");
    } else {
      if (rule.textureDensity !== undefined && !(rule.kind === "floor" && rule.ground === "patched")
        && (rule.kind !== "wall" || rule.windows))
        invalid(rule, "Texture-density requires a patched floor, building, or plain wall with windows=false.");
      if (rule.textureDensity !== undefined && (!Number.isFinite(rule.textureDensity) || rule.textureDensity < 16 || rule.textureDensity > 1024))
        invalid(rule, "Texture-density must be between 16 and 1024 texels per meter.");
      if (rule.baseWall) invalid(rule, "base-wall applies only to buildings.");
      if (rule.shops !== undefined) invalid(rule, "Shops apply only to buildings.");
      if (rule.stories !== undefined)
        invalid(rule, "Stories apply only to buildings.");
      if (rule.kind === "wall") {
        if (rule.windows && rule.tileShare !== undefined) invalid(rule, "Wall tile-share requires windows=false.");
        if (rule.tileShare !== undefined && (!Number.isFinite(rule.tileShare) || rule.tileShare < 0 || rule.tileShare > 1))
          invalid(rule, "Wall tile-share must be between 0 and 1.");
        if (node.element.kind !== "wall")
          invalid(rule, "Wall dressing requires a wall.");
        if (
          rule.windows &&
          resolution.path(node, node.element.path).length !== 2
        )
          invalid(rule, "Automatic windows require a straight wall.");
      } else if (rule.kind === "floor") {
        if (
          !["slab", "landing", "stairs", "ramp"].includes(node.element.kind) ||
          rule.face !== "top" ||
          rule.windows
        )
          invalid(
            rule,
            "Floor dressing requires a walking surface, top face, and windows=false.",
          );
      } else invalid(rule, "Unknown dressing rule kind.");
      if (
        !["front", "back", "left", "right", "top", "side"].includes(rule.face)
      )
        invalid(rule, "Unknown receiving face.");
    }
  }
  const replacedWalls = new Set<string>();
  const claimedWalls = new Set<string>();
  for (const rule of settings.rules) {
    if (!rule.baseWall) continue;
    const building = resolution.nodes.get(rule.host)!;
    const baseWall = resolution.nodes.get(rule.baseWall);
    if (
      !baseWall ||
      baseWall.element.kind !== "wall" ||
      baseWall.element.collidable === false
    )
      invalid(rule, "base-wall must name a native collidable wall.");
    if (claimedWalls.has(rule.baseWall))
      invalid(rule, "A base wall can belong to only one building.");
    claimedWalls.add(rule.baseWall);
    if (settings.rules.some((candidate) => candidate.host === rule.baseWall))
      invalid(rule, "Dress the building that owns this base wall.");
    const box = building.element;
    if (box.kind !== "box") continue;
    const inverse = building.matrix.clone().invert();
    const offset =
      box.anchor === "bottom-center"
        ? [-box.width / 2, -box.depth / 2, 0]
        : [0, 0, 0];
    const bounds = [box.width, box.depth, box.height - ROOF_RESERVE];
    const axis = resolution
      .path(baseWall, baseWall.element.path)
      .map((point) => new Vector3(...point).applyMatrix4(inverse));
    if (
      axis.some(
        (point) =>
          Math.abs(point.y - axis[0].y) > 1e-5 ||
          Math.abs(point.z - axis[0].z) > 1e-5,
      )
    )
      invalid(
        rule,
        "The base wall must run parallel to the building frontage at one elevation.",
      );
    let left = Infinity,
      right = -Infinity;
    let found = false;
    let frontage = false;
    let ground = false;
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      if (level.surfaces[level.mesh.surfaces[t]].object !== rule.baseWall)
        continue;
      if (level.surfaces[level.mesh.surfaces[t]].assignment)
        invalid(
          rule,
          "A building base wall cannot replace explicitly assigned faces.",
        );
      found = true;
      for (const index of level.mesh.indices.slice(t * 3, t * 3 + 3)) {
        const point = new Vector3(
          ...level.mesh.positions.slice(index * 3, index * 3 + 3),
        )
          .applyMatrix4(inverse)
          .toArray();
        left = Math.min(left, point[0]);
        right = Math.max(right, point[0]);
        frontage ||= Math.abs(point[1] - offset[1]) < 1e-5;
        ground ||= Math.abs(point[2]) < 1e-5;
        if (
          point.some(
            (value, axis) =>
              value - offset[axis] < -1e-5 ||
              value - offset[axis] > bounds[axis] + 1e-5,
          )
        )
          invalid(
            rule,
            "The building envelope must contain its complete base wall.",
          );
      }
    }
    if (
      Math.abs(left - offset[0]) > 1e-5 ||
      Math.abs(right - offset[0] - box.width) > 1e-5
    )
      invalid(rule, "The base wall must span the complete building frontage.");
    if (!frontage || !ground)
      invalid(
        rule,
        "The base wall must meet the building front and ground planes.",
      );
    if (
      [...resolution.nodes.values()].some(
        (node) =>
          node.element.kind === "opening" &&
          (node.scope
            ? `${node.scope}/${node.element.host}`
            : node.element.host) === rule.baseWall,
      )
    )
      invalid(
        rule,
        "A building base wall must be solid; functional entrances require authored building interiors.",
      );
    if (baseWall.element.dynamic)
      invalid(rule, "A building base wall must be static.");
    if (!found) invalid(rule, "The base wall has no exposed native geometry.");
    if (building.element.visible !== false) replacedWalls.add(rule.baseWall);
  }
  kitMaterials(level);
  wallMaterials(level);
  const contacts = contactSeams(level, signal),
    seams = contacts.byObject,
    original = level.mesh;
  const output = emptyMesh();
  output.colors = [];
  output.solidIds = [];
  level.mesh = output;
  const rules = new Map(settings.rules.map((rule) => [rule.host, rule]));
  const selected = new Map<string, V3[][]>();
  const grounds = new Map<string, GroundFace[]>();
  const phases = new Map(
    settings.rules.map((rule) => [
      rule.host,
      new Rng(`${settings.seed}/${rule.host}`).float(0, 100),
    ]),
  );
  const materialSurfaces = new Map<string, number>();
  const wallInverses = new Map(settings.rules
    .filter(rule => rule.kind === "wall" && !rule.windows)
    .map(rule => [rule.host, resolution.nodes.get(rule.host)!.matrix.clone().invert()]));
  // A plain wall weathers between the lowest and highest points of its own render geometry.
  const wallSpans = new Map<string, { base: number; top: number }>();
  for (let t = 0; t < original.surfaces.length; t++) {
    const host = level.surfaces[original.surfaces[t]].object;
    const inverse = wallInverses.get(host);
    if (!inverse) continue;
    const span = wallSpans.get(host) ?? { base: Infinity, top: -Infinity };
    for (const index of original.indices.slice(t * 3, t * 3 + 3)) {
      const z = new Vector3(...original.positions.slice(index * 3, index * 3 + 3)).applyMatrix4(inverse).z;
      span.base = Math.min(span.base, z);
      span.top = Math.max(span.top, z);
    }
    wallSpans.set(host, span);
  }
  const wallFinishes = new Map<string, PlainWallFinish>();
  for (const rule of settings.rules) {
    const span = wallSpans.get(rule.host);
    const node = resolution.nodes.get(rule.host)!;
    if (!span || node.element.kind !== "wall") continue;
    const inverse = wallInverses.get(rule.host)!;
    const path = resolution.path(node, node.element.path)
      .map(point => new Vector3(...point).applyMatrix4(inverse).toArray() as V3);
    wallFinishes.set(rule.host, plainWallFinish(path, span.base, span.top - span.base,
      rule.grime ?? settings.grime, rule.wear ?? settings.wear,
      new Rng(`${settings.seed}/${rule.host}/finish`).int(1, 2147483647)));
  }
  const continuousWalls = new Set(settings.rules.filter(rule => {
    const node = resolution.nodes.get(rule.host)!;
    if (rule.kind !== "wall" || rule.windows || node.element.kind !== "wall") return false;
    const path = resolution.path(node, node.element.path);
    return path.length > 2 || Math.abs(node.matrix.elements[10] - 1) > 1e-5
      || Math.abs(path[0][2] - path.at(-1)![2]) > 1e-5;
  }).map(rule => rule.host));
  const budget = { maximumTriangles, signal };
  const requests: BuildingRequest[] = [];
  for (const rule of settings.rules) {
    const node = resolution.nodes.get(rule.host)!;
    const box = node.element;
    if (rule.kind !== "building") continue;
    if (box.visible === false) continue;
    requests.push({ node, rule, footprint: box.kind === "extrusion" ? buildingFootprint(node, resolution, rule) : undefined });
  }
  const buildings = new KowloonBuildings(
    level,
    requests,
    settings,
    budget,
    level.physicalMesh ?? original,
    original,
  );
  let charged = 0;
  for (let t = 0; t < original.surfaces.length; t++) {
    if (++charged > maximumTriangles)
      throw new Error("Dressing triangle budget exceeded.");
    aborted(signal);
    const surfaceIndex = original.surfaces[t],
      surface = level.surfaces[surfaceIndex];
    if (replacedWalls.has(surface.object)) continue;
    const rule = rules.get(surface.object);
    if (rule?.kind === "building") continue;
    const indices = original.indices.slice(t * 3, t * 3 + 3);
    const points = indices.map(
      (i) => original.positions.slice(i * 3, i * 3 + 3) as V3,
    );
    const normal = original.normals.slice(
      indices[0] * 3,
      indices[0] * 3 + 3,
    ) as V3;
    let receives = false;
    if (rule && !surface.assignment && surface.visible !== false) {
      const node = resolution.nodes.get(rule.host)!;
      const n = new Vector3(...normal)
        .applyMatrix3(new Matrix3().setFromMatrix4(node.matrix).transpose())
        .normalize();
      const selections = {
        side: Math.abs(n.z) < 1e-5,
        top: n.z > 0.7,
        front: n.y < -0.99999,
        back: n.y > 0.99999,
        left: n.x < -0.99999,
        right: n.x > 0.99999,
      };
      receives = selections[rule.face];
    }
    if (!rule || !receives) {
      triangle(
        output,
        points,
        normal,
        indices.map((i) => original.uv.slice(i * 2, i * 2 + 2)),
        points.map(() => [1, 1, 1]),
        surfaceIndex,
        original.solidIds?.[t],
      );
      continue;
    }
    const targets = selected.get(rule.host) ?? [];
    targets.push(points);
    selected.set(rule.host, targets);
    if (rule.ground === "patched") {
      if (normal[2] < 0.99999 || points.some(p => Math.abs(p[2] - points[0][2]) > 1e-6))
        invalid(rule, "Patched ground requires horizontal receiving faces in world coordinates.");
      const faces = grounds.get(rule.host) ?? [];
      if (faces.length && Math.abs(points[0][2] - faces[0].points[0][2]) > 1e-6)
        invalid(rule, "Patched ground requires one horizontal receiving elevation per host.");
      faces.push({ points, surface: surfaceIndex });
      grounds.set(rule.host, faces);
      continue;
    }
    const fragments = rule.kind === "wall" && !rule.windows
      ? wallFinishSections(points, wallInverses.get(rule.host)!, rule.host, settings.seed, settings.wallMaterials?.length ?? 1, continuousWalls.has(rule.host))
      : [{ points, material: rule.material }];
    for (const fragment of fragments) {
      const materialKey = `${surfaceIndex}/${fragment.material}`;
      let painted = materialSurfaces.get(materialKey);
      if (painted === undefined) {
        painted = level.surfaces.length;
        level.surfaces.push({
          ...surface,
          id: `${surface.id}:${fragment.material}:dressed`,
          material: fragment.material,
        });
        materialSurfaces.set(materialKey, painted);
      }
      const repeat = level.document.materials.find(
        (m) => m.id === fragment.material,
      )!.repeat;
      const phase = phases.get(rule.host)!;
      const axes =
        Math.abs(normal[2]) > 0.7
          ? [0, 1]
          : Math.abs(normal[1]) > 0.7
            ? [0, 2]
            : [1, 2];
      const stack = [fragment.points];
      while (stack.length) {
        aborted(signal);
        if (++charged > maximumTriangles)
          throw new Error("Dressing triangle budget exceeded.");
        const face = stack.pop()!;
        const edges = [0, 1, 2].map((i) =>
          Math.hypot(...face[i].map((v, j) => v - face[(i + 1) % 3][j])),
        );
        const longest = Math.max(...edges),
          edge = edges.indexOf(longest);
        if (rule.kind !== "wall" && longest > 0.65) {
          const a = face[edge],
            b = face[(edge + 1) % 3],
            c = face[(edge + 2) % 3];
          const middle = a.map((v, i) => (v + b[i]) / 2) as V3;
          stack.push([a, middle, c], [middle, b, c]);
          continue;
        }
        const colors = face.map((p) => {
          const weather = weatherColor(
            p,
            rule.grime ?? settings.grime,
            rule.wear ?? settings.wear,
            phase,
          );
          if (rule.kind !== "wall" || rule.windows || Math.abs(normal[2]) > 1e-5) return weather;
          const local = new Vector3(...p).applyMatrix4(wallInverses.get(rule.host)!).toArray() as V3;
          return wallFinishColor(local, weather, wallFinishes.get(rule.host)!);
        });
        const angle =
          Math.floor(phase) * (rule.kind === "floor" ? Math.PI / 2 : Math.PI);
        const cosine = Math.round(Math.cos(angle)),
          sine = Math.round(Math.sin(angle));
        const uv = face.map((p) => {
          const local = rule.kind === "wall" && !rule.windows
            ? new Vector3(...p).applyMatrix4(wallInverses.get(rule.host)!) : undefined;
          const u = (local ? local.x * 0.83 + local.y * 0.67 : p[axes[0]]) * repeat;
          const v = (local ? local.z : p[axes[1]]) * repeat;
          return [
            u * cosine - v * sine + phase,
            u * sine + v * cosine + phase * 0.37,
          ];
        });
        const firstTriangle = output.surfaces.length;
        triangle(
          output,
          face,
          normal,
          uv,
          colors,
          painted,
          original.solidIds?.[t],
        );
        if (rule.kind === "wall" && !rule.windows && Math.abs(normal[2]) < 1e-5) {
          const backing = level.document.materials.find(entry => entry.id.startsWith(`$kowloon/wall-finish/${rule.host}/`) && entry.id !== fragment.material)?.id ?? fragment.material;
          registerPlainWallSurface(level, {
            host: rule.host, points: face, normal, firstTriangle, material: fragment.material, backing,
            inverse: wallInverses.get(rule.host)!, phase, tileShare: rule.tileShare ?? 0.35, wear: rule.wear ?? settings.wear, finish: wallFinishes.get(rule.host)!,
            tileSize: rule.tileSize, tileAspect: rule.tileAspect, tileWear: rule.tileWear, tileColor: rule.tileColor,
            tilePlasterColor: rule.tilePlasterColor,
            tileGrime: rule.tileGrime ?? rule.grime ?? settings.grime,
            textureDensity: rule.textureDensity,
            weather: point => weatherColor(point, rule.grime ?? settings.grime,
              rule.wear ?? settings.wear, phase),
            weatherKey: materialRecipeKey("wall-weather/v1", [rule.grime ?? settings.grime, rule.wear ?? settings.wear, phase]),
          });
        }
      }
    }
  }
  for (const rule of settings.rules) {
    aborted(signal);
    const node = resolution.nodes.get(rule.host)!;
    if (node.element.visible === false) continue;
    if (rule.ground === "patched") {
      dressGround(level, rule, grounds.get(rule.host) ?? [], seams.get(rule.host) ?? [], settings, budget, resolution, contacts.wallsByFloor.get(rule.host) ?? new Map());
    } else if (rule.kind === "building") {
      const job = buildings.generate(rule.host);
      buildings.append(job);
    } else if (rule.kind === "wall" && rule.windows) {
      const faces = selected.get(rule.host) ?? [];
      if (!faces.length)
        invalid(rule, "The selected wall face has no exposed area.");
      const a = new Vector3(...faces[0][0]),
        b = new Vector3(...faces[0][1]),
        c = new Vector3(...faces[0][2]);
      const n = b.sub(a).cross(c.sub(a)).normalize();
      if (Math.abs(n.z) > 1e-5)
        invalid(rule, "Automatic windows require vertical façades.");
      const tangent: V3 = [n.y, -n.x, 0],
        frame = wallFrame([0, 0, 0], tangent, n.toArray() as V3);
      const local = faces.map((face) =>
        face.map(
          (p) =>
            new Vector3(...p)
              .applyMatrix4(frame.clone().invert())
              .toArray() as V3,
        ),
      );
      const flat = local.flat(),
        y = flat[0][1];
      if (flat.some((p) => Math.abs(p[1] - y) > 1e-5))
        invalid(rule, "Automatic windows require one planar receiving face.");
      const minX = Math.min(...flat.map((p) => p[0])),
        maxX = Math.max(...flat.map((p) => p[0])),
        minZ = Math.min(...flat.map((p) => p[2])),
        maxZ = Math.max(...flat.map((p) => p[2]));
      frame.setPosition(n.x * y, n.y * y, 0);
      const kit = new WallWindows(
          level,
          node,
          frame,
          rule.material,
          settings,
          budget,
        ),
        bays = Math.floor((maxX - minX - 0.6) / 2.2);
      let count = 0;
      for (let bay = 0; bay < bays; bay++) {
        const x = minX + ((bay + 0.5) * (maxX - minX)) / bays,
          sill = minZ + 1.05,
          width = 1.2,
          height = Math.min(1.25, maxZ - minZ - 1.3);
        if (
          height < 0.6 ||
          !covered(
            local,
            x - width / 2 - 0.1,
            x + width / 2 + 0.1,
            sill - 0.1,
            sill + height + 0.12,
          )
        )
          continue;
        kit.bay(
          x,
          sill,
          width,
          height,
          new Rng(`${settings.seed}/${rule.host}/${bay}`),
        );
        count++;
      }
      if (!count)
        level.diagnostics.push({
          ...spatialDiagnostic(
            level,
            "DRESSING_NO_WINDOW_FIT",
            "No window bay fits the exposed face and its authored openings.",
            [rule.host],
            faces.flat(),
          ),
          source: rule.source,
        });
    }
  }
  buildings.settleSigns(original, new Set([...replacedWalls, ...requests.map(request => request.rule.host)]));
  dressPlainWalls(level, settings.rules.filter(rule => rule.kind === "wall" && !rule.windows)
    .map(rule => ({ rule, faces: selected.get(rule.host) ?? [], layer: resolution.nodes.get(rule.host)!.group,
      inverse: wallInverses.get(rule.host)!, continuous: continuousWalls.has(rule.host) })), settings, budget);
  dressSpans(level, resolution, settings, budget, level.physicalMesh ?? original);
  placePosters(level, resolution, budget);
  if (output.surfaces.length > maximumTriangles)
    throw new Error("Dressing triangle budget exceeded.");
}
