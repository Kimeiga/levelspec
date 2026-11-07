import {parseLevelSvgx} from '../vector/format.ts';
import {parseRasterTrace,type RasterTrace} from '../tracing/native.ts';
import {checkSemantic} from './semantic-check.ts';
import type {NativeSemanticPlan,SemanticArea} from './semantic-types.ts';
import type {LevelDocument} from '../vector/types.ts';

export type SemanticSource={kind:'semantic';plan:NativeSemanticPlan;provisional:boolean}|{kind:'native';document:LevelDocument;provisional:false};
function rasterSemantic(t:RasterTrace):NativeSemanticPlan {
  const areas=new Map<number,SemanticArea>();
  for(let row=0;row<t.rows.length;row++)for(let x=0;x<t.rows[row].length;x++){
    const band=t.rows[row][x];if(band===null)continue;
    if(!areas.has(band))areas.set(band,{id:`area_${band}`,label:`Area ${band+1}`,role:'lane',cells:[]});areas.get(band)!.cells!.push([x,t.rows.length-1-row]);
  }
  return {format:'levelspec-semantic/2',id:t.id,name:t.name,description:`Footprint traced from ${t.sourceImage}. Color bands are provisional areas.`,grid:t.grid,wallThickness:.32,floorThickness:.25,layers:[{id:'ground',height:5}],areas:[...areas.values()]};
}
/** Decodes native XML or typed semantic/raster source data. */
export async function decodeSemanticSource(text:string,extension:string):Promise<SemanticSource> {
  if(extension==='.svgx')return {kind:'native',document:parseLevelSvgx(text),provisional:false};
  if(extension!=='.json')throw new Error(`Unsupported semantic source ${extension}; expected .svgx or typed JSON.`);
  const value:unknown=JSON.parse(text),format=(value as {format?:string})?.format;
  if(format==='levelspec-raster/1')return {kind:'semantic',plan:rasterSemantic(parseRasterTrace(text)),provisional:true};
  checkSemantic(value);return {kind:'semantic',plan:value,provisional:false};
}
