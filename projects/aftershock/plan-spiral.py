from pathlib import Path
from math import sin,cos,radians
import json
from shapely.geometry import Polygon,box,LineString
from shapely.ops import unary_union
P=Path(__file__).parent

def sector(cx,cy,ri,ro,a,b,n=42):
 angles=[radians(a+(b-a)*i/n) for i in range(n+1)]
 return Polygon([(cx+ro*cos(t),cy+ro*sin(t)) for t in angles]+[(cx+ri*cos(t),cy+ri*sin(t)) for t in reversed(angles)])
def corridor(points,width):return LineString(points).buffer(width/2,cap_style=2,join_style=2)
lower=unary_union([sector(44,46,23,35,180,310),box(2,40,22,54),corridor([(20,48),(30,48),(36,44),(48,44),(55,48),(66,48)],8),Polygon([(52,30),(68,28),(80,36),(80,54),(72,60),(56,56),(50,44)]),box(58,20,70,36),box(78,42,92,64),box(82,60,86,74),box(18,50,22,68),box(32,41,38,49)])
upper=unary_union([sector(50,64,25,39,24,170),box(16,68,24,76),box(12,74,24,84),box(26,74,34,82),box(78,74,90,88),box(88,76,102,90),corridor([(30,78),(33,82),(40,86),(42,89)],4.5)])
# Two distinct west ascents, and one eastern defender descent. The internal ascent has a landing turn.
stairs=[dict(id='S1-outer',points=[[20,52,0],[20,68,5]],width=4),dict(id='S2-fan',points=[[36,44,0],[29,53,2]],width=4),dict(id='S3-drum',points=[[29,56,2],[29,74,5]],width=4),dict(id='S4-east',points=[[84,74,5],[84,60,0]],width=4)]
fan_pad=box(26,51,32,57).intersection(Polygon([[-100,-100],[100,-100],[100,200],[-100,200]]))
# The diagonal receiving edge starts exactly at the top of the angled S2 flight.
fan_pad=box(26,51,32,57).intersection(Polygon([[-100,53+(7/9)*(-100-29)],[100,53+(7/9)*(100-29)],[100,200],[-100,200]]))
stair_length=(7**2+9**2)**.5
fan_pad=Polygon([[29-18/stair_length,53-14/stair_length],[29+18/stair_length,53+14/stair_length],[32,57],[26,57]])
landings=[dict(id='fan-landing',points=[list(v) for v in list(fan_pad.exterior.coords)[:-1]],z=2),dict(id='outer-landing',points=[[16,68],[24,68],[24,76],[16,76]],z=5),dict(id='drum-landing',points=[[26,74],[34,74],[34,82],[26,82]],z=5)]
obstacles=[dict(id='T-gate',rect=[16,41,2,8],z=0,h=7),dict(id='Cable-screen',rect=[41,40,3,4],z=0,h=4),dict(id='B-switch-wall',rect=[82,52,3,6],z=0,h=8),dict(id='CT-gate',rect=[88,82,2,8],z=5,h=4),dict(id='A-signal',rect=[64,86,3,8],z=5,h=3.3),dict(id='A-ticket-wall',rect=[23,80,5,2],z=5,h=3.4),dict(id='A-derail',rect=[32,91,13,3.5],z=5,h=3.2),dict(id='B-collision-01',rect=[56,34,3.5,13],z=0,h=3.4),dict(id='B-collision-02',rect=[66,46,12,3.5],z=0,h=3.4),dict(id='A-low',rect=[53,90,3,2],z=5,h=1.15),dict(id='B-low',rect=[66,33,3,2],z=0,h=1.15),dict(id='Cable-low',rect=[37,40,2.5,2],z=0,h=1.15)]
# Quantize the profile once, then retain it identically in layout and AML production.
def poly(p):
 return dict(outer=[[round(x,3),round(y,3)] for x,y in list(p.exterior.coords)[:-1]],holes=[[[round(x,3),round(y,3)] for x,y in list(r.coords)[:-1]] for r in p.interiors])
lower_boundary=lower
for st in stairs:
 lower=lower.difference(corridor([p[:2] for p in st['points']],st['width']))
assert lower.geom_type=='Polygon' and upper.geom_type=='Polygon'
data=dict(revision='L03',lower=poly(lower),lowerBoundary=poly(lower_boundary),upper=poly(upper),stairs=stairs,landings=landings,obstacles=obstacles,screens=[dict(id='east-arc-inner-screen',center=[50,64],radius=25,angles=[24,70],z=5,height=3.3)],roofs=[dict(id='T-roof',rect=[2,40,20,14],soffit=3.2),dict(id='CT-roof',rect=[90,76,12,14],soffit=8.2),dict(id='east-fan-canopy',rect=[80,42,12,16],soffit=4.2)],drum=dict(center=[50,66],radius=13.5,height=14),sites=[dict(id='A',rect=[45,92,6,6],z=5),dict(id='B',rect=[63,38,7,6],z=0)],spawns=dict(T=[[8,45,0],[10,45,0],[12,45,0],[8,48,0],[11,48,0]],CT=[[93,79,5],[96,79,5],[99,79,5],[94,83,5],[98,83,5]]))
(P/'layout-data.json').write_text(json.dumps(data,indent=2)+'\n')
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1120" viewBox="0 0 1800 1120"><rect width="1800" height="1120" fill="#10212b"/><style>text{font-family:Arial,sans-serif;fill:#e5eee9}.tag{font-size:14px;font-weight:700;paint-order:stroke;stroke:#20333b;stroke-width:3}.note{font-size:17px;fill:#bfcecd}</style><text x="40" y="45" font-size="30" font-weight="700">AFTERSHOCK / BROKEN SPIRAL / DEVELOPED LAYOUT L03</text><text x="40" y="78" class="note">5v5 CT/T defusal · meters / north ↑ / Z-up · common XY origin · nested lower site / outer upper site</text>']
def panel(ox,title,geom,other,z):
 scale=6.2; base=800
 def pts(values):return ' '.join(f'{ox+x*scale:.2f},{base-y*scale:.2f}' for x,y in values)
 def polygon(values,fill,stroke='#a6b6b4',sw=1):return f'<polygon points="{pts(values)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
 def label(x,y,t):s.append(f'<text x="{ox+x*scale:.1f}" y="{base-y*scale:.1f}" class="tag">{t}</text>')
 s.append(f'<text x="{ox}" y="120" font-size="23" font-weight="700">{title}</text>')
 s.append(polygon(data[other]['outer'],'#1c313b','#41555e'))
 s.append(polygon(data[geom]['outer'],'#8eb4bd' if z else '#b18b7c','#dce7dd',2))
 for h in data[geom]['holes']:s.append(polygon(h,'#10212b'))
 s.append(f'<circle cx="{ox+50*scale}" cy="{base-66*scale}" r="{13.5*scale}" fill="#34474d" stroke="#8b9790" stroke-width="3"/>')
 label(42,67,'SOLID');label(40,63,'TRANSFER DRUM')
 if z==5:
  a,b=24,70; ps=[[50+25*cos(radians(a+(b-a)*i/18)),64+25*sin(radians(a+(b-a)*i/18))] for i in range(19)];s.append(f'<polyline points="{pts(ps)}" fill="none" stroke="#273d48" stroke-width="6"/>')
 for st in stairs:
  a,b=st['points'];s.append(f'<path d="M{ox+a[0]*scale},{base-a[1]*scale} L{ox+b[0]*scale},{base-b[1]*scale}" stroke="#e2bb6b" stroke-width="{st["width"]*scale}"/>');label((a[0]+b[0])/2,(a[1]+b[1])/2,st['id'])
 for landing in landings:
  if (z==0 and landing['z']==2):s.append(polygon(landing['points'],'#d8ba85'));label(26,58,'Turning pad +2')
 for o in obstacles:
  if o['z']!=z:continue
  x,y,w,h=o['rect'];s.append(polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#5f7e73' if o['h']<2 else '#3b4f5b'));label(x,y+h+.8,o['id'])
 for site in data['sites']:
  if site['z']!=z:continue
  x,y,w,h=site['rect'];s.append(polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#e6c669','#ffe7ab',2));label(x+.7,y+h/2,site['id'])
 for team,sp in data['spawns'].items():
  for x,y,h in sp:
   if h==z:s.append(f'<circle cx="{ox+x*scale}" cy="{base-y*scale}" r="4" fill="#fff0bd"/>')
 if z==0:
  label(2,57,'T / lower west');label(18,19,'RED LOOP');label(48,24,'IMPACT THROAT');label(59,57,'B / inboard crash bowl');label(31,39,'CABLE SEAM');label(81,65,'EAST FAN')
 else:
  label(32,105,'A / BLUE CRESCENT');label(82,94,'CT / upper emergency entry');label(12,86,'WEST GALLERY');label(36,82,'Inner A arrival');label(57,99,'EAST ARC')
 s.append(f'<path d="M{ox},830 h{10*scale}" stroke="#c0d2cd" stroke-width="3"/><text x="{ox}" y="853" class="note">10m</text>')
panel(40,'LOWER / z0 + turning landing z2','lower','upper',0)
panel(760,'UPPER / z5 / former full ring is severed','upper','lower',5)
s += ['<text x="1450" y="140" font-size="22" font-weight="700">SPATIAL DIFFERENCE</text>','<text x="1450" y="180" class="note">B nests inside the station.</text>','<text x="1450" y="208" class="note">A follows the outer upper arc.</text>','<text x="1450" y="250" class="note">No central crossbridge.</text>','<text x="1450" y="278" class="note">No defender rear crossbar.</text>','<text x="1450" y="320" class="note">T arrives under A’s west tail.</text>','<text x="1450" y="348" class="note">CT starts at the east upper tail.</text>','<text x="1450" y="390" class="note">Two A ascents are separated</text>','<text x="1450" y="418" class="note">by the cable chamber.</text>','<text x="1450" y="460" class="note">B: long red bore or shorter</text>','<text x="1450" y="488" class="note">inner service seam.</text>','<text x="1450" y="530" class="note">Core is opaque to +14m.</text>','<text x="1450" y="558" class="note">No occupied top or balconies.</text>','<text x="1450" y="600" class="note">East descent is exposed only</text>','<text x="1450" y="628" class="note">after its screened upper entry.</text>','<text x="1450" y="690" class="note">Gold = stairs / objective.</text>','<text x="1450" y="718" class="note">Gray = tall fixed mass.</text>','<text x="1450" y="746" class="note">Green = low duck refuge.</text>','<text x="40" y="920" font-size="23" font-weight="700">SECTION: the station wraps around a solid core; it does not pass through it</text>','<path d="M70 1020 H500 M95 1018 L210 960 H480 M520 960 H820 L920 1020" fill="none" stroke="#b6c7c1" stroke-width="14"/>','<rect x="330" y="930" width="140" height="90" fill="#34474d"/>','<text x="55" y="1060" class="note">T / lower arrivals → outer or turning ascent → A +5 → CT upper tail → east descent → B 0</text>','<text x="1050" y="930" class="note">L01: body radius .30 / stand 2.0 / crouch 1.1 / step .25m / all routes reversible.</text>','<text x="1050" y="960" class="note">East inner arc screen +3.3m; low guards +1.15m; upper slab top +5 / soffit +4.6.</text>','</svg>']
(P/'layout.svg').write_text(''.join(s))
