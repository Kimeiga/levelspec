"""Independent spatial proposal drawings. No canonical AML mutation."""
from pathlib import Path
from math import sin, cos, pi, hypot
from html import escape
P=Path(__file__).parent
BG='#f7f3e9'; INK='#233f4b'; GROUND='#e5bc68'; LOWER='#9d83b8'; UPPER='#74a8c0'; CROWN='#97ad6f'; GHOST='#e5e8e4'; PIT='#c0c7c8'; VOID='#fffaf0'
class Sheet:
 def __init__(self,h,title,sub):
  self.h=h;self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="{h}" viewBox="0 0 1600 {h}"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="{INK}"/></marker></defs><style>text{{font-family:Arial,sans-serif;fill:{INK}}}.label{{font-size:12px;text-anchor:middle;paint-order:stroke;stroke:{BG};stroke-width:3px;stroke-linejoin:round}}.small{{font-size:14px}}.note{{font-size:16px}}.title{{font-size:28px;font-weight:bold}}.head{{font-size:20px;font-weight:bold}}</style><rect width="1600" height="{h}" fill="{BG}"/>'];self.text(30,43,title,'title');self.text(30,73,sub,'note')
 def text(self,x,y,t,cls='small',anchor=None):self.s.append(f'<text x="{x:.2f}" y="{y:.2f}" class="{cls}"'+(f' text-anchor="{anchor}"' if anchor else '')+f'>{escape(t)}</text>')
 def panel(self,x,y,w,h,title,sub):
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="none" stroke="#bfc9c6"/>');self.text(x+15,y+27,title,'head');self.text(x+15,y+49,sub);return Plan(self,x+w/2,y+240,5.0)
 def save(self,name):self.s.append('</svg>');(P/name).write_text(''.join(self.s))
class Plan:
 def __init__(self,s,cx,cy,k):self.s=s;self.cx=cx;self.cy=cy;self.k=k
 def p(self,p):return self.cx+p[0]*self.k,self.cy-p[1]*self.k
 def poly(self,ps,fill,stroke=INK,dash='',opacity=1):
  q=' '.join(f'{x:.2f},{y:.2f}' for x,y in map(self.p,ps));self.s.s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="1.3" stroke-dasharray="{dash}" opacity="{opacity}"/>')
 def rect(self,x,y,w,h,fill,stroke=INK,dash=''):self.poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],fill,stroke,dash)
 def line(self,ps,color=INK,width=2,dash='',arrow=False):
  q=' '.join(f'{x:.2f},{y:.2f}' for x,y in map(self.p,ps));self.s.s.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
 def corridor(self,ps,width,fill,dash=''):
  self.line(ps,INK,width*self.k+2,dash);self.line(ps,fill,width*self.k,dash)
 def arc(self,r,a,b):return [(r*cos(t*pi/180),4+r*sin(t*pi/180)) for t in [a+(b-a)*i/80 for i in range(81)]]
 def band(self,r1,r2,a,b,fill,stroke=INK,dash=''):self.poly(self.arc(r2,a,b)+self.arc(r1,b,a),fill,stroke,dash)
 def label(self,x,y,t):self.s.text(*self.p((x,y)),t,'label')
 def mark(self,x,y,t,color):
  px,py=self.p((x,y));self.s.s.append(f'<circle cx="{px}" cy="{py}" r="14" fill="{color}"/>');self.s.s.append(f'<text x="{px}" y="{py+5}" text-anchor="middle" style="fill:white;font-size:15px;font-weight:bold">{escape(t)}</text>')
 def stair(self,ps,label='',width=2.4):
  self.corridor(ps,width,'#e9dfc8');self.line(ps,INK,1.7,arrow=True)
  if label:self.label(ps[len(ps)//2][0],ps[len(ps)//2][1]+1.5,label)
 def context(self):
  self.rect(-18,-20,36,45,PIT,'#b3bdbd');self.band(0,17.5,0,360,PIT,'#a0afb3');self.band(16.5,17.5,0,360,'#aab6bb');self.band(9.2,9.7,0,200,'#8095a0');self.band(3.25,3.75,0,200,'#8095a0');self.band(0,2,0,360,'#667b83')
  for x,y,w,h in [(-24,-36,39,16),(-38,-31,17,17),(-34,-14,14,18),(-38,4,18,19),(-30,23,9,7),(-21,26,61,7),(22,24,18,9),(15,-28,25,13),(22,-15,18,22),(20,7,20,17)]:self.rect(x,y,w,h,'none','#bdc6c6','3 3')
  self.label(0,19,'reactor Ø19.4');self.label(0,15,'axis (0,4)')
 def ground(self):
  for x,y,w,h in [(-24,-36,39,16),(-38,-31,17,17),(-34,-14,14,18),(-38,4,18,19),(-30,23,9,7),(-21,26,61,7),(22,24,18,9),(15,-28,25,13),(22,-15,18,22),(20,7,20,17),(-18,-20,36,6)]:self.rect(x,y,w,h,GROUND)
  self.band(4.1,8.8,0,360,GROUND);self.rect(-21,1.5,13,5,GROUND);self.rect(8,2,16,5,GROUND);self.rect(-2,-20,4,15.6,GROUND)
  self.rect(32,-12,7,14,LOWER);self.stair([(35.5,-17),(35.5,-12)],'',6);self.stair([(35.5,2),(35.5,7)],'',6);self.label(35.5,-5,'−1.2')
  self.mark(-14,-33,'T','#8b6c3a');self.mark(0,30,'D','#476da4')
 def a_upper(self):
  self.rect(-22,-3,4,17,UPPER);self.rect(-28,14,10,4,UPPER);self.rect(-24,-6,6,3,UPPER);self.stair([(-22.5,-14),(-22.5,-6)],'old ↑');self.stair([(-23.5,7),(-23.5,14)],'old ↑')
  self.rect(-34,-5,4,7,UPPER);self.rect(-34,-4,16,3,UPPER);self.label(-29,-1,'A4 crossing')
  self.band(4.5,6.5,25,155,UPPER);self.stair(self.arc(5.5,215,155),'',2);self.stair(self.arc(5.5,-35,25),'',2);self.label(0,10,'A1 +3.2');self.label(-9,0,'A2');self.label(9,0,'A3')
  self.rect(22,-8,4,17,UPPER);self.rect(22,8,6,3,UPPER);self.stair([(23.5,-18),(23.5,-10)],'A9 ↑');self.stair([(24,18),(24,10)],'↑');self.label(29,3,'east gallery')
  self.corridor([(-18,6.3),(-5,6.3)],2.2,UPPER,'5 4');self.label(-14,10,'A10 option')

def notes(sh,x,y,lines):
 for i,t in enumerate(lines):sh.text(x,y+i*25,t,'note')
def section(sh,x,y,which):
 # Coordinates within radial section: radial meters horizontal, Z meters vertical.
 kx=18;kz=16
 def q(r,z):return (x+r*kx,y-z*kz)
 def poly(ps,fill,stroke=INK,dash=''):
  qq=' '.join(f'{a:.2f},{b:.2f}' for a,b in [q(*p) for p in ps]);sh.s.append(f'<polygon points="{qq}" fill="{fill}" stroke="{stroke}" stroke-width="1.5" stroke-dasharray="{dash}"/>')
 def rect(r,z,w,h,fill):poly([(r,z),(r+w,z),(r+w,z+h),(r,z+h)],fill)
 outer=[(3.25,-2),(3.3,-3.5),(4,-4.4),(4.8,-4.5),(7.1,-3.9),(9,-1.9),(9.7,1.2),(9,4.4),(7.1,6.3),(4.8,6.9),(3.6,5.9),(3.25,4)]
 inner=[(6.475+(r-6.475)*.86,1.2+(z-1.2)*.92) for r,z in outer]
 poly(outer,'#7a929e');poly(inner,BG);rect(4.1,-.3,4.7,.3,GROUND)
 rect(16.5,-8.2,1,11,PIT);rect(0,-5.7,2,13,'#ad8b60')
 poly([(2.4,-7),(11.4,-7),(11.4,10),(2.4,10)],'none','#85979c','5 5')
 if which=='a':rect(4.5,2.9,2,.3,UPPER);rect(19,-3.5,3,.3,LOWER)
 else:rect(4.6,-3.5,2.2,.3,LOWER);rect(18.6,6.1,2.8,.3,CROWN)
 sh.text(x+48,y-176,'Coil envelope 9 × 17m');sh.text(x+20,y+151,'D vessel 19.4m diameter / 11.4m high; section is one radial half.');sh.text(x+20,y+175,'Colored strips show reserved deck bands, not verified clearances.');sh.text(*q(3.6,7.7),'vessel +6.9');sh.text(*q(3.6,-5.6),'vessel −4.5');sh.text(*q(17.9,2.8),'bioshield');
 if which=='a':sh.text(*q(11,4.2),'+3.2 upper');sh.text(*q(11,.1),'0 equator');sh.text(*q(18,-4.5),'−3.2 service');sh.text(x+20,y+198,'Upper slab leaves nominal 2.9m below; outer service lies beyond shield.')
 else:sh.text(*q(18,7.4),'+6.4 crown');sh.text(*q(10,.1),'0 equator');sh.text(*q(9,-3.2),'−3.2 lower');sh.text(x+20,y+198,'Lower deck beneath 0 slab: nominal 2.9m headroom before fixtures.')

s=Sheet(1170,'FUSION / Spatial alternative A — three inhabited layers','Independent provisional organization · 5v5 / two objectives · actual floor reservations · metres / Z up / Y north ↑')
a=s.panel(20,105,510,515,'LOWER / −3.2','Outside-bioshield service transfer + freight void')
a.context();a.rect(-30,-8,5,8,LOWER);lower=[(-27,-5),(-22,-11),(-22,-18),(-7,-18),(-7,-23),(8,-23),(8,-18),(24,-18),(30,-25)];a.corridor(lower,3,LOWER);a.rect(-9,-26,19,6,LOWER);a.corridor([(-27,-11.5),(-27,-5)],3,LOWER);a.stair([(-27,-11.5),(-31.5,-11.5),(-31.5,-16)],'A5 ↑');a.rect(-33,-13,3,3,'#e9dfc8');a.stair([(5,-22),(5,-16)],'A7 ↑');a.stair([(30,-25),(30,-17)],'A8 ↑');a.label(-27,2,'A4 freight −3.2');a.label(0,-30,'A6 sump / switch room');a.label(24,-10,'exit to Cooling');a.label(0,4,'pit is NOT a route')
b=s.panel(545,105,510,515,'EQUATOR / 0','Both objectives stay at ground level')
b.context();b.ground();b.rect(-30,-8,5,8,VOID,INK,'4 3');b.rect(2,-20,6,4,VOID,INK,'4 3');b.rect(29,-25,2.4,8,VOID,INK,'4 3');b.mark(-34,14,'A','#af604a');b.mark(35,17,'B','#af604a');b.label(-28,5,'freight void');b.label(0,-5,'open work arc');b.label(0,-24,'Receiving / three choices');b.stair(b.arc(5.5,215,155),'',2);b.stair(b.arc(5.5,-35,25),'',2);b.stair([(-22.5,-14),(-22.5,-6)],'');b.stair([(23.5,-18),(23.5,-10)],'A9 ↑');b.label(-32,-22,'Cleanlock');b.label(30,-29,'Cooling')
c=s.panel(1070,105,510,515,'UPPER / +3.2','Partial vessel arc + distinct wing support routes')
c.context();c.a_upper();c.mark(-34,14,'A','#af604a');c.mark(35,17,'B','#af604a');c.label(-35,20,'A below');c.label(35,23,'B below')
notes(s,35,650,['A1–A3: partial upper internal route; two curved stairs; retain outer ground passage.','A4–A8: freight void and lower three-way transfer; exits stay in front of the objectives.','A9: new east upper approach; A10: optional upper west bridge, dashed pending coil/port fit.'])
section(s,60,955,'a')
notes(s,650,770,['SECTION / commitments to test','• Ground annulus: R4.1–8.8. Upper partial walk: R4.5–6.5 at +3.2.','• Lower service floor −3.2 stays outside R17.5 bioshield.','• A2/A3 upper stairs reserve ~2m of outer ground passage beside them.','• A8 lower ascent and A9 upper ascent have separate plan footprints.','• New east occupied upper wing needs roof ≥+7.2, actual enclosure.','• A10 needs a collared upper opening and coil-specific clearance;','  adjacent coil may remain uninstalled, never shrink its envelope.','• Colored plans show occupied floors; pale dashed outlines are context.','• Stair arrows show rising direction; beige footprint reserves the transfer.','• IDs and exact coordinates are in complexity-spatial-proposals.md.'])
s.save('complexity-spatial-a.svg')

s=Sheet(1530,'FUSION / Spatial alternative B — raised A, sunken B, assembly crown','Independent provisional organization · serious macro alternative · 5v5 / two objectives · metres / Z up / Y north ↑')
a=s.panel(20,105,770,500,'LOWER / −3.2','B basin + partial internal vessel service route')
a.context();a.band(4.6,6.8,210,350,LOWER);a.corridor([(-4.94,1.15),(-21,-8),(-27,-8)],2.4,LOWER);a.corridor([(5.61,3.01),(24,0),(28,6),(29,12)],2.4,LOWER);a.rect(-32,-10,9,8,LOWER);a.rect(28,9,12,14,LOWER);a.rect(31,14,8,7,'#b29bc8');a.stair([(-28,-5),(-28,3)],'B8 ↑');a.corridor([(35,7),(35,10)],2.4,LOWER);a.stair([(35,7),(35,2)],'to −1.2');a.rect(22,12,7,5,LOWER);a.stair([(24,15),(24,7)],'to 0');a.stair([(36,19),(36,27)],'↑');a.mark(35,17,'B','#af604a');a.label(-30,-14,'freight service');a.label(0,-5,'B5 lower arc');a.label(-16,-3,'B6');a.label(17,1,'B7');a.label(34,24,'B under shelf');a.label(0,-24,'No lower connection to Receiving')
b=s.panel(810,105,770,500,'GROUND / 0','Equatorial route remains the ordinary transfer level')
b.context();b.ground();b.rect(28,9,12,14,VOID,INK,'4 3');b.rect(31,14,8,7,GROUND);b.rect(27,18,5,3,GROUND);b.label(35,18,'shelf / B below');b.label(-31,16,'A above');b.stair([(-34,3),(-34,11)],'A ↑');b.stair([(-24,5),(-24,13)],'↑');b.stair([(-29,25),(-29,17)],'↑');b.rect(32,2,7,7,VOID,INK,'4 3');b.stair([(35,7),(35,2)],'to −1.2');b.rect(22,7,4,9,VOID,INK,'4 3');b.stair([(24,15),(24,7)],'B ↑');b.stair([(36,19),(36,27)],'↑');b.stair([(-28,-5),(-28,3)],'lower ↑');b.stair([(-22.5,-14),(-22.5,-6)],'gallery ↑');b.label(0,-5,'0 / open work arc')
c=s.panel(20,620,770,500,'UPPER / +3.2','A objective + intermediate crown-access landings')
c.context();c.rect(-39,9,17,14,UPPER);c.rect(-25,-3,5,17,UPPER);c.rect(-25,-6,5,3,UPPER);c.stair([(-22.5,-14),(-22.5,-6)],'↑');c.rect(-34,-5,14,4,UPPER);c.stair([(-34,3),(-34,11)],'B2 ↑');c.stair([(-24,5),(-24,13)],'↑');c.stair([(-29,25),(-29,17)],'↑');c.stair([(-28,3),(-30,11)],'B8 ↑');c.mark(-34,14,'A','#af604a');c.rect(23,16,5,8,UPPER);c.stair([(25,26),(25,19)],'ground ↑');c.stair([(-32,12),(-25,12)],'crown ↑');c.stair([(25,19),(25,11)],'crown ↑');c.label(0,4,'no internal +3.2 ring');c.label(28,28,'B11 gallery')
d=s.panel(810,620,770,500,'CROWN / +6.4','Partial external crescent; long, exposed acquisition cost')
d.context();d.band(18.6,21.4,20,160,CROWN);d.corridor([(-18.8,10.8),(-25,11)],2.8,CROWN);d.corridor([(18.8,10.8),(25,11)],2.8,CROWN);d.rect(-28,9,6,5,CROWN);d.rect(22,9,6,5,CROWN);d.stair([(-32,12),(-25,12)],'B10 ↑');d.stair([(25,19),(25,11)],'B11 ↑');d.label(0,27,'B9 crown +6.4');d.label(0,4,'coil tops +10');d.label(-31,20,'to A +3.2');d.label(31,25,'to +3.2 / 0 / B');d.line([(-18.8,10.8),(-12,4)],'#ab715c',1.6,'4 4');d.line([(18.8,10.8),(13,4.5)],'#ab715c',1.6,'4 4');d.label(0,-22,'Dashed: proposed bounded port-support views')
section(s,60,1315,'b')
notes(s,650,1160,['SECTION / consequential commitments','• A at +3.2; B at −3.2. Their entrance positions remain distinct.','• Lower vessel arc R4.6–6.8 / 210°–350°; nominal 2.9m below deck 0.','• Lower bridges use unfinished coil sectors; collars and shielding','  apertures require section tests through every machine layer.','• Crown R18.6–21.4 at +6.4 is outside the bioshield, not a vessel roof.','• Crown-to-B requires descent through +3.2 and 0; it is not instant.','• Enlarge the occupied hall/wing roofs: +7.2 roofs cannot cover +6.4 play.','• B retains a lower sheltered room beneath part of the ground shelf.','• Stair footprints are reservations; settle landings/screens in development.','• No required jump, ladder, drop or lift. Every route uses ordinary stairs.','• IDs / support hypotheses: complexity-spatial-proposals.md.'])
s.save('complexity-spatial-b.svg')
print('Wrote both independent proposal SVGs.')
