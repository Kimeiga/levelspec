import type { CompiledLevel, MeshData, Surface } from "./types.ts";

/** Compact selected geometry: unused scenery vertices must not enlarge Recast bounds. */
export function selectMesh(level: CompiledLevel, include: (surface: Surface) => boolean): MeshData {
  const source = level.mesh;
  const mesh: MeshData = { positions: [], normals: [], indices: [], uv: [], surfaces: [],
    ...(source.uv1 ? { uv1: [] } : {}), ...(source.tangents ? { tangents: [] } : {}),
    ...(source.atlasPages ? { atlasPages: [] } : {}), ...(source.chartIds ? { chartIds: [] } : {}) };
  const vertices = new Map<number, number>();
  for (let t=0;t<source.surfaces.length;t++) {
    const si=source.surfaces[t];
    if(!include(level.surfaces[si]))continue;
    mesh.surfaces.push(si);
    if(mesh.atlasPages)mesh.atlasPages.push(source.atlasPages![t]);
    if(mesh.chartIds)mesh.chartIds.push(source.chartIds![t]);
    for(const old of source.indices.slice(t*3,t*3+3)) {
      let index=vertices.get(old);
      if(index===undefined){
        index=mesh.positions.length/3;vertices.set(old,index);
        mesh.positions.push(...source.positions.slice(old*3,old*3+3));
        mesh.normals.push(...source.normals.slice(old*3,old*3+3));
        mesh.uv.push(...source.uv.slice(old*2,old*2+2));
        if(mesh.uv1)mesh.uv1.push(...source.uv1!.slice(old*2,old*2+2));
        if(mesh.tangents)mesh.tangents.push(...source.tangents!.slice(old*4,old*4+4));
      }
      mesh.indices.push(index);
    }
  }
  return mesh;
}
export function collisionMesh(level: CompiledLevel, sealed=false): MeshData {
  return selectMesh(level, (s) => s.collidable !== false && (sealed || !s.dynamic));
}
