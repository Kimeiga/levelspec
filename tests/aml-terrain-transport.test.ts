import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,parseAml,toRuntime,exportMetadata,collisionMesh} from 'levelspec';

test('terrain tile ranges retain their canonical physical referent across render partitioning and collision filtering',async()=>{
  const level=await compile(parseAml('<architecture version="1" id="transport" validation="premap"><material id="base" color="#aaaaaa"/><material id="accent" color="#bb4422"/><box id="decoration" width="4" depth="2" height="1" material="base" collidable="false"/><profile id="paint" points="1 0.5; 3 0.5; 3 1.5; 1 1.5"/><face-material id="painted" host="decoration" face="top" profile="paint" material="accent"/><terrain id="ground" columns="2" rows="2" cell-size="2 2" heights="0 0 0 0" position="10 0 0"/></architecture>'),{navigation:false});
  assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);
  assert.ok(level.mesh.indices.length>level.physicalMesh!.indices.length,'Render partitions really change triangle indexing');
  assert.ok(collisionMesh(level).indices.length<level.physicalMesh!.indices.length,'Noncollidable geometry really changes collision indexing');
  for(const transport of [JSON.parse(JSON.stringify(toRuntime(level))),JSON.parse(JSON.stringify(exportMetadata(level,['glb'])))]){
    assert.deepEqual(transport.physicalMesh,JSON.parse(JSON.stringify(level.physicalMesh)));
    assert.deepEqual(transport.terrainTiles,level.terrainTiles);
    for(const tile of transport.terrainTiles){
      const mesh=transport.physicalMesh,points:number[][]=[];
      for(let t=tile.triangleStart;t<tile.triangleStart+tile.triangleCount;t++)points.push(...mesh.indices.slice(t*3,t*3+3).map((index:number)=>mesh.positions.slice(index*3,index*3+3)));
      assert.ok(points.length);assert.ok(points.every(point=>point[0]>=10&&point[0]<=12&&point[1]>=0&&point[1]<=2&&point[2]===0));
      for(let axis=0;axis<3;axis++){assert.equal(Math.min(...points.map(point=>point[axis])),tile.bounds.min[axis]);assert.equal(Math.max(...points.map(point=>point[axis])),tile.bounds.max[axis]);}
    }
  }
});

test('imported visualization triangles never enter canonical physical transport or terrain tile indexing',async()=>{
  const level=await compile(parseAml('<architecture version="1" id="visual-transport" validation="premap"><visual-mesh id="drawing" src="drawing.glb"/><terrain id="ground" columns="2" rows="2" cell-size="2 2" heights="0 0 0 0"/></architecture>'),{navigation:false,resolveAsset:async()=>({positions:[[100,0,0],[101,0,0],[100,1,0]],triangles:[[0,1,2]]})});
  assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);
  assert.ok(level.mesh.positions.some((n,i)=>i%3===0&&n>=100),'Visualization still renders');
  for(const mesh of [level.physicalMesh!,toRuntime(level).physicalMesh!,exportMetadata(level,['glb']).physicalMesh!]){
    assert.equal(mesh.indices.length,6);assert.ok(mesh.positions.every((n,i)=>i%3!==0||n<=2));
    for(const tile of level.terrainTiles!){
      const indices=mesh.indices.slice(tile.triangleStart*3,(tile.triangleStart+tile.triangleCount)*3);assert.equal(indices.length,6);
      assert.ok(indices.every(index=>mesh.positions[index*3]<=2));
    }
  }
  assert.equal(collisionMesh(level).indices.length,6);
});
