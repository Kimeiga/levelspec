import { repairWaterPrecision } from "../vector/movement.ts";
import { ClippingError } from "../vector/clipping.ts";
import { auditSharedEdges } from "./shared-edges.ts";
import { auditTerrainPolicy } from "./terrain-policy.ts";
import { resolveGrades, applyTerrainGrades, GradingBudget } from "./grading.ts";
import { resolveSpatialVolume, auditSpatialVolumes } from "./volumes.ts";
import {
  appendTerrainMesh,
  terrainTileMetadata,
  partitionTerrain,
} from "./terrain-tiles.ts";
import type { ResolvedTerrain } from "./terrain.ts";
import { decodeHeightmapPng, type HeightmapRaster } from "./heightmap.ts";
import { resolveTerrain, validateTerrainSource } from "./terrain.ts";
import { Matrix4, Vector3 } from "three";
import type { Manifold } from "manifold-3d";
import {
  aborted,
  type Diagnostic,
  type FloorPatch,
  type MeshKind,
  type Surface,
  type V3,
} from "../vector/types.ts";
import { resolveFlight, type ResolvedFlight } from "./flights.ts";
import { enclosureGeometry } from "./enclosures.ts";
import {
  area,
  cross,
  hash,
  heightAt,
  norm,
  pathAt,
  pathLength,
  sub,
} from "../vector/geometry.ts";
import { emptyMesh, meshParts } from "../vector/mesh.ts";
import { collisionMesh } from "../vector/collision.ts";
import {
  validateAssetGeometry,
  validateMeshData,
  type AssetGeometry,
} from "../vector/props.ts";
import { bakeNavmesh, validateForRuntime } from "../vector/validate.ts";
import { generateUVs } from "../vector/uv.ts";
import { auditSurfaceContacts } from "../vector/surface-contacts.ts";
import { runtimeContext, runtimeGuides } from "./runtime.ts";
import { auditSuggestions } from "../vector/suggestions.ts";
import { auditFloorGaps } from "../vector/floor-gaps.ts";
import { AmlError } from "./format.ts";
import { normalizeArchitecture } from "./precision.ts";
import { ArchitectureResolution, type ResolvedElement } from "./resolve.ts";
import { loopsMeet } from "./relationships.ts";
import { applyFaceMaterials, type AuthoredFace } from "./face-materials.ts";
import { validateRelationships } from "./relationships.ts";
import { sweepGeometry, validateSweep } from "./sweep.ts";
import { wallGeometry } from "./walls.ts";
import { retainingGeometry } from "./retaining.ts";
import { endpointIncident, wallJoins, type WallIncident } from "./joins.ts";
import {
  authored,
  kernelMatrix,
  placement,
  solidKernel,
  SolidSession,
  surfaceSolid,
  transform,
  triangleNormal,
  type ResolvedProfile,
} from "./geometry.ts";
import type {
  Aperture,
  ArchitectureCompileOptions,
  ArchitectureDocument,
  CompiledArchitecture,
  Flight,
  Wall,
} from "./types.ts";

interface PhysicalResult {
  solids: Manifold[];
  renderSolids: Manifold[];
  contributors: string[];
}

/** Enforces meaningful dimensions on both parsed documents and direct builder objects. */
function positive(...values: number[]): void {
  if (values.some((value) => !Number.isFinite(value) || value <= 0))
    throw new Error("Dimensions must be finite and positive.");
}

/** Uses the curve chord tolerance rather than a fixed visual polygon count. */
function circleSegments(radius: number, tolerance: number): number {
  positive(radius, tolerance);
  return Math.max(
    12,
    Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - tolerance / radius))),
  );
}

/** Builds physical surfaces directly from native architectural objects. */
export async function compile(
  document: ArchitectureDocument,
  options: ArchitectureCompileOptions = {},
): Promise<CompiledArchitecture> {
  aborted(options.signal);
  if (document.version !== "1" || !Array.isArray(document.elements))
    throw new AmlError([
      {
        severity: "error",
        code: "AML_DOCUMENT",
        message: "compile requires an ArchitectureDocument version 1.",
        objects: [document.id],
        source: document.source,
      },
    ]);
  const source = normalizeArchitecture(document),
    context = runtimeContext(source),
    diagnostics: Diagnostic[] = [];
  const level: CompiledArchitecture = {
    document: context,
    architecture: source,
    provenance: {},
    physicalHash: "",
    renderHash: "",
    geometryHash: "",
    mesh: emptyMesh(),
    parts: [],
    surfaces: [],
    floors: [],
    water: [],
    curves: {},
    diagnostics,
    suggestions: [],
    repairs: [],
    sourceProfiles: [],
    flightGuides: {},
    navigationSuggestionsStatus: "pending",
    semantic: { nodes: [], edges: [] },
    stats: { terrainCacheHits: 0, terrainCacheMisses: 0 },
    ...(options.retainExportSolids ? { exportSolids: [] } : {}),
  };
  const limits = {
    elements: 100_000,
    curveSegments: 100_000,
    profileVertices: 4096,
    triangles: 2_000_000,
    booleanDepth: 64,
    terrainSamples: 1_048_576,
    heightmapBytes: 16 * 1024 * 1024,
    spatialQueries: 8_000_000,
    terrainTiles: 16_384,
    gradingWork: 8_000_000,
    terrainDependencies: 32_000_000,
    ...options.limits,
  };
  for (const [name, value] of Object.entries(limits))
    if (!Number.isInteger(value) || value < 1)
      throw new RangeError(`${name} budget must be a positive integer.`);
  let current = source.id,
    session: SolidSession | undefined;
  const fail = (message: string, code = "AML_GEOMETRY", objects = [current]) =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      objects,
      source: level.provenance[current]?.source ?? source.source,
    });
  try {
    options.onProgress?.("Resolving architecture");
    aborted(options.signal);
    const resolution = new ArchitectureResolution(
      source,
      limits.elements,
      limits.curveSegments,
      limits.profileVertices,
    );
    level.provenance = resolution.provenance;
    validateRelationships(resolution);
    const terrainRasters = new Map<string, HeightmapRaster>();
    const rasterSources = new Map<string, HeightmapRaster>();
    let retainedSamples = 0,
      encodedBytes = 0;
    for (const node of resolution.nodes.values())
      if (node.element.kind === "terrain") {
        current = node.id;
        validateTerrainSource(node.element);
        if (!node.element.heightmap) continue;
        let raster = rasterSources.get(node.element.heightmap);
        if (!raster) {
          if (!options.resolveHeightmap)
            throw new Error(
              `Supply resolveHeightmap to load ${node.element.heightmap}.`,
            );
          const bytes = await options.resolveHeightmap(
            { id: node.id, src: node.element.heightmap },
            options.signal,
          );
          aborted(options.signal);
          encodedBytes += bytes.byteLength;
          if (encodedBytes > limits.heightmapBytes)
            throw new Error(
              "Compilation heightmap encoded byte budget exceeded.",
            );
          if (retainedSamples >= limits.terrainSamples)
            throw new Error("Compilation heightmap sample budget exceeded.");
          raster = decodeHeightmapPng(bytes, {
            maxSamples: limits.terrainSamples - retainedSamples,
            maxBytes: limits.heightmapBytes,
            signal: options.signal,
          });
          retainedSamples += raster.samples.length;
          rasterSources.set(node.element.heightmap, raster);
        }
        terrainRasters.set(node.id, raster);
      }
    const terrainProfiles = new Map<string, ResolvedTerrain>(),
      terrainMetadata = new Map<
        string,
        NonNullable<CompiledArchitecture["terrainTiles"]>
      >();
    const gradesByHost = new Map<string, ResolvedElement[]>(),
      gradingBudget = new GradingBudget(limits.gradingWork, options.signal);
    for (const node of resolution.nodes.values())
      if (node.element.kind === "grade") {
        const host = resolution.reference(node, node.element.host);
        if (host.element.kind !== "terrain")
          resolution.fail(
            node.id,
            "Grading requires a terrain host.",
            "AML_GRADE",
            [host.id],
          );
        const values = gradesByHost.get(host.id) ?? [];
        values.push(node);
        gradesByHost.set(host.id, values);
      }
    let admittedTerrainTriangles = 0,
      admittedTiles = 0,
      dependencyWork = 0;
    const spendDependency = () => {
      if ((++dependencyWork & 1023) === 0) aborted(options.signal);
      if (dependencyWork > limits.terrainDependencies)
        throw new Error("Terrain normal dependency budget exceeded.");
    };
    for (const node of resolution.nodes.values())
      if (node.element.kind === "terrain") {
        current = node.id;
        let profile = resolveTerrain(
          node,
          resolution,
          terrainRasters.get(node.id),
          limits.terrainSamples,
          limits.triangles - admittedTerrainTriangles,
          options.signal,
          options.onProgress,
          limits.terrainTiles - admittedTiles,
        );
        const grades = resolveGrades(
          gradesByHost.get(node.id) ?? [],
          resolution,
          gradingBudget,
        );
        for (const grade of grades) {
          level.sourceProfiles!.push({
            object: grade.node.id,
            role: "grading center path",
            points: grade.path.map((p) => transform(p, node.matrix)),
            closed: false,
          });
          for (const cell of grade.cells)
            level.sourceProfiles!.push({
              object: grade.node.id,
              role: "grading influence",
              points: cell.points.map((p) => transform(p, node.matrix)),
              closed: true,
            });
        }
        if (grades.length) {
          const graded = applyTerrainGrades(
            profile,
            node,
            grades,
            source.curveTolerance,
            limits.triangles - admittedTerrainTriangles,
            gradingBudget,
            resolution,
            options.onProgress,
          );
          const size = node.element.tileSize ?? 64;
          profile = partitionTerrain(
            graded,
            node.matrix.clone().invert(),
            [size * node.element.cellSize[0], size * node.element.cellSize[1]],
            limits.terrainTiles - admittedTiles,
            options.onProgress,
            node.id,
            options.signal,
          );
        }
        admittedTiles += profile.tileRanges.length;
        admittedTerrainTriangles += profile.triangles.length;
        terrainProfiles.set(node.id, profile);
        terrainMetadata.set(
          node.id,
          await terrainTileMetadata(
            node.id,
            profile,
            profile.tileRanges,
            options.signal,
            spendDependency,
          ),
        );
      }
    const kernel = await solidKernel();
    aborted(options.signal);
    session = new SolidSession(kernel);
    const solids = session;
    const authoredFaces: AuthoredFace[] = [];
    const originalSurfaces = new Map<number, number>(),
      built = new Map<string, PhysicalResult>();
    const wallSilhouettes = new Map<string, V3[]>();
    const wallOffsets = new Map<string, { station: number; normal: V3 }[]>();
    const floorSoffits = new Map<string, FloorPatch>();
    const flights = new Map<string, ResolvedFlight>();
    const wallPaths = new Map<string, V3[]>(),
      flightRails = new Map<string, [V3[], V3[]]>();
    const wallIncidents = new Map<string, WallIncident[]>();
    const floorKinds = new Map<string, "floor" | "stairs" | "ramp" | "water">();
    const floorThickness = new Map<string, number>(),
      floorAreas = new Map<string, string | undefined>();
    const openGeometry: {
      node: ResolvedElement;
      geometry: AssetGeometry;
      surface: number;
      physical: boolean;
    }[] = [];
    let generated = 0;
    const register = (
      node: ResolvedElement,
      kind: MeshKind,
      role: string,
      material = node.element.material ?? "default",
      collidable = node.element.collidable !== false,
      visible = node.element.visible !== false,
    ) => {
      if (
        material !== "default" &&
        !source.materials.some((candidate) => candidate.id === material)
      )
        throw new Error(`Unknown material ${material}.`);
      const index = level.surfaces.length,
        original = kernel.Manifold.reserveIDs(1);
      const surface: Surface = {
        id: `${node.id}:${role}:${index}`,
        object: node.id,
        layer: node.group,
        mesh: node.assembly ?? node.id,
        closed:
          !["visual-mesh", "collision-surface", "water"].includes(
            node.element.kind,
          ) &&
          (node.element.kind !== "terrain" || node.element.base !== undefined),
        kind,
        role,
        material,
        dynamic: node.element.dynamic ?? false,
        collidable,
        visible,
        contributors:
          node.element.kind === "terrain" && gradesByHost.has(node.id)
            ? [node.id, ...gradesByHost.get(node.id)!.map((grade) => grade.id)]
            : undefined,
        domain:
          node.element.kind === "visual-mesh"
            ? "visualization"
            : node.element.kind === "terrain"
              ? "terrain"
              : "architecture",
      };
      level.surfaces.push(surface);
      originalSurfaces.set(original, index);
      return { index, original };
    };
    const budget = (count: number) => {
      generated += count;
      if (generated > limits.triangles)
        throw new Error("Generated triangle budget exceeded.");
      aborted(options.signal);
    };
    const native = (
      node: ResolvedElement,
      geometry: AssetGeometry,
      kind: MeshKind,
      role: string,
      matrix?: Matrix4,
    ) => {
      validateAssetGeometry(geometry);
      budget(geometry.triangles.length);
      const owner = register(node, kind, role),
        solid = solids.mesh(geometry, owner.original);
      return matrix
        ? solids.keep(solid.transform(kernelMatrix(matrix)))
        : solid;
    };
    const union = (members: Manifold[]) => {
      if (!members.length)
        throw new Error("A physical collection has no native solid operands.");
      return members.length === 1
        ? members[0]
        : solids.keep(kernel.Manifold.union(members));
    };
    const floorPatch = (
      node: ResolvedElement,
      profile: ResolvedProfile,
      fill: "floor" | "stairs" | "ramp" | "water",
      thickness: number,
      area?: string,
    ) => {
      floorKinds.set(node.id, fill);
      floorThickness.set(node.id, thickness);
      floorAreas.set(node.id, area);
      let layer = context.layers.find((layer) => layer.id === node.group);
      if (!layer) {
        layer = { id: node.group, vertices: [], edges: [], regions: [] };
        context.layers.push(layer);
      }
      layer.regions.push({
        id: node.id,
        source: node.element.source,
        boundary: [],
        holes: [],
        interior: [],
        creases: [],
        fill,
        thickness,
        area,
        lower: node.element.kind === "stairs" ? `${node.id}:lower` : undefined,
      });
      return {
        region: node.id,
        layer: node.group,
        area,
        points: profile.points,
        triangles: profile.triangles,
        loops: profile.loops,
      } satisfies FloorPatch;
    };
    const floorSource = new Map<string, FloorPatch>();
    const profileAt = (node: ResolvedElement, id: string, elevation = 0) =>
      resolution.profile(node, id, elevation);

    /** Resolves explicit support dependencies before native wall section construction. */
    function wall(node: ResolvedElement, element: Wall): Manifold {
      for (const reference of [
        element.baseFloor,
        element.contactFloor,
        element.fitFloor,
        element.topFloor,
      ])
        if (reference) build(resolution.reference(node, reference), 0);
      if (element.spanFloors)
        for (const candidate of resolution.nodes.values())
          if (
            ["slab", "landing", "roof", "canopy", "ramp"].includes(
              candidate.element.kind,
            )
          )
            build(candidate, 0);
      const result = wallGeometry(
        node,
        element,
        resolution,
        floorSource,
        context,
        floorSoffits,
      );
      level.sourceProfiles!.push({
        object: node.id,
        role: "Wall silhouette / unrolled distance and height (m)",
        points: result.silhouette,
        closed: true,
      });
      wallSilhouettes.set(node.id, result.silhouette);
      wallOffsets.set(node.id, result.offsets);
      wallPaths.set(node.id, result.path);
      level.curves[element.path] = result.path;
      wallIncidents.set(node.id, result.incidents);
      return union(
        result.geometry.map((geometry) =>
          native(node, geometry, "wall", "wall"),
        ),
      );
    }

    /** Constructs an aperture in host-local longitudinal/elevation coordinates. */
    function openingShape(element: Aperture): [number, number][] {
      const [x, z] = element.center;
      if (element.shape === "profile") {
        const profile =
          element.profile && resolution.profiles.get(element.profile);
        if (!profile || profile.loops.length !== 1)
          throw new Error("An opening requires a simple native profile.");
        return profile.loops[0].map((point) => [point[0] + x, point[1] + z]);
      }
      if (element.shape === "rectangle" || element.shape === "arch") {
        positive(element.width, element.height);
        const left = x - element.width / 2,
          right = x + element.width / 2,
          bottom = z - element.height / 2,
          top = z + element.height / 2;
        if (element.shape === "rectangle")
          return [
            [left, bottom],
            [right, bottom],
            [right, top],
            [left, top],
          ];
        const radius = element.width / 2,
          shoulder = top - radius;
        if (shoulder < bottom)
          throw new Error(
            "Arch height must accommodate its semicircular crown.",
          );
        const segments = circleSegments(radius, source.curveTolerance);
        if (segments > limits.curveSegments)
          throw new Error("Opening curve segment budget exceeded.");
        return [
          [left, bottom],
          [right, bottom],
          ...Array.from(
            { length: Math.ceil(segments / 2) + 1 },
            (_, i): [number, number] => {
              const angle = (Math.PI * i) / Math.ceil(segments / 2);
              return [
                x + radius * Math.cos(angle),
                shoulder + radius * Math.sin(angle),
              ];
            },
          ),
        ];
      }
      const [rx, rz] =
        element.shape === "circle"
          ? [element.radius, element.radius]
          : element.radii;
      positive(rx, rz);
      const count = circleSegments(Math.max(rx, rz), source.curveTolerance);
      if (count > limits.curveSegments)
        throw new Error("Opening curve segment budget exceeded.");
      return Array.from({ length: count }, (_, i) => [
        x + rx * Math.cos((i * Math.PI * 2) / count),
        z + rz * Math.sin((i * Math.PI * 2) / count),
      ]);
    }

    /** Builds one complete named host cut; other assemblies never enter this subtraction. */
    function cutter(
      opening: ResolvedElement,
      host: ResolvedElement,
      members: Manifold[],
      detailDepth?: number,
      detailOffset = 0,
      border?: number,
    ): Manifold {
      const element = opening.element as Aperture,
        shape = openingShape(element);
      const owner = register(
        {
          ...opening,
          assembly: host.assembly,
          group: host.group,
          element: {
            ...opening.element,
            dynamic: host.element.dynamic,
            visible: host.element.visible,
            collidable: host.element.collidable,
          },
        },
        "wall",
        "reveal",
        element.revealMaterial ?? host.element.material ?? "default",
      );
      const box = union(members).boundingBox(),
        inverse = host.matrix.clone().invert();
      const corners = Array.from({ length: 8 }, (_, i) =>
        transform(
          [
            box[i & 1 ? "max" : "min"][0],
            box[i & 2 ? "max" : "min"][1],
            box[i & 4 ? "max" : "min"][2],
          ],
          inverse,
        ),
      );
      const wall = host.element.kind === "wall" ? host.element : undefined;
      const wallLow =
        wall?.alignment === "left"
          ? 0
          : wall?.alignment === "right"
            ? -wall.thickness
            : -(wall?.thickness ?? 0) / 2;
      let low = wall
        ? wallLow - 0.01
        : Math.min(...corners.map((point) => point[1])) - 1;
      let high = wall
        ? wallLow + wall.thickness + 0.01
        : Math.max(...corners.map((point) => point[1])) + 1;
      if (detailDepth !== undefined) {
        positive(detailDepth);
        low = detailOffset;
        high = detailOffset + detailDepth;
      } else if (element.mode === "recess") {
        positive(element.depth ?? 0);
        const wall = host.element.kind === "wall" ? host.element : undefined;
        const negativeFace = wall
          ? wall.alignment === "left"
            ? 0
            : wall.alignment === "right"
              ? -wall.thickness
              : -wall.thickness / 2
          : Math.min(...corners.map((point) => point[1]));
        const thickness =
          wall?.thickness ??
          Math.max(...corners.map((point) => point[1])) - negativeFace;
        if (
          element.offset < 0 ||
          element.offset + element.depth! >= thickness - 1e-7
        )
          resolution.fail(
            opening.id,
            "A recess must start inside its negative-Y host face and leave a back web.",
            "AML_OPENING",
            [host.id],
          );
        low = negativeFace + element.offset;
        high = low + element.depth!;
      }
      const raw = solids.keep(kernel.Manifold.extrude([shape], high - low));
      let cut = solids.keep(
        raw.transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, high, 0, 1]),
      );
      if (border !== undefined) {
        positive(border);
        const outline = solids.section(new kernel.CrossSection([shape]));
        const inset = solids.section(outline.offset(-border, "Miter"));
        if (inset.isEmpty())
          resolution.fail(
            opening.id,
            "Frame border consumes the complete opening.",
            "AML_OPENING",
            [host.id],
          );
        const inner = inset.toPolygons();
        const hollow = solids.keep(
          kernel.Manifold.extrude(inner, high - low + 2),
        );
        const transformed = solids.keep(
          hollow.transform([
            1,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            -1,
            0,
            0,
            0,
            high + 1,
            0,
            1,
          ]),
        );
        cut = solids.keep(kernel.Manifold.difference(cut, transformed));
      }
      const openingPlacement = resolution
        .frame(element.frame)
        .clone()
        .multiply(placement(element));
      cut = solids.keep(cut.transform(kernelMatrix(openingPlacement)));
      if (host.element.kind === "wall") {
        const path = wallPaths
          .get(host.id)!
          .map((point) => transform(point, inverse));
        const pieces: Manifold[] = [];
        let distance = 0;
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1],
            b = path[i],
            run = Math.hypot(b[0] - a[0], b[1] - a[1]),
            direction = norm([b[0] - a[0], b[1] - a[1], 0]);
          const interval = cut.boundingBox(),
            minimum = interval.min[0],
            maximum = interval.max[0];
          if (maximum <= distance || minimum >= distance + run) {
            distance += run;
            continue;
          }
          const clipped = solids.keep(cut.trimByPlane([1, 0, 0], distance));
          const segment = solids.keep(
            clipped.trimByPlane([-1, 0, 0], -(distance + run)),
          );
          if (!segment.isEmpty()) {
            const mesh = segment.getMesh(),
              offsets = wallOffsets.get(host.id)!;
            const positions = Array.from(
              { length: mesh.vertProperties.length / mesh.numProp },
              (_, vertex): V3 => {
                const [station, side, height] = mesh.vertProperties.slice(
                  vertex * mesh.numProp,
                  vertex * mesh.numProp + 3,
                );
                const corner = offsets.find(
                  (offset) => Math.abs(offset.station - station) < 1e-6,
                );
                const normal: V3 = corner?.normal ?? [
                  -direction[1],
                  direction[0],
                  0,
                ];
                const center = pathAt(path, station);
                return transform(
                  [
                    center[0] + normal[0] * side,
                    center[1] + normal[1] * side,
                    center[2] + height,
                  ],
                  host.matrix,
                );
              },
            );
            let triangles = Array.from(
              { length: mesh.triVerts.length / 3 },
              (_, i) =>
                Array.from(mesh.triVerts.slice(i * 3, i * 3 + 3)) as [
                  number,
                  number,
                  number,
                ],
            );
            if (host.matrix.determinant() < 0)
              triangles = triangles.map(([a, b, c]) => [c, b, a]);
            budget(triangles.length);
            pieces.push(solids.mesh({ positions, triangles }, owner.original));
          }
          distance += run;
        }
        if (!pieces.length)
          resolution.fail(
            opening.id,
            "Opening lies outside its host path.",
            "AML_OPENING",
            [host.id],
          );
        cut = union(pieces);
      } else cut = solids.keep(cut.transform(kernelMatrix(host.matrix)));
      return solids.own(cut, owner.original);
    }

    const inProgress = new Set<string>();
    /** Keeps independent terrain and dynamic pieces outside automatic architectural unions. */
    function composeAssembly(operands: Manifold[]): Manifold[] {
      const terrain = operands.filter((operand) =>
        Array.from(operand.getMesh().runOriginalID).every(
          (id) =>
            level.surfaces[originalSurfaces.get(id)!].domain === "terrain",
        ),
      );
      const independent = new Set(terrain);
      const dynamic = operands.filter(
        (operand) =>
          !independent.has(operand) &&
          Array.from(operand.getMesh().runOriginalID).some(
            (id) => level.surfaces[originalSurfaces.get(id)!].dynamic,
          ),
      );
      for (const operand of dynamic) independent.add(operand);
      const fixed = operands.filter((operand) => !independent.has(operand));
      return [...terrain, ...(fixed.length ? [union(fixed)] : []), ...dynamic];
    }
    /** Lowers one architectural object while retaining its host and contributors. */
    function build(node: ResolvedElement, depth: number): PhysicalResult {
      const cached = built.get(node.id);
      if (cached) return cached;
      const previous = current;
      current = node.id;
      try {
        aborted(options.signal);
        if (depth > limits.booleanDepth)
          throw new Error("Boolean nesting budget exceeded.");
        if (inProgress.has(node.id))
          throw new Error(`Cyclic architectural relationship at ${node.id}.`);
        inProgress.add(node.id);
        let renderedMembers: Manifold[] | undefined;
        const element = node.element,
          members: Manifold[] = [],
          contributors = [
            node.id,
            ...(gradesByHost.get(node.id) ?? []).map((grade) => grade.id),
          ];
        if ("children" in element || element.kind === "instance") {
          const children = node.children.map((child) =>
            build(child, depth + 1),
          );
          contributors.push(...children.flatMap((child) => child.contributors));
          const operands = children.flatMap((child) => child.solids);
          if (
            [
              "assembly",
              "collision",
              "union",
              "subtract",
              "intersect",
            ].includes(element.kind)
          ) {
            options.onProgress?.("Composing");
            aborted(options.signal);
          }
          const joins: Manifold[] = [];
          if (element.kind === "assembly") {
            const incidents = contributors.flatMap(
              (id) => wallIncidents.get(id) ?? [],
            );
            for (const join of wallJoins(incidents))
              joins.push(
                native(
                  resolution.nodes.get(join.owner)!,
                  join.geometry,
                  "wall",
                  "wall-join",
                ),
              );
            operands.push(...joins);
          }
          if (
            element.kind === "subtract" ||
            element.kind === "intersect" ||
            element.kind === "union"
          ) {
            if (
              children.length < 2 ||
              children.some((child) => child.solids.length !== 1)
            )
              throw new Error(
                "Boolean operations require at least two closed native operands.",
              );
            const states = new Set(
              operands.flatMap((operand) =>
                Array.from(operand.getMesh().runOriginalID).map(
                  (id) => level.surfaces[originalSurfaces.get(id)!].dynamic,
                ),
              ),
            );
            if (states.size > 1)
              throw new Error(
                "One boolean operation cannot combine static and dynamic collision states.",
              );
            members.push(
              solids.keep(
                element.kind === "subtract"
                  ? kernel.Manifold.difference(operands)
                  : element.kind === "intersect"
                    ? kernel.Manifold.intersection(operands)
                    : kernel.Manifold.union(operands),
              ),
            );
          } else if (
            ["assembly", "collision"].includes(element.kind) &&
            operands.length
          ) {
            members.push(...composeAssembly(operands));
          } else members.push(...operands);
          if (
            ["assembly", "group", "instance"].includes(element.kind) &&
            children.some((child) => child.renderSolids !== child.solids)
          ) {
            const visible = [
              ...children.flatMap((child) => child.renderSolids),
              ...joins.filter((join) =>
                Array.from(join.getMesh().runOriginalID).every(
                  (id) =>
                    level.surfaces[originalSurfaces.get(id)!].visible !== false,
                ),
              ),
            ];
            renderedMembers =
              element.kind === "assembly" ? composeAssembly(visible) : visible;
          }
          if (element.kind === "collision") {
            renderedMembers = [];
            for (const surface of level.surfaces)
              if (contributors.includes(surface.object))
                surface.visible = false;
          }
        } else if (element.kind === "wall") members.push(wall(node, element));
        else if (
          ["box", "wedge", "cylinder", "cone", "sphere"].includes(
            element.kind,
          ) &&
          "radius" in element &&
          !("host" in element)
        ) {
          const owner = register(node, "prop", "solid");
          let solid: Manifold;
          const segments =
            element.segments ??
            circleSegments(element.radius, source.curveTolerance);
          if (
            !Number.isInteger(segments) ||
            segments < 3 ||
            segments > limits.curveSegments
          )
            throw new Error("Primitive segments exceed the curve budget.");
          if (element.kind === "sphere") {
            positive(element.radius);
            solid = solids.keep(
              kernel.Manifold.sphere(element.radius, segments),
            );
          } else if (element.kind === "cylinder" || element.kind === "cone") {
            positive(element.height, element.radius);
            if (element.topRadius < 0)
              throw new Error("Top radius cannot be negative.");
            solid = solids.keep(
              kernel.Manifold.cylinder(
                element.height,
                element.radius,
                element.kind === "cone" ? element.topRadius : element.radius,
                segments,
              ),
            );
          } else {
            positive(element.width, element.depth, element.height);
            solid = solids.keep(
              kernel.Manifold.cube([
                element.width,
                element.depth,
                element.height,
              ]),
            );
            if (element.kind === "wedge")
              solid = solids.keep(
                solid.trimByPlane([-element.height, 0, element.width], 0),
              );
            if (element.anchor === "bottom-center")
              solid = solids.keep(
                solid.translate([-element.width / 2, -element.depth / 2, 0]),
              );
          }
          members.push(
            solids.keep(
              solids
                .own(solid, owner.original)
                .transform(kernelMatrix(node.matrix)),
            ),
          );
        } else if (
          element.kind === "slab" ||
          element.kind === "landing" ||
          element.kind === "roof" ||
          element.kind === "canopy"
        ) {
          positive(element.thickness);
          const profile = profileAt(
            node,
            element.profile,
            resolution.elevation(element.elevation),
          );
          if (element.flat) {
            const flat = resolution.profiles.get(element.profile)!;
            const point = (p: V3) =>
              transform(
                [p[0], p[1], resolution.elevation(element.elevation)],
                node.matrix,
              );
            profile.points = flat.points.map(point);
            profile.loops = flat.loops.map((loop) => loop.map(point));
          }
          floorSource.set(
            node.id,
            floorPatch(node, profile, "floor", element.thickness, element.area),
          );
          const displacement = new Vector3(0, 0, element.thickness)
            .applyMatrix4(node.matrix)
            .sub(new Vector3().applyMatrix4(node.matrix))
            .toArray() as V3;
          const overhead = element.kind === "roof" || element.kind === "canopy";
          members.push(
            native(
              node,
              surfaceSolid(
                profile,
                (point) => point.map((n, axis) => n - displacement[axis]) as V3,
              ),
              overhead ? "ceiling" : "floor",
              overhead ? "roof" : "floor",
            ),
          );
        } else if (element.kind === "extrusion") {
          positive(element.distance);
          const profile = profileAt(node, element.profile);
          const direction = new Vector3(0, 0, element.distance)
            .applyMatrix4(node.matrix)
            .sub(new Vector3().applyMatrix4(node.matrix))
            .toArray() as V3;
          const top = {
            ...profile,
            points: profile.points.map(
              (point) => point.map((n, axis) => n + direction[axis]) as V3,
            ),
          };
          const geometry = surfaceSolid(
            top,
            (point) => point.map((n, axis) => n - direction[axis]) as V3,
          );
          members.push(native(node, geometry, "prop", "extrusion"));
        } else if (
          element.kind === "sweep" ||
          element.kind === "beam" ||
          element.kind === "column"
        ) {
          const profile = resolution.profiles.get(element.profile),
            path = resolution.paths.get(element.path);
          if (!profile || !path)
            throw new Error("Sweep requires a known profile and path.");
          const boundaryEdges = profile.loops.reduce(
            (sum, loop) => sum + loop.length,
            0,
          );
          const segmentsCount = path.length - 1,
            caps = profile.triangles.length;
          const estimate =
            2 * caps * (segmentsCount + 1) + 4 * boundaryEdges * segmentsCount;
          if (
            estimate > limits.triangles - generated ||
            profile.points.length * path.length > limits.triangles * 3
          )
            throw new Error(
              "Sweep geometry exceeds the triangle budget before allocation.",
            );
          const sweep = sweepGeometry(
            profile,
            path,
            node.matrix,
            options.signal,
          );
          const owner = register(node, "prop", element.kind);
          validateSweep(
            sweep,
            solids,
            owner.original,
            budget,
            limits.triangles,
            options.signal,
          );
          budget(sweep.geometry.triangles.length);
          members.push(solids.mesh(sweep.geometry, owner.original));
        } else if (element.kind === "stairs" || element.kind === "ramp") {
          const flight = resolveFlight(
            node,
            element,
            resolution,
            limits.triangles - generated,
            options.signal,
          );
          flights.set(node.id, flight);
          const inverse = node.matrix.clone().invert();
          const walkingTop: V3[] = [];
          let station = 0;
          for (const segment of flight.segments) {
            const left = segment.left.map((p) => transform(p, inverse)),
              right = segment.right.map((p) => transform(p, inverse));
            const centers = left.map(
              (p, i) => p.map((n, axis) => (n + right[i][axis]) / 2) as V3,
            );
            walkingTop.push([station, centers[0][2], 0]);
            station += Math.hypot(
              centers[1][0] - centers[0][0],
              centers[1][1] - centers[0][1],
            );
            walkingTop.push([station, centers[1][2], 0]);
          }
          level.sourceProfiles!.push({
            object: node.id,
            role: "Walking top / local center plan distance and elevation (m)",
            points: walkingTop,
            closed: false,
          });
          if (element.undersideProfile)
            level.sourceProfiles!.push({
              object: node.id,
              role: "Custom underside / authored longitudinal station and local elevation (m)",
              points: resolution.paths
                .get(element.undersideProfile)!
                .map((p) => [...p]),
              closed: false,
            });
          level.flightGuides![node.id] = {
            ...flight.guide,
            region: node.id,
            layer: node.group,
          };
          const [left, right] = flight.rails;
          flightRails.set(node.id, flight.rails);
          floorSource.set(
            node.id,
            floorPatch(
              node,
              flight.floor,
              element.kind,
              element.thickness,
              element.area,
            ),
          );
          level.curves[`${node.id}:lower`] = [left[0], right[0]];
          members.push(
            union(
              flight.solids.map((geometry) =>
                native(
                  node,
                  geometry,
                  element.kind === "stairs" ? "stairs" : "floor",
                  element.kind === "stairs" ? "stair" : "ramp",
                ),
              ),
            ),
          );
        } else if (element.kind === "faceted-solid")
          members.push(
            native(node, element.geometry, "prop", "native-proxy", node.matrix),
          );
        else if (element.kind === "collision-surface") {
          validateAssetGeometry(element.geometry);
          budget(element.geometry.triangles.length);
          const owner = register(
            node,
            "prop",
            "native-proxy",
            element.material,
            true,
            false,
          );
          openGeometry.push({
            node,
            geometry: {
              positions: element.geometry.positions.map((point) =>
                transform(authored(point), node.matrix),
              ),
              triangles: element.geometry.triangles,
            },
            surface: owner.index,
            physical: true,
          });
        } else if (element.kind === "visual-mesh") {
          const owner = register(
            node,
            "prop",
            "visual-mesh",
            element.material,
            false,
            element.visible !== false,
          );
          openGeometry.push({
            node,
            geometry: { positions: [], triangles: [] },
            surface: owner.index,
            physical: false,
          });
        } else if (element.kind === "water") {
          const profile = profileAt(
            node,
            element.profile,
            resolution.elevation(element.elevation),
          );
          if (
            profile.points.some(
              (point) => Math.abs(point[2] - profile.points[0][2]) > 1e-7,
            )
          )
            throw new Error("Water must be a horizontal planar surface.");
          const patch = floorPatch(node, profile, "water", 0);
          level.water!.push(patch);
          const owner = register(
            node,
            "water",
            "water",
            element.material,
            false,
          );
          openGeometry.push({
            node,
            geometry: {
              positions: profile.points,
              triangles: profile.triangles,
            },
            surface: owner.index,
            physical: false,
          });
        } else if (element.kind === "terrain") {
          const profile = terrainProfiles.get(node.id)!;
          budget(profile.triangles.length);
          if (element.base !== undefined) {
            const inverse = node.matrix.clone().invert();
            if (
              profile.points.some(
                (point) => transform(point, inverse)[2] <= element.base!,
              )
            )
              throw new Error(
                "Terrain closure base must be below its entire local surface.",
              );
            members.push(
              native(
                node,
                surfaceSolid(profile, (point) => {
                  const local = transform(point, inverse);
                  return transform(
                    [local[0], local[1], element.base!],
                    node.matrix,
                  );
                }),
                "floor",
                "terrain",
              ),
            );
          } else {
            const owner = register(node, "floor", "terrain");
            openGeometry.push({
              node,
              geometry: {
                positions: profile.points,
                triangles: profile.triangles,
              },
              surface: owner.index,
              physical: true,
            });
          }
          const patch = floorPatch(
            node,
            profile,
            "floor",
            element.base === undefined ? 0 : 0.2,
          );
          floorSource.set(node.id, patch);
        } else if (element.kind === "enclosure") {
          const host = resolution.reference(node, element.host);
          build(host, depth + 1);
          node.matrix = host.matrix
            .clone()
            .multiply(resolution.frame(element.frame))
            .multiply(placement(element));
          const geometry = enclosureGeometry(
            node,
            host,
            resolution,
            flights.get(host.id),
            floorSource.get(host.id),
            limits.triangles - generated,
            options.signal,
            (sweep) =>
              validateSweep(
                sweep,
                solids,
                kernel.Manifold.reserveIDs(1),
                budget,
                limits.triangles,
                options.signal,
              ),
          );
          members.push(
            union(
              geometry.map((mesh) =>
                native(node, mesh, "wall", element.construction),
              ),
            ),
          );
        } else if (
          ["room", "zone", "volume", "clearance"].includes(element.kind)
        ) {
          (level.spatialVolumes ??= []).push(
            resolveSpatialVolume(node, resolution),
          );
        } else if (element.kind === "retaining-wall") {
          const lowerNode = element.lowerFloor
              ? resolution.reference(node, element.lowerFloor)
              : undefined,
            upperNode = element.upperFloor
              ? resolution.reference(node, element.upperFloor)
              : undefined;
          if (lowerNode) build(lowerNode, depth + 1);
          if (upperNode) build(upperNode, depth + 1);
          const low = resolution.path(node, element.lower),
            high = resolution.path(node, element.upper),
            upper = upperNode?.element;
          const lowerFloor =
            lowerNode?.element.kind === "stairs" &&
            lowerNode.element.underside === "stepped"
              ? floorSource.get(lowerNode.id)
              : undefined;
          const upperFloor =
            upper?.kind === "stairs" && upper.underside === "stepped"
              ? floorSource.get(upperNode!.id)
              : undefined;
          const thickness = upperNode
            ? (floorThickness.get(upperNode.id) ?? 0.2)
            : 0;
          const filledBottom =
            upper?.kind === "stairs" && upper.underside === "filled"
              ? Math.min(
                  ...floorSource.get(upperNode!.id)!.loops[0].map((p) => p[2]),
                ) - thickness
              : undefined;
          for (const geometry of retainingGeometry(
            element,
            low,
            high,
            lowerFloor,
            upperFloor,
            thickness,
            filledBottom,
          ))
            members.push(native(node, geometry, "wall", "retaining-wall"));
          const oriented =
            Math.hypot(low[0][0] - high[0][0], low[0][1] - high[0][1]) < 1e-7
              ? high
              : [...high].reverse();
          const entries: WallIncident[] = [];
          for (const i of [0, low.length - 1]) {
            const top =
              filledBottom ??
              oriented[i ? oriented.length - 1 : 0][2] +
                (element.mode === "wall" ? element.height : -thickness);
            if (top > low[i][2] + 1e-7)
              entries.push(
                endpointIncident(
                  node.id,
                  low[i],
                  low[i ? i - 1 : 1],
                  element.thickness,
                  top,
                ),
              );
          }
          if (!element.dynamic) wallIncidents.set(node.id, entries);
        }
        const hosted = [...resolution.nodes.values()].filter(
          (candidate) =>
            candidate.element.kind === "opening" &&
            resolution.reference(candidate, candidate.element.host).id ===
              node.id,
        );
        if (hosted.length) {
          if (!members.length)
            throw new Error("Openings require a complete closed native host.");
          let hostSolid = union(members);
          for (const opening of hosted) {
            const cut = cutter(opening, node, [hostSolid]);
            const aperture = opening.element as Aperture;
            if (
              solids
                .keep(kernel.Manifold.intersection([hostSolid, cut]))
                .volume() <= 1e-10
            )
              resolution.fail(
                opening.id,
                "Opening does not intersect its named host.",
                "AML_OPENING",
                [node.id],
              );
            if (aperture.mode === "notch") {
              const localPlacement = resolution
                .frame(aperture.frame)
                .clone()
                .multiply(placement(aperture));
              const shape = openingShape(aperture).map(([x, z]) => {
                const point = transform([x, 0, z], localPlacement);
                return [point[0], point[2], 0] as V3;
              });
              const wallSilhouette = wallSilhouettes.get(node.id);
              let silhouettes = wallSilhouette ? [wallSilhouette] : [];
              if (!wallSilhouette) {
                const inverse = node.matrix.clone().invert(),
                  local = solids.keep(
                    hostSolid.transform(kernelMatrix(inverse)),
                  );
                const section = solids.section(
                  solids.keep(local.rotate([-90, 0, 0])).project(),
                );
                silhouettes = section
                  .toPolygons()
                  .map((loop) => loop.map(([x, z]) => [x, z, 0] as V3));
              }
              const reaches = silhouettes.some((silhouette) =>
                loopsMeet(shape, silhouette),
              );
              if (!reaches)
                resolution.fail(
                  opening.id,
                  "A notch must reach an edge of its host; use a through-opening for an enclosed aperture.",
                  "AML_OPENING",
                  [node.id],
                );
            }
            hostSolid = solids.keep(kernel.Manifold.difference(hostSolid, cut));
            if (renderedMembers)
              renderedMembers = renderedMembers
                .map((member) =>
                  solids.keep(kernel.Manifold.difference(member, cut)),
                )
                .filter((member) => !member.isEmpty());
            contributors.push(opening.id);
            resolution.provenance[opening.id].host = node.id;
          }
          members.splice(0, members.length, hostSolid);
        }
        if (
          ["panel", "glazing", "infill", "frame"].includes(element.kind) &&
          "opening" in element
        ) {
          const opening = resolution.reference(node, element.opening),
            aperture = opening.element as Aperture,
            host = resolution.reference(opening, aperture.host),
            hostResult = build(host, depth + 1);
          const detail = cutter(
            opening,
            host,
            hostResult.solids,
            element.depth,
            element.offset,
            element.kind === "frame" ? element.border : undefined,
          );
          const owner = register(node, "prop", element.kind);
          const localPlacement = resolution
            .frame(element.frame)
            .clone()
            .multiply(placement(element));
          const placed = solids.keep(
            detail.transform(
              kernelMatrix(
                host.matrix
                  .clone()
                  .multiply(localPlacement)
                  .multiply(host.matrix.clone().invert()),
              ),
            ),
          );
          members.push(solids.own(placed, owner.original));
        }
        if (element.collidable === false && members.length) {
          for (const solid of members) {
            const mesh = solid.getMesh();
            const owner = register(
              node,
              "prop",
              "native-detail",
              element.material,
              false,
            );
            openGeometry.push({
              node,
              geometry: {
                positions: Array.from(
                  { length: mesh.vertProperties.length / mesh.numProp },
                  (_, i) =>
                    Array.from(
                      mesh.vertProperties.slice(
                        i * mesh.numProp,
                        i * mesh.numProp + 3,
                      ),
                    ) as V3,
                ),
                triangles: Array.from(
                  { length: mesh.triVerts.length / 3 },
                  (_, i) =>
                    Array.from(mesh.triVerts.slice(i * 3, i * 3 + 3)) as [
                      number,
                      number,
                      number,
                    ],
                ),
              },
              surface: owner.index,
              physical: false,
            });
            if (level.exportSolids && element.visible !== false)
              level.exportSolids.push({
                positions: Array.from(
                  { length: mesh.vertProperties.length / mesh.numProp },
                  (_, i) =>
                    Array.from(
                      mesh.vertProperties.slice(
                        i * mesh.numProp,
                        i * mesh.numProp + 3,
                      ),
                    ) as V3,
                ),
                triangles: Array.from(
                  { length: mesh.triVerts.length / 3 },
                  (_, i) => Array.from(mesh.triVerts.slice(i * 3, i * 3 + 3)),
                ),
                surface: level.surfaces[owner.index],
                purpose: "visual",
              });
          }
          members.length = 0;
        }
        const guide = floorSource.get(node.id);
        if (guide) {
          const points: V3[] = [],
            triangles: [number, number, number][] = [];
          const bottomPoints: V3[] = [],
            bottomTriangles: [number, number, number][] = [];
          for (const solid of members) {
            const mesh = solid.getMesh();
            for (let i = 0; i < mesh.triVerts.length; i += 3) {
              const vertices = Array.from(
                mesh.triVerts.slice(i, i + 3),
                (index) =>
                  Array.from(
                    mesh.vertProperties.slice(
                      index * mesh.numProp,
                      index * mesh.numProp + 3,
                    ),
                  ) as V3,
              );
              const center = vertices[0].map(
                (n, axis) => (n + vertices[1][axis] + vertices[2][axis]) / 3,
              ) as V3;
              if (triangleNormal(vertices)[2] < -1e-7) {
                const base = bottomPoints.length;
                bottomPoints.push(...vertices);
                bottomTriangles.push([base, base + 1, base + 2]);
              }
              const z = heightAt(guide, center[0], center[1]);
              if (
                triangleNormal(vertices)[2] <= 1e-7 ||
                z === undefined ||
                Math.abs(z - center[2]) > 0.0001
              )
                continue;
              const base = points.length;
              points.push(...vertices);
              triangles.push([base, base + 1, base + 2]);
            }
          }
          if (hosted.length)
            floorSource.set(node.id, { ...guide, points, triangles });
          floorSoffits.set(node.id, {
            ...guide,
            points: bottomPoints,
            triangles: bottomTriangles,
          });
        }
        if (!("children" in element) && element.kind !== "instance")
          for (const solid of members) {
            const mesh = solid.getMesh();
            const positions = Array.from(
              { length: mesh.vertProperties.length / mesh.numProp },
              (_, i) =>
                Array.from(
                  mesh.vertProperties.slice(
                    i * mesh.numProp,
                    i * mesh.numProp + 3,
                  ),
                ) as V3,
            );
            let run = 0;
            for (let i = 0; i < mesh.triVerts.length; i += 3) {
              while (
                run + 1 < mesh.runOriginalID.length &&
                i >= mesh.runIndex[run + 1]
              )
                run++;
              authoredFaces.push({
                points: Array.from(
                  mesh.triVerts.slice(i, i + 3),
                  (index) => positions[index],
                ),
                surface: originalSurfaces.get(mesh.runOriginalID[run])!,
              });
            }
          }
        if (
          "profile" in element &&
          element.profile &&
          element.kind !== "opening"
        ) {
          const profile = resolution.profiles.get(element.profile);
          if (profile)
            for (const loop of profile.loops)
              level.sourceProfiles!.push({
                object: node.id,
                role: "Authored profile / local XY (m)",
                points: loop,
                closed: true,
              });
        }
        if (element.kind === "opening")
          level.sourceProfiles!.push({
            object: node.id,
            role: "Opening profile / host distance and height (m)",
            points: openingShape(element).map(([x, y]) => [x, y, 0]),
            closed: true,
          });
        const result = {
          solids: members,
          renderSolids:
            element.visible === false ? [] : (renderedMembers ?? members),
          contributors: [...new Set(contributors)],
        };
        resolution.provenance[node.id].contributors = result.contributors;
        built.set(node.id, result);
        inProgress.delete(node.id);
        return result;
      } catch (error) {
        if (error instanceof AmlError || (error as Error).name === "AbortError")
          throw error;
        const related =
          node.element.kind === "wall"
            ? [
                node.element.baseFloor,
                node.element.contactFloor,
                node.element.topFloor,
              ]
                .filter((id): id is string => !!id)
                .map((id) => resolution.reference(node, id).id)
            : [];
        return resolution.fail(
          node.id,
          (error as Error).message,
          "AML_GEOMETRY",
          related,
        );
      } finally {
        current = previous;
        inProgress.delete(node.id);
      }
    }

    options.onProgress?.("Building solids");
    aborted(options.signal);
    const results = resolution.roots.map((node) => build(node, 0));
    options.onProgress?.("Composing");
    aborted(options.signal);

    /** Appends final triangles with per-face contributor ownership and consistent material UVs. */
    function append(
      geometry: AssetGeometry,
      surfaceIndex: number,
      solidId = "",
    ): void {
      const surface = level.surfaces[surfaceIndex],
        repeat =
          source.materials.find((material) => material.id === surface.material)
            ?.repeat ?? 1;
      for (const triangle of geometry.triangles) {
        const points = triangle.map((index) => geometry.positions[index]),
          normal = triangleNormal(points);
        if (
          Math.hypot(
            ...cross(sub(points[1], points[0]), sub(points[2], points[0])),
          ) < 1e-12
        )
          continue;
        const base = level.mesh.positions.length / 3;
        level.mesh.positions.push(...points.flat());
        level.mesh.normals.push(...points.flatMap(() => normal));
        level.mesh.indices.push(base, base + 1, base + 2);
        level.mesh.surfaces.push(surfaceIndex);
        (level.mesh.solidIds ??= []).push(solidId);
        const axis =
          Math.abs(normal[2]) > 0.8
            ? [0, 1]
            : Math.abs(normal[1]) > 0.8
              ? [0, 2]
              : [1, 2];
        level.mesh.uv.push(
          ...points.flatMap((point) => [
            point[axis[0]] * repeat,
            point[axis[1]] * repeat,
          ]),
        );
      }
    }
    const separateRender = results.some(
      (result) => result.renderSolids !== result.solids,
    );
    const retained = new Map<
      string,
      NonNullable<CompiledArchitecture["exportSolids"]>[number]
    >();
    let solidIndex = 0;
    for (const solid of results.flatMap((result) => result.solids)) {
      const solidId = `solid:${solidIndex++}`;
      const mesh = solid.getMesh();
      budget(mesh.triVerts.length / 3);
      const positions = Array.from(
        { length: mesh.vertProperties.length / mesh.numProp },
        (_, i) =>
          Array.from(
            mesh.vertProperties.slice(i * mesh.numProp, i * mesh.numProp + 3),
          ) as V3,
      );
      const terrainOwners = Array.from(mesh.runOriginalID)
        .map((id) => level.surfaces[originalSurfaces.get(id)!])
        .filter((surface) => surface.domain === "terrain")
        .map((surface) => resolution.nodes.get(surface.object)!);
      let owner = terrainOwners[0];
      if (owner)
        for (let parent = owner.parent; parent; parent = parent.parent)
          if (["union", "subtract", "intersect"].includes(parent.element.kind))
            owner = parent;
      const triangles: {
        triangle: [number, number, number];
        surface: number;
      }[] = [];
      let run = 0;
      for (let i = 0; i < mesh.triVerts.length; i += 3) {
        while (
          run + 1 < mesh.runOriginalID.length &&
          i >= mesh.runIndex[run + 1]
        )
          run++;
        const surface = originalSurfaces.get(mesh.runOriginalID[run]);
        if (surface === undefined)
          throw new Error(
            "Solid composition lost architectural face provenance.",
          );
        triangles.push({
          triangle: [
            mesh.triVerts[i],
            mesh.triVerts[i + 1],
            mesh.triVerts[i + 2],
          ],
          surface,
        });
      }
      if (level.exportSolids && triangles.length) {
        const record = {
          positions,
          triangles: triangles.map((item) => item.triangle),
          surface: separateRender
            ? { ...level.surfaces[triangles[0].surface], visible: false }
            : level.surfaces[triangles[0].surface],
          purpose: "physical" as const,
          materialFaces: [] as { points: V3[]; surface: Surface }[],
        };
        retained.set(solidId, record);
        level.exportSolids.push(record);
      }
      if (owner) {
        current = owner.id;
        const profile = {
          points: positions,
          triangles: triangles.map((item) => item.triangle),
          loops: [],
        };
        const partitioned = partitionTerrain(
          profile,
          new Matrix4(),
          [64, 64],
          limits.terrainTiles - (level.terrainTiles?.length ?? 0),
          options.onProgress,
          owner.id,
          options.signal,
        );
        const ownership = new Map(
          triangles.map((item) => [item.triangle, item.surface]),
        );
        const metadata = await terrainTileMetadata(
          owner.id,
          partitioned,
          partitioned.tileRanges,
          options.signal,
          spendDependency,
        );
        const start = level.mesh.surfaces.length;
        for (const triangle of partitioned.triangles)
          append(
            { positions, triangles: [triangle] },
            ownership.get(triangle)!,
            solidId,
          );
        (level.terrainTiles ??= []).push(
          ...metadata.map((tile) => ({
            ...tile,
            triangleStart: tile.triangleStart + start,
          })),
        );
      } else
        for (const item of triangles)
          append(
            { positions, triangles: [item.triangle] },
            item.surface,
            solidId,
          );
    }
    const renderOnly: { geometry: AssetGeometry; surface: number }[] = [];
    for (const item of openGeometry) {
      current = item.node.id;
      if (item.node.element.kind === "visual-mesh") {
        if (!options.resolveAsset)
          throw new Error(
            `Supply resolveAsset to load visualization mesh ${item.node.element.src}.`,
          );
        const geometry = await options.resolveAsset(
          { id: item.node.id, src: item.node.element.src },
          options.signal,
        );
        aborted(options.signal);
        validateMeshData(geometry);
        budget(geometry.triangles.length);
        const positions = geometry.positions.map((point) =>
          transform(point, item.node.matrix),
        );
        const triangles =
          item.node.matrix.determinant() < 0
            ? geometry.triangles.map(([a, b, c]): [number, number, number] => [
                c,
                b,
                a,
              ])
            : geometry.triangles;
        renderOnly.push({
          geometry: { positions, triangles },
          surface: item.surface,
        });
      } else if (item.node.element.kind === "terrain") {
        const start = level.mesh.surfaces.length,
          profile = terrainProfiles.get(item.node.id)!;
        const repeat =
          source.materials.find(
            (material) => material.id === level.surfaces[item.surface].material,
          )?.repeat ?? 1;
        appendTerrainMesh(
          level.mesh,
          profile,
          item.surface,
          repeat,
          options.signal,
          options.terrainCache
            ? {
                cache: options.terrainCache,
                tiles: terrainMetadata.get(item.node.id)!,
                stats: level.stats,
              }
            : undefined,
        );
        if (
          (level.terrainTiles?.length ?? 0) +
            terrainMetadata.get(item.node.id)!.length >
          limits.terrainTiles
        )
          throw new Error("Terrain tile budget exceeded.");
        (level.terrainTiles ??= []).push(
          ...terrainMetadata
            .get(item.node.id)!
            .map((tile) => ({
              ...tile,
              triangleStart: tile.triangleStart + start,
            })),
        );
      } else append(item.geometry, item.surface);
    }
    options.onProgress?.("Physical surfaces");
    aborted(options.signal);
    // Derive walking tops from surviving physical faces, never from pre-cut floor guides.
    const finalFloors = new Map<string, FloorPatch>();
    const openTerrains = new Set(
      openGeometry
        .filter((item) => item.node.element.kind === "terrain")
        .map((item) => item.node.id),
    );
    for (const id of openTerrains) {
      const node = resolution.nodes.get(id)!,
        patch = floorSource.get(id)!;
      if (
        node.element.kind === "terrain" &&
        node.element.collidable !== false &&
        node.element.orientation !== "down"
      )
        finalFloors.set(id, {
          ...patch,
          navigationRequired: node.element.playable,
        });
    }
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      const surface = level.surfaces[level.mesh.surfaces[t]],
        fill = floorKinds.get(surface.object);
      if (openTerrains.has(surface.object)) continue;
      if (!fill || fill === "water" || surface.collidable === false) continue;
      const node = resolution.nodes.get(surface.object)!;
      if (
        (node.element.kind === "roof" || node.element.kind === "canopy") &&
        !node.element.playable
      )
        continue;
      const points = level.mesh.indices
        .slice(t * 3, t * 3 + 3)
        .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
      if (triangleNormal(points)[2] <= 1e-7) continue;
      if (fill === "stairs" && triangleNormal(points)[2] < 1 - 1e-6) continue;
      const guide = floorSource.get(surface.object);
      const center = [0, 1, 2].map((axis) =>
        points.reduce((sum, point) => sum + point[axis] / 3, 0),
      ) as V3;
      if (guide) {
        const z = heightAt(guide, center[0], center[1]);
        if (z === undefined || Math.abs(z - center[2]) > 0.0001) continue;
      }
      const patch = finalFloors.get(surface.object) ?? {
        region: surface.object,
        layer: surface.layer,
        area: floorAreas.get(surface.object),
        points: [],
        triangles: [],
        loops: floorSource.get(surface.object)?.loops ?? [],
      };
      if (node.element.kind === "terrain")
        patch.navigationRequired = node.element.playable;
      const base = patch.points.length;
      patch.points.push(...points);
      patch.triangles.push([base, base + 1, base + 2]);
      finalFloors.set(surface.object, patch);
    }
    level.floors = [...finalFloors.values()];
    runtimeGuides(level, resolution, wallPaths, flightRails, floorSource);
    if (!context.layers.length)
      context.layers.push({
        id: "architecture",
        vertices: [],
        edges: [],
        regions: [],
      });
    level.semantic.nodes = [
      ...new Set(level.floors.map((floor) => floor.area ?? floor.region)),
    ];
    for (const connection of source.connections) {
      const from = level.floors.find(
          (floor) => floor.region === connection.from,
        ),
        to = level.floors.find((floor) => floor.region === connection.to);
      if (!from || !to) {
        current = connection.id;
        fail(
          "Declared connection is missing final physical support.",
          "AML_CONNECTION_SUPPORT",
          [connection.id, connection.from, connection.to],
        );
        continue;
      }
      level.semantic.edges.push([
        from.area ?? from.region,
        to.area ?? to.region,
      ]);
    }
    for (const link of source.links) {
      if (
        !link.ability ||
        (source.player as unknown as Record<string, unknown>)[link.ability] !==
          true
      )
        continue;
      const endpoint = (point: V3, area?: string) =>
        level.floors.find(
          (floor) =>
            (!area || floor.region === area || floor.area === area) &&
            Math.abs(
              (heightAt(floor, point[0], point[1]) ?? Infinity) - point[2],
            ) <=
              source.player.step + 0.001,
        );
      const from = endpoint(link.from, link.fromArea),
        to = endpoint(link.to, link.toArea);
      if (from && to)
        level.semantic.edges.push([
          from.area ?? from.region,
          to.area ?? to.region,
        ]);
    }
    level.physicalMesh = level.mesh;
    repairWaterPrecision(level, {
      ...(typeof options.navigation === "object" ? options.navigation : {}),
      signal: options.signal,
    });
    diagnostics.push(
      ...auditSpatialVolumes(
        level,
        solids,
        options.signal,
        limits.spatialQueries,
      ),
    );
    diagnostics.push(
      ...auditSharedEdges(
        level,
        resolution,
        built,
        terrainProfiles,
        originalSurfaces,
        limits.spatialQueries,
        options.signal,
      ),
    );
    options.onProgress?.("Resolving face materials");
    aborted(options.signal);
    if (separateRender) {
      level.mesh = emptyMesh();
      let rendered = 0;
      for (const solid of results.flatMap((result) => result.renderSolids)) {
        const mesh = solid.getMesh(),
          positions = Array.from(
            { length: mesh.vertProperties.length / mesh.numProp },
            (_, i) =>
              Array.from(
                mesh.vertProperties.slice(
                  i * mesh.numProp,
                  i * mesh.numProp + 3,
                ),
              ) as V3,
          );
        let run = 0;
        for (let i = 0; i < mesh.triVerts.length; i += 3) {
          aborted(options.signal);
          while (
            run + 1 < mesh.runOriginalID.length &&
            i >= mesh.runIndex[run + 1]
          )
            run++;
          const surface = originalSurfaces.get(mesh.runOriginalID[run]);
          if (surface === undefined)
            throw new Error("Render composition lost face provenance.");
          append(
            {
              positions,
              triangles: [
                [mesh.triVerts[i], mesh.triVerts[i + 1], mesh.triVerts[i + 2]],
              ],
            },
            surface,
            `render:${rendered}`,
          );
        }
        if (level.exportSolids && mesh.triVerts.length) {
          const surface =
            level.surfaces[originalSurfaces.get(mesh.runOriginalID[0])!];
          const record = {
            positions,
            triangles: Array.from(
              { length: mesh.triVerts.length / 3 },
              (_, i) => Array.from(mesh.triVerts.slice(i * 3, i * 3 + 3)),
            ),
            surface: { ...surface, collidable: false },
            purpose: "visual" as const,
            materialFaces: [] as { points: V3[]; surface: Surface }[],
          };
          retained.set(`render:${rendered}`, record);
          level.exportSolids.push(record);
        }
        rendered++;
      }
      for (const item of openGeometry)
        if (item.node.element.kind !== "visual-mesh") {
          if (item.node.element.kind === "terrain") {
            const repeat =
              source.materials.find(
                (material) =>
                  material.id === level.surfaces[item.surface].material,
              )?.repeat ?? 1;
            appendTerrainMesh(
              level.mesh,
              terrainProfiles.get(item.node.id)!,
              item.surface,
              repeat,
              options.signal,
            );
          } else append(item.geometry, item.surface);
        }
      if (level.mesh.surfaces.length > limits.triangles)
        throw new Error("Render composition triangle budget exceeded.");
    }
    level.mesh = applyFaceMaterials(
      level.mesh,
      level.surfaces,
      resolution,
      authoredFaces,
      diagnostics,
      limits.triangles,
      options.signal,
    );
    if (renderOnly.length && level.mesh === level.physicalMesh)
      level.mesh = structuredClone(level.mesh);
    if (retained.size)
      for (let t = 0; t < level.mesh.surfaces.length; t++) {
        const record = retained.get(level.mesh.solidIds?.[t] ?? "");
        if (record)
          record.materialFaces!.push({
            points: level.mesh.indices
              .slice(t * 3, t * 3 + 3)
              .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3),
            surface: level.surfaces[level.mesh.surfaces[t]],
          });
      }
    for (const item of renderOnly) append(item.geometry, item.surface);
    level.parts = meshParts(level.mesh, level.surfaces);
    if (options.floorGaps !== false) {
      const terrain = new Set(
        [...resolution.nodes.values()]
          .filter((node) => node.element.kind === "terrain")
          .map((node) => node.id),
      );
      const floors = new Set(level.floors.map((floor) => floor.region));
      const architectural = {
        ...level,
        floors: level.floors.filter((floor) => !terrain.has(floor.region)),
        document: {
          ...context,
          layers: context.layers.map((layer) => ({
            ...layer,
            regions: layer.regions.filter(
              (region) => floors.has(region.id) && !terrain.has(region.id),
            ),
          })),
        },
      };
      diagnostics.push(
        ...auditFloorGaps(
          architectural,
          options.floorGaps ?? "warning",
          options.signal,
        ),
      );
    }
    const physical = collisionMesh(level, true);
    const solidGroups = new Map<string, number>();
    const solidIds = physical.solidIds?.map((id) => {
      if (!id) return -1;
      if (!solidGroups.has(id)) solidGroups.set(id, solidGroups.size);
      return solidGroups.get(id)!;
    });
    const surfaceGroups = new Map<string, number>(),
      physicalSurfaces: unknown[] = [];
    const surfaceIds = physical.surfaces.map((index) => {
      const surface = level.surfaces[index],
        record = [
          surface.object,
          surface.role,
          surface.mesh,
          surface.dynamic,
          surface.closed,
        ],
        key = JSON.stringify(record);
      if (!surfaceGroups.has(key)) {
        surfaceGroups.set(key, surfaceGroups.size);
        physicalSurfaces.push(record);
      }
      return surfaceGroups.get(key)!;
    });
    level.physicalHash = await hash({
      positions: physical.positions,
      indices: physical.indices,
      solidIds,
      surfaces: physicalSurfaces,
      surfaceIds,
    });
    level.renderHash = await hash({
      mesh: level.mesh,
      materials: source.materials,
    });
    level.geometryHash = level.physicalHash;
    if (options.surfaceContacts !== false) {
      const physicalSurfaces = level.surfaces.map((surface) =>
        surface.role === "visual-mesh"
          ? { ...surface, visible: false }
          : surface,
      );
      diagnostics.push(
        ...auditTerrainPolicy(
          { ...level, surfaces: physicalSurfaces },
          resolution,
          options.surfaceContacts ?? "error",
          limits.spatialQueries,
          options.signal,
        ),
      );
    }
    level.stats = {
      ...level.stats,
      meshes: level.parts.length,
      triangles: level.mesh.indices.length / 3,
      vertices: level.mesh.positions.length / 3,
      regions: level.floors.length,
      architecturalObjects: resolution.nodes.size,
    };
    if (!diagnostics.some((diagnostic) => diagnostic.severity === "error"))
      level.suggestions = await auditSuggestions(level, options.signal);
    options.onGeometry?.(level);
    if (
      !diagnostics.some((diagnostic) => diagnostic.severity === "error") &&
      options.navigation !== false
    ) {
      options.onProgress?.("Navigation");
      aborted(options.signal);
      const navigation =
        typeof options.navigation === "object" ? options.navigation : {};
      await bakeNavmesh(level, { ...navigation, signal: options.signal });
      await validateForRuntime(level, {
        ...navigation,
        signal: options.signal,
      });
    }
    if (
      options.uvs &&
      !diagnostics.some((diagnostic) => diagnostic.severity === "error")
    )
      await generateUVs(level, { ...options.uv, signal: options.signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    if (error instanceof AmlError) diagnostics.push(...error.diagnostics);
    else if (error instanceof ClippingError) diagnostics.push(error.diagnostic);
    else fail((error as Error).message);
  } finally {
    session?.dispose();
  }
  level.navigationSuggestionsStatus = level.navigation
    ? "complete"
    : "unavailable";
  return level;
}
