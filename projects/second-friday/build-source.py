"""Emit native, editable AML from the reviewed building-first outdoor proposal."""
from pathlib import Path
import json, math
import xml.etree.ElementTree as E
P=Path(__file__).parent
D=json.loads((P/'layout-data.json').read_text())
root=E.Element('architecture',version='1',id='second-friday',name='Second Friday · Outdoor Flea Market / Amman · 5v5 Control',units='meters',validation='playable',description='B02/R01. Building-first outdoor district. Proposed control rules in gameplay.json; engine integration and 5v5 balance untested.')
def el(tag,parent=root,**attrs):return E.SubElement(parent,tag,{k.replace('_','-'):str(v).lower() if isinstance(v,bool) else str(v) for k,v in attrs.items()})
def pts(points):return '; '.join(' '.join(f'{n:g}' for n in p) for p in points)
def profile(id,points):el('profile',id=id,points=pts(points))
def rectprofile(id,x0,y0,x1,y1):profile(id,[(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
def path(id,points):el('path',id=id,points=pts(points))
palette={'limestone':'#d4c5a5','plaster':'#e4d8bb','stone-dark':'#b5a185','roof':'#a79474','street':'#bba984','metal':'#354f58','window':'#27434d','blue':'#348a9f','rust':'#c17646','cream':'#e5cf9a','olive':'#7c9174','wood':'#927252','low':'#cba865','point':'#d5b069','west':'#b58468','east':'#76a3ad','ink':'#384349'}
for id,color in palette.items():el('material',id=id,color=color,roughness=1)
# Building placement is primary; all other playable spaces are outdoor gaps between these masses.
for id,name,polygon,h in D['buildings']:profile(id+'-plan',polygon)
rectprofile('district-plan',0,0,136,108)
physical=el('assembly',id='district',label='Outdoor market physical union',coincident_material='retained-face')
for i,(id,name,polygon,h) in enumerate(D['buildings']):
 el('extrusion',parent=physical,id=id,profile=id+'-plan',distance=h if id!='B08' else 2.9,material=['limestone','plaster','stone-dark'][i%3],group='buildings',label=name)
 if id=='B08':el('roof',parent=physical,id='TEA-ROOF',profile=id+'-plan',elevation=3.2,thickness=.3,material='roof',playable=True,group='terrace')
el('slab',parent=physical,id='STREETS',profile='district-plan',elevation=0,thickness=.3,material='street',group='streets')
path('boundary-axis',[(0,0,0),(136,0,0),(136,108,0),(0,108,0),(0,0,0)])
el('wall',parent=physical,id='BOUNDARY',path='boundary-axis',thickness=.3,height=5.5,material='limestone',group='boundary')
for id,a,b,w in D['stairs']:
 path(id+'-axis',[a,b]);el('stairs',parent=physical,id=id,path=id+'-axis',width=w,count=20,thickness=.3,underside='filled',material='stone-dark',group='stairs')
# Declare real, supported stair interfaces for the authoring adjacency graph.
for cid,a,b,edge in [('W-toe','STREETS','ST-W',[(57.4,62,0),(62.6,62,0)]),('W-head','ST-W','TEA-ROOF',[(57.4,78,3.2),(62.6,78,3.2)]),('E-toe','STREETS','ST-E',[(94,85.4,0),(94,90.6,0)]),('E-head','ST-E','TEA-ROOF',[(78,85.4,3.2),(78,90.6,3.2)])]:
 path(cid+'-axis',edge);el('connection',id=cid,**{'from':a,'to':b,'path':cid+'-axis'})
# Stair landings stay open in the parapet. Unguarded stair sides are deliberate; engine drop rules unverified.
roofedges=[('south-a',54,78,57.4,78),('south-b',62.6,78,66,78),('south-c',74,78,78,78),('west',54,78,54,94),('north',54,94,78,94),('east-a',78,78,78,85.4),('east-b',78,90.6,78,94)]
for id,x0,y0,x1,y1 in roofedges:
 path('PAR-'+id+'-axis',[(x0,y0,3.2),(x1,y1,3.2)]);el('wall',parent=physical,id='PAR-'+id,path='PAR-'+id+'-axis',thickness=.22,height=1.15,material='plaster',group='terrace')
path('TEA-SCREEN-axis',[(66,78,3.2),(74,78,3.2)])
el('wall',parent=physical,id='TEA-SCREEN',path='TEA-SCREEN-axis',thickness=.4,height=2.8,material='blue',group='terrace')
for id,x0,y0,x1,y1,h in D['cover']:
 el('box',parent=physical,id=id,position=f'{x0} {y0} 0',width=x1-x0,depth=y1-y0,height=h,material='wood' if h>2 else 'low',group='market-cover')
# Corner supports are physical; cloth remains separate noncolliding rendering.
awnings=[('clothes',22,68,36,76,4.3),('tailor',34,34,50,42,4.4),('appliances',112,54,126,62,4.4),('books',80,72,94,80,4.4)]
for id,x0,y0,x1,y1,z in awnings:
 for j,(x,y) in enumerate([(x0,y0),(x1,y0),(x1,y1),(x0,y1)]):el('cylinder',parent=physical,id=f'{id}-post-{j}',position=f'{x} {y} 0',radius=.12,height=z,segments=8,material='metal',group='stalls')
# Floor material assignments have no physical shells or collision effect.
for id,bounds,mat in [('point',[76,56,90,70],'point'),('west-yard',[2,84,14,104],'west'),('east-yard',[116,2,134,18],'east')]:
 rectprofile(id+'-plan',*bounds);el('face-material',id=id+'-paint',host='STREETS',face='top',profile=id+'-plan',material=mat)
visual=el('group',id='market-detail',collidable=False)
for i,(id,x0,y0,x1,y1,z) in enumerate(awnings):
 for j in range(4):
  a=x0+(x1-x0)*j/4+.12;b=x0+(x1-x0)*(j+1)/4-.12
  rectprofile(f'{id}-cloth-{j}-plan',a,y0,b,y1)
  el('canopy',parent=visual,id=f'{id}-cloth-{j}',profile=f'{id}-cloth-{j}-plan',elevation=z+.12*(j%2),thickness=.04,material=['blue','rust','cream','olive'][(i+j)%4],collidable=False,playable=False,group='canopies')
# Opaque recessed-looking window panels and shuttered shop fronts. No playable doors implied.
for i,(id,name,polygon,h) in enumerate(D['buildings']):
 if id=='B08':continue
 for side,(a,b) in enumerate(zip(polygon,polygon[1:]+polygon[:1])):
  dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy);ux=dx/length;uy=dy/length;ox=uy;oy=-ux;angle=math.degrees(math.atan2(dy,dx))
  if length<6:continue
  for floor,z in enumerate([1.3,4.2,7.1]):
   if z+1.25>h:continue
   count=max(1,int(length/5))
   for n in range(count):
    along=(n+.5)*length/count-.7;x=a[0]+ux*along+ox*.03;y=a[1]+uy*along+oy*.03
    el('box',parent=visual,id=f'{id}-window-{side}-{floor}-{n}',position=f'{x:g} {y:g} {z:g}',rotation=f'0 0 {angle:g}',width=1.4,depth=.08,height=1.2,material='window' if floor else ['blue','rust','olive'][i%3],collidable=False,group='facades')
 # Small rooftop tank identifies contemporary urban housing; scenic, noncolliding.
 cx=sum(x for x,y in polygon)/len(polygon);cy=sum(y for x,y in polygon)/len(polygon)
 el('cylinder',parent=visual,id=id+'-tank',position=f'{cx:g} {cy:g} {h:g}',radius=.75,height=1.2,segments=12,material='ink',collidable=False,group='scenic-roofs')
# Render-only stock rests on the banks, never widens the reviewed collision envelope.
for i,(id,x0,y0,x1,y1,h) in enumerate(D['cover']):
 for j in range(3):
  x=x0+.3+(x1-x0-.6)*j/3
  el('box',parent=visual,id=f'{id}-stock-{j}',position=f'{x:g} {y0+.25:g} {h:g}',width=.3,depth=.5,height=.18,material=['blue','rust','cream'][(i+j)%3],collidable=False,group='stock')
el('player',radius=.35,height=1.8,step=.25,slope=42,crouch=1.1,vault=0,rappel=False,ladder=False)
markers={}
def marker(id,p,kind='poi',region='STREETS',team=None):
 args=dict(id=id,position=' '.join(map(str,p)),kind=kind,element=region,movement='land',group='markers')
 if team:args['team']=team
 el('marker',**args);markers[id]=p
for i,p in enumerate([(5,90,0),(9,90,0),(5,94,0),(9,94,0),(7,98,0)]):marker(f'W{i+1}',p,'attacker_spawn',team='west')
for i,p in enumerate([(120,6,0),(124,6,0),(128,6,0),(122,10,0),(126,10,0)]):marker(f'E{i+1}',p,'defender_spawn',team='east')
marker('CONTROL',[86,64,0],'objective')
for id,p,reg in [('W-SOUTH',[10,80,0],'STREETS'),('W-NORTH',[10,104,0],'STREETS'),('CLOTHES',[36,80,0],'STREETS'),('CARPET',[50,64,0],'STREETS'),('TAILOR',[40,38,0],'STREETS'),('COPPER',[67,30,0],'STREETS'),('E-WEST',[100,6,0],'STREETS'),('E-NORTH',[133,20,0],'STREETS'),('REPAIR',[116,54,0],'STREETS'),('POINT-SOUTH',[82,50,0],'STREETS'),('BOOK-WALK',[86,76,0],'STREETS'),('W-STAIR-FOOT',[60,60.5,0],'STREETS'),('W-STAIR-TOP',[60,80,3.2],'TEA-ROOF'),('E-STAIR-FOOT',[95.5,88,0],'STREETS'),('E-STAIR-TOP',[76,88,3.2],'TEA-ROOF'),('NORTH-ALLEY',[50,96,0],'STREETS'),('SOUTH-LOOP',[33,6,0],'STREETS')]:marker(id,p,region=reg)
routes=[]
def route(id,a,b,limit):
 el('route',id=id,**{'from':a,'to':b,'min-routes':1,'max-distance':limit,'movement':'land'});routes.append(id)
for team in ['W','E']:
 for i in range(1,6):route(f'{team}{i}-point',f'{team}{i}','CONTROL',160)
for id,a,b,limit in [('W-south-exit','W1','W-SOUTH',40),('W-north-exit','W5','W-NORTH',28),('W-primary','W-SOUTH','CONTROL',125),('W-service','W-NORTH','NORTH-ALLEY',70),('N-alley-carpet','NORTH-ALLEY','CARPET',65),('E-west-exit','E1','E-WEST',40),('E-north-exit','E3','E-NORTH',32),('E-primary','E-WEST','CONTROL',110),('E-service','E-NORTH','REPAIR',65),('repair-point','REPAIR','CONTROL',75),('carpet-point','CARPET','CONTROL',60),('copper-point','COPPER','CONTROL',75),('book-point','BOOK-WALK','CONTROL',35),('west-ascent','W-STAIR-FOOT','W-STAIR-TOP',25),('west-descent','W-STAIR-TOP','W-STAIR-FOOT',25),('east-ascent','E-STAIR-FOOT','E-STAIR-TOP',25),('east-descent','E-STAIR-TOP','E-STAIR-FOOT',25),('roof-transfer','W-STAIR-TOP','E-STAIR-TOP',35),('deep-rotation','SOUTH-LOOP','COPPER',70),('tailor-carpet','TAILOR','CARPET',65)]:route(id,a,b,limit)
# Inert engine-facing metadata; no game behavior is inferred from these volumes.
for id,prof,role,height in [('capture','point-plan','objective',2),('west-protection','west-yard-plan','spawn',5),('east-protection','east-yard-plan','spawn',5)]:
 v=el('volume',id=id,profile=prof,role=role,height=height)
 el('property',parent=v,name='integration',value='Target engine must implement control scoring / team filtering and enemy exclusion; geometry metadata only.')
for i in range(1,6):
 for j in range(1,6):el('no-spawn-los',markers=f'W{i} E{j}')
E.indent(root,space='  ')
E.ElementTree(root).write(P/'level.aml',encoding='utf-8',xml_declaration=True)
(P/'inventory.md').write_text('# B02 / R01 source inventory\n\nBuildings B01–B11, stairs ST-W/ST-E, cover IDs and exact footprints/heights are in layout-data.json and level.aml. All play is outdoor; buildings are closed solid masses. All stairs are5.2m wide;16m run/3.2m rise/20 risers. Parapets omit each top landing. Cloth and facade stock are render-only. Cover, posts, walls, stairs and building shells collide; ballistic/destructibility behavior remains engine work.\n\n'+'\n'.join(f'- {id}: footprint({x0},{y0})–({x1},{y1}), base0 / top{h}m; static opaque, colliding.' for id,x0,y0,x1,y1,h in D['cover'])+'\n')
print(f'Authored {len(D["buildings"])} buildings, {len(D["cover"])} cover banks, {len(routes)} route assertions')
