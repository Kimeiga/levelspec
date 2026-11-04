/** Procedural layouts expressed directly as native floor polygons and flights. */
import {NativeBuilder,type NativeRoom} from './native-builder.ts';
import {Rng,seedWord} from './rng.ts';
import {THEMES,type Theme} from './themes.ts';

interface Context {b:NativeBuilder;rng:Rng}
type Ends=[NativeRoom,NativeRoom];
interface NativeArchetype {id:string;name:string;build:(context:Context)=>Ends}

function threeLane({b,rng}:Context):Ends {
  const w=rng.int(9,12),gap=rng.int(5,7),run=rng.int(30,38),W=3*w+2*gap;
  const start=b.room('muster',0,0,W,10),end=b.room('terminus',0,10+run,W,10);
  const lanes:NativeRoom[]=[];
  for(let i=0;i<3;i++) {
    const x=i*(w+gap),z=i===1?1.2:0;
    b.surface(`lane${i}.entry`,[[x,10,0],[x+w,10,0],[x+w,18,z],[x,18,z]],z?'ramp':'floor');
    const lane=b.room(`lane${i}`,x,18,w,run-16,z);lanes.push(lane);
    b.surface(`lane${i}.exit`,[[x,run+2,z],[x+w,run+2,z],[x+w,run+10,0],[x,run+10,0]],z?'ramp':'floor');
  }
  b.join('cross.west',lanes[0],lanes[1],4);b.join('cross.east',lanes[1],lanes[2],4);
  return [start,end];
}
function ring({b,rng}:Context):Ends {
  const w=12,gap=rng.int(12,18),pitch=w+gap;
  const rooms=[[0,0],[pitch,0],[pitch,pitch],[0,pitch]].map(([x,y],i)=>b.room(`court${i}`,x,y,w,w));
  for(let i=0;i<4;i++)b.join(`arc${i}`,rooms[i],rooms[(i+1)%4],5);
  return [rooms[0],rooms[2]];
}
function stacked({b,rng}:Context):Ends {
  const w=rng.int(12,16),pitch=w+16,H=4.4;
  const low=[0,1].map(i=>b.room(`lower${i}`,i*pitch,0,w,12,0,H-0.22));
  const high=[0,1].map(i=>b.room(`upper${i}`,i*pitch,0,w,12,H));
  b.join('lower.hall',low[0],low[1],5);b.join('upper.hall',high[0],high[1],5);
  for(let i=0;i<2;i++)b.switchback(`stairs${i}`,low[i],high[i]);
  return [low[0],high[1]];
}
function compound({b,rng}:Context):Ends {
  const w=12,pitch=w+rng.int(8,12),rooms:NativeRoom[][]=[];
  for(let y=0;y<3;y++)rooms.push([0,1,2].map(x=>b.room(`block${x}.${y}`,x*pitch,y*pitch,w,w,x===1&&y===1?1.2:0)));
  for(let y=0;y<3;y++)for(let x=0;x<3;x++) {
    if(x<2)b.join(`east${x}.${y}`,rooms[y][x],rooms[y][x+1],5);
    if(y<2)b.join(`north${x}.${y}`,rooms[y][x],rooms[y+1][x],5);
  }
  return [rooms[0][0],rooms[1][1]];
}
function bridges({b,rng}:Context):Ends {
  const gap=rng.int(22,28),X=12+gap,H=4;
  const west=b.room('west.bank',0,0,12,36,H,1.15),east=b.room('east.bank',X,0,12,36,H,1.15);
  for(const [i,y] of [6,28].entries())b.surface(`span${i}`,[[12,y-2,H],[X,y-2,H],[X,y+2,H],[12,y+2,H]],'floor',1.15);
  b.room('gorge',12,0,gap,60,0,1.15);
  const bottomW=b.room('west.landing',2,52,8,8,0,1.15),bottomE=b.room('east.landing',X+2,52,8,8,0,1.15);
  b.join('west.descent',west,bottomW,4);b.join('east.descent',east,bottomE,4);
  // Landings meet the gorge at its north end, independently of both high spans.
  const cy=56;
  b.surface('west.low',[[10,cy-2,0],[12,cy-2,0],[12,cy+2,0],[10,cy+2,0]],'floor',1.15);
  b.surface('east.low',[[X,cy-2,0],[X+2,cy-2,0],[X+2,cy+2,0],[X,cy+2,0]],'floor',1.15);
  return [west,east];
}
function skyIslands({b,rng}:Context):Ends {
  const cols=rng.int(3,4),pitch=rng.int(20,24),rooms:NativeRoom[][]=[];
  for(let y=0;y<2;y++)rooms.push(Array.from({length:cols},(_,x)=>b.room(`island${x}.${y}`,x*pitch,y*pitch,12,12,6+rng.pick([0,0.8]),1.15)));
  for(let y=0;y<2;y++)for(let x=0;x<cols-1;x++)b.join(`walk${x}.${y}`,rooms[y][x],rooms[y][x+1],4);
  b.join('west.walk',rooms[0][0],rooms[1][0],4);b.join('east.walk',rooms[0][cols-1],rooms[1][cols-1],4);
  return [rooms[0][0],rooms[1][cols-1]];
}
function fightyard({b,rng}:Context):Ends {
  const W=rng.int(38,44),cx=W/2;
  const south=b.room('south.deck',0,0,W,10,2,1.15),north=b.room('north.deck',0,26,W,10,2,1.15);
  const west=b.room('west.deck',0,10,cx-8,16,2,1.15),east=b.room('east.deck',cx+8,10,cx-8,16,2,1.15);
  const pit=b.room('pit',cx-4,10,8,16,0,1.15);
  b.join('pit.west',west,pit,6);b.join('pit.east',pit,east,6);
  return [south,north];
}

export const NATIVE_ARCHETYPES:readonly NativeArchetype[]=[
  {id:'three_lane',name:'Three Lanes',build:threeLane},{id:'ring',name:'Ring',build:ring},
  {id:'stacked',name:'Stacked',build:stacked},{id:'compound',name:'Compound',build:compound},
  {id:'bridges',name:'Bridges',build:bridges},{id:'sky_islands',name:'Sky Islands',build:skyIslands},
  {id:'fightyard',name:'Fightyard',build:fightyard},
];
function choose(rng:Rng,depth:number) {
  if(depth<=1)return rng.pick([NATIVE_ARCHETYPES[0],NATIVE_ARCHETYPES[6]]);
  return rng.weighted(NATIVE_ARCHETYPES.map((a,i)=>[a,[3,3,depth>=3?2:0,depth>=3?3:0,2,depth>=4?2:0,2][i]] as const));
}
export function proposeNative(seed:string,depth:number,minRoutes:number,archetype?:string,themeId?:string) {
  const rng=new Rng(seed),theme=themeId?THEMES.find(t=>t.id===themeId)!:rng.pick(THEMES);
  const arch=archetype?NATIVE_ARCHETYPES.find(a=>a.id===archetype)!:choose(rng,depth);
  const id=`gen_v2_${arch.id}_${seedWord(rng)}`;
  const scale=Math.min(1.55,0.95+depth*0.055+rng.float(-0.06,0.1));
  const b=new NativeBuilder(id,arch.name,theme,rng,scale);
  const [spawn,exit]=arch.build({b,rng});
  return {document:b.finish(spawn,exit,minRoutes,theme,rng),theme,archetype:arch.id,rng};
}
