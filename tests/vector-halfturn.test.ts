import { it } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  createDocument,
  type Edge,
  type Vertex,
} from "../src/vector/index.ts";
import { heightAt } from "../src/vector/geometry.ts";

it("navigates a half-turn flight built from multiple curved rail edges", async () => {
  const d = createDocument("half-turn");
  const vertices: Vertex[] = [
    ["a", 2, 0, 0],
    ["b", 4, 0, 0],
    ["c", 0, 4, 1.2],
    ["d", -4, 0, 2.4],
    ["e", -2, 0, 2.4],
    ["f", 0, 2, 1.2],
  ].map(([id, x, y, z]) => ({
    id: id as string,
    x: x as number,
    y: y as number,
    z: z as number,
  }));
  const edges: Edge[] = [
    { id: "lower", from: "a", to: "b", kind: "open", openings: [] },
    {
      id: "outer1",
      from: "b",
      to: "c",
      kind: "wall",
      openings: [],
      control: [
        [4, 2.209],
        [2.209, 4],
      ],
    },
    {
      id: "outer2",
      from: "c",
      to: "d",
      kind: "wall",
      openings: [],
      control: [
        [-2.209, 4],
        [-4, 2.209],
      ],
    },
    { id: "upper", from: "d", to: "e", kind: "open", openings: [] },
    {
      id: "inner1",
      from: "e",
      to: "f",
      kind: "wall",
      openings: [],
      control: [
        [-2, 1.105],
        [-1.105, 2],
      ],
    },
    {
      id: "inner2",
      from: "f",
      to: "a",
      kind: "wall",
      openings: [],
      control: [
        [1.105, 2],
        [2, 1.105],
      ],
    },
  ];
  d.layers = [
    {
      id: "ground",
      vertices,
      edges,
      regions: [
        {
          id: "stairs",
          fill: "stairs",
          boundary: edges.map((e) => e.id),
          lower: "lower",
          upper: "upper",
          rise: 0.2,
          holes: [],
          interior: [],
          creases: [],
        },
      ],
    },
  ];
  d.markers = [
    {
      id: "start",
      layer: "ground",
      region: "stairs",
      kind: "attacker_spawn",
      position: [2.94, 0.596, 0.2],
    },
    {
      id: "end",
      layer: "ground",
      region: "stairs",
      kind: "poi",
      position: [-2.94, 0.596, 2.4],
    },
  ];
  d.routes = [
    {
      id: "around",
      from: "start",
      to: "end",
      minRoutes: 1,
      minDistance: 6,
      maxDistance: 11,
    },
  ];
  const level = await compile(d);
  assert.deepEqual(level.diagnostics, []);
  assert.equal(
    new Set(level.floors[0].points.map((p) => p[2].toFixed(6))).size,
    12,
  );
  assert.equal(
    heightAt(level.floors[0], 0, 1),
    undefined,
    "Inner well must stay unfilled",
  );
  assert.equal(
    level.navigation?.passed,
    true,
    JSON.stringify(level.navigation?.coverage.uncovered),
  );
  assert.equal(level.navigation?.routes[0].reachable, true);
  assert.ok(
    level.navigation!.routes[0].distance > 6,
    "Route must follow the winders, not cross the inner well",
  );
});
