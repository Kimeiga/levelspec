"""L02 coordinate proposal and review drawings, not AML or gameplay verification.
Requires shapely (local install: generated/last-light-reboot-tools).
"""
from pathlib import Path
import sys, json, math, hashlib
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from xml.sax.saxutils import escape
R=Path(__file__).parent
BASE=json.loads((R/'proposal-b-s01.json').read_text())
def poly(p):return Polygon(p)
def polygons(g):
 if g.is_empty:return []
 if g.geom_type=='Polygon':return [g]
 return [p for x in g.geoms for p in polygons(x)] if hasattr(g,'geoms') else []
def serial(g):return [{'outer':[[round(x,3),round(y,3)] for x,y in list(p.exterior.coords)[:-1]],'holes':[[[round(x,3),round(y,3)] for x,y in list(h.coords)[:-1]] for h in p.interiors]} for p in polygons(g)]
def rect(x1,y1,x2,y2):return box(x1,y1,x2,y2)
objects=[];ports=[];regions=[];stairs=[]
def add(id,g,z0,z1,kind,role='',**extra):
 if g.is_empty:return
 obj=dict(id=id,footprint=serial(g),z0=z0,z1=z1,kind=kind,role=role,**extra)
 objects.append(obj);obj['_g']=g
 return obj
def area(id,name,g,z):regions.append(dict(id=id,name=name,footprint=serial(g),z=z,_g=g))
def wall(id,a,b,z0,z1,openings=(),width=.4,kind='wall'):
 length=math.dist(a,b);dx=(b[0]-a[0])/length;dy=(b[1]-a[1])/length
 def seg(lo,hi,bottom,top,suffix):
  if hi-lo<.01 or top-bottom<.01:return
  g=LineString([(a[0]+dx*lo,a[1]+dy*lo),(a[0]+dx*hi,a[1]+dy*hi)]).buffer(width/2,cap_style=2)
  add(id+suffix,g,bottom,top,kind,assembly=id)
 cursor=0
 for i,(lo,hi,sill,head,pid,pkind) in enumerate(sorted(openings)):
  seg(cursor,lo,z0,z1,f'-p{i}')
  seg(lo,hi,z0,sill,f'-s{i}');seg(lo,hi,head,z1,f'-h{i}')
  ports.append(dict(id=pid,assembly=id,kind=pkind,a=[a[0]+dx*lo,a[1]+dy*lo],b=[a[0]+dx*hi,a[1]+dy*hi],sill=sill,head=head,width=hi-lo))
  cursor=hi
 seg(cursor,length,z0,z1,f'-p{len(openings)}')

# Retain early spatial identity; named polygons are program boundaries, not every wall.
for a in BASE['ground']:area(a['id'],a['name'],poly(a['points']),0)
for a in regions:
 if a['id'] in ['W5','N1','S1','E5']:
  a['movementThrough']=False
  a['name']={'W5':'Sealed cinema frontage','N1':'Closed cinema back volume','S1':'Anchor threshold / through route retired','E5':'Stock / service apron'}[a['id']]
# Complete service-stair receiving/entry floors and the enlarged lower transfer.
area('G1X','Lower transfer extension',rect(42,44,80,54),0)
area('W4X','Service stair threshold',rect(22,52,34,80),0)
area('E4X','Delivery stair threshold',rect(92,26,104,50),0)
ground=unary_union([a['_g'] for a in regions])
upperdefs=[
 ('U0','Food court',poly([[48,42],[76,42],[82,48],[82,60],[76,66],[48,66],[42,60],[42,48]])),
 ('U0X','Transfer slab',rect(42,44,80,54)),
 ('U1','West public staging',poly([[30,56],[40,56],[40,48],[48,48],[48,72],[30,72]])),
 ('U2','North shop gallery',rect(30,72,78,84)),
 ('U3','North kitchen entry',rect(60,60,70,76)),
 ('U4','East public staging',unary_union([rect(78,34,96,46),rect(78,46,84,56),rect(78,28,88,38)])),
 ('U5','South service gallery',rect(50,20,104,30)),
 ('U6','South re-entry',rect(60,28,78,44)),
 ('U9','North stair landing',rect(22,76,34,84)),
 ('K0','Occupied food preparation',rect(48,60,78,72))]
for id,name,g in upperdefs:area(id,name,g,3.6)
# Four ordinary stair flights; 24 risers .15 and 24 treads .75.
for id,x1,x2,y0,y1,mode in [('X1',34,40,38,56,'public'),('X2',24,30,58,76,'service'),('X3',84,90,64,46,'public'),('X4',94,100,46,28,'service')]:
 g=rect(x1,min(y0,y1),x2,max(y0,y1));stairs.append(dict(id=id,footprint=serial(g),start=[(x1+x2)/2,y0,0],end=[(x1+x2)/2,y1,3.6],width=6,run=18,rise=3.6,risers=24,tread=.75,mode=mode,_g=g))
 for n in range(24):
  ya=y0+(y1-y0)*n/24;yb=y0+(y1-y0)*(n+1)/24
  add(f'{id}-t{n+1:02}',rect(x1,min(ya,yb),x2,max(ya,yb)),0,(n+1)*.15,'stair',assembly=id)
  for suffix,x in [('W',x1),('E',x2)]:add(f'{id}-g{suffix}{n+1:02}',rect(x-.12,min(ya,yb),x+.12,max(ya,yb)),(n+1)*.15,(n+1)*.15+1.1,'stair-guard',assembly=id)
upper=unary_union([a['_g'] for a in regions if a['z']==3.6]).difference(unary_union([s['_g'] for s in stairs]))
upper=upper.difference(rect(44,80,78,88))
add('F-G',ground,-.35,0,'floor','Ground floor, 0.35 m structural slab')
add('F-U',upper,3.25,3.6,'floor','Upper floor / lower-transfer ceiling; 3.25 m clear below')
# Building skin follows occupied union; high public hall and lower anchor/service volumes are disjoint roofs.
footprint=unary_union([ground,upper])
high=footprint.intersection(rect(26,30,98,86));mid=footprint.difference(high).intersection(unary_union([upper.buffer(.01),rect(22,52,34,84),rect(92,20,104,50)]));low=footprint.difference(unary_union([high,mid]))
skylights=[rect(30,36,48,64),rect(72,30,90,68)]
for id,g,h in [('R-H',high,10.8),('R-M',mid,7.8),('R-L',low,4.4)]:
 actual=g.difference(unary_union(skylights)) if id=='R-H' else g
 add(id,actual,h,h+.35,'roof',f'Roof underside {h:g} m')
for n,g in enumerate(skylights):add(f'R-SK{n+1}',g.intersection(high),10.8,10.94,'glazing','Translucent roof; visually transmissive, collision only')
for polyindex,p in enumerate(polygons(footprint)):
 for ringindex,ring in enumerate([p.exterior,*p.interiors]):
  coords=list(ring.coords)
  for i,(a,b) in enumerate(zip(coords,coords[1:])):
   midpt=Point((a[0]+b[0])/2,(a[1]+b[1])/2)
   h=10.8 if high.buffer(.1).covers(midpt) else (7.8 if mid.buffer(.1).covers(midpt) else 4.4)
   wall(f'EXT-{polyindex}-{ringindex}-{i}',a,b,0,h)
# L02: close every shared external roof-height seam above the lower roof top.
# The lower roof remains open beneath its underside; these are enclosure fascias, not ground partitions.
roof_seams=[]
for seam_name,ga,ha,gb,hb in [('HL',high,10.8,low,4.4),('HM',high,10.8,mid,7.8),('ML',mid,7.8,low,4.4)]:
 ga=unary_union(polygons(ga));gb=unary_union(polygons(gb))
 seam=ga.boundary.intersection(gb.boundary)
 lines=[seam] if seam.geom_type=='LineString' else [g for g in getattr(seam,'geoms',[]) if g.geom_type=='LineString']
 serial_index=0
 for line in lines:
  coords=list(line.coords)
  for a,b in zip(coords,coords[1:]):
   if math.dist(a,b)<.001:continue
   id=f'RC-{seam_name}-{serial_index:02}'
   wall(id,a,b,hb+.35,ha,width=.3)
   roof_seams.append(dict(id=id,a=list(a),b=list(b),z0=hb+.35,z1=ha,width=.3,length=math.dist(a,b),role='opaque exterior roof-step fascia'))
   serial_index+=1

# Internal spawn boundaries: two distinct departures with opaque returns; no spawn-barrier assumption.
wall('SW-P',(24,8),(24,28),0,4.4,[(4,12,0,3.2,'P-WP1','movement')])
wall('SW-S',(4,28),(24,28),0,4.4,[(4,12,0,3.2,'P-WS1','movement')])
add('SW-R1',rect(18,10,18.4,22),0,4.4,'wall','Public return screens spawn from department vestibule')
add('SW-R2',rect(8,22,14,22.4),0,4.4,'wall','Service return; 4 m clear beside public return')
add('SW-B1',rect(28,20,34,28),0,4.4,'core','Deep closed shop in public vestibule')
add('SW-B2',rect(16,32,24,38),0,4.4,'core','Stock enclosure turns service departure')
wall('SW-VR',(24,21),(28,21),0,4.4,width=.4) # public vestibule return to the existing SW-B1; east aisle stays 6 m
wall('SW-ATR',(28,32),(40,32),0,4.4,[(4,10,0,3.4,'P-WP2','movement')])
wall('SE-P',(98,76),(98,98),0,4.4,[(8,16,0,3.2,'P-EP1','movement')])
wall('SE-S',(98,76),(116,76),0,4.4,[(6,14,0,3.2,'P-ES1','movement')])
add('SE-R1',rect(104,82,104.4,96),0,4.4,'wall','Public return')
add('SE-R2',rect(108,82,116,82.4),0,4.4,'wall','Service return')
add('SE-B1',rect(86,78,92,86),0,4.4,'core','Deep department frontage')
add('SE-B2',rect(96,66,104,72),0,4.4,'core','Delivery stock enclosure')
wall('SE-VR',(104,72),(104,76),0,4.4,width=.4) # service return joins the existing stock block to the spawn wall
wall('SE-ATR',(82,72),(98,72),0,4.4,[(6,12,0,3.4,'P-EP2','movement')])
# Screen service flights with full side walls and two distinct landing exits.
for id,xlo,xhi,ylo,yhi in [('SX2',22,34,52,84),('SX4',92,104,20,50)]:
 wall(id+'-W',(xlo,ylo),(xlo,yhi),0,7.8,[(0,6,0,3.2,'P-'+id+'-LOW','movement')] if id=='SX2' else [])
 wall(id+'-E',(xhi,ylo),(xhi,yhi),0,7.8,[(24,32,3.6,6.8,'P-'+id+'-UP','movement')] if id=='SX2' else [])
if True:
 wall('SX2-S',(22,52),(34,52),0,7.8)
 wall('SX2-N',(22,84),(34,84),0,7.8)
 wall('SX4-N',(92,50),(104,50),0,7.8,[(2,8,0,3.2,'P-SX4-LOW','movement')])
 wall('SX4-S',(92,20),(104,20),0,7.8)
 # Upper X4 leaves west across the full 8 m landing, with no floor across its flight.
 # Replace the relevant west shell segment with a true upper doorway.
 objects[:]=[o for o in objects if o.get('assembly')!='SX4-W']
 wall('SX4-W',(92,20),(92,50),0,7.8,[(0,8,3.6,6.8,'P-SX4-UP','movement')])
# Central underpass: 10 m wide with short offset returns. Remaining necks 4 m.
wall('G-N',(42,54),(80,54),0,3.25)
wall('G-S',(42,44),(80,44),0,3.25)
add('G-BW',rect(45.6,44,46.4,50),0,3.25,'core','West short return: use north 4 m opening')
add('G-BE',rect(73.6,48,74.4,54),0,3.25,'core','East short return: use south 4 m opening')
ports += [dict(id='P-GW',kind='movement',a=[42,44],b=[42,54],sill=0,head=3.25,width=10),dict(id='P-GE',kind='movement',a=[80,44],b=[80,54],sill=0,head=3.25,width=10)]
# Thick food stalls and service core divide views, with actual occupied preparation passage.
add('C-W',rect(48,56,56,68),3.6,7.8,'core','Closed 8 m-deep concession block; public staging on west')
add('C-NW',rect(48,64,60,72),3.6,7.8,'core','Cold stores / prep enclosure')
add('C-NE',rect(70,58,78,72),3.6,7.8,'core','Deep eastern stalls')
add('C-IS',rect(58,52,64,64),3.6,7.8,'core','Integrated kitchen pavilion attaches to rear service band')
add('C-E',rect(70,38,78,50),3.6,7.8,'core','East public staging screened by restaurant volume')
add('C-S',rect(50,32,60,42),3.6,7.8,'core','Closed south restaurant; south approach has actual depth')
# Upper front partitions: deliberate movement thresholds, not an open viewing ring.
wall('UP-W',(48,42),(48,72),3.6,7.8,[(6,12,3.6,6.8,'P-UW','movement')])
wall('UP-E',(78,34),(78,66),3.6,7.8,[(16,22,3.6,6.8,'P-UE','movement')])
wall('UP-N',(60,60),(70,60),3.6,7.8,[(4,10,3.6,6.8,'P-UN','movement')])
wall('UP-S',(50,42),(78,42),3.6,7.8,[(10,18,3.6,6.8,'P-US','movement')])
wall('UP-WN',(30,72),(48,72),3.6,7.8,[(10,16,3.6,6.8,'P-WN','movement')])
# Low refuge integrated in food stalls / planters, not ballistic assumptions.
for id,g,z in [('LC-W',rect(50,48,55,49.2),3.6),('LC-E',rect(69,54,74,55.2),3.6),('LC-N',rect(50,76,56,77.2),3.6),('LC-S',rect(62,30,68,31.2),3.6),('LC-GW',rect(29,44,32,46),0),('LC-GE',rect(91,54,94,56),0)]:add(id,g,z,z+1.15,'low-cover','1.15 m planter/counter; standing eye exposed, crouch eye may hide on same floor')
# Columns support the tall shared atria and transfer floor. No free-floating mezzanine.
for id,x,y in [('COL-W1',30,36),('COL-W2',50,38),('COL-W3',52,68),('COL-E1',68,30),('COL-E2',94,60),('COL-E3',72,70)]:add(id,Point(x,y).buffer(.65,resolution=4),0,10.8,'column')
for id,x,y in [('COL-T1',54,43.8),('COL-T2',66,54.2)]:add(id,rect(x-.5,y-.5,x+.5,y+.5),0,3.25,'column','Transfer slab support against wall edge')
# Deliberate macro revision: closed cinema / anchor-stock volumes retire empty ground perimeter through-routes.
add('M-CIN',rect(44,80,78,88),0,10.8,'core','Sealed cinema back volume; north upper gallery fronts it at y80')
add('M-CIN-P',rect(34,72,44,80),0,3.25,'core','Closed cinema service plinth below occupied north gallery')
add('M-CIN-W',rect(24,84,44,88),0,10.8,'core','Cinema end mass behind north service landing')
add('M-TICKET',rect(78,76,86,88),0,4.4,'core','Deep ticket / shutter frontage at east department vestibule')
add('M-STOCK',rect(40,10,86,26),0,3.25,'core','Closed ground anchor stock; south service gallery is occupied above')
# Upper edges: guard every actual void edge except receiving width at flight tops.
# Observation front segments below replace generic guards and are bounded by full-height cheeks.
windowlines=[LineString([(40,48),(48,48)]),LineString([(78,56),(84,56)])]
ends=[LineString([(s['end'][0]-3,s['end'][1]),(s['end'][0]+3,s['end'][1])]).buffer(.03) for s in stairs]
exclusions=unary_union(ends+[l.buffer(.03) for l in windowlines]+[footprint.boundary.buffer(.3)])
for n,p in enumerate(polygons(upper)):
 for rn,ring in enumerate([p.exterior,*p.interiors]):
  line=LineString(ring.coords).difference(exclusions)
  lines=[line] if line.geom_type=='LineString' else list(line.geoms)
  for j,l in enumerate(lines):
   if l.length>.1:add(f'GU-{n}-{rn}-{j}',l.buffer(.12,cap_style=2),3.6,4.7,'guard','1.1 m upper void guard')
wall('OW',(40,48),(48,48),3.6,7.8,[(0,4,4.7,6.4,'O-W','observation')],width=.4)
wall('OE',(78,56),(84,56),3.6,7.8,[(2,6,4.7,6.4,'O-E','observation')],width=.4)
# Exact upper roof over the service cores; public atrium roof remains above at 10.8.
add('R-CORE',rect(48,56,78,72),7.8,8.15,'roof','Food-stall/service roof, 4.2 m above upper floor')
add('R-SX2',rect(22,52,34,84),7.8,8.15,'roof','Enclosed service stair roof')
add('R-SX4',rect(92,20,104,50),7.8,8.15,'roof','Enclosed service stair roof')

# Player positions use feet XYZ. Bodies and targets are predictions until compiled walk/views.
positions={
 'SW':[12,17,0],'SW-P':[21,16,0],'SW-S':[12,26,0],'W-REG':[26,30,0],
 'W-LEAD':[37,36,0],'W-FOLLOW':[35,33,0],'W-MID':[37,47.375,1.95],'W-TOP':[37,58,3.6],'W-SUPPORT':[36,62,3.6],
 'W-STAGE':[41,50,3.6],'W-LOOK':[41,39,0],'W-RETREAT':[38,66,3.6],
 'N-LOW':[27,56,0],'N-MID':[27,67.375,1.95],'N-TOP':[27,80,3.6],'N-STAGE':[42,78,3.6],'N-SUPPORT':[57,78,3.6],'N-ENTRY':[67,62,3.6],
 'SE':[110,90,0],'SE-P':[101,88,0],'SE-S':[108,78,0],'E-REG':[94,74,0],
 'E-LEAD':[87,66,0],'E-FOLLOW':[91,70,0],'E-MID':[87,54.625,1.95],'E-TOP':[87,42,3.6],'E-SUPPORT':[90,39,3.6],
 'E-STAGE':[83,54,3.6],'E-LOOK':[83,67,0],'E-RETREAT':[84,33,3.6],
 'S-LOW':[97,48,0],'S-MID':[97,36.625,1.95],'S-TOP':[97,24,3.6],'S-STAGE':[74,32,3.6],'S-SUPPORT':[70,35,3.6],'S-ENTRY':[64,40,3.6],
 'G-W':[42,52,0],'G-WC':[42,49,0],'G-EC':[80,49,0],'G-MID':[60,49,0],'G-E':[80,46,0],
 'POINT-W':[56.5,51,3.6],'POINT-E':[69,51,3.6],'POINT-S':[63,46,3.6],'POINT-N':[67,56,3.6],
 'W-ENEMY':[43,55,3.6],'E-ENEMY':[80,49,3.6],
 'W-PRESS':[36,16,0],'E-PRESS':[108,64,0]
}
routes={
 'west-public':['SW',[16,18,0],[16,24,0],[21,24,0],'SW-P',[26,16,0],[36,16,0],[36,30,0],[35,30,0],'W-FOLLOW','W-LEAD',[37,38,0],[37,47,1.8],[37,56,3.6],'W-TOP',[44,60,3.6],[44,51,3.6],[49,51,3.6],'POINT-W'],
 'west-service':['SW',[16,18,0],[16,25,0],'SW-S',[12,31,0],[12,41,0],[18,48,0],[18,55,0],'N-LOW',[27,58,0],[27,67,1.8],[27,76,3.6],'N-TOP',[37,80,3.6],'N-STAGE',[65,78,3.6],[67,68,3.6],'N-ENTRY','POINT-N'],
 'east-public':['SE',[106,90,0],[106,80,0],[101,80,0],'SE-P',[95,88,0],[95,75,0],[91,74,0],[91,70,0],'E-LEAD',[87,64,0],[87,55,1.8],[87,46,3.6],'E-TOP',[80,42,3.6],[80,53,3.6],[76,53,3.6],'POINT-E'],
 'east-service':['SE',[106,90,0],[106,80,0],'SE-S',[108,74,0],[108,63,0],[100,58,0],[97,52,0],'S-LOW',[97,46,0],[97,37,1.8],[97,28,3.6],'S-TOP',[88,24,3.6],[74,24,3.6],'S-STAGE',[70,35,3.6],[64,35,3.6],'S-ENTRY',[64,44,3.6],'POINT-S'],
 'lower-change':['W-LOOK',[41,42,0],'G-W',[48,52,0],[60,50,0],[71,46,0],'G-E',[82,58,0],'E-LOOK'],
 'upper-west-switch':['W-TOP',[44,63,3.6],[43,74,3.6],'N-STAGE',[65,78,3.6],[67,68,3.6],'N-ENTRY'],
 'upper-east-switch':['E-TOP',[84,33,3.6],[74,33,3.6],[70,35,3.6],[64,35,3.6],'S-ENTRY']
}
routes.update({
 'west-public-escape':['W-REG',[36,30,0],[36,16,0],[26,16,0],'SW-P',[21,24,0],[16,24,0],[16,18,0],'SW'],
 'west-service-escape':['W-REG',[22,30,0],[12,30,0],'SW-S',[16,25,0],[16,18,0],'SW'],
 'east-public-escape':['E-REG',[95,75,0],[95,88,0],'SE-P',[101,80,0],[106,80,0],[106,90,0],'SE'],
 'east-service-escape':['E-REG',[93,70,0],[94,64,0],'E-PRESS',[108,74,0],'SE-S',[106,80,0],[106,90,0],'SE']
})
for name,path in routes.items():routes[name]=[positions[x] if isinstance(x,str) else x for x in path]
# Named layout optical probes. These use prism intersection, not rendered or engine rays.
probes=[('INFO-W','W-LOOK','W-STAGE'),('INFO-E','E-LOOK','E-STAGE'),('POINT-LOW-W','POINT-E','W-LOOK'),('POINT-LOW-E','POINT-W','E-LOOK'),('GRAND-W','W-LEAD','W-TOP'),('GRAND-E','E-LEAD','E-TOP'),('W-FOLLOW','W-SUPPORT','W-TOP'),('E-FOLLOW','E-SUPPORT','E-TOP'),('N-POINT','N-ENTRY','POINT-N'),('S-POINT','S-ENTRY','POINT-S'),('W-POINT','W-STAGE','POINT-W'),('E-POINT','E-STAGE','POINT-E'),('CORE-SUPPORT','POINT-W','POINT-E'),('G-DIAGONAL','G-W','G-E'),('G-STRAIGHT','G-WC','G-EC'),('SPAWN-W','POINT-E','SW'),('SPAWN-E','POINT-W','SE')]
def ray(a,b,obs):
 line=LineString([a[:2],b[:2]]);length=line.length;hits=[]
 if length<.001:return hits
 for o in obs:
  if o['kind']=='glazing':continue
  inter=line.intersection(o['_g'])
  if inter.is_empty:continue
  geoms=[inter] if inter.geom_type in ['Point','LineString'] else list(inter.geoms)
  for g in geoms:
   coords=list(g.coords) if hasattr(g,'coords') else []
   if not coords:continue
   ts=[line.project(Point(p))/length for p in coords];lo=max(min(ts),.0001);hi=min(max(ts),.9999)
   if lo>hi:continue
   za=a[2]+(b[2]-a[2])*lo;zb=a[2]+(b[2]-a[2])*hi
   if max(za,zb)>o['z0']+.001 and min(za,zb)<o['z1']-.001:
    hits.append((lo,o['id']));break
 return [id for t,id in sorted(hits)]
rayresults=[]
for id,aa,bb in probes:
 for stance,eye in [('stand',1.86),('crouch',1.0695)]:
  a=positions[aa].copy();b=positions[bb].copy();a[2]+=eye;b[2]+=eye
  hits=ray(a,b,objects)
  rayresults.append(dict(id=id,observer=aa,target=bb,posture=stance,eyes=[a,b],predicted_visible=not hits,occluders=hits[:8]))
# Bounded variants use identical dimensions except the two returns and two observation cheeks.
variantresults=[]
for name in ['V0-straight-open','V1-offset-opaque','V2-offset-bounded']:
 variant=[o for o in objects if not(name=='V0-straight-open' and o['id'] in ['G-BW','G-BE'])]
 if name=='V0-straight-open':variant=[o for o in variant if o.get('assembly') not in ['OW','OE']]+[dict(id='V0-guard-W',_g=rect(40,47.8,48,48.2),z0=3.6,z1=4.7,kind='guard'),dict(id='V0-guard-E',_g=rect(78,55.8,84,56.2),z0=3.6,z1=4.7,kind='guard')]
 if name=='V1-offset-opaque':variant=variant+[dict(id='V1-closed-W',_g=rect(40,47.8,44,48.2),z0=4.7,z1=6.4,kind='wall'),dict(id='V1-closed-E',_g=rect(80,55.8,84,56.2),z0=4.7,z1=6.4,kind='wall')]
 results=[]
 for aa,bb in [('G-WC','G-EC'),('G-W','G-E'),('W-LOOK','W-STAGE'),('E-LOOK','E-STAGE'),('POINT-E','W-LOOK'),('POINT-W','E-LOOK')]:
  a=positions[aa].copy();b=positions[bb].copy();a[2]+=1.86;b[2]+=1.86;hits=ray(a,b,variant)
  results.append(dict(observer=aa,target=bb,visible=not hits,occluders=hits[:5]))
 variantresults.append(dict(id=name,probes=results))

# SVG plans: exact floor/wall boundaries, dimensions/grid, portals and positions.
COL={'floor':'#d9d6c8','wall':'#233e44','core':'#50686c','column':'#50686c','stair':'#ceb980','stair-guard':'#907849','guard':'#99758a','low-cover':'#be879b','roof':'#819b9c','glazing':'#a5d6dd'}
def start(w,h,title,sub):return [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',f'<rect width="{w}" height="{h}" fill="#f7f2e8"/>','<style>text{font-family:Arial,sans-serif;fill:#203c42}.t{font-size:28px;font-weight:bold}.s{font-size:16px}.l{font-size:13px;font-weight:bold}.n{font-size:11px}</style>',f'<text x="38" y="42" class="t">{escape(title)}</text>',f'<text x="38" y="72" class="s">{escape(sub)}</text>']
def drawplan(layer):
 out=start(1500,1430,f'LAST LIGHT / L02 · {layer.upper()}','Meters / Z-up / north +Y ↑ · exact proposal geometry · no compiled acceptance')
 scale=11.1;ox=80;oy=1260
 def xy(p):return(ox+p[0]*scale,oy-p[1]*scale)
 def shape(g,fill,stroke='',sw=1,opacity=1,dash=''):
  for p in polygons(g):
   parts=[]
   for ring in [p.exterior,*p.interiors]:parts.append('M'+' L'.join(f'{xy(q)[0]:.2f},{xy(q)[1]:.2f}' for q in ring.coords)+'Z')
   out.append(f'<path d="{" ".join(parts)}" fill="{fill}" fill-rule="evenodd" fill-opacity="{opacity}" stroke="{stroke}" stroke-width="{sw}" stroke-dasharray="{dash}"/>')
 def line(a,b,color,w=1,dash=''):
  ax,ay=xy(a);bx,by=xy(b);out.append(f'<line x1="{ax}" y1="{ay}" x2="{bx}" y2="{by}" stroke="{color}" stroke-width="{w}" stroke-dasharray="{dash}"/>')
 def textat(p,s,klass='n',color=None):
  x,y=xy(p);out.append(f'<text x="{x}" y="{y}" text-anchor="middle" class="{klass}"'+(f' style="fill:{color}"' if color else '')+f'>{escape(s)}</text>')
 for v in range(0,121,10):line([v,0],[v,106],'#dddcd1');textat([v,-2],str(v))
 for v in range(0,107,10):line([0,v],[120,v],'#dddcd1');textat([-3,v],str(v))
 shape(ground,'#e8e3d7','#c1c5ba',1)
 if layer=='ground':shape(upper,'none','#b49aa5',1,1,'6 5')
 if layer=='upper':shape(upper,'#ddb7c1','#9c7389',1.5)
 if layer=='roof':
  for o in objects:
   if o['kind'] in ['roof','glazing']:
    shape(o['_g'],COL[o['kind']],'#536c72',1.5,.75);c=o['_g'].representative_point();textat([c.x,c.y],f'{o["id"]} +{o["z0"]:g}','l')
  for seam in roof_seams:
   line(seam['a'],seam['b'],'#ac6040',3)
 else:
  for o in objects:
   show=(o['kind'] not in ['floor','roof','glazing'] and ((layer=='ground' and o['z0']<3.25) or (layer=='upper' and o['z1']>3.6 and o['z0']<7.8)))
   if show:shape(o['_g'],COL[o['kind']],COL[o['kind']],.5,.35 if layer=='upper' and o['z1']<=3.6 else 1)
  for a in regions:
   if a['z']!=(0 if layer=='ground' else 3.6) or a['id'].endswith('X'):continue
   c=a['_g'].representative_point()
   overrides={'U9':([27,82],'U9 / landing'),'K0':([66.5,69],'K0 / prep'),'N1':([59,86],'N1 retired / cinema'),'W5':([38,85],'W5 / cinema'),'S1':([49,15],'S1 retired / stock'),'E5':([74,15],'E5 through-route retired')}
   pos,label=overrides.get(a['id'],([c.x,c.y],f'{a["id"]} · {a["name"]}'));textat(pos,label,'l')
  for s in stairs:
   line(s['start'],s['end'],'#203c42',2);mid=[s['start'][0],(s['start'][1]+s['end'][1])/2];textat([mid[0],mid[1]],s['id']+' ↑ 3.6','l')
  for p in ports:
   if (p['sill']>=3.6)!=(layer=='upper'):continue
   color='#326c9d' if p['kind']=='observation' else '#348867';line(p['a'],p['b'],color,4)
   mid=[(p['a'][0]+p['b'][0])/2,(p['a'][1]+p['b'][1])/2];textat([mid[0],mid[1]+.8],p['id']+f' {p["width"]:g}m','n',color)
  for id,anchor in [('SW-VR',[26,22]),('SE-VR',[105.5,73.5])]:
   if layer=='ground':textat(anchor,id,'l','#ba522e')
  for id,p in positions.items():
   if (p[2]>0)!=(layer=='upper') or 'MID' in id:continue
   x,y=xy(p);out.append(f'<circle cx="{x}" cy="{y}" r="3.4" fill="#c06442"/>');textat([p[0],p[1]-.9],id,'n','#9a4f31')
  if layer=='upper':
   x,y=xy([63,51]);out.append(f'<circle cx="{x}" cy="{y}" r="{7*scale}" fill="#60abc2" fill-opacity=".08" stroke="#357f98" stroke-width="2" stroke-dasharray="8 5"/>');textat([63,45],'CONTROL +3.6','l')
  for o in objects:
   if o['kind'] in ['core','low-cover'] and ((layer=='upper')==(o['z0']>=3.6)):
    c=o['_g'].representative_point();textat([c.x,c.y],f'{o["id"]} top {o["z1"]:g}','n','#fff')
 line([0,-6],[20,-6],'#203c42',3);textat([10,-8],'20 m','l')
 out += ['<text x="55" y="1370" class="s">Dark = physical walls / cores · green = movement opening · blue = observation only · pink = low refuge / upper slab</text>','<text x="55" y="1400" class="s">Full dimensions, IDs, roof boundaries and apertures: developed-l02.json. Stairs: 6 m wide × 18 m run; 24 × 0.15 m rise.</text>','</svg>']
 (R/f'layout-l02-{layer}.svg').write_text('\n'.join(out))
for layer in ['ground','upper','roof']:drawplan(layer)

# Actual axis-aligned coordinate sections, generated by intersection with the same objects.
sections=[
 ('SEC-G1','Underpass / food-court overlap','y',49,[26,98],['G-MID','W-STAGE','POINT-E']),
 ('SEC-POINT','Scoring floor / stalls and upper thresholds','y',51,[26,98],['POINT-E','POINT-W']),
 ('SEC-X1','West public stair and receiving territory','x',37,[28,84],['W-LEAD','W-MID','W-TOP']),
 ('SEC-X2','West service stair and full top landing','x',27,[48,86],['N-LOW','N-MID','N-TOP']),
 ('SEC-X3','East public stair and receiving territory','x',87,[20,78],['E-LEAD','E-MID','E-TOP']),
 ('SEC-X4','East service stair and full top landing','x',97,[16,56],['S-LOW','S-MID','S-TOP']),
 ('SEC-SW','West spawn / public departure / atrium','y',17,[2,48],['SW','SW-P']),
 ('SEC-SE','East spawn / public departure / department','y',88,[78,118],['SE','SE-P']),
 ('SEC-N','North gallery / service staging','y',78,[20,82],['N-STAGE','N-SUPPORT']),
 ('SEC-S','South service gallery and receiving','y',32,[46,106],['S-STAGE']),
 ('SEC-OW','West bounded lower-to-upper information','x',41,[32,76],['W-LOOK','W-STAGE']),
 ('SEC-OE','East bounded lower-to-upper information','x',83,[32,78],['E-LOOK','E-STAGE']),
 ('SEC-SWS','West service departure / stock return','x',12,[8,58],['SW','SW-S']),
 ('SEC-SES','East service departure / delivery return','x',108,[44,98],['SE-S']),
 ('SEC-WAPP','West department threshold / atrium approach','x',35,[10,60],['W-FOLLOW']),
 ('SEC-EAPP','East department threshold / atrium approach','x',91,[58,98],['E-FOLLOW']),
 ('SEC-WR','L02 west public vestibule return','x',26,[8,42],['W-REG']),
 ('SEC-ER','L02 east service vestibule return','y',74,[88,116],['E-REG']),
 ('SEC-ROOF-W','L02 west low/high roof closure','x',35,[10,50],['W-FOLLOW']),
 ('SEC-ROOF-E','L02 east low/high roof closure','x',91,[68,98],['E-FOLLOW'])]
def slices(g,axis,value,ran):
 line=LineString([(value,ran[0]),(value,ran[1])]) if axis=='x' else LineString([(ran[0],value),(ran[1],value)])
 inter=g.intersection(line)
 if inter.is_empty:return []
 parts=[inter] if inter.geom_type=='LineString' else ([p for p in inter.geoms if p.geom_type=='LineString'] if hasattr(inter,'geoms') else [])
 idx=1 if axis=='x' else 0
 return [(min(p.coords[0][idx],p.coords[-1][idx]),max(p.coords[0][idx],p.coords[-1][idx])) for p in parts]
for page in range(5):
 out=start(1640,1520,f'LAST LIGHT / L02 · COORDINATE SECTIONS {page+1}/5','Actual intersections with L02 footprints. Horizontal and vertical scales differ; dimensions and elevations govern.')
 for n,(id,title,axis,value,ran,people) in enumerate(sections[page*4:page*4+4]):
  top=110+n*345;base=top+260;xs=1450/(ran[1]-ran[0]);zs=18
  tx=lambda u:100+(u-ran[0])*xs;tz=lambda z:base-z*zs
  out.append(f'<text x="38" y="{top}" class="s" font-weight="bold">{id} · {escape(title)} · {axis.upper()}={value} m, {"Y" if axis=="x" else "X"} {ran[0]}…{ran[1]} m</text>')
  for z in [0,3.25,3.6,4.7,7.8,10.8]:
   out.append(f'<line x1="90" y1="{tz(z)}" x2="1550" y2="{tz(z)}" stroke="#d5d7ce"/><text x="80" y="{tz(z)+4}" text-anchor="end" class="n">{z:g}</text>')
  for o in objects:
   for lo,hi in slices(o['_g'],axis,value,ran):
    out.append(f'<rect x="{tx(lo)}" y="{tz(o["z1"])}" width="{max(.3,(hi-lo)*xs)}" height="{(o["z1"]-o["z0"])*zs}" fill="{COL[o["kind"]]}" fill-opacity=".85"/>')
    if o['kind'] in ['core','roof'] and hi-lo>3:out.append(f'<text x="{tx((lo+hi)/2)}" y="{tz(o["z1"])-4}" text-anchor="middle" class="n">{o["id"]}</text>')
  for who in people:
   p=positions[who];perp=p[0] if axis=='x' else p[1]
   if abs(perp-value)>.1:continue
   u=p[1] if axis=='x' else p[0];x=tx(u)
   out.append(f'<rect x="{x-.4*xs}" y="{tz(p[2]+2)}" width="{.8*xs}" height="{2*zs}" fill="#d77c45" fill-opacity=".65"/><circle cx="{x}" cy="{tz(p[2]+1.86)}" r="3" fill="#772f21"/><text x="{x}" y="{tz(p[2]+2)-6}" text-anchor="middle" class="n">{who}</text>')
  for v in range(math.ceil(ran[0]/5)*5,ran[1]+1,5):out.append(f'<text x="{tx(v)}" y="{base+18}" text-anchor="middle" class="n">{v}</text>')
  out.append(f'<text x="100" y="{base+44}" class="n">Orange = standing body radius .40 / height 2.0; dot = eye +1.86. Crouch height 1.15 / eye +1.0695. Floors 0 and +3.6.</text>')
 out.append('</svg>');(R/f'sections-l02-{page+1}.svg').write_text('\n'.join(out))

# Compact variant drawing; same lower volume and observation interfaces at each alternative.
out=start(1620,870,'LAST LIGHT / L02 · UNDERPASS / INFORMATION COMPARISON','Bounded local variants. V2 selected for independent review; neither this diagram nor named rays establishes gameplay balance.')
for n,variant in enumerate(variantresults):
 ox=35+n*535;oy=430;sc=10
 def pathrect(x1,y1,x2,y2,fill,stroke='#50666a'):
  out.append(f'<rect x="{ox+(x1-38)*sc}" y="{oy-(y2-40)*sc}" width="{(x2-x1)*sc}" height="{(y2-y1)*sc}" fill="{fill}" stroke="{stroke}"/>')
 out.append(f'<text x="{ox}" y="120" class="s" font-weight="bold">{variant["id"]}</text>')
 pathrect(42,44,80,54,'#ded9ca');pathrect(42,43.6,80,44,'#203c42');pathrect(42,54,80,54.4,'#203c42')
 if n>0:pathrect(45.6,44,46.4,50,'#50666a');pathrect(73.6,48,74.4,54,'#50666a')
 out.append(f'<text x="{ox+220}" y="{oy-65}" text-anchor="middle" class="l">10 m transfer / +3.25 soffit</text>')
 for j,p in enumerate(variant['probes']):out.append(f'<text x="{ox}" y="{490+j*31}" class="n">{p["observer"]} → {p["target"]}: {"named eye ray open" if p["visible"] else "blocked: "+p["occluders"][0]}</text>')
 caption=['Straight lower cross-view; full low edges; maximum cross-support.','Offset returns; sealed observation fronts; reduced useful information.','Offset returns + 4 m observation apertures; stand-only named relationship.'][n]
 out.append(f'<text x="{ox}" y="740" class="n">{escape(caption)}</text>')
out.append('<text x="35" y="805" class="s">O-W: y48 / x40–44; O-E: y56 / x80–84. Both sill +4.7, head +6.4; no movement portal.</text><text x="35" y="836" class="s">Named rays use analytic proposal prisms. Later check offsets, bodies, opposing views and apertures against compiled geometry.</text></svg>')
(R/'variants-l02.svg').write_text('\n'.join(out))

def clean(v):
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items() if not k.startswith('_')}
 if isinstance(v,list):return [clean(x) for x in v]
 return v
packet=dict(revision='L02',selected='B / Twin Atrium Exchange',units='meters',axes='right-handed Z-up',phase='developed layout; no production AML',body=dict(radius=.4,height=2,crouchHeight=1.15,step=.3,maxSlope=42,standingEye=1.86,crouchEye=1.0695,verticalFov=75,aspect=4/3,walkSpeed=3.4,crouchSpeed=1.7,gameRunHypothesis=5.5),objective=dict(center=[63,51,3.6],radius=7,band=[3.6,6.1],anchor=[65,49,3.6],lowerScores=False),regions=regions,objects=objects,portals=ports,stairs=stairs,positions=positions,regroup_footprints=[dict(id='RG-W',bounds=[26,12,38,18],z=0),dict(id='RG-E',bounds=[93,78,97,94],z=0),dict(id='UG-W',bounds=[34.6,58,45.4,66],z=3.6),dict(id='UG-E',bounds=[79,36,91,44],z=3.6),dict(id='UG-N',bounds=[36,74,48,79],z=3.6),dict(id='UG-S',bounds=[61,32,76,37],z=3.6)],roof_seams=roof_seams,superseded_s01_features={'U7':'merged into U1 receiving territory','U8':'merged into U4 receiving territory','C1':'replaced by C-IS and thick north food-stall/service band','C2/C3':'replaced by LC-W/LC-E counter assemblies'},retired_through_routes=['N1 ground north transfer','S1 ground shutter promenade','E5 ground south quiet court through-link'],walk_routes=routes,section_inventory=[dict(id=s[0],title=s[1],axis=s[2],coordinate=s[3],range=s[4],positions=s[5]) for s in sections],predicted_rays=rayresults,variants=variantresults)
(R/'developed-l02.json').write_text(json.dumps(clean(packet),indent=2)+'\n')
print('L02 generated:',len(objects),'physical pieces,',len(ports),'openings,',len(sections),'coordinate sections.')
print(json.dumps(variantresults,indent=2))
