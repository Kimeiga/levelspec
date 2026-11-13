import { smoothStep } from "./noise.ts";
import type { SurfaceSample } from "../surface/types.ts";
import { componentPatina, type ComponentPatina } from "./component-patina.ts";

/** Theme-independent metal finish. Colors are linear RGB; receiver coordinates are unwrapped physical meters. */
export interface MetalSurfaceSettings extends Omit<ComponentPatina, "kind"> {
  kind: "frame" | "cage" | "pipe" | "sheet";
  substrate: { material: string; repeat: number };
  coating: { material: string; repeat: number };
  /** Installed paint fraction, 0 for bare metal and 1 for a painted finish. */
  paintCoverage?: number;
  /** Cylindrical circumference in meters; wraps patina and fits an integer number of substrate repeats. */
  wrapU?: number;
}

/**
 * Creates portable intrinsic PBR sampling for an arbitrary metal receiver.
 * The receiver owns UVs, geometry, map resolution and lighting. Contacts and folds
 * may be supplied lazily after assembly construction. No scene geometry is searched.
 */
export function createMetalSurface(settings: MetalSurfaceSettings): {
  /** Intrinsic PBR with normal-only bump in meters; geometric height remains zero. */
  sample(u: number, v: number): SurfaceSample;
} {
  const coverage = settings.paintCoverage ?? 1;
  const scale = settings.metric?.scale ?? [1, 1];
  if (!Number.isFinite(coverage) || coverage < 0 || coverage > 1
    || scale.some(value => !Number.isFinite(value) || value <= 0)
    || [settings.substrate.repeat, settings.coating.repeat].some(value => !Number.isFinite(value) || value <= 0)
    || [settings.wear, settings.grime, settings.rust].some(value => !Number.isFinite(value) || value < 0 || value > 1)
    || settings.paint.some(value => !Number.isFinite(value) || value < 0))
    throw new Error("Metal surface requires finite nonnegative color, positive metric and paint coverage in [0,1].");
  if (!settings.bounds.every(Number.isFinite) || settings.bounds[2] <= settings.bounds[0]
    || settings.bounds[3] <= settings.bounds[1] || !Number.isFinite(settings.seed)
    || (settings.metric?.gravity ?? []).some(value => !Number.isFinite(value)))
    throw new Error("Metal surface requires increasing finite bounds, a finite seed and finite gravity.");
  if (scale.some(value => value !== 1))
    throw new Error("Metal surface UVs must be unwrapped in physical meters before rasterization.");
  if (settings.wrapU !== undefined && (!Number.isFinite(settings.wrapU) || settings.wrapU <= 0))
    throw new Error("Metal wrap circumference must be finite and positive.");
  const weather = (u: number, v: number) => {
    const period = settings.wrapU;
    if (!period) return componentPatina(settings, u, v);
    const x = ((u % period) + period) % period, t = x / period, weight = t * t * (3 - 2 * t);
    const a = componentPatina(settings, x, v), b = componentPatina(settings, x - period, v);
    const blend = (left: number, right: number): number => left * (1 - weight) + right * weight;
    const color = (left: typeof a.paint, right: typeof a.paint): typeof a.paint => left.map((value, i) => blend(value, right[i])) as typeof a.paint;
    return { paint: color(a.paint, b.paint), mottling: color(a.mottling, b.mottling), oxide: color(a.oxide, b.oxide),
      paintCoverage: blend(a.paintCoverage, b.paintCoverage), substrateRoughness: blend(a.substrateRoughness, b.substrateRoughness),
      runoff: blend(a.runoff, b.runoff), oxideCoverage: blend(a.oxideCoverage, b.oxideCoverage), roughness: blend(a.roughness, b.roughness), bump: blend(a.bump, b.bump) };
  };
  return {
    sample(u, v) {
      const value = weather(u, v);
      const uv = (repeat: number): [number, number] => [settings.wrapU ? u / settings.wrapU * Math.max(1, Math.round(settings.wrapU * repeat)) : u * repeat, v * repeat];
      return { height: 0, bump: value.bump, roughness: value.substrateRoughness, layers: [{
        material: settings.substrate.material, weight: 1, uv: uv(settings.substrate.repeat), tint: value.mottling,
        coatings: [
          { material: settings.coating.material, uv: uv(settings.coating.repeat),
            opacity: value.paintCoverage, tint: value.paint, roughness: value.roughness },
          { material: settings.coating.material, uv: uv(settings.coating.repeat),
            opacity: value.oxideCoverage, tint: value.oxide, roughness: 0.95 },
          ...(settings.runoff || settings.contacts ? [{ material: settings.coating.material, uv: uv(settings.coating.repeat),
            opacity: settings.grime * 0.92 * smoothStep(0.035, 0.75, value.runoff),
            tint: [0.045, 0.021, 0.008] as [number, number, number], roughness: 0.92 }] : []),
        ],
      }] };
    },
  };
}
