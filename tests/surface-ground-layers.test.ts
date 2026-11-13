import { test } from "node:test";
import assert from "node:assert/strict";
import type { V3 } from "../src/architecture/types.ts";
import { GroundSurfaceField, type GroundSurfaceRecipe } from "../src/dressing/ground-surface.ts";

test("plain ground resolves only its available finish and preserves authored sampling", () => {
  for (const kind of ["concrete", "asphalt"]) {
    const source: GroundSurfaceRecipe = {
      ...damagedGround(true, kind), asphalt: undefined, deposits: [],
      material(finish) {
        assert.equal(finish, kind, "A plain pour does not require unused asphalt, grout or substrate materials");
        return { id: `only-${kind}`, repeat: 2 };
      },
    };
    const field = new GroundSurfaceField(source);
    for (const [x, y] of [[0.2, 0.3], [1.5, 2.5], [3.8, 0.7]]) {
      const sample = field.sample(x, y);
      assert.deepEqual(sample.layers.map((layer, index) => [layer.material, layer.weight, field.tint(x, y, index)]),
        [[`only-${kind}`, 1, [0.8, 0.7, 0.6]]]);
      assert.equal(field.renderedHeight(x, y), 0);
      assert.ok(Math.abs(sample.layers[0].uv[0] - ((x * Math.cos(0.37) - y * Math.sin(0.37)) * 2 + 0.23)) < 1e-12);
    }
  }
});

test("ground ownership and height evaluation do not invoke pigment", () => {
  const field = new GroundSurfaceField({ ...damagedGround(true), color() { throw new Error("pigment requested"); } });
  assert.ok(field.sample(0.2, 0.7).layers.some(layer => layer.weight > 0));
  assert.ok(Number.isFinite(field.renderedHeight(0.2, 0.7)));
  assert.throws(() => field.tint(0.2, 0.7, 0), /pigment requested/);
});

test("ground pigment keeps explicit finish identity and relief independence", () => {
  const colors: Record<string, V3> = { concrete: [0.8, 0.7, 0.6], asphalt: [0.4, 0.3, 0.2], spall: [0.6, 0.5, 0.4] };
  const recipe = { ...damagedGround(true), color: (_point: V3, finish: string): V3 => colors[finish] ?? [1, 1, 1] };
  const field = new GroundSurfaceField(recipe), flat = new GroundSurfaceField({ ...recipe, relief: false });
  for (const [x, y, finish] of [[0.2, 0.7, "asphalt"], [1.3, 1.3, "spall"], [3, 3, "concrete"]] as const) {
    const layers = field.sample(x, y).layers;
    const selected = layers.findIndex(layer => layer.material === `source-${finish}`);
    assert.ok(selected >= 0 && layers[selected].weight > 0.999);
    assert.deepEqual(field.tint(x, y, selected), colors[finish]);
    assert.deepEqual(flat.tint(x, y, selected), colors[finish]);
  }

});

/** Produces independently located physical damage with a remnant entirely inside its spall. */
function damagedGround(relief: boolean, kind = "concrete"): GroundSurfaceRecipe {
  const rectangle = (x0: number, y0: number, x1: number, y1: number): V3[] =>
    [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
  return { seed: 71, kind, polygon: rectangle(0, 0, 4, 4), asphalt: [rectangle(-1, -1, 1, 5)],
    deposits: [
      { material: "spall", polygon: rectangle(1.2, 1.2, 2, 2) },
      { material: "chip", polygon: rectangle(1.45, 1.45, 1.65, 1.65) },
      { material: "joint", polygon: rectangle(2.4, 0.2, 2.5, 3.8) },
      { material: "crack", polygon: rectangle(2.7, 0.2, 2.8, 3.8) },
      { material: "repair", polygon: rectangle(3.2, 1.2, 3.7, 1.8) },
    ], tileSize: 0.16, wornEdges: [false, false, false, false], angle: 0.37, phase: 0.23,
    material: finish => ({ id: `source-${finish}`, repeat: 3 }), color: () => [0.8, 0.7, 0.6], relief,
    receivingEdges: [[[0.5, 0.2, 0], [0.5, 3.8, 0]]],
  };
}

test("ground fields preserve authored material ownership, UVs, inputs and zero relief", () => {
  const source = damagedGround(true), original = structuredClone({ ...source, material: undefined, color: undefined });
  const field = new GroundSurfaceField(source), flat = new GroundSurfaceField(damagedGround(false));
  const probes: [number, number, string][] = [
    [0.2, 0.7, "asphalt"], [1.3, 1.3, "spall"], [1.55, 1.55, "chip"],
    [2.45, 0.7, "joint"], [2.75, 0.7, "crack"], [3.4, 1.5, "repair"], [3, 3, "concrete"],
  ];
  for (const [x, y, material] of probes) {
    const sample = field.sample(x, y), zero = flat.sample(x, y);
    const selected = sample.layers.reduce((best, layer) => layer.weight > best.weight ? layer : best);
    assert.equal(selected.material, `source-${material}`);
    assert.ok(selected.weight > 0.999, "Each independently chosen station is within the intended retained material");
    assert.ok(Number.isFinite(field.renderedHeight(x, y)));
    assert.equal(flat.renderedHeight(x, y), 0);
    assert.equal(zero.heightWeight, 0);
    assert.deepEqual(zero.layers, sample.layers, "Zero geometric relief retains the same material ownership and UVs");
    if (material === "asphalt") {
      assert.deepEqual(selected.uv, [x * 3, y * 3]);
      continue;
    }
    assert.ok(Math.abs(selected.uv[0] - ((x * Math.cos(0.37) - y * Math.sin(0.37)) * 3 + 0.23)) < 1e-12);
    assert.ok(Math.abs(selected.uv[1] - ((x * Math.sin(0.37) + y * Math.cos(0.37)) * 3 + 0.23 * 0.37)) < 1e-12);
  }
  assert.deepEqual({ ...source, material: undefined, color: undefined }, original);
});

test("shared asphalt covers seams continuously across receivers without mutating footprints", () => {
  const source = damagedGround(true);
  const footprints: V3[][] = [
    [[-1, -1, 0], [1, -1, 0], [1, 5, 0], [-1, 5, 0]],
    [[2.2, -1, 0], [3, -1, 0], [3, 5, 0], [2.2, 5, 0]],
  ];
  const snapshot = structuredClone(footprints);
  const first = new GroundSurfaceField({ ...source, asphalt: footprints });
  const next = new GroundSurfaceField({ ...source, asphalt: footprints, angle: 1.7, phase: 89 });
  for (const [x, y] of [[0, 1], [2.45, 0.7], [2.75, 0.7]]) {
    const a = first.sample(x, y).layers.find(layer => layer.material === "source-asphalt")!;
    const b = next.sample(x, y).layers.find(layer => layer.material === "source-asphalt")!;
    assert.equal(a.weight, 1);
    assert.deepEqual(a, b);
  }
  assert.equal(first.sample(3.4, 1.5).layers.find(layer => layer.material === "source-repair")!.weight, 1);
  assert.deepEqual(footprints, snapshot);
  const empty = new GroundSurfaceField({ ...source, asphalt: [], deposits: [] });
  assert.deepEqual(empty.materials, ["source-concrete"]);
});

test("asphalt relief crosses internal receiver boundaries but fades at native edges", () => {
  const source = damagedGround(true);
  const asphalt: V3[][] = [[[-1,-1,0], [3,-1,0], [3,3,0], [-1,3,0]]];
  const left = new GroundSurfaceField({ ...source, asphalt, receivingEdges: [],
    polygon: [[0,0,0],[1,0,0],[1,2,0],[0,2,0]] });
  const right = new GroundSurfaceField({ ...source, asphalt, receivingEdges: [],
    polygon: [[1,0,0],[2,0,0],[2,2,0],[1,2,0]] });
  assert.ok(left.renderedHeight(1, 1) > 0);
  assert.equal(left.renderedHeight(1, 1), right.renderedHeight(1, 1));
  assert.equal(left.rasterSample(1, 1, 0.01).bump, right.rasterSample(1, 1, 0.01).bump);
  const rim = new GroundSurfaceField({ ...source, asphalt, receivingEdges: [[[1,0,0],[1,2,0]]] });
  assert.equal(rim.renderedHeight(1, 1), 0);
});
