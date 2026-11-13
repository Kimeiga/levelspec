import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {Matrix4, Ray, Vector3} from "three";
import {PNG} from "pngjs";
import {validateBytes} from "gltf-validator";
import {compile,parseAml,collisionMesh,resolveExportAssets,toGLB} from "levelspec";
import {withBuiltinMaterialImages} from "../src/materials/images.ts";
import {KitMesh} from "../src/dressing/kit-mesh.ts";
import {Pen} from "../src/dressing/pen.ts";
import {kitMaterials,kitFinishes} from "../src/dressing/kit.ts";
import {BALCONY_PLANTS,BALCONY_LAUNDRY,balconyPlant,chooseMeshGarment,hangMeshGarment,type MeshGarment} from "../src/dressing/kowloon/balcony-props.ts";
import {chooseGarment,hangGarment,washing,hangers} from "../src/dressing/kowloon/laundry.ts";
import {plantRow} from "../src/dressing/kowloon/fixtures.ts";
import {Rng} from "../src/generate/rng.ts";
import catalog from "../src/dressing/kowloon/assets/balcony-props.json" with {type:"json"};

const FRAME=new Matrix4().makeTranslation(3,-2,1).multiply(new Matrix4().makeRotationZ(.7)).multiply(new Matrix4().makeScale(-1,1,1));
/** Builds actual visual props against a physical floor to catch accidental physics mutation. */
async function fixture(frame=new Matrix4()) {
  const level=await compile(parseAml('<architecture version="1" id="balcony"><material id="base" color="#ffffff"/><box id="floor" width="6" depth="2" height=".1" position="0 0 -.1" material="base"/></architecture>'),{navigation:false});
  kitMaterials(level);level.mesh.colors??=level.mesh.positions.map(()=>1);
  const before=hash(collisionMesh(level)),first=level.mesh.indices.length;
  const pen=new Pen(new KitMesh(level,"props","props",kitFinishes(level,undefined,"base").materials,{maximumTriangles:100000}),"props",frame,frame.determinant()<0);
  return {level,pen,before,first};
}
/** Compact stable fingerprints avoid printing whole meshes in failed equality assertions. */
function hash(value:unknown):string{return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
/** Reads emitted corners and materials independently of the emitter's asset indexing. */
function faces(level:Awaited<ReturnType<typeof compile>>,first:number){
  const output=[];
  for(let i=first;i<level.mesh.indices.length;i+=3)output.push({
    material:level.surfaces[level.mesh.surfaces[i/3]].material,
    vertices:level.mesh.indices.slice(i,i+3).map(index=>({p:new Vector3(...level.mesh.positions.slice(index*3,index*3+3)),n:new Vector3(...level.mesh.normals.slice(index*3,index*3+3)),uv:level.mesh.uv.slice(index*2,index*2+2)})),
  });
  return output;
}
/** Checks actual emitted attributes and geometry after export-grid rounding. */
function healthy(triangles:ReturnType<typeof faces>){
  for(const {material,vertices} of triangles){
    const [a,b,c]=vertices.map(v=>v.p);const cross=b.clone().sub(a).cross(c.clone().sub(a));
    assert.ok(cross.length()>1e-11,"Collapsed triangle after output rounding");cross.normalize();
    for(const v of vertices){assert.ok([...v.p,...v.n,...v.uv].every(Number.isFinite));assert.ok(Math.abs(v.n.length()-1)<.001,"Shading normal must be unit length");}
    assert.ok(vertices.reduce((sum,v)=>sum+cross.dot(v.n),0)>.01,"Winding must agree with shading normals");
    if(material.startsWith("builtin:balcony-")){
      const cell=vertices[0].uv.map(value=>Math.floor(value*2));
      for(const {uv} of vertices)for(let axis=0;axis<2;axis++){
        const within=uv[axis]-cell[axis]/2;
        assert.ok(within>=8.5/1024-1e-7&&within<=503.5/1024+1e-7,"A prop triangle leaves its padded atlas chart");
      }
    }
  }
}

test("balcony plants preserve measured proportions, grounding and normals under reflection",async()=>{
  for(const name of BALCONY_PLANTS)for(const scale of [.72,1.02])for(const frame of [new Matrix4(),FRAME]){
    const {level,pen,before,first}=await fixture(frame);const at:[number,number,number]=[1,.5,.3];const angle=.43;
    balconyPlant(pen,name,at,scale,angle);const emitted=faces(level,first);healthy(emitted);
    assert.equal(emitted.length,catalog[name].triangles);assert.equal(hash(collisionMesh(level)),before);
    const inverse=frame.clone().invert();const points=emitted.flatMap(f=>f.vertices.map(v=>v.p.clone().applyMatrix4(inverse).sub(new Vector3(...at)).applyAxisAngle(new Vector3(0,0,1),-angle)));
    assert.ok(Math.abs(Math.min(...points.map(p=>p.z)))<.00003,"Pot foot must contact support");
    for(let axis=0;axis<3;axis++){
      assert.ok(Math.abs(Math.min(...points.map(p=>p.getComponent(axis)))-catalog[name].min[axis]*scale)<.00003);
      assert.ok(Math.abs(Math.max(...points.map(p=>p.getComponent(axis)))-catalog[name].max[axis]*scale)<.00003);
    }
  }
});

test("mesh laundry fits bounded rooms uniformly and uses compatible supports with plain variation",()=>{
  const seen=new Set<string>(),tints=new Set<string>();
  for(const support of ["line","pole","hanger"] as const)for(const room of [{width:.8,drop:.8},{width:1.5,drop:1.15},{width:.2,drop:.15}])for(let seed=0;seed<40;seed++){
    const g=chooseMeshGarment(new Rng(`fitting/${seed}`),room,support);if(!g)continue;
    seen.add(g.asset);tints.add(g.tint.join());assert.ok(g.width<=room.width+1e-9&&g.drop<=room.drop+1e-9);
    assert.equal(g.width,catalog[g.asset].width*g.scale);assert.ok(g.scale>=.52&&g.scale<=1.02);
    assert.ok(!(support!=="line"&&g.asset==="hanging-bedsheet"));assert.ok(!(support==="pole"&&g.asset==="hanging-shirt"));
  }
  assert.deepEqual([...seen].sort(),[...BALCONY_LAUNDRY].sort());assert.ok(tints.size>=6);
});

test("procedural laundry uses the shared plain cotton chart",async()=>{
  const {level,pen,first}=await fixture();
  let count=0;
  for(let seed=0;seed<60;seed++){
    const garment=chooseGarment(new Rng(`plain/${seed}`),{width:1.5,drop:1.2},"line");
    if(garment?.kind!=="cut")continue;
    hangGarment(pen,garment,[0,0,2],[garment.width,0,2],0);
    count++;
  }
  assert.ok(count>=5,"The fixture must exercise retained procedural laundry");
  const cloth=faces(level,first).filter(face=>face.material==="builtin:balcony-cloth");
  assert.ok(cloth.length>0);
  healthy(cloth);
  for(const face of cloth)for(const {uv} of face.vertices){
    assert.ok(uv[0]>.5&&uv[1]<.5,"Procedural laundry samples a patterned or generated-object chart");
  }
});

/** Requires actual hardware surfaces on both sides of a point held inside a clip. */
function heldByClip(point:Vector3,hardware:ReturnType<typeof faces>):void{
  for(const sign of [-1,1]){
    const ray=new Ray(point,new Vector3(0,sign,0));
    const distances=hardware.flatMap(face=>{
      const hit=ray.intersectTriangle(...face.vertices.map(vertex=>vertex.p) as [Vector3,Vector3,Vector3],false,new Vector3());
      return hit?[point.distanceTo(hit)]:[];
    });
    assert.ok(distances.some(distance=>distance>.003&&distance<.01),"Clip hardware does not enclose the cloth/cord contact");
  }
}

test("clips physically connect each garment to sloping cords and sheets stay below the cord",async()=>{
  for(const asset of BALCONY_LAUNDRY)for(const scale of [.65,1.02])for(const slope of [-.18,0,.18])for(const sway of [-.05,.05])for(const frame of [new Matrix4(),FRAME]){
    const source=catalog[asset],{level,pen,first}=await fixture(frame);
    const garment:MeshGarment={kind:"mesh",asset,width:source.width*scale,
      drop:source.drop*scale+(asset==="hanging-bedsheet"?.014:0)+.015,scale,support:"line",tint:[1,1,1]};
    const width=garment.width;
    hangMeshGarment(pen,garment,[-width/2,0,2-slope*width/2],[width/2,0,2+slope*width/2],sway);
    const inverse=frame.clone().invert();
    const emitted=faces(level,first).map(face=>({...face,vertices:face.vertices.map(vertex=>({...vertex,p:vertex.p.clone().applyMatrix4(inverse)}))}));
    const cloth=emitted.filter(face=>face.material==="builtin:balcony-cloth");
    const hardware=emitted.filter(face=>face.material==="$kowloon/paint");
    assert.ok(hardware.length>0,"Suspended garments require visible clips");
    for(const anchor of source.anchors){
      const x=anchor[0]*scale;
      const cord=new Vector3(x,0,2+slope*x);
      const near=cloth.flatMap(face=>face.vertices.map(vertex=>vertex.p))
        .filter(point=>Math.abs(point.x-x)<.00003&&Math.abs(point.y)<.00003)
        .sort((a,b)=>a.distanceToSquared(cord)-b.distanceToSquared(cord))[0];
      assert.ok(near,"Missing cloth at the intended suspension location");
      heldByClip(near,hardware);
      heldByClip(cord,hardware);
      heldByClip(near.clone().lerp(cord,.5),hardware);
    }
    if(asset==="hanging-bedsheet")for(const face of cloth)for(const {p} of face.vertices){
      // A plane parallel to the cord separates every triangle from its 8mm radius.
      const clearance=(2+slope*p.x-p.z)/Math.hypot(1,slope);
      assert.ok(clearance>=.008+.004,"The clipped sheet intersects or rests on the cord");
    }
  }
});

test("real suspension vertices touch clips and follow slopes without moving their host physics",async()=>{
  for(const asset of BALCONY_LAUNDRY)for(const frame of [new Matrix4(),FRAME])for(const support of ["line","pole","hanger"] as const){
    if((support!=="line"&&asset==="hanging-bedsheet")||(support==="pole"&&asset==="hanging-shirt"))continue;
    const {level,pen,first,before}=await fixture(frame),source=catalog[asset],scale=.75;
    const garment:MeshGarment={kind:"mesh",asset,width:source.width*scale,drop:source.drop*scale+(support==="hanger"?.11:asset==="hanging-bedsheet"?.014:0)+.015,scale,support,tint:[1,1,1]};
    const left:[number,number,number]=[1,0,2],right:[number,number,number]=[1+garment.width,0,2.08];
    hangMeshGarment(pen,garment,left,right,.025);const emitted=faces(level,first);healthy(emitted);assert.equal(hash(collisionMesh(level)),before);
    const inverse=frame.clone().invert(),cloth=emitted.filter(t=>t.material==="builtin:balcony-cloth").flatMap(t=>t.vertices.map(v=>v.p.clone().applyMatrix4(inverse)));
    assert.equal(cloth.length/3,source.triangles);
    const slope=support==="hanger"?0:.08/garment.width,drop=support==="hanger"?.11:0;
    const lift=asset==="hanging-bedsheet"?-.014:0;
    for(const anchor of source.anchors){
      const point=new Vector3(1+garment.width/2+anchor[0]*scale,0,2.04+slope*anchor[0]*scale-drop+lift);
      assert.ok(Math.min(...cloth.map(p=>p.distanceTo(point)))<.00003,"Attachment is not a real emitted cloth vertex");
    }
    for(const p of cloth){
      const localX=p.x-(1+garment.width/2);
      assert.ok(p.z>=2.04+slope*localX-garment.drop-.00003,"Cloth falls below its reserved drop");
      assert.ok(Math.abs(p.y)<=.08,"Cloth leaves thin depth envelope under sway");
    }
  }
});

test("balcony dressing repeats deterministically and shares all six PBR images in exported GLB",async()=>{
  const results=[];
  for(let run=0;run<2;run++){
    const {level,pen,first,before}=await fixture();
    plantRow(pen,0,4,.2,0,new Rng("row"));
    washing(pen,0,4,2,new Rng("washing"),{support:"line",fill:1,drop:1.15});
    hangers(pen.move(0,1,0),0,3,2,.03,new Rng("hanger"),.4,.85);
    const emitted=faces(level,first);healthy(emitted);assert.ok(emitted.length<25000);assert.equal(hash(collisionMesh(level)),before);results.push(hash(level.mesh));
    if(run)continue;
    const assets=await resolveExportAssets(level,withBuiltinMaterialImages());const bytes=toGLB(level,{assets});const validation=await validateBytes(bytes);assert.equal(validation.issues.numErrors,0);
    const document=JSON.parse(Buffer.from(bytes).subarray(20,20+new DataView(bytes.buffer,bytes.byteOffset).getUint32(12,true)).toString());
    const imageSources=new Set<number>();
    for(const name of ["balcony-plants","balcony-cloth"]){
      const material=document.materials.find((m:{name:string})=>m.name===`builtin:${name}`);assert.ok(material?.normalTexture&&material.pbrMetallicRoughness.metallicRoughnessTexture);
      for(const texture of [material.pbrMetallicRoughness.baseColorTexture,material.normalTexture,material.pbrMetallicRoughness.metallicRoughnessTexture]){
        assert.equal(texture.texCoord??0,0,"PBR channels do not share the same UV chart");
        imageSources.add(document.textures[texture.index].source);
      }
      for(const suffix of ["","-normal","-properties"]){const image=PNG.sync.read(await readFile(`src/materials/library/${name}${suffix}.png`));assert.deepEqual([image.width,image.height],[1024,1024]);}
    }
    assert.equal(imageSources.size,6,"Plant and cloth roles must export their six shared PBR images");
    const binaryOffset=28+new DataView(bytes.buffer,bytes.byteOffset).getUint32(12,true);
    const imageHashes=document.images.map((image:{bufferView:number})=>{
      const view=document.bufferViews[image.bufferView],start=binaryOffset+(view.byteOffset??0);
      return createHash("sha256").update(bytes.subarray(start,start+view.byteLength)).digest("hex");
    });
    assert.equal(new Set(imageHashes).size,imageHashes.length,"Repeated props duplicate image bytes");
  }
  assert.equal(results[0],results[1]);
});

test("public building compilation adopts balcony props without changing collision",async()=>{
  const document=parseAml(`<architecture version="1" id="balcony-integration" validation="premap">
    <material id="plaster" color="#bcbcaf" roughness=".95"/>
    <box id="tenement" width="5" depth="3" height="6.35" collidable="false" material="plaster"/>
    <box id="street" position="-2 -2 -.15" width="9" depth="7" height=".15" material="builtin:concrete"/>
    <dressing theme="kowloon-street@1" seed="balcony-props-12" detail="medium" grime="0" wear="0">
      <building host="tenement" stories="2" texture-density="16" material="plaster"/>
    </dressing>
  </architecture>`);
  const source=structuredClone(document),bare=structuredClone(document);
  delete bare.dressing;
  const [dressed,plain]=await Promise.all([compile(document,{navigation:false}),compile(bare,{navigation:false})]);
  assert.deepEqual(document,source,"Building compilation mutated authored input");
  assert.ok(!dressed.diagnostics.some(item=>item.severity==="error"),JSON.stringify(dressed.diagnostics));
  assert.equal(dressed.physicalHash,plain.physicalHash);
  assert.equal(hash(collisionMesh(dressed)),hash(collisionMesh(plain)));
  assert.equal(hash(dressed.floors),hash(plain.floors),"Visual props changed navigation floor inputs");
  for(const role of ["balcony-plants","balcony-cloth"]){
    const surfaces=dressed.surfaces.filter(surface=>surface.material===`builtin:${role}`);
    assert.ok(surfaces.length>0,`Building consumers did not adopt ${role}`);
    for(const surface of surfaces){
      assert.equal(surface.domain,"visualization");
      assert.equal(surface.collidable,false);
    }
  }
});
