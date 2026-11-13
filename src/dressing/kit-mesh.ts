import type { CompiledArchitecture, V3 } from "../architecture/types.ts";
import { aborted } from "../vector/types.ts";
import type { KitBudget } from "./geometry.ts";
import { KitSurfaces, type SurfaceDeposit } from "./kit-surfaces.ts";
import type { SurfaceChart } from "./surface/types.ts";
import type { TriangleSurvey } from "./triangle-survey.ts";

/**
 * Semantic finishes bound by kitFinishes to shared library roles or whole-material
 * AML overrides. Paint and room-back panes use plain vertex tints; glass is transparent.
 * Cloth, aircon, lettering, posters and shop-stock roles have dedicated atlas UVs.
 * Tarp uses metric repeating canvas maps. All finishes accept linear vertex tints.
 */
export type KitSlot =
  | "posters"
  | "wall"
  | "concrete"
  | "render-weathered"
  | "render-repair"
  | "paint"
  | "metal"
  | "brushed-metal"
  | "sheet"
  | "timber"
  | "shop-timber"
  | "restaurant-surfaces"
  | "restaurant-tiles"
  | "restaurant-food"
  | "pane"
  | "glass"
  | "display-glass"
  | "interior-lit"
  | "lettering"
  | "board"
  | "rust"
  | "balcony-plants"
  | "balcony-cloth"
  | "cloth"
  | "tarp"
  | "aircon"
  | "market-apple"
  | "snack-packet"
  | "grocer-props"
  | SubstrateSlot;

/** A wall substrate from the dressing's `wall-materials` palette, by palette index. */
export type SubstrateSlot = `substrate-${number}`;

/** Rounds to a fixed decimal grid so saved previews stay compact and stable. */
const rounded = (value: number, scale: number) =>
  Math.round(value * scale) / scale;

/**
 * Collects one host's generated triangles into a few render surfaces, one per
 * named part and material, instead of one surface per primitive. Objects are
 * named `<host>/$dressing/<part>` and inherit the host's source ancestry.
 * Everything appended is visual only: never collidable, never navigable. No
 * part takes the `roof` role: a sealed visual mass has no interior to reveal,
 * so its roof stays visible when the reviewer hides authored roofs.
 */
export class KitMesh {
  private level: CompiledArchitecture;
  private readonly host: string;
  private readonly layer: string;
  private readonly materials: Record<KitSlot, string>;
  private budget: KitBudget;
  private readonly surfaces = new Map<string, number>();
  private readonly repeats: Partial<Record<KitSlot, number>> = {};
  private readonly receiving: KitSurfaces;
  /** When present, drawing appends only triangle corners here and leaves the render mesh untouched. */
  readonly survey?: TriangleSurvey;

  constructor(
    level: CompiledArchitecture,
    host: string,
    layer: string,
    materials: Record<KitSlot, string>,
    budget: KitBudget,
    survey?: TriangleSurvey,
  ) {
    this.level = level;
    this.host = host;
    this.layer = layer;
    this.materials = materials;
    this.budget = budget;
    this.survey = survey;
    this.receiving = new KitSurfaces(level);
    for (const [slot, id] of Object.entries(materials))
      this.repeats[slot as KitSlot] =
        level.document.materials.find((m) => m.id === id)?.repeat ?? 1;
  }

  /** Texture repeats per meter of the material bound to `slot`. */
  repeat(slot: KitSlot): number {
    return this.repeats[slot] ?? 1;
  }

  /** Material identity bound to a kit slot, for shared surface recipes. */
  material(slot: KitSlot): string {
    return this.materials[slot];
  }

  /** Physical repeat and roughness for a shared source outside the kit's named slots. */
  sourceAppearance(id: string): { repeat: number; roughness: number } {
    const material = this.level.document.materials.find(material => material.id === id);
    if (!material) throw new Error(`Unknown shared material ${id}.`);
    return { repeat: material.repeat, roughness: material.roughness };
  }

  /** Whether an authored finish explicitly requires geometric displacement. */
  hasHeight(slot: KitSlot): boolean {
    return !!this.level.document.materials.find(material => material.id === this.materials[slot])?.heightTexture;
  }

  /** Current append position, used to name a contiguous receiving triangle range. */
  get triangleCount(): number {
    return this.survey?.triangleCount ?? this.level.mesh.surfaces.length;
  }

  /** Records a sparse finish receiver without exposing the mutable compiled level to kit callers. */
  receive(chart: Omit<SurfaceChart, "host">): void {
    if (this.survey) return;
    this.receiving.receive({ ...chart, host: this.host,
      id: `${this.host}/$receiver/${chart.id}`,
      mergeGroup: chart.mergeGroup === undefined ? undefined : `${this.host}/$receiver/${chart.mergeGroup}` });
  }

  /**
   * Continues deferred drawing into an assembled level. Existing surfaces were
   * appended at surfaceOffset and live receiver objects have already been moved.
   * Pens keep this collector, including its deposits and material-slot bindings.
   */
  retarget(level: CompiledArchitecture, budget: KitBudget, surfaceOffset: number): void {
    for (const [key, index] of this.surfaces) this.surfaces.set(key, index + surfaceOffset);
    this.level = level;
    this.budget = budget;
    this.receiving.retarget(level);
  }

  /** Applies a thin deposit to actual wall receivers in the same plane. */
  deposit(deposit: SurfaceDeposit): void {
    if (this.survey) return;
    this.receiving.deposit(deposit);
  }

  /** Whether a kit slot has an image texture in the compiled document. */
  textured(slot: KitSlot): boolean {
    return this.level.document.materials.some(material => material.id === this.materials[slot] && material.texture !== undefined);
  }

  /** Returns the render surface for a part and slot, registering it on first use. */
  private surface(part: string, slot: KitSlot): number {
    return this.finished(part, slot, this.materials[slot]);
  }

  /**
   * Returns the render surface of a part in a named finish, registering it on
   * first use. Kit slots are finishes named after themselves; a generator
   * that brings its own materials, such as deck paving, names each of its
   * finishes and must always pass the same material for one name.
   */
  finished(part: string, finish: string, material: string): number {
    const key = `${part}|${finish}`;
    const existing = this.surfaces.get(key);
    if (existing !== undefined) return existing;
    const object = `${this.host}/$dressing/${part}`;
    const source = this.level.provenance[this.host];
    this.level.provenance[object] ??= {
      id: object,
      sourceId: source?.sourceId ?? this.host,
      source: source?.source,
      host: this.host,
      instances: [],
      contributors: [this.host],
    };
    const index = this.level.surfaces.length;
    this.level.surfaces.push({
      id: `${object}:${finish}`,
      object,
      mesh: this.host,
      kind: "prop",
      role: "visual-mesh",
      layer: this.layer,
      material,
      dynamic: false,
      collidable: false,
      visible: true,
      closed: false,
      domain: "visualization",
    });
    this.surfaces.set(key, index);
    return index;
  }

  /**
   * Appends one world-space triangle wound counter-clockwise about its normal.
   * `normal` is one face normal or three vertex normals; colors are linear RGB
   * multipliers. Throws when the compilation's shared triangle budget is spent.
   */
  add(
    part: string,
    slot: KitSlot,
    points: V3[],
    normal: V3 | V3[],
    uv: number[][],
    colors: V3[],
  ): void {
    const mesh = this.level.mesh;
    const triangleCount = this.triangleCount;
    if (triangleCount >= this.budget.maximumTriangles)
      throw new Error("Dressing triangle budget exceeded.");
    if (triangleCount % 2048 === 0) aborted(this.budget.signal);
    if (this.survey) {
      for (let corner = 0; corner < 3; corner++) {
        const point = points[corner];
        this.survey.positions.push(rounded(point[0], 1e5), rounded(point[1], 1e5), rounded(point[2], 1e5));
      }
      return;
    }
    const surface = this.surface(part, slot);
    const first = mesh.positions.length / 3;
    const perVertex = Array.isArray(normal[0]);
    for (let corner = 0; corner < 3; corner++) {
      const point = points[corner], coordinates = uv[corner], color = colors[corner];
      const shading = perVertex ? (normal as V3[])[corner] : normal as V3;
      mesh.positions.push(rounded(point[0], 1e5), rounded(point[1], 1e5), rounded(point[2], 1e5));
      mesh.normals.push(rounded(shading[0], 1e4), rounded(shading[1], 1e4), rounded(shading[2], 1e4));
      mesh.uv.push(coordinates[0], coordinates[1]);
      mesh.colors!.push(rounded(color[0], 1e3), rounded(color[1], 1e3), rounded(color[2], 1e3));
    }
    mesh.indices.push(first, first + 1, first + 2);
    mesh.surfaces.push(surface);
    mesh.solidIds?.push("");
  }
}
