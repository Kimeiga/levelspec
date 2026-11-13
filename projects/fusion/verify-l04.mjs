/** Read-only, revision-matched movement and optical inspection for Fusion. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serialize } from 'node:v8';
import { compile, parseAml } from '../../src/architecture/index.ts';
import { prepareInspectionWalk } from '../../review/walk.ts';

const output = process.argv[2] ?? 'generated/fusion/checks';
await mkdir(output, {recursive:true});
const bytes = await readFile(new URL('./level.aml', import.meta.url));
const inspectionCodeHashes = Object.fromEntries(await Promise.all([
  'projects/fusion/verify-l04.mjs', 'review/walk.ts', 'review/physical-walk.ts',
  'review/navigation-surface.ts', 'review/walk-motion.ts',
].map(async path => [path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const level = await compile(parseAml(bytes.toString()), {uvs:false, navigation:{cell:.125}});
const identity = {sourceSha256:createHash('sha256').update(bytes).digest('hex'), inspectionCodeHashes, physicalHash:level.physicalHash, renderHash:level.renderHash, player:level.document.player, navigationCell:.125};
await writeFile(output+'/compiled.v8',serialize(level));
const selected = process.argv[3]?.split(',');

/** Follow each requested XY displacement through the existing physical walker without teleporting. */
function replay(id, points) {
  const prepared = prepareInspectionWalk(level, {feet:points[0],yaw:0,pitch:0});
  if (!prepared.ok) return {id,ok:false,error:prepared.message};
  let feet = prepared.pose.feet, requests = 0, distance = 0;
  const trace = [[...feet]];
  for (const target of points.slice(1)) {
    const start = [...feet];
    const steps = Math.max(1, Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.04));
    for (let n=1;n<=steps;n++) {
      const x=start[0]+(target[0]-start[0])*n/steps, y=start[1]+(target[1]-start[1])*n/steps;
      const next=prepared.surface.move(feet,x-feet[0],y-feet[1]);
      distance+=Math.hypot(...next.map((v,i)=>v-feet[i]));feet=next;requests++;
      if (requests%10===0) trace.push([...feet]);
      if (Math.hypot(feet[0]-x,feet[1]-y)>.12) return {id,ok:false,distance,requests,trace,failure:{target,request:[x,y],feet}};
    }
  }
  trace.push([...feet]);
  const endError = Math.hypot(...feet.map((v,i)=>v-points.at(-1)[i]));
  return {id,ok:endError<.18,distance,requests,endError,trace,estimatedSecondsAt5MetersPerSecond:distance/5};
}
const walks=[];
for (const route of level.navigation?.routes??[]) {
  if(selected && !selected.includes(route.id))continue;
  console.error('Replaying',route.id);
  if (!route.reachable || !route.path?.length) {walks.push({id:route.id,ok:false,error:'No reachable declared route'});continue;}
  walks.push(replay(route.id,route.path));
  walks.push(replay(route.id+'-reverse',route.path.toReversed()));
}
const placements = level.document.markers.map(marker => {
  const result = prepareInspectionWalk(level, {feet:marker.position,yaw:0,pitch:0});
  return {id:marker.id,kind:marker.kind,requested:marker.position,ok:result.ok,
    feet:result.ok?result.pose.feet:undefined,error:result.ok?undefined:result.message};
});
const polar = (r,angle,z) => [r*Math.cos(angle*Math.PI/180),4+r*Math.sin(angle*Math.PI/180),z];
const lowerBypass = Array.from({length:66},(_,i)=>polar(6.8,214+130*i/65,-3.2));
const priorBypass = Array.from({length:66},(_,i)=>polar(6.7,214+130*i/65,-3.2));
const supplemental = [replay('lower-outer-bypass-r6.8',lowerBypass),replay('lower-outer-bypass-r6.8-reverse',lowerBypass.toReversed()),replay('prior-bypass-r6.7',priorBypass),replay('prior-bypass-r6.7-reverse',priorBypass.toReversed())];
await writeFile(output+'/walk-report.json',JSON.stringify({...identity,
  scope:'Declared navigation paths and explicit lower bypass replayed through the existing inspection walker with .04m requests; not continuous collision sweeps or multiplayer movement.',
  selectedRoutes:selected??'all',navigation:level.navigation,walks,supplemental,placements},null,2));
await writeFile(output+'/diagnostics.json',JSON.stringify({identity,diagnostics:level.diagnostics},null,2));
const failed = [...walks,...supplemental].filter(w=>!w.ok).map(({trace,...w})=>w);
console.log(JSON.stringify({output,passed:walks.filter(w=>w.ok).length,total:walks.length,
  supplemental:supplemental.map(({trace,...w})=>w),failures:failed,
  placementFailures:placements.filter(p=>!p.ok),errors:level.diagnostics.filter(d=>d.severity==='error')},null,2));
if(failed.length||placements.some(p=>!p.ok)||level.diagnostics.some(d=>d.severity==='error'))process.exitCode=1;
