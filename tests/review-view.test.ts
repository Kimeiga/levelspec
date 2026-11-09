import { test } from "node:test";
import assert from "node:assert/strict";
import { parseViewOptions, viewURL, type ReviewViewState } from "../review/view.ts";

test("view options retain finite signed roll in degrees and leave omitted roll unspecified", () => {
  assert.equal(parseViewOptions(new URLSearchParams()).roll, undefined);
  for (const roll of [-21.49, 0, 90, 450]) {
    assert.equal(parseViewOptions(new URLSearchParams({ roll: String(roll) })).roll, roll);
  }
});

test("invalid roll rejects the full view rather than accepting a partial pose", () => {
  for (const roll of ["", " ", "NaN", "Infinity", "-Infinity", "21degrees"]) {
    assert.throws(() => parseViewOptions(new URLSearchParams({
      camera: "0 -10 0", target: "0 0 0", roll,
    })), /roll must be finite/);
  }
});

test("view URLs replay roll with pose and framing while retaining unrelated parameters", () => {
  const state: ReviewViewState = {
    projection: "perspective", position: [2, -10, 8], target: [1, 3, 0],
    fov: 47, viewHeight: 14, roll: -21.49, appearance: "inspection", frameAspect: 0.75,
  };
  const url = new URL(viewURL("http://127.0.0.1:9999/?source=courtyard#detail", state));
  assert.equal(url.searchParams.get("source"), "courtyard");
  assert.equal(url.hash, "#detail");
  assert.deepEqual(parseViewOptions(url.searchParams), state);
});

test("appearance parsing is explicit while callers retain their own omitted default", () => {
  assert.equal(parseViewOptions(new URLSearchParams()).appearance, undefined);
  for (const appearance of ["flat", "illustrated", "materials", "inspection"] as const)
    assert.equal(parseViewOptions(new URLSearchParams({ appearance })).appearance, appearance);
  for (const appearance of ["", " ", "unlit", "Inspection"])
    assert.throws(() => parseViewOptions(new URLSearchParams({ appearance })), /appearance must be/);
});

test("view URLs replace stale appearance while preserving unrelated context", () => {
  const state: ReviewViewState = { projection: "orthographic", position: [0,-10,10], target: [0,0,0], fov: 55, viewHeight: 8, roll: 0, appearance: "flat", frameAspect: 1.5 };
  const url = new URL(viewURL("https://example.test/?appearance=inspection&source=local#detail", state));
  assert.equal(parseViewOptions(url.searchParams).appearance, "flat");
  assert.equal(url.searchParams.get("source"), "local");
  assert.equal(url.hash, "#detail");
});

test("frame aspect parses a bounded width/height lock while omission stays responsive", () => {
  assert.equal(parseViewOptions(new URLSearchParams()).frameAspect, undefined);
  for (const ratio of [0.1, 0.75, 1, 4/3, 10])
    assert.equal(parseViewOptions(new URLSearchParams({ "frame-aspect": String(ratio) })).frameAspect, ratio);
  for (const value of ["", " ", "0", "-1", "NaN", "Infinity", "1e-300", "1e300", "0.09", "10.1"])
    assert.throws(() => parseViewOptions(new URLSearchParams({ "frame-aspect": value })), /frame-aspect must be/);
});

test("exact-view links lock actual responsive aspect instead of retaining a stale preference", () => {
  const state: ReviewViewState = { projection: "perspective", position: [0,-10,10], target: [0,0,0], fov: 47, viewHeight: 8, roll: 31, appearance: "inspection", frameAspect: 1.25 };
  const url = new URL(viewURL("https://example.test/?frame-aspect=0.75&source=local#detail", state));
  assert.equal(parseViewOptions(url.searchParams).frameAspect, 1.25);
  assert.equal(url.searchParams.get("source"), "local");
  assert.equal(url.hash, "#detail");
});

test("unsupported actual frame cannot publish a known-invalid locked replay URL", () => {
  const state: ReviewViewState = { projection: "perspective", position: [0,-10,10], target: [0,0,0], fov: 47, viewHeight: 8, roll: 31, appearance: "inspection", frameAspect: 0.05 };
  assert.throws(() => viewURL("https://example.test/", state), /frame-aspect must be/);
});
