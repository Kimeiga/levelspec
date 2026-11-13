"""Draw Fusion's developed L03 spatial contract, independently of compiler output."""
from pathlib import Path
from math import sin,cos,pi
from html import escape
P=Path(__file__).parent
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="1040" viewBox="0 0 1420 1040"><style>text{font-family:system-ui;fill:#203743}.title{font-size:26px;font-weight:700}.label{font-size:12px;text-anchor:middle;paint-order:stroke;stroke:#f6f3ea;stroke-width:3px;stroke-linejoin:round}.small{font-size:13px}.body{font-size:15px}</style><rect width="1420" height="1040" fill="#f6f3ea"/><text x="35" y="42" class="title">FUSION · L03 / developed layout</text><text x="35" y="66" class="small">Meters · right-handed Z-up · Y north ↑ · reactor center (0,4) · 5v5 / two objectives</text>']
def point(x,y):return (405+x*8.5,425-y*8.5)
def poly(pts,fill='#cedbdc',stroke='#314c59',width=1.5,dash=''):
 q=' '.join(f'{point(x,y)[0]:.2f},{point(x,y)[1]:.2f}' for x,y in pts);s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
def rect(x,y,w,h,fill='#cedbdc'):poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],fill)
def line(pts,color='#273f4b',width=4,dash=''):
 q=' '.join(f'{point(x,y)[0]:.2f},{point(x,y)[1]:.2f}' for x,y in pts);s.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
def text(x,y,t):px,py=point(x,y);s.append(f'<text x="{px}" y="{py}" class="label">{escape(t)}</text>')
def arc(r,a,b):return [(r*cos(t*pi/180),4+r*sin(t*pi/180)) for t in [a+(b-a)*i/max(1,round((b-a)/2.5)) for i in range(max(1,round((b-a)/2.5))+1)]]
def band(r1,r2,a,b,fill):poly(arc(r2,a,b)+list(reversed(arc(r1,a,b))),fill)
def mark(x,y,t,c):px,py=point(x,y);s.append(f'<circle cx="{px}" cy="{py}" r="13" fill="{c}"/><text x="{px}" y="{py+5}" text-anchor="middle" fill="white" style="fill:white;font-weight:bold">{t}</text>')
# Walking floors are separate from the inaccessible machine pit.
rect(-18,-20,36,45,'#aab5bb');band(0,16.5,0,360,'#9eacb5')
for r in [14.7,11.3]:band(r,r+.65,0,360,'#51697a')
rect(-24,-36,39,16);rect(-38,-31,17,17);rect(-34,-14,14,18);rect(-38,4,18,19)
rect(-30,23,9,7);rect(-21,26,61,7);rect(22,24,18,9)
rect(15,-28,25,13);rect(22,-15,18,22);rect(20,7,20,17)
rect(-18,-20,36,6)
# Equatorial work deck: two arcs, three access bridges, no second complete walk ring.
band(4.1,8.8,0,360,'#e5b960');band(8.8,9.7,0,200,'#6a8291');band(3.25,4.1,0,200,'#6a8291')
rect(-21,1.5,13,5,'#e5b960');rect(8,2,16,5,'#e5b960');rect(-2,-20,4,15.6,'#e5b960')
band(4.1,4.3,200,360,'#8b6c39');band(8.6,8.8,200,258,'#8b6c39');band(8.6,8.8,282,360,'#8b6c39')
# Outer walls with authored openings.
for pts in [[(-24,-36),(15,-36),(15,-28)], [(-24,-36),(-24,-31)], [(-38,-31),(-38,-14),(-34,-14)], [(-38,-31),(-24,-31)], [(-34,-14),(-34,4),(-38,4),(-38,23),(-30,23)], [(-30,23),(-30,30),(-21,30),(-21,33),(40,33),(40,-28),(15,-28)], [(-21,-20),(-10,-20)], [(-4,-20),(-2,-20)],[(2,-20),(15,-20)], [(-20,-14),(-20,1.5)],[(-20,6.5),(-20,23),(-21,23),(-21,26)], [(-38,4),(-33,4)],[(-29,4),(-20,4)], [(-38,23),(-28,23)],[(-24,23),(-20,23)], [(20,7),(22,7)],[(26,7),(34,7)],[(38,7),(40,7)],[(20,24),(34,24)],[(37,24),(40,24)],[(22,-15),(22,2)], [(20,7),(20,24),(22,24)]]:line(pts)
# Main masses and low work refuges; no repeated slalom.
for x,y,w,h in [(-32,11,5,6),(27,11,5,6),(26,-12,5,10),(-16,-29,8,3),(-32,-26,5,5),(-29,-4,5,2),(6,27,3,4),(26,26,4,4),(-28,20,4,1.2),(33,21,4,1.2)]:rect(x,y,w,h,'#526b78')
for x,y,w,h in [(-35,18,3,2),(-36,6,2,3),(23,18,3,2),(34,-23,3,3),(-8,-18,3,2)]:rect(x,y,w,h,'#b59868')
# Local gallery with two physically separated observation jobs.
poly([(-24,-14),(-21,-14),(-21,-6),(-24,-6)],'#81adcc');rect(-24,-6,6,3,'#81adcc');rect(-22,-3,4,17,'#81adcc');rect(-28,14,10,4,'#81adcc');rect(-25,7,3,7,'#81adcc');rect(-22,8,2,3,'#2c526a')
for y in range(-13,-5):line([(-24,y),(-21,y)],'#41687e',1)
for y in range(8,14):line([(-25,y),(-22,y)],'#41687e',1)
line([(-18,0),(-18,5)],'#d67142',3,'4 3');line([(-26,18),(-22,18)],'#d67142',3,'4 3')
# East shallow trench and slopes.
rect(32,-12,7,14,'#a1bbce');rect(32,-17,7,5,'#b7ceda');rect(32,2,7,5,'#b7ceda')
for y in [-16,-14,3,5]:line([(32,y),(39,y)],'#41687e',1)
mark(-14,-33,'T','#ad7c3e');mark(0,30,'D','#4f72b2');mark(-34,14,'A','#bb634a');mark(35,17,'B','#bb634a')
for x,y,t in [(-7,-34,'RECEIVING'),(-31,-29,'CLEANLOCK'),(-28,-9,'CASK LANE'),(-30,21,'HOT CELL'),(30,22,'POWER HALL'),(28,-25,'COOLING COURT'),(35,-5,'−1.2'),(23,-5,'Bypass 0'),(2,32,'REAR SERVICES'),(-1,18,'Five installed 40° sectors'),(0,12,'NORTH ARC'),(0,-2,'OPEN WORK ARC'),(0,4,'CORE / void'),(-15,5,'W PORT'),(17,6,'E PORT'),(0,-13,'S BRIDGE'),(-19,12,'+3.2'),(-31,9,'A cask'),(30,10,'B plinth'),(-7,-24,'laydown cradle')]:text(x,y,t)
# Key, sectional drawing, and local evidence tasks.
s.append('<g transform="translate(805,105)"><text y="0" class="title">Reactor radial section</text><text y="25" class="small">L03 hypothesis · R from reactor axis / Z relative to work deck</text>')
outer=[(3.25,-2),(3.3,-3.5),(4.0,-4.4),(4.8,-4.5),(7.1,-3.9),(9,-1.9),(9.7,1.2),(9,4.4),(7.1,6.3),(4.8,6.9),(3.6,5.9),(3.25,4)]
def sp(r,z):return (r*32,255-z*23)
q=' '.join(f'{sp(r,z)[0]},{sp(r,z)[1]}' for r,z in outer);s.append(f'<polygon points="{q}" fill="#7a929e" stroke="#314c59" stroke-width="2"/>')
inner=[(6.475+(r-6.475)*.86,1.2+(z-1.2)*.92) for r,z in outer];q=' '.join(f'{sp(r,z)[0]},{sp(r,z)[1]}' for r,z in inner);s.append(f'<polygon points="{q}" fill="#f6f3ea"/>')
s.append('<rect x="131.2" y="255" width="150.4" height="7" fill="#d8ad55"/><line x1="0" y1="255" x2="480" y2="255" stroke="#9f7150" stroke-dasharray="4 3"/><rect x="16" y="50" width="48" height="299" fill="#576c7a"/><rect x="355" y="255" width="110" height="7" fill="#b2c1c8"/><line x1="470" y1="30" x2="470" y2="365" stroke="#647a86" stroke-width="11"/><text x="180" y="75" class="small">Top +6.9</text><text x="160" y="386" class="small">Bottom −4.5 · height 11.4m</text><text x="165" y="285" class="small">Deck 0 · width 4.7m</text><text x="14" y="410" class="small">Central solenoid | vessel | coil zone | bioshield</text><text x="14" y="434" class="small">D-section inferred; published envelope retained.</text></g>')
notes=['Amber: interior work deck / access bridges at Z=0.','Blue: west gallery +3.2; east bus trench −1.2.','Dark masses: 2.1–3m; tan low fixtures: 1.05m.','Gray pit has no ordinary standing route.','Outer ring is machine space, not a second walk loop.','Full shell 0–200°; lower shell / temporary deck 200–360°.','Gallery port view is separated from A view by a 2.4m screen.','Rear exits turn into site; rear band has no plant sightline.','Standing eye 1.674m; crouched eye 1.023m; FOV 75°.','Dimensions show intent; compiled exposure is still open.']
for i,t in enumerate(notes):s.append(f'<text x="805" y="{590+i*23}" class="small">{escape(t)}</text>')
s.append('<text x="40" y="820" class="body">Named interfaces for section review</text>')
for i,t in enumerate(['T exits → Cleanlock / Cooling / S bridge; Cleanlock → Cask; Cask stairs → gallery; A south / W-port / rear entries.', 'S bridge → open work arc; enclosed north arc → E/W ports; E-port → Power west entry; trench ramps → B south.', 'Gallery port aperture → lower W port; gallery A aperture → Hot Cell; A/B rear turns → Rear Services.', 'Overhead: roofed west gallery bay at 7.2m / other wings 4.8m; reactor hall roof at 16m, crane at 12m. Views use deliberate cutaways.']):s.append(f'<text x="40" y="{850+i*25}" class="small">{escape(t)}</text>')
s.append('</svg>');(P/'layout-l03.svg').write_text(''.join(s))
