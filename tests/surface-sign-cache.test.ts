import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { PNG } from "pngjs";
import { compile, collisionMesh, parseAml } from "levelspec";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { drawPanel, type PanelDesign } from "../src/dressing/kowloon/signs/panel.ts";
import { SignSurface, type SignPaint } from "../src/dressing/kowloon/signs/lettering.ts";
import { paintSignFace } from "../src/dressing/kowloon/signs/weathering.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import type { SurfaceMaterialArtifact, SurfaceMaterialCache } from "../src/dressing/surface/material-cache.ts";

const IMAGE = encodeSurfaceImage({ width: 2, height: 1, data: new Uint8Array([220, 170, 90, 255, 80, 150, 210, 255]) });
const CHANGED_IMAGE = encodeSurfaceImage({ width: 2, height: 1, data: new Uint8Array([120, 70, 90, 255, 180, 150, 210, 255]) });
const DESIGN: PanelDesign = { width: .4, height: .3, depth: .02, construction: "sheet", outline: "rectangle",
  ground: [.6, .4, .2], border: [.2, .3, .7], stack: "down", age: .7, phase: 3,
  blocks: [{ text: "AB", face: "hei", direction: "ltr", ink: [.7, .8, .9], share: 1, shadow: [.1, .2, .3] }] };

/** Keeps actual material artifacts reusable without giving the cache ownership of publication. */
function storage() {
  const entries = new Map<string, SurfaceMaterialArtifact>();
  const cache: SurfaceMaterialCache = { async read(key) { return entries.get(key); },
    async write(value) { entries.set(value.key, structuredClone(value)); } };
  return { cache, entries };
}

interface Settings {
  design?: PanelDesign; grime?: number; wear?: number; rust?: number;
  repeat?: number; lettering?: boolean; atlas?: Uint8Array; swapRoles?: boolean;
  shift?: number; mutateAfterDraw?: boolean; arbitrary?: boolean;
}

/** A real small panel exercises producer identities, deferred callbacks and the compiler cache. */
async function panel(settings: Settings = {}, cache?: SurfaceMaterialCache) {
  const level = await compile(parseAml(`<architecture version="1" id="sign-cache">
    <material id="wall" color="#fff" texture="base.png" repeat="${settings.repeat ?? 1}"/>
    <material id="paint" color="#bbaabb" texture="base.png"/>
    <material id="rust" color="#773311" texture="base.png"/>
    <material id="letters" color="#fff" texture="atlas.png"/>
    <box id="host" width="1" depth="1" height="1" material="wall"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  const slots = { wall: "wall", paint: settings.swapRoles ? "rust" : "paint",
    rust: settings.swapRoles ? "paint" : "rust", lettering: "letters", board: "wall", timber: "wall", metal: "rust" } as Record<KitSlot, string>;
  const mesh = new KitMesh(level, "host", "props", slots, { maximumTriangles: 2000 });
  const pen = new Pen(mesh, "sign", new Matrix4().makeTranslation(settings.shift ?? 0, 0, 0), false);
  const design = settings.design ?? structuredClone(DESIGN);
  const kit = new Kit("sign-cache", 1, settings.grime ?? .4, settings.wear ?? .3, settings.lettering ?? true, 128, settings.rust ?? .2);
  if (settings.arbitrary) {
    const paints: SignPaint[] = [];
    const surface = new SignSurface(pen, [0, 0, 0], [.4, 0, 0], [0, 0, .3], [0, 1, 0], paints);
    surface.polygon("wall", [[0, 0], [.4, 0], [.4, .3], [0, .3]], 0,
      point => [.6 + point[0] * .1, .4, .2], undefined, (x, y) => [x * 2, y * 3]);
    paintSignFace(surface, design, kit, paints);
  } else drawPanel(pen, design, "front", { slot: "metal", tint: [.2, .2, .2] }, kit);
  if (settings.mutateAfterDraw) {
    design.ground.fill(0); design.blocks[0].text = "ZZ"; design.blocks[0].ink.fill(0); design.phase = 100;
    Object.assign(kit, { grime: 0, wear: 0, rust: 0 });
    slots.paint = "rust"; slots.lettering = "rust";
  }
  let jobs = 0;
  await compileSurfaceAppearance(level, { materialCache: cache, materialCacheValidation: "integrity",
    resolveMaterialImage: async reference => reference === "atlas.png" ? settings.atlas ?? IMAGE : IMAGE,
    rasterExecutor: async function* (pending, bake) {
      jobs += pending.length; for (const job of pending) yield await bake(job.index);
    } }, 2000);
  return { level, jobs };
}

/** Compares compiler state and exact map bytes, not screenshot or style expectations. */
function published(result: Awaited<ReturnType<typeof panel>>) {
  const level = result.level;
  return { mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials,
    images: level.generatedImages, appearance: level.surfaceAppearance, collision: collisionMesh(level, true), diagnostics: level.diagnostics };
}

test("finished sign faces reuse exact maps, retain placement geometry and own deferred design inputs", async () => {
  const saved = storage(), cold = await panel({}, saved.cache);
  assert.equal(cold.jobs, 1); assert.equal(saved.entries.size, 1);
  const warm = await panel({}, saved.cache);
  assert.equal(warm.jobs, 0); assert.deepEqual(published(warm), published(cold));
  const used = new Set(warm.level.mesh.surfaces.map(index => warm.level.surfaces[index].material));
  const bound = warm.level.document.materials.filter(material => used.has(material.id) && material.id.startsWith("$surface/raster/"));
  assert.equal(bound.length, 1);
  for (const reference of [bound[0].texture, bound[0].metallicRoughnessTexture, bound[0].normalTexture]) {
    assert.ok(reference && warm.level.generatedImages?.[reference]);
    const image = PNG.sync.read(Buffer.from(warm.level.generatedImages[reference].bytes));
    assert.deepEqual([image.width, image.height], [56, 43], "Full density and the two-pixel border remain bound");
  }
  const moved = await panel({ shift: 2 }, saved.cache), movedFresh = await panel({ shift: 2 });
  assert.equal(moved.jobs, 0); assert.deepEqual(published(moved), published(movedFresh));
  assert.notDeepEqual(moved.level.mesh.positions, cold.level.mesh.positions);
  const mutationCache = storage(), mutated = await panel({ mutateAfterDraw: true }, mutationCache.cache);
  assert.deepEqual(published(mutated), published(cold));
  assert.deepEqual([...mutationCache.entries.keys()], [...saved.entries.keys()]);
});

test("sign artwork, aging, atlas and material mapping changes invalidate cached faces", async () => {
  const cases: [string, Settings][] = [
    ["text", { design: { ...structuredClone(DESIGN), blocks: [{ ...structuredClone(DESIGN.blocks[0]), text: "AC" }] } }],
    ["ink", { design: { ...structuredClone(DESIGN), blocks: [{ ...structuredClone(DESIGN.blocks[0]), ink: [.1, .2, .3] }] } }],
    ["ground", { design: { ...structuredClone(DESIGN), ground: [.2, .3, .4] } }],
    ["phase", { design: { ...structuredClone(DESIGN), phase: 8 } }],
    ["grime", { grime: .8 }], ["wear", { wear: .8 }], ["rust", { rust: .8 }],
    ["repeat", { repeat: 2 }], ["atlas", { atlas: CHANGED_IMAGE }],
    ["lettering mode", { lettering: false }], ["material roles", { swapRoles: true }],
  ];
  const seed = storage(); await panel({}, seed.cache);
  for (const [name, settings] of cases) {
    const saved = storage(); for (const [key, artifact] of seed.entries) saved.entries.set(key, structuredClone(artifact));
    const changed = await panel(structuredClone(settings), saved.cache);
    assert.equal(changed.jobs, 1, `${name} must invalidate the finished face`);
    const fresh = await panel(structuredClone(settings));
    assert.deepEqual(published(changed), published(fresh), name);
  }
});

test("arbitrary sign tint and UV callbacks do not silently opt into persistence", async () => {
  let reads = 0, writes = 0;
  const cache: SurfaceMaterialCache = { async read() { reads++; return undefined; },
    async write() { writes++; } };
  const result = await panel({ arbitrary: true }, cache);
  assert.deepEqual([reads, writes], [0, 0], "Unkeyed artwork cannot access persisted artifacts");
  assert.equal(result.jobs, 1);
  assert.ok(Object.keys(result.level.generatedImages!).length > 0);
});
