import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import { validateBytes } from "gltf-validator";

type Level = Awaited<ReturnType<typeof compile>>;
type Point = [number, number, number];
interface Face { indices: number[]; points: Point[]; normals: Point[]; uv: number[][]; material: string; role: string; host: string }
const finishSlots = ["ceramic", "edge", "metal", "rust", "paper", "posters"] as const;

/** Explicit finish slots use virtual assets so the test cannot inherit production texture paths. */
function source(length = 14, tileShare = 0, split?: number) {
  return `<architecture version="1" id="wall-details" validation="premap">
    <material id="base" color="#d0d1c9"/>
    ${finishSlots.map((slot, i) => `<material id="sample-wall-${slot}" color="#ffffff" texture="${slot}.png"
      normal-texture="${slot}-normal.png" normal-scale="${0.3 + i * 0.1}" repeat="${slot === "posters" ? 7 : 2.5}"
      roughness="0.8" metalness="${slot === "metal" ? 0.6 : 0}"/>`).join("\n")}
    <path id="axis" points="0 0 0; ${split ?? length} 0 0"/>
    <wall id="wall" path="axis" thickness="0.2" height="3.6"/>
    ${split === undefined ? "" : `<path id="annex-axis" points="${split} 0 0; ${length} 0 0"/>
      <wall id="annex" path="annex-axis" thickness="0.2" height="3.6"/>`}
    <dressing seed="finish-contract" finishes="sample" detail="high" grime="0.6" wear="0.3">
      <wall host="wall" material="base" face="back" windows="false" tile-share="${tileShare}"/>
      ${split === undefined ? "" : `<wall host="annex" material="base" face="back" windows="false" tile-share="${tileShare}"/>`}
    </dressing>
  </architecture>`;
}

/** Requires valid source geometry and verifies that dressing never rewrites caller-owned AML. */
async function build(length = 14, tileShare = 0, split?: number) {
  const document = parseAml(source(length, tileShare, split)), before = structuredClone(document);
  const level = await compile(document, { navigation: false, resolveMaterialImage: async reference => imageBytes(reference.endsWith("-normal.png")) });
  assert.deepEqual(level.diagnostics, []);
  assert.deepEqual(document, before);
  return level;
}

/** Reads the public mesh by semantic role, with all coordinates in domain meters and Z-up. */
function faces(level: Level, role: string): Face[] {
  const result: Face[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.role !== role) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3);
    result.push({
      indices,
      points: indices.map(i => level.mesh.positions.slice(i * 3, i * 3 + 3) as Point),
      normals: indices.map(i => level.mesh.normals.slice(i * 3, i * 3 + 3) as Point),
      uv: indices.map(i => level.mesh.uv.slice(i * 2, i * 2 + 2)),
      material: surface.material, role, host: level.provenance[surface.object].host!,
    });
  }
  return result;
}

/** Welds Float32 output at 10 μm, well below visible grout widths and tube diameters. */
function pointKey(point: Point) { return point.map(value => Math.round(value * 1e5)).join(","); }

/** Canonical undirected triangle edges identify actual joined surfaces, not overlapping bounds. */
function edges(face: Face) {
  return face.points.map((point, i) => [pointKey(point), pointKey(face.points[(i + 1) % 3])].sort().join("|"));
}

/** Groups triangles by shared complete edges, allowing separate collars and nearby paper layers. */
function components(input: Face[]): Face[][] {
  const roots = input.map((_, i) => i);
  const root = (i: number): number => {
    while (roots[i] !== i) { roots[i] = roots[roots[i]]; i = roots[i]; }
    return i;
  };
  const owner = new Map<string, number>();
  for (const [i, face] of input.entries()) for (const edge of edges(face)) {
    const prior = owner.get(edge);
    if (prior === undefined) owner.set(edge, i);
    else roots[root(i)] = root(prior);
  }
  const groups = new Map<number, Face[]>();
  for (const [i, face] of input.entries()) {
    const group = groups.get(root(i)) ?? [];
    group.push(face); groups.set(root(i), group);
  }
  return [...groups.values()];
}

/** Returns coordinate bounds without making connectivity assumptions. */
function bounds(input: Face[]) {
  const points = input.flatMap(face => face.points);
  return {
    low: [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis]))),
    high: [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis]))),
  };
}

/** Independently verifies finite, nondegenerate, outward triangles. */
function validFace(face: Face) {
  const [a, b, c] = face.points;
  const u = b.map((value, axis) => value - a[axis]), v = c.map((value, axis) => value - a[axis]);
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  assert.ok(Math.hypot(...cross) > 1e-11, "No collapsed detail triangles.");
  assert.ok(face.normals.every(normal => cross.reduce((sum, value, axis) => sum + value * normal[axis], 0) > 0),
    "Winding agrees with every corner normal through a rounded bend or chipped edge.");
  assert.ok([...face.points.flat(), ...face.normals.flat(), ...face.uv.flat()].every(Number.isFinite));
}

/** Sums area projected onto the fixture's receiving X/Z plane. */
function area(input: Face[]) {
  return input.reduce((sum, face) => {
    const [a, b, c] = face.points;
    return sum + Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2;
  }, 0);
}

/** A separating-axis check rejects overlapping ceramic triangles beyond 1 μm boundary rounding. */
function overlap(a: Face, b: Face) {
  const polygons = [a, b].map(face => face.points.map(point => [point[0], point[2]]));
  const axes = [[1, 0], [0, 1]];
  for (const polygon of polygons) for (let i = 0; i < 3; i++) {
    const p = polygon[i], q = polygon[(i + 1) % 3], length = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (length > 1e-10) axes.push([(p[1] - q[1]) / length, (q[0] - p[0]) / length]);
  }
  return axes.every(axis => {
    const projected = polygons.map(polygon => polygon.map(point => point[0] * axis[0] + point[1] * axis[1]));
    return Math.min(...projected.map(values => Math.max(...values))) -
      Math.max(...projected.map(values => Math.min(...values))) > 1e-6;
  });
}

/** Sweeps X bounds to check tile triangulation without comparing every pair in a long wall. */
function disjointFronts(input: Face[]) {
  const sorted = input.map(face => ({ face, box: bounds([face]) })).sort((a, b) => a.box.low[0] - b.box.low[0]);
  let active: typeof sorted = [];
  for (const current of sorted) {
    active = active.filter(prior => prior.box.high[0] > current.box.low[0] + 1e-6);
    for (const prior of active) {
      if (prior.box.high[2] <= current.box.low[2] + 1e-6 || current.box.high[2] <= prior.box.low[2] + 1e-6) continue;
      assert.equal(overlap(prior.face, current.face), false,
        "Chipped tile triangulation cannot overlap itself or neighboring ceramic fragments.");
    }
    active.push(current);
  }
}

/** Recognizes a chosen authored finish by its texture, independent of generated material IDs. */
function using(level: Level, input: Face[], slot: string) {
  return input.filter(face => level.document.materials.find(material => material.id === face.material)?.texture === `${slot}.png`);
}

test("bent service pipes are closed connected sweeps with no internal segment caps", async () => {
  const level = await build();
  const pipes = faces(level, "wall-pipe");
  const bent = components(pipes).filter(group => {
    const box = bounds(group);
    return box.high[2] - box.low[2] > 2.5 && box.high[0] - box.low[0] > 0.12;
  });
  assert.ok(bent.length > 0, "A full-height bent riser must be one edge-connected surface, not capped cylinders touching at elbows.");
  for (const group of bent) {
    assert.ok(new Set(group.flatMap(face => face.indices)).size < group.length * 3,
      "Pipe topology reuses mesh vertices instead of serializing every triangle corner independently.");
    const counts = new Map<string, number>();
    for (const face of group) {
      validFace(face);
      for (const edge of edges(face)) counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
    assert.ok([...counts.values()].every(count => count === 2),
      "Every welded edge of a closed riser has exactly two incident triangles, including its rounded elbows.");
    const points = group.flatMap(face => face.points);
    assert.ok(points.every(point => point[1] >= 0.1 - 1e-6 && point[1] <= 0.24 + 1e-6));
  }
});

test("skewed chipped tiles keep valid triangulation and continuous finishes across source wall joins", async () => {
  const whole = await build(8, 1), split = await build(8, 1, 4.37);
  const front = using(whole, faces(whole, "wall-tile"), "ceramic");
  const joinedFront = using(split, faces(split, "wall-tile"), "ceramic");
  const rim = using(whole, faces(whole, "wall-tile"), "edge");
  for (const face of [...front, ...rim, ...joinedFront]) {
    validFace(face);
    for (const [x, y, z] of face.points)
      assert.ok(x >= -1e-6 && x <= 8.000001 && y >= 0.099999 && y <= 0.240001 && z >= -1e-6 && z <= 3.600001,
        "Irregular tiles and bevels remain within the receiving wall silhouette and projection limit.");
  }
  disjointFronts(front);
  disjointFronts(joinedFront);
  assert.ok(Math.abs(area(front) - area(joinedFront)) < 2e-5,
    "Splitting a coplanar receiving wall does not restart its ceramic pattern or change surviving area.");
  const seam = new Map<string, { uv: number[]; hosts: Set<string> }>();
  for (const face of joinedFront) for (const [i, point] of face.points.entries()) {
    if (Math.abs(point[0] - 4.37) > 1e-6) continue;
    const key = pointKey(point), existing = seam.get(key);
    if (existing) {
      assert.ok(face.uv[i].every((value, axis) => Math.abs(value - existing.uv[axis]) < 1e-5),
        "A ceramic fragment crossing a host seam keeps one continuous texture mapping.");
      existing.hosts.add(face.host);
    } else seam.set(key, { uv: face.uv[i], hosts: new Set([face.host]) });
  }
});

/** Small distinct valid images make texture and normal-map export independent of repository artwork. */
function imageBytes(normal: boolean) {
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < 4; i++) image.data.set(normal ? [128, 160, 240, 255] : [180, 170, 140, 255], i * 4);
  return PNG.sync.write(image);
}

/** Validates real exported tangent frames; sharing vertices must not corrupt averaged normal-map directions. */
function tangentFrames(bytes: Uint8Array, json: any, attributes: Record<string, number>) {
  const binaryStart = 28 + new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read = (attribute: string, width: number) => {
    const accessor = json.accessors[attributes[attribute]], storage = json.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126, `${attribute} is a floating-point vector.`);
    const start = binaryStart + (storage.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = storage.byteStride ?? width * 4;
    return { count: accessor.count, at: (i: number) => Array.from({ length: width }, (_, axis) =>
      view.getFloat32(start + i * stride + axis * 4, true)) };
  };
  const normals = read("NORMAL", 3), tangents = read("TANGENT", 4);
  assert.equal(normals.count, tangents.count);
  for (let i = 0; i < tangents.count; i++) {
    const normal = normals.at(i), tangent = tangents.at(i);
    assert.ok(tangent.every(Number.isFinite), "Every exported tangent component is finite.");
    assert.ok(Math.abs(Math.hypot(...tangent.slice(0, 3)) - 1) < 2e-5, "Tangent directions remain unit length.");
    assert.ok(Math.abs(normal.reduce((sum, value, axis) => sum + value * tangent[axis], 0)) < 2e-5,
      "Shared-vertex tangent directions remain orthogonal to their exported normals.");
    assert.ok(tangent[3] === -1 || tangent[3] === 1, "Normal-map handedness remains a signed unit value.");
  }
}

test("poster atlas UVs normalize each notice and declared textured finishes survive normal-mapped GLB export", async () => {
  const level = await build(28, 0.2);
  const notices = using(level, faces(level, "wall-notice"), "posters");
  assert.ok(notices.length > 0, "Wall notices use the explicitly declared poster artwork.");
  const cells = new Set<string>();
  for (const group of components(notices)) {
    for (const face of group) {
      validFace(face);
      const du1 = face.uv[1][0] - face.uv[0][0], dv1 = face.uv[1][1] - face.uv[0][1];
      const du2 = face.uv[2][0] - face.uv[0][0], dv2 = face.uv[2][1] - face.uv[0][1];
      const determinant = du1 * dv2 - du2 * dv1;
      assert.ok(determinant > 0, "Poster lettering is not mirrored when viewed from the receiving wall's outward side.");
      const elevation1 = face.points[1][2] - face.points[0][2], elevation2 = face.points[2][2] - face.points[0][2];
      assert.ok((elevation2 * du1 - elevation1 * du2) / determinant > 0,
        "Poster artwork is upright in the wall's vertical frame.");
    }
    const uvs = group.flatMap(face => face.uv);
    const low = [0, 1].map(axis => Math.min(...uvs.map(uv => uv[axis])));
    const high = [0, 1].map(axis => Math.max(...uvs.map(uv => uv[axis])));
    const cell = [Math.floor((low[0] + high[0]) / 2 * 4), Math.floor((low[1] + high[1]) / 2 * 4)];
    assert.ok(cell[0] >= 0 && cell[0] < 4 && cell[1] >= 0 && cell[1] < 4);
    for (const uv of uvs) for (const [axis, divisions] of [[0, 4], [1, 4]])
      assert.ok(uv[axis] > cell[axis] / divisions && uv[axis] < (cell[axis] + 1) / divisions,
        "Every poster samples one inset atlas cell despite an authored material repeat of seven.");
    assert.ok(high[0] - low[0] > 0.18 && high[1] - low[1] > 0.18, "The artwork fills the physical poster, rather than repeating or sampling a small strip.");
    cells.add(cell.join(","));
  }
  const expectedRoles: Record<string, string[]> = {
    ceramic: ["wall-tile"], edge: ["wall-tile"], metal: ["wall-pipe", "wall-duct", "wall-shutter"],
    rust: ["wall-pipe"], paper: ["wall-notice"], posters: ["wall-notice"],
  };
  const used = new Set<string>();
  for (const [slot, roles] of Object.entries(expectedRoles)) for (const role of roles) {
    const selected = using(level, faces(level, role), slot);
    assert.ok(selected.length > 0, `Declared ${slot} texture reaches ${role} geometry.`);
    for (const face of selected) used.add(face.material);
  }
  for (const id of used) {
    const material = level.document.materials.find(entry => entry.id === id)!;
    const authored = level.architecture.materials.find(entry => entry.texture === material.texture)!;
    for (const property of ["texture", "normalTexture", "normalScale", "repeat", "roughness", "metalness"] as const)
      assert.equal(material[property], authored[property]);
  }
  const assets = await resolveExportAssets(level, async reference => imageBytes(reference.endsWith("-normal.png")));
  const bytes = toGLB(level, { assets });
  assert.equal((await validateBytes(bytes)).issues.numErrors, 0);
  const buffer = Buffer.from(bytes), json = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
  const checkedFrames = new Set<string>();
  for (const id of used) {
    const index = json.materials.findIndex((material: { name: string }) => material.name === id);
    const material = json.materials[index];
    assert.ok(material.pbrMetallicRoughness.baseColorTexture && material.normalTexture);
    const authored = level.document.materials.find(entry => entry.id === id)!;
    assert.equal(material.normalTexture.scale, authored.normalScale);
    const primitives = json.meshes.flatMap((mesh: { primitives: { material: number; attributes: Record<string, number> }[] }) => mesh.primitives)
      .filter((primitive: { material: number }) => primitive.material === index);
    assert.ok(primitives.length > 0);
    assert.ok(primitives.every((primitive: { attributes: Record<string, number> }) => primitive.attributes.TANGENT !== undefined),
      "Normal-mapped procedural details export tangent frames as real GLB attributes.");
    for (const primitive of primitives) {
      const key = `${primitive.attributes.NORMAL}/${primitive.attributes.TANGENT}`;
      if (checkedFrames.has(key)) continue;
      tangentFrames(bytes, json, primitive.attributes);
      checkedFrames.add(key);
    }
  }
});
