/** Account for active input time independently of the display frame rate. */
export class WalkClock {
  private previous: number | undefined;
  reset(now: number) {
    this.previous = Number.isFinite(now) ? now : undefined;
  }
  consume(now: number): number {
    const previous = this.previous;
    this.reset(now);
    if (previous === undefined || !Number.isFinite(now)) return 0;
    const elapsed = now - previous;
    // A long suspension is not walking time. Slow software-rendered frames
    // retain all elapsed time; NavigationSurface.move subdivides the distance.
    if (elapsed < 0 || elapsed > 10000) return 0;
    return elapsed / 1000;
  }
}
