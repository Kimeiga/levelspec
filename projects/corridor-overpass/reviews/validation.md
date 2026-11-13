# Worked project validation

Validated with the repository CLI using Node 24. Domain compilation and sealed
runtime validation pass, with no reported error diagnostics. Build with default
GLB and UV generation also passes. Reproducible artifacts are ignored under
`generated/corridor-overpass/`: runtime/report JSON, mesh, plan SVG and atlas data.

Use the commands in the project brief to regenerate. The compiled SVG is the
initial plan evidence; use floor isolation and section height in live preview for
upper crossing and stair relationships. Dimensions are authored design choices.
No surveyed reference reconstruction, independent building-code check or physical
structural analysis was performed. Do not treat validation as those claims.
