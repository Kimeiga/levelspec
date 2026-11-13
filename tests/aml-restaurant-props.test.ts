import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Matrix4, Vector3, Ray, Box3, Triangle } from "three";
import { PNG } from "pngjs";
import { collisionMesh, compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import { validateBytes } from "gltf-validator";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { KitMesh } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { roast } from "../src/dressing/kowloon/shop/roast.ts";
import { hangingChicken, slicedMeat } from "../src/dressing/kowloon/shop/restaurant-food.ts";
import foodCatalog from "../src/dressing/kowloon/shop/assets/restaurant-food.json" with { type: "json" };
import timberAtlas from "../src/dressing/kowloon/shop/assets/shop-timber.json" with { type: "json" };
import { grocerAssetTriangles, groundedTriangles, connectedBodies } from "./support/grocer-assets.ts";
import { Rng } from "../src/generate/rng.ts";
import { meatTray, takeawayStack, restaurantCounter, restaurantSteelTop, restaurantWorkBench } from "../src/dressing/kowloon/shop/restaurant-fittings.ts";
import { kitchenTiles } from "../src/dressing/kowloon/shop/restaurant-surfaces.ts";
import { counterTowel } from "../src/dressing/kowloon/shop/restaurant-work-details.ts";
import { choppingBlock } from "../src/dressing/kowloon/shop/chopping-block.ts";

const ROOMS = [[2.82,2.7,2.6],[3.6,2.4,2.08],[1.8,2.4,2.08],[2.2,2.9,2.48],[3.6,2.9,2.08],[3.6,3.6,2.6]];
const FRAME = new Matrix4().makeTranslation(4,-2,.5).multiply(new Matrix4().makeRotationZ(.63)).multiply(new Matrix4().makeScale(-1,1,1));

/** Builds real stock against a physical floor, retaining its collision snapshot before any decoration. */
async function fixture(frame = new Matrix4(), tiles = false, brushed = false) {
  const level = await compile(parseAml(`<architecture version="1" id="restaurant-test">
    <material id="plain" color="#ffffff"/>
    ${brushed ? '<material id="stock-brushed-metal" color="#ffffff" repeat="2" roughness="1" metalness="1" texture="brushed-metal.png" normal-texture="brushed-metal-normal.png" metallic-roughness-texture="brushed-metal-properties.png"/>' : ""}
    ${tiles ? '<material id="stock-restaurant-tiles" color="#ffffff" roughness="1" metalness="1" texture="restaurant-tiles.png" normal-texture="restaurant-tiles-normal.png" metallic-roughness-texture="restaurant-tiles-properties.png"/>' : ""}
    <material id="stock-restaurant-surfaces" color="#ffffff" roughness="1" metalness="1" texture="restaurant-surfaces.png" metallic-roughness-texture="restaurant-surfaces-properties.png"/>
    <material id="stock-restaurant-food" color="#ffffff" roughness="1" metalness="1" texture="restaurant-food.png" normal-texture="restaurant-food-normal.png" metallic-roughness-texture="restaurant-food-properties.png"/>
    <material id="stock-grocer-props" color="#ffffff" texture="grocer-props.png"/>
    <material id="stock-shop-timber" color="#ffffff" texture="shop-timber.png"/>
    <box id="floor" position="0 0 -0.1" width="4" depth="4" height="0.1" material="plain"/>
  </architecture>`),{navigation:false});
  const physics = hash(collisionMesh(level));
  kitMaterials(level);level.mesh.colors ??= level.mesh.positions.map(()=>1);
  const mesh = new KitMesh(level,"restaurant","props",kitFinishes(level,"stock","plain").materials,{maximumTriangles:60000});
  return {level,physics,pen:new Pen(mesh,"shop-roast",frame,frame.determinant()<0),first:level.mesh.indices.length};
}

/** Fingerprints observable mesh or collision values without large assertion diagnostics. */
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

/** Extracts generated triangles and all corner attributes independently of surface allocation. */
function triangles(level: Awaited<ReturnType<typeof compile>>, first: number) {
  const result=[];
  for(let i=first;i<level.mesh.indices.length;i+=3)result.push(level.mesh.indices.slice(i,i+3).map(index=>({
    material:level.surfaces[level.mesh.surfaces[i/3]].material,
    p:level.mesh.positions.slice(index*3,index*3+3),n:level.mesh.normals.slice(index*3,index*3+3),
    uv:level.mesh.uv.slice(index*2,index*2+2),c:level.mesh.colors!.slice(index*3,index*3+3),
  })));
  return result;
}

test("restaurant stock fits minimum rooms, ceilings and mirrored hosts without changing physics",async()=>{
  for(const [width,depth,height] of ROOMS)for(const frame of [new Matrix4(),FRAME])for(let seed=0;seed<4;seed++){
    const {level,physics,pen,first}=await fixture(frame);
    roast.furnish({pen,width,depth,height,kit:new Kit(`restaurant-${seed}`,2,.6,.3,false),key:"test"});
    const faces=triangles(level,first), inverse=frame.clone().invert();
    assert.ok(level.surfaces.some(surface=>surface.material==="stock-restaurant-food"),"Restaurant lost its food display");
    assert.ok(level.surfaces.some(surface=>surface.material==="stock-restaurant-surfaces"),"Restaurant lost its working surfaces");
    assert.ok(faces.length>3000&&faces.length<30000,`${width}m restaurant exceeded 30k prop triangles: ${faces.length}`);
    for(const face of faces){
      const points=face.map(c=>new Vector3(...c.p));
      const cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
      assert.ok(cross.length()>1e-12,"Collapsed triangle in restaurant stock");
      const average=face.reduce((sum,c)=>sum.add(new Vector3(...c.n)),new Vector3());
      for(const corner of face) assert.ok(corner.n.every(Number.isFinite)&&Math.abs(Math.hypot(...corner.n)-1)<.001,"Invalid shading normal");
      assert.ok(cross.normalize().dot(average)>.01,"Inverted smooth normals or winding");
      for(const point of points){
        point.applyMatrix4(inverse);
        assert.ok(point.x>=-.00003&&point.y>=-.00003&&point.z>=-.00003&&point.x<=width+.00003&&point.y<=depth+.00003&&point.z<=height+.00003,
          `${width}×${depth}×${height}, seed ${seed}: stock outside room at ${point.toArray()}`);
      }
    }
    assert.equal(hash(collisionMesh(level)),physics,"Visual stock changed physical geometry");
  }
});

test("restaurant seeds repeat exactly and detail only adds geometry",async()=>{
  const emitted=[];
  for(const detail of [0,2,2]){
    const {level,pen,first}=await fixture();
    roast.furnish({pen,width:3.6,depth:2.9,height:2.6,kit:new Kit("restaurant-8",detail,.6,.3,false),key:"test"});
    emitted.push(triangles(level,first).map(hash));
  }
  assert.equal(hash(emitted[1]),hash(emitted[2]));
  const high=new Map<string,number>();
  for(const face of emitted[1]) high.set(face,(high.get(face)??0)+1);
  for(const face of emitted[0]) {
    const remaining=high.get(face)??0;
    assert.ok(remaining>0,"Raising detail moved or removed existing fittings or stock");
    high.set(face,remaining-1);
  }
});

test("food trays have a real raised floor and open interior beneath the rim",async()=>{
  const {level,pen,first}=await fixture();
  const floor=meatTray(pen,[.4,.3,.92],.34,.24);
  assert.equal(floor,.929);
  const faces=triangles(level,first);
  for(const [x,y] of [[.4,.3],[.32,.24],[.48,.36]]) {
    const ray=new Ray(new Vector3(x,y,1.1),new Vector3(0,0,-1));
    const hits=faces.flatMap(face=>{
      const hit=ray.intersectTriangle(new Vector3(...face[0].p),new Vector3(...face[1].p),new Vector3(...face[2].p),false,new Vector3());
      return hit?[hit.z]:[];
    });
    assert.ok(hits.length>0,"Tray lacks an interior support");
    assert.ok(Math.abs(Math.max(...hits)-.929)<1e-6,"Tray has an elevated cap instead of an open interior");
  }
});

test("kitchen atlas has aligned padded channels and exports one shared embedded PBR material",async()=>{
  const files=["restaurant-surfaces.png","restaurant-surfaces-properties.png"];
  const buffers=await Promise.all(files.map(file=>readFile(`projects/dressing-demo/textures/${file}`)));
  for(const bytes of buffers){
    const image=PNG.sync.read(bytes);assert.equal(image.width,512);assert.equal(image.height,512);
    for(let tile=0;tile<4;tile++)for(let row=0;row<256;row++){
      const start=((Math.floor(tile/2)*256+row)*512+tile%2*256)*4;
      assert.deepEqual(image.data.subarray(start,start+4),image.data.subarray(start+4*4,start+5*4),"Atlas edge padding differs");
    }
  }
  const {level,pen}=await fixture();
  meatTray(pen,[.4,.3,.9],.34,.24);meatTray(pen,[.8,.3,.9],.34,.24);
  hangingChicken(pen,[2,.5,1.8],1,0);
  const assets=await resolveExportAssets(level,async path=>{
    const index=files.indexOf(path);
    if(index>=0)return buffers[index];
    assert.ok(["grocer-props.png","shop-timber.png","restaurant-food.png","restaurant-food-normal.png","restaurant-food-properties.png"].includes(path),`Unexpected texture: ${path}`);
    return readFile(`projects/dressing-demo/textures/${path}`);
  });
  const glb=toGLB(level,{assets});const validation=await validateBytes(new Uint8Array(glb));
  assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
  const bytes=Buffer.from(glb);const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const materials=json.materials.filter((m:{name:string})=>m.name==="stock-restaurant-surfaces");
  assert.equal(materials.length,1);
  const pbr=materials[0].pbrMetallicRoughness;
  assert.ok(pbr.baseColorTexture&&pbr.metallicRoughnessTexture);
  assert.notEqual(pbr.baseColorTexture.index,pbr.metallicRoughnessTexture.index);
  assert.equal(pbr.roughnessFactor,1);assert.equal(pbr.metallicFactor,1);
  const binary=bytes.subarray(28+bytes.readUInt32LE(12));
  for(const [i,texture] of [pbr.baseColorTexture,pbr.metallicRoughnessTexture].entries()) {
    const image=json.images[json.textures[texture.index].source];
    assert.equal(image.uri,undefined,"Export left an external image URI");
    const view=json.bufferViews[image.bufferView],start=view.byteOffset??0;
    assert.deepEqual(binary.subarray(start,start+view.byteLength),buffers[i],"PBR channel embeds the wrong image");
  }
  const foodMaterial=json.materials.find((m:{name:string})=>m.name==="stock-restaurant-food");
  const foodTextures=[foodMaterial.pbrMetallicRoughness.baseColorTexture,foodMaterial.normalTexture,foodMaterial.pbrMetallicRoughness.metallicRoughnessTexture];
  for(const [i,texture] of foodTextures.entries()) {
    const image=json.images[json.textures[texture.index].source];
    assert.equal(image.uri,undefined);
    const view=json.bufferViews[image.bufferView],start=view.byteOffset??0;
    const expected=await readFile(`projects/dressing-demo/textures/restaurant-food${["","-normal","-properties"][i]}.png`);
    assert.deepEqual(binary.subarray(start,start+view.byteLength),expected,"Food PBR channel embeds the wrong map");
  }
});


test("food is uniformly fitted, attached to actual hook vertices and grounded inside its tray",async()=>{
  for(const frame of [new Matrix4(),FRAME]) {
    const {level,pen,first}=await fixture(frame);
    hangingChicken(pen,[.5,.5,1.8],1,2);
    const inverse=frame.clone().invert();
    const points=triangles(level,first).flatMap(face=>face.map(c=>new Vector3(...c.p).applyMatrix4(inverse)));
    assert.equal(points.length,foodCatalog.chicken.faces.length*3);
    assert.ok(points.some(point=>point.distanceTo(new Vector3(.5,.5,1.8))<.00002),"Hook tip floats above the mesh");
    assert.ok(Math.abs(Math.max(...points.map(p=>p.z))-1.8)<.00002,"Food extends above its hook");
    const height=Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z));
    assert.ok(height>.25&&height<.5,"Whole chicken lost its plausible scale");
    for(let axis=0;axis<3;axis++) {
      const span=Math.max(...points.map(p=>p.getComponent(axis)))-Math.min(...points.map(p=>p.getComponent(axis)));
      assert.ok(Math.abs(span-foodCatalog.chicken.size[axis])<.00003,"Chicken was stretched along one axis");
    }
    const start=level.mesh.indices.length;
    slicedMeat(pen,[1,.5,.929],[.30,.20,.075]);
    const pile=triangles(level,start).flatMap(face=>face.map(c=>new Vector3(...c.p).applyMatrix4(inverse)));
    assert.ok(Math.abs(Math.min(...pile.map(p=>p.z))-.929)<.00002,"Meat floats above or sinks through the tray floor");
    assert.ok(pile.every(p=>Math.abs(p.x-1)<=.151&&Math.abs(p.y-.5)<=.101&&p.z<=1.0041),"Meat leaves its tray envelope");
  }
  for(const [name,asset] of Object.entries(foodCatalog)) {
    assert.ok(asset.faces.length<=(name==="chicken"?900:500));
    for(const face of asset.faces)for(const vertex of face){
      assert.equal(vertex.length,11);assert.ok(vertex.every(Number.isFinite));
      assert.ok(vertex[6]>=0&&vertex[6]<=1&&vertex[7]>=0&&vertex[7]<=1,"Food has invalid atlas coordinates");
      assert.ok(Math.abs(Math.hypot(...vertex.slice(3,6))-1)<.001);
    }
  }
});


test("counter work and floor storage remain clear in shallow and intermediate restaurant sizes",async()=>{
  for(const [width,depth,height] of ROOMS)for(let seed=0;seed<4;seed++) {
    const {level,pen,first}=await fixture();
    roast.furnish({pen,width,depth,height,kit:new Kit(`restaurant-${seed}`,2,.6,.3,false),key:"study"});
    const faces=triangles(level,first);
    const block=faces.filter(face=>face.every(c=>c.material==="stock-restaurant-surfaces"&&c.uv[0]<.5&&c.uv[1]<.5&&c.n[2]>.99));
    assert.ok(block.length>0,"Missing chopping surface");
    const center=new Box3().setFromPoints(block.flatMap(face=>face.map(c=>new Vector3(...c.p)))).getCenter(new Vector3());
    for(const face of faces.filter(face=>face.every(c=>c.material==="stock-restaurant-surfaces"&&c.p[2]>.925&&c.p[2]<.96))) {
      const points=face.map(c=>new Vector3(c.p[0],c.p[1],0));
      const nearest=new Triangle(points[0],points[1],points[2]).closestPointToPoint(new Vector3(center.x,center.y,0),new Vector3());
      assert.ok(nearest.distanceTo(new Vector3(center.x,center.y,0))>=.1999,"A tray cuts into the chopping block");
    }
    const boxes=groundedTriangles(grocerAssetTriangles(level,"stock-box")).flat();
    const stool=groundedTriangles(grocerAssetTriangles(level,"shop-stool")).flat();
    if(boxes.length&&stool.length) {
      const intersection=new Box3().setFromPoints(boxes).intersect(new Box3().setFromPoints(stool));
      const span=intersection.getSize(new Vector3());
      assert.ok(span.x<=.00003||span.y<=.00003||span.z<=.00003,"Floor boxes intersect the stool");
    }
  }
});

test("takeaway stacks have continuous support and ceiling fans clear cooking ducts",async()=>{
  const stack=await fixture();
  takeawayStack(stack.pen,[0,0,0],new Rng(7));
  const bodies=connectedBodies(triangles(stack.level,stack.first).map(face=>face.map(c=>new Vector3(...c.p)) as [Vector3,Vector3,Vector3]));
  const intervals=bodies.map(body=>[Math.min(...body.flat().map(p=>p.z)),Math.max(...body.flat().map(p=>p.z))]).sort((a,b)=>a[0]-b[0]);
  let supported=0;
  for(const [base,top] of intervals){assert.ok(base<=supported+.00002,"A takeaway box floats above the stack");supported=Math.max(supported,top);}
  assert.ok(supported>.12,"Takeaway stack is empty");
  let fans=0;
  for(const depth of [2.4,2.9])for(let seed=0;seed<8;seed++) {
    const {level,pen,first}=await fixture();
    const height=2.6;
    roast.furnish({pen,width:3.6,depth,height,kit:new Kit(`restaurant-${seed}`,2,.6,.3,false),key:"study"});
    const faces=triangles(level,first);
    const painted=faces.filter(face=>face.every(c=>c.material==="$kowloon/paint"&&c.p[2]>height-.4&&c.p[2]<height-.15));
    const blades=connectedBodies(painted.map(face=>face.map(c=>new Vector3(...c.p)) as [Vector3,Vector3,Vector3]))
      .filter(body=>{
        const size=new Box3().setFromPoints(body.flat()).getSize(new Vector3());
        return size.z>.009&&size.z<.011&&Math.hypot(size.x,size.y)>.3;
      });
    if(!blades.length)continue;
    assert.equal(blades.length,3,"Incomplete ceiling fan blade selection");
    const fan=blades.flat(2);
    fans++;
    const ducts=faces.filter(face=>face.every(c=>c.material==="stock-restaurant-surfaces")&&face.some(c=>c.p[2]>height-.01)&&face.some(c=>c.p[2]<height-.1));
    assert.ok(ducts.length>0);
    const center=fan.reduce((sum,point)=>sum.add(point),new Vector3()).divideScalar(fan.length);
    const radius=Math.max(...fan.map(point=>Math.hypot(point.x-center.x,point.y-center.y)));
    const fanBox=new Box3(new Vector3(center.x-radius,center.y-radius,Math.min(...fan.map(p=>p.z))),
      new Vector3(center.x+radius,center.y+radius,Math.max(...fan.map(p=>p.z))));
    const ductBox=new Box3().setFromPoints(ducts.flatMap(f=>f.map(c=>new Vector3(...c.p))));
    assert.ok(!fanBox.intersectsBox(ductBox),"Ceiling fan sweep intersects a cooking flue");
  }
  assert.ok(fans>0,"No actual ceiling fan was checked");
});

/** Reads named production parts in the caller's room frame, including intrinsically mirrored layouts. */
function roomParts(level: Awaited<ReturnType<typeof compile>>, first: number, frame: Matrix4) {
  const inverse = frame.clone().invert();
  return triangles(level, first).map((face, index) => ({
    object: level.surfaces[level.mesh.surfaces[first / 3 + index]].object,
    material: face[0].material,
    corners: face.map(corner => ({
      position: new Vector3(...corner.p).applyMatrix4(inverse),
      normal: new Vector3(...corner.n).transformDirection(inverse),
      uv: corner.uv,
    })),
  }));
}

test("restaurant display stays partially open and work details preserve the chopping station", async () => {
  for (const [width, depth, height] of [[3.6, 2.9, 2.6], [1.8, 2.4, 2.08]]) {
    for (const frame of [new Matrix4(), FRAME]) for (const seed of [0, 1]) {
      const { level, pen, first } = await fixture(frame);
      roast.furnish({ pen, width, depth, height, kit: new Kit(`restaurant-${seed}`, 2, .6, .3, false), key: "study" });
      const parts = roomParts(level, first, frame);
      const display = parts.filter(face => face.object.endsWith("/display"));
      const glass = display.filter(face => face.material === "$kowloon/display-glass");
      const food = parts.filter(face => face.object.endsWith("/display-food") && face.material === "stock-restaurant-food");
      assert.ok(food.length > 0, "The named display lost its hanging food");
      const foodPoints = food.flatMap(face => face.corners.map(corner => corner.position));
      assert.ok(foodPoints.every(point => point.z > 1.1), "Hanging food intersects counter stock");
      if (width > 3) {
        assert.ok(glass.length > 0, "Wide counter lacks the partial glass display");
        const glassMaterial = level.document.materials.find(material => material.id === "$kowloon/display-glass")!;
        assert.ok(glassMaterial.opacity! > 0 && glassMaterial.opacity! < 1, "Display glazing became opaque");
        const front = glass.filter(face => face.corners.every(corner => Math.abs(corner.normal.y) > .99));
        const end = glass.filter(face => face.corners.every(corner => Math.abs(corner.normal.x) > .99));
        assert.ok(front.length > 0 && end.length > 0, "Display needs front glazing and one end pane");
        assert.equal(front.length + end.length, glass.length, "Display has unintended extra glazing planes");
        const frontBounds = new Box3().setFromPoints(front.flatMap(face => face.corners.map(corner => corner.position)));
        const endBounds = new Box3().setFromPoints(end.flatMap(face => face.corners.map(corner => corner.position)));
        assert.ok(frontBounds.getSize(new Vector3()).y < .00004, "Display has a second front/back pane blocking access");
        assert.ok(endBounds.getSize(new Vector3()).x < .00004, "Display has a second end pane blocking access");
        assert.ok(endBounds.max.y - frontBounds.min.y > .3, "Display has no usable open rear depth");
        for (const point of foodPoints) {
          assert.ok(point.x > frontBounds.min.x && point.x < frontBounds.max.x && point.y > frontBounds.min.y && point.y < endBounds.max.y,
            "Hanging food leaves the display's glazed footprint");
        }
        const birds = connectedBodies(food.map(face => face.corners.map(corner => corner.position) as [Vector3, Vector3, Vector3]));
        const heights = birds.filter(body => body.length > 100).map(body => Math.max(...body.flat().map(point => point.z)));
        assert.ok(heights.length >= 2 && Math.max(...heights) - Math.min(...heights) > .04,
          "Hanging birds do not form staggered display heights");
        for (const suffix of ["/work-towel", "/order-slips"]) {
          assert.ok(parts.some(face => face.object.endsWith(suffix)), `Missing work detail ${suffix}`);
        }
      } else assert.equal(glass.length, 0, "Minimum-width shop acquired an obstructive display cabinet");
      const chopping = parts.filter(face => face.material === "stock-restaurant-surfaces"
        && face.corners.every(corner => corner.uv[0] < .5 && corner.uv[1] < .5 && corner.normal.z > .99));
      assert.ok(chopping.length > 0);
      const center = new Box3().setFromPoints(chopping.flatMap(face => face.corners.map(corner => corner.position))).getCenter(new Vector3());
      center.z = 0;
      const details = parts.filter(face => ["/display", "/display-food", "/work-towel", "/order-slips"].some(suffix => face.object.endsWith(suffix)));
      for (const face of details) {
        const points = face.corners.map(corner => new Vector3(corner.position.x, corner.position.y, 0));
        const triangle = new Triangle(...points as [Vector3, Vector3, Vector3]);
        const distances = points.map((a, index) => {
          const direction = points[(index + 1) % 3].clone().sub(a);
          const lengthSquared = direction.lengthSq();
          const along = lengthSquared > 1e-12 ? Math.max(0, Math.min(1, center.clone().sub(a).dot(direction) / lengthSquared)) : 0;
          return a.clone().addScaledVector(direction, along).distanceTo(center);
        });
        if (triangle.getArea() > 1e-12) distances.push(triangle.closestPointToPoint(center, new Vector3()).distanceTo(center));
        const distance = Math.min(...distances);
        assert.ok(distance >= .1999, `New display or work detail intrudes on chopping: ${face.object}, width=${width}, seed=${seed}, distance=${distance}`);
      }
      const lampParts = new Set(parts.filter(face => /\/task-lamp-\d+$/.test(face.object)).map(face => face.object));
      assert.ok(lampParts.size > 0, "Task lights have no named production pendants to attach to");
      for (const object of lampParts) {
        const bulb = parts.filter(face => face.object === object && face.material === "$kowloon/pane");
        assert.ok(bulb.length > 0, "A named task pendant has no actual bulb geometry");
        const bounds = new Box3().setFromPoints(bulb.flatMap(face => face.corners.map(corner => corner.position)));
        assert.ok(bounds.getSize(new Vector3()).x < .1 && bounds.max.z < height, "Task-light locator includes its shade or ceiling mount");
      }
    }
  }
});

test("restaurant ceramic fields retain physical density and share their portable PBR maps", async () => {
  const files = ["restaurant-tiles.png", "restaurant-tiles-normal.png", "restaurant-tiles-properties.png"];
  const sources = await Promise.all(files.map(file => readFile(`projects/dressing-demo/textures/${file}`)));
  const images = sources.map(bytes => PNG.sync.read(bytes));
  for (const image of images) {
    assert.equal(image.width, 1152); assert.equal(image.height, 576);
    for (let offset = 3; offset < image.data.length; offset += 4) assert.equal(image.data[offset], 255);
  }
  for (let offset = 0; offset < images[1].data.length; offset += 4) {
    const normal = [...images[1].data.subarray(offset, offset + 3)].map(value => value / 127.5 - 1);
    assert.ok(normal[2] > 0 && Math.abs(Math.hypot(...normal) - 1) < .025, "Ceramic field contains invalid tangent normals");
    assert.equal(images[2].data[offset + 2], 0, "Ceramic became metallic");
  }
  for (const frame of [new Matrix4(), FRAME]) {
    const { level, pen, first, physics } = await fixture(frame, true);
    for (const [index, [width, height]] of [[1.2, .6], [2.4, 1.2], [.23, .37]].entries()) {
      kitchenTiles(pen.move(index * 3, 0, 0), width, height, 0, 317 + index, index === 1);
    }
    const tileFaces = triangles(level, first).filter(face => face[0].material === "stock-restaurant-tiles");
    assert.ok(tileFaces.length > 0, "Authored tile finish is not used");
    for (const face of tileFaces) for (let index = 0; index < 3; index++) {
      const a = face[index], b = face[(index + 1) % 3];
      const physical = new Vector3(...a.p).distanceTo(new Vector3(...b.p));
      const chart = Math.hypot((a.uv[0] - b.uv[0]) * 3.6, (a.uv[1] - b.uv[1]) * 1.8);
      assert.ok(Math.abs(physical - chart) < .00004, `Ceramic texture stretched: ${physical}m edge maps to ${chart}m`);
    }
    assert.equal(hash(collisionMesh(level)), physics, "Ceramic field changed physical geometry");
    const assets = await resolveExportAssets(level, path => readFile(`projects/dressing-demo/textures/${path}`));
    const bytes = Buffer.from(toGLB(level, { assets }));
    const validation = await validateBytes(new Uint8Array(bytes));
    assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages));
    const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.toString("utf8", 20, 20 + length));
    assert.equal(json.images.length, 3, "Repeated ceramic fields allocate independent texture maps");
    const material = json.materials.find((value: { name: string }) => value.name === "stock-restaurant-tiles");
    assert.ok(material);
    const maps = [material.pbrMetallicRoughness.baseColorTexture, material.normalTexture, material.pbrMetallicRoughness.metallicRoughnessTexture];
    for (const [index, binding] of maps.entries()) {
      assert.ok(binding, `Missing ceramic PBR channel ${files[index]}`);
      const image = json.images[json.textures[binding.index].source], view = json.bufferViews[image.bufferView];
      const start = 28 + length + (view.byteOffset ?? 0);
      assert.deepEqual(bytes.subarray(start, start + view.byteLength), sources[index], `Incorrect map bound to ${files[index]}`);
    }
  }
});

test("detailed steel tables keep their work planes, footprints and physical texture density", async () => {
  for (const frame of [new Matrix4(), FRAME]) for (const width of [.82, 2.62]) {
    for (const kind of ["front", "rear", "top"] as const) {
      const depth = .56, height = kind === "front" ? .92 : .78;
      const { level, pen, first, physics } = await fixture(frame, false, true);
      if (kind === "front") assert.equal(restaurantCounter(pen, width, depth, height, 713), height);
      else if (kind === "rear") {
        assert.deepEqual(restaurantWorkBench(pen, width, depth, height),
          { x0: .03, x1: width - .03, y: .03, depth: depth - .05, z: height, clear: 1 });
      } else restaurantSteelTop(pen, width, depth, height);
      const local = roomParts(level, first, frame);
      const points = local.flatMap(face => face.corners.map(corner => corner.position));
      const bounds = new Box3().setFromPoints(points), envelopeDepth = depth + (kind === "rear" ? .02 : 0);
      const expectedBottom = kind === "top" ? height - .04 : 0;
      for (const [actual, expected] of [[bounds.min.x, 0], [bounds.max.x, width], [bounds.min.y, 0],
        [bounds.max.y, envelopeDepth], [bounds.min.z, expectedBottom], [bounds.max.z, height]]) {
        assert.ok(Math.abs(actual - expected) < .00004, `${kind} table changed its support envelope: ${actual} vs ${expected}`);
      }
      assert.ok(local.some(face => face.material === "stock-brushed-metal"
        && face.corners.every(corner => corner.position.z > height - .02 && Math.abs(corner.normal.z) > .05 && Math.abs(corner.normal.z) < .95)),
        "Steel top has no narrow sloped edge to catch highlights");
      for (const x of [.05, .25, .5, .75, .95]) for (const y of [.08, .5, .92]) {
        const ray = new Ray(new Vector3(width * x, envelopeDepth * y, height + .1), new Vector3(0, 0, -1));
        const hits = local.flatMap(face => {
          const hit = ray.intersectTriangle(face.corners[0].position, face.corners[1].position, face.corners[2].position, false, new Vector3());
          return hit ? [hit.z] : [];
        });
        assert.ok(hits.length > 0 && Math.abs(Math.max(...hits) - height) < .00004,
          `${kind} table lost its flat support at ${x},${y}`);
      }
      for (const face of triangles(level, first).filter(face => face[0].material === "stock-brushed-metal")) {
        for (let index = 0; index < 3; index++) {
          const a = face[index], b = face[(index + 1) % 3];
          const physical = new Vector3(...a.p).distanceTo(new Vector3(...b.p));
          const chart = Math.hypot(a.uv[0] - b.uv[0], a.uv[1] - b.uv[1]) / 2;
          assert.ok(Math.abs(physical - chart) < .00004, `${kind} table stretches metal across a bevel or panel`);
        }
      }
      assert.equal(hash(collisionMesh(level)), physics, "Visual table polish changed physical geometry");
    }
  }
});

/** Measures an outward closed triangle shell after welding only identical exported positions. */
function shellMeasures(faces: ReturnType<typeof triangles>) {
  const edges = new Map<string, { count: number; direction: number }>();
  let volume = 0, area = 0;
  for (const face of faces) {
    const points = face.map(corner => new Vector3(...corner.p));
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    assert.ok(normal.length() > 1e-12, "Modeled prop contains a collapsed face");
    const shading = face.reduce((sum, corner) => sum.add(new Vector3(...corner.n)), new Vector3());
    assert.ok(normal.dot(shading) > 0, "Modeled prop shading points into its body");
    for (const corner of face) assert.ok(corner.n.every(Number.isFinite) && Math.abs(Math.hypot(...corner.n) - 1) < .001);
    volume += points[0].dot(points[1].clone().cross(points[2])) / 6;
    area += normal.length() / 2;
    const keys = face.map(corner => corner.p.join("/"));
    for (let index = 0; index < 3; index++) {
      const a = keys[index], b = keys[(index + 1) % 3];
      const edge = [a, b].sort().join("|");
      const previous = edges.get(edge) ?? { count: 0, direction: 0 };
      edges.set(edge, { count: previous.count + 1, direction: previous.direction + (a < b ? 1 : -1) });
    }
  }
  assert.ok(edges.size > 0, "Closed prop body is missing");
  assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.direction === 0), "Prop body has open, duplicated or inconsistently wound shell edges");
  assert.ok(volume > 0, "Prop body has no outward enclosed volume");
  return { volume, area };
}

test("modeled counter towel is a thin closed drape resting on its worktop", async () => {
  const x = .6, top = .92;
  for (const frame of [new Matrix4(), FRAME]) {
    const { level, pen, first, physics } = await fixture(frame);
    restaurantSteelTop(pen, 1.2, .56, top);
    counterTowel(pen, x, top);
    const all = triangles(level, first), parts = roomParts(level, first, frame);
    const bodyIndices = parts.flatMap((face, index) => face.object.endsWith("/work-towel") ? [index] : []);
    const shell = shellMeasures(bodyIndices.map(index => all[index]));
    const thickness = shell.volume / (shell.area / 2);
    assert.ok(thickness > .0007 && thickness < .0017, `Towel lost its thin cloth volume: equivalent thickness ${thickness}m`);
    const body = bodyIndices.map(index => parts[index]);
    const points = body.flatMap(face => face.corners.map(corner => corner.position));
    const bounds = new Box3().setFromPoints(points);
    assert.ok(bounds.min.x >= x - .09204 && bounds.max.x <= x + .09204, "Towel intrudes beyond its reserved width");
    assert.ok(bounds.min.z >= top - .26004 && bounds.max.y <= .16104, "Towel leaves its counter-edge envelope");
    assert.ok(body.length < 1800, "Towel exceeds its small-prop triangle budget");
    const topFaces = parts.filter(face => !face.object.endsWith("/work-towel") && !face.object.endsWith("/towel-hem"));
    const rearContact: Vector3[] = [];
    for (const point of points) {
      if (point.y < 0 || point.y > .56 || point.x < 0 || point.x > 1.2) continue;
      const ray = new Ray(new Vector3(point.x, point.y, top + .1), new Vector3(0, 0, -1));
      const hits = topFaces.flatMap(face => {
        const hit = ray.intersectTriangle(face.corners[0].position, face.corners[1].position, face.corners[2].position, false, new Vector3());
        return hit ? [hit.z] : [];
      });
      assert.ok(hits.length > 0);
      const gap = point.z - Math.max(...hits);
      assert.ok(gap >= -.00004, `Towel penetrates its actual beveled countertop by ${-gap}m at ${point.toArray()}, counter surface=${Math.max(...hits)}, reflected=${frame.determinant() < 0}`);
      if (point.y >= .08 && gap <= .00104) rearContact.push(point);
    }
    assert.ok(rearContact.length >= 2 && new Box3().setFromPoints(rearContact).getSize(new Vector3()).x > .06,
      "Towel floats above its rear resting patch");
    assert.equal(hash(collisionMesh(level)), physics, "Modeled towel changed collision");
  }
});

test("rounded chopping board preserves a solid base and flat cleaver support", async () => {
  const at: [number, number, number] = [.6, .3, .92], top = at[2] + .12;
  for (const frame of [new Matrix4(), FRAME]) {
    const { level, pen, first, physics } = await fixture(frame);
    choppingBlock(pen, at);
    const all = triangles(level, first), parts = roomParts(level, first, frame);
    const bodyIndices = parts.flatMap((face, index) => face.object.endsWith("/chopping-board") ? [index] : []);
    const shell = shellMeasures(bodyIndices.map(index => all[index]));
    assert.ok(shell.volume > .012 && shell.volume < .016, "Chopping block lost its substantial wooden body");
    const body = bodyIndices.map(index => parts[index]);
    const points = body.flatMap(face => face.corners.map(corner => corner.position));
    const bounds = new Box3().setFromPoints(points);
    assert.ok(Math.abs(bounds.min.z - at[2]) < .00004 && Math.abs(bounds.max.z - top) < .00004,
      "Chopping board moved off its original support plane");
    assert.ok(points.every(point => Math.hypot(point.x - at[0], point.y - at[1]) <= .20004), "Rounded rim leaves the original board footprint");
    assert.ok(body.some(face => face.corners.every(corner => corner.position.z > top - .025
      && Math.abs(corner.normal.z) > .1 && Math.abs(corner.normal.z) < .95)), "Board has no rounded upper rim");
    for (const [dx, dy] of [[0, 0], [.1, 0], [-.1, 0], [0, .1], [0, -.1], [.12, .1]]) {
      const ray = new Ray(new Vector3(at[0] + dx, at[1] + dy, top + .1), new Vector3(0, 0, -1));
      const hits = body.flatMap(face => {
        const hit = ray.intersectTriangle(face.corners[0].position, face.corners[1].position, face.corners[2].position, false, new Vector3());
        return hit ? [hit.z] : [];
      });
      assert.ok(hits.length > 0 && Math.abs(Math.max(...hits) - top) < .00004, "Board working center is not flat beneath the cleaver");
    }
    const blade = parts.filter(face => face.object.endsWith("/cleaver") && face.material === "stock-restaurant-surfaces");
    assert.ok(blade.length > 0, "Cleaver lost its separately inspectable steel blade");
    const bladeBottom = Math.min(...blade.flatMap(face => face.corners.map(corner => corner.position.z)));
    assert.ok(Math.abs(bladeBottom - top) < .00004, "Cleaver floats above or sinks into the chopping surface");
    assert.equal(hash(collisionMesh(level)), physics, "Modeled board changed collision");
  }
});

test("chopping-board side grain stays continuous across rounded rings and inside shared atlas gutters", async () => {
  const at: [number, number, number] = [.6, .3, .92];
  for (const frame of [new Matrix4(), FRAME]) {
    const { level, pen, first } = await fixture(frame);
    choppingBlock(pen, at);
    const parts = roomParts(level, first, frame);
    const sides = parts.filter(face => face.object.endsWith("/chopping-board") && face.material === "stock-shop-timber");
    assert.ok(sides.length > 0, "Chopping-board side does not use the shared wood atlas");
    const ringV = new Map<number, number[]>();
    const regions = new Set<number>();
    for (const face of sides) {
      const regionIndex = timberAtlas.regions.findIndex(region => face.corners.every(corner => {
        const x = corner.uv[0] * timberAtlas.width, y = (1 - corner.uv[1]) * timberAtlas.height;
        return x >= region.x + timberAtlas.padding + .5 - .0001 && x <= region.x + region.width - timberAtlas.padding - .5 + .0001
          && y >= region.y + timberAtlas.padding + .5 - .0001 && y <= region.y + region.height - timberAtlas.padding - .5 + .0001;
      }));
      assert.ok(regionIndex >= 0 && regionIndex < timberAtlas.endGrainStart, "A side triangle crosses atlas gutters or samples cut-end art");
      regions.add(regionIndex);
      const region = timberAtlas.regions[regionIndex];
      const fieldWidth = (region.width - 2 * timberAtlas.padding - 1) / timberAtlas.texelsPerMeter;
      const angles = face.corners.map(corner => {
        const angle = Math.atan2(corner.position.y - at[1], corner.position.x - at[0]) - Math.PI / 2;
        return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      });
      const neighboringAngle = angles.find(angle => angle > .0001 && angle < 2 * Math.PI - .0001)!;
      const rearSeamAngle = neighboringAngle > Math.PI ? 2 * Math.PI : 0;
      const coordinates = face.corners.map((corner, index) => {
        const dx = corner.position.x - at[0], dy = corner.position.y - at[1];
        const angle = angles[index] < .0001 || angles[index] > 2 * Math.PI - .0001 ? rearSeamAngle : angles[index];
        const u = (corner.uv[0] * timberAtlas.width - region.x - timberAtlas.padding - .5) / timberAtlas.texelsPerMeter;
        const v = corner.uv[1] * timberAtlas.height / timberAtlas.texelsPerMeter;
        const expectedU = (angle * .2) % fieldWidth;
        const distance = Math.min(Math.abs(u - expectedU), Math.abs(u - expectedU + fieldWidth), Math.abs(u - expectedU - fieldWidth));
        assert.ok(distance < .00004, `Circumferential wood density changes or restarts: position=${corner.position.toArray()}, angle=${angle}, u=${u}, expected=${expectedU}, distance=${distance}`);
        const heightKey = Math.round(corner.position.z * 10000);
        ringV.set(heightKey, [...(ringV.get(heightKey) ?? []), v]);
        return { u, v, angle, radius: Math.hypot(dx, dy), z: corner.position.z };
      });
      for (let index = 0; index < 3; index++) {
        const a = coordinates[index], b = coordinates[(index + 1) % 3];
        assert.ok(Math.abs(Math.abs(a.u - b.u) - Math.abs(a.angle - b.angle) * .2) < .00004,
          "A triangle interpolates across a circumferential atlas repeat instead of splitting there");
        const profileDistance = Math.hypot(a.radius - b.radius, a.z - b.z);
        assert.ok(Math.abs(Math.abs(a.v - b.v) - profileDistance) < .00004,
          "Vertical wood fibers stretch or restart across the rounded profile");
      }
    }
    assert.equal(regions.size, 1, "One wooden block changes its side-grain source between bands");
    for (const samples of ringV.values()) assert.ok(Math.max(...samples) - Math.min(...samples) < .00004,
      "A height ring changes its vertical grain crop around the board");
    const endgrain = parts.filter(face => face.object.endsWith("/chopping-board") && face.material === "stock-restaurant-surfaces");
    assert.ok(endgrain.length > 0 && endgrain.every(face => face.corners.every(corner => Math.abs(corner.position.z - at[2] - .12) < .00004)),
      "New side mapping replaced the flat end-grain working surface");
  }
  for (const mode of ["plain", "generic-timber"] as const) {
    const fallback = await fixture();
    const wood = fallback.level.document.materials.find(material => material.id === "stock-shop-timber")!;
    if (mode === "plain") delete wood.texture;
    else { wood.id = "stock-timber"; wood.texture = "ordinary-timber.png"; }
    const mesh = new KitMesh(fallback.level, "restaurant", "props", kitFinishes(fallback.level, "stock", "plain").materials,
      { maximumTriangles: 10000 });
    choppingBlock(new Pen(mesh, "shop-roast", new Matrix4(), false), at);
    const fallbackSides = roomParts(fallback.level, fallback.first, new Matrix4())
      .filter(face => face.object.endsWith("/chopping-board") && face.corners.some(corner => corner.position.z < at[2] + .119));
    assert.ok(fallbackSides.length > 0 && fallbackSides.every(face => !fallback.level.document.materials.find(material => material.id === face.material)?.texture),
      `${mode}: missing wood atlas no longer falls back to untextured wood`);
  }
});
