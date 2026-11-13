"""Reproduce independent complexity comparison drawings from archived B04 source.
Run from repository root: python3 projects/fusion/planning/draw-complexity-organic.py
No AML mutations. All additions are provisional authored sketch footprints.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
from html import escape
from math import sin, cos, pi, hypot
import hashlib

P = Path(__file__).parent
BASE = P.parent/'reviews/evidence/b04/source.aml'
assert hashlib.sha256(BASE.read_bytes()).hexdigest() == '67e6d4fc42c5262f0b968956dc00ca6b7a90b261b9a41d2b4134b70ecae7f3e6'
root = ET.parse(BASE).getroot()
objects = {e.get('id'): e for e in root.iter() if e.get('id')}

def points(value): return [tuple(map(float, row.split())) for row in value.split(';')]
def rect(x,y,w,h): return [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]
def arc(r,a,b): return [(r*cos(t*pi/180),4+r*sin(t*pi/180)) for t in [a+(b-a)*i/80 for i in range(81)]]
def band(a,b,lo=0,hi=360): return arc(b,lo,hi)+arc(a,hi,lo)
def below(pts,limit):
    out=[]
    for a,b in zip(pts,pts[1:]+pts[:1]):
        if a[1]<=limit: out.append(a)
        if (a[1]<=limit)!=(b[1]<=limit):
            t=(limit-a[1])/(b[1]-a[1]); out.append((a[0]+t*(b[0]-a[0]),limit))
    return out
def corridor(a,b,w):
    dx,dy=b[0]-a[0],b[1]-a[1]; length=hypot(dx,dy); nx,ny=-dy*w/length/2,dx*w/length/2
    return [(a[0]+nx,a[1]+ny),(b[0]+nx,b[1]+ny),(b[0]-nx,b[1]-ny),(a[0]-nx,a[1]-ny)]

GROUND='#c9cdca'; GHOST='#eeefeb'; MACHINE='#b2b8b9'; INK='#253c46'
LOW='#73c9ba'; LOW2='#9ed9e4'; HIGH='#d7b4eb'; STAIR='#f3c783'; VOID='#fffdf8'

class Sheet:
    def __init__(self, key, title, subtitle):
        self.key=key; self.s=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1500" viewBox="0 0 1800 1500">', '''<defs>
<pattern id="machine" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e0e3e2"/><path d="M0 8L8 0" stroke="#b6bebe" stroke-width="1"/></pattern>
<pattern id="cut" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fffdf8"/><path d="M0 8L8 0" stroke="#d89b74" stroke-width="1"/></pattern>
<marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#79522d"/></marker>
</defs><style>text{font-family:Arial,sans-serif;fill:#253c46}.title{font-size:29px;font-weight:700}.sub{font-size:15px}.head{font-size:20px;font-weight:700}.note{font-size:14px}.map{font-size:12px;text-anchor:middle;paint-order:stroke;stroke:#fffdf8;stroke-width:3;stroke-linejoin:round}.tag{font-size:12px;font-weight:700;text-anchor:middle;paint-order:stroke;stroke:#fffdf8;stroke-width:3}.tiny{font-size:11px}.dim{font-size:12px}</style><rect width="1800" height="1500" fill="#fffdf8"/>''']
        self.text(30,42,title,'title'); self.text(30,70,subtitle,'sub')
    def text(self,x,y,t,cls='note',anchor=None):
        self.s.append(f'<text x="{x:.2f}" y="{y:.2f}" class="{cls}"'+(f' text-anchor="{anchor}"' if anchor else '')+f'>{escape(t)}</text>')
    def polygon(self, pts, fill, stroke=INK, width=1, dash=''):
        q=' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)
        self.s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
    def line(self, pts, color=INK, width=1, dash='', arrow=False):
        q=' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)
        self.s.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
    def box(self,x,y,w,h,fill,stroke=INK): self.polygon(rect(x,y,w,h),fill,stroke)
    def panel(self,index,title,level):
        x=30+590*index; self.box(x,100,560,626,'#fafaf6','#ccd3d0'); self.text(x+18,129,title,'head')
        p=Plan(self,x,level); p.context(); return p
    def notes(self,px,lines):
        for i,line in enumerate(lines): self.text(px,645+i*20,line,'note')
    def footer(self, lines):
        self.box(30,1340,1740,130,'#f0f2ed','#d6ddda')
        for i,line in enumerate(lines): self.text(48,1368+i*23,line,'note')
    def save(self): self.s.append('</svg>'); (P/f'complexity-organic-{self.key}.svg').write_text('\n'.join(self.s))

class Plan:
    scale=5.8
    def __init__(self, page, x, level): self.page=page; self.x=x; self.level=level
    def p(self,x,y): return self.x+280+x*self.scale,360-y*self.scale
    def poly(self,pts,fill,stroke=INK,width=1,dash=''): self.page.polygon([self.p(*a[:2]) for a in pts],fill,stroke,width,dash)
    def line(self,pts,color=INK,width=1,dash='',arrow=False): self.page.line([self.p(*a[:2]) for a in pts],color,width,dash,arrow)
    def floor(self,pts,fill=LOW): self.poly(pts,fill,INK,1.6)
    def label(self,x,y,t,cls='map'): self.page.text(*self.p(x,y),t,cls)
    def tag(self,x,y,t): self.label(x,y,t,'tag')
    def cut(self,pts): self.poly(pts,'url(#cut)','#bd784f',1.3,'4 2')
    def stair(self,id,a,b,w,z0,z1):
        self.floor(corridor(a,b,w),STAIR); dx,dy=b[0]-a[0],b[1]-a[1]; n=max(4,round(hypot(dx,dy)/.65)); length=hypot(dx,dy); nx,ny=-dy*w/length/2,dx*w/length/2
        for i in range(1,n):
            x,y=a[0]+dx*i/n,a[1]+dy*i/n; self.line([(x+nx,y+ny),(x-nx,y-ny)],'#a87940',.8)
        self.line([a,b] if z1>z0 else [b,a],'#79522d',1.5,arrow=True)
        self.tag((a[0]+b[0])/2,(a[1]+b[1])/2,id)
    def threshold(self,id,a,b):
        self.line([a,b],'#bf5f39',3,'4 2'); self.tag((a[0]+b[0])/2,(a[1]+b[1])/2+1.5,id)
    def context(self):
        # Pale B04 floor projection and exact roof/hall footprint.
        self.poly(rect(-18,-20,36,45),GHOST,'#adb8b6',1,'3 3')
        for e in root.iter('slab'):
            p=objects[e.get('profile')]; self.poly(points(p.get('points')),GHOST,'#d1d8d4',.7)
        self.poly(band(0,17.5),'url(#machine)','#a3aeae',.8)
        for r in [9.7,11.4,14.7,16.5]: self.line(arc(r,0,360),'#9ba7a9',.8,'3 3')
        # Solid gray is retained floor at the labeled level; pale gray is projection only.
        for e in root.iter('slab'):
            z=float(e.get('elevation','0'))
            if abs(z-self.level)<.05:
                p=objects[e.get('profile')]; self.poly(points(p.get('points')),GROUND,'#a8b1ac',.8)
                for hole in p: self.poly(points(hole.get('points')),'url(#machine)','#a3aeae',.8)
        for e in list(root.iter('stairs'))+list(root.iter('ramp')):
            if self.level in [0,3.2] or (self.level==-1.2 and e.tag=='ramp'):
                a,b=points(objects[e.get('path')].get('points')); self.poly(corridor(a,b,float(e.get('width'))),'none','#a9b4ad',.9,'3 2')
        for id in ['a-cask','b-plinth','transformer','receiving-cradle','cleanlock-cask','cask-transfer','rear-switchboard','control-console','a-rear-screen','b-rear-screen']:
            e=objects[id]; x,y,_=map(float,e.get('position').split()); fill='#aab2b0' if self.level==0 else 'none'
            self.poly(rect(x,y,float(e.get('width')),float(e.get('depth'))),fill,'#99a4a3',.8,'' if self.level==0 else '2 2')
        for x,y,id in [(-34,14,'A'),(35,17,'B'),(-14,-33,'T'),(0,30,'D')]: self.tag(x,y,id)
        self.label(0,4,'MACHINE'); self.label(-7,-34,'RECEIVING')
        if self.level==0: self.label(-30,21,'HOT CELL'); self.label(30,22,'POWER')
        self.line([(-38,-39),(-28,-39)],INK,2); self.label(-33,-41,'10 m')
        self.line([(40,26),(40,32)],INK,1.5,arrow=True); self.label(40,35,'N')
        for x in [-40,-20,0,20,40]: self.label(x,-44,str(x),'tiny')
        self.page.text(self.x+18,630,'X meters • north ↑ • center (0,4) • same scale in all plans','tiny')

# Shared new upper A return: descend beyond the higher rear-link roof, then land in a small infill.
def a_return(p,active=True):
    if active:
        p.floor(rect(-28,18,6,6.5),HIGH); p.stair('S2',(-24.5,24.5),(-24.5,31.5),3,3.2,0)
        p.threshold('A rear',(-28,23),(-22,23))
    else:
        p.cut(rect(-26,24.5,3,5.5)); p.floor(rect(-26,30,5,3),STAIR); p.stair('S2',(-24.5,24.5),(-24.5,31.5),3,3.2,0)

# Read the archived native D profile rather than redrawing a circular pipe.
shell=objects['vessel-shell-01']; shell_points=points(shell.get('points'))
slice_count=next(i for i,v in enumerate(shell_points) if abs(v[1]-4)>.0001)
assert slice_count%2==0
profile_count=slice_count//2
DOUT=[(v[0],v[2]) for v in shell_points[:profile_count]]
DIN=[(v[0],v[2]) for v in shell_points[profile_count:slice_count]]
COIL=points(objects['field-coil-profile'].get('points'))

class Section:
    def __init__(self,page,x,y,w,h,xmin,xmax,zmin,zmax,title):
        self.page=page; self.x=x; self.y=y; self.w=w; self.h=h; self.xmin=xmin; self.zmin=zmin; self.sx=(w-125)/(xmax-xmin); self.sz=(h-85)/(zmax-zmin)
        page.box(x,y,w,h,'#fafaf6','#ccd3d0'); page.text(x+18,y+28,title,'head')
    def p(self,x,z): return self.x+65+(x-self.xmin)*self.sx,self.y+self.h-38-(z-self.zmin)*self.sz
    def poly(self,pts,fill,stroke=INK,dash=''): self.page.polygon([self.p(*q) for q in pts],fill,stroke,1.2,dash)
    def box(self,x,z,w,h,fill,stroke=INK): self.poly(rect(x,z,w,h),fill,stroke)
    def line(self,pts,color=INK,dash=''): self.page.line([self.p(*q) for q in pts],color,1.2,dash)
    def label(self,x,z,t,cls='dim'): self.page.text(*self.p(x,z),t,cls)
    def person(self,x,z):
        self.box(x-.2,z,.4,1.5,'#365c66'); cx,cy=self.p(x,z+1.65); self.page.s.append(f'<circle cx="{cx}" cy="{cy}" r="{.15*self.sz}" fill="#365c66"/>')
    def zmarks(self,levels,xmin,xmax):
        for z in levels:
            self.line([(xmin,z),(xmax,z)],'#c6d0c9','3 3'); self.label(xmin-.9,z,str(z))

def reactor_section(page,kind):
    s=Section(page,30,790,850,470,0,22,-9,17,'R–R · radial reactor section / meters')
    s.zmarks([-8.2,-2.55,0,3.2,6.9,16],0,21)
    s.poly(COIL,'none','#9ca9ad','4 3')
    if kind=='a':
        s.poly(DOUT,'#d9dedb','#73888d'); s.poly(DIN,VOID,'#73888d')
        s.box(8,-.4,4,4,VOID,VOID)
    else:
        s.poly(DOUT,'none','#73888d','4 3'); s.poly(DIN,'none','#73888d','4 3')
        s.poly(below(DOUT,-.35),'#d9dedb','#73888d'); s.poly(below(DIN,-.35),VOID,'#73888d')
    s.box(0,-5.7,2,13,'#baa59a'); s.box(14,-8.2,.7,5.4,MACHINE); s.box(16.5,-8.2,1,11,MACHINE)
    s.box(16.45,-.4,1.1,3.3,VOID,VOID)
    s.box(4.1,-.3,4.7,.3,GROUND); s.box(8,-.3,13,.3,GROUND)
    s.box(0,15.76,21,.24,GROUND); s.label(3,14.5,'Roof 16 · crane clearance remains above')
    s.label(.2,8,'Solenoid'); s.label(7,11,'TF envelope (projected)'); s.label(15,-7,'Cryostat'); s.label(17.7,-6,'Bioshield')
    if kind=='a':
        # Proposed lower port cut, represented by a white section opening.
        s.box(16.45,-2.55,1.1,5.4,VOID,VOID); s.box(8,-.3,13,.3,GROUND); s.box(12.8,-2.8,8.2,.25,LOW)
        s.person(15.4,-2.55); s.label(11.8,-4.8,'NEW outer service floor −2.55'); s.label(11.8,1.6,'W/E ground bridge 0')
        s.line([(18.4,-2.55),(18.4,-.3)],'#ac5d39'); s.label(18.7,-1.4,'2.25 m clear')
        s.label(2,-6,'D vessel: 19.4 Ø × 11.4 high')
    else:
        # Upper shell is absent at the proposed southern deck; ghost conveys source envelope.
        s.poly(DOUT,'none','#667f86','5 4'); s.box(4.4,2.95,3.4,.25,HIGH); s.box(7.8,2.95,13.2,.25,HIGH)
        s.person(6,3.2); s.person(6,0); s.label(9,4.7,'NEW upper deck +3.2'); s.label(9,1.3,'2.95 m clear below slab')
        s.label(2,-6,'Upper D outline is absent in chosen south sector')
        s.label(2,-7.5,'No occupied floor on vessel steel / no full upper ring')
    page.text(48,1284,'Section envelope study: projected machinery, explicit new floor levels; ports/supports require a compiled return.','note')

def transfer_section(page,kind):
    if kind=='a':
        s=Section(page,910,790,860,470,-35,-19,-3.5,8.5,'T1 · Cask transfer room / section X at Y=0')
        s.zmarks([-2.55,0,3.2,7.2],-34,-20)
        s.box(-34,-3.0,14,.3,LOW); s.box(-34,-3,.3,10.2,GROUND); s.box(-20.3,-3,.3,10.2,GROUND)
        s.box(-34,6.96,14,.24,GROUND); s.box(-34,-.3,2,.3,GROUND); s.box(-27,-.3,7,.3,GROUND)
        s.box(-32,-2.8,11,.25,LOW); s.person(-30,-2.55); s.person(-24,-2.55); s.person(-23,0)
        s.label(-31,5,'Open transfer well'); s.label(-26.7,2.6,'Retained transfer bridge 0'); s.label(-31.5,-1.6,'Lower room −2.55')
        s.line([(-21.3,-2.55),(-21.3,-.3)],'#ac5d39'); s.label(-25,-1.2,'2.25 m clear under bridge')
        page.text(928,1284,'S1 descends at the south end (see plan); B uses the same −2.55 / 0 bridge clearance.','note')
    else:
        s=Section(page,910,790,860,470,19,41,-1,8.5,'T1 · B work room / section X at Y=15')
        s.zmarks([0,3.2,4.8,7.2],20,40)
        s.box(20,-.3,20,.3,GROUND); s.box(20,0,.3,7.2,GROUND); s.box(39.7,0,.3,7.2,GROUND)
        s.box(20,6.96,20,.24,HIGH); s.box(20,2.95,10,.25,HIGH); s.box(27,0,5,2.1,MACHINE)
        s.box(29.8,3.2,.2,1.1,STAIR); s.person(24,3.2); s.person(23,0); s.person(35,0)
        s.line([(20,4.8),(40,4.8)],'#bb7651','5 3'); s.label(30,5,'Old 4.8 roof must rise'); s.label(22,7.6,'New roof 7.2 / underside 6.96')
        s.label(20.7,1.2,'Ground bypass'); s.label(27.5,1,'Plinth'); s.label(34,2.5,'B remains at 0')
        s.label(20.7,5.7,'Upper work room +3.2'); s.label(21,-.7,'Slab underside 2.95; ground route remains clear')
        page.text(928,1284,'Upper floor ends beside the plinth; S3/S4 enter on different sides of the work room.','note')

# A: lower machinery-access crescent + local wing stacking.
a=Sheet('a','FUSION · organic alternative A / lower pit + transfer rooms','Early occupied-volume comparison • B04 archived gray context • dimensions in meters • not compiled or combat accepted')
p=a.panel(0,'01 / LOWER  −2.55 + retained trench −1.2',-1.2)
p.floor(band(12.8,16.1,180,360),LOW); p.floor(rect(-32,-6,11,10),LOW); p.floor(rect(-24,2.5,11.2,3),LOW)
p.floor(rect(13,2.5,12,3),LOW); p.floor(rect(22,-1.5,4,7),LOW); p.stair('R1',(26,0),(32,0),3,-2.55,-1.2)
p.floor(rect(32,8,7,13),LOW); p.stair('R2',(35.5,2),(35.5,8),7,-1.2,-2.55); p.stair('S3',(36.5,21),(36.5,28),3,-2.55,0)
p.stair('S1',(-29.5,-13),(-29.5,-6),3,0,-2.55)
p.threshold('W lower',(-18,2.5),(-18,5.5)); p.threshold('E lower',(18,2.5),(18,5.5))
p.label(0,-11,'R12.8..16.1 / −2.55'); p.label(-27,-1,'Transfer lower'); p.tag(35,11,'B lower −2.55'); p.label(35,-7,'Retain −1.2')
p.line([(-34,0),(-20,0)],'#a75b3d',1.2,'6 4'); p.tag(-33,1.5,'T1')
a.notes(48,['S1: Cask ground → lower transfer room.','R1: lower cell → trench; R2 deepens only B bay.','S3: lower B → Control rear landing.','New lower ports pass beneath existing bridges.'])
p=a.panel(1,'02 / GROUND  0  + openings to lower rooms',0)
p.cut(rect(-32,-6,5,10)); p.cut(rect(-31,-13,3,7)); p.stair('S1',(-29.5,-13),(-29.5,-6),3,0,-2.55)
p.cut(rect(26,-1.5,6,3)); p.stair('R1',(26,0),(32,0),3,-2.55,-1.2)
p.cut(rect(32,2,7,19)); p.floor(rect(30,13,10,5),GROUND); p.tag(35,15,'B bridge 0')
p.cut(rect(35,21,3,7)); p.stair('S3',(36.5,21),(36.5,28),3,-2.55,0)
p.poly(rect(-29,-4,5,2),'none','#c05a3b',1.8,'3 2'); p.label(-28,-5,'Relocate cask'); p.poly(rect(33,21,4,1.2),'none','#c05a3b',1.8,'3 2')
p.floor(rect(27,21,4,1.2),MACHINE); a_return(p,False); p.label(-29,1,'OPEN WELL'); p.label(36,9,'OPEN WELL')
p.line([(0,4),(21,4)],'#a75b3d',1.2,'6 4'); p.tag(9,6.5,'R–R')
a.notes(638,['Plant A / B retained at 0; B spans deeper work bay.','Hatched areas replace current ground slabs.','Cask-transfer and B rear screen need relocation.','S2 adds small rear-link infill at ground landing.'])
p=a.panel(2,'03 / UPPER  +3.2  / bounded A rear return',3.2)
a_return(p,True); p.label(-25,21,'New rear link'); p.label(-19,3,'Retain gallery'); p.label(-27,16,'A upper')
p.threshold('Retain view',(-18,0),(-18,5)); p.label(17,-15,'No new upper reactor ring')
a.notes(1228,['S2: A landing → rear services / two-way stair.','Keep high rear-link roof until stair has descended.','Gallery remains local to A and west-port support.','Lower core / B complexity carries the alternative.'])
reactor_section(a,'a'); transfer_section(a,'a')
a.footer(['COLOR KEY  teal = new floor −2.55  |  gray = retained floor at panel level  |  pale gray = other B04 levels projected',
'Orange = stairs/ramps (arrow up); dashed orange threshold = new opening; hatch = machine space or ground-slab removal.',
'Profiles are authored footprint proposals, not route centerlines. B04 coordinates are retained; new rear infill and excavations are explicit.',
'Fixed envelopes: vessel19.4×11.4; TF9×17; solenoid4×13. New bioshield cells, basements and platform supports are fictional assembly adaptations.'])
a.save()

# B: upper partial torus and unequal attached service rooms.
b=Sheet('b','FUSION · organic alternative B / upper torus + service spine','Early occupied-volume comparison • B04 archived gray context • dimensions in meters • not compiled or combat accepted')
p=b.panel(0,'01 / LOWER  −1.2  / local transformer crossover',-1.2)
p.stair('R1',(26,0),(32,0),3,0,-1.2); p.tag(35,-6,'Existing trench'); p.label(23,3,'To bypass 0'); p.label(0,-12,'No lower pit route in this alternative')
b.notes(48,['R1 turns around the north transformer face.','Only a local ramp joins bypass and trench.','New slab opening above R1 preserves headroom.','Ground / upper route decisions remain dominant.'])
p=b.panel(1,'02 / GROUND  0  / retained ring and stair bases',0)
p.cut(rect(26,-1.5,6,3)); p.stair('R1',(26,0),(32,0),3,0,-1.2)
p.stair('S3',(28.5,3),(28.5,11),3,0,3.2); p.threshold('B stair door',(27,7),(30,7))
p.stair('S4',(25,20),(25,28),3,3.2,0); p.threshold('Rear stair',(23.5,24),(26.5,24)); a_return(p,False)
p.label(32,28,'Move console east'); p.label(0,-3,'Ring stays at 0'); p.line([(20,15),(40,15)],'#a75b3d',1.2,'6 4'); p.tag(40,18,'T1')
b.notes(638,['S3 rises beside B south entry; bypass stays open.','S4 descends from work room toward Control.','S2 provides A upper route with a rear exit.','Plant A / B remain ground-level reference anchors.'])
p=b.panel(2,'03 / UPPER  +3.2  / partial torus service spine',3.2)
p.floor(band(4.4,7.8,220,340),HIGH); p.floor(corridor((-18,-4.5),(-4.5,.2),3),HIGH); p.floor(corridor((5.7,1.9),(22,0),3),HIGH)
p.floor(rect(20,-1.5,4,13.5),HIGH)
p.floor([(20,11),(30,11),(30,21),(26.5,21),(26.5,20),(23.5,20),(23.5,21),(20,21)],HIGH)
p.stair('S3',(28.5,3),(28.5,11),3,0,3.2); p.stair('S4',(25,20),(25,28),3,3.2,0); a_return(p,True)
p.threshold('W upper',(-18,-6),(-18,-3)); p.threshold('E upper',(18,-1),(18,2)); p.threshold('B room',(20,11),(24,11))
p.floor(rect(-20,-5,2,2),MACHINE); p.floor(rect(21,8,2,2),MACHINE)
p.label(0,-4,'R4.4..7.8'); p.label(0,-7,'220°..340° / +3.2'); p.label(25,17,'B work room'); p.label(16,18,'Raise roof 7.2')
p.line([(0,4),(0,-17)],'#a75b3d',1.2,'6 4'); p.tag(4,-14,'R–R')
b.notes(1228,['Partial upper arc crosses ground ring without copying it.','Work-room offsets select lower views and upper exits.','East occupied roof rises from4.8 to7.2.','New openings / slab headers / supports need section return.'])
reactor_section(b,'b'); transfer_section(b,'b')
b.footer(['COLOR KEY  purple = new floor +3.2  |  gray = retained floor at panel level  |  pale gray = other B04 levels projected',
'Orange = stairs/ramps (arrow up); machine hatch is inaccessible; small dark work modules are provisional view returns, not cover quotas.',
'Upper reactor is a temporary partial deck in missing southern sectors. Full D profile in section is a dimension reference, not a rebuilt upper shell.',
'Compare high / low entry visibility, follower positions and both objective ownership states. No LOS, navigation, ballistics or timing acceptance is implied.'])
b.save()
print('Wrote complexity-organic-a.svg and complexity-organic-b.svg')
