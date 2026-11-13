import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Matrix4, Vector3 } from "three";
import { compile, parseAml, serializeAml, collisionMesh, POSTER_DESIGNS, toGLB, resolveExportAssets } from "levelspec";
import { validateBytes } from "gltf-validator";
import { drawPoster } from "../src/dressing/posters.ts";
import { kitFinishes } from "../src/dressing/kit.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { roast } from "../src/dressing/kowloon/shop/roast.ts";
import { Pen } from "../src/dressing/pen.ts";

type Level = Awaited<ReturnType<typeof compile>>;

/** Isolated painted wall with independently authored paper dressing, no wall finish recipe. */
function source(posters = '<poster id="ad" host="wall" face="front" at="1 1.5" width=".4" design="calendar"/>', extra = "", placement = "") {
  return `<architecture version="1" id="poster-test" validation="premap">
    <material id="wall-paint" color="#7d918b"/>
    <material id="art-wall-posters" color="#ffffff" repeat="7" roughness=".96" texture="atlas.jpg"/>
    <path id="axis" points="0 0 0; 4 0 0"/>
    <wall id="wall" path="axis" thickness=".2" height="3" material="wall-paint" ${placement}/>
    ${extra}<dressing seed="posters" finishes="art">${posters}</dressing>
  </architecture>`;
}

/** Reads only visible poster triangles through compiled surface material bindings. */
function faces(level: Level) {
  return level.mesh.surfaces.flatMap((surfaceId, t) => {
    const surface = level.surfaces[surfaceId];
    if (surface.kind !== "prop" || surface.material !== "art-wall-posters") return [];
    const indices = level.mesh.indices.slice(t*3,t*3+3);
    return [{surface, points: indices.map(i => new Vector3(...level.mesh.positions.slice(i*3,i*3+3))),
      uv: indices.map(i => level.mesh.uv.slice(i*2,i*2+2)), normal: new Vector3(...level.mesh.normals.slice(indices[0]*3,indices[0]*3+3))}];
  });
}

/** Checks actual world directions for increasing artwork U/V independently of the mapping implementation. */
function readable(level: Level) {
  for (const face of faces(level)) {
    const [a,b,c] = face.points, [ta,tb,tc] = face.uv;
    const du1=tb[0]-ta[0],dv1=tb[1]-ta[1],du2=tc[0]-ta[0],dv2=tc[1]-ta[1];
    const determinant=du1*dv2-du2*dv1;
    assert.ok(Math.abs(determinant)>1e-8);
    const p=b.clone().sub(a),q=c.clone().sub(a);
    const right=p.clone().multiplyScalar(dv2).addScaledVector(q,-dv1).divideScalar(determinant).normalize();
    const up=q.clone().multiplyScalar(du1).addScaledVector(p,-du2).divideScalar(determinant).normalize();
    const screenRight=new Vector3(0,0,1).cross(face.normal).normalize();
    assert.ok(right.dot(screenRight)>.96,"Printed text must read left-to-right from the outward side");
    assert.ok(up.z>.96,"Printed text must stay upright, allowing authored tilt");
    assert.ok(p.clone().cross(q).dot(face.normal)>0,"Triangles face the viewer");
    assert.equal(face.surface.collidable,false);
    assert.equal(face.surface.domain,"visualization");
  }
}

test("AML posters round-trip, preserve physical walls, and read correctly on opposite transformed faces", async () => {
  for (const face of ["front","back"] as const) for (const transform of ["",'position="3 4 0" rotation="0 0 35"']) {
    const input=source(`<poster id="ad" host="wall" face="${face}" at="1 1.5" width=".4" design="calendar"/>`,"",transform);
    const document=parseAml(input),snapshot=structuredClone(document),roundtrip=parseAml(serializeAml(document));
    assert.equal(roundtrip.dressing!.posters![0].design,"calendar");
    assert.deepEqual(roundtrip.dressing!.posters![0].at,[1,1.5]);
    const withArt=await compile(document,{navigation:false});
    const baseline=parseAml(input);baseline.dressing=undefined;
    const without=await compile(baseline,{navigation:false});
    assert.deepEqual(collisionMesh(withArt),collisionMesh(without));
    assert.equal(faces(withArt).length,6);
    readable(withArt);
    assert.deepEqual(document,snapshot);
    const points=faces(withArt).flatMap(f=>f.points);
    const inverse = transform ? new Matrix4().makeTranslation(3,4,0).multiply(new Matrix4().makeRotationZ(35*Math.PI/180)).invert() : new Matrix4();
    const local = points.map(p=>p.clone().applyMatrix4(inverse));
    for (const point of local) assert.ok(Math.abs(point.y-(face==="front"?-.102:.102))<1e-4,"Paper attaches 2 mm from the selected side");
    const center = (Math.min(...local.map(p=>p.x))+Math.max(...local.map(p=>p.x)))/2;
    assert.ok(Math.abs(center-(face==="front"?1:3))<1e-4,"Authored screen-right center is retained");
    const right=new Vector3(0,0,1).cross(faces(withArt)[0].normal).normalize();
    const xs=points.map(p=>p.dot(right)),zs=points.map(p=>p.z);
    assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-.4)<1e-4);
    assert.ok(Math.abs(Math.max(...zs)-Math.min(...zs)-.6)<1e-4);
    assert.ok(Math.abs((Math.max(...zs)+Math.min(...zs))/2-1.5)<1e-4);
    const again=await compile(roundtrip,{navigation:false});
    assert.deepEqual(again.mesh,withArt.mesh);
  }
});

test("wall-local posters retain correct text under reflected and rotated frames", async () => {
  for (const reflected of [false,true]) {
    const level=await compile(parseAml(source("")),{navigation:false});
    const mesh=new KitMesh(level,"wall","props",kitFinishes(level,"art","wall-paint").materials,{maximumTriangles:10000});
    const frame=new Matrix4().makeRotationZ(.7).multiply(new Matrix4().makeScale(reflected?-1:1,1,1));
    drawPoster(new Pen(mesh,"poster/native",frame,false),{design:"film",width:.3,rotation:12,wear:1});
    assert.equal(faces(level).length,6);readable(level);
    for (const {uv} of faces(level)) for (const [u,v] of uv) {
      assert.ok(u>2/4+16/2048&&u<3/4-16/2048);
      assert.ok(v>1/4+24/3072&&v<2/4-24/3072);
    }
  }
});

test("explicit posters reject openings, rotated overhang, missing hosts/materials and invalid controls", async () => {
  const invalids=[
    source('<poster id="a" host="missing" at="1 1.5"/>'),
    source('<poster id="a" host="wall" at=".18 1.5" width=".3" rotation="15"/>'),
    source('<poster id="a" host="wall" at="1 1.5" width="0"/>'),
    source('<poster id="a" host="wall" at="1 1.5" rotation="16"/>'),
    source('<poster id="a" host="wall" at="1 1.5" wear="-1"/>'),
    source('<poster id="a" host="wall" at="1 1.5"/><poster id="a" host="wall" at="2 1.5"/>'),
    source().replace('texture="atlas.jpg"',''),
    source(undefined,'<opening id="hole" host="wall" center="1 1.5" width=".1" height=".08"/>'),
    source(undefined,"",'visible="false"'),
  ];
  for (const input of invalids) {
    const level = await compile(parseAml(input),{navigation:false});
    assert.ok(level.diagnostics.some(d=>d.code==="AML_POSTER"&&d.objects?.length&&d.source),input);
  }
  assert.throws(()=>parseAml(source('<poster id="a" host="wall" at="1 1.5" design="nonsense"/>')));
});

test("all 16 designs share one padded texture in a valid GLB", async () => {
  const rules=POSTER_DESIGNS.map((design,i)=>`<poster id="p${i}" host="wall" at="${.35+(i%8)*.46} ${.65+Math.floor(i/8)*1.3}" width=".25" design="${design}"/>`).join("");
  const level=await compile(parseAml(source(rules)),{navigation:false});
  assert.equal(faces(level).length,16*6);readable(level);
  const manifest=JSON.parse(await readFile("projects/kowloon-posters/atlas.json","utf8"));
  for (const [index,design] of POSTER_DESIGNS.entries()) {
    const {cell:[column,row]}=manifest.posters.find((item:{id:string})=>item.id===design);
    const triangles=faces(level).filter(f=>f.surface.object.endsWith(`/p${index}`));
    assert.equal(triangles.length,6,design);
    for (const {uv} of triangles) for (const [u,v] of uv) {
      assert.ok(u >= (column*512+16)/2048 && u <= (column*512+496)/2048,design+" horizontal padding");
      assert.ok(v >= 1-(row*768+744)/3072 && v <= 1-(row*768+24)/3072,design+" vertical padding");
    }
  }
  const bytes=await readFile("projects/kowloon-posters/textures/posters-atlas.jpg");
  const assets=await resolveExportAssets(level,async()=>bytes);
  const glb=toGLB(level,{assets});
  assert.equal((await validateBytes(glb)).issues.numErrors,0);
  const buffer=Buffer.from(glb),json=JSON.parse(buffer.toString("utf8",20,20+buffer.readUInt32LE(12)));
  assert.equal(json.images.length,1,"Repeated artwork shares one embedded atlas");
});


test("posters coexist with wall dressing and preserve authored wear and tilt", async () => {
  const document=parseAml(source('<wall host="wall" face="front" material="wall-paint" windows="false" tile-share="0"/><poster id="tilted" host="wall" face="back" at="2 1.5" design="hiring" width=".4" rotation="-7" wear=".8"/>'));
  const result=parseAml(serializeAml(document));
  assert.equal(result.dressing!.posters![0].rotation,-7);
  assert.equal(result.dressing!.posters![0].wear,.8);
  const level=await compile(result,{navigation:false});
  assert.deepEqual(level.diagnostics,[]);assert.equal(faces(level).length,6);readable(level);
});

test("native side faces and production shop layouts use supported, contained poster geometry", async () => {
  for (const side of ["left","right"]) {
    const xml=source(`<poster id="side" host="wall" face="${side}" at="1 1.5" design="laundry" width=".3"/>`)
      .replace(/<wall id="wall"[^>]*\/>/,'<box id="wall" width="4" depth="3" height="3" material="wall-paint"/>');
    const level=await compile(parseAml(xml),{navigation:false});
    assert.deepEqual(level.diagnostics,[]);assert.equal(faces(level).length,6);readable(level);
    for(const f of faces(level)) for(const point of f.points) assert.ok(Math.abs(point.x-(side==="left"?-.002:4.002))<1e-4);
  }
  for (const width of [1.8,3.6]) for (const seed of ["restaurant-8","restaurant-13"]) for (const mirror of [false,true]) {
    const level=await compile(parseAml(source("")),{navigation:false});
    const matrix=new Matrix4().makeScale(mirror?-1:1,1,1);
    const mesh=new KitMesh(level,"wall","props",kitFinishes(level,"art","wall-paint").materials,{maximumTriangles:100000});
    roast.furnish({pen:new Pen(mesh,"shop-roast",matrix,mirror),width,depth:2.9,height:2.6,kit:new Kit(seed,2,.6,.3,false),key:"study"});
    assert.equal(faces(level).length,18);readable(level);
    for(const f of faces(level)) for(const p of f.points) {
      const point=p.clone().applyMatrix4(matrix.clone().invert());
      assert.ok(point.x>=0&&point.x<=width&&point.y>=0&&point.y<=2.9&&point.z>1.5&&point.z<2.6,"Posters stay on the reserved upper side-wall area");
      assert.ok(Math.min(point.x,width-point.x)<.009,"Paper remains attached to a wall");
    }
  }
});

test("overlapping paper uses explicit layer clearance and invalid placements expose spatial review targets", async () => {
  const pair='<poster id="a" host="wall" at="1 1.5" width=".3" design="calendar"/><poster id="b" host="wall" at="1.08 1.55" width=".3" design="hiring" layer="1"/>';
  const parsed=parseAml(source(pair));
  assert.equal(parseAml(serializeAml(parsed)).dressing!.posters![1].layer,1);
  const level=await compile(parsed,{navigation:false});
  assert.deepEqual(level.diagnostics,[]);assert.equal(faces(level).length,12);
  const planes=new Set(faces(level).map(f=>f.points[0].y.toFixed(4)));
  assert.deepEqual(planes,new Set(['-0.1020','-0.1026']));
  const rejected=await compile(parseAml(source(pair.replace('layer="1"','layer="0"'))),{navigation:false});
  const diagnostic=rejected.diagnostics.find(d=>d.code==='AML_POSTER_OVERLAP');
  assert.equal(diagnostic?.severity,"warning");
  assert.equal(faces(rejected).length,12,"A conservative overlap finding requests review without deleting artwork");
  assert.ok(diagnostic?.review?.bounds&&diagnostic.review.position&&diagnostic.source);
  for (const width of [NaN,Infinity,-1]) {
    const document=parseAml(source());document.dressing!.posters![0].width=width;
    assert.ok((await compile(document,{navigation:false})).diagnostics.some(d=>d.code==='AML_POSTER'));
  }
  const document=parseAml(source());document.dressing!.posters![0].at=[NaN,1];
  assert.ok((await compile(document,{navigation:false})).diagnostics.some(d=>d.code==='AML_POSTER'));
  const bent=source().replace('0 0 0; 4 0 0','0 0 0; 2 0 0; 2 1 0; 4 1 0');
  assert.ok((await compile(parseAml(bent),{navigation:false})).diagnostics.some(d=>d.code==='AML_POSTER'&&d.review));
});

test("automatic plain-wall notices use the shared four-by-four atlas without repeating the artwork", async () => {
  const xml=source('<wall host="wall" material="wall-paint" face="back" windows="false" tile-share="0"/>').replace('4 0 0','16 0 0');
  const level=await compile(parseAml(xml),{navigation:false});
  assert.deepEqual(level.diagnostics,[]);
  const uvGroups=new Map<number,number[][]>();
  for (const [t,surfaceId] of level.mesh.surfaces.entries()) {
    const surface=level.surfaces[surfaceId];
    if(surface.material!=="$kowloon/wall-posters")continue;
    const coordinates=level.mesh.indices.slice(t*3,t*3+3).map(i=>level.mesh.uv.slice(i*2,i*2+2));
    const cell=coordinates.map(([u,v])=>`${Math.floor(u*4)},${Math.floor(v*4)}`);
    assert.equal(new Set(cell).size,1,"One printed triangle stays inside one padded design");
    uvGroups.set(surfaceId,[...(uvGroups.get(surfaceId)??[]),...coordinates]);
  }
  assert.ok(uvGroups.size>0,"The normal wall recipe receives the new artwork");
});
