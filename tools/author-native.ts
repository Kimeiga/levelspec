import {readFileSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {argumentsFor,python,writeArtifact} from './producers/io.ts';
import {parsePythonDeclarations,pythonComposition,pythonLayers,composePythonDeclarations,type PythonDeclarations,type PythonLayer} from '../src/authoring/semantic-python.ts';
import {decodeSemanticSource} from '../src/authoring/semantic-sources.ts';
import {projectNativeFloor} from '../src/authoring/semantic-native-source.ts';
import {prepareNativeAnnotation,createNativeAnnotation} from '../src/authoring/semantic-native-annotation.ts';
import {produceSemantic,publishSemanticDocument,type NativeSemanticPlan} from '../src/authoring/semantic.ts';
import {parseGameplayPlan,produceGameplay} from '../src/gameplay/index.ts';
import type {LevelDocument} from '../src/vector/types.ts';
import {publishPythonCandidates} from '../src/authoring/semantic-python-publish.ts';

const {values,rest}=argumentsFor(process.argv.slice(2),['--spec','--traced','--out','--python']);
if(rest.length<1||rest.length>2||rest.some(n=>!/^\w[\w-]*$/.test(n)))throw new Error('usage: node tools/author.ts <spec-name> [traced-name] [--spec path] [--traced path] [--out path] [--python executable] [--legacy]');
const [name,traced=name]=rest,here=import.meta.dirname,spec=values.get('--spec')??join(here,`../authored/${name}.py`),tracedPath=values.get('--traced')??join(here,`../maps/cs/${traced}.plan`),out=values.get('--out')??join(here,`../generated/vector/authored/${name}.level.svgx`);
async function pythonPlan() {
  const declarations=parsePythonDeclarations(python(join(here,'producers/semantic.py'),[spec],values.get('--python')));
  const {sources,native}=await annotationSources(declarations);
  const plan=composePythonDeclarations(declarations,sources);
  prepareNativeAnnotation(plan,native,origins(declarations));
  diagnostics(plan.placementDiagnostics??[]);
  const optionalIds=(declarations.PORTALS??[]).map((p,i)=>p.id??`portal/${i}`);
  const made=await publishPythonCandidates(plan,optionalIds,candidate=>publishPython(candidate,native));
  diagnostics(made.placementDiagnostics,plan.placementDiagnostics);
  return made;
}
function origins(d:PythonDeclarations) {return new Map((d.LAYERS??[]).filter(l=>l.z!==undefined).map(l=>[l.id,l.z!]));}
function diagnostics(items:NonNullable<NativeSemanticPlan['placementDiagnostics']>,previous:NativeSemanticPlan['placementDiagnostics']=[]) {
  const seen=new Set(previous.map(d=>JSON.stringify(d)));
  for(const d of items)if(!seen.has(JSON.stringify(d)))console.error(`${d.code}: ${d.message} Omitted ${d.omitted}.`);
}
function publishPython(plan:NativeSemanticPlan,native:LevelDocument[]) {
  if(!native.length)return produceSemantic(plan);
  return publishSemanticDocument(createNativeAnnotation(plan,native));
}
async function annotationSources(declarations:PythonDeclarations) {
  const sources=new Map<string,NativeSemanticPlan>(),native:LevelDocument[]=[];
  if(pythonComposition(declarations))return {sources,native};
  for(const layer of pythonLayers(declarations)){const loaded=await sourceFor(declarations,layer);sources.set(layer.id,loaded.plan);if(loaded.native)native.push(loaded.native);}
  return {sources,native};
}
function nativeProjection(declarations:PythonDeclarations,layer:PythonLayer,document:LevelDocument) {
  if(declarations.GRID===undefined)throw new Error('SVGX seed annotation requires explicit GRID in the Python declaration. Alternatively pass levelspec-raster/1 evidence from trace_radar.py --format raster.');
  if(document.layers.length!==1||document.layers[0].id!==layer.id)throw new Error(`Native annotation layer ${layer.id} must match its SVGX layer ID.`);
  retainedSetting(declarations.WALL_THICKNESS,document.wallThickness,'WALL_THICKNESS');retainedSetting(declarations.FLOOR_THICKNESS,document.floorThickness,'FLOOR_THICKNESS');
  return {plan:projectNativeFloor(document,declarations.GRID),native:document};
}
function retainedSetting(value:number|undefined,source:number,name:string) {if(value!==undefined&&value!==source)throw new Error(`Native annotation retains source ${name}; edit the native source explicitly to change it.`);}
async function sourceFor(declarations:PythonDeclarations,layer:PythonLayer):Promise<{plan:NativeSemanticPlan;native?:LevelDocument}> {
  const path=layer.traced?join(dirname(tracedPath),extname(layer.traced)?layer.traced:layer.traced+extname(tracedPath)):tracedPath;
  const source=await decodeSemanticSource(readFileSync(path,'utf8'),extname(path));
  return source.kind==='native'?nativeProjection(declarations,layer,source.document):{plan:source.plan};
}
async function make() {
  if(extname(spec)==='.py')return pythonPlan();
  const text=readFileSync(spec,'utf8');
  if(isGameplay(text))return produceGameplay(parseGameplayPlan(text));
  const source=await decodeSemanticSource(text,extname(spec));return source.kind==='native'?publishSemanticDocument(source.document):produceSemantic(source.plan);
}
function isGameplay(text:string) {return extname(spec)==='.json'&&JSON.parse(text).format==='levelspec-gameplay/2';}
const result=await make();writeArtifact(out,result.text);console.log(`PASS ${name} -> ${out}`);
