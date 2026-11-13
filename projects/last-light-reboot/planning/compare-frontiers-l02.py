from pathlib import Path
import json,sys,math
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,Point,LineString,box
from shapely.ops import unary_union
R=Path(__file__).parent
base=json.loads((R/'developed-l01.json').read_text())
for o in base['objects']:o['_g']=unary_union([Polygon(p['outer'],p['holes']) for p in o['footprint']])
def ob(id,g):return dict(id=id,_g=g,z0=0,z1=4.4,kind='wall')
def ray(a,b,obs):
 line=LineString([a[:2],b[:2]]);length=line.length;hits=[]
 for o in obs:
  if o['kind']=='glazing':continue
  inter=line.intersection(o['_g'])
  if inter.is_empty:continue
  gs=[inter] if inter.geom_type in ['Point','LineString'] else list(inter.geoms)
  for g in gs:
   if not hasattr(g,'coords'):continue
   ts=[line.project(Point(q))/length for q in g.coords];lo=max(min(ts),.0001);hi=min(max(ts),.9999)
   if lo>hi:continue
   za=a[2]+(b[2]-a[2])*lo;zb=a[2]+(b[2]-a[2])*hi
   if max(za,zb)>o['z0']+.001 and min(za,zb)<o['z1']-.001:hits.append(o['id']);break
 return hits
variants={
 'V0-L01':[],
 'V1-outer-service-return':[ob('W-OUT',box(23.8,28,24.2,32)),ob('E-RETURN',box(103.8,72,104.2,76))],
 'V2-inner-service-return':[ob('W-IN',box(15.8,28,16.2,32)),ob('E-RETURN',box(103.8,72,104.2,76))],
 'V3-public-vestibule':[ob('W-PUBLIC',box(24,20.8,28,21.2)),ob('E-RETURN',box(103.8,72,104.2,76))]
}
portals={p['id']:p for p in base['portals']}
def samples(pid,eye):
 p=portals[pid];a=p['a'];b=p['b'];return [[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,eye] for t in [.1,.3,.5,.7,.9]]
results=[]
for variant,extra in variants.items():
 obs=base['objects']+extra;record={'id':variant,'districts':[]}
 for side,witness,pair,limits in [('west',[26,30],['P-WP1','P-WS1'],[24,28,28,32]),('east',[94,74],['P-EP1','P-ES1'],[92,96,72,76])]:
  stances=[]
  for stance,eye in [('stand',1.86),('crouch',1.0695)]:
   checks=[]
   for x in range(limits[0],limits[1]+1):
    for y in range(limits[2],limits[3]+1):
     disc=Point(x,y).buffer(.4)
     if any(o['z0']<2 and o['z1']>.3 and o['_g'].intersection(disc).area>.001 for o in obs):continue
     floor=next(o['_g'] for o in obs if o['id']=='F-G')
     if not floor.covers(disc):continue
     counts=[sum(not ray([x,y,eye],t,obs) for t in samples(pid,eye)) for pid in pair]
     checks.append(dict(p=[x,y],visible=counts))
   center=[dict(portal=pid,visible=sum(not ray(witness+[eye],t,obs) for t in samples(pid,eye))) for pid in pair]
   stances.append(dict(stance=stance,witness=center,valid_offsets=len(checks),both_frontiers=sum(all(v>0 for v in c['visible']) for c in checks),offsets=checks))
  record['districts'].append(dict(side=side,stances=stances))
 results.append(record)
(R/'frontier-comparison-l02.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:
 print(r['id'])
 for d in r['districts']:
  s=d['stances'][0];print(d['side'],s['witness'],'both offset positions',s['both_frontiers'],'/',s['valid_offsets'])
