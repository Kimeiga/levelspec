import { Matrix4 } from "three";
import type { V3 } from "../architecture/types.ts";
import type { KitMesh, KitSlot } from "./kit-mesh.ts";
import type { SurfaceChart } from "./surface/types.ts";

/** A linear RGB vertex multiplier, constant or evaluated at pen-local points. */
export type Tint = V3 | ((point: V3) => V3);

const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scaled = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const added = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const unit = (a: V3): V3 => scaled(a, 1 / Math.hypot(...a));

/** One vertex of a smooth patch: its pen-local position, texture coordinates and linear RGB tint. */
export interface PatchVertex {
  at: V3;
  uv: number[];
  tint: V3;
}

/** Box faces by letter: left/right are -X/+X, back/front -Y/+Y, down/up -Z/+Z. */
const BOX_FACES: [string, number[], V3][] = [
  ["l", [0, 4, 7, 3], [-1, 0, 0]],
  ["r", [1, 2, 6, 5], [1, 0, 0]],
  ["b", [0, 3, 2, 1], [0, -1, 0]],
  ["f", [4, 5, 6, 7], [0, 1, 0]],
  ["d", [0, 1, 5, 4], [0, 0, -1]],
  ["u", [3, 7, 6, 2], [0, 0, 1]],
];

/**
 * Draws kit parts in a local frame of meters: on a facade X runs to the right
 * as seen from outside, Y points outward and Z up. Frames may be left-handed;
 * every face is wound from an explicit outward hint, so reflection is safe.
 * A pen owns no geometry: it appends world-space triangles to its mesh.
 */
export class Pen {
  readonly mesh: KitMesh;
  readonly part: string;
  readonly matrix: Matrix4;
  /** True when the host placement mirrors the world, which reverses lettering. */
  readonly mirrored: boolean;

  constructor(mesh: KitMesh, part: string, matrix: Matrix4, mirrored: boolean) {
    this.mesh = mesh;
    this.part = part;
    this.matrix = matrix;
    this.mirrored = mirrored;
  }

  /** Returns a pen translated by a local offset; planar texture coordinates restart at the new origin. */
  move(x: number, y: number, z: number): Pen {
    return new Pen(
      this.mesh,
      this.part,
      this.matrix.clone().multiply(new Matrix4().makeTranslation(x, y, z)),
      this.mirrored,
    );
  }

  /** Returns a pen drawing into another named part of the same host. */
  into(part: string): Pen {
    return new Pen(this.mesh, part, this.matrix, this.mirrored);
  }

  /**
   * Returns a pen for a vertical plane inside this frame: `tangent` becomes X,
   * `outward` becomes Y, Z stays up. Both must be horizontal unit vectors.
   */
  facing(origin: V3, tangent: V3, outward: V3): Pen {
    const basis = new Matrix4().set(
      tangent[0], outward[0], 0, origin[0],
      tangent[1], outward[1], 0, origin[1],
      tangent[2], outward[2], 1, origin[2],
      0, 0, 0, 1,
    );
    return new Pen(
      this.mesh,
      this.part,
      this.matrix.clone().multiply(basis),
      this.mirrored,
    );
  }

  /** Transforms a local point to world coordinates. */
  world(p: V3): V3 {
    const e = this.matrix.elements;
    return [
      e[0] * p[0] + e[4] * p[1] + e[8] * p[2] + e[12],
      e[1] * p[0] + e[5] * p[1] + e[9] * p[2] + e[13],
      e[2] * p[0] + e[6] * p[1] + e[10] * p[2] + e[14],
    ];
  }

  /** Coordinates for a vertical receiving face; X is U, Z is V and Y is outward. */
  surfaceFrame(depth = 0): SurfaceChart["frame"] {
    return { origin: this.world([0, depth, 0]), u: this.direction([1, 0, 0]), v: this.direction([0, 0, 1]), normal: this.direction([0, 1, 0]) };
  }

  /** Transforms a local direction; frames are orthonormal, so no renormalization is needed. */
  private direction(d: V3): V3 {
    const e = this.matrix.elements;
    return [
      e[0] * d[0] + e[4] * d[1] + e[8] * d[2],
      e[1] * d[0] + e[5] * d[1] + e[9] * d[2],
      e[2] * d[0] + e[6] * d[1] + e[10] * d[2],
    ];
  }

  /** Projects into the actual face plane in meters; outward hints affect winding only. */
  private planar(points: V3[], repeat: number): number[][] {
    let normal: V3 = [0, 0, 1];
    for (let i = 1; i + 1 < points.length; i++) {
      const candidate = cross(subtract(points[i], points[0]), subtract(points[i + 1], points[0]));
      if (Math.hypot(...candidate) > 1e-9) { normal = unit(candidate); break; }
    }
    const dominant = normal.reduce((best, value, axis) => Math.abs(value) > Math.abs(normal[best]) ? axis : best, 0);
    if (normal[dominant] < 0) normal = scaled(normal, -1);
    const horizontal: V3 = dominant === 0 ? [0, 1, 0] : [1, 0, 0];
    const u = unit(subtract(horizontal, scaled(normal, dot(horizontal, normal))));
    let v = cross(normal, u);
    const vertical: V3 = dominant === 2 ? [0, 1, 0] : [0, 0, 1];
    if (dot(v, vertical) < 0) v = scaled(v, -1);
    return points.map(point => [dot(point, u) * repeat, dot(point, v) * repeat]);
  }

  /**
   * Appends a convex polygon whose front faces `hint`. Vertex order is free.
   * `uv` overrides planar texture coordinates; `normals` (local, unit) request
   * smooth shading. Degenerate triangles are dropped.
   */
  face(
    slot: KitSlot,
    points: V3[],
    hint: V3,
    tint: Tint,
    uv?: number[][],
    normals?: V3[],
  ): void {
    const positions = points.map((p) => this.world(p));
    const outward = this.direction(hint);
    const coordinates = uv ?? this.planar(points, this.mesh.repeat(slot));
    for (let i = 1; i + 1 < points.length; i++) {
      const a = positions[0], b = positions[i], c = positions[i + 1];
      const abX = b[0] - a[0], abY = b[1] - a[1], abZ = b[2] - a[2];
      const acX = c[0] - a[0], acY = c[1] - a[1], acZ = c[2] - a[2];
      let normalX = abY * acZ - abZ * acY;
      let normalY = abZ * acX - abX * acZ;
      let normalZ = abX * acY - abY * acX;
      const length = Math.hypot(normalX, normalY, normalZ);
      if (length < 1e-9) continue;
      let second = i, third = i + 1;
      if (normalX * outward[0] + normalY * outward[1] + normalZ * outward[2] < 0) {
        second = i + 1;
        third = i;
        normalX *= -1;
        normalY *= -1;
        normalZ *= -1;
      }
      const inverseLength = 1 / length;
      this.mesh.add(
        this.part,
        slot,
        [positions[0], positions[second], positions[third]],
        normals
          ? [this.direction(normals[0]), this.direction(normals[second]), this.direction(normals[third])]
          : [normalX * inverseLength, normalY * inverseLength, normalZ * inverseLength],
        [coordinates[0], coordinates[second], coordinates[third]],
        typeof tint === "function"
          ? [tint(points[0]), tint(points[second]), tint(points[third])]
          : [tint, tint, tint],
      );
    }
  }

  /**
   * Appends a smoothly shaded surface through a grid of vertices indexed
   * `grid[row][column]`. Its front is the side from which columns run to the
   * right while rows run downward, as on a facade seen from outside;
   * `flipped` shows the other side instead. Shading normals follow the grid's
   * curvature. Degenerate triangles are dropped.
   */
  patch(slot: KitSlot, grid: PatchVertex[][], flipped = false): void {
    const rows = grid.length,
      columns = grid[0].length;
    const sign = flipped ? -1 : 1;
    const positions = grid.map((row) => row.map((vertex) => this.world(vertex.at)));
    const normals = grid.map((row, r) =>
      row.map((_, c) => {
        const across = subtract(row[Math.min(columns - 1, c + 1)].at, row[Math.max(0, c - 1)].at);
        const down = subtract(grid[Math.min(rows - 1, r + 1)][c].at, grid[Math.max(0, r - 1)][c].at);
        const normal = cross(across, down);
        const length = Math.hypot(...normal);
        return this.direction(length < 1e-12 ? [0, sign, 0] : scaled(normal, sign / length));
      }),
    );
    for (let r = 0; r + 1 < rows; r++)
      for (let c = 0; c + 1 < columns; c++)
        for (const corners of [
          [[r, c], [r, c + 1], [r + 1, c + 1]],
          [[r, c], [r + 1, c + 1], [r + 1, c]],
        ]) {
          const [a, b, d] = corners.map(([row, column]) => positions[row][column]);
          const facing = cross(subtract(b, a), subtract(d, a));
          if (Math.hypot(...facing) < 1e-12) continue;
          const shading = corners.map(([row, column]) => normals[row][column]);
          const outward = added(added(shading[0], shading[1]), shading[2]);
          const order = dot(facing, outward) < 0 ? [0, 2, 1] : [0, 1, 2];
          this.mesh.add(
            this.part,
            slot,
            order.map((k) => positions[corners[k][0]][corners[k][1]]),
            order.map((k) => shading[k]),
            order.map((k) => grid[corners[k][0]][corners[k][1]].uv),
            order.map((k) => grid[corners[k][0]][corners[k][1]].tint),
          );
        }
  }

  /** Appends a rectangle on the plane Y=`y`, facing outward. */
  panel(
    slot: KitSlot,
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    y: number,
    tint: Tint,
    uv?: number[][],
  ): void {
    this.face(
      slot,
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
      ],
      [0, 1, 0],
      tint,
      uv,
    );
  }

  /**
   * Appends an axis-aligned box. `omit` lists faces to skip by letter (see
   * BOX_FACES); parts mounted on a wall omit their hidden back by default.
   */
  box(slot: KitSlot, lo: V3, hi: V3, tint: Tint, omit = "b"): void {
    const corners: V3[] = [
      [lo[0], lo[1], lo[2]],
      [hi[0], lo[1], lo[2]],
      [hi[0], lo[1], hi[2]],
      [lo[0], lo[1], hi[2]],
      [lo[0], hi[1], lo[2]],
      [hi[0], hi[1], lo[2]],
      [hi[0], hi[1], hi[2]],
      [lo[0], hi[1], hi[2]],
    ];
    for (const [letter, indices, hint] of BOX_FACES)
      if (!omit.includes(letter))
        this.face(
          slot,
          indices.map((k) => corners[k]),
          hint,
          tint,
        );
  }

  /** Appends a thin sheet visible from both sides, such as cloth or sheet metal. */
  sheet(slot: KitSlot, points: V3[], tint: Tint, back: Tint = tint): void {
    const normal = unit(
      cross(subtract(points[1], points[0]), subtract(points[2], points[0])),
    );
    this.face(slot, points, normal, tint);
    this.face(slot, points, scaled(normal, -1), back);
  }

  /** Appends a square-section member between two points, without end caps. */
  bar(slot: KitSlot, a: V3, b: V3, thickness: number, tint: Tint): void {
    const axis = unit(subtract(b, a));
    const side = unit(
      cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]),
    );
    const other = cross(axis, side);
    const h = thickness / 2;
    for (const [u, v] of [
      [side, other],
      [other, scaled(side, -1)],
      [scaled(side, -1), scaled(other, -1)],
      [scaled(other, -1), side],
    ] as [V3, V3][]) {
      const offsets = [added(scaled(u, h), scaled(v, -h)), added(scaled(u, h), scaled(v, h))];
      this.face(
        slot,
        [added(a, offsets[0]), added(b, offsets[0]), added(b, offsets[1]), added(a, offsets[1])],
        u,
        tint,
      );
    }
  }

  /**
   * Appends a capped rectangular member with small chamfered longitudinal edges.
   * Side is a unit vector perpendicular to a..b; width/depth and bevel are meters.
   * The caller owns assembly placement; no coordinates or input arrays are changed.
   */
  beveledBar(slot: KitSlot, a: V3, b: V3, side: V3, width: number, depth: number, tint: Tint, bevel = 0.0015): void {
    const delta = subtract(b, a), length = Math.hypot(...delta);
    if (![...a, ...b, ...side, width, depth, bevel].every(Number.isFinite)
      || length < 1e-6 || width <= 0 || depth <= 0 || bevel < 0
      || Math.abs(Math.hypot(...side) - 1) > 1e-5 || Math.abs(dot(side, delta) / length) > 1e-5)
      throw new Error("Beveled member requires finite dimensions and an orthogonal unit side vector.");
    const axis = scaled(delta, 1 / length), other = unit(cross(axis, side));
    const u = scaled(side, width / 2), v = scaled(other, depth / 2);
    const inset = Math.min(bevel, Math.min(width, depth) * 0.18);
    const sx = 1 - inset * 2 / width, sy = 1 - inset * 2 / depth;
    const section = inset > 0
      ? [[-sx, -1], [sx, -1], [1, -sy], [1, sy], [sx, 1], [-sx, 1], [-1, sy], [-1, -sy]]
      : [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const ring = (at: V3): V3[] => section.map(([x, y]) => added(at, added(scaled(u, x), scaled(v, y))));
    const start = ring(a), end = ring(b);
    for (let k = 0; k < section.length; k++) {
      const next = (k + 1) % section.length;
      const outward = subtract(scaled(added(start[k], start[next]), 0.5), a);
      this.face(slot, [start[k], start[next], end[next], end[k]], outward, tint);
    }
    this.face(slot, start, scaled(axis, -1), tint);
    this.face(slot, end, axis, tint);
  }

  /**
   * Appends a smooth round tube through `path`, without end caps. Bends are
   * butt joints; callers hide them with collars where they matter.
   */
  tube(
    slot: KitSlot,
    path: V3[],
    radius: number,
    tint: Tint,
    sides = 6,
  ): void {
    for (let s = 0; s + 1 < path.length; s++) {
      const a = path[s],
        b = path[s + 1];
      if (Math.hypot(...subtract(b, a)) < 1e-6) continue;
      const axis = unit(subtract(b, a));
      const side = unit(
        cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]),
      );
      const other = cross(axis, side);
      const ring = Array.from({ length: sides + 1 }, (_, k) => {
        const angle = (k / sides) * Math.PI * 2;
        return added(
          scaled(side, Math.cos(angle)),
          scaled(other, Math.sin(angle)),
        );
      });
      for (let k = 0; k < sides; k++) {
        const n0 = ring[k],
          n1 = ring[k + 1];
        this.face(
          slot,
          [
            added(a, scaled(n0, radius)),
            added(b, scaled(n0, radius)),
            added(b, scaled(n1, radius)),
            added(a, scaled(n1, radius)),
          ],
          added(n0, n1),
          tint,
          undefined,
          [n0, n0, n1, n1],
        );
      }
    }
  }

  /** Appends a flat disc of `sides` segments centered at `center`, facing `hint`. */
  disc(
    slot: KitSlot,
    center: V3,
    radius: number,
    hint: V3,
    tint: Tint,
    sides = 8,
  ): void {
    const axis = unit(hint);
    const side = unit(
      cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]),
    );
    const other = cross(axis, side);
    const rim = Array.from({ length: sides }, (_, k) => {
      const angle = (k / sides) * Math.PI * 2;
      return added(
        center,
        added(
          scaled(side, Math.cos(angle) * radius),
          scaled(other, Math.sin(angle) * radius),
        ),
      );
    });
    this.face(slot, rim, hint, tint);
  }

  /** Appends an upright cylinder with a top cap, such as a tank or drum. */
  drum(
    slot: KitSlot,
    center: V3,
    radius: number,
    height: number,
    tint: Tint,
    sides = 12,
  ): void {
    const top: V3 = [center[0], center[1], center[2] + height];
    this.tube(slot, [center, top], radius, tint, sides);
    this.disc(slot, top, radius, [0, 0, 1], tint, sides);
  }
}
