import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createArchitecture, compile, collisionMesh, bakeNavmesh, parseAml, serializeAml, toRuntime, toGLB, type ArchitectureDocument, type V3 } from "levelspec";
import { movementLevel } from "../src/vector/movement.ts";

function rect(d: ArchitectureDocument, id: string, x: number, y: number, w: number, h: number, z: number, fill: "floor"|"water" = "floor") {
  const profile={id:id+':profile',outer:{points:[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]] as V3[]},holes:[],interior:[],breaklines:[]};d.profiles.push(profile);
  const element=fill==='water'?{kind:'water' as const,id,profile:profile.id,elevation:0}:{kind:'slab' as const,id,profile:profile.id,elevation:0,thickness:.2};d.elements.push(element);return element;
}

function lake() {
  const d=createArchitecture("water-test");
  rect(d,"bed",0,0,20,20,0);
  rect(d,"lake",0,0,20,20,3,"water");
  d.boat={radius:1,draft:0.5,height:2};
  return d;
}
function route(d: ArchitectureDocument, id: string, a: V3, b: V3, movement: "land"|"water") {
  for(const [suffix,position] of [["a",a],["b",b]] as const)
    d.markers.push({id:`${id}_${suffix}`,position:[...position],layer:movement==="water"?"lake_layer":"bed_layer",kind:"poi",movement});
  d.routes.push({id,from:`${id}_a`,to:`${id}_b`,minRoutes:1,movement});
}
describe("water surfaces and independent movement",()=>{
  it("renders water without including it in collision geometry or metadata",async()=>{
    const l=await compile(lake());
    assert.deepEqual(l.diagnostics,[]);
    assert.ok(l.waterNavigation!.indices.length>0,"non-solid water must still support boat navigation");
    const waterTriangles=l.mesh.surfaces.filter(si=>l.surfaces[si].kind==="water");
    const solidTriangles=l.mesh.surfaces.filter(si=>l.surfaces[si].kind!=="water");
    assert.ok(waterTriangles.length>0,"water must remain in the render mesh");
    assert.ok(solidTriangles.length>0,"the lake bed must have solid geometry");
    for(const sealed of [false,true]) {
      const collision=collisionMesh(l,sealed);
      assert.ok(collision.surfaces.every(index=>l.surfaces[index].kind!=="water"&&l.surfaces[index].object==="bed"),"collision must retain native bed ownership and exclude water");
      assert.equal(collision.indices.length,solidTriangles.length*3);
    }
    const runtime=toRuntime(l);
    for(const si of new Set(waterTriangles))assert.equal(runtime.surfaces[si].collidable,false);
    const waterParts=runtime.meshes.filter(part=>part.kind==="water");
    assert.ok(waterParts.length>0);
    for(const part of waterParts)assert.equal(part.collidable,false);
  });
  it("round trips water, boat profiles and movement markers; exports non-solid water",async()=>{
    const d=lake();
    d.markers.push({id:"tree",layer:"bed_layer",position:[200,200,0],kind:"decoration",movement:"none"});
    const parsed=parseAml(serializeAml(d));
    assert.deepEqual(parsed.boat,d.boat);
    assert.equal(parsed.markers[0].movement,"none");
    const l=await compile(parsed);
    assert.deepEqual(l.diagnostics,[]);
    assert.equal(l.water?.length,1);
    assert.equal(l.floors.length,1);
    assert.ok(l.surfaces.some(s=>s.kind==="water"));
    assert.equal(l.navigation!.indices.length,0,"submerged bed must not be walkable");
    assert.ok(l.waterNavigation!.indices.length>0);
    assert.deepEqual(l.navigation!.unreachableMarkers,[]);
    assert.equal(toRuntime(l).waterNavigation,l.waterNavigation);
    assert.ok(toGLB(l).byteLength>0);
  });
  it("keeps land and boat routes separate, including islands and bridge headroom",async()=>{
    const d=lake();
    rect(d,"island",8,0,4,20,3.1);
    route(d,"boat_cross",[3,10,3],[17,10,3],"water");
    route(d,"land_underwater",[3,10,0],[17,10,0],"land");
    const l=await compile(d);
    assert.equal(l.waterNavigation!.routes[0].reachable,false);
    assert.equal(l.navigation!.routes[0].reachable,false);
    const bridge=lake();
    rect(bridge,"bridge",8,0,4,20,6);
    route(bridge,"under_bridge",[3,10,3],[17,10,3],"water");
    const high=await compile(bridge);
    assert.equal(high.waterNavigation!.routes[0].reachable,true);
    high.document.boat!.height=4;
    assert.equal((await bakeNavmesh(high,{movement:"water"})).routes[0].reachable,false);
    bridge.profiles.find(p=>p.id==="bridge:profile")!.outer.points!.forEach(p=>p[2]=4);
    const low=await compile(bridge);
    assert.equal(low.waterNavigation!.routes[0].reachable,false);
  });
  it("honors boat width and draft and invalidates the navigation cache",async()=>{
    const d=createArchitecture("channel-test");
    rect(d,"bed",0,0,4,20,0);
    rect(d,"lake",0,0,4,20,1,"water");
    d.boat={radius:0.5,draft:0.5,height:2};
    route(d,"channel",[2,3,1],[2,17,1],"water");
    const l=await compile(d);
    assert.equal(l.waterNavigation!.routes[0].reachable,true);
    l.document.boat!.radius=2.1;
    assert.equal((await bakeNavmesh(l,{movement:"water"})).routes[0].reachable,false);
    l.document.boat={radius:0.5,draft:1.1,height:2};
    assert.equal((await bakeNavmesh(l,{movement:"water"})).routes[0].reachable,false);
  });
  it("allows independent lakes at different elevations, without requiring a connecting route",async()=>{
    const d=lake();
    rect(d,"bed2",30,0,20,20,2);
    rect(d,"lake2",30,0,20,20,5,"water");
    const l=await compile(d);
    assert.equal(l.waterNavigation!.components,2);
    assert.deepEqual(l.waterNavigation!.unreachableRegions,[]);
    assert.equal(l.waterNavigation!.passed,true);
  });
  it("does not connect dry land banks through the submerged bed",async()=>{
    const d=lake();
    rect(d,"west",0,0,5,20,3.5);
    rect(d,"east",15,0,5,20,3.5);
    route(d,"land_crossing",[2,10,3.5],[18,10,3.5],"land");
    const l=await compile(d);
    assert.equal(l.navigation!.routes[0].reachable,false);
  });
  it("rejects a sloping water surface and invalid boat dimensions",async()=>{
    const d=lake();d.profiles.find(p=>p.id==="lake:profile")!.outer.points![0][2]=4;
    const l=await compile(d,{navigation:false});
    assert.ok(l.diagnostics.some(d=>/horizontal|planar|one surface elevation/i.test(d.message)));
    const badBoat=lake();badBoat.boat!.draft=-1;const rejected=await compile(parseAml(serializeAml(badBoat)));assert.ok(rejected.diagnostics.some(d=>d.severity==="error"&&/boat|draft/i.test(d.message)));
  });
  it("clips a sloping shoreline without duplicating endpoint fragments", async()=>{
    const d=createArchitecture("shoreline");
    rect(d,"bed",54,42,2,2,0);
    d.profiles[0].outer.points!.forEach((p,i)=>p[2]=[1.873,2.262,3.15,2.761][i]);
    rect(d,"lake",54,42,2,2,3,"water");
    const l=await compile(d,{navigation:false});
    const land=movementLevel(l,{movement:"land"});
    assert.ok(land.mesh.indices.length<300,"shared clipping endpoints must not multiply fragments");
    for(const f of land.floors) for(const p of f.points) assert.ok(p[2]>=3-1e-6);
  });
  it("excludes water with unknown depth and reports why",async()=>{
    const d=createArchitecture("no-bed");rect(d,"lake",0,0,10,10,3,"water");
    const l=await compile(d);
    assert.equal(l.waterNavigation!.indices.length,0);
    assert.ok(l.waterNavigation!.diagnostics.some(d=>d.code==="WATER_DEPTH_UNKNOWN"));
  });
});
