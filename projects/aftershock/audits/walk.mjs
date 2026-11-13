/** Exercise authored routes using the unchanged reviewer capsule and bounded collision samples. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {compile, parseAml} from '../../../src/architecture/index.ts';
import {WalkMotion} from '../../../review/walk-motion.ts';
import {physicalWalk} from '../../../review/physical-walk.ts';
const output = resolve(process.argv[2] ?? 'generated/aftershock/walk-r1');
await mkdir(output, {recursive: false});
const source = await readFile(new URL('../level.aml', import.meta.url), 'utf8');
const level = await compile(parseAml(source), {navigation: {cell: .125}});
if (level.diagnostics.some(d => d.severity === 'error')) throw new Error('Geometry errors');
const player = level.navigation.settings.player;
const physical = physicalWalk(level);
const routes = JSON.parse(await readFile(new URL('./routes.json', import.meta.url), 'utf8'));
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
