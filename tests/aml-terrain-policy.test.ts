import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ray, Vector3 } from 'three';
import { compile, parseAml, collisionMesh } from 'levelspec';

/** Uses public AML and leaves the terrain rendering policy enabled. */
async function build(body:string){return compile(parseAml(`<architecture version="1" id="policy" validation="premap">${body}</architecture>`),{navigation:false});}
const patch=(id:string,attributes='')=>`<terrain id="${id}" points="0 0 0; 4 0 0; 4 4 0; 0 4 0" triangles="0 1 2; 0 2 3" orientation="unknown" ${attributes}/>`;
const rendering=(level:Awaited<ReturnType<typeof build>>)=>level.diagnostics.filter(d=>/overlap|coplanar|z.fight|duplicate/i.test(d.message));
const valid=(level:Awaited<ReturnType<typeof build>>)=>assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);

test('open terrain may intersect other terrain and native solids without architectural overlap errors',async()=>{
  const level=await build(patch('flat')+patch('incline','rotation="25 0 0"')+'<box id="foundation" width="1" depth="1" height="2" position="1 1 -1"/>');valid(level);
  assert.deepEqual(rendering(level),[]);
});

test('exposed duplicate faces fail even when their authored windings oppose',async()=>{
  for(const triangles of ['0 1 2; 0 2 3','2 1 0; 3 2 0']){
    const level=await build(patch('a')+`<terrain id="b" points="0 0 0; 4 0 0; 4 4 0; 0 4 0" triangles="${triangles}" orientation="unknown"/>`);
    assert.ok(rendering(level).some(d=>d.severity==='error'&&d.objects.includes('a')&&d.objects.includes('b')));
  }
});

test('derived near-coplanarity warns without pretending its uncertain overlap is confirmed',async()=>{
  const level=await build(patch('a')+patch('b','rotation="0.00001 0 0"'));
  assert.ok(rendering(level).some(d=>d.severity==='warning'&&d.objects.includes('a')&&d.objects.includes('b')));
  valid(level);
});

test('opaque native solids hide buried duplicates but invisible collision proxies do not',async()=>{
  const duplicates=patch('a')+patch('b');
  const buried=await build(duplicates+'<box id="opaque" width="6" depth="6" height="2" position="-1 -1 -1"/>');valid(buried);assert.deepEqual(rendering(buried),[]);
  const invisible=await build(duplicates+'<box id="proxy" width="6" depth="6" height="2" position="-1 -1 -1" visible="false"/>');
  assert.ok(rendering(invisible).some(d=>d.severity==='error'&&d.objects.includes('a')&&d.objects.includes('b')));
});

test('partial burial cannot conceal the exposed remainder of duplicate terrain faces',async()=>{
  const level=await build(patch('a')+patch('b')+'<box id="opaque" width="2" depth="6" height="2" position="-1 -1 -1"/>');
  assert.ok(rendering(level).some(d=>d.severity==='error'&&d.objects.includes('a')&&d.objects.includes('b')));
});

test('explicit patch orientation is checked where declared while unknown orientation remains permissive',async()=>{
  const source='<terrain id="ground" points="0 0 0; 4 0 0; 0 4 0" triangles="0 1 2"';
  const incorrect=await build(source+' orientation="down"/>');
  assert.ok(incorrect.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('ground')&&/winding|normal|orient/i.test(d.message)));
  valid(await build(source+' orientation="up"/>'));valid(await build(source+' orientation="unknown"/>'));
});

test('solid operations validate terrain operands locally and require explicit closure',async()=>{
  const open=await build(`<union id="joined">${patch('ground')}<box id="rock" width="1" depth="1" height="1" position="1 1 -0.5"/></union>`);
  assert.ok(open.diagnostics.some(d=>d.severity==='error'&&d.objects.some(id=>id==='ground'||id==='joined')&&/closed|solid|base|operand/i.test(d.message)));
  const closed=await build('<union id="joined"><terrain id="ground" columns="2" rows="2" cell-size="4 4" heights="1 1 1 1" base="0"/><box id="rock" width="1" depth="1" height="1" position="1 1 0.5"/></union>');valid(closed);
});

test('overhead native geometry does not bury a supported water navigation surface',async()=>{
  const body='<profile id="lake-plan" points="0 0; 10 0; 10 10; 0 10"/><terrain id="bed" columns="2" rows="2" cell-size="10 10" heights="0 0 0 0"/><water id="lake" profile="lake-plan" elevation="2"/><boat radius="1" draft="0.5" height="2"/><box id="roof" width="10" depth="10" height="0.2" position="0 0 5"/><marker id="a" kind="poi" position="2 5 2" movement="water"/><marker id="b" kind="poi" position="8 5 2" movement="water"/><route id="under-roof" from="a" to="b" movement="water" min-routes="1" max-distance="8"/>';
  const level=await compile(parseAml(`<architecture version="1" id="water" validation="premap">${body}</architecture>`));
  assert.equal(level.waterNavigation!.routes.find(route=>route.id==='under-roof')!.reachable,true);valid(level);
});


test('closed native terrain subtraction orients cavity faces toward the actual empty interior',async()=>{
  const level=await build('<subtract id="cave"><terrain id="mass" columns="2" rows="2" cell-size="10 10" heights="10 10 10 10" base="0"/><box id="void" width="8" depth="8" height="8" position="1 1 1"/></subtract>');valid(level);
  const mesh=collisionMesh(level);
  for(const direction of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
    const ray=new Ray(new Vector3(5,5,5),new Vector3(...direction));let nearest=Infinity;let facing=0;
    for(let i=0;i<mesh.indices.length;i+=3){
      const [a,b,c]=mesh.indices.slice(i,i+3).map(index=>new Vector3(...mesh.positions.slice(index*3,index*3+3)));
      const hit=ray.intersectTriangle(a,b,c,false,new Vector3());if(hit&&hit.distanceTo(ray.origin)<nearest){nearest=hit.distanceTo(ray.origin);facing=b.clone().sub(a).cross(c.clone().sub(a)).normalize().dot(ray.direction);}
    }
    assert.ok(Math.abs(nearest-4)<1e-7);assert.ok(facing<-.999999,'Each cavity wall faces the empty interior');
  }
});

test('declared raw terrain orientation survives reflected host and instance frames without hiding inverted source faces',async()=>{
  for(const orientation of ['up','down'])for(const instance of [false,true]){
    const triangles=orientation==='up'?'0 1 2':'2 1 0';
    const element=(indices:string)=>`<terrain id="patch" points="0 0 0; 2 0 0; 0 2 0" triangles="${indices}" orientation="${orientation}" ${instance?'':'scale="-1 1 1"'}/>`;
    const body=(indices:string)=>instance?`<definition id="module">${element(indices)}</definition><instance id="placed" ref="module" scale="-1 1 1"/>`:element(indices);
    valid(await build(body(triangles)));
    const inverted=await build(body(orientation==='up'?'2 1 0':'0 1 2'));
    assert.ok(inverted.diagnostics.some(d=>d.severity==='error'&&d.objects.includes(instance?'placed/patch':'patch')&&/winding|normal|orient/i.test(d.message)));
  }
});
