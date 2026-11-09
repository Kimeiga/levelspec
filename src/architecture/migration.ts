import { parseLevelSvgx } from "../migration/svgx-reader.ts";
import { createArchitecture, AmlError } from "./format.ts";
import { pathLength, tessellate } from "../vector/geometry.ts";
import { boxGeometry, cylinderGeometry, validateAssetGeometry, type AssetResolver } from "../vector/props.ts";
import { aborted, type Edge, type Region, type V3 } from "../vector/types.ts";
import type { ArchitectureDocument, ArchitectureElement, ArchitecturePath, ArchitectureProfile, Aperture, Collection, Wall } from "./types.ts";

export interface MigrationOptions { resolveAsset?: AssetResolver; signal?: AbortSignal }

/**
 * Mechanically translates supported SVGX source objects. It preserves approximations,
 * including sliced apertures; architectural rewriting is a separate authoring task.
 */
export async function migrateSvgx(text: string, options: MigrationOptions = {}): Promise<ArchitectureDocument> {
  aborted(options.signal);
  const old = parseLevelSvgx(text), document = createArchitecture(old.id);
  Object.assign(document, { name: old.name, description: old.description, validation: old.validation ?? "playable", curveTolerance: old.curveTolerance,
    player: old.player, boat: old.boat, materials: old.materials, markers: old.markers, routes: old.routes, links: old.links,
    references: old.references ?? [], lights: old.lights, sky: old.sky, reviewSuppressions: old.reviewSuppressions ?? [], noSpawnLos: old.noSpawnLos });
  const ids = new Set([old.id, ...old.layers.flatMap(layer => [layer.id, ...layer.vertices.map(vertex => vertex.id), ...layer.edges.flatMap(edge => [edge.id, ...edge.openings.map(opening => opening.id)]), ...layer.regions.map(region => region.id)]),
    ...[...old.seams, ...old.covers, ...(old.props ?? []), ...(old.assets ?? []), ...old.materials, ...old.routes, ...old.markers, ...old.links, ...old.lights,
      ...(old.references ?? []).flatMap(reference => [reference, ...reference.landmarks, ...reference.masks])].map(object => object.id)]);
  const unique = (name: string) => { let id = name, index = 1; while (ids.has(id)) id = `${name}:${index++}`; ids.add(id); return id; };
  const pathIds = new Map<string, string>(), curves = new Map<string, V3[]>(), owners = new Map<string, Region[]>(), edgeById = new Map<string, Edge>();
  const walls: Collection = { id: unique("migration:static-walls"), kind: "assembly", children: [], coincidentMaterial: "retained-face" };
  const pathReference = (reference: string) => reference.startsWith("-") ? `-${pathIds.get(reference.slice(1))!}` : pathIds.get(reference)!;
  const openings: Aperture[] = [];
  for (const layer of old.layers) for (const edge of layer.edges) {
    edgeById.set(edge.id, edge);
    const vertices = new Map(layer.vertices.map(vertex => [vertex.id, vertex])), a = vertices.get(edge.from), b = vertices.get(edge.to);
    if (!a || !b) throw new AmlError([{ severity: "error", code: "AML_MIGRATION", message: "Cannot migrate an edge with missing vertices.", objects: [edge.id], source: edge.source }]);
    const path: ArchitecturePath = { id: unique(`${edge.id}:path`), source: edge.source, points: [[a.x, a.y, a.z]], segments: [], closed: false };
    if (edge.control?.length) {
      path.segments.push({ kind: "bezier", controls: edge.control.map(([x, y]) => [x, y, 0]), to: [b.x, b.y, b.z] }); path.elevation = [a.z, b.z];
    } else path.points.push([b.x, b.y, b.z]);
    pathIds.set(edge.id, path.id); curves.set(edge.id, tessellate(edge, layer, old.curveTolerance)); document.paths.push(path);
  }
  for (const layer of old.layers) for (const region of layer.regions) for (const reference of region.boundary) {
    const id = reference.replace(/^-/, ""); owners.set(id, [...(owners.get(id) ?? []), region]);
  }
  for (const [id, regions] of owners) {
    if (regions.length !== 2) continue;
    const edge = edgeById.get(id)!;
    const traversable = edge.kind === "open" || ["door", "arch", "breach", "rappel_door"].includes(edge.kind) || edge.openings.some(opening => opening.end - opening.start >= old.player.radius * 2 && opening.sill <= Math.max(old.player.step, old.player.vault) && opening.head - opening.sill >= old.player.crouch);
    if (traversable) document.connections.push({ id: unique(`${id}:connection`), source: edge.source, from: regions[0].id, to: regions[1].id, path: pathIds.get(id) });
  }
  for (const layer of old.layers) {
    const group: Collection = { id: layer.id, label: layer.label, source: layer.source, kind: "group", children: [] };
    const vertices = new Map(layer.vertices.map(vertex => [vertex.id, [vertex.x, vertex.y, vertex.z] as V3]));
    for (const region of layer.regions) {
      const profile: ArchitectureProfile = { id: unique(`${region.id}:profile`), source: region.source, outer: { paths: region.boundary.map(pathReference) },
        holes: region.holes.map(hole => ({ paths: hole.map(pathReference) })), interior: region.interior.map(id => vertices.get(id)!),
        breaklines: region.creases.map(pair => pair.map(id => vertices.get(id)!)) };
      document.profiles.push(profile);
      const base = { id: region.id, label: region.label, source: region.source, group: layer.id, material: region.material };
      if (region.fill === "stairs" || region.fill === "ramp") {
        if (!region.lower || !region.upper) throw new Error(`Cannot migrate ${region.id}: missing landing references.`);
        const refs = region.boundary, low = refs.findIndex(ref => ref.replace(/^-/, "") === region.lower), high = refs.findIndex(ref => ref.replace(/^-/, "") === region.upper);
        if (low < 0 || high < 0) throw new Error(`Cannot migrate ${region.id}: landing is outside its boundary.`);
        const between = (start: number, end: number) => { const result: string[] = []; for (let i = (start + 1) % refs.length; i !== end; i = (i + 1) % refs.length) result.push(pathReference(refs[i])); return result; };
        const left = unique(`${region.id}:left`), right = unique(`${region.id}:right`);
        document.paths.push({ id: left, points: [], segments: [], paths: between(low, high), closed: false },
          { id: right, points: [], segments: [], paths: between(high, low).reverse().map(ref => ref.startsWith("-") ? ref.slice(1) : `-${ref}`), closed: false });
        group.children.push({ ...base, kind: region.fill, left, right, maximumRiser: region.fill === "stairs" ? region.rise ?? .18 : undefined, thickness: region.thickness ?? old.floorThickness, underside: region.underside ?? "filled", area: region.area });
      } else if (region.fill === "water") group.children.push({ ...base, kind: "water", profile: profile.id, elevation: 0 });
      else group.children.push({ ...base, kind: "slab", profile: profile.id, elevation: 0, thickness: region.thickness ?? old.floorThickness, area: region.area });
      if (region.ceiling !== undefined) group.children.push({ ...base, id: unique(`${region.id}:ceiling`), kind: "roof", profile: profile.id,
        elevation: region.ceiling + old.floorThickness, thickness: old.floorThickness, flat: true });
    }
    for (const edge of layer.edges) {
      if (edge.kind === "open") continue;
      const dynamic = ["soft", "glass"].includes(edge.kind);
      const wall: Wall = { id: edge.id, label: edge.label, source: edge.source, kind: "wall", group: layer.id, path: pathIds.get(edge.id)!, thickness: edge.thickness ?? old.wallThickness,
        height: edge.spanFloors ? edge.height : edge.height ?? (edge.kind === "railing" ? 1.1 : old.wallHeight), material: edge.material, alignment: "center", join: edge.join ?? "miter", dynamic,
        baseFloor: edge.baseFloor, topFloor: edge.topFloor, spanFloors: edge.spanFloors };
      const contact = edge.baseFloor ?? (owners.get(edge.id)?.length === 1 && owners.get(edge.id)![0].fill !== "stairs" ? owners.get(edge.id)![0].id : undefined);
      if (contact) wall.fitFloor = contact;
      (dynamic ? group.children : walls.children).push(wall);
      const cuts = [...edge.openings];
      if (["door", "window", "arch", "breach", "rappel_window", "rappel_door"].includes(edge.kind)) cuts.push({ id: unique(`${edge.id}:opening`), kind: edge.kind, start: 0, end: pathLength(curves.get(edge.id)!), sill: edge.kind.includes("window") ? .9 : 0, head: edge.kind === "arch" ? 2.4 : 2.1 });
      for (const opening of cuts) {
        const aperture: Aperture = { id: opening.id, label: opening.label, source: opening.source, kind: "opening", group: layer.id, host: edge.id, shape: "rectangle", mode: "through",
          center: [(opening.start + opening.end) / 2, (opening.sill + opening.head) / 2], width: opening.end - opening.start, height: opening.head - opening.sill,
          radius: .5, radii: [.5, .5], offset: 0 };
        openings.push(aperture);
        if (opening.barricade) group.children.push({ id: unique(`${opening.id}:panel`), kind: "panel", opening: opening.id, depth: wall.thickness, offset: -wall.thickness / 2, border: 0, material: edge.material, dynamic: true });
      }
    }
    document.elements.push(group);
  }
  for (const seam of old.seams) {
    const a = curves.get(seam.edges[0]), b = curves.get(seam.edges[1]);
    if (!a || !b) throw new Error(`Cannot migrate ${seam.id}: unknown seam edge.`);
    const reversed = Math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1]) > 1e-7, oriented = reversed ? [...b].reverse() : b;
    const difference = a.map((point, i) => point[2] - oriented[Math.min(i, oriented.length - 1)][2]).find(value => Math.abs(value) > 1e-7) ?? 0;
    const low = difference <= 0 ? seam.edges[0] : seam.edges[1], high = low === seam.edges[0] ? seam.edges[1] : seam.edges[0];
    if (seam.kind === "open" && Math.max(...a.map((point, i) => Math.abs(point[2] - oriented[Math.min(i, oriented.length - 1)][2]))) <= old.player.step && owners.get(low)?.[0] && owners.get(high)?.[0])
      document.connections.push({ id: unique(`${seam.id}:connection`), from: owners.get(low)![0].id, to: owners.get(high)![0].id, path: pathIds.get(low) });
    walls.children.push({ id: seam.id, label: seam.label, source: seam.source, kind: "retaining-wall", lower: pathIds.get(low)!, upper: pathIds.get(high)!,
      lowerFloor: owners.get(low)?.[0]?.id, upperFloor: owners.get(high)?.[0]?.id, thickness: old.wallThickness, height: old.wallHeight, mode: seam.kind, material: seam.material,
      group: old.layers.find(layer => layer.edges.some(edge => edge.id === low))!.id });
  }
  if (walls.children.length) document.elements.push(walls);
  document.elements.push(...openings);
  for (const cover of old.covers) document.elements.push({ id: cover.id, label: cover.label, source: cover.source, kind: "box", position: [...cover.min],
    width: cover.max[0] - cover.min[0], depth: cover.max[1] - cover.min[1], height: cover.max[2] - cover.min[2], radius: .5, topRadius: 0, material: cover.material, dynamic: cover.dynamic, group: cover.layer });
  for (const prop of old.props ?? []) {
    aborted(options.signal);
    const base = { id: prop.id, label: prop.label, source: prop.source, group: prop.layer, material: prop.material, position: prop.position, rotation: prop.rotation, scale: prop.scale };
    if (prop.shape === "asset") {
      const asset = old.assets?.find(asset => asset.id === prop.asset); if (!asset) throw new Error(`Cannot migrate ${prop.id}: unknown mesh asset.`);
      document.elements.push({ ...base, kind: "visual-mesh", src: asset.src, collidable: false });
      if (prop.collision !== "none") {
        if (!options.resolveAsset) throw new Error(`Migrating physical mesh ${prop.id} requires resolveAsset to freeze its native proxy.`);
        const geometry = await options.resolveAsset(asset, options.signal); aborted(options.signal); validateAssetGeometry(geometry);
        let proxy = geometry;
        if (prop.collision === "box") {
          const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
          for (const point of geometry.positions) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], point[i]); max[i] = Math.max(max[i], point[i]); }
          proxy = boxGeometry(min, max);
        }
        document.elements.push({ ...base, id: unique(`${prop.id}:collision`), kind: "faceted-solid", geometry: structuredClone(proxy), visible: false, collidable: true });
      }
    } else if (prop.shape === "box") {
      document.elements.push({ ...base, kind: "box", anchor: "bottom-center", scale: undefined,
        width: prop.scale[0], depth: prop.scale[1], height: prop.scale[2], radius: .5, topRadius: 0, collidable: prop.collision !== "none" });
    } else {
      document.elements.push({ ...base, kind: "cylinder", width: 1, depth: 1, height: 1, radius: .5, topRadius: .5, segments: prop.segments ?? 16, collidable: prop.collision === "solid" });
      if (prop.collision === "box") {
        const geometry = cylinderGeometry(prop.segments ?? 16), min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
        for (const point of geometry.positions) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], point[i]); max[i] = Math.max(max[i], point[i]); }
        document.elements.push({ ...base, id: unique(`${prop.id}:collision`), kind: "faceted-solid", geometry: boxGeometry(min, max), visible: false, collidable: true });
      }
    }
  }
  return document;
}
