# Santa Bruma Station

Santa Bruma is a 5v5 T vs CT defuse blockout. A street-level booking hall spans a rail cutting. Below it, a trussed shed covers two through tracks, stationary trains, passenger platforms and a working parcel wing. A is in the lower Mail Bank and B is by the Relay in the upper ticket hall.

- **T** starts at Tram Bridge and can split toward the West Ramp or the forecourt. Trolley Court and Platform 1 reach different faces of A. The main arches and side arcade enter B on opposite sides of the ticket island.
- **CT** starts at Service Court. The Duty and Gallery thresholds approach B from different angles. Staff Stair reaches the lower service door at A and a longer under-bridge route to the platform portal.
- **Public Bridge** is a contested switch between sites. Its narrow window looks west along the cutting. The public stair opens east onto Platform 1.

[Editable AML](level.aml) · [Street plan](planning/01-street.svg) · [Rail plan](planning/02-rail.svg) · [Sections](planning/03-sections.svg) · [Review and verification](reviews/c06.md)

## Open the level

Run this command from the repository root.

```sh
node --experimental-transform-types bin/levelspec.mjs preview \
  projects/santa-bruma-remake/level.aml --nav-cell .125 --appearance materials
```

Open the loopback URL printed by the command. Use **Show roofs** for the complete exterior. Start **Walk from coordinates** at `13 54 4.8` for T or `105 65.6 4.8` for CT.

```sh
node --experimental-transform-types bin/levelspec.mjs build \
  projects/santa-bruma-remake/level.aml --out generated/santa-bruma-remake \
  --formats glb --no-uv --nav-cell .125 --strict-floor-gaps --json
```

The .125 m grid is the verified profile. On the review checkout, the default .0625 m grid exceeded the harness’s physical-route work budget. The player body is unchanged across both profiles. The model uses authored material colors and includes full roof geometry.

## Design provenance

The remake keeps the Santa Bruma setting from the earlier planning study and reorganizes it around a through-station. The [reference study](planning/references.md) records the station photographs. The [development notes](planning/development.md) record the random node-and-edge and exploration-lab trials, selected relationships and review changes.

The blockout passed LevelSpec validation, exported-collision walking and independent architecture, encounter and strategy reviews. Match balance, utility and bomb timing remain live 5v5 playtest work.
