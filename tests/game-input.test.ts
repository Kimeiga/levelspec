import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bindGameInput } from "../game/input.ts";

function key(target: EventTarget, type: string, code: string, repeat = false) {
  target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
}

describe("game keyboard input", () => {
  for (const reset of ["blur", "visibilitychange", "pointerlockchange"]) {
    it(`releases movement on ${reset} even when keyup never arrives`, () => {
      const target = new EventTarget();
      const documentEvents = new EventTarget();
      const held = bindGameInput(target, () => {}, documentEvents);
      key(target, "keydown", "KeyW");
      key(target, "keydown", "ShiftLeft");
      assert.ok(held.has("KeyW") && held.has("ShiftLeft"), "movement did not engage");
      (reset === "blur" ? target : documentEvents).dispatchEvent(new Event(reset));
      assert.equal(held.size, 0);
      key(target, "keydown", "KeyW");
      assert.ok(held.has("KeyW"), "cannot move after returning");
      key(target, "keyup", "KeyW");
      assert.equal(held.size, 0);
    });
  }
  it("toggles the view and teleports once per press, including across focus loss", () => {
    const target = new EventTarget(), actions: string[] = [];
    const held = bindGameInput(target, (code) => actions.push(code), target);
    key(target, "keydown", "KeyO");
    key(target, "keydown", "KeyO", true);
    key(target, "keydown", "KeyO", true);
    assert.deepEqual(actions, ["KeyO"]);
    assert.ok(held.has("KeyO"));
    key(target, "keyup", "KeyO");
    key(target, "keydown", "KeyO");
    key(target, "keydown", "Digit2");
    key(target, "keydown", "Digit2", true);
    target.dispatchEvent(new Event("blur"));
    key(target, "keydown", "Digit2", true);
    assert.deepEqual(actions, ["KeyO", "KeyO", "Digit2"]);
    key(target, "keyup", "Digit2");
    key(target, "keydown", "Digit2");
    assert.deepEqual(actions, ["KeyO", "KeyO", "Digit2", "Digit2"]);
  });
});
