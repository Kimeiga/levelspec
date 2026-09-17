# Dust II / CS2 spatial contract

This is an approximate playable CS2 blockout. The reference radar establishes XY
registration and broad connectivity; it is not surveyed geometry. Architecture
is authored as clean segments and native Bézier curves in `tools/vector-dust2.py`.
The image is no longer thresholded or traced to produce the map.

## Coordinates and reference authority

Right-handed Z-up metres. Image `(50,1005)` maps to world `(0,0)`; X points right,
Y points up. One pixel is provisionally 0.1 m. Authored values use millimetre
precision; vertex IDs, not coincident coordinates, define connections.

References reviewed on 2026-09-15:

| Reference | Observation | Confidence / limit |
|---|---|---|
| [Valve CS2 CT ramp](https://cdn.akamai.steamstatic.com/apps/csgo/images/csgo_react/cs2/maps/dust2_ct_ramp_s2.jpg) | Broad central incline and narrow parallel staircase under the arch | Official CS2 geometry; not a metric survey |
| [CS2 overview collection, September 2025](https://skinrave.gg/en/blog/all-cs2-dust-2-map-callouts) | Separate tunnel entrance/exit steps, elevated T Plat, central Pit versus raised Pit Plat, A approaches | Multiple oblique screenshots; dimensions estimated |
| [CS2 lower-tunnel stair close-up](https://gamegpu.com/images/beforeafterimagesslide/csb2_8.jpg) | Curved wedge treads at the bend; straight hallway afterward | 2023 CS2 limited-test screenshot, used with the supplied radar |
| [Goose close-up, May 2024](https://news.mynavi.jp/article/20240523-2951320/images/001.jpg) | Shallow Goose ledge above A Default with a few risers | Direction supported; count/rise remain estimates |
| User radar and later stair-detail crop | Winders use approximately the outer half of the bend; center is a flat platform | Explicit user correction overrides the earlier full-width approximation |
| User T Spawn crops and direction correction, reviewed 2026-09-16 | The spawn street descends east/right; northern Mid and Long approaches are level | User direction is authoritative; ramp endpoints and heights remain estimates |
| [CS2 CT-spawn view](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/11-3.webp), reviewed 2026-09-16 | Covered lower CT floor exits east toward Cross; broad ramp with stairs on the south/right side | Confirmed against Valve's CT-ramp image; dimensions estimated |
| [CS2 A-site overview](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/1-4.webp), reviewed 2026-09-16 | Upper Short joins the raised site; platform retaining boundary separates the lower CT approach | Used with the user's correction to remove the misplaced upstairs flight |
| [CS2 Goose setup](https://cs2nades.gg/en/map/dust2/molotov/goose-to-short) and [A-site setup](https://cs2nades.gg/en/map/dust2/smoke/a-site-to-long-2), reviewed 2026-09-16 | Same-provider `setpos` Z=192.252747 at Goose versus 161.09 on A Site: Goose is higher; the shallow steps descend south | Confirms relative order; game-coordinate values are not imported as metre elevations |
| [CS2 player-height Goose view](https://static.tweaktown.com/news/9/8/98506_02_amd-radeon-anti-lag-2-announced-requires-game-integration-preview-available-in-counter-strike_full.jpg), reviewed 2026-09-16 | Close staircase and A-platform relationship | Perspective alone was initially misread; coordinate evidence and the user's correction resolve direction |
| [Long setup](https://www.cs2util.com/dust2/molotov/default-molotov-from-long) and [Pit Plat setup](https://www.cs2util.com/dust2/molotov/a-site-elevator-plat-molotov-from-pit), reviewed 2026-09-16 | Same-provider Z=64.696663 on Long versus 119.822784 on Pit Plat: the platform is higher, with stairs ascending south | Resolves the ambiguous oblique image; exact metre rise remains an estimate |
| [Lower Short setup](https://www.cs2util.com/dust2/smoke/a-site-smoke-from-a-short) and [upper Short setup](https://www.cs2util.com/dust2/molotov/goose-molotov), reviewed 2026-09-16 | Z=64.076363 versus 160.031250; lower Short is approximately level with Long, and the flight climbs to A | Supports raising the connected plateau instead of lowering Catwalk |
| [B courtyard](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/8-5.webp) and [Mid](https://storage.ghost.io/c/b8/b8/b8b826c7-272b-46e7-b30d-6ad6d0b36223/content/images/2025/08/10-3.webp), reviewed 2026-09-16 | B has distinct Doors/Window openings and steps up into the tunnel; Mid has a narrow stair strip beside Catwalk | Architecture and direction confirmed; dimensions are blockout estimates |

Image searches were the main research method. Old CS:GO images and the 2023 CS2
walkthrough were comparative references, not proof of the latest map revision.
Valve's [April 2026 Xbox change](https://store.steampowered.com/news/posts/?appids=730&enddate=1777415064&feed=steam_announce/1000)
concerns a jump spot; it is not modeled as an invented staircase. Detailed props,
boosts and exact CS2 movement physics remain outside this architectural blockout.

## Authored transitions and assumptions

- **Tunnel bend:** quarter-turn annulus, outer radius 6 m, inner radius 3 m;
  3 m wide winders descend from Upper Tunnels at Z=2 to Lower Tunnels at Z=0.
  The inner quarter-disc is a flat Z=2 floor. A separate retaining seam closes
  the height difference; it is not part of the stair mesh. The hallway to Mid
  stays level at Z=0.
- **Tunnel doors:** distinct shallow straight flights at both the T-side entrance
  and B exit. These are independent of the curved internal flight.
- **T Spawn / T Plat:** western platform and spawn marker stay at Z=3. The
  spawn street descends east/right from radar X=490 to X=607 (11.7 m), reaching
  the eastern landing at Z=2. Its height is constant along north/south sections.
  The Mid and Long approaches north of the divider are level at Z=2; the apron
  meets the divider at radar Y=876. The separate western Outside Tunnels ramp
  still descends to Z=1.46. Entrance steps rise to Upper Tunnels Z=2. B exit
  steps descend to B-site Z=1.46. See `generated/t-spawn-correction` for the
  earlier T-side correction and `generated/dust2-refinement` for the B revision.
- **B / CT Mid:** B's courtyard and Dog/Close are flat at Z=1.46. Three 18 cm
  risers climb south into the tunnel at Z=2. The B approach falls east to Z=0
  at radar X444, then joins CT Mid continuously. The 4.5 m high, 0.5 m thick
  dividing wall runs along X267, Y118–255. Doors occupy Y214–252 with a 3.2 m
  clear height; Window occupies Y126–148 with a 0.9 m sill and 3 m head above B.
  Window is a raised physical opening, not a walking route for the default
  agent; jump/vault traversal is outside this blockout's navigation model.
- **A:** Short bridge and its northern site connection are level at Z=4 over CT
  Z=0. Short climbs from Catwalk Z=2 in twelve risers over 4 m at radar
  Y335–375. Catwalk remains level with Long. The CT
  ramp and its narrow south-side stairs now rise east from radar X681 to X762,
  Z=0 to Z=2, below the upper route. A level landing reaches X780, followed by a
  gradual merge with the Long road. The upper A platform ends at its retaining
  wall around radar Y187/208, leaving the lower corridor open. A support wall
  north of the CT exit ends at the upper slab underside; parapets stay anchored
  to upper floors, including split `a_site` patches. These dimensions are
  blockout estimates. Long is Z=2 at Cross, then rises north from radar Y220
  to Y110, reaching Goose Z=4.54. Goose is 0.54 m above A; three shallow risers
  descend south to site Z=4. The road is continuous through the formerly
  disconnected northern landing. See `generated/dust2-refinement` for views.
- **Mid:** sixteen 12.5 cm risers occupy the 1.4 m strip beside Catwalk at
  radar X490–504, Y485–545. The 2 m rise over 6 m sits beside the central incline;
  both share level lower and upper landings. Catwalk itself stays at Z=2.
- **Pit:** central depression Z=0.2, raised side platform Z=3.2, Long Z=2.
  The central approach remains a ramp. Eight 15 cm risers ascend south from
  Long onto Pit Plat over 3.2 m; they do not descend into the central Pit.
- The actual Short slab underside leaves 3.8 m over the CT route. Tunnel ceilings
  are authored at absolute elevations. Outdoor boundaries, low dividers,
  retaining walls and tunnel enclosures use different wall heights.
- Wall endpoints meet nearby architecture instead of leaving accidental 10–48 cm
  slots. Interior walls use named `base-floor` anchors wherever a continuous
  supporting floor exists, so an upper floor cannot leave a wall floating over
  the neighboring lower route. Existing `span-floors` is exercised by compiler
  fixtures; no invented roof-floor region is added just to enable that attribute.

These dimensions are design estimates, not extracted Valve assets. The standing
navigation agent is 2 m tall and 0.5 m in diameter. No off-mesh shortcuts are added
to hide disconnected floors.

The former Long A / CT floor gap is repaired by restoring the lower CT-to-Cross
route and the support north of its exit. The floor-gap audit reports no warnings.
The upper Short-to-site and lower CT-to-Cross routes are tested independently,
including limits that reject a long detour elsewhere on the map.

Both strict surface-contact and floor-gap audits now pass with zero diagnostics.
Retaining seams no longer extend skirts through lower slabs. Wall feet follow
supporting floor planes, while stair-side walls keep their smooth overall slope.
Wall endpoints and thicknesses fit the actual neighboring geometry. The A-side
parapet centerline is radar X845 with 0.64 m thickness: its outer face encloses
the slab edge by 2 cm, avoiding an unusable ledge or coplanar face; the stairs
retain about 4.98 m usable width. All walls still use centerlines. Strict checks
remain enabled in acceptance and authored overlap regressions still warn.

Direct Long-to-site, Long-to-Goose and Goose-to-site route limits prevent a
successful long detour through Short from masking a blocked local connection.
The original missing route took 111 m; the corrected Long-to-site route is 47 m.
Five additional local routes cross B Doors, the B tunnel threshold, Short stairs,
Mid stairs, and Pit Plat stairs, with limits of 10–12 m. They prevent a remote
detour from masking a broken landing. All sixteen required routes pass.

## Reproduce and inspect

```sh
generated/dust2-venv/bin/python tools/vector-dust2.py
node tools/vector-build.ts examples/dust2.level.svgx
generated/dust2-venv/bin/python tools/dust2-overlay.py --check
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/?map=dust2`. Source and inspection panels start closed;
both viewports support panning. Navigation mode exposes uncovered floor samples
and their causes. The overlay is `generated/dust2-alignment/index.html`.

The generator writes `generated/dust2-plan-contract.json`, with authored outlines,
landmarks, passages and the half-width stair contract. Overlay acceptance checks
actual exported floor triangles against that contract, named landmark support,
minimum corridor widths, wall presence and navigation. Radar IoU remains an
informational comparison; it is no longer a 99.9% release gate.

`tests/vector-dust2.test.ts` additionally checks the flat center, level lower hall,
separate flights, elevation ordering, requested capsule, runtime navigation export
and the real route around the bend. UV acceptance uses the actual compiled mesh;
`generated/uv-inspection/` contains checker renders, layouts and manifests.
