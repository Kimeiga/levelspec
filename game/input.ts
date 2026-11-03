/** Held movement keys and discrete view/spawn actions for the sample game. */
export function bindGameInput(target: EventTarget, action: (code: string) => void, lifecycle: EventTarget): Set<string> {
  const keys = new Set<string>();
  target.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    const first = !keys.has(e.code);
    keys.add(e.code);
    if (first && !e.repeat) action(e.code);
  });
  target.addEventListener("keyup", (event) => keys.delete((event as KeyboardEvent).code));
  target.addEventListener("blur", () => keys.clear());
  // Pointer lock and visibility events originate on Document and need their
  // own listener source; pointer lock changes do not bubble to Window.
  for (const type of ["visibilitychange", "pointerlockchange"])
    lifecycle.addEventListener(type, () => keys.clear());
  return keys;
}
