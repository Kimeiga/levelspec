import { writeFileSync } from "node:fs";
import { createDocument, type Layer, type V3 } from "../src/vector/types.ts";
import { serializeLevelSvgx } from "../src/vector/format.ts";
const d = createDocument("showcase");
d.name = "Elevation laboratory";
d.description =
  "A curved courtyard, a branching partition, a ramp, stairs and an upper bridge.";
d.materials = [
  {
    id: "concrete",
    color: "#aebbc5",
    repeat: 1,
    roughness: 0.85,
    metalness: 0,
  },
  { id: "blue", color: "#63869f", repeat: 1, roughness: 0.65, metalness: 0 },
  { id: "sand", color: "#c5aa80", repeat: 1, roughness: 0.8, metalness: 0 },
];
const g: Layer = {
  id: "ground",
  label: "Ground and approaches",
  vertices: [],
  edges: [],
  regions: [],
};
d.layers.push(g);
function polygon(
  l: Layer,
  id: string,
  points: V3[],
  material = "concrete",
  kind: "open" | "wall" = "wall",
) {
  const vs = points.map((p, i) => ({
    id: `${id}.v${i}`,
    x: p[0],
    y: p[1],
    z: p[2],
  }));
  l.vertices.push(...vs);
  const es = vs.map((v, i) => ({
    id: `${id}.e${i}`,
    from: v.id,
    to: vs[(i + 1) % vs.length].id,
    kind,
    openings: [],
  }));
  l.edges.push(...es);
  const r = {
    id,
    boundary: es.map((e) => e.id),
    holes: [],
    interior: [],
    creases: [],
    fill: "floor" as const,
    material,
  };
  l.regions.push(r);
  return r;
}
const hall = polygon(g, "courtyard", [
  [0, 0, 0],
  [14, 0, 0],
  [14, 12, 0],
  [0, 12, 0],
]);
g.edges.find((e) => e.id === "courtyard.e0")!.control = [
  [4, -3],
  [10, -3],
];
// Branch shares a real vertex; it does not imply another filled region.
g.vertices.push({ id: "partition.end", x: 4, y: 8, z: 0 });
g.edges.push({
  id: "partition",
  from: "courtyard.v3",
  to: "partition.end",
  kind: "wall",
  height: 1.4,
  material: "blue",
  openings: [],
});
const hole = polygon(
  g,
  "well",
  [
    [5, 4, 0],
    [5, 7, 0],
    [8, 7, 0],
    [8, 4, 0],
  ],
  "sand",
);
g.regions.pop();
hall.holes.push(hole.boundary as never);
for (const id of hole.boundary) {
  const e = g.edges.find((e) => e.id === id)!;
  e.kind = "railing";
  e.height = 0.7;
}
// Divide the east border so doors and approach boundaries share precise vertices.
g.edges = g.edges.filter((e) => e.id !== "courtyard.e1");
g.vertices.push(
  { id: "east.a", x: 14, y: 3, z: 0 },
  { id: "east.b", x: 14, y: 6, z: 0 },
  { id: "east.c", x: 14, y: 9, z: 0 },
);
for (const [id, from, to, kind] of [
  ["east.door", "courtyard.v1", "east.a", "door"],
  ["east.wall", "east.a", "east.b", "wall"],
  ["east.stairs", "east.b", "east.c", "open"],
  ["east.top", "east.c", "courtyard.v2", "wall"],
])
  g.edges.push({ id, from, to, kind: kind as any, openings: [] });
hall.boundary = [
  "courtyard.e0",
  "east.door",
  "east.wall",
  "east.stairs",
  "east.top",
  "courtyard.e2",
  "courtyard.e3",
];
const ramp = polygon(
  g,
  "ramp",
  [
    [14, 0, 0],
    [23, 0, 3],
    [23, 3, 3],
    [14, 3, 0],
  ],
  "sand",
);
g.edges = g.edges.filter((e) => e.id !== "ramp.e3");
ramp.boundary[3] = "-east.door";
g.edges.find((e) => e.id === "ramp.e1")!.kind = "open";
const stair = polygon(
  g,
  "stairs",
  [
    [14, 6, 0],
    [23, 6, 3],
    [23, 9, 3],
    [14, 9, 0],
  ],
  "blue",
);
g.edges = g.edges.filter((e) => e.id !== "stairs.e3");
stair.boundary[3] = "-east.stairs";
Object.assign(stair, {
  fill: "stairs",
  lower: "east.stairs",
  upper: "stairs.e1",
});
g.edges.find((e) => e.id === "stairs.e1")!.kind = "open";
// Reuse lower boundary vertices in connected loops.
for (const [prefix, start, end] of [
  ["ramp", "courtyard.v1", "east.a"],
  ["stairs", "east.b", "east.c"],
]) {
  g.edges.find((e) => e.id === `${prefix}.e0`)!.from = start;
  g.edges.find((e) => e.id === `${prefix}.e2`)!.to = end;
}
const upper: Layer = {
  id: "upper",
  label: "Upper bridge",
  vertices: [],
  edges: [],
  regions: [],
};
d.layers.push(upper);
polygon(
  upper,
  "bridge",
  [
    [23, 0, 3],
    [27, 0, 3],
    [27, 9, 3],
    [23, 9, 3],
    [23, 6, 3],
    [23, 3, 3],
  ],
  "concrete",
);
for (const id of ["bridge.e3", "bridge.e5"])
  upper.edges.find((e) => e.id === id)!.kind = "open";
d.seams = [
  { id: "ramp.join", edges: ["ramp.e1", "bridge.e5"], kind: "open" },
  { id: "stairs.join", edges: ["stairs.e1", "bridge.e3"], kind: "open" },
];
d.markers = [
  {
    id: "spawn",
    layer: "ground",
    region: "courtyard",
    position: [2, 2, 0],
    kind: "attacker_spawn",
  },
  {
    id: "objective",
    layer: "upper",
    region: "bridge",
    position: [25, 5, 3],
    kind: "objective",
  },
];
d.routes = [
  {
    id: "climb",
    from: "spawn",
    to: "objective",
    minRoutes: 1,
    maxDistance: 60,
  },
];
d.lights = [
  {
    id: "sun",
    kind: "directional",
    position: [-12, -15, 25],
    target: [10, 5, 0],
    color: "#fff2dd",
    intensity: 2,
  },
];
writeFileSync("examples/showcase.level.svgx", serializeLevelSvgx(d));
