import type { MeshData, MeshKind, Surface } from "./types.ts";

export const emptyMesh = (): MeshData => ({
  positions: [],
  normals: [],
  indices: [],
  uv: [],
  surfaces: [],
});

export function meshParts(mesh: MeshData, surfaces: Surface[]) {
  const parts = new Map<
    string,
    {
      id: string;
      kind: MeshKind;
      layer: string;
      layers: string[];
      dynamic: boolean;
      collidable?: boolean;
      visible?: boolean;
      triangles: number[];
    }
  >();
  for (let t = 0; t < mesh.surfaces.length; t++) {
    const s = surfaces[mesh.surfaces[t]],
      id = `${s.mesh}:${s.kind}:${s.dynamic ? "dynamic" : "static"}:${s.collidable === false ? "visual" : "collision"}:${s.visible === false ? "hidden" : "visible"}`,
      part = parts.get(id) ?? {
        id,
        kind: s.kind,
        layer: s.layer,
        layers: [],
        dynamic: s.dynamic,
        ...(s.collidable === false ? { collidable: false } : {}),
        ...(s.visible === false ? { visible: false } : {}),
        triangles: [],
      };
    part.triangles.push(t);
    if (!part.layers.includes(s.layer)) part.layers.push(s.layer);
    part.layer = part.layers.length === 1 ? part.layers[0] : "";
    parts.set(id, part);
  }
  return [...parts.values()];
}
