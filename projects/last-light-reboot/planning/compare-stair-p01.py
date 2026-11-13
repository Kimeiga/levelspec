"""P01 local curved-ascent comparison. Paper geometry only; C01 AML stays unchanged."""
from pathlib import Path
import sys,json,math,hashlib
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,Point,LineString,box
from shapely.ops import unary_union
from xml.sax.saxutils import escape
R=Path(__file__).parent;D=json.loads((R/'developed-l02.json').read_text());C=json.loads((R.parent/'construction-c01.json').read_text())
def shape(o):return unary_union([Polygon(p['outer'],p['holes'])for p in o['footprint']])
def polys(g):return [g]if g.geom_type=='Polygon'else[p for q in g.geoms for p in polys(q)]if hasattr(g,'geoms')else[]
def serial(g):return[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in polys(g)]
base=[dict(o,g=shape(o))for o in D['objects']]
for r in C['residueRepairs']:
 g=box(*r['bounds'])
 if r['z0']==3.6:g=g.intersection(next(o['g']for o in base if o['id']=='F-U'))
 base.append(dict(id=r['id'],g=g,z0=r['z0'],z1=r['z1'],kind='infill'))
cx,cy,radius,width,sweep=46.5,39.5,13,4,80
length=radius*math.radians(sweep);stride=length/24;spring=17*stride

def arc(t,r=radius):
 a=math.radians(180-sweep*t);return(cx+r*math.cos(a),cy+r*math.sin(a))
def sector(t0,t1,r0=11,r1=15):
 ts=[t0+(t1-t0)*i/8 for i in range(9)]
 return Polygon([arc(t,r1)for t in ts]+[arc(t,r0)for t in ts[::-1]])
ribbon=sector(0,1);candidate=[]
for o in base:
 if o.get('assembly')=='X1' or o['id'].startswith('X1-'):continue
 o=dict(o)
 if o['id']=='F-U':o['g']=o['g'].difference(ribbon)
 if o['id']=='GU-0-0-1':o['g']=o['g'].difference(ribbon.buffer(.13))
 candidate.append(o)
for n in range(24):
 lo=n/24;hi=(n+1)/24;top=(n+1)*.15
 # Flat prism minima conservatively bound the continuous custom underside.
 bottom=0 if n<17 else n*.15-.35
 candidate.append(dict(id=f'CX1-t{n+1:02}',g=sector(lo,hi),z0=bottom,z1=top,kind='stair'))
 for edge,r in [('inner',11),('outer',15)]:
  line=LineString([arc(lo+(hi-lo)*i/8,r)for i in range(9)])
  candidate.append(dict(id=f'CX1-{edge}{n+1:02}',g=line.buffer(.12,cap_style=2),z0=top,z1=top+1.1,kind='stair-guard'))
candidate.append(dict(id='CX1-old-arrival-guard',g=box(34,55.88,40,56.12),z0=3.6,z1=4.7,kind='guard'))
end=arc(1);tangent=(math.sin(math.radians(100)),-math.cos(math.radians(100)));normal=(math.cos(math.radians(100)),math.sin(math.radians(100)))
landing=Polygon([(end[0]+s*tangent[0]+w*normal[0],end[1]+s*tangent[1]+w*normal[1])for s,w in[(0,-2),(3.1,-2),(3.1,2),(0,2)]])
# Landing is an identified part of the existing upper slab, not an extra layer.
positions={'C-LOW':[33.5,37.5,0],'C-LAND':[46.2,52.65,3.6],'C-SIDE':[43,55,3.6],'C-SUPPORT':[36,62,3.6],'C-INFO':[42,48.7,3.6]}
for id,t in [('C-EARLY',2.5/24),('C-MID',12.5/24),('C-LATE',23.5/24),('C-FOLLOW',(23.5*stride-3)/length)]:positions[id]=[*arc(t),(math.floor(t*24)+1)*.15]
paths={'lower-change':D['walk_routes']['lower-change'],'upper-west-switch':D['walk_routes']['upper-west-switch']}
old=D['walk_routes']['west-public'];prefix=old[:old.index([35,33,0])+1]
arcpath=[[*arc(n/96),math.ceil(n/4)*.15]for n in range(97)]
paths['west-public']=prefix+[[33.5,37.5,0]]+arcpath+[[46.2,52.65,3.6],[46.2,51,3.6],[49,51,3.6],[56.5,51,3.6]]
paths['receiving-retreat']=[positions['C-LAND'],[46,55,3.6],[44,60,3.6],[37,58,3.6]]
paths['observation-pocket']=[[47,49,3.6],[44,49,3.6],positions['C-INFO']]

def blocked(a,b,objects):
 line=LineString([a[:2],b[:2]]);length2=line.length
 if length2==0:return []
 hits=[]
 for o in objects:
  if o['kind']=='glazing':continue
  cut=line.intersection(o['g'])
  if cut.is_empty:continue
  values=[]
  geoms=list(cut.geoms)if hasattr(cut,'geoms')else[cut]
  for g in geoms:
   if hasattr(g,'coords'):
    values += [line.project(Point(p))/length2 for p in g.coords]
  if not values:continue
  lo,hi=min(values),max(values);za=a[2]+(b[2]-a[2])*lo;zb=a[2]+(b[2]-a[2])*hi
  if max(za,zb)>o['z0']+1e-5 and min(za,zb)<o['z1']-1e-5:hits.append(o['id'])
 return hits
rays=[]
for source in ['C-EARLY','C-MID','C-LATE','C-FOLLOW','C-SUPPORT']:
 for target in ['C-LAND','C-SIDE']:
  for posture,eye in [('stand',1.86),('crouch',1.0695)]:
   a=positions[source];b=positions[target];a=a[:2]+[a[2]+eye];b=b[:2]+[b[2]+1.86]
   hit=blocked(a,b,candidate);rays.append(dict(observer=source,target=target,posture=posture,visible=not hit,occluders=hit,eyes=[a,b]))
for posture,eye in [('stand',1.86),('crouch',1.0695)]:
 a=[41,39,eye];b=positions['C-INFO'];b=b[:2]+[b[2]+eye];hit=blocked(a,b,candidate);rays.append(dict(observer='W-LOOK',target='C-INFO',posture=posture,visible=not hit,occluders=hit,eyes=[a,b]))
checks=[]
for id,path in paths.items():
 failures=[];headroom=100;samples=0
 for a,b in zip(path,path[1:]):
  for n in range(max(1,math.ceil(math.dist(a,b)/.25))):
   t=n/max(1,math.ceil(math.dist(a,b)/.25));p=[a[k]+(b[k]-a[k])*t for k in range(3)];disk=Point(p[:2]).buffer(.4);samples+=1
   for o in candidate:
    if not disk.intersects(o['g']):continue
    if o['z0']>p[2]+.3:headroom=min(headroom,o['z0']-p[2])
    if o['z0']<p[2]+2-1e-5 and o['z1']>p[2]+.3+1e-5:failures.append({'point':p,'object':o['id']})
 checks.append(dict(id=id,samples=samples,minimumOverheadBound=headroom,failures=failures[:25],failureCount=len(failures)))
lengths={id:sum(math.dist(a,b)for a,b in zip(path,path[1:]))for id,path in paths.items()}
packet=dict(revision='P01',state='unselected paper comparison; C01 AML unchanged; independent local/strategy assessment required',baselineSourceSHA256=hashlib.sha256((R.parent/'level.aml').read_bytes()).hexdigest(),arc=dict(center=[cx,cy,0],radii=[13,13],start=180,sweep=-80,elevation=[0,3.6],width=4,clearWidth=3.76,count=24,run=length,innerTread=11*math.radians(80)/24,outerTread=15*math.radians(80)/24,customUnderside=[[0,0],[spring,0],[spring,2.2],[length,3.25]],startPoint=[*arc(0),0],endPoint=[*end,3.6]),landing=dict(id='CX1-LAND',footprint=serial(landing),depth=3.1,width=4,top=3.6,ceiling=10.8),floorCut=serial(ribbon),positions=positions,paths=paths,lengths=lengths,body=D['body'],rays=rays,sampling=checks,changedIds=['X1 replaces filled straight flight by curved flight with custom raised final soffit','F-U removes curved flight footprint','GU-0-0-1 trimmed only at new flight intersection','CX1-old-arrival-guard closes former stair exit at y56','W-STAGE relocated to C-INFO at42,48.7; original aperture remains'],objects=[{**{k:v for k,v in o.items()if k not in['g','footprint']},'footprint':serial(o['g'])}for o in candidate],limits='Conservative prism paper sampling only. Analytic curve/custom underside require native compile, full width/landing reverse walk and opposed/support/follower captures if selected. No source AML or baseline build modified.')
(R/'stair-comparison-p01.json').write_text(json.dumps(packet,indent=2)+'\n')
# Two local actual plans and a longitudinal section, kept proportional to this single interface.
S=['<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1240"><rect width="1500" height="1240" fill="#f7f2e8"/><style>text{font-family:Arial;fill:#203c42}.title{font-size:26px;font-weight:bold}.sub{font-size:17px}.label{font-size:13px}</style>','<text x="35" y="38" class="title">LAST LIGHT / P01 · straight X1 versus broad curved ascent</text>','<text x="35" y="65" class="sub">Paper candidate, not selected or compiled · dimensions in metres · unchanged C01 baseline retained</text>']
def panel(objects,x0,label,upper=False):
 scale=20;X=lambda x:x0+(x-26)*scale;Y=lambda y:690-(y-30)*scale
 S.append(f'<text x="{x0}" y="97" class="sub">{label}</text>')
 for y in [35,40,45,50,55]:S.append(f'<line x1="{X(26)}" y1="{Y(y)}" x2="{X(57)}" y2="{Y(y)}" stroke="#ddd"/><text x="{X(26)+2}" y="{Y(y)-3}" class="label">y{y}</text>')
 for o in objects:
  if o['kind'] in ['roof','glazing']or o['z0']>7.9:continue
  g=o['g'].intersection(box(26,30,57,59))
  if g.is_empty:continue
  if o['kind']=='floor':color='#c9b9a2'if o['z1']==0 else'#cfadb0';opacity='.25'if o['z1']>0 else'.4'
  elif o['kind']=='stair':color='#cbaf6c';opacity='.85'
  elif o['kind']=='stair-guard':color='#8b764f';opacity='1'
  elif o['kind'] in ['guard','low-cover']:color='#6b9491';opacity='.7'
  elif o['z0']>=3.6:color='#576e72';opacity='.25'
  else:color='#4a6265';opacity='.8'
  for q in polys(g):
   pts=' '.join(f'{X(x)},{Y(y)}'for x,y in list(q.exterior.coords));S.append(f'<polygon points="{pts}" fill="{color}" fill-opacity="{opacity}" stroke="#425a5d" stroke-width=".6"/>')
 if objects is candidate:
  pts=' '.join(f'{X(x)},{Y(y)}'for x,y in list(landing.exterior.coords));S.append(f'<polygon points="{pts}" fill="none" stroke="#bd356b" stroke-width="3"/>')
  for id in ['C-LOW','C-MID','C-LATE','C-FOLLOW','C-LAND','C-INFO']:
   x,y,z=positions[id];S.append(f'<circle cx="{X(x)}" cy="{Y(y)}" r="4" fill="#a72e58"/><text x="{X(x)+7}" y="{Y(y)-6}" class="label">{id} +{z:.2f}</text>')
  pts=' '.join(f'{X(x)},{Y(y)}'for x,y,z in paths['lower-change']);S.append(f'<polyline points="{pts}" fill="none" stroke="#33878c" stroke-width="3" stroke-dasharray="7 4"/>')
  S.append(f'<text x="{X(30)}" y="{Y(32)}" class="label">R13 / sweep80° / width4 / landing3.1 deep</text>')
 else:
  S.append(f'<text x="{X(30)}" y="{Y(32)}" class="label">Run18 / width6 / 24 × .15 / exit37,56</text>')
 S.append(f'<text x="{X(43)}" y="{Y(57.5)}" class="label">U1 upper receiving</text><text x="{X(48)}" y="{Y(45.8)}" class="label">G1 below</text>')
panel(base,45,'A / retained native straight stair')
panel(candidate,795,'B / candidate curve and lower parallel passage')
S+=['<text x="45" y="760" class="title">B / actual longitudinal walking section (arc unrolled by centerline distance)</text>']
X=lambda s:65+s*60;Y=lambda z:1110-z*65
# Filled first17 risers, raised custom underside thereafter.
outline=[(0,0)]
for n in range(24):outline.extend([(n*stride,(n+1)*.15),((n+1)*stride,(n+1)*.15)])
outline.extend([(length,3.25),(spring,2.2),(spring,0)])
S.append('<polygon points="'+' '.join(f'{X(x)},{Y(z)}'for x,z in outline)+'" fill="#cfb272" stroke="#425a5d" stroke-width="2"/>')
for z in [0,1.8,2.2,3.25,3.6]:S.append(f'<line x1="55" y1="{Y(z)}" x2="1410" y2="{Y(z)}" stroke="#ddd"/><text x="1420" y="{Y(z)+4}" class="label">{z}m</text>')
S.append(f'<text x="{X(spring)}" y="{Y(1.0)}" class="label">Raised final soffit: 2.2 → 3.25 clear</text>')
S.append(f'<text x="{X(spring)}" y="{Y(.55)}" class="label">existing lower route passes below; no crouch required on paper</text>')
S.append(f'<line x1="{X(0)}" y1="1150" x2="{X(length)}" y2="1150" stroke="#203c42"/><text x="{X(6)}" y="1175" class="sub">Centerline18.151m · inner tread .640m / outer .873m · nominal guard clear3.76m</text>')
S.append('<text x="45" y="1210" class="sub">Magenta = new landing / named witnesses · dashed teal = retained lower chain · all colors are proposal notation</text></svg>')
(R/'stair-comparison-p01.svg').write_text('\n'.join(S))
print(json.dumps({'run':length,'routeLengths':lengths,'checks':[{k:v for k,v in c.items()if k!='failures'}for c in checks],'rays':[(r['observer'],r['target'],r['posture'],r['visible'])for r in rays]},indent=2))
