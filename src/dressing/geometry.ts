import { BoxGeometry, Matrix4, Vector3 } from "three";
import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { Rng } from "../generate/rng.ts";
import { aborted } from "../vector/types.ts";
import type { MeshData } from "../vector/types.ts";
import type { TriangleSurvey } from "./triangle-survey.ts";

/** Appends a triangle with explicit visual attributes to a detached render mesh. */
export function triangle(
  mesh: MeshData,
  points: V3[],
  normal: V3,
  uv: number[][],
  colors: V3[],
  surface: number,
  solid = "",
) {
  const first = mesh.positions.length / 3;
  for (let corner = 0; corner < 3; corner++) {
    const point = points[corner], coordinates = uv[corner], color = colors[corner];
    mesh.positions.push(point[0], point[1], point[2]);
    mesh.normals.push(normal[0], normal[1], normal[2]);
    mesh.uv.push(coordinates[0], coordinates[1]);
    mesh.colors!.push(color[0], color[1], color[2]);
  }
  mesh.indices.push(first, first + 1, first + 2);
  mesh.surfaces.push(surface);
  mesh.solidIds?.push(solid);
}

/** One shared render budget applies to every generated part in a compilation. */
export interface KitBudget {
  maximumTriangles: number;
  signal?: AbortSignal;
}

/** Builds reusable kit parts in a right-handed local frame, retaining source ancestry. */
export class KitGeometry {
  private level: CompiledArchitecture;
  readonly host: string;
  readonly matrix: Matrix4;
  readonly layer: string;
  private budget: KitBudget;
  private readonly survey?: TriangleSurvey;
  constructor(
    level: CompiledArchitecture,
    host: string,
    matrix: Matrix4,
    layer: string,
    budget: KitBudget,
    survey?: TriangleSurvey,
  ) {
    this.level = level;
    this.host = host;
    this.matrix = matrix;
    this.layer = layer;
    this.budget = budget;
    this.survey = survey;
  }

  /** Adds an axis-aligned local box with linear color modulation and world-space normals. */
  box(
    name: string,
    lo: V3,
    size: V3,
    material: string,
    tint: V3 = [1, 1, 1],
    role = "visual-mesh",
    weather?: (point: V3) => V3,
  ) {
    aborted(this.budget.signal);
    const segments = size.map((value) =>
      weather ? Math.max(1, Math.ceil(value / 0.65)) : 1,
    );
    const [sx, sy, sz] = segments;
    const triangles = 4 * (sx * sy + sx * sz + sy * sz);
    if (
      (this.survey?.triangleCount ?? this.level.mesh.surfaces.length) + triangles >
      this.budget.maximumTriangles
    )
      throw new Error("Dressing triangle budget exceeded.");
    const id = `${this.host}/$dressing/${name}`;
    if (this.level.provenance[id])
      throw new Error(`Generated dressing identity is occupied: ${id}`);
    const source = this.level.provenance[this.host];
    this.level.provenance[id] = {
      id,
      sourceId: source?.sourceId ?? this.host,
      source: source?.source,
      host: this.host,
      instances: [],
      contributors: [this.host],
    };
    const surface = this.level.surfaces.length;
    this.level.surfaces.push({
      id,
      object: id,
      mesh: this.host,
      kind: "prop",
      role,
      layer: this.layer,
      material,
      dynamic: false,
      collidable: false,
      visible: true,
      closed: true,
      domain: "visualization",
    });
    const geometry = new BoxGeometry(...size, sx, sy, sz).toNonIndexed();
    geometry.translate(
      lo[0] + size[0] / 2,
      lo[1] + size[1] / 2,
      lo[2] + size[2] / 2,
    );
    const localPositions = geometry.getAttribute("position").clone();
    const localNormals = geometry.getAttribute("normal").clone();
    geometry.applyMatrix4(this.matrix);
    const repeat = this.level.document.materials.find(
      (entry) => entry.id === material,
    )!.repeat;
    const phase = new Rng(`${this.host}/${name}`).float(0, 100);
    const orientation = Math.floor(phase) % 2 ? -1 : 1;
    const positions = geometry.getAttribute("position"),
      normals = geometry.getAttribute("normal");
    for (let i = 0; i < positions.count; i += 3) {
      const points = [0, 1, 2].map(
        (j) =>
          [
            positions.getX(i + j),
            positions.getY(i + j),
            positions.getZ(i + j),
          ] as V3,
      );
      const local = [0, 1, 2].map(
        (j) =>
          [
            localPositions.getX(i + j),
            localPositions.getY(i + j),
            localPositions.getZ(i + j),
          ] as V3,
      );
      if (this.matrix.determinant() < 0) {
        points.reverse();
        local.reverse();
      }
      const normal: V3 = [normals.getX(i), normals.getY(i), normals.getZ(i)];
      const axes =
        Math.abs(localNormals.getZ(i)) > 0.8
          ? [0, 1]
          : Math.abs(localNormals.getY(i)) > 0.8
            ? [0, 2]
            : [1, 2];
      const uv = local.map((p) => [
        p[axes[0]] * repeat * orientation + phase,
        p[axes[1]] * repeat * orientation + phase * 0.37,
      ]);
      const colors = local.map((p) =>
        weather
          ? (weather(p).map((value, axis) => value * tint[axis]) as V3)
          : tint,
      );
      if (this.survey) {
        for (const point of points) this.survey.positions.push(point[0], point[1], point[2]);
        continue;
      }
      triangle(
        this.level.mesh,
        points,
        normal,
        uv,
        colors,
        surface,
      );
    }
    geometry.dispose();
  }
}

/** Wall coordinates are along the façade, outward, and up, all in meters. */
export function wallFrame(origin: V3, tangent: V3, normal: V3): Matrix4 {
  return new Matrix4()
    .makeBasis(
      new Vector3(...tangent),
      new Vector3(...normal),
      new Vector3(0, 0, 1),
    )
    .setPosition(...origin);
}
