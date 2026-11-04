import type {NativeSemanticPlan,Cell} from './semantic-types.ts';

/** Quoted strings, escaped quotes, and comments are parsed without invoking the old plan parser. */
function directiveTokens(line:string):string[] {
  const tokens:string[]=[],pattern=/\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s"']+))/gy;
  while(pattern.lastIndex<line.trimEnd().length){
    const match=pattern.exec(line);if(!match)throw new Error('Unterminated quote in semantic directive.');
    const word=match[1]??match[2]??match[3];if(match[3]?.startsWith('//'))break;tokens.push(word.replace(/\\(.)/g,'$1'));
  }
  return tokens;
}
function count(args:string[],min:number,max:number,cmd:string) {if(args.length<min||args.length>max)throw new Error(`${cmd}: expected ${min}..${max} arguments.`);}
function cell(text:string):Cell {if(!/^-?\d+,-?\d+$/.test(text))throw new Error(`Expected grid cell x,y, got ${text}.`);return text.split(',').map(Number) as Cell;}
function numeric(text:string,label:string) {const n=Number(text);if(!Number.isFinite(n))throw new Error(`Invalid ${label}: ${text}.`);return n;}
function marker(plan:NativeSemanticPlan,name:string) {
  const m=plan.markers?.find(m=>m.id===name)??plan.markers?.find(m=>m.area===name);
  if(!m)throw new Error(`Requirement needs a marker at '${name}'; add a mark directive.`);return m.id;
}
function route(plan:NativeSemanticPlan,args:string[]) {
  count(args,2,6,'route');const [from,to,...values]=args;
  const r={id:`route_${from}_${to}`,from:marker(plan,from),to:marker(plan,to),minRoutes:2} as NonNullable<NativeSemanticPlan['routes']>[number];
  if(values.length&&!values[0].includes('='))r.minRoutes=numeric(values.shift()!,'minRoutes');
  for(const option of values)routeOption(r,option);
  (plan.routes??=[]).push(r);
}
function routeOption(r:NonNullable<NativeSemanticPlan['routes']>[number],option:string) {
  const [key,value]=option.split('=');
  if(key==='minDistance'||key==='min_distance')r.minDistance=numeric(value,key);
  else if(key==='maxDistance'||key==='max_distance')r.maxDistance=numeric(value,key);
  else if(key==='movement'){if(value!=='land'&&value!=='water')throw new Error(`Unsupported movement ${value}.`);r.movement=value;}
  else throw new Error(`Unknown route option ${option}.`);
}
function portal(plan:NativeSemanticPlan,kind:'door'|'arch'|'window',args:string[]) {
  count(args,2,6,kind);const [a,b,width,...options]=args,id=`${kind}_${a}_${b}_${plan.portals?.length??0}`;
  const p:NonNullable<NativeSemanticPlan['portals']>[number]={id,between:[a,b],kind,width:width==='full'?'full':numeric(width??'2','portal width')*plan.grid};
  for(const option of options)portalOption(p,option,plan.grid);
  (plan.portals??=[]).push(p);
}
function portalOption(p:NonNullable<NativeSemanticPlan['portals']>[number],option:string,grid:number) {
  const [k,v]=option.split('=');if(k==='at')p.at=cell(v).map(n=>(n+.5)*grid) as Cell;else if(k==='head'||k==='sill')p[k]=numeric(v,k);else throw new Error(`Unknown portal option ${option}.`);
}
function flight(plan:NativeSemanticPlan,cmd:'stairs'|'ramp',args:string[],index:number) {
  count(args,5,6,cmd);if(args[2]!=='->')throw new Error(`${cmd}: expected ->.`);
  (plan.flights??=[]).push({id:`${cmd}_${index}`,kind:cmd,from:{layer:args[0],cell:cell(args[1])},to:{layer:args[3],cell:cell(args[4])},width:args[5]?Math.max(1,Math.round(numeric(args[5],'flight width')/plan.grid))*plan.grid:2*plan.grid});
}
function apply(plan:NativeSemanticPlan,cmd:string,args:string[],index:number) {
  if(['door','arch','window'].includes(cmd))return portal(plan,cmd as 'door'|'arch'|'window',args);
  if(cmd==='stairs'||cmd==='ramp')return flight(plan,cmd,args,index);
  const handlers:Record<string,()=>void>={
    mark:()=>{count(args,2,4,cmd);const [kind,area,team,label]=args;(plan.markers??=[]).push({id:`mark_${kind}_${area}`,area,kind,team,label});},
    route:()=>route(plan,args),
    no_spawn_los:()=>{count(args,2,2,cmd);(plan.noSpawnLos??=[]).push([marker(plan,args[0]),marker(plan,args[1])]);},
    wall:()=>boundary(plan,'wall',args),open:()=>boundary(plan,'open',args),
  };
  if(!Object.hasOwn(handlers,cmd))throw new Error(`Unknown or unsupported semantic directive '${cmd}'.`);handlers[cmd]();
}
function boundary(plan:NativeSemanticPlan,kind:'wall'|'open',args:string[]) {
  count(args,2,2,kind);(plan.boundaries??=[]).push({between:[args[0],args[1]],kind});
}
export function applySemanticDirectives(plan:NativeSemanticPlan,lines:string[]) {
  for(const [index,line] of lines.entries()){
    if(typeof line!=='string')throw new Error('DIRECTIVES entries must be strings.');const [cmd,...args]=directiveTokens(line);if(!cmd)continue;
    try{apply(plan,cmd,args,index+1);}catch(error){throw new Error(`Directive ${index+1}: ${(error as Error).message}`);}
  }
}
