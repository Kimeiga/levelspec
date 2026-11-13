import type { CompiledArchitecture } from "../../architecture/types.ts";
import { emptyMesh } from "../../vector/mesh.ts";
import { aborted } from "../../vector/types.ts";
import type { KitBudget } from "../geometry.ts";
import type { KitMesh } from "../kit-mesh.ts";
import { moveSurfaceCharts } from "../surface/plans.ts";
import type { SignBook } from "./signs/book.ts";

/**
 * Creates one building's append-only drawing state. Architecture, physical input,
 * existing material definitions and ancestry are borrowed read-only. Render
 * buffers and mutable registration containers belong exclusively to this job.
 */
export function createBuildingLevel(source: CompiledArchitecture): CompiledArchitecture {
  return {
    ...source,
    mesh: { ...emptyMesh(), colors: [], solidIds: [] },
    surfaces: [],
    provenance: { ...source.provenance },
    diagnostics: [],
    groundPlans: [],
    document: { ...source.document, materials: [...source.document.materials] },
  };
}

/**
 * One completed building before its signs are settled. Assembly consumes the
 * local buffers once; existing pens and receiver callbacks continue on the
 * destination for deferred signs. This is an in-process result, not a worker
 * message: sampler and sign callbacks still require explicit transferable recipes.
 */
export class BuildingJob {
  private appended = false;
  private readonly level: CompiledArchitecture;
  private readonly mesh: KitMesh;
  readonly signs: SignBook;
  readonly survey: Float64Array;

  constructor(level: CompiledArchitecture, mesh: KitMesh, signs: SignBook, survey: Float64Array) {
    this.level = level;
    this.mesh = mesh;
    this.signs = signs;
    this.survey = survey;
  }

  /**
   * Appends in caller-selected source order, preserving local vertex sharing and
   * material identities. Budget, cancellation and material-conflict checks happen
   * before mutation, so a rejected job leaves both sides available for recovery.
   * The destination must be the detached, pre-appearance dressing render mesh.
   */
  appendTo(target: CompiledArchitecture, budget: KitBudget): void {
    if (this.appended) throw new Error("Building job was already assembled.");
    aborted(budget.signal);
    const source = this.level, input = source.mesh, output = target.mesh;
    const triangleOffset = output.surfaces.length;
    if (triangleOffset + input.surfaces.length > budget.maximumTriangles)
      throw new Error("Dressing triangle budget exceeded.");
    const materials = new Map(target.document.materials.map(material => [material.id, material]));
    const additions = [];
    for (const material of source.document.materials) {
      const existing = materials.get(material.id);
      if (!existing) additions.push(material);
      else if (existing !== material && JSON.stringify(existing) !== JSON.stringify(material))
        throw new Error(`Building jobs disagree on material ${material.id}.`);
    }

    const surfaceOffset = target.surfaces.length;
    const vertexOffset = output.positions.length / 3;
    for (const value of input.positions) output.positions.push(value);
    for (const value of input.normals) output.normals.push(value);
    for (const value of input.uv) output.uv.push(value);
    for (const value of input.colors!) output.colors!.push(value);
    for (const index of input.indices) output.indices.push(index + vertexOffset);
    for (const surface of input.surfaces) output.surfaces.push(surface + surfaceOffset);
    for (const solid of input.solidIds!) output.solidIds!.push(solid);
    for (const surface of source.surfaces) target.surfaces.push(surface);
    for (const material of additions) target.document.materials.push(material);
    for (const [id, ancestry] of Object.entries(source.provenance)) target.provenance[id] ??= ancestry;
    for (const diagnostic of source.diagnostics) target.diagnostics.push(diagnostic);
    if (source.groundPlans?.length) {
      target.groundPlans ??= [];
      for (const plan of source.groundPlans) target.groundPlans.push(plan);
    }
    moveSurfaceCharts(source, target, triangleOffset);
    this.mesh.retarget(target, budget, surfaceOffset);
    // Sampling closures may retain the local level. Release its copied geometry after assembly.
    source.mesh = { ...emptyMesh(), colors: [], solidIds: [] };
    this.appended = true;
  }
}
