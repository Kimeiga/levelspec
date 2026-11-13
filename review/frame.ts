import {
  FRAME_ASPECT_MIN,
  FRAME_ASPECT_MAX,
  parseFrameAspect,
  type ReviewViewState,
} from "./view.ts";

/** Owns the image frame's responsive layout, ratio controls and replay measurements. */
export class ImageFrame {
  private readonly model: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly mode: HTMLSelectElement;
  private readonly input: HTMLInputElement;
  private readonly description: HTMLElement;
  private readonly error: HTMLElement;
  private readonly reference: HTMLButtonElement;
  private readonly observer: ResizeObserver;
  private readonly events = new AbortController();
  private readonly invalidate: () => void;
  private lock: number | undefined;
  private lastAspect = 1;
  private referenceRatio: number | undefined;

  /** Mounts controls for a validated initial lock; omission follows the available viewport. */
  constructor(model: HTMLElement, controls: HTMLElement, initialAspect: number | undefined, invalidate: () => void) {
    this.model = model;
    this.viewport = model.parentElement!;
    this.mode = controls.querySelector<HTMLSelectElement>("#frame-mode")!;
    this.input = controls.querySelector<HTMLInputElement>("#frame-aspect")!;
    this.description = controls.querySelector<HTMLElement>("#frame-description")!;
    this.error = controls.querySelector<HTMLElement>("#frame-error")!;
    this.reference = controls.querySelector<HTMLButtonElement>("#frame-reference")!;
    this.lock = initialAspect;
    this.invalidate = invalidate;
    const listening = { signal: this.events.signal };
    controls.querySelector<HTMLFormElement>("#frame-form")!.addEventListener("submit", event => {
      event.preventDefault();
      this.applyInput(this.input.value);
    }, listening);
    this.mode.addEventListener("change", () => {
      if (this.mode.value === "custom") {
        this.input.focus();
        return;
      }
      this.apply(this.mode.value === "viewport" ? undefined : parseFrameAspect(this.mode.value));
    }, listening);
    this.reference.addEventListener("click", () => {
      if (this.referenceRatio !== undefined) this.applyInput(String(this.referenceRatio));
    }, listening);
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(this.viewport);
    this.layout();
    this.updateControls();
  }

  /** Contains a locked image, rounding a boundary-crossing long axis inward to a whole CSS pixel. */
  layout(): void {
    if (this.lock === undefined) return;
    const { width, height } = this.viewport.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    let frameWidth = Math.min(width, height * this.lock);
    let frameHeight = frameWidth / this.lock;
    Object.assign(this.model.style, { width: frameWidth + "px", height: frameHeight + "px", right: "auto", bottom: "auto" });
    const measured = this.model.getBoundingClientRect();
    if (measured.width > 0 && measured.height > 0) {
      frameWidth = measured.width;
      frameHeight = measured.height;
      const aspect = frameWidth / frameHeight;
      if (aspect < FRAME_ASPECT_MIN) {
        const inwardHeight = Math.floor(frameWidth / FRAME_ASPECT_MIN);
        if (inwardHeight > 0) frameHeight = inwardHeight;
      } else if (aspect > FRAME_ASPECT_MAX) {
        const inwardWidth = Math.floor(frameHeight * FRAME_ASPECT_MAX);
        if (inwardWidth > 0) frameWidth = inwardWidth;
      }
    }
    Object.assign(this.model.style, {
      width: frameWidth + "px", height: frameHeight + "px",
      left: (width - frameWidth) / 2 + "px", top: (height - frameHeight) / 2 + "px",
    });
  }

  /** Retains the last visible measured aspect while the model is hidden, independently of its preferred lock. */
  measure(): Pick<ReviewViewState, "frameAspect" | "frameAspectLock"> {
    const { width, height } = this.model.getBoundingClientRect();
    if (width > 0 && height > 0) this.lastAspect = width / height;
    return { frameAspect: this.lastAspect, frameAspectLock: this.lock };
  }

  /** Enables reference framing whenever an image is selected, validating its ratio only when applied. */
  setReferenceRatio(ratio: number | undefined): void {
    this.referenceRatio = ratio;
    this.reference.disabled = ratio === undefined;
  }

  /** Disconnects frame layout and input listeners owned by this reviewer. */
  dispose(): void {
    this.observer.disconnect();
    this.events.abort();
  }

  /** Reflects the preferred lock without replacing an aspect value currently being edited. */
  private updateControls(): void {
    const value = this.lock === undefined ? "viewport" : String(this.lock);
    this.mode.value = ["viewport", "0.75", "1", "1.3333333333333333"].includes(value) ? value : "custom";
    if (document.activeElement !== this.input) this.input.value = this.lock === undefined ? "" : String(this.lock);
    this.description.textContent = this.lock === undefined ? "Follows viewport. Exact view links lock its measured aspect." : `Locked ${this.lock} width / height.`;
  }

  /** Reports invalid custom or reference input while preserving the current frame. */
  private applyInput(value: string): void {
    try {
      this.apply(parseFrameAspect(value));
    } catch (error) {
      this.error.textContent = (error as Error).message;
    }
  }

  /** Commits a validated lock or releases it, preserving camera state and unrelated URL context. */
  private apply(ratio: number | undefined): void {
    this.lock = ratio;
    if (ratio === undefined) {
      for (const name of ["width", "height", "left", "top", "right", "bottom"]) this.model.style.removeProperty(name);
    }
    this.layout();
    this.updateControls();
    this.error.textContent = "";
    const url = new URL(location.href);
    if (ratio === undefined) url.searchParams.delete("frame-aspect");
    else url.searchParams.set("frame-aspect", String(ratio));
    history.replaceState(null, "", url);
    this.invalidate();
  }
}
