import { boxContact } from './contact.ts';
import type { Box } from './types.ts';

type Rectangle = [number, number, number, number]; // run min, z min, run max, z max
const EPS = 1e-6;

function spans(rectangles: Rectangle[], sweep: 0 | 1, middle: number): [number, number][] {
  const cross = 1 - sweep;
  const intervals = rectangles.filter((r) => r[sweep] < middle && r[sweep + 2] > middle)
    .map((r): [number, number] => [r[cross], r[cross + 2]]).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push(interval);
  }
  return merged;
}

/** Exact two-rectangle union using only their existing coordinate planes. */
function partition(rectangles: Rectangle[], sweep: 0 | 1): Rectangle[] {
  const cross = 1 - sweep;
  const cuts = [...new Set(rectangles.flatMap((r) => [r[sweep], r[sweep + 2]]))].sort((a, b) => a - b);
  const out: Rectangle[] = [], sections = new Map<string, Rectangle>();
  for (let i = 0; i + 1 < cuts.length; i++) {
    for (const [lo, hi] of spans(rectangles, sweep, (cuts[i] + cuts[i + 1]) / 2)) {
      const section = [lo, hi].join('|'), previous = sections.get(section);
      if (previous && previous[sweep + 2] === cuts[i]) { previous[sweep + 2] = cuts[i + 1]; continue; }
      const r: Rectangle = [0, 0, 0, 0];
      r[cross] = lo; r[cross + 2] = hi;
      r[sweep] = cuts[i]; r[sweep + 2] = cuts[i + 1];
      out.push(r);
      sections.set(section, r);
    }
  }
  return out;
}

function boxFrom(r: Rectangle, template: Box, axis: 0 | 1): Box {
  const box: Box = { min: [...template.min], max: [...template.max] };
  box.min[axis] = r[0]; box.max[axis] = r[2];
  box.min[2] = r[1]; box.max[2] = r[3];
  return box;
}

function conflicts(boxes: Box[], neighbors: Box[]) {
  const pairs: [number, number][] = [];
  let count = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxContact(boxes[i], boxes[j]) !== 'coplanar') continue;
      pairs.push([i, j]); count++;
    }
    for (const neighbor of neighbors) if (boxContact(boxes[i], neighbor) === 'coplanar') count++;
  }
  return { pairs, count };
}

function improve(rectangles: Rectangle[], boxes: Box[], neighbors: Box[], axis: 0 | 1): Rectangle[] | undefined {
  const bad = conflicts(boxes, neighbors);
  let best: Rectangle[] | undefined, bestCount = bad.count;
  for (const [a, b] of bad.pairs) {
    for (const sweep of [0, 1] as const) {
      const replacement = partition([rectangles[a], rectangles[b]], sweep);
      if (replacement.some((r) => r[2] - r[0] <= EPS || r[3] - r[1] <= EPS)) continue;
      const next = rectangles.filter((_, i) => i !== a && i !== b).concat(replacement);
      const score = conflicts(next.map((r) => boxFrom(r, boxes[0], axis)), neighbors).count;
      if (score < bestCount) { best = next; bestCount = score; }
    }
  }
  return best;
}

/**
 * Preserve valid columns. Repartition only conflicting pairs, accepting an
 * exact union only when the unchanged validator contact count decreases,
 * including contacts with neighboring geometry. The bounded repair leaves
 * any unresolved defect visible to ordinary final validation.
 */
export function repairBandRectangles(boxes: Box[], axis: 0 | 1, neighbors: Box[]): Box[] {
  if (boxes.length === 0) return [];
  let rectangles: Rectangle[] = boxes.map((b) => [b.min[axis], b.min[2], b.max[axis], b.max[2]]);
  let current = boxes;
  const limit = Math.max(16, 8 * boxes.length);
  for (let round = 0; round < limit; round++) {
    const next = improve(rectangles, current, neighbors, axis);
    if (!next) break;
    rectangles = next;
    current = next.map((r) => boxFrom(r, boxes[0], axis));
  }
  return current;
}
