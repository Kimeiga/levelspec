/** Native radar proposals. Raster cells describe evidence, never legacy plan syntax. */
import {SceneBuilder} from '../vector/authoring.ts';
import {aborted,type V3} from '../vector/types.ts';
import {produceDocument,type ProducerOptions} from '../authoring/native-producer.ts';

export interface RasterTrace {
  format:'levelspec-raster/1';
  id:string;
  name:string;
  sourceImage:string;
  grid:number;
  colors:[number,number,number][];
  /** North-first rows; null is void and numbers index colors. */
  rows:(number|null)[][];
}

function metadata(t:RasterTrace) {
  return t.format==='levelspec-raster/1'&&[t.id,t.name,t.sourceImage].every(v=>typeof v==='string'&&v.length>0)&&
    Number.isFinite(t.grid)&&t.grid>=0.001;
}
function rgb(c:unknown) {
  return Array.isArray(c)&&c.length===3&&c.every(n=>Number.isFinite(n)&&n>=0&&n<=255);
}
function bandCell(c:unknown,bands:number) {
  return c===null||(typeof c==='number'&&Number.isInteger(c)&&c>=0&&c<bands);
}
function rowMatches(row:unknown,width:number,bands:number) {
  return Array.isArray(row)&&row.length===width&&row.every(c=>bandCell(c,bands));
}
function rectangular(rows:unknown,bands:number):boolean {
  if(!Array.isArray(rows)||!rows.length||rows.length>1024||!Array.isArray(rows[0]))return false;
  const width=rows[0].length;
  return width>0&&width<=1024&&rows.every(row=>rowMatches(row,width,bands))&&rows.some(row=>row.some((c:unknown)=>c!==null));
}
function checked(value:unknown):RasterTrace {
  const fail=():never=>{throw new Error('Invalid raster trace: expected levelspec-raster/1 metadata, positive grid, RGB colors and rectangular band rows containing floor.');};
  if(!value||typeof value!=='object')return fail();
  const t=value as RasterTrace;
  if(!metadata(t)||!Array.isArray(t.colors)||!t.colors.length||!t.colors.every(rgb)||!rectangular(t.rows,t.colors.length))return fail();
  return t;
}
export function parseRasterTrace(text:string):RasterTrace {return checked(JSON.parse(text));}

interface Tile {band:number;x:number;y:number;w:number;h:number}
/** Merge identical horizontal runs vertically. Voids stay absent, including enclosed courtyards. */
function tiles(t:RasterTrace):Tile[] {
  const result:Tile[]=[],width=t.rows[0].length;
  let active=new Map<string,Tile>();
  for(let y=0;y<t.rows.length;y++){
    const row=t.rows[t.rows.length-1-y],next=new Map<string,Tile>();
    for(let x=0;x<width;){
      const band=row[x],start=x++;
      while(x<width&&row[x]===band)x++;
      if(band===null)continue;
      const w=x-start,key=`${band}:${start}:${w}`,previous=active.get(key);
      const tile=previous??{band,x:start,y,w,h:0};tile.h++;next.set(key,tile);active.delete(key);
    }
    result.push(...active.values());active=next;
  }
  return [...result,...active.values()];
}

function boundary({x,y,w,h}:Tile,grid:number):V3[] {
  // Retain cell-boundary vertices so neighbouring tiles share exactly the same
  // edges, including partial runs and T junctions. No inferred links.
  const points:V3[]=[],point=(x:number,y:number)=>points.push([x*grid,y*grid,0]);
  for(let dx=0;dx<w;dx++)point(x+dx,y);
  for(let dy=0;dy<h;dy++)point(x+w,y+dy);
  for(let dx=w;dx>0;dx--)point(x+dx,y+h);
  for(let dy=h;dy>0;dy--)point(x,y+dy);
  return points;
}

/** Proposal only; use produceTrace to establish runtime readiness. */
export function traceToDocument(input:RasterTrace) {
  const t=checked(input),id=t.id.replace(/[^\w.:/-]/g,'_');
  const scene=new SceneBuilder(/^[A-Za-z_]/.test(id)?id:'id_'+id),d=scene.document;
  d.name=t.name;d.description=`Footprint traced from ${t.sourceImage}. Color bands are provisional areas; elevations and gameplay require authoring.`;
  d.wallHeight=5;d.wallThickness=0.32;d.floorThickness=0.2;
  // Preserve the tracer's historical capsule, rather than the smaller native default.
  d.player={...d.player,radius:0.35,height:1.8,step:0.45,crouch:1.1,vault:0};
  const group=scene.group('trace',{},'ground'),owners=new Map<string,number>(),floorTiles=tiles(t);
  for(const band of new Set(floorTiles.map(tile=>tile.band)))
    scene.material(`band_${band}`,{color:'#'+t.colors[band].map(n=>Math.round(n).toString(16).padStart(2,'0')).join('')});
  for(const [i,tile] of floorTiles.entries()){
    const band=tile.band,region=group.polygon(`floor_${i}`,boundary(tile,t.grid),{material:`band_${band}`,thickness:d.floorThickness});
    region.area=`area_${band}`;region.label=`Area ${band+1}`;region.role='lane';
    for(const ref of region.boundary){const edge=ref.replace(/^-/,'');owners.set(edge,(owners.get(edge)??0)+1);}
  }
  for(const edge of group.layer.edges)if(owners.get(edge.id)===1){edge.kind='wall';edge.height=d.wallHeight;}
  return d;
}

export async function produceTrace(trace:RasterTrace,options:ProducerOptions={}) {
  aborted(options.signal);return produceDocument(traceToDocument(trace),options);
}
