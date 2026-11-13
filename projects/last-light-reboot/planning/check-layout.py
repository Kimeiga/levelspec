"""Proposal-only sampled footprint/headroom audit, not collision-aware harness verification."""
import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
root=Path(__file__).parent
d=json.loads((root/'developed-l01.json').read_text())
for o in d['objects']:o['shape']=unary_union([Polygon(p['outer'],p['holes']) for p in o['footprint']])
results=[]
for name,points in d['walk_routes'].items():
 failures=[];length=0
 for index,(a,b) in enumerate(zip(points,points[1:])):
  distance=math.dist(a,b);length+=distance
  for i in range(max(1,math.ceil(distance/.35))+1):
   t=i/max(1,math.ceil(distance/.35));p=[a[k]+(b[k]-a[k])*t for k in range(3)];disk=Point(p[:2]).buffer(.4)
   blocked=[o['id'] for o in d['objects'] if o['z0']<p[2]+2-.01 and o['z1']>p[2]+.3 and o['shape'].intersection(disk).area>.001]
   supports=[o['shape'] for o in d['objects'] if o['kind'] in ['floor','stair'] and abs(o['z1']-p[2])<=.301]
   if not supports or not unary_union(supports).buffer(.001).covers(disk):blocked.append('floor-edge/support')
   if blocked:failures.append(dict(segment=index,p=[round(x,2) for x in p],blockers=blocked))
 groups={}
 for f in failures:
  k=(f['segment'],tuple(f['blockers']))
  if k not in groups:groups[k]=f
 results.append(dict(route=name,length_m=round(length,2),hypothetical_5_5mps_s=round(length/5.5,2),harness_3_4mps_s=round(length/3.4,2),sample_spacing_m=.35,failure_count=len(failures),examples=list(groups.values())))
(root/'layout-sampling-l01.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:
 print(r['route'],r['length_m'],'m;',r['failure_count'],'sample warnings')
 for x in r['examples']:print(' ',x)
