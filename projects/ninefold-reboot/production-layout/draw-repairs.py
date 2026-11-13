"""Review-only exact construction delta overlay; does not author AML."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET,html
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
P=Path(__file__).parents[1];old=json.loads((P/'layout-l02/layout-data.json').read_text());new=json.loads((P/'production-layout/layout-data-r08.json').read_text());aml=ET.parse(P/'level.aml').getroot()
paths={e.attrib['id']:e.attrib for e in aml.findall('path')};profiles={e.attrib['id']:ET.tostring(e,encoding='unicode') for e in aml.findall('profile')}
ids=['S1-crest-bearing','CORE-FOOTING']+[e.attrib['id'] for e in aml.iter() if e.tag in ['box','canopy','wall'] and (e.attrib.get('id','').startswith(('J-','WELL-')) or e.attrib.get('id','').endswith('-bearing'))]
objects=[]
for e in aml.iter():
 if e.attrib.get('id') in ids or e.tag=='stairs':
  row={'type':e.tag,**e.attrib}
  for key in ['path','underside-profile','top-profile']:
   if key in row:row[key+'-data']=paths.get(row[key])
  if 'profile' in row:row['profile-data']=profiles.get(row['profile'])
  objects.append(row)
oldwalls={w['id']:w for w in old['boundaryWalls']};newwalls={w['id']:w for w in new['boundaryWalls']}
report={'revision':'R08','sourceSha256':hashlib.sha256((P/'level.aml').read_bytes()).hexdigest(),'acceptedLayoutSha256':hashlib.sha256((P/'layout-l02/layout-data.json').read_bytes()).hexdigest(),'changes':[{'id':'AWNING-JOIN','floorAdd':list(LineString([[36,22],[40,28]]).buffer(2.5,cap_style=2,join_style=2).exterior.coords),'floorZ':0,'wallRepairZoneBuffer':.6,'contextSetbackBuffer':.45,'purpose':'Realize the already intended Awning to Underpass connection; J10 walks that link directly.'},{'id':'D-PAPER-lintel','newEndpoint':[24,40],'oldEndpoint':[24,41],'purpose':'Clear the S1 side of the ascent, preserving the ground movement portal.'},{'id':'ROOF-JOINTS','buildings':['F1','F2','F5','F6'],'newThickness':.25,'oldThickness':.24,'roofTopsUnchanged':True},{'id':'WELL-ATTACHMENT',**new['constructionRepairs'],'purpose':'Remove detached ground-wall fins; attach ground facade to loft through real nonplayable setback returns. Upper V-WELL aperture and roof hole unchanged.'}], 'nativeRepairObjects':objects,'awningWalls':[w for w in new['boundaryWalls'] if w['id'].startswith('AWNING-')],'journeyChanges':[{ 'id':j['id'],'waypoints':j['waypoints']} for j in new['journeys'] if j['id'] in ['J02','J05','J10']],'limits':'Overlay supplements the frozen L02 drawing. Full current AML is authoritative; no new strategic edge or objective, no changed player body.'}
(P/'production-layout/physical-repairs-r08.json').write_text(json.dumps(report,indent=2)+'\n')
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1040" viewBox="0 0 1500 1040"><style>text{font-family:Arial,sans-serif;fill:#233b3d}.title{font-size:27px;font-weight:700}.h{font-size:21px;font-weight:700}.body{font-size:17px}.tiny{font-size:14px}.old{stroke:#b35c58;stroke-dasharray:8 5;fill:none;stroke-width:2}.new{stroke:#254d4a;fill:#bcd3c6;stroke-width:2}</style><rect width="1500" height="1040" fill="#faf8f1"/>']
def txt(x,y,t,cls='body'):s.append(f'<text x="{x}" y="{y}" class="{cls}">{html.escape(t)}</text>')
def line(x1,y1,x2,y2,stroke='#254d4a',width=2,dash=''):s.append(f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
def box(x,y,w,h,fill='#e9eee7'):s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="#83948a"/>')
txt(35,42,'Ninefold R08 · physical realization overlay on accepted L02','title');txt(35,70,'Local repairs preserve the intended route graph and body. Full dimensions and stable IDs: physical-repairs-r08.json.','body')
# Awning map
box(25,95,710,410);txt(45,125,'A · Awning paving joins the intended through-street','h')
ox,oy,sc=57,465,14
tr=lambda p:(ox+(p[0]-24)*sc,oy-(p[1]-16)*sc)
def drawgeom(g,fill,stroke,width=1,dash=''):
 for p in ([g] if g.geom_type=='Polygon' else g.geoms):
  if p.geom_type!='Polygon':continue
  q=' '.join(f'{tr(v)[0]},{tr(v)[1]}' for v in p.exterior.coords);s.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
clip=Polygon([[24,16],[55,16],[55,39],[24,39]])
for d,fill,stroke,dash in [(new,'#d3e2d3','#70917c',''),(old,'none','#b35c58','5 4')]:
 g=unary_union([Polygon(p['outer'],p['holes']) for p in d['floors'][0]['polygons']]).intersection(clip);drawgeom(g,fill,stroke,1.5,dash)
join=LineString([[36,22],[40,28]]).buffer(2.5,cap_style=2,join_style=2);drawgeom(join,'#8ebba3','#254d4a',2)
chain=next(j for j in new['journeys'] if j['id']=='J10')['waypoints'];q=' '.join(f'{tr(p)[0]},{tr(p)[1]}' for p in chain);s.append(f'<polyline points="{q}" fill="none" stroke="#1f666d" stroke-width="3"/>')
for p in chain:
 x,y=tr(p);s.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#1f666d"/>')
txt(493,192,'Underpass →','body');txt(65,485,'Green: actual new join. Red dashed: L02 floor edge. J10 blue: direct link walk.','tiny')
# Well section
box(760,95,715,410);txt(780,125,'B · F1 courtyard section at x48, looking west','h')
X=lambda y:800+(y-38)*35;Y=lambda z:465-z*30
for y in [42,51]:
 s.append(f'<rect x="{X(y)-5}" y="{Y(9.5)}" width="10" height="285" class="old"/>');box(X(y)-5,Y(3.2),10,96,'#9eb8aa')
for y in [41,52]:box(X(y)-5,Y(6.65),10,(6.65-3.2)*30,'#bacabd')
for a,b in [(38,41),(52,56)]:box(X(a),Y(6.9),(b-a)*35,.25*30,'#b5bbaa');box(X(a),Y(3.2),(b-a)*35,.24*30,'#b5bbaa')
for a,b in [(41,42.15),(50.85,52)]:box(X(a),Y(3.2),(b-a)*35,.24*30,'#629d85')
line(X(38),Y(0),X(56),Y(0));txt(X(43),Y(1.3),'Ground lightwell','body');txt(X(44),Y(5.2),'Open sky','body')
for z in [0,3.2,6.9,9.5]:txt(1400,Y(z)+4,f'z{z}','tiny')
txt(780,485,'Red: removed 9.5 m remnants. Green returns: z2.96–3.2; aperture unchanged.','tiny')
# Stair profile
box(25,530,710,475);txt(45,562,'C · Enclose unusable underflight space, retain clear links','h')
X2=lambda x:70+x*45;Y2=lambda z:780-z*42
for x,z in [(0,0),(12,3.2)]:pass
poly=[(0,-.24),(9.9,-.24),(9.9,2.4),(12,2.96),(12,3.2),(0,0)];pts=' '.join(f'{X2(x)},{Y2(z)}' for x,z in poly);s.append(f'<polygon points="{pts}" class="new"/>')
for i in range(20):line(X2(i*.6),Y2((i+1)*.16),X2((i+1)*.6),Y2((i+1)*.16));line(X2(i*.6),Y2(i*.16),X2(i*.6),Y2((i+1)*.16))
line(X2(12),Y2(3.2),X2(14),Y2(3.2));line(X2(12),Y2(2.96),X2(14),Y2(2.96));txt(75,810,'S1–S4: first 9.9 m enclosed to ground; last 2.1 m remains sloped.','body');txt(75,838,'S3 ground link crosses below the receiving landing, 2.96 m clear.','body')
txt(75,880,'S5: first 2.3 m enclosed only above z3.2; ground remains open.','body');txt(75,908,'S6: normal sloped underside. All six retain 20 × 0.16 m risers,','body');txt(75,935,'0.60 m treads, 4 m width and 1.1 m graded guards.','body');txt(75,970,'Bearing strips under outward guards are 0.18 m thick; exact paths in JSON.','tiny')
# Other exact repairs
box(760,530,715,475);txt(780,562,'D · Remaining interfaces and scope','h')
for y,t in enumerate(['S1 crest bearing: x33, y40–44, top2.96, thickness0.30.', 'Paper lintel ends at y40 instead of y41 beside S1.', 'S3 upper journey turns at y60 before entering Boiler west.', 'J02 turns from (25,15) inside the court, after the return wall.', 'F1/F2/F5/F6 roof thickness0.25; top elevations unchanged.', 'Microjoint caps close wall/guard seams; see stable J-* IDs.', 'CORE footing: x56–62 / y43–47 / z0–3.2, outside the Well.', 'No added window, objective, movement edge, or body change.']):txt(785,606+y*36,t,'body')
txt(785,927,'Validation: strict floor gaps; full physical walk/camera evidence separate.','tiny');txt(785,957,'R08 differs from R07 only in descriptive metadata, not physical geometry.','tiny');txt(35,1030,'This is an author construction overlay, not independent gameplay or architecture acceptance.','tiny');s.append('</svg>');(P/'production-layout/physical-repairs-r08.svg').write_text('\n'.join(s))
