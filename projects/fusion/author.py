"""Reproduce Fusion's editable native AML from the reviewed L04 expanded design.

The XML is the delivered authoring source. This project-local helper records the
radial construction and repeated structural parts; it is not a new authoring API.
"""
from pathlib import Path
from math import sin, cos, pi, hypot, ceil
import xml.etree.ElementTree as E

P = Path(__file__).parent
root = E.Element('architecture', {'version':'1','id':'fusion','name':'Fusion — ITER assembly works','units':'meters','validation':'premap','curve-tolerance':'0.006'})

def text_rows(rows):
    """Serialize metre coordinates without introducing float roundoff noise."""
    return '; '.join(' '.join(f'{v:.6f}'.rstrip('0').rstrip('.') if isinstance(v,float) else str(v) for v in row) for row in rows)

def add(tag, parent=None, **attrs):
    """Append a native AML element, converting Python attribute spellings to AML."""
    return E.SubElement(root if parent is None else parent, tag, {k.replace('_','-'): str(v).lower() if isinstance(v,bool) else str(v) for k,v in attrs.items() if v is not None})

def profile(name, points, holes=()):
    """Define an XY footprint with optional physical holes."""
    node=add('profile',id=name,points=text_rows(points))
    for hole in holes: add('hole',parent=node,points=text_rows(hole))
    return name

def rectangle(x,y,w,d):
    return [(x,y),(x+w,y),(x+w,y+d),(x,y+d)]

def circle(radius, count=144, center=(0,4), reverse=False):
    """Return a radial loop in the reactor's common XY frame."""
    direction=-1 if reverse else 1
    return [(center[0]+radius*cos(direction*i*2*pi/count),center[1]+radius*sin(direction*i*2*pi/count)) for i in range(count)]

def arc(radius,start,end,center=(0,4)):
    count=max(1,ceil(abs(end-start)/2.5))
    return [(center[0]+radius*cos((start+(end-start)*i/count)*pi/180),center[1]+radius*sin((start+(end-start)*i/count)*pi/180)) for i in range(count+1)]

def box(name,x,y,z,w,d,h,material='steel',parent=None,**attrs):
    return add('box',parent,id=name,position=f'{x} {y} {z}',width=w,depth=d,height=h,material=material,**attrs)

def slab(name,pts,z=0,thickness=.3,material='floor',parent=None,holes=(),roof=False):
    ref=profile(name+'-footprint',pts,holes)
    return add('roof' if roof else 'slab',parent,id=name,profile=ref,elevation=z,thickness=thickness,material=material,area=None if roof else name,playable=False if roof else True,group='overhead' if roof else 'walkways')

def floor(name,x,y,w,d,z=0,material='floor',parent=None):
    return slab(name,rectangle(x,y,w,d),z,material=material,parent=parent)

def wall(name,pts,height=4.8,z=0,width=.3,material='wall',parent=None):
    path=name+'-axis';add('path',id=path,points=text_rows([(x,y,z) for x,y in pts]))
    return add('wall',parent,id=name,path=path,height=height,thickness=width,material=material,group='walls')

def rail(name,pts,z=0,height=1.15):
    """Use a solid toe panel and physically open top rails along a guarded edge."""
    wall(name+'-toe',pts,.18,z,.12,'dark')
    wall(name+'-top',pts,.10,z+height-.10,.09,'yellow')
    wall(name+'-middle',pts,.07,z+.55,.07,'yellow')
    index=0
    for a,b in zip(pts,pts[1:]):
        n=max(1,ceil(hypot(b[0]-a[0],b[1]-a[1])/1.7))
        for i in range(n):
            t=i/n;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
            box(f'{name}-post-{index}',x-.045,y-.045,z,.09,.09,height,'yellow');index+=1
    x,y=pts[-1];box(f'{name}-post-{index}',x-.045,y-.045,z,.09,.09,height,'yellow')

def stair(name,start,end,width=3,underside='filled'):
    path=name+'-axis';add('path',id=path,points=text_rows([start,end]))
    add('stairs',parent=walk,id=name,path=path,width=width,maximum_riser=.15 if name=='crown-west-stair' else .16,thickness=.28,underside=underside,material='grate',group='walkways')
    for side in ['left','right']:
        add('enclosure',id=name+'-'+side,host=name,construction='parapet',side=side,height=1.1,thickness=.12,material='yellow')

def bezier(a,b,c,d,count=12):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in range(2)) for t in [i/count for i in range(count)]]

def d_section():
    """Infer a D-section inside the published 19.4m × 11.4m vessel envelope."""
    return bezier((3.25,-2),(3.25,-4.5),(3.7,-4.5),(4.8,-4.5))+bezier((4.8,-4.5),(8.2,-4.5),(9.7,-1.8),(9.7,1.2))+bezier((9.7,1.2),(9.7,4.2),(8.2,6.9),(4.8,6.9))+bezier((4.8,6.9),(3.7,6.9),(3.25,6.9),(3.25,4))+[(3.25,4)]

def hollow_sector(name,start,end,parent):
    """Loft a watertight native faceted shell; radial chord error stays below 3mm."""
    outer=d_section();inner=[(6.475+(r-6.475)*.86,1.2+(z-1.2)*.92) for r,z in outer]
    n=len(outer);steps=round((end-start)/2.5);vertices=[];faces=[]
    for i in range(steps+1):
        a=(start+(end-start)*i/steps)*pi/180
        vertices.extend((r*cos(a),4+r*sin(a),z) for loop in [outer,inner] for r,z in loop)
    def quad(a,b,c,d,reverse=False):
        faces.extend(tuple(reversed(t)) if reverse else t for t in [(a,b,c),(a,c,d)])
    for i in range(steps):
        for j in range(n):
            k=(j+1)%n
            for off,reverse in [(0,False),(n,True)]:quad(i*2*n+off+j,(i+1)*2*n+off+j,(i+1)*2*n+off+k,i*2*n+off+k,reverse)
    for i,reverse in [(0,True),(steps,False)]:
        for j in range(n):
            k=(j+1)%n;quad(i*2*n+j,i*2*n+n+j,i*2*n+n+k,i*2*n+k,reverse)
    return add('faceted-solid',parent,id=name,points=text_rows(vertices),triangles=text_rows(faces),material='vessel',group='reactor')

# Shapely performs project-local footprint unions and edge ownership, not 3D
# compilation. The delivered AML remains entirely native and independently editable.
from copy import deepcopy
import runpy
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
from shapely import set_precision
D=runpy.run_path(str(P/'planning/draw-layout-l04.py'))
polar=D['polar']; band=D['band']; strip=D['strip']
# Reviewed B05 addendum: widen the lower passage inside the fixed vessel shell.
for f in D['floors']:
    for id,start,end in [('vessel-lower-arc',210,350),('lower-w-port-fan',198,222),('lower-e-port-fan',338,362),('central-lower-landing',305,330)]:
        if f['id']==id:f['poly']=band(4.1,7.5,start,end)
materials=[('wall','#ccd5d7',.86,0),('floor','#849c9d',.84,0),('clean','#c7d3d2',.72,0),('steel','#617887',.5,.45),('vessel','#a7b8bf',.42,.55),('dark','#314955',.6,.25),('yellow','#d3a544',.68,.1),('copper','#ab7652',.5,.5),('grate','#7b8b92',.6,.3),('blue','#397587',.75,.05),('red','#a75d48',.75,.05),('concrete','#a7aaa3',.94,0)]
for name,color,roughness,metalness in materials:add('material',id=name,color=color,roughness=roughness,metalness=metalness)
walk=add('assembly',id='walking-structure',coincident_material='retained-face')

def pieces(geometry):
    if geometry.is_empty:return []
    return [geometry] if geometry.geom_type=='Polygon' else [g for g in geometry.geoms if g.geom_type=='Polygon']

def footprint(points,holes=()):
    shape=Polygon(points)
    if not shape.is_valid:shape=shape.buffer(0)
    return shape.difference(unary_union([Polygon(h) for h in holes])) if holes else shape

def shape_slab(name,shape,z,thickness=.3,material='floor',parent=None,roof=False):
    # Native authored coordinates use a millimetre lattice. Resolve boolean
    # slivers on that lattice before emitting constraints, not during compilation.
    shape=set_precision(shape,.001).simplify(.001,preserve_topology=True)
    for i,part in enumerate(pieces(shape)):
        slab(name if i==0 else f'{name}-part-{i+1}',list(part.exterior.coords)[:-1],z,thickness,material,parent,[list(h.coords)[:-1] for h in part.interiors],roof)

def prism(name,points,z,height,material='concrete',parent=None,holes=()):
    shape=set_precision(Polygon(points,holes),.001).simplify(.002,preserve_topology=True)
    ref=profile(name+'-footprint',list(shape.exterior.coords)[:-1],[list(h.coords)[:-1] for h in shape.interiors])
    return add('extrusion',parent,id=name,profile=ref,position=f'0 0 {z}',distance=height,material=material)

# Keep the published machine envelopes byte-for-byte in their native definitions.
baseline=E.parse(P/'reviews/evidence/b04/source.aml').getroot()
physical=baseline.find("assembly[@id='fusion-physical-assembly']")
retained=[]
for node in physical:
    id=node.get('id','')
    if id.startswith(('vessel-sector-','coil-gravity-pad-','field-coil-','poloidal-coil-','solenoid-','vessel-seam-','vessel-gravity-support-')) or id in ['cryostat-base','bioshield','east-seam-port']:
        retained.append(deepcopy(node))
refs={v for node in retained for child in node.iter() for k,v in child.attrib.items() if k in ['profile','frame']}
for node in baseline:
    if node.get('id') in refs:root.append(deepcopy(node))
for node in retained:
    id=node.get('id')
    if id.startswith('vessel-sector-') or id in ['cryostat-base','bioshield']:
        owner=add('subtract',id=id+'-lower-work-ports',coincident_material='retained-face');owner.append(node)
        for side,angle in [('west',210),('east',350)]:
            prism(id+'-lower-'+side+'-cut',strip(polar(6.8,angle),polar(31,angle),2.8),-3.55,3.15,parent=owner)
    else:root.append(node)

# Floor footprints are real unions/subtractions; slots reaching an outer edge
# become open notches instead of invalid touching profile holes.
floor_shapes={};by_height={}
for f in D['floors']:
    shape=footprint(f['poly'],f['holes'])
    if f['id']=='vessel-equator':shape=Polygon(circle(8.8),[circle(4.1)]).difference(Polygon(D['central_hatch']).buffer(.002))
    floor_shapes[f['id']]=shape;by_height.setdefault(f['z'],[]).append(shape)
    material='yellow' if f['id']=='vessel-equator' else 'blue' if f['z']<0 else 'grate' if f['z']>0 or 'port' in f['id'] or 'bridge' in f['id'] else 'floor'
    shape_slab(f['id'],shape,f['z'],.25 if f['z']<=-2.8 else .3,material,walk)
for id,z,poly in D['landings']:
    shape=Polygon(poly);by_height.setdefault(z,[]).append(shape)
    shape_slab(id,shape,z,.25 if z<0 else .3,'grate',walk)
for id,a,b,width,underside in D['stairs']:stair(id,a,b,width,underside)
central_path=[(*polar(5.1,225+80*i/32),-3.2*i/32) for i in range(33)]
add('path',id='central-curved-stair-axis',points=text_rows(central_path))
add('stairs',parent=walk,id='central-curved-stair',path='central-curved-stair-axis',width=1.8,count=20,thickness=.28,underside='filled',material='grate',group='walkways')
for side in ['left','right']:add('enclosure',id='central-curved-stair-'+side,host='central-curved-stair',construction='parapet',side=side,height=1.1,thickness=.12,material='yellow')
for id,a,b,width in D['ramps']:
    add('path',id=id+'-axis',points=text_rows([a,b]));add('ramp',parent=walk,id=id,path=id+'-axis',width=width,thickness=.25 if 'lower' in id else .3,material='blue',group='walkways')
    for side in ['left','right']:add('enclosure',id=id+'-'+side,host=id,construction='parapet',side=side,height=1.1,thickness=.12,material='yellow')

# Excavated foundation supplies lower-room retaining walls. Cavities are physical
# solids removed through the foundation, with separate floor/shelf ownership above.
foundation=add('subtract',id='excavated-site-foundation',coincident_material='retained-face')
outline=[(-43.2,-31.2),(-24.2,-31.2),(-24.2,-38.2),(18.2,-38.2),(18.2,-30.2),(43.2,-30.2),(43.2,34.2),(-22.2,34.2),(-22.2,30.2),(-43.2,30.2)]
prism('site-foundation',outline,-8.7,8.4,parent=foundation)
box('machine-hall-excavation',-22,-20,-8.21,44,47,8.5,parent=foundation)
for f in D['floors']:
    if f['z']<0:
        cavity=Polygon(f['poly']).difference(Polygon(rectangle(-22,-20,44,47)))
        for j,part in enumerate(pieces(cavity)):
            thickness=.25 if f['z']<=-2.8 else .3
            prism(f['id']+f'-excavation-{j}',list(part.exterior.coords)[:-1],f['z']-thickness,.5-f['z']+thickness,parent=foundation)
for id,a,b,width,*rest in D['stairs']+D['ramps']:
    if min(a[2],b[2])<0:prism(id+'-excavation',strip(a,b,width+.12),min(a[2],b[2])-.3,.6-min(a[2],b[2]),parent=foundation)
box('machine-pit-base',-22,-20,-8.7,44,47,.5,'concrete')

# Tall hall owns three separate movement elevations; the northern wall is solid.
for side,x,ports in [('west',-22,[(1.5,6.5,0,3.2),(-10.35,-7.05,-3.05,-.4),(9.4,12.5,6.4,9.1),(0,4,4.3,6.2)]),('east',22,[(2,7,0,3.2),(-1.35,1.6,-3.05,-.4),(9.3,12.4,6.4,9.1)])]:
    wall('hall-'+side,[(x,-20),(x,27)],19.55,-3.55,.4)
    for i,(lo,hi,bottom,top) in enumerate(ports):add('opening',id=f'hall-{side}-portal-{i+1}',host='hall-'+side,center=f'{(lo+hi)/2+20} {(bottom+top)/2+3.55}',width=hi-lo,height=top-bottom)
wall('hall-north',[(-22,27),(22,27)],16,width=.4)
wall('hall-south',[(-22,-20),(22,-20)],16,width=.4)
for i,(lo,hi) in enumerate([(-10,-4),(-2,2)]):add('opening',id=f'receiving-door-{i+1}',host='hall-south',center=f'{(lo+hi)/2+22} 1.4',width=hi-lo,height=2.8)
# Exterior envelope, joined to the roof heights of each actual volume.
for id,pts,height in [
 ('cleanlock-west',[(-43,-31),(-43,-14)],7.2),('cleanlock-south',[(-43,-31),(-24,-31)],7.2),
 ('receiving-west',[(-24,-31),(-24,-38)],4.8),('receiving-south',[(-24,-38),(18,-38)],4.8),('receiving-east',[(18,-38),(18,-30)],4.8),
 ('cooling-south',[(18,-30),(43,-30)],4.8),('east-low-envelope',[(43,-30),(43,7)],4.8),('power-east',[(43,7),(43,25)],7.2),('control-envelope',[(43,25),(43,34),(22,34)],4.8),
 ('rear-envelope',[(22,34),(-22,34),(-22,30)],4.8),('freight-envelope',[(-22,30),(-43,30),(-43,-14)],10.4)]:wall(id,pts,height)
# Architectural roof steps close high volumes without introducing ground doors.
for id,pts,low,high in [
 ('cleanlock-receiving-step',[(-24,-31),(-22,-31),(-22,-20)],4.8,7.2),('freight-cleanlock-step',[(-43,-14),(-22,-14)],7.2,10.4),
 ('freight-rear-step',[(-22,27),(-22,30)],4.8,10.4),('power-bus-step',[(22,7),(43,7)],4.8,7.2),
 ('power-control-step',[(30,25),(43,25)],4.8,7.2),('tower-south-step',[(22,8),(30,8)],7.2,10.4),
 ('tower-east-power-step',[(30,8),(30,25)],7.2,10.4),('tower-east-control-step',[(30,25),(30,32)],4.8,10.4),('tower-north-step',[(22,32),(30,32)],4.8,10.4),('tower-west-rear-step',[(22,27),(22,32)],4.8,10.4)]:wall(id,pts,high-low,low,.3)

# Floors at the same height share edge ownership. Guard exposed boundaries, but
# remove all flight mouths and wall intersections before drawing parapets.
wall_lines=[]
for n in root.findall('wall'):
    path=root.find(f"path[@id='{n.get('path')}']")
    xyz=[[float(v) for v in row.split()] for row in path.get('points').split(';')]
    wall_lines.append((LineString([(p[0],p[1]) for p in xyz]).buffer(.25),xyz[0][2],xyz[0][2]+float(n.get('height'))))
flights=[(id,a,b,w) for id,a,b,w,*_ in D['stairs']]+D['ramps']
central_shape=Polygon(band(4.2,6.0,225,305))
for z,shapes in by_height.items():
    union=unary_union(shapes)
    # Inset by half the guard thickness so its full width rests on its host floor.
    boundary=union.buffer(-.06,join_style=2).boundary
    cuts=[]
    for id,a,b,w in flights:
        length=hypot(b[0]-a[0],b[1]-a[1]);dx=(b[0]-a[0])/length;dy=(b[1]-a[1])/length
        for endpoint in [a,b]:
            if abs(z-endpoint[2])<.01:
                cuts.append(Polygon(strip((endpoint[0]-.4*dx,endpoint[1]-.4*dy),(endpoint[0]+.4*dx,endpoint[1]+.4*dy),w+.44)))
    if z==-3.2:cuts.append(central_shape.buffer(.22,join_style=2))
    if z==-3.2:cuts.append(Polygon(strip(polar(26,210),polar(28.5,210),3.04)))
    if z==0:cuts.append(Polygon(band(4.0,6.2,220,230)))
    cuts += [shape for shape,lo,hi in wall_lines if lo-.01<=z<hi]
    # Vessel's installed shell owns the inner/outer boundary of the northern arc.
    if z==0:cuts += [Polygon(band(3.7,4.5,0,200)),Polygon(band(8.4,9.2,0,200))]
    guarded=boundary.difference(unary_union(cuts))
    lines=[guarded] if guarded.geom_type=='LineString' else list(guarded.geoms)
    for i,line in enumerate(lines):
        if line.geom_type=='LineString' and line.length>.15:
            guard=set_precision(line,.001).simplify(.002).buffer(.06,cap_style=2,join_style=2)
            for j,part in enumerate(pieces(guard)):
                prism(f'floor-edge-{z}-{i}-{j}',list(part.exterior.coords)[:-1],z,1.1,'yellow',holes=[list(h.coords)[:-1] for h in part.interiors])
# Exact high-target interception guards from the reviewed drawing.
wall('a-front-shield-main',[(-34.4,1.5),(-25,1.5)],2.2,3.2,.12,'yellow')
wall('a-front-shield-west',[(-40,1.5),(-37.6,1.5)],2.2,3.2,.12,'yellow')

for id,z,height,poly in D['screens']+D['low_cover']:
    prism(id,poly,z,height,'yellow' if height<=1.1 else 'blue' if id.startswith(('a-','b-','rear-')) else 'steel')
# Unchanged full-height reactor-floor carts, with distinct local peeks.
for i,(angle,r) in enumerate([(65,7.65),(140,5.15)]):
    x,y=polar(r,angle);box(f'vessel-weld-cart-{i+1}',x-.45,y-.5,0,.9,1,1.05,'blue')

# Legible load paths: lower passage and equator bear on retained vessel/gravity
# structure; crown girders bear on columns outside the bioshield.
for i,angle in enumerate(range(220,351,20)):
    prism(f'lower-deck-bearer-{i}',strip(polar(4.3,angle),polar(7.2,angle),.22),-4.25,.80,'steel')
for i,angle in enumerate([20,60,100,140,180,220,260,300,340]):
    beam=Polygon(strip(polar(4.1,angle),polar(8.8,angle),.22))
    beam=beam.difference(Polygon(D['central_hatch']).buffer(.08))
    for j,piece in enumerate(pieces(beam)):prism(f'equator-bearer-{i}-{j}',list(piece.exterior.coords)[:-1],-.8,.5,'steel')
for i,angle in enumerate([25,55,90,125,155]):
    x,y=polar(20,angle);box(f'crown-pier-{i}',x-.3,y-.3,-8.2,.6,.6,14.3,'steel')
    prism(f'crown-transverse-girder-{i}',strip(polar(18.4,angle),polar(21.6,angle),.35),5.65,.45,'steel')
for x in [-21.5,21.5]:
    for y in [-18,-5,17,25.5]:box(f'hall-column-{x}-{y}',x-.3,y-.3,-8.2,.6,.6,24,'steel')
for x in [-20.5,20.5]:box(f'crane-runway-{x}',x-.25,-19,11.8,.5,45,.7,'dark')
box('overhead-crane',-20.7,-1,12.6,41.4,1.8,1.2,'yellow')
box('crane-trolley',-3.2,-1.3,12,4.8,2.4,.8,'dark')
for x in [-1.4,1.4]:add('cylinder',id=f'crane-cable-{x}',radius=.035,height=5,position=f'{x} 0 7',material='dark')
box('lifting-beam',-2.5,-.25,6.8,5,.5,.35,'yellow')
# Wing mezzanine columns sit under load-bearing tooling or directly at edges.
for i,(x,y,z) in enumerate([(-39.7,2,3.2),(-39.7,23.5,3.2),(-27.1,11,3.2),(-22.3,17,3.2),(-22,10.5,6.4),(-25,24.5,6.4),(22,10.2,6.4),(28.7,21.5,3.2)]):
    base=-3.45 if i==7 else 0
    box(f'wing-support-{i}',x-.16,y-.16,base,.32,.32,z-.3-base,'steel')
for id,z,poly,holes in D['roofs']:
    shape=footprint(poly,holes)
    if id=='receiving-roof':shape=shape.difference(Polygon(rectangle(-43,-31,21,17)))
    shape_slab(id,shape,z,.24,'wall',roof=True)
for y in [-18,-8,2,12,25]:box(f'hall-roof-beam-{y}',-22,y-.16,15.1,44,.32,.65,'dark')

add('player',radius=.35,height=1.8,step=.3,slope=42,crouch=1.1,vault=0,rappel=False,ladder=False)
markers=[
 ('attack-spawn',(-14,-35,0),'attacker_spawn','receiving'),('defend-spawn',(0,31,0),'defender_spawn','rear-services'),
 ('site-a',(-34,14,3.2),'bombsite','a-freight-mezzanine'),('site-b',(35,17,-3.2),'bombsite','b-installation-basin'),
 ('ring-south',(0,-3.2,0),'inspection','vessel-equator'),('ring-north',(0,10.5,0),'inspection','vessel-equator'),('port-west',(-12,4,0),'inspection','west-equatorial-port'),('port-east',(13,4.5,0),'inspection','east-equatorial-port'),
 ('freight-low',(-28,-10,-3.2),'inspection','freight-well-lower'),('freight-top',(-28,4.5,0),'inspection','freight-ground-landing'),
 ('lower-west',(*polar(6.6,214),-3.2),'inspection','lower-w-port-fan'),('lower-east',(*polar(6.6,344),-3.2),'inspection','lower-e-port-fan'),
 ('central-stair-top',(*polar(5.1,220),0),'inspection','central-upper-landing'),('central-stair-bottom',(*polar(5.1,317),-3.2),'inspection','central-lower-landing'),
 ('lower-east-room',(27,2,-3.2),'inspection','b-lower-service-room'),('b-workroom',(27.5,16,-3.2),'inspection','b-west-workroom'),
 ('a-south-base',(-36,-1,0),'inspection','west-ground'),('a-south-top',(-36,9.5,3.2),'inspection','a-south-landing'),
 ('a-east-base',(-24.1,4,0),'inspection','west-ground'),('a-east-top',(-24.1,14.5,3.2),'inspection','a-east-landing'),
 ('a-rear-base',(-29,29,0),'inspection','west-ground'),('a-rear-top',(-29,18.5,3.2),'inspection','a-rear-landing'),
 ('gallery-base',(-24,-15,0),'inspection','west-ground'),('gallery-top',(-23.5,-2,3.2),'inspection','cask-gallery'),
 ('crown-west-base',(-34.5,25,3.2),'inspection','a-crown-lower-landing'),('crown-west-top',(-25,25,6.4),'inspection','crown-west-top-landing'),
 ('crown-west-room',(*polar(19.2,125),6.4),'inspection','crown-west-workroom'),('crown-east-room',(*polar(21.6,55),6.4),'inspection','crown-east-workroom'),
 ('crown-east-top',(26.5,9.5,6.4),'inspection','crown-east-top-landing'),('crown-east-mid',(26.5,20.5,3.2),'inspection','east-crown-mid-landing'),('crown-east-base',(26.5,31,0),'inspection','control-ground'),
 ('b-west-base',(24.5,6,0),'inspection','east-equatorial-port'),('b-west-low',(24.5,16.5,-3.2),'inspection','b-west-landing'),
 ('b-rear-base',(38.5,29,0),'inspection','control-ground'),('b-rear-low',(38.5,18.5,-3.2),'inspection','b-rear-bottom-landing'),
 ('trench',(37.5,-5,-1.2),'inspection','bus-trench'),('b-trench-low',(37.5,8.5,-3.2),'inspection','b-trench-bottom-landing'),('east-rim',(42,16,0),'inspection','b-ground-rim')]
for name,position,kind,element in markers:add('marker',id=name,label=name.replace('-',' ').title(),position=text_rows([position]),kind=kind,element=element)
for i,x in enumerate([-4,-2,2,4]):add('marker',id=f'defender-start-{i+2}',kind='defender_spawn',element='rear-services',position=f'{x} 31 0')
for i,x in enumerate([-18,-16,-12,-10]):add('marker',id=f'attacker-start-{i+2}',kind='attacker_spawn',element='receiving',position=f'{x} -35 0')
routes=[('attack-a','attack-spawn','site-a',130),('attack-b','attack-spawn','site-b',150),('defend-a','defend-spawn','site-a',110),('defend-b','defend-spawn','site-b',100),('a-to-b','site-a','site-b',160),
 ('equator-west-north','port-west','ring-north',40),('equator-north-east','ring-north','port-east',40),('equator-south-north','ring-south','ring-north',40),('receiving-reactor','attack-spawn','ring-south',55),
 ('freight-descent','freight-top','freight-low',30),('lower-west-port','freight-low','lower-west',35),('lower-bypass','lower-west','lower-east',30),('lower-east-port','lower-east','lower-east-room',35),('lower-workroom','lower-east-room','b-workroom',30),('lower-to-b','b-workroom','site-b',30),('central-curve','central-stair-top','central-stair-bottom',14),
 ('a-south-ascent','a-south-base','a-south-top',18),('a-east-ascent','a-east-base','a-east-top',18),('a-rear-ascent','a-rear-base','a-rear-top',18),('cask-gallery-ascent','gallery-base','gallery-top',25),('gallery-to-a','gallery-top','site-a',35),
 ('crown-west-ascent','crown-west-base','crown-west-top',15),('crown-west-acquire','crown-west-top','crown-west-room',40),('crown-rooms','crown-west-room','crown-east-room',38),('crown-east-acquire','crown-east-room','crown-east-top',35),('crown-east-upper','crown-east-top','crown-east-mid',18),('crown-east-lower','crown-east-mid','crown-east-base',18),
 ('b-west-descent','b-west-base','b-west-low',18),('b-rear-descent','b-rear-base','b-rear-low',18),('trench-south','attack-spawn','trench',90),('trench-to-b','trench','b-trench-low',25),('east-rim-access','attack-spawn','east-rim',105)]
for name,a,b,limit in routes:add('route',id=name,from_=a,to=b,min_routes=1,max_distance=limit)
physical_tags={'box','cylinder','cone','sphere','wall','slab','roof','canopy','extrusion','sweep','stairs','ramp','faceted-solid','assembly','subtract','intersect','union'}
physical_nodes=[node for node in root if node.tag in physical_tags]
scene=add('assembly',id='fusion-physical-assembly',coincident_material='retained-face')
for node in physical_nodes:root.remove(node);scene.append(node)
for route in root.findall('route'):route.set('from',route.attrib.pop('from-'))
E.indent(root,space='  ')
E.ElementTree(root).write(P/'level.aml',encoding='utf-8',xml_declaration=True)
print('Wrote',P/'level.aml')
