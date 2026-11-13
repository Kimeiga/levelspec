/** Exercise authored routes using the unchanged reviewer capsule and bounded collision samples. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {compile, parseAml} from '../../../src/architecture/index.ts';
import {WalkMotion} from '../../../review/walk-motion.ts';
import {physicalWalk} from '../../../review/physical-walk.ts';
const output = resolve(process.argv[2] ?? 'generated/greywatch/walk-r2');
await mkdir(output, {recursive: false});
const source = await readFile(new URL('../level.aml', import.meta.url), 'utf8');
const level = await compile(parseAml(source), {navigation: {cell: .125}});
if (level.diagnostics.some(d => d.severity === 'error')) throw new Error('Geometry errors');
const player = level.navigation.settings.player;
const physical = physicalWalk(level);
const routes = [
 ['T-gate-and-ward-to-A', [[40,8,0],[48.2,8,0],[48.2,14.8,0],[40.5,14.8,0],[40.5,21.5,0],[15,21.5,0],[15,40,0],[16,44,0],[14.5,54,0],[14.5,59,0],[15,70,0]]],
 ['mid-transfer-to-B', [[41,46,0],[43,51,0],[47,51,0],[47,56,0],[60,56,0],[64.5,56,0],[64.5,61,0],[66,70,0],[69,70,0]]],
 ['vestibule-ambulatory-to-B', [[65,53,0],[76,53,0],[81,53,0],[81,66,0],[76,66,0],[71,70,0],[69,70,0]]],
 ['CT-to-A', [[42,85,0],[37.2,85,0],[37.2,80.5,0],[24.5,80.5,0],[24.5,71,0],[17,70,0]]],
 ['CT-to-B', [[42,85,0],[47.2,85,0],[47.2,80,0],[62.5,80,0],[62.5,71,0],[69,70,0]]],
 ['rear-cloister-rotation', [[24.5,71,0],[24.5,76.5,0],[62.5,76.5,0],[62.5,71,0],[69,70,0]]],
 ['W-rise', [[26,25.2,0],[26,39.5,3]]],
 ['W-fall', [[26,46.5,3],[26,59,0]]],
 ['E-rise', [[56,25.2,0],[56,39.5,3]]],
 ['E-fall', [[56,42.5,3],[56,55.5,0]]],
 ['wall-walk', [[26,41,3],[56,41,3]]],
 ['underpass', [[41,32,0],[41,48,0]]],
];
const results = [];
for (const [name, original] of routes) for (const reverse of [false,true]) {
 const points = reverse ? [...original].reverse() : original;
 const feet = physical.resolve(points[0], points[0], player);
 const record = {id: name + (reverse ? '-reverse' : ''), requested: points, samples: [], passed: false};
 results.push(record);
 if (!feet || physical.blocked(feet,player)) { record.error = 'Starting capsule does not fit'; continue; }
 const motion = new WalkMotion(level, feet);
 let ticks = 0, failed = false;
 for (const target of points.slice(1)) {
  let still = 0;
  const budget = Math.ceil((Math.hypot(target[0]-motion.state.feet[0], target[1]-motion.state.feet[1])/3.4 + 6)*120);
  let reached = false;
  for (let i=0; i<budget; i++) {
   const before = motion.state.feet;
   const dx = target[0]-before[0], dy = target[1]-before[1];
   if (Math.hypot(dx,dy)<.08 && Math.abs(target[2]-before[2])<.3) {reached=true;break;}
   motion.advance({forward:1,right:0,yaw:Math.atan2(dy,dx),jump:false,crouch:false},1/120);
   ticks++;
   const now = motion.state;
   if (ticks%30===0) record.samples.push(now);
   if (Math.hypot(now.feet[0]-before[0],now.feet[1]-before[1])<1e-6) still++; else still=0;
   if (still>120) break;
  }
  if (!reached) {record.error='Movement stopped before waypoint';record.target=target;record.stopped=motion.state;failed=true;break;}
 }
 record.passed=!failed;
 record.seconds=ticks/120;
 record.finish=motion.state;
}
const result={sourceSha256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,player,stepSeconds:1/120,mechanics:'Unchanged WalkMotion over eroded land navigation with physical support/capsule samples. Single body; no multiplayer, weapon or continuous collision sweeps.',passed:results.every(r=>r.passed),results};
await writeFile(join(output,'report.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,routes:results.map(({id,passed,seconds,error,stopped})=>({id,passed,seconds,error,stopped:stopped?.feet})),report:join(output,'report.json')}));
if(!result.passed)process.exitCode=1;
