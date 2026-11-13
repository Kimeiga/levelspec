/** All-pairs standing-eye optical study on a compiled source: longest visible pair per (space, space).
 *  Grid samples inside declared space polygons (clear of covers) plus three points per stair.
 *  Sampled optical rays only: not weapons, utility or play evidence; lines narrower than the grid can be missed.
 *  Usage: node projects/dragon-ford/sightlines.mjs <layout-data.json> <level.aml> <out.json> [step=1] [minDistance=30] */
import {readFile, writeFile} from 'node:fs/promises';
import {compile, parseAml} from '../../src/architecture/index.ts';
import {VisibilityGeometry} from '../../tools/fps/visibility-geometry.ts';

const [dataPath, amlPath, outPath, stepArg, minArg] = process.argv.slice(2);
const step = Number(stepArg ?? 1), minDistance = Number(minArg ?? 30);
const plan = JSON.parse(await readFile(dataPath, 'utf8'));
const level = await compile(parseAml((await readFile(amlPath)).toString()), {navigation: {cell: .125}, floorGaps: 'error'});
const optical = new VisibilityGeometry(level);
const EYE = 1.86;
function inPoly(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
const edgeDist = (p, poly) => Math.min(...poly.map((a, i) => distSeg(p, a, poly[(i + 1) % poly.length])));
const pts = [];
for (const s of plan.spaces) {
  const xs = s.polygon.map(p => p[0]), ys = s.polygon.map(p => p[1]);
  for (let x = Math.ceil(Math.min(...xs) / step) * step; x <= Math.max(...xs); x += step) for (let y = Math.ceil(Math.min(...ys) / step) * step; y <= Math.max(...ys); y += step) {
    const p = [x, y]; if (!inPoly(p, s.polygon) || edgeDist(p, s.polygon) < .3) continue;
    if (plan.covers.some(c => Math.abs(c.z - s.z) < .1 && (inPoly(p, c.polygon) || edgeDist(p, c.polygon) < .3))) continue;
    if (plan.apertures.some(a => a.sill > 0 && Math.abs(a.z - s.z) < .1 && (inPoly(p, a.polygon) || edgeDist(p, a.polygon) < .3))) continue;
    pts.push({id: s.id, p: [+x.toFixed(2), +y.toFixed(2), s.z]});
  }
}
for (const st of plan.stairs) for (const t of [.2, .5, .8]) pts.push({id: st.id, p: [st.a[0] + (st.b[0] - st.a[0]) * t, st.a[1] + (st.b[1] - st.a[1]) * t, st.z0 + (st.z1 - st.z0) * t]});
const pairs = new Map(); let rays = 0;
for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
  const a = pts[i], b = pts[j], d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
  if (d < minDistance) continue; rays++;
  if (!optical.visible([a.p[0], a.p[1], a.p[2] + EYE], [b.p[0], b.p[1], b.p[2] + EYE])) continue;
  const k = [a.id, b.id].sort().join(' <-> '), e = pairs.get(k) ?? {n: 0, max: 0};
  e.n++; if (d > e.max) { e.max = +d.toFixed(1); e.a = a.p; e.b = b.p; } pairs.set(k, e);
}
const rows = [...pairs].map(([pair, e]) => ({pair, ...e})).sort((x, y) => y.max - x.max);
await writeFile(outPath, JSON.stringify({step, minDistance, samples: pts.length, rays, pairs: rows, limitations: 'Standing eye to standing eye (1.86 m) between grid samples; sampled optical rays on rendered opaque geometry.'}, null, 1) + '\n');
console.log(`samples ${pts.length}, rays ${rays}, visible space-pairs >= ${minDistance} m: ${rows.length}`);
for (const r of rows.slice(0, 60)) console.log(r.pair.padEnd(30), String(r.max).padStart(6), String(r.n).padStart(6), JSON.stringify(r.a), JSON.stringify(r.b));
