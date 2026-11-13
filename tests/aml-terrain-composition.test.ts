import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile,parseAml,collisionMesh } from 'levelspec';

const terrain='<terrain id="mass" columns="2" rows="2" cell-size="2 2" heights="1 1 1 1" base="0"/>';
const box='<box id="building" width="2" depth="2" height="1" position="1 1 0.5"/>';
async function build(body:string){return compile(parseAml(`<architecture version="1" id="composition" validation="premap">${body}</architecture>`),{navigation:false});}
/** Signed volume keeps overlapping separate shells additive and distinguishes an explicit union. */
function volume(level:Awaited<ReturnType<typeof build>>){const mesh=collisionMesh(level);let result=0;for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(index=>mesh.positions.slice(index*3,index*3+3));result+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return Math.abs(result);}
function valid(level:Awaited<ReturnType<typeof build>>){assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);}

test('automatic architecture assemblies preserve overlapping closed terrain until an explicit solid operation',async()=>{
  for(const boundary of ['assembly','collision']){
    const independent=await build(`<${boundary} id="site">${terrain}${box}</${boundary}>`);valid(independent);assert.ok(Math.abs(volume(independent)-8)<1e-7);assert.ok(independent.terrainTiles?.length);assert.ok(independent.terrainTiles.every(tile=>tile.terrain==='mass'));
  }
  const combined=await build(`<union id="site">${terrain}${box}</union>`);valid(combined);assert.ok(Math.abs(volume(combined)-7.5)<1e-7);
});

test('closed terrain and final terrain CSG expose deterministic tiles covering their final physical triangles',async()=>{
  for(const body of [terrain,`<subtract id="cave">${terrain}<box id="cut" width="1" depth="1" height="2" position="0.5 0.5 -0.5"/></subtract>`]){
    const level=await build(body);valid(level);const mesh=collisionMesh(level),tiles=level.terrainTiles!;assert.ok(tiles?.length);
    assert.ok(tiles.every(tile=>tile.terrain===(body===terrain?'mass':'cave')));
    const covered=Array(mesh.indices.length/3).fill(0);
    for(const tile of tiles){
      assert.ok(tile.triangleCount>0);const points:number[][]=[];
      for(let t=tile.triangleStart;t<tile.triangleStart+tile.triangleCount;t++){assert.ok(t<covered.length);covered[t]++;points.push(...mesh.indices.slice(t*3,t*3+3).map(index=>mesh.positions.slice(index*3,index*3+3)));}
      for(let axis=0;axis<3;axis++){assert.ok(Math.abs(tile.bounds.min[axis]-Math.min(...points.map(p=>p[axis])))<1e-7);assert.ok(Math.abs(tile.bounds.max[axis]-Math.max(...points.map(p=>p[axis])))<1e-7);}
      assert.ok(tile.hash.length>0);
    }
    assert.ok(covered.every(n=>n===1));assert.deepEqual((await build(body)).terrainTiles,tiles);
  }
});
