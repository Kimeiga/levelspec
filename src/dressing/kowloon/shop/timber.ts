import { Matrix4, Vector3 } from "three";
import type { V3 } from "../../../architecture/types.ts";
import { Pen, type Tint } from "../../pen.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import { finishSeed } from "../../wall-surface.ts";
import { smoothStep, valueNoise } from "../../finish/noise.ts";
import { srgb } from "../palette.ts";
import atlas from "./assets/shop-timber.json" with { type: "json" };

const REFERENCE = srgb("#7a5a3c");

/** Optional assembly finish; absent values retain ordinary shelf variation and contact wear. */
export interface TimberFinish {
  /** Semantic slots drawn as wood; defaults to timber. Metal fittings retain their separate finish. */
  slots?: readonly KitSlot[];
  /** One longitudinal atlas family shared by an assembly; individual boards retain their own crops. */
  grainVariant?: 0 | 1 | 2 | 3;
  /** Wear along the two long edges of the -Y front, continuing onto adjacent sides. Width is in meters. */
  frontWear?: { width: number; strength: number; direction?: V3 };
}

/** A whole member owns its grain axis and finish; individual faces only unwrap that member. */
interface Board {
  lo: V3;
  hi: V3;
  along: number;
  seed: number;
}

/** An axis-aligned face chart in meters; U may reverse to wrap around a board's cross-section. */
interface WoodChart {
  u: number;
  v: number;
  sign: number;
  offset: number;
  origin: number;
  variant: number;
  seed: number;
  span: number;
  varyAcross: boolean;
}

/** Physical contact bands on a member, independent of its texture crop and repeat boundaries. */
interface EdgeWear {
  along: number;
  across: number;
  edges: number[];
  width: number;
  strength: number;
}

/** Selects shelf contact edges by default, or explicit wider joinery edges; protected rear faces remain unworn. */
function contactEdges(board: Board | undefined, hint: V3, frontWear?: TimberFinish["frontWear"]): EdgeWear | undefined {
  if (!board) return;
  const size = board.hi.map((value, axis) => value - board.lo[axis]);
  if (frontWear) {
    const front = frontWear.direction ?? [0, -1, 0];
    const axis = front.map(Math.abs).indexOf(Math.max(...front.map(Math.abs)));
    if (board.along === axis || Math.abs(front[axis]) < .99) return;
    const across = [0, 1, 2].find(value => value !== board.along && value !== axis)!;
    const width = Math.min(frontWear.width, size[across] * .24, size[axis] * .4);
    const shared = { along: board.along, width, strength: frontWear.strength };
    if (hint[axis] * front[axis] > .9) return { ...shared, across, edges: [board.lo[across], board.hi[across]] };
    if (Math.abs(hint[across]) > .9) return { ...shared, across: axis, edges: [front[axis] < 0 ? board.lo[axis] : board.hi[axis]] };
    return;
  }

  if (board.along === 0 && size[0] >= .15 && size[2] <= .06) {
    if (hint[2] > .9) return { along: 0, across: 1, edges: [board.lo[1]], width: .008, strength: 1 };
    if (hint[1] < -.9) return { along: 0, across: 2, edges: [board.hi[2]], width: .008, strength: 1 };
  }
  if (board.along === 2 && size[2] >= .3 && size[0] <= .06) {
    if (hint[1] < -.9) return { along: 2, across: 0, edges: [board.lo[0], board.hi[0]], width: .003, strength: .45 };
    if (Math.abs(hint[0]) > .9) return { along: 2, across: 1, edges: [board.lo[1]], width: .003, strength: .45 };
  }
}

/** Lightens rubbed wood in an irregular narrow band, retaining grain and matching adjacent edge faces. */
function wornTint(point: V3, wear: EdgeWear, board: Board, brightness: number): V3 {
  const distance = Math.min(...wear.edges.map(edge => Math.abs(point[wear.across] - edge)));
  const along = point[wear.along] - board.lo[wear.along];
  const coverage = smoothStep(.25, .7, valueNoise(along * 7, 0, board.seed));
  const amount = wear.strength * (1 - smoothStep(0, wear.width, distance)) * coverage;
  return [1, 1.1, 1.18].map(strength => Math.min(1, brightness * (1 + amount * strength) / atlas.albedoGain)) as V3;
}

/** Splits an interval only at internal physical boundaries, avoiding tiny duplicate pieces. */
function splitAt(lo: number, hi: number, cuts: number[]): [number, number][] {
  const points = [lo, ...cuts.filter(cut => cut > lo + 1e-8 && cut < hi - 1e-8), hi].sort((a, b) => a - b);
  return points.slice(1).flatMap((point, index) => point - points[index] > 1e-8 ? [[points[index], point] as [number, number]] : []);
}

/** Splits a metric interval at texture repeats, retaining each piece's local repeat origin. */
function intervals(lo: number, hi: number, period: number): [number, number, number][] {
  const result: [number, number, number][] = [];
  for (let cell = Math.floor((lo + 1e-9) / period); cell * period < hi - 1e-9; cell++)
    result.push([Math.max(lo, cell * period), Math.min(hi, (cell + 1) * period), cell * period]);
  return result;
}

/** Clips a convex chart polygon to one atlas repeat cell without changing its physical boundary. */
function clipChart(points: number[][], bounds: [number, number, number, number]): number[][] {
  let result = points;
  for (const [axis, edge, sign] of [[0, bounds[0], 1], [0, bounds[2], -1], [1, bounds[1], 1], [1, bounds[3], -1]]) {
    const input = result; result = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length];
      const da = (a[axis] - edge) * sign, db = (b[axis] - edge) * sign;
      if (da >= 0) result.push(a);
      if ((da >= 0) !== (db >= 0)) result.push(a.map((value, coordinate) => value + da / (da - db) * (b[coordinate] - value)));
    }
  }
  return result;
}

/** Maps rectangular timber faces at a consistent physical scale without moving their surfaces. */
class ShopTimberPen extends Pen {
  private board?: Board;
  private readonly faceGrainAxis?: 0 | 1 | 2;
  private readonly finish: TimberFinish;

  /** Wraps the final fixture frame so grain stays attached through rotation and reflection. */
  constructor(pen: Pen, faceGrainAxis: 0 | 1 | 2 | undefined, finish: TimberFinish) {
    super(pen.mesh, pen.part, pen.matrix, pen.mirrored);
    this.faceGrainAxis = faceGrainAxis;
    this.finish = finish;
  }

  /** Retains wood mapping on translated or reoriented component frames. */
  override move(x: number, y: number, z: number): Pen { return new ShopTimberPen(super.move(x, y, z), this.faceGrainAxis, this.finish); }
  /** Retains wood mapping when assigning a component part. */
  override into(part: string): Pen { return new ShopTimberPen(super.into(part), this.faceGrainAxis, this.finish); }
  /** Retains local grain axes through a new horizontal frame. */
  override facing(origin: V3, tangent: V3, outward: V3): Pen { return new ShopTimberPen(super.facing(origin, tangent, outward), this.faceGrainAxis, this.finish); }

  /** Assigns all faces of a board one grain direction and finish; retains omitted box faces. */
  override box(slot: KitSlot, lo: V3, hi: V3, tint: Tint, omit = "b"): void {
    const previous = this.board;
    const along = [0, 1, 2].reduce((a, b) => hi[a] - lo[a] >= hi[b] - lo[b] ? a : b);
    this.board = { lo, hi, along, seed: this.seed([...lo, ...hi]) };
    try {
      super.box(slot, lo, hi, tint, omit);
    } finally {
      this.board = previous;
    }
  }

  /** Unwraps a beveled member along its length, sharing grain, end grain and edge wear across faces. */
  override beveledBar(slot: KitSlot, a: V3, b: V3, side: V3, width: number, depth: number, tint: Tint, bevel = .0015): void {
    const axis = new Vector3(...b).sub(new Vector3(...a)), length = axis.length();
    const across = new Vector3(...side);
    if (![...a, ...b, ...side, width, depth, bevel].every(Number.isFinite) || length < 1e-6
      || width <= 0 || depth <= 0 || bevel < 0 || Math.abs(across.length() - 1) > 1e-5
      || Math.abs(across.dot(axis) / length) > 1e-5) {
      super.beveledBar(slot, a, b, side, width, depth, tint, bevel); return;
    }
    axis.normalize();
    const other = new Vector3().crossVectors(axis, across).normalize();
    const frame = new Matrix4().makeBasis(across, other, axis).setPosition(...a);
    const local = new Pen(this.mesh, this.part, this.matrix.clone().multiply(frame), this.mirrored);
    const finish = this.finish.frontWear ? { ...this.finish, frontWear: { ...this.finish.frontWear,
      direction: new Vector3(...(this.finish.frontWear.direction ?? [0,-1,0] as V3))
        .transformDirection(frame.clone().invert()).toArray() as V3,
    } } : this.finish;
    const wood = new ShopTimberPen(local, 2, finish);
    const localTint: Tint = typeof tint === "function"
      ? point => tint(new Vector3(...point).applyMatrix4(frame).toArray() as V3) : tint;
    wood.board = { lo: [-width / 2, -depth / 2, 0], hi: [width / 2, depth / 2, length], along: 2,
      seed: this.seed([...a, ...b, width, depth]) };
    Pen.prototype.beveledBar.call(wood, slot, [0,0,0], [0,0,length], [1,0,0], width, depth, localTint, bevel);
  }

  /** Keeps variation deterministic without consuming the stock-placement random stream. */
  private seed(dimensions: number[]): number {
    return finishSeed([this.part, ...this.matrix.elements, ...dimensions].join("/"));
  }

  /** Unwraps side grain around the perimeter; cut ends sample the separate end-grain bank. */
  private chart(minimum: number[], extent: number[], axes: number[], hint: V3): WoodChart {
    const board = this.board;
    if (!board) {
      const preferred = this.faceGrainAxis ?? 2;
      const along = axes.includes(preferred) ? preferred : axes.reduce((a, b) => extent[a] >= extent[b] ? a : b);
      const across = axes.find(axis => axis !== along)!;
      const seed = this.seed([...minimum, ...extent]);
      return { u: across, v: along, sign: 1, offset: -minimum[across], origin: minimum[along],
        variant: this.finish.grainVariant ?? seed % atlas.endGrainStart, seed, span: extent[along], varyAcross: this.finish.grainVariant === undefined };
    }
    const cross = [0, 1, 2].filter(axis => axis !== board.along);
    const [a, b] = cross;
    if (!axes.includes(board.along)) {
      return { u: a, v: b, sign: 1, offset: -board.lo[a], origin: board.lo[b],
        variant: atlas.endGrainStart + (this.finish.grainVariant ?? board.seed % (atlas.regions.length - atlas.endGrainStart)),
        seed: board.seed, span: board.hi[b] - board.lo[b], varyAcross: false };
    }
    const width = board.hi[a] - board.lo[a], depth = board.hi[b] - board.lo[b];
    const variant = this.finish.grainVariant ?? board.seed % atlas.endGrainStart;
    const base = { v: board.along, origin: board.lo[board.along], variant, seed: board.seed,
      span: board.hi[board.along] - board.lo[board.along], varyAcross: false };
    if (hint[b] < -.9) return { ...base, u: a, sign: 1, offset: -board.lo[a] };
    if (hint[a] > .9) return { ...base, u: b, sign: 1, offset: width - board.lo[b] };
    if (hint[b] > .9) return { ...base, u: a, sign: -1, offset: width + depth + board.hi[a] };
    return { ...base, u: b, sign: -1, offset: 2 * width + depth + board.hi[b] };
  }

  /** Retains flat surfaces and UV density; subdivisions isolate atlas repeats and physical contact wear. */
  override face(slot: KitSlot, points: V3[], hint: V3, tint: Tint, uv?: number[][], normals?: V3[]): void {
    const minimum = [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis])));
    const extent = [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis])) - minimum[axis]);
    const axes = [0, 1, 2].filter(axis => extent[axis] > 1e-8);
    const planar = points.length >= 3 && axes.length === 2;
    const wood = (this.finish.slots ?? ["timber"]).includes(slot);
    if (wood && !this.mesh.textured("shop-timber")) {
      super.face("shop-timber", points, hint, tint, uv, normals); return;
    }
    if (!wood || typeof tint === "function" || !planar || uv || normals) {
      super.face(wood ? "timber" : slot, points, hint, tint, uv, normals);
      return;
    }
    const normalHint = new Vector3(...hint).normalize().toArray() as V3;
    const chart = this.chart(minimum, extent, axes, normalHint);
    const board = this.board;
    const wear = contactEdges(board, normalHint, this.finish.frontWear);
    const wearCuts = wear?.edges.flatMap(edge => [edge - wear.width, edge + wear.width])
      .map(position => position * chart.sign + chart.offset) ?? [];
    const fieldWidth = (atlas.regions[chart.variant].width - atlas.padding * 2 - 1) / atlas.texelsPerMeter;
    const uEnds = [minimum[chart.u], minimum[chart.u] + extent[chart.u]].map(value => value * chart.sign + chart.offset);
    const v0 = minimum[chart.v] - chart.origin;
    const brightness = Math.max(.45, Math.min(1.4, tint.reduce((sum, value, axis) => sum + value / REFERENCE[axis], 0) / 3));
    for (const [u0, u1, uOrigin] of intervals(Math.min(...uEnds), Math.max(...uEnds), fieldWidth)) {
      const band = Math.round(uOrigin / fieldWidth);
      const variant = chart.varyAcross ? (chart.variant + band) % atlas.endGrainStart : chart.variant;
      const region = atlas.regions[variant];
      const fieldLength = (region.height - atlas.padding * 2 - 1) / atlas.texelsPerMeter;
      const cropSeed = chart.varyAcross ? finishSeed(`${chart.seed}/${band}`) : chart.seed;
      const phase = cropSeed % 10001 / 10001 * Math.max(0, fieldLength - chart.span);
      for (const [vLow, vHigh, vOrigin] of intervals(v0 + phase, v0 + phase + extent[chart.v], fieldLength)) {
        for (const [uLow, uHigh] of splitAt(u0, u1, wearCuts)) {
          const across = ((uLow + uHigh) / 2 - chart.offset) / chart.sign;
          const worn = wear && wear.edges.some(edge => Math.abs(across - edge) < wear.width);
          const alongPieces = worn ? intervals(vLow - phase, vHigh - phase, .22)
            .map(([low, high]) => [low + phase, high + phase]) : [[vLow, vHigh]];
          for (const [low, high] of alongPieces) {
            const corners = clipChart(points.map(point => [point[chart.u] * chart.sign + chart.offset, point[chart.v] - chart.origin + phase]), [uLow, low, uHigh, high]);
            if (corners.length < 3) continue;
            const positions = corners.map(([u, v]) => {
              const point = [...minimum] as V3;
              point[chart.u] = (u - chart.offset) / chart.sign;
              point[chart.v] = v - phase + chart.origin;
              return point;
            });
            const coordinates = corners.map(([u, v]) => [
              (region.x + atlas.padding + .5 + (u - uOrigin) * atlas.texelsPerMeter) / atlas.width,
              1 - (region.y + region.height - atlas.padding - .5 - (v - vOrigin) * atlas.texelsPerMeter) / atlas.height,
            ]);
            const color: Tint = worn && board
              ? point => wornTint(point, wear, board, brightness)
              : [brightness / atlas.albedoGain, brightness / atlas.albedoGain, brightness / atlas.albedoGain];
            super.face("shop-timber", positions, hint, color, coordinates);
          }
        }
      }
    }
  }
}

/**
 * Applies the bound atlas; boxes infer grain from their length, while standalone
 * panels default to vertical grain unless given a pen-local axis. Untextured overrides keep their role.
 */
export function agedShopTimber(pen: Pen, faceGrainAxis?: 0 | 1 | 2, finish: TimberFinish = {}): Pen {
  return new ShopTimberPen(pen, faceGrainAxis, finish);
}
