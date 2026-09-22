interface WalkActions {
  walking: () => boolean;
  look: (dx: number, dy: number) => void;
  key: (key: string, down: boolean) => void;
  clear: () => void;
  exit: () => void;
  mouseMode: (captured: boolean) => void;
}
/** Local game controls. Input is used only to move the scene camera. */
export function bindWalkInput(
  canvas: HTMLCanvasElement,
  actions: WalkActions,
  signal: AbortSignal,
) {
  let pointer: number | undefined,
    lastX = 0,
    lastY = 0,
    locked = false;
  const relevant = (target: EventTarget | null) =>
    !(
      target instanceof Element &&
      target.closest("input,textarea,select,[contenteditable]")
    );
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!actions.walking() || locked) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!actions.walking() || locked || e.pointerId !== pointer) return;
      actions.look(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    },
    { signal },
  );
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(
      event,
      () => {
        pointer = undefined;
      },
      { signal },
    );
  document.addEventListener(
    "mousemove",
    (e) => {
      if (locked && actions.walking()) actions.look(e.movementX, e.movementY);
    },
    { signal },
  );
  document.addEventListener(
    "pointerlockchange",
    () => {
      const previous = locked;
      locked = document.pointerLockElement === canvas;
      actions.mouseMode(locked);
      if (previous && !locked && actions.walking()) actions.exit();
    },
    { signal },
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (!actions.walking() || !relevant(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        actions.exit();
        return;
      }
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(key)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        actions.key(key, true);
      }
    },
    { capture: true, signal },
  );
  window.addEventListener(
    "keyup",
    (e) => actions.key(e.key.toLowerCase(), false),
    { signal },
  );
  window.addEventListener(
    "blur",
    () => {
      pointer = undefined;
      actions.clear();
    },
    { signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      pointer = undefined;
      actions.clear();
    },
    { signal },
  );
  return {
    async captureMouse() {
      if (!actions.walking() || !canvas.requestPointerLock) return false;
      try {
        await canvas.requestPointerLock();
        return document.pointerLockElement === canvas;
      } catch {
        actions.mouseMode(false);
        return false;
      }
    },
    releaseMouse() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
  };
}
