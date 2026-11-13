"""Developed L04 planning geometry. Drawings only; never mutates canonical AML.

All XY points and elevations are metres in the domain frame. These reservations
are the authoring handoff, not compiled collision or tactical acceptance.
"""
from pathlib import Path
from math import sin, cos, pi, hypot
from html import escape
import xml.etree.ElementTree as E
P=Path(__file__).parent
BG='#f7f3e9'; INK='#243f4b'; LOW='#a28aba'; ZERO='#e5bb62'; UP='#78a8c0'; HIGH='#98af73'; VOID='#fffaf1'; PIT='#bec8cb'
def rect(x,y,w,h):return [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]
def polar(r,a):return (r*cos(a*pi/180),4+r*sin(a*pi/180))
def arc(r,a,b,n=72):return [polar(r,a+(b-a)*i/n) for i in range(n+1)]
def band(r1,r2,a,b):return arc(r2,a,b)+arc(r1,b,a)
def strip(a,b,w):
 dx=b[0]-a[0];dy=b[1]-a[1];l=hypot(dx,dy);nx=-dy/l*w/2;ny=dx/l*w/2
 return [(a[0]+nx,a[1]+ny),(b[0]+nx,b[1]+ny),(b[0]-nx,b[1]-ny),(a[0]-nx,a[1]-ny)]
def room(a,r0,r1,t0,t1):
 r=(cos(a*pi/180),sin(a*pi/180));t=(-r[1],r[0]);return [(r[0]*rr+t[0]*tt,4+r[1]*rr+t[1]*tt) for rr,tt in [(r0,t0),(r1,t0),(r1,t1),(r0,t1)]]
# Floors are separately named so boolean holes and boundaries remain inspectable.
floors=[]
def floor(id,z,poly,holes=()):floors.append(dict(id=id,z=z,poly=poly,holes=list(holes)))
freight_hatch=[(-32,-8),(-28.5,-8),(-28.5,-5),(-26.6,-5),(-26.6,3),(-29.4,3),(-29.4,0),(-32,0)]
central_hatch=band(4.1,6.2,225,310)
a_void=rect(-32,11,5,6)
a_holes=[a_void,rect(-37.6,1.5,3.2,6.5),rect(-25.6,5,3.6,8),rect(-30.6,20,3.2,4),rect(-33,23.6,8,.4)]
b_void=rect(28,9,12,14)
b_west_slot=rect(23.1,7,2.8,8)
b_rear_slot=rect(37.1,20,2.8,8)
floor('freight-well-lower',-3.2,rect(-33,-13,10,16))
floor('vessel-lower-arc',-3.2,band(4.1,7.3,210,350))
floor('lower-w-port-fan',-3.2,band(4.1,7.3,198,222))
floor('lower-e-port-fan',-3.2,band(4.1,7.3,338,362))
floor('central-lower-landing',-3.2,band(4.1,7.3,305,330))
for id,a,r in [('lower-west-bridge',210,27.7),('lower-east-bridge',350,24.3)]:floor(id,-2.8,strip(polar(9.8,a),polar(r,a),2.6))
floor('b-lower-service-room',-3.2,rect(22,-2,7,7))
floor('b-lower-service-neck',-3.2,rect(26,5,3,7))
floor('b-west-workroom',-3.2,rect(23,11,7,7))
floor('b-installation-basin',-3.2,rect(28,9,12,14))
floor('b-trench-bottom-landing',-3.2,rect(34,7,7,3))
floor('b-rear-bottom-landing',-3.2,rect(37,17.5,3,2.5))
floor('bus-trench',-1.2,rect(34,-12,7,14))
floor('west-ground',0,rect(-43,-31,21,61),[freight_hatch])
floor('receiving',0,rect(-24,-38,42,18))
floor('staging-apron',0,rect(-22,-20,44,6))
floor('vessel-equator',0,band(4.1,8.8,0,360),[central_hatch])
floor('central-upper-landing',0,band(4.1,6.2,205,225))
floor('west-equatorial-port',0,rect(-25,1.5,17,5))
floor('east-equatorial-port',0,rect(8,2,19,5))
floor('south-equatorial-bridge',0,rect(-2,-20,4,15.6))
floor('cooling-ground',0,rect(18,-30,25,15),[rect(34,-17,7,2)])
floor('bus-ground',0,rect(22,-15,21,22),[rect(34,-15,7,22)])
floor('b-ground-rim',0,rect(22,7,21,18),[b_void,b_west_slot,b_rear_slot,rect(34,7,7,2)])
floor('b-plant-shelf',0,rect(32,14,8,8),[b_rear_slot])
floor('b-ground-crossing',0,rect(26,18,7,3))
floor('rear-services',0,rect(-22,27,44,7))
floor('control-ground',0,rect(22,25,21,9),[b_rear_slot])
floor('freight-ground-landing',0,rect(-30,3,4,3))
floor('a-freight-mezzanine',3.2,rect(-40,1.5,18,22.5),a_holes)
floor('a-crown-lower-landing',3.2,rect(-36,23.5,3,3))
floor('cask-gallery-turn',3.2,rect(-26,-6,4,3))
floor('cask-gallery',3.2,rect(-25,-3,3,8))
floor('east-crown-mid-landing',3.2,rect(24.5,19,4.5,3))
floor('east-work-gallery',3.2,[(23,16.5),(25.1,16.5),(25.1,19),(29,19),(29,22),(23,22)])
floor('assembly-crown',6.4,band(18.6,21.4,20,160))
for id,a in [('crown-west-workroom',125),('crown-east-workroom',55)]:floor(id,6.4,room(a,17.8,23.2,-3,3))
floor('crown-west-transfer',6.4,strip(polar(20,160),(-25,11),2.8))
floor('crown-east-transfer',6.4,strip(polar(20,20),(24.8,10.8),2.8))
floor('crown-west-service-walk',6.4,rect(-26.4,9.4,2.8,15.6))
floor('crown-west-top-landing',6.4,rect(-26.5,23.5,3,3))
floor('crown-east-top-landing',6.4,[(23.5,8.2),(27.9,8.2),(27.9,11),(25.1,11),(25.1,12.4),(23.5,12.4)])
# Straight flights: each tuple gives lower/upper physical endpoints, not arrows alone.
stairs=[
 ('freight-lower-stair',(-28,-5,-3.2),(-28,3,0),2.8,'filled'),
 ('a-south-stair',(-36,0,0),(-36,8,3.2),2.8,'filled'),
 ('a-east-stair',(-24.1,5,0),(-24.1,13,3.2),2.8,'filled'),
 ('a-rear-stair',(-29,28,0),(-29,20,3.2),2.8,'filled'),
 ('cask-gallery-stair',(-24,-14,0),(-24,-6,3.2),2.8,'filled'),
 ('b-west-stair',(24.5,15,-3.2),(24.5,7,0),2.8,'filled'),
 ('b-trench-descent',(37.5,7,-3.2),(37.5,2,-1.2),7,'filled'),
 ('b-rear-stair',(38.5,20,-3.2),(38.5,28,0),2.8,'filled'),
 ('crown-west-stair',(-33,25,3.2),(-26.5,25,6.4),2.8,'sloped'),
 ('crown-east-upper-stair',(26.5,19,3.2),(26.5,11,6.4),2.8,'sloped'),
 ('crown-east-lower-stair',(26.5,30,0),(26.5,22,3.2),2.8,'filled'),
]
ramps=[('bus-south-ramp',(37.5,-17,0),(37.5,-12,-1.2),7)]
for id,a in [('lower-w-vessel-ramp',210),('lower-e-vessel-ramp',350)]:ramps.append((id,(*polar(7.1,a),-3.2),(*polar(9.8,a),-2.8),2.6))
w=polar(27.7,210);e=polar(24.3,350)
ramps += [('lower-w-room-ramp',(*w,-2.8),(*polar(29.7,210),-3.2),2.6),('lower-e-room-ramp',(*e,-2.8),(*polar(26.3,350),-3.2),2.6)]
# Upper landings are exact rectangles clear of the freight opening.
landings=[('a-south-landing',3.2,rect(-37.5,8,3,3)),('a-east-landing',3.2,rect(-25.5,13,3.5,3)),('a-rear-landing',3.2,rect(-30.5,17,3,3)),('b-west-landing',-3.2,rect(23,15,4.5,3))]
# Spatially consequential screens: id, base Z, height, XY footprint.
screens=[
 ('a-south-arrival-screen',3.2,2.2,rect(-38,10.8,3.2,.2)),
 ('a-east-arrival-screen',3.2,2.4,rect(-26.8,13,.2,3.5)),
 ('a-rear-arrival-screen',3.2,2.4,rect(-30.5,17.3,3,.2)),
 ('a-freight-guide-mast',0,6,rect(-32.5,13,1,2)),
 ('a-cask-tooling',3.2,2.6,rect(-35.5,15,3.5,5)),
 ('b-west-arrival-screen',-3.2,2.4,rect(29,12,.25,3)),
 ('b-south-arrival-screen',-3.2,2.4,rect(34.5,12.5,4,.25)),
 ('b-rear-arrival-screen',-3.2,2.6,rect(36.8,18,.25,4)),
 ('b-plant-partition',-3.2,2.9,rect(32,15,1,4)),
 ('b-rim-crossing-screen',0,2.2,rect(29.5,20.7,2.8,.2)),
 ('crown-west-blind-screen',6.4,2.3,rect(-26.6,9.4,.2,8.6)),
 ('crown-west-room-tooling',6.4,2.3,room(125,20.4,23.2,-1.1,1.1)),
 ('crown-east-room-tooling',6.4,2.3,room(55,17.8,20.6,-1.1,1.1)),
 ('receiving-cradle',0,2.25,rect(-16,-30,8,4)),
 ('cleanlock-cask',0,2.8,rect(-37,-28,6,6)),
 ('cask-transfer',0,2.3,rect(-38,-6,5,4)),
 ('under-a-support-cell',0,2.9,rect(-35.5,15,3.5,5)),
 ('bus-transformer',0,3.1,rect(28,-12,6,10)),
 ('rear-switchboard',0,3.2,rect(6,28,3,4)),
 ('rear-west-baffle',0,2.4,rect(-14,30,4,3)),
 ('freight-shield-return',0,5.8,rect(-43,-14.2,13,.4)),
]
low_cover=[('a-low-service-table',3.2,1.05,rect(-39,12,2,3)),('b-loading-workbench',-3.2,1.05,rect(29.5,9.8,2,1.8)),('cask-low-fixture',0,1.05,rect(-41,-10,2,3)),('b-shelf-low-cabinet',0,1.05,rect(37,15,2,2))]
# Non-overlapping roof reservations; holes mean another roof volume owns that patch.
roofs=[('hall-roof',16,rect(-22,-20,44,47),[]),('west-freight-roof',10.4,rect(-43,-14,21,44),[]),('cleanlock-roof',7.2,rect(-43,-31,21,17),[]),('receiving-roof',4.8,rect(-24,-38,42,18),[]),('cooling-roof',4.8,rect(18,-30,25,15),[]),('bus-roof',4.8,rect(22,-15,21,22),[]),('power-roof',7.2,rect(22,7,21,18),[rect(22,8,8,17)]),('east-tower-roof',10.4,rect(22,8,8,24),[]),('rear-roof',4.8,rect(-22,27,44,7),[]),('control-roof',4.8,rect(22,25,21,9),[rect(22,25,8,7)])]

class SVG:
 def __init__(self,w,h,title,subtitle):
  self.w=w;self.h=h;self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="{INK}"/></marker></defs><style>text{{font-family:Arial,sans-serif;fill:{INK}}}.title{{font-size:28px;font-weight:bold}}.head{{font-size:20px;font-weight:bold}}.note{{font-size:15px}}.label{{font-size:12px;text-anchor:middle;paint-order:stroke;stroke:{BG};stroke-width:3px;stroke-linejoin:round}}.tiny{{font-size:11px}}</style><rect width="{w}" height="{h}" fill="{BG}"/>'];self.text(30,43,title,'title');self.text(30,71,subtitle,'note')
 def text(self,x,y,t,cls='note',anchor=None):self.s.append(f'<text x="{x:.2f}" y="{y:.2f}" class="{cls}"'+(f' text-anchor="{anchor}"' if anchor else '')+f'>{escape(t)}</text>')
 def box(self,x,y,w,h,fill,stroke=INK,dash=''):self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-dasharray="{dash}"/>')
 def panel(self,x,y,w,h,title,sub):self.box(x,y,w,h,'none','#b6c3c4');self.text(x+14,y+28,title,'head');self.text(x+14,y+51,sub);return Plan(self,x+w/2,y+304,6.6)
 def save(self,name):self.s.append('</svg>');(P/name).write_text(''.join(self.s))
class Plan:
 def __init__(self,s,x,y,k):self.s=s;self.x=x;self.y=y;self.k=k
 def p(self,p):return self.x+p[0]*self.k,self.y-p[1]*self.k
 def poly(self,ps,fill,stroke=INK,dash='',width=1.2):
  q=' '.join(f'{x:.2f},{y:.2f}' for x,y in map(self.p,ps));self.s.s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
 def line(self,ps,color=INK,width=1.8,dash='',arrow=False):
  q=' '.join(f'{x:.2f},{y:.2f}' for x,y in map(self.p,ps));self.s.s.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
 def label(self,x,y,t):self.s.text(*self.p((x,y)),t,'label')
 def marker(self,p,t,c):
  x,y=self.p(p);self.s.s.append(f'<circle cx="{x}" cy="{y}" r="13" fill="{c}"/><text x="{x}" y="{y+5}" text-anchor="middle" style="fill:white;font-size:15px;font-weight:bold">{t}</text>')
 def context(self):
  self.poly(rect(-22,-20,44,47),PIT,'#a4b4b9');self.poly(band(16.5,17.5,0,360),'#a3b1b8','#81949d');self.poly(band(9.2,9.7,0,200),'#778e9a');self.poly(band(3.25,3.75,0,200),'#778e9a');self.poly(band(0,2,0,360),'#aa8a66');
  for r in roofs:self.poly(r[2],'none','#bdc6c6','3 4',.7)
 def floor(self,f,color):
  self.poly(f['poly'],color)
  for h in f['holes']:self.poly(h,VOID,INK,'3 2')
 def flight(self,stair):
  id,a,b,w,*_=stair;self.poly(strip(a,b,w),'#eadfc7');self.line([a,b],arrow=True)
  dx=b[0]-a[0];dy=b[1]-a[1];l=hypot(dx,dy);nx=-dy/l*w/2;ny=dx/l*w/2
  for i in range(1,9):
   t=i/9;x=a[0]+dx*t;y=a[1]+dy*t;self.line([(x+nx,y+ny),(x-nx,y-ny)],'#978a6a',.65)
 def details(self,z):
  for id,zz,h,poly in screens+low_cover:
   if abs(zz-z)<.01 or (h>1.1 and zz<z<zz+h):self.poly(poly,'#3e5964' if h>1.1 else '#bc9860')
 def stairs_for(self,z):
  for st in stairs:
   if min(st[1][2],st[2][2])-.01 <= z <= max(st[1][2],st[2][2])+.01:self.flight(st)
  for r in ramps:
   if min(r[1][2],r[2][2])-.01<=z<=max(r[1][2],r[2][2])+.01:self.flight(r)
 def central(self):
  self.poly(band(4.2,6,225,305),'#eadfc7');self.line(arc(5.1,305,225),arrow=True)
  for i in range(1,20):self.line([polar(4.2,225+i*4),polar(6,225+i*4)],'#978a6a',.7)
 def guard(self,ps):self.line(ps,'#a2682e',2.1)
 def hall_walls(self,z):
  openings={-3.2:([(-10.35,-7.05)],[(-1.35,1.6)]),0:([(1.5,6.5)],[(2,7)]),3.2:([(0,4)],[]),6.4:([(9.4,12.5)],[(9.3,12.4)])}
  for x,spans in [(-22,openings[z][0]),(22,openings[z][1])]:
   at=-20
   for lo,hi in spans:
    self.line([(x,at),(x,lo)],INK,2.6);at=hi
   self.line([(x,at),(x,27)],INK,2.6)
  self.line([(-22,27),(22,27)],INK,2.6)
  if z==0:
   for x1,x2 in [(-22,-10),(-4,-2),(2,22)]:self.line([(x1,-20),(x2,-20)],INK,2.6)
  else:self.line([(-22,-20),(22,-20)],INK,2.6)
  if z==3.2:self.line([(-22,0),(-22,4)],'#6b9cb2',2.3,'3 2')

s=SVG(1800,1470,'FUSION / L04 developed floor plans','Authoring candidate for independent review · 5v5 / two objectives · metres / Z up / Y north ↑ · roofs are real but cut away here')
panels=[]
for x,y,z,title,sub in [(20,105,-3.2,'LOWER / −3.2 with bridges −2.8','Purple floors; vessel ramps and room transitions are explicit'),(910,105,0,'GROUND / 0 with local trench −1.2','Cream dashed areas are slab openings; ground routes persist'),(20,730,3.2,'UPPER / +3.2','A mezzanine, freight opening, distinct arrivals and service gallery'),(910,730,6.4,'CROWN / +6.4','Two inhabited work rooms; separate west/east transfer costs')]:
 p=s.panel(x,y,870,605,title,sub);panels.append(p);p.context()
 for f in floors:
  if (z==-3.2 and f['z']< -2) or f['z']==z or (z==0 and f['z']==-1.2):p.floor(f,LOW if f['z']<0 else {0:ZERO,3.2:UP,6.4:HIGH}[f['z']])
 for id,zz,poly in landings:
  if zz==z:p.poly(poly,'none','#4a7380','2 2')
 if z==0:p.floor(next(f for f in floors if f['id']=='bus-trench'),LOW)
 p.stairs_for(z);p.details(z);p.hall_walls(z)
 if z in [-3.2,0]:p.central()
 if z==0:
  p.marker((-14,-35),'T','#92713a');p.marker((0,31),'D','#4d6fa5');p.label(-14,-39,'five starts x−18..−10');p.label(0,35,'five starts x−4..4')
 if z==3.2:p.marker((-34,14),'A','#b4654f')
 if z==-3.2:p.marker((35,17),'B','#b4654f')
# Lower detailed labels/edges.
p=panels[0];p.label(-28,-14,'FW −3.2');p.label(-18,-9,'LW −2.8');p.label(17,-1,'LE −2.8');p.label(0,13,'unchanged vessel / coils');p.label(0,-6.5,'CS ↓ / outer bypass');p.label(29,1,'E room / ramp');p.label(23,20,'B-W turn');p.label(36,25,'B-R turn');p.label(37.5,3,'trench −1.2');p.label(35,12,'loading');p.label(34,20,'sheltered B');p.guard(arc(7.3,222,338));p.guard(arc(6.1,225,305));p.label(-27,5,'FW ↑ to 0');p.label(24,7,'B-W ↑0')
# Ground thresholds/guards; upper target spawn sightline intent.
p=panels[1];p.label(-29,-2,'freight hatch');p.label(-36,-16,'shield H5.8');p.label(-26,-12,'8m mouth');p.label(-24,9,'A-E ↑');p.label(-36,11,'A-S ↑');p.label(-29,23,'A-R ↑');p.label(27,27,'C-E ↑');p.label(35,17,'shelf / B below');p.label(28,10,'B-W ↓');p.label(40,23,'B-R ↓');p.label(37.5,-6,'−1.2 trench');p.label(45,1,'exposed');p.label(45,-1,'rim route');p.label(-13,-21,'lintel2.8');p.guard(arc(6.2,225,310));p.guard([(28,9),(28,18)]);p.guard([(28,21),(28,23),(37.1,23)]);p.guard([(32,14),(40,14)]);p.guard([(-22,-14),(-2,-14)]);p.guard([(2,-14),(22,-14)]);p.line([(-22,27),(22,27)],INK,3);p.label(0,24,'no ground north port')
# Upper objective/site contours and transfer endpoints.
p=panels[2];p.label(-29.5,14,'freight void');p.label(-36,9,'A-S landing');p.label(-23,16,'A-E landing');p.label(-29,20.8,'A-R landing');p.label(-34,27.5,'CW landing');p.label(-24,-8,'gallery ↑');p.label(29,19,'CE mid +3.2');p.label(30,26,'CE →0');p.label(-29,24,'crossing above A-R');p.guard([(-32,11),(-27,11),(-27,17),(-32,17),(-32,11)]);p.guard([(-40,1.5),(-40,24),(-36,24)]);p.guard([(-40,1.5),(-37.6,1.5)]);p.guard([(-34.4,1.5),(-25,1.5)]);p.guard([(29,16.5),(29,22)]);p.label(0,4,'No +3.2 internal torus route')
# Crown rooms/thresholds and work views.
p=panels[3];p.label(-12,23.5,'C-W room');p.label(12,23.5,'C-E room');p.label(-26.5,15,'service walk');p.label(-34,27.5,'↓ A3.2');p.label(29,17,'↓3.2');p.label(0,5,'coil tops +10');p.label(0,-7,'crown above shield, not above coils');p.line([polar(20,160),(-12,4)],'#9d6651',1.5,'4 3');p.line([polar(20,20),(13,4.5)],'#9d6651',1.5,'4 3');p.label(0,-18,'Dashed: support-view intentions, not proven rays')
s.text(35,1370,'Named IDs, floor polygons, holes, exact stair endpoints and screens live in draw-layout-l04.py and layout-l04-detail-notes.md.','note')
s.text(35,1396,'Ground and upper slabs .30m; lower bridges .25m; rails/parapets1.1m high / .12m thick unless a full screen is drawn.','note')
s.text(35,1422,'Dark blocks: structural/tooling screens. Tan blocks: provisional1.05m local refuges. Treads/arrows show rise; pink/purple is a separate lower level.','note')
s.text(35,1448,'This resolves spatial reservations. Native stair tread endpoints, body fit, sightlines, support, cover behavior and revised timings require independent returns.','note')
s.save('layout-l04.svg')

# Dedicated exact-scale sections use source-derived radial profile, plus conservative body envelopes.
s=SVG(1800,2040,'FUSION / L04 transfer sections and roof ownership','R from reactor axis unless noted · actual1.8m standing envelopes / .70m width · section reservations, not compiled movement acceptance')
source=E.parse(P/'../reviews/evidence/b04/source.aml').getroot()
shell=source.find('.//faceted-solid[@id="vessel-shell-01"]')
vertices=[[float(v) for v in row.split()] for row in shell.get('points').split(';')]
outer=[(hypot(x,y-4),z) for x,y,z in vertices[:49]]
inner=[(hypot(x,y-4),z) for x,y,z in vertices[49:98]]
class Section:
 def __init__(self,x,y,kx,kz):self.x=x;self.y=y;self.kx=kx;self.kz=kz
 def p(self,r,z):return self.x+r*self.kx,self.y-z*self.kz
 def poly(self,ps,fill,stroke=INK,dash=''):
  q=' '.join(f'{x:.2f},{y:.2f}' for x,y in [self.p(*p) for p in ps]);s.s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="1.3" stroke-dasharray="{dash}"/>')
 def box(self,r,z,w,h,fill):self.poly(rect(r,z,w,h),fill)
 def text(self,r,z,t):s.text(*self.p(r,z),t,'note')
 def body(self,r,z):self.box(r-.35,z,.7,1.8,'#47798a')
# R1 lower bridge, keep same reactor profile dimensions.
s.text(35,113,'R1 / EAST LOWER RADIAL PORT / 350° — vessel transition, PF coil, shield aperture and room transition','head')
a=Section(45,355,33,29);a.poly(outer,'none','#8a9b9f','5 4');a.poly(inner,'none','#8a9b9f','5 4');a.box(4.1,-3.45,3.2,.25,LOW);a.box(4.1,-.3,7.42,.3,ZERO);a.poly([(7.1,-3.2),(9.8,-2.8),(9.8,-3.05),(7.1,-3.45)],LOW);a.box(9.8,-3.05,14.5,.25,LOW);a.box(11.65,-3.8,.7,.55,'#aa805b');a.box(14,-8.2,.7,5.4,PIT);a.box(16.5,-8.2,1,5.15,PIT);a.box(16.5,-.4,1,3.2,PIT);a.box(22.34,-.4,.25,3.2,PIT);a.poly([(24.3,-2.8),(26.3,-3.2),(26.3,-3.45),(24.3,-3.05)],LOW);a.box(26.3,-3.45,2,.25,LOW);a.body(6.3,-3.2);a.body(12,-2.8);a.body(17,-2.8);a.body(26.8,-3.2)
a.text(3.2,7.5,'D envelope retained');a.text(8.9,-1.8,'bridge −2.8 / slab .25');a.text(11.4,-5,'PF top−3.25');a.text(14.8,4,'shield opening−3.05..−.4');a.text(23,-1,'room ramp →−3.2');a.text(5.3,-5,'1.8m body');s.text(1030,160,'Bridge underside−3.05 → PF top−3.25 =0.20m.','note');s.text(1030,188,'All three machine layers get distinct work openings.','note');s.text(1030,216,'Do not cut or scale installed magnet envelopes.','note');s.text(1030,244,'West bridge ends R27.7; east ends R24.3.','note');s.text(1030,272,'Room ramps drop0.4m over2m after crossing the hall wall.','note');s.text(1030,300,'The shown upper D outline is dimensional context:','note');s.text(1030,328,'these southern sectors retain their lower shells only.','note')
s.text(1030,356,'Retained deck0 covers R4.1..11.52 on this350° cut.','note')
s.text(1030,384,'It leaves2.9m over lower floor /2.5m over raised bridge.','note')
s.text(1030,412,'Ramp startsR7.1: full2.6m mouth underlaps circular floor.','note')
# S1 radial central stair with both levels' standing bodies.
s.text(35,652,'S1 / CENTRAL STAIR MID-FLIGHT AT265° — actual radial passing reservation','head')
a=Section(-280,855,100,52);a.box(4.1,-3.45,3.2,.25,LOW);a.box(4.2,-3.2,1.8,1.6,'#e1cc9e');a.box(6.2,-.3,2.6,.3,ZERO);a.box(6.2,-.8,2.6,.5,'#d9d0ba');a.box(6.0,-1.6,.12,1.1,'#b18b50');a.box(7.18,-3.2,.12,1.1,'#b18b50');a.box(6.2,0,.12,1.1,'#b18b50');a.body(6.7,-3.2);a.body(7.7,0);a.text(4.15,2,'hatch R4.1..6.2');a.text(6.9,2,'ground outer strip');a.text(4.15,-4.15,'filled stair R4.2..6.0');a.text(6.25,-4.15,'lower bypass');s.text(650,700,'Stair centreR5.1 / width1.8:225° at0 →305° at−3.2.','note');s.text(650,726,'20×.16 rises; centre going7.12m; inner going≈.293m/tread.','note');s.text(650,752,'Ground hatch225°..310°, R4.1..6.2; top landing205°..225°.','note');s.text(650,778,'Lower landing305°..330° leads toward the east exit.','note');s.text(650,804,'Lower body atR6.7 occupiesR6.35..7.05; outer guard begins7.18.','note');s.text(650,830,'Nominal clear width R6.2..7.18=.98m: single file, not a trade lane.','note');s.text(650,856,'Shallow beams underside−.8 leave2.4m above lower floor.','note');s.text(650,882,'Inspect turn, follower support, guard ends and the full capsule in compile.','note')
# S2 crown/rear stair crossing numeric conservative corner envelope.
s.text(35,1140,'S2 / WEST CROWN OVER A REAR STAIR — X/Z overlap envelope, Y23.6..26.4','head')
a=Section(65,1480,45,45);a.poly([(0,3.2),(6.5,6.4),(6.5,6.12),(0,2.92)],HIGH);a.box(2.6,1.48,2.8,.28,'#d4c19d');a.box(2.6,1.76,.7,1.8,'#47798a');a.text(0,7.0,'X−33/+3.2 → X−26.5/+6.4');a.text(0,.8,'A-R body: conservative overlap envelope');a.text(0,0,'X axis origin here = −33m; Z is world elevation');s.text(520,1190,'Crown stair2.8m wide, sloped underside .28. Do not fill this crossing.','note');s.text(520,1217,'Rear stair x−29, Y28/0 →Y20/+3.2; its upper landing is Y17..20.','note');s.text(520,1244,'Overlap: x[−30.4,−27.6], y[23.6,26.4]. Guide-based minimum gap2.44m.','note');s.text(520,1271,'Allow one .16m riser of native tread conservatism →2.28m for1.8m body.','note');s.text(520,1298,'Lower landing x[−36,−33],y[23.5,26.5] joins A without walking under the flight.','note');s.text(520,1325,'Roof: west freight10.4 / hall16 / east transfer tower10.4 / other mezzanine rooms7.2.','note');s.text(520,1352,'Roof-step walls close every differing volume. Receiving doors get2.8m lintels; high-target spawn rays remain required.','note')
# B paired transverse sections distinguish loading from the planted room.
s.text(35,1552,'B1 / TRANSVERSE CUT AT Y12 — OPEN LOADING VOID', 'head')
s.text(925,1552,'B2 / TRANSVERSE CUT AT Y17 — SHELTERED PLANT', 'head')
for ox,yy in [(35,12),(925,17)]:
 a=Section(ox-22*34,1845,34,24)
 a.box(22,10.16,8,.24,'#b9c4c7');a.box(30,6.96,13,.24,'#b9c4c7');a.box(29.8,7.2,.2,3.2,PIT)
 a.box(23,-3.45,17,.25,LOW);a.box(22.8,-3.2,.2,3.2,PIT);a.box(40,-3.2,.2,3.2,PIT)
 if yy==12:
  a.box(22,-.3,1.1,.3,ZERO);a.box(25.9,-.3,2.1,.3,ZERO);a.box(40,-.3,3,.3,ZERO)
  a.box(24.15,-2,.7,1.8,'#47798a');a.box(22,6.1,3.1,.3,HIGH);a.box(25.1,5.72,2.8,.28,HIGH);a.body(26.5,6);a.body(35,-3.2);a.text(28,4.8,'open through ground0');a.text(32,-5,'loading floor−3.2')
 else:
  a.box(22,-.3,6,.3,ZERO);a.box(23,2.9,2.1,.3,UP);a.box(25.1,3.72,2.8,.28,HIGH);a.body(26.5,4);a.box(32,-.3,11,.3,ZERO);a.box(32,-3.2,1,2.9,'#3e5964');a.body(35,-3.2);a.body(36,0)
  a.text(28,4.8,'void');a.text(32,4.8,'shelf0 roofs plant');a.text(34,-5,'B plant(35,17,−3.2)')
 a.text(22,11.6,'tower roof10.4');a.text(33,8.3,'power roof7.2');a.text(23,-6,'X22 →43m; Z labels are world elevations')
s.text(35,2010,'Ground crossing x[26,33],y[18,21] is north of both cuts: it traverses the void above lower play, with a bounded edge view.', 'note')
s.save('layout-l04-sections.svg')
print('Wrote layout-l04.svg and layout-l04-sections.svg; canonical geometry untouched.')
