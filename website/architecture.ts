import { materialDescriptions, treatments } from "./world-styles.ts";
import { addStyleDetails } from "./style-details.ts";
import type { V3 } from "../src/vector/types.ts";
export interface CourtOptions {
  height: number;
  blocked?: boolean;
  look?: "clay" | "chalk" | "night";
}
type Area = {
  id: string;
  points: V3[];
  material?: string;
  ceiling?: number;
  stairs?: boolean;
  holes?: V3[][];
};
type Edge = {
  id: string;
  a: V3;
  b: V3;
  owners: string[];
  kind?: string;
  height?: number;
  material?: string;
  control?: string;
  openings?: string;
  thickness?: number;
};
const n = (v: number) => Number(v.toFixed(4));
const key = (p: V3) => p.map(n).join(",");
const equal = (a: number, b: number) => Math.abs(a - b) < 1e-5;
const rect = (x: number, y: number, X: number, Y: number, z: number): V3[] => [
  [x, y, z],
  [X, y, z],
  [X, Y, z],
  [x, Y, z],
];
/** Original architecture. Everything emitted here is compiled and exported by LevelSpec. */
export function buildCourtyard({
  height: h,
  blocked = false,
  look = "clay",
}: CourtOptions): string {
  if (!Number.isFinite(h) || h < 3 || h > 6)
    throw new RangeError("Court elevation must be between 3 and 6 metres.");
  const areas: Area[] = [
    {
      id: "courtyard",
      points: rect(0, 0, 14, 12, 0),
      holes: [rect(5, 4, 8, 7, 0).reverse()],
      material: "paving",
    },
    {
      id: "ramp",
      points: [
        [14, 0, 0],
        [23, 0, h],
        [23, 3, h],
        [14, 3, 0],
      ],
      material: "stone",
    },
    {
      id: "stairs",
      points: [
        [14, 6, 0],
        [23, 6, h],
        [23, 9, h],
        [14, 9, 0],
      ],
      material: "stone",
      stairs: true,
    },
    { id: "west-arcade", points: rect(-6, 0, 0, 12, 0), material: "tile" },
    {
      id: "entrance",
      points: rect(-12, 2, -6, 6, 0),
      material: "tile",
      ceiling: 2.8,
    },
    { id: "north-arcade", points: rect(-6, 12, 29, 18, 0), material: "tile" },
    { id: "east-room", points: rect(23, 0, 29, 12, 0), material: "tile" },
    { id: "reading-room", points: rect(-6, 18, 8, 24, 0), material: "wood" },
    {
      id: "exhibition-room",
      points: rect(8, 18, 29, 24, 0),
      material: "paving",
    },
    {
      id: "bridge",
      points: rect(23, 0, 29, 12, h),
      material: "paving",
      ceiling: h + 3.4,
    },
    { id: "skybridge", points: rect(0, 9.5, 23, 11, h), material: "wood" },
    {
      id: "west-balcony",
      points: rect(-6, 0, 0, 12, h),
      material: "tile",
      ceiling: h + 3.4,
    },
    {
      id: "north-balcony",
      points: rect(-6, 12, 29, 18, h),
      material: "tile",
      ceiling: h + 3.4,
    },
    {
      id: "studio",
      points: rect(-6, 18, 8, 24, h),
      material: "wood",
      ceiling: h + 4.5,
    },
    {
      id: "library",
      points: rect(8, 18, 29, 24, h),
      material: "wood",
      ceiling: h + 3.8,
    },
  ];
  const points = areas.flatMap((a) => a.points);
  // Split shared boundaries at every same-plane endpoint; a shared edge has one owner record.
  const split = (a: V3, b: V3) => {
    const d = b.map((v, i) => v - a[i]);
    const len = d.reduce((s, v) => s + v * v, 0);
    const hits = new Map<string, { p: V3; t: number }>([
      [key(a), { p: a, t: 0 }],
    ]);
    for (const p of points) {
      const t = p.reduce((s, v, i) => s + (v - a[i]) * d[i], 0) / len;
      if (
        t > 1e-5 &&
        t < 1 - 1e-5 &&
        p.every((v, i) => Math.abs(v - a[i] - t * d[i]) < 1e-5)
      )
        hits.set(key(p), { p, t });
    }
    return [...hits.values()].sort((a, b) => a.t - b.t).map((x) => x.p);
  };
  const edges = new Map<string, Edge>(),
    boundaries = new Map<string, string[]>(),
    vertices = new Map<string, string>();
  let count = 0;
  function edge(a: V3, b: V3, owner: string, forced?: string): string {
    const K = [key(a), key(b)].sort().join("|");
    const found = edges.get(K);
    if (found) {
      found.owners.push(owner);
      return (key(found.a) === key(a) ? "" : "-") + found.id;
    }
    const e: Edge = { id: forced ?? `edge.${count++}`, a, b, owners: [owner] };
    edges.set(K, e);
    return e.id;
  }
  for (const area of areas) {
    const p = area.points.flatMap((a, i) =>
      split(a, area.points[(i + 1) % area.points.length]),
    );
    const boundary = p.map((a, i) => {
      const b = p[(i + 1) % p.length];
      let id: string | undefined;
      if (area.id === "courtyard" && a[1] === 0 && b[1] === 0)
        id = "courtyard.e0";
      if (
        area.id === "courtyard" &&
        a[0] === 14 &&
        b[0] === 14 &&
        a[1] === 0 &&
        b[1] === 3
      )
        id = "east.door";
      if (
        area.id === "courtyard" &&
        a[0] === 14 &&
        b[0] === 14 &&
        a[1] === 6 &&
        b[1] === 9
      )
        id = "east.stairs";
      return edge(a, b, area.id, id);
    });
    boundaries.set(area.id, boundary);
    for (const [i, hole] of (area.holes ?? []).entries()) {
      boundaries.set(
        `${area.id}.hole${i}`,
        hole.map((a, j) =>
          edge(a, hole[(j + 1) % hole.length], `${area.id}.hole`, `well.e${j}`),
        ),
      );
    }
  }
  const covers: string[] = [];
  function box(id: string, min: V3, max: V3, material = "bronze") {
    covers.push(
      `<cover id="${id}" layer="architecture" min="${min.map(n).join(" ")}" max="${max.map(n).join(" ")}" material="${material}"/>`,
    );
  }
  function openings(e: Edge, sill: number, head: number, bay = 4.5) {
    const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    if (L < 1.3) return;
    const bays = Math.max(1, Math.round(L / bay)),
      spacing = L / bays;
    e.openings = Array.from({ length: bays }, (_, i) => {
      const s = i * spacing + Math.min(0.55, spacing * 0.17),
        t = (i + 1) * spacing - Math.min(0.55, spacing * 0.17);
      if (look === "chalk" && sill === 0 && t - s > 1.5) {
        const count = 16,
          rise = Math.min(0.28, (t - s) * 0.14);
        return Array.from({ length: count }, (_, j) => {
          const u = (j + 0.5) / count,
            top =
              head - rise + rise * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
          return `<opening id="${e.id}.opening${i}.${j}" kind="arch" start="${n(s + ((t - s) * j) / count)}" end="${n(s + ((t - s) * (j + 1)) / count)}" sill="${n(sill)}" head="${n(top)}"/>`;
        }).join("");
      }
      return `<opening id="${e.id}.opening${i}" kind="arch" start="${n(s)}" end="${n(t)}" sill="${n(sill)}" head="${n(head)}"/>`;
    }).join("");
  }
  for (const e of edges.values()) {
    const upper = e.a[2] >= h - 0.001 && e.b[2] >= h - 0.001;
    e.kind = e.owners.length > 1 ? "open" : "wall";
    e.height = upper ? 1.05 : h - 0.2;
    e.material = "plaster";
    const ids = e.owners;
    const shared = (a: string, b: string) => ids.includes(a) && ids.includes(b);
    if (e.id === "courtyard.e0") {
      e.height = 1.05;
      e.control = "4 -3; 10 -3";
      e.material = "limestone";
    } else if (e.id.startsWith("well.")) {
      e.height = 0.52;
      e.material = "limestone";
    } else if (e.id === "east.door" || e.id === "east.stairs") {
      e.kind = blocked ? "wall" : "open";
      e.height = h - 0.2;
      e.material = blocked ? "gate" : "limestone";
    } else if (
      shared("courtyard", "west-arcade") ||
      shared("courtyard", "north-arcade")
    ) {
      e.kind = "wall";
      e.height = h - 0.2;
      e.material = "limestone";
      openings(e, 0, h - 0.52);
    } else if (ids.includes("entrance")) {
      if (e.owners.length === 1) {
        e.height = 2.8;
        e.material = "limestone";
        if (equal(e.a[0], -12) && equal(e.b[0], -12)) openings(e, 0, 2.5, 10);
      }
    } else if (
      shared("north-arcade", "reading-room") ||
      shared("north-arcade", "exhibition-room") ||
      shared("north-balcony", "studio") ||
      shared("north-balcony", "library")
    ) {
      e.kind = "wall";
      e.height = upper ? 3.4 : h - 0.2;
      openings(e, 0, upper ? 2.7 : h - 0.55, 7);
    } else if (
      shared("reading-room", "exhibition-room") ||
      shared("studio", "library")
    ) {
      e.kind = "wall";
      e.height = upper ? 3.4 : h - 0.2;
      openings(e, 0, upper ? 2.5 : h - 0.6, 20);
    } else if (e.owners.length === 1) {
      if (ids.includes("east-room") && equal(e.a[0], 23) && equal(e.b[0], 23)) {
        e.height = h - 0.2;
        e.material = "limestone";
      } else if (ids.includes("ramp") || ids.includes("stairs")) {
        e.height = 0.88;
        e.material = "limestone";
      } else if (ids.includes("skybridge")) {
        e.height = 0.86;
        e.material = "limestone";
      } else if (ids.includes("courtyard")) {
        e.height = h - 0.2;
        e.material = "brick";
      } else if (upper) {
        const inward =
          (equal(e.a[0], 0) && equal(e.b[0], 0)) ||
          (equal(e.a[1], 12) && equal(e.b[1], 12)) ||
          (equal(e.a[0], 23) && equal(e.b[0], 23));
        if (inward) {
          e.height = 0.88;
          e.material = "limestone";
        } else {
          e.height = ids.includes("studio")
            ? 4.5
            : ids.includes("library")
              ? 3.8
              : 3.4;
          e.material = "brick";
          openings(e, 0.75, 2.8);
        }
      } else {
        e.height = h - 0.2;
        e.material = "brick";
        openings(e, 0.78, h - 0.48);
      }
    }
  }
  function vertex(p: V3) {
    const k = key(p);
    if (!vertices.has(k)) vertices.set(k, `v.${vertices.size}`);
    return vertices.get(k)!;
  }
  for (const e of edges.values()) {
    vertex(e.a);
    vertex(e.b);
  }
  // Roof cornices, column capitals and slender balustrades give the shell a finished scale.
  const roof = h + 3.4;
  // One owner per trim run. Cornices sit above the roof, never inside its faces.
  const roofTop = roof + 0.2;
  for (const [id, x, y, X, Y] of [
    ["west-front", -6.14, -0.2, 0.14, 0],
    ["east-front", 22.86, -0.2, 29.14, 0],
    ["court-front", 0.14, 11.8, 22.86, 12],
    ["west-side", -6.34, 0, -6.14, 18],
    ["east-side", 29.14, 0, 29.34, 18],
  ] as const)
    box(`cornice.${id}`, [x, y, roofTop], [X, Y, roofTop + 0.18], "limestone");
  for (let y = 0.35; y < 12; y += 2.3) {
    // Posts inside upper arcades sit on the parapet rather than in a walking lane.
    box(
      `west.column.${n(y)}`,
      [-0.2, y, h + 0.88],
      [0.12, y + 0.23, roof - 0.22],
      "limestone",
    );
    box(
      `west.capital.${n(y)}`,
      [-0.31, y - 0.08, roof - 0.22],
      [0.23, y + 0.31, roof - 0.03],
      "limestone",
    );
  }
  for (let x = 0.3; x < 29; x += 3.4) {
    box(
      `north.column.${n(x)}`,
      [x, 11.94, h + 0.88],
      [x + 0.25, 12.2, roof - 0.03],
      "limestone",
    );
  }
  // Slatted shade over the upper east gallery, under its structural roof.
  for (let y = 0.2; y < 11.9; y += 0.56)
    box(
      `ceiling.rib.${n(y)}`,
      [23.25, y, roof - 0.32],
      [28.7, y + 0.1, roof - 0.22],
      "wood",
    );
  for (let x = 0.35; x < 22.8; x += 0.7) {
    box(
      `bridge.rail.front.${n(x)}`,
      [x, 9.43, h + 0.88],
      [x + 0.04, 9.52, h + 1.16],
    );
    box(
      `bridge.rail.back.${n(x)}`,
      [x, 10.98, h + 0.88],
      [x + 0.04, 11.07, h + 1.16],
    );
  }
  box("bridge.hand.front", [0.25, 9.43, h + 1.16], [22.75, 9.53, h + 1.21]);
  box("bridge.hand.back", [0.25, 10.97, h + 1.16], [22.75, 11.07, h + 1.21]);
  // Furnishing is ordinary named compiler geometry, not viewer-only dressing.
  for (let i = 0; i < 4; i++) {
    const x = -4.6 + i * 3;
    box(
      `reading.shelf.${i}`,
      [x, 23.45, 0.1],
      [x + 1.95, 23.8, h - 0.6],
      "wood",
    );
    for (let k = 0; k < 3; k++)
      box(
        `reading.books.${i}.${k}`,
        [x + 0.1, 23.15, 0.4 + k * 0.65],
        [x + 1.85, 23.44, 0.72 + k * 0.65],
        k % 2 ? "bronze" : "gate",
      );
  }
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 3.6;
    box(
      `gallery.frame.${i}`,
      [x, 23.65, 1.03],
      [x + 1.55, 23.74, 2.12],
      "bronze",
    );
    box(
      `gallery.art.${i}`,
      [x + 0.08, 23.6, 1.11],
      [x + 1.47, 23.65, 2.04],
      i % 2 ? "teal" : "stone",
    );
  }
  box("bench.base", [-5.35, 8, 0.02], [-4.65, 10.4, 0.36], "limestone");
  box("bench.seat", [-5.43, 7.92, 0.36], [-4.57, 10.48, 0.44], "wood");
  // Recessed pool bottom below the non-playable court opening.
  box("pool.basin", [5.15, 4.15, 0.09], [7.85, 6.85, 0.13], "teal");
  // Thin cap on each coping segment; everything carries a source ID in exports.
  box("pool.coping.w", [4.84, 3.84, 0.52], [5.16, 7.16, 0.62], "limestone");
  box("pool.coping.e", [7.84, 3.84, 0.52], [8.16, 7.16, 0.62], "limestone");
  box("pool.coping.s", [5.16, 3.84, 0.52], [7.84, 4.16, 0.62], "limestone");
  box("pool.coping.n", [5.16, 6.84, 0.52], [7.84, 7.16, 0.62], "limestone");
  addStyleDetails(
    look,
    h,
    box,
    (id, a, b, width, height, material, control) => {
      edges.set(id, {
        id,
        a,
        b,
        owners: [],
        kind: "wall",
        height,
        thickness: width,
        material,
        control,
      });
    },
  );
  for (const e of edges.values()) {
    vertex(e.a);
    vertex(e.b);
  }
  const treatment = treatments[look];
  const mats = materialDescriptions(look);
  const levelId =
    look === "clay"
      ? "lantern-court"
      : look === "chalk"
        ? "chalk-cloister"
        : "slate-atelier";
  const xml: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<level version="2" id="${levelId}" name="${treatment.name}" units="meters" wall-thickness="0.28" wall-height="3" floor-thickness="0.2" curve-tolerance="0.015">`,
    '<player radius="0.35" height="1.8" step="0.45" slope="42"/>',
    `<sky color="${treatment.sky}" intensity="${treatment.fill}"/>`,
    ...mats.map(
      (m) =>
        `<material id="${m.id}" color="${m.color}" texture="${m.texture}" roughness="${m.roughness}" metalness="${m.metalness}" repeat="${m.repeat}"/>`,
    ),
    '<layer id="architecture" label="Lantern Court">',
  ];
  for (const [k, id] of vertices) {
    const [x, y, z] = k.split(",");
    xml.push(`<vertex id="${id}" x="${x}" y="${y}" z="${z}"/>`);
  }
  for (const e of edges.values())
    xml.push(
      `<edge id="${e.id}" from="${vertex(e.a)}" to="${vertex(e.b)}" kind="${e.kind}" height="${n(e.height!)}"${e.thickness ? ` thickness="${n(e.thickness)}"` : ""} material="${e.material}"${e.control ? ` control="${e.control}"` : ""}>${e.openings ?? ""}</edge>`,
    );
  for (const area of areas) {
    const boundary = boundaries.get(area.id)!;
    const attrs = area.stairs
      ? ` lower="${boundary[3].replace(/^-/, "")}" upper="${boundary[1].replace(/^-/, "")}"`
      : "";
    xml.push(
      `<region id="${area.id}" boundary="${boundary.join(" ")}" fill="${area.stairs ? "stairs" : "floor"}" material="${area.material ?? "paving"}"${attrs}${area.ceiling ? ` ceiling="${n(area.ceiling)}"` : ""}>`,
    );
    for (let i = 0; i < (area.holes ?? []).length; i++)
      xml.push(
        `<hole boundary="${boundaries.get(`${area.id}.hole${i}`)!.join(" ")}"/>`,
      );
    xml.push("</region>");
  }
  xml.push(
    "</layer>",
    ...covers,
    '<marker id="spawn" layer="architecture" region="courtyard" position="2 2 0" kind="attacker_spawn"/>',
    `<marker id="objective" layer="architecture" region="bridge" position="25 5 ${h}" kind="objective"/>`,
    '<route id="climb" from="spawn" to="objective" min-routes="1" max-distance="140"/>',
    `<light id="sun" kind="directional" position="${treatment.sunPosition.join(" ")}" target="10 9 0" color="${treatment.sunColor}" intensity="${treatment.sunIntensity}"/>`,
    ...(look === "chalk"
      ? []
      : Array.from(
          { length: 4 },
          (_, i) =>
            `<light id="accent.${i}" kind="point" position="${1.2 + i * 6} 14.8 ${h - 0.83}" color="${look === "night" ? "#ffb16d" : "#ffe1a2"}" intensity="${look === "night" ? 24 : 10}"/>`,
        )),
    "</level>",
  );
  return xml.join("\n") + "\n";
}
