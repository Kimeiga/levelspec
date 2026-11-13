import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { validateBytes } from "gltf-validator";
import { collisionMesh, compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import type { ArchitectureCompileOptions, CompiledArchitecture } from "../src/architecture/types.ts";
import type { Material, MeshData, V3 } from "../src/vector/types.ts";
import type { SurfaceChart, SurfaceSample } from "../src/dressing/surface/types.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { SurfaceSampler } from "../src/dressing/surface/sample.ts";
import { ReceiverEdges } from "../src/dressing/surface/conform.ts";
import { heightUVMetric } from "../src/dressing/surface/height-normal.ts";

const source = `<architecture version="1" id="surface-study" validation="premap">
  <material id="finish" color="#ffffff" roughness="0.8" texture="plaster.png"
    height-texture="height.png" height-scale="0.01" height-offset="0"/>
  <path id="axis" points="0 0 0; 2 0 0"/>
  <wall id="wall" path="axis" height="2" thickness="0.2"/>
  <profile id="plan" points="0 0.1; 2 0.1; 2 2.1; 0 2.1"/>
  <slab id="floor" profile="plan" thickness="0.2"/>
  <marker id="start" kind="spawn" element="floor" position="1 1 0"/>
  <dressing seed="surface-study" detail="low" grime="0.7" wear="0.6">
    <wall host="wall" material="finish" face="back" windows="false" tile-share="0"/>
  </dressing>
</architecture>`;

/** Supplies tiny independent material inputs, including a red-channel height distinct from the other channels. */
function inputImages(color = [150, 125, 100, 255]): Map<string, Uint8Array> {
  const image = (pixel: number[]) => {
    const png = new PNG({ width: 4, height: 4 });
    for (let i = 0; i < 16; i++) png.data.set(pixel, i * 4);
    return new Uint8Array(PNG.sync.write(png));
  };
  return new Map([
    ["plaster.png", image(color)],
    ["height.png", image([128, 29, 240, 255])],
  ]);
}

/** Resolves only the declared material inputs and rejects accidental reads of unrelated companions. */
function resolver(images: Map<string, Uint8Array>) {
  return async (reference: string): Promise<Uint8Array> => {
    assert.ok(images.has(reference), `Unexpected appearance input ${reference}`);
    return images.get(reference)!;
  };
}

/** Requires a successful positive fixture before inspecting generated material evidence. */
function successful(level: CompiledArchitecture): CompiledArchitecture {
  assert.deepEqual(level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), []);
  return level;
}

/** Returns content identities without assuming chart names, chart packing or texture allocation order. */
function imageHashes(level: CompiledArchitecture): string[] {
  return Object.values(level.generatedImages ?? {}).map((image) => image.hash).sort();
}

/** Observes public compile publication and navigation progress without replacing either implementation. */
function observations() {
  const evidence = { publications: 0, navigation: 0 };
  const options: ArchitectureCompileOptions = {
    onGeometry: () => evidence.publications++,
    onProgress: (stage) => { if (stage === "Navigation") evidence.navigation++; },
  };
  return { evidence, options };
}

/** Gives pure material sampling a meter-scaled frame without involving procedural dressing. */
function analyticChart(sample: (u: number, v: number) => SurfaceSample, materials = ["finish"]): SurfaceChart {
  return {
    id: "analytic", host: "receiver", firstTriangle: 0, triangleCount: 2,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials, sample,
  };
}

/** Asserts a scalar with a named contract, allowing ordinary floating-point roundoff. */
function near(actual: number, expected: number, contract: string, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${contract}: expected ${expected}, received ${actual}`);
}

/** Normalizes an independently constructed geometric direction. */
function unit(vector: number[]): V3 {
  const length = Math.hypot(...vector);
  return vector.map((component) => component / length) as V3;
}

test("equivalent rotated UV metrics remain stable under translated receivers and source offsets", () => {
  const cosine = Math.cos(0.371), sine = Math.sin(0.371);
  for (let i = 0; i < 20; i++) {
    const chart: SurfaceChart = { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1,
      uv: [2 * (u * cosine - v * sine) + i * 0.713, 2 * (u * sine + v * cosine) - i * 0.931] }], height: 0 })),
      bounds: [i * 1.731, -i * 0.391, i * 1.731 + 0.73, -i * 0.391 + 0.81] };
    assert.deepEqual(heightUVMetric(chart, 0, "finish"), { uScale: 2, shear: 0, vScale: 2 },
      "Translation, phase and arbitrary rotation do not create spurious anisotropy or material variants");
  }
});

test("receiver conformance finds non-dyadic points on rotated 3D edges without changing covered area", () => {
  const a: V3 = [0.049999, -0.100001, 0.149999], b: V3 = [1.149999, 0.799999, 1.249999], c: V3 = [0.449999, -0.900001, 0.349999];
  const mix = (a: V3, b: V3, t: number): V3 => a.map((value, axis) => value + (b[axis] - value) * t) as V3;
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const delta = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;
  const areaVector = cross(delta(b, a), delta(c, a)), normal = unit(areaVector);
  for (const edges of [[[a, b]], [[a, b], [b, c], [c, a]]]) {
    const required = edges.flatMap(([start, end]) => Array.from({ length: 23 }, (_, i) => mix(start, end, (i + 0.371) / 24)))
      .concat([mix(a, b, 0.413), mix(a, b, 0.4130001)]);
    const offEdge = mix(a, b, 0.43).map((value, axis) => value + normal[axis] * 0.0000004) as V3;
    const mesh: MeshData = { positions: [a, b, c, ...required, offEdge].flat(), normals: [], uv: [], indices: [], surfaces: [] };
    const triangles = new ReceiverEdges(mesh).triangles([a, b, c]);
    const matches = (a: V3, b: V3) => Math.hypot(...delta(a, b)) < 1e-10;
    for (const point of required) assert.ok(triangles.some(triangle => triangle.some(vertex => matches(vertex, point))),
      `The shared edge retains its existing corner at ${point}`);
    assert.ok(!triangles.some(triangle => triangle.some(point => matches(point, offEdge))), "A nearby vertex outside the collinearity tolerance must not enter the receiver");
    let area = 0;
    for (const [p, q, r] of triangles) {
      const signed = cross(delta(q, p), delta(r, p)).reduce((sum, value, axis) => sum + value * normal[axis], 0);
      assert.ok(signed > 1e-14, "Every conformed triangle retains the original winding without collapsing its final off-line corner");
      area += signed;
      for (const point of [p, q, r]) near(delta(point, a).reduce((sum, value, axis) => sum + value * normal[axis], 0), 0,
        "Conformance cannot move the receiver out of its authored plane", 1e-10);
    }
    near(area, Math.hypot(...areaVector), "Conformed triangles cover the same oriented area", 1e-10);
  }
});

test("authored geometry height uses linear red, meter offsets, normalized coverage and boundary closure", () => {
  const finish: Material = { id: "finish", color: "#ffffff", repeat: 1, roughness: 1, metalness: 0,
    heightTexture: "height", heightScale: 0.025, heightOffset: -0.006 };
  const backing: Material = { ...finish, id: "backing", heightTexture: "backing-height", heightScale: 0.03, heightOffset: 0 };
  const sampler = new SurfaceSampler(new Map([[finish.id, finish], [backing.id, backing]]), new Map([
    ["height", { width: 1, height: 1, data: new Uint8Array([128, 29, 240, 255]) }],
    ["backing-height", { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }],
  ]));
  const sample: SurfaceSample = { height: 0.003, heightWeight: 0.5, layers: [
    { material: "finish", weight: 2, uv: [0.3, 0.4] }, { material: "backing", weight: 1, uv: [0.3, 0.4] },
  ] };
  near(sampler.height(sample), 0.003 + 0.5 * (2 / 3 * (128 / 255 * 0.025 - 0.006) + 1 / 3 * 0.03),
    "The same normalized material coverage blends linear-red height in meters");
  near(sampler.height({ ...sample, heightWeight: 0 }), 0.003, "Source microheight can close at a receiver boundary without removing macro relief");
  delete finish.heightScale; delete finish.heightOffset;
  near(sampler.height({ height: 0, layers: [sample.layers[0]] }), 128 / 255 * 0.01, "Default height range is one centimeter with zero offset");
});

/** Builds two adjacent rectangular receivers, optionally meeting at a non-dyadic source T-junction. */
function adjacentReceivers(splitRight: boolean): { mesh: MeshData; leftTriangles: number } {
  const mesh: MeshData = { positions: [], indices: [], normals: [], uv: [], surfaces: [] };
  const addRectangle = (x0: number, y0: number, x1: number, y1: number) => {
    const start = mesh.positions.length / 3;
    mesh.positions.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
    mesh.normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    mesh.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    mesh.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    mesh.surfaces.push(0, 0);
  };
  addRectangle(-1, 0, 0, 1);
  const leftTriangles = mesh.surfaces.length;
  if (splitRight) {
    addRectangle(0, 0, 1, 0.37);
    addRectangle(0, 0.37, 1, 1);
  } else addRectangle(0, 0, 1, 1);
  return { mesh, leftTriangles };
}

/** Measures the two actual piecewise-linear silhouettes along a shared edge, independent of tessellation. */
function maximumSharedEdgeGap(mesh: MeshData): number {
  const sides: Array<Array<[V3, V3]>> = [[], []];
  for (let triangleIndex = 0; triangleIndex < mesh.surfaces.length; triangleIndex++) {
    const points = mesh.indices.slice(triangleIndex * 3, triangleIndex * 3 + 3)
      .map((index) => mesh.positions.slice(index * 3, index * 3 + 3) as V3);
    const side = points.reduce((sum, point) => sum + point[0], 0) < 0 ? 0 : 1;
    for (let edge = 0; edge < 3; edge++) {
      const a = points[edge], b = points[(edge + 1) % 3];
      if (Math.abs(a[0]) < 1e-10 && Math.abs(b[0]) < 1e-10 && Math.abs(a[1] - b[1]) > 1e-10)
        sides[side].push(a[1] < b[1] ? [a, b] : [b, a]);
    }
  }
  assert.ok(sides.every((edges) => edges.length > 0), "Both receivers must retain their common edge");
  const stations = new Set([0, 1, ...sides.flat(2).map((point) => point[1]), ...Array.from({ length: 101 }, (_, i) => i / 100)]);
  let maximum = 0;
  for (const y of stations) {
    const heights = sides.map((edges) => {
      const segment = edges.find(([a, b]) => y >= a[1] - 1e-10 && y <= b[1] + 1e-10);
      assert.ok(segment, `Receiver edge must cover y=${y}`);
      const [a, b] = segment;
      return a[2] + (b[2] - a[2]) * (y - a[1]) / (b[1] - a[1]);
    });
    maximum = Math.max(maximum, Math.abs(heights[0] - heights[1]));
  }
  return maximum;
}

for (const variant of [
  { name: "matching receiver edges", splitRight: false, rightScale: 0.04, rightStep: 0.2 },
  { name: "source T-junctions", splitRight: true, rightScale: 0.04, rightStep: 0.2 },
  { name: "different receiver refinement scales", splitRight: false, rightScale: 0.02, rightStep: 0.08 },
]) {
  test(`surface relief remains watertight across ${variant.name}`, async () => {
    const level = await compile(parseAml(`<architecture version="1" id="seam"><material id="finish"/>
      <box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false });
    successful(level);
    const { mesh, leftTriangles } = adjacentReceivers(variant.splitRight);
    level.mesh = mesh;
    const sample = (u: number, v: number): SurfaceSample => ({
      layers: [{ material: "finish", weight: 1, uv: [u, v] }],
      height: 0.03 * Math.sin(7 * v) + 0.002 * Math.cos(11 * u),
    });
    const left: SurfaceChart = { ...analyticChart(sample), id: "left", bounds: [-1, 0, 0, 1], featureScale: 0.04, geometryStep: 0.2 };
    const right: SurfaceChart = {
      ...analyticChart(sample), id: "right", firstTriangle: leftTriangles,
      triangleCount: mesh.surfaces.length - leftTriangles, featureScale: variant.rightScale, geometryStep: variant.rightStep,
    };
    registerSurfaceChart(level, left);
    registerSurfaceChart(level, right);
    await compileSurfaceAppearance(level, {}, 100_000);
    near(maximumSharedEdgeGap(level.mesh), 0, "A shared continuous height field must not open visible receiver cracks", 1e-7);
    const heights = level.mesh.positions.filter((_, index) => index % 3 === 2);
    assert.ok(Math.max(...heights) - Math.min(...heights) > 0.04, "The relief field must be represented rather than flattened to hide cracks");
    for (const x of [-0.87, -0.55, -0.13, 0.19, 0.57, 0.91]) for (const y of [0.08, 0.27, 0.49, 0.68, 0.93]) {
      const actual = surfaceHeightsAt(level.mesh, x, y);
      assert.ok(actual.length > 0, "Conformed relief retains interior receiving coverage");
      for (const height of actual) near(height, 0.03 * Math.sin(7 * y) + 0.002 * Math.cos(11 * x),
        "Changed conformance diagonals preserve the independently known smooth height field", 0.00035);
    }
  });
}

test("surface triangle limits include untouched faces after a generated receiver", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="budget"><material id="finish"/>
    <box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false });
  successful(level);
  level.mesh = adjacentReceivers(false).mesh;
  const chart: SurfaceChart = { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [u, v] }], height: 0 })),
    triangleCount: 1, bounds: [-1, 0, 0, 1], featureScale: 0.04 };
  registerSurfaceChart(level, chart);
  await assert.rejects(compileSurfaceAppearance(level, {}, 3), /triangle budget/i,
    "One receiving and three untouched faces cannot fit a three-triangle final output budget");
});

test("raised procedural ground closes against an ordinary adjacent floor with a real opaque finish edge", async () => {
  const document = parseAml(`<architecture version="1" id="ground-edge" validation="premap">
    <material id="finish" color="#b8b3a3" height-texture="height.png" height-scale="0.01"/>
    <profile id="left-plan" points="0 0; 2 0; 2 1; 0 1"/><profile id="right-plan" points="2 0; 3 0; 3 1; 2 1"/>
    <slab id="left" profile="left-plan" thickness="0.2"/><slab id="right" profile="right-plan" thickness="0.2"/>
    <dressing seed="ground-edge" detail="low" grime="0" wear="0"><floor host="left" material="finish" ground="patched"
      relief="0.03" wetness="0" litter="0" repairs="0" tile-share="0" timber-share="0" asphalt="0" manholes="0" breakup="0"/></dressing>
  </architecture>`);
  const level = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(inputImages()) }));
  const boundary = level.mesh.surfaces.flatMap((surfaceIndex, triangle) => {
    const surface = level.surfaces[surfaceIndex];
    if (surface.visible === false) return [];
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const points = indices.map((index) => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3);
    return points.every((point) => Math.abs(point[0] - 2) < 1e-7) ? [points] : [];
  });
  let raisedStations = 0;
  for (let station = 0; station < 17; station++) {
    const y = 0.0237 + station * 0.95 / 16;
    const intervals = boundary.flatMap((points) => {
      const hits: number[] = [];
      for (let edge = 0; edge < 3; edge++) {
        const a = points[edge], b = points[(edge + 1) % 3];
        if (Math.abs(a[1] - b[1]) < 1e-12 || y < Math.min(a[1], b[1]) || y > Math.max(a[1], b[1])) continue;
        hits.push(a[2] + (b[2] - a[2]) * (y - a[1]) / (b[1] - a[1]));
      }
      return hits.length >= 2 ? [[Math.min(...hits), Math.max(...hits)]] : [];
    }).sort((a, b) => a[0] - b[0]);
    const upperEdges: number[] = [];
    for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
      const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
      if (level.mesh.normals[indices[0] * 3 + 2] < 0.5) continue;
      const points = indices.map((index) => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3);
      for (let edge = 0; edge < 3; edge++) {
        const a = points[edge], b = points[(edge + 1) % 3];
        if (Math.abs(a[0] - 2) > 1e-7 || Math.abs(b[0] - 2) > 1e-7 || Math.abs(a[1] - b[1]) < 1e-12 || y < Math.min(a[1], b[1]) || y > Math.max(a[1], b[1])) continue;
        upperEdges.push(a[2] + (b[2] - a[2]) * (y - a[1]) / (b[1] - a[1]));
      }
    }
    assert.ok(upperEdges.length > 0, `The receiving floor boundary remains present at y=${y}`);
    const top = Math.max(...upperEdges);
    assert.ok(top >= -1e-7 && top <= 0.030001, "The finish remains within the authored relief envelope at its perimeter");
    if (top < 1e-5) continue;
    raisedStations++;
    let covered = 0;
    for (const [low, high] of intervals) {
      if (high < covered) continue;
      assert.ok(low <= covered + 1e-7, `An open void remains in the vertical finish edge at y=${y}, z=${covered}..${low}`);
      covered = Math.max(covered, high);
    }
    assert.ok(covered >= top - 1e-7, `The finish edge reaches the actual ground surface at y=${y}`);
  }
  assert.ok(raisedStations > 0, "The fixture must exercise raised ground meeting the ordinary floor, not an already flush boundary");
});

/** Queries independent XY coverage and resolved material color, excluding vertical rim faces. */
function horizontalMaterialAt(level: CompiledArchitecture): (x: number, y: number) => string {
  const faces = level.mesh.surfaces.map((surface, triangle) => ({
    points: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map((index) => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3),
    material: level.document.materials.find((material) => material.id === level.surfaces[surface].material)!,
  })).filter(({ points: [a, b, c] }) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-12);
  return (x: number, y: number): string => {
    const covering = faces.filter(({ points }) => {
      const signs = points.map((a, index) => {
        const b = points[(index + 1) % 3];
        return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      });
      return signs.every((sign) => sign >= 0) || signs.every((sign) => sign <= 0);
    });
    assert.equal(covering.length, 1, `Exactly one opaque receiver covers ${x},${y}`);
    return covering[0].material.color;
  };
}

test("material contours retain off-lattice islands at their declared scale with millimeter boundary accuracy", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="contours"><material id="coat" color="#ff0000"/>
    <material id="backing" color="#0000ff"/><box id="receiver" width="2" depth="1" height="0.1" material="coat"/></architecture>`), { navigation: false }));
  level.mesh = adjacentReceivers(false).mesh;
  const circles = [[-0.731, 0.273, 0.012], [-0.317, 0.619, 0.021], [0.419, 0.387, 0.031], [0.61, 0.77, 0.08]];
  const chart: SurfaceChart = { ...analyticChart((u, v) => {
    const distance = Math.max(...circles.map(([x, y, radius]) => radius - Math.hypot(u - x, v - y)));
    const exposed = Math.max(0, Math.min(1, 0.5 + distance / 0.006));
    return { layers: [{ material: "coat", weight: 1 - exposed, uv: [u, v] }, { material: "backing", weight: exposed, uv: [u, v] }], height: -0.006 * exposed };
  }, ["coat", "backing"]), bounds: [-1, 0, 1, 1], triangleCount: 4, featureScale: 0.02 };
  registerSurfaceChart(level, chart);
  await compileSurfaceAppearance(level, {}, 100_000);
  const materialAt = horizontalMaterialAt(level);
  const exposedAt = (x: number, y: number) => materialAt(x, y) === "#0000ff";
  for (const [x, y, radius] of circles) {
    assert.ok(exposedAt(x, y), `A ${radius * 2}m island cannot disappear between adaptive probes`);
    for (let i = 0; i < 47; i++) {
      const angle = (i + 0.173) * Math.PI * 2 / 47;
      for (const offset of [-0.003, 0.003]) {
        assert.equal(exposedAt(x + Math.cos(angle) * (radius + offset), y + Math.sin(angle) * (radius + offset)), offset < 0,
          `The independently known circle boundary stays within 3mm at angle ${angle}`);
      }
    }
  }
});

test("straight saturated material seams stay straight at submillimeter scale", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="stripe"><material id="coat" color="#ff0000"/>
    <material id="backing" color="#0000ff"/><box id="receiver" width="2" depth="1" height="0.1" material="coat"/></architecture>`), { navigation: false }));
  level.mesh = adjacentReceivers(false).mesh;
  const lo = 0.2665, hi = 0.2935;
  registerSurfaceChart(level, { ...analyticChart((u, v) => {
    const alongNormal = 0.6 * u + 0.8 * v;
    const distance = Math.min(alongNormal - lo, hi - alongNormal);
    const exposed = Math.max(0, Math.min(1, 0.5 + distance / 0.001));
    return { layers: [{ material: "coat", weight: 1 - exposed, uv: [u, v] }, { material: "backing", weight: exposed, uv: [u, v] }], height: exposed * -0.004 };
  }, ["coat", "backing"]), bounds: [-1, 0, 1, 1], triangleCount: 4, featureScale: 0.02 });
  await compileSurfaceAppearance(level, {}, 100_000);
  const materialAt = horizontalMaterialAt(level);
  for (let i = 0; i < 33; i++) {
    const y = 0.0317 + i * 0.91 / 32;
    for (const boundary of [lo, hi]) for (const offset of [-0.00005, 0.00005]) {
      const x = (boundary - 0.8 * y) / 0.6;
      const inside = boundary === lo ? offset > 0 : offset < 0;
      assert.equal(materialAt(x + offset * 0.6, y + offset * 0.8), inside ? "#0000ff" : "#ff0000",
        "A straight 27mm strip must not acquire millimeter scallops from interpolated saturated weights");
    }
  }
});

/** Measures output elevation and interpolated shading independently of the production sampler. */
function surfaceValuesAt(mesh: MeshData, x: number, y: number): { height: number; normal: V3 }[] {
  const samples: { height: number; normal: V3 }[] = [];
  for (let triangle = 0; triangle < mesh.surfaces.length; triangle++) {
    const indices = mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const [a, b, c] = indices.map(index => mesh.positions.slice(index * 3, index * 3 + 3));
    const determinant = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(determinant) < 1e-12) continue;
    const wa = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / determinant;
    const wb = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / determinant;
    const weights = [wa, wb, 1 - wa - wb];
    if (weights.every(weight => weight >= -1e-10)) samples.push({
      height: wa * a[2] + wb * b[2] + (1 - wa - wb) * c[2],
      normal: unit([0, 1, 2].map(axis => weights.reduce((sum, weight, i) => sum + weight * mesh.normals[indices[i] * 3 + axis], 0))),
    });
  }
  return samples;
}
const surfaceHeightsAt = (mesh: MeshData, x: number, y: number) => surfaceValuesAt(mesh, x, y).map(sample => sample.height);

test("height envelopes bound combined receiver, recipe and source relief in the receiver frame", async () => {
  const document = parseAml(`<architecture version="1" id="bounded-height"><material id="finish"
    height-texture="height.png" height-scale="0.04" height-offset="-0.036"/>
    <box id="receiver" width="1" depth="0.25" height="0.1" material="finish"/></architecture>`);
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < 4; i++) image.data.set([255, 0, 0, 255], i * 4);
  const bytes = new Uint8Array(PNG.sync.write(image));
  const yaw = 0.37, tilt = 0.6;
  const frame = { origin: [12, -7, 3] as V3,
    u: [Math.cos(yaw) * Math.cos(tilt), Math.sin(yaw) * Math.cos(tilt), -Math.sin(tilt)] as V3,
    v: [-Math.sin(yaw), Math.cos(yaw), 0] as V3,
    normal: [Math.cos(yaw) * Math.sin(tilt), Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt)] as V3 };
  const axes = [frame.u, frame.v, frame.normal];
  const world = (u: number, v: number, h: number): V3 => frame.origin.map((origin, axis) =>
    origin + u * frame.u[axis] + v * frame.v[axis] + h * frame.normal[axis]) as V3;
  const project = (point: number[], translated: boolean): V3 => axes.map(direction => direction.reduce((sum, value, axis) =>
    sum + value * (point[axis] - (translated ? frame.origin[axis] : 0)), 0)) as V3;
  for (const maximum of [0, 0.01]) {
    const level = successful(await compile(document, { navigation: false }));
    const physical = collisionMesh(level, true), authored = structuredClone(level.architecture);
    const corners = [[0, 0], [1, 0], [1, 0.25], [0, 0.25]];
    const normal = unit(frame.normal.map((value, axis) => value - 0.002 * frame.u[axis]));
    level.mesh = { positions: corners.flatMap(([u, v]) => world(u, v, 0.004 + 0.002 * u)),
      normals: corners.flatMap(() => normal), uv: corners.flat(), colors: Array(12).fill(1),
      indices: [0, 1, 2, 0, 2, 3], surfaces: [0, 0] };
    registerSurfaceChart(level, { ...analyticChart((u, v) => ({
      layers: [{ material: "finish", weight: 1, uv: [u, v] }], height: 0.04 * u - 0.016,
    })), frame, bounds: [0, 0, 1, 0.25], elevationRange: [0, maximum] });
    await compileSurfaceAppearance(level, { resolveMaterialImage: async () => bytes }, 10_000);
    assert.deepEqual(collisionMesh(level, true), physical);
    assert.deepEqual(level.architecture, authored);
    const local = { ...level.mesh, positions: [] as number[], normals: [] as number[] };
    for (let i = 0; i < level.mesh.positions.length; i += 3) {
      const point = project(level.mesh.positions.slice(i, i + 3), true);
      assert.ok(point[2] >= -1e-10 && point[2] <= maximum + 1e-10,
        "The total envelope is measured along the translated, tilted receiver normal");
      local.positions.push(...point);
      local.normals.push(...project(level.mesh.normals.slice(i, i + 3), false));
    }
    for (const u of [0.1, 0.3, 0.7]) for (const v of [0.093, 0.173]) {
      // Original base .004+.002u, finish .04u-.016, red source .04-.036.
      const expected = Math.max(0, Math.min(maximum, 0.042 * u - 0.008));
      const normal = maximum > 0 && u === 0.3 ? unit([-0.042, 0, 1]) : [0, 0, 1];
      const samples = surfaceValuesAt(local, u, v);
      assert.ok(samples.length > 0, "Clamping cannot discard receiving coverage");
      for (const sample of samples) {
        near(sample.height, expected, "Clipped plateaus and the unsaturated slope preserve total height", 0.00035);
        assert.ok(sample.normal.reduce((sum, value, axis) => sum + value * normal[axis], 0) > Math.cos(Math.PI / 180),
          "Clipped plateaus shade flat and the remaining ramp retains its physical slope");
      }
    }
    assert.ok(Object.keys(level.generatedImages ?? {}).length > 0, "Bounding geometry does not disable explicit height-derived normal detail");
  }
});

test("invalid height envelopes reject atomically and a valid zero envelope recovers", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="bad-envelope"><material id="finish"/>
    <box id="receiver" width="1" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false }));
  level.mesh = adjacentReceivers(false).mesh;
  const before = structuredClone(level.mesh);
  const chart = { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [u, v] }], height: 0.02 })),
    bounds: [-1, 0, 1, 1] as [number, number, number, number], triangleCount: 4 };
  for (const range of [[0.01, 0], [0, Infinity], [NaN, 0]] as [number, number][]) {
    registerSurfaceChart(level, { ...chart, elevationRange: range });
    await assert.rejects(compileSurfaceAppearance(level, {}, 1_000), /envelope|elevation|range/i);
    assert.deepEqual(level.mesh, before);
  }
  registerSurfaceChart(level, { ...chart, elevationRange: [0, 0] });
  await compileSurfaceAppearance(level, {}, 1_000);
  for (const height of level.mesh.positions.filter((_, index) => index % 3 === 2)) near(height, 0, "A valid next transaction publishes the zero-height receiver");
});

test("procedural regions preserve source texture bytes, material factors and affine UV scale", async () => {
  const document = parseAml(`<architecture version="1" id="source-preserving"><material id="finish" color="#aabbcc" repeat="2"
    texture="color.png" normal-texture="normal.png" normal-scale="1.7" metallic-roughness-texture="properties.png" roughness="0.7" metalness="0.3"/>
    <material id="backing" color="#333333"/><box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`);
  const level = successful(await compile(document, { navigation: false }));
  const original = structuredClone(document.materials[0]);
  level.mesh = adjacentReceivers(false).mesh;
  const images = new Map<string, Uint8Array>();
  for (const [reference, pixel] of [["color.png", [180, 120, 60, 255]], ["normal.png", [204, 128, 230, 255]], ["properties.png", [17, 128, 64, 255]]] as const) {
    const image = new PNG({ width: 4, height: 4 });
    for (let i = 0; i < 16; i++) image.data.set(pixel, i * 4);
    images.set(reference, new Uint8Array(PNG.sync.write(image)));
  }
  registerSurfaceChart(level, { ...analyticChart((u, v) => {
    const exposed = Math.max(0, Math.min(1, 0.5 + (u + 0.371) / 0.01));
    return { layers: [
      { material: "finish", weight: 1 - exposed, uv: [2 * u + 0.27, 3 * v - 0.11], tint: [0.8, 0.7, 0.6] },
      { material: "backing", weight: exposed, uv: [u, v] },
    ], height: -0.006 * exposed };
  }, ["finish", "backing"]), bounds: [-1, 0, 1, 1], triangleCount: 4 });
  await compileSurfaceAppearance(level, { resolveMaterialImage: resolver(images) }, 100_000);
  assert.deepEqual(level.document.materials.find((material) => material.id === "finish"), original);
  assert.deepEqual(imageHashes(level), [], "No color-derived or world-resolution images replace approved source textures");
  let vertices = 0;
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
    const material = level.document.materials.find((entry) => entry.id === level.surfaces[level.mesh.surfaces[triangle]].material)!;
    if (material.texture !== "color.png") continue;
    assert.equal(material.normalTexture, "normal.png"); assert.equal(material.normalScale, 1.7);
    assert.equal(material.metallicRoughnessTexture, "properties.png");
    assert.equal(material.roughness, 0.7); assert.equal(material.metalness, 0.3);
    for (const index of level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)) {
      near(level.mesh.uv[index * 2], level.mesh.positions[index * 3] * 2 + 0.27, "Source U remains in authored meters", 1e-7);
      near(level.mesh.uv[index * 2 + 1], level.mesh.positions[index * 3 + 1] * 3 - 0.11, "Source V remains in authored meters", 1e-7);
      vertices++;
    }
  }
  assert.ok(vertices > 0, "The source coat remains visibly represented");
  assert.ok(level.mesh.surfaces.length < 10_000, "One straight finish boundary must not tessellate the entire receiver into fine cells");
  for (const y of [0.137, 0.381, 0.719]) for (const offset of [-0.2, -0.02, -0.004, -0.002, 0, 0.002, 0.004, 0.02, 0.2]) {
    const x = -0.371 + offset, expectedHeight = -0.006 * Math.max(0, Math.min(1, 0.5 + offset / 0.01));
    const heights = surfaceHeightsAt(level.mesh, x, y);
    assert.ok(heights.length > 0, "The piecewise planar finish retains coverage through its actual depth transition");
    for (const height of heights) near(height, expectedHeight, "The two plates and their finish ramp preserve the independently known elevation", 0.00035);
  }
  for (const y of [0.137, 0.381, 0.719]) for (const offset of [-0.2, -0.02, -0.002, 0.002, 0.02, 0.2]) {
    const expected = Math.abs(offset) < 0.005 ? unit([0.6, 0, 1]) : [0, 0, 1];
    const samples = surfaceValuesAt(level.mesh, -0.371 + offset, y);
    assert.ok(samples.length > 0);
    for (const sample of samples) assert.ok(sample.normal.reduce((sum, value, axis) => sum + value * expected[axis], 0) >= Math.cos(2 * Math.PI / 180),
      `Flat plates must not inherit steep rim normals, and the physical ramp must shade at its known slope: offset=${offset}, normal=${sample.normal}`);
  }
  const assets = await resolveExportAssets(level, resolver(images));
  for (const [reference, bytes] of images) assert.deepEqual(assets[reference].bytes, bytes);
  assert.equal((await validateBytes(toGLB(level, { assets }))).issues.numErrors, 0);
});

test("an affine two-material slope retains source coverage without unnecessary interior subdivisions", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="affine-finish"><material id="coat" color="#ff0000"/>
    <material id="backing" color="#0000ff"/><box id="receiver" width="2" depth="1" height="0.1" material="coat"/></architecture>`), { navigation: false }));
  const physical = collisionMesh(level, true);
  level.mesh = { positions: [-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uv: [0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3], surfaces: [0, 0], colors: Array(12).fill(1) };
  registerSurfaceChart(level, { ...analyticChart((u, v) => {
    const backing = 0.5 + (u + 0.173) * 0.4;
    return { layers: [
      { material: "coat", weight: 1 - backing, uv: [2 * u + 0.13, 3 * v + 0.7] },
      { material: "backing", weight: backing, uv: [4 * u + 0.27, 5 * v - 0.9] },
    ], height: 0.006 + 0.012 * u + 0.004 * v };
  }, ["coat", "backing"]), bounds: [-1, 0, 1, 1],
    uniformCoverage: ([u0, , u1]) => u1 <= -0.173 || u0 >= -0.173 });
  await compileSurfaceAppearance(level, {}, 10_000);
  assert.deepEqual(collisionMesh(level, true), physical);
  const materialAt = horizontalMaterialAt(level), expectedNormal = unit([-0.012, -0.004, 1]);
  for (const u of [-0.873, -0.237, 0.193, 0.719]) for (const v of [0.137, 0.613, 0.827]) {
    assert.equal(materialAt(u, v), u < -0.173 ? "#ff0000" : "#0000ff");
    const samples = surfaceValuesAt(level.mesh, u, v);
    assert.ok(samples.length > 0);
    for (const sample of samples) {
      near(sample.height, 0.006 + 0.012 * u + 0.004 * v, "An affine surface is represented exactly", 1e-10);
      assert.ok(sample.normal.reduce((sum, value, axis) => sum + value * expectedNormal[axis], 0) > 1 - 1e-10);
    }
  }
  let covered = 0;
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const [a, b, c] = indices.map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
    const area = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    assert.ok(area > 0); covered += area;
    const coat = level.surfaces[level.mesh.surfaces[triangle]].material === "coat";
    for (const index of indices) {
      near(level.mesh.uv[index * 2], level.mesh.positions[index * 3] * (coat ? 2 : 4) + (coat ? 0.13 : 0.27), "Material U remains authored", 1e-10);
      near(level.mesh.uv[index * 2 + 1], level.mesh.positions[index * 3 + 1] * (coat ? 3 : 5) + (coat ? 0.7 : -0.9), "Material V remains authored", 1e-10);
    }
  }
  near(covered, 2, "One affine plane keeps complete opaque coverage");
  assert.ok(level.mesh.surfaces.length <= 16,
    `A plane with one straight material boundary needs a small mesh, not bands inside each finish: ${level.mesh.surfaces.length} triangles`);
});

test("recipe relief rotates existing smooth source normals without flattening their variation", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="smooth-normal"><material id="finish"/>
    <box id="receiver" width="1" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false }));
  const sourceNormals = [[0.1, 0.05, 1], [-0.05, 0.1, 1], [0, -0.1, 1]].map(unit);
  level.mesh = { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: sourceNormals.flat(), uv: [0, 0, 1, 0, 0, 1],
    colors: Array(9).fill(1), indices: [0, 1, 2], surfaces: [0] };
  registerSurfaceChart(level, { ...analyticChart((u, v) => ({
    layers: [{ material: "finish", weight: 1, uv: [u, v] }], height: -0.3 * u,
  })), triangleCount: 1 });
  await compileSurfaceAppearance(level, {}, 10_000);
  const angle = Math.atan(0.3), cosine = Math.cos(angle), sine = Math.sin(angle);
  for (const index of level.mesh.indices) {
    const [x, y] = level.mesh.positions.slice(index * 3, index * 3 + 2);
    const weights = [1 - x - y, x, y];
    const original = unit([0, 1, 2].map(axis => weights.reduce((sum, weight, i) => sum + weight * sourceNormals[i][axis], 0)));
    const expected = [cosine * original[0] + sine * original[2], original[1], -sine * original[0] + cosine * original[2]];
    const actual = level.mesh.normals.slice(index * 3, index * 3 + 3);
    assert.ok(actual.reduce((sum, value, axis) => sum + value * expected[axis], 0) > Math.cos(0.1 * Math.PI / 180),
      "The known face rotation preserves each incoming smoothed direction rather than replacing it with a flat normal");
  }
});

test("three-layer junctions retain complete coverage when a microscopic corner cannot form a renderable triangle", async () => {
  for (const microscopic of [true, false]) {
    const size = microscopic ? 0.001 : 0.02;
    const level = successful(await compile(parseAml(`<architecture version="1" id="three-layers">
      <material id="first" color="#ff0000"/><material id="second" color="#00ff00"/><material id="corner" color="#0000ff"/>
      <box id="receiver" width="1" depth="1" height="0.1" material="first"/></architecture>`), { navigation: false }));
    level.mesh = { positions: [0, 0, 0, size, 0, 0, 0, size, 0], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      uv: [0, 0, size, 0, 0, size], colors: Array(9).fill(1), indices: [0, 1, 2], surfaces: [0] };
    registerSurfaceChart(level, { ...analyticChart((u, v) => ({
      layers: [
        { material: "first", weight: 0.6 + 10 * u, uv: [u, v] },
        { material: "second", weight: 0.6 + 10 * v, uv: [u, v] },
        { material: "corner", weight: microscopic ? Math.max(0, 0.6001 - 1000 * (u + v)) : 0.68, uv: [u, v] },
      ], height: 0.01 + 0.1 * u + 0.2 * v,
    }), ["first", "second", "corner"]), triangleCount: 1, bounds: [0, 0, size, size], featureScale: 0.004 });
    await compileSurfaceAppearance(level, {}, 10_000);
    const materialAt = horizontalMaterialAt(level);
    let area = 0;
    for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
      const [a, b, c] = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3));
      const signed = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
      assert.ok(signed > 0);
      area += signed;
    }
    near(area, size * size / 2, "No unrenderable corner leaves a hole or overlapping replacement", 1e-12);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9 - i; j++) {
      const x = size * (i + 0.217) / 10, y = size * (j + 0.413) / 10;
      materialAt(x, y); // Independent query requires exactly one opaque receiving layer.
      const heights = surfaceHeightsAt(level.mesh, x, y);
      assert.ok(heights.length > 0);
      for (const height of heights) near(height, 0.01 + 0.1 * x + 0.2 * y,
        "A microscopic ownership fallback cannot flatten or move the continuous physical finish", 0.00035);
    }
    if (!microscopic) {
      assert.equal(materialAt(0.001, 0.001), "#0000ff", "An ordinary corner region remains visible");
      assert.equal(materialAt(0.018, 0.001), "#ff0000");
      assert.equal(materialAt(0.001, 0.018), "#00ff00");
    }
  }
});

test("region generation yields for cancellation and leaves the previous completed geometry recoverable", async () => {
  const level = successful(await compile(parseAml(`<architecture version="1" id="cancel-regions"><material id="coat" color="#ff0000"/>
    <material id="backing" color="#0000ff"/><box id="receiver" width="2" depth="1" height="0.1" material="coat"/></architecture>`), { navigation: false }));
  level.mesh = adjacentReceivers(false).mesh;
  const original = structuredClone({ mesh: level.mesh, materials: level.document.materials, surfaces: level.surfaces });
  const controller = new AbortController();
  let scheduled = false;
  const chart: SurfaceChart = { ...analyticChart((u, v) => {
    if (!scheduled) { scheduled = true; setTimeout(() => controller.abort(), 0); }
    const weight = 0.5 + 0.5 * Math.sin(u * 21) * Math.sin(v * 19);
    return { layers: [{ material: "coat", weight, uv: [u, v] }, { material: "backing", weight: 1 - weight, uv: [u, v] }], height: weight * 0.004 };
  }, ["coat", "backing"]), bounds: [-1, 0, 1, 1], triangleCount: 4, featureScale: 0.02 };
  registerSurfaceChart(level, chart);
  await assert.rejects(compileSurfaceAppearance(level, { signal: controller.signal }, 100_000), { name: "AbortError" });
  assert.ok(scheduled, "Cancellation must happen after real region sampling begins");
  assert.deepEqual({ mesh: level.mesh, materials: level.document.materials, surfaces: level.surfaces }, original,
    "An aborted region candidate cannot partially replace the completed render result");
  registerSurfaceChart(level, { ...chart, sample: (u, v) => ({
    layers: [{ material: "coat", weight: 1, uv: [u, v] }, { material: "backing", weight: 0, uv: [u, v] }], height: 0,
  }) });
  await compileSurfaceAppearance(level, {}, 100_000);
  assert.ok(level.mesh.indices.length > 0, "The next uncancelled build remains useful");
});

test("source-height normals preserve source texel scale, linear red, offset independence and existing normal strength", async () => {
  const height = new PNG({ width: 4, height: 4 }), normal = new PNG({ width: 8, height: 8 });
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    height.data.set([x * 64, 240 - x * 70, y * 60, 255], (y * 4 + x) * 4);
  }
  for (let i = 0; i < 64; i++) normal.data.set([204, 128, 230, 255], i * 4);
  const images = new Map([["height.png", new Uint8Array(PNG.sync.write(height))], ["normal.png", new Uint8Array(PNG.sync.write(normal))]]);
  for (const scale of [0, 1.7]) for (const repeat of [1, 2]) {
    const build = async (offset: number) => {
      const level = successful(await compile(parseAml(`<architecture version="1" id="known-slope"><material id="finish"
        repeat="${repeat}" normal-texture="normal.png" normal-scale="${scale}" height-texture="height.png" height-scale="0.04" height-offset="${offset}"/>
        <box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false }));
      level.mesh = adjacentReceivers(false).mesh;
      registerSurfaceChart(level, { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [u * repeat, v * repeat] }], height: 0 })),
        bounds: [-1, 0, 1, 1], triangleCount: 4 });
      await compileSurfaceAppearance(level, { resolveMaterialImage: resolver(images) }, 100_000);
      const material = level.document.materials.find((entry) => entry.id === level.surfaces[level.mesh.surfaces[0]].material)!;
      assert.ok(material.normalTexture && level.generatedImages?.[material.normalTexture]);
      assert.equal(material.normalScale, 1, "The generated map already incorporates authored normal strength");
      return { level, image: PNG.sync.read(Buffer.from(level.generatedImages![material.normalTexture!].bytes)) };
    };
    const result = await build(0), shifted = await build(0.025);
    assert.equal(result.image.width, 8); assert.equal(result.image.height, 8);
    assert.deepEqual(imageHashes(shifted.level), imageHashes(result.level), "A constant height offset does not change normals");
    const sourceNormal = [(204 / 255 * 2 - 1) * scale, (128 / 255 * 2 - 1) * scale, 230 / 255 * 2 - 1];
    const slope = (128 / 255) * 0.04 / 0.5 * repeat;
    const expected = unit([sourceNormal[0] / sourceNormal[2] - slope, sourceNormal[1] / sourceNormal[2], 1]);
    for (const x of [3, 4]) {
      const pixel = (3 * 8 + x) * 4;
      for (let axis = 0; axis < 3; axis++) near(result.image.data[pixel + axis] / 255 * 2 - 1, expected[axis],
        "Derived PNG normals combine the linear-red height gradient in meters and source normal once", 1 / 255 + 1e-6);
    }
  }
});

test("height-derived normals use the actual source UV metric under scaling, rotation, reflection and shear", async () => {
  const height = new PNG({ width: 4, height: 4 });
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) height.data.set([16 + x * 40 + (3 - y) * 20, 0, 255, 255], (y * 4 + x) * 4);
  const bytes = new Uint8Array(PNG.sync.write(height));
  const hu = 160 / 255 * 0.03, hv = 80 / 255 * 0.03;
  const variants = [
    { name: "identity", uv: (u: number, v: number): [number, number] => [u, v], slopes: [hu, hv] },
    { name: "nonuniform", uv: (u: number, v: number): [number, number] => [2 * u, 3 * v], slopes: [2 * hu, 3 * hv] },
    { name: "uniform", uv: (u: number, v: number): [number, number] => [2 * u, 2 * v], slopes: [2 * hu, 2 * hv] },
    { name: "rotated", uv: (u: number, v: number): [number, number] => [-2 * v, 2 * u], slopes: [2 * hu, 2 * hv] },
    { name: "reflected", uv: (u: number, v: number): [number, number] => [-u, v], slopes: [hu, hv] },
    { name: "sheared", uv: (u: number, v: number): [number, number] => [u + 0.5 * v, v], slopes: [hu, 0.5 * hu + hv] },
    { name: "finite-sheared", uv: (u: number, v: number): [number, number] => [u + 0.5 * v, v], slopes: [hu, 0.5 * hu + hv], finite: true },
  ];
  const hashes = new Map<string, string[]>();
  for (const variant of variants) {
    const level = successful(await compile(parseAml(`<architecture version="1" id="uv-metric"><material id="finish" repeat="7"
      height-texture="height.png" height-scale="0.03"/><box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false }));
    level.mesh = adjacentReceivers(false).mesh;
    registerSurfaceChart(level, { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1, uv: variant.uv(u, v) }], height: 0 })),
      bounds: [-1, 0, 1, 1], triangleCount: 4, layerElevations: "finite" in variant ? [-0.006] : undefined });
    await compileSurfaceAppearance(level, { resolveMaterialImage: async () => bytes }, 100_000);
    for (let index = 0; index < level.mesh.normals.length; index += 3) {
      near(level.mesh.normals[index], 0, "Constant-coverage source-height slope belongs to the generated map, not vertex normals again", 1e-8);
      near(level.mesh.normals[index + 1], 0, "Source-height shading is applied once", 1e-8);
      near(level.mesh.normals[index + 2], 1, "Source-height relief retains the original normal frame before its explicit normal map", 1e-8);
    }
    const material = level.document.materials.find((entry) => entry.id === level.surfaces[level.mesh.surfaces[0]].material)!;
    assert.ok(material.normalTexture && level.generatedImages?.[material.normalTexture]);
    const image = PNG.sync.read(Buffer.from(level.generatedImages![material.normalTexture!].bytes));
    const expected = unit([-variant.slopes[0], -variant.slopes[1], 1]);
    const pixel = (1 * image.width + 1) * 4;
    for (let axis = 0; axis < 3; axis++) near(image.data[pixel + axis] / 255 * 2 - 1, expected[axis],
      `${variant.name} UVs yield the analytically known physical normal independently of material.repeat`, 1 / 255 + 1e-6);
    hashes.set(variant.name, imageHashes(level));
  }
  assert.deepEqual(hashes.get("rotated"), hashes.get("uniform"), "Rotating an isotropic UV frame reuses the same intrinsic normal map");
  assert.deepEqual(hashes.get("reflected"), hashes.get("identity"), "The exported tangent frame owns reflection without flipping source normal pixels twice");
  assert.deepEqual(hashes.get("finite-sheared"), hashes.get("sheared"), "A finite plate retains the same intrinsic source-normal pixels and applies their slope once");
});

test("height receivers reject singular and non-affine UV metrics without committing partial material variants", async () => {
  for (const uv of [(u: number, _v: number): [number, number] => [u, 0], (u: number, v: number): [number, number] => [u + 0.2 * u * u, v]]) {
    const level = successful(await compile(parseAml(`<architecture version="1" id="invalid-uv"><material id="finish" height-texture="height.png"/>
      <box id="receiver" width="2" depth="1" height="0.1" material="finish"/></architecture>`), { navigation: false }));
    level.mesh = adjacentReceivers(false).mesh;
    const original = structuredClone({ mesh: level.mesh, materials: level.document.materials, surfaces: level.surfaces });
    const chart: SurfaceChart = { ...analyticChart((u, v) => ({ layers: [{ material: "finish", weight: 1, uv: uv(u, v) }], height: 0 })),
      bounds: [-1, 0, 1, 1], triangleCount: 4 };
    registerSurfaceChart(level, chart);
    await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage: resolver(inputImages()) }, 100_000), /affine|degenerate|singular/i);
    assert.deepEqual({ mesh: level.mesh, materials: level.document.materials, surfaces: level.surfaces }, original);
    registerSurfaceChart(level, { ...chart, sample: (u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [u, v] }], height: 0 }) });
    await compileSurfaceAppearance(level, { resolveMaterialImage: resolver(inputImages()) }, 100_000);
    assert.ok(imageHashes(level).length > 0, "A corrected UV metric can build successfully after rejection");
  }
});

test("surface compilation publishes complete source materials and height normals without changing source, collision or navigation", async () => {
  const document = parseAml(source);
  const original = structuredClone(document);
  const images = inputImages();
  const imageSnapshot = structuredClone(images);
  const plain = structuredClone(document);
  delete plain.dressing;
  const baseline = successful(await compile(plain));
  const published: string[][] = [];
  const level = successful(await compile(document, {
    resolveMaterialImage: resolver(images),
    onGeometry: (value) => {
      published.push(Object.values(value.generatedImages ?? {}).map((image) => image.hash).sort());
    },
  }));
  assert.equal(published.length, 1);
  assert.ok(published[0].length > 0, "onGeometry must see completed appearance, not an intermediate untextured shell");
  assert.ok(imageHashes(level).length > 0, "An authored height source produces a completed portable normal companion");
  assert.deepEqual(published[0], imageHashes(level));
  const visibleMaterials = new Set(level.mesh.surfaces.map((index) => level.surfaces[index].material));
  const renderedFinish = level.document.materials.filter((material) => visibleMaterials.has(material.id) && material.texture === "plaster.png");
  assert.ok(renderedFinish.length > 0, "Visible receivers keep the approved source image at its authored resolution");
  for (const material of renderedFinish) {
    assert.ok(material.normalTexture && level.generatedImages?.[material.normalTexture]);
    assert.equal(material.normalScale, 1);
    const normal = PNG.sync.read(Buffer.from(level.generatedImages![material.normalTexture!].bytes));
    assert.equal(normal.width, 4); assert.equal(normal.height, 4);
  }
  assert.deepEqual(document, original);
  assert.deepEqual(images, imageSnapshot, "Compiler decoding must not mutate caller-owned image bytes");
  assert.equal(level.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(level), collisionMesh(baseline));
  assert.deepEqual(level.navigation, baseline.navigation);
  const assets = await resolveExportAssets(level, resolver(images));
  assert.equal((await validateBytes(toGLB(level, { assets }))).issues.numErrors, 0);
});

test("surface images repeat deterministically and changing bytes at an unchanged path invalidates only appearance", async () => {
  const document = parseAml(source);
  const images = inputImages();
  const first = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(images) }));
  const again = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(images) }));
  assert.ok(imageHashes(first).length > 0);
  assert.deepEqual(imageHashes(again), imageHashes(first));
  assert.equal(again.renderHash, first.renderHash);
  assert.deepEqual(again.mesh, first.mesh);
  const extra = structuredClone(document);
  extra.materials.push({ id: "unrelated", color: "#00ff00", roughness: 1, metalness: 0, repeat: 1, texture: "unused.png" });
  const unrelated = successful(await compile(extra, { navigation: false, resolveMaterialImage: resolver(images) }));
  assert.deepEqual(imageHashes(unrelated), imageHashes(first), "Unreferenced source materials do not alter existing derived maps or require loading");
  const changed = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(inputImages([50, 90, 180, 255])) }));
  assert.deepEqual(imageHashes(changed), imageHashes(first), "Color-only changes do not alter a height-derived normal map");
  assert.notDeepEqual(changed.surfaceAppearance?.sourceHashes, first.surfaceAppearance?.sourceHashes, "The same filename with new color bytes changes source content identity");
  assert.notEqual(changed.renderHash, first.renderHash);
  assert.equal(changed.physicalHash, first.physicalHash);
  assert.deepEqual(collisionMesh(changed), collisionMesh(first));
});

test("invalid dressing plans do not load material images, publish geometry or start navigation", async () => {
  const document = parseAml(source);
  document.dressing!.rules[0].material = "missing";
  const observed = observations();
  let reads = 0;
  const result = await compile(document, {
    ...observed.options,
    resolveMaterialImage: async () => { reads++; return inputImages().get("plaster.png")!; },
  });
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.source));
  assert.equal(reads, 0);
  assert.deepEqual(observed.evidence, { publications: 0, navigation: 0 });
  assert.equal(result.navigation, undefined);
});

test("appearance loading and decoding failures remain source-linked and recover on the next build", async () => {
  const document = parseAml(source);
  const original = structuredClone(document);
  for (const load of [
    async () => { throw new Error("Image is unavailable"); },
    async () => new Uint8Array([1, 2, 3, 4]),
  ]) {
    const observed = observations();
    const failed = await compile(document, { ...observed.options, resolveMaterialImage: load });
    assert.ok(failed.diagnostics.some((diagnostic) => diagnostic.severity === "error" && diagnostic.source && diagnostic.objects.length > 0));
    assert.deepEqual(observed.evidence, { publications: 0, navigation: 0 });
    assert.equal(failed.navigation, undefined);
    assert.throws(() => toGLB(failed), /invalid/i, "A failed appearance cannot be exported as if it were a completed result");
  }
  const recovered = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(inputImages()) }));
  assert.ok(imageHashes(recovered).length > 0);
  assert.deepEqual(document, original);
});

test("appearance cancellation stops publication and a fresh build succeeds", async () => {
  const document = parseAml(source);
  const original = structuredClone(document);
  const images = inputImages();
  const controller = new AbortController();
  const observed = observations();
  let reads = 0;
  await assert.rejects(compile(document, {
    ...observed.options,
    signal: controller.signal,
    resolveMaterialImage: async (reference, signal) => {
      reads++;
      assert.equal(signal, controller.signal);
      controller.abort();
      return resolver(images)(reference);
    },
  }), { name: "AbortError" });
  assert.ok(reads > 0, "Cancellation must occur during actual appearance work");
  assert.deepEqual(observed.evidence, { publications: 0, navigation: 0 });
  const recovered = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(images) }));
  assert.ok(imageHashes(recovered).length > 0);
  assert.deepEqual(document, original);
});

test("appearance resource limits fail explicitly before publication rather than silently dropping wall detail", async () => {
  const document = parseAml(source);
  for (const appearance of [{ maximumTexels: 1 }, { maximumBytes: 1 }, { maximumCharts: 1 }]) {
    const observed = observations();
    const failed = await compile(document, { ...observed.options, appearance, resolveMaterialImage: resolver(inputImages()) });
    const diagnostic = failed.diagnostics.find(entry => entry.severity === "error" && /budget|limit/i.test(entry.message));
    assert.ok(diagnostic?.source && diagnostic.objects?.includes("wall"), "The failure identifies its authored receiver");
    const inspection = diagnostic.review;
    assert.ok(inspection?.id && inspection.layers.length && inspection.bounds && inspection.position,
      "A failed appearance budget retains a usable spatial inspection target");
    assert.ok([...inspection.bounds.min, ...inspection.bounds.max, ...inspection.position, ...inspection.direction].every(Number.isFinite));
    for (const axis of [0, 1, 2]) {
      assert.ok(inspection.bounds.min[axis] <= inspection.position[axis] && inspection.position[axis] <= inspection.bounds.max[axis]);
      assert.ok(inspection.bounds.min[axis] <= inspection.bounds.max[axis]);
    }
    assert.ok(inspection.bounds.min[0] >= -1e-6 && inspection.bounds.max[0] <= 2 + 1e-6 &&
      inspection.bounds.min[1] >= -0.101 && inspection.bounds.max[1] <= 0.101 &&
      inspection.bounds.min[2] >= -1e-6 && inspection.bounds.max[2] <= 2 + 1e-6,
    "The inspection targets the known 2m wall, not unrelated floor or world bounds");
    assert.deepEqual(observed.evidence, { publications: 0, navigation: 0 });
    assert.equal(failed.navigation, undefined);
  }
  const recovered = successful(await compile(document, { navigation: false, resolveMaterialImage: resolver(inputImages()) }));
  assert.ok(imageHashes(recovered).length > 0);
});
