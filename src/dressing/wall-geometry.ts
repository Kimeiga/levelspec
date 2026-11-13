import { KitMesh } from "./kit-mesh.ts";
import { kitFinishes } from "./kit.ts";
import { Pen } from "./pen.ts";
import { PipeSystem, type PipeOptions } from "./kowloon/pipes.ts";
import { BoxGeometry, BufferGeometry, Matrix4, Vector3 } from "three";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { aborted } from "../vector/types.ts";
import type { KitBudget } from "./geometry.ts";
import { wallTube } from "./wall-tubes.ts";

/** Optional per-polygon UV mapping, e.g. one paper rectangle within a poster atlas. */
export type WallUv = (point: number[]) => number[];

/** Render-only wall parts with explicit local decal UVs and round utility runs. */
export class WallGeometry {
  private pipeMesh?: KitMesh;
  private surfaces = new Map<string, number>();
  private vertices = new Map<string, number>();
  private level: CompiledArchitecture;
  private host: string;
  private frame: Matrix4;
  private layer: string;
  private budget: KitBudget;
  private prefix: string;
  constructor(
    level: CompiledArchitecture,
    host: string,
    frame: Matrix4,
    layer: string,
    budget: KitBudget,
    prefix: string,
  ) {
    this.level = level;
    this.host = host;
    this.frame = frame;
    this.layer = layer;
    this.budget = budget;
    this.prefix = prefix;
  }

  /** Adds an axis-aligned local prop, sharing draw objects with its material and family. */
  box(name: string, lo: V3, size: V3, material: string, tint: V3 = [1, 1, 1]) {
    const geometry = new BoxGeometry(...size);
    try {
      geometry.translate(lo[0] + size[0] / 2, lo[1] + size[1] / 2, lo[2] + size[2] / 2);
      const repeat = this.level.document.materials.find(entry => entry.id === material)!.repeat;
      const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv");
      for (let i = 0; i < positions.count; i++) {
        const point = [positions.getX(i), positions.getY(i), positions.getZ(i)];
        const axes = Math.abs(normals.getZ(i)) > 0.7 ? [0, 1] : Math.abs(normals.getY(i)) > 0.7 ? [0, 2] : [1, 2];
        uv.setXY(i, point[axes[0]] * repeat, point[axes[1]] * repeat);
      }
      this.geometry(name, geometry, material, tint);
    } finally { geometry.dispose(); }
  }

  /** Adds a thin decal polygon in counterclockwise X/Z order, facing outward. */
  panel(name: string, outline: number[][], depth: number, material: string, tint: V3 = [1, 1, 1], uv?: WallUv) {
    const triangles: number[][][] = [];
    for (let i = 1; i + 1 < outline.length; i++) {
      const [a, b, c] = [outline[0], outline[i + 1], outline[i]];
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-11)
        triangles.push([a, b, c]);
    }
    if (!triangles.length) return;
    const surface = this.surface(name, material, triangles.length, false);
    const normal = new Vector3(0, 1, 0).transformDirection(this.frame).toArray() as V3;
    const repeat = this.level.document.materials.find(entry => entry.id === material)!.repeat;
    for (const local of triangles) {
      this.triangle(local.map(p =>
        new Vector3(p[0], depth, p[1]).applyMatrix4(this.frame).toArray() as V3),
      local.map(() => normal), local.map(p => uv ? uv(p) : [p[0] * repeat, p[1] * repeat]), tint, surface);
    }
  }

  /** Connects a counterclockwise front perimeter to its backing with an outward textured side face. */
  rim(name: string, a: number[], b: number[], front: number, back: number, material: string, tint: V3): void {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 1e-7 || front - back < 1e-7) return;
    const normal = new Vector3(dz / length, 0, -dx / length).transformDirection(this.frame).toArray() as V3;
    const points: V3[] = [[a[0], front, a[1]], [b[0], front, b[1]], [b[0], back, b[1]], [a[0], back, a[1]]];
    const repeat = this.level.document.materials.find(entry => entry.id === material)!.repeat;
    const uv = [[0, front * repeat], [length * repeat, front * repeat], [length * repeat, back * repeat], [0, back * repeat]];
    const surface = this.surface(name, material, 2, false);
    const order = this.frame.determinant() < 0 ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const indices of order) this.triangle(indices.map(index => new Vector3(...points[index]).applyMatrix4(this.frame).toArray() as V3),
      indices.map(() => normal), indices.map(index => uv[index]), tint, surface);
  }

  /** Adds a rectangular decal; dimensions are meters in the wall's X/Z plane. */
  rect(name: string, x: number, z: number, width: number, height: number, depth: number, material: string, tint?: V3) {
    this.panel(name, [[x, z], [x + width, z], [x + width, z + height], [x, z + height]], depth, material, tint);
  }

  /** Routes modular plumbing through the same host, transform, appearance compiler and triangle budget. */
  pipe(name: string, path: V3[], options: PipeOptions, wallY = 0): void {
    if (!this.pipeMesh) {
      const materials = kitFinishes(this.level, this.level.architecture.dressing?.finishes, "$kowloon/wall-pipe").materials;
      this.pipeMesh = new KitMesh(this.level, this.host, this.layer, materials, this.budget);
    }
    const pen = new Pen(this.pipeMesh, `wall/${this.prefix}/${name}`, this.frame, this.frame.determinant() < 0);
    new PipeSystem(pen, options).run(path, wallY);
  }

  /** Adds a continuous rounded tube with endpoint caps; all points are local meters. */
  tube(name: string, points: V3[], radius: number, material: string, tint: V3 = [1, 1, 1]) {
    const repeat = this.level.document.materials.find(entry => entry.id === material)!.repeat;
    const geometry = wallTube(points, radius, repeat);
    if (!geometry) return;
    try { this.geometry(name, geometry, material, tint); }
    finally { geometry.dispose(); }
  }

  /**
   * Charges every triangle before emission, batching each plane/family/material
   * into one object so tiles and printed strokes do not become separate draw calls.
   */
  private surface(name: string, material: string, count: number, closed: boolean): number {
    aborted(this.budget.signal);
    if (this.level.mesh.surfaces.length + count > this.budget.maximumTriangles)
      throw new Error("Dressing triangle budget exceeded.");
    const family = name.split("/")[1].split("-")[0];
    const id = `${this.host}/$dressing/wall/${this.prefix}/${family}/${material}/${closed ? "solid" : "decal"}`;
    const existing = this.surfaces.get(id);
    if (existing !== undefined) return existing;
    if (this.level.provenance[id]) throw new Error(`Generated dressing identity is occupied: ${id}`);
    const source = this.level.provenance[this.host];
    this.level.provenance[id] = {
      id, sourceId: source?.sourceId ?? this.host, source: source?.source,
      host: this.host, instances: [], contributors: [this.host],
    };
    const index = this.level.surfaces.length;
    this.level.surfaces.push({
      id, object: id, mesh: this.host, kind: "prop", role: `wall-${family}`, layer: this.layer,
      material, dynamic: false, collidable: false, visible: true, closed, domain: "visualization",
    });
    this.surfaces.set(id, index);
    return index;
  }

  /** Emits curved geometry with its per-vertex normals, preserving outward winding. */
  private geometry(name: string, input: BufferGeometry, material: string, tint: V3) {
    const geometry = input.clone();
    try {
      geometry.applyMatrix4(this.frame);
      const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
      const uv = geometry.getAttribute("uv");
      const count = geometry.index?.count ?? positions.count;
      const surface = this.surface(name, material, count / 3, true);
      for (let i = 0; i < count; i += 3) {
        const indices = [0, 1, 2].map(j => geometry.index?.getX(i + j) ?? i + j);
        this.triangle(indices.map(j => [positions.getX(j), positions.getY(j), positions.getZ(j)]),
          indices.map(j => [normals.getX(j), normals.getY(j), normals.getZ(j)]),
          indices.map(j => [uv.getX(j), uv.getY(j)]), tint, surface);
      }
    } finally { geometry.dispose(); }
  }

  /** Reuses only identical vertex attributes within this emitter, retaining hard normals and UV seams. */
  private triangle(points: V3[], normals: V3[], uv: number[][], tint: V3, surface: number) {
    const mesh = this.level.mesh;
    for (let i = 0; i < 3; i++) {
      const key = [...points[i], ...normals[i], ...uv[i], ...tint].join(",");
      let index = this.vertices.get(key);
      if (index === undefined) {
        index = mesh.positions.length / 3;
        this.vertices.set(key, index);
        mesh.positions.push(...points[i]); mesh.normals.push(...normals[i]);
        mesh.uv.push(...uv[i]); mesh.colors!.push(...tint);
      }
      mesh.indices.push(index);
    }
    mesh.surfaces.push(surface);
    mesh.solidIds!.push("");
  }
}
