"""Galini's terrain-following plan. Run with generated/galini/venv/bin/python3."""
import json,math
from pathlib import Path
from html import escape
from shapely import set_precision
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union
from shapely.affinity import rotate,translate,scale
P=Path(__file__).parent

def curve(points,width):
    # Deliberate cubic control points, with rounded, human-scale street edges.
    a,b,c,d=points
    pts=[]
    for n in range(25):
        t=n/24;u=1-t
        pts.append(tuple(u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k] for k in (0,1)))
    return LineString(pts).buffer(width/2,quad_segs=4,cap_style=2,join_style=1).simplify(.04)
def road(points,width):return LineString(points).buffer(width/2,quad_segs=4,cap_style=2,join_style=1)
def rect(cx,cy,w,d,angle=0):return translate(rotate(box(-w/2,-d/2,w/2,d/2),angle,origin=(0,0)),cx,cy)
def pts(poly):return [[round(x,3),round(y,3)] for x,y in list(poly.exterior.coords)[:-1]]
stairs=[
 ('S-CLIFF1','Cliff lower',(14,43,0),(10,49,2),6),
 ('S-CLIFF2','Cliff upper',(13,54,2),(18,60,4),6),
 ('S-SHORT','Bell Stair',(32,46,0),(28,56,4),6),
 ('S-GATE','Gate Stair',(48,55,0),(52,65,4),6),
 ('S-BOAT','Boat Stair',(84,66,0),(79,76,4),6),
]
def stairpoly(a,b,w):
    dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length*w/2,dx/length*w/2
    return Polygon([(a[0]+nx,a[1]+ny),(a[0]-nx,a[1]-ny),(b[0]-nx,b[1]-ny),(b[0]+nx,b[1]+ny)])
sp=[set_precision(stairpoly(a,b,w),.001) for _,_,a,b,w in stairs]
side_sp=[set_precision(stairpoly(a,b,w+.42),.001) for _,_,a,b,w in stairs]
# Same-height slabs intentionally overlap stair ends by ~7.8mm in the final scaled plan.
cap_cuts=[]
for _,_,a,b,w in stairs:
 dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);amount=.006
 aa=(a[0]+dx/length*amount,a[1]+dy/length*amount,a[2]);bb=(b[0]-dx/length*amount,b[1]-dy/length*amount,b[2])
 cap_cuts.append(set_precision(stairpoly(aa,bb,w+.42),.001))
cut=unary_union(cap_cuts)
raw=[
 ('F-T','Ferry Piazza',0,Polygon([(34,4),(47,2),(58,8),(60,16),(52,25),(40,24),(33,17)])),
 ('F-W','Sea Ribbon',0,curve([(39,21),(21,17),(12,28),(14,44)],8).union(Point(14,40).buffer(6,quad_segs=5))),
 ('F-M0','Bakery Alley',0,curve([(46,22),(39,26),(43,31),(46,34)],7)),
 ('F-M','Olive Piazza',0,Polygon([(36,32),(47,29),(58,34),(61,42),(56,51),(45,54),(36,47),(32,40)])),
 ('F-AS0','Bell Alley',0,road([(36,41),(33,43),(32,47)],7)),
 ('F-SWITCH','Sea Landing',2,Polygon([(6,45),(14,48),(17,54),(12,58),(5,53)])),
 ('F-A','Chapel Court',4,Polygon([(6,62),(13,57),(23,56),(32,59),(36,66),(33,74),(24,80),(15,79),(6,73),(4,67)]).union(road([(28,55),(27,62)],7))),
 ('F-GATE0','Gate Foot',0,road([(49,49),(48,56)],6).union(Point(48,55).buffer(3.8,quad_segs=5))),
 ('F-M1','Town Gate',4,Polygon([(47,62),(56,64),(60,71),(57,76),(52,78),(45,73),(44,67)]).union(road([(53,73),(51,80),(49,84)],7))),
 ('F-CT','Upper Ribbon',4,curve([(27,76),(40,91),(59,82),(81,78)],8).union(road([(75,78),(80,76)],8)).union(Point(79,76).buffer(4,quad_segs=5)).union(Polygon([(42,84),(46,96),(57,94),(62,86),(54,81)]))),
 ('F-E0','Taverna Stepside',0,curve([(56,18),(66,13),(78,18),(81,26)],8)),
 ('F-E','Harbor Crescent',0,curve([(81,25),(87,32),(73,36),(85,46)],8).union(Point(81,26).buffer(4.5,quad_segs=6)).union(road([(85,44),(82,52),(83,57)],8))),
 ('F-BM','Fishmarket',0,curve([(56,45),(64,40),(65,57),(74,58)],7).union(Polygon([(62,46),(68,44),(73,48),(74,57),(68,61),(62,55)]))),
 ('F-B','Boat Court',0,Polygon([(70,55),(80,51),(91,53),(97,61),(95,70),(87,77),(81,72),(78,67),(73,67),(68,61)])),
]
raw += [
 ('F-LAUNDRY','Laundry Court',0,Polygon([(19,29),(27,28),(31,33),(29,40),(22,42),(18,37)])),
 ('F-WINERY','Winery Vault',0,Polygon([(23,39),(29,37),(34,42),(31,48),(25,49),(22,44)])),
 ('F-W-CROSS','Wine Lane',0,curve([(16,40),(20,39),(22,47),(27,44)],5)),
 ('F-TAVERNA','Taverna Court',0,Polygon([(58,22),(66,23),(70,29),(67,35),(60,34),(56,28)])),
 ('F-TMOUTH','Taverna Court Mouth',0,road([(62,18),(62,23),(63,27)],6)),
 ('F-ARCADE','Taverna Arcade',0,curve([(66,32),(73,35),(64,40),(63,46)],5.5)),
 ('F-CUSTOMS','Customs Court',0,Polygon([(58,50),(65,50),(70,55),(68,61),(61,62),(56,57)]).union(road([(53,49),(59,55),(67,59),(72,60)],5.5)).union(road([(49,54),(59,56)],5))),
 ('F-POST','Post Office Passage',4,Polygon([(56,85),(61,89),(70,88),(74,83),(69,80),(62,80)])),
]
floors=[]
for id,label,z,shape in raw:
    shape=set_precision(shape.simplify(.04),.001).difference(cut)
    parts=[shape] if shape.geom_type=='Polygon' else list(shape.geoms)
    for n,part in enumerate(parts):
        if part.area>.05:floors.append((id if n==0 else id+'-'+str(n),label,z,pts(part)))
upper=unary_union([Polygon(f[3]) for f in floors if f[2]==4])
floors=[(id,label,z,pts(Polygon(pp).difference(upper)) if id=='F-SWITCH' else pp) for id,label,z,pp in floors]
objects=[]
def obj(id,label,shape,z,h,kind):objects.append({'id':id,'label':label,'points':pts(shape),'z':z,'height':h,'kind':kind})
obj('O-CHAPEL','Blue dome chapel',rect(15,71,8,9,-18),4,7,'mass')
obj('O-CISTERN','Cistern',Point(23,65).buffer(2.2,quad_segs=4),4,2.5,'tall')
obj('O-A-PLANTER','Olive planter',rect(31,68,3,2,20),4,1.1,'low')
obj('O-BAKERY','Bakery corner',rect(42.5,27.5,3,3,20),0,3.2,'tall')
obj('O-FOUNTAIN','Village fountain',Point(46,41).buffer(1.8,quad_segs=4),0,1.1,'low')
obj('O-MID-WALL','Bell house corner',rect(35.5,45,3,4,-25),0,3.2,'tall')
obj('O-T-GATE','Ferry arcade screen',rect(51,17,3,5,-25),0,3.2,'tall')
obj('O-TOWN','Town gate screen',rect(53,70,5,3,-15),4,3.2,'tall')
obj('O-ROTATE','Upper lane corner',rect(61,82,3,4,-15),4,3.2,'tall')
obj('O-MARKET','Fishmarket corner',rect(65,50,3.5,4,-15),0,3.2,'tall')
obj('O-BOAT','Boathouse',rect(88,61,6,5,-15),0,3.4,'mass')
obj('O-B-SALT','Salt bins',rect(78,60,3,3,20),0,1.1,'low')
obj('O-BACK','Retaining house',rect(72.5,72,5.5,10,-8),0,8,'mass')
obj('O-COAST','Boat repair shed',rect(88,47,6,7,-15),0,4.2,'mass')
obj('O-WEST','Seafront planter',Point(14,32).buffer(1.4,quad_segs=4),0,1.1,'low')
obj('O-EAST','Harbor planter',Point(80,34).buffer(1.3,quad_segs=4),0,1.1,'low')
obj('O-CUSTOMS','Customs office mass',rect(62,55,5,6,-20),0,5.8,'mass')
obj('O-LAUNDRY','Wash basin',Point(25,33).buffer(1.4,quad_segs=4),0,1.1,'low')
obj('O-TAVERNA','Taverna fountain',Point(63,28).buffer(1.4,quad_segs=4),0,1.1,'low')
obj('O-WINE-PILLAR','Vault pillar',Point(27,43).buffer(.55,quad_segs=3),0,3.5,'tall')
SCALE=1.3
floors=[(id,label,z,[[round(x*SCALE,3),round(y*SCALE,3)] for x,y in pp]) for id,label,z,pp in floors]
stairs=[(id,label,(a[0]*SCALE,a[1]*SCALE,a[2]),(b[0]*SCALE,b[1]*SCALE,b[2]),w*SCALE) for id,label,a,b,w in stairs]
sp=[set_precision(stairpoly(a,b,w),.001) for _,_,a,b,w in stairs]
side_sp=[set_precision(stairpoly(a,b,w+.56),.001) for _,_,a,b,w in stairs]
for o in objects:
 o['points']=[[round(x*SCALE,3),round(y*SCALE,3)] for x,y in o['points']]
 if o['id'] in ('O-CHAPEL','O-BOAT'):
  o['kind']='interior';o['doorEdges']=[0,2];o['doorWidth']=3.4
# Monotone west-edge extension closes the independently observed offset-spawn slit.
for o in objects:
 if o['id']=='O-TOWN':o['points']=[[71.535,88.275],[72.544,92.043],[66.265,93.725],[65.465,93.725],[64.456,89.957]]
# Local masonry returns close residual blind pockets found in compiled B07.
clear_stairs=unary_union([stairpoly(a,b,w-.4) for _,_,a,b,w in stairs])
repairs=[
 ('O-J-SWITCH','Switch retaining return',Polygon([(15.15,74.7),(16.2,74.7),(16.65,75.9),(15.6,76)]),2,5.8),
 ('O-J-GATE','Gate landing return',Polygon([(57.7,72.8),(58.6,72.6),(59.5,74.2),(59.4,75.1),(58.2,74.7)]),0,5.8),
 ('O-J-BOAT','Boat retaining return',Polygon([(97.9,95.1),(99.5,95.1),(99.9,96.4),(99.25,97.2),(98,97)]),4,4),
 ('O-J-BELL','Bell house cheek',Polygon([(45.35,61.35),(46.2,61.45),(46.2,62.3),(45.35,62.2)]),0,3.2),
 ('O-J-MARKET','Market party wall',Polygon([(82.858,67.896),(82.521,66.995),(82.75,67.75),(82.975,68.1),(82.839,68.15)]).convex_hull.buffer(.3,join_style=2)),
]
for item in repairs:
 id,label,shape=item[:3];z,h=item[3:] if len(item)==5 else (0,3.2)
 shape=set_precision(shape.difference(clear_stairs),.001)
 if shape.geom_type!='Polygon':shape=max(shape.geoms,key=lambda p:p.area)
 objects.append({'id':id,'label':label,'points':pts(shape),'z':z,'height':h,'kind':'mass'})
for o in objects:
 if o['id']=='O-MID-WALL':o['points']=pts(Polygon(o['points']).buffer(.3,join_style=2))
# Architecture shutters and arcades are presentation; these roofs have real headroom.
roofs=[{'id':'R-WINERY','floor':'F-WINERY','z':3.5},{'id':'R-ARCADE','floor':'F-ARCADE','z':3.5},{'id':'R-POST','floor':'F-POST','z':7.5}]
# Explicit boundary geometry: every shared walking interface is open.
allshapes=[Polygon(f[3]) for f in floors]+side_sp
union=unary_union([set_precision(s,.001) for s in allshapes])
assert union.geom_type=='Polygon',union.geom_type
walls=[]
for ring in [union.exterior,*union.interiors]:
    coords=list(ring.coords)
    for a,b in zip(coords,coords[1:]):
        line=LineString([a,b]);mid=line.interpolate(.5,normalized=True)
        # Native stair enclosures, not planar walls, own the sloped sides.
        if any(line.intersection(q.boundary.buffer(.018)).length>line.length*.9 for q in side_sp):continue
        near=sorted(floors,key=lambda f:Polygon(f[3]).distance(mid))
        z=near[0][2]
        x,y=mid.x,mid.y
        coast=(x<18*SCALE and y<76*SCALE and (x<9*SCALE or y<44*SCALE)) or (x>90*SCALE and y>51*SCALE) or (x>83*SCALE and y<43*SCALE) or y<5*SCALE
        walls.append({'id':f'W-{len(walls):03}','a':[round(a[0],3),round(a[1],3),z],'b':[round(b[0],3),round(b[1],3),z],'height':1.2 if coast else (5.8 if z<4 else 3.2),'coast':coast})
data={'revision':'L04','floors':floors,'stairs':stairs,'objects':objects,'walls':walls,'roofs':roofs,'scale':SCALE,'spawns':{'T':[57.2,14.3,0],'CT':[66.3,117,4]},'objectives':{'A':[35.1,83.2,4],'B':[107.9,81.9,0]}}
(P/'plan.json').write_text(json.dumps(data,indent=2)+'\n')
def draw(name,sketch=False):
    s=['<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="1140" viewBox="0 0 1360 1140">','<rect width="1360" height="1140" fill="#f5f0e6"/>','<style>text{font-family:Arial,sans-serif;fill:#203e44}.label{font-size:13px;font-weight:bold;paint-order:stroke;stroke:#fff8eb;stroke-width:3px;stroke-linejoin:round}</style>']
    def xy(x,y):return (65+x*7.5,1080-y*7.5)
    def poly(pp,color,stroke='#4c6769',sw=1):
        return '<polygon points="'+' '.join(f'{xy(x,y)[0]:.1f},{xy(x,y)[1]:.1f}' for x,y in pp)+f'" fill="{color}" stroke="{stroke}" stroke-width="{sw}"/>'
    s.append('<rect x="42" y="90" width="1010" height="1010" rx="18" fill="#95c9ce"/>')
    island=[(28,0),(54,-1),(65,8),(80,11),(90,20),(94,37),(100,50),(102,72),(91,88),(70,101),(39,102),(20,94),(3,78),(-1,62),(1,45),(5,24),(16,14),(29,15)]
    s.append(poly([(x*SCALE,y*SCALE) for x,y in island],'#c6b99e','#9d947f',3))
    for f in floors:s.append(poly(f[3],['#fcf1d7','#ecddb4','#dbcca6'][0 if f[2]==0 else 1 if f[2]==2 else 2]))
    for (id,label,a,b,w),q in zip(stairs,sp):
        s.append(poly(pts(q),'#b5cabd'))
        dx,dy=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dy);nx,ny=-dy/l*w/2,dx/l*w/2
        for n in range(1,round((b[2]-a[2])/.16)):
            t=n/round((b[2]-a[2])/.16);x=a[0]+dx*t;y=a[1]+dy*t;X,Y=xy(x+nx,y+ny);XX,YY=xy(x-nx,y-ny)
            s.append(f'<path d="M{X} {Y} L{XX} {YY}" stroke="#67867d"/>')
    if not sketch:
        for w in walls:
            X,Y=xy(*w['a'][:2]);XX,YY=xy(*w['b'][:2]);s.append(f'<path d="M{X} {Y} L{XX} {YY}" stroke="{chr(35)+"428b97" if w["coast"] else chr(35)+"203e44"}" stroke-width="4"/>')
    for roof in roofs:
        f=next(f for f in floors if f[0]==roof['floor']);s.append(poly(f[3],'#d2d4bf','#718c87',2))
    for o in objects:
        s.append(poly(o['points'],'#9bb7a4' if o['kind']=='low' else '#fcf1d7' if o['kind']=='interior' else '#627d82','#627d82',4 if o['kind']=='interior' else 1))
        if o['kind']=='interior':
            pp=o['points']
            for edge in o['doorEdges']:
                a,b=pp[edge],pp[(edge+1)%len(pp)];dx,dy=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dy);cx,cy=(a[0]+b[0])/2,(a[1]+b[1])/2
                X,Y=xy(cx-dx/l*o['doorWidth']/2,cy-dy/l*o['doorWidth']/2);XX,YY=xy(cx+dx/l*o['doorWidth']/2,cy+dy/l*o['doorWidth']/2)
                s.append(f'<path d="M{X} {Y} L{XX} {YY}" stroke="#fcf1d7" stroke-width="8"/>')
    labels=[(44,7,'T / FERRY PIAZZA'),(51,92,'CT / UPPER TOWN'),(22,75,'CHAPEL COURT +4'),(86,69,'BOAT COURT 0'),(46,47,'OLIVE PIAZZA'),(18,26,'SEA RIBBON'),(9,51,'+2 LANDING'),(30,50,'BELL STAIR'),(64,49,'FISHMARKET'),(83,31,'HARBOR CRESCENT'),(69,19,'TAVERNA'),(35,82,'UPPER RIBBON +4'),(54,74,'GATE +4'),(25,32,'LAUNDRY'),(27,42,'WINERY'),(63,28,'TAVERNA COURT'),(68,38,'ARCADE'),(63,57,'CUSTOMS'),(65,87,'POST OFFICE')]
    for x,y,t in labels:
        X,Y=xy(x*SCALE,y*SCALE);s.append(f'<text x="{X}" y="{Y}" text-anchor="middle" class="label">{escape(t)}</text>')
    for id,(x,y,z) in data['objectives'].items():
        X,Y=xy(x,y);s.append(f'<circle cx="{X}" cy="{Y}" r="19" fill="#be804d" stroke="#fff" stroke-width="3"/><text x="{X}" y="{Y+6}" text-anchor="middle" font-size="20" font-weight="bold">{id}</text>')
    for x in range(0,131,10):
        X,Y=xy(x,0);s.append(f'<text x="{X}" y="1110" font-size="12" text-anchor="middle">{x}</text>')
    for y in range(0,131,10):
        X,Y=xy(0,y);s.append(f'<text x="30" y="{Y+4}" font-size="12" text-anchor="end">{y}</text>')
    sidebar=['N ↑ / +Y','7.5 pixels = 1 meter','','Sand floor: 0m','Light ochre: +2m','Ochre floor: +4m','Hatch: real stair flight','Dark: tall solid mass','Sage: 1.1m low cover','','Sea Ribbon follows cliff','Switchback via +2 landing','Irregular civic piazzas','Bell Stair cuts diagonally','Harbor follows headland','Upper lane bends inland','','L04 expands playable depth.','','Boundary: 5.8m at 0','Boundary: 3.2m at +4','Teal sea guards: 1.2m','Stair sidewalls: 3.2m','','Stairs width 7.8m.','Risers at most .16m.','No jump-only transfers.','','New: local split/rejoin loops','Laundry / Winery / Customs','Chapel + boat interiors','Post-office rotation passage','','Exact IDs / corners:','plan.json','Heights / assumptions:','layout-packet.md']
    for n,t in enumerate(sidebar):s.append(f'<text x="1090" y="{116+23*n}" font-size="14">{escape(t)}</text>')
    s.append('<rect width="1360" height="80" fill="#f5f0e6"/><text x="44" y="38" font-size="28" font-weight="bold">GALINI / '+('EXPANDED SPATIAL SKETCH S04' if sketch else 'EXPANDED TOWN LAYOUT L04')+'</text><text x="44" y="65" font-size="15">5v5 defusal · calm Greek coastal town · curved cliff roads / piazzas / switchback stairs · meters / Z-up</text></svg>')
    (P/name).write_text('\n'.join(s))
draw('sketch-r04.svg',True);draw('layout.svg')
print(json.dumps({'floors':len(floors),'walls':len(walls),'playArea':round(union.area)}))
