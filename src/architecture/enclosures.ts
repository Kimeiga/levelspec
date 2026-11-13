import { Matrix4 } from 'three';
import { pathLength } from '../vector/geometry.ts';
import { aborted, type V3 } from '../vector/types.ts';
import type { AssetGeometry } from '../vector/props.ts';
import { loft, surfaceSolid, transform, type ResolvedProfile } from './geometry.ts';
import { sweepGeometry, type SweepGeometry } from './sweep.ts';
import { profileSampler } from './flights.ts';
import type { ResolvedFlight } from './flights.ts';
import type { ArchitectureResolution, ResolvedElement } from './resolve.ts';
import type { SideEnclosure } from './types.ts';

interface Span { base: [V3, V3]; guide: [V3, V3] }

/** Interpolates a local span without changing its station correspondence. */
function interpolate(a: V3, b: V3, fraction: number): V3 { return a.map((n, axis) => n + (b[axis] - n) * fraction) as V3; }

/** Resolves only the explicitly selected host side or footprint edge. */
function hostSpans(host: ResolvedElement, element: SideEnclosure, flight: ResolvedFlight | undefined, footprint: Pick<ResolvedProfile, "loops"> | undefined): Span[] {
  const inverse = host.matrix.clone().invert(), local = (p: V3) => transform(p, inverse);
  if (flight) {
    if (element.edge !== undefined || element.loop !== undefined) throw new Error('Flight enclosures select a side, not a footprint edge.');
    if (element.side === 'start' || element.side === 'end') {
      const segment = element.side === 'start' ? flight.segments[0] : flight.segments.at(-1)!;
      const index = element.side === 'start' ? 0 : 1;
      return [{ base: [local(segment.left[index]), local(segment.right[index])], guide: [local(segment.guideLeft[index]), local(segment.guideRight[index])] }];
    }
    return flight.segments.map(segment => ({ base: (element.side === 'left' ? segment.left : segment.right).map(local) as [V3, V3], guide: (element.side === 'left' ? segment.guideLeft : segment.guideRight).map(local) as [V3, V3] }));
  }
  if (!footprint || !Number.isInteger(element.edge) || !Number.isInteger(element.loop ?? 0)) throw new Error('Footprint enclosures require an explicit loop and edge index.');
  const loop = footprint.loops[element.loop ?? 0], edge = element.edge!;
  if (!loop || edge < 0 || edge >= loop.length) throw new Error('Enclosure footprint edge does not exist.');
  const points = [local(loop[edge]), local(loop[(edge + 1) % loop.length])] as [V3, V3];
  return [{ base: points, guide: points }];
}

/**
 * Builds explicit side construction in the host frame. Bottoms follow actual treads;
 * wall/parapet/rail tops follow the guide, curbs follow treads, and top profiles are
 * absolute local elevations. Positive offsets and returns extend toward the selected side.
 */
export function enclosureGeometry(node: ResolvedElement, host: ResolvedElement, resolution: ArchitectureResolution, flight: ResolvedFlight | undefined, footprint: Pick<ResolvedProfile, "loops"> | undefined, maximumTriangles: number, signal?: AbortSignal, checkSweep?: (sweep: SweepGeometry) => void): AssetGeometry[] {
  const element = node.element as SideEnclosure, original = hostSpans(host, element, flight, footprint);
  const length = original.reduce((sum, span) => sum + pathLength(span.guide), 0), end = element.end ?? length;
  if (!Number.isFinite(element.start) || element.start < 0 || end <= element.start || end > length + 1e-7) throw new Error('Enclosure span must lie inside its selected host edge.');
  if (element.thickness <= 0 || element.height <= 0 || !Number.isFinite(element.thickness + element.height + element.offset)) throw new Error('Enclosure dimensions must be finite and positive.');
  const top = element.top ? resolution.paths.get(element.top) : undefined;
  if (element.top && (!top || top[0][0] > element.start + 1e-7 || top.at(-1)![0] < end - 1e-7 || top.some((p, i) => i > 0 && p[0] < top[i - 1][0]))) throw new Error('Enclosure top profile must cover the selected span with increasing stations.');
  const sampleTop = top ? profileSampler(top) : undefined;
  const topAt = (station: number, base: number, guide: number, side: 'before' | 'after') => sampleTop ? sampleTop(station, side) : (element.construction === 'curb' ? base : guide) + element.height;
  if ((original.length + (top?.length ?? 0)) * 24 > maximumTriangles) throw new Error('Enclosure station budget exceeded before allocation.');
  const direction = (span: Span): V3 => { const [a, b] = span.guide, run = pathLength(span.guide); return [-(b[1] - a[1]) / run, (b[0] - a[0]) / run, 0]; };
  const sign = element.side === 'right' || element.side === 'start' ? -1 : 1;
  const spans: { base: [V3, V3]; top: [V3, V3]; start: number; end: number; normals: [V3, V3] }[] = [];
  let distance = 0, topIndex = 0;
  for (let i = 0; i < original.length; i++) {
    aborted(signal);
    const span = original[i], run = pathLength(span.guide), start = Math.max(distance, element.start), finish = Math.min(distance + run, end);
    const normal = direction(span);
    const normalAt = (index: number): V3 => {
      const other = direction(original[index < 0 || index >= original.length ? i : index]);
      const denominator = 1 + normal[0] * other[0] + normal[1] * other[1];
      if (denominator < .1) throw new Error('Enclosure corner reverses or folds.');
      return normal.map((n, axis) => (n + other[axis]) / denominator) as V3;
    };
    const cuts = [start];
    while (top && topIndex < top.length && top[topIndex][0] <= start + 1e-8) topIndex++;
    while (top && topIndex < top.length && top[topIndex][0] < finish - 1e-8) { const station = top[topIndex++][0]; if (station > cuts.at(-1)! + 1e-8) cuts.push(station); }
    cuts.push(finish);
    for (let cut = 1; cut < cuts.length && finish > start + 1e-8; cut++) {
      const a = cuts[cut - 1], b = cuts[cut], endpoints = [a, b].map(station => {
        const t = (station - distance) / run, base = interpolate(...span.base, t), guide = interpolate(...span.guide, t);
        const n = Math.abs(station - distance) < 1e-8 ? normalAt(i - 1) : Math.abs(station - distance - run) < 1e-8 ? normalAt(i + 1) : normal;
        base[0] += sign * element.offset * n[0]; base[1] += sign * element.offset * n[1];
        const z = topAt(station, base[2], guide[2], station === a ? 'after' : 'before');
        if (z <= base[2] + 1e-8) throw new Error(`Enclosure top crosses its support at station ${station.toFixed(3)} m.`);
        return { base, top: [base[0], base[1], z] as V3, normal: n };
      });
      spans.push({ base: [endpoints[0].base, endpoints[1].base], top: [endpoints[0].top, endpoints[1].top], normals: [endpoints[0].normal, endpoints[1].normal], start: a, end: b });
    }
    distance += run;
  }
  const geometry: AssetGeometry[] = [];
  let admitted = 0;
  const admit = (count: number) => { aborted(signal); admitted += count; if (admitted > maximumTriangles) throw new Error('Enclosure aggregate geometry budget exceeded before allocation.'); };
  const solidSpan = (base: [V3, V3], top: [V3, V3], normals: [V3, V3]) => {
    admit(12);
    const sections = base.map((p, i) => {
      const n = normals[i], half = element.thickness / 2;
      return [[p[0] - n[0] * half, p[1] - n[1] * half, p[2]], [p[0] + n[0] * half, p[1] + n[1] * half, p[2]], [p[0] + n[0] * half, p[1] + n[1] * half, top[i][2]], [p[0] - n[0] * half, p[1] - n[1] * half, top[i][2]]] as V3[];
    });
    geometry.push(loft(sections, [[0, 1, 2], [0, 2, 3]]));
  };
  const branches = [spans];
  for (const [amount, span, index] of [[element.startReturn, spans[0], 0], [element.endReturn, spans.at(-1)!, 1]] as const) if (amount !== undefined) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enclosure returns require positive length.');
    const a = span.base[index], top = span.top[index], miter = span.normals[index];
    const magnitude = Math.hypot(miter[0], miter[1]);
    const normal: V3 = [miter[0] / magnitude, miter[1] / magnitude, 0];
    const b: V3 = [a[0] + normal[0] * sign * amount, a[1] + normal[1] * sign * amount, a[2]];
    const side: V3 = [-(b[1] - a[1]) / amount, (b[0] - a[0]) / amount, 0];
    branches.push([{ base: [a, b], top: [top, [b[0], b[1], top[2]]], normals: [side, side], start: 0, end: amount }]);
  }
  if (element.construction !== 'railing') {
    if (element.rails?.length || element.posts) throw new Error('Rails and posts require railing construction.');
    for (const branch of branches) for (const span of branch) solidSpan(span.base, span.top, span.normals);
  } else {
    if (!element.rails?.length) throw new Error('A railing requires explicit rail profiles.');
    for (const branch of branches) {
      for (const rail of element.rails) {
        const profile = resolution.profiles.get(rail.profile); if (!profile) throw new Error(`Unknown rail profile ${rail.profile}.`);
        const path: V3[] = [];
        for (const span of branch) for (const p of span.top) {
          const point: V3 = [p[0], p[1], p[2] + rail.topOffset];
          if (!path.length || point.some((n, axis) => Math.abs(n - path.at(-1)![axis]) > 1e-8)) path.push(point);
        }
        const estimate = 2 * profile.triangles.length * (path.length + 1) + 4 * profile.loops.reduce((n, loop) => n + loop.length, 0) * path.length;
        admit(estimate);
        const sweep = sweepGeometry(profile, path, new Matrix4(), signal);
        checkSweep?.(sweep); geometry.push(sweep.geometry);
      }
      if (element.posts) {
        const profile = resolution.profiles.get(element.posts.profile), spacing = element.posts.maximumSpacing;
        if (!profile || !Number.isFinite(spacing) || spacing <= 0 || profile.points.some(p => Math.abs(p[2]) > 1e-7)) throw new Error('Posts require a local XY profile and positive maximum spacing.');
        const start = branch[0].start, end = branch.at(-1)!.end, count = Math.ceil((end - start) / spacing);
        admit((count + 1) * (profile.triangles.length * 2 + profile.points.length * 2));
        let spanIndex = 0;
        for (let i = 0; i <= count; i++) {
          aborted(signal);
          const station = start + (end - start) * i / count;
          while (spanIndex + 1 < branch.length && station > branch[spanIndex].end + 1e-8) spanIndex++;
          const span = branch[spanIndex];
          const fraction = (station - span.start) / (span.end - span.start), base = interpolate(...span.base, fraction), top = interpolate(...span.top, fraction);
          const cap = { ...profile, points: profile.points.map(p => [base[0] + p[0], base[1] + p[1], top[2]] as V3) };
          geometry.push(surfaceSolid(cap, p => [p[0], p[1], base[2]]));
        }
      }
    }
  }
  if (geometry.reduce((sum, mesh) => sum + mesh.triangles.length, 0) > maximumTriangles) throw new Error('Enclosure triangle budget exceeded.');
  for (const mesh of geometry) {
    mesh.positions = mesh.positions.map(p => transform(p, node.matrix));
    if (node.matrix.determinant() < 0) mesh.triangles = mesh.triangles.map(([a, b, c]) => [c, b, a]);
  }
  return geometry;
}
