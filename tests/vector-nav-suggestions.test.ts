import assert from "node:assert/strict";
import type {CompiledLevel} from "../src/vector/types.ts";
import { describe, it } from "node:test";
import { compile, createArchitecture, parseAml, serializeAml, bakeNavmesh, type ArchitectureDocument, type V3 } from "levelspec";

/** Adds an axis-aligned source floor with open edges in canonical Z-up meters. */
function floor(document: ArchitectureDocument, id: string, x: number, width: number, height = width) {
  const points: V3[] = [[x, 0, 0], [x + width, 0, 0], [x + width, height, 0], [x, height, 0]];
  document.profiles.push({id:id+':profile',outer:{points},holes:[],interior:[],breaklines:[]});document.elements.push({kind:'slab',id,profile:id+':profile',elevation:0,thickness:.2,group:id+'.layer'});
}

/** A large main floor and a distant sizable platform, both retaining real navigation. */
function islands() {
  const document = createArchitecture("navigation-suggestions");
  floor(document, "main", 0, 10);
  floor(document, "platform", 20, 4);
  return document;
}

/** Creates a valid source flight that can optionally be entirely headroom-blocked. */
function flight(fill: "stairs" | "ramp", blocked = false) {
  const document = createArchitecture("flight-navigation");
  document.paths.push({id:'axis',points:[[1,0,0],[1,4,1.2]],segments:[],closed:false});document.elements.push({kind:fill,id:'flight',path:'axis',width:2,thickness:.2,underside:'filled',...(fill==='stairs'?{maximumRiser:.18}:{}),group:'flight.layer'});
  if(blocked)ceiling(document,1.5);
  return document;
}
function ceiling(document:ArchitectureDocument,height:number){document.profiles.push({id:'ceiling-plan',outer:{points:[[0,0,0],[2,0,0],[2,4,0],[0,4,0]]},holes:[],interior:[],breaklines:[]});document.elements.push({kind:'canopy',id:'ceiling',profile:'ceiling-plan',elevation:height+.2,thickness:.2});}

/** Runs the real compiler and Recast bake without unrelated geometric audits. */
async function inspect(document: ArchitectureDocument) {
  const level = await compile(document, { floorGaps: false, surfaceContacts: false });
  assert.ok(!level.diagnostics.some((d) => d.severity === "error"), JSON.stringify(level.diagnostics));
  return level;
}

/** Filters the non-blocking navigation-specific suggestions. */
function navSuggestions(level: CompiledLevel) {
  return level.suggestions.filter((s) => s.code === "NAV_ISLAND" || s.code === "FLIGHT_NAV_MISSING");
}

/** Computes the horizontal area of one exported navigation triangle independently. */
function triangleArea(level: CompiledLevel, triangle: number) {
  const nav = level.navigation!;
  const [a, b, c] = nav.indices.slice(triangle * 3, triangle * 3 + 3).map((index) => nav.positions.slice(index * 3, index * 3 + 3));
  return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
}

describe("navigation review suggestions", () => {
  it("reports a large disconnected platform even when it exceeds the small-area threshold and has a spawn", async () => {
    const document = islands();
    document.markers.push({ id: "platform-start", layer: "platform.layer", region: "platform", position: [22, 2, 0], kind: "spawn" });
    const level = await inspect(parseAml(serializeAml(document)));
    const findings = navSuggestions(level);
    assert.equal(findings.length, 1);
    const suggestion = findings[0];
    assert.equal(suggestion.code, "NAV_ISLAND");
    assert.ok(suggestion.objects.includes("platform"));
    assert.ok(suggestion.evidence.area! > 2);
    assert.equal(suggestion.evidence.small, false);
    assert.equal(suggestion.evidence.disconnected, true);
    assert.ok(suggestion.sources.some((source) => source.object === "platform" && source.source));
    assert.ok(suggestion.layers.includes("platform.layer"));
    assert.equal(level.navigationSuggestionsStatus, "complete");
    assert.ok(!level.diagnostics.some((diagnostic) => diagnostic.code === "NAV_ISLAND"));
  });

  it("suggests reviewing a sub-2-square-meter component even when it is the only network", async () => {
    const document = createArchitecture("tiny-network");
    floor(document, "tiny", 0, 1.5);
    const level = await inspect(document);
    assert.equal(level.navigation!.components, 1, "The fixture must retain actual walkable triangles.");
    const findings = navSuggestions(level);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "NAV_ISLAND");
    assert.ok(findings[0].evidence.area! > 0 && findings[0].evidence.area! < 2);
    assert.equal(findings[0].evidence.small, true);
    assert.equal(findings[0].evidence.disconnected, false);
  });

  it("maps every triangle to an independently measured component and valid inspection target", async () => {
    const level = await inspect(islands()), nav = level.navigation!;
    assert.equal(nav.triangleComponents.length, nav.indices.length / 3);
    assert.equal(nav.componentDetails.length, 2);
    for (const component of nav.componentDetails) {
      let measured = 0, triangles = 0;
      for (let t = 0; t < nav.triangleComponents.length; t++) if (nav.triangleComponents[t] === component.id) {
        measured += triangleArea(level, t);
        triangles++;
      }
      assert.ok(triangles > 0);
      assert.ok(Math.abs(component.area - measured) < 1e-5);
      assert.ok(component.position.every(Number.isFinite));
      for (let axis = 0; axis < 3; axis++) assert.ok(component.bounds.min[axis] <= component.position[axis] && component.position[axis] <= component.bounds.max[axis]);
      assert.equal(component.regions.length, 1);
      assert.equal(component.layers.length, 1);
    }
    assert.ok(nav.triangleComponents.every((id) => nav.componentDetails.some((component) => component.id === id)));
    const suggestion = navSuggestions(level)[0];
    assert.ok(nav.componentDetails.some((component) => component.id === suggestion.navigation?.component));
  });

  it("preserves connected membership across navigation tiles", async () => {
    const document = createArchitecture("tiled-navigation");
    floor(document, "long-corridor", 0, 40, 4);
    floor(document, "detached", 50, 4);
    const level = await inspect(document), nav = level.navigation!;
    assert.ok(level.repairs?.some((repair) => repair.code === "NAV_SPATIAL_SUBDIVISION"),
      "This fixture must exercise a real tiled navigation bake.");
    assert.equal(nav.componentDetails.length, 2,
      "Touching tiles of the long corridor must remain one connected component.");
    const corridor = nav.componentDetails.find((component) => component.regions.includes("long-corridor"))!;
    assert.ok(corridor);
    assert.ok(corridor.bounds.max[0] - corridor.bounds.min[0] > 38);
    let area = 0;
    for (let t = 0; t < nav.indices.length / 3; t++) {
      const centerX = nav.indices.slice(t * 3, t * 3 + 3).reduce((sum, index) => sum + nav.positions[index * 3] / 3, 0);
      if (centerX < 40) {
        assert.equal(nav.triangleComponents[t], corridor.id);
        area += triangleArea(level, t);
      }
    }
    assert.ok(Math.abs(corridor.area - area) < 1e-5);
    assert.equal(navSuggestions(level).length, 1);
    assert.ok(navSuggestions(level)[0].objects.includes("detached"));
  });

  it("uses deterministic component identities and largest-network tie-breaking", async () => {
    const document = createArchitecture("equal-networks");
    floor(document, "one", 0, 5);
    floor(document, "two", 20, 5);
    const first = await inspect(document), second = await inspect(document);
    assert.equal(navSuggestions(first).length, 1, "Exactly one equal-sized component is the main network.");
    assert.deepEqual(first.navigation!.componentDetails, second.navigation!.componentDetails);
    assert.deepEqual(navSuggestions(first), navSuggestions(second));
  });

  it("counts an enabled one-way traversal link as weak connectivity", async () => {
    const document = createArchitecture("linked-networks");
    floor(document, "one", 0, 5);
    floor(document, "two", 10, 5);
    document.player.ladder = true;
    document.links.push({ id: "transfer", from: [2, 2, 0], to: [12, 2, 0], kind: "ladder", bidirectional: false, ability: "ladder" });
    assert.deepEqual(navSuggestions(await inspect(document)), []);
    document.player.ladder = false;
    assert.equal(navSuggestions(await inspect(document)).filter((s) => s.code === "NAV_ISLAND").length, 1);
  });

  for (const fill of ["stairs", "ramp"] as const) {
    it(`reports ${fill} with zero walkable coverage, but accepts a navigable isolated flight`, async () => {
      const blocked = await inspect(parseAml(serializeAml(flight(fill, true))));
      const missing = navSuggestions(blocked).filter((s) => s.code === "FLIGHT_NAV_MISSING");
      assert.equal(missing.length, 1);
      assert.ok(missing[0].objects.includes("flight"));
      assert.ok(missing[0].sources.some((entry) => entry.object === "flight" && entry.source));
      assert.ok(missing[0].position.every(Number.isFinite));
      assert.equal(blocked.navigationSuggestionsStatus, "complete", "An empty successful bake is distinct from an unavailable bake.");
      const navigable = await inspect(flight(fill));
      assert.ok(navigable.navigation!.indices.length > 0);
      assert.equal(navSuggestions(navigable).filter((s) => s.code === "FLIGHT_NAV_MISSING").length, 0);
    });
  }

  it("does not confuse a healthy detached flight with absent navigation when the spawn is elsewhere", async () => {
    const document = flight("stairs");
    floor(document, "main", 20, 10);
    document.markers.push({ id: "main-spawn", kind: "spawn", layer: "main.layer", region: "main", position: [22, 2, 0] });
    const level = await inspect(document);
    const coverage = level.navigation!.coverage.regions.find((row) => row.region === "flight")!;
    assert.ok((coverage.reasons.disconnected ?? 0) > 0,
      "The fixture must have real navigation that is unreachable from the distant spawn.");
    assert.equal(navSuggestions(level).filter((s) => s.code === "FLIGHT_NAV_MISSING").length, 0);
    assert.ok(navSuggestions(level).some((s) => s.code === "NAV_ISLAND" && s.objects.includes("flight")));
  });

  it("does not classify partially headroom-blocked ramps as entirely missing navigation", async () => {
    const document = flight("ramp");
    ceiling(document,2.5);
    const level = await inspect(document);
    const coverage = level.navigation!.coverage.regions.find((row) => row.region === "flight")!;
    assert.ok(coverage.covered > 0 && coverage.uncovered > 0,
      "The low ceiling must leave genuine partial walkable coverage.");
    assert.equal(navSuggestions(level).filter((s) => s.code === "FLIGHT_NAV_MISSING").length, 0);
  });

  it("keeps geometry-ready suggestions pending and navigation-disabled results unavailable", async () => {
    let early: string | undefined;
    await compile(islands(), { onGeometry: (level) => { early = level.navigationSuggestionsStatus; assert.deepEqual(navSuggestions(level), []); } });
    assert.equal(early, "pending");
    const level = await compile(flight("stairs", true), { navigation: false });
    assert.equal(level.navigationSuggestionsStatus, "unavailable");
    assert.deepEqual(navSuggestions(level), []);
  });

  it("round-trips suppression and reactivates after local geometry changes while preserving unrelated reviews", async () => {
    const document = islands();
    const initial = navSuggestions(await inspect(document))[0];
    document.reviewSuppressions = [{ suggestion: initial.id, fingerprint: initial.fingerprint, reason: "Intentional detached lookout" }];
    document.materials.push({ id: "paint", color: "#abcdef", repeat: 1, roughness: 1, metalness: 0 });
    document.elements[1].material = "paint";
    const suppressed = navSuggestions(await inspect(parseAml(serializeAml(document))))[0];
    assert.equal(suppressed.state, "suppressed");
    assert.equal(suppressed.fingerprint, initial.fingerprint);
    document.profiles[1].outer.points![1][0] += 1;
    document.profiles[1].outer.points![2][0] += 1;
    const changed = navSuggestions(await inspect(document))[0];
    assert.equal(changed.id, initial.id);
    assert.notEqual(changed.fingerprint, initial.fingerprint);
    assert.equal(changed.state, "active");
    assert.equal(changed.suppression?.stale, true);
  });

  it("invalidates a navigation review when the player footprint changes", async () => {
    const document = islands();
    const initial = navSuggestions(await inspect(document))[0];
    document.reviewSuppressions = [{ suggestion: initial.id, fingerprint: initial.fingerprint, reason: "Reviewed for the current player" }];
    document.player.radius = 0.3;
    const changed = navSuggestions(await inspect(document)).find((finding) => finding.id === initial.id)!;
    assert.ok(changed);
    assert.equal(changed.state, "active");
    assert.notEqual(changed.fingerprint, initial.fingerprint);
  });

  it("refreshes suggestions when a geometry-only level is baked later and through cache hits", async () => {
    const level = await compile(islands(), { navigation: false });
    assert.deepEqual(navSuggestions(level), []);
    const first = await bakeNavmesh(level);
    assert.equal(level.navigationSuggestionsStatus, "complete");
    assert.equal(navSuggestions(level).length, 1);
    const suggestions = structuredClone(navSuggestions(level));
    assert.equal(await bakeNavmesh(level), first);
    assert.deepEqual(navSuggestions(level), suggestions);
  });
});
