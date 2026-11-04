import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { twoRooms } from "./fixtures/ramp.ts";
import { compile as compileLegacy } from "../src/core/compiler.ts";
import { planToSpec } from "../src/authoring/plan.ts";
import { parseLevelSvgx, serializeLevelSvgx } from "../src/vector/format.ts";
import { compile } from "../src/vector/compiler.ts";
import { validateForRuntime, bakeNavmesh } from "../src/vector/validate.ts";
import type { V3 } from "../src/vector/types.ts";
import type { LevelSpec } from "../src/core/types.ts";

import * as producers from '../src/authoring/producers.ts';
import * as generators from '../src/generate/vector.ts';
async function api() {
  return producers;
}

it("adds producer exports while retaining the legacy root and generator entry points", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.exports["."], "./src/index.ts");
  assert.equal(pkg.exports["./generate"], "./src/generate/index.ts");
  assert.equal(pkg.exports["./producers"], "./src/authoring/producers.ts");
  assert.equal(compileLegacy(planToSpec(twoRooms("...rr....."))) instanceof Promise, false);
});

it("publishes parsed SVGX only after source and v2 runtime validation", async () => {
  const { producePlan } = await api();
  const made = await producePlan(twoRooms("...rr.....", "route low high 1"));
  assert.equal(made.legacy.report.passed, true);
  assert.equal(made.legacy.report.breached.ok, true);
  assert.equal(made.report.passed, true);
  assert.equal(made.document.version, "2");
  assert.equal(serializeLevelSvgx(parseLevelSvgx(made.text)), made.text);
  const independently = await validateForRuntime(await compile(parseLevelSvgx(made.text)));
  assert.equal(independently.passed, true);
  assert.equal(made.document.routes[0].minRoutes, 1);
});

it("does not publish an intentionally invalid source as a generated map", async () => {
  const { produceSpec } = await api();
  const spec = JSON.parse(readFileSync("levels/zz_broken_by_design.json", "utf8"));
  await assert.rejects(() => produceSpec(spec));
});

it("rejects native drafts instead of using premap validation to publish them", async () => {
  const { produceDocument } = await api();
  const d = parseLevelSvgx((await api()).planToDocument(twoRooms("...rr.....")).text);
  d.validation = "premap";
  await assert.rejects(() => produceDocument(d), /premap|playable/i);
});

it("rejects v2-only clearance errors without relaxing the source player", async () => {
  const { produceSpec } = await api();
  const spec: LevelSpec = {
    schema_version: "1.1", id: "beam-test", name: "Beam test", units: "meters", coordinate_system: "right-handed Z-up",
    player: { radius: 0.35, height: 1.8, step: 0.45, crouch: 1.1 },
    layers: [{ id: "g", z: 0, height: 3, roof: false, spaces: [{ id: "room", rect: [0, 0, 6, 6] }] }],
    covers: [{ id: "beam", layer: "g", rect: [2, 2, 2, 1], z_offset: 0.46, height: 0.5 }],
  };
  await assert.rejects(() => produceSpec(spec), (e: any) => e.stage === "vector" && e.diagnostics.some((d: any) => d.code === "NAV_HEADROOM"));
  assert.equal(spec.player!.height, 1.8);
  assert.equal(spec.player!.radius, 0.35);
});

it("navigation observation works on a cached bake and cannot change validation seeds", async () => {
  const { producePlan } = await api();
  const made = await producePlan(twoRooms("...rr....."));
  const samples: { position: V3; distance: number }[] = [];
  const nav = await bakeNavmesh(made.level, {
    sampleOrigin: made.document.markers[0].position,
    onReachableSample: (position, distance) => samples.push({ position, distance }),
  });
  assert.ok(samples.length > 2);
  assert.ok(samples.every(s => Number.isFinite(s.distance) && s.distance >= 0));
  const none: V3[] = [];
  const same = await bakeNavmesh(made.level, { sampleOrigin: [999,999,999], onReachableSample: p => none.push(p) });
  assert.equal(same.passed, nav.passed);
  assert.deepEqual(same.unreachableRegions, nav.unreachableRegions);
  assert.deepEqual(none, []);
});

it("generates v2 geometry while honoring the requested route count", async () => {
  const gen=generators;
  assert.equal(typeof gen.generateLevelV2, "function");
  const result = await gen.generateLevelV2({ seed: "producer-regression", archetype: "three_lane", depth: 1, attempts: 6, minRoutes: 3 });
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.document.version, "2");
  assert.ok(result.disjointRoutes >= 3);
  assert.equal(result.report.passed, true);
  assert.equal(result.legacy!.report.passed, true);
  assert.ok(result.level.mesh.indices.length > 0);
});

it("loads native authored SVGX with reachable run furniture", async () => {
  const gen=generators;
  assert.equal(typeof gen.loadAuthoredV2, "function");
  const { producePlan } = await api();
  const base = await producePlan(twoRooms("...rr....."));
  const result = await gen.loadAuthoredV2({ id: "authored", text: base.text, format: "svgx" }, { seed: "furniture", depth: 2 });
  assert.equal(result.report.passed, true);
  assert.ok(result.pickups.length >= 8);
  assert.ok(result.enemyPosts.length > 0);
  assert.ok(result.report.navigation!.routes.some(r => r.reachable));
  assert.deepEqual(result.report.navigation!.unreachableMarkers, []);
});

it('allocates run IDs across nested opening and reference objects',async()=>{
  const base=await producers.producePlan(twoRooms('...rr.....'));
  base.document.markers=[];
  const layer=base.document.layers[0],vertices=new Map(layer.vertices.map(v=>[v.id,v]));
  const wall=layer.edges.find(e=>{
    const a=vertices.get(e.from)!,b=vertices.get(e.to)!;
    return e.kind==='wall'&&(e.height??0)>=3&&Math.hypot(b.x-a.x,b.y-a.y)>2;
  })!;
  wall.openings.push({id:'run.exit',kind:'window',start:0.5,end:1,sill:0.5,head:1.5});
  base.document.references=[{id:'reference',image:'room.png',width:100,height:100,scale:'assumed',scaleNote:'test',
    camera:{position:[0,-10,5],target:[0,0,0],up:[0,0,1],fov:60,near:0.1,far:100},
    landmarks:[{id:'run.spawn',position:[0,0,0],image:[0.5,0.5]}],masks:[{id:'run.pickup',points:[[0,0],[1,0],[1,1]]}]}];
  const source=await producers.produceDocument(base.document);
  const result=await generators.loadAuthoredV2({id:'nested-ids',text:source.text},{seed:'ids'});
  assert.equal(result.report.passed,true);
  assert.ok(result.document.markers.some(m=>m.kind==='attacker_spawn'&&m.id!=='run.spawn'));
  assert.ok(result.pickups.every(p=>p.id!=='run.pickup'));
  assert.ok(result.document.markers.some(m=>m.kind==='objective'&&m.id!=='run.exit'));
  const again=await generators.loadAuthoredV2({id:'nested-ids',text:source.text},{seed:'ids'});
  assert.equal(again.text,result.text,'same input and seed reproduce the canonical authored run');
});

it('loads land gameplay from a valid document whose boat endpoints appear first',async()=>{
  const base=await producers.producePlan(twoRooms('...rr.....'));
  const d=base.document;
  for(const [id,z,fill] of [['bed',0,'floor'],['lake',3,'water']] as const) {
    const vertices=[[40,0],[60,0],[60,20],[40,20]].map(([x,y],i)=>({id:`${id}.v${i}`,x,y,z}));
    const edges=vertices.map((v,i)=>({id:`${id}.e${i}`,from:v.id,to:vertices[(i+1)%4].id,kind:'open' as const,openings:[]}));
    d.layers.push({id,vertices,edges,regions:[{id:`${id}.surface`,fill,boundary:edges.map(e=>e.id),holes:[],interior:[],creases:[]}]});
  }
  d.boat={radius:1,draft:0.5,height:2};
  const landSpawn=d.markers.find(m=>m.kind==='attacker_spawn')!,landGoal={...d.markers.find(m=>m.kind==='defender_spawn')!,id:'land.goal',kind:'objective'};
  d.markers.unshift({id:'boat.spawn',layer:'lake',position:[44,5,3],kind:'attacker_spawn',movement:'water'},
    {id:'boat.goal',layer:'lake',position:[56,15,3],kind:'objective',movement:'water'});
  d.markers.push(landGoal);
  d.routes.push({id:'boat.route',from:'boat.spawn',to:'boat.goal',minRoutes:1,movement:'water'});
  const source=await producers.produceDocument(d);
  const result=await generators.loadAuthoredV2({id:'mixed',text:source.text},{seed:'mixed'});
  assert.deepEqual(result.spawn,landSpawn.position);assert.deepEqual(result.exit,landGoal.position);
  assert.equal(result.report.passed,true);assert.equal(result.level.waterNavigation!.routes[0].reachable,true);
  assert.ok(result.pickups.every(p=>p.at[0]<40));
});
