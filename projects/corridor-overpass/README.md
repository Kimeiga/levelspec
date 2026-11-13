# Corridor and overpass worked project

This deliberately small architectural study derives from the XML showcase: a
courtyard/corridor approach, two independent vertical connections and an elevated
crossing. XML is canonical; generated meshes are not editable sources.

Dimensions are design choices in meters, not surveyed measurements. Ground is Z=0;
upper bridge is Z=3. The 9 m ramp run rises 3 m (about18.4 degrees). Stair rise/run
and actual navigation clearance must be checked against compiled geometry rather
than inferred from these nominal dimensions. This is not building-code evidence.

The retained source uses historical SVGX. Migrate it explicitly before using the
current AML commands; the migration keeps the original source intact.

```
npm run levelspec -- migrate projects/corridor-overpass/level.level.svgx --out projects/corridor-overpass-aml
npm run levelspec -- validate projects/corridor-overpass-aml/level.aml --json
npm run levelspec -- preview projects/corridor-overpass-aml/level.aml
npm run levelspec -- build projects/corridor-overpass-aml/level.aml --out generated/corridor-overpass
```

Inspect the ground plan, upper crossing and stair landings; isolate floors or use
section height to inspect headroom. Keep references, editable plan/section studies,
and review notes in their respective directories. No external photographs are
claimed as evidence for this synthetic study. Check the declared spawn-to-objective
route and independent land report after every geometric change.
