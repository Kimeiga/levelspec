import { Matrix4, Quaternion, Vector3 } from "three";
import type { AssetGeometry, AssetResolver } from "./props.ts";

type GLTF = {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: {
    mesh?: number;
    children?: number[];
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
  }[];
  meshes?: {
    primitives: {
      attributes?: Record<string, number>;
      indices?: number;
      mode?: number;
      extensions?: Record<string, unknown>;
    }[];
  }[];
  accessors?: {
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    normalized?: boolean;
    sparse?: unknown;
  }[];
  bufferViews?: {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
  }[];
  buffers?: { byteLength: number; uri?: string }[];
};

const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseContainer(bytes: Uint8Array) {
  if (bytes.byteLength < 20) throw new Error("GLB is too small.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("Expected a binary glTF (.glb) file.");
  if (view.getUint32(4, true) !== 2) throw new Error("Only glTF 2.0 GLB files are supported.");
  if (view.getUint32(8, true) !== bytes.byteLength) throw new Error("GLB declared length does not match the file.");
  let offset = 12, json: GLTF | undefined, bin: Uint8Array | undefined;
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    offset += 8;
    if (length < 0 || offset + length > bytes.byteLength) throw new Error("GLB contains a truncated chunk.");
    const chunk = bytes.subarray(offset, offset + length);
    if (type === JSON_CHUNK) {
      if (json) throw new Error("GLB contains more than one JSON chunk.");
      const text = new TextDecoder().decode(chunk).replace(/[\u0000 ]+$/g, "");
      json = JSON.parse(text) as GLTF;
    } else if (type === BIN_CHUNK) {
      if (bin) throw new Error("GLB contains more than one BIN chunk.");
      bin = chunk;
    }
    offset += length;
  }
  if (!json) throw new Error("GLB is missing its JSON chunk.");
  if (offset !== bytes.byteLength) throw new Error("GLB contains trailing partial chunk data.");
  return { json, bin };
}

function reader(componentType: number) {
  switch (componentType) {
    case 5121: return { bytes: 1, read: (v: DataView, o: number) => v.getUint8(o) };
    case 5123: return { bytes: 2, read: (v: DataView, o: number) => v.getUint16(o, true) };
    case 5125: return { bytes: 4, read: (v: DataView, o: number) => v.getUint32(o, true) };
    case 5126: return { bytes: 4, read: (v: DataView, o: number) => v.getFloat32(o, true) };
    default: throw new Error(`Unsupported glTF accessor componentType ${componentType}.`);
  }
}

function accessor(gltf: GLTF, bin: Uint8Array | undefined, index: number, type: "SCALAR" | "VEC3") {
  const a = gltf.accessors?.[index];
  if (!a) throw new Error(`Missing glTF accessor ${index}.`);
  if (a.type !== type) throw new Error(`Accessor ${index} must be ${type}.`);
  if (!Number.isSafeInteger(a.count) || a.count < 0) throw new Error(`Accessor ${index} has an invalid count.`);
  if (a.normalized || a.sparse) throw new Error("Normalized and sparse GLB accessors are not supported.");
  if (a.bufferView === undefined) throw new Error(`Accessor ${index} has no bufferView.`);
  const bv = gltf.bufferViews?.[a.bufferView];
  if (!bv || bv.buffer !== 0) throw new Error("GLB mesh accessors must use buffer 0.");
  if (!bin) throw new Error("GLB mesh accessors require a BIN chunk.");
  const sourceBuffer = gltf.buffers?.[0];
  if (sourceBuffer?.uri) throw new Error("External/data URI buffers are not supported inside GLB assets.");
  const components = type === "VEC3" ? 3 : 1, r = reader(a.componentType);
  if (type === "VEC3" && a.componentType !== 5126) throw new Error("POSITION accessors must use FLOAT components.");
  if (type === "SCALAR" && ![5121, 5123, 5125].includes(a.componentType))
    throw new Error("Index accessors must use unsigned integer components.");
  const packed = components * r.bytes, stride = bv.byteStride ?? packed;
  if (stride < packed || stride % r.bytes) throw new Error(`Accessor ${index} has an invalid byte stride.`);
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const end = start + (a.count ? (a.count - 1) * stride + packed : 0);
  if (start < 0 || end > bin.byteLength || end > (bv.byteOffset ?? 0) + bv.byteLength)
    throw new Error(`Accessor ${index} exceeds its GLB buffer view.`);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength), result: number[][] = [];
  for (let i = 0; i < a.count; i++) {
    const row: number[] = [];
    for (let c = 0; c < components; c++) row.push(r.read(view, start + i * stride + c * r.bytes));
    result.push(row);
  }
  return result;
}

function localMatrix(node: NonNullable<GLTF["nodes"]>[number]) {
  if (node.matrix) {
    if (node.matrix.length !== 16 || node.matrix.some((n) => !Number.isFinite(n)))
      throw new Error("glTF node matrix must contain 16 finite values.");
    return new Matrix4().fromArray(node.matrix);
  }
  const t = node.translation ?? [0, 0, 0], q = node.rotation ?? [0, 0, 0, 1], s = node.scale ?? [1, 1, 1];
  if (t.length !== 3 || q.length !== 4 || s.length !== 3 || [...t, ...q, ...s].some((n) => !Number.isFinite(n)))
    throw new Error("glTF node TRS transform is malformed.");
  return new Matrix4().compose(new Vector3(...t), new Quaternion(...q).normalize(), new Vector3(...s));
}

function roots(gltf: GLTF) {
  const nodes = gltf.nodes ?? [], scene = gltf.scenes?.[gltf.scene ?? 0];
  if (scene?.nodes?.length) return scene.nodes;
  const children = new Set(nodes.flatMap((n) => n.children ?? []));
  return nodes.map((_, i) => i).filter((i) => !children.has(i));
}

export function parseGLBGeometry(bytes: Uint8Array): AssetGeometry {
  const { json: gltf, bin } = parseContainer(bytes);
  const positions: [number, number, number][] = [], triangles: [number, number, number][] = [];
  const nodes = gltf.nodes ?? [], meshes = gltf.meshes ?? [];
  const walk = (index: number, parent: Matrix4, stack: Set<number>) => {
    const node = nodes[index];
    if (!node) throw new Error(`glTF scene references missing node ${index}.`);
    if (stack.has(index)) throw new Error("glTF node hierarchy contains a cycle.");
    const world = parent.clone().multiply(localMatrix(node)),
      mirrored = world.determinant() < 0,
      next = new Set(stack).add(index);
    if (node.mesh !== undefined) {
      const mesh = meshes[node.mesh];
      if (!mesh) throw new Error(`glTF node references missing mesh ${node.mesh}.`);
      for (const primitive of mesh.primitives) {
        if ((primitive.mode ?? 4) !== 4) throw new Error("Only TRIANGLES GLB primitives are supported.");
        if (primitive.extensions?.KHR_draco_mesh_compression)
          throw new Error("Draco-compressed GLB geometry is not supported.");
        const positionAccessor = primitive.attributes?.POSITION;
        if (positionAccessor === undefined) throw new Error("GLB primitive is missing POSITION.");
        const source = accessor(gltf, bin, positionAccessor, "VEC3"),
          ids = primitive.indices === undefined
            ? Array.from({ length: source.length }, (_, i) => i)
            : accessor(gltf, bin, primitive.indices, "SCALAR").map((v) => v[0]);
        if (ids.length % 3) throw new Error("GLB triangle index count must be divisible by three.");
        const remap = new Map<number, number>();
        const mapped = (old: number) => {
          if (!Number.isSafeInteger(old) || old < 0 || old >= source.length)
            throw new Error("GLB index references a missing POSITION vertex.");
          const known = remap.get(old);
          if (known !== undefined) return known;
          const p = source[old],
            v = new Vector3(p[0], p[1], p[2]).applyMatrix4(world);
          if (![v.x, v.y, v.z].every(Number.isFinite))
            throw new Error("GLB transform produced a nonfinite position.");
          const index = positions.length;
          positions.push([v.x, -v.z, v.y]);
          remap.set(old, index);
          return index;
        };
        for (let i = 0; i < ids.length; i += 3) {
          const a = mapped(ids[i]), b = mapped(ids[i + 1]), c = mapped(ids[i + 2]);
          triangles.push(mirrored ? [a, c, b] : [a, b, c]);
        }
      }
    }
    for (const child of node.children ?? []) walk(child, world, next);
  };
  for (const root of roots(gltf)) walk(root, new Matrix4(), new Set());
  if (!triangles.length) throw new Error("GLB contains no triangle mesh geometry in its default scene.");
  return { positions, triangles };
}

export type GLBReader = (source: string, signal?: AbortSignal) => Promise<Uint8Array>;
export function createGLBAssetResolver(read: GLBReader): AssetResolver {
  return async (asset, signal) => {
    signal?.throwIfAborted();
    if (!/\.glb$/i.test(asset.src)) throw new Error(`Asset ${asset.id}: only .glb files are supported by the built-in resolver.`);
    const bytes = await read(asset.src, signal);
    signal?.throwIfAborted();
    return parseGLBGeometry(bytes);
  };
}
