import type { CompiledLevel, Player, V3 } from "../src/vector/types.ts";
import { NavigationSurface } from "./navigation-surface.ts";
import { physicalWalk, type PhysicalWalk } from "./physical-walk.ts";

export type WalkHelper = "off" | "jump" | "crouch";
export interface WalkMotionInput {
  forward: number;
  right: number;
  /** Radians; zero faces +X and pi/2 faces +Y in Z-up coordinates. */
  yaw: number;
  jump: boolean;
  crouch: boolean;
}

/**
 * Inspection movement over existing land navigation, with physical capsule checks.
 * Jumping raises the body above its supported navigation anchor; it cannot cross
 * missing navigation or establish gap-jump reachability. Caller geometry is immutable.
 */
export class WalkMotion {
  private readonly physical: PhysicalWalk;
  private readonly surface: NavigationSurface;
  private readonly player: Player;
  private support: V3;
  private lift = 0;
  private velocity = 0;
  private jumpHeld = false;
  private crouched = false;

  constructor(level: CompiledLevel, feet: V3) {
    if (!level.navigation) throw new Error("Inspection motion requires land navigation.");
    this.player = level.navigation.settings.player;
    this.physical = physicalWalk(level);
    this.support = [...feet];
    this.surface = new NavigationSurface(level.navigation, feet, (candidate, previous) => {
      const ground = this.physical.resolve(candidate, previous, this.shape);
      if (!ground || this.physical.blocked([ground[0], ground[1], ground[2] + this.lift], this.shape)) return;
      return ground;
    });
  }

  /** Current body dimensions, including the authored crouch height. */
  private get shape(): Player {
    return { ...this.player, height: this.crouched ? this.player.crouch : this.player.height };
  }

  /** Actual Z-up body and eye positions for captures and visibility checks. */
  get state() {
    const feet: V3 = [this.support[0], this.support[1], this.support[2] + this.lift];
    const height = this.shape.height;
    return {
      feet, height, radius: this.player.radius,
      eye: [feet[0], feet[1], feet[2] + height * .93] as V3,
      stance: this.crouched ? "crouching" as const : "standing" as const,
      grounded: this.lift === 0,
      verticalSpeed: this.velocity,
    };
  }

  /** Advances bounded physical samples; manual jump is edge-triggered, helper jump repeats on landing. */
  advance(input: WalkMotionInput, seconds: number, helper: WalkHelper = "off"): void {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 10) return;
    const jumpPressed = input.jump && !this.jumpHeld;
    if (seconds > 0) this.jumpHeld = input.jump;
    const crouch = input.crouch || helper === "crouch";
    if (crouch) this.crouched = true;
    else if (this.crouched && !this.physical.blocked(this.state.feet, this.player)) this.crouched = false;
    const count = Math.max(1, Math.ceil(seconds * 120));
    const dt = seconds / count;
    for (let i = 0; i < count; i++) {
      if (dt > 0 && this.lift === 0 && (helper === "jump" || (jumpPressed && i === 0))) this.velocity = 5.2;
      const scale = (this.crouched ? 1.7 : 3.4) * dt / Math.max(1, Math.hypot(input.forward, input.right));
      const dx = (Math.cos(input.yaw) * input.forward + Math.sin(input.yaw) * input.right) * scale;
      const dy = (Math.sin(input.yaw) * input.forward - Math.cos(input.yaw) * input.right) * scale;
      if (dx !== 0 || dy !== 0) this.support = this.surface.move(this.support, dx, dy);
      if (this.lift === 0 && this.velocity === 0) continue;
      this.velocity -= 20 * dt;
      const next = Math.max(0, this.lift + this.velocity * dt);
      const feet: V3 = [this.support[0], this.support[1], this.support[2] + next];
      if (this.physical.blocked(feet, this.shape)) this.velocity = 0;
      else this.lift = next;
      if (this.lift === 0) this.velocity = 0;
    }
  }
}
