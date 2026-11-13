import { Matrix4 } from "three";
import type { V3 } from "../../../architecture/types.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import { Pen, type Tint } from "../../pen.ts";

const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const added = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaled = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => scaled(a, 1 / Math.hypot(...a));

/** Steps of a turned profile from foot to top: radius and height above the base, meters. */
export type Profile = [radius: number, height: number][];

/** Returns the tint of band `index` from one tint for every band or a list with one entry per band. */
function bandTint(tints: Tint | Tint[], index: number): Tint {
  if (typeof tints === "function" || typeof tints[0] === "number") return tints as Tint;
  const list = tints as Tint[];
  return list[Math.min(index, list.length - 1)];
}

/**
 * Unfolds a polygonal profile band into texture coordinates at repeats per meter.
 * Flat rings stay planar; cylinders use their polygon perimeter; tapered bands
 * form a sector whose chords and generators match the actual mesh edges.
 * Different slopes own separate charts, retaining physical scale rather than seam continuity.
 */
function latheBandChart(start: Profile[number], end: Profile[number], sides: number, distance: number, repeat: number):
  (ring: 0 | 1, step: number) => number[] {
  const [r0, z0] = start, [r1, z1] = end;
  const dr = r1 - r0, dz = z1 - z0;
  const radii = [r0, r1];
  const length = Math.hypot(dr, dz);
  const chord = 2 * Math.sin(Math.PI / sides);
  if (Math.abs(dz) < 1e-9) {
    return (ring, step) => {
      const angle = step / sides * Math.PI * 2;
      return [Math.cos(angle) * radii[ring] * repeat, Math.sin(angle) * radii[ring] * repeat];
    };
  }
  if (Math.abs(dr) < 1e-12) {
    return (ring, step) => [step * chord * radii[ring] * repeat, (distance + ring * length) * repeat];
  }
  const slope = Math.abs(dr) / length;
  const angleStep = 2 * Math.asin(Math.min(1, slope * chord / 2));
  return (ring, step) => {
    const angle = step * angleStep, radius = radii[ring];
    const u = radius * Math.sin(angle) / slope;
    // This avoids subtracting large sector radii when a band is nearly cylindrical.
    const v = distance + ring * length - Math.sign(dr) * radius * 2 * Math.sin(angle / 2) ** 2 / slope;
    return [u * repeat, v * repeat];
  };
}

/**
 * Draws a solid of revolution standing on `base` about the vertical axis.
 * Each pair of neighboring profile steps makes one band, shaded smoothly
 * around the axis and across folds gentler than 60 degrees. A profile that
 * climbs the outside and returns down the inside draws an open vessel with
 * both of its walls; two steps at one height make a flat lid or foot.
 * Optional textureRepeat supplies cycles per physical meter on the actual mesh.
 * Each profile band unfolds without stretching; changes of slope and the closing
 * meridian may have texture seams. Caps remain planar and shading normals are unchanged.
 */
export function lathe(pen: Pen, slot: KitSlot, base: V3, profile: Profile, tints: Tint | Tint[], sides = 8, textureRepeat?: number): void {
  if (textureRepeat !== undefined && (!Number.isFinite(textureRepeat) || textureRepeat <= 0))
    throw new Error("Lathe texture repeat must be finite and positive.");
  let profileDistance = 0;
  // Each band's outward normal in the (radial, up) plane; a zero-length band keeps neighbors creased.
  const slopes = profile.slice(1).map(([r1, z1], i) => {
    const [r0, z0] = profile[i];
    const run = Math.hypot(r1 - r0, z1 - z0);
    return run < 1e-9 ? [0, 0] : [(z1 - z0) / run, (r0 - r1) / run];
  });
  /** The shading normal where band `own` meets band `other`: shared across a gentle fold. */
  const blended = (own: number[], other: number[] | undefined): number[] => {
    if (!other || own[0] * other[0] + own[1] * other[1] < 0.5) return own;
    const sum = [own[0] + other[0], own[1] + other[1]];
    const length = Math.hypot(sum[0], sum[1]);
    return [sum[0] / length, sum[1] / length];
  };
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, z0] = profile[i],
      [r1, z1] = profile[i + 1];
    const own = slopes[i];
    if (own[0] === 0 && own[1] === 0) continue;
    const low = blended(own, slopes[i - 1]),
      high = blended(own, slopes[i + 1]);
    const tint = bandTint(tints, i);
    const nextDistance = profileDistance + Math.hypot(r1 - r0, z1 - z0);
    const chart = textureRepeat === undefined ? undefined
      : latheBandChart(profile[i], profile[i + 1], sides, profileDistance, textureRepeat);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2,
        b = ((k + 1) / sides) * Math.PI * 2;
      const ca = Math.cos(a),
        sa = Math.sin(a),
        cb = Math.cos(b),
        sb = Math.sin(b);
      const coordinates = chart ? [chart(0, k), chart(0, k + 1), chart(1, k + 1), chart(1, k)] : undefined;
      pen.face(
        slot,
        [
          [base[0] + ca * r0, base[1] + sa * r0, base[2] + z0],
          [base[0] + cb * r0, base[1] + sb * r0, base[2] + z0],
          [base[0] + cb * r1, base[1] + sb * r1, base[2] + z1],
          [base[0] + ca * r1, base[1] + sa * r1, base[2] + z1],
        ],
        [(ca + cb) * own[0], (sa + sb) * own[0], 2 * own[1]],
        tint,
        coordinates,
        [
          [ca * low[0], sa * low[0], low[1]],
          [cb * low[0], sb * low[0], low[1]],
          [cb * high[0], sb * high[0], high[1]],
          [ca * high[0], sa * high[0], high[1]],
        ],
      );
    }
    profileDistance = nextDistance;
  }
}

/**
 * Draws a round member swept along `path`, `radii[i]` thick at `path[i]`,
 * with smooth shading. A zero radius closes that end to a point. `flatten`
 * scales the section in one direction across the path, for flat things such
 * as fish and strips of meat. The section does not twist along the path.
 */
export function limb(pen: Pen, slot: KitSlot, path: V3[], radii: number[], tint: Tint, sides = 6, flatten = 1): void {
  const last = path.length - 1;
  const stations: { center: V3; radius: number; tangent: V3; side: V3; other: V3; taper: number }[] = [];
  for (let i = 0; i <= last; i++) {
    const before = Math.max(0, i - 1),
      after = Math.min(last, i + 1);
    const chord = subtract(path[after], path[before]);
    const length = Math.hypot(...chord);
    const tangent = scaled(chord, 1 / length);
    const previous = stations.at(-1);
    let seed: V3 = previous?.side ?? (Math.abs(tangent[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]);
    // A path that turns into its own side direction continues from the other section axis.
    if (previous && Math.abs(dot(seed, tangent)) > 0.95) seed = previous.other;
    const side = unit(subtract(seed, scaled(tangent, dot(seed, tangent))));
    stations.push({
      center: path[i],
      radius: radii[i],
      tangent,
      side,
      other: cross(tangent, side),
      taper: (radii[after] - radii[before]) / length,
    });
  }
  /** A point of the section at station `s` and its shading normal. */
  const ring = (s: (typeof stations)[number], angle: number): { point: V3; normal: V3 } => {
    const c = Math.cos(angle),
      n = Math.sin(angle);
    const point = added(s.center, added(scaled(s.side, c * s.radius), scaled(s.other, n * s.radius * flatten)));
    const radial = added(scaled(s.side, c), scaled(s.other, n / flatten));
    return { point, normal: unit(subtract(radial, scaled(s.tangent, s.taper))) };
  };
  for (let i = 0; i < last; i++)
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2,
        b = ((k + 1) / sides) * Math.PI * 2;
      const corners = [ring(stations[i], a), ring(stations[i + 1], a), ring(stations[i + 1], b), ring(stations[i], b)];
      const hint = corners.reduce((sum, corner) => added(sum, corner.normal), [0, 0, 0] as V3);
      pen.face(slot, corners.map((corner) => corner.point), hint, tint, undefined, corners.map((corner) => corner.normal));
    }
}

/**
 * Draws a smooth ball about `center`, or with `stretch` an ellipsoid whose
 * semi-axes are `radius` times each stretch component.
 */
export function ball(
  pen: Pen,
  slot: KitSlot,
  center: V3,
  radius: number,
  tint: Tint,
  sides = 6,
  stretch: V3 = [1, 1, 1],
  bands = 3,
): void {
  /** The surface point at a latitude and longitude, with its shading normal. */
  const at = (latitude: number, longitude: number): { point: V3; normal: V3 } => {
    const level = Math.cos(latitude);
    const d: V3 = [level * Math.cos(longitude), level * Math.sin(longitude), Math.sin(latitude)];
    return {
      point: [
        center[0] + d[0] * radius * stretch[0],
        center[1] + d[1] * radius * stretch[1],
        center[2] + d[2] * radius * stretch[2],
      ],
      normal: unit([d[0] / stretch[0], d[1] / stretch[1], d[2] / stretch[2]]),
    };
  };
  for (let j = 0; j < bands; j++)
    for (let k = 0; k < sides; k++) {
      const south = -Math.PI / 2 + (j / bands) * Math.PI,
        north = -Math.PI / 2 + ((j + 1) / bands) * Math.PI;
      const west = (k / sides) * Math.PI * 2,
        east = ((k + 1) / sides) * Math.PI * 2;
      const corners = [at(south, west), at(south, east), at(north, east), at(north, west)];
      const hint = corners.reduce((sum, corner) => added(sum, corner.normal), [0, 0, 0] as V3);
      pen.face(slot, corners.map((corner) => corner.point), hint, tint, undefined, corners.map((corner) => corner.normal));
    }
}

/**
 * Appends a rectangle on the plane Y=`y` facing -Y: toward the viewer of a
 * room or shelf, whose frames run Y away from the street.
 */
export function front(pen: Pen, slot: KitSlot, x0: number, x1: number, z0: number, z1: number, y: number, tint: Tint): void {
  pen.face(
    slot,
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ],
    [0, -1, 0],
    tint,
  );
}

/** Returns a pen at `origin` rotated by `angle` radians about one of its own axes. */
export function rotated(pen: Pen, origin: V3, axis: "x" | "y" | "z", angle: number): Pen {
  const rotation = new Matrix4();
  if (axis === "x") rotation.makeRotationX(angle);
  else if (axis === "y") rotation.makeRotationY(angle);
  else rotation.makeRotationZ(angle);
  const matrix = pen.matrix.clone().multiply(new Matrix4().makeTranslation(...origin)).multiply(rotation);
  return new Pen(pen.mesh, pen.part, matrix, pen.mirrored);
}
