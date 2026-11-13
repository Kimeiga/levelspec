from pathlib import Path
from html import escape
import math
P=Path(__file__).parent
panels=[]
def panel(title,variant):
 s=[f'<g transform="translate({variant*480},0)"><text x="24" y="32" class="heading">{title}</text>']
 def polygon(pts,fill='#cbd9d8',stroke='#364d57',dash=''):
  q=' '.join(f'{240+x*5},{280-y*5}' for x,y in pts);s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="2" stroke-dasharray="{dash}"/>')
 def rect(x,y,w,h,fill='#cbd9d8'):polygon([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],fill)
 def line(pts,color='#172b37',width=3,dash=''):
  q=' '.join(f'{240+x*5},{280-y*5}' for x,y in pts);s.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
 def label(x,y,t):s.append(f'<text x="{240+x*5}" y="{280-y*5}" class="label">{escape(t)}</text>')
 def mark(x,y,t,c):s.append(f'<circle cx="{240+x*5}" cy="{280-y*5}" r="12" fill="{c}"/><text x="{240+x*5}" y="{284-y*5}" class="mark">{t}</text>')
 def ring(cx,cy):
  for r,fill in [(16.5,'#b7c5cd'),(14.5,'#e4ebeb'),(9.7,'#a1afbc'),(8.8,'#e7ba6e'),(4.1,'#6b7b8a'),(2,'#354854')]:s.append(f'<circle cx="{240+cx*5}" cy="{280-cy*5}" r="{r*5}" fill="{fill}" stroke="#405464" stroke-width="1.2"/>')
  label(cx,cy+1,'TOKAMAK');label(cx,cy-2,'Ø19.4m')
 if variant==0:
  polygon([(-18,-20),(18,-20),(18,25),(-18,25)],'#e7ebeb')
  rect(-38,-31,17,17);rect(-34,-14,13,18);rect(-38,4,20,19);rect(-21,7,7,6)
  rect(-23,-36,38,16);rect(15,-28,23,13);polygon([(22,-15),(38,-15),(38,22),(20,22),(20,5),(16,5),(16,-3),(22,-3)],'#cbd9d8')
  rect(-29,23,14,8);rect(-15,24,52,9);rect(19,21,18,10)
  ring(0,4)
  rect(-18,1,10,5,'#e7ba6e');rect(8,2,15,5,'#e7ba6e');rect(-2,-20,4,16,'#e7ba6e')
  rect(-31,10,7,7,'#6b7b8a');rect(27,8,5,10,'#6b7b8a');rect(25,-12,5,12,'#6b7b8a')
  line([(-22,-7),(-17,-7),(-17,14),(-23,14)],'#3e7eae',8);label(-25,-6,'stairs +3.2');label(-19,18,'gallery +3.2')
  label(-29,-24,'Cleanlock');label(-28,-5,'Cask lane');label(-29,21,'HOT CELL');label(30,-21,'Cooling');label(32,3,'Bus trench');label(28,25,'Control');label(0,30,'Rear services')
  label(-5,-25,'RECEIVING / laydown');mark(-15,-32,'T','#b77a35');mark(10,29,'D','#476eae');mark(-30,14,'A','#bb634a');mark(32,16,'B','#bb634a')
  label(0,-44,'1. Port hall + two unequal service loops')
 elif variant==1:
  polygon([(-35,-30),(12,-30),(32,-10),(29,29),(-8,35),(-34,12)],'#e7ebeb');ring(0,0)
  polygon([(-35,-30),(-17,-30),(-17,25),(-31,25)],'#cbd9d8');polygon([(18,-27),(32,-10),(29,29),(12,29),(15,7)],'#cbd9d8')
  line([(-24,-7),(-14,-15),(10,-15),(23,-6),(22,22)],'#3e7eae',10);label(-21,-10,'rising crescent');label(22,20,'+4 gallery')
  rect(-25,23,40,9);mark(-23,-25,'T','#b77a35');mark(-7,28,'D','#476eae');mark(-27,13,'A','#bb634a');mark(21,13,'B','#bb634a');label(-25,6,'port cells');label(22,-16,'coil staging')
  label(0,-44,'2. Stacked crescent / unequal arrival levels')
 else:
  rect(-36,-33,72,66,'#e7ebeb');ring(-12,5);rect(11,-3,16,25,'#6b7b8a');rect(-34,-28,25,13);rect(-5,-28,39,13);rect(-35,25,68,8)
  line([(-9,-23),(-3,-10),(5,-10),(5,22),(23,22)],'#3e7eae',9);label(13,-7,'lift gallery +3.2');label(19,8,'detached sector');label(-20,-23,'airlock');label(19,-22,'assembly line')
  mark(-28,-25,'T','#b77a35');mark(23,29,'D','#476eae');mark(-25,19,'A','#bb634a');mark(31,15,'B','#bb634a')
  label(0,-44,'3. Twin machines / shared assembly nave')
 s.append('</g>');return ''.join(s)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="550" viewBox="0 0 1440 550"><style>.heading{font:bold 20px sans-serif;fill:#203542}.label{font:11px sans-serif;text-anchor:middle;fill:#182f3f;paint-order:stroke;stroke:#f5f3ec;stroke-width:3px;stroke-linejoin:round}.mark{font:bold 12px sans-serif;text-anchor:middle;fill:white}</style><rect width="1440" height="550" fill="#f5f3ec"/>'+''.join(panel(t,i) for i,t in enumerate(['A · Port-hall weave','B · Crescent section','C · Assembly nave']))+'<text x="24" y="530" font-family="sans-serif" font-size="12">FUSION S01 · N ↑ · meters · gray = floor / dark = mass / amber = vessel work passage / blue = elevated route · Source dimensions apply to reactor; surrounding layout is invented.</text></svg>'
(P/'candidates-s01.svg').write_text(svg)
