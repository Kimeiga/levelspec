import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { compile, parseAml, serializeAml, collisionMesh, TerrainTileCache, type ArchitectureDocument } from 'levelspec';

/** A three-tile plane leaves independently distinguishable interior and normal-halo edits. */
function plane(edit?:number,attributes='',repeat=1):ArchitectureDocument{
  const heights=Array.from({length:390},(_,i)=>i%130);if(edit!==undefined)heights[130+edit]+=1;
  return parseAml(`<architecture version="1" id="cache" validation="premap"><material id="surface" color="#aaaaaa" repeat="${repeat}"/><terrain id="ground" columns="130" rows="3" heights="${heights.join(' ')}" tile-size="64" material="surface" ${attributes}/></architecture>`);
}
async function build(document:ArchitectureDocument,terrainCache?:TerrainTileCache){return compile(document,{navigation:false,terrainCache});}
function valid(level:Awaited<ReturnType<typeof build>>){assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);}
function counts(level:Awaited<ReturnType<typeof build>>,hits:number,misses:number){assert.equal(level.stats.terrainCacheHits,hits);assert.equal(level.stats.terrainCacheMisses,misses);}
function same(actual:Awaited<ReturnType<typeof build>>,fresh:Awaited<ReturnType<typeof build>>){valid(actual);valid(fresh);assert.deepEqual(actual.mesh,fresh.mesh);assert.deepEqual(collisionMesh(actual),collisionMesh(fresh));assert.equal(actual.physicalHash,fresh.physicalHash);}

test('terrain caches reuse indexed tiles while interior edits invalidate only their dependency tile',async()=>{
  const cache=new TerrainTileCache(),document=plane(),before=structuredClone(document);
  const cold=await build(document,cache),warm=await build(document,cache);valid(cold);counts(cold,0,3);counts(warm,3,0);same(warm,cold);
  const changed=await build(plane(10),cache);counts(changed,2,1);same(changed,await build(plane(10)));
  assert.deepEqual(document,before);
});

test('normal halos invalidate a neighboring tile even when its own height samples are unchanged',async()=>{
  const cache=new TerrainTileCache();await build(plane(),cache);
  const changed=await build(plane(63),cache);counts(changed,1,2);same(changed,await build(plane(63)));
});

test('caller mutations cannot poison cached geometry and undersized caches retain no tiles',async()=>{
  const cache=new TerrainTileCache(),level=await build(plane(),cache);
  level.mesh.positions.fill(999);level.mesh.normals.fill(0);level.mesh.indices.fill(0);
  const recovered=await build(plane(),cache);counts(recovered,3,0);same(recovered,await build(plane()));
  const tiny=new TerrainTileCache(1);counts(await build(plane(),tiny),0,3);counts(await build(plane(),tiny),0,3);
});

test('placement, material repeat, and visibility edits agree with an uncached compile',async()=>{
  const cache=new TerrainTileCache();await build(plane(),cache);
  const colored=plane();colored.materials[0].color="#bb4422";
  const retiled=parseAml(serializeAml(plane()).replace('tile-size="64"','tile-size="32"'));
  for(const document of [plane(undefined,'position="10 20 3" rotation="0 0 90"'),plane(undefined,'',2),plane(undefined,'visible="false"'),colored,retiled]){
    same(await build(document,cache),await build(document));
  }
});

test('tile-cache cancellation recovers without mutating the source or admitting corrupt results',async()=>{
  const cache=new TerrainTileCache(),document=plane(),before=structuredClone(document),controller=new AbortController();let entered=false;
  await assert.rejects(compile(document,{navigation:false,terrainCache:cache,signal:controller.signal,onProgress:stage=>{if(stage==='Terrain tile ground:1,0'){entered=true;controller.abort();}}}),{name:'AbortError'});
  assert.equal(entered,true);same(await build(document,cache),await build(document));
  const warm=await build(document,cache);counts(warm,3,0);assert.deepEqual(document,before);
});


test('same-path heightmap byte edits resample before consulting the geometry cache',async()=>{
  const document=parseAml('<architecture version="1" id="image-cache" validation="premap"><terrain id="ground" heightmap="same.png" min-height="0" max-height="255" tile-size="64"/></architecture>');
  const cache=new TerrainTileCache();
  const encode=(edit=false)=>{const image=new PNG({width:130,height:3});image.data=Buffer.from(Array.from({length:390},(_,i)=>i%130+(edit&&i===140?1:0)));return Uint8Array.from(PNG.sync.write(image,{colorType:0,inputColorType:0,inputHasAlpha:false,filterType:0}));};
  let bytes=encode();const options={navigation:false,terrainCache:cache,resolveHeightmap:async()=>bytes};
  const cold=await compile(document,options);valid(cold);counts(cold,0,3);
  bytes=encode(true);const changed=await compile(document,options);counts(changed,2,1);
  same(changed,await compile(document,{navigation:false,resolveHeightmap:async()=>bytes}));assert.notEqual(changed.physicalHash,cold.physicalHash);
});

test('terrain normal dependency work is bounded with source-linked rejection and clean recovery',async()=>{
  const document=plane(),before=structuredClone(document);
  const rejected=await compile(document,{navigation:false,limits:{terrainDependencies:1}});
  assert.ok(rejected.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('ground')&&d.source&&/depend|budget|limit/i.test(d.message)));
  same(await build(document),await build(plane()));assert.deepEqual(document,before);
});
