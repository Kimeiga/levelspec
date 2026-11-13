import { localHeightmaps } from "./heightmaps.ts";
import { localMaterialImages } from "./material-images.ts";
import { decodeMaterialPng } from "../materials/node-images.ts";
/** Node-side file loading and output orchestration; domain APIs remain filesystem-free. */
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, parseAml, validateForRuntime, createGLBAssetResolver, resolveExportAssets, toRuntime, toOBJ, toSVGPlan, atlasSVG, exportName, type CompiledLevel, type ValidationReport, type Diagnostic, type RepairRecord, type Suggestion } from '../architecture/index.ts';
import { objMaterialError } from '../vector/export.ts';
import { exportLevel, type ExportFormat, type ExportFiles } from '../export/vector/index.ts';
import { migrateProject } from './migrate.ts';

export interface CommandResult {
  schemaVersion: 1;
  command: string;
  success: boolean;
  source?: string;
  project?: string;
  diagnostics: (Diagnostic & { review?: NonNullable<Diagnostic["review"]> & { url?: string; arguments?: string[] } })[];
  repairs: RepairRecord[];
  suggestions: (Suggestion & { review: { url: string; arguments: string[] } })[];
  stats?: CompiledLevel['stats'];
  report?: ValidationReport;
  artifacts: string[];
  error?: { stage: string; message: string };
}
export interface RunOptions {
  signal: AbortSignal;
  progress: (message: string) => void;
  out?: string;
  formats?: ExportFormat[];
  noUV?: boolean;
  strictFloorGaps?: boolean;
  /** Horizontal navigation grid size in meters; omitted uses the compiler default. */
  navigationCell?: number;
  surfaceContacts?: false | "warning" | "error";
  blender?: string;
  qbsp?: string;
  vis?: string;
  light?: string;
  quakePalette?: string;
}
/** Runs one finite command, retaining diagnostic context when later stages fail. */
export async function runCommand(command: string, input: string, options: RunOptions): Promise<CommandResult> {
  const result: CommandResult = {schemaVersion:1, command, success:false, diagnostics:[], repairs:[], suggestions:[], artifacts:[]};
  let stage = 'load';
  try {
    options.signal.throwIfAborted();
    if (command === 'migrate') {
      stage = 'migrate';
      result.source = resolve(input); result.project = resolve(options.out!);
      const migrated = await migrateProject(input, options.out!, { signal: options.signal });
      result.artifacts = migrated.artifacts; result.success = true; return result;
    }
    if (command === 'init') {
      stage = 'initialize';
      const project = resolve(input);
      result.project = project;
      await mkdir(dirname(project), { recursive:true });
      await mkdir(project);
      try {
        const template = await readFile(fileURLToPath(new URL('./templates/starter.aml', import.meta.url)), 'utf8');
        for (const directory of ['references', 'schematics', 'reviews']) await mkdir(join(project,directory));
        await writeFile(join(project,'level.aml'),template);
        await writeFile(join(project,'BRIEF.md'),'# Architectural project\n\nXML is the editable source. Record references, estimated dimensions and circulation requirements here.\n\nFrom the LevelSpec checkout run:\n\n- npm run levelspec -- validate "'+join(project,'level.aml')+'"\n- npm run levelspec -- preview "'+join(project,'level.aml')+'"\n- npm run levelspec -- build "'+join(project,'level.aml')+'" --out generated/my-project\n\nInspect plans, sections, diagnostics and routes; correct XML, export, and retain review evidence. Gameplay navigation is not building-code certification.\n');
        options.signal.throwIfAborted();
      } catch (error) {
        await rm(project, {recursive:true,force:true});
        throw error;
      }
      result.artifacts = ['level.aml','BRIEF.md','references','schematics','reviews'].map(name=>join(project,name));
      result.success = true;
      return result;
    }
    const source = resolve(input);
    result.source = source;
    const text = await readFile(source,{encoding:'utf8',signal:options.signal});
    stage = 'parse';
    const document = parseAml(text);
    stage = 'compile';
    const resolveAsset = createGLBAssetResolver(async(reference, signal)=> {
      signal?.throwIfAborted();
      if (/^[a-z]+:/i.test(reference)) throw new Error('GLB assets must be local files, not URLs.');
      return readFile(resolve(dirname(source),reference), {signal});
    });
    const heightmaps = localHeightmaps(source);
    const materialImages = localMaterialImages(source);
    const formats = options.formats ?? ['glb'];
    const level = await compile(document, {
      signal: options.signal,
      resolveAsset,
      resolveHeightmap: heightmaps.load,
      resolveMaterialImage: materialImages.load,
      decodeMaterialPng,
      uvs: command === 'build' && !options.noUV,
      retainExportSolids: command === 'build' && formats.includes('bsp'),
      floorGaps: options.strictFloorGaps ? 'error' : 'warning',
      surfaceContacts: options.surfaceContacts ?? 'error',
      navigation: { cell: options.navigationCell },
      onProgress: options.progress,
    });
    result.suggestions = level.suggestions.map(suggestion => {
      const parameters = new URLSearchParams({ suggestion: suggestion.id });
      const arguments_ = ["preview", source, "--suggestion", suggestion.id];
      if (options.navigationCell !== undefined) {
        parameters.set("nav-cell", String(options.navigationCell));
        arguments_.push("--nav-cell", String(options.navigationCell));
      }
      return { ...suggestion, review: { url: `?${parameters}`, arguments: arguments_ } };
    });
    result.stats = level.stats;
    result.repairs = level.repairs ?? [];
    result.diagnostics = level.diagnostics;
    stage = 'validate';
    const report = await validateForRuntime(level,{sealed:true,signal:options.signal,cell:options.navigationCell});
    result.report = report;
    result.diagnostics = report.diagnostics.map(diagnostic => {
      if (!diagnostic.review) return diagnostic;
      const parameters = new URLSearchParams({ diagnostic: diagnostic.review.id });
      const arguments_ = ["preview", source, "--diagnostic", diagnostic.review.id];
      if (options.navigationCell !== undefined) {
        parameters.set("nav-cell", String(options.navigationCell));
        arguments_.push("--nav-cell", String(options.navigationCell));
      }
      return { ...diagnostic, review: { ...diagnostic.review, url: `?${parameters}`, arguments: arguments_ } };
    });
    if (!report.passed) {
      result.error = {stage, message:'Runtime validation failed; existing exports were preserved.'};
      return result;
    }
    if (command==='build') {
      stage = 'export';
      const id=exportName(level.document.id);
      const additionalFiles: ExportFiles = {
        [`${id}.runtime.json`]: JSON.stringify(toRuntime(level)),
        [`${id}.report.json`]: JSON.stringify(report,null,2),
        [`${id}.suggestions.json`]: JSON.stringify(result.suggestions,null,2),
        [`${id}.svg`]: toSVGPlan(level),
      };
      if (!objMaterialError(level.document.materials)) additionalFiles[`${id}.obj`] = toOBJ(level);
      if(level.atlas) {
        additionalFiles[`${id}.uv.json`]=JSON.stringify(level.atlas,null,2);
        for (const page of level.atlas.pages) {
          additionalFiles[`${id}.atlas-${page.id}.svg`] = atlasSVG(level,page.id);
        }
      }
      const exported = await exportLevel(level, {
        formats,
        assets: await resolveExportAssets(level, reference => materialImages.load(reference, options.signal), options.signal),
        output: resolve(options.out!),
        sourceFile: source,
        additionalFiles,
        heightmaps: Object.fromEntries(heightmaps.snapshots),
        signal: options.signal,
        onProgress: options.progress,
        blender: options.blender,
        qbsp: options.qbsp,
        vis: options.vis,
        light: options.light,
        quakePalette: options.quakePalette ?? process.env.QUAKE_PALETTE_PATH,
      });
      result.artifacts=exported.files.map(name=>join(exported.output,name));
    }
    options.signal.throwIfAborted();
    result.success=true;
  } catch(error) {
    const caught=error as Error & {diagnostics?:Diagnostic[];diagnostic?:Diagnostic};
    if(caught.diagnostics)result.diagnostics=caught.diagnostics;
    else if(caught.diagnostic)result.diagnostics=[caught.diagnostic];
    result.error={stage,message:caught.message};
  }
  return result;
}
