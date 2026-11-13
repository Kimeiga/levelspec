import { aborted } from "../../vector/types.ts";

/** Shares an 8 ms cooperative work budget across one appearance compile's jobs. */
export class SurfaceWorkSlice {
  private deadline = performance.now() + 8;
  private readonly signal?: AbortSignal;

  constructor(signal?: AbortSignal) {
    this.signal = signal;
  }

  /** Checks cancellation immediately; returns an event-loop turn only when the work slice has elapsed. */
  checkpoint(): Promise<void> | undefined {
    aborted(this.signal);
    if (performance.now() < this.deadline) return;
    return this.yield();
  }

  /** Allows ready host tasks to deliver cancellation without introducing a timer's minimum delay. */
  private async yield(): Promise<void> {
    await new Promise<void>(resolve => {
      if (typeof setImmediate === "function") {
        setImmediate(resolve);
      } else {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          channel.port1.close(); channel.port2.close();
          resolve();
        };
        channel.port2.postMessage(null);
      }
    });
    aborted(this.signal);
    this.deadline = performance.now() + 8;
  }
}
