# Dust II: reversed steps at the B tunnel entrance

Reviewed and implementation status updated 16 September 2026. The original finding below is retained as historical evidence. The generator now contains the correction; final compiled geometry, navigation, and render verification are pending.

## Implemented correction

B courtyard and its flat Dog/Close pocket are now **Z1.46 m**, below the unchanged **Z2.00 m** tunnel. The doorway flight climbs into the tunnel through **three 0.18 m risers over a 1.8 m run**. It descends when leaving the tunnel for B. These dimensions are explicit blockout estimates, not surveyed CS2 measurements.

The adjacent B approach now falls from Z1.46 at radar X267 to Z0 at X444 before the flat CT Mid passage. A separate 4.5 m divider restores distinct B Doors and raised Window openings. These adjoining changes address the courtyard's contacts and enclosure together with the threshold.

[Open latest refinement comparisons](/Users/tomokif/code/levelspec/generated/dust2-refinement/index.html) · [Complete review and correction status](/Users/tomokif/code/levelspec/docs/dust2-visual-critique.md)

The original screenshots below show the defect before this correction. They are not screenshots of the latest build.

## Original finding

**Walking from B site into Upper Tunnels should take the player up the entrance steps. The reviewed blockout took the player down.** The elevation relationship at the doorway is reversed.

Dog/Close is the flat pocket beside the exit. The short staircase belongs at the tunnel doorway; it should not extend across that pocket.

## Expected versus reviewed shape

| Viewpoint | Expected | Reviewed blockout |
| --- | --- | --- |
| B site, looking into the tunnel | Steps rise toward the tunnel threshold | Steps descend into the tunnel |
| Tunnel, looking out toward B | Steps descend to the courtyard | Steps rise toward the courtyard |
| Dog/Close pocket | Flat ground beside the doorway | Preserve flat ground when correcting the threshold |

The historical authoring set `b_tunnel` to **Z = 2.00 m** and `b_site` to **Z = 2.54 m**. The reviewed `b_exit_stairs` region connected them, putting the courtyard **0.54 m above** the tunnel floor. The visual reference and the user's clarification require the opposite ordering.

These numbers describe the model. The reference establishes the direction of the rise, not an exact replacement height or step count.

## Visual evidence

The B-site screenshot shows shallow steps rising from the courtyard into the tunnel arch. The Upper Tunnels screenshot provides the reverse view of the same threshold. Both come from the September 2025 [CS2 Dust II reference collection](https://skinrave.gg/en/blog/all-cs2-dust-2-map-callouts).

- [B-site reference: tunnel doorway at upper right](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/8-5.webp).
- [Upper Tunnels reference: looking out toward B](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/7-4.webp).
- [Reviewed model: steps incorrectly rise toward B](/Users/tomokif/code/levelspec/generated/dust2-critique-2026-09-16/b-exit-from-tunnel.png).

The model render uses the exported geometry with optional ceilings hidden. The floor and stair geometry is unchanged.

## Original correction requirements

Set the tunnel threshold above the adjoining B courtyard and make the entrance flight ascend when approached from B. Keep the flight confined to the doorway and keep Dog/Close flat.

Correct the adjoining floor elevations together with the steps. Reversing only the stair mesh would leave mismatched landings. Any adjustment must also preserve the continuous tunnel floor and avoid introducing a new lip toward B Doors or the CT approach.

Authoring location: [tools/vector-dust2.py](/Users/tomokif/code/levelspec/tools/vector-dust2.py), specifically `b_exit_stairs`, `b_tunnel`, and `b_site`. Update the authored definition before regenerating its SVGX and runtime outputs.

## Visual acceptance — pending

1. From B site at standing eye height, the risers face the viewer and climb into the doorway.
2. From inside the tunnel, the same flight visibly descends to B.
3. Both ends meet their floors without a vertical lip, gap, or abrupt unintended slope.
4. Dog/Close remains a flat pocket beside the steps.

Capture both doorway views of the corrected compiled map. Judge the local silhouette and landing continuity against the references, then check the B-threshold and B-Doors navigation routes. Strict compiler/navigation checks and final render comparison are underway; no completed acceptance result is claimed yet.
