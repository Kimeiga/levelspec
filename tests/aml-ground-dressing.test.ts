import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  parseAml,
  serializeAml,
  collisionMesh,
  toGLB,
  architectureCompanions,
  resolveExportAssets,
} from "levelspec";
import { validateBytes } from "gltf-validator";
import { readFile } from "node:fs/promises";
import type { CompiledArchitecture, V3 } from "../src/architecture/types.ts";
import { groundExposure, type GroundWall } from "../src/dressing/ground-context.ts";
import { PNG } from "pngjs";

const source = `<architecture version="1" id="ground-contract" validation="premap">
  <material id="finish" color="#b8b3a3" roughness="0.9"/>
  <path id="wall-axis" points="0 -0.1 0; 8 -0.1 0"/>
  <profile id="plan" points="0 0; 8 0; 8 5; 5 5; 5 6; 0 6"><hole points="3 2; 3 3; 4 3; 4 2"/></profile>
  <slab id="floor" profile="plan" thickness="0.2"/>
  <wall id="wall" path="wall-axis" height="3" thickness="0.2"/>
  <marker id="start" kind="spawn" element="floor" position="1 1 0"/>
  <dressing seed="ground-contract" grime="0.75">
    <floor host="floor" material="finish" ground="patched" patch-size="1.5" material-size="3" relief="0.03" wetness="1" litter="1" repairs="0.6" tile-share="0.2" timber-share="0.15"/>
  </dressing>
</architecture>`;

/** Reads actual public render triangles with their exported material semantics. */
function triangles(
  level: CompiledArchitecture,
  select: (surface: CompiledArchitecture["surfaces"][number]) => boolean,
) {
  return level.mesh.surfaces.flatMap((index, t) => {
    const surface = level.surfaces[index];
    if (!select(surface)) return [];
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    return [
      {
        surface,
        points: indices.map(
          (i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3,
        ),
        normals: indices.map((i) => level.mesh.normals.slice(i * 3, i * 3 + 3)),
        colors: indices.map((i) => level.mesh.colors!.slice(i * 3, i * 3 + 3)),
        uv: indices.map((i) => level.mesh.uv.slice(i * 2, i * 2 + 2)),
        material: level.document.materials.find(
          (m) => m.id === surface.material,
        ),
      },
    ];
  });
}

/** Opaque receiving ground excludes loose props, vertical closure, and transparent water film. */
function receivingGround(level: CompiledArchitecture, host = "floor") {
  return triangles(level, surface => surface.object === host && surface.role.startsWith("ground-"))
    .filter(face => (face.material?.opacity ?? 1) === 1 && area(face.points) > 1e-12);
}

/** Independent projected area measurement for exported triangles and clipped polygons. */
function area(points: number[][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/** Measures overlap with a known forbidden rectangle, including edges spanning a hole. */
function rectangleOverlap(points: V3[], bounds: number[]): number {
  let polygon: number[][] = points;
  for (const [axis, boundary, sign] of [
    [0, bounds[0], 1],
    [0, bounds[2], -1],
    [1, bounds[1], 1],
    [1, bounds[3], -1],
  ]) {
    const next: number[][] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const da = sign * (a[axis] - boundary),
        db = sign * (b[axis] - boundary);
      if (da >= 0) next.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        next.push(a.map((n, j) => n + (b[j] - n) * t));
      }
    }
    polygon = next;
  }
  return area(polygon);
}

/** Rejects diagnostic failures before an empty compiler result can satisfy geometry assertions. */
function successful(level: CompiledArchitecture): CompiledArchitecture {
  assert.deepEqual(
    level.diagnostics.filter((entry) => entry.severity === "error"),
    [],
    "The positive fixture must compile successfully",
  );
  return level;
}

/** Computes signed XY barycentric coordinates independently of the production clipping helpers. */
function barycentric(point: V3, [a, b, c]: V3[]): number[] | undefined {
  const bx = b[0] - a[0],
    by = b[1] - a[1],
    cx = c[0] - a[0],
    cy = c[1] - a[1];
  const determinant = bx * cy - by * cx;
  if (Math.abs(determinant) < 1e-14) return;
  const x = point[0] - a[0],
    y = point[1] - a[1];
  const second = (x * cy - y * cx) / determinant,
    third = (bx * y - by * x) / determinant;
  return [1 - second - third, second, third];
}

/** Checks complete footprints, optionally excluding a known transform-quantization boundary band. */
function insideFootprint(points: V3[], boundaryTolerance = 0) {
  assert.ok(points.flat().every(Number.isFinite));
  const tolerance = Math.max(1e-6, boundaryTolerance);
  for (const p of points)
    assert.ok(
      p[0] >= -tolerance &&
        p[0] <= 8 + tolerance &&
        p[1] >= -tolerance &&
        p[1] <= 6 + tolerance,
      `Triangle remains inside the authored outer bounds: ${p}`,
    );
  assert.ok(
    rectangleOverlap(points, [
      3 + boundaryTolerance,
      2 + boundaryTolerance,
      4 - boundaryTolerance,
      3 - boundaryTolerance,
    ]) < 1e-8,
    "No triangle may bridge the floor hole",
  );
  assert.ok(
    rectangleOverlap(points, [
      5 + boundaryTolerance,
      5 + boundaryTolerance,
      8,
      6,
    ]) < 1e-8,
    "No triangle may fill the missing concave corner",
  );
}

/** Measures the complete opaque receiving partition; transparent water is a separate supported film. */
function coverage(points: V3[][], areaTolerance = 1e-6) {
  assert.ok(points.length > 0, "Receiving ground must remain present");
  const covered = points.reduce((sum, face) => sum + area(face), 0);
  assert.ok(
    Math.abs(covered - 44) < areaTolerance,
    `The receiving partition totals the 45m² L minus its 1m² hole; measured ${covered}m²`,
  );
}

/**
 * Samples one receiving layer on an independent offset grid. Samples within 1e-8
 * barycentric units of triangle edges are excluded because adjacent triangles share them.
 */
function singleLayer(points: V3[][]) {
  let candidates = 0,
    checked = 0;
  for (let x = 0; x < 20; x++)
    for (let y = 0; y < 15; y++) {
      const point: V3 = [(x + 0.371) * 0.4, (y + 0.613) * 0.4, 0];
      if (
        (point[0] > 3 && point[0] < 4 && point[1] > 2 && point[1] < 3) ||
        (point[0] > 5 && point[1] > 5)
      )
        continue;
      candidates++;
      let interiors = 0,
        boundary = false;
      for (const face of points) {
        const weights = barycentric(point, face);
        if (!weights || weights.some((weight) => weight < -1e-8)) continue;
        if (weights.every((weight) => weight > 1e-8)) interiors++;
        else boundary = true;
      }
      assert.ok(interiors <= 1, `No overlapping receiving layers at ${point}`);
      if (boundary) continue;
      assert.equal(interiors, 1, `Exactly one receiving layer at ${point}`);
      checked++;
    }
  assert.ok(
    checked > candidates * 0.95,
    "Boundary exclusions must not hide most samples",
  );
}

/** Indexes render triangles by integer-meter cells for independent vertical samples. */
function projectedSamples(faces: ReturnType<typeof triangles>) {
  const cells = new Map<string, ReturnType<typeof triangles>>();
  for (const face of faces) {
    const minX = Math.floor(Math.min(...face.points.map((p) => p[0])) - 1e-8),
      maxX = Math.floor(Math.max(...face.points.map((p) => p[0])) + 1e-8),
      minY = Math.floor(Math.min(...face.points.map((p) => p[1])) - 1e-8),
      maxY = Math.floor(Math.max(...face.points.map((p) => p[1])) + 1e-8);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const entries = cells.get(key) ?? [];
        entries.push(face);
        cells.set(key, entries);
      }
  }
  return (point: V3) => {
    const hits: {
      face: ReturnType<typeof triangles>[number];
      height: number;
    }[] = [];
    for (const face of cells.get(
      `${Math.floor(point[0])},${Math.floor(point[1])}`,
    ) ?? []) {
      const weights = barycentric(point, face.points);
      if (weights && weights.every((weight) => weight >= -1e-7))
        hits.push({
          face,
          height: weights.reduce(
            (height, weight, i) => height + weight * face.points[i][2],
            0,
          ),
        });
    }
    return hits;
  };
}

/** Checks physical side coverage in a triangle's own plane, including vertical finish fractures. */
function containsSurfacePoint(point: V3, face: V3[]): boolean {
  const [a, b, c] = face, u = b.map((v, axis) => v - a[axis]), v = c.map((n, axis) => n - a[axis]);
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...normal);
  if (length < 1e-13 || Math.abs(normal.reduce((sum, n, axis) => sum + n * (point[axis] - a[axis]), 0)) / length > 1e-7) return false;
  const drop = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  const project = (p: V3): V3 => [...p.filter((_, axis) => axis !== drop), 0] as V3;
  const weights = barycentric(project(point), face.map(project));
  return !!weights && weights.every(weight => weight >= -1e-7);
}

/** Requires adjoining plates either to meet or to expose a closed real fracture wall. */
function closedGroundInterfaces(level: CompiledArchitecture) {
  const receiving = receivingGround(level), sample = projectedSamples(receiving);
  const sides = triangles(level, surface => surface.object === "floor" && surface.role.startsWith("ground-"))
    .filter(face => (face.material?.opacity ?? 1) === 1 && area(face.points) < 1e-12);
  let interfaces = 0, finiteRims = 0;
  const checked = new Set<string>();
  for (const face of receiving.filter(part => part.surface.role === "ground-asphalt" || part.surface.role.startsWith("ground-manhole-")))
    for (const point of face.points) {
      const key = `${point}/${face.surface.role}`;
      if (checked.has(key)) continue;
      checked.add(key);
      for (const neighbor of sample(point)) {
        if (neighbor.face.surface.role === face.surface.role) continue;
        interfaces++;
        if (Math.abs(point[2] - neighbor.height) < 1e-7) continue;
        const middle: V3 = [point[0], point[1], (point[2] + neighbor.height) / 2];
        assert.ok(sides.some(side => containsSurfacePoint(middle, side.points)),
          `Different finish elevations have a real opaque wall between them at ${point}; neighboring height=${neighbor.height}`);
        finiteRims++;
      }
    }
  assert.ok(interfaces > 0, "Actual asphalt and service insert interfaces are inspected");
  return finiteRims;
}

/** Compiles through the AML/native boundary with per-test controls. */
async function ground(overrides: Record<string, number> = {}, seed?: string) {
  const document = parseAml(source);
  if (seed !== undefined) document.dressing!.seed = seed;
  Object.assign(document.dressing!.rules[0], overrides);
  return successful(await compile(document, { navigation: false }));
}

test("ground and ceramic controls round-trip independently", () => {
  const document = parseAml(source.replace(
    'ground="patched"',
    'ground="patched" joined-pours="0.7" asphalt="0.8" manholes="0.9" breakup="0.6" tile-size="0.23" tile-aspect="1.7" tile-wear="0.4" tile-grime="0" tile-color="#829e8f" tile-plaster-color="#8a9BAc" texture-density="160"',
  ));
  const roundtrip = parseAml(serializeAml(document));
  for (const [key, value] of [["joinedPours", 0.7], ["asphalt", 0.8], ["manholes", 0.9], ["breakup", 0.6],
    ["tileSize", 0.23], ["tileAspect", 1.7], ["tileWear", 0.4], ["tileGrime", 0], ["tileColor", "#829e8f"], ["tilePlasterColor", "#8a9BAc"], ["textureDensity", 160]] as const) {
    assert.equal(document.dressing!.rules[0][key], value);
    assert.equal(roundtrip.dressing!.rules[0][key], value);
  }
});

test("ground relief envelopes retain elevated transformed floors and bound explicit source height", async () => {
  const document = parseAml(`<architecture version="1" id="ground-height-envelope">
    <material id="finish" texture="finish.png" height-texture="height.png" height-scale="0.04" height-offset="0.01" repeat="3"/>
    <material id="study-wall-ceramic" texture="finish.png" height-texture="height.png" height-scale="0.04" height-offset="0.01" repeat="3"/>
    <profile id="small" points="0 0; 0.4 0; 0.4 0.3; 0 0.3"/>
    <slab id="floor" profile="small" elevation="1.75" thickness="0.2" position="10 20 2" rotation="0 0 35"/>
    <dressing finishes="study" seed="ground-envelope" detail="low" grime="0" wear="0"><floor host="floor" material="finish"
      ground="patched" patch-size="1" material-size="3" relief="0" wetness="0" litter="0" repairs="0"
      asphalt="0" manholes="0" breakup="0" tile-share="1" timber-share="0"/></dressing>
  </architecture>`);
  const pixels = new PNG({ width: 4, height: 4 });
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) pixels.data.set([40 + 50 * x, 200, 17, 255], (y * 4 + x) * 4);
  const bytes = new Uint8Array(PNG.sync.write(pixels));
  const resolveMaterialImage = async (reference: string) => {
    assert.ok(["finish.png", "height.png"].includes(reference));
    return bytes;
  };
  const plain = structuredClone(document); delete plain.dressing;
  const baseline = successful(await compile(plain, { navigation: false }));
  let nativeArea = 0;
  for (let triangle = 0; triangle < baseline.mesh.surfaces.length; triangle++) {
    const points = baseline.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
      .map(index => baseline.mesh.positions.slice(index * 3, index * 3 + 3) as V3);
    if (points.every(point => Math.abs(point[2] - 3.75) < 1e-8)) nativeArea += area(points);
  }
  assert.ok(Math.abs(nativeArea - 0.12) < 1e-6, "Native Float32 placement retains the authored 0.12m² footprint");
  const cosine = Math.cos(35 * Math.PI / 180), sine = Math.sin(35 * Math.PI / 180);
  const local = (p: V3): V3 => [(p[0] - 10) * cosine + (p[1] - 20) * sine,
    -(p[0] - 10) * sine + (p[1] - 20) * cosine, p[2] - 3.75];
  for (const relief of [0, 0.006]) {
    const authored = structuredClone(document); authored.dressing!.rules[0].relief = relief;
    const original = structuredClone(authored);
    const level = await compile(authored, { navigation: false, resolveMaterialImage });
    assert.deepEqual(level.diagnostics.filter(entry => entry.severity === "error"), [], `The ${relief}m relief fixture must compile`);
    assert.deepEqual(authored, original);
    assert.equal(level.physicalHash, baseline.physicalHash);
    assert.deepEqual(collisionMesh(level, true), collisionMesh(baseline, true));
    const faces = receivingGround(level);
    assert.ok(faces.some(face => face.surface.role === "ground-tile"), "The small fixture must contain actual ceramic finish");
    const dressedArea = faces.reduce((sum, face) => sum + area(face.points), 0);
    assert.ok(Math.abs(dressedArea - nativeArea) < 1e-8,
      `Dressing preserves the full native raised and rotated floor footprint: ${dressedArea} vs ${nativeArea}m²`);
    const points = faces.flatMap(face => face.points.map(local));
    for (const p of points) assert.ok(p[2] >= -1e-8 && p[2] <= relief + 1e-8,
      `All terrain, finish and source height stays in the authored ${relief}m envelope above the native elevation: ${p}`);
    if (relief > 0) assert.ok(points.some(p => p[2] > relief * 0.8), "The positive control retains visible relief instead of flattening both variants");
    const perimeter = points.filter(p => Math.min(Math.abs(p[0]), Math.abs(p[0] - 0.4), Math.abs(p[1]), Math.abs(p[1] - 0.3)) < 1e-6);
    assert.ok(perimeter.length > 0);
    if (relief === 0) for (const p of perimeter) assert.ok(Math.abs(p[2]) < 1e-8,
      "Zero relief reaches the native elevated slab exactly; raised finish closure is covered by the perimeter contract");
    assert.ok(faces.some(face => face.surface.role === "ground-tile"
      && face.material?.texture && face.material.normalTexture && face.material.metallicRoughnessTexture),
      "The tiled floor exports color, normal and roughness channels even with a source height map");
    assert.ok(level.surfaceAppearance?.sourceHashes["finish.png"] && level.surfaceAppearance.sourceHashes["height.png"],
      "The composed finish retains both declared source images in its provenance");
    assert.ok(Object.keys(level.generatedImages ?? {}).length > 0);
  }
});

test("ground preserves its footprint, physical shell, height envelope and water support", async () => {
  const document = parseAml(`<architecture version="1" id="finite-ground"><material id="finish" color="#b8b3a3"/>
    <profile id="plan" points="0 0; 2 0; 2 2; 0 2"/><slab id="floor" profile="plan" thickness="0.2"/>
    <dressing seed="small-water-6" grime="0.75" detail="low"><floor host="floor" material="finish" ground="patched"
      patch-size="3" material-size="6" relief="0.03" wetness="1" litter="0" repairs="0" tile-share="0" timber-share="0"
      joined-pours="1" asphalt="1" manholes="1" breakup="0"/></dressing></architecture>`);
  const plain = structuredClone(document); delete plain.dressing;
  const baseline = successful(await compile(plain, { navigation: false }));
  const original = structuredClone(document), level = successful(await compile(document, { navigation: false }));
  assert.deepEqual(document, original);
  assert.equal(level.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(baseline, true));
  const bed = receivingGround(level), water = triangles(level, surface => surface.role === "ground-water-film");
  assert.ok(Math.abs(bed.reduce((sum, face) => sum + area(face.points), 0) - 4) < 1e-7);
  closedGroundInterfaces(level);
  assert.ok(bed.every(face => face.points.every(point => point[2] >= -1e-8 && point[2] <= 0.03 + 1e-8)));
  const bedAt = projectedSamples(bed);
  for (const face of water) {
    const center = face.points.reduce((sum, point) => sum.map((v, axis) => v + point[axis] / 3) as V3, [0, 0, 0] as V3);
    const midpoints = face.points.map((point, i) => point.map((value, axis) => (value + face.points[(i + 1) % 3][axis]) / 2) as V3);
    for (const point of [...face.points, ...midpoints, center]) {
      const support = bedAt(point);
      assert.ok(support.length > 0, `Water must have an opaque supporting bed at ${point}`);
      assert.ok(support.every(hit => point[2] >= hit.height - 1e-6), "Water cannot intersect its supporting bed");
    }
  }
  const waterAt = projectedSamples(water);
  for (let x = 0.0137; x < 2; x += 0.1317) for (let y = 0.0219; y < 2; y += 0.1293) {
    const point: V3 = [x, y, 0], support = bedAt(point);
    assert.ok(support.length > 0, `Ground coverage at interior probe ${point}`);
    for (const film of waterAt(point))
      assert.ok(support.every(hit => film.height >= hit.height - 1e-6), "Water cannot cross a raised bed between its vertices");
  }
  const flat = structuredClone(document); flat.dressing!.rules[0].relief = 0;
  const flatLevel = successful(await compile(flat, { navigation: false }));
  assert.equal(flatLevel.physicalHash, baseline.physicalHash);
  assert.ok(receivingGround(flatLevel).every(face => face.points.every(point => Math.abs(point[2]) < 1e-9)),
    "Zero relief suppresses terrain and finite plate thickness, including the service insert");
  assert.equal(triangles(flatLevel, surface => surface.role === "ground-water-film").length, 0);
});

test("ground AML round-trips, reproduces exports, and keeps source, collision and navigation unchanged", async () => {
  const document = parseAml(source),
    before = structuredClone(document);
  const plain = structuredClone(document);
  delete plain.dressing;
  const baseline = successful(await compile(plain)),
    level = successful(await compile(document));
  const repeated = successful(await compile(document));
  const roundtrip = successful(await compile(parseAml(serializeAml(document))));
  assert.deepEqual(document, before);
  assert.equal(level.physicalHash, baseline.physicalHash);
  assert.deepEqual(collisionMesh(level, true), collisionMesh(baseline, true));
  assert.deepEqual(level.navigation, baseline.navigation);
  assert.equal(level.renderHash, repeated.renderHash);
  assert.deepEqual(toGLB(level), toGLB(repeated));
  assert.deepEqual(
    level.mesh,
    roundtrip.mesh,
    "AML formatting changes source locations, not generated geometry",
  );
  assert.equal((await validateBytes(toGLB(level))).issues.numErrors, 0);
});

test("default patched ground contracts", async context => {
  // Contract bodies inspect copied triangle arrays and leave this compiled fixture unchanged.
  let shared: CompiledArchitecture | undefined = await ground();
  try {
    await context.test("patches and every detail stay inside a concave holed footprint with bounded relief and complete coverage", async () => {
      const level = shared!;
      const all = triangles(level, (s) => s.role.startsWith("ground-"));
      const receiving = receivingGround(level);
      coverage(receiving.map((t) => t.points));
      singleLayer(receiving.map((t) => t.points));
      for (const t of all) {
        insideFootprint(t.points);
        for (const p of t.points) {
          assert.ok(
            p[2] >= -1e-6 && p[2] <= 0.09,
            `Bounded surface/debris height: ${p}`,
          );
        }
      }
      for (const t of receiving) {
        assert.ok(t.points.every((p) => p[2] >= 0 && p[2] <= 0.03 + 1e-8));
        const a = t.points[1].map((v, i) => v - t.points[0][i]),
          b = t.points[2].map((v, i) => v - t.points[0][i]);
        const n = [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
        const length = Math.hypot(...n);
        assert.ok(length > 1e-12 && n[2] > 0);
        assert.ok(t.normals.every(normal => normal.every(Number.isFinite) &&
          Math.abs(Math.hypot(...normal) - 1) < 1e-6 && normal[2] > 0),
        "The uneven receiving surface retains finite, normalized, upward shading normals");
      }
    });

    await context.test("displaced ground rims close to the native slab along outer and hole boundaries", async () => {
      const level = shared!;
      const receiving = receivingGround(level);
      const skirts = triangles(level, (s) => s.role === "ground-edge");
      const rings: V3[][] = [
        [
          [0, 0, 0],
          [8, 0, 0],
          [8, 5, 0],
          [5, 5, 0],
          [5, 6, 0],
          [0, 6, 0],
        ],
        [
          [3, 2, 0],
          [3, 3, 0],
          [4, 3, 0],
          [4, 2, 0],
        ],
      ];
      const boundaries = rings.flatMap((ring) =>
        ring.map((a, i) => {
          const b = ring[(i + 1) % ring.length];
          const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
          return {
            a,
            b,
            length,
            dx: (b[0] - a[0]) / length,
            dy: (b[1] - a[1]) / length,
          };
        }),
      );
      for (const skirt of skirts)
        assert.ok(
          boundaries.some(({ a, length, dx, dy }) =>
            skirt.points.every((p) => {
              const along = (p[0] - a[0]) * dx + (p[1] - a[1]) * dy;
              const across = (p[0] - a[0]) * dy - (p[1] - a[1]) * dx;
              return (
                Math.abs(across) < 1e-7 && along >= -1e-7 && along <= length + 1e-7
              );
            }),
          ),
          "Skirts follow real perimeter segments rather than bridging a hole",
        );
      const topAt = projectedSamples(receiving);
      for (const { a, b, length, dx, dy } of boundaries) {
        const profiles = skirts
          .filter((skirt) =>
            skirt.points.every(
              (p) => Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) < 1e-7,
            ),
          )
          .map((skirt) =>
            skirt.points.map(
              (p) => [(p[0] - a[0]) * dx + (p[1] - a[1]) * dy, p[2], 0] as V3,
            ),
          );
        for (const fraction of [0.173, 0.439, 0.791]) {
          const point = a.map((v, i) => v + fraction * (b[i] - v)) as V3;
          const tops = topAt(point);
          assert.ok(
            tops.length > 0,
            `Receiving ground reaches its authored rim at ${point}`,
          );
          const height = Math.max(...tops.map((hit) => hit.height));
          if (Math.abs(height) < 1e-7) continue; // A perimeter fade may close directly against the native slab.
          assert.ok(height > 0, "Raised boundary relief stays above its native slab");
          for (const depth of [0, 1 / 3, 2 / 3, 1]) {
            const section: V3 = [fraction * length, depth * height, 0];
            assert.ok(
              profiles.some((profile) => {
                const weights = barycentric(section, profile);
                return weights && weights.every((weight) => weight >= -1e-7);
              }),
              `Rim closure covers the same XY from native Z=0 to visible height at ${point}; fraction=${depth}`,
            );
          }
        }
      }
    });

    await context.test("ground controls independently disable water, litter and mixed finishes; zero relief is flat", async () => {
      const full = shared!;
      const roles = new Set(
        triangles(full, (s) => s.role.startsWith("ground-")).map(
          (t) => t.surface.role,
        ),
      );
      for (const role of ["water-film", "paper"])
        assert.ok(roles.has(`ground-${role}`), `Positive fixture contains ${role}`);
      for (const [option, disabled, positiveOptions] of [
        ["wetness", ["water-film"], {}],
        ["litter", ["paper", "litter"], {}],
        ["tileShare", ["tile"], { tileShare: 1, timberShare: 0 }],
        ["timberShare", ["timber"], { tileShare: 0, timberShare: 1 }],
      ] as const) {
        const positive = Object.keys(positiveOptions).length
          ? await ground(positiveOptions)
          : full;
        for (const role of disabled)
          assert.ok(
            triangles(positive, (s) => s.role === `ground-${role}`).length > 0,
            `${option} has a positive control before disabling ${role}`,
          );
        const level = await ground({ ...positiveOptions, [option]: 0 });
        const receiving = receivingGround(level);
        coverage(receiving.map((t) => t.points));
        assert.equal(
          triangles(level, (s) =>
            disabled.some((role) => s.role === `ground-${role}`),
          ).length,
          0,
          `${option}=0`,
        );
        const unrelated = option === "wetness" ? "paper" : "water-film";
        assert.ok(
          triangles(level, (s) => s.role === `ground-${unrelated}`).length > 0,
          `Disabling ${option} retains unrelated ${unrelated}`,
        );
      }
      const flat = await ground({ relief: 0 });
      const flatGround = receivingGround(flat);
      coverage(flatGround.map((t) => t.points));
      assert.ok(flatGround.every((t) => t.points.every((p) => p[2] === 0)));
    });
  } finally {
    // Awaited subtests must not retain this large mesh after the group completes.
    shared = undefined;
  }
});

/** Checks actual wet-compile support, including film edges where depth errors are easiest to miss. */
function supportedWater(level: CompiledArchitecture) {
  const bed = receivingGround(level), sample = projectedSamples(bed);
  coverage(bed.map(face => face.points));
  singleLayer(bed.map(face => face.points));
  const water = triangles(level, surface => surface.role === "ground-water-film");
  for (const face of water) {
    insideFootprint(face.points);
    assert.ok(face.points.every(point => Math.abs(point[2] - face.points[0][2]) < 1e-9), "Water remains level");
    assert.ok(face.material!.opacity! > 0 && face.material!.opacity! < 1, "Water exports as a transparent PBR film");
    const center = face.points.reduce((sum, point) => sum.map((v, axis) => v + point[axis] / 3) as V3, [0, 0, 0] as V3);
    const midpoints = face.points.map((point, index) => point.map((v, axis) => (v + face.points[(index + 1) % 3][axis]) / 2) as V3);
    for (const point of [...face.points, ...midpoints, center]) {
      const support = sample(point);
      assert.ok(support.length > 0, `Water retains an opaque bed at ${point}`);
      assert.ok(support.every(hit => point[2] >= hit.height - 1e-6),
        `Water does not intersect the actual wet-compile bed at ${point}; depths=${support.map(hit => point[2] - hit.height)}`);
    }
  }
  return { bed, water };
}

test("water occupies supported depressions as a level transparent PBR film above an opaque bed", async () => {
  const options = { tileShare: 0, timberShare: 0, litter: 0 };
  const wet = await ground(options), dry = await ground({ ...options, wetness: 0 });
  const { bed } = supportedWater(wet);
  const dryBed = receivingGround(dry);
  coverage(dryBed.map(face => face.points));
  assert.equal(triangles(dry, surface => surface.role === "ground-water-film").length, 0);
  assert.equal(wet.physicalHash, dry.physicalHash);
  const dryAt = projectedSamples(dryBed), wetAt = projectedSamples(bed);
  let compared = 0;
  for (let x = 0.193; x < 8; x += 0.43) for (let y = 0.271; y < 6; y += 0.41) {
    const point: V3 = [x, y, 0], wetHits = wetAt(point);
    if (!wetHits.length) continue;
    const supports = dryAt(point);
    assert.ok(supports.length > 0 && wetHits.every(wetHit => supports.some(hit => Math.abs(hit.height - wetHit.height) <= 0.0007)),
      "Wetness preserves bed height within the two independently refined meshes' 0.35mm interpolation envelopes");
    compared++;
  }
  assert.ok(compared > 200, "Wet and dry elevations are compared across the whole receiving footprint");
});

test("tiled ground preserves footprint coverage and closes any emitted interfaces", async () => {
  const level = await ground({
    tileShare: 1,
    timberShare: 0,
    wetness: 0,
    litter: 0,
  });
  const receiving = receivingGround(level);
  const tile = receiving.filter((face) => face.surface.role === "ground-tile");
  for (const face of receiving) insideFootprint(face.points);
  coverage(receiving.map((face) => face.points));
  singleLayer(receiving.map((face) => face.points));
  const sample = projectedSamples(receiving);
  const checked = new Set<string>();
  for (const face of tile)
    for (const point of face.points) {
      const key = `${point[0].toFixed(8)},${point[1].toFixed(8)}`;
      if (checked.has(key)) continue;
      checked.add(key);
      for (const hit of sample(point)) {
        if (hit.face.surface.role === "ground-tile") continue;
        assert.ok(
          Math.abs(point[2] - hit.height) < 1e-7,
          `Tile edges and neighboring grout/substrate meet at the same height, including T-junctions: ${point}`,
        );
      }
    }

});

test("ground rejects unsupported recipes with source-linked errors", async () => {
  for (const change of [
    'ground="unknown"',
    'ground="patched" patch-size="0"',
    'ground="patched" relief="0.1"',
    'ground="patched" wetness="-1"',
    'ground="patched" litter="2"',
    'ground="patched" tile-share="0.8" timber-share="0.8"',
    'ground="patched" joined-pours="1.1"',
    'ground="patched" asphalt="-0.1"',
    'ground="patched" manholes="NaN"',
    'ground="patched" breakup="2"',
    'ground="patched" tile-aspect="2e-309"',
    'tile-size="0.2"',
    'tile-aspect="2"',
    'tile-wear="0.5"',
    'tile-grime="0.5"',
    'tile-color="#829e8f"',
    'tile-plaster-color="#8a9BAc"',
    'texture-density="128"',
    'relief="0.02"',
  ]) {
    const xml = source.replace(/ground="patched"[^>]+/, `${change}/`);
    let diagnostics;
    try {
      diagnostics = (await compile(parseAml(xml), { navigation: false }))
        .diagnostics;
    } catch (error: any) {
      diagnostics = error.diagnostics;
    }
    let expectedMessage: RegExp | undefined;
    if (change.startsWith("tile-") || change.startsWith("texture-density")) expectedMessage = /patched floor/;
    if (change.includes("2e-309")) expectedMessage = /finite positive tile height/;
    assert.ok(
      diagnostics?.some(
        (entry: any) => entry.severity === "error" && entry.source
          && (!expectedMessage || expectedMessage.test(entry.message)),
      ),
      change,
    );
  }
  const document = parseAml(source);
  document.dressing!.rules[0].host = "wall";
  assert.ok(
    (await compile(document, { navigation: false })).diagnostics.some(
      (d) => d.severity === "error" && /slab or landing/.test(d.message),
    ),
  );
  const tilted = parseAml(
    source.replace(
      'id="floor" profile=',
      'id="floor" rotation="8 0 0" profile=',
    ),
  );
  assert.ok(
    (await compile(tilted, { navigation: false })).diagnostics.some(
      (d) => d.severity === "error" && /horizontal receiving/.test(d.message),
    ),
  );
});

test("ground preserves explicit face assignments and hidden hosts, and enforces output budgets", async () => {
  const assigned = await compile(
    parseAml(
      source.replace(
        "<dressing",
        '<face-material id="protected" host="floor" face="top" material="finish"/><dressing',
      ),
    ),
    { navigation: false },
  );
  successful(assigned);
  assert.equal(
    triangles(assigned, (s) => s.role.startsWith("ground-")).length,
    0,
  );
  assert.ok(assigned.surfaces.some((s) => s.assignment === "protected"));
  const hidden = await compile(
    parseAml(
      source.replace(
        'id="floor" profile=',
        'id="floor" visible="false" profile=',
      ),
    ),
    { navigation: false },
  );
  successful(hidden);
  assert.equal(
    triangles(hidden, (s) => s.role.startsWith("ground-")).length,
    0,
  );
  const limited = await compile(parseAml(source), {
    navigation: false,
    limits: { triangles: 150 },
  });
  assert.ok(
    limited.diagnostics.some(
      (d) => d.severity === "error" && /budget/i.test(d.message),
    ),
  );
  assert.ok(
    limited.mesh.indices.length / 3 <= 150,
    "A budget error must not return an oversized mesh",
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    compile(parseAml(source), { signal: controller.signal }),
    { name: "AbortError" },
  );
});

test("flat-ground dressing leaves stairs and ramps byte-for-byte unchanged and rejects their ground opt-in", async () => {
  const document = parseAml(
    await readFile("tests/fixtures/aml/showcase.aml", "utf8"),
  );
  document.dressing = {
    theme: "kowloon-street@1",
    seed: "unchanged-flights",
    grime: 0.7,
    wear: 0.3,
    detail: "low",
    rules: ["courtyard", "ramp", "stairs"].map((host) => ({
      kind: "floor",
      host,
      material: "concrete",
      face: "top",
      windows: false,
    })),
  };
  const baseline = await compile(document, { navigation: false });
  document.dressing.rules[0].ground = "patched";
  const detailed = await compile(document, { navigation: false });
  successful(baseline);
  successful(detailed);
  for (const host of ["ramp", "stairs"]) {
    const parts = (level: CompiledArchitecture) =>
      triangles(level, (s) => s.object === host).map((t) => ({
        points: t.points,
        normals: t.normals,
        colors: t.colors,
        uv: t.uv,
        material: t.material,
      }));
    const before = parts(baseline);
    assert.ok(before.length > 0, `${host} baseline must contain geometry`);
    assert.deepEqual(parts(detailed), before, host);
    const invalid = structuredClone(document);
    invalid.dressing!.rules.find((r) => r.host === host)!.ground = "patched";
    assert.ok(
      (await compile(invalid, { navigation: false })).diagnostics.some(
        (d) => d.code === "AML_DRESSING" && d.severity === "error",
      ),
    );
  }
});

test("translated and yaw-rotated horizontal ground retains its height datum", async () => {
  const document = parseAml(
    source.replace(
      'id="floor" profile=',
      'id="floor" position="10 20 2" rotation="0 0 35" profile=',
    ),
  );
  const level = await compile(document, { navigation: false });
  successful(level);
  const receiving = receivingGround(level);
  assert.ok(
    receiving.length > 0 &&
      receiving.every((t) =>
        t.points.every((p) => p[2] >= 2 && p[2] <= 2.03 + 1e-7),
      ),
  );
  const angle = (35 * Math.PI) / 180;
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  const unplace = (p: V3): V3 => [
    (p[0] - 10) * cosine + (p[1] - 20) * sine,
    -(p[0] - 10) * sine + (p[1] - 20) * cosine,
    p[2] - 2,
  ];
  // Native Float32 vertices at this translated pose differ by up to 2µm from ideal local edges.
  for (const t of triangles(level, (s) => s.role.startsWith("ground-")))
    insideFootprint(t.points.map(unplace), 2e-6);
  const local = receiving.map((t) => t.points.map(unplace));
  // The outer and hole perimeters total 32m; a 2µm position error bounds their area error.
  coverage(local, 32 * 2e-6);
  singleLayer(local);
});

/** Adds independently positioned architectural anchors to a dry concrete fixture. */
function anchoredGroundSource(extra: string) {
  const document = parseAml(source.replace("<dressing", `${extra}<dressing`));
  Object.assign(document.dressing!.rules[0], {
    tileShare: 0,
    timberShare: 0,
    repairs: 0,
    wetness: 0,
    litter: 0,
  });
  return document;
}

/** Measures a long joint at a known local Y coordinate, away from the wall footprint. */
function architecturalSeamFraction(
  faces: ReturnType<typeof triangles>,
  y: number,
) {
  const sample = projectedSamples(faces);
  let joints = 0,
    count = 0;
  for (let x = 0.413; x < 7.8; x += 0.37) {
    if (x > 2.4 && x < 2.9) continue;
    const hits = sample([x, y, 0]);
    assert.ok(hits.length > 0, `Architectural seam sample has ground at ${x},${y}`);
    count++;
    if (hits.some((hit) => hit.face.surface.role === "ground-joint")) joints++;
  }
  return joints / count;
}



test("ground finish and relief patterns remain host-relative across quadrant rotations", async () => {
  const document = anchoredGroundSource("");
  document.dressing!.rules[0].tileShare = 0.5;
  const baseline = successful(await compile(document, { navigation: false }));
  const receiving = (level: CompiledArchitecture) =>
    receivingGround(level);
  const original = receiving(baseline);
  assert.ok(original.some((face) => face.surface.role === "ground-concrete"));
  assert.ok(original.some((face) => face.surface.role === "ground-tile"));
  const sourceAt = projectedSamples(original);
  for (const degrees of [90, 100]) {
    const placed = structuredClone(document);
    placed.frames.push({
      id: "placed",
      position: [10, 20, 2],
      rotation: [0, 0, degrees],
    });
    for (const element of placed.elements) element.frame = "placed";
    const rotated = successful(await compile(placed, { navigation: false }));
    const local = receiving(rotated);
    const radians = (degrees * Math.PI) / 180;
    for (const face of local)
      face.points = face.points.map((p): V3 => [
        (p[0] - 10) * Math.cos(radians) + (p[1] - 20) * Math.sin(radians),
        -(p[0] - 10) * Math.sin(radians) + (p[1] - 20) * Math.cos(radians),
        p[2] - 2,
      ]);
    const targetAt = projectedSamples(local);
    let checked = 0;
    for (let x = 0.193; x < 8; x += 0.43)
      for (let y = 0.271; y < 6; y += 0.41) {
        const point: V3 = [x, y, 0];
        const references = sourceAt(point);
        if (!references.length) continue;
        const reference = references[0];
        const actual = targetAt(point);
        assert.ok(
          actual.some(
            (hit) =>
              hit.face.surface.role === reference.face.surface.role &&
              Math.abs(hit.height - reference.height) < 2e-6,
          ),
          `Placement preserves finish and relief at local ${x},${y}; yaw=${degrees}; expected=${reference.face.surface.role},${reference.height}; actual=${actual.map((hit) => `${hit.face.surface.role},${hit.height}`).join(";")}`,
        );
        checked++;
      }
    assert.ok(checked > 200, "Independent samples cover the mixed receiving surface");
  }
});

test("a wall far below the floor cannot borrow another wall's ground contact", async () => {
  const baseline = successful(
    await compile(anchoredGroundSource(""), { navigation: false }),
  );
  const below = successful(
    await compile(
      anchoredGroundSource(`
        <path id="below-axis" points="1.13 -0.1 -5; 2.27 -0.1 -5"/>
        <wall id="below" path="below-axis" thickness="0.2" height="1"/>`),
      { navigation: false },
    ),
  );
  const surface = (level: CompiledArchitecture) =>
    triangles(level, (s) => s.object === "floor").map((face) => ({
      points: face.points,
      normals: face.normals,
      colors: face.colors,
      uv: face.uv,
      material: face.material,
    }));
  assert.ok(surface(baseline).length > 0);
  assert.deepEqual(
    surface(below),
    surface(baseline),
    "A disconnected underground wall must not add projected anchors to this floor",
  );
});

test("scaled walls retain construction anchors at their actual ground contact", async () => {
  for (const widthScale of [1, 4]) {
    const level = successful(
      await compile(
        anchoredGroundSource(`
          <path id="contact-axis" points="-0.1 0 0; -0.1 1.31 0"/>
          <wall id="contact" path="contact-axis" scale="${widthScale} 1 1" thickness="0.2" height="2"/>`),
        { navigation: false },
      ),
    );
    const wall = triangles(level, (s) => s.object === "contact");
    assert.ok(wall.length > 0);
    assert.ok(
      Math.abs(Math.max(...wall.flatMap((face) => face.points.map((p) => p[0])))) < 1e-6,
      "Both wall placements keep the actual inner face on the floor's X=0 boundary",
    );
    const faces = receivingGround(level);
    assert.ok(
      architecturalSeamFraction(faces, 1.31) >= 0.8,
      `The wall's contacting end remains a construction anchor with width scale ${widthScale}`,
    );
  }
});

test("ground host order and unrelated hosts do not reshuffle an existing floor", async () => {
  const document = parseAml(source);
  const first = await compile(document, { navigation: false });
  successful(first);
  const larger = parseAml(
    source.replace(
      '<slab id="floor"',
      '<slab id="other" position="12 0 0" profile="plan" thickness="0.2"/><slab id="floor"',
    ),
  );
  larger.dressing!.rules.unshift({
    ...larger.dressing!.rules[0],
    host: "other",
  });
  const second = await compile(larger, { navigation: false });
  successful(second);
  const host = (level: CompiledArchitecture) =>
    triangles(
      level,
      (s) =>
        s.object === "floor" || s.object.startsWith("floor/$dressing/ground/"),
    ).map((t) => ({
      points: t.points,
      normals: t.normals,
      colors: t.colors,
      uv: t.uv,
      material: t.material,
    }));
  assert.deepEqual(host(second), host(first));
});

test("joined pour plans remove optional divisions while preserving exact footprints and architectural axes", async () => {
  const options = { asphalt: 0, manholes: 0, breakup: 0, tileShare: 0, timberShare: 0, repairs: 0, wetness: 0, litter: 0 };
  const separate = await ground({ ...options, joinedPours: 0 });
  const joined = await ground({ ...options, joinedPours: 1 });
  const before = separate.groundPlans?.find((plan) => plan.host === "floor");
  const after = joined.groundPlans?.find((plan) => plan.host === "floor");
  assert.ok(before && after);
  assert.ok(after.regions.length > 0 && after.regions.length < before.regions.length);
  assert.ok(
    Math.max(...after.regions.map((region) => area(region.bounds))) >
      Math.max(...before.regions.map((region) => area(region.bounds))),
    "At least one larger real pour replaces multiple smaller grid cells",
  );
  const footprint: V3[][] = [];
  for (const region of after.regions) {
    assert.equal(region.bounds.length, 4);
    const low = [0, 1].map((axis) => Math.min(...region.bounds.map((p) => p[axis])));
    const high = [0, 1].map((axis) => Math.max(...region.bounds.map((p) => p[axis])));
    for (const [axis, anchors] of [[0, [3, 4, 5]], [1, [2, 3, 5]]] as const)
      for (const anchor of anchors)
        assert.ok(
          low[axis] >= anchor - 1e-7 || high[axis] <= anchor + 1e-7,
          `Merged pour does not cross the authored hole/notch axis ${axis}=${anchor}`,
        );
    for (const polygon of region.footprint)
      for (let i = 1; i + 1 < polygon.length; i++) {
        const face = [polygon[0], polygon[i], polygon[i + 1]];
        insideFootprint(face);
        assert.ok(face.every((p) => [0, 1].every((axis) => p[axis] >= low[axis] - 1e-7 && p[axis] <= high[axis] + 1e-7)));
        footprint.push(face);
      }
  }
  coverage(footprint);
  singleLayer(footprint);
  const rendered = receivingGround(joined);
  coverage(rendered.map((face) => face.points));
  singleLayer(rendered.map((face) => face.points));
  const beforeAt = projectedSamples(receivingGround(separate));
  const afterAt = projectedSamples(rendered);
  let removed = 0;
  for (const region of before.regions)
    for (let i = 0; i < region.bounds.length; i++) {
      const point = region.bounds[i].map((v, axis) => (v + region.bounds[(i + 1) % 4][axis]) / 2) as V3;
      const insideMerged = after.regions.some((candidate) => [0, 1].every((axis) => point[axis] > Math.min(...candidate.bounds.map((p) => p[axis])) + 0.05 && point[axis] < Math.max(...candidate.bounds.map((p) => p[axis])) - 0.05));
      if (!insideMerged || !beforeAt(point).some((hit) => hit.face.surface.role === "ground-joint")) continue;
      const current = afterAt(point);
      assert.ok(current.length > 0 && current.every((hit) => hit.face.surface.role !== "ground-joint"), "A removed plan division also disappears from the actual rendered joint surface");
      removed++;
    }
  assert.ok(removed > 0, "At least one real optional joint is removed by joining");
  assert.ok(after.anchors.some((anchor) => anchor.kind === "floor" && Math.hypot(anchor.point[0] - 3, anchor.point[1] - 2) < 1e-7));
  assert.equal(joined.physicalHash, separate.physicalHash);
  assert.deepEqual(collisionMesh(joined, true), collisionMesh(separate, true));
  assert.deepEqual((await ground({ ...options, joinedPours: 1 })).groundPlans, joined.groundPlans);
});

test("asphalt and seeded manholes partition supported ground with independent zero controls", async () => {
  const options = { joinedPours: 1, asphalt: 1, manholes: 1, breakup: 0, tileShare: 0, timberShare: 0, repairs: 0, wetness: 0, litter: 0 };
  const level = await ground(options, "ground-details-0");
  const receiving = receivingGround(level);
  for (const role of ["ground-asphalt", "ground-manhole-rim", "ground-manhole-cover", "ground-manhole-slot"])
    assert.ok(receiving.some((face) => face.surface.role === role), `The fixed positive fixture contains ${role}`);
  coverage(receiving.map((face) => face.points));
  singleLayer(receiving.map((face) => face.points));
  const plan = level.groundPlans!.find((entry) => entry.host === "floor")!;
  for (const face of receiving) {
    insideFootprint(face.points);
    assert.ok(face.points.every((p) => p[2] >= 0 && p[2] <= 0.03 + 1e-7));
    if (face.surface.role.startsWith("ground-manhole-"))
      assert.ok(
        plan.regions.some((region) => {
          const low = [0, 1].map((axis) => Math.min(...region.bounds.map((p) => p[axis])));
          const high = [0, 1].map((axis) => Math.max(...region.bounds.map((p) => p[axis])));
          return face.points.every((p) => [0, 1].every((axis) => p[axis] >= low[axis] + 0.119 && p[axis] <= high[axis] - 0.119));
        }),
        "Manhole triangles fit inside one pour with clearance from its protected boundaries",
      );
  }
  closedGroundInterfaces(level);
  for (const disabled of ["asphalt", "manholes"] as const) {
    const reduced = await ground({ ...options, [disabled]: 0 }, "ground-details-0");
    const faces = receivingGround(reduced);
    const prefix = disabled === "asphalt" ? "ground-asphalt" : "ground-manhole-";
    assert.ok(faces.every((face) => !face.surface.role.startsWith(prefix)));
    assert.ok(faces.some((face) => face.surface.role === (disabled === "asphalt" ? "ground-manhole-cover" : "ground-asphalt")));
    coverage(faces.map((face) => face.points));
    assert.equal(reduced.physicalHash, level.physicalHash);
  }
});

test("corridor exposure requires opposing finite contacts from different walls", () => {
  const left: GroundWall = { host: "left", seam: [[0, 0, 0], [0, 4, 0]] };
  const near: GroundWall = { host: "right", seam: [[1.9, 0, 0], [1.9, 4, 0]] };
  const wide: GroundWall = { host: "right", seam: [[8, 0, 0], [8, 4, 0]] };
  const gap: GroundWall = { host: "right", seam: [[1.9, 3, 0], [1.9, 4, 0]] };
  const sample = (walls: GroundWall[], point: V3 = [0.3, 1, 0]) =>
    groundExposure(point, walls, () => {});
  for (const [wall, width] of [[near, 1.9], [wide, 8]] as const) {
    const exposure = sample([left, wall]);
    assert.ok(Math.abs(exposure.wallDistance - 0.3) < 1e-12);
    assert.ok(Math.abs(exposure.corridorWidth - width) < 1e-12);
  }
  for (const walls of [[left], [left, gap], [left, { ...near, host: "left" }]])
    assert.equal(sample(walls).corridorWidth, Infinity);
  assert.ok(
    Math.abs(sample([left], [0.3, 6, 0]).wallDistance - Math.hypot(0.3, 2)) < 1e-12,
    "Distance beyond a wall endpoint is to the finite segment, not its infinite line",
  );
});

/** Uses deliberately distinct authored asphalt and concrete textures, normals, and physical UV scales. */
function asphaltMaterialSource() {
  const document = parseAml(source
    .replace(/<material id="finish"[^>]+\/>/, `<material id="finish" color="#b8b3a3" roughness="0.9" repeat="0.5" texture="concrete-color.png"/>
      <material id="road" color="#445566" roughness="0.83" metalness="0.17" repeat="3" texture="asphalt-color.png" normal-texture="asphalt-normal.png" normal-scale="2.25"/>`)
    .replace('ground="patched"', 'ground="patched" asphalt-material="road"'));
  Object.assign(document.dressing!.rules[0], { joinedPours: 1, asphalt: 1, manholes: 0, breakup: 0, wetness: 0, litter: 0, repairs: 0, tileShare: 0, timberShare: 0 });
  return document;
}

test("authored asphalt PBR sources remain immutable and affect composed maps through GLB export", async () => {
  const document = asphaltMaterialSource();
  const original = structuredClone(document);
  assert.equal(parseAml(serializeAml(document)).dressing!.rules[0].asphaltMaterial, "road");
  assert.deepEqual(architectureCompanions(document).sort(), ["asphalt-color.png", "asphalt-normal.png", "concrete-color.png"]);
  const images = new Map<string, Uint8Array>();
  for (const [name, color] of [["concrete-color.png", [180, 180, 150, 255]], ["asphalt-color.png", [45, 55, 65, 255]], ["asphalt-normal.png", [140, 180, 240, 255]]] as const) {
    const png = new PNG({ width: 2, height: 2 });
    for (let i = 0; i < 4; i++) png.data.set(color.map((value, channel) => channel < 3 ? Math.min(255, value + (i % 2) * 10) : value), i * 4);
    images.set(name, PNG.sync.write(png));
  }
  const resolveMaterialImage = async (name: string) => {
    assert.ok(images.has(name), `Only authored material images are resolved: ${name}`);
    return images.get(name)!;
  };
  const level = successful(await compile(document, { navigation: false, resolveMaterialImage }));
  assert.deepEqual(document, original);
  for (const authored of document.materials) {
    const retained = level.document.materials.find(material => material.id === authored.id)!;
    for (const key of ["texture", "normalTexture", "normalScale", "repeat", "roughness", "metalness"] as const)
      assert.equal(retained[key], authored[key]);
  }
  const receiving = triangles(level, surface => surface.role.startsWith("ground-"));
  assert.ok(receiving.length > 0);
  const usedMaps = [...new Set(receiving.map(face => face.material).filter(material => material?.id.startsWith("$surface/raster/")))];
  assert.ok(usedMaps.length > 0);
  for (const material of usedMaps) {
    assert.ok(material!.texture && level.generatedImages?.[material!.texture]);
    assert.equal(material!.normalScale, 1);
  }
  const changed = structuredClone(document);
  changed.materials.find(entry => entry.id === "road")!.repeat = 6;
  const altered = successful(await compile(changed, { navigation: false, resolveMaterialImage }));
  assert.equal(altered.physicalHash, level.physicalHash);
  assert.deepEqual(triangles(altered, surface => surface.role.startsWith("ground-")).map(face => face.points), receiving.map(face => face.points));
  assert.notDeepEqual(altered.surfaceAppearance!.generatedHashes, level.surfaceAppearance!.generatedHashes);
  const assets = await resolveExportAssets(level, resolveMaterialImage);
  const binary = toGLB(level, { assets });
  assert.equal((await validateBytes(binary)).issues.numErrors, 0);
});

test("asphalt material references reject unknown materials and non-ground recipes with source diagnostics", async () => {
  for (const reference of ["missing", ""]) {
    const document = asphaltMaterialSource();
    document.dressing!.rules[0].asphaltMaterial = reference;
    const result = await compile(document, { navigation: false });
    assert.ok(result.diagnostics.some((entry) => entry.severity === "error" && entry.source));
  }
  for (const kind of ["floor", "wall"] as const) {
    const document = asphaltMaterialSource();
    const location = document.dressing!.rules[0].source;
    document.dressing!.rules = [{ kind, host: kind, material: "finish", asphaltMaterial: "road", face: kind === "floor" ? "top" : "front", windows: false, source: location }];
    const result = await compile(document, { navigation: false });
    assert.ok(result.diagnostics.some((entry) => entry.severity === "error" && entry.source));
  }
});

