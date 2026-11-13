#!/bin/sh
# Rebuild evidence for a revision: sh projects/dragon-ford/finalize.sh r02
# Waits (up to ~40 min) for the shared compiler to load when another session has it mid-edit.
cd "$(dirname "$0")/../.."
REV=$1; O=generated/dragon-ford/$REV; E=projects/dragon-ford/reviews/evidence/$REV
n=0
until node -e "await import('./src/architecture/index.ts')" --input-type=module >/dev/null 2>&1; do n=$((n+1)); [ $n -gt 80 ] && { echo "compiler still not loading"; exit 3; }; sleep 30; done
sh projects/dragon-ford/render.sh projects/dragon-ford/layout-$REV >/dev/null || exit 1
uv run --quiet --with shapely python projects/dragon-ford/author.py >/dev/null || exit 1
rm -rf $O; mkdir -p $O
npm run --silent levelspec -- build projects/dragon-ford/level.aml --out $O/build --json > $O/build.json 2> $O/build.err
node projects/dragon-ford/verify.mjs projects/dragon-ford/layout-$REV/layout-data.json projects/dragon-ford/level.aml $O/verify > $O/verify.out 2>&1
node projects/dragon-ford/sightlines.mjs projects/dragon-ford/layout-$REV/layout-data.json projects/dragon-ford/level.aml $O/sightlines.json 1 32 > $O/sightlines.txt 2>/dev/null
(cd projects/dragon-ford && uv run --quiet --with shapely python views.py > views.json)
node projects/dragon-ford/capture.mjs projects/dragon-ford/level.aml $O/captures projects/dragon-ford/views.json > $O/capture.out 2>&1
rm -rf $E; mkdir -p $E
cp -r $O/captures $E/captures 2>/dev/null; cp $O/verify/verification.json $O/sightlines.json $O/sightlines.txt $O/build.json $E/ 2>/dev/null
shasum -a 256 projects/dragon-ford/level.aml > $E/source.sha256
node -e "
const fs=require('fs');const b=JSON.parse(fs.readFileSync('$O/build.json','utf8'));const c={};for(const d of b.diagnostics){c[d.severity+' '+d.code]=(c[d.severity+' '+d.code]||0)+1}
console.log('build',b.success,JSON.stringify(c));for(const d of b.diagnostics.filter(d=>d.severity==='error').slice(0,6))console.log(d.code,d.message.slice(0,220),JSON.stringify(d.review?.bounds),d.objects);
const r=JSON.parse(fs.readFileSync('$O/verify/verification.json','utf8'));
console.log(r.sourceSha256,'walks',r.results.length,'fail',r.results.filter(x=>!x.ok).map(x=>x.id+JSON.stringify(x.failure??x.error).slice(0,150)),'views',r.views.length,'disagree',r.views.filter(v=>v.agrees===false).map(v=>v.id),r.placementFailures);
for(const x of r.results.filter(x=>x.id.startsWith('J')&&!x.reverse))console.log(x.id,x.distance)"
head -22 $O/sightlines.txt; tail -1 $O/capture.out
