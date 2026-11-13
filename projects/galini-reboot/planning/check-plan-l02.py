from pathlib import Path
import sys,json,math
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
out=Path('projects/galini-reboot/planning/l02');d=json.loads((out/'layout.json').read_text());e=json.loads((out/'encounters.json').read_text())
flat={z:unary_union([Polygon(f['p'],f['holes']) for f in d['flatFloors'] if f['z']==z]) for z in [0,2,4,6,8]}
def supported(p):
 q=Point(p[:2])
 if any(abs(z-p[2])<.015 and g.buffer(.025).covers(q) for z,g in flat.items()):return True
 for s in d['stairs']+d['ramps']:
  if not Polygon(s['p']).buffer(.03).covers(q):continue
  dx=s['b'][0]-s['a'][0];dy=s['b'][1]-s['a'][1];t=((p[0]-s['a'][0])*dx+(p[1]-s['a'][1])*dy)/(dx*dx+dy*dy)
  z=s['a'][2]+(s['b'][2]-s['a'][2])*t
  if -.005<=t<=1.005 and abs(z-p[2])<.23:return True
 return False
results=[]
for r in e['routes']:
 issues=[]
 for n,(a,b) in enumerate(zip(r['waypoints'],r['waypoints'][1:])):
  count=max(1,math.ceil(math.dist(a,b)/.25))
  bad=[]
  for k in range(count+1):
   p=[a[i]+(b[i]-a[i])*k/count for i in range(3)]
   if not supported(p):bad.append([round(v,3)for v in p])
  if bad:issues.append({'segment':n,'unsupportedSamples':len(bad),'first':bad[0],'last':bad[-1]})
 results.append({'route':r['id'],'segments':len(r['waypoints'])-1,'issues':issues})
report={'revision':'L02','scope':'Centerline floor-support sanity only, .25 m samples against drawn flat/stair/ramp envelopes. Not a body/collision/navigation test; wall openings, guards, stance and intermediate tread heights still require compiled checks.','routes':results}
(out/'plan-centerline-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([r for r in results if r['issues']],indent=2))
