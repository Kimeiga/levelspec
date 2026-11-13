/** Native vector proposals: shared floor boundaries supply the actual route graph. */
import { ArchitectureBuilder } from "../architecture/builder.ts";
import { snapCoordinate } from "../vector/precision.ts";
import { junctions } from "../authoring/native-junctions.ts";
import type { V3, Region } from "../vector/types.ts";
import type { Theme } from "./themes.ts";
import type { Rng } from "./rng.ts";

export interface NativeRoom {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  wallHeight: number;
}
interface Surface {
  id: string;
  points: V3[];
  fill: Region["fill"];
  wallHeight: number;
}
const centre = (r: NativeRoom): V3 => [r.x + r.w / 2, r.y + r.h / 2, r.z];
const color = (n: number) => "#" + n.toString(16).padStart(6, "0");

export class NativeBuilder {
  readonly scene: ArchitectureBuilder;
  private readonly wallThickness: number;
  readonly rooms: NativeRoom[] = [];
  private surfaces: Surface[] = [];
  private scale: number;
  readonly wallHeight: number;
  constructor(id: string, name: string, theme: Theme, rng: Rng, scale = 1) {
    if (!Number.isFinite(scale) || scale <= 0)
      throw new RangeError("Native layout scale must be positive.");
    this.scale = scale;
    this.scene = new ArchitectureBuilder(id);
    this.wallThickness = theme.wallThickness;
    const d = this.scene.document;
    d.name = name;
    d.player = {
      ...d.player,
      radius: 0.35,
      height: 1.8,
      step: 0.45,
      crouch: 1.1,
      vault: 0,
    };
    this.wallHeight = snapCoordinate(rng.float(...theme.ceiling));
    const roles = theme.palette.roles,
      finish = theme.surface ?? { roughness: 0.8, metalness: 0 };
    for (const [id, role] of [
      ["floor", "floor"],
      ["wall", "static_hard"],
      ["cover", "cover"],
    ] as const)
      d.materials.push({
        id,
        repeat: 1,
        color: color(roles[role] ?? 0x82909a),
        ...finish,
      });
    d.sky = {
      color: color(theme.palette.sky),
      intensity: theme.palette.hemiIntensity,
    };
  }
  private world(p: V3): V3 {
    return [
      snapCoordinate(p[0] * this.scale),
      snapCoordinate(p[1] * this.scale),
      snapCoordinate(p[2]),
    ];
  }
  room(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    z = 0,
    wallHeight = this.wallHeight,
  ): NativeRoom {
    const room = { id, x, y, w, h, z, wallHeight };
    this.rooms.push(room);
    this.surface(
      id,
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + h, z],
        [x, y + h, z],
      ],
      "floor",
      wallHeight,
    );
    return room;
  }
  surface(
    id: string,
    points: V3[],
    fill: Region["fill"] = "floor",
    wallHeight = this.wallHeight,
  ) {
    if (
      points.length < 3 ||
      points.some((p) => p.some((n) => !Number.isFinite(n)))
    )
      throw new Error("Invalid native floor polygon.");
    this.surfaces.push({
      id,
      points: points.map((p) => p.map(snapCoordinate) as V3),
      fill,
      wallHeight,
    });
  }
  /** An actual floor strip between aligned room faces, not an off-mesh shortcut. */
  join(id: string, a: NativeRoom, b: NativeRoom, width = 5, stairs = false) {
    const A = centre(a),
      B = centre(b),
      fill = a.z === b.z ? "floor" : stairs ? "stairs" : "ramp";
    if (A[1] === B[1]) {
      const [left, right] = a.x < b.x ? [a, b] : [b, a],
        x = left.x + left.w,
        X = right.x,
        y = A[1] - width / 2;
      this.surface(
        id,
        [
          [x, y, left.z],
          [X, y, right.z],
          [X, y + width, right.z],
          [x, y + width, left.z],
        ],
        fill,
        1.15,
      );
    } else if (A[0] === B[0]) {
      const [south, north] = a.y < b.y ? [a, b] : [b, a],
        y = south.y + south.h,
        Y = north.y,
        x = A[0] - width / 2;
      this.surface(
        id,
        [
          [x, y, south.z],
          [x + width, y, south.z],
          [x + width, Y, north.z],
          [x, Y, north.z],
        ],
        fill,
        1.15,
      );
    } else throw new Error("Native room joins must align.");
  }
  /** Two real stair flights outside the overlapping storey footprints. */
  switchback(id: string, lower: NativeRoom, upper: NativeRoom) {
    const x = lower.x + (lower.w - 8.5) / 2,
      y = lower.y + lower.h,
      z = lower.z,
      Z = upper.z,
      m = (z + Z) / 2;
    this.surface(
      id + ".out",
      [
        [x, y, z],
        [x + 4, y, z],
        [x + 4, y + 8, m],
        [x, y + 8, m],
      ],
      "stairs",
      1.15,
    );
    this.surface(
      id + ".landing",
      [
        [x, y + 8, m],
        [x + 8.5, y + 8, m],
        [x + 8.5, y + 12, m],
        [x, y + 12, m],
      ],
      "floor",
      1.15,
    );
    this.surface(
      id + ".back",
      [
        [x + 4.5, y, Z],
        [x + 8.5, y, Z],
        [x + 8.5, y + 8, m],
        [x + 4.5, y + 8, m],
      ],
      "stairs",
      1.15,
    );
  }
  private decorate(theme: Theme, rng: Rng) {
    const d = this.scene.document;
    for (const r of this.rooms) {
      if (
        !rng.bool(Math.min(0.9, theme.decor.clutter + theme.decor.centreCover))
      )
        continue;
      const z = r.z,
        height = snapCoordinate(rng.float(...theme.decor.crateHeight));
      this.scene.box(`decor.${r.id}`, {
        position: this.world([r.x + 2, r.y + 2, z]),
        width: 1.2 * this.scale,
        depth: 1.2 * this.scale,
        height,
        material: "cover",
      });
      if (rng.bool(theme.decor.beams) && r.w >= 10 && r.h >= 10) {
        const base = z + Math.min(2.6, r.wallHeight - 0.5);
        if (base - z > d.player.height)
          this.scene.box(`beam.${r.id}`, {
            position: this.world([r.x + 2, r.y + r.h - 3, base]),
            width: (r.w - 4) * this.scale,
            depth: 0.5 * this.scale,
            height: 0.25,
            material: "cover",
          });
      }
    }
  }
  finish(
    spawn: NativeRoom,
    exit: NativeRoom,
    minRoutes: number,
    theme: Theme,
    rng: Rng,
  ) {
    const all = this.surfaces.flatMap((surface) => surface.points);
    const edges = new Map<
      string,
      { a: V3; b: V3; owners: string[]; height: number }
    >();
    for (const surface of this.surfaces) {
      const id = `plan/${surface.id}`,
        points = junctions(surface.points, all).map((p) => this.world(p));
      if (surface.fill === "floor") {
        const profile = this.scene.profile(`${id}:profile`, points);
        this.scene.slab(id, profile.id, {
          thickness: 0.22,
          material: "floor",
          area: id,
        });
      } else {
        const low = Math.min(...surface.points.map((p) => p[2]));
        const lowEdge = surface.points.findIndex(
          (p, i) => p[2] === low && surface.points[(i + 1) % 4][2] === low,
        );
        if (lowEdge < 0)
          throw new Error(`Flight ${id} lacks a horizontal entrance.`);
        const ring = surface.points.map((_, i) =>
          this.world(surface.points[(lowEdge + i) % 4]),
        );
        const left = this.scene.path(`${id}:left`, [ring[0], ring[3]]),
          right = this.scene.path(`${id}:right`, [ring[1], ring[2]]);
        if (surface.fill === "stairs")
          this.scene.stairs(id, {
            left: left.id,
            right: right.id,
            maximumRiser: 0.18,
            underside: "sloped",
            thickness: 0.22,
            material: "floor",
            area: id,
          });
        else
          this.scene.ramp(id, {
            left: left.id,
            right: right.id,
            material: "floor",
            area: id,
            thickness: 0.22,
          });
      }
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          key = [a.join(","), b.join(",")].sort().join("|");
        const edge = edges.get(key);
        if (edge) edge.owners.push(id);
        else edges.set(key, { a, b, owners: [id], height: surface.wallHeight });
      }
    }
    let wall = 0;
    for (const edge of edges.values())
      if (edge.owners.length === 1) {
        const id = `plan/wall-${wall++}`,
          path = this.scene.path(`${id}:path`, [edge.a, edge.b]);
        this.scene.wall(id, path.id, {
          height: edge.height,
          thickness: this.wallThickness,
          material: "wall",
        });
      }
    const d = this.scene.document;
    let connection = 0;
    for (const edge of edges.values())
      if (edge.owners.length === 2) {
        const id = `plan/join-${connection++}`,
          path = this.scene.path(`${id}:path`, [edge.a, edge.b]);
        d.connections.push({
          id,
          from: edge.owners[0],
          to: edge.owners[1],
          path: path.id,
        });
      }
    for (const [id, room, kind] of [
      ["spawn", spawn, "attacker_spawn"],
      ["exit", exit, "objective"],
    ] as const)
      d.markers.push({
        id,
        kind,
        position: this.world(centre(room)),
        layer: "layout",
        region: `plan/${room.id}`,
      });
    d.routes.push({ id: "run", from: "spawn", to: "exit", minRoutes });
    this.decorate(theme, rng);
    this.scene.assembly("layout", [...d.elements]);
    return d;
  }
}
