import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  parseAml,
  serializeAml,
  collisionMesh,
  toGLB,
} from "levelspec";
import { validateBytes } from "gltf-validator";
import { assertConsistentWinding, assertHungCloth, atlasCell, clusters } from "./fixtures/kit-props.ts";

type Point = [number, number, number];
type Level = Awaited<ReturnType<typeof compile>>;
interface PartTriangle {
  points: Point[];
  /** The first vertex normal; flat parts repeat it on all three vertices. */
  normal: Point;
  normals: Point[];
  uv: number[][];
  material: string;
  part: string;
}

/** The part names docs/DRESSING.md lists for generated building objects; shops add one `shop-<trade>` part each. */
const PARTS = ["envelope", "roof", "openings", "fixtures", "signage", "rooftop"];
/** The roles an author may texture under a `finishes` prefix. */
const ROLES = ["lettering", "signboard", "rust", "metal", "sheet", "timber", "roofing", "cloth", "aircon"];
/** The lettering finish is a glyph atlas drawn as a cutout; the kit rejects it without a cutoff. */
const cutout = (role: string) => (role === "lettering" ? ' alpha-cutoff="0.5"' : "");

/** Lists the triangles generated for one dressing host, with their part name after `$dressing/`. */
function partTriangles(level: Level, host: string): PartTriangle[] {
  const prefix = `${host}/$dressing/`;
  const triangles: PartTriangle[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!surface.object.startsWith(prefix)) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    triangles.push({
      points: indices.map(
        (i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point,
      ),
      normal: level.mesh.normals.slice(
        indices[0] * 3,
        indices[0] * 3 + 3,
      ) as Point,
      normals: indices.map(
        (i) => level.mesh.normals.slice(i * 3, i * 3 + 3) as Point,
      ),
      uv: indices.map((i) => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      material: surface.material,
      part: surface.object.slice(prefix.length),
    });
  }
  return triangles;
}

const subtract = (a: Point, b: Point): Point => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Lists every crossing of the segment from `origin` to `target`, nearest
 * first, as a fraction of its length and whether the triangle's winding faces
 * the origin. Barycentric bounds are widened by 1e-7 so a ray along a shared
 * edge still registers.
 */
function crossings(triangles: PartTriangle[], origin: Point, target: Point) {
  const direction = subtract(target, origin);
  const hits: { fraction: number; front: boolean }[] = [];
  for (const triangle of triangles) {
    const [a, b, c] = triangle.points;
    const ab = subtract(b, a),
      ac = subtract(c, a);
    const p = cross(direction, ac),
      determinant = dot(ab, p);
    if (Math.abs(determinant) < 1e-12) continue;
    const s = subtract(origin, a),
      u = dot(s, p) / determinant;
    const q = cross(s, ab),
      v = dot(direction, q) / determinant;
    if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
    const fraction = dot(ac, q) / determinant;
    if (fraction <= 1e-9 || fraction >= 1) continue;
    hits.push({ fraction, front: dot(cross(ab, ac), direction) < 0 });
  }
  return hits.sort((first, second) => first.fraction - second.fraction);
}

/** How a building box is placed: its AML attribute and the matching local-to-world map. */
interface Placement {
  attribute: string;
  toWorld: (p: Point) => Point;
}
const YAW = (35 * Math.PI) / 180;
const PLACEMENTS: Placement[] = [
  { attribute: "", toWorld: (p) => p },
  {
    attribute: 'rotation="0 0 35"',
    toWorld: ([x, y, z]) => [
      x * Math.cos(YAW) - y * Math.sin(YAW),
      x * Math.sin(YAW) + y * Math.cos(YAW),
      z,
    ],
  },
  { attribute: 'scale="-1 1 1"', toWorld: ([x, y, z]) => [-x, y, z] },
];

/** A standalone building mass: front on local Y=0, footprint in local +X/+Y, meters. */
function buildingSource(options: {
  width: number;
  depth: number;
  height: number;
  stories: number;
  seed?: string;
  detail?: string;
  placement?: string;
  dressing?: string;
  materials?: string;
  elements?: string;
}) {
  return `<architecture version="1" id="mass-test" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>${options.materials ?? ""}
  <box id="building" ${options.placement ?? ""} width="${options.width}" depth="${options.depth}" height="${options.height}" collidable="false"/>${options.elements ?? ""}
  <dressing seed="${options.seed ?? "mass"}" detail="${options.detail ?? "medium"}" grime="0.6" wear="0.2" ${options.dressing ?? ""}>
    <building host="building" material="finish" stories="${options.stories}"/>
  </dressing>
</architecture>`;
}

/** Compiles a building fixture without navigation and requires a clean result. */
async function build(options: Parameters<typeof buildingSource>[0]) {
  const level = await compile(parseAml(buildingSource(options)), {
    navigation: false,
  });
  assert.deepEqual(level.diagnostics, [], JSON.stringify(options));
  return level;
}

/** Building proportions that exercise single tenements and stepped multi-tenement rows. */
const masses = [
  { width: 4, depth: 4, height: 9.35, stories: 3 },
  { width: 9, depth: 6, height: 15.35, stories: 5 },
  { width: 22, depth: 8, height: 20.35, stories: 6 },
  { width: 38, depth: 12, height: 36.35, stories: 12 },
];

/**
 * A base wall of the given height spanning the front of a building `width`
 * wide. Shops are off: a shop opens the skin on the wall's plane by design,
 * which tests/aml-shop-dressing.test.ts covers.
 */
function attachedSource(width: number, wallHeight: number, seed: string, height = 9.35, stories = 3) {
  return `<architecture version="1" id="attachment" validation="premap">
  <material id="finish" color="#c6c2b4" repeat="0.5"/>
  <path id="boundary-axis" points="0 0.1 0; ${width} 0.1 0"/>
  <wall id="boundary" path="boundary-axis" thickness="0.2" height="${wallHeight}"/>
  <box id="building" width="${width}" depth="6" height="${height}" collidable="false"/>
  <dressing seed="${seed}" detail="medium" grime="0.8" wear="0.2">
    <building host="building" base-wall="boundary" material="finish" stories="${stories}" shops="0"/>
  </dressing>
</architecture>`;
}

test("building generation is reproducible, seeded, and leaves physics untouched", async () => {
  const source = attachedSource(6, 3, "attachment");
  const document = parseAml(source);
  const baseline = structuredClone(document);
  baseline.elements = baseline.elements.filter(
    (element) => element.id !== "building",
  );
  delete baseline.dressing;
  const [plain, dressed, repeated, reseeded] = await Promise.all([
    compile(baseline, { navigation: false }),
    compile(document, { navigation: false }),
    compile(parseAml(source), { navigation: false }),
    compile(parseAml(attachedSource(6, 3, "another")), { navigation: false }),
  ]);
  assert.deepEqual(dressed.diagnostics, []);
  assert.equal(dressed.renderHash, repeated.renderHash);
  assert.deepEqual(toGLB(dressed), toGLB(repeated));
  assert.notEqual(reseeded.renderHash, dressed.renderHash);
  for (const level of [dressed, reseeded]) {
    assert.equal(level.physicalHash, plain.physicalHash);
    assert.deepEqual(collisionMesh(level, true), collisionMesh(plain, true));
  }
  assert.equal((await validateBytes(toGLB(dressed))).issues.numErrors, 0);
});

test("generated objects use the documented parts and never the roof role", async () => {
  const level = await build({ ...masses[2], detail: "high" });
  const surfaces = level.surfaces.filter((surface) =>
    surface.object.startsWith("building/$dressing/"),
  );
  const parts = new Set(surfaces.map((surface) => surface.object.split("/$dressing/")[1]));
  // Whether this row opens a shop depends on its seed; tests/aml-shop-dressing.test.ts owns those parts.
  assert.deepEqual([...parts].filter((part) => !part.startsWith("shop-")).sort(), [...PARTS].sort());
  for (const surface of surfaces) {
    assert.notEqual(surface.role, "roof");
    assert.equal(surface.collidable, false);
  }
});

test("a base wall is covered by exactly one building skin on its own plane", async () => {
  // A 3 m wall under one tenement, and a 4.4 m wall under a row with jetties, wells and setbacks.
  const cases = [
    { width: 6, wall: 3, height: 9.35, stories: 3 },
    { width: 12, wall: 4.4, height: 15.35, stories: 5 },
    { width: 22, wall: 5, height: 20.35, stories: 6 },
  ];
  for (const { width, wall, height, stories } of cases)
    for (const seed of ["attachment", "second", "third", "fourth"]) {
      const dressed = await compile(
        parseAml(attachedSource(width, wall, seed, height, stories)),
        { navigation: false },
      );
      assert.deepEqual(dressed.diagnostics, []);
      assert.ok(
        dressed.mesh.surfaces.every(
          (index) => dressed.surfaces[index].object !== "boundary",
        ),
      );
      const shell = partTriangles(dressed, "building").filter((triangle) =>
        ["envelope", "roof"].includes(triangle.part),
      );
      // Off-lattice samples over the wall face; each ray runs from the street into the building.
      for (let i = 0; i < 24; i++)
        for (let j = 0; j < 12; j++) {
          const x = 0.0137 + (i * (width - 0.03)) / 23,
            z = 0.0071 + (j * (wall - 0.02)) / 11;
          const hits = crossings(shell, [x, -5, z], [x, 3, z]);
          const context = JSON.stringify({ width, wall, seed, x, z });
          assert.ok(hits.length > 0 && hits[0].front, `No outward skin: ${context}`);
          const depth = -5 + hits[0].fraction * 8;
          assert.ok(Math.abs(depth) < 1e-6, `The first skin is at Y=${depth}: ${context}`);
          const onPlane = hits.filter((hit) => Math.abs(-5 + hit.fraction * 8) < 1e-6);
          assert.equal(onPlane.length, 1, `Doubled skin: ${context}`);
        }
    }
});

test("detail changes only what hangs on the architecture, and only by adding", async () => {
  /** Triangles of one part as a multiset of 1 mm position signatures. */
  const signatures = (level: Level, part: string) => {
    const counts = new Map<string, number>();
    for (const triangle of partTriangles(level, "building")) {
      if (triangle.part !== part) continue;
      const key = triangle.points
        .map((p) => p.map((v) => Math.round(v * 1000)).join(","))
        .join(";");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  for (const seed of ["mass", "other"]) {
    const levels: Level[] = [];
    for (const detail of ["low", "medium", "high"])
      levels.push(await build({ ...masses[1], detail, seed }));
    for (let i = 0; i + 1 < levels.length; i++) {
      for (const part of PARTS) {
        // Medium detail cuts joint lines, cracks and grout into the roof paving that low detail leaves whole.
        if (part === "roof" && i === 0) continue;
        const lower = signatures(levels[i], part),
          higher = signatures(levels[i + 1], part);
        for (const [key, count] of lower)
          assert.ok(
            (higher.get(key) ?? 0) >= count,
            `${part} lost a triangle between detail levels ${i} and ${i + 1} (${seed}).`,
          );
        if (["envelope", "roof", "openings"].includes(part))
          assert.equal(higher.size, lower.size, `${part} must not depend on detail.`);
      }
      assert.ok(
        partTriangles(levels[i + 1], "building").length >
          partTriangles(levels[i], "building").length,
      );
    }
  }
});

test("building envelopes are closed shells that present only outward faces", async () => {
  /** Unit directions for probe rays: four level ones and two that climb. */
  const directions: Point[] = (
    [
      [0.3371, 0.9413, 0],
      [-0.5033, 0.8641, 0],
      [0.9379, 0.3469, 0],
      [0.7193, -0.6947, 0],
      [0.3137, 0.8961, 0.2871],
      [-0.6029, 0.7411, 0.2953],
    ] as Point[]
  ).map((d) => {
    const length = Math.hypot(...d);
    return d.map((v) => v / length) as Point;
  });
  const runs = [
    ...masses.slice(0, 3).flatMap((mass) => ["a", "b"].map((seed) => ({ mass, seed, placement: PLACEMENTS[0] }))),
    { mass: masses[3], seed: "a", placement: PLACEMENTS[0] },
    { mass: masses[2], seed: "c", placement: PLACEMENTS[1] },
    { mass: masses[2], seed: "c", placement: PLACEMENTS[2] },
  ];
  for (const { mass, seed, placement } of runs) {
    const level = await build({ ...mass, seed, placement: placement.attribute });
    const shell = partTriangles(level, "building").filter((triangle) =>
      ["envelope", "roof"].includes(triangle.part),
    );
    const { width, depth, height } = mass;
    const reach = 3 * Math.max(width, depth, height);
    const label = JSON.stringify({ mass, seed, placement: placement.attribute });

    // From anywhere outside, the first surface met on the way indoors faces outward.
    // The ground story spans the footprint, so points 1 m above its floor are indoors.
    for (let i = 0; i < 5; i++) {
      const target: Point = [0.25 + (i * (width - 0.5)) / 4, depth / 2, 1];
      for (let azimuth = 7; azimuth < 360; azimuth += 30)
        for (const elevation of [5, 25, 50, 80]) {
          const a = (azimuth * Math.PI) / 180,
            e = (elevation * Math.PI) / 180;
          const origin: Point = [
            width / 2 + reach * Math.cos(e) * Math.cos(a),
            depth / 2 + reach * Math.cos(e) * Math.sin(a),
            0.3 + reach * Math.sin(e),
          ];
          const hits = crossings(shell, placement.toWorld(origin), placement.toWorld(target));
          assert.ok(hits.length > 0, `A ray reached the interior unobstructed: ${label}`);
          assert.ok(hits[0].front, `The envelope shows a back face: ${label}`);
        }
    }

    // A closed shell is entered as often as it is left. Probe lines pass just inside every
    // face and corner; their offsets are irregular so no ray runs along a shell edge.
    const step = Math.max(0.3713, width / 55.3);
    const probes: Point[] = [];
    const levels = [0.0791, 0.3173, 0.4519, 0.6037, 0.7129, 0.8083, 0.9041].map((t) => t * height);
    levels.push(height - 0.4537);
    for (const z of levels) {
      for (let x = 0.1317; x < width; x += step) probes.push([x, 0.0713, z], [x, depth - 0.0713, z]);
      for (let y = 0.1317; y < depth; y += step) probes.push([0.0713, y, z], [width - 0.0713, y, z]);
    }
    let cast = 0;
    for (const probe of probes)
      for (const direction of directions) {
        // Rays stay above the open base; a ray that would start under the building is skipped.
        const before = direction[2] > 0 ? Math.min(reach, (probe[2] - 0.01) / direction[2]) : reach;
        const start = probe.map((v, k) => v - direction[k] * before) as Point,
          end = probe.map((v, k) => v + direction[k] * reach) as Point;
        const outside = (p: Point) => p[0] < -0.6 || p[0] > width + 0.6 || p[1] < -0.6 || p[1] > depth + 0.6;
        if (!outside(start)) continue;
        const hits = crossings(shell, placement.toWorld(start), placement.toWorld(end));
        const entered = hits.filter((hit) => hit.front).length;
        assert.equal(
          entered,
          hits.length - entered,
          `The shell is open along a ray through ${probe} toward ${direction}: ${label}`,
        );
        cast++;
      }
    assert.ok(cast > probes.length, "Most probe rays must be cast.");

    // Steep rays from the street rise through the band a jetty may occupy, crossing any soffit.
    for (let x = 0.1317; x < width; x += step)
      for (const [y, lean] of [
        [-0.2713, -0.0371],
        [depth + 0.1513, 0.0371],
      ]) {
        const start: Point = [x, y, 0.011],
          end: Point = [x + 0.0213 * reach, y + lean * reach, reach];
        const hits = crossings(shell, placement.toWorld(start), placement.toWorld(end));
        const entered = hits.filter((hit) => hit.front).length;
        assert.equal(entered, hits.length - entered, `An overhang is open from below at X=${x}: ${label}`);
      }
  }
});

test("generated parts respect the documented projection and head-clearance limits", async () => {
  const runs = [
    ...masses.flatMap((mass) =>
      ["medium", "high"].map((detail) => ({ mass, detail, seed: `limits-${detail}` })),
    ),
    // Jettied rows are where parts hung below a bay would float over the street.
    ...["fz-1", "fz-2", "fz-3", "fz-4", "fz-5", "fz-6"].map((seed) => ({
      mass: { width: 30, depth: 9, height: 11.6, stories: 4 },
      detail: "high",
      seed,
    })),
  ];
  for (const { mass, detail, seed } of runs) {
    const level = await build({ ...mass, detail, seed });
    const parts = partTriangles(level, "building");
    assert.ok(parts.length > 0);
    /** Largest distance outside the footprint rectangle, in meters. */
    const overhang = (point: Point) =>
      Math.max(-point[0], point[0] - mass.width, -point[1], point[1] - mass.depth, 0);
    const fail = (rule: string, part: string, point: Point) =>
      assert.fail(`${rule}: ${JSON.stringify({ mass, detail, seed, part, point })}`);
    for (const { points, part } of parts) {
      for (const point of points) {
        if (point[2] < -1e-6) fail("Below the base", part, point);
        if (overhang(point) > 1.6 + 1e-6) fail("Overhangs", part, point);
        const ceiling = part === "rooftop" ? mass.height + 3.5 : mass.height;
        if (point[2] > ceiling + 1e-6) fail("Too tall", part, point);
      }
      // Head clearance is not convex, so each edge is checked where it lies below 2.5 m.
      for (let edge = 0; edge < 3; edge++) {
        const a = points[edge],
          b = points[(edge + 1) % 3];
        if (Math.min(a[2], b[2]) >= 2.5) continue;
        const cut = a[2] < 2.5 === b[2] < 2.5 ? undefined : (2.5 - a[2]) / (b[2] - a[2]);
        const low = [a, b].filter((p) => p[2] < 2.5);
        if (cut !== undefined)
          low.push(a.map((v, k) => v + (b[k] - v) * (cut - Math.sign(b[2] - a[2]) * 1e-9)) as Point);
        for (const point of low)
          if (overhang(point) > 0.15 + 1e-6) fail("Intrudes on head clearance", part, point);
      }
    }
  }
});

test("parts keep clear of level collision and abutting buildings hide their shared walls", async () => {
  // A collidable pier stands 0.5 m in front of the facade, where balconies and signs would reach.
  const pier = { x0: 2, x1: 12, y0: -1.2, y1: -0.5, z0: 3, z1: 12 };
  const mass = { width: 14, depth: 6, height: 15.35, stories: 5 };
  const inside = (p: Point) =>
    p[0] > pier.x0 + 0.03 && p[0] < pier.x1 - 0.03 && p[1] > pier.y0 + 0.03 &&
    p[1] < pier.y1 - 0.03 && p[2] > pier.z0 + 0.03 && p[2] < pier.z1 - 0.03;
  // Without the pier the same building reaches into that volume, so the check below is not vacuous.
  const free = partTriangles(await build({ ...mass, seed: "pier-a", detail: "high" }), "building");
  assert.ok(free.some(({ points }) => points.some(inside)));
  for (const seed of ["pier-a", "pier-b", "pier-c"]) {
    const level = await build({
      ...mass,
      seed,
      detail: "high",
      elements: `\n  <box id="pier" position="${pier.x0} ${pier.y0} ${pier.z0}" width="${pier.x1 - pier.x0}" depth="${pier.y1 - pier.y0}" height="${pier.z1 - pier.z0}"/>`,
    });
    const parts = partTriangles(level, "building");
    for (const { points, part } of parts)
      for (let edge = 0; edge < 3; edge++)
        for (let stepIndex = 0; stepIndex <= 6; stepIndex++) {
          const a = points[edge],
            b = points[(edge + 1) % 3];
          const point = a.map((v, k) => v + ((b[k] - v) * stepIndex) / 6) as Point;
          assert.ok(!inside(point), `${part} runs into the pier at ${point} (${seed}).`);
        }
    // Behind the pier the facade still carries flush parts.
    assert.ok(
      parts.some(
        (triangle) =>
          triangle.part === "openings" &&
          triangle.points.every((p) => p[0] > pier.x0 && p[0] < pier.x1 && p[2] > pier.z0 && p[1] < 0.2),
      ),
    );
  }
  const abutting = `<architecture version="1" id="abutting" validation="premap">
  <material id="finish" color="#c6c2b4"/>
  <box id="first" width="7" depth="5" height="12.35" collidable="false"/>
  <box id="second" position="7 0 0" width="6" depth="5" height="18.35" collidable="false"/>
  <dressing seed="abutting">
    <building host="first" material="finish" stories="4"/>
    <building host="second" material="finish" stories="6"/>
  </dressing>
</architecture>`;
  const level = await compile(parseAml(abutting), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const shells = ["first", "second"].flatMap((host) =>
    partTriangles(level, host).filter((triangle) => ["envelope", "roof"].includes(triangle.part)),
  );
  // Up to the lower building's 12.35 m the shared plane is buried; above it the taller wall shows once.
  for (let i = 0; i < 9; i++) {
    const y = 0.31 + i * 0.5;
    for (const z of [1, 5, 8, 10.5])
      assert.deepEqual(
        crossings(shells, [6.5, y, z], [7.5, y, z]),
        [],
        `A wall remains on the shared plane at Y=${y}, Z=${z}.`,
      );
    const above = crossings(shells, [6.5, y, 15.9], [7.5, y, 15.9]);
    assert.ok(
      above.length === 1 && above[0].front,
      `The taller neighbor's wall is not exposed once at Y=${y}.`,
    );
  }
  // Together they still form one closed shell.
  for (let i = 0; i < 12; i++) {
    const hits = crossings(shells, [-20, 0.4 + i * 0.37, 2.3 + i], [40, 0.9 + i * 0.3, 2.3 + i]);
    const entered = hits.filter((hit) => hit.front).length;
    assert.equal(entered, hits.length - entered);
  }
});

test("kit finishes bind declared materials and fall back when absent", async () => {
  const materials = ROLES.map(
    (role) => `\n  <material id="kit-${role}" color="#ffffff" repeat="${role === "metal" ? 2 : 1}" texture="textures/${role}.png"${cutout(role)}/>`,
  ).join("");
  const mass = { width: 22, depth: 8, height: 20.35, stories: 6, detail: "high" };
  const finished = { ...mass, materials, dressing: 'finishes="kit"' };
  assert.equal(
    parseAml(serializeAml(parseAml(buildingSource(finished)))).dressing!.finishes,
    "kit",
  );
  for (const placement of PLACEMENTS) {
    const level = await build({ ...finished, placement: placement.attribute });
    const parts = partTriangles(level, "building");
    for (const role of ROLES)
      assert.ok(
        parts.some((triangle) => triangle.material === `kit-${role}`),
        `No part uses the declared ${role} finish.`,
      );

  }
  // The metal finish repeats twice per meter here; against one repeat its texture spans double.
  /** Total first-edge texture span of the metal parts. */
  const metalSpan = async (source: string) => {
    const level = await build({ ...finished, materials: source });
    return partTriangles(level, "building")
      .filter((triangle) => triangle.material === "kit-metal")
      .reduce((sum, { uv }) => sum + Math.abs(uv[1][0] - uv[0][0]) + Math.abs(uv[1][1] - uv[0][1]), 0);
  };
  const doubled = await metalSpan(materials),
    single = await metalSpan(materials.replace('repeat="2"', 'repeat="1"'));
  assert.ok(single > 0 && Math.abs(doubled - 2 * single) < 1e-6 * single);
  // Declaring one role binds that role alone.
  const signsOnly = partTriangles(
    await build({ ...mass, dressing: 'finishes="kit"', materials: '\n  <material id="kit-signboard" color="#ffffff"/>' }),
    "building",
  );
  assert.ok(signsOnly.some((triangle) => triangle.material === "kit-signboard"));
  assert.ok(signsOnly.every((triangle) => !/^kit-(?!signboard)/.test(triangle.material)));
  // Without the attribute, declared kit materials are left alone.
  const unbound = partTriangles(await build({ ...mass, materials }), "building");
  assert.ok(unbound.every((triangle) => !triangle.material.startsWith("kit-")));
  for (const broken of [
    { dressing: 'finishes="absent"', materials: "" },
    { dressing: 'finishes="kit"', materials: '\n  <material id="kit-sings" color="#ffffff"/>' },
  ]) {
    const level = await compile(parseAml(buildingSource({ ...mass, ...broken })), {
      navigation: false,
    });
    assert.ok(level.diagnostics.some((d) => d.code === "AML_DRESSING" && d.source));
  }
});

test("washing and air conditioners retain valid atlas coordinates, winding and untextured fallback", async () => {
  const mass = { width: 22, depth: 8, height: 20.35, stories: 6, detail: "high", dressing: 'finishes="kit"' };
  const declare = (roles: string[]) =>
    roles.map((role) => `\n  <material id="kit-${role}" color="#ffffff"${role === "lettering" ? ' texture="textures/lettering.png"' : ""}${cutout(role)}/>`).join("");
  for (const placement of PLACEMENTS) {
    const parts = partTriangles(
      await build({ ...mass, materials: declare(ROLES), placement: placement.attribute }),
      "building",
    );
    const cloth = parts.filter((triangle) => triangle.material === "kit-cloth");
    assertHungCloth(cloth);
    for (const { uv } of cloth) atlasCell(uv, 8, 4, "A cloth triangle");
    const units = clusters(parts.filter((triangle) => triangle.material === "kit-aircon"), 0.15);
    for (const unit of units) {
      const cells = new Set(unit.map(({ uv }) => atlasCell(uv, 8, 4, "An air conditioner triangle")));
      // The kit samples the first 26 cells, counted row by row from the atlas's top left.
      for (const cell of cells) {
        const [column, row] = cell.split(",").map(Number);
        assert.ok((3 - row) * 8 + column < 26, `An air conditioner samples the unpainted cell ${cell}.`);
      }
      // Whatever lies in the unit's box belongs to it: its case, grille, fan, guard, brackets and pipes.
      const corners = unit.flatMap((triangle) => triangle.points);
      const within = (point: Point) =>
        [0, 1, 2].every(
          (axis) =>
            point[axis] >= Math.min(...corners.map((corner) => corner[axis])) - 0.02 &&
            point[axis] <= Math.max(...corners.map((corner) => corner[axis])) + 0.02,
        );
      assertConsistentWinding(
        parts.filter((triangle) => triangle.part === "fixtures" && triangle.points.every(within)),
        "An air conditioner",
      );
    }
  }
  // Leaving out the two atlases keeps every triangle and draws it in the plain kit finish.
  /** Names a triangle by its positions and normals at the precision the kit emits. */
  const signature = (triangle: PartTriangle) =>
    [...triangle.points.flat().map((v) => v.toFixed(4)), ...triangle.normals.flat().map((v) => v.toFixed(3))].join();
  const bound = partTriangles(await build({ ...mass, materials: declare(ROLES) }), "building");
  const others = ROLES.filter((role) => role !== "cloth" && role !== "aircon");
  const partial = partTriangles(await build({ ...mass, materials: declare(others) }), "building");
  assert.equal(partial.length, bound.length);
  const plain = new Map<string, string[]>();
  for (const triangle of partial) plain.set(signature(triangle), [...(plain.get(signature(triangle)) ?? []), triangle.material]);
  for (const [role, fallback] of [["cloth", "$kowloon/paint"], ["aircon", "$kowloon/metal"]]) {
    assert.ok(partial.every((triangle) => triangle.material !== `kit-${role}`));
    for (const triangle of bound.filter((candidate) => candidate.material === `kit-${role}`))
      assert.ok(
        plain.get(signature(triangle))?.includes(fallback),
        `A ${role} triangle is missing or not drawn in ${fallback} without its atlas.`,
      );
  }
});

test("wall windows stay flush, and a wall too short for a bay reports a spatial warning", async () => {
  const wall = (length: number) => `<architecture version="1" id="wall-windows" validation="premap">
  <material id="finish" color="#c6c2b4"/>
  <path id="wall-axis" points="0 0 0; ${length} 0 0"/>
  <wall id="wall" path="wall-axis" thickness="0.2" height="3"/>
  <dressing seed="wall">
    <wall host="wall" face="back" material="finish"/>
  </dressing>
</architecture>`;
  const long = await compile(parseAml(wall(9)), { navigation: false });
  assert.deepEqual(long.diagnostics, []);
  const windows = partTriangles(long, "wall");
  assert.ok(windows.length > 0);
  // The dressed face is the wall's +Y side at Y=0.1; windows may stand 0.15 m proud of it.
  for (const { points } of windows)
    for (const point of points)
      assert.ok(point[1] >= 0.1 - 1e-6 && point[1] <= 0.25 + 1e-6, `Y=${point[1]}`);
  const short = await compile(parseAml(wall(1.2)), { navigation: false });
  const warning = short.diagnostics.find((d) => d.code === "DRESSING_NO_WINDOW_FIT");
  assert.ok(warning?.source && warning.objects.includes("wall"));
  assert.equal(warning.severity, "warning");
});
