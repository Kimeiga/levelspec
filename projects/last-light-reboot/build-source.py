"""Native C01 construction of the accepted L02 coordinate proposal.
The JSON remains frozen evidence; editable AML is the production source.
"""
from pathlib import Path
import json, hashlib, copy, sys
sys.path.insert(0,str(Path("generated/last-light-reboot-tools").resolve()))
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from xml.etree.ElementTree import Element, SubElement, indent, tostring
ROOT=Path(__file__).parent
layout=json.loads((ROOT/'planning/developed-l02.json').read_text())
assert hashlib.sha256((ROOT/'planning/developed-l02.json').read_bytes()).hexdigest()=='7705d0d6c1f717b1e2ea619cec96855346cd0e7689ecc3e515ca504c23d546bc'
root=Element('architecture',version='1',id='last-light-reboot',name='Last Light Galleria · Twin Atrium Exchange',units='meters',validation='playable',description='C01 native realization of independently accepted L02. 5v5 hero-shooter Control hypothesis; no combat or scoring simulation.')
def node(parent,tag,**attrs):return SubElement(parent,tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def num(n):return f'{n:.3f}'.rstrip('0').rstrip('.') if n else '0'
def points(ps):return '; '.join(' '.join(num(n) for n in p) for p in ps)
def loop_points(ps):
 clean=[]
 for p in ps:
  q=[round(n,3) for n in p]
  if not clean or q!=clean[-1]:clean.append(q)
 if len(clean)>1 and clean[-1]==clean[0]:clean.pop()
 return points(clean)
materials={'tile':'#cfc3ad','upper-tile':'#c8b1a3','plaster':'#ded5bf','teal':'#5c8380','rose':'#ac7b80','shutter':'#79837f','guard':'#b59d72','roof':'#9aa5a2','glass':'#a8cbd0','concrete':'#a6a69b','ink':'#405255'}
for id,color in materials.items():node(root,'material',id=id,color=color,roughness='.85')
node(root,'player',radius='.4',height='2',crouch='1.15',step='.3',slope='42')
construction=[];mapping=[]
# Closed residue pockets in the accepted unions are construction infill, never new routes.
repairs=[
 ('FIX-GNW',box(34,80,44,84),0,3.25,'Closed cinema plinth continuation'),
 ('FIX-GNE',box(70,76,78,80),0,3.25,'Closed cinema plinth continuation'),
 ('FIX-UW',box(30,56,34,72),3.6,4.7,'Inaccessible planter ledge west of public/service wall'),
 ('FIX-USW',box(42,42,48,48),3.6,4.7,'Inaccessible planted observation apron'),
 ('FIX-UNE',box(78,56,82,64),3.6,4.7,'Inaccessible planted observation apron'),
 ('FIX-UE',box(92,34,94,46),3.6,4.7,'Inaccessible service-wall planter ledge'),
 ('FIX-GSLOT',box(28,44,29,46),0,1.15,'Join existing planter to west atrium wall'),
 ('FIX-USW-SLOT',box(49.75,21.4,50.3,22.5),3.6,4.7,'Guard junction cap at south gallery outer corner'),
 ('FIX-USLOT',box(77.75,75.7,78.25,76.5),3.6,4.7,'Guard junction cap at north gallery outer corner'),
]
# Aprons follow the existing slab edge, so no volume protrudes into the atrium.
upper=unary_union([Polygon(p['outer'],p['holes']) for o in layout['objects'] if o['id']=='F-U' for p in o['footprint']])
for id,g,z0,z1,label in repairs:
 if z0==3.6:g=g.intersection(upper)
 profile=node(root,'profile',id=id+'-plan',points=loop_points(list(g.exterior.coords)[:-1]))
 construction.append(('extrusion',dict(id=id,profile=id+'-plan',position=f'0 0 {z0}',distance=num(z1-z0),material='teal' if z0==3.6 or id=='FIX-GSLOT' else 'shutter',group='infill',label=label)))
for obj in layout['objects']:
 if obj['kind'] in ('stair','stair-guard'):continue
 for i,poly in enumerate(obj['footprint']):
  shape=Polygon(poly['outer'],poly['holes']).simplify(.002,preserve_topology=True)
  poly={'outer':list(shape.exterior.coords)[:-1],'holes':[list(h.coords)[:-1] for h in shape.interiors]}
  id=obj['id'] if len(obj['footprint'])==1 else f"{obj['id']}-{i}"
  profile=node(root,'profile',id=id+'-plan',points=loop_points(poly['outer']))
  for hole in poly['holes']:node(profile,'hole',points=loop_points(hole))
  kind=obj['kind'];mat={'floor':'tile' if obj['id']=='F-G' else 'upper-tile','roof':'roof','glazing':'glass','wall':'plaster','core':'shutter','column':'plaster','guard':'guard','low-cover':'teal'}[kind]
  if obj['id'] in ('C-W','C-NW','C-IS'):mat='teal'
  if obj['id'] in ('C-E','C-NE','C-S'):mat='rose'
  if obj['id'].startswith('RC-'):mat='roof'
  tag='roof' if kind in ('roof','glazing') else 'slab' if kind=='floor' else 'extrusion'
  attrs=dict(id=id,profile=id+'-plan',material=mat,label=obj.get('role') or obj['id'],group=kind)
  if tag=='extrusion':attrs.update(position=f"0 0 {num(obj['z0'])}",distance=num(obj['z1']-obj['z0']))
  else:attrs.update(elevation=num(obj['z1']),thickness=num(obj['z1']-obj['z0']))
  construction.append((tag,attrs));mapping.append({'id':id,'layout':obj['id'],'kind':kind})
for stair in layout['stairs']:
 node(root,'path',id=stair['id']+'-axis',points=points([stair['start'],stair['end']]))
 construction.append(('stairs',dict(id=stair['id'],path=stair['id']+'-axis',width='6',count='24',thickness='.35',underside='filled',material='tile',group='stairs',label=stair['mode']+' stair / 24 x .15 m')))
 for side in ('left','right'):
  construction.append(('enclosure',dict(id=stair['id']+'-'+side+'-guard',host=stair['id'],side=side,construction='curb',height='1.1',thickness='.24',material='guard',group='guard')))
 mapping.append({'id':stair['id'],'layout':stair['id']+'-t01..24','kind':'native stair; native tread-following guards replace gW/gE01..24'})
# Roof-only joint caps overlap both fascia ends and the roof at the two reviewed 1 cm corners.
for id,x,y in [('RC-CAP-W',50,20),('RC-CAP-E',104,20)]:
 construction.append(('box',dict(id=id,position=f'{x-.2} {y-.2} 4.75',width='.4',depth='.4',height='3.05',material='roof',group='wall',label='Overlapping medium/low fascia corner cap')))
# Coarse skylight mullions are confined above the accepted ceiling plane.
for obj in [o for o in layout['objects'] if o['kind']=='glazing']:
 coords=obj['footprint'][0]['outer'];x0=min(p[0] for p in coords);x1=max(p[0] for p in coords);y0=min(p[1] for p in coords);y1=max(p[1] for p in coords)
 for n,y in enumerate([y0,(y0+y1)/2,y1]):construction.append(('box',dict(id=obj['id']+f'-m{n}',position=f'{x0} {y-.08} 10.94',width=num(x1-x0),depth='.16',height='.24',material='ink',group='roof')))
# A physical assembly composes touching structural prisms; retained-face resolves buried shared material ownership.
assembly=node(root,'assembly',id='MALL',coincident_material='retained-face',label='Accepted twin-atrium mall construction')
for tag,attrs in construction:node(assembly,tag,**attrs)
for id,pos in layout['positions'].items():
 if id.endswith('-MID'):continue
 node(root,'marker',id=id,kind='spawn' if id in ('SW','SE') else 'objective' if id=='POINT-S' else 'poi',position=points([pos]),label=id)
for id,route in layout['walk_routes'].items():
 a=id+'-start';b=id+'-end'
 node(root,'marker',id=a,kind='poi',position=points([route[0]]));node(root,'marker',id=b,kind='poi',position=points([route[-1]]))
 node(root,'route',id=id,**{'from':a,'to':b,'min_routes':'1','max_distance':str(round(sum(__import__('math').dist(x,y) for x,y in zip(route,route[1:]))*1.15,2))})
indent(root,space='  ')
(ROOT/'level.aml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+tostring(root,encoding='unicode')+'\n')
(ROOT/'construction-c01.json').write_text(json.dumps({'revision':'C01','layoutSha256':hashlib.sha256((ROOT/'planning/developed-l02.json').read_bytes()).hexdigest(),'mapping':mapping,'profileNormalization':'Consecutive identical millimeter vertices removed; footprint simplify <=2 mm preserves topology and eliminates rounded buffer micro-segment degeneracies.','residueRepairs':[{'id':id,'bounds':list(g.bounds),'z0':z0,'z1':z1,'reason':label} for id,g,z0,z1,label in repairs],'physicalChanges':[{'id':'RC-CAP-W','bounds':[49.8,19.8,4.75,50.2,20.2,7.8]},{'id':'RC-CAP-E','bounds':[103.8,19.8,4.75,104.2,20.2,7.8]}],'overheadDetail':'Six skylight mullions, wholly at Z10.94..11.18, no route/eye change.','body':layout['body']},indent=2)+'\n')
print(len(construction),'native construction members')
