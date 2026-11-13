import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, collisionMesh } from "levelspec";
import { GroundSurfaceField, type GroundSurfaceRecipe } from "../src/dressing/ground-surface.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import type { V3 } from "../src/architecture/types.ts";

type Bounds = [number, number, number, number];

/** An independent rectangle, optionally rotated about the world origin. */
function rectangle([x0, y0, x1, y1]: Bounds, angle = 0): V3[] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [c * x - s * y, s * x + c * y, 0]);
}

/** Supplies real deterministic materials, affine UVs and finite relief to proof checks. */
function recipe(changes: Partial<GroundSurfaceRecipe> = {}): GroundSurfaceRecipe {
  return { seed: 71, kind: "concrete", polygon: rectangle([-4, -4, 4, 4]), deposits: [], tileSize: 0.16,
    wornEdges: [true, true, true, true], angle: 0.31, phase: 0.17, material: id => ({ id, repeat: 2 }),
    color: () => [0.8, 0.7, 0.6], relief: true, wear: 1, receivingEdges: [], ...changes };
}

/** A proof must retain one common dominant layer, including harmless exact boundary ties. */
function commonOwner(field: GroundSurfaceField, area: Bounds): void {
  let common = new Set(field.materials);
  const phases = [0, 0.017, 0.113, 0.271, 0.413, 0.587, 0.739, 0.893, 0.983, 1];
  for (const x of phases) for (const y of phases) {
    const u = area[0] + x * (area[2] - area[0]), v = area[1] + y * (area[3] - area[1]);
    const sample = field.sample(u, v), maximum = Math.max(...sample.layers.map(layer => layer.weight));
    common = new Set([...common].filter(material => sample.layers.some(layer => layer.material === material && layer.weight >= maximum - 1e-9)));
    assert.ok(common.size > 0, `A claimed uniform rectangle contains conflicting actual owners at ${u},${v}; bounds=${area}`);
  }
}

test("ground coverage proofs retain actual owners across warped asphalt, deposits and worn units", () => {
  for (const seed of [7, 71, 113]) for (const angle of [0, 0.47]) {
    const cases = [
      recipe({ seed, asphalt: [rectangle([-0.7, -0.3, 0.8, 0.5], angle)] }),
      recipe({ seed, deposits: [
        { material: "joint", polygon: rectangle([-1.5, -0.006, 1.5, 0.006], angle) },
        { material: "spall", polygon: rectangle([-0.4, 0.08, 0.2, 0.4], angle) },
        { material: "chip", polygon: rectangle([0.1, -0.35, 0.6, -0.1], angle) },
      ] }),
      recipe({ seed, kind: "timber", polygon: rectangle([-0.64, -0.64, 0.64, 0.64]) }),
    ];
    for (const source of cases) {
      const polygonSnapshot = structuredClone({ polygon: source.polygon, asphalt: source.asphalt, deposits: source.deposits });
      const field = new GroundSurfaceField(source);
      const stations: [number, number][] = [[-0.591, 0.137], [0.273, -0.019], [0.017, 0.311]];
      const before = stations.map(([u, v]) => field.sample(u, v));
      let proven = 0, uncertain = 0;
      for (let ix = -5; ix <= 5; ix++) for (let iy = -5; iy <= 5; iy++) {
        const x = ix * 0.117 + 0.019, y = iy * 0.113 - 0.027;
        for (const [width, depth] of [[0.018, 0.013], [0.19, 0.002], [0.002, 0.19]]) {
          const area: Bounds = [x, y, x + width, y + depth];
          if (field.uniformCoverage(area)) { proven++; commonOwner(field, area); }
          else uncertain++;
        }
      }
      assert.ok(proven > 0 && uncertain > 0, `${source.kind} seed=${seed}, angle=${angle} exercises useful proofs and real uncertainty`);
      assert.deepEqual(stations.map(([u, v]) => field.sample(u, v)), before,
        "Coverage proof queries cannot change the seeded material weights, UVs, tint or height");
      assert.deepEqual({ polygon: source.polygon, asphalt: source.asphalt, deposits: source.deposits }, polygonSnapshot);
    }
  }
});

test("long narrow joint regions have useful proofs while concave and degenerate footprints stay uncertain", () => {
  const joint = new GroundSurfaceField(recipe({ deposits: [{ material: "joint", polygon: rectangle([-2, -0.02, 2, 0.02]) }] }));
  for (const area of [[-1.9, -0.01, 1.9, 0.01], [-1.9, 0.024, 1.9, 0.027]] as Bounds[]) {
    assert.equal(joint.uniformCoverage(area), true, "An elongated rectangle wholly inside or outside a joint need not inherit its circumscribed circle's uncertainty");
    commonOwner(joint, area);
  }
  assert.equal(joint.uniformCoverage([-1.9, 0.018, 1.9, 0.022]), false, "Actual noisy joint boundaries remain unresolved");
  for (const polygon of [
    [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0.5, 0.3, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 0, 0], [0.5, 0, 0]],
  ] as V3[][]) {
    const deposit = new GroundSurfaceField(recipe({ deposits: [{ material: "joint", polygon }] }));
    assert.equal(deposit.uniformCoverage([0.1, -0.001, 0.2, 0.001]), false,
      "Unproven polygon convexity cannot authorize a shortcut through its boundary band");
    const asphalt = new GroundSurfaceField(recipe({ asphalt: [polygon] }));
    assert.equal(asphalt.uniformCoverage([0.1, 0.1, 0.2, 0.2]), false);
  }
  const epsilon = 1e-14;
  const tinyNotch: V3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1 - epsilon, 1 - epsilon, 0], [0, 1, 0]];
  const uncertain = new GroundSurfaceField(recipe({ deposits: [{ material: "joint", polygon: tinyNotch }] }));
  const owners = [[0.43, 0.57], [0.57, 0.43]].map(([u, v]) => uncertain.sample(u, v).layers
    .reduce((best, layer) => layer.weight > best.weight ? layer : best).material);
  assert.deepEqual(new Set(owners), new Set(["concrete", "joint"]), "The tiny nonzero reflex edge still changes the actual signed material field");
  assert.equal(uncertain.uniformCoverage([0.4, 0.4, 0.6, 0.6]), false,
    "An uncertain short edge cannot be discarded to claim convexity of a materially nonuniform domain");
});

test("local asphalt bounds prove tiny edge regions without losing warped transitions or convex corners", () => {
  for (const seed of [7, 71, 113]) {
    const field = new GroundSurfaceField(recipe({ seed, asphalt: [rectangle([-0.7, -0.3, 0.8, 0.5])] }));
    const areas: Bounds[] = [];
    const around = (x: number, y: number) => areas.push([x - 0.0007, y - 0.0007, x + 0.0007, y + 0.0007]);
    for (const offset of [-0.08, -0.04, -0.01, 0.01, 0.04, 0.08]) {
      for (let i = 0; i < 17; i++) {
        const x = -0.7 + (i + 0.317) * 1.5 / 17, y = -0.3 + (i + 0.619) * 0.8 / 17;
        around(x, -0.3 + offset); around(x, 0.5 + offset);
        around(-0.7 + offset, y); around(0.8 + offset, y);
      }
      for (const other of [-0.08, -0.01, 0.01, 0.08]) for (const [x, y] of [[-0.7, -0.3], [-0.7, 0.5], [0.8, -0.3], [0.8, 0.5]])
        around(x + offset, y + other);
    }
    // These query boxes straddle actual noise lattice lines instead of only generic off-lattice phases.
    for (const frequency of [4.2, 19, 67, 157]) for (const integer of [-2, -1, 0, 1, 2]) {
      around(integer / frequency, -0.29); around(0.79, integer / frequency);
    }
    let proven = 0, uncertain = 0;
    const provenOwners = new Set<string>();
    for (const area of areas) {
      if (field.uniformCoverage(area)) {
        proven++; commonOwner(field, area);
        const sample = field.sample((area[0] + area[2]) / 2, (area[1] + area[3]) / 2);
        provenOwners.add(sample.layers.reduce((best, layer) => layer.weight > best.weight ? layer : best).material);
      }
      else uncertain++;
    }
    assert.ok(proven > 100 && uncertain > 0,
      `Local warp bounds must resolve many safe near-edge boxes while preserving boundary uncertainty: seed=${seed}, proven=${proven}, uncertain=${uncertain}`);
    assert.deepEqual(provenOwners, new Set(["concrete", "asphalt"]),
      "Useful near-edge proofs preserve both the exposed substrate and retained asphalt");
  }
});

test("a proven narrow ground strip preserves its field with substantially less discovery work", async context => {
  const area: Bounds = [-0.5, 0.024, 0.5, 0.027];
  const source = recipe({ deposits: [{ material: "joint", polygon: rectangle([-1, -0.02, 1, 0.02]) }] });
  const counts: number[] = [];
  for (const prove of [false, true]) {
    const field = new GroundSurfaceField(source);
    const materials = field.materials.map(id => `<material id="${id}"/>`).join("");
    const level = await compile(parseAml(`<architecture version="1" id="narrow-joint">${materials}<box id="receiver" width="1" depth="1" height="0.1" material="concrete"/></architecture>`), { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    const physical = collisionMesh(level, true), points = rectangle(area);
    level.mesh = { positions: points.flat(), indices: [0, 1, 2, 0, 2, 3], normals: points.flatMap(() => [0, 0, 1]),
      uv: points.flatMap(([x, y]) => [x, y]), colors: points.flatMap(() => [1, 1, 1]), surfaces: [0, 0] };
    let samples = 0;
    registerSurfaceChart(level, { id: "strip", host: "receiver", firstTriangle: 0, triangleCount: 2,
      frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds: area,
      materials: field.materials, layerElevations: field.layerElevations, featureScale: 0.004, geometryStep: 0.05,
      uniformCoverage: prove ? bounds => field.uniformCoverage(bounds) : undefined,
      appearanceTint: (u, v, layer) => field.tint(u, v, layer),
      sample: (u, v) => { samples++; return field.sample(u, v); } });
    await compileSurfaceAppearance(level, {}, 1_000);
    counts.push(samples);
    assert.deepEqual(collisionMesh(level, true), physical);
    let covered = 0;
    for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
      const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      const [a, b, c] = indices.map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
      const signedArea = ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
      assert.ok(signedArea > 0); covered += signedArea;
      assert.equal(level.surfaces[level.mesh.surfaces[triangle]].material, "concrete");
      for (const index of indices) {
        const [u, v, z] = level.mesh.positions.slice(index * 3, index * 3 + 3);
        const expected = field.sample(u, v).layers.find(layer => layer.material === "concrete")!;
        assert.equal(z, 0);
        assert.ok(expected.uv.every((value, axis) => Math.abs(value - level.mesh.uv[index * 2 + axis]) < 1e-10));
        assert.ok(field.tint(u, v, 0).every((value, axis) => Math.abs(value - level.mesh.colors![index * 3 + axis]) < 1e-10));
      }
    }
    assert.ok(Math.abs(covered - 0.003) < 1e-10, "Both discovery strategies retain the complete oriented receiving strip");
  }
  context.diagnostic(`Actual field samples: unproven=${counts[0]}, proven=${counts[1]}`);
  assert.ok(counts[0] > 1_000 && counts[1] < counts[0] / 10,
    "A geometric proof eliminates most fine discovery work without changing the receiving field");
});
