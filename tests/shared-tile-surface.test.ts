import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, serializeAml } from "levelspec";
import { TileField } from "../src/dressing/tile-field.ts";
import { tileSurface } from "../src/dressing/tile-surface.ts";
import { GroundSurfaceField, type GroundSurfaceRecipe } from "../src/dressing/ground-surface.ts";

test("floor adapter shares ceramic coverage, coatings and normal relief with the common surface", () => {
  const settings = { seed: 71, share: 1, size: 0.24, aspect: 2, wear: 0.6, grime: 0.4 };
  const field = new TileField(settings);
  const source: GroundSurfaceRecipe = { seed: 71, kind: "tile",
    polygon: [[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]], deposits: [], tileSize: 0.24,
    tileAspect: 2, tileWear: 0.6, tileGrime: 0.4, wornEdges: [], angle: 0, phase: 0, relief: false,
    receivingEdges: [], material: id => ({ id, repeat: id === "substrate" ? 0.5 : 2, roughness: 0.66 }),
    color: () => { throw new Error("Tile sampling must not call substrate pigment"); } };
  const ground = new GroundSurfaceField(source);
  for (const footprint of [0.003, 0.03, 0.2]) for (const [u,v] of [[-0.31,-0.17],[0.14,0.24],[1.1,0.7]]) {
    const expected = tileSurface(field,u,v,footprint,{ ceramic:"tile",bed:"substrate",grime:"tile-grime",
      repeat:2,bedRepeat:0.5,bedRoughness:0.66,roughness:0.66+(1-0.66)*0.4*0.45 });
    const sample = ground.rasterSample(u,v,footprint);
    for (const layer of expected.layers) {
      const actual = sample.layers.find(item => item.material === layer.material)!;
      assert.equal(actual.weight, layer.weight);
      assert.deepEqual(actual.tint, layer.tint);
      assert.deepEqual(actual.coatings, layer.coatings);
      assert.deepEqual(actual.uv, layer.uv);
    }
    assert.equal(sample.bump, expected.bump);
    assert.ok(Number.isFinite(sample.bump));
    assert.ok(Math.abs(sample.layers.reduce((sum, layer) => sum + layer.weight, 0)-1)<1e-12);
  }
});

test("shared tile controls retain independent installation, paint wear and dirt", () => {
  for (const share of [0,1]) {
    const field = new TileField({seed:7,share,size:0.2,aspect:2,wear:0,grime:0});
    const sample = tileSurface(field,-0.3,-0.1,0.01,{ceramic:"tile",bed:"bed",grime:"dirt",repeat:1,bedRepeat:1,bedRoughness:0.96,roughness:0.7});
    assert.equal(sample.installed,share);
    assert.ok(sample.layers[1].coatings!.every(coat=>coat.opacity===0));
  }
});

test("floor AML admits the same tile controls and retains dimension validation", async () => {
  const xml = `<architecture version="1" id="tiles" validation="premap">
    <material id="base" color="#bbbbbb"/><profile id="p" points="0 0; 2 0; 2 2; 0 2"/>
    <slab id="floor" profile="p" thickness="0.2" material="base"/>
    <dressing seed="tiles" detail="low"><floor host="floor" material="base" ground="patched"
      tile-share="1" tile-size="0.24" tile-aspect="2" tile-wear="0.4" tile-grime="0.6" tile-color="#83a99c"
      texture-density="64" asphalt="0" timber-share="0" manholes="0" litter="0"/></dressing></architecture>`;
  const document = parseAml(xml);
  const roundtrip = parseAml(serializeAml(document));
  assert.equal(roundtrip.dressing!.rules[0].tileAspect, 2);
  const level = await compile(document,{navigation:false});
  assert.deepEqual(level.diagnostics.filter(item=>item.severity==="error"),[]);
  document.dressing!.rules[0].tileAspect=0;
  const invalid=await compile(document,{navigation:false});
  assert.ok(invalid.diagnostics.some(item=>item.severity==="error" && item.message.includes("tile-aspect")));
});
