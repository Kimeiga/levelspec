import { agedShopTimber } from "./shop/timber.ts";
import { createMetalSurface } from "../finish/metal-surface.ts";
import type { V3 } from "../../vector/types.ts";
import { Pen, type Tint } from "../pen.ts";
import type { KitSlot } from "../kit-mesh.ts";
import { finishSeed } from "../wall-surface.ts";
import { type ComponentFinish, type ComponentPatina } from "../finish/component-patina.ts";
import type { Kit } from "./kit.ts";
import { Vector3 } from "three";
import { mix, RUST } from "./palette.ts";
import { ComponentGeometry, type WeatheringMember } from "../finish/component-geometry.ts";

/** Optional continuous mapping for a whole shutter or folded sheet; coordinates are local meters. */
export interface ComponentMapping {
  bounds: [number, number, number, number];
  uv(point: V3): [number, number];
  key: string;
  paint: V3;
  /** World-down projected onto the assembly’s unfolded U/V directions. */
  gravity: [number, number];
}

const difference = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;
const dot = (a: V3, b: V3): number => a.reduce((sum, value, axis) => sum + value * b[axis], 0);

/** Maps each narrow face across and along its member, preserving its existing geometric winding. */
function memberUV(points: V3[]) {
  const edges = points.map((point, index) => difference(points[(index + 1) % points.length], point));
  const longest = edges.reduce((a, b) => Math.hypot(...a) > Math.hypot(...b) ? a : b);
  const length = Math.hypot(...longest), along = longest.map(value => value / length) as V3;
  const dominant = Math.abs(along[2]) > 0.5 ? 2 : Math.abs(along[0]) >= Math.abs(along[1]) ? 0 : 1;
  if (along[dominant] < 0) for (let axis = 0; axis < 3; axis++) along[axis] *= -1;
  const other = edges.find(edge => Math.abs(dot(edge, along)) < Math.hypot(...edge) * 0.9) ?? edges[1];
  const projection = dot(other, along);
  const cross = other.map((value, axis) => value - projection * along[axis]) as V3;
  const width = Math.hypot(...cross), across = cross.map(value => value / width) as V3;
  const acrossAxis = across.map(Math.abs).indexOf(Math.max(...across.map(Math.abs)));
  if (across[acrossAxis] < 0) for (let axis = 0; axis < 3; axis++) across[axis] *= -1;
  const coordinates = points.map(point => [dot(point, across), dot(point, along)]);
  const minimum = [0, 1].map(axis => Math.min(...coordinates.map(point => point[axis])));
  // Micrometer precision shares equal member sizes despite floating-point construction noise.
  const extent = [0, 1].map(axis => Math.round((Math.max(...coordinates.map(point => point[axis])) - minimum[axis]) * 1e6) / 1e6);
  const bounds: [number, number, number, number] = [0, 0, extent[0], extent[1]];
  const uv = (point: V3): [number, number] => [dot(point, across) - minimum[0], dot(point, along) - minimum[1]];
  return { bounds, coordinates: points.map(uv), uv, across, along };
}

/** Scoped drawing adapter: only explicitly selected structural parts receive procedural PBR maps. */
class WeatheredPen extends Pen {
  private active?: WeatheringMember;
  private tubeAxis?: V3;
  private beveling = false;
  private readonly kit: Kit;
  private readonly kind: Exclude<ComponentFinish, "timber">;
  private readonly slots: KitSlot[];
  private readonly mapping?: ComponentMapping;
  private readonly geometry: ComponentGeometry;

  constructor(pen: Pen, kit: Kit, kind: Exclude<ComponentFinish, "timber">,
    slots: KitSlot[], mapping?: ComponentMapping,
    geometry = new ComponentGeometry()) {
    super(pen.mesh, pen.part, pen.matrix, pen.mirrored);
    this.kit = kit;
    this.kind = kind;
    this.slots = slots;
    this.mapping = mapping;
    this.geometry = geometry;
  }

  /** Reuses an existing metal assembly adapter rather than duplicating receivers and losing its joints. */
  accepts(kit: Kit, slots: KitSlot[]): boolean {
    return this.kit === kit && !this.mapping
      && slots.every(slot => this.slots.includes(slot));
  }

  /** Returns an assembly-local point for world-space detector contacts. */
  private local(point: V3): V3 { return new Vector3(...point).applyMatrix4(this.matrix.clone().invert()).toArray() as V3; }

  /** Derived pens retain the collector and map back into the original continuous sheet coordinates. */
  private derived(pen: Pen): Pen {
    const mapping = this.mapping ? { ...this.mapping, uv: (point: V3) => this.mapping!.uv(this.local(pen.world(point))) } : undefined;
    return new WeatheredPen(pen, this.kit, this.kind, this.slots, mapping, this.geometry);
  }

  /** Keeps translated members in the same geometry exposure assembly. */
  override move(x: number, y: number, z: number): Pen { return this.derived(super.move(x, y, z)); }
  /** Keeps part ownership separate while sharing exposure geometry. */
  override into(part: string): Pen { return this.derived(super.into(part)); }
  /** Carries the detector through an oriented subassembly. */
  override facing(origin: V3, tangent: V3, outward: V3): Pen { return this.derived(super.facing(origin, tangent, outward)); }

  /** Records an inscribed member envelope during ordinary primitive emission. */
  private member(a: V3, b: V3, radius: number, draw: () => void): void {
    const previous = this.active;
    this.active = this.geometry.member(this.world(a), this.world(b), radius);
    try { draw(); } finally { this.active = previous; }
  }

  /** Exposes actual box intersections without treating a broad plate as a thick capsule. */
  override box(slot: KitSlot, low: V3, high: V3, tint: Tint, omit = "b"): void {
    if (!this.slots.includes(slot)) { super.box(slot, low, high, tint, omit); return; }
    const size = difference(high, low), axis = size.indexOf(Math.max(...size));
    const a = low.map((value, i) => i === axis ? value : (value + high[i]) / 2) as V3;
    const b = [...a] as V3; b[axis] = high[axis];
    this.member(a, b, Math.min(...size.filter((_, i) => i !== axis)) / 2, () => super.box(slot, low, high, tint, omit));
  }

  /** Records the real centerline of square-section bars, including crossing cage rails. */
  override bar(slot: KitSlot, a: V3, b: V3, thickness: number, tint: Tint): void {
    if (!this.slots.includes(slot)) { super.bar(slot, a, b, thickness, tint); return; }
    this.member(a, b, thickness / 2, () => super.bar(slot, a, b, thickness, tint));
  }

  /** Retains whole-member contacts for chamfered frames, rails and brackets. */
  override beveledBar(slot: KitSlot, a: V3, b: V3, side: V3, width: number, depth: number, tint: Tint, bevel = 0.0015): void {
    const draw = () => super.beveledBar(slot, a, b, side, width, depth, tint, bevel);
    if (!this.slots.includes(slot)) { draw(); return; }
    const previous = this.beveling;
    this.beveling = true;
    try { this.member(a, b, Math.min(width, depth) / 2, draw); }
    finally { this.beveling = previous; }
  }

  /** Tube segments and later collars share a detector while retaining smooth source normals. */
  override tube(slot: KitSlot, path: V3[], radius: number, tint: Tint, sides = 6): void {
    if (!this.slots.includes(slot)) { super.tube(slot, path, radius, tint, sides); return; }
    const previous = this.tubeAxis;
    try {
      for (let i = 0; i + 1 < path.length; i++) {
        const delta = difference(path[i + 1], path[i]);
        const length = Math.hypot(...delta);
        if (length < 1e-6) continue;
        this.tubeAxis = delta.map(value => value / length) as V3;
        this.member(path[i], path[i + 1], radius, () => super.tube(slot, [path[i], path[i + 1]], radius, tint, sides));
      }
    } finally { this.tubeAxis = previous; }
  }

  /** Keeps geometry, smooth normals and omissions, replacing only selected faces' appearance coordinates. */
  override face(slot: KitSlot, points: V3[], hint: V3, tint: Tint, uv?: number[][], normals?: V3[]): void {
    if (!this.slots.includes(slot) || typeof tint === "function" || points.length < 3) {
      super.face(slot, points, hint, tint, uv, normals); return;
    }
    const kind = this.kind;
    const projection = memberUV(points);
    const mapped = this.mapping ? { coordinates: points.map(point => this.mapping!.uv(point)), bounds: this.mapping.bounds } : projection;
    const { coordinates, bounds } = mapped;
    if (coordinates.some(point => !point.every(Number.isFinite))) { super.face(slot, points, hint, tint, uv, normals); return; }
    const paint = [...(this.mapping?.paint ?? tint)] as V3;
    if (this.beveling && !this.mapping && Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]) < 0.006) {
      super.face("paint", points, hint, paint, coordinates, normals);
      return;
    }
    const variant = this.mapping ? 0 : finishSeed(points[0].map(value => value.toFixed(3)).join("/")) % 2;
    const seed = finishSeed(`${this.kit.seed}/${kind}/${variant}`);
    const member = this.active, geometry = this.geometry;
    if (this.mapping) geometry.face(points.map(point => this.world(point)), difference(this.world(hint), this.world([0, 0, 0])), coordinates);
    let contacts: [number, number][] | undefined;
    const contactProfile = (): [number, number][] => {
      if (contacts) return contacts;
      geometry.seal();
      const points = member && !this.mapping ? geometry.joints(member).map(point => projection.uv(this.local(point))) : [];
      const quantized = points.filter(point => point.every((value, axis) => value >= bounds[axis] && value <= bounds[axis + 2]))
        .map(point => point.map(value => Math.round(value / 0.005) * 0.005) as [number, number]);
      contacts = [...new Map(quantized.map(point => [point.join(","), point])).values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      return contacts;
    };
    const gravity = [projection.across, projection.along].map(axis => -(this.world(axis)[2] - this.world([0, 0, 0])[2])) as [number, number];
    const metric = { scale: [1, 1] as [number, number],
      gravity: (this.mapping?.gravity ?? gravity).map(value => Math.round(value * 1e4) / 1e4) as [number, number] };
    const edgeAxes: [boolean, boolean] = this.tubeAxis && !this.mapping
      ? [Math.abs(dot(projection.across, this.tubeAxis)) > 0.5, Math.abs(dot(projection.along, this.tubeAxis)) > 0.5]
      : [true, true];
    const finish: ComponentPatina = { kind, bounds, paint, seed, edgeAxes,
      wear: Math.min(1, this.kit.wear * 1.6), grime: this.kit.grime, rust: this.kit.rust, metric,
      get contacts() { return contactProfile(); }, get folds() { geometry.seal(); return geometry.folds; } };
    const base = this.mesh.material(slot === "sheet" ? "sheet" : "metal");
    const coating = this.mesh.material("paint"), coatingRepeat = this.mesh.repeat("paint");
    const repeat = this.mesh.repeat(slot === "sheet" ? "sheet" : "metal");
    const metal = createMetalSurface({ kind, bounds, paint, seed, wear: finish.wear, grime: finish.grime, rust: finish.rust, metric, edgeAxes,
      get contacts() { return contactProfile(); }, get folds() { geometry.seal(); return geometry.folds; },
      substrate: { material: base, repeat }, coating: { material: coating, repeat: coatingRepeat } });
    const faceWidth = Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]);
    let minimumMetalDensity = faceWidth < 0.04 ? 64 : 128;
    if (this.mapping || kind === "sheet") minimumMetalDensity = 256;
    const requestedDensity = Math.max(minimumMetalDensity, this.kit.textureDensity);
    const narrowChamfer = !this.mapping && faceWidth < 0.006;
    const density = narrowChamfer ? Math.min(64, requestedDensity) : requestedDensity;
    const group = `component/v4/${kind}/${seed}/${paint.join(",")}/${base}/${this.mapping?.key ?? bounds.join(",")}/${finish.wear}/${finish.grime}/${finish.rust}/${density}/${coating}/${repeat}/${coatingRepeat}`;
    const firstTriangle = this.mesh.triangleCount;
    super.face(slot, points, hint, [1, 1, 1], coordinates, normals);
    const triangleCount = this.mesh.triangleCount - firstTriangle;
    if (!triangleCount) return;
    this.mesh.receive({ id: `${this.part}/component/${firstTriangle}`, firstTriangle, triangleCount,
      frame: this.surfaceFrame(), bounds, materials: [base, coating],
      raster: { coordinates: "uv", scope: "scene", get group() { const contacts = contactProfile();
        return `${group}/${JSON.stringify([contacts, metric, geometry.folds, edgeAxes])}`; }, bounds,
        get materialKey() { return this.group; },
        texelsPerMeter: density,
        bump: "sample" },
      sample(u, v) {
        return metal.sample(u, v);
      },
    });
  }
}

/** Uses physical-meter member maps, or one continuous unwrapped assembly, with the production component finish. */
export function weatheredPen(pen: Pen, kit: Kit | undefined, kind: ComponentFinish,
  mapping?: ComponentMapping, slots: KitSlot[] = ["paint", "metal"]): Pen {
  if (kind === "timber") return agedShopTimber(pen, undefined, {
    slots: slots.filter(slot => slot !== "metal"),
    frontWear: { width: .008, strength: Math.min(1.2, (kit?.wear ?? .2) * 4), direction: [0, 1, 0] },
  });
  // Metal weathering changes only attributes and finish recipes; timber also subdivides geometry.
  if (pen.mesh.survey) return pen;
  if (!kit) return pen;
  if (!mapping && pen instanceof WeatheredPen && pen.accepts(kit, slots)) return pen;
  return new WeatheredPen(pen, kit, kind, slots, mapping);
}

/** Keeps rust out of the base pigment when oxidation has its own procedural layer. */
export function metalColor(paint: V3, oxidation: number, kit?: Kit): V3 {
  return kit?.textureDensity ? paint : mix(paint, RUST, oxidation);
}
