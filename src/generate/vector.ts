/** Async v2 producers. Legacy synchronous APIs remain in ./index.ts. */
import { generateLevel, type GenerateOptions, type GenerateFailure, type GeneratedLevel, type Pickup, type AuthoredOptions } from "./index.ts";
import { ARCHETYPES } from "./archetypes.ts";
import { Rng } from "./rng.ts";
import { THEMES } from "./themes.ts";
import { producePlan, produceSpec, produceDocument, ProducerValidationError, type ProducerOptions, type ProducedLevel, type ProducedSource } from "../authoring/producers.ts";
import { parseLevelSvgx } from "../vector/format.ts";
import { aborted, type V3, type NavigationReport, type LevelDocument, type Marker } from "../vector/types.ts";
import { placementPool, roomyPoint, spreadPoints, identifiers, facing, distance, type Placement } from "./placement.ts";

export type GenerateV2Options = GenerateOptions & ProducerOptions;
export interface GeneratedLevelV2 extends ProducedLevel {
  legacy?: ProducedSource["legacy"];
  theme: (typeof THEMES)[number];
  archetype: string;
  seed: string;
  depth: number;
  spawn: V3;
  spawnFacing: number;
  exit: V3;
  pickups: Pickup[];
  enemyPosts: V3[];
  attempts: number;
  ms: number;
  disjointRoutes: number;
}
export type GenerateV2Result = ({ ok:true } & GeneratedLevelV2) | GenerateFailure;
export interface AuthoredV2Source { id: string; text: string; format?: "plan" | "spec" | "svgx" }

function positiveInteger(name:string,value:number) {
  if(!Number.isSafeInteger(value)||value<1)throw new RangeError(`${name} must be a positive integer.`);
}
function theme(id: string | undefined, rng: Rng) {
  if(!id)return rng.pick(THEMES);
  const selected=THEMES.find(t=>t.id===id);
  if(!selected)throw new Error(`Unknown theme ${id}.`);
  return selected;
}
function posts(points: Placement[], spawn: V3) {
  const candidates=points.filter(p=>distance(p.position,spawn)>10),stride=Math.max(1,Math.ceil(candidates.length/96));
  return candidates.filter((_,i)=>i%stride===0);
}
function isLand(marker:Marker) {return (marker.movement??'land')==='land';}
function runEnemyPosts(d:LevelDocument,ids:string[]) {
  const allocated=new Set(ids);
  return d.markers.filter(m=>allocated.has(m.id)).map(m=>m.position);
}

function addPosts(d:LevelDocument,points:Placement[],spawn:V3) {
  const id=identifiers(d),markers=posts(points,spawn).map(p=>({id:id('run.enemy'),kind:'enemy_post',layer:p.layer,region:p.area,position:p.position}));
  d.markers.push(...markers);
  return markers.map(m=>m.id);
}

async function publishCandidate(candidate:GeneratedLevel,options:ProducerOptions) {
  const made=await produceSpec(candidate.spec,options);
  const spawn=made.document.markers.find(m=>m.kind==='attacker_spawn')!,exit=made.document.markers.find(m=>m.kind==='objective')!;
  const pool=await placementPool(made.level,options,spawn.position),d=structuredClone(made.document);
  const enemyIds=addPosts(d,pool.points,spawn.position);
  const published=await produceDocument(d,options);
  const pickups=candidate.pickups.map(p=>{
    const index=made.legacy.level.markers.findIndex(m=>m.id===p.id),marker=published.document.markers[index];
    return {...p,id:marker.id,at:marker.position};
  });
  return {...published,legacy:made.legacy,theme:candidate.theme,archetype:candidate.archetype,spawn:spawn.position,
    spawnFacing:facing(published.level,spawn.position,pool.points),exit:exit.position,pickups,
    enemyPosts:runEnemyPosts(published.document,enemyIds),
    disjointRoutes:Math.min(...published.report.navigation!.routes.map(r=>r.disjointRoutes))};
}

function generationSettings(options:GenerateV2Options) {
  const attempts=options.attempts??14,depth=options.depth??1,minRoutes=options.minRoutes??2;
  positiveInteger('attempts',attempts);positiveInteger('depth',depth);positiveInteger('minRoutes',minRoutes);
  if(options.archetype&&!ARCHETYPES.some(a=>a.id===options.archetype))throw new Error(`Unknown archetype ${options.archetype}.`);
  if(options.theme)theme(options.theme,new Rng(0));
  return {attempts,depth,seed:String(options.seed??Date.now())};
}

export async function generateLevelV2(options: GenerateV2Options = {}): Promise<GenerateV2Result> {
  const start=performance.now(),{attempts,depth,seed}=generationSettings(options),reasons:string[]=[];
  for(let attempt=1;attempt<=attempts;attempt++) {
    aborted(options.signal);
    const candidate=generateLevel({...options,seed:`${seed}:v2:${attempt}`,attempts:1});
    if(!candidate.ok){reasons.push(...candidate.reasons);continue;}
    try {
      return {ok:true,...await publishCandidate(candidate,options),seed,depth,attempts:attempt,ms:performance.now()-start};
    } catch(error) {
      if(!(error instanceof ProducerValidationError))throw error;
      reasons.push(`${candidate.archetype}: ${error.stage}: ${error.diagnostics.filter(d=>d.severity==="error").map(d=>d.code).slice(0,4).join(",")}`);
    }
  }
  return {ok:false,attempts,reasons};
}

async function readSource(source:AuthoredV2Source,options:ProducerOptions):Promise<ProducedLevel & {legacy?:ProducedSource['legacy']}> {
  const trimmed=source.text.trimStart(),format=source.format??(trimmed.startsWith('<')?'svgx':trimmed.startsWith('{')?'spec':'plan');
  if(format==='svgx')return produceDocument(parseLevelSvgx(source.text),options);
  if(format==='spec')return produceSpec(JSON.parse(source.text),options);
  return producePlan(source.text,options);
}

function placedMarker(d:LevelDocument,id:string,kind:string,p:Placement):Marker {
  const marker={id,kind,position:p.position,layer:p.layer,region:p.area};d.markers.push(marker);return marker;
}

async function runEndpoints(made:ProducedLevel,d:LevelDocument,rng:Rng,options:ProducerOptions) {
  const landMarkers=d.markers.filter(isLand);
  const id=identifiers(d),declared=landMarkers.find(m=>m.kind==='attacker_spawn');
  let pool=await placementPool(made.level,options,declared?.position);
  const spawn=declared??placedMarker(d,id('run.spawn'),'attacker_spawn',roomyPoint(pool.points,rng));
  if(!declared)pool=await placementPool(made.level,options,spawn.position);
  const declaredExit=landMarkers.find(m=>m.kind==='objective'||m.kind==='site');
  if(!pool.farthest)throw new Error('No supported exit navigation.');
  const exit=declaredExit??placedMarker(d,id('run.exit'),'objective',pool.farthest);
  return {spawn,exit,pool};
}

function placePickups(d:LevelDocument,points:Placement[],spawn:V3,rng:Rng,kinds:Pickup['kind'][]):Pickup[] {
  const id=identifiers(d),placed=spreadPoints(points,kinds.length,spawn,rng,d.player.radius);
  return kinds.map((kind,i)=>{
    const marker=placedMarker(d,id('run.pickup'),'poi',placed[i]);marker.label=kind;
    return {id:marker.id,kind,at:marker.position};
  });
}

function pickupKinds(rng:Rng,depth:number,area:number): Pickup["kind"][] {
  const out:Pickup["kind"][]=[];
  for(let i=0;i<2+Math.min(4,Math.floor(depth/2));i++)out.push("health");
  for(let i=0;i<3+Math.floor(depth/3);i++)out.push("ammo");
  if(depth>=2)out.push("armor");
  for(let i=0;i<Math.min(5,2+Math.floor(area/1562.5)+(depth>=4?1:0));i++)out.push("weapon");
  return rng.shuffle(out);
}

function navigationArea(nav: NavigationReport): number {
  let area=0;
  for(let i=0;i<nav.indices.length;i+=3) {
    const p=nav.indices.slice(i,i+3).map(j=>nav.positions.slice(j*3,j*3+3));
    area+=Math.abs((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[2][0]-p[0][0])*(p[1][1]-p[0][1]))/2;
  }
  return area;
}

export async function loadAuthoredV2(source: AuthoredV2Source, options: AuthoredOptions & ProducerOptions = {}): Promise<GeneratedLevelV2> {
  const start=performance.now(),depth=options.depth??1;positiveInteger("depth",depth);
  const rng=new Rng(options.seed??`${source.id}:${depth}`),selectedTheme=theme(options.theme,rng);
  const made=await readSource(source,options),d=structuredClone(made.document);
  const {spawn,exit,pool}=await runEndpoints(made,d,rng,options);
  const kinds=pickupKinds(rng,depth,navigationArea(made.report.navigation!));
  const pickups=placePickups(d,pool.points,spawn.position,rng,kinds);
  const enemyIds=addPosts(d,pool.points,spawn.position);
  const route=identifiers(d)('run.route');d.routes.push({id:route,from:spawn.id,to:exit.id,minRoutes:1});
  const published=await produceDocument(d,options),actual=published.report.navigation!.routes.find(r=>r.id===route)!;
  const marker=(id:string)=>published.document.markers.find(m=>m.id===id)!;
  return {...published,legacy:made.legacy,theme:selectedTheme,archetype:"authored",seed:source.id,depth,spawn:marker(spawn.id).position,
    spawnFacing:facing(published.level,spawn.position,pool.points),exit:marker(exit.id).position,pickups:pickups.map(p=>({...p,at:marker(p.id).position})),
    enemyPosts:runEnemyPosts(published.document,enemyIds),attempts:1,ms:performance.now()-start,disjointRoutes:actual.disjointRoutes};
}
