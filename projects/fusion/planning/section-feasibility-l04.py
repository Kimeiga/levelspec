"""Draw L04 clearance reservations against the frozen B04 native radial profile."""
from pathlib import Path
import xml.etree.ElementTree as E
from math import hypot
from html import escape

P=Path(__file__).parent
root=E.parse(P/'../reviews/evidence/b04/source.aml').getroot()
shell=root.find('.//faceted-solid[@id="vessel-shell-01"]')
vertices=[[float(v) for v in row.split()] for row in shell.get('points').split(';')]
outer=[(hypot(x,y-4),z) for x,y,z in vertices[:49]]
inner=[(hypot(x,y-4),z) for x,y,z in vertices[49:98]]
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1540" height="1100" viewBox="0 0 1540 1100"><style>text{font-family:Arial,sans-serif;fill:#203944}.title{font-size:27px;font-weight:bold}.head{font-size:21px;font-weight:bold}.label{font-size:16px}.small{font-size:14px}</style><rect width="1540" height="1100" fill="#faf7ef"/>']
def text(x,y,t,cls='label'):s.append(f'<text x="{x}" y="{y}" class="{cls}">{escape(t)}</text>')
def section(ox,oy,sx,sz):
 def point(r,z):return ox+r*sx,oy-z*sz
 def poly(points,fill,stroke='#304b56',dash=''):
  coords=' '.join(f'{x:.3f},{y:.3f}' for x,y in [point(r,z) for r,z in points])
  s.append(f'<polygon points="{coords}" fill="{fill}" stroke="{stroke}" stroke-width="1.4" stroke-dasharray="{dash}"/>')
 def rect(r,z,w,h,fill):poly([(r,z),(r+w,z),(r+w,z+h),(r,z+h)],fill)
 def label(r,z,t):text(*point(r,z),t,'small')
 return point,poly,rect,label
text(35,44,'FUSION / L04 radial clearance reservations','title')
text(35,73,'Source profile: frozen B04 AML · proposed geometry only · section envelopes are not collision-walk acceptance')
text(35,114,'R1 / Lower port at an uninstalled TF station; meters R from axis, Z up','head')
p,poly,rect,label=section(80,430,48,24)
poly(outer,'none','#879a9f','5 4');poly(inner,'none','#879a9f','5 4')
rect(0,-5.7,2,13,'#bd9373');label(.1,8,'solenoid')
poly([(2.4,-7),(11.4,-7),(11.4,10),(2.4,10)],'none','#bac3c3','7 5')
label(3,10.6,'TF envelope; station absent at selected lower ports')
rect(4.1,-.3,4.7,.3,'#e4b659');label(4.2,.5,'equatorial deck 0')
rect(4.1,-3.45,3.2,.25,'#ac94c4');label(4.2,-4.3,'lower −3.2 / slab .25')
poly([(7.3,-3.45),(9.8,-3.05),(9.8,-2.8),(7.3,-3.2)],'#ac94c4')
rect(9.8,-3.05,12.5,.25,'#ac94c4')
rect(11.65,-3.8,.7,.55,'#ad7654');label(10.5,-4.6,'PF top −3.25')
rect(14,-8.2,.7,5.15,'#79909d');label(13.2,-8.8,'cryostat notch')
rect(16.5,-8.2,1,5.15,'#b5b9b1');rect(16.5,-.3,1,3.1,'#b5b9b1')
label(16.2,3.4,'bioshield')
for r,z in [(5.6,-3.2),(12.7,-2.8),(18.7,-2.8)]:
 rect(r-.35,z,.7,1.8,'#3c6975');label(r-.5,z+2.15,'1.8m')
label(18,-1.1,'clear opening 2.5m')
label(10.2,-2.25,'bridge top −2.8')
text(80,690,'Bridge underside −3.05 is 0.20m above the existing outer PF coil top. The magnet is retained.', 'label')
text(80,718,'Vessel work opening must include the rising transition; the cryostat/bioshield openings have separate extents.', 'label')
text(80,746,'Upper D outline is shown for dimensional reference. This southern assembly sector has only its lower shell.', 'label')

text(35,801,'S1 / Mid-flight radial slice near 265°','head')
p,poly,rect,label=section(-380,865,105,55)
rect(4.1,-3.45,3.2,.25,'#ac94c4')
rect(4.2,-3.45,1.8,1.85,'#d0ba8f')
rect(5.94,-1.6,.12,1.05,'#b38739')
rect(6.2,-.3,2.6,.3,'#e4b659')
rect(6.35,-3.2,.7,1.8,'#3c6975')
rect(7.24,-3.2,.12,1.05,'#b38739')
label(4.1,.45,'hatch / no upper slab here')
label(6.3,.45,'ground outer strip continues')
label(4.2,-4.0,'stair R4.2..6.0')
label(6.15,-4.0,'lower bypass')
text(760,852,'Centre R5.1, width1.8; 225° at0 → 305° at−3.2.')
text(760,882,'~7.12m going;20 rises at0.16; inner going~0.293m.')
text(760,912,'Lower body is centred atR6.7; width0.7,height1.8.')
text(760,942,'Passing strip and rails need actual compiled inspection.')
text(760,972,'Replace obstructing temporary posts with shallow beams.')
text(760,1002,'This sketch does not prove cornering, stair fit or support.')
s.append('</svg>');(P/'section-feasibility-l04.svg').write_text(''.join(s))
