from pathlib import Path
import json,base64,html,sys,math
from xml.etree.ElementTree import parse
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,box
R=Path(__file__).resolve().parents[2];E=Path(__file__).parent;D=json.loads((E/'construction.json').read_text());P=json.loads((R/'planning/stair-comparison-p01.json').read_text());native=D['native'];root=parse(R/'level-c02.aml').getroot()
profiles={e.get('id'):e for e in root.findall('profile')};S=['<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1150"><rect width="1500" height="1150" fill="#f7f2e8"/><style>text{font-family:Arial;fill:#203c42}.title{font-size:25px;font-weight:bold}.sub{font-size:17px}.label{font-size:14px;paint-order:stroke;stroke:#f7f2e8;stroke-width:3px}</style><text x="35" y="35" class="title">LAST LIGHT / C02 · native curve experiment and construction repairs</text><text x="35" y="64" class="sub">Exact native source boundaries; C01 remains baseline · independent compiled decision pending</text>']
def shape(e):
 ps=lambda s:[[float(v)for v in p.split()][:2]for p in s.split(';')]
 return Polygon(ps(e.get('points')),[ps(h.get('points'))for h in e.findall('hole')])
def polygons(g):return [g]if g.geom_type=='Polygon'else list(g.geoms)if hasattr(g,'geoms')else[]
X=lambda x:60+(x-26)*27;Y=lambda y:780-(y-32)*27
for e in root.find('assembly'):
 if e.tag not in ['extrusion','slab']:continue
 if e.get('group')in ['roof','glazing']or e.get('id','').startswith('RC-'):continue
 p=profiles.get(e.get('profile'))
 if p is None:continue
 g=shape(p).intersection(box(26,32,55,57))
 color='#d3c5b0'if e.tag=='slab'else'#506a6d'
 if e.get('group')in ['guard','infill']:color='#b6945c'
 if e.get('id','').startswith('CX1-'):color='#c74d70'
 for q in polygons(g):
  if not hasattr(q,'exterior'):continue
  pts=' '.join(f'{X(x)},{Y(y)}'for x,y in q.exterior.coords);S.append(f'<polygon points="{pts}" fill="{color}" fill-opacity=".48" stroke="#405b5f" stroke-width=".6"/>')
for seg in native['segments']:
 ps=[seg['left'][0],seg['right'][0],seg['right'][1],seg['left'][1]];S.append('<polygon points="'+' '.join(f'{X(p[0])},{Y(p[1])}'for p in ps)+'" fill="#c8b378" stroke="#776849" stroke-width="1"/>')
for route,color in [(P['paths']['lower-change'],'#28858b'),(P['paths']['receiving-retreat'],'#8d4474')]:S.append('<polyline points="'+' '.join(f'{X(p[0])},{Y(p[1])}'for p in route if 26<=p[0]<=55 and 32<=p[1]<=57)+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-dasharray="6 4"/>')
positions={'C-LAND':([46.2,52.65],15,-16),'C-SIDE':([43,55],-40,-14),'C-INFO':([43,49],12,17),'INFO-LOW':([37.5,39],-100,24),'W-LOOK retired eye pair':([41,39],10,16),'Late leader':(P['positions']['C-LATE'],-5,-18),'3m follower':(P['positions']['C-FOLLOW'],-120,20),'Lower G1':([42,52],-90,-10)}
for id,(p,dx,dy)in positions.items():S.append(f'<circle cx="{X(p[0])}" cy="{Y(p[1])}" r="4" fill="#aa295b"/><text x="{X(p[0])+dx}" y="{Y(p[1])+dy}" class="label">{id}</text>')
S.append(f'<rect x="{X(37)}" y="{Y(39.5)}" width="{.5*27}" height="27" fill="#29857b" fill-opacity=".45"/>')
notes=['NATIVE REALIZATION','R13, sweep80°, 24 × .15m','Width4 / geometric guard clear3.76','Tested body envelope3.2m','Tangent receiving:3.1 ×4m on F-U','Custom soffit opens at17/24 run','Late soffit2.2 →3.25m','Native sampled run18.150503m','','MAGENTA = CONSTRUCTION REPAIRS','Footings beneath early guard overhang','Two non-occupiable slab-cut tips filled','Old straight arrival physically guarded','','O-W INFORMATION CHANGE','Upper admitted post43,49,+3.6','Old lower41,39 loses eye pair','Useful lower bandx37..37.5','y38.5..39.5: all6 stand rays open','Paired crouch / side / landing blocked','3.5m lateral move from old stance','','Dashed teal: retained lower G1','Dashed purple: north retreat','All dimensions metres / Z-up']
for i,t in enumerate(notes):S.append(f'<text x="930" y="{110+i*25}" class="sub">{html.escape(t)}</text>')
S.append('<text x="35" y="850" class="title">Native centerline section · custom underside is independent of walking top</text>')
L=native['length'];spring=L*17/24;XX=lambda s:55+s*65;YY=lambda z:1110-z*55
outline=[(0,0)]
for n in range(24):outline.extend([(n*L/24,(n+1)*.15),((n+1)*L/24,(n+1)*.15)])
outline.extend([(L,3.25),(spring,2.2),(spring,0)])
S.append('<polygon points="'+' '.join(f'{XX(x)},{YY(z)}'for x,z in outline)+'" fill="#c8b378" stroke="#405b5f" stroke-width="2"/>')
for z in [0,2.2,3.25,3.6]:S.append(f'<text x="1280" y="{YY(z)+4}" class="sub">Z{z}</text>')
S.append('<text x="910" y="1045" class="label">Lower path: actual r.4 / height2 passes both ways</text><text x="910" y="1075" class="label">Finite disk vertical clearance min2.443m</text></svg>')
(E/'layout-c02.svg').write_text('\n'.join(S))
# Boards retain the actual source-matched captures without scene alteration.
views=json.loads((R/'views-c02.json').read_text());out=Path('generated/last-light-reboot-c02-boards');out.mkdir(exist_ok=True);rows=[]
for v in views:
 p=Path('generated/last-light-reboot-c02-additional-views')/(v['id']+'.png')
 if not p.exists():p=Path('generated/last-light-reboot-c02-final-views')/(v['id']+'.png')
 if p.exists():rows.append((v['id'],p))
for start in range(0,len(rows),12):
 ss=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1030"><rect width="1600" height="1030" fill="#f7f2e8"/><style>text{font:14px Arial;fill:#203c42}</style>',f'<text x="20" y="26" style="font-size:22px">Last Light C02 / actual native artifact views {start+1}–{min(start+12,len(rows))}</text>']
 for i,(id,p)in enumerate(rows[start:start+12]):
  x=i%4*400;y=44+i//4*326;url='data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode();ss.append(f'<image href="{url}" x="{x}" y="{y}" width="400" height="300"/><text x="{x+8}" y="{y+318}">{html.escape(id)}</text>')
 ss.append('</svg>');(out/f'board-{start//12+1:02}.svg').write_text('\n'.join(ss))
print(len(rows),'captured views')
