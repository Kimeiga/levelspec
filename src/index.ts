/**
 * LevelSpec — the public API.
 *
 * A level is authored (or generated) as semantic intent: rooms, adjacency,
 * portals, wall roles, vertical connections, objectives. `compile` turns that
 * into geometry and owns every coordinate. `validateForRuntime` decides whether
 * the result is fit to ship: it checks the geometry, the spec-derived
 * navigation graph, and — separately and independently — what an agent can
 * actually walk on once the solids exist. Nothing downstream of here writes a
 * vertex, a plane, a winding order or an engine axis.
 */

export * from './core/types.ts';
export { compile } from './core/compiler.ts';
export { compileNaive } from './core/naive.ts';
export {
  validate,
  validateForRuntime,
  checkGeometry,
  checkNavigation,
  checkTactical,
  dijkstra,
  edgeDisjointRoutes,
  type ValidationReport,
  type GeometryReport,
  type NavReport,
  type TacticalReport,
  type RouteResult,
  type RuntimeValidationOptions,
  type RuntimeValidationReport,
} from './core/validate.ts';
export {
  bakeNavmesh,
  SAMPLE_REACHABLE,
  SAMPLE_ISLAND,
  SAMPLE_LEDGE,
  type NavmeshReport,
  type NavmeshGraph,
  type NavmeshOptions,
  type NavmeshIsland,
} from './core/navmesh.ts';
export { boxMesh, mergeBoxes, boxCenter, boxVolume, brushPlanes, brushContains, signedVolume, windingConsistent, type Mesh, type Vec3 } from './core/mesh.ts';
export { decomposeToRects, components, lineCells, rectCells, key, unkey, CellSet } from './core/grid.ts';
export { planToSpec, parsePlan, PlanError, type PlanIssue } from './authoring/plan.ts';
export { toQuakeMap } from './export/quake.ts';
export { toOBJ, toOpenSCAD, toCadQuery, toDXF, toSVGPlan, toRuntime, type RuntimePayload } from './export/formats.ts';
