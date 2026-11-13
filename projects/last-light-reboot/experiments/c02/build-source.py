"""C02 bounded native curve experiment. C01 source/evidence are read-only inputs."""
from pathlib import Path
import json,hashlib,sys,copy
from xml.etree.ElementTree import parse,Element,SubElement,indent,tostring
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,box,MultiPoint
R=Path(__file__).resolve().parents[2];E=Path(__file__).parent
source=R/'level.aml';assert hashlib.sha256(source.read_bytes()).hexdigest()=='7a31f5a513d49f8f6f45899c48dfb40ff67e96475e7a35a349b0607cab833069'
D=json.loads((E/'native-curve.json').read_text());P=json.loads((R/'planning/stair-comparison-p01.json').read_text())
root=parse(source).getroot();root.set('id','last-light-reboot-c02');root.set('name','Last Light Galleria · C02 curved experiment');root.set('curve-tolerance','.002');root.set('description','Selected P01 bounded experiment; independent compiled comparison pending. C01 preserved. Unchanged inspection body and route declarations.')
assembly=root.find("assembly[@id='MALL']")
def num(n):return format(n,'.12g')
def points(ps):return '; '.join(' '.join(num(n)for n in p)for p in ps)
def shape(profile):
 ps=lambda text:[[float(n)for n in p.split()]for p in text.split(';')]
 return Polygon(ps(profile.get('points')),[ps(h.get('points'))for h in profile.findall('hole')])
def profile(id,g):
 p=Element('profile',id=id,points=points(list(g.exterior.coords)[:-1]))
 for hole in g.interiors:SubElement(p,'hole',points=points(list(hole.coords)[:-1]))
 root.insert(13,p);return p
cut=Polygon([p[:2]for p in D['rails'][0]]+[p[:2]for p in D['rails'][1][::-1]])
changes=[]
for id,buffer in [('F-U',0),('GU-0-0-1',.13)]:
 p=root.find(f"profile[@id='{id}-plan']");before=shape(p);after=before.difference(cut.buffer(buffer)if buffer else cut)
 parts=[after]if after.geom_type=='Polygon'else list(after.geoms)
 root.remove(p)
 if len(parts)>1:
  member=assembly.find(f"extrusion[@id='{id}']");assembly.remove(member)
 for i,g in enumerate(parts):
  key=id if len(parts)==1 else f'{id}-c02-{i}'
  profile(key+'-plan',g)
  if len(parts)>1:
   clone=copy.deepcopy(member);clone.set('id',key);clone.set('profile',key+'-plan');assembly.append(clone)
 changes.append(dict(id=id,beforeArea=before.area,afterArea=after.area,footprint=[dict(outer=list(g.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in g.interiors])for g in parts]))
for child in list(assembly):
 if child.get('id')in ['X1','X1-left-guard','X1-right-guard']:assembly.remove(child)
root.remove(root.find("path[@id='X1-axis']"))
p=Element('path',id='CX1-axis',elevation='0 3.6');SubElement(p,'arc',center='46.5 39.5 0',radii='13 13',start='180',sweep='-80');root.insert(13,p)
root.insert(13,Element('path',id='CX1-soffit',points='0 0 0; 17 0 0; 17 2.2 0; 24 3.25 0',scale=f"{D['length']/24:.16g} 1 1"))
SubElement(assembly,'stairs',id='CX1',path='CX1-axis',width='4',count='24',thickness='.35',underside='custom',**{'underside-profile':'CX1-soffit'},material='tile',group='stairs',label='Curved public ascent / 24 x .15 / late raised underside')
for side in ['left','right']:SubElement(assembly,'enclosure',id=f'CX1-{side}-guard',host='CX1',side=side,construction='curb',height='1.1',thickness='.24',material='guard',group='guard')
profile('CX1-old-arrival-guard-plan',box(34,55.88,40,56.12));SubElement(assembly,'extrusion',id='CX1-old-arrival-guard',profile='CX1-old-arrival-guard-plan',position='0 0 3.6',distance='1.1',material='guard',group='guard',label='Closure of former straight public arrival')
# Solid stringer footings close the non-occupiable .12m guard overhang below filled treads.
repairs=[]
for n,g in enumerate(D['guardGeometry']):
 z=min(p[2]for p in g['positions'])
 if z>2.550001:continue
 footprint=MultiPoint([p[:2]for p in g['positions']]).convex_hull
 key=f'CX1-stringer-foot-{n}'
 profile(key+'-plan',footprint)
 SubElement(assembly,'extrusion',id=key,profile=key+'-plan',position='0 0 0',distance=num(z),material='tile',group='infill')
 repairs.append(dict(id=key,z0=0,z1=z,footprint=list(footprint.exterior.coords),reason='Close inaccessible guard overhang beneath filled first17 treads.'))
upper=shape(root.find("profile[@id='F-U-plan']"))
for key,bounds in [('CX1-OW-tip',(40,48,42.4,49.25)),('CX1-N-tip',(39.8,52.65,41,53.65))]:
 footprint=box(*bounds).intersection(upper)
 profile(key+'-plan',footprint)
 SubElement(assembly,'extrusion',id=key,profile=key+'-plan',position='0 0 3.6',distance='1.1',material='teal',group='infill',label='Non-occupiable slab-cut tip infill')
 repairs.append(dict(id=key,z0=3.6,z1=4.7,footprint=list(footprint.exterior.coords),reason='Close residual body-inaccessible slab-cut tip; O-W witness shifts within same opening.'))
root.find("marker[@id='W-STAGE']").set('position','43 49 3.6')
P['positions']['C-INFO']=[43,49,3.6]

for id,p in P['positions'].items():SubElement(root,'marker',id=id,kind='poi',position=points([p]),label=id)
# The landing is a dimensioned part of the retained upper slab, not a coincident second slab.
indent(root,space='  ');out=R/'level-c02.aml';out.write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+tostring(root,encoding='unicode')+'\n')
(E/'construction.json').write_text(json.dumps(dict(revision='C02-experiment',baselineSourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),sourceSHA256=hashlib.sha256(out.read_bytes()).hexdigest(),arc=P['arc'],native=D,landing=P['landing'],residueRepairs=repairs,modifiedProfiles=changes,cutFootprint=list(cut.exterior.coords),normalization='Native analytic curve sampled at .002m chord tolerance. Custom underside uses actual compiled path plan length18.15050269477485m (analytic18.151424220741028m); spring remains17/24. Floor cut matches exact native offset rails, not coarse paper chord polygon. Other C01 profiles and construction preserved.',markers='W-STAGE relocated to C-INFO. O-W physical opening unchanged.',status='Experiment; neither promoted nor independently accepted.'),indent=2)+'\n')
print(out)
