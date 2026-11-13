"""Create editable native AML from the accepted project plan; no library changes."""
import json,math
from pathlib import Path
from xml.etree.ElementTree import Element,SubElement,indent,tostring
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
P=Path(__file__).parent
d=json.loads((P/'plan.json').read_text())
S=d.get('scale',1)
def world(p):return [p[0]*S,p[1]*S,p[2]]
r=Element('architecture',version='1',id='de_galini',name='Galini · Greek Coastal Town / 5v5 Defusal',units='meters',validation='playable',description='L04 / B10. Original calm coastal cliff town, two bombsites and five spawns per side. Multiplayer rules and balance require destination-engine integration/playtests.')
def add(parent,tag,**attrs):return SubElement(parent,tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def num(v):return f'{v:.3f}'.rstrip('0').rstrip('.') if v else '0'
def xyz(p):return ' '.join(num(x) for x in p)
def profile(id,points,holes=()):
    e=add(r,'profile',id=id,points='; '.join(xyz(p) for p in points))
    for h in holes:add(e,'hole',points='; '.join(xyz(p) for p in h))
    return id
def path(id,points):add(r,'path',id=id,points='; '.join(xyz(p) for p in points));return id
def footprint(poly):return list(poly.exterior.coords)[:-1]
palette={'plaster':'#f6f0df','warm-plaster':'#e8dcc4','paving':'#d5c7ac','upper-paving':'#eee0bd','stone':'#b7aa8b','blue':'#467fa0','blue-dark':'#335f79','terra':'#c39376','olive':'#8a9c76','soil':'#786c53','sea':'#95cbd0','rock':'#9d9b89','rock-light':'#c4bea4','paint-a':'#bd8759','paint-b':'#76a9a5','white':'#fff8e9'}
for id,color in palette.items():add(r,'material',id=id,color=color)
physical=add(r,'assembly',id='town',label='Cliff town physical blockout',coincident_material='retained-face')
for id,label,z,points in d['floors']:
    ref=profile(id+'-plan',points)
    add(physical,'slab',id=id,label=label,profile=ref,elevation=num(z),thickness='.35',material='paving' if z==0 else 'upper-paving',group='streets',playable='true')
    if z>0:add(physical,'extrusion',id=id+'-foundation',profile=ref,position='0 0 -6',distance=num(z+5.65),material='rock-light',group='foundations')
for id,label,a,b,w in d['stairs']:
    ref=path(id+'-axis',[a,b])
    count=math.ceil((b[2]-a[2])/.16)
    add(physical,'stairs',id=id,label=label,path=ref,width=w,count=count,thickness='.35',underside='filled',material='upper-paving',group='stairs')
    for side in ('left','right'):
        add(physical,'enclosure',id=id+'-'+side,host=id,side=side,construction='wall',height='3.2',thickness='.4',material='plaster',group='facades')
        dx,dy=b[0]-a[0],b[1]-a[1];run=math.hypot(dx,dy);sign=1 if side=='left' else -1
        nx,ny=-dy/run*w/2*sign,dx/run*w/2*sign
        supportaxis=path(id+'-'+side+'-support-axis',[(a[0]+nx,a[1]+ny,a[2]),(b[0]+nx,b[1]+ny,a[2])])
        add(physical,'wall',id=id+'-'+side+'-retaining-cheek',path=supportaxis,height=num(b[2]-a[2]+.2),thickness='.44',material='plaster',group='stair-foundations')
for wall in d['walls']:
    a,b=wall['a'],wall['b'];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
    ref=path(wall['id']+'-axis',[(a[0]-.1*dx/length,a[1]-.1*dy/length,a[2]),(b[0]+.1*dx/length,b[1]+.1*dy/length,b[2])])
    add(physical,'wall',id=wall['id'],path=ref,thickness='.4',height=num(wall['height']),material='plaster',group='facades')
for o in d['objects']:
    shape=Polygon(o['points'])
    ref=profile(o['id']+'-plan',footprint(shape))
    mat='stone' if o['kind']=='low' or o['id']=='O-CISTERN' else 'plaster'
    if o['kind']=='interior':
        vertices=o['points'];perimeter=vertices+[vertices[0]]
        wallref=path(o['id']+'-perimeter',[(x,y,o['z']) for x,y in perimeter])
        add(physical,'wall',id=o['id'],label=o['label'],path=wallref,height=num(o['height']),thickness='.4',material=mat,group='interiors')
        distance=0
        for edge,(a,b) in enumerate(zip(perimeter,perimeter[1:])):
            length=math.dist(a,b)
            if edge in o['doorEdges']:add(r,'opening',id=o['id']+f'-door-{edge}',host=o['id'],shape='arch',center=xyz((distance+length/2,1.55)),width=o['doorWidth'],height='3.1')
            distance+=length
        add(physical,'roof',id=o['id']+'-roof',profile=ref,elevation=num(o['z']+o['height']),thickness='.25',material='terra' if o['id']=='O-BOAT' else 'plaster',playable='false',group='roofs')
    else:
        add(physical,'extrusion',id=o['id'],label=o['label'],profile=ref,position=xyz((0,0,o['z'])),distance=num(o['height']),material=mat,group='fixtures')
        if o['id']=='O-COAST':add(physical,'roof',id=o['id']+'-roof',profile=ref,elevation=num(o['z']+o['height']+.18),thickness='.18',material='terra',playable='false',group='roofs')
for roof in d.get('roofs',[]):
    add(physical,'roof',id=roof['id'],profile=roof['floor']+'-plan',elevation=roof['z'],thickness='.25',material='warm-plaster',playable='false',group='roofs')
# A quiet cliff shelf supports the lower streets; sea is visual geometry only.
island=Polygon([(28,0),(54,-1),(65,8),(80,11),(90,20),(94,37),(100,50),(102,72),(91,88),(70,101),(39,102),(20,94),(3,78),(-1,62),(1,45),(5,24),(16,14),(29,15)])
island=Polygon([(x*S,y*S) for x,y in footprint(island)])
landref=profile('cliff-plan',footprint(island))
add(physical,'extrusion',id='cliff',profile=landref,position='0 0 -7',distance='6.65',material='rock',group='foundations')
# Backing parcels meet the street walls. Their tops stay below the boundary skyline.
walk=unary_union([Polygon(f[3]) for f in d['floors']]+[LineString([a[:2],b[:2]]).buffer(w/2,cap_style=2) for _,_,a,b,w in d['stairs']])
parcels=island.difference(walk.buffer(.19,join_style=2)).buffer(-.02)
for i,p in enumerate(parcels.geoms if parcels.geom_type=='MultiPolygon' else [parcels]):
    if p.area<6:continue
    center=p.representative_point();top=5.6 if center.y<59*S else 7.0
    ref=profile(f'parcel-{i}-plan',footprint(p),[list(h.coords)[:-1] for h in p.interiors])
    add(physical,'extrusion',id=f'parcel-{i}',profile=ref,position='0 0 -.35',distance=num(top+.35),material='warm-plaster',group='urban-masses')
art=add(r,'group',id='coastal-details',collidable='false')
searef=profile('sea-plan',[(-100,-100),(200,-100),(200,200),(-100,200)])
add(art,'roof',id='sea-water',profile=searef,elevation='-5.8',thickness='.1',material='sea',playable='false',collidable='false',group='scenery')
# Repeated shutter pairs sit on the street faces; they do not change body clearance.
for i,wall in enumerate(d['walls']):
    a,b=wall['a'],wall['b'];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
    if wall['height']<3 or length<2.1:continue
    angle=math.degrees(math.atan2(dy,dx));mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2
    if i%2==0:
        add(art,'box',id=f'shutter-{i}',position=xyz((mx,my,a[2]+2.0)),rotation=xyz((0,0,angle)),width='1.1',depth='.46',height='1.1',anchor='bottom-center',material='blue',collidable='false',group='shutters')
# Capped local fixtures and a blue-domed chapel are visible callout landmarks.
for o in d['objects']:
    if o['kind']=='low':
        shape=Polygon(o['points']).buffer(-.15)
        if not shape.is_empty:
            ref=profile(o['id']+'-inset-plan',footprint(shape))
            add(art,'roof',id=o['id']+'-inset',profile=ref,elevation=num(o['z']+o['height']+.015),thickness='.02',material='olive' if o['id']!='O-FOUNTAIN' else 'blue',playable='false',collidable='false')
add(physical,'cylinder',id='chapel-drum',position=xyz((15*S,71*S,11)),radius=num(3.1*S),height='1.2',segments='24',material='plaster',group='roofs')
add(physical,'sphere',id='chapel-dome',position=xyz((15*S,71*S,11.9)),radius=num(3.15*S),scale='1 1 .8',segments='24',material='blue',group='roofs')
# Face partitions mark plant courtyards without physical lips or duplicated floors.
for name,center,host,mat in [('A',(27,64),'F-A','paint-a'),('B',(83,63),'F-B','paint-b')]:
    center=(center[0]*S,center[1]*S)
    ref=profile('plant-'+name+'-plan',[(center[0]-1.5,center[1]-1.5),(center[0]+1.5,center[1]-1.5),(center[0]+1.5,center[1]+1.5),(center[0]-1.5,center[1]+1.5)])
    add(r,'face-material',id='plant-'+name+'-paint',host=host,face='top',profile=ref,material=mat)
add(r,'player',radius='.3',height='1.8',step='.3',slope='42',crouch='1.1',vault='0',rappel='false',ladder='false')
markers=[]
def marker(id,p,kind,element,label='',team='neutral'):
    add(r,'marker',id=id,position=xyz(world(p)),kind=kind,element=element,label=label or id,team=team,movement='land',group='markers');markers.append((id,p))
for i,p in enumerate([(44,11,0),(41,10,0),(43,14,0),(47,8,0),(48,12,0)]):marker('t-spawn' if i==0 else f't-spawn-{i+1}',p,'attacker_spawn','F-T',f'T {i+1}','attack')
for i,p in enumerate([(51,90,4),(49,88,4),(54,90,4),(48,91,4),(52,93,4)]):marker('ct-spawn' if i==0 else f'ct-spawn-{i+1}',p,'defender_spawn','F-CT',f'CT {i+1}','defend')
marker('site-a',(27,64,4),'objective','F-A','A · Chapel Court')
marker('site-b',(83,63,0),'objective','F-B','B · Boat Court')
for id,p,element in [
 ('sea-overlook',(14,40,0),'F-W'),('cliff1-foot',(14.7,42,0),'F-W'),('cliff1-head',(9.4,50,2),'F-SWITCH'),('cliff2-foot',(12.2,53,2),'F-SWITCH'),('cliff2-head',(19,61.2,4),'F-A'),
 ('bell-foot',(32.6,44.5,0),'F-AS0'),('bell-head',(27.4,57.5,4),'F-A'),('gate-foot',(47.5,53.5,0),'F-GATE0'),('gate-head',(52.6,66.5,4),'F-M1'),('boat-foot',(84.7,64.6,0),'F-B'),('boat-head',(78.3,77.4,4),'F-CT'),
 ('mid',(49,43,0),'F-M'),('market',(69,55,0),'F-BM'),('harbor',(81.5,36,0),'F-E'),('harbor-entry',(81,51,0),'F-E'),('a-back',(29,76,4),'F-A'),('upper-west',(39,83,4),'F-CT'),('upper-east',(68,81,4),'F-CT'),('laundry',(25,36,0),'F-LAUNDRY'),('winery',(27,40,0),'F-WINERY'),('wine-lane',(22,43,0),'F-W-CROSS'),('taverna-mouth',(62,21,0),'F-TMOUTH'),('taverna-court',(64,31,0),'F-TAVERNA'),('arcade',(68,37,0),'F-ARCADE'),('customs-west',(58,55,0),'F-CUSTOMS'),('customs-north',(64,60,0),'F-CUSTOMS'),('post-office',(66,86,4),'F-POST'),('chapel-interior',(15,71,4),'F-A'),('boat-interior',(88,61,0),'F-B')]:marker(id,p,'poi',element)
doorRoutes=[]
for o in d['objects']:
    if o['kind']!='interior':continue
    pp=o['points'];shape=Polygon(pp);insideIds=[]
    prefix='chapel' if o['id']=='O-CHAPEL' else 'boat'
    for edge in o['doorEdges']:
        a,b=pp[edge],pp[(edge+1)%len(pp)];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);cx,cy=(a[0]+b[0])/2,(a[1]+b[1])/2
        nx,ny=-dy/length,dx/length
        if not shape.contains(Point(cx+nx,cy+ny)):nx,ny=-nx,-ny
        for side,sign in [('inside',1),('outside',-1)]:
            id=f'{prefix}-door-{edge}-{side}'
            marker(id,((cx+nx*1.4*sign)/S,(cy+ny*1.4*sign)/S,o['z']),'poi','F-A' if prefix=='chapel' else 'F-B')
        insideIds.append(f'{prefix}-door-{edge}-inside')
        doorRoutes.append((f'{prefix}-door-{edge}',f'{prefix}-door-{edge}-outside',f'{prefix}-door-{edge}-inside',5/S))
    doorRoutes.append((prefix+'-interior-crossing',insideIds[0],insideIds[1],18/S))
def route(id,a,b,limit):
    e=add(r,'route',id=id,to=b,min_routes='1',max_distance=num(limit*S),movement='land');e.set('from',a)
for id,a,b,limit in [
 ('T-A','t-spawn','site-a',150),('T-B','t-spawn','site-b',150),('CT-A','ct-spawn','site-a',110),('CT-B','ct-spawn','site-b',110),('A-B','site-a','site-b',160),
 ('Cliff-lower','cliff1-foot','cliff1-head',14),('Cliff-landing','cliff1-head','cliff2-foot',10),('Cliff-upper','cliff2-foot','cliff2-head',15),('Bell-climb','bell-foot','bell-head',16),('Gate-climb','gate-foot','gate-head',16),('Boat-climb','boat-foot','boat-head',17),
 ('Ferry-Sea','t-spawn','sea-overlook',70),('Sea-Cliff','sea-overlook','cliff1-foot',12),('Cliff-A','cliff2-head','site-a',20),('Ferry-Harbor','t-spawn','harbor',90),('Harbor-entry','harbor','harbor-entry',36),('Harbor-B','harbor-entry','site-b',30),('Mid-Market','mid','market',40),('Market-B','market','site-b',28),('Upper-rotation','upper-west','upper-east',45),('A-Upper','a-back','upper-west',28),('Upper-Boat','upper-east','boat-head',27),('Sea-Laundry','sea-overlook','laundry',28),('Laundry-Winery','laundry','winery',18),('Winery-Bell','winery','bell-foot',22),('Wine-crosslink','sea-overlook','wine-lane',22),('Wine-Winery','wine-lane','winery',20),('Ferry-Taverna-mouth','t-spawn','taverna-mouth',38),('Taverna-mouth-court','taverna-mouth','taverna-court',20),('Court-Arcade','taverna-court','arcade',20),('Arcade-Market','arcade','market',28),('Mid-Customs','mid','customs-west',26),('Customs-north','customs-west','customs-north',22),('Customs-Market','customs-north','market',25),('Customs-Gate','customs-west','gate-foot',26),('Upper-Post','upper-west','post-office',40),('Post-East','post-office','upper-east',22),('A-Chapel','site-a','chapel-interior',26),('B-Boathouse','site-b','boat-interior',18)]:route(id,a,b,limit)
for id,a,b,limit in doorRoutes:route(id,a,b,limit)
# Physical contact assertions also make the semantic route graph explicit at shared district thresholds.
for index,a in enumerate(d['floors']):
    for b in d['floors'][index+1:]:
        if a[2]!=b[2]:continue
        pa,pb=Polygon(a[3]),Polygon(b[3]);join=pa.intersection(pb)
        if join.area>.1 or pa.boundary.intersection(pb.boundary).length>1:
            e=add(r,'connection',id=a[0]+'--'+b[0],to=b[0]);e.set('from',a[0])
for id,lo,hi in [('S-CLIFF1','F-W','F-SWITCH'),('S-CLIFF2','F-SWITCH','F-A'),('S-SHORT','F-AS0','F-A'),('S-GATE','F-GATE0','F-M1'),('S-BOAT','F-B','F-CT')]:
    e=add(r,'connection',id=id+'-foot-contact',to=id);e.set('from',lo)
    e=add(r,'connection',id=id+'-head-contact',to=hi);e.set('from',id)
add(r,'sky',color='#cde4e3',intensity='.8')
add(r,'light',id='afternoon-sun',kind='directional',position='-30 -50 90',target='45 50 0',color='#fff2d4',intensity='2')
indent(r,space='  ')
(P/'level.aml').write_bytes(b'<?xml version="1.0" encoding="UTF-8"?>\n'+tostring(r,encoding='utf-8')+b'\n')
print('Wrote',P/'level.aml')
