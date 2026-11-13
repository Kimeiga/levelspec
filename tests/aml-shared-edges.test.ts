import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, collisionMesh, serializeAml } from 'levelspec';

const left='<terrain id="left" points="0 0 0; 2 0 0; 2 4 0; 0 4 0" triangles="0 1 2; 0 2 3"/>';
const right=(x=2,z=0)=>`<terrain id="right" points="${x} 0 ${z}; 4 0 ${z}; 4 4 ${z}; ${x} 4 ${z}" triangles="0 1 2; 0 2 3"/>`;
const relation='<path id="seam" points="2 0 0; 2 4 0"/><shared-edge id="join" from="left" to="right" path="seam"/>';
/** Public XML compilation keeps unrelated route coverage disabled. */
async function build(body:string){return compile(parseAml(`<architecture version="1" id="seams" validation="premap">${body}</architecture>`),{navigation:false});}
function valid(level:Awaited<ReturnType<typeof build>>){assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);}
function failed(level:Awaited<ReturnType<typeof build>>,ids=['join','left','right']){
  assert.ok(level.diagnostics.some(d=>d.severity==='error'&&ids.every(id=>d.objects.includes(id))&&d.source));
}

test('shared native terrain edges are assertions without changing physical geometry',async()=>{
  const baseline=await build(left+right()),level=await build(left+right()+relation);valid(level);
  assert.deepEqual(collisionMesh(level),collisionMesh(baseline));assert.equal(level.physicalHash,baseline.physicalHash);
  const slab=await build(left+'<profile id="landing" points="2 0; 4 0; 4 4; 2 4"/><slab id="right" profile="landing"/>'+relation);valid(slab);
});

test('shared-edge checks cannot bridge actual horizontal gaps or mismatched elevations',async()=>{
  for(const host of [right(2.01),right(2,.01)])failed(await build(left+host+relation));
  valid(await build(left+right()+relation));
});

test('touching endpoints and unrelated floor support cannot conceal a missing middle host interval',async()=>{
  // A notch is represented by its simple concave outline rather than a hole touching the exterior.
  const notched='<profile id="broken" points="2 0; 4 0; 4 4; 2 4; 2 3; 3 3; 3 1; 2 1"/><slab id="right" profile="broken"/>';
  failed(await build(left+notched+relation));
  failed(await build(left+notched+'<profile id="extra" points="2 1; 3 1; 3 3; 2 3"/><slab id="unrelated" profile="extra"/>'+relation));
});

test('relation paths follow their placed instance while each native host keeps its own frame',async()=>{
  const independentlyPlaced='<terrain id="right" points="0 0 0; 2 0 0; 2 4 0; 0 4 0" triangles="0 1 2; 0 2 3" position="2 0 0"/>';
  const body=`<path id="seam" points="2 0 0; 2 4 0"/><definition id="pair">${left}${independentlyPlaced}<shared-edge id="join" from="left" to="right" path="seam"/></definition><instance id="placed" ref="pair" position="10 20 3" rotation="0 0 90" scale="2 1 1"/>`;
  const document=parseAml(`<architecture version="1" id="transformed" validation="premap">${body}</architecture>`),before=structuredClone(document);
  const level=await compile(document,{navigation:false});valid(level);assert.deepEqual(document,before);
  valid(await compile(parseAml(serializeAml(document)),{navigation:false}));
});

test('a visualization surface cannot serve as the native member of a checked shared edge',async()=>{
  const level=await compile(parseAml(`<architecture version="1" id="visual" validation="premap">${left}<visual-mesh id="right" src="drawing.glb"/>${relation}</architecture>`),{navigation:false,resolveAsset:async()=>({positions:[[2,0,0],[4,0,0],[4,4,0],[2,4,0]],triangles:[[0,1,2],[0,2,3]]})});
  assert.ok(level.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('join')&&d.objects.includes('right')&&d.source));
});
