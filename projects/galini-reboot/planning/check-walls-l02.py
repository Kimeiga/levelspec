from pathlib import Path
import sys,json,math
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import LineString,Point
out=Path('projects/galini-reboot/planning/l02');d=json.loads((out/'layout.json').read_text());e=json.loads((out/'encounters.json').read_text());report=[]
for r in e['routes']:
 issues=[]
 for n,(a,b) in enumerate(zip(r['waypoints'],r['waypoints'][1:])):
  path=LineString([a[:2],b[:2]])
  if path.length<.01:continue
  for wall in d['walls']:
   it=path.intersection(LineString([wall['a'],wall['b']]))
   if it.is_empty or it.geom_type!='Point':continue
   t=path.project(it)/path.length;z=a[2]+(b[2]-a[2])*t
   if not wall['base']<=z+1.8 or wall['top']<=z:continue
   allowed=any(q['id']in wall['doors'] and LineString([q['a'],q['b']]).buffer(.015).covers(it) and q['z']-.23<=z and z+1.8<=q['z']+q['clearHeight'] for q in d['doors'])
   if not allowed:issues.append({'segment':n,'wall':wall['id'],'xy':[round(it.x,3),round(it.y,3)],'floor':round(z,3)})
 report.append({'route':r['id'],'issues':issues})
(out/'plan-wall-crossings.json').write_text(json.dumps({'scope':'Analytic centerline crossings of exterior/internal shell lines, with standing head height and declared door voids. Not capsule clearance or compiled collision evidence.','routes':report},indent=2)+'\n')
print(json.dumps([r for r in report if r['issues']],indent=2))
