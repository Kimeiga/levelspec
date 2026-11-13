/** Bounded native optical checks for roof seam closure and the accepted spawn-frontier neighborhoods. */
import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
import{compile,parseAml}from'../../src/architecture/index.ts';
import{VisibilityGeometry}from'../../tools/fps/visibility-geometry.ts';
import{Ray,Vector3,Triangle}from'three';
import{prepareInspectionWalk}from'../../review/walk.ts';
const output=process.argv[2];await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url),'utf8');
const layout=JSON.parse(await readFile(new URL('./planning/developed-l02.json',import.meta.url),'utf8'));
const level=await compile(parseAml(source),{uvs:false,navigation:{cell:.125}});const optical=new VisibilityGeometry(level);
const physical=level.physicalMesh??level.mesh;
const faces=[];
for(let i=0;i<physical.indices.length;i+=3)faces.push(new Triangle(...physical.indices.slice(i,i+3).map(index=>new Vector3(...physical.positions.slice(index*3,index*3+3)))));
/** Closed compiled-solid occupancy distinguishes buried fascia from a genuine air gap. */
function occupied(point){
 const origin=new Vector3(...point),ray=new Ray(origin,new Vector3(.839,.317,.441).normalize()),hits=[];const contact=new Vector3();
 for(const face of faces){
  if(face.closestPointToPoint(origin,contact).distanceToSquared(origin)<1e-16)return true;
  if(ray.intersectTriangle(face.a,face.b,face.c,false,contact))hits.push(origin.distanceTo(contact));
 }
 hits.sort((a,b)=>a-b);const unique=hits.filter((t,i)=>i===0||Math.abs(t-hits[i-1])>1e-6);return unique.length%2===1;
}
const seams=[];
for(const seam of layout.roof_seams){
 const dx=seam.b[0]-seam.a[0],dy=seam.b[1]-seam.a[1],length=Math.hypot(dx,dy),normal=[-dy/length,dx/length];
 const probes=[];
 for(let i=0;i<=Math.ceil(length);i++){
  const t=i/Math.ceil(length),x=seam.a[0]+dx*t,y=seam.a[1]+dy*t;
  for(const z of [seam.z0+.02,(seam.z0+seam.z1)/2,seam.z1-.02]){
   const a=[x+normal[0]*.3,y+normal[1]*.3,z],b=[x-normal[0]*.3,y-normal[1]*.3,z];const surfaceOccludes=!optical.visible(a,b),midpointInside=surfaceOccludes?false:occupied([x,y,z]);probes.push({a,b,surfaceOccludes,midpointInside,closed:surfaceOccludes||midpointInside});
  }
 }
 seams.push({id:seam.id,probes});
}
const frontiers=[];
for(const [id,x0,x1,y0,y1,portalIds]of [['west',24,28,28,32,['P-WP1','P-WS1']],['east',92,96,72,76,['P-EP1','P-ES1']]]){
 const portals=portalIds.map(id=>layout.portals.find(p=>p.id===id));const witnesses=[];
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const admission=prepareInspectionWalk(level,{feet:[x,y,0],yaw:0,pitch:0});
  if(!admission.ok){witnesses.push({feet:[x,y,0],admitted:false,reason:admission.message});continue;}
  for(const eyeHeight of [1.86,1.0695]){
   const eyes=[x,y,eyeHeight];const samples=portals.map(portal=>({id:portal.id,visible:[.1,.3,.5,.7,.9].map(t=>{const target=[portal.a[0]+(portal.b[0]-portal.a[0])*t,portal.a[1]+(portal.b[1]-portal.a[1])*t,eyeHeight];return{target,visible:optical.visible(eyes,target)};})}));
   witnesses.push({feet:[x,y,0],admitted:true,eyeHeight,samples,bothVisible:samples.every(p=>p.visible.some(v=>v.visible))});
  }
 }
 frontiers.push({id,witnesses});
}
await writeFile(`${output}/envelope.json`,JSON.stringify({sourceSHA256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,seams,frontiers,omittedMaterials:optical.unknownMaterials,limitations:'Finite optical probes on actual opaque render triangles. Seam samples include both endpoints and three heights at <=1 m spacing; rays with both endpoints buried in a composed mass use compiled closed-solid parity occupancy instead; not a watertight-solid proof. Frontier admission uses the unchanged standing body and standing navigation even for low eyes.'},null,2)+'\n');
console.log(JSON.stringify({seams:seams.length,seamLeaks:seams.flatMap(s=>s.probes.filter(p=>!p.closed).map(p=>({id:s.id,...p}))),frontiers:frontiers.map(f=>({id:f.id,admitted:f.witnesses.filter(w=>w.admitted).length/2,bothVisible:f.witnesses.filter(w=>w.bothVisible).length}))},null,2));
