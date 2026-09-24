import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { SceneBuilder, compile, parseLevelSvgx, serializeLevelSvgx, validateForRuntime, toGLB, toOBJ,
  compareReference, projectReference, referenceViewport, pointInMask, validateReference, collisionMesh,
  boxGeometry, rotateXYZ, generateUVs, parseGLBGeometry, createGLBAssetResolver,
  type ReferenceView, type V3 } from "../src/vector/index.ts";
import { rayBlocked } from "../src/vector/validate.ts";
function reference(): ReferenceView {
  return { id:"photo",image:"reference.png",width:1500,height:1000,scale:"assumed",scaleNote:"Approximate storey height of 3 metres.",
    camera:{position:[0,-10,3],target:[0,0,3],up:[0,0,1],fov:60,near:0.05,far:2000},landmarks:[],masks:[] };
}
function fixture() {
  const scene=new SceneBuilder("fixture"), group=scene.group("foreground");
  const floor=group.platform("deck",{width:8,depth:8,material:"default"});
  scene.document.markers.push({id:"spawn",layer:group.layer.id,region:floor.id,kind:"attacker_spawn",position:[1,1,0]});
  return { scene,group,document:scene.document };
}
function glbJSON(bytes: Uint8Array) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.slice(20,20+view.getUint32(12,true))));
}
function withGLBJSON(bytes: Uint8Array, mutate: (json: any) => void) {
  const result=bytes.slice(),view=new DataView(result.buffer,result.byteOffset,result.byteLength),
    length=view.getUint32(12,true),json=glbJSON(result);
  mutate(json);
  const encoded=new TextEncoder().encode(JSON.stringify(json));
  assert.ok(encoded.length<=length);
  result.fill(0x20,20,20+length);result.set(encoded,20);
  return result;
}
describe("reference views",()=>{
  it("round trips cameras, normalized landmarks, masks and assumption provenance",()=>{
    const {document}=fixture(),r=reference();r.landmarks=[{id:"roof-corner",position:[0,0,3],image:[0.5,0.5]}];
    r.masks=[{id:"person",points:[[0.6,0.3],[0.9,0.3],[0.9,1],[0.6,1]]}];document.references=[r];
    const xml=serializeLevelSvgx(document),round=serializeLevelSvgx(parseLevelSvgx(xml));
    assert.equal(round,xml);assert.equal(parseLevelSvgx(xml).references![0].camera.fov,60);
  });
  it("matches Three.js projection for tilted, rolled and non-square views",()=>{
    const r=reference();r.camera={...r.camera,position:[4,-10,9],target:[2,3,4],up:[0.15,0.2,1],fov:53};
    const c=new PerspectiveCamera(r.camera.fov,r.width/r.height,r.camera.near,r.camera.far);
    c.up.fromArray(r.camera.up);c.position.fromArray(r.camera.position);c.lookAt(...r.camera.target);c.updateMatrixWorld();
    for(let i=0;i<30;i++){
      const p:V3=[Math.sin(i)*5,Math.cos(i)*4,1+i/10],actual=projectReference(r,p).image!;
      const expected=new Vector3(...p).project(c);
      assert.ok(Math.abs(actual[0]-(expected.x+1)/2)<1e-12);assert.ok(Math.abs(actual[1]-(1-expected.y)/2)<1e-12);
    }
  });
  it("does not report a zero-error fit with no observations or clipped points",()=>{
    const r=reference();assert.equal(compareReference(r).rmsPixels,null);
    r.landmarks=[{id:"behind",position:[0,-20,3],image:[0.5,0.5]}];
    const behind=compareReference(r);assert.equal(behind.clipped,1);assert.equal(behind.rmsPixels,null);
    assert.equal(projectReference(r,[0,-10,3]).image,null);
    r.landmarks=[{id:"offscreen",position:[50,0,3],image:[0.5,0.5]}];
    const offscreen=compareReference(r);assert.equal(offscreen.clipped,1);assert.equal(offscreen.compared,0);
    assert.equal(offscreen.rmsPixels,null);assert.equal(projectReference(r,[50,0,3]).inFrame,false);
  });
  it("measures pixel alignment and excludes explicitly masked observations",()=>{
    const r=reference();r.landmarks=[{id:"a",position:[0,0,3],image:[0.6,0.5]},{id:"b",position:[0,0,3],image:[0.5,0.8]}];
    r.masks=[{id:"foreground",points:[[0.4,0.7],[0.6,0.7],[0.6,0.9],[0.4,0.9]]}];
    const result=compareReference(r);assert.equal(result.compared,1);assert.equal(result.masked,1);assert.ok(Math.abs(result.rmsPixels!-150)<1e-9);
    assert.equal(pointInMask([0.4,0.8],r.masks[0].points),true);
  });
  it("keeps image and render in the same letterbox",()=>{
    assert.deepEqual(referenceViewport(1000,1000,1.5),{x:0,y:(1000-1000/1.5)/2,width:1000,height:1000/1.5});
    assert.deepEqual(referenceViewport(1200,400,1.5),{x:300,y:0,width:600,height:400});
    assert.throws(()=>referenceViewport(0,100,1));
  });
  it("rejects malformed cameras, masks and missing scale provenance with source diagnostics",()=>{
    for(const mutate of [
      (r:ReferenceView)=>{r.camera.target=[...r.camera.position];},
      (r:ReferenceView)=>{r.camera.up=[0,1,0];},
      (r:ReferenceView)=>{r.camera.fov=180;},
      (r:ReferenceView)=>{r.camera.near=r.camera.far;},
      (r:ReferenceView)=>{r.width=1.2;},
      (r:ReferenceView)=>{r.scaleNote="";},
      (r:ReferenceView)=>{r.masks=[{id:"bad-mask",points:[[0,0],[1,1],[0,1],[1,0]]}];},
    ]) {const r=reference();mutate(r);assert.ok(validateReference(r).length);}
    const {document}=fixture();document.references=[reference()];
    assert.throws(()=>parseLevelSvgx(serializeLevelSvgx(document).replace('fov="60"','fov="180"')),/Invalid camera/);
  });
});
describe("scene props and physics",()=>{
  it("round trips primitive instances and enforces explicit collision intent",()=>{
    const {document,group}=fixture();group.cylinder("tank",{position:[4,4,0],size:[1,1,2],material:"default",collision:"box",segments:12});
    const xml=serializeLevelSvgx(document);assert.equal(serializeLevelSvgx(parseLevelSvgx(xml)),xml);
    assert.throws(()=>parseLevelSvgx(xml.replace(' collision="box"','')),/Missing collision/);
    assert.throws(()=>parseLevelSvgx(xml.replace('segments="12"','segments="1000000"')),/segments/);
    assert.throws(()=>parseLevelSvgx(xml.replace('layer="architecture" shape=','layer="missing" shape=')),/Unknown prop layer/);
    assert.throws(()=>parseLevelSvgx(xml.replace('scale="1 1 2"','scale="0.0004 1 2"')),/strictly positive scale/);
  });
  it("emits outward-wound closed boxes and rotated cylinders",async()=>{
    const {document,group}=fixture();group.box("box",{position:[3,3,0],size:[2,1,1],rotation:[0,0,25],material:"default",collision:"solid"});
    group.cylinder("pipe",{position:[5,5,0],size:[0.2,0.2,2],rotation:[0,90,30],material:"default",collision:"solid"});
    const level=await compile(document,{navigation:false});assert.deepEqual(level.diagnostics,[]);
    assert.ok(level.mesh.indices.length>0);assert.deepEqual(document.props![0].rotation,[0,0,25]);
    const q=rotateXYZ([0,0,1],[0,90,90]);assert.ok(Math.abs(q[1]-1)<1e-12);
  });
  it("snaps primitive dimensions but preserves dimensionless imported-asset scale",async()=>{
    const {document,group}=fixture();
    group.box("primitive",{position:[1.23456,2.34567,0],size:[1.23456,2.34567,3.45678],material:"default",collision:"none"});
    document.assets=[{id:"mesh",src:"mesh.glb"}];
    group.asset("asset","mesh",{position:[4.44444,4.55555,0],size:[1.23456,2.34567,3.45678],material:"default",collision:"none"});
    const level=await compile(document,{navigation:false,resolveAsset:async()=>boxGeometry()});
    assert.deepEqual(level.diagnostics,[]);
    const primitive=level.document.props!.find((p)=>p.id==="foreground/primitive")!;
    const asset=level.document.props!.find((p)=>p.id==="foreground/asset")!;
    assert.deepEqual(primitive.position,[1.235,2.346,0]);assert.deepEqual(primitive.scale,[1.235,2.346,3.457]);
    assert.deepEqual(asset.position,[4.444,4.556,0]);assert.deepEqual(asset.scale,[1.23456,2.34567,3.45678]);
  });
  it("keeps distant scenery out of navigation bounds and gameplay line of sight",async()=>{
    const {document,group}=fixture();group.box("skyline",{position:[10000,10000,0],size:[200,200,200],material:"default",collision:"none"});
    group.box("visual-wall",{position:[4,4,0],size:[0.1,8,4],material:"default",collision:"none"});
    const level=await compile(document);
    assert.ok(collisionMesh(level).positions.every((n)=>Math.abs(n)<100));
    assert.equal(rayBlocked(level,[1,4,1],[7,4,1]),false);
    assert.equal((await validateForRuntime(level,{sealed:true})).passed,true);
    assert.equal(level.navigation!.coverage.uncoveredCount,0);
  });
  it("uses the collision proxy for physics but never renders or bakes it",async()=>{
    const {document,group}=fixture();group.cylinder("tank",{position:[4,4,0],size:[1,1,2],material:"default",collision:"box",segments:12});
    const level=await compile(document);assert.deepEqual(level.diagnostics,[]);
    const proxy=level.surfaces.find((s)=>s.role==="collision")!;assert.equal(proxy.visible,false);assert.notEqual(proxy.collidable,false);
    assert.equal(rayBlocked(level,[2,4,1],[6,4,1]),true);
    const visual=glbJSON(toGLB(level)),collision=glbJSON(toGLB(level,{purpose:"collision"}));
    assert.ok(!visual.nodes.some((n:any)=>n.extras?.role==="collision"));assert.ok(collision.nodes.some((n:any)=>n.extras?.role==="collision"));
    assert.ok(!collision.nodes.some((n:any)=>n.extras?.role==="prop"));
    const visualPosition=visual.accessors[visual.meshes[0].primitives[0].attributes.POSITION];
    assert.ok(visualPosition.count<level.mesh.positions.length/3);
    assert.ok(!toOBJ(level).includes(':collision'));
    assert.ok(toOBJ(level).split("\n").filter((line)=>line.startsWith("v ")).length<level.mesh.positions.length/3);
    await generateUVs(level,{density:4,resolution:128,padding:2});
    for(let t=0;t<level.mesh.surfaces.length;t++)if(level.surfaces[level.mesh.surfaces[t]].visible===false)
      assert.equal(level.mesh.atlasPages![t],-1);
  });
  it("exports collision GLBs without visual textures and rejects empty collision output",async()=>{
    const {scene,document,group}=fixture();scene.material("textured",{texture:"missing.png"});
    group.box("crate",{position:[4,4,0],size:[1,1,1],material:"textured",collision:"box"});
    const level=await compile(document,{navigation:false});assert.deepEqual(level.diagnostics,[]);
    assert.throws(()=>toGLB(level),/unresolved texture/);
    const collision=glbJSON(toGLB(level,{purpose:"collision"}));
    assert.equal(collision.images,undefined);assert.equal(collision.extras.levelspec.purpose,"collision");
    assert.ok(collision.extras.levelspec.includedSurfaceIndices.length>0);
    assert.ok(collision.extras.levelspec.includedSurfaceIndices.every((i:number)=>level.surfaces[i].collidable!==false));
    const emptyScene=new SceneBuilder("visual-only"),emptyGroup=emptyScene.group("scene");
    emptyGroup.box("ghost",{position:[0,0,0],size:[1,1,1],material:"default",collision:"none"});
    const empty=await compile(emptyScene.document,{navigation:false});
    assert.ok(empty.mesh.indices.length>0);assert.throws(()=>toGLB(empty,{purpose:"collision"}),/empty collision model/);
  });
  it("invalidates geometry and navigation identity when collision intent changes",async()=>{
    const {document,group}=fixture();const p=group.box("box",{position:[4,4,0],size:[1,1,1],material:"default",collision:"none"});
    const a=await compile(document);p.collision="solid";const b=await compile(document);
    assert.notEqual(a.geometryHash,b.geometryHash);assert.notEqual(a.navigation!.settings.cacheKey,b.navigation!.settings.cacheKey);
  });
  it("loads transformed GLB scene geometry through the built-in resolver",async()=>{
    const {document,group}=fixture();
    group.box("crate",{position:[3,4,0],size:[2,1,1.5],rotation:[0,0,20],material:"default",collision:"solid"});
    const source=await compile(document,{navigation:false});
    const bytes=toGLB(source),geometry=parseGLBGeometry(bytes);
    const bounds=(positions:V3[])=>[0,1,2].flatMap((axis)=>[
      Math.min(...positions.map((p)=>p[axis])),
      Math.max(...positions.map((p)=>p[axis])),
    ]);
    const sourcePositions=Array.from({length:source.mesh.positions.length/3},(_,i)=>
      source.mesh.positions.slice(i*3,i*3+3) as V3);
    const actual=bounds(geometry.positions),expected=bounds(sourcePositions);
    actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-5,`${i}: ${v} vs ${expected[i]}`));
    const imported=new SceneBuilder("imported"),host=imported.group("host");
    host.platform("ground",{width:12,depth:12,material:"default"});
    imported.document.assets=[{id:"scene",src:"scene.glb"}];
    host.asset("scene","scene",{position:[0,0,0],size:[1,1,1],material:"default",collision:"none"});
    const level=await compile(imported.document,{navigation:false,
      resolveAsset:createGLBAssetResolver(async(ref)=>{assert.equal(ref,"scene.glb");return bytes;})});
    assert.deepEqual(level.diagnostics,[]);assert.ok(level.mesh.indices.length>source.mesh.indices.length);
    assert.throws(()=>parseGLBGeometry(new Uint8Array([1,2,3])),/too small/);
  });
  it("imports only the declared default GLB scene",async()=>{
    const {document,group}=fixture();
    group.box("crate",{position:[3,4,0],size:[2,1,1.5],material:"default",collision:"solid"});
    const source=await compile(document,{navigation:false}),bytes=toGLB(source);
    const empty=withGLBJSON(bytes,(json)=>{
      const scene=json.scenes?.[json.scene??0];assert.ok(scene);scene.nodes=[];
    });
    assert.throws(()=>parseGLBGeometry(empty),/no triangle mesh geometry in its default scene/);
    const missing=withGLBJSON(bytes,(json)=>{json.scene=9;});
    assert.throws(()=>parseGLBGeometry(missing),/default scene 9 does not exist/);
  });
  it("resolves a shared asset once, preserves transforms and rejects missing or bad geometry",async()=>{
    const {document,group}=fixture();document.assets=[{id:"model",src:"model.glb"}];
    group.asset("a","model",{position:[2,2,0],size:[1,1,1],material:"default",collision:"none"});
    group.asset("b","model",{position:[5,5,0],size:[2,2,2],material:"default",collision:"box"});
    let calls=0;const original=boxGeometry(),before=JSON.stringify(original);
    const level=await compile(document,{navigation:false,resolveAsset:async()=>{calls++;return original;}});
    assert.equal(calls,1);assert.equal(JSON.stringify(original),before);assert.deepEqual(level.diagnostics,[]);
    const missing=await compile(document,{navigation:false});assert.equal(missing.diagnostics[0].code,"ASSET");
    assert.deepEqual(missing.diagnostics[0].objects,["foreground/a"]);
    const bad=await compile(document,{navigation:false,resolveAsset:async()=>({positions:[[0,0,0]],triangles:[[0,0,8]]})});
    assert.match(bad.diagnostics[0].message,/indices/);
  });
  it("does not weaken validation of disconnected playable floors",async()=>{
    const {document,group}=fixture();group.platform("island",{origin:[20,20,0],width:4,depth:4,material:"default"});
    group.box("context",{position:[100,100,0],size:[10,10,30],material:"default",collision:"none"});
    const level=await compile(document),report=await validateForRuntime(level);
    assert.equal(report.passed,false);assert.ok(report.diagnostics.some((d)=>d.code==="NAV_DISCONNECTED"));
  });
  it("honours cancellation before and after host-controlled asset resolution",async()=>{
    const {document,group}=fixture();document.assets=[{id:"asset",src:"x.glb"}];group.asset("model","asset",{position:[0,0,0],size:[1,1,1],material:"default",collision:"none"});
    const abort=new AbortController();
    await assert.rejects(compile(document,{signal:abort.signal,resolveAsset:async()=>{abort.abort();return boxGeometry();}}),{name:"AbortError"});
  });
});
describe("architectural authoring",()=>{
  it("keeps attachments relative to parent yaw and roof height with stable generated IDs",()=>{
    const generate=(height:number)=>{
      const s=new SceneBuilder("city"),g=s.group("west",{origin:[10,20,0],yaw:90});
      const b=g.building("tower",{size:[8,6,height],material:"default",usage:"scenery"});
      b.facade("south",{rows:3,columns:3,material:"default"});
      b.roof.cylinder("tank",{position:[2,3,1],size:[1,1,2],material:"default",collision:"none"});return s.document;
    };
    const a=generate(9),b=generate(12);assert.deepEqual(a.props!.map((p)=>p.id),b.props!.map((p)=>p.id));
    assert.deepEqual(a.props!.at(-1)!.position,[7,22,10]);assert.deepEqual(b.props!.at(-1)!.position,[7,22,13]);
    assert.equal(serializeLevelSvgx(a),serializeLevelSvgx(generate(9)));
  });
  it("builds a shared-topology, navigable switchback staircase",async()=>{
    const s=new SceneBuilder("stairs"),g=s.group("escape");g.staircase("assembly",{floors:2,usage:"playable",material:"default"});
    s.document.markers.push({id:"spawn",layer:g.layer.id,kind:"attacker_spawn",position:[0.7,0.75,0]},
      {id:"exit",layer:g.layer.id,kind:"poi",position:[0.7,0.75,6.4]});
    s.document.routes.push({id:"climb",from:"spawn",to:"exit",minRoutes:1});
    const level=await compile(s.document,{floorGaps:"error",surfaceContacts:"error"}),report=await validateForRuntime(level,{sealed:true});
    assert.equal(report.passed,true,JSON.stringify(report.diagnostics));assert.equal(level.navigation!.coverage.uncoveredCount,0);
    assert.equal(level.floors.length,9);assert.ok(report.navigation!.routes[0].reachable);
  });
  it("uses sloped stair undersides for solid-overlap validation",async()=>{
    const s=new SceneBuilder("stairs"),g=s.group("escape");
    g.staircase("assembly",{floors:1,usage:"playable",material:"default"});
    g.platform("underpass",{origin:[0.2,4,0.5],width:0.9,depth:0.5,material:"default"});
    const options={navigation:false as const,floorGaps:false as const,surfaceContacts:false as const};
    const open=await compile(s.document,options);
    assert.ok(!open.diagnostics.some((d)=>d.code==="SPACE_OVERLAP"),JSON.stringify(open.diagnostics));
    const flight=s.document.layers[0].regions.find((r)=>r.id==="escape/assembly/flight0")!;
    flight.underside="filled";
    const filled=await compile(s.document,options);
    assert.ok(filled.diagnostics.some((d)=>d.code==="SPACE_OVERLAP"));
  });
  it("keeps scenery stairs out of declared playable floors",async()=>{
    const {document,group}=fixture();group.group("background",{origin:[30,20,0]}).staircase("escape",{floors:3,usage:"scenery",material:"default",railingMaterial:"default"});
    const level=await compile(document);assert.equal(level.floors.length,1);assert.equal(level.navigation!.passed,true);
  });
  it("rejects duplicate operations, invalid repetitions and windows outside their bays",()=>{
    const s=new SceneBuilder("city"),g=s.group("west");assert.throws(()=>s.group("west"),/Duplicate/);
    g.platform("deck",{width:4,depth:4,material:"default"});assert.throws(()=>g.platform("deck",{width:4,depth:4,material:"default"}),/Duplicate/);
    assert.throws(()=>g.staircase("bad",{floors:0,usage:"playable",material:"default"}),/Stair floors/);
    const b=g.building("tower",{size:[5,5,10],usage:"scenery",material:"default"});
    assert.throws(()=>b.facade("south",{rows:2,columns:3,window:[4,2],material:"default"}),/fit within/);
  });
});
