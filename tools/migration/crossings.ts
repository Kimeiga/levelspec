import type { CompiledLevel, NavEdge } from "../../src/core/types.ts";

/** A doorway is one crossing; disconnected open contact runs remain separate. */
function crossingGroups(level: CompiledLevel) {
  const groups = new Map<string, NavEdge[]>();
  for (const e of level.nav.edges) {
    const a = level.nav.nodes[e.a], b = level.nav.nodes[e.b];
    if (a.space === b.space && a.layer === b.layer) continue;
    const key = JSON.stringify([[`${a.layer}:${a.space}`, `${b.layer}:${b.space}`].sort(), e.kind, e.via]);
    const group = groups.get(key) ?? [];
    group.push(e);
    groups.set(key, group);
  }
  return groups;
}

function crossingIndex(level: CompiledLevel, group: NavEdge[]) {
  const at = new Map<string, NavEdge[]>(), ends = new Map<NavEdge, string[]>();
  for (const e of group) {
    const a = level.nav.nodes[e.a].cell, b = level.nav.nodes[e.b].cell;
    const vertices = a[0] !== b[0]
      ? [[Math.max(a[0], b[0]), a[1]], [Math.max(a[0], b[0]), a[1] + 1]]
      : [[a[0], Math.max(a[1], b[1])], [a[0] + 1, Math.max(a[1], b[1])]];
    const keys = vertices.map(v => v.join(","));
    ends.set(e, keys);
    for (const key of keys) {
      const list = at.get(key) ?? [];
      list.push(e);
      at.set(key, list);
    }
  }
  return { at, ends };
}

function connectedCrossings(level: CompiledLevel, group: NavEdge[]) {
  const { at, ends } = crossingIndex(level, group);
  const seen = new Set<NavEdge>(), selected: NavEdge[] = [];
  for (const start of group) {
    if (seen.has(start)) continue;
    selected.push(start);
    seen.add(start);
    const queue = [start];
    for (const e of queue) for (const next of ends.get(e)!.flatMap(key => at.get(key)!)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return selected;
}

export function migrationCrossings(level: CompiledLevel): NavEdge[] {
  const selected = new Set<NavEdge>();
  for (const group of crossingGroups(level).values()) {
    const representatives = group[0].kind === "vertical" ? [group[0]] : connectedCrossings(level, group);
    for (const edge of representatives) selected.add(edge);
  }
  return level.nav.edges.filter(e => selected.has(e));
}
