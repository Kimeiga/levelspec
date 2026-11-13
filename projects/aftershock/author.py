"""Rebuild editable AML from the reviewed drawing data. Requires Shapely for surface masks only."""
from pathlib import Path
from math import sin,cos,radians,hypot,atan2,degrees
from xml.etree.ElementTree import Element,SubElement,indent,tostring
import json
from shapely.geometry import Polygon,LineString,box as region
P=Path(__file__).parent
d=json.loads((P/'layout-data.json').read_text())
root=Element('architecture',version='1',id='aftershock',name='Aftershock · Broken Spiral',units='meters',validation='playable',description='L03 / R06. Original 5v5 CT/T defusal blockout: earthquake-shattered split spiral subway, upper A crescent and nested lower B collision bowl. Static crash tableau; combat integration and playtesting pending.')
def el(parent,tag,**attrs):return SubElement(parent,tag,{k.replace('_','-'):str(v) for k,v in attrs.items() if v is not None})
def nums(values):return ' '.join(f'{x:.3f}'.rstrip('0').rstrip('.') if x else '0' for x in values)
def profile(id,points,holes=()):
 p=el(root,'profile',id=id,points='; '.join(nums(p) for p in points))
 for h in holes:el(p,'hole',points='; '.join(nums(p) for p in h))
 return id
def path(id,points):el(root,'path',id=id,points='; '.join(nums(p) for p in points));return id
def rect(id,x,y,w,h):return profile(id,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]])
mats={'tile':'#b0b2a7','concrete':'#65747b','fracture':'#899391','steel':'#364954','dark':'#182a34','red':'#b95845','blue':'#4a91a5','yellow':'#e5bd58','white':'#e3dfc9','signal':'#74b9a2','plant-a':'#edc268','plant-b':'#d9a76e','track':'#535e60','window':'#1a3d4a','rubble':'#9a8d7d'}
for id,c in mats.items():el(root,'material',id=id,color=c,roughness='.78',metalness='.35' if id in ['steel','red','blue'] else '0')
station=el(root,'assembly',id='station',label='Physical station structure and crash bodies',coincident_material='retained-face')
deco=el(root,'assembly',id='details',label='Render-only linework and train details',coincident_material='retained-face',collidable='false')
scene=el(root,'assembly',id='severed-ring',label='Inaccessible collapsed former ring outside playable floors',coincident_material='retained-face')
def box(parent,id,x,y,z,w,h,t,mat='concrete',rot=None,**kw):return el(parent,'box',id=id,position=nums([x,y,z]),width=w,depth=h,height=t,material=mat,rotation=rot,**kw)
def wall(parent,id,a,b,height,z=0,thick=.35,mat='concrete'):
 if hypot(a[0]-b[0],a[1]-b[1])<.01:return
 el(parent,'wall',id=id,path=path(id+'-axis',[[a[0],a[1],z],[b[0],b[1],z]]),height=height,thickness=thick,material=mat)
def lines(g):return list(g.geoms) if hasattr(g,'geoms') else [g]
def poly_geom(k):return Polygon(d[k]['outer'],d[k]['holes'])
for k,z,t in [('lower',0,.35),('upper',5,.4)]:
 el(station,'slab',id=k,profile=profile(k+'-plan',d[k]['outer'],d[k]['holes']),elevation=z,thickness=t,material='tile',group=k)
 # Boundary walls are clipped only at actual stair transfer openings.
 portals=[LineString([(18,68),(22,68)]),LineString([(27,74),(31,74)]),LineString([(82,74),(86,74)])] if k=='upper' else [LineString([p[:2] for p in st['points']]).buffer(st['width']/2+.04,cap_style=2) for st in d['stairs']]
 boundary=d['lowerBoundary'] if k=='lower' else d[k]
 for loopid,points in enumerate([boundary['outer']]+boundary['holes']):
  for i,(a,b) in enumerate(zip(points,points[1:]+points[:1])):
   seg=LineString([a,b])
   for p in portals:seg=seg.difference(p.buffer(.02,cap_style=2) if p.geom_type=='LineString' else p)
   for j,line in enumerate(lines(seg)):
    if line.is_empty or line.geom_type!='LineString':continue
    aa,bb=list(line.coords)[0],list(line.coords)[-1];mx=(aa[0]+bb[0])/2;my=(aa[1]+bb[1])/2
    r=hypot(mx-50,my-64)
    height=1.15 if k=='upper' and r<29 else (3.4 if k=='upper' else 3.5)
    wall(station,f'{k}-boundary-{loopid}-{i}-{j}',aa,bb,height,z)
# Opaque services drum and elevated-deck substructure.
el(station,'cylinder',id='drum',position='50 66 0',radius='13.5',height='14',segments='36',material='concrete')
for l in d['landings']:
 el(station,'landing',id=l['id'],profile=profile(l['id']+'-plan',l['points']),elevation=l['z'],thickness='.35' if l['z']==2 else '.4',material='tile',group='upper' if l['z']==5 else 'transfer')
# Guards follow each flight, with no returns across entry/end.
for st in d['stairs']:
 count={'S1-outer':28,'S2-fan':12,'S3-drum':18,'S4-east':28}[st['id']]
 el(station,'stairs',id=st['id'],path=path(st['id']+'-axis',st['points']),width=st['width'],count=count,underside='filled',thickness='.25',material='concrete',group='transfer')
 for side in ['left','right']:
  el(station,'enclosure',id=st['id']+'-'+side,host=st['id'],side=side,construction='parapet',height='1.15',thickness='.22',offset='-.11',material='steel')
# Solid stair cheeks close the exposed sides below native guards, down to ground.
for sid,x1,x2,y0,y1 in [('S1-outer',18,22,52,68),('S4-east',82,86,60,74)]:
 run=y1-y0
 top=path(sid+'-cheek-top',[[0,.18,0],[run,5,0]])
 for n,x in enumerate([x1,x2]):
  el(station,'wall',id=sid+f'-cheek-{n}',path=path(sid+f'-cheek-{n}-axis',[[x,y0,0],[x,y1,0]]),height='5',top=top,thickness='.22',material='concrete')
# Landing side guards, preserving angled S2 arrival and S3 departure.
pad=d['landings'][0]['points'];a,b=d['stairs'][1]['points'];dx=b[0]-a[0];dy=b[1]-a[1];ln=hypot(dx,dy);px=-dy/ln*2;py=dx/ln*2
s2end=LineString([(b[0]+px,b[1]+py),(b[0]-px,b[1]-py)])
s3door=region(27,55.8,31,58)
for i,(a,b) in enumerate(zip(pad,pad[1:]+pad[:1])):
 seg=LineString([a,b]).difference(s2end.buffer(.03,cap_style=2)).difference(s3door)
 for j,g in enumerate(lines(seg)):
  if not g.is_empty and g.geom_type=='LineString':wall(station,f'fan-pad-guard-{i}-{j}',list(g.coords)[0],list(g.coords)[-1],1.15,2,.22,'steel')
# East inner screen augments the low crescent guard.
for sc in d['screens']:
 cx,cy=sc['center'];r=sc['radius'];a,b=sc['angles'];ps=[[cx+r*cos(radians(a+(b-a)*i/18)),cy+r*sin(radians(a+(b-a)*i/18)),sc['z']] for i in range(19)]
 el(station,'wall',id=sc['id'],path=path(sc['id']+'-axis',ps),height=sc['height'],thickness='.38',material='concrete')
# Roofs are physical but not offered as walking regions.
for r in d['roofs']:
 x,y,w,h=r['rect'];el(station,'canopy',id=r['id'],profile=rect(r['id']+'-plan',x,y,w,h),elevation=r['soffit']+.3,thickness='.3',material='concrete',playable='false')
for o in d['obstacles']:
 x,y,w,h=o['rect'];mat='signal' if o['h']<2 else ('blue' if o['id']=='A-derail' else 'red' if 'collision' in o['id'] else 'concrete')
 box(station,o['id'],x,y,o['z'],w,h,o['h'],mat)
 if o['h']<2:
  box(deco,o['id']+'-cap',x,y,o['z']+o['h']+.005,w,h,.025,'yellow')
# Collision debris is visual dressing below step height; tactical solid masses retain the layout IDs.
for i,(x,y,z,w,h,rot) in enumerate([(59.3,46.2,.02,1.7,1.2,21),(64.1,46.9,.03,1.7,1.1,-18),(55.7,33.4,.04,2,1,14),(74.5,49.6,.03,1.8,1,-23)]):
 box(deco,f'impact-plate-{i}',x,y,z,w,h,.12,'steel',rot=f'0 0 {rot}')
for i in range(6):
 box(deco,f'impact-rubble-{i}',60+i*.7,48.4+(i%2)*.3,.02,.38,.25,.12,'rubble',rot=f'0 0 {i*23}')
# Solid train body matches reviewed tactical obstacle, with non-colliding inset panes, doors, ribs, roof gear.
for id in ['A-derail','B-collision-01','B-collision-02']:
 o=next(o for o in d['obstacles'] if o['id']==id);x,y,w,h=o['rect'];z=o['z'];longx=w>h;n=5 if max(w,h)>12 else 4
 if longx:
  for i in range(n):
   xx=x+.7+i*(w-1.4)/n;ww=(w-1.4)/n*.70
   for yy in [y-.015,y+h-.015]:box(deco,id+f'-pane-{i}-{yy}',xx,yy,z+1.5,ww,.03,.95,'window')
  box(deco,id+'-stripe',x+.1,y-.025,z+.8,w-.2,.05,.18,'white')
  box(deco,id+'-roof',x+.2,y+.2,z+o['h']+.01,w-.4,h-.4,.18,'steel')
  box(deco,id+'-broken-nose',x+w-.7,y+.3,z+.4,1.1,h-.6,1.7,'fracture',rot='0 8 -9')
 else:
  for i in range(n):
   yy=y+.7+i*(h-1.4)/n;hh=(h-1.4)/n*.7
   for xx in [x-.015,x+w-.015]:box(deco,id+f'-pane-{i}-{xx}',xx,yy,z+1.5,.03,hh,.95,'window')
  box(deco,id+'-stripe',x-.025,y+.1,z+.8,.05,h-.2,.18,'white')
  box(deco,id+'-roof',x+.2,y+.2,z+o['h']+.01,w-.4,h-.4,.18,'steel')
  box(deco,id+'-broken-nose',x+.3,y+h-.7,z+.4,w-.6,1.1,1.7,'fracture',rot='8 0 12')
# Surface masks are render partitions, independent of collision and navigation.
def surface(id,host,p,material):
 if p.is_empty:return
 for i,g in enumerate(lines(p)):
  if g.geom_type!='Polygon' or g.area<.001:continue
  pp=profile(id+f'-{i}-plan',list(g.exterior.coords)[:-1],[list(h.coords)[:-1] for h in g.interiors]);el(root,'face-material',id=id+f'-{i}',host=host,face='top',profile=pp,material=material)
def sector(cx,cy,ri,ro,a,b,n=56):
 ts=[radians(a+(b-a)*i/n) for i in range(n+1)];return Polygon([(cx+ro*cos(t),cy+ro*sin(t)) for t in ts]+[(cx+ri*cos(t),cy+ri*sin(t)) for t in reversed(ts)])
site_shapes={s['id']:region(s['rect'][0],s['rect'][1],s['rect'][0]+s['rect'][2],s['rect'][1]+s['rect'][3]) for s in d['sites']}
for host,cx,cy,ri,ro,a,b,bed in [('lower',44,46,23,35,180,310,(26,30)),('upper',50,64,25,39,24,170,(33,37))]:
 floor=poly_geom(host);plant=site_shapes['A' if host=='upper' else 'B']
 surface(host+'-trackbed',host,sector(cx,cy,*bed,a,b).intersection(floor).difference(plant),'track')
 surface(host+'-safety-line',host,sector(cx,cy,bed[0]-.7,bed[0]-.45,a,b).intersection(floor).difference(plant),'yellow')
 for radius in [bed[0]+.8,bed[1]-.8]:
  pts=[[cx+radius*cos(radians(a+(b-a)*i/56)),cy+radius*sin(radians(a+(b-a)*i/56)),(5 if host=='upper' else 0)+.025] for i in range(57)]
  el(deco,'wall',id=f'{host}-rail-{radius}',path=path(f'{host}-rail-{radius}-axis',pts),height='.045',thickness='.075',material='steel')
 # Sleepers remain decorative; no repetitive body collision.
 for i in range(0,55,2):
  t=radians(a+(b-a)*i/56);p1=[cx+(bed[0]+.3)*cos(t),cy+(bed[0]+.3)*sin(t)];p2=[cx+(bed[1]-.3)*cos(t),cy+(bed[1]-.3)*sin(t)];wall(deco,f'{host}-tie-{i}',p1,p2,.025,5.01 if host=='upper' else .01,.16,'dark')
for s in d['sites']:
 x,y,w,h=s['rect'];host='upper' if s['z'] else 'lower';pp=rect('plant-'+s['id']+'-plan',x,y,w,h)
 el(root,'face-material',id='plant-'+s['id']+'-surface',host=host,face='top',profile=pp,material='plant-a' if host=='upper' else 'plant-b')
 z=el(root,'zone',id='plant-'+s['id'],profile=pp,elevation=s['z'],height='2',role='objective',movement='land');el(z,'property',name='mode',value='bomb-defuse');el(z,'property',name='site',value=s['id'])
# Fan canopy columns touch its underside; they sit at the receiving-pad margins.
for i,(x,y) in enumerate([(80.3,42.3),(91.7,42.3),(91.7,57.7)]):
 el(station,'cylinder',id=f'Fan-canopy-post-{i}',position=nums([x,y,0]),radius='.22',height='4.5',segments='8',material='concrete')
# Upper deck pier assemblies terminate on visible foundation shoes below the cutaway.
for i,ang in enumerate([42,82,122,162]):
 t=radians(ang);x=50+36*cos(t);y=64+36*sin(t)
 box(scene,f'deck-foundation-{i}',x-1.1,y-1.1,-2.5,2.2,2.2,.5,'concrete')
 el(station,'cylinder',id=f'deck-pier-{i}',position=nums([x,y,-2]),radius='.65',height='6.6',segments='10',material='concrete')
# Repeated vault ribs describe station enclosures. They stand on outer/inner deck margins.
for host,cx,cy,ri,ro,a,b,z in [('lower',44,46,23,35,188,300,0),('upper',50,64,25,39,33,159,5)]:
 for j,ang in enumerate(range(a,b,18)):
  t=radians(ang);xx=cx+ri*cos(t);yy=cy+ri*sin(t);ex=cx+ro*cos(t);ey=cy+ro*sin(t)
  # Most crown panels have fallen: structural posts are at boundaries, beam underside remains5m above deck.
  for suffix,r in [('in',ri+.18),('out',ro-.18)]:
   x=cx+r*cos(t);y=cy+r*sin(t)
   el(station,'cylinder',id=f'{host}-rib-{j}-{suffix}',position=nums([x,y,z]),radius='.23',height='5.4',segments='8',material='concrete')
  wall(station,f'{host}-rib-{j}-crown',[xx,yy],[ex,ey],.45,z+5.1,.45,'steel')
  wall(deco,f'{host}-rib-{j}-light',[xx,yy],[ex,ey],.09,z+4.98,.11,'white')
# Hairline fracture inlays, broken switch rails and dark spall patches communicate the quake.
for i,(a,b,z) in enumerate([([60,31],[65,37],.012),([65.08,37.06],[72,40],.012),([43,95],[47,98],5.012),([47.08,98.06],[50,99],5.012),([22,32],[26,30],.012)]):
 wall(deco,f'floor-fracture-{i}',a,b,.008,z,.045,'dark')
# Drum ring bands and fractures are decorations on a supported opaque mass.
for z in [3.8,8.7,12.8]:
 pts=[[50+13.55*cos(radians(i*10)),66+13.55*sin(radians(i*10)),z] for i in range(37)]
 el(deco,'wall',id=f'drum-band-{z}',path=path(f'drum-band-{z}-axis',pts),height='.22',thickness='.12',material='steel')
for i in range(7):
 angle=radians(205+i*9);x=50+13.56*cos(angle);y=66+13.56*sin(angle);box(deco,f'drum-fracture-{i}',x,y,1+i*1.35,.08,.10,1.7,'dark',rot='0 0 25')
# Broken former southern upper ring is deliberately disconnected and outside occupied lower floors.
for i,(x,y,z,w,h,tilt) in enumerate([(42,29,-.3,5,3,18),(46,31,-.2,4,2,-15),(40,34,-.4,3,3,10)]):
 box(scene,f'fallen-slab-{i}',x,y,z,w,h,.6,'fracture',rot=f'{tilt} 0 {i*21}')
# Crushed train remnants lie in the disconnected inner Red void; routes remain on the intact rim.
box(scene,'crushed-car-void',42,27,.3,3.4,9,2.7,'red',rot='0 9 -12')
box(scene,'severed-girder-void',39,29,-.1,9,.6,.8,'steel',rot='0 10 18')
# Fractured canopy fragments are carried by ribs/outer wall, clear of movement and important eye paths.
for id,x,y,z,w,h in [('A-broken-roof-west',22,84,10.4,6,4),('A-broken-roof-east',70,89,10.4,6,5)]:
 box(station,id,x,y,z,w,h,.3,'concrete')
# Five spawns each; markers and authored objective routes are metadata.
el(root,'player',radius='.30',height='2',crouch='1.1',step='.25',slope='42',vault='0',rappel='false',ladder='false')
for team,sp in d['spawns'].items():
 for i,p in enumerate(sp):el(root,'marker',id=team.lower()+'-spawn'+('' if i==0 else '-'+str(i+1)),position=nums(p),kind='attacker_spawn' if team=='T' else 'defender_spawn',team=team,element='lower' if team=='T' else 'upper',group='lower' if team=='T' else 'upper',movement='land')
for id,p,host in [('site-a',[48,95,5],'upper'),('site-b',[65,41,0],'lower'),('cable',[45,46,0],'lower'),('red-south',[44,17,0],'lower'),('A-west',[25,86,5],'upper'),('A-inner',[40,86,5],'upper'),('B-fan',[76,54,0],'lower')]:
 el(root,'marker',id=id,position=nums(p),kind='objective' if id.startswith('site') else 'poi',element=host,movement='land')
for id,fr,to,mx in [('T-A','t-spawn','site-a',120),('T-B','t-spawn','site-b',105),('CT-A','ct-spawn','site-a',100),('CT-B','ct-spawn','site-b',105),('A-B','site-a','site-b',150),('cable-B','cable','site-b',50),('red-B','red-south','site-b',65)]:el(root,'route',id=id,from_=fr,to=to,min_routes='1',max_distance=mx,movement='land')
# Attribute helper replaces hyphens but reserved Python 'from' needs explicit spelling.
for e in root.iter('route'):
 if 'from-' in e.attrib:e.set('from',e.attrib.pop('from-'))
for st in d['stairs']:
 a,b=st['points'];dx=b[0]-a[0];dy=b[1]-a[1];L=hypot(dx,dy);ux=dx/L;uy=dy/L
 start=[a[0]-.6*ux,a[1]-.6*uy,a[2]];end=[b[0]+.6*ux,b[1]+.6*uy,b[2]]
 for suffix,p in [('foot',start),('head',end)]:el(root,'marker',id=st['id']+'-'+suffix,position=nums(p),kind='poi',movement='land')
 e=el(root,'route',id=st['id']+'-local',to=st['id']+'-head',min_routes='1',max_distance=L+5,movement='land');e.set('from',st['id']+'-foot')
 for suffix,p,host in [('in',a,'lower' if a[2]==0 else 'upper' if a[2]==5 else 'fan-landing'),('out',b,'lower' if b[2]==0 else 'upper' if b[2]==5 else 'fan-landing')]:
  pp=path(st['id']+'-'+suffix+'-portal',[[p[0]-uy*1.9,p[1]+ux*1.9,p[2]],[p[0]+uy*1.9,p[1]-ux*1.9,p[2]]]);el(root,'connection',id=st['id']+'-'+suffix,**{'from':host if suffix=='in' else st['id'],'to':st['id'] if suffix=='in' else host,'path':pp})
el(root,'no-spawn-los',markers='t-spawn ct-spawn')
indent(root,space='  ')
(P/'level.aml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+tostring(root,encoding='unicode')+'\n')
