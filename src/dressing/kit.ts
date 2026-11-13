import { Matrix4 } from "three";
import { bindLibraryMaterial, type MaterialRole } from "../materials/catalog.ts";
import { Kit } from "./kowloon/kit.ts";
import type { ResolvedElement } from "../architecture/resolve.ts";
import type { CompiledArchitecture } from "../architecture/types.ts";
import { Rng } from "../generate/rng.ts";
import type { KitBudget } from "./geometry.ts";
import { KitMesh, type KitSlot } from "./kit-mesh.ts";
import { CURTAINS, lotStyle, shade, type LotStyle } from "./kowloon/palette.ts";
import { securityBars, windowUnit } from "./kowloon/windows.ts";
import { Pen } from "./pen.ts";
import type { Dressing } from "./types.ts";

/**
 * Intentionally plain paint and glazing. Vertex tints supply color; solid
 * material families are owned by the shared library.
 */
const PLAIN = {
  paint: { id: "$kowloon/paint", color: "#ffffff", roughness: 0.85, metalness: 0 },
  glass: { id: "$kowloon/glass", color: "#ffffff", opacity: 0.18, roughness: 0.12, metalness: 0 },
  "display-glass": { id: "$kowloon/display-glass", color: "#ffffff", opacity: 0.055, roughness: 0.08, metalness: 0 },
  pane: { id: "$kowloon/pane", color: "#ffffff", roughness: 0.95, metalness: 0 },
  "interior-lit": { id: "$kowloon/interior-lit", color: "#ffffff", roughness: 0.95, metalness: 0, emissive: "#ffd6a3" },
};

/** Roles an author may texture, as the suffix of `<prefix>-<role>` material ids. */
export const FINISH_ROLES = ["wall-posters","concrete","lettering", "signboard", "rust", "metal", "brushed-metal", "sheet", "timber", "shop-timber", "restaurant-surfaces", "restaurant-tiles", "restaurant-food", "roofing", "balcony-plants", "balcony-cloth", "cloth", "tarp", "aircon", "market-apple", "snack-packet", "grocer-props", "render-weathered", "render-repair"] as const;

/** Declares the kit's plain finishes once, reserving their identities. */
export function kitMaterials(level: CompiledArchitecture) {
  for (const { id, ...finish } of Object.values(PLAIN)) {
    if (level.architecture.materials.some((m) => m.id === id))
      throw new Error(`Reserved kit material ${id} is already declared.`);
    level.document.materials.push({ id, repeat: 1, ...finish, ...(id === PLAIN["interior-lit"].id
      ? { emissiveStrength: level.architecture.dressing?.timeOfDay === "night" ? 1.6 : 0 } : {}) });
  }
}

/**
 * Binds semantic roles to shipped materials, with whole-material AML prefix overrides.
 * Structural concrete never inherits a wall coating. Atlas roles retain dedicated UV contracts.
 */
export function kitFinishes(
  level: CompiledArchitecture,
  prefix: string | undefined,
  wall: string,
  substrates: string[] = [],
): { materials: Record<KitSlot, string>; lettering: boolean; roofing: string | undefined } {
  const declared = (role: (typeof FINISH_ROLES)[number]) => {
    const id = `${prefix}-${role}`;
    const exists = level.document.materials.some((m) => m.id === id);
    return prefix !== undefined && exists ? id : undefined;
  };
  const finish = (role: MaterialRole) => declared(role as (typeof FINISH_ROLES)[number])
    ?? bindLibraryMaterial(level.document.materials, role);
  return {
    materials: {
      wall,
      posters: finish("wall-posters"),
      concrete: finish("concrete"),
      "render-weathered": finish("render-weathered"),
      "render-repair": finish("render-repair"),
      paint: PLAIN.paint.id,
      metal: finish("metal"),
      "brushed-metal": finish("brushed-metal"),
      sheet: finish("sheet"),
      timber: finish("timber"),
      "restaurant-food": finish("restaurant-food"),
      "restaurant-surfaces": finish("restaurant-surfaces"),
      "restaurant-tiles": finish("restaurant-tiles"),
      "shop-timber": finish("shop-timber"),
      pane: PLAIN.pane.id,
      glass: PLAIN.glass.id,
      "display-glass": PLAIN["display-glass"].id,
      "interior-lit": PLAIN["interior-lit"].id,
      lettering: finish("lettering"),
      board: finish("signboard"),
      rust: finish("rust"),
      cloth: finish("cloth"),
      "balcony-plants": finish("balcony-plants"),
      "balcony-cloth": finish("balcony-cloth"),
      tarp: finish("tarp"),
      aircon: finish("aircon"),
      "market-apple": finish("market-apple"),
      "snack-packet": finish("snack-packet"),
      "grocer-props": finish("grocer-props"),
      ...Object.fromEntries(
        substrates.map((id, index) => [`substrate-${index}`, id]),
      ),
    },
    lettering: true,
    roofing: finish("roofing"),
  };
}

/**
 * Draws the window bays of one dressed wall face. A wall was built once, so
 * all its windows share one construction and color; only what households did
 * behind the glass differs. Walls bound walkable space, so nothing here
 * projects more than 0.15 m.
 */
export class WallWindows {
  private readonly pen: Pen;
  private readonly style: LotStyle;
  private readonly barred: boolean;
  private readonly kit: Kit;

  /**
   * `frame` maps wall coordinates (along the face, outward, up; meters) to
   * world space. Its X may run either way along the wall: windows are
   * symmetric and walls carry no lettering.
   */
  constructor(
    level: CompiledArchitecture,
    node: ResolvedElement,
    frame: Matrix4,
    material: string,
    settings: Dressing,
    budget: KitBudget,
  ) {
    const finishes = kitFinishes(level, settings.finishes, material);
    const mesh = new KitMesh(level, node.id, node.group, finishes.materials, budget);
    this.pen = new Pen(mesh, "openings", frame, false);
    const rng = new Rng(`${settings.seed}/${node.id}/windows`);
    this.style = lotStyle(rng);
    this.barred = rng.bool(0.5);
    this.kit = new Kit(`${settings.seed}/${node.id}`, ["low", "medium", "high"].indexOf(settings.detail),
      settings.grime, settings.wear, finishes.lettering, undefined, settings.rust);
  }

  /** Draws one flush window bay centered on `x` with its sill at `sill`; `rng` varies the household only. */
  bay(x: number, sill: number, width: number, height: number, rng: Rng): void {
    const { style } = this;
    windowUnit(
      this.pen,
      x - width / 2,
      sill,
      width,
      height,
      {
        kind: style.window,
        weathering: this.kit,
        frame: style.frame,
        trim: style.trim,
        curtain: rng.pick(CURTAINS),
        reach: 0.15,
        hood: false,
        lit: rng.bool(0.55),
        boarded: false,
      },
      rng,
    );
    if (this.barred)
      securityBars(
        this.pen.into("fixtures"),
        x - width / 2 + 0.02,
        sill + 0.02,
        width - 0.04,
        height - 0.04,
        style.bars,
        shade(style.frame, 0.8),
        this.kit,
      );
  }
}
