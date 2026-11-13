from pathlib import Path
import json,sys,math,hashlib
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
out=Path('projects/galini-reboot/planning/l03');d=json.loads((out/'layout.json').read_text());e=json.loads((out/'encounters.json').read_text());old=json.loads((out.parent/'l02/layout.json').read_text())
flat={z:unary_union([Polygon(f['p'],f['holes']) for f in d['flatFloors'] if f['z']==z]) for z in [0,2,4,6,8]}
checks=[]
for id,z,waypoints,stairs in [('R02-quay',0,[[25,25],[27,26.2],[36,26]],[]),('R07-Press',4,[[28,45.5],[28,50],[28,55]],[]),('R05/R10-Salt-foot',0,[[103,29],[103,28.6],[109,28.6],[111,25]],['S5a'])]:
 geometry=unary_union([flat[z],*[Polygon(s['p']) for s in d['stairs'] if s['id'] in stairs]])
 line=LineString(waypoints);sweep=line.buffer(.3,quad_segs=32);spill=sweep.difference(geometry).area
 checks.append({'id':id,'waypoints':waypoints,'z':z,'radius':.3,'minimumCenterToProjectedEdge':line.distance(geometry.boundary),'radiusSweepOutsideArea':spill,'passesProjectedEnvelope':spill<1e-8,'scope':'Continuous XY projection only, allowing the named adjacent flight at Salt foot; not the real stepped surface or full collision shape.'})
# Exact finite .45 m Press shell strip; no opening in the checked WX-M05-12 segment.
w=next(w for w in d['walls'] if w['id']=='WX-M05-12');shell=LineString([w['a'],w['b']]).buffer(w['thickness']/2,cap_style=2)
route=LineString([[28,45.5],[28,50],[28,55]])
checks.append({'id':'R07-finite-Press-shell','wall':w['id'],'thickness':w['thickness'],'centerDistanceToFiniteShell':route.distance(shell),'radiusMargin':route.distance(shell)-.3,'passes':not route.buffer(.3).intersects(shell)})
# Named School crossings preserve full standing height below every intersecting new member.
checksSupport=[]
for sid,points in [('SS01',[[92,84,4],[98,84,4]]),('SS02',[[107,58,4],[108,65,4],[108,68,4]]),('SS03',[[116,83,4],[125.5,83,4],[126,77,4],[125,70,4]])]:
 a=next(a for a in d['supportAssemblies'] if a['id']==sid);line=LineString([p[:2] for p in points]);sweep=line.buffer(.3,quad_segs=32);collisions=[];overhead=[];support=[]
 for member in a['members']:
  mp=Polygon(member['p'])
  if sweep.intersects(mp):
   if member['base']<5.8 and member['top']>4:collisions.append(member['id'])
   elif member['base']>=5.8:overhead.append({'id':member['id'],'clearHeightAboveFloor':member['base']-4})
  if member['base']==4:support.append({'id':member['id'],'basePolygonWithinExistingFloor':flat[4].buffer(.00001).covers(mp)})
 checksSupport.append({'assembly':sid,'path':points,'radius':.3,'standingHeight':1.8,'intersectingLowerMembers':collisions,'overheadMembers':overhead,'lowerSupportFootings':support,'boundaryFillRemoved':all(b['baseSupport']==7.7 for b in d['boundaries'] if b['id'] in a['boundaryIds'])})
# Freeze contract: this repair does not silently change the selected architecture/body.
unchanged={k:d[k]==old[k] for k in ['body','flatFloors','stairs','ramps','landings','doors','walls','buildings','stairVoids','objectiveFootprints','spawns','windows']}
result={'revision':'L03','scope':'Focused independent-review findings only: radius-.30 projected local routes, finite Press shell strip, explicit School support intersections and unchanged design fields. No compiled geometry, continuous body collision, sightline, balance or engineering acceptance.','localRouteChecks':checks,'schoolSupportChecks':checksSupport,'unchangedFromL02':unchanged}
(out/'repair-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
