import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Matrix4, Ray, Triangle, Vector3 } from "three";
import { compile, parseAml } from "levelspec";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { grocerProp, type GrocerProp } from "../src/dressing/kowloon/shop/grocer-props.ts";
import { grocer } from "../src/dressing/kowloon/shop/grocer.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import catalog from "../src/dressing/kowloon/shop/assets/grocer-props.json" with { type: "json" };
import appearances from "../src/dressing/kowloon/shop/assets/stock-appearances.json" with { type: "json" };
import { connectedBodies, grocerAssetTriangles } from "./support/grocer-assets.ts";

type Rect = readonly number[];

/** Creates actual production material bindings with a distinguishable shelf finish. */
async function fixture(textured = true) {
  const level = await compile(parseAml(`<architecture version="1" id="stock-appearance">
    <material id="plain" color="#ffffff"/>
    <material id="stock-timber" color="#ffffff"/>
    ${textured ? '<material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png" normal-texture="grocer-props-normal.png" metallic-roughness-texture="grocer-props-properties.png"/>' : ""}
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = [];
  kitMaterials(level);
  const { materials } = kitFinishes(level, textured ? "stock" : undefined, "plain");
  const mesh = new KitMesh(level, "stock", "props", materials, { maximumTriangles: 100000 });
  return { level, pen: new Pen(mesh, "appearance", new Matrix4(), false) };
}

/** Draws one actual prop through the production material binding and mesh collector. */
async function draw(name: GrocerProp, variant: number, textured = true) {
  const { level, pen } = await fixture(textured);
  grocerProp(pen, name, [.3, .4, .5], [.21, .17, .29], 0, { variant });
  return level;
}

test("simple stock wraps continuous upright labels across its visible body while keeping rear and cap seams separate", () => {
  for (const name of ["food-tin", "seasoning-jar", "drink-bottle"] as const) {
    const asset = catalog[name], rect = appearances[name].source;
    const faces = asset.faces.map(face => {
      const points = face.map(vertex => new Vector3(...vertex.slice(0, 3))) as [Vector3, Vector3, Vector3];
      const geometry = new Triangle(...points);
      const uv = face.map(vertex => new Vector3(...[0, 1].map(axis =>
        (vertex[axis + 6] - rect[axis]) / (rect[axis + 2] - rect[axis])), 0)) as [Vector3, Vector3, Vector3];
      const normals = face.map(vertex => new Vector3(...vertex.slice(3, 6)));
      return { geometry, points, uv, normals, side: Math.abs(geometry.getNormal(new Vector3()).z) < .98 };
    });
    const sides = faces.filter(face => face.side), caps = faces.filter(face => !face.side);
    assert.ok(sides.length >= 4 && caps.length >= 2, `${name}: missing the body or its separate end surfaces`);
    for (const cap of caps) {
      const normal = cap.geometry.getNormal(new Vector3());
      assert.ok(cap.normals.every(shading => shading.dot(normal) > .9999), `${name}: an end cap inherits rounded body shading`);
    }
    const edges = new Map<string, { points: Vector3[]; uv: Vector3[]; normals: Vector3[] }[]>();
    const chartSigns = new Set<number>();
    for (const face of sides) {
      const [a, b, c] = face.uv;
      chartSigns.add(Math.sign((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)));
      for (let index = 0; index < 3; index++) {
        const corners = [index, (index + 1) % 3].map(corner => ({
          key: face.points[corner].toArray().map(value => Math.round(value * 1e6)).join("/"),
          point: face.points[corner], uv: face.uv[corner], normal: face.normals[corner],
        })).sort((left, right) => left.key.localeCompare(right.key));
        const key = corners.map(corner => corner.key).join("|"), shared = edges.get(key) ?? [];
        shared.push({ points: corners.map(corner => corner.point), uv: corners.map(corner => corner.uv), normals: corners.map(corner => corner.normal) });
        edges.set(key, shared);
      }
    }
    assert.equal(chartSigns.size, 1, `${name}: body triangles flip or fold the label artwork`);
    assert.ok(!chartSigns.has(0), `${name}: the body label chart contains a collapsed triangle`);
    let continuousEdges = 0, rearSeams = 0, smoothShoulderEdges = 0;
    for (const shared of edges.values()) {
      if (shared.length !== 2) continue;
      const height = shared[0].points.reduce((sum, point) => sum + point.z, 0) / 2 / asset.size[2];
      if (name === "drink-bottle" && height > .45 && height < .85) {
        assert.ok(shared[0].normals.every((normal, corner) => normal.distanceTo(shared[1].normals[corner]) < .0001),
          "Bottle shoulder shading breaks at a profile transition or around its circumference");
        smoothShoulderEdges++;
      }
      const continuous = shared[0].uv.every((uv, corner) => uv.distanceTo(shared[1].uv[corner]) < .00002);
      if (continuous) { continuousEdges++; continue; }
      assert.ok(shared[0].points.every(point => point.y > 0 && Math.abs(point.x) < asset.size[0] * .15),
        `${name}: a visible body edge splits the label instead of placing its seam at the rear`);
      rearSeams++;
    }
    assert.ok(continuousEdges >= 4 && rearSeams > 0, `${name}: body continuity or the intentional rear seam was not exercised`);
    if (name === "drink-bottle") assert.ok(smoothShoulderEdges >= 3, "The bottle has no inspected smooth shoulder transitions");

    /** Reads the actual texture coordinates hit on the front body at a given physical height. */
    function frontLabel(x: number, height: number): Vector3 {
      const ray = new Ray(new Vector3(x, -asset.size[1] * 2, height * asset.size[2]), new Vector3(0, 1, 0));
      let closest: { distance: number; uv: Vector3 } | undefined;
      for (const face of faces) {
        const point = ray.intersectTriangle(...face.points, false, new Vector3());
        if (!point) continue;
        const distance = point.distanceTo(ray.origin);
        if (closest && distance >= closest.distance) continue;
        const weights = face.geometry.getBarycoord(point, new Vector3());
        assert.ok(weights, `${name}: label ray hit a degenerate face`);
        const uv = face.uv.reduce((sum, corner, index) => sum.addScaledVector(corner, weights.getComponent(index)), new Vector3());
        closest = { distance, uv };
      }
      assert.ok(closest, `${name}: no visible body at the label inspection point`);
      return closest.uv;
    }
    let previousV = -Infinity;
    for (const height of [.2, .35, .5]) {
      const left = frontLabel(-asset.size[0] * .2, height), center = frontLabel(0, height), right = frontLabel(asset.size[0] * .2, height);
      assert.ok(left.x + .02 < center.x && center.x + .02 < right.x, `${name}: the front label is mirrored or squeezed into a narrow texture strip`);
      assert.ok(Math.abs(center.x - .5) < .05, `${name}: the label center faces away from the front of the product`);
      assert.ok(Math.abs(left.y - center.y) < .01 && Math.abs(right.y - center.y) < .01, `${name}: horizontal label text tilts across body faces`);
      assert.ok(center.y > previousV + .02, `${name}: the label runs upside down or compresses vertically`);
      previousV = center.y;
      for (const uv of [left, center, right]) assert.ok(caps.every(cap => !new Triangle(...cap.uv).containsPoint(uv)),
        `${name}: a cap overlaps the visible label artwork in UV space`);
    }
  }
});

test("stock variants retain geometry, local UV orientation, and shared PBR material bindings", async () => {
  for (const required of ["drink-bottle", "food-tin", "seasoning-jar", "dry-goods-bag"])
    assert.ok(required in appearances, `The stock palette has no ${required} variants`);
  for (const [name, appearance] of Object.entries(appearances)) {
    const base = await draw(name as GrocerProp, 0);
    assert.ok(base.mesh.indices.length > 0);
    for (const [index, variant] of appearance.variants.entries()) {
      const changed = await draw(name as GrocerProp, index + 1);
      assert.deepEqual(changed.mesh.positions, base.mesh.positions, `${name}: changing artwork moved the model`);
      assert.deepEqual(changed.mesh.normals, base.mesh.normals, `${name}: changing artwork altered geometric normals`);
      assert.deepEqual(changed.mesh.indices, base.mesh.indices);
      assert.deepEqual(changed.mesh.colors, base.mesh.colors, `${name}: textured variety was implemented as a whole-mesh tint`);
      assert.ok(changed.surfaces.every(surface => surface.material === "stock-grocer-props"), `${name}: variants split into extra material surfaces`);
      for (let vertex = 0; vertex < base.mesh.uv.length; vertex += 2) for (const axis of [0, 1]) {
        const coordinate = base.mesh.uv[vertex + axis];
        const local = (coordinate - appearance.source[axis]) / (appearance.source[axis + 2] - appearance.source[axis]);
        assert.ok(coordinate >= appearance.source[axis] - 1e-6 && coordinate <= appearance.source[axis + 2] + 1e-6,
          `${name}: source UV leaves its declared material rectangle beyond the bake's six-decimal rounding`);
        const expected = variant.uv[axis] + local * (variant.uv[axis + 2] - variant.uv[axis]);
        assert.ok(Math.abs(changed.mesh.uv[vertex + axis] - expected) < 1e-7, `${name}: a variant displaced or mirrored its label coordinates`);
      }
      if (JSON.stringify(variant.uv) !== JSON.stringify(appearance.source))
        assert.notDeepEqual(changed.mesh.uv, base.mesh.uv, `${name}: a requested variant still samples the original artwork`);
      const fallback = await draw(name as GrocerProp, index + 1, false);
      assert.equal(variant.colors.length, catalog[name as GrocerProp].faces.length, `${name}: incomplete sampled fallback colors`);
      const colors = variant.colors.flat();
      assert.ok(colors.every(color => color.length === 3 && color.every(value => Number.isFinite(value) && value >= 0 && value <= 1)));
      for (let vertex = 0; vertex < fallback.mesh.colors!.length; vertex += 3) {
        const emitted = fallback.mesh.colors!.slice(vertex, vertex + 3);
        assert.ok(colors.some(color => color.every((value, axis) => Math.abs(value - emitted[axis]) <= .00051)),
          `${name}: texture-free output lost the chosen package's sampled colors`);
      }
    }
  }
});

test("stock atlas rectangles are finite, ordered and disjoint unless explicitly shared", () => {
  const occupied: { rect: Rect; source: Rect }[] = [];
  for (const appearance of Object.values(appearances)) for (const variant of appearance.variants) {
    assert.ok(variant.uv.length === 4 && variant.uv.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(variant.uv[0] < variant.uv[2] && variant.uv[1] < variant.uv[3]);
    for (const previous of occupied) {
      if (JSON.stringify(previous.rect) === JSON.stringify(variant.uv) && JSON.stringify(previous.source) === JSON.stringify(appearance.source)) continue;
      assert.ok(Math.min(previous.rect[2], variant.uv[2]) <= Math.max(previous.rect[0], variant.uv[0])
        || Math.min(previous.rect[3], variant.uv[3]) <= Math.max(previous.rect[1], variant.uv[1]), "Unrelated variants cannot overwrite one atlas rectangle");
    }
    occupied.push({ rect: variant.uv, source: appearance.source });
  }
});

test("production stock stays within budget and boxes have physical support", async () => {
  for (const seed of ["packed-palette-a", "packed-palette-b", "packed-palette-c"]) {
    const { level, pen } = await fixture();
    grocer.furnish({ pen, width: 3.6, depth: 3.4, height: 2.6, key: "shop", kit: new Kit(seed, 2, .6, .3, false) });
    assert.ok(level.mesh.indices.length / 3 <= 45000, `${seed}: packed production stock exceeds 45000 triangles`);
    const boards = level.mesh.surfaces.flatMap((surfaceIndex, triangle) => {
      if (level.surfaces[surfaceIndex].material !== "stock-timber") return [];
      const points = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
        .map(index => new Vector3().fromArray(level.mesh.positions, index * 3)) as [Vector3, Vector3, Vector3];
      if (Math.max(points[0].distanceTo(points[1]), points[1].distanceTo(points[2]), points[2].distanceTo(points[0])) <= .06) return [];
      return [points];
    });
    const boxes = grocerAssetTriangles(level, "stock-box");
    assert.ok(boxes.length > 0, `${seed}: production shelves contain no shipping boxes`);
    for (let variant = 1; variant <= appearances["stock-box"].variants.length; variant++) for (const box of connectedBodies(grocerAssetTriangles(level, "stock-box", variant))) {
      const bounds = new Box3().setFromPoints(box.flat()), point = bounds.getCenter(new Vector3());
      point.z = bounds.min.z;
      const ray = new Ray(point.clone().add(new Vector3(0, 0, .001)), new Vector3(0, 0, -1));
      const own = new Set(box);
      let supported = false;
      for (const triangle of [...boards, ...boxes.filter(face => !own.has(face))]) {
        const hit = ray.intersectTriangle(...triangle, false, new Vector3());
        if (!hit || Math.abs(hit.z - point.z) > .001) continue;
        supported = true;
      }
      assert.ok(supported, `${seed}: a shipping box floats above its shelf or stack at ${point.toArray()}`);
    }
  }

});

