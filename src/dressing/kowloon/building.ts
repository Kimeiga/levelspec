import { Matrix4, Vector3 } from "three";
import type { ResolvedElement } from "../../architecture/resolve.ts";
import type {
  CompiledArchitecture,
  Primitive,
  V3,
} from "../../architecture/types.ts";
import { spatialDiagnostic } from "../../vector/diagnostics.ts";
import { emptyMesh } from "../../vector/mesh.ts";
import type { MeshData } from "../../vector/types.ts";
import type { KitBudget } from "../geometry.ts";
import { kitFinishes } from "../kit.ts";
import { KitMesh, type KitSlot } from "../kit-mesh.ts";
import { Pen } from "../pen.ts";
import type { Dressing, DressingRule } from "../types.ts";
import { Obstacles } from "./clearance.ts";
import { GroundSupport } from "./ground-support.ts";
import {
  CLEAR_HEIGHT,
  FLUSH,
  dressFacade,
  type Facade,
  type Zone,
} from "./facade.ts";
import {
  defaultStories,
  lotBlocks,
  planLots,
  subtractRect,
  type Block,
  type Lot,
  type Rect,
} from "./massing.ts";
import { Kit } from "./kit.ts";
import { Decks } from "./deck.ts";
import { lotFinish, type LotFinish } from "./skin.ts";
import { shade } from "./palette.ts";
import { rooftop } from "./rooftop.ts";
import { Obstructions } from "../spans/scene.ts";
import { SignBook } from "./signs/book.ts";
import { BuildingJob, createBuildingLevel } from "./building-job.ts";
import { TriangleSurvey } from "../triangle-survey.ts";
import type { BuildingFootprint } from "./footprint.ts";
import { polygonBuilding, polygonLot } from "./polygon-building.ts";
import { joinFacadeCorners } from "./facade-details.ts";

/** Detail levels in rising order; the kit's detail number is an index into them. */
const DETAILS = ["low", "medium", "high"];
const HIGHEST_DETAIL = DETAILS.length - 1;

/**
 * Returns the world corners of triangles of `mesh`, nine numbers each:
 * those listed in `from`, or every triangle from index `from` onward.
 */
function triangleCorners(mesh: MeshData, from: number | number[]): Float64Array {
  const triangles = typeof from === "number" ? Array.from({ length: mesh.surfaces.length - from }, (_, index) => from + index) : from;
  const corners = new Float64Array(triangles.length * 9);
  triangles.forEach((t, index) => {
    for (let corner = 0; corner < 3; corner++)
      for (let axis = 0; axis < 3; axis++)
        corners[index * 9 + corner * 3 + axis] = mesh.positions[mesh.indices[t * 3 + corner] * 3 + axis];
  });
  return corners;
}

/** Rooftop equipment may rise this far above the authored box height, meters. */
const ROOF_ALLOWANCE = 3.5;
const PARAPET_THICKNESS = 0.14;
/** Misalignment between abutting volumes that is treated as none, meters. */
const SLIVER = 0.002;
/** The smallest building that receives shops: box width and depth in meters, and stories of its recipe. */
const SHOP_SITE = { width: 4.8, depth: 5, stories: 1 };
/** Chance that an eligible bay opens onto a shop when the recipe names none. */
const DEFAULT_SHOPS = 0.15;
/** Rooms cut into a ground story keep to this share of the footprint depth, so the rear stays solid. */
const ROOM_SHARE = 0.49;

/** One validated building recipe and the box it dresses. */
export interface BuildingRequest {
  node: ResolvedElement;
  rule: DressingRule;
  footprint?: BuildingFootprint;
}

/** A building box with its row of lots, in its own frame: front on Y=0, footprint in +X/+Y. */
interface Site {
  request: BuildingRequest;
  /** Building frame to world. */
  matrix: Matrix4;
  inverse: Matrix4;
  width: number;
  depth: number;
  height: number;
  lots: Lot[];
  /** Chance that each eligible bay opens onto a shop; 0 when the box is too small for shops. */
  shops: number;
  blocks: { block: Block; lot: Lot }[];
  /** Blocks of other buildings whose boxes align with this one, expressed in this frame. */
  foreign: Block[];
}

/**
 * Names how one side of a lot is dressed: 0 front, 1 back, 2 left, 3 right.
 * Wells show a service recess to the street; only the outer ends of the row
 * are dressed as end walls, and every other side is a party wall.
 */
function facadeRole(lot: Lot, side: number, last: number): Facade["role"] {
  if (lot.kind === "well") return side === 0 ? "well" : "party";
  if (side === 0) return "front";
  if (side === 1) return "back";
  const outerEnd = (side === 2 && lot.index === 0) || (side === 3 && lot.index === last);
  return outerEnd ? "side" : "party";
}

/** The corners of a block. */
function corners(block: Block): V3[] {
  const points: V3[] = [];
  for (const x of [block.x0, block.x1])
    for (const y of [block.y0, block.y1])
      for (const z of [block.z0, block.z1]) points.push([x, y, z]);
  return points;
}

/** The bounding block of a point set. */
function bounding(points: V3[]): Block {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]),
    zs = points.map((p) => p[2]);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
    z0: Math.min(...zs),
    z1: Math.max(...zs),
  };
}

/**
 * Generates every Kowloon building of a compilation. Buildings are planned
 * together so abutting masses hide their shared walls and keep parts out of
 * each other; each then produces an owned job, assembled in source order.
 */
export class KowloonBuildings {
  private readonly level: CompiledArchitecture;
  private readonly settings: Dressing;
  private readonly budget: KitBudget;
  private readonly obstacles: Obstacles;
  private readonly streetGround: GroundSupport;
  private readonly sites = new Map<string, Site>();
  private readonly signs = new SignBook();
  /**
   * World corners of every drawn building's triangles as they stand at the
   * highest detail, nine numbers per triangle: what the sign survey sees.
   */
  private readonly fullDetail: Float64Array[] = [];

  /**
   * Plans all building recipes. `physical` is the collision mesh used for
   * clearance and base-wall heights. `authoredRender` is the original render
   * snapshot used for visible street support; neither input mesh is mutated.
   */
  constructor(
    level: CompiledArchitecture,
    requests: BuildingRequest[],
    settings: Dressing,
    budget: KitBudget,
    physical: MeshData,
    authoredRender: MeshData,
  ) {
    this.level = level;
    this.settings = settings;
    this.budget = budget;
    // Levels without building recipes skip indexing their collision mesh.
    this.obstacles = new Obstacles(
      level,
      requests.length ? physical : { ...physical, surfaces: [] },
    );
    this.streetGround = new GroundSupport(requests.length ? authoredRender : emptyMesh(), level.surfaces);
    for (const request of requests) {
      if (request.footprint) {
        const footprint = request.footprint;
        const matrix = request.node.matrix.clone().multiply(new Matrix4().makeTranslation(0, 0, footprint.elevation));
        const lot = polygonLot(footprint, request.rule.stories ?? defaultStories(footprint.height), `${settings.seed}/${request.rule.host}`);
        this.sites.set(request.rule.host, {
          request, matrix, inverse: matrix.clone().invert(), width: footprint.width, depth: footprint.depth,
          height: footprint.height, lots: [lot], shops: 0, blocks: [], foreign: [],
        });
        continue;
      }
      const box = request.node.element as Primitive;
      const offset: V3 =
        box.anchor === "bottom-center"
          ? [-box.width / 2, -box.depth / 2, 0]
          : [0, 0, 0];
      const matrix = request.node.matrix
        .clone()
        .multiply(new Matrix4().makeTranslation(...offset));
      const inverse = matrix.clone().invert();
      const stories = request.rule.stories ?? defaultStories(box.height);
      const large =
        box.width >= SHOP_SITE.width &&
        box.depth >= SHOP_SITE.depth &&
        stories >= SHOP_SITE.stories;
      const lots = planLots(
        {
          width: box.width,
          depth: box.depth,
          height: box.height,
          stories,
          baseHeight: this.baseHeight(request.rule, inverse, physical),
        },
        `${settings.seed}/${request.rule.host}`,
      );
      const site: Site = {
        request,
        matrix,
        inverse,
        width: box.width,
        depth: box.depth,
        height: box.height,
        lots,
        shops: large ? (request.rule.shops ?? DEFAULT_SHOPS) : 0,
        blocks: lots.flatMap((lot) =>
          lotBlocks(lot, box.depth).map((block) => ({ block, lot })),
        ),
        foreign: [],
      };
      this.sites.set(request.rule.host, site);
      if (!large && (request.rule.shops ?? 0) > 0) {
        const extent: Block = { x0: 0, x1: box.width, y0: 0, y1: box.depth, z0: 0, z1: box.height };
        level.diagnostics.push({
          ...spatialDiagnostic(
            level,
            "DRESSING_NO_SHOP_FIT",
            `Shops need a building at least ${SHOP_SITE.width} m wide and ${SHOP_SITE.depth} m deep with ${SHOP_SITE.stories} or more stories; this one receives none. Remove shops or set shops="0".`,
            [request.rule.host],
            corners(extent).map((p) => new Vector3(...p).applyMatrix4(matrix).toArray() as V3),
          ),
          source: request.rule.source,
        });
      }
    }
    const sites = [...this.sites.values()];
    for (const site of sites) {
      if (site.request.footprint) {
        const footprint = site.request.footprint;
        this.obstacles.addVolume(footprint.points.flatMap(p => [0, footprint.height].map(z =>
          new Vector3(p[0], p[1], z).applyMatrix4(site.matrix).toArray() as V3)), site);
      }
      for (const { block } of site.blocks)
        this.obstacles.addVolume(
          corners(block).map((p) => new Vector3(...p).applyMatrix4(site.matrix).toArray() as V3),
          site,
        );
      for (const other of sites) {
        if (other === site) continue;
        const relative = site.inverse.clone().multiply(other.matrix);
        const e = relative.elements;
        const aligned = [e[0], e[1], e[4], e[5]].every(
          (value) => Math.abs(value) < 1e-6 || Math.abs(Math.abs(value) - 1) < 1e-6,
        );
        if (!aligned) continue;
        for (const { block } of other.blocks)
          site.foreign.push(
            bounding(corners(block).map((p) => new Vector3(...p).applyMatrix4(relative).toArray() as V3)),
          );
      }
    }
  }

  /** Returns how high a linked base wall rises above the building base, or 0 without one. */
  private baseHeight(rule: DressingRule, inverse: Matrix4, physical: MeshData): number {
    if (!rule.baseWall) return 0;
    let height = 0;
    for (let t = 0; t < physical.surfaces.length; t++) {
      if (this.level.surfaces[physical.surfaces[t]].object !== rule.baseWall) continue;
      for (const index of physical.indices.slice(t * 3, t * 3 + 3))
        height = Math.max(
          height,
          new Vector3(...physical.positions.slice(index * 3, index * 3 + 3)).applyMatrix4(inverse).z,
        );
    }
    return height;
  }

  /**
   * Generates the planned host without publishing its drawing. Geometry and
   * sign proposals are job-owned; all obstacle and street-support planning
   * remains shared and read-only. The serial caller lends its remaining budget.
   */
  generate(host: string): BuildingJob {
    const site = this.sites.get(host);
    if (!site) throw new Error(`No building was planned for ${host}.`);
    const detail = DETAILS.indexOf(this.settings.detail);
    let survey: Float64Array;
    if (detail < HIGHEST_DETAIL) {
      // The survey sees highest detail; its temporary work has the original full sketch allowance.
      const sketch = createBuildingLevel(this.level);
      const drawing = this.drawSite(site, sketch, HIGHEST_DETAIL, undefined, this.budget);
      survey = drawing.survey!.snapshot();
    }
    const level = createBuildingLevel(this.level), signs = new SignBook();
    const budget = { ...this.budget,
      maximumTriangles: this.budget.maximumTriangles - this.level.mesh.surfaces.length };
    const mesh = this.drawSite(site, level, detail, signs, budget);
    if (detail === HIGHEST_DETAIL) survey = triangleCorners(level.mesh, 0);
    return new BuildingJob(level, mesh, signs, survey!);
  }

  /** Commits one job at its rule's position and retains proposals for the single global survey. */
  append(job: BuildingJob): void {
    job.appendTo(this.level, this.budget);
    this.signs.append(job.signs);
    this.fullDetail.push(job.survey);
  }

  /**
   * Decides which proposed signs are built and appends those to the render
   * mesh; call once, after every building has been drawn. Signs are judged
   * against the buildings at their highest detail and against `authored`,
   * the render mesh before dressing, less the objects in `omitted` that
   * dressing does not render. Every proposal is recorded in the level's
   * `signPlans`.
   */
  settleSigns(authored: MeshData, omitted: ReadonlySet<string>): void {
    if (!this.sites.size) return;
    const kept: number[] = [];
    for (let t = 0; t < authored.surfaces.length; t++) {
      const surface = this.level.surfaces[authored.surfaces[t]];
      if (surface.visible !== false && !omitted.has(surface.object)) kept.push(t);
    }
    const parts = [triangleCorners(authored, kept), ...this.fullDetail];
    const corners = new Float64Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      corners.set(part, offset);
      offset += part.length;
    }
    const plans = this.signs.settle(new Obstructions(corners), () => this.level.mesh.surfaces.length);
    if (plans.length) this.level.signPlans = plans;
  }

  /**
   * Draws one planned building into owned output and returns the collector its
   * deferred sign pens retain. Without a book, sketch signs are dropped.
   */
  private drawSite(site: Site, level: CompiledArchitecture, detail: number, signs: SignBook | undefined, budget: KitBudget): KitMesh {
    const { rule, node } = site.request;
    const host = rule.host;
    const settings = this.settings;
    const finishes = kitFinishes(
      level,
      settings.finishes,
      rule.material,
      settings.wallMaterials,
    );
    const kit = new Kit(
      `${settings.seed}/${host}`,
      detail,
      rule.grime ?? settings.grime,
      rule.wear ?? settings.wear,
      finishes.lettering,
      rule.textureDensity,
      rule.rust ?? settings.rust ?? rule.wear ?? settings.wear,
    );
    kit.signs = signs ? signs.desk(host, kit) : { propose: () => {}, shopNear: () => undefined };
    const mesh = new KitMesh(level, host, node.group, finishes.materials, budget, signs ? undefined : new TriangleSurvey());
    const root = new Pen(mesh, "envelope", site.matrix, site.matrix.determinant() < 0);
    const decks = new Decks(
      level,
      mesh,
      {
        host,
        layer: node.group,
        seed: `${settings.seed}/${host}`,
        grime: kit.grime,
        wear: kit.wear,
        screed: finishes.materials.concrete,
        felt: finishes.roofing,
        fineMarks: kit.detail > 0,
      },
      budget,
    );
    for (const lot of site.lots) {
      const finish = lotFinish(kit, lot, settings.wallMaterials?.length ?? 0);
      if (site.request.footprint) {
        polygonBuilding(root, site.request.footprint, lot, kit, decks, finish, {
          exposed: (pen, rect) => this.polygonExposure(site, pen, rect),
          reach: (pen, u0, u1, z0, z1, limit) => {
            const cap = z0 < CLEAR_HEIGHT ? Math.min(limit, FLUSH) : limit;
            for (const depth of [cap, 0.9, 0.6, 0.35, FLUSH]) {
              if (depth > cap) continue;
              if (!this.obstacles.blocked(pen, [u0 + 0.02, 0.02, z0 + 0.02], [u1 - 0.02, depth, z1 - 0.02], site)) return depth;
            }
            return 0;
          },
        });
        continue;
      }
      const facades = Array.from({ length: 4 }, (_, side) => this.facade(site, lot, side, root, finish));
      joinFacadeCorners(facades);
      for (const facade of facades) dressFacade(facade, kit);
      this.shell(site, lot, root, kit, decks, finish.coat);
    }
    return mesh;
  }

  /** Clips exposed wall against actual foreign prism sections, including slanted polygon neighbors. */
  private polygonExposure(site: Site, pen: Pen, rect: Rect, polygonsOnly = false): Rect[] {
    let visible = [rect];
    const inverse = pen.matrix.clone().invert();
    for (const other of this.sites.values()) {
      if (other === site || (polygonsOnly && !other.request.footprint)) continue;
      const footprint = other.request.footprint;
      const prisms = footprint
        ? [{ points: footprint.points, bottom: 0, top: footprint.height }]
        : other.blocks.map(({ block: b }) => ({ points: [[b.x0, b.y0, 0], [b.x1, b.y0, 0], [b.x1, b.y1, 0], [b.x0, b.y1, 0]] as V3[], bottom: b.z0, top: b.z1 }));
      const relative = inverse.clone().multiply(other.matrix);
      for (const prism of prisms) {
        const loop = prism.points.map(p => new Vector3(...p).applyMatrix4(relative));
        const intervals = [SLIVER, 0.02].map(depth => {
          const crossings: number[] = [];
          for (let i = 0; i < loop.length; i++) {
            const a = loop[i], b = loop[(i + 1) % loop.length];
            if ((a.y <= depth && b.y > depth) || (b.y <= depth && a.y > depth))
              crossings.push(a.x + (b.x - a.x) * (depth - a.y) / (b.y - a.y));
          }
          return crossings.length < 2 ? undefined : [Math.min(...crossings), Math.max(...crossings)];
        });
        const [contact, occupied] = intervals;
        if (!contact || !occupied) continue;
        visible = visible.flatMap(r => subtractRect(r, {
          u0: Math.max(contact[0], occupied[0]), u1: Math.min(contact[1], occupied[1]),
          v0: loop[0].z + prism.bottom, v1: loop[0].z + prism.top,
        }, SLIVER));
      }
    }
    return visible;
  }

  /**
   * Builds one side of a lot: 0 front, 1 back, 2 left and 3 right as seen from
   * the front. Exposed wall is what remains after every other block that
   * stands against the side's plane is subtracted.
   */
  private facade(site: Site, lot: Lot, side: number, root: Pen, finish: LotFinish): Facade {
    const depth = site.depth;
    const hasBody = lot.top - lot.ground > 0.05;
    const frontal = side < 2;
    const outward = side === 0 || side === 2 ? -1 : 1;
    const groundAt = [0, depth, lot.x0, lot.x1][side];
    const bodyAt = [-lot.front, depth + lot.back, lot.x0, lot.x1][side];
    const groundSpan = frontal ? [lot.x0, lot.x1] : [0, depth];
    const bodySpan = frontal ? [lot.x0, lot.x1] : [-lot.front, depth + lot.back];
    // U grows with the tangent coordinate on the front and right sides, against it elsewhere.
    const forward = side === 0 || side === 3;
    const origin = forward ? groundSpan[0] : groundSpan[1];
    const toU = (t: number) => (forward ? t - origin : origin - t);

    /** Exposed parts of a wall rectangle on the plane `at`, in facade coordinates. */
    const exposed = (at: number, span: number[], z0: number, z1: number): Rect[] => {
      let rects: Rect[] = [{ u0: span[0], u1: span[1], v0: z0, v1: z1 }];
      for (const block of [...site.blocks.map((entry) => entry.block), ...site.foreign]) {
        const [n0, n1, t0, t1] = frontal
          ? [block.y0, block.y1, block.x0, block.x1]
          : [block.x0, block.x1, block.y0, block.y1];
        // Placements are rounded to the millimeter, so neighbors may miss or overlap by a hair.
        const covers = outward > 0 ? n0 <= at + SLIVER && n1 >= at + 0.02 : n1 >= at - SLIVER && n0 <= at - 0.02;
        if (!covers) continue;
        const hole = { u0: t0, u1: t1, v0: block.z0, v1: block.z1 };
        rects = rects.flatMap((rect) => subtractRect(rect, hole, SLIVER));
      }
      return rects.map((rect) => {
        const a = toU(rect.u0),
          b = toU(rect.u1);
        return { u0: Math.min(a, b), u1: Math.max(a, b), v0: rect.v0, v1: rect.v1 };
      }).flatMap(rect => this.polygonExposure(site, at === groundAt ? pen : bodyPen, rect, true));
    };

    const tangent: V3 = frontal ? [forward ? 1 : -1, 0, 0] : [0, forward ? 1 : -1, 0];
    const normal: V3 = frontal ? [0, outward, 0] : [outward, 0, 0];
    const corner: V3 = frontal ? [origin, groundAt, 0] : [groundAt, origin, 0];
    const pen = root.facing(corner, tangent, normal);
    const shift = frontal ? (side === 0 ? lot.front : lot.back) : 0;
    const bodyPen = pen.move(0, shift, 0);
    const bodyEnds = bodySpan.map(toU);
    return {
      role: facadeRole(lot, side, site.lots.length - 1),
      lot,
      finish,
      key: `${lot.key}/side-${side}`,
      pen,
      width: groundSpan[1] - groundSpan[0],
      shift,
      bodyU0: Math.min(...bodyEnds),
      bodyU1: Math.max(...bodyEnds),
      ground: exposed(groundAt, groundSpan, 0, lot.ground),
      body: hasBody ? exposed(bodyAt, bodySpan, lot.ground, lot.top) : [],
      reach: (zone: Zone, u0, u1, z0, z1, limit) => {
        const cap = z0 < CLEAR_HEIGHT - 1e-6 ? Math.min(limit, FLUSH) : limit;
        const zonePen = zone === "ground" ? pen : bodyPen;
        for (const depthTried of [cap, 0.9, 0.6, 0.35, FLUSH]) {
          if (depthTried > cap + 1e-9) continue;
          const lo: V3 = [u0 + 0.02, 0.02, z0 + 0.02],
            hi: V3 = [u1 - 0.02, depthTried, z1 - 0.02];
          if (hi[0] <= lo[0] || hi[2] <= lo[2]) return 0;
          if (this.obstacles.blocked(zonePen, lo, hi, site)) continue;
          if (this.crowded(site, lot, zonePen, lo, hi)) continue;
          return depthTried;
        }
        return 0;
      },
      shops: site.shops,
      frontage: (u0, u1, displayDepth, height) => {
        const groundDepth = displayDepth + 1.2;
        const lo: V3 = [u0, 0.025, 0.02];
        // An opposing shop may project another 0.65 m into the standing strip.
        const hi: V3 = [u1, groundDepth + 0.65, Math.max(2.2, height)];
        const center = lo.map((value, axis) => (value + hi[axis]) / 2) as V3;
        return this.streetGround.covers(pen, u0, u1, 0.025, groundDepth)
          && !this.obstacles.blocked(pen, lo, hi, site, site.request.rule.baseWall)
          && !this.obstacles.contains(pen.world(center), site.request.rule.baseWall)
          && !this.crowded(site, lot, pen, lo, hi);
      },
      hollow: (u0, u1, height, limit) => {
        const inward = frontal ? depth : lot.x1 - lot.x0;
        const clear = Math.min(limit, inward * ROOM_SHARE);
        const lo: V3 = [u0, -clear, 0.05],
          hi: V3 = [u1, -0.02, height];
        // The building's own base wall stands in this space by contract and blocks nothing.
        return this.obstacles.blocked(pen, lo, hi, site, site.request.rule.baseWall) ? 0 : clear;
      },
    };
  }

  /** True when a pen-local box overlaps another lot of the same building. */
  private crowded(site: Site, lot: Lot, pen: Pen, lo: V3, hi: V3): boolean {
    const points: V3[] = [];
    for (const x of [lo[0], hi[0]])
      for (const y of [lo[1], hi[1]])
        for (const z of [lo[2], hi[2]])
          points.push(new Vector3(...pen.world([x, y, z])).applyMatrix4(site.inverse).toArray() as V3);
    const box = bounding(points);
    return site.blocks.some(
      ({ block, lot: owner }) =>
        owner !== lot &&
        block.x0 < box.x1 - 1e-6 &&
        block.x1 > box.x0 + 1e-6 &&
        block.y0 < box.y1 - 1e-6 &&
        block.y1 > box.y0 + 1e-6 &&
        block.z0 < box.z1 - 1e-6 &&
        block.z1 > box.z0 + 1e-6,
    );
  }

  /**
   * Closes a lot's volume where no facade does: jetty soffits, the ledge in
   * front of a stepped-back body, the roof deck and its parapets. Then
   * furnishes the roof. `decks` paves the lot's terrace and ledge, and `coat`
   * is the wall finish the lot is built in.
   */
  private shell(site: Site, lot: Lot, root: Pen, kit: Kit, decks: Decks, coat: KitSlot): void {
    const { x0, x1 } = lot;
    const depth = site.depth;
    /** Paves a level rectangle of this lot, given by opposite corners in the building frame. */
    const pave = (name: string, lo: V3, hi: V3) =>
      decks.lay(
        `${lot.key}/${name}`,
        ([[lo[0], lo[1], lo[2]], [hi[0], lo[1], lo[2]], [hi[0], hi[1], lo[2]], [lo[0], hi[1], lo[2]]] as V3[]).map((p) => root.world(p)),
      );
    const wash = lot.style.wall;
    const hasBody = lot.top - lot.ground > 0.05;
    /** Draws the soffit under an overhanging body between two depths, facing down. */
    const soffit = (y0: number, y1: number) => {
      if (y1 - y0 < 1e-6) return;
      const z = lot.ground;
      root.face(coat, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, -1], shade(wash, 0.7));
    };
    if (!hasBody) {
      pave("deck", [x0, 0, lot.ground], [x1, depth, lot.ground]);
      return;
    }
    soffit(-lot.front, 0);
    soffit(depth, depth + lot.back);
    if (lot.front < -1e-6) pave("ledge", [x0, 0, lot.ground], [x1, -lot.front, lot.ground]);
    const y0 = -lot.front,
      y1 = depth + lot.back;
    const t = PARAPET_THICKNESS;
    // The deck spans between the parapet's inner faces so the shell has no buried surfaces.
    pave("deck", [x0 + t, y0 + t, lot.roof], [x1 - t, y1 - t, lot.roof]);
    // The parapet ring adds only its top and inner faces; the facades supply its outer faces.
    const cap = shade(wash, 0.92);
    const ix0 = x0 + t,
      ix1 = x1 - t,
      iy0 = y0 + t,
      iy1 = y1 - t;
    const { roof, top } = lot;
    const rim = (points: V3[], hint: V3) => root.face("concrete", points, hint, cap);
    rim([[x0, y0, top], [x1, y0, top], [x1, iy0, top], [x0, iy0, top]], [0, 0, 1]);
    rim([[x0, iy1, top], [x1, iy1, top], [x1, y1, top], [x0, y1, top]], [0, 0, 1]);
    rim([[x0, iy0, top], [ix0, iy0, top], [ix0, iy1, top], [x0, iy1, top]], [0, 0, 1]);
    rim([[ix1, iy0, top], [x1, iy0, top], [x1, iy1, top], [ix1, iy1, top]], [0, 0, 1]);
    rim([[ix0, iy0, roof], [ix1, iy0, roof], [ix1, iy0, top], [ix0, iy0, top]], [0, 1, 0]);
    rim([[ix0, iy1, roof], [ix1, iy1, roof], [ix1, iy1, top], [ix0, iy1, top]], [0, -1, 0]);
    rim([[ix0, iy0, roof], [ix0, iy1, roof], [ix0, iy1, top], [ix0, iy0, top]], [1, 0, 0]);
    rim([[ix1, iy0, roof], [ix1, iy1, roof], [ix1, iy1, top], [ix1, iy0, top]], [-1, 0, 0]);
    // A coping band wraps the parapet's outer top edge; front and back run through, the sides butt between them.
    const o = 0.03,
      coping = shade(lot.style.trim, 0.95),
      fixtures = root.into("fixtures");
    for (const y of [y0 - o, y1])
      fixtures.box("wall", [x0 - o, y, lot.top - 0.07], [x1 + o, y + o, lot.top], coping, "");
    for (const x of [x0 - o, x1])
      fixtures.box("wall", [x, y0, lot.top - 0.07], [x + o, y1, lot.top], coping, "bf");
    rooftop(
      root.move(x0, y0, lot.roof).into("rooftop"),
      lot,
      x1 - x0,
      y1 - y0,
      lot.top - lot.roof,
      site.height + ROOF_ALLOWANCE - lot.roof,
      kit,
    );
  }
}
