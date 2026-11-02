/**
 * Minimal GLB reader for collision: flattens every triangle primitive to world
 * space using node TRS/matrix transforms. Enough for LevelSpec exports, which
 * use float32 POSITION and uint32 or uint16 indices without sparse accessors.
 */
type Mat4 = number[];

const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function trs(node: any): Mat4 {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

export function readGlbTriangles(data: ArrayBuffer): { positions: Float32Array; indices: Uint32Array } {
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("Not a GLB file.");
  const jsonLength = view.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  const binOffset = 20 + jsonLength + 8;
  const accessor = (index: number) => {
    const a = gltf.accessors[index], bv = gltf.bufferViews[a.bufferView];
    const offset = binOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const size = a.type === "VEC3" ? 3 : 1;
    if (bv.byteStride && bv.byteStride !== size * 4) throw new Error("Interleaved accessors are not supported.");
    if (a.componentType === 5126) return new Float32Array(data.slice(offset, offset + a.count * size * 4));
    if (a.componentType === 5125) return new Uint32Array(data.slice(offset, offset + a.count * 4));
    if (a.componentType === 5123) return Uint32Array.from(new Uint16Array(data.slice(offset, offset + a.count * 2)));
    throw new Error(`Unsupported component type ${a.componentType}.`);
  };
  const positions: number[] = [], indices: number[] = [];
  const appendPrimitive = (primitive: any, world: Mat4) => {
    const p = accessor(primitive.attributes.POSITION) as Float32Array;
    const base = positions.length / 3;
    for (let i = 0; i < p.length; i += 3) {
      const [x, y, z] = [p[i], p[i + 1], p[i + 2]];
      positions.push(
        world[0] * x + world[4] * y + world[8] * z + world[12],
        world[1] * x + world[5] * y + world[9] * z + world[13],
        world[2] * x + world[6] * y + world[10] * z + world[14],
      );
    }
    const idx = primitive.indices === undefined
      ? Uint32Array.from({ length: p.length / 3 }, (_, i) => i)
      : accessor(primitive.indices);
    for (const i of idx) indices.push(base + i);
  };
  const visit = (nodeIndex: number, parent: Mat4) => {
    const node = gltf.nodes[nodeIndex], world = multiply(parent, trs(node));
    const primitives = node.mesh === undefined ? [] : gltf.meshes[node.mesh].primitives;
    // Mode 4 is TRIANGLES, the glTF default; points and lines carry no collision.
    for (const primitive of primitives) if ((primitive.mode ?? 4) === 4) appendPrimitive(primitive, world);
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, identity());
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) };
}
