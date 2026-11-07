import { test } from "node:test";
import assert from "node:assert/strict";
import manifold from "manifold-3d";
import { Ray, Triangle, Vector3 } from "three";
import { SceneBuilder, addStairFlight, compile, parseLevelSvgx, serializeLevelSvgx, parseGLBGeometry, toGLB, validateForRuntime, type CompiledLevel, type V3 } from "../src/vector/index.ts";

/** Independent straight fixture: width2/run2, equalized climb, editable semantic treads. */
function fixture(climb = .6, rise = .2, thickness = .25) {
  const scene = new SceneBuilder("stepped-stairs");
  const group = scene.group("stairs");
  const region = group.polygon("flight", [[0,0,0],[2,0,0],[2,2,climb],[0,2,climb]], { fill: "stairs", rise, thickness, underside: "stepped" });
  return { scene, group, region };
}

/** Measures the first real collision triangle hit from above or below a known tread interior. */
function verticalHit(level: CompiledLevel, x: number, y: number, upward: boolean) {
  return geometryHit(compiledGeometry(level),x,y,upward);
}

/** Rays actual exported/retained triangles independently of the domain compiler. */
function geometryHit(geometry: {positions: V3[]; triangles: number[][]}, x: number, y: number, upward: boolean) {
  const origin = new Vector3(x,y,upward ? -10 : 10), ray = new Ray(origin,new Vector3(0,0,upward ? 1 : -1));
  let nearest = Infinity, height = NaN;
  for (const ids of geometry.triangles) {
    const triangle = new Triangle(...ids.map(index => new Vector3(...geometry.positions[index])) as [Vector3,Vector3,Vector3]);
    const hit = ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,new Vector3());
    if (hit && hit.distanceTo(origin)<nearest) { nearest=hit.distanceTo(origin); height=hit.z; }
  }
  return height;
}

/** Closed-Manifold construction welds Float32 export corners, without discarding any triangles. */
async function solidVolume(positions: V3[], triangles: number[][]) {
  const k=await manifold();k.setup();
  const quantized=positions.map(p=>p.map(Math.fround) as V3);
  for(const ids of triangles) assert.ok(new Triangle(...ids.map(i=>new Vector3(...quantized[i])) as [Vector3,Vector3,Vector3]).getArea()>0,"No triangle may collapse in actual Float32 output");
  const mesh=new k.Mesh({numProp:3,vertProperties:Float32Array.from(quantized.flat()),triVerts:Uint32Array.from(triangles.flat())});mesh.merge();
  const solid=new k.Manifold(mesh);
  try { assert.equal(solid.status(),"NoError");const pieces=solid.decompose();try{assert.equal(pieces.length,1);}finally{for(const piece of pieces)piece.delete();}return solid.volume(); }
  finally { solid.delete(); }
}

/** Converts the actual compiled triangle soup, not an expected reconstruction, into a closed solid. */
function compiledGeometry(level: CompiledLevel) {
  return { positions: Array.from({length:level.mesh.positions.length/3},(_,i)=>level.mesh.positions.slice(i*3,i*3+3) as V3), triangles: Array.from({length:level.mesh.indices.length/3},(_,i)=>level.mesh.indices.slice(i*3,i*3+3)) };
}

test("stepped underside preserves exact tread thickness, real risers, closure and one cubic meter volume", async () => {
  const {scene}=fixture();
  const level=await compile(scene.document,{navigation:false,retainExportSolids:true,surfaceContacts:"error",floorGaps:"error"});
  assert.deepEqual(level.diagnostics,[]);
  for (const [y,top,bottom] of [[1/3,.2,-.05],[1,.4,.15],[5/3,.6,.35]]) {
    assert.ok(Math.abs(verticalHit(level,1,y,false)-top)<1e-6);
    assert.ok(Math.abs(verticalHit(level,1,y,true)-bottom)<1e-6);
  }
  const geometry=compiledGeometry(level);
  assert.ok(Math.abs(await solidVolume(geometry.positions,geometry.triangles)-1)<1e-6);
  const exported=parseGLBGeometry(toGLB(level));
  assert.ok(Math.abs(await solidVolume(exported.positions,exported.triangles)-1)<1e-6);
  for(const [y,bottom]of[[1/3,-.05],[1,.15],[5/3,.35]])assert.ok(Math.abs(geometryHit(exported,1,y,true)-bottom)<1e-6,"GLB underside must retain the stepped shape, not only equal volume");
  const k=await manifold();k.setup();const pieces=[];
  try {
    for(const piece of level.exportSolids!){const mesh=new k.Mesh({numProp:3,vertProperties:Float32Array.from(piece.positions.flat()),triVerts:Uint32Array.from(piece.triangles.flat())});mesh.merge();pieces.push(new k.Manifold(mesh));}
    const union=k.Manifold.union(pieces);try{assert.equal(union.status(),"NoError");assert.ok(Math.abs(union.volume()-1)<1e-6);const mesh=union.getMesh(),retained={positions:Array.from({length:mesh.vertProperties.length/mesh.numProp},(_,i)=>Array.from(mesh.vertProperties.slice(i*mesh.numProp,i*mesh.numProp+3)) as V3),triangles:Array.from({length:mesh.triVerts.length/3},(_,i)=>Array.from(mesh.triVerts.slice(i*3,i*3+3)))};for(const[y,bottom]of[[1/3,-.05],[1,.15],[5/3,.35]])assert.ok(Math.abs(geometryHit(retained,1,y,true)-bottom)<1e-6,"Retained export underside must preserve actual treads");}finally{union.delete();}
  }finally{for(const piece of pieces)piece.delete();}
});

test("stepped thickness validates actual equalized rise and preserves a positive submillimeter join", async () => {
  for(const [climb,rise,thickness] of [[.65,.2,.17],[1,.34,.334]]) {
    const {scene}=fixture(climb,rise,thickness);const level=await compile(scene.document,{navigation:false});
    assert.deepEqual(level.diagnostics,[]);
    const g=parseGLBGeometry(toGLB(level));assert.ok(await solidVolume(g.positions,g.triangles)>0);
  }
  for(const thickness of [.2,.199]){
    const {scene}=fixture(.6,.2,thickness);const level=await compile(parseLevelSvgx(serializeLevelSvgx(scene.document)),{navigation:false});
    assert.equal(level.mesh.indices.length,0);
    assert.ok(level.diagnostics.some(d=>d.code==="FLIGHT"&&d.objects.includes("stairs/flight")&&d.source?.line&&/thickness|riser/i.test(d.message)));
  }
});

test("XML and stair helper expose stepped while omitted/default filled and helper sloped retain behavior", async () => {
  const {scene,region}=fixture();assert.equal(parseLevelSvgx(serializeLevelSvgx(scene.document)).layers[0].regions[0].underside,"stepped");
  for(const [mode,expectedBottom] of [[undefined,-.25],["filled",-.25],["sloped",.05]] as const){region.underside=mode;const l=await compile(scene.document,{navigation:false});assert.deepEqual(l.diagnostics,[]);assert.ok(Math.abs(verticalHit(l,1,1,true)-expectedBottom)<1e-6);}
  const helper=new SceneBuilder("helper"),g=helper.group("stairs");
  const a=addStairFlight(g,"explicit",{lower:[[0,0,0],[2,0,0]],upper:[[0,2,.6],[2,2,.6]],material:"default",thickness:.25,rise:.2,underside:"stepped"});assert.equal(a.underside,"stepped");
  const b=addStairFlight(g,"default",{lower:[[4,0,0],[6,0,0]],upper:[[4,2,.6],[6,2,.6]],material:"default"});assert.equal(b.underside,"sloped");assert.equal(b.thickness,.15);
  const invalid=new SceneBuilder("no-silent-thickening");addStairFlight(invalid.group("stairs"),"thin",{lower:[[0,0,0],[2,0,0]],upper:[[0,2,.6],[2,2,.6]],material:"default",rise:.2,underside:"stepped"});const failed=await compile(invalid.document,{navigation:false});assert.ok(failed.diagnostics.some(d=>d.code==="FLIGHT"));
});

test("stepped flight joins native landings with strict geometry and connected navigation", async () => {
  const {scene,group}=fixture();group.platform("lower",{origin:[0,-1,0],width:2,depth:1,material:"default",thickness:.25});group.platform("upper",{origin:[0,2,.6],width:2,depth:1,material:"default",thickness:.25});scene.document.markers.push({id:"spawn",layer:group.layer.id,region:"stairs/lower",position:[1,-.5,0],kind:"attacker_spawn"});
  const level=await compile(scene.document,{navigation:false,surfaceContacts:"error",floorGaps:"error"});assert.deepEqual(level.diagnostics,[]);
  const runtime=await validateForRuntime(level);assert.equal(runtime.passed,true,JSON.stringify(runtime.diagnostics));assert.ok(runtime.navigation!.reachableRegions.includes("stairs/upper"));
});

test("floor volume overlap uses actual stepped void below and actual material above", async () => {
  for(const [z,overlaps]of[[.3,false],[.4,true],[.7,false],[.62,true]] as const){
    const {scene}=fixture();scene.group("crossing").platform("floor",{origin:[.25,1.4,z],width:1.5,depth:.5,material:"default",thickness:z>.6?.05:.1});
    const l=await compile(scene.document,{navigation:false});assert.equal(l.diagnostics.some(d=>d.code==="SPACE_OVERLAP"),overlaps,JSON.stringify({z,diagnostics:l.diagnostics}));
  }
});

/** Adjacent low floor/raised stair share one side; only an explicit retaining seam seals the gap. */
function sideSeam(extraStation = false, reversed = false) {
  const scene=new SceneBuilder("stepped-seam"),low=scene.group("low"),high=scene.group("high");
  const lower=low.polygon("floor",[[0,-2,0],[2,-2,0],[2,0,0],[0,0,0]],{thickness:.25});
  const points:V3[]=extraStation?[[0,0,.5],[.41,0,.623],[2,0,1.1],[2,2,1.1],[0,2,.5]]:[[0,0,.5],[2,0,1.1],[2,2,1.1],[0,2,.5]];
  const upper=high.polygon("flight",points,{fill:"stairs",rise:.2,thickness:.25,underside:"stepped"});
  const topEdge=high.layer.edges.find(e=>high.layer.vertices.find(v=>v.id===e.from)!.x===0&&high.layer.vertices.find(v=>v.id===e.to)!.x===(extraStation?.41:2)&&high.layer.vertices.find(v=>v.id===e.from)!.y===0)!;
  if(extraStation){
    const intermediate=high.layer.vertices.find(v=>v.id===topEdge.to)!;
    const finalEdge=high.layer.edges.find(e=>e.from===intermediate.id&&high.layer.vertices.find(v=>v.id===e.to)!.x===2)!;
    const seamSplit=low.layer.vertices.find(v=>v.x===2&&v.y===0)!;
    const start=low.layer.vertices.find(v=>v.x===0&&v.y===0)!;
    low.layer.vertices.push({id:"low.mid",x:.41,y:0,z:0});
    const old=low.layer.edges.find(e=>e.from===seamSplit.id&&e.to===start.id)!;
    old.to="low.mid";low.layer.edges.push({id:"low.rest",from:"low.mid",to:start.id,kind:"open",openings:[]});
    lower.boundary.splice(lower.boundary.indexOf(old.id)+1,0,"low.rest");
    scene.document.seams=[{id:"join-a",edges:["low.rest",topEdge.id],kind:"open"},{id:"join-b",edges:[old.id,finalEdge.id],kind:"open"}];
  }else scene.document.seams=[{id:"join",edges:[lower.boundary[2],topEdge.id],kind:"open"}];
  if(reversed)upper.boundary=upper.boundary.reverse().map(ref=>ref.startsWith("-")?ref.slice(1):"-"+ref);
  return scene;
}

test("open retaining seams meet actual stepped bottoms, including exact risers and extra rail stations", async () => {
  for(const extra of[false,true])for(const reversed of[false,true]){
    const scene=sideSeam(extra,reversed);const level=await compile(scene.document,{navigation:false,surfaceContacts:"error",floorGaps:"error"});assert.deepEqual(level.diagnostics,[]);
    for(const[x,top]of[[1/3,.45],[1,.65],[5/3,.85],[2/3-1e-4,.45],[2/3+1e-4,.65],[4/3-1e-4,.65],[4/3+1e-4,.85]])assert.ok(Math.abs(verticalHit(level,x,-.05,false)-top)<1e-5,JSON.stringify({x,expected:top,actual:verticalHit(level,x,-.05,false),extra,reversed}));
    for(const[x,seamTop,flightBottom]of[[Math.fround(2/3),.65,.45],[Math.fround(4/3),.85,.65]]){assert.ok(Math.abs(verticalHit(level,x,-.05,false)-seamTop)<1e-5,"Closed retaining-prism union takes the higher neighboring top at a riser");assert.ok(Math.abs(verticalHit(level,x,1,true)-flightBottom)<1e-5,"Actual flight union begins at the lower neighboring bottom at the same riser");}
    scene.document.seams=[];const open=await compile(scene.document,{navigation:false,floorGaps:"error"});assert.ok(open.diagnostics.some(d=>d.code==="FLOOR_EDGE_GAP"),"Actual exposed side gap remains an error without its physical retaining seam");
  }
});

test("curved and reversed stepped rails retain true treads and a closed Float32 solid", async () => {
  for(const reversed of[false,true]){
    const scene=new SceneBuilder("curved-stepped"),g=scene.group("stairs");const r=g.polygon("flight",[[2,0,0],[4,0,0],[0,4,.6],[0,2,.6]],{fill:"stairs",rise:.2,thickness:.25,underside:"stepped"});
    g.layer.edges.find(e=>e.id===r.boundary[1])!.control=[[4,2.209],[2.209,4]];
    g.layer.edges.find(e=>e.id===r.boundary[3])!.control=[[1.105,2],[2,1.105]];
    if(reversed)r.boundary=r.boundary.reverse().map(ref=>ref.startsWith("-")?ref.slice(1):"-"+ref);
    const level=await compile(scene.document,{navigation:false,retainExportSolids:true});assert.deepEqual(level.diagnostics,[]);assert.deepEqual([...new Set(level.floors[0].points.map(p=>Number(p[2].toFixed(6))))].sort(),[.2,.4,.6]);
    const geometry=parseGLBGeometry(toGLB(level));assert.ok(await solidVolume(geometry.positions,geometry.triangles)>0);
    for(const[degrees,bottom]of[[15,-.05],[45,.15],[75,.35]]){const angle=degrees*Math.PI/180;assert.ok(Math.abs(geometryHit(geometry,3*Math.cos(angle),3*Math.sin(angle),true)-bottom)<1e-5,"Curved underside must step beneath known interior angular bands");}
  }
});

test("stepped underpass headroom differs from filled while the isolated top flight remains navigable", async () => {
  for(const mode of["stepped","filled"] as const){
    const scene=new SceneBuilder("underpass-"+mode);scene.document.validation="premap";scene.document.player.height=1.8;const g=scene.group("stairs");g.polygon("flight",[[0,0,3],[4,0,3],[4,6,3.6],[0,6,3.6]],{fill:"stairs",rise:.2,thickness:.25,underside:mode});
    scene.group("underpass").platform("floor",{origin:[.5,4.1,1.4],width:3,depth:1.8,material:"default",thickness:.2});
    const level=await compile(scene.document,{navigation:false});assert.deepEqual(level.diagnostics,[]);const result=await validateForRuntime(level);assert.ok(result.navigation);
    const under=result.navigation.coverage.regions.find(r=>r.region==="underpass/floor")!;assert.ok(under.sampled>0,"Headroom expectations require actual lower-floor samples");const blocked=(result.navigation.coverage.blocked??[]).filter(s=>s.region==="underpass/floor"&&s.reason==="headroom");assert.equal(blocked.length,mode==="filled"?under.sampled:0);assert.equal(under.covered,mode==="filled"?0:under.sampled);if(mode==="filled")assert.ok(blocked.every(s=>Math.abs(s.clearance!-1.35)<1e-6));assert.ok(result.navigation.coverage.regions.find(r=>r.region==="stairs/flight")!.covered>0);
  }
});


test("retaining seams start at stepped tread tops when stairs are the LOWER neighbor", async () => {
  for(const extra of[false,true])for(const reversed of[false,true]){
    const scene=sideSeam(extra,reversed);for(const layer of scene.document.layers)for(const vertex of layer.vertices)if(vertex.id.startsWith("low/")||vertex.id==="low.mid")vertex.z=2;
    const level=await compile(scene.document,{navigation:false,surfaceContacts:"error",floorGaps:"error"});assert.deepEqual(level.diagnostics,[]);
    for(const[x,bottom]of[[1/3,.7],[1,.9],[5/3,1.1],[Math.fround(2/3),.7],[Math.fround(4/3),.9],[2/3-1e-4,.7],[2/3+1e-4,.9]])assert.ok(Math.abs(verticalHit(level,x,-.05,true)-bottom)<1e-5,"Retaining base must contact actual lower tread tops rather than their smooth guide");
    scene.document.seams=[];const open=await compile(scene.document,{navigation:false,floorGaps:"error"});assert.ok(open.diagnostics.some(d=>d.code==="FLOOR_EDGE_GAP"));
  }
});
