import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {ClipContext,ClippingError,polygonArea} from "../src/vector/clipping.ts";
import {compile,createDocument,parseLevelSvgx,serializeLevelSvgx,bakeNavmesh,validateForRuntime,toRuntime,type LevelDocument,type V3} from "../src/vector/index.ts";
import {auditNavigationCoverage} from "../src/vector/navigation-coverage.ts";
import {movementLevel,repairWaterPrecision} from "../src/vector/movement.ts";

const square:V3[]=[[0,0,3],[10,0,3],[10,10,3],[0,10,3]];
function rectangle(d:LevelDocument,id:string,x:number,y:number,w:number,h:number,z:number,water=false) {
  const vertices=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y],i)=>({id:id+i,x,y,z}));
  const edges=vertices.map((v,i)=>({id:id+"e"+i,from:v.id,to:vertices[(i+1)%4].id,kind:"open" as const,openings:[]}));
  d.layers.push({id,vertices,edges,regions:[{id:id+"region",boundary:edges.map(e=>e.id),holes:[],interior:[],creases:[],fill:water?"water":"floor"}]});
}
function lake(overhang=0) {
  const d=createDocument("repair-test");d.validation="premap";
  rectangle(d,"bed",0,0,10,10,0);rectangle(d,"water",0,0,10+overhang,10,3,true);return d;
}
describe("bounded clipping and automatic repairs",()=>{
  it("normalizes redundant points idempotently without changing elevation or winding",()=>{
    const c=new ClipContext(),p:V3[]=[[0,0,3],[0,0,3],[5,0,3],[10,0,3],[10,10,3],[0,10,3],[0,0,3]];
    const clean=c.normalize(p);
    assert.deepEqual(clean,square);assert.deepEqual(c.normalize(clean),clean);assert.equal(polygonArea(clean),100);
    assert.ok(c.repairs.some(r=>r.code==="CLIP_NORMALIZED"));
    assert.deepEqual(c.normalize([...square].reverse()),[...square].reverse());
  });
  it("does not fragment on nonoverlap, coincident masks, or repeated subtraction",()=>{
    const c=new ClipContext();let pieces=[square];
    const absent:V3[]=[[20,0,3],[21,0,3],[21,1,3],[20,1,3]];
    for(let i=0;i<1000;i++)pieces=c.subtractMany(pieces,absent);
    assert.deepEqual(pieces,[square]);assert.deepEqual(c.subtract(square,[...square].reverse()),[]);
    const strip:V3[]=[[4,-1,3],[6,-1,3],[6,11,3],[4,11,3]];
    pieces=c.subtractMany(pieces,strip);
    for(let i=0;i<100;i++)pieces=c.subtractMany(pieces,strip);
    assert.equal(pieces.length,2);assert.equal(pieces.reduce((a,p)=>a+polygonArea(p),0),80);
  });
  it("retains thin fragments and intersections arbitrarily near an endpoint",()=>{
    const c=new ClipContext();const thin=c.clip(square,p=>1e-6-p[0]);
    assert.ok(Math.abs(polygonArea(thin)-1e-5)<1e-10);
    const near=c.clip([[0,0,0],[1,0,0],[1,1,0]],p=>1-1e-10-p[0]);
    assert.ok(Math.abs(polygonArea(near)-.5)<1e-8);
    const sliver:V3[]=[[0,0,0],[10,0,0],[10,1e-8,0]];
    assert.doesNotThrow(()=>c.subtract(sliver,[[0,-1,0],[5,-1,0],[5,1,0],[0,1,0]]));
  });
  it("reports convexity and finiteness failures with source identity",()=>{
    const c=new ClipContext();c.begin("bad-region",{line:5,column:2,offset:10});
    assert.throws(()=>c.normalize([[0,0,0],[2,0,0],[1,.5,0],[2,2,0],[0,2,0]]),e=>e instanceof ClippingError && e.diagnostic.code==="CLIP_INVARIANT" && e.diagnostic.objects[0]==="bad-region" && e.diagnostic.source?.line===5);
    assert.throws(()=>c.normalize([[0,0,0],[1,0,NaN],[0,1,0]]),ClippingError);
    const star=[0,2,4,1,3].map(i=>[Math.cos(i*2*Math.PI/5),Math.sin(i*2*Math.PI/5),0] as V3);
    assert.throws(()=>c.normalize(star),ClippingError);
    assert.throws(()=>c.normalize([[0,0,0],[2,2,0],[0,2,0],[2,0,0]]),ClippingError);
  });
  it("checks fragment and vertex limits before growth and honors cancellation",()=>{
    const strip:V3[]=[[4,-1,3],[6,-1,3],[6,11,3],[4,11,3]];
    const c=new ClipContext({clippingLimits:{fragmentsPerTriangle:1}});c.begin("channel");
    assert.throws(()=>c.subtract(square,strip),e=>e instanceof ClippingError && e.diagnostic.code==="CLIP_COMPLEXITY_LIMIT");
    assert.throws(()=>new ClipContext({clippingLimits:{intermediateVerticesPerTriangle:3}}).normalize(square),ClippingError);
    const small=new ClipContext({clippingLimits:{generatedVertices:3}});assert.throws(()=>small.allocate(4),ClippingError);
    assert.throws(()=>new ClipContext({clippingLimits:{generatedVertices:Infinity}}),RangeError);
    const controller=new AbortController(), cancelled=new ClipContext({signal:controller.signal});controller.abort();
    assert.throws(()=>cancelled.subtract(square,strip),e=>(e as Error).name==="AbortError");
    const during=new AbortController(),active=new ClipContext({signal:during.signal});let calls=0;
    assert.throws(()=>active.clip(square,p=>{if(++calls===2)during.abort();return 5-p[0];}),e=>(e as Error).name==="AbortError");
  });
  it("automatically trims only millimetre shoreline slivers and exports repairs",async()=>{
    const l=await compile(lake(.001));
    assert.deepEqual(l.diagnostics,[]);assert.equal(l.waterNavigation?.passed,true);
    assert.ok(l.repairs?.some(r=>r.code==="WATER_SHORELINE_SNAPPED"));
    assert.ok(l.water![0].points.every(p=>p[0]<=10+1e-8));
    assert.deepEqual(toRuntime(l).repairs,l.repairs);
    const before=JSON.stringify(l.water);repairWaterPrecision(l);assert.equal(JSON.stringify(l.water),before);
    const bad=await compile(lake(.01));assert.equal(bad.waterNavigation?.passed,false);
    assert.ok(bad.waterNavigation?.diagnostics.some(d=>d.code==="WATER_DEPTH_UNKNOWN" && d.severity==="error"));
    const shallow=lake();shallow.boat={radius:1,height:2,draft:4};
    const draft=await compile(shallow);assert.equal(draft.waterNavigation?.passed,false);
    assert.ok(draft.waterNavigation?.diagnostics.some(d=>d.code==="WATER_DRAFT"));
  });
  it("audits clipped shoreline margins while retaining unexplained interior gaps",async()=>{
    const d=createDocument("shore-margin");d.validation="premap";
    rectangle(d,"ground",0,0,10,10,0);
    d.layers[0].vertices[1].z=2;d.layers[0].vertices[2].z=2;
    rectangle(d,"water",0,0,5,10,1,true);
    const prepared=movementLevel(await compile(d,{navigation:false}),{});
    const coverage=auditNavigationCoverage(prepared,{},at=>at[0]>5.5?{position:at,reachable:true}:undefined);
    assert.equal(coverage.uncoveredCount,0);
    const missing=auditNavigationCoverage(prepared,{},()=>undefined);
    assert.ok(missing.uncovered.some(s=>s.position[0]>7&&s.position[1]>3&&s.position[1]<7));
  });
  it("automatically bounds detail processing on broad rolling terrain",async()=>{
    const d=createDocument("rolling-terrain");d.validation="premap";
    rectangle(d,"terrain",0,0,48,48,0);
    const layer=d.layers[0];
    for(let x=2;x<48;x+=2)for(let y=2;y<48;y+=2){
      const id=`p${x}_${y}`;
      layer.vertices.push({id,x,y,z:x>4&&x<44&&y>4&&y<44?.35*(Math.sin(x*Math.PI/3)+Math.sin(y*Math.PI/3)):0});
      layer.regions[0].interior.push(id);
    }
    const l=await compile(d);
    assert.equal(l.navigation?.coverage.uncoveredCount,0,JSON.stringify(l.navigation?.coverage.uncovered));
    assert.equal(l.navigation?.passed,true);
    assert.ok(l.repairs?.some(r=>r.code==="NAV_SPATIAL_SUBDIVISION"));
    const limit=l.mesh.positions.length/3+1;
    await assert.rejects(bakeNavmesh(l,{clippingLimits:{generatedVertices:limit}}),e=>e instanceof ClippingError&&e.diagnostic.code==="CLIP_COMPLEXITY_LIMIT");
    assert.equal(l.navigation,undefined);
    assert.equal((await bakeNavmesh(l)).passed,true);
    assert.equal(l.repairs?.filter(r=>r.code==="NAV_SPATIAL_SUBDIVISION").length,1);
    const repairs=JSON.stringify(l.repairs);await bakeNavmesh(l);assert.equal(JSON.stringify(l.repairs),repairs);
  });
  it("preserves typed compiler failures and can successfully retry without a partial cache",async()=>{
    const l=await compile(lake(),{navigation:false});
    await assert.rejects(bakeNavmesh(l,{movement:"water",clippingLimits:{generatedVertices:1}}),ClippingError);
    assert.equal(l.waterNavigation,undefined);
    assert.equal((await bakeNavmesh(l,{movement:"water"})).passed,true);
    const failed=await compile(lake(),{navigation:{clippingLimits:{generatedVertices:1}}});
    assert.ok(failed.mesh.indices.length>0);assert.ok(failed.diagnostics.some(d=>d.code==="CLIP_COMPLEXITY_LIMIT"));
    const runtime=await validateForRuntime(l,{clippingLimits:{generatedVertices:1}});
    assert.equal(runtime.passed,false);assert.ok(runtime.diagnostics.some(d=>d.code==="CLIP_COMPLEXITY_LIMIT"));
  });
});
describe("static premaps and strict playable documents",()=>{
  it("uses the same slope cutoff for coverage and Recast, including wholly blocked maps",async()=>{
    const d=createDocument("slope-cutoff");d.validation="premap";
    rectangle(d,"slope",0,0,10,10,0);
    d.layers[0].vertices[1].z=9.005;d.layers[0].vertices[2].z=9.005;
    const l=await compile(d);
    assert.ok((l.navigation!.coverage.blockedByReason?.slope??0)>0);
    assert.equal(l.navigation!.coverage.uncoveredCount,0);
    assert.equal(l.navigation!.passed,true);
  });
  it("round trips the explicit contract, preserves legacy defaults, and invalidates caches",async()=>{
    const d=createDocument("islands");rectangle(d,"a",0,0,10,10,0);rectangle(d,"b",30,0,10,10,0);
    const l=await compile(d);assert.equal(l.navigation!.passed,false);
    const key=l.navigation!.settings.cacheKey;l.document.validation="premap";
    const nav=await bakeNavmesh(l);assert.equal(nav.passed,true);assert.equal(nav.components,2);assert.notEqual(nav.settings.cacheKey,key);
    assert.deepEqual(nav.diagnostics,[]);
    assert.equal(parseLevelSvgx(serializeLevelSvgx(l.document)).validation,"premap");
    assert.equal(parseLevelSvgx('<level version="2" id="legacy"/>').validation,"playable");
    const report=await validateForRuntime(l);assert.equal(report.passed,true);assert.equal(report.gameplayReachabilityVerified,false);
  });
  it("classifies steep ground and low clearance as blocked but still rejects explicit routes",async()=>{
    const d=createDocument("obstacles");d.validation="premap";
    rectangle(d,"flat",0,0,20,10,0);rectangle(d,"roof",8,0,4,10,1);
    rectangle(d,"steep",30,0,10,10,0);d.layers[2].vertices[1].z=20;d.layers[2].vertices[2].z=20;
    const l=await compile(d);assert.ok((l.navigation!.coverage.blockedCount??0)>0);
    assert.ok((l.navigation!.coverage.blockedByReason?.slope??0)>0);
    assert.ok((l.navigation!.coverage.blockedByReason?.headroom??0)>0);
    l.document.markers=[{id:"a",kind:"poi",layer:"flat",position:[2,5,0]},{id:"b",kind:"poi",layer:"flat",position:[18,5,0]}];
    l.document.routes=[{id:"underpass",from:"a",to:"b",minRoutes:1}];
    assert.equal((await bakeNavmesh(l)).routes[0].reachable,false);
    assert.ok((await validateForRuntime(l)).diagnostics.some(d=>d.code==="ROUTE_REQUIREMENT"));
  });
});
