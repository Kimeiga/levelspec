/** Process boundary for the repository-local CLI. Progress never shares JSON stdout. */
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { runCommand, type CommandResult } from './pipeline.ts';
import type { ExportFormat } from '../export/vector/index.ts';
import { parseViewOptions, type ReviewViewOptions } from "../../review/view.ts";
import { parseNavigationCell } from "../../review/navigation-cell.ts";

const commands = ['init','validate','build','preview'];
const help = `Usage: levelspec <command> [options]
  init <directory> [--json]
  validate <file.level.svgx> [--json] [--strict-floor-gaps] [--surface-contacts error|warning|off]
  build <file.level.svgx> --out <directory> [--formats glb,gltf,fbx,bsp] [--json]
    --no-uv --strict-floor-gaps --surface-contacts error|warning|off
    --blender PATH --qbsp PATH --vis PATH --light PATH --quake-palette PATH
  preview <file.level.svgx> [--port NUMBER]
    --camera "X Y Z" --target "X Y Z" --projection orthographic|perspective
    --fov DEGREES --view-height METERS --roll DEGREES --suggestion ID | --diagnostic ID
    --appearance illustrated|materials|inspection --frame-aspect RATIO
  validate/build/preview: --nav-cell METERS (0.025–0.5; default 0.125)
  --help --version
Preview is read-only and loopback-only. Native exporters require separately installed tools.`;
/** Executes one invocation; the launcher owns the returned exit status. */
export async function main(args: string[]): Promise<number> {
  const command = args[0] ?? '';
  const wantsJson = args.includes('--json');
  if (args.includes('--help') || args.includes('-h')) {
    console.log(help);
    return 0;
  }
  if(args.length===1&&args[0]==='--version') {
    const pkg=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
    console.log(pkg.version);
    return 0;
  }
  let parsed: ReturnType<typeof parseArgs>;
  let view: ReviewViewOptions = {};
  let navigationCell: number | undefined;
  try {
    if (!commands.includes(command)) {
      throw new Error('Expected init, validate, build, or preview.');
    }
    const flags: Record<string, {type:'string'|'boolean'}> = {};
    if (command !== 'init') flags['nav-cell'] = { type: 'string' };
    if (command === 'preview') {
      for (const name of ["port", "camera", "target", "projection", "fov", "view-height", "roll", "appearance", "frame-aspect", "suggestion", "diagnostic"]) flags[name] = {type:"string"};
    }
    else flags.json = {type:'boolean'};
    if(command==='validate'||command==='build') {
      flags['strict-floor-gaps']={type:'boolean'};
      flags['surface-contacts']={type:'string'};
    }
    if(command==='build') {
      for (const name of ['formats','out','blender','qbsp','vis','light','quake-palette']) {
        flags[name] = {type:'string'};
      }
      flags['no-uv']={type:'boolean'};
    }
    parsed=parseArgs({args:args.slice(1),allowPositionals:true,options:flags});
    navigationCell = parseNavigationCell(parsed.values['nav-cell'] as string | undefined);
    if(parsed.positionals.length!==1)throw new Error('Expected exactly one project directory or XML source file.');
    if (parsed.values['surface-contacts'] !== undefined && !['error','warning','off'].includes(String(parsed.values['surface-contacts']))) throw new Error('surface-contacts must be error, warning, or off.');
    if (parsed.values.diagnostic && parsed.values.suggestion) throw new Error('diagnostic and suggestion are mutually exclusive.');
    if(command==='build'&&!parsed.values.out)throw new Error('build requires --out <directory>.');
    if (command === 'build') {
      const formats = String(parsed.values.formats ?? 'glb').split(',');
      if (formats.some(format => !['glb','gltf','fbx','bsp'].includes(format))) {
        throw new Error('Choose formats glb,gltf,fbx,bsp.');
      }
    }
    if (command === "preview") {
      const parameters = new URLSearchParams();
      for (const name of ["camera", "target", "projection", "fov", "view-height", "roll", "appearance", "frame-aspect"]) {
        if (parsed.values[name] !== undefined) parameters.set(name, String(parsed.values[name]));
      }
      view = parseViewOptions(parameters);
    }
    if(command==='preview'&&parsed.values.port!==undefined) {
      const port=Number(parsed.values.port);
      if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Port must be an integer from 1 to 65535.');
    }
  } catch(error) {
    const message=(error as Error).message;
    if(wantsJson)console.log(JSON.stringify({schemaVersion:1,command,success:false,diagnostics:[],repairs:[],suggestions:[],artifacts:[],error:{stage:'arguments',message}}));
    else console.error(`${message}\n${help}`);
    return 2;
  }
  const abort=new AbortController();
  const interrupt=()=>abort.abort(new DOMException('Cancelled','AbortError'));
  // Keep our handler registered while dependency exit hooks inspect signal ownership.
  process.on('SIGINT',interrupt);
  try {
    const values = parsed.values;
    if(command==='preview') {
      const {startPreview}=await import('./preview.ts');
      const server = await startPreview(parsed.positionals[0], {
        port: values.port === undefined ? undefined : Number(values.port),
        signal: abort.signal,
        view,
        navigationCell,
        suggestion: values.suggestion as string | undefined,
        diagnostic: values.diagnostic as string | undefined,
      });
      console.error(`Preview ready: ${server.url}`);
      try {
        if (!abort.signal.aborted) {
          await new Promise<void>(resolve => {
            abort.signal.addEventListener('abort', () => resolve(), {once:true});
          });
        }
      } finally {
        await server.close();
      }
      return 130;
    }
    const result: CommandResult=await runCommand(command,parsed.positionals[0],{
      signal: abort.signal,
      progress: message => console.error(message),
      out: values.out as string|undefined,
      formats: String(values.formats ?? 'glb').split(',') as ExportFormat[],
      noUV: Boolean(values['no-uv']),
      strictFloorGaps: Boolean(values['strict-floor-gaps']),
      navigationCell,
      surfaceContacts: values['surface-contacts'] === 'off' ? false : (values['surface-contacts'] ?? 'error') as 'error'|'warning',
      blender: values.blender as string|undefined,
      qbsp: values.qbsp as string|undefined,
      vis: values.vis as string|undefined,
      light: values.light as string|undefined,
      quakePalette: values['quake-palette'] as string|undefined,
    });
    if(values.json)console.log(JSON.stringify(result));
    else {
      console.log(`${command}: ${result.success?'passed':'failed'} ${result.source??result.project??''}`);
      for (const diagnostic of result.diagnostics) {
        const location = diagnostic.source ? ` (line ${diagnostic.source.line}, column ${diagnostic.source.column})` : '';
        console.error(`${diagnostic.severity} ${diagnostic.code}${location}: ${diagnostic.message}`);
      }
      for (const suggestion of result.suggestions.filter(s => s.state === "active")) console.error(`suggestion ${suggestion.code}: ${suggestion.message} (${suggestion.review.url})`);
      if(result.error)console.error(`${result.error.stage}: ${result.error.message}`);
      for(const path of result.artifacts)console.log(path);
    }
    if (abort.signal.aborted) return 130;
    return result.success ? 0 : 1;
  } catch(error) {
    console.error((error as Error).message);
    return abort.signal.aborted?130:1;
  } finally {
    process.removeListener('SIGINT',interrupt);
  }
}
