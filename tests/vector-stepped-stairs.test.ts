import { test } from "node:test";
import assert from "node:assert/strict";
import manifold from "manifold-3d";
import { Ray, Triangle, Vector3 } from "three";
import { ArchitectureBuilder, compile, parseAml, serializeAml, parseGLBGeometry, toGLB, validateForRuntime, type CompiledLevel, type V3 } from "levelspec";

/** Independent straight fixture: width2/run2, equalized climb, editable semantic treads. */
function fixture(climb = .6, rise = .2, thickness = .25) {
  const scene=new ArchitectureBuilder('stepped-stairs');scene.document.validation='premap';scene.path('axis',[[1,0,0],[1,2,climb]]);const region=scene.stairs('stairs/flight',{path:'axis',width:2,count:Math.ceil(climb/rise),thickness,underside:'stepped'});return {scene,region};
}

/** Open stair sides request architectural review without invalidating the tested solid geometry. */
function assertOnlyOpenSideWarnings(level: CompiledLevel) {
  assert.ok(level.diagnostics.every(diagnostic => diagnostic.severity === "warning" && diagnostic.code === "FLIGHT_OPEN_SIDE"), JSON.stringify(level.diagnostics));
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
  assertOnlyOpenSideWarnings(level);
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
    assertOnlyOpenSideWarnings(level);
    const g=parseGLBGeometry(toGLB(level));assert.ok(await solidVolume(g.positions,g.triangles)>0);
  }
  for(const thickness of [.2,.199]){
    const {scene}=fixture(.6,.2,thickness);const level=await compile(parseAml(serializeAml(scene.document)),{navigation:false});
    assert.equal(level.mesh.indices.length,0);
    assert.ok(level.diagnostics.some(d=>d.severity==="error"&&d.objects.includes("stairs/flight")&&d.source?.line&&/thickness|riser/i.test(d.message)));
  }
});

test("native XML retains stepped and explicit filled/sloped underside descriptions",async()=>{
  const {scene,region}=fixture();assert.equal(parseAml(serializeAml(scene.document)).elements.find(e=>e.id==='stairs/flight')!.kind,'stairs');
  for(const [mode,bottom]of [['filled',-.25],['sloped',.05]]as const){region.underside=mode;const level=await compile(scene.document,{navigation:false});assertOnlyOpenSideWarnings(level);assert.ok(Math.abs(verticalHit(level,1,1,true)-bottom)<1e-6);}
});

test("native stepped stair landings preserve exact physical support and connected navigation",async()=>{
  const {scene}=fixture();for(const [id,y,z]of [['lower',-1,0],['upper',2,.6]]as const){const p=scene.profile(id+':profile',[[0,y,z],[2,y,z],[2,y+1,z],[0,y+1,z]]);scene.slab('stairs/'+id,p.id,{thickness:.25});}scene.assembly('physical',[...scene.document.elements]);scene.document.markers.push({id:'spawn',layer:'architecture',region:'stairs/lower',position:[1,-.5,0],kind:'spawn'});
  const level=await compile(scene.document,{navigation:false,surfaceContacts:'error',floorGaps:'error'});assertOnlyOpenSideWarnings(level);const report=await validateForRuntime(level);assert.equal(report.passed,true,JSON.stringify(report.diagnostics));assert.ok(report.navigation!.reachableRegions.includes('stairs/upper'));
});

test("curved paired stepped rails remain closed Float32 solids in either authored direction",async()=>{
  for(const reversed of [false,true]){
    const b=new ArchitectureBuilder('curved-steps');for(const [id,r]of [['left',2],['right',4]]as const){const path=b.path(id,[[r,0,0]],{segments:[{kind:'arc',center:[0,0,0],radii:[r,r],start:0,sweep:90,rotation:0}],elevation:[0,1.2]});if(reversed){b.path(id+'-reverse',[],{paths:['-'+path.id]});}}
    b.stairs('flight',{left:reversed?'right-reverse':'left',right:reversed?'left-reverse':'right',count:6,thickness:.25,underside:'stepped'});const level=await compile(b.document,{navigation:false});assertOnlyOpenSideWarnings(level);const g=parseGLBGeometry(toGLB(level));assert.ok(await solidVolume(g.positions,g.triangles)>0);
  }
});

test("actual stepped soffits preserve an underpass that filled construction obstructs",async()=>{
  for(const underside of ['stepped','filled']as const){const b=new ArchitectureBuilder('underpass');b.document.validation='premap';b.path('axis',[[1,0,0],[1,6,3]]);b.stairs('flight',{path:'axis',width:2,count:15,thickness:.25,underside});const p=b.profile('underpass',[[ -2,5,0],[4,5,0],[4,6.5,0],[-2,6.5,0]]);b.slab('ground',p.id);b.document.markers=[{id:'start',kind:'spawn',layer:'architecture',position:[-1,5.8,0]},{id:'end',kind:'objective',layer:'architecture',position:[3,5.8,0]}];b.document.routes=[{id:'cross',from:'start',to:'end',minRoutes:1,maxDistance:6}];const level=await compile(b.document);assert.equal(level.navigation!.routes[0].reachable,underside==='stepped');}
});
