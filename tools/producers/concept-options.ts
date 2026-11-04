import {conceptBudget} from '../../src/authoring/native-concept.ts';
function readOption(args:string[],i:number,values:Map<string,string>,flags:Set<string>) {
  const [name,...parts]=args[i].split('=');
  if(values.has(name)||flags.has(name))throw new Error(`Duplicate option ${name}.`);
  if(['--write','--plan','--why','--legacy'].includes(name)){if(parts.length)throw new Error(`${name} takes no value.`);flags.add(name);return i;}
  if(!['--attempts','--variants','--out','--spec'].includes(name))throw new Error(`Unknown concept option ${name}.`);
  const value=parts.length?parts.join('='):args[++i];if(!value||value.startsWith('--'))throw new Error(`Missing value for ${name}.`);values.set(name,value);return i;
}
/** Strict parsing shared by both commands; no unknown or duplicate flag is ignored. */
function parseArguments(args:string[]) {
  const values=new Map<string,string>(),flags=new Set<string>(),filters:string[]=[];
  for(let i=0;i<args.length;i++){
    if(args[i].startsWith('-')){i=readOption(args,i,values,flags);continue;}
    if(filters.includes(args[i]))throw new Error(`Duplicate concept filter ${args[i]}.`);filters.push(args[i]);
  }
  return {values,flags,filters};
}
export function conceptOptions(args:string[]) {
  const {values,flags,filters}=parseArguments(args);
  const {attempts,variants}=conceptBudget(values.has('--attempts')?Number(values.get('--attempts')):undefined,values.has('--variants')?Number(values.get('--variants')):undefined);
  if(values.has('--spec')&&(filters.length||flags.has('--legacy')))throw new Error('--spec conflicts with catalog filters and --legacy.');
  return {values,flags,filters,attempts,variants};
}
