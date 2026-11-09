import {
  createRuntimeContext,
  type FloorPatch,
  type Layer,
  type RuntimeContext,
  type V3,
} from "../vector/types.ts";
import type { ArchitectureResolution } from "./resolve.ts";
import type { ArchitectureDocument, CompiledArchitecture } from "./types.ts";

/** Shared backends consume semantic runtime context; native geometry never compiles through this view. */
export function runtimeContext(document: ArchitectureDocument): RuntimeContext {
  const context = createRuntimeContext(document.id);
  context.name = document.name;
  context.description = document.description;
  context.source = document.source;
  context.validation = document.validation;
  context.curveTolerance = document.curveTolerance;
  context.player = structuredClone(document.player);
  context.boat = structuredClone(document.boat);
  context.materials = structuredClone(document.materials);
  context.markers = structuredClone(document.markers);
  context.routes = structuredClone(document.routes);
  context.lights = structuredClone(document.lights);
  context.links = structuredClone(document.links);
  context.references = structuredClone(document.references);
  context.sky = structuredClone(document.sky);
  context.noSpawnLos = structuredClone(document.noSpawnLos);
  context.reviewSuppressions = structuredClone(document.reviewSuppressions);
  return context;
}

/** Supplies derived axes and profiles to the existing read-only reviewer and relationship audits. */
export function runtimeGuides(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  wallPaths: Map<string, V3[]>,
  flightRails: Map<string, [V3[], V3[]]>,
  floorSources: Map<string, FloorPatch>,
): void {
  const context = level.document;
  const layerFor = (id: string): Layer => {
    let layer = context.layers.find((layer) => layer.id === id);
    if (!layer) {
      layer = { id, vertices: [], edges: [], regions: [] };
      context.layers.push(layer);
    }
    return layer;
  };
  const axis = (
    layer: Layer,
    id: string,
    points: V3[],
    kind: "wall" | "open" = "open",
    thickness?: number,
  ) => {
    const node = resolution.nodes.get(id),
      start = `${id}:start`,
      end = `${id}:end`;
    layer.vertices.push(
      { id: start, x: points[0][0], y: points[0][1], z: points[0][2] },
      {
        id: end,
        x: points.at(-1)![0],
        y: points.at(-1)![1],
        z: points.at(-1)![2],
      },
    );
    layer.edges.push({
      id,
      source: node?.element.source,
      kind,
      from: start,
      to: end,
      openings: [],
      thickness,
    });
    level.curves[id] = points;
  };
  for (const [id, points] of wallPaths) {
    const node = resolution.nodes.get(id)!;
    axis(
      layerFor(node.group),
      id,
      points,
      "wall",
      "thickness" in node.element ? node.element.thickness : undefined,
    );
  }
  for (const [id, profile] of floorSources) {
    const node = resolution.nodes.get(id)!,
      layer = layerFor(node.group),
      region = layer.regions.find((region) => region.id === id);
    if (!region) continue;
    const flight = flightRails.get(id);
    if (flight) {
      const [left, right] = flight,
        lower = `${id}:lower`,
        upper = `${id}:upper`,
        leftId = `${id}:left`,
        rightId = `${id}:right`;
      axis(layer, lower, [left[0], right[0]]);
      axis(layer, upper, [left.at(-1)!, right.at(-1)!]);
      axis(layer, leftId, left);
      axis(layer, rightId, right);
      const lowEdge = layer.edges.find((edge) => edge.id === lower)!,
        highEdge = layer.edges.find((edge) => edge.id === upper)!;
      const leftEdge = layer.edges.find((edge) => edge.id === leftId)!,
        rightEdge = layer.edges.find((edge) => edge.id === rightId)!;
      leftEdge.from = lowEdge.from;
      leftEdge.to = highEdge.from;
      rightEdge.from = lowEdge.to;
      rightEdge.to = highEdge.to;
      region.boundary = [leftId, upper, `-${rightId}`, `-${lower}`];
      region.lower = lower;
      region.upper = upper;
      if (node.element.kind === "stairs" || node.element.kind === "ramp") {
        const rise = left.at(-1)![2] - left[0][2];
        region.rise = node.element.count
          ? rise / node.element.count
          : node.element.maximumRiser;
        if (["filled", "sloped", "stepped"].includes(node.element.underside))
          region.underside = node.element.underside as
            "filled" | "sloped" | "stepped";
      }
    } else {
      const loops = profile.loops.map((points, loop) =>
        points.map((point, i) => {
          const edge = `${id}:loop:${loop}:${i}`;
          axis(layer, edge, [point, points[(i + 1) % points.length]]);
          return edge;
        }),
      );
      region.boundary = loops[0] ?? [];
      region.holes = loops.slice(1);
    }
  }
  context.assets = [...resolution.nodes.values()].flatMap((node) =>
    node.element.kind === "visual-mesh"
      ? [{ id: node.id, src: node.element.src }]
      : [],
  );
}
