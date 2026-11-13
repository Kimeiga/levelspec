import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Matrix4, Ray, Vector3 } from "three";
import { compile, parseAml } from "levelspec";
import { Pen } from "../src/dressing/pen.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { bagCluster, bagClusterSize, GROCER_LINES } from "../src/dressing/kowloon/shop/grocer-props.ts";
import { Rng } from "../src/generate/rng.ts";
import catalog from "../src/dressing/kowloon/shop/assets/grocer-props.json" with { type: "json" };
import appearances from "../src/dressing/kowloon/shop/assets/stock-appearances.json" with { type: "json" };
import type { CompiledArchitecture } from "../src/architecture/types.ts";
import { surfaceContact } from "./support/mesh-contact.ts";

type Bag = "rice-sack" | "dry-goods-bag";
type Point = [number, number, number];
type Face = [Vector3, Vector3, Vector3];
const EPSILON = .00002;

/** Creates real kit geometry with the approved shared atlas and an independently identifiable support. */
async function fixture(frame = new Matrix4(), mirrored = false) {
  const level = await compile(parseAml(`<architecture version="1" id="packed-bags">
    <material id="plain" color="#ffffff"/>
    <material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png" normal-texture="grocer-props-normal.png" metallic-roughness-texture="grocer-props-properties.png"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = [];
  kitMaterials(level);
  const { materials } = kitFinishes(level, "stock", "plain");
  const mesh = new KitMesh(level, "bags", "props", materials, { maximumTriangles: 10000 });
  return { level, pen: new Pen(mesh, "bags", frame, mirrored) };
}

interface BodyVertex { actual: Vector3 }
interface BagBody { faces: Face[] }

/** Recovers source vertices through immutable UV identity, independently of the deformation data. */
function bagBodies(level: CompiledArchitecture, name: Bag, inverse = new Matrix4()): BagBody[] {
  const appearance = appearances[name];
  const source = new Map(catalog[name].faces.flat().map(vertex => [vertex.slice(6, 8).map(value => value.toFixed(6)).join("/"), new Vector3(...vertex.slice(0, 3))]));
  const bodies = appearance.variants.map(() => ({ faces: [] as Face[], points: new Map<string, BodyVertex>() }));
  for (const [triangle, surfaceIndex] of level.mesh.surfaces.entries()) {
    if (level.surfaces[surfaceIndex].material !== "stock-grocer-props") continue;
    const indices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3);
    const uv = indices.map(vertex => level.mesh.uv.slice(vertex * 2, vertex * 2 + 2));
    const variant = appearance.variants.findIndex(({ uv: rect }) => uv.every(point => point.every((value, axis) => value >= rect[axis] - 1e-6 && value <= rect[axis + 2] + 1e-6)));
    assert.ok(variant >= 0, "A packed bag lost its selected label UVs");
    const body = bodies[variant], rect = appearance.variants[variant].uv;
    const world = indices.map(vertex => new Vector3().fromArray(level.mesh.positions, vertex * 3)) as Face;
    const normal = world[1].clone().sub(world[0]).cross(world[2].clone().sub(world[0]));
    assert.ok(normal.length() > 1e-10, "Flattening collapsed a source triangle");
    normal.normalize();
    for (const vertex of indices) {
      const shading = new Vector3().fromArray(level.mesh.normals, vertex * 3);
      assert.ok(Math.abs(shading.length() - 1) < .0001 && shading.dot(normal) > -.001,
        `${name}: flattened triangle ${triangle}, vertex ${vertex} has normal length ${shading.length()} and face dot ${shading.dot(normal)}`);
    }
    const face = world.map(point => point.clone().applyMatrix4(inverse)) as Face;
    body.faces.push(face);
    for (const [corner, point] of face.entries()) {
      const key = uv[corner].map((value, axis) => (appearance.source[axis] + (value - rect[axis]) / (rect[axis + 2] - rect[axis])
        * (appearance.source[axis + 2] - appearance.source[axis])).toFixed(6)).join("/");
      const original = source.get(key);
      assert.ok(original, "Flattening changed the original face's artwork coordinates");
      const positionKey = original.toArray().join("/");
      const existing = body.points.get(positionKey);
      if (existing) assert.ok(existing.actual.distanceTo(point) < EPSILON, "A flattened UV seam split into a crack");
      else body.points.set(positionKey, { actual: point });
    }
  }
  return bodies.filter(body => body.faces.length).map(body => ({ faces: body.faces }))
    .sort((left, right) => new Box3().setFromPoints(left.faces.flat()).getCenter(new Vector3()).x - new Box3().setFromPoints(right.faces.flat()).getCenter(new Vector3()).x);
}

/** Checks complete bag bodies for surface crossings without prescribing their arrangement. */
function assertPackedGroup(bodies: Face[][], tolerance: number): void {
  assert.ok(bodies.length > 0, "The fixture exercises complete emitted bags");
  for (let left = 0; left < bodies.length; left++) for (let right = left + 1; right < bodies.length; right++)
    assert.ok(!surfaceContact(bodies[left], bodies[right], tolerance).crosses, "Neighboring bags cut through one another");
}

test("floor and shelf groups retain complete supported bags inside their declared bounds", async t => {
  for (const name of ["rice-sack", "dry-goods-bag"] as Bag[]) for (const mirrored of [false, true]) for (const arrangement of [0, 1, 2, 3]) {
    await t.test(`${name}, mirrored=${mirrored}, arrangement=${arrangement}`, async () => {
      const envelopes: Point[] = name === "rice-sack" ? [[.85, .5, .6], [.55, .24, .4]] : [[.28, .14, .21], [.19, .08, .16]];
      let originalSize: Vector3 | undefined;
      for (const [index, envelope] of envelopes.entries()) {
        const frame = new Matrix4().makeRotationZ(.47).multiply(new Matrix4().makeScale(mirrored ? -1 : 1, 1, 1)).setPosition(2, -1, .8);
        const { level, pen } = await fixture(frame, mirrored);
        const at: Point = [.7, .5, .35], yaw = index ? -.23 : .19;
        pen.into("support").box("paint", [-1, -1, .33], [2, 2, .35], [1, 1, 1]);
        bagCluster(pen, name, at, envelope, yaw, 2, arrangement);
        const inverse = frame.clone().multiply(new Matrix4().makeRotationZ(yaw).setPosition(...at)).invert();
        const records = bagBodies(level, name, inverse), bodies = records.map(body => body.faces), faces = bodies.flat();
        assert.ok(bodies.length > 0, "The fixture exercises complete supported bags");
        assert.equal(faces.length, catalog[name].faces.length * bodies.length, "A contact group added, dropped, or duplicated bag faces");
        assert.ok(bodies.every(body => body.length === catalog[name].faces.length));
        const measured = new Box3().setFromPoints(faces.flat()), size = measured.getSize(new Vector3());
        assert.ok(size.distanceTo(new Vector3(...bagClusterSize(name, envelope, mirrored, arrangement))) <= EPSILON * 2, "Declared group bounds disagree with emitted packed geometry");
        assert.ok(size.toArray().every((value, axis) => value <= envelope[axis] + EPSILON));
        assert.ok(Math.abs(measured.min.x + measured.max.x) <= EPSILON * 2 && Math.abs(measured.min.y + measured.max.y) <= EPSILON * 2);
        if (originalSize) {
          const scales = size.toArray().map((value, axis) => value / originalSize!.getComponent(axis));
          assert.ok(Math.max(...scales) - Math.min(...scales) < .001, "A tight fixture stretched the group rather than scaling it uniformly");
        } else originalSize = size;
        const supports = level.mesh.surfaces.flatMap((surfaceIndex, triangle) => level.surfaces[surfaceIndex].object.endsWith("/support")
          ? [level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(vertex => new Vector3().fromArray(level.mesh.positions, vertex * 3).applyMatrix4(inverse)) as Face] : []);
        for (const body of bodies) {
          const bottom = Math.min(...body.flat().map(point => point.z));
          assert.ok(Math.abs(bottom) <= EPSILON, "A packed bag lifted from its shelf or floor");
          for (const foot of body.flat().filter(point => point.z <= bottom + EPSILON)) {
            const ray = new Ray(foot.clone().add(new Vector3(0, 0, .001)), new Vector3(0, 0, -1));
            assert.ok(supports.some(face => {
              const hit = ray.intersectTriangle(...face, false, new Vector3());
              return hit && Math.abs(hit.z - foot.z) <= EPSILON;
            }), "A base corner misses the actual supporting surface");
          }
        }
        assertPackedGroup(bodies, name === "rice-sack" ? .002 : .001);
        assert.equal(new Set(level.surfaces.filter(surface => surface.object.endsWith("/bags")).map(surface => surface.material)).size, 1);
      }
    });
  }
});

test("shelf groups repeat within their supported reserved unit", async () => {
  for (const mirrored of [false, true]) {
    const snapshots = [];
    for (let repeat = 0; repeat < 2; repeat++) {
      const unit = GROCER_LINES.dryBags(new Rng("packed-shelf-unit"));
      const sequence = [];
      for (let item = 0; item < 4; item++) {
        const frame = new Matrix4().makeScale(mirrored ? -1 : 1, 1, 1);
        const { level, pen } = await fixture(frame, mirrored);
        unit.draw(pen, [0, 0, .45]);
        const records = bagBodies(level, "dry-goods-bag", frame.clone().invert()), bodies = records.map(body => body.faces), faces = bodies.flat();
        assert.ok(bodies.every(body => body.length === catalog["dry-goods-bag"].faces.length), "Shelf stocking fragments a bag");
        assertPackedGroup(bodies, .001);
        const box = new Box3().setFromPoints(faces.flat());
        assert.ok(box.min.x >= -unit.width / 2 - EPSILON && box.max.x <= unit.width / 2 + EPSILON
          && box.min.y >= -unit.depth / 2 - EPSILON && box.max.y <= unit.depth / 2 + EPSILON
          && box.max.z <= .45 + unit.height + EPSILON, "The packed stock group leaves its shelf reservation");
        assert.ok(bodies.every(body => Math.abs(new Box3().setFromPoints(body.flat()).min.z - .45) <= EPSILON), "A shelf bag lifted from its support elevation");
        sequence.push(level.mesh);
      }
      snapshots.push(sequence);
    }
    assert.deepEqual(snapshots[0], snapshots[1], "A fixed stock seed changes its packed geometry or labels");
  }
});
