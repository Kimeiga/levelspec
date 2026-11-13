"""Rebuild reviewed L02 AML. This overwrites level.aml; edit AML directly for later work."""
import json, math, xml.etree.ElementTree as E
from pathlib import Path
from collections import Counter
P=Path(__file__).parent;d=json.loads((P/'layout-data.json').read_text())
root=E.Element('architecture',version='1',id='last-light',name='Last Light Galleria · 5v5 Control',units='meters',validation='playable',description='R06 dead mall blockout. Ground-only fountain control, diagonal home loops and two local lofts. See brief.md for unimplemented game rules.')
def put(tag,id,parent=root,**attrs):
 return E.SubElement(parent,tag,dict(id=id,**{k.replace('_','-'):str(v) for k,v in attrs.items()}))
num=lambda v:f'{v:g}'
vec=lambda p:' '.join(map(num,p))
points=lambda ps:'; '.join(map(vec,ps))
colors={'tile':'#d1c5ab','plaster':'#d7cfba','teal':'#477d7e','pink':'#b87989','dark':'#3c484c','grout':'#748581','brass':'#b39a63','water-tile':'#7babb0','ink':'#263e43','cream':'#eadbb6','soil':'#766c52','leaf':'#66795c','a':'#4c99a8','b':'#cc8b59'}
for id,color in colors.items():put('material',id,color=color,roughness='.85')
E.SubElement(root,'player',radius='.4',height='2',crouch='1.15',step='.3',slope='42')
for r in d['rooms']:put('profile',r['id']+'-plan',points=points(r['poly']))
for o in d['obstacles']:put('profile',o['id']+'-plan',points=points(o['poly']))
for w in d['walls']:put('path',w['id']+'-axis',points=points([p+[w['z']] for p in [w['a'],w['b']]]))
for st in d['stairs']:put('path',st['id']+'-axis',points=points([st['a'],st['b']]))
# Split all collinear floor edges before cancelling shared boundaries.
rs=[r for r in d['rooms'] if r['z']==0];verts=[tuple(p) for r in rs for p in r['poly']];edges=Counter()
def on(p,a,b):return abs((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))<1e-8 and min(a[0],b[0])-1e-8<=p[0]<=max(a[0],b[0])+1e-8 and min(a[1],b[1])-1e-8<=p[1]<=max(a[1],b[1])+1e-8
for r in rs:
 ps=r['poly']
 for a,b in zip(ps,ps[1:]+ps[:1]):
  cuts=sorted(set(p for p in verts if on(p,a,b)),key=lambda p:(p[0]-a[0])**2+(p[1]-a[1])**2)
  for p,q in zip(cuts,cuts[1:]):edges[tuple(sorted((p,q)))]+=1
boundary=[edge for edge,c in edges.items() if c==1]
for i,(a,b) in enumerate(boundary):put('path',f'EDGE-{i:02}-axis',points=points([list(a)+[0],list(b)+[0]]))
# Main physical union resolves intended slab/wall and counter/guard contacts.
mall=put('assembly','MALL',coincident_material='retained-face',label='Reviewed structural shell and gameplay cover')
for r in d['rooms']:
 mat='pink' if r['z'] else ('water-tile' if r['id']=='COURT' else 'tile')
 put('slab',r['id'],mall,profile=r['id']+'-plan',elevation=num(r['z']),thickness='.35',material=mat,group='lofts' if r['z'] else 'ground')
for i,edge in enumerate(boundary):put('wall',f'EDGE-{i:02}',mall,path=f'EDGE-{i:02}-axis',height='5.8',thickness='.24',material='plaster',group='shell')
for w in d['walls']:put('wall',w['id'],mall,path=w['id']+'-axis',height=num(w['h']),thickness='.24',material='pink' if w['z'] else 'teal',group='lofts' if w['z'] else 'ground')
for o in d['obstacles']:
 xs=[p[0] for p in o['poly']];ys=[p[1] for p in o['poly']]
 put('box',o['id'],mall,position=vec([min(xs),min(ys),o['z']]),width=num(max(xs)-min(xs)),depth=num(max(ys)-min(ys)),height=num(o['height']),material=o['material'],group='cover',label=o['role'])
for st in d['stairs']:
 put('stairs',st['id'],mall,path=st['id']+'-axis',width=num(st['width']),count=str(st['count']),underside='filled',thickness='.35',material='grout',group='stairs')
 for side in ['left','right']:put('enclosure',st['id']+'-'+side,mall,host=st['id'],side=side,construction='parapet',height='1.1',thickness='.20',material='pink',group='stairs')
# Slender support piers lie at loft rear/side edges; passage underneath is real.
for side in ['W','E']:
 for i,x in enumerate([10.2,19,27.8]):
  y=41.8
  if side=='E':x,y=80-x,72-y
  put('box',f'{side}-LOFT-PIER-{i}',mall,position=vec([x-.2,y-.2,0]),width='.4',depth='.4',height='2.65',material='teal',group='shell')
# Atrium's missing skylight: real high beams and corner columns, no opaque roof.
for i,(x,y) in enumerate([(34,24),(46,24),(34,48),(46,48)]):put('cylinder',f'ATRIUM-COLUMN-{i}',mall,position=vec([x,y,0]),radius='.26',height='7.8',segments='12',material='cream',group='shell')
for i,(a,b) in enumerate([([34,24],[46,24]),([46,24],[52,30]),([52,30],[52,42]),([52,42],[46,48]),([46,48],[34,48]),([34,48],[28,42]),([28,42],[28,30]),([28,30],[34,24])]):
 dx,dy=b[0]-a[0],b[1]-a[1];ln=math.hypot(dx,dy)
 put('box',f'SKYLIGHT-BEAM-{i}',mall,position=vec([a[0],a[1]-.12,7.5]),rotation=vec([0,0,math.degrees(math.atan2(dy,dx))]),width=num(ln),depth='.24',height='.3',material='teal',group='shell')
# Presentation details are deliberately shallow and noncolliding. They do not widen nav.
detail=put('group','RETAIL-DETAIL',label='Shutters, faded trims and dead planting; visual only')
decorations={}
def decor(mat):
 if mat not in decorations:decorations[mat]=put('assembly','DETAIL-'+mat,detail,material=mat,collidable='false',coincident_material='retained-face')
 return decorations[mat]
def box(id,p,w,dep,h,mat,rotation=None):
 args=dict(position=vec(p),width=num(w),depth=num(dep),height=num(h),material=mat,group='details')
 if rotation is not None:args['rotation']=vec(rotation)
 return put('box',id,decor(mat),**args)
# Continuous pastel fascia around the playable ground boundary.
for i,(a,b) in enumerate(boundary):
 dx,dy=b[0]-a[0],b[1]-a[1];ln=math.hypot(dx,dy);ang=math.degrees(math.atan2(dy,dx))
 ux,uy=dx/ln,dy/ln
 box(f'FASCIA-{i}',[a[0]+ux*.4+uy*.15,a[1]+uy*.4-ux*.15,3.15],ln-.8,.3,.45,'pink',[0,0,ang])
 # Recessed-looking closed storefronts on long straight segments; no false doors.
 if ln>=10 and (abs(dx)<1e-8 or abs(dy)<1e-8):
  ux,uy=dx/ln,dy/ln
  mid=[(a[0]+b[0])/2,(a[1]+b[1])/2]
  for j in range(2):
   t=(j-.5)*4.4;x=mid[0]+ux*t;y=mid[1]+uy*t
   box(f'SHUTTER-{i}-{j}',[x-ux*1.75+uy*.145,y-uy*1.75-ux*.145,.25],3.5,.29,2.6,'dark',[0,0,ang])
   for k in [0,1,2,3]:box(f'SHUTTER-RIB-{i}-{j}-{k}',[x-ux*1.7+uy*.16,y-uy*1.7-ux*.16,.6+k*.58],3.4,.32,.035,'grout',[0,0,ang])
# Offset brass strips on the old elevator, and its dark door face.
box('LIFT-DOOR',[38.7,33.97,.2],2.6,.07,2.7,'ink')
box('LIFT-HEADER',[38.4,33.9,3.2],3.2,.15,.35,'brass')
box('LIFT-CROWN',[38.3,33.8,5.6],3.4,4.4,.18,'brass')
# Four dry basin border strips do not add a step: visual geometry top .004m.
for i,(x,y,w,h) in enumerate([(33,29,14,.12),(33,42.88,14,.12),(32.8,29,.12,14),(47.08,29,.12,14)]):box(f'BASIN-STRIP-{i}',[x,y,.002],w,h,.002,'brass')
# Layered faded tile bands in home promenades, safely above floor as visual only.
for side in ['A','B']:
 for i in range(5):
  x,y=21+i*3,8.2
  if side=='B':x,y=80-x-1,72-y-3
  box(f'{side}-TILE-{i}',[x,y,.002],1,3,.002,'pink')
# Clock/disconnected sign arm supported by the high north beam.
box('CLOCK-ARM',[39.9,47.5,5.8],.2,.25,1.7,'brass')
put('cylinder','DEAD-CLOCK',decor('pink'),position='40 47.25 6.25',rotation='90 0 0',radius='.85',height='.12',segments='24',material='pink',group='details')
box('CLOCK-HAND',[39.96,47.1,6.25],.08,.07,.6,'ink')
box('CLOCK-HAND-SHORT',[40,47.09,6.21],.42,.07,.08,'ink')
# Dead plant silhouettes sit on counters; no foliage collision or gameplay promise.
for side,(x,y,z) in [('W',(19,40.8,4.15)),('E',(61,31.2,4.15))]:
 put('cylinder',side+'-PLANT-POT',decor('soil'),position=vec([x,y,z]),radius='.4',height='.5',material='soil',group='details')
 box(side+'-DEAD-STEM',[x-.03,y-.03,z+.5],.06,.06,.9,'soil')
 for i in range(3):box(f'{side}-LEAF-{i}',[x-.45,y-.08,z+.65+i*.2],.9,.16,.08,'leaf',[0,20-i*20,i*55])
# Metadata and assertions use actual traversable slab IDs.
for a,b in d['connections']:put('connection',f'{a}-to-{b}',**{'from':a,'to':b})
for st in d['stairs']:
 put('connection',st['id']+'-entry',**{'from':st['fromRoom'],'to':st['id']})
 put('connection',st['id']+'-exit',**{'from':st['id'],'to':st['toRoom']})
for m in d['markers']:
 args=dict(position=vec(m['pos']),kind=m['kind'],element=m['room'],movement='land',group='lofts' if m['pos'][2] else 'ground')
 if m.get('team'):args['team']=m['team']
 put('marker',m['id'],**args)
for id,a,b,dist in [('A-to-control','a-spawn-1','control',70),('B-to-control','b-spawn-1','control',70),('A-west-exit','a-spawn-1','west-mouth',65),('B-east-exit','b-spawn-1','east-mouth',65),('A-south-exit','a-spawn-1','south-stage',55),('B-north-exit','b-spawn-1','north-stage',55),('west-ascent','west-stair-foot','west-stair-top',18),('east-ascent','east-stair-foot','east-stair-top',18),('west-loft-access','west-stair-foot','west-loft',32),('east-loft-access','east-stair-foot','east-loft',32),('court-west-to-east','west-mouth','east-mouth',40)]:put('route',id,**{'from':a,'to':b,'max-distance':str(dist)})
E.indent(root,space='  ')
(P/'level.aml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+E.tostring(root,encoding='unicode')+'\n')
print(f'Wrote {P}/level.aml; {len(boundary)} boundary segments')
