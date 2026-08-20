/**
 * Additional compilation targets.
 *
 * The semantic source is kept independent of any one renderer: the same
 * LevelSpec drives an editable brush greybox, an offline CSG bake, an exact
 * B-rep model, a 2D plan and a runtime mesh. Each target is generated, never
 * hand-authored, and each one converts axes exactly once.
 */

import { boxMesh } from '../core/mesh.ts';
import type { CompiledLevel, Solid } from '../core/types.ts';
import { decomposeToRects } from '../core/grid.ts';

// ---------------------------------------------------------------------------
// Wavefront OBJ — canonical Z-up, one group per semantic role
// ---------------------------------------------------------------------------

export function toOBJ(level: CompiledLevel, solids?: Solid[]): string {
  const list = solids ?? level.solids;
  const out: string[] = [
    `# ${level.spec.name} — compiled from LevelSpec ${level.spec.id}`,
    '# right-handed, Z-up, meters',
    `mtllib ${level.spec.id}.mtl`,
  ];
  let vbase = 1;
  const byRole = new Map<string, Solid[]>();
  for (const s of list) {
    let arr = byRole.get(s.role);
    if (!arr) byRole.set(s.role, (arr = []));
    arr.push(s);
  }
  for (const [role, group] of byRole) {
    out.push(`g ${role}`, `usemtl ${role}`);
    for (const s of group) {
      const m = boxMesh(s.box);
      for (let i = 0; i < m.positions.length; i += 3)
        out.push(`v ${m.positions[i].toFixed(4)} ${m.positions[i + 1].toFixed(4)} ${m.positions[i + 2].toFixed(4)}`);
      for (let i = 0; i < m.normals.length; i += 3)
        out.push(`vn ${m.normals[i]} ${m.normals[i + 1]} ${m.normals[i + 2]}`);
      for (let i = 0; i < m.indices.length; i += 3) {
        const a = vbase + m.indices[i];
        const b = vbase + m.indices[i + 1];
        const c = vbase + m.indices[i + 2];
        out.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      }
      vbase += m.positions.length / 3;
    }
  }
  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// OpenSCAD — the offline Boolean bake of the static shell
// ---------------------------------------------------------------------------

/**
 * A 1 mm controlled overlap regularises unions of exactly face-touching
 * solids. The epsilon belongs to compiler policy, not to a prompt.
 */
const CSG_EPSILON = 0.001;

export function toOpenSCAD(level: CompiledLevel): string {
  const statics = level.solids.filter((s) => !s.dynamic);
  const dynamics = level.solids.filter((s) => s.dynamic);
  const out: string[] = [
    `// ${level.spec.name} — static shell, Boolean union`,
    `// Generated from LevelSpec ${level.spec.id}. Do not hand-edit.`,
    `EPS = ${CSG_EPSILON};`,
    '',
    'module solid(mn, mx) {',
    '  translate([mn[0]-EPS/2, mn[1]-EPS/2, mn[2]-EPS/2])',
    '    cube([mx[0]-mn[0]+EPS, mx[1]-mn[1]+EPS, mx[2]-mn[2]+EPS]);',
    '}',
    '',
    'module static_shell() {',
    '  union() {',
  ];
  for (const s of statics) out.push(`    solid(${vec(s.box.min)}, ${vec(s.box.max)}); // ${s.id}`);
  out.push('  }', '}', '');
  out.push('// Dynamic surfaces stay OUT of the fused shell so they can be');
  out.push('// swapped, fractured or removed at runtime without a rebake.');
  out.push('module dynamic_surfaces() {');
  out.push('  union() {');
  for (const s of dynamics) out.push(`    solid(${vec(s.box.min)}, ${vec(s.box.max)}); // ${s.id} [${s.role}]`);
  out.push('  }', '}', '', 'static_shell();');
  return out.join('\n') + '\n';
}

const vec = (v: [number, number, number]): string => `[${v.map((n) => n.toFixed(4)).join(', ')}]`;

// ---------------------------------------------------------------------------
// CadQuery — exact B-rep solids and a STEP export
// ---------------------------------------------------------------------------

export function toCadQuery(level: CompiledLevel): string {
  const statics = level.solids.filter((s) => !s.dynamic);
  const lines: string[] = [
    '"""Exact B-rep model of the static shell, generated from LevelSpec.',
    '',
    `Level: ${level.spec.id} — ${level.spec.name}`,
    'Run with:  python cadquery_shell.py   (requires cadquery)',
    'Emits a fused solid and a STEP file for exact interchange.',
    '"""',
    'import cadquery as cq',
    '',
    'EPS = 0.001  # controlled overlap so face-touching solids fuse cleanly',
    'BOXES = [',
  ];
  for (const s of statics)
    lines.push(`    (${s.box.min.map(f).join(', ')}, ${s.box.max.map(f).join(', ')}),  # ${s.id}`);
  lines.push(
    ']',
    '',
    'shell = None',
    'for (x0, y0, z0, x1, y1, z1) in BOXES:',
    '    b = (cq.Workplane("XY")',
    '         .box(x1 - x0 + EPS, y1 - y0 + EPS, z1 - z0 + EPS, centered=False)',
    '         .translate((x0 - EPS / 2, y0 - EPS / 2, z0 - EPS / 2)))',
    '    shell = b if shell is None else shell.union(b)',
    '',
    'solid = shell.val()',
    'print("valid:", solid.isValid())',
    'print("closed solids:", len(solid.Solids()))',
    `cq.exporters.export(shell, "${level.spec.id}.step")`,
    `cq.exporters.export(shell, "${level.spec.id}.stl")`,
    '',
  );
  return lines.join('\n');
}

const f = (n: number): string => n.toFixed(4);

// ---------------------------------------------------------------------------
// DXF — a 2D plan per storey for inspection
// ---------------------------------------------------------------------------

export function toDXF(level: CompiledLevel): string {
  const g = level.spec.grid ?? 1;
  const out: string[] = ['0', 'SECTION', '2', 'ENTITIES'];
  const line = (x0: number, y0: number, x1: number, y1: number, layer: string): void => {
    out.push('0', 'LINE', '8', layer, '10', x0.toFixed(3), '20', y0.toFixed(3), '30', '0.0');
    out.push('11', x1.toFixed(3), '21', y1.toFixed(3), '31', '0.0');
  };
  for (const b of level.boundaries) {
    const layer = `${b.layer}_${b.type}`;
    const spans: [number, number][] = [];
    let cursor = b.start;
    for (const o of [...b.openings].sort((p, q) => p.t0 - q.t0)) {
      if (o.t0 > cursor) spans.push([cursor, o.t0]);
      cursor = Math.max(cursor, o.t1);
    }
    if (cursor < b.end) spans.push([cursor, b.end]);
    for (const [s, e] of spans) {
      if (b.axis === 'x') line(b.coord, s, b.coord, e, layer);
      else line(s, b.coord, e, b.coord, layer);
    }
    for (const o of b.openings) {
      const l = `${b.layer}_opening_${o.kind}`;
      if (b.axis === 'x') line(b.coord, o.t0, b.coord, o.t1, l);
      else line(o.t0, b.coord, o.t1, b.coord, l);
    }
  }
  for (const m of level.markers) {
    const r = g * 0.4;
    const l = `marker_${m.kind}`;
    line(m.pos[0] - r, m.pos[1] - r, m.pos[0] + r, m.pos[1] + r, l);
    line(m.pos[0] - r, m.pos[1] + r, m.pos[0] + r, m.pos[1] - r, l);
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Runtime payload consumed by the viewer
// ---------------------------------------------------------------------------

export interface RuntimePayload {
  id: string;
  name: string;
  description?: string;
  solids: Solid[];
  markers: CompiledLevel['markers'];
  boundaries: CompiledLevel['boundaries'];
  layers: { id: string; label?: string; z: number; height: number }[];
  spaces: { id: string; label?: string; layer: string; cells: [number, number][] }[];
  stats: Record<string, number>;
}

export function toRuntime(level: CompiledLevel): RuntimePayload {
  const spaces: RuntimePayload['spaces'] = [];
  for (const layer of level.spec.layers) {
    const occ = level.occupancy.get(layer.id);
    if (!occ) continue;
    for (const sp of layer.spaces) {
      const cells: [number, number][] = [];
      for (const [k, owner] of occ) {
        if (owner !== sp.id) continue;
        const i = k.indexOf(',');
        cells.push([Number(k.slice(0, i)), Number(k.slice(i + 1))]);
      }
      spaces.push({ id: sp.id, label: sp.label, layer: layer.id, cells });
    }
  }
  return {
    id: level.spec.id,
    name: level.spec.name,
    description: level.spec.description,
    solids: level.solids,
    markers: level.markers,
    boundaries: level.boundaries,
    layers: level.spec.layers.map((l) => ({ id: l.id, label: l.label, z: l.z, height: l.height })),
    spaces,
    stats: level.stats,
  };
}

// ---------------------------------------------------------------------------
// SVG plan — a printable storey drawing, straight from the boundary records
// ---------------------------------------------------------------------------

const WALL_STROKE: Record<string, string> = {
  hard: '#c8d2dd',
  soft: '#e39b45',
  reinforced: '#5b9dff',
  glass: '#7fd4e0',
  open: '#2f7f5a',
};

const OPENING_STROKE: Record<string, string> = {
  door: '#7de08a',
  arch: '#7de08a',
  open: '#7de08a',
  breach: '#ff8a5c',
  window: '#7fd4e0',
  rappel_window: '#a78bfa',
  rappel_door: '#a78bfa',
  hatch_frame: '#e0b25c',
};

const MARKER_FILL: Record<string, string> = {
  attacker_spawn: '#ff6b5a',
  defender_spawn: '#62a8ff',
  site: '#ffd75e',
  objective: '#ffb03a',
  poi: '#a78bfa',
  drone_hole: '#7de08a',
};

/** All storeys of a level, drawn side by side at a fixed metres-per-pixel. */
export function toSVGPlan(level: CompiledLevel, scale = 9, gap = 34): string {
  const g = level.spec.grid ?? 1;
  const layers = [...level.spec.layers].sort((a, b) => a.z - b.z);
  const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

  interface Panel {
    id: string;
    label: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }
  const panels: Panel[] = [];
  for (const layer of layers) {
    const occ = level.occupancy.get(layer.id);
    if (!occ || occ.size === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const k of occ.keys()) {
      const i = k.indexOf(',');
      const x = Number(k.slice(0, i));
      const y = Number(k.slice(i + 1));
      minX = Math.min(minX, x * g);
      minY = Math.min(minY, y * g);
      maxX = Math.max(maxX, (x + 1) * g);
      maxY = Math.max(maxY, (y + 1) * g);
    }
    panels.push({
      id: layer.id,
      label: `${layer.label ?? layer.id}  ·  z = ${layer.z.toFixed(2)} m`,
      minX: minX - 2,
      minY: minY - 2,
      maxX: maxX + 2,
      maxY: maxY + 2,
    });
  }
  if (!panels.length) return '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>';

  const heights = panels.map((p) => (p.maxY - p.minY) * scale);
  const widths = panels.map((p) => (p.maxX - p.minX) * scale);
  const H = Math.max(...heights) + 46;
  const W = widths.reduce((a, b) => a + b, 0) + gap * (panels.length - 1) + 24;

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" font-family="ui-sans-serif, system-ui, sans-serif">`,
    `<rect width="100%" height="100%" fill="#0a0e14"/>`,
  ];

  let cursor = 12;
  panels.forEach((p, i) => {
    const ox = cursor;
    const oy = 34;
    const ph = heights[i];
    const px = (x: number): number => ox + (x - p.minX) * scale;
    const py = (y: number): number => oy + ph - (y - p.minY) * scale;

    out.push(`<g id="${esc(p.id)}">`);
    out.push(
      `<text x="${ox}" y="${oy - 12}" fill="#9aa6b4" font-size="12" font-weight="600">${esc(p.label)}</text>`,
    );

    const occ = level.occupancy.get(p.id)!;
    const layer = level.spec.layers.find((l) => l.id === p.id)!;
    const order = new Map(layer.spaces.map((s, idx) => [s.id, idx]));
    // One filled rectangle per contiguous block of a space, not per cell.
    const bySpace = new Map<string, string[]>();
    for (const [k, space] of occ) {
      let arr = bySpace.get(space);
      if (!arr) bySpace.set(space, (arr = []));
      arr.push(k);
    }
    for (const [space, cells] of bySpace) {
      const hue = ((order.get(space) ?? 0) * 47) % 360;
      for (const [rx, ry, rw, rd] of decomposeToRects(cells)) {
        out.push(
          `<rect x="${px(rx * g).toFixed(1)}" y="${py((ry + rd) * g).toFixed(1)}" width="${(rw * g * scale).toFixed(1)}" height="${(rd * g * scale).toFixed(1)}" fill="hsl(${hue} 22% 24%)"/>`,
        );
      }
    }

    for (const c of level.spec.covers ?? []) {
      if (c.layer !== p.id) continue;
      out.push(
        `<rect x="${px(c.rect[0] * g).toFixed(1)}" y="${py((c.rect[1] + c.rect[3]) * g).toFixed(1)}" ` +
          `width="${(c.rect[2] * g * scale).toFixed(1)}" height="${(c.rect[3] * g * scale).toFixed(1)}" ` +
          `fill="rgba(190,170,110,0.45)"/>`,
      );
    }

    for (const b of level.boundaries) {
      if (b.layer !== p.id) continue;
      const seg = (t0: number, t1: number, stroke: string, w: number): void => {
        const [x0, y0, x1, y1] =
          b.axis === 'x' ? [b.coord, t0, b.coord, t1] : [t0, b.coord, t1, b.coord];
        out.push(
          `<line x1="${px(x0).toFixed(1)}" y1="${py(y0).toFixed(1)}" x2="${px(x1).toFixed(1)}" y2="${py(y1).toFixed(1)}" stroke="${stroke}" stroke-width="${w}"/>`,
        );
      };
      const ww = Math.max(1.6, scale * 0.24);
      let cur = b.emitStart;
      for (const o of [...b.openings].sort((a, c) => a.t0 - c.t0)) {
        if (o.t0 > cur) seg(cur, Math.min(o.t0, b.emitEnd), WALL_STROKE[b.type] ?? '#c8d2dd', ww);
        seg(
          Math.max(o.t0, b.emitStart),
          Math.min(o.t1, b.emitEnd),
          OPENING_STROKE[o.kind] ?? '#7de08a',
          ww * 0.7,
        );
        cur = Math.max(cur, o.t1);
      }
      if (cur < b.emitEnd) seg(cur, b.emitEnd, WALL_STROKE[b.type] ?? '#c8d2dd', ww);
    }

    for (const v of level.verticals) {
      if (v.spec.from_layer !== p.id && v.spec.to_layer !== p.id) continue;
      const [x, y, w, d] = v.footprint;
      out.push(
        `<rect x="${px(x * g).toFixed(1)}" y="${py((y + d) * g).toFixed(1)}" width="${(w * g * scale).toFixed(1)}" height="${(d * g * scale).toFixed(1)}" ` +
          `fill="none" stroke="${v.spec.kind === 'hatch' ? '#e0b25c' : '#ff9a6a'}" stroke-width="1.2" stroke-dasharray="4 3"/>`,
      );
    }

    const acc = new Map<string, { x: number; y: number; n: number }>();
    for (const [k, space] of occ) {
      const j = k.indexOf(',');
      const x = Number(k.slice(0, j));
      const y = Number(k.slice(j + 1));
      let a = acc.get(space);
      if (!a) acc.set(space, (a = { x: 0, y: 0, n: 0 }));
      a.x += x + 0.5;
      a.y += y + 0.5;
      a.n++;
    }
    for (const [id, a] of acc) {
      const sp = layer.spaces.find((s) => s.id === id);
      out.push(
        `<text x="${px((a.x / a.n) * g).toFixed(1)}" y="${py((a.y / a.n) * g).toFixed(1)}" fill="rgba(226,234,243,0.86)" font-size="9" font-weight="600" text-anchor="middle">${esc(sp?.label ?? id)}</text>`,
      );
    }

    for (const m of level.markers) {
      if (m.layer !== p.id) continue;
      out.push(
        `<circle cx="${px(m.pos[0]).toFixed(1)}" cy="${py(m.pos[1]).toFixed(1)}" r="${(scale * 0.42).toFixed(1)}" fill="${MARKER_FILL[m.kind] ?? '#fff'}"/>`,
      );
    }

    out.push('</g>');
    cursor += widths[i] + gap;
  });

  out.push('</svg>');
  return out.join('\n');
}
