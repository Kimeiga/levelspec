import { aborted } from "./types.ts";

/** Bounds physical route indexing and candidate work across one publication. */
export class PhysicalRouteWork {
  private remaining: number;
  private readonly signal?: AbortSignal;
  constructor(maximum = 8_000_000, signal?: AbortSignal) {
    if (!Number.isSafeInteger(maximum) || maximum < 1)
      throw new RangeError(
        "Physical work budget must be a positive safe integer.",
      );
    this.remaining = maximum;
    this.signal = signal;
  }
  /** Admits a bounded batch before allocating its candidate storage. */
  spend(amount = 1): void {
    aborted(this.signal);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > this.remaining)
      throw new Error("Physical route work budget exceeded.");
    this.remaining -= amount;
  }
}
