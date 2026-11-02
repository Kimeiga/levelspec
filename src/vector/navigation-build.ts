/** Bounded spatial bakes avoid Recast detail-vertex saturation on large terrain polygons. */
import {NavMesh,NavMeshParams,VerticesArray,TrianglesArray,RecastChunkyTriMesh,RecastBuildContext,Raw,Detour,statusFailed,freeHeightfield,freeCompactHeightfield,freeContourSet,freePolyMesh,freePolyMeshDetail} from "recast-navigation";
import {generateSoloNavMesh,generateTileNavMeshData,buildTiledNavMeshRcConfig,getBoundingBox,tiledNavMeshGeneratorConfigDefaults,type SoloNavMeshGeneratorConfig} from "recast-navigation/generators";
import {ClipContext} from "./clipping.ts";
import {aborted,type NavigationOptions} from "./types.ts";

type Intermediates = Pick<ReturnType<typeof generateSoloNavMesh>["intermediates"], "heightfield" | "compactHeightfield" | "contourSet" | "polyMesh" | "polyMeshDetail">;
function releaseIntermediates(m: Intermediates) {
  if(m.heightfield)freeHeightfield(m.heightfield);
  if(m.compactHeightfield)freeCompactHeightfield(m.compactHeightfield);
  if(m.contourSet)freeContourSet(m.contourSet);
  if(m.polyMesh)freePolyMesh(m.polyMesh);
  if(m.polyMeshDetail)freePolyMeshDetail(m.polyMeshDetail);
}

function addTile(mesh: NavMesh, result: ReturnType<typeof generateTileNavMeshData>, x: number, y: number, guard: ClipContext) {
  const m=result.intermediates;
  try {
    // Recast rejects zero-polygon Detour data even when an empty tile is valid.
    if(!result.success) {
      if(m.polyMesh?.npolys()===0 && result.error==="Failed to create Detour navmesh data")return false;
      guard.fail(`navigation tile ${x},${y}`,result.error);
    }
    if(!result.data)return false;
    try {guard.allocate((m.polyMesh?.nverts()??0)+(m.polyMeshDetail?.nverts()??0));}
    catch(error){result.data.destroy();throw error;}
    const added=mesh.addTile(result.data,Detour.DT_TILE_FREE_DATA,0);
    if(statusFailed(added.status)){result.data.destroy();guard.fail(`navigation tile ${x},${y}`,`Could not add tile (status ${added.status}).`);}
    return true;
  } finally {
    releaseIntermediates(m);
  }
}

export function generateNavigation(positions:number[],indices:number[],config:Partial<SoloNavMeshGeneratorConfig>,options:NavigationOptions,guard:ClipContext) {
  const {bbMin,bbMax}=getBoundingBox(positions,indices);
  const extent=Math.max(bbMax[0]-bbMin[0],bbMax[2]-bbMin[2]);
  if(extent<=32) {
    const result=generateSoloNavMesh(positions,indices,config,true),m=result.intermediates;
    const empty=m.polyMesh?.npolys()===0;
    releaseIntermediates(m);
    return {...result,empty};
  }
  const settings={...tiledNavMeshGeneratorConfigDefaults,...config,tileSize:32,detailSampleDist:3};
  const layout=buildTiledNavMeshRcConfig({recastConfig:settings,navMeshBounds:[bbMin,bbMax]});
  const mesh=new NavMesh(),vertices=new VerticesArray(),triangles=new TrianglesArray(),chunky=new RecastChunkyTriMesh(),context=new RecastBuildContext();
  let complete=false,tiles=0;
  try {
    vertices.copy(positions);triangles.copy(indices);
    const params=NavMeshParams.create({orig:layout.orig,tileWidth:layout.tcs,tileHeight:layout.tcs,maxTiles:layout.maxTiles,maxPolys:layout.maxPolysPerTile});
    const initialized=mesh.initTiled(params);Raw.destroy(params.raw);
    if(!initialized)guard.fail("navigation tiles","Could not initialize tiled navigation.");
    if(!chunky.init(vertices,triangles,indices.length/3,256))guard.fail("navigation tiles","Could not index navigation triangles.");
    if(layout.tileWidth*layout.tileHeight>layout.maxTiles)guard.fail("navigation tiles",`${layout.tileWidth*layout.tileHeight} tiles exceed capacity ${layout.maxTiles}.`,"CLIP_COMPLEXITY_LIMIT");
    for(let y=0;y<layout.tileHeight;y++)for(let x=0;x<layout.tileWidth;x++) {
      aborted(options.signal);
      const result=generateTileNavMeshData(vertices,triangles,layout.config,chunky,{x,y,bmin:[bbMin[0]+x*layout.tcs,bbMin[1],bbMin[2]+y*layout.tcs],bmax:[bbMin[0]+(x+1)*layout.tcs,bbMax[1],bbMin[2]+(y+1)*layout.tcs]}, {offMeshConnections:config.offMeshConnections,buildBvTree:true},true,context);
      if(addTile(mesh,result,x,y,guard))tiles++;
    }
    guard.repair("NAV_SPATIAL_SUBDIVISION","Subdivided a large navigation bake into bounded tiles to preserve terrain detail.",tiles);
    complete=true;
    return {success:true as const,navMesh:mesh,empty:tiles===0};
  } finally {
    vertices.destroy();triangles.destroy();Raw.destroy(chunky.raw);Raw.destroy(layout.config);
    if(!complete)mesh.destroy();
  }
}
