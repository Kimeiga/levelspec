import { Vector3 } from "three";
import type { V3 } from "../../architecture/types.ts";
import type { KitSlot } from "../kit-mesh.ts";
import { Pen, type Tint } from "../pen.ts";
import { finishSeed } from "../wall-surface.ts";

/** Shared stainless finish with physical-scale planar charts and caller-owned curved charts. */
class BrushedMetalPen extends Pen {
  private readonly phase: [number, number];

  /** Keeps the finish attached to the final fixture frame, without consuming placement randomness. */
  constructor(pen: Pen) {
    super(pen.mesh, pen.part, pen.matrix, pen.mirrored);
    const seed = finishSeed([pen.part, ...pen.matrix.elements].join("/"));
    this.phase = [(seed & 65535) / 65536, (seed >>> 16) / 65536];
  }

  /** Retains the finish when translating the fixture. */
  override move(x: number, y: number, z: number): Pen { return new BrushedMetalPen(super.move(x, y, z)); }

  /** Retains the finish when naming a separate part. */
  override into(part: string): Pen { return new BrushedMetalPen(super.into(part)); }

  /** Retains the finish when orienting a fixture in a new horizontal frame. */
  override facing(origin: V3, tangent: V3, outward: V3): Pen {
    return new BrushedMetalPen(super.facing(origin, tangent, outward));
  }

  /**
   * Projects flat faces onto an orthonormal tangent basis in local meters, including
   * slopes. Explicit UVs are already texture coordinates and pass through unchanged.
   * Curved receivers must supply continuous wrap charts; normals and vertex tints are preserved.
   */
  override face(slot: KitSlot, points: V3[], hint: V3, tint: Tint, uv?: number[][], normals?: V3[]): void {
    if (slot !== "metal") { super.face(slot, points, hint, tint, uv, normals); return; }
    let coordinates = uv;
    if (!coordinates) {
      const normal = new Vector3();
      const origin = new Vector3(...points[0]);
      for (let i = 1; i + 1 < points.length; i++) {
        const a = new Vector3(...points[i]).sub(origin);
        const b = new Vector3(...points[i + 1]).sub(origin);
        normal.crossVectors(a, b);
        if (normal.lengthSq() > 1e-18) break;
      }
      if (normal.dot(new Vector3(...hint)) < 0) normal.negate();
      normal.normalize();
      const tangent = Math.abs(normal.x) < .9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
      tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
      const bitangent = new Vector3().crossVectors(normal, tangent);
      const repeat = this.mesh.repeat("brushed-metal");
      coordinates = points.map(point => {
        const position = new Vector3(...point);
        return [position.dot(tangent) * repeat + this.phase[0], position.dot(bitangent) * repeat + this.phase[1]];
      });
    }
    super.face("brushed-metal", points, hint, tint, coordinates, normals);
  }
}

/**
 * Uses the resolved stainless role for metal faces, including untextured authored overrides. Bind one set
 * of repeating albedo/normal/properties maps; material roughness controls polish.
 * This adds no geometry or images.
 */
export function brushedMetal(pen: Pen): Pen {
  return new BrushedMetalPen(pen);
}
