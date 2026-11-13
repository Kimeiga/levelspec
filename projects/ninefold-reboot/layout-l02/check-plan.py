"""Finite geometric self-inspection of the proposed layout; not a gameplay harness."""
from pathlib import Path
import json, math
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
P=Path(__file__).parent;d=json.loads((P/'layout-data.json').read_text())
floors={f['z']:unary_union([Polygon(p['outer'],p['holes']) for p in f['polygons']]) for f in d['floors']}
def flight_height(s,p):
 a,b=s['a'],s['b']; dx,dy=b[0]-a[0],b[1]-a[1]
 t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)
 return s['low']+max(0,min(1,t))*(s['high']-s['low'])
flight=[(s,LineString([s['a'],s['b']]).buffer(2,cap_style=2)) for s in d['stairs']]
results=[]
for j in d['journeys']:
 errors={}
 for a,b in zip(j['waypoints'],j['waypoints'][1:]):
  n=max(1,math.ceil(math.dist(a,b)/.25))
  for k in range(n+1):
   p=[a[q]+(b[q]-a[q])*k/n for q in range(3)];pt=Point(p[:2]);z=p[2]
   support=any(abs(z-fz)<.03 and poly.buffer(.02).covers(pt) for fz,poly in floors.items()) or any(poly.buffer(.02).covers(pt) and abs(flight_height(s,p)-z)<.06 for s,poly in flight)
   if not support:errors.setdefault('no planned surface',p)
   for w in [*d['boundaryWalls'],*d['partitions']]:
    if w['z']>=z+2-.01 or w['top']<=z+.02:continue
    if pt.distance(LineString([w['a'],w['b']]))<.25+w['thickness']/2-.02:errors.setdefault(w['id'],p)
   for o in d['obstacles']:
    if o['z']>=z+2-.01 or o['top']<=z+.02:continue
    if Polygon(o['polygon']).buffer(.25-.02).covers(pt):errors.setdefault(o['id'],p)
   for s,poly in flight:
    if poly.covers(pt):
     fz=flight_height(s,p)
     if z+.06<fz<z+2+.24:errors.setdefault('headroom under '+s['id'],p)
 results.append({'id':j['id'],'sampleSpacing':.25,'issues':[{'object':id,'at':[round(x,2) for x in p]} for id,p in errors.items()]})

# Thin-wall aperture intersection is a deliberately limited planning calculation.
variants=[{'id':'School-west (declined)','x':46,'y':[44,46],'sill':4.15,'head':5.75,'observer':[45,45,5.06]},
 {'id':'East-north pocket (selected)','x':56,'y':[47.6,49.6],'sill':4.15,'head':5.75,'observer':[57,48.6,5.06]}]
targets={'underpass':[52,40,1.86],'well-center':[50,49,1.86],'Dye-threshold':[52,54,1.86]}
for v in variants:
 rows=[]
 for name,t in targets.items():
  o=v['observer'];ratio=(v['x']-o[0])/(t[0]-o[0]);q=[v['x'],o[1]+ratio*(t[1]-o[1]),o[2]+ratio*(t[2]-o[2])]
  rows.append({'target':name,'wallIntersection':[round(a,3) for a in q],'insideAperture':v['y'][0]<=q[1]<=v['y'][1] and v['sill']<=q[2]<=v['head']})
 v['rays']=rows
out={'revision':'L02','method':'0.25m planned path centers, r0.25/height2, polygon walls and props, analytic flight height. No native stair treads, headroom roof mesh, stances, time or target-engine validation. Aperture rays only test one wall plane.','journeys':results,'apertureComparison':variants}
(P/'planning-checks.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
