import type { V3 } from "../../../architecture/types.ts";
import type { Pen } from "../../pen.ts";
import catalog from "./assets/grocer-props.json" with { type: "json" };
import appearances from "./assets/stock-appearances.json" with { type: "json" };
import bagClusters from "./assets/bag-clusters.json" with { type: "json" };
import { rotated } from "./forms.ts";
import type { LineMaker } from "./goods.ts";

/** Approved, offline-baked props; ordinary compilation never contacts the provider. */
export type GrocerProp = keyof typeof catalog;
interface PropMesh {
  size: number[];
  faces: number[][][];
  paintedFaces?: number[][][];
}
const WHITE: V3 = [1, 1, 1];
interface Appearance {
  source: number[];
  variants: { uv: number[]; colors: number[][][] }[];
}
interface PropOptions {
  tint?: V3;
  base?: "visible" | "supported";
  /** Zero retains the original artwork; positive values select the asset’s baked label variants. */
  variant?: number;
  /** Baked contact deformation: source-ordered corner positions/normals, retaining the asset's UVs and material. */
  shape?: number[][][];
}

/** Uniformly fits props; regular counter and shipping-box shells adapt to their required rectangular envelopes. */
export function propSize(name: GrocerProp, envelope: V3): V3 {
  if (name === "shop-counter" || name === "stock-box") return [...envelope];
  const size = catalog[name].size;
  const scale = Math.min(...size.map((value, axis) => envelope[axis] / value));
  return size.map(value => value * scale) as V3;
}

/**
 * Draws a prop centered on its bottom at `at`, facing -Y before local yaw.
 * The optional atlas retains PBR maps; absent finishes use sampled vertex colors.
 * Supported bases omit planar contact faces hidden by a shelf or aligned stack.
 */
export function grocerProp(pen: Pen, name: GrocerProp, at: V3, envelope: V3, yaw = 0, options: PropOptions = {}): V3 {
  const { tint = WHITE, base = "visible", variant = 0 } = options;
  const asset: PropMesh = catalog[name];
  const appearance = (appearances as Partial<Record<GrocerProp, Appearance>>)[name];
  const selected = appearance?.variants[variant - 1];
  const size = propSize(name, envelope);
  const scale = size.map((value, axis) => value / asset.size[axis]);
  const local = rotated(pen, at, "z", yaw);
  const hasTexture = pen.mesh.textured("grocer-props");
  const sign = pen.mirrored ? -1 : 1;
  for (const [faces, textured] of [[asset.faces, hasTexture], [asset.paintedFaces ?? [], false]] as const)
  for (const [faceIndex, face] of faces.entries()) {
    if (base === "supported" && face.every(vertex => vertex[2] <= 0.00001)) continue;
    const geometry = faces === asset.faces ? options.shape?.[faceIndex] ?? face : face;
    const points = geometry.map(vertex => [vertex[0] * scale[0] * sign,
      vertex[1] * scale[1], vertex[2] * scale[2]] as V3);
    const normals = geometry.map(vertex => {
      const normal = [vertex[3] * sign / scale[0], vertex[4] / scale[1], vertex[5] / scale[2]];
      const length = Math.hypot(...normal);
      return normal.map(value => value / length) as V3;
    });
    const hint = normals.reduce((sum, normal) => sum.map((value, axis) => value + normal[axis]) as V3, [0, 0, 0] as V3);
    local.face(textured ? "grocer-props" : "paint", points, hint,
      textured ? tint : point => {
        const index = points.indexOf(point);
        const color = faces === asset.faces && selected ? selected.colors[faceIndex][index] : face[index].slice(8, 11);
        return color.map((value, axis) => value * tint[axis]) as V3;
      }, face.map(vertex => vertex.slice(6, 8).map((coordinate, axis) => {
        if (!selected || !appearance || faces !== asset.faces) return coordinate;
        const unit = (coordinate - appearance.source[axis]) / (appearance.source[axis + 2] - appearance.source[axis]);
        return selected.uv[axis] + unit * (selected.uv[axis + 2] - selected.uv[axis]);
      })), normals);
  }
  return size;
}

type BagProp = keyof typeof bagClusters;

/** Uniformly fits a varied bag arrangement, including its flattened contact patches. */
export function bagClusterSize(name: BagProp, envelope: V3, mirrored = false, arrangement = 0): V3 {
  const profile = bagClusters[name][mirrored ? "mirrored" : "regular"][arrangement];
  const scale = Math.min(...profile.size.map((value,axis)=>envelope[axis]/value));
  return profile.size.map(value=>value*scale) as V3;
}

/** Draws three differently sized/facing bags whose contact sides are locally flattened, centered on the whole group. */
export function bagCluster(pen: Pen, name: BagProp, at: V3, envelope: V3, yaw = 0, variant = 1, arrangement = 0): void {
  const profile = bagClusters[name][pen.mirrored ? "mirrored" : "regular"][arrangement];
  const size = bagClusterSize(name,envelope,pen.mirrored,arrangement);
  const scale = size[2]/profile.size[2];
  const local = rotated(pen,at,"z",yaw);
  for (const pose of profile.poses) {
    const position = pose.at.map(value=>value*scale) as V3;
    const bodySize = catalog[name].size.map(value=>value*pose.scale*scale) as V3;
    grocerProp(local,name,position,bodySize,pose.yaw,{variant:(variant-1+pose.labelOffset)%4+1,shape:pose.shape});
  }
}

/** Offers a whole touching group as one shelf unit, so stocking preserves its internal support relationship. */
function bagLine(): LineMaker {
  return rng => {
    const variation = rng.float(.88,1);
    const envelope = [.41,.17,.22].map(value=>value*variation) as V3;
    let arrangement = rng.int(0,3);
    const sizes = [0,1,2,3].flatMap(index => [
      bagClusterSize("dry-goods-bag",envelope,false,index),
      bagClusterSize("dry-goods-bag",envelope,true,index),
    ]);
    const size = [0,1,2].map(axis=>Math.max(...sizes.map(bounds=>bounds[axis]))) as V3;
    let variant = rng.int(1,4);
    return {
      width:size[0]+.002,depth:size[1]+.002,height:size[2],stack:1,
      draw: (pen,at) => {
        bagCluster(pen,"dry-goods-bag",at,envelope,0,variant,arrangement);
        variant = variant%4+1;
        arrangement = (arrangement+1)%4;
      },
    };
  };
}

/** Makes a shelf product with measured bounds and stacking pitch; each drawing advances its label palette. */
function line(name: GrocerProp, envelope: V3, stack: number): LineMaker {
  return rng => {
    const variation = rng.float(0.88, 1);
    const size = propSize(name, envelope.map(value => value * variation) as V3);
    const tint: V3 = [rng.float(0.94, 1), rng.float(0.94, 1), rng.float(0.94, 1)];
    const variantCount = (appearances as Partial<Record<GrocerProp, Appearance>>)[name]?.variants.length ?? 1;
    let variant = rng.int(1, variantCount);
    return {
      width: size[0] + 0.002, depth: size[1] + 0.002, height: size[2], stack,
      draw: (pen, at) => {
        grocerProp(pen, name, at, size, 0, { tint, base: "supported", variant });
        variant = variant % variantCount + 1;
      },
    };
  };
}

/** Shelf categories for the provisions store; other trades retain their own stock. */
export const GROCER_LINES = {
  bottles: line("drink-bottle", [0.075, 0.075, 0.28], 1),
  tins: line("food-tin", [0.09, 0.09, 0.12], 3),
  cartons: line("tea-carton", [0.14, 0.10, 0.21], 2),
  rolls: line("tissue-roll", [0.11, 0.11, 0.1], 3),
  jars: line("seasoning-jar", [0.11, 0.11, 0.16], 1),
  bigJars: line("seasoning-jar", [0.17, 0.17, 0.26], 1),
  smallJars: line("seasoning-jar", [0.075, 0.075, 0.115], 2),
  smallBottles: line("drink-bottle", [0.052, 0.052, 0.17], 1),
  smallTins: line("food-tin", [0.065, 0.065, 0.075], 3),
  largeTins: line("food-tin", [0.13, 0.13, 0.18], 2),
  dryBags: bagLine(),
  boxes: line("stock-box", [0.30, 0.21, 0.19], 2),
  tallBoxes: line("stock-box", [0.20, 0.19, 0.29], 1),
};
