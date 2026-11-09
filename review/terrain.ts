import * as THREE from "three";
import type { CompiledLevel, V3 } from "../src/vector/types.ts";

interface Outline {
  object: string;
  label: string;
  points: V3[];
  color: string;
}

/** Returns presentation-only segments for native assertions, grades, and tile bounds. */
function outlines(level: CompiledLevel): Outline[] {
  const result: Outline[] = [];
  const loop = (object: string, label: string, points: V3[], color: string) => {
    if (points.length)
      result.push({ object, label, points: [...points, points[0]], color });
  };
  for (const volume of level.spatialVolumes ?? []) {
    const color = volume.kind === "clearance" ? "#bc694a" : "#538a9d";
    for (const points of volume.loops) {
      loop(volume.id, `${volume.kind} ${volume.id}`, points, color);
      loop(
        volume.id,
        `${volume.kind} ${volume.id}`,
        points.map((p) => p.map((n, i) => n + volume.extrusion[i]) as V3),
        color,
      );
      for (const p of points)
        result.push({
          object: volume.id,
          label: volume.id,
          points: [p, p.map((n, i) => n + volume.extrusion[i]) as V3],
          color,
        });
    }
  }
  for (const tile of level.terrainTiles ?? []) {
    const { min, max } = tile.bounds;
    for (const z of new Set([min[2], max[2]]))
      loop(
        tile.terrain,
        `Terrain tile ${tile.id}`,
        [
          [min[0], min[1], z],
          [max[0], min[1], z],
          [max[0], max[1], z],
          [min[0], max[1], z],
        ],
        "#8d7c44",
      );
    if (max[2] > min[2])
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          result.push({
            object: tile.terrain,
            label: `Terrain tile ${tile.id}`,
            points: [
              [x, y, min[2]],
              [x, y, max[2]],
            ],
            color: "#8d7c44",
          });
  }
  for (const profile of level.sourceProfiles ?? [])
    if (profile.role.startsWith("grading")) {
      const outline = {
        object: profile.object,
        label: profile.role,
        points: profile.points,
        color: "#9671a6",
      };
      if (profile.closed)
        loop(outline.object, outline.label, outline.points, outline.color);
      else result.push(outline);
    }
  return result;
}

/** Appends clickable plan outlines; no filled polygons can conceal authored holes. */
export function appendTerrainPlan(svg: SVGElement, level: CompiledLevel): void {
  for (const outline of outlines(level)) {
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    line.setAttribute(
      "points",
      outline.points.map((p) => `${p[0]},${-p[1]}`).join(" "),
    );
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", outline.color);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.dataset.object = outline.object;
    line.dataset.terrainOverlay = "true";
    line.setAttribute("aria-label", outline.label);
    svg.append(line);
  }
}

/** Adds disposable line geometry without entering physical or navigation inputs. */
export function appendTerrainScene(
  group: THREE.Group,
  level: CompiledLevel,
  selected: string,
): void {
  for (const outline of outlines(level)) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      outline.points.map((p) => new THREE.Vector3(...p)),
    );
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: outline.object === selected ? "#e39d40" : outline.color,
        depthTest: false,
      }),
    );
    line.userData.object = outline.object;
    line.renderOrder = 10;
    group.add(line);
  }
}
