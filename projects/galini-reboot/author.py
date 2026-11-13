"""Project-owned native AML realization of frozen Galini L03; no shared engine edits."""
from pathlib import Path
import json,math,hashlib,sys
import xml.etree.ElementTree as X
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union,split
P=Path(__file__).parent;src=P/'planning/l03/layout.json';d=json.loads(src.read_text());enc=json.loads((P/'planning/l03/encounters.json').read_text())
assert hashlib.sha256(src.read_bytes()).hexdigest()=='72ac4503f7e74d5369572826a4bc683c1d8f7cb474b47e7a231403e7d19f837d'
root=X.Element('architecture',version='1',id='galini-reboot',name='Galini / Ravine Quarter',units='meters',validation='playable',description='C01 native realization of independently accepted L03: occupied coastal shoulders, market/civic crossings, shore commitment. Named suspended School assemblies preserve lower passages. No balance acceptance.')
def n(v):return f'{v:.6f}'.rstrip('0').rstrip('.') if isinstance(v,(int,float)) else str(v)
def node(tag,parent=root,**kw):return X.SubElement(parent,tag,{k.replace('_','-'):('true' if v is True else 'false' if v is False else n(v)) for k,v in kw.items() if v is not None})
def coords(pp):return '; '.join(' '.join(n(x) for x in p) for p in pp)
def parts(g):return [] if g.is_empty else [g] if g.geom_type=='Polygon' else [q for q in g.geoms if q.geom_type=='Polygon' and q.area>.00001]
def profile(id,p,holes=[]):
 def clean(r):
  out=[]
  for pt in r:
   q=[round(x,3) for x in pt]
   if not out or out[-1]!=q:out.append(q)
  if out[-1]==out[0]:out.pop()
  return out
 e=node('profile',id=id,points=coords(clean(p)))
 for h in holes:node('hole',e,points=coords(clean(h)))
 return id

def shape(id,g):return profile(id,list(g.exterior.coords)[:-1],[list(r.coords)[:-1] for r in g.interiors])
def path(id,p):node('path',id=id,points=coords(p));return id
materials={'paving':'#d9d0b7','stone':'#b5ab91','plaster':'#e7e1cb','ochre':'#c6ae83','blue':'#668d9a','clay':'#b58b74','roof':'#b98671','window':'#4f6e78','sea':'#82b8bf','rock':'#a8aa92','a-site':'#d19b69','b-site':'#8cac9b'}
for id,color in materials.items():node('material',id=id,color=color,roughness=.9)
node('player',radius=.3,height=1.8,crouch=1.1,step=.3,slope=42,vault=0,rappel=False,ladder=False)
city=node('assembly',id='town',coincident_material='retained-face',label='Complete occupied town, retaining systems and suspended passages')
maprows=[];repairs=[]
def extrude(id,g,z,top,material='stone',parent=city,group='structure',label=None):
 for i,q in enumerate(parts(g)):
  pid=id if len(parts(g))==1 else f'{id}-{i+1}'
  node('extrusion',parent,id=pid,profile=shape(pid+'-plan',q),position=f'0 0 {n(z)}',distance=top-z,material=material,group=group,label=label)
  maprows.append({'id':pid,'kind':group,'base':z,'top':top})
def wall(id,a,b,z,top,t=.45,material='plaster',alignment='center',parent=city,top_path=None,label=None,anchor=None):
 attrs=dict(id=id,path=path(id+'-axis',[[*a,z],[*b,z]]),thickness=t,height=top-z,material=material,alignment=alignment,group='walls',label=label)
 if top_path:attrs['top']=path(id+'-top',top_path)
 if anchor:attrs['contact_floor']=anchor
 node('wall',parent,**attrs)
 return id
flat={f['id']:Polygon(f['p'],f['holes']) for f in d['flatFloors']}
# Native floor guides omit the unusable ground remnants within explicit stair wells.
for f in d['flatFloors']:
 for wid,low in [('H-L',0),('H-P',4),('H-S',4)]:
  if f['z']!=low:continue
  well=Polygon(next(w['p'] for w in d['stairVoids'] if w['id']==wid));removed=flat[f['id']].intersection(well)
  if removed.area>.00001:repairs.append({'id':f['id'],'change':'Remove non-route lower-floor remnants within open stair well','well':wid,'area':removed.area,'polygons':[list(q.exterior.coords) for q in parts(removed)]});flat[f['id']]=flat[f['id']].difference(well)
 if f['z']==6:
  overhead=unary_union([Polygon(q['p'],q['holes']) for q in d['flatFloors'] if q['z']==8]+[Polygon(q['p']) for q in d['buildings'] if q['base']==8])
  removed=flat[f['id']].intersection(overhead)
  if removed.area>.00001:repairs.append({'id':f['id'],'change':'Unoccupied porch remnant below upper mass is retaining fabric, not 1.7m-high floor','area':removed.area,'polygons':[list(q.exterior.coords) for q in parts(removed)]});flat[f['id']]=flat[f['id']].difference(overhead)

for f in d['flatFloors']:
 node('slab',city,id=f['id'],profile=shape(f['id']+'-plan',flat[f['id']]),elevation=f['z'],thickness=.3,material='paving',group='floors',label='L03 exact normalized walking floor')
 maprows.append({'id':f['id'],'layout':f['id'],'kind':'floor'})
# Backing rock closes the terrain mass behind retaining faces. Lower occupied floors,
# flights, named suspended School bays and bridge ravine volumes are explicit voids.
cliff_body=node('assembly',id='cliff-backing',coincident_material='retained-face',label='Continuous terrain behind retaining faces, outside occupied lower passages')
all_bridge_voids=[Polygon(q) for q in [[[50,56],[78,56],[78,62],[50,62]],[[54,87],[64,88],[76,92],[76,98],[64,94],[54,93]]]]
for f in d['flatFloors']:
 if f['z'] not in [0,4,8]:continue
 lower=[Polygon(q['p'],q['holes']).buffer(.65,join_style=2) for q in d['flatFloors'] if q['z']<f['z']]
 lower += [Polygon(q['p']).buffer(.4,join_style=2) for q in d['stairs']+d['ramps'] if min(q['a'][2],q['b'][2])<f['z']]
 lower += [Polygon(a['slabPlan']).buffer(.4,join_style=2) for a in d['supportAssemblies'] if f['z']==8]
 rock=flat[f['id']].difference(unary_union(lower+all_bridge_voids))
 # Building occupancy is governed by its own per-storey fabrication, not terrain.
 rock=rock.difference(unary_union([Polygon(q['p']) for q in d['buildings']]))
 extrude(f['id']+'-rock-backing',rock,-6.4,f['z']-.3,'rock',parent=cliff_body,group='terrain',label='Solid cliff/seawall backing outside all lower occupied routes')
# Fill only scenic building remainder; explicitly occupied rooms and vertical wells
# are removed per Z band. Exterior shell objects below restore exact door-sized exits.
well_building={'M04':('H-L',0,7.2),'M08':('H-P',4,11.2),'M14':('H-S',4,11.2)}
for building in d['buildings']:
 bid=building['id'];g=Polygon(building['p']);ins=[i for i in d['interiors'] if any(q['interior']==i['id'] and q['building']==bid for q in d['doors'])]
 cuts=[(i['z'],i['ceiling'],Polygon(i['p'])) for i in ins]
 if bid in well_building:
  wid,low,high=well_building[bid];w=next(q for q in d['stairVoids'] if q['id']==wid);cuts.append((low,high,Polygon(w['p'])))
  # Include complete flight envelopes where they protrude beyond the top well outline.
  stprefix={'M04':'S1','M08':'S4','M14':'S7'}[bid]
  for s in d['stairs']:
   if s['id'].startswith(stprefix):cuts.append((low,high,Polygon(s['p'])))
 heights=sorted(set([-6,building['base'],building['eaves'],*[z for lo,hi,p in cuts for z in [lo,hi]],*[z for q in d['doors'] if q['building']==bid for z in [q['z'],q['z']+q['clearHeight']]]]))
 for j,(lo,hi) in enumerate(zip(heights,heights[1:])):
  if hi<=lo:continue
  active=[p for a,b,p in cuts if a<hi-.001 and b>lo+.001]
  for door in [q for q in d['doors'] if q['building']==bid and q['z']<hi-.001 and q['z']+q['clearHeight']>lo+.001]:
   active.append(LineString([door['a'],door['b']]).buffer(.65,cap_style=2))
  remaining=g.difference(unary_union(active)) if active else g
  # Entire overhead cap is an actual roof so global roof-off exposes the room below.
  if cuts and lo>=max(q[1] for q in cuts)-.001:
   for k,q in enumerate(parts(remaining)):
    id=f'{bid}-ceiling-{j}-{k}';node('roof',city,id=id,profile=shape(id+'-plan',q),elevation=hi,thickness=hi-lo,material='plaster',group='roof',playable=False)
  else:extrude(f'{bid}-fabric-{j}',remaining,lo,hi,'ochre' if bid in ['M07','M09','M17'] else 'plaster',label=building['name']+' / closed building fabric')
 # Actual two-plane pitched roof, clipped to each irregular footprint.
 x0,y0,x1,y1=g.bounds;axis=1 if x1-x0>=y1-y0 else 0;low=[x0,y0][axis];high=[x1,y1][axis];mid=(low+high)/2
 height=lambda p:building['eaves']+1.5*(1-abs((p[axis]-mid)/((high-low)/2)))
 ridge=LineString([[-100,mid],[300,mid]]) if axis==1 else LineString([[mid,-100],[mid,300]])
 for j,q in enumerate(parts(split(g,ridge))):
  pp=[[x,y,height([x,y])] for x,y in list(q.exterior.coords)[:-1]];id=f'{bid}-pitched-roof-{j+1}'
  pr=node('profile',id=id+'-plan',dimensions=3,points=coords(pp));node('roof',city,id=id,profile=pr.attrib['id'],thickness=.3,material='roof',group='roof',playable=False)
 # Exact shell, with pitched gable closure and bounded movement openings.
 for w in [w for w in d['walls'] if w['building']==bid and w['id'].startswith('WX-')]:
  a,b=w['a'],w['b'];length=math.dist(a,b);ts=[0,1]
  if (a[axis]-mid)*(b[axis]-mid)<0:ts.append((mid-a[axis])/(b[axis]-a[axis]))
  top=[[length*t,height([a[k]+(b[k]-a[k])*t for k in range(2)])-w['base'],0] for t in sorted(ts)]
  wall(w['id'],a,b,w['base'],building['eaves'],w['thickness'],'plaster',label=building['name']+' / complete facade')
  # A vertical native extrusion closes the pitched gable without a longitudinal
  # wall-profile endpoint that cannot represent an irrational path length at mm input.
  cap=[[0,0],[length,0]]+[[length*t,height([a[k]+(b[k]-a[k])*t for k in range(2)])-building['eaves']] for t in sorted(ts,reverse=True)]
  capg=Polygon(cap)
  if capg.area>.001:
   nx,ny=-(b[1]-a[1])/length,(b[0]-a[0])/length
   cid=w['id']+'-gable'
   node('extrusion',city,id=cid,profile=shape(cid+'-plan',capg),position=coords([[a[0]+nx*.225,a[1]+ny*.225,building['eaves']]]),rotation=f'90 0 {n(math.degrees(math.atan2(b[1]-a[1],b[0]-a[0])))}',distance=.45,material='plaster',group='walls',label='Pitched facade closure')
  for door in [q for q in d['doors'] if q['id'] in w['doors']]:
   center=LineString([a,b]).project(Point([(door['a'][k]+door['b'][k])/2 for k in range(2)]))
   node('opening',id=door['id'],host=w['id'],shape='rectangle',center=f'{n(center)} {n(door["z"]-w["base"]+door["clearHeight"]/2)}',width=door['width'],height=door['clearHeight'])
# C08 drawn local closures: unusable blind ledges become attached masonry, not hidden nav exclusions.
for patch in json.loads((P/'production/margin-repair-proposal.json').read_text()):
 extrude(patch['id'],Polygon(patch['p']),patch['base'],patch['top'],'stone',label=patch['reason'])
 repairs.append({'id':patch['id'],'change':patch['reason'],'p':patch['p'],'base':patch['base'],'top':patch['top'],'routeCapsulePlanIntersections':patch['routeCapsulePlanIntersections']})
# Interior undercroft divider has its own D02 opening.
for w in [q for q in d['walls'] if q['id'].startswith('WI-')]:
 wall(w['id'],w['a'],w['b'],w['base'],w['top'],w['thickness'])
 for did in w['doors']:
  door=next(q for q in d['doors'] if q['id']==did);mid=[(door['a'][k]+door['b'][k])/2 for k in range(2)];center=LineString([w['a'],w['b']]).project(Point(mid))
  node('opening',id=did,host=w['id'],shape='rectangle',center=f'{n(center)} {n(door["z"]-w["base"]+door["clearHeight"]/2)}',width=door['width'],height=door['clearHeight'])
bridge_defs=[('BR-M',[[50,56],[78,56],[78,62],[50,62]],4,.6,[58,70]),('BR-U',[[54,87],[64,88],[76,92],[76,98],[64,94],[54,93]],8,.7,[61,70])]
# Floor perimeter construction. Outside parapets sit outside clear floor; named
# suspended School boundaries begin at7.7 and never inherit bed-level fill.
for b in d['boundaries']:
 if b['kind']=='movement interface' or math.dist(b['a'],b['b'])<.003:continue
 a,c=b['a'],b['b'];g=flat[b['floor']];dx,dy=c[0]-a[0],c[1]-a[1];ll=math.hypot(dx,dy);m=[(a[0]+c[0])/2,(a[1]+c[1])/2]
 if any(ob['z']==b['z'] and Polygon(ob['p']).boundary.distance(Point(m))<.001 for ob in d['obstacles']):
  repairs.append({'id':b['id'],'change':'No duplicate parapet around actual obstacle footprint','bounds':[a,c],'retainedObstacle':True});continue
 if any(low<=b['z']<high-3.2 and Polygon(next(q['p'] for q in d['stairVoids'] if q['id']==wid)).buffer(.001).covers(Point(m)) for wid,low,high in well_building.values()):
  repairs.append({'id':b['id'],'change':'Lower-room boundary omitted inside explicit open stair well','bounds':[a,c]});continue

 inside=g.buffer(.0001).covers(Point(m[0]-dy/ll*.01,m[1]+dx/ll*.01));alignment='right' if inside else 'left'
 interior=b['kind']=='interior full-height wall';z=b['baseSupport'];top=b['z']+b['height']
 void_edge=any(w['z']==b['z'] and Polygon(w['p']).boundary.distance(Point(m))<.002 for w in d['stairVoids'])
 if void_edge:alignment='left' if inside else 'right';interior=False;repairs.append({'id':b['id'],'change':'Place well-edge enclosure wholly on upper floor side; retain full declared flight/landing clearance','alignment':alignment})
 for bridge_id,bridge_p,bridge_z,deck,piers in bridge_defs:
  if b['z']==bridge_z and Polygon(bridge_p).buffer(.001).covers(Point(m)):
   z=bridge_z-deck;repairs.append({'id':b['id'],'change':'Bridge edge starts at explicit deck soffit; arch/abutment assembly supplies support','base':z,'bridge':bridge_id})
 wall(b['id'],a,c,z,top,b['thickness'],'plaster' if interior else 'stone','center' if interior else alignment,label=b['kind']+' / '+b.get('supportAssembly','local boundary'))
 # Door channels cut both the facade and any separate normalized inner boundary.
 for door in d['doors']:
  if door['z']!=b['z']:continue
  dl=LineString([door['a'],door['b']]);bl=LineString([a,c]);overlap=bl.intersection(dl.buffer(.65,cap_style=2))
  if overlap.length<.05:continue
  stations=[bl.project(Point(door[k])) for k in ['a','b']]
  if abs(stations[1]-stations[0])<.05:continue
  oid=door['id']+'-inner-'+b['id']
  node('opening',id=oid,host=b['id'],shape='rectangle',center=f'{n(sum(stations)/2)} {n(door["z"]-z+door["clearHeight"]/2)}',width=abs(stations[1]-stations[0]),height=door['clearHeight'])
  repairs.append({'id':b['id'],'change':'Carry declared movement opening through redundant inner boundary','door':door['id']})
 for wid in b.get('observationOpenings',[]):
  w=next(q for q in d['windows'] if q['id']==wid);mid=[(w['a'][k]+w['b'][k])/2 for k in range(2)];distance=LineString([a,c]).project(Point(mid))
  node('opening',id=wid,host=b['id'],shape='rectangle',center=f'{n(distance)} {n(w["z"]-z+(w["sill"]+w["head"])/2)}',width=math.dist(w['a'],w['b']),height=w['head']-w['sill'])
for stair in d['stairs']:
 id=stair['id'];node('stairs',city,id=id,path=path(id+'-axis',[stair['a'],stair['b']]),width=stair['width'],count=10,thickness=.3,underside='filled',material='paving',group='stairs',label=stair['name'])
 for side in ['left','right']:node('enclosure',city,id=id+'-'+side,host=id,side=side,construction='parapet',offset=.1,height=1.1,thickness=.2,material='stone',group='guards')
for ramp in d['ramps']:
 id=ramp['id'];node('ramp',city,id=id,path=path(id+'-axis',[ramp['a'],ramp['b']]),width=5,thickness=.3,underside='filled',material='paving',group='ramps')
 for side in ['left','right']:node('enclosure',city,id=id+'-'+side,host=id,side=side,construction='parapet',offset=.12 if id=='R6b' else .1,height=1.1,thickness=.24 if id=='R6b' else .2,material='stone',group='guards')
repairs.append({'id':'R6b-side-joints','change':'Upper cart-road guard thickens 4cm outward only to close microscopic perimeter seam; inner clear face and5m width unchanged','oldThickness':.2,'newThickness':.24,'offset':.12})
# Solid masonry web supports only the existing guard footprint beside filled flights.
# No shared room, landing, School arcade or passage is filled by this local repair.
for flight in [next(q for q in d['stairs'] if q['id']=='S3b'),*d['ramps']]:
 a,b=flight['a'],flight['b'];length=math.dist(a[:2],b[:2]);ux,uy=(b[0]-a[0])/length,(b[1]-a[1])/length;nx,ny=-uy,ux
 width=flight.get('width',5);low=min(a[2],b[2])-.3
 for side in (['right'] if flight['id']=='S3b' else ['left','right']):
  seam=.01 if flight['id'].startswith('R6') else 0
  web=.24 if flight['id']=='R6b' else .2
  offset=width/2+web+seam if side=='left' else -width/2+seam
  edge=[a[0]+nx*offset,a[1]+ny*offset];top=[]
  if flight['id']=='S3b':
   for i in range(10):top.extend([[length*i/10,a[2]+(i+1)*.2+.01],[length*(i+1)/10,a[2]+(i+1)*.2+.01]])
  else:top=[[0,a[2]+.01],[length,b[2]+.01]]
  pg=Polygon([[0,low],[length,low]]+list(reversed(top)))
  id=flight['id']+'-'+side+'-masonry-web'
  node('extrusion',city,id=id,profile=shape(id+'-section',pg),position=f'{n(edge[0])} {n(edge[1])} 0',rotation=f'90 0 {n(math.degrees(math.atan2(uy,ux)))}',distance=web+2*seam,material='stone',group='supports',label='Masonry only below existing flight-side guard; no lower passage')
  repairs.append({'id':id,'change':'Support existing guard only, down to filled-flight base','base':low,'width':web+2*seam,'overlapAtConstructionSeam':seam,'axis':[a,b],'side':side,'keptClear':'Adjacent landings, turns and all named lower passages'})
# Internal landing supports are confined below the actual platforms; no lower route
# is promised beneath them. School through-arcade is north of its landing.
for l in d['landings']:
 if l['id'] not in ['L1','L2','L3','L4','L5','L7','L8','LR6']:continue
 z=l['z'];base=0 if z==2 else 4
 if z>base:extrude(l['id']+'-masonry',Polygon(l['p']),base,z-.3,'stone',label='Non-traversable landing support; occupied passage lies outside')
for ob in d['obstacles']:
 node('slab',city,id=ob['id']+'-footing',profile=profile(ob['id']+'-footing-plan',ob['p']),elevation=ob['z'],thickness=.3,material='paving',group='supports',playable=False,label='Continuous supporting slab below occupied obstacle footprint')
 extrude(ob['id'],Polygon(ob['p']),ob['z'],ob['z']+ob['height'],'stone',group='cover',label=ob['name'])
for a in d['supportAssemblies']:
 for member in a['members']:extrude(member['id'],Polygon(member['p']),member['base'],member['top'],'stone',group='supports',label=member['role'])
# Full bridge deck and masonry support; the playable floor above remains its L03 slab.
for id,p,z,t,piers in bridge_defs:
 node('slab',city,id=id+'-deck',profile=profile(id+'-plan',p),elevation=z,thickness=t,material='stone',group='bridge')
 g=Polygon(p)
 sub=node('assembly',city,id=id+'-substructure',coincident_material='retained-face',label='Continuous stone arch and broad bank abutment')
 extrude(id+'-spandrel',g,-6,z-t,'stone',parent=sub,group='bridge',label='Masonry spandrel around actual arch voids')
 bays=[(53,57),(59,69),(71,75)] if id=='BR-M' else [(57,60),(62,69),(71,73)]
 for j,(a,b) in enumerate(bays):
  height=z-t+6-1.7
  node('opening',id=id+f'-arch-{j+1}',host=id+'-substructure',shape='arch',center=f'{n((a+b)/2)} {n(-6+height/2)}',width=b-a,height=height)
 for j,x in enumerate(piers):extrude(id+f'-pier-{j}',g.intersection(box(x-1,0,x+1,120)),-6,z-t,'stone',label='Full masonry pier / scenic ravine')
 for side,xx in [('west',min(q[0] for q in p)),('east',max(q[0] for q in p))]:
  # Abutment sits underneath three metres of the bridge end, joined to its shoulder.
  ab=g.intersection(box(xx if side=='west' else xx-3,0,xx+3 if side=='west' else xx,120));extrude(id+'-'+side+'-abutment',ab,-6,z-t,'rock',label='Broad bank abutment')
# Nonplayable sea and rock setting. These are not hidden movement support.
scenic=node('group',id='setting',collidable=False)
node('slab',scenic,id='coastal-sea',profile=profile('sea-plan',[[-20,-20],[155,-20],[155,135],[-20,135]]),elevation=-6.6,thickness=.2,material='sea',playable=False)
# Site material assignments leave the floor unraised.
for site in d['objectiveFootprints']:
 pid=profile('site-'+site['id']+'-plan',site['p']);f=next(f for f in d['flatFloors'] if f['z']==site['z'] and flat[f['id']].covers(Polygon(site['p'])))
 node('face-material',id='site-'+site['id']+'-paint',host=f['id'],profile=pid,face='top',material=site['id'].lower()+'-site')
 node('volume',id='site-'+site['id'],profile=pid,elevation=site['z'],height=2,role='objective')
# Explicit physical movement mouths bind each native flight to its actual floor.
for st in d['stairs']+d['ramps']:
 length=math.dist(st['a'][:2],st['b'][:2]);ux=(st['b'][0]-st['a'][0])/length;uy=(st['b'][1]-st['a'][1])/length
 for end,p,sign in [('start',st['a'],-1),('end',st['b'],1)]:
  q=Point(p[0]+sign*ux*.45,p[1]+sign*uy*.45)
  f=next((f for f in d['flatFloors'] if f['z']==p[2] and flat[f['id']].buffer(.001).covers(q)),None)
  if not f:raise ValueError('No declared floor at '+st['id']+' '+end)
  width=st['width']-.8;a=[p[0]-uy*width/2,p[1]+ux*width/2,p[2]];b=[p[0]+uy*width/2,p[1]-ux*width/2,p[2]]
  node('connection',id=st['id']+'-'+end+'-connection',**{'from':f['id'] if end=='start' else st['id'],'to':st['id'] if end=='start' else f['id']},path=path(st['id']+'-'+end+'-mouth',[a,b]))
# Local explicit passage assertions, independent of exterior retaining heuristics.
for id,p,z in [('clear-SS01',[[93,83.7],[96,83.7],[96,84.3],[93,84.3]],4),('clear-SS02',[[107.3,62.7],[108.1,62.7],[108.1,65.3],[107.3,65.3]],4),('clear-SS03',[[125.3,80.4],[126,80.4],[126,81.3],[125.3,81.3]],4),('clear-School-arcade',[[96,83.6],[112,83.6],[112,84.4],[96,84.4]],4)]:
 node('clearance',id=id,profile=profile(id+'-plan',p),elevation=z,height=1.8,require_support=True)
for sp in d['spawns']:
 for i,p in enumerate(sp['positions']):node('marker',id=f'{sp["id"]}-spawn-{i+1}',kind='attacker_spawn' if sp['id']=='T' else 'defender_spawn',position=coords([[*p,sp['z']]]))
for route in enc['routes']:
 for suffix,p in [('start',route['waypoints'][0]),('end',route['waypoints'][-1])]:node('marker',id=route['id']+'-'+suffix,kind='poi',position=coords([p]))
 node('route',id=route['id'],**{'from':route['id']+'-start','to':route['id']+'-end'},min_routes=1,max_distance=math.ceil(sum(math.dist(a,b) for a,b in zip(route['waypoints'],route['waypoints'][1:]))+15))
X.indent(root,space='  ');X.ElementTree(root).write(P/'level.aml',encoding='utf-8',xml_declaration=True)
(P/'production').mkdir(exist_ok=True)
for route in enc['routes']:
 if route['id']=='R01':
  route['waypoints'].insert(2,[6.5,37,0]);route['waypoints']=[([p[0],53.2,p[2]] if p[1]==53.5 and p[2]==2 else p) for p in route['waypoints']]
  i=route['waypoints'].index([15,46,0]);route['waypoints'][i:i+1]=[[15,45,0],[17,45,0]]
 if route['id']=='R06':route['waypoints'].insert(route['waypoints'].index([121,29,0]),[121,30,0])
for section in enc['turningTransfers']:
 if section['id']=='TURN-S1':
  for pose in section['poses']:
   if pose['id']=='N':pose['look']=[15,45,0]
(P/'production/encounters-c01.json').write_text(json.dumps(enc,indent=2)+'\n')
(P/'production/repairs-c01.json').write_text(json.dumps(repairs,indent=2)+'\n')
(P/'production/construction-c01.json').write_text(json.dumps({'revision':'C01','layoutSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'body':d['body'],'sourceMap':maprows,'changes':[{'objects':[s['id'] for s in d['stairs']],'type':'native tread convention','accepted':'6m run /2m rise /10 risers /9 stated .667 goings','native':'6m run /2m rise /10 risers /10 .6m tread intervals; end positions and clear widths retained','needsCompiledReview':True}],'contracts':['SS01–SS03 exact named support precedence retained.','No generic building or retaining fill replaces declared occupied room/arcade/well.','Full pitched roofs and facades; no roof is playable.','Native source XML is editable production; planning JSON remains frozen evidence.','Bridge generic retaining edges now begin at the explicit deck soffits; actual arched spandrels, piers and abutments support both spans.','Obstacle footprint holes receive supporting .30m slabs below the obstacle, with no extra parapet enlarging the cover.','Explicit stair-well airspace takes precedence over lower-room boundaries within H-L/H-P/H-S; Taverna movement channels cut all facade thickness.']},indent=2)+'\n')
print('Native AML written:',len(root),'root records')
