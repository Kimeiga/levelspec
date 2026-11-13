import { inside } from "./geometry.ts";
import type { CompiledLevel, V3 } from "./types.ts";
import type { PhysicalRouteWork } from "./physical-work.ts";

/** Includes exact boundaries so wall jambs and floor seams cannot remove optimistic connectivity. */
function onBoundary(point: V3, loop: V3[]): boolean {
  return loop.some((a, i) => {
    const b = loop[(i + 1) % loop.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    return length > 1e-9 && Math.abs(dx * (point[1] - a[1]) - dy * (point[0] - a[0])) < 1e-6 * length &&
      (point[0] - a[0]) * dx + (point[1] - a[1]) * dy >= -1e-6 &&
      (point[0] - b[0]) * dx + (point[1] - b[1]) * dy <= 1e-6;
  });
}

/** Queries independent flat-domain proofs; all other areas retain unrestricted internal connectivity. */
export class RouteDomains {
  private readonly level: CompiledLevel;
  private readonly work: PhysicalRouteWork;
  constructor(level: CompiledLevel, work: PhysicalRouteWork) {
    this.level = level;
    this.work = work;
  }

  /** Returns every possible component at a marker or mouth station. */
  at(point: V3, area: string): string[] {
    const domain = this.level.connectionDomains?.find(domain => domain.area === area && domain.height === this.level.document.player.height && domain.step === this.level.document.player.step);
    if (!domain) return [area];
    if (Math.abs(domain.elevation - point[2]) > this.level.document.player.step + 0.02)
      return domain.components.map((_, i) => `${area}/physical-domain/${i}`);
    return domain.components.flatMap((loops, i) => {
      this.work.spend(loops.reduce((sum, loop) => sum + loop.length, 0));
      const boundary = loops.some(loop => onBoundary(point, loop));
      const contained = loops.reduce((count, loop) => count + Number(inside(point, loop)), 0) % 2 === 1;
      return boundary || contained ? [`${area}/physical-domain/${i}`] : [];
    });
  }

  /** Enumerates all span/boundary intervals; fixed crossing samples cannot reduce this upper bound. */
  along(path: V3[], area: string): string[] {
    const domain = this.level.connectionDomains?.find(domain => domain.area === area && domain.height === this.level.document.player.height && domain.step === this.level.document.player.step);
    if (!domain) return [area];
    const found = new Set<string>();
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b[0] - a[0], dy = b[1] - a[1];
      const cuts = [0, 1];
      for (const loops of domain.components) for (const loop of loops) for (let j = 0; j < loop.length; j++) {
        this.work.spend();
        const c = loop[j], d = loop[(j + 1) % loop.length], ex = d[0] - c[0], ey = d[1] - c[1];
        const denominator = dx * ey - dy * ex;
        if (Math.abs(denominator) < 1e-10) continue;
        const station = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / denominator;
        const edgeStation = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / denominator;
        if (station > 0 && station < 1 && edgeStation >= -1e-7 && edgeStation <= 1 + 1e-7) cuts.push(station);
      }
      cuts.sort((first, second) => first - second);
      const stations = [...cuts, ...cuts.slice(1).map((cut, index) => (cut + cuts[index]) / 2)];
      for (const station of stations)
        this.at(a.map((value, axis) => value + (b[axis] - value) * station) as V3, area).forEach(id => found.add(id));
    }
    // A misplaced/unverified mouth must not turn missing evidence into an impossible-route proof.
    return found.size ? [...found] : domain.components.map((_, i) => `${area}/physical-domain/${i}`);
  }
}
